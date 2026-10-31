import wwebjs from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const { Client, LocalAuth } = wwebjs;
const execFileAsync = promisify(execFile);
const clients = new Map();
const qrCodes = new Map();
const status = new Map();
const loadingProgress = new Map();
const restarting = new Set();
const manuallyDisconnected = new Set();
const initializationPromises = new Map();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getSessionDir(clinica_id) {
  if (!/^\d+$/.test(String(clinica_id))) throw new Error('Identificador de clínica inválido.');
  const authRoot = path.resolve('./.wwebjs_auth');
  const sessionDir = path.resolve(authRoot, `session-clinica_${clinica_id}`);
  if (!sessionDir.startsWith(`${authRoot}${path.sep}`)) throw new Error('Identificador de clínica inválido.');
  return sessionDir;
}

async function removeSession(clinica_id) {
  await fs.promises.rm(getSessionDir(clinica_id), {
    recursive: true,
    force: true,
    maxRetries: 12,
    retryDelay: 500
  });
}

async function stopBrowserProcess(browser) {
  const browserProcess = browser?.process?.();
  if (!browserProcess || browserProcess.exitCode !== null) return;

  try {
    if (globalThis.process.platform === 'win32') {
      await execFileAsync('taskkill', ['/PID', String(browserProcess.pid), '/T', '/F'], { windowsHide: true });
    } else {
      browserProcess.kill('SIGKILL');
    }
  } catch (error) {
    if (error.code !== 'ESRCH' && error.code !== 'ENOENT') {
      if (error.code !== 128) console.warn('Não foi possível encerrar o processo antigo do WhatsApp:', error.message);
    }
  }

  await Promise.race([
    new Promise((resolve) => browserProcess.once('exit', resolve)),
    wait(5000)
  ]);
}

async function destroyClient(client) {
  if (!client) return;
  const browser = client.pupBrowser;
  try {
    await Promise.race([
      client.destroy(),
      wait(12000).then(() => { throw new Error('Tempo esgotado ao fechar o navegador do WhatsApp.'); })
    ]);
  } catch (error) {
    console.warn('Encerrando à força o navegador anterior do WhatsApp:', error.message);
    try {
      if (browser?.isConnected?.()) {
        await Promise.race([browser.close(), wait(3000)]);
      }
    } catch (_) {}
    await stopBrowserProcess(browser);
  }
}

function cleanSessionLocks(clinica_id) {
  try {
    const sessionDir = getSessionDir(clinica_id);
    if (!fs.existsSync(sessionDir)) return;
    for (const file of ['DevToolsActivePort', 'SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']) {
      try { fs.unlinkSync(path.join(sessionDir, file)); } catch (error) {
        if (error.code !== 'ENOENT') console.warn(`Lock ${file} ainda não pôde ser limpo:`, error.message);
      }
    }
  } catch (error) {
    console.warn('Aviso ao verificar locks da sessão:', error.message);
  }
}

export const initWhatsApp = (clinica_id) => {
  if (clients.has(clinica_id)) return clients.get(clinica_id);
  manuallyDisconnected.delete(clinica_id);
  // A previous Node process may have died before deleting Chromium's file lock.
  // This is safe here because this process has no client for this clinic yet.
  cleanSessionLocks(clinica_id);
  status.set(clinica_id, 'INICIANDO');
  qrCodes.delete(clinica_id);
  loadingProgress.delete(clinica_id);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `clinica_${clinica_id}` }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-quic'
      ]
    }
  });

  client.on('qr', async (qr) => {
    if (clients.get(clinica_id) !== client) return;
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      if (clients.get(clinica_id) !== client) return;
      qrCodes.set(clinica_id, qrDataUrl);
      status.set(clinica_id, 'AGUARDANDO_LEITURA');
      console.log(`QR Code gerado para Clínica ${clinica_id}`);
    } catch (error) {
      console.error('Erro ao gerar QR Code base64:', error);
      status.set(clinica_id, 'FALHA');
    }
  });

  client.on('ready', () => {
    if (clients.get(clinica_id) !== client) return;
    status.set(clinica_id, 'CONECTADO');
    loadingProgress.delete(clinica_id);
    qrCodes.delete(clinica_id);
    console.log(`WhatsApp conectado para Clínica ${clinica_id}`);
  });

  client.on('authenticated', () => {
    if (clients.get(clinica_id) !== client) return;
    status.set(clinica_id, 'AUTENTICADO');
    console.log(`WhatsApp autenticado para Clínica ${clinica_id}`);
  });

  client.on('loading_screen', (percent) => {
    if (clients.get(clinica_id) !== client || status.get(clinica_id) === 'CONECTADO') return;
    status.set(clinica_id, 'SINCRONIZANDO');
    loadingProgress.set(clinica_id, Number.isFinite(percent) ? percent : null);
  });

  client.on('auth_failure', (message) => {
    if (clients.get(clinica_id) !== client) return;
    console.error(`Falha na autenticação da Clínica ${clinica_id}:`, message);
    status.set(clinica_id, 'FALHA');
    qrCodes.delete(clinica_id);
    loadingProgress.delete(clinica_id);
  });

  client.on('disconnected', (reason) => {
    if (restarting.has(clinica_id) || clients.get(clinica_id) !== client) return;
    console.log(`WhatsApp desconectado para Clínica ${clinica_id}:`, reason);
    status.set(clinica_id, 'DESCONECTADO');
    qrCodes.delete(clinica_id);
    loadingProgress.delete(clinica_id);
    clients.delete(clinica_id);
    void destroyClient(client).finally(() => cleanSessionLocks(clinica_id));
  });

  clients.set(clinica_id, client);
  const startupTimeout = setTimeout(() => {
    if (clients.get(clinica_id) !== client || status.get(clinica_id) !== 'INICIANDO') return;
    console.error(`Tempo esgotado ao iniciar WhatsApp para Clínica ${clinica_id}.`);
    status.set(clinica_id, 'FALHA');
    qrCodes.delete(clinica_id);
    loadingProgress.delete(clinica_id);
    void destroyClient(client).finally(() => {
      if (clients.get(clinica_id) === client) clients.delete(clinica_id);
      cleanSessionLocks(clinica_id);
    });
  }, 60000);
  const initialization = client.initialize().catch(async (error) => {
    clearTimeout(startupTimeout);
    if (clients.get(clinica_id) !== client) return;
    console.error(`Erro ao inicializar WhatsApp para Clínica ${clinica_id}:`, error.message);
    status.set(clinica_id, 'FALHA');
    qrCodes.delete(clinica_id);
    loadingProgress.delete(clinica_id);
    await destroyClient(client);
    if (clients.get(clinica_id) === client) clients.delete(clinica_id);
    cleanSessionLocks(clinica_id);
  });
  for (const eventName of ['qr', 'authenticated', 'loading_screen', 'ready', 'auth_failure']) {
    client.once(eventName, () => clearTimeout(startupTimeout));
  }
  initializationPromises.set(clinica_id, initialization);
  void initialization.finally(() => {
    if (initializationPromises.get(clinica_id) === initialization) initializationPromises.delete(clinica_id);
  });
  return client;
};

export const getStatus = (clinica_id) => {
  if (restarting.has(clinica_id)) return { status: 'INICIANDO', qr: null, phone: null, progress: null };
  if (manuallyDisconnected.has(clinica_id)) return { status: 'DESCONECTADO', qr: null, phone: null, progress: null };
  if (!clients.has(clinica_id)) {
    if (status.has(clinica_id)) return { status: status.get(clinica_id), qr: null, phone: null, progress: null };
    initWhatsApp(clinica_id);
    return { status: 'INICIANDO', qr: null, phone: null, progress: null };
  }
  return {
    status: status.get(clinica_id) || 'INICIANDO',
    qr: qrCodes.get(clinica_id) || null,
    progress: loadingProgress.get(clinica_id) ?? null,
    phone: clients.get(clinica_id)?.info?.wid?.user ? `+${clients.get(clinica_id).info.wid.user}` : null
  };
};

export const disconnect = async (clinica_id) => {
  if (restarting.has(clinica_id)) return false;
  restarting.add(clinica_id);
  const client = clients.get(clinica_id);
  try {
    await destroyClient(client);
    await Promise.race([initializationPromises.get(clinica_id), wait(15000)]);
    await destroyClient(client);
    clients.delete(clinica_id);
    qrCodes.delete(clinica_id);
    status.set(clinica_id, 'DESCONECTADO');
    loadingProgress.delete(clinica_id);
    await removeSession(clinica_id);
    manuallyDisconnected.add(clinica_id);
    return Boolean(client);
  } finally {
    restarting.delete(clinica_id);
  }
};

export const getClient = (clinica_id) => status.get(clinica_id) === 'CONECTADO' ? clients.get(clinica_id) : null;

export const gerarNovoQr = (clinica_id) => {
  if (restarting.has(clinica_id)) return false;
  restarting.add(clinica_id);
  manuallyDisconnected.delete(clinica_id);
  status.set(clinica_id, 'INICIANDO');
  qrCodes.delete(clinica_id);
  loadingProgress.delete(clinica_id);

  void (async () => {
    const client = clients.get(clinica_id);
    try {
      await destroyClient(client);
      await Promise.race([initializationPromises.get(clinica_id), wait(15000)]);
      await destroyClient(client);
      clients.delete(clinica_id);
      await removeSession(clinica_id);
      cleanSessionLocks(clinica_id);
      initWhatsApp(clinica_id);
    } catch (error) {
      console.error(`Erro ao preparar novo QR Code para Clínica ${clinica_id}:`, error);
      status.set(clinica_id, 'FALHA');
      qrCodes.delete(clinica_id);
      loadingProgress.delete(clinica_id);
      clients.delete(clinica_id);
    } finally {
      restarting.delete(clinica_id);
    }
  })();
  return true;
};

export const cleanupAllClients = async () => {
  console.log('Fechando instâncias do WhatsApp...');
  for (const [clinica_id, client] of clients.entries()) {
    await destroyClient(client);
    cleanSessionLocks(clinica_id);
  }
  clients.clear();
};
