import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { migrateSandboxBilling } from '../src/services/billingEnvironment.js';
import { createBillingService, recordPayment, periodEnd } from '../src/services/subscriptionBilling.js';
import { billingConfiguration } from '../src/services/asaas.js';

async function fixture() {
 const db=await open({filename:':memory:',driver:sqlite3.Database});
 await db.exec(`CREATE TABLE clinicas(id INTEGER PRIMARY KEY,status_assinatura TEXT,plano_id TEXT,data_expiracao TEXT,asaas_customer_id TEXT,asaas_subscription_id TEXT,asaas_environment TEXT DEFAULT 'sandbox');
 CREATE TABLE billing_environment_archive(id INTEGER PRIMARY KEY,clinica_id INTEGER,environment TEXT,customer_id TEXT,subscription_id TEXT,status_assinatura TEXT,plano_id TEXT,data_expiracao TEXT);
 CREATE TABLE billing_checkouts(clinica_id INTEGER PRIMARY KEY,state TEXT,reference TEXT);
 CREATE TABLE billing_payments(payment_id TEXT PRIMARY KEY,clinica_id INTEGER,subscription_id TEXT,status TEXT,period_end TEXT,environment TEXT DEFAULT 'sandbox');
 CREATE TABLE processed_webhook_events(id INTEGER PRIMARY KEY,provider TEXT,event_id TEXT,UNIQUE(provider,event_id));
 CREATE TABLE animais(id INTEGER PRIMARY KEY,clinica_id INTEGER,nome TEXT);
 INSERT INTO clinicas VALUES(1,'active','complete','2099-01-01','cus_test','sub_test','sandbox'),(2,'vitalicio','complete',NULL,'cus_life','sub_life','sandbox'),(3,'trial','free','2099-01-01','cus_pending',NULL,'sandbox'),(4,'vitalicio','complete',NULL,NULL,NULL,'sandbox'),(5,'active','complete','2099-01-01','cus_real','sub_real','production');
 INSERT INTO billing_checkouts VALUES(1,'review','old_reference');
 INSERT INTO billing_payments VALUES('pay_test',1,'sub_test','RECEIVED','2099-01-01','sandbox');
 INSERT INTO animais VALUES(1,1,'Paciente preservado');`);
 return db;
}

test('migração arquiva apenas vínculos Sandbox, invalida mensalidade fictícia e preserva clínica e vitalícios',async()=>{
 const db=await fixture();try {
 assert.equal(await migrateSandboxBilling(db,'sandbox'),0);
 await db.exec('BEGIN');assert.equal(await migrateSandboxBilling(db,'production'),3);await db.exec('COMMIT');
 const clinic=await db.get('SELECT * FROM clinicas WHERE id=1');assert.equal(clinic.status_assinatura,'vencido');assert.equal(clinic.asaas_customer_id,null);assert.equal(clinic.asaas_subscription_id,null);assert.equal(clinic.asaas_environment,'production');
 assert.equal((await db.get('SELECT * FROM billing_environment_archive WHERE clinica_id=1')).subscription_id,'sub_test');
 assert.equal((await db.get('SELECT * FROM animais WHERE id=1')).nome,'Paciente preservado');
 assert.equal((await db.get('SELECT * FROM clinicas WHERE id=2')).status_assinatura,'vitalicio');
 assert.equal((await db.get('SELECT * FROM clinicas WHERE id=3')).status_assinatura,'trial');
 assert.equal((await db.get('SELECT * FROM clinicas WHERE id=4')).status_assinatura,'vitalicio');
 assert.equal((await db.get('SELECT * FROM clinicas WHERE id=5')).asaas_subscription_id,'sub_real');
 assert.equal((await db.get('SELECT state FROM billing_checkouts WHERE clinica_id=1')).state,'ready');
 assert.equal((await db.get('SELECT COUNT(*) AS n FROM billing_payments')).n,1);
 assert.equal(await migrateSandboxBilling(db,'production'),0);assert.equal((await db.get('SELECT COUNT(*) AS n FROM billing_environment_archive')).n,3);
 }finally {await db.close();}
});
test('falha na migração é reversível pela transação sem perder vínculos',async()=>{
 const db=await fixture();try {
 await db.exec('BEGIN');await migrateSandboxBilling(db,'production');await db.exec('ROLLBACK');
 assert.equal((await db.get('SELECT * FROM clinicas WHERE id=1')).asaas_subscription_id,'sub_test');assert.equal((await db.get('SELECT COUNT(*) AS n FROM billing_environment_archive')).n,0);
 }finally {await db.close();}
});
test('produção não usa mensalidades Sandbox no status ou na renovação',async()=>{
 const db=await fixture();try {
 await migrateSandboxBilling(db,'production');
 await db.run("UPDATE clinicas SET asaas_customer_id='cus_prod',asaas_subscription_id='sub_prod' WHERE id=1");
 const service=createBillingService({openDb:async()=>db,runTransaction:fn=>fn(db),gateway:{configured:true,sandbox:false}});
 assert.equal((await service.status(1,'pay_test')).paymentStatus,null);assert.equal((await service.status(1)).paidActive,false);
 const day=new Date().toISOString().slice(0,10);
 await recordPayment(db,await db.get('SELECT * FROM clinicas WHERE id=1'),{id:'pay_real',customer:'cus_prod',subscription:'sub_prod',status:'RECEIVED',value:97,dueDate:day},'production');
 assert.equal((await service.status(1)).data_expiracao,periodEnd(day));assert.equal((await service.status(1)).paidActive,true);
 }finally {await db.close();}
});
test('credenciais de ambientes diferentes são recusadas e vínculos antigos exigem migração',async()=>{
 const db=await fixture();try {
 assert.equal(billingConfiguration({ASAAS_API_KEY:'$aact_hmlg_test',ASAAS_API_URL:'https://api.asaas.com/v3',ASAAS_WEBHOOK_TOKEN:'secret'}).configured,false);
 assert.equal(billingConfiguration({ASAAS_API_KEY:'$aact_prod_test',ASAAS_API_URL:'https://api-sandbox.asaas.com/v3',ASAAS_WEBHOOK_TOKEN:'secret'}).configured,false);
 const service=createBillingService({openDb:async()=>db,runTransaction:fn=>fn(db),gateway:{configured:true,sandbox:false}});
 await assert.rejects(()=>service.status(1),e=>e.httpStatus===409);
 }finally {await db.close();}
});
