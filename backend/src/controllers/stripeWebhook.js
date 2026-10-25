import stripeLib from 'stripe';
import { runTransaction } from '../db.js';

const stripe = process.env.STRIPE_SECRET_KEY ? stripeLib(process.env.STRIPE_SECRET_KEY) : null;

export const handleStripeWebhook = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !endpointSecret) {
    return res.status(503).json({ error: 'Webhook Stripe não configurado.' });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], endpointSecret);
  } catch (err) {
    console.warn('Assinatura do webhook Stripe inválida:', err.message);
    return res.status(400).json({ error: 'Webhook inválido.' });
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const clinicId = Number(session?.client_reference_id);
    const planId = session?.metadata?.plano_id;
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0 || session?.mode !== 'subscription' || !['clinica', 'complete'].includes(planId)) {
      return res.status(400).json({ error: 'Sessão de pagamento inválida.' });
    }
    if (session.payment_status !== 'paid') return res.status(200).json({ received: true, pending: true });
    try {
      const updated = await runTransaction(async (db) => {
        const eventInsert = await db.run(
          'INSERT INTO processed_webhook_events (provider, event_id) VALUES (?, ?) ON CONFLICT(provider, event_id) DO NOTHING',
          ['stripe', event.id]
        );
        if (!eventInsert.changes) return 'duplicate';
        const clinic = await db.get('SELECT id, data_expiracao FROM clinicas WHERE id = ?', [clinicId]);
        if (!clinic) throw new Error('Clínica não encontrada.');
        const currentExpiry = clinic.data_expiracao ? new Date(clinic.data_expiracao) : new Date();
        const expiry = Number.isNaN(currentExpiry.getTime()) || currentExpiry < new Date() ? new Date() : currentExpiry;
        expiry.setDate(expiry.getDate() + 30);
        await db.run('UPDATE clinicas SET status_assinatura = ?, data_expiracao = ?, plano_id = ? WHERE id = ?', ['active', expiry.toISOString(), planId, clinicId]);
        return 'updated';
      });
      if (updated === 'duplicate') return res.status(200).json({ received: true, duplicate: true });
    } catch (error) {
      console.error('Falha ao processar evento Stripe:', error);
      return res.status(500).json({ error: 'Falha ao processar evento.' });
    }
  }
  return res.status(200).json({ received: true });
};
