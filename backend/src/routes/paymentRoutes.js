import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { openDb } from '../db.js';

import stripeLib from 'stripe';

const router = express.Router();

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
}

router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { plano_id } = req.body;
    const { clinica_id } = req.usuario;
    if (!['complete', 'pro', 'premium', 'clinica'].includes(plano_id)) {
      return res.status(400).json({ error: 'Plano inválido.' });
    }
    const planoFinal = 'complete';

    // Se não tiver Stripe configurado, criar um link simulado para testes
    if (!stripe) {
      console.log('⚠️ [MOCK STRIPE] Gerando link de checkout simulado para clínica:', clinica_id);
      
      // Vamos gerar um link falso que redireciona de volta para o frontend com sucesso
      const mockCheckoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pagamento-sucesso?session_id=mock_${Date.now()}&plano_id=complete`;
      
      return res.json({ url: mockCheckoutUrl, mock: true });
    }

    // Integração Real com Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'VetCare Completo',
            },
            unit_amount: 9700,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/planos`,
      client_reference_id: clinica_id.toString(),
      metadata: { plano_id: planoFinal },
      subscription_data: { metadata: { clinica_id: clinica_id.toString(), plano_id: planoFinal } },
    });

    res.json({ url: session.url, mock: false });
  } catch (error) {
    console.error('Erro no checkout Stripe:', error);
    res.status(500).json({ error: 'Erro ao gerar checkout de pagamento' });
  }
});

// Mock Webhook (Usado pelo frontend para simular a confirmação do pagamento em desenvolvimento)
router.post('/mock-webhook-success', authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Mock webhooks estão desativados em produção.' });
  }

  try {
    const { clinica_id } = req.usuario;
    const { plano_id } = req.body;
    if (!String(req.body.session_id || '').startsWith('mock_')) {
      return res.status(400).json({ error: 'Sessão de demonstração inválida.' });
    }
    if (plano_id && !['pro', 'premium', 'clinica', 'complete'].includes(plano_id)) {
      return res.status(400).json({ error: 'Plano inválido.' });
    }
    const db = await openDb();

    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() + 1);
    const expiracao = hoje.toISOString();

    await db.run(
      "UPDATE clinicas SET status_assinatura = 'active', data_expiracao = ?, plano_id = ? WHERE id = ?",
      [expiracao, 'complete', clinica_id]
    );

    res.json({ success: true, message: 'Assinatura ativada com sucesso (MOCK)' });
  } catch (error) {
    console.error('Erro no mock webhook:', error);
    res.status(500).json({ error: 'Erro ao simular webhook' });
  }
});

export default router;
