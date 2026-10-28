import { randomUUID } from 'node:crypto';

export const BILLING_PRICE = 97;
const paid = new Set(['CONFIRMED','RECEIVED']);
const revoked = new Set(['REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED']);
export const billingError = (message, httpStatus = 400) => Object.assign(new Error(message), {httpStatus});
const digits = value => String(value || '').replace(/\D/g,'');
const text = (value, max = 160) => String(value || '').trim().slice(0,max);

export function validatePayer(body) {
  const data = { name:text(body.nome), cpfCnpj:digits(body.cpfCnpj), email:text(body.email), postalCode:digits(body.postalCode), addressNumber:text(body.addressNumber,20), phone:digits(body.phone) };
  if (data.name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || ![11,14].includes(data.cpfCnpj.length) || /^(\d)\1+$/.test(data.cpfCnpj) || data.postalCode.length !== 8 || !data.addressNumber || ![10,11].includes(data.phone.length)) throw billingError('Preencha nome, e-mail, CPF/CNPJ, CEP, número e telefone válidos.');
  if (!['PIX','CREDIT_CARD'].includes(body.billingType) || body.planoId !== 'complete') throw billingError('Plano ou forma de pagamento inválidos.');
  let creditCard;
  if (body.billingType === 'CREDIT_CARD') {
    const card = body.creditCard || {};
    creditCard = {holderName:text(card.holderName),number:digits(card.number),expiryMonth:digits(card.expiryMonth).padStart(2,'0'),expiryYear:digits(card.expiryYear),ccv:digits(card.ccv)};
    const now = new Date();
    const month = Number(creditCard.expiryMonth), year = Number(creditCard.expiryYear);
    if (creditCard.holderName.length < 3 || !/^\d{13,19}$/.test(creditCard.number) || !/^\d{3,4}$/.test(creditCard.ccv) || !/^\d{4}$/.test(creditCard.expiryYear) || month < 1 || month > 12 || new Date(Date.UTC(year,month,1)) <= now) throw billingError('Confira o nome, número, validade e código de segurança do cartão.');
  }
  return {data, creditCard};
}

export function periodEnd(dueDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '')) throw billingError('Vencimento da cobrança inválido.',502);
  const base = new Date(`${dueDate}T00:00:00Z`);
  if (!Number.isFinite(+base) || base.toISOString().slice(0,10) !== dueDate) throw billingError('Vencimento da cobrança inválido.',502);
  const year=base.getUTCFullYear(), month=base.getUTCMonth(), day=base.getUTCDate();
  return new Date(Date.UTC(year,month+1,Math.min(day,new Date(Date.UTC(year,month+2,0)).getUTCDate()),23,59,59,999)).toISOString();
}

// Receives an authoritative payment obtained from Asaas, never a browser payload.
export async function recordPayment(db, clinic, payment, environment = 'sandbox') {
  await db.run('UPDATE clinicas SET asaas_subscription_id = asaas_subscription_id WHERE id = ?',[clinic.id]);
  if (clinic.asaas_environment !== environment || !payment?.id || payment.subscription !== clinic.asaas_subscription_id || payment.customer !== clinic.asaas_customer_id || Math.abs(Number(payment.value)-BILLING_PRICE) > 0.001 || !Number.isFinite(Number(payment.value))) throw billingError('Cobrança incompatível com a assinatura.',422);
  const status = payment.deleted ? 'DELETED' : payment.status;
  const previous = await db.get('SELECT * FROM billing_payments WHERE payment_id = ?', [payment.id]);
  if (previous && (previous.environment !== environment || previous.clinica_id !== clinic.id || previous.subscription_id !== payment.subscription)) throw billingError('Cobrança vinculada a outra assinatura.',422);
  if (previous && ['REFUNDED','DELETED'].includes(previous.status) && paid.has(status)) return;
  if (previous?.status === 'REFUSED' && !paid.has(status) && !revoked.has(status)) return;
  let end = periodEnd(payment.dueDate);
  if (paid.has(status)) {
    const receivedOn = String(payment.clientPaymentDate || payment.paymentDate || payment.confirmedDate || new Date().toISOString()).slice(0,10);
    end = previous && paid.has(previous.status) ? previous.period_end : periodEnd(receivedOn > payment.dueDate ? receivedOn : payment.dueDate);
  }
  // A stale pending/overdue snapshot cannot undo a settled or revoked payment.
  if (previous && (paid.has(previous.status) || revoked.has(previous.status)) && !paid.has(status) && !revoked.has(status)) return;
  await db.run(`INSERT INTO billing_payments (payment_id, clinica_id, subscription_id, status, period_end, environment)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(payment_id) DO UPDATE SET status = excluded.status, period_end = excluded.period_end RETURNING payment_id`, [payment.id,clinic.id,payment.subscription,status,end,environment]);
  if (clinic.status_assinatura === 'vitalicio') return;
  const latest = await db.get("SELECT MAX(period_end) AS expiry FROM billing_payments WHERE clinica_id = ? AND environment = ? AND status IN ('CONFIRMED','RECEIVED')",[clinic.id,environment]);
  const expiry = latest?.expiry;
  if (expiry && new Date(expiry) > new Date()) {
    // Never add days per event: CONFIRMED and RECEIVED are the same monthly charge.
    await db.run("UPDATE clinicas SET status_assinatura = 'active', plano_id = 'complete', data_expiracao = ? WHERE id = ?",[expiry,clinic.id]);
  } else if (revoked.has(status) && previous && paid.has(previous.status)) {
    await db.run("UPDATE clinicas SET status_assinatura = 'vencido', data_expiracao = ? WHERE id = ?",[expiry || new Date().toISOString(),clinic.id]);
  } else if (status === 'OVERDUE' && clinic.data_expiracao && new Date(clinic.data_expiracao) <= new Date()) {
    await db.run("UPDATE clinicas SET status_assinatura = 'vencido' WHERE id = ?",[clinic.id]);
  }
}

export function createBillingService({openDb, runTransaction, gateway}) {
  const environment = gateway.sandbox ? 'sandbox' : 'production';
  const requireConfig = () => { if (!gateway.configured) throw billingError('Pagamentos indisponíveis. A integração Asaas ainda precisa ser configurada.',503); };
  const clinicById = async id => {
    const clinic = await (await openDb()).get('SELECT * FROM clinicas WHERE id = ?', [id]);
    if (!clinic) throw billingError('Clínica não encontrada.',404);
    if ((clinic.asaas_customer_id || clinic.asaas_subscription_id) && clinic.asaas_environment !== environment) throw billingError('Os vínculos de pagamento precisam ser migrados para o ambiente atual.',409);
    return clinic;
  };
  const reconcile = async (clinic,payment) => runTransaction(db=>recordPayment(db,clinic,payment,environment));
  const checkout = async clinic => {
    if (!clinic.asaas_subscription_id) return {state:'new'};
    const subscription = await gateway.getSubscription(clinic.asaas_subscription_id);
    if (subscription.id !== clinic.asaas_subscription_id || subscription.customer !== clinic.asaas_customer_id || Number(subscription.value) !== BILLING_PRICE || subscription.cycle !== 'MONTHLY') throw billingError('A assinatura existente precisa ser revisada pelo atendimento.',409);
    const {data = []} = await gateway.listPayments(subscription.id);
    const payments = [...data].sort((a,b)=>String(b.dueDate).localeCompare(String(a.dueDate)));
    for (const payment of payments) await reconcile(clinic,payment);
    const current = await clinicById(clinic.id);
    if (current.status_assinatura === 'vitalicio' || (current.status_assinatura === 'active' && new Date(current.data_expiracao) > new Date())) return {state:'active'};
    if (subscription.deleted || subscription.status === 'INACTIVE') throw billingError('A assinatura está cancelada. Contate o atendimento para reativá-la.',409);
    const payment = payments.find(p=>!p.deleted && ['PENDING','OVERDUE','AWAITING_RISK_ANALYSIS','AUTHORIZED'].includes(p.status));
    if (!payment) return {state:'failed',subscriptionId:subscription.id,notice:'Não há cobrança pendente disponível. O atendimento precisa verificar a assinatura antes de tentar novamente.'};
    const localPayment=await (await openDb()).get('SELECT status FROM billing_payments WHERE payment_id = ? AND clinica_id = ?',[payment.id,clinic.id]);
    if (localPayment?.status === 'REFUSED') return {state:'failed',subscriptionId:subscription.id,notice:'O cartão não foi aprovado. Contate o atendimento para atualizar o cartão ou a forma de pagamento da assinatura existente.'};
    const result={state:'pending',subscriptionId:subscription.id,paymentId:payment.id,billingType:payment.billingType,dueDate:payment.dueDate};
    if (payment.billingType === 'PIX') {
      try {
        const pix = await gateway.getPix(payment.id);
        result.pix={encodedImage:pix.encodedImage,payload:pix.payload,expirationDate:pix.expirationDate};
      } catch { result.notice='Não foi possível recuperar o QR Code. Tente recuperar a cobrança novamente.'; }
    }
    return result;
  };
  return {
    async status(id,paymentId) {
      const clinic=await clinicById(id);
      const valid = clinic.status_assinatura === 'vitalicio' || (['active','trial','free'].includes(clinic.status_assinatura) && new Date(clinic.data_expiracao) > new Date());
      const payment=paymentId ? await (await openDb()).get('SELECT status FROM billing_payments WHERE clinica_id = ? AND payment_id = ? AND environment = ?',[id,paymentId,environment]) : null;
      return {status_assinatura:valid?clinic.status_assinatura:'vencido',plano_id:clinic.plano_id,data_expiracao:clinic.data_expiracao,accessActive:valid,paidActive:valid && ['active','vitalicio'].includes(clinic.status_assinatura),configured:gateway.configured,sandbox:gateway.sandbox,paymentStatus:payment?.status || null,price:BILLING_PRICE};
    },
    async resume(id) {
      requireConfig();
      const clinic=await clinicById(id);
      const attempt=await (await openDb()).get('SELECT state FROM billing_checkouts WHERE clinica_id = ?',[id]);
      if (!clinic.asaas_subscription_id && attempt && attempt.state !== 'ready') throw billingError('A solicitação anterior precisa ser conciliada pelo atendimento antes de tentar novamente.',409);
      return checkout(clinic);
    },
    async subscribe(id,body,remoteIp) {
      requireConfig();
      const clinic=await clinicById(id);
      if (clinic.status_assinatura === 'vitalicio' || (clinic.status_assinatura === 'active' && new Date(clinic.data_expiracao) > new Date())) return {state:'active'};
      // Reuse an existing charge even when a different payment method was selected.
      if (clinic.asaas_subscription_id) return checkout(clinic);
      const {data,creditCard}=validatePayer(body);
      const db=await openDb();
      await db.run("INSERT INTO billing_checkouts (clinica_id, state) VALUES (?, 'ready') ON CONFLICT(clinica_id) DO NOTHING RETURNING clinica_id",[id]);
      const claim=await db.run("UPDATE billing_checkouts SET state = 'creating', reference = ? WHERE clinica_id = ? AND state = 'ready'",[randomUUID(),id]);
      if (!claim.changes) throw billingError('Há uma solicitação em processamento ou aguardando conciliação. Use recuperar cobrança; não refaça o pagamento.',409);
      let createdSubscription=false;
      try {
        const refreshed=await clinicById(id);
        if (refreshed.asaas_subscription_id) {
          await db.run("UPDATE billing_checkouts SET state = 'ready' WHERE clinica_id = ?",[id]);
          return await checkout(refreshed);
        }
        let customerId=clinic.asaas_customer_id;
        if (!customerId) {
          const customer=await gateway.createCustomer({...data,externalReference:`vetcare:clinic:${id}`});
          if (!customer?.id) throw Object.assign(billingError('Resposta inválida do serviço de pagamentos.',502),{uncertain:true});
          customerId=customer.id;
          await db.run('UPDATE clinicas SET asaas_customer_id = ?, asaas_environment = ? WHERE id = ?',[customerId,environment,id]);
        }
        const dueDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const payload={customer:customerId,billingType:body.billingType,value:BILLING_PRICE,nextDueDate:dueDate,cycle:'MONTHLY',description:'VetCare Completo - assinatura mensal',externalReference:`vetcare:clinic:${id}`};
        if (creditCard) Object.assign(payload,{creditCard,creditCardHolderInfo:{...data,name:creditCard.holderName},remoteIp});
        const subscription=await gateway.createSubscription(payload);
        createdSubscription=true;
        if (!subscription?.id) throw billingError('Resposta inválida do serviço de pagamentos.',502);
        await db.run('UPDATE clinicas SET asaas_subscription_id = ? WHERE id = ?',[subscription.id,id]);
        await db.run("UPDATE billing_checkouts SET state = 'ready' WHERE clinica_id = ?",[id]);
        return await checkout(await clinicById(id));
      } catch(error) {
        await db.run('UPDATE billing_checkouts SET state = ? WHERE clinica_id = ?',[error.uncertain || createdSubscription ? 'review':'ready',id]);
        throw error;
      }
    },
    async webhook(body) {
      requireConfig();
      if (!body.payment?.subscription) return {received:true};
      if (!body.id || typeof body.id !== 'string' || !body.payment.id) throw billingError('Evento inválido.');
      const clinic=await (await openDb()).get('SELECT * FROM clinicas WHERE asaas_subscription_id = ? AND asaas_environment = ?',[body.payment.subscription,environment]);
      // Ask Asaas to retry when the event arrives before subscription creation is persisted.
      if (!clinic) throw billingError('Assinatura ainda não conciliada.',503);
      const payment=await gateway.getPayment(body.payment.id);
      if (['PAYMENT_CREDIT_CARD_CAPTURE_REFUSED','PAYMENT_REPROVED_BY_RISK_ANALYSIS'].includes(body.event) && !paid.has(payment.status) && !revoked.has(payment.status)) payment.status='REFUSED';
      await runTransaction(async db=> {
        // Serializes events for this clinic in PostgreSQL and SQLite.
        await db.run('UPDATE clinicas SET asaas_subscription_id = asaas_subscription_id WHERE id = ?',[clinic.id]);
        const inserted=await db.run("INSERT INTO processed_webhook_events (provider,event_id) VALUES (?,?) ON CONFLICT(provider,event_id) DO NOTHING",[`asaas:${environment}`,body.id]);
        if (!inserted.changes) return;
        await recordPayment(db,await db.get('SELECT * FROM clinicas WHERE id = ?',[clinic.id]),payment,environment);
      });
      return {received:true};
    }
  };
}
