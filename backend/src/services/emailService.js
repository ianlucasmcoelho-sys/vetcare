// backend/src/services/emailService.js
import nodemailer from 'nodemailer';

// Configuração dinâmica: se as credenciais SMTP estiverem definidas, ativa envio real
const isSmtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const MODO_TESTE = process.env.EMAIL_TEST_MODE === 'true' || (!isSmtpConfigured && process.env.NODE_ENV !== 'production');

const getTransporter = () => {
  if (!isSmtpConfigured) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = isSmtpConfigured ? getTransporter() : null;

// Simular envio (modo desenvolvimento ou sem SMTP configurado)
const simularEnvio = (email, assunto, html) => {
  console.log('='.repeat(60));
  console.log('📧 [E-MAIL - SIMULAÇÃO / DEV] 📧');
  console.log('='.repeat(60));
  console.log(`📨 Para: ${email}`);
  console.log(`📌 Assunto: ${assunto}`);
  console.log(`📝 Configure SMTP_USER e SMTP_PASS no .env para envio real.`);
  console.log('='.repeat(60));
  
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
    throw error;
  }
};

// Enviar e-mail (decide entre teste e real)
export const enviarEmail = async (email, assunto, html) => {
  if (MODO_TESTE) {
    return simularEnvio(email, assunto, html);
  }
  if (!transporter) throw new Error('SMTP não configurado para envio de e-mail.');
  return enviarReal(email, assunto, html);
};

// Enviar e-mail de recuperação de senha
export const enviarEmailRecuperacao = async (email, nome, token) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetar-senha#token=${encodeURIComponent(token)}`;
  const nomeSeguro = String(nome || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  
  const assunto = 'Recuperação de Senha - VetCare';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f766e, #14b8a6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🐾 VetCare</h1>
      </div>
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b;">Olá, ${nomeSeguro}!</h2>
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
