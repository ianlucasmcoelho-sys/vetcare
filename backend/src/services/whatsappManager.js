import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs;
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Mapa para guardar as instâncias de cada clínica (Multi-tenant seguro)
const clients = new Map();
const qrCodes = new Map();
const status = new Map();
const loadingProgress = new Map();
const restarting = new Set();
const manuallyDisconnected = new Set();

function getSessionDir(clinica_id) {
  if (!/^\d+$/.test(String(clinica_id))) throw new Error('Identificador de clínica inválido.');
  const authRoot = path.resolve('./.wwebjs_auth');
  const sessionDir = path.resolve(authRoot, `session-clinica_${clinica_id}`);
  if (!sessionDir.startsWith(`${authRoot}${path.sep}`)) throw new Error('Identificador de clínica inválido.');
  return sessionDir;
}

async function removeSession(clinica_id) {
  await fs.promises.rm(getSessionDir(clinica_id), { recursive: true, force: true });
}

// Limpa arquivos de trava residuais deixados por processos anteriores do Chrome
function cleanSessionLocks(clinica_id) {
  try {
    const sessionDir = path.resolve(`./.wwebjs_auth/session-clinica_${clinica_id}`);
    if (fs.existsSync(sessionDir)) {
      const lockFiles = [
        'DevToolsActivePort',
        'SingletonLock',
        'SingletonCookie',
        'SingletonSocket',
        'lockfile'
      ];
      for (const file of lockFiles) {
        const filePath = path.join(sessionDir, file);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`🧹 Lock residual removido: ${file} (Clínica ${clinica_id})`);
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.warn(`Aviso ao verificar locks da sessão:`, err.message);
  }
}

export const initWhatsApp = (clinica_id) => {
  if (clients.has(clinica_id)) {
    return clients.get(clinica_id);
  }
  manuallyDisconnected.delete(clinica_id);

  // Limpa travas antigas antes de lançar o Puppeteer
  cleanSessionLocks(clinica_id);

  status.set(clinica_id, 'INICIANDO');
  loadingProgress.delete(clinica_id);

  // Isola as pastas de sessão por clínica para garantir privacidade dos dados
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `clinica_${clinica_id}`
    }),
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
        '--disable-extensions'
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
      console.log(`📱 QR Code gerado para Clínica ${clinica_id}`);
    } catch (err) {
      console.error('Erro ao gerar QR Code base64:', err);
    }
  });

  client.on('ready', () => {
    if (clients.get(clinica_id) !== client) return;
    status.set(clinica_id, 'CONECTADO');
    loadingProgress.delete(clinica_id);
    qrCodes.delete(clinica_id);
    console.log(`✅ WhatsApp conectado para Clínica ${clinica_id}`);
  });

  client.on('authenticated', () => {
    if (clients.get(clinica_id) !== client) return;
    status.set(clinica_id, 'AUTENTICADO');
    console.log(`🔐 WhatsApp autenticado para Clínica ${clinica_id}`);
  });

  client.on('loading_screen', (percent) => {
    if (clients.get(clinica_id) !== client) return;
    // Eventos de progresso podem chegar atrasados depois que o cliente ficou pronto.
    if (status.get(clinica_id) === 'CONECTADO') return;
    status.set(clinica_id, 'SINCRONIZANDO');
    loadingProgress.set(clinica_id, Number.isFinite(percent) ? percent : null);
  });

  client.on('auth_failure', msg => {
    if (clients.get(clinica_id) !== client) return;
    console.error(`❌ Falha na autenticação da Clínica ${clinica_id}`, msg);
    status.set(clinica_id, 'FALHA');
    loadingProgress.delete(clinica_id);
  });

  client.on('disconnected', (reason) => {
    if (restarting.has(clinica_id)) return;
    if (clients.get(clinica_id) !== client) return;
    console.log(`🔌 WhatsApp desconectado para Clínica ${clinica_id}`, reason);
    status.set(clinica_id, 'DESCONECTADO');
    loadingProgress.delete(clinica_id);
    clients.delete(clinica_id);
    qrCodes.delete(clinica_id);
    cleanSessionLocks(clinica_id);
  });

  clients.set(clinica_id, client);

  // Inicializa de forma segura sem crashar o processo Node se houver erro
  client.initialize().catch(async (err) => {
    if (restarting.has(clinica_id)) return;
    if (clients.get(clinica_id) !== client) return;
    console.error(`❌ Erro ao inicializar WhatsApp para Clínica ${clinica_id}:`, err.message);
    status.set(clinica_id, 'FALHA');
    loadingProgress.delete(clinica_id);
    clients.delete(clinica_id);
    qrCodes.delete(clinica_id);
    try {
      await client.destroy();
    } catch (_) {}
    cleanSessionLocks(clinica_id);
  });

  return client;
};

export const getStatus = (clinica_id) => {
  if (restarting.has(clinica_id)) {
    return { status: 'INICIANDO', qr: null, phone: null, progress: null };
  }
  if (manuallyDisconnected.has(clinica_id)) {
    return { status: 'DESCONECTADO', qr: null, phone: null, progress: null };
  }
  if (!clients.has(clinica_id)) {
    // Tenta inicializar se não existir
    initWhatsApp(clinica_id);
    return { status: 'INICIANDO', qr: null, phone: null, progress: null };
  }
  return {
    status: status.get(clinica_id) || 'INICIANDO',
    qr: qrCodes.get(clinica_id) || null,
    progress: loadingProgress.get(clinica_id) ?? null,
    phone: clients.get(clinica_id)?.info?.wid?.user
      ? `+${clients.get(clinica_id).info.wid.user}`
      : null
  };
};

export const disconnect = async (clinica_id) => {
  if (restarting.has(clinica_id)) return false;
  const client = clients.get(clinica_id);
  restarting.add(clinica_id);
  try {
    if (client) {
      await client.destroy();
      if (clients.get(clinica_id) === client) clients.delete(clinica_id);
    }
    qrCodes.delete(clinica_id);
    status.set(clinica_id, 'DESCONECTADO');
    loadingProgress.delete(clinica_id);
    await removeSession(clinica_id);
    cleanSessionLocks(clinica_id);
    manuallyDisconnected.add(clinica_id);
    return Boolean(client);
  } finally {
    restarting.delete(clinica_id);
  }
};

export const getClient = (clinica_id) => {
  return status.get(clinica_id) === 'CONECTADO' ? clients.get(clinica_id) : null;
};

export const gerarNovoQr = async (clinica_id) => {
  if (restarting.has(clinica_id)) return false;
  restarting.add(clinica_id);
  try {
    const client = clients.get(clinica_id);
    if (client) {
      await client.destroy();
      if (clients.get(clinica_id) === client) clients.delete(clinica_id);
    }
    qrCodes.delete(clinica_id);
    status.set(clinica_id, 'INICIANDO');
    loadingProgress.delete(clinica_id);
    await removeSession(clinica_id);
    cleanSessionLocks(clinica_id);
    initWhatsApp(clinica_id);
    return true;
  } finally {
    restarting.delete(clinica_id);
  }
};

// Encerramento gracioso dos navegadores ao parar o Node
export const cleanupAllClients = async () => {
  console.log('🔄 Fechando instâncias do WhatsApp...');
  for (const [clinica_id, client] of clients.entries()) {
    try {
      await client.destroy();
    } catch (_) {}
    cleanSessionLocks(clinica_id);
  }
  clients.clear();
};
