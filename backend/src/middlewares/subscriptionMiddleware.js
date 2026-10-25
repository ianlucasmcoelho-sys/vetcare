import { openDb } from '../db.js';

export const requireActiveSubscription = async (req, res, next) => {
  try {
    const { clinica_id } = req.usuario; // Vem do authMiddleware

    if (!clinica_id) {
      return res.status(401).json({ error: 'Sessão inválida ou clínica não identificada.' });
    }

    const db = await openDb();
    const clinica = await db.get('SELECT status_assinatura, data_expiracao FROM clinicas WHERE id = ?', [clinica_id]);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada.' });
    }

    const { status_assinatura, data_expiracao } = clinica;

    // Se for vitalício, passa direto
    if (status_assinatura === 'vitalicio') {
      return next();
    }

    if (['free', 'trial'].includes(status_assinatura) && !data_expiracao) {
      await db.run("UPDATE clinicas SET status_assinatura = 'vencido' WHERE id = ?", [clinica_id]);
      return res.status(402).json({ error: 'Período gratuito encerrado', code: 'SUBSCRIPTION_EXPIRED', message: 'Seu período gratuito de 7 dias terminou. Assine o VetCare Completo para continuar.' });
    }

    // Se a data de expiração passou
    if (data_expiracao) {
      const expirationDate = new Date(data_expiracao);
      const now = new Date();

      if (now > expirationDate) {
        // Se ainda estiver listado como ativo ou trial no banco, mas já passou do prazo, atualiza para vencido
        if (status_assinatura !== 'vencido') {
          await db.run("UPDATE clinicas SET status_assinatura = 'vencido' WHERE id = ?", [clinica_id]);
        }
        return res.status(402).json({ 
          error: 'Assinatura vencida', 
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Seu período de acesso terminou. Por favor, assine um plano para continuar usando o sistema.' 
        });
      }
    }

    // Se o status for vencido explícito
    if (status_assinatura === 'vencido') {
      return res.status(402).json({ 
        error: 'Assinatura vencida', 
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Seu período de acesso terminou. Por favor, assine um plano para continuar usando o sistema.' 
      });
    }

    // Se passou pelas verificações, está com trial ou ativo dentro do prazo
    next();
  } catch (error) {
    console.error('Erro na validação da assinatura:', error);
    res.status(500).json({ error: 'Erro ao validar assinatura da clínica' });
  }
};

export const requirePremiumFeature = async (req, res, next) => {
  try {
    const { clinica_id } = req.usuario;
    if (!clinica_id) return res.status(401).json({ error: 'Sessão inválida' });

    const db = await openDb();
    const clinica = await db.get('SELECT status_assinatura, plano_id FROM clinicas WHERE id = ?', [clinica_id]);

    if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' });

    const { status_assinatura, plano_id } = clinica;

    // Somente assinatura paga ativa ou acesso vitalício libera módulos completos.
    if (status_assinatura === 'vitalicio' || (['active', 'ativo', 'ativa', 'lifetime'].includes(status_assinatura) && plano_id !== 'free')) {
      return next();
    }
    return res.status(403).json({
      error: 'Recurso Restrito',
      code: 'PREMIUM_REQUIRED',
      message: 'Este módulo está disponível no plano VetCare Completo. Assine por R$ 97/mês para liberar o acesso.'
    });
  } catch (error) {
    console.error('Erro na validação de feature premium:', error);
    res.status(500).json({ error: 'Erro ao validar acesso a recurso premium' });
  }
};
