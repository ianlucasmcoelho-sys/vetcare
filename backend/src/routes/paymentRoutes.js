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
    const { plano_id, duracao } = req.body; // 'pro', 'premium', e duração em meses
    const { clinica_id } = req.usuario;

    // Se não tiver Stripe configurado, criar um link simulado para testes
    if (!stripe) {
      console.log('⚠️ [MOCK STRIPE] Gerando link de checkout simulado para clínica:', clinica_id);
      
      // Vamos gerar um link falso que redireciona de volta para o frontend com sucesso
      const meses = duracao || 1;
      const mockCheckoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pagamento-sucesso?session_id=mock_${Date.now()}&plano_id=${plano_id}&duracao=${meses}`;
      
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
              name: `Plano ${plano_id.toUpperCase()} - Vet Care`,
            },
            unit_amount: plano_id === 'premium' ? 14900 : 9900, // em centavos
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
    });

    res.json({ url: session.url, mock: false });
  } catch (error) {
    console.error('Erro no checkout Stripe:', error);
    res.status(500).json({ error: 'Erro ao gerar checkout de pagamento' });
  }
});

// Mock Webhook (Usado pelo frontend para simular a confirmação do pagamento)
router.post('/mock-webhook-success', authMiddleware, async (req, res) => {
  try {
    const { clinica_id } = req.usuario;
    const { plano_id, duracao } = req.body;
    const db = await openDb();

    // Renova pela quantidade de meses especificada (ou 1 mês por padrão)
    const meses = duracao ? parseInt(duracao, 10) : 1;
    const planoFinal = plano_id || 'premium';

    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() + meses);
    const expiracao = hoje.toISOString();

    await db.run(
      'UPDATE clinicas SET status_assinatura = "ativo", data_expiracao = ?, plano_id = ? WHERE id = ?',
      [expiracao, planoFinal, clinica_id]
    );

    res.json({ success: true, message: 'Assinatura ativada com sucesso (MOCK)' });
  } catch (error) {
    console.error('Erro no mock webhook:', error);
    res.status(500).json({ error: 'Erro ao simular webhook' });
  }
});

export default router;
