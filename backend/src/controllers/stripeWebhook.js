import stripeLib from 'stripe';
import { openDb } from '../db.js';

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
}

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  // Só valida criptografia se tiver a chave configurada no .env
  if (stripe && endpointSecret) {
    try {
      // O req.body precisa ser o formato RAW passado pelo express.raw()
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('⚠️ [Stripe] Erro na assinatura do Webhook:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // Modo Fallback/Simulado se não tiver Stripe real configurado
    try {
      // No modo fallback, o express.raw preencheu um buffer, precisamos fazer parse pra JSON manual
      const payloadString = req.body.toString('utf8');
      event = JSON.parse(payloadString);
    } catch (e) {
      return res.status(400).send(`Webhook Error: Fallback JSON parse failed`);
    }
  }

  // Manipular o evento de sucesso de checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // O client_reference_id guarda o ID da clínica
    const clinica_id = session.client_reference_id;
    
    if (clinica_id) {
      try {
        const db = await openDb();
        
        // Define +30 dias de acesso (Pode ser melhorado para ler a data do próprio Stripe depois)
        const hoje = new Date();
        hoje.setDate(hoje.getDate() + 30);
        const novaDataExpiracao = hoje.toISOString();
        
        await db.run(
          'UPDATE clinicas SET status_assinatura = "ativo", data_expiracao = ? WHERE id = ?',
          [novaDataExpiracao, clinica_id]
        );
        
        console.log(`✅ [Stripe Webhook] Pagamento aprovado! Clínica ${clinica_id} renovada até ${novaDataExpiracao}`);
      } catch (error) {
        console.error(`❌ [Stripe Webhook] Erro ao atualizar banco de dados para clínica ${clinica_id}:`, error);
        return res.status(500).send('Database Error');
      }
    }
  }

  // O Stripe exige que retornemos 200 OK para saber que recebemos
  res.status(200).json({ received: true });
};
