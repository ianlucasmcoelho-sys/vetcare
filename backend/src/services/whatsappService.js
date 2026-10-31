import { openDb } from '../db.js';
import { getClient } from './whatsappManager.js';

// Enviar mensagem via WhatsApp nativo
export const enviarWhatsApp = async (telefone, mensagem, clinica_id, { manual = false } = {}) => {
  try {
    const db = await openDb();
    const config = await db.get(`SELECT * FROM configuracoes_whatsapp WHERE clinica_id = ?`, [clinica_id || 1]);

    if (!config || (!config.ativo && !manual)) {
      console.log('⚠️ WhatsApp desativado na configuração da clínica.');
      return null;
    }

    const client = getClient(clinica_id || 1);
    if (!client) {
      console.log('⚠️ Cliente WhatsApp não está conectado.');
      return null;
    }

    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroComDDI = numeroLimpo.startsWith('55') && numeroLimpo.length > 11 ? numeroLimpo : `55${numeroLimpo}`;
    const numeroFormatado = `${numeroComDDI}@c.us`; // Formato exigido pelo whatsapp-web.js
    
    await client.sendMessage(numeroFormatado, mensagem);
    
    console.log(`📱 WhatsApp enviado para ${numeroFormatado}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error.message);
    return null;
  }
};

// Enviar lembrete de consulta
export const enviarLembreteConsulta = async (telefone, petNome, data, horario, clinica_id) => {
  const db = await openDb();
  const config = await db.get(`SELECT * FROM configuracoes_whatsapp WHERE clinica_id = ?`, [clinica_id || 1]);
  
  if (!config || !config.ativo || !config.lembrete_consulta) return null;

  let mensagem = config.mensagem_consulta || `Olá! Este é um lembrete da sua consulta.`;
  mensagem = `${mensagem}\n\n📅 Data: ${data}\n🕐 Horário: ${horario}\n🐕 Pet: ${petNome}`;
  
  return enviarWhatsApp(telefone, mensagem, clinica_id);
};

// Enviar lembrete de vacina
export const enviarLembreteVacina = async (telefone, petNome, vacina, dataVencimento, clinica_id) => {
  const db = await openDb();
  const config = await db.get(`SELECT * FROM configuracoes_whatsapp WHERE clinica_id = ?`, [clinica_id || 1]);
  
  if (!config || !config.ativo || !config.lembrete_vacina) return null;

  let mensagem = config.mensagem_vacina || `Olá! A vacina do seu pet está perto do vencimento.`;
  mensagem = `${mensagem}\n\n🐕 Pet: ${petNome}\n💊 Vacina: ${vacina}\n📅 Vence em: ${dataVencimento}`;
  
  return enviarWhatsApp(telefone, mensagem, clinica_id);
};

// Enviar lembrete de retorno
export const enviarLembreteRetorno = async (telefone, petNome, dataRetorno, motivo, clinica_id) => {
  const db = await openDb();
  const config = await db.get(`SELECT * FROM configuracoes_whatsapp WHERE clinica_id = ?`, [clinica_id || 1]);
  
  if (!config || !config.ativo || !config.lembrete_consulta) return null;

  let mensagem = `📅 Olá! Seu pet tem um retorno agendado:\n\n🐕 Pet: ${petNome}\n📅 Data: ${dataRetorno}\n🏥 Motivo: ${motivo}`;
  
  return enviarWhatsApp(telefone, mensagem, clinica_id);
};

// Enviar lembrete de aniversário do pet
export const enviarLembreteAniversario = async (telefone, petNome) => {
  const mensagem = `
🎂 *VetCare - Aniversário do Pet* 🎂

Olá! Hoje é o aniversário do seu pet:

🐕 *Pet:* ${petNome}
🎉 *Parabéns!*

❤️ *VetCare - Cuidando do seu melhor amigo* ❤️
  `;
  
  return enviarWhatsApp(telefone, mensagem);
};

// Enviar recibo/confirmação de agendamento
export const enviarConfirmacaoAgendamento = async (telefone, petNome, data, horario, servico) => {
  const mensagem = `
✅ *VetCare - Confirmação de Agendamento* ✅

Olá! Seu agendamento foi confirmado:

🐕 *Pet:* ${petNome}
📅 *Data:* ${data}
🕐 *Horário:* ${horario}
🩺 *Serviço:* ${servico}

Nos vemos em breve!

❤️ *VetCare - Cuidando do seu melhor amigo* ❤️
  `;
  
  return enviarWhatsApp(telefone, mensagem);
};
