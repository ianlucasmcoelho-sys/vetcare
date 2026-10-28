import { apiGet, apiPost } from './api';

async function json(response) {
  if (!response) throw new Error('Sua sessão expirou. Entre novamente.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o pagamento.');
  return data;
}
export const getBillingStatus = paymentId => apiGet(`/asaas/status${paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : ''}`).then(json);
export const resumeCheckout = () => apiGet('/asaas/checkout').then(json);
export const subscribe = body => apiPost('/asaas/subscribe',body).then(json);
export function syncBilling(status) {
  const user = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!user) return;
  user.clinica = {...user.clinica,status_assinatura:status.status_assinatura,plano_id:status.plano_id,data_expiracao:status.data_expiracao};
  localStorage.setItem('usuario',JSON.stringify(user));
  window.dispatchEvent(new Event('billing-updated'));
}
