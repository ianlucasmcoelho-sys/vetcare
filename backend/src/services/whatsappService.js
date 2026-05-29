// backend/src/services/whatsappService.js
import axios from 'axios';

// Configuração
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN";

// Enviar mensagem via WhatsApp
export const enviarWhatsApp = async (telefone, mensagem) => {
  try {
    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroCompleto = `55${numeroLimpo}`;
    
    const response = await axios.post(`${WHATSAPP_API_URL}/send-text`, {
      phone: numeroCompleto,
      message: mensagem
    });
    
    console.log(`📱 WhatsApp enviado para ${numeroCompleto}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
    return null;
  }
};

// Enviar lembrete de consulta
export const enviarLembreteConsulta = async (telefone, petNome, data, horario) => {
  const mensagem = `
🐾 *VetCare - Lembrete de Consulta* 🐾

Olá! Este é um lembrete da sua consulta agendada:

📅 *Data:* ${data}
🕐 *Horário:* ${horario}
🐕 *Pet:* ${petNome}

✅ Por favor, confirme sua presença com antecedência.

❤️ *VetCare - Cuidando do seu melhor amigo* ❤️
  `;
  
  return enviarWhatsApp(telefone, mensagem);
};

// Enviar lembrete de vacina
export const enviarLembreteVacina = async (telefone, petNome, vacina, dataVencimento) => {
  const mensagem = `
💉 *VetCare - Lembrete de Vacina* 💉

Olá! A vacina do seu pet está perto do vencimento:

🐕 *Pet:* ${petNome}
💊 *Vacina:* ${vacina}
📅 *Vence em:* ${dataVencimento}

⚠️ Agende a aplicação o quanto antes!

❤️ *VetCare - Cuidando do seu melhor amigo* ❤️
  `;
  
  return enviarWhatsApp(telefone, mensagem);
};

// Enviar lembrete de retorno
export const enviarLembreteRetorno = async (telefone, petNome, dataRetorno, motivo) => {
  const mensagem = `
📅 *VetCare - Lembrete de Retorno* 📅

Olá! Seu pet tem um retorno agendado:

🐕 *Pet:* ${petNome}
📅 *Data:* ${dataRetorno}
🏥 *Motivo:* ${motivo}

📍 Sua presença é muito importante!

❤️ *VetCare - Cuidando do seu melhor amigo* ❤️
  `;
  
  return enviarWhatsApp(telefone, mensagem);
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