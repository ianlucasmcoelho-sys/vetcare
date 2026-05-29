// backend/src/services/emailService.js
import nodemailer from 'nodemailer';

// Configuração (modo desenvolvimento - simulação)
const MODO_TESTE = true; // Em produção, mude para false e configure SMTP

// Configuração real (para quando for usar)
const transporter = MODO_TESTE ? null : nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Simular envio (modo teste)
const simularEnvio = (email, assunto, html) => {
  console.log('=' .repeat(60));
  console.log('📧 [E-MAIL - MODO TESTE] 📧');
  console.log('=' .repeat(60));
  console.log(`📨 Para: ${email}`);
  console.log(`📌 Assunto: ${assunto}`);
  console.log(`📝 Conteúdo:`);
  console.log('-'.repeat(40));
  // Remove tags HTML para exibição
  const textoLimpo = html.replace(/<[^>]*>/g, ' ');
  console.log(textoLimpo.substring(0, 500));
  console.log('-'.repeat(40));
  console.log('✅ E-mail seria enviado (modo teste)');
  console.log('=' .repeat(60));
  
  return { success: true, mode: 'test', email, assunto };
};

// Enviar e-mail real
const enviarReal = async (email, assunto, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"VetCare" <${process.env.SMTP_USER}>`,
      to: email,
      subject: assunto,
      html: html,
    });
    console.log(`📧 E-mail enviado para ${email}`);
    return info;
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    return null;
  }
};

// Enviar e-mail (decide entre teste e real)
export const enviarEmail = async (email, assunto, html) => {
  if (MODO_TESTE) {
    return simularEnvio(email, assunto, html);
  } else {
    return enviarReal(email, assunto, html);
  }
};

// Enviar e-mail de recuperação de senha
export const enviarEmailRecuperacao = async (email, nome, token) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetar-senha?token=${token}`;
  
  const assunto = 'Recuperação de Senha - VetCare';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #14b8a6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🐾 VetCare</h1>
      </div>
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b;">Olá, ${nome}!</h2>
        <p style="color: #475569;">Recebemos uma solicitação para redefinir sua senha.</p>
        <p style="color: #475569;">Clique no botão abaixo para criar uma nova senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #14b8a6, #0d9488); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Redefinir Senha</a>
        </div>
        <p style="color: #475569; font-size: 12px;">Se você não solicitou esta alteração, ignore este e-mail.</p>
        <hr style="border-color: #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">© 2024 VetCare - Sistema de Gestão Veterinária</p>
      </div>
    </div>
  `;
  
  return enviarEmail(email, assunto, html);
};