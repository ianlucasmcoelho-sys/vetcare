import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs;
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Mapa para guardar as instâncias de cada clínica (Multi-tenant seguro)
const clients = new Map();
const qrCodes = new Map();
const status = new Map();

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

  // Limpa travas antigas antes de lançar o Puppeteer
  cleanSessionLocks(clinica_id);

  status.set(clinica_id, 'INICIANDO');

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
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      qrCodes.set(clinica_id, qrDataUrl);
      status.set(clinica_id, 'AGUARDANDO_LEITURA');
      console.log(`📱 QR Code gerado para Clínica ${clinica_id}`);
    } catch (err) {
      console.error('Erro ao gerar QR Code base64:', err);
    }
  });

  client.on('ready', () => {
    status.set(clinica_id, 'CONECTADO');
    qrCodes.delete(clinica_id);
    console.log(`✅ WhatsApp conectado para Clínica ${clinica_id}`);
  });

  client.on('authenticated', () => {
    console.log(`🔐 WhatsApp autenticado para Clínica ${clinica_id}`);
  });

  client.on('auth_failure', msg => {
    console.error(`❌ Falha na autenticação da Clínica ${clinica_id}`, msg);
    status.set(clinica_id, 'FALHA');
  });

  client.on('disconnected', (reason) => {
    console.log(`🔌 WhatsApp desconectado para Clínica ${clinica_id}`, reason);
    status.set(clinica_id, 'DESCONECTADO');
    clients.delete(clinica_id);
    qrCodes.delete(clinica_id);
    cleanSessionLocks(clinica_id);
  });

  clients.set(clinica_id, client);

  // Inicializa de forma segura sem crashar o processo Node se houver erro
  client.initialize().catch(async (err) => {
    console.error(`❌ Erro ao inicializar WhatsApp para Clínica ${clinica_id}:`, err.message);
    status.set(clinica_id, 'FALHA');
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
  if (!clients.has(clinica_id)) {
    // Tenta inicializar se não existir
    initWhatsApp(clinica_id);
    return { status: 'INICIANDO', qr: null };
  }
  return {
    status: status.get(clinica_id) || 'INICIANDO',
    qr: qrCodes.get(clinica_id) || null
  };
};

export const disconnect = async (clinica_id) => {
  const client = clients.get(clinica_id);
  if (client) {
    try {
      await client.logout();
    } catch (_) {}
    try {
      await client.destroy();
    } catch (_) {}
    clients.delete(clinica_id);
    status.set(clinica_id, 'DESCONECTADO');
    qrCodes.delete(clinica_id);
    cleanSessionLocks(clinica_id);
    return true;
  }
  cleanSessionLocks(clinica_id);
  return false;
};

export const getClient = (clinica_id) => {
  return clients.get(clinica_id);
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
