import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createBillingService, recordPayment, periodEnd, validatePayer } from '../src/services/subscriptionBilling.js';
import { billingConfiguration } from '../src/services/asaas.js';

const payer={nome:'Pagador de Testes',email:'pagador@example.test',cpfCnpj:'12345678909',postalCode:'30140071',addressNumber:'10',phone:'31999990000',planoId:'complete',billingType:'PIX'};
const day=()=>new Date().toISOString().slice(0,10);
const payment=(overrides={})=>({id:'pay_1',subscription:'sub_1',customer:'cus_1',value:97,dueDate:day(),status:'PENDING',billingType:'PIX',...overrides});
async function fixture() {
 const db=await open({filename:':memory:',driver:sqlite3.Database});
 await db.exec(`CREATE TABLE clinicas(id INTEGER PRIMARY KEY,nome TEXT,status_assinatura TEXT,plano_id TEXT,data_expiracao TEXT,asaas_customer_id TEXT,asaas_subscription_id TEXT,asaas_environment TEXT DEFAULT 'sandbox');
 CREATE TABLE billing_checkouts(clinica_id INTEGER PRIMARY KEY,state TEXT,reference TEXT);
 CREATE TABLE billing_payments(payment_id TEXT PRIMARY KEY,clinica_id INTEGER,subscription_id TEXT,status TEXT,period_end TEXT,environment TEXT DEFAULT 'sandbox');
 CREATE TABLE processed_webhook_events(id INTEGER PRIMARY KEY,provider TEXT,event_id TEXT,UNIQUE(provider,event_id));
 INSERT INTO clinicas(id,nome,status_assinatura,plano_id,data_expiracao,asaas_customer_id,asaas_subscription_id) VALUES(1,'Clínica 1','vencido','free','2020-01-01',NULL,NULL),(2,'Clínica 2','trial','free','2099-01-01',NULL,NULL);`);
 const calls={customers:0,subscriptions:0};let current=payment();
 const gateway={configured:true,sandbox:true,
 createCustomer:async()=>{calls.customers++;return {id:'cus_1'};},
 createSubscription:async body=>{calls.subscriptions++;calls.payload=body;return {id:'sub_1'};},
 getSubscription:async()=>({id:'sub_1',customer:'cus_1',value:97,cycle:'MONTHLY',status:'ACTIVE'}),
 listPayments:async()=>({data:[current]}),getPayment:async()=>current,
 getPix:async()=>({encodedImage:'test',payload:'pix-test',expirationDate:'2099-01-01'})};
 let queue=Promise.resolve();
 const runTransaction=fn=>{const result=queue.then(async()=>{await db.exec('BEGIN');try {const v=await fn(db);await db.exec('COMMIT');return v;}catch(e){await db.exec('ROLLBACK');throw e;}});queue=result.catch(()=>{});return result;};
 const service=createBillingService({openDb:async()=>db,runTransaction,gateway});
 return {db,calls,gateway,service,setPayment:p=>{current=p;},clinic:()=>db.get('SELECT * FROM clinicas WHERE id=1')};
}

test('configuração exige chave, webhook e host oficial; não usa simulação como pagamento',()=>{
 assert.equal(billingConfiguration({}).configured,false);
 assert.equal(billingConfiguration({ASAAS_API_KEY:'test',ASAAS_WEBHOOK_TOKEN:'secret',ASAAS_API_URL:'https://evil.test/v3'}).configured,false);
 assert.equal(billingConfiguration({ASAAS_API_KEY:'test',ASAAS_WEBHOOK_TOKEN:'secret'}).configured,true);
});
test('valida pagador e cartão e calcula mensalidade em meses curtos',()=>{
 assert.throws(()=>validatePayer({...payer,phone:''}),e=>e.httpStatus===400);
 assert.throws(()=>validatePayer({...payer,billingType:'CREDIT_CARD',creditCard:{}}),e=>e.httpStatus===400);
 assert.equal(periodEnd('2028-01-31'),'2028-02-29T23:59:59.999Z');
 assert.equal(periodEnd('2027-01-31'),'2027-02-28T23:59:59.999Z');
 assert.throws(()=>periodEnd('2026-02-30'));
});
test('Pix cria uma assinatura fixa de R$97 e recupera a mesma cobrança sem cobrar novamente',async()=>{
 const f=await fixture();try {
 const first=await f.service.subscribe(1,{...payer,value:1},'127.0.0.1');
 assert.equal(first.pix.payload,'pix-test');assert.equal(first.paymentId,'pay_1');
 await f.service.subscribe(1,{...payer,billingType:'CREDIT_CARD'},'127.0.0.1');
 assert.equal(f.calls.subscriptions,1);assert.equal(f.calls.payload.value,97);assert.equal(f.calls.payload.cycle,'MONTHLY');
 assert.equal((await f.service.status(1)).paidActive,false);
 }finally {await f.db.close();}
});
test('cartão envia IP do comprador, cobra hoje e só libera após confirmação',async()=>{
 const f=await fixture();try {
 f.setPayment(payment({billingType:'CREDIT_CARD'}));
 const result=await f.service.subscribe(1,{...payer,billingType:'CREDIT_CARD',creditCard:{holderName:'Teste Cartao',number:'4242424242424242',expiryMonth:'12',expiryYear:'2099',ccv:'123'}},'203.0.113.10');
 assert.equal(result.state,'pending');assert.equal(f.calls.payload.remoteIp,'203.0.113.10');assert.equal(f.calls.payload.creditCardHolderInfo.phone,payer.phone);
 assert.ok(f.calls.payload.nextDueDate);assert.equal((await f.service.status(1)).paidActive,false);
 f.setPayment(payment({billingType:'CREDIT_CARD',status:'CONFIRMED'}));await f.service.webhook({id:'evt1',payment:payment()});
 assert.equal((await f.service.status(1,'pay_1')).paidActive,true);
 }finally {await f.db.close();}
});
test('CONFIRMED, RECEIVED e reentregas não somam meses; renovações usam o vencimento da nova cobrança',async()=>{
 const f=await fixture();try {
 await f.service.subscribe(1,payer,'127.0.0.1');
 f.setPayment(payment({status:'CONFIRMED'}));await f.service.webhook({id:'confirmed',payment:payment()});
 const first=(await f.clinic()).data_expiracao;
 f.setPayment(payment({status:'RECEIVED'}));await f.service.webhook({id:'received',payment:payment()});await f.service.webhook({id:'received',payment:payment()});
 assert.equal((await f.clinic()).data_expiracao,first);
 const nextDue=first.slice(0,10);f.setPayment(payment({id:'pay_2',status:'RECEIVED',dueDate:nextDue}));await f.service.webhook({id:'next',payment:payment({id:'pay_2'})});
 assert.equal((await f.clinic()).data_expiracao,periodEnd(nextDue));
 assert.equal((await f.service.status(2,'pay_2')).paymentStatus,null);
 }finally {await f.db.close();}
});
test('consulta autoritativa ignora status forjado no corpo e rejeita valor ou cliente incompatível',async()=>{
 const f=await fixture();try {
 await f.service.subscribe(1,payer,'127.0.0.1');
 await f.service.webhook({id:'forged',event:'PAYMENT_RECEIVED',payment:payment({status:'RECEIVED'})});
 assert.equal((await f.service.status(1)).paidActive,false);
 for(const change of [{value:1},{customer:'other'},{subscription:'other'}]) {
 f.setPayment(payment({...change,status:'RECEIVED'}));await assert.rejects(()=>f.service.webhook({id:JSON.stringify(change),payment:payment()}),e=>e.httpStatus===422);
 }
 }finally {await f.db.close();}
});
test('estorno revoga o pagamento, eventos antigos não reativam e atraso anterior não remove renovação paga',async()=>{
 const f=await fixture();try {
 await f.service.subscribe(1,payer,'127.0.0.1');f.setPayment(payment({status:'RECEIVED'}));await f.service.webhook({id:'paid',payment:payment()});
 f.setPayment(payment({status:'REFUNDED'}));await f.service.webhook({id:'refund',payment:payment()});assert.equal((await f.service.status(1)).paidActive,false);
 const clinic=await f.clinic();await recordPayment(f.db,clinic,payment({status:'RECEIVED'}));assert.equal((await f.service.status(1)).paidActive,false);
 f.setPayment(payment({id:'pay_2',status:'RECEIVED'}));await f.service.webhook({id:'newpaid',payment:payment({id:'pay_2'})});
 f.setPayment(payment({id:'old',status:'OVERDUE',dueDate:'2020-01-01'}));await f.service.webhook({id:'oldoverdue',payment:payment({id:'old'})});assert.equal((await f.service.status(1)).paidActive,true);
 }finally {await f.db.close();}
});
test('timeout bloqueia repetição automática; recusas definitivas permitem nova tentativa',async()=>{
 const f=await fixture();try {
 f.gateway.createSubscription=async()=>{f.calls.subscriptions++;throw Object.assign(new Error('Timeout'),{uncertain:true});};
 await assert.rejects(()=>f.service.subscribe(1,payer,'127.0.0.1'));
 await assert.rejects(()=>f.service.subscribe(1,payer,'127.0.0.1'),e=>e.httpStatus===409);
 await assert.rejects(()=>f.service.resume(1),e=>e.httpStatus===409);assert.equal(f.calls.subscriptions,1);
 }finally {await f.db.close();}
});
test('solicitações concorrentes não criam assinaturas duplicadas',async()=>{
 const f=await fixture();try {
 const results=await Promise.allSettled([f.service.subscribe(1,payer,'127.0.0.1'),f.service.subscribe(1,payer,'127.0.0.1')]);
 assert.equal(f.calls.subscriptions,1);assert.ok(results.some(r=>r.status==='fulfilled'));
 }finally {await f.db.close();}
});
test('vitalício não é cobrado e ambiente sem configuração retorna erro explícito',async()=>{
 const f=await fixture();try {
 await f.db.run("UPDATE clinicas SET status_assinatura='vitalicio' WHERE id=1");
 assert.equal((await f.service.subscribe(1,payer,'127.0.0.1')).state,'active');assert.equal(f.calls.subscriptions,0);
 f.gateway.configured=false;await assert.rejects(()=>f.service.subscribe(2,payer,'127.0.0.1'),e=>e.httpStatus===503);
 }finally {await f.db.close();}
});

test('pagamento em atraso compra um mês desde a confirmação e recebido não estende novamente',async()=>{
 const f=await fixture();try {
 await f.service.subscribe(1,payer,'127.0.0.1');
 f.setPayment(payment({status:'CONFIRMED',dueDate:'2020-01-01',clientPaymentDate:day()}));await f.service.webhook({id:'late',payment:payment()});
 assert.equal((await f.clinic()).data_expiracao,periodEnd(day()));
 f.setPayment(payment({status:'RECEIVED',dueDate:'2020-01-01',paymentDate:'2099-01-01'}));await f.service.webhook({id:'late-received',payment:payment()});
 assert.equal((await f.clinic()).data_expiracao,periodEnd(day()));
 }finally {await f.db.close();}
});
test('recusa definitiva permite tentar novamente sem recriar o cliente',async()=>{
 const f=await fixture();try {
 const realCreate=f.gateway.createSubscription;
 f.gateway.createSubscription=async()=>{throw Object.assign(new Error('Recusado'),{httpStatus:400,uncertain:false});};
 await assert.rejects(()=>f.service.subscribe(1,payer,'127.0.0.1'),e=>e.httpStatus===400);
 f.gateway.createSubscription=realCreate;
 assert.equal((await f.service.subscribe(1,payer,'127.0.0.1')).state,'pending');assert.equal(f.calls.customers,1);assert.equal(f.calls.subscriptions,1);
 }finally {await f.db.close();}
});

test('recusa de captura informa falha, recuperar não recria cobrança e confirmação posterior é conciliada',async()=>{
 const f=await fixture();try {
 f.setPayment(payment({billingType:'CREDIT_CARD'}));await f.service.subscribe(1,payer,'127.0.0.1');
 await f.service.webhook({id:'refused',event:'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',payment:payment()});
 assert.equal((await f.service.status(1,'pay_1')).paymentStatus,'REFUSED');
 f.setPayment(payment({billingType:'CREDIT_CARD'}));assert.equal((await f.service.resume(1)).state,'failed');assert.equal(f.calls.subscriptions,1);
 f.setPayment(payment({billingType:'CREDIT_CARD',status:'CONFIRMED'}));await f.service.webhook({id:'later-confirmed',payment:payment()});assert.equal((await f.service.status(1)).paidActive,true);
 }finally {await f.db.close();}
});

test('reversão de chargeback confirmada pelo provedor restaura o período pago',async()=>{
 const f=await fixture();try {
 await f.service.subscribe(1,payer,'127.0.0.1');f.setPayment(payment({status:'RECEIVED'}));await f.service.webhook({id:'paid-before-dispute',payment:payment()});
 f.setPayment(payment({status:'CHARGEBACK_REQUESTED'}));await f.service.webhook({id:'dispute',payment:payment()});assert.equal((await f.service.status(1)).paidActive,false);
 f.setPayment(payment({status:'CONFIRMED'}));await f.service.webhook({id:'dispute-won',payment:payment()});assert.equal((await f.service.status(1)).paidActive,true);
 }finally {await f.db.close();}
});
