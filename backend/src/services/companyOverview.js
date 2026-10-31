import { BILLING_PRICE } from './subscriptionBilling.js';
import { isRetiredDemoAccount } from './demoAccess.js';

const settled = new Set(['CONFIRMED', 'RECEIVED']);
const day = value => {
  const text = String(value || '').slice(0, 10);
  const parsed = new Date(`${text}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === text ? text : '';
};
const amount = value => value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value) * 100) : null;

// Só exporta cadastros comerciais. Não consulta pacientes, prontuários ou o caixa das clínicas.
export function createCompanyOverview({ openDb, gateway, clock = () => new Date(), cacheMs = 60000 }) {
  const cache = new Map();
  async function providerSnapshot(clinic) {
    const key = `${clinic.asaas_subscription_id}:${clinic.asaas_customer_id}`;
    let cached = cache.get(key);
    if (cached && cached.until > +clock()) return cached.promise;
    const promise = (async () => {
      const subscription = await gateway.getSubscription(clinic.asaas_subscription_id);
      if (subscription.id !== clinic.asaas_subscription_id || subscription.customer !== clinic.asaas_customer_id) throw new Error('Vínculo comercial divergente.');
      const payments = new Map();
      for (let offset = 0; ; offset += 100) {
        if (offset >= 10000) throw new Error('Histórico excede limite de conciliação.');
        const result = await gateway.listCompanyPayments(clinic.asaas_subscription_id, offset);
        if (!Array.isArray(result.data)) throw new Error('Resposta de cobrança inválida.');
        for (const payment of result.data) {
          if (payment.subscription !== clinic.asaas_subscription_id || payment.customer !== clinic.asaas_customer_id || !payment.id) throw new Error('Cobrança de outro vínculo.');
          payments.set(payment.id, payment);
        }
        if (!result.hasMore) break;
        if (!result.data.length) throw new Error('Paginação de cobranças inválida.');
      }
      return { subscription, payments: [...payments.values()], checkedAt: clock().toISOString() };
    })();
    cached = { promise, until: +clock() + cacheMs }; cache.set(key, cached);
    try { return await promise; }
    catch (error) { if (cache.get(key) === cached) cache.delete(key); throw error; }
  }
  return async function overview(month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) throw Object.assign(new Error('Mês inválido.'), { httpStatus: 400 });
    const db = await openDb();
    const rows = await db.all(`SELECT c.id, c.nome, c.email, c.telefone, c.created_at, c.plano_id, c.status_assinatura, c.data_expiracao,
      c.asaas_subscription_id, c.asaas_customer_id, c.asaas_environment,
      (SELECT u.nome FROM usuarios u WHERE u.clinica_id = c.id AND u.perfil = 'admin' AND u.ativo = 1 ORDER BY u.id LIMIT 1) AS contact
      FROM clinicas c ORDER BY c.created_at DESC, c.id DESC`);
    const clinics = rows.filter(c => !isRetiredDemoAccount({ clinica_email: c.email }));
    const linkCounts = new Map();
    for (const clinic of clinics) {
      if (clinic.asaas_environment === 'production' && clinic.asaas_subscription_id) linkCounts.set(clinic.asaas_subscription_id, (linkCounts.get(clinic.asaas_subscription_id) || 0) + 1);
    }
    const clients = [], entries = [], issues = [];
    if (!gateway.configured || gateway.sandbox) issues.push({ clinic_id: null, message: 'Conexão com Asaas de produção indisponível; recebimentos e taxas não foram conciliados.' });
    const now = clock();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const environment = gateway.sandbox ? 'sandbox' : 'production';
    // Séries em lotes pequenos: limita concorrência sem tocar cobranças ou acessos.
    for (let start = 0; start < clinics.length; start += 4) {
      await Promise.all(clinics.slice(start, start + 4).map(async c => {
        const lifetime = c.status_assinatura === 'vitalicio';
        const valid = new Date(c.data_expiracao) > now;
        const raw = c.status_assinatura;
        let status = lifetime ? 'lifetime' : ['cancelled', 'canceled', 'cancelado'].includes(raw) ? 'cancelled' : ['trial', 'free'].includes(raw) ? (valid ? 'trial' : 'expired') : raw === 'active' && valid ? 'active' : c.asaas_subscription_id ? 'overdue' : 'expired';
        const subscribed = Boolean(c.asaas_subscription_id && c.asaas_customer_id && c.asaas_environment === 'production');
        let monthly = lifetime || !subscribed ? 0 : null;
        let due = day(c.data_expiracao), providerStatus = '', providerCheckedAt = null;
        if (subscribed) {
          if (linkCounts.get(c.asaas_subscription_id) > 1) {
            issues.push({ clinic_id: String(c.id), message: 'Assinatura vinculada a mais de uma clínica; conciliação bloqueada.' });
          } else if (gateway.configured && !gateway.sandbox) {
            try {
              const snapshot = await providerSnapshot(c);
              const { subscription, payments } = snapshot;
              providerCheckedAt = snapshot.checkedAt; providerStatus = subscription.status;
              if (!lifetime && (subscription.deleted || ['INACTIVE', 'EXPIRED'].includes(subscription.status))) status = 'cancelled';
              monthly = lifetime ? 0 : subscription.cycle === 'MONTHLY' ? amount(subscription.value) : null;
              due = day(subscription.nextDueDate) || due;
              if (!lifetime && status !== 'cancelled') {
                if (payments.some(p => !p.deleted && p.status === 'OVERDUE' && day(p.dueDate) && day(p.dueDate) < today)) status = 'overdue';
                else if (subscription.status === 'ACTIVE' && payments.some(p => !p.deleted && settled.has(p.status) && day(p.dueDate) && new Date(`${day(p.dueDate)}T00:00:00Z`) <= now) && valid) status = 'active';
              }
              for (const p of payments) {
                if (p.deleted || !settled.has(p.status)) continue;
                const paidOn = day(p.paymentDate) || day(p.clientPaymentDate) || day(p.confirmedDate);
                const gross = amount(p.value), net = amount(p.netValue);
                if (!paidOn || gross === null) { issues.push({ clinic_id: String(c.id), message: 'Cobrança confirmada sem valor ou data verificável.' }); continue; }
                if (!paidOn.startsWith(`${month}-`)) continue;
                const base = { client_id: String(c.id), client_name: c.nome || 'Clínica sem nome', occurred_on: paidOn, source: 'asaas', readonly: true };
                entries.push({ ...base, id: `asaas:${p.id}`, kind: 'income', description: 'Mensalidade VetCare · Asaas', amount_cents: gross });
                if (net !== null && net <= gross && gross - net > 0) entries.push({ ...base, id: `fee:${p.id}`, kind: 'expense', description: 'Taxa Asaas da mensalidade', amount_cents: gross - net });
                if (net === null || net > gross) issues.push({ clinic_id: String(c.id), message: 'Taxa da cobrança indisponível.' });
              }
            } catch { issues.push({ clinic_id: String(c.id), message: 'Não foi possível conciliar esta assinatura com o Asaas.' }); }
          }
        }
        clients.push({ id: String(c.id), name: c.nome || 'Clínica sem nome', contact: c.contact || '', email: c.email || '', phone: c.telefone || '',
          status, plan_id: lifetime ? 'lifetime' : c.plano_id || 'free', plan_name: lifetime ? 'Vitalício' : c.plano_id === 'complete' ? 'VetCare Completo' : 'Teste / sem assinatura',
          monthly_cents: monthly, started_on: day(c.created_at), due_on: due, created_at: String(c.created_at || ''), source: 'vetcare', readonly: true,
          billing_environment: c.asaas_environment || null, provider_status: providerStatus, provider_checked_at: providerCheckedAt });
      }));
    }
    clients.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    entries.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || a.id.localeCompare(b.id));
    const income = entries.filter(e => e.kind === 'income').reduce((s, e) => s + e.amount_cents, 0);
    const expense = entries.filter(e => e.kind === 'expense').reduce((s, e) => s + e.amount_cents, 0);
    const complete = issues.length === 0;
    return { clients, entries, plans: [{ id: 'complete', name: 'VetCare Completo', monthly_cents: BILLING_PRICE * 100, active: 1, readonly: true }, { id: 'free', name: 'Teste de 7 dias', monthly_cents: 0, active: 1, readonly: true }, { id: 'lifetime', name: 'Vitalício', monthly_cents: 0, active: 1, readonly: true }], auditLog: [], month,
      automatic: true, summary: { active: clients.filter(c => c.status === 'active').length, trial: clients.filter(c => c.status === 'trial').length,
        overdue: clients.filter(c => c.status === 'overdue').length, lifetime: clients.filter(c => c.status === 'lifetime').length,
        mrr: clients.some(c => c.status === 'active' && c.billing_environment === 'production' && c.monthly_cents === null) ? null : clients.filter(c => c.status === 'active' && c.billing_environment === 'production').reduce((sum, c) => sum + (c.monthly_cents || 0), 0),
        income: complete ? income : null, expense: complete ? expense : null, balance: complete ? income - expense : null },
      sync: { checked_at: now.toISOString(), complete, issues, billing_environment: environment, provider_cache_seconds: cacheMs / 1000,
        financial_scope: 'Mensalidades confirmadas atualmente válidas e taxas Asaas; despesas externas não integradas.' } };
  };
}
