import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs;
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Mapa para guardar as instâncias de cada clínica (Multi-tenant seguro)
const clients = new Map();
const qrCodes = new Map();
const status = new Map();

export const initWhatsApp = (clinica_id) => {
  if (clients.has(clinica_id)) {
    return clients.get(clinica_id);
  }

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
        '--disable-gpu'
      ]
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
  });

  client.on('qr', async (qr) => {
    // Transforma o QR numa imagem base64 para exibir no front-end
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
  });

  client.initialize();
  clients.set(clinica_id, client);

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
    await client.logout();
    await client.destroy();
    clients.delete(clinica_id);
    status.set(clinica_id, 'DESCONECTADO');
    qrCodes.delete(clinica_id);
    return true;
  }
  return false;
};

export const getClient = (clinica_id) => {
  return clients.get(clinica_id);
};
