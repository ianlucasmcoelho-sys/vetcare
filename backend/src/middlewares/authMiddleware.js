import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'vetcare_secret_key_2024';

import { openDb } from '../db.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validar se o token possui o clinica_id (SaaS)
    if (!decoded.clinica_id) {
      console.warn('⚠️ Token sem clinica_id detectado para usuário:', decoded.email);
      return res.status(401).json({ error: 'Token obsoleto. Por favor, faça login novamente.' });
    }

    req.usuario = decoded;

    // --- SaaS Subscription Check ---
    // Bypass for payment/billing routes so they can actually pay
    const isBillingRoute = req.originalUrl.includes('/pagamento')
      || req.originalUrl.includes('/planos')
      || ['/api/asaas/subscribe', '/api/asaas/status'].some((path) => req.originalUrl.startsWith(path));
    if (isBillingRoute) {
      return next();
    }

    const db = await openDb();
    const clinica = await db.get('SELECT status_assinatura, data_expiracao FROM clinicas WHERE id = ?', [decoded.clinica_id]);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada.' });
    }

    const { status_assinatura, data_expiracao } = clinica;

    if (status_assinatura === 'vitalicio') {
      return next();
    }

    // Contas Free têm sete dias de avaliação. Sem vencimento cadastrado, o acesso é negado.
    if (['free', 'trial'].includes(status_assinatura) && !data_expiracao) {
      await db.run("UPDATE clinicas SET status_assinatura = 'vencido' WHERE id = ?", [decoded.clinica_id]);
      return res.status(402).json({ error: 'Período gratuito encerrado', code: 'SUBSCRIPTION_EXPIRED', message: 'Seu período gratuito de 7 dias terminou. Assine o VetCare Completo para continuar.' });
    }

    if (data_expiracao) {
      const expirationDate = new Date(data_expiracao);
      const now = new Date();

      if (now > expirationDate) {
        if (status_assinatura !== 'vencido') {
          await db.run("UPDATE clinicas SET status_assinatura = 'vencido' WHERE id = ?", [decoded.clinica_id]);
        }
        return res.status(402).json({ 
          error: 'Assinatura vencida', 
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Seu período gratuito ou assinatura terminou. Assine o VetCare Completo para continuar.' 
        });
      }
    }

    if (status_assinatura === 'vencido') {
      return res.status(402).json({ 
        error: 'Assinatura vencida', 
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Seu período de acesso terminou. Por favor, assine um plano para continuar.' 
      });
    }

    next();
  } catch (err) {
    console.error('❌ Erro na validação do token/assinatura:', err.message);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};
