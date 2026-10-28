// New subscriptions and confirmations are handled exclusively by Asaas.
// Retire the incomplete Stripe flow rather than granting access from old links.
export const handleStripeWebhook = (_req,res) => res.status(410).json({error:'Integração Stripe descontinuada. Utilize o checkout Asaas.'});
