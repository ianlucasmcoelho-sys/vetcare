import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { createCompanyOverview } from '../src/services/companyOverview.js';
import { createCompanyRouter } from '../src/routes/companyRoutes.js';

async function fixture(t, { cacheMs = 60000 } = {}) {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(`CREATE TABLE clinicas (id INTEGER PRIMARY KEY, nome TEXT, email TEXT, telefone TEXT, created_at TEXT, plano_id TEXT, status_assinatura TEXT, data_expiracao TEXT, asaas_subscription_id TEXT, asaas_customer_id TEXT, asaas_environment TEXT);
    CREATE TABLE usuarios (id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, perfil TEXT, ativo INTEGER, senha TEXT);
    INSERT INTO clinicas VALUES (1, 'Clínica real de teste', 'clinica@example.test', '', '2026-10-01', 'complete', 'active', '2026-11-30', 'sub_1', 'cus_1', 'production');
    INSERT INTO usuarios VALUES (1,1,'Sócio da clínica','admin',1,'hash-nunca-exportar');
    INSERT INTO clinicas VALUES (2, 'Teste', '', '', '2026-10-28', 'free', 'trial', '2026-11-04', NULL, NULL, 'sandbox');
    INSERT INTO clinicas VALUES (3, 'Vitalício', '', '', '2026-01-01', 'complete', 'vitalicio', NULL, NULL, NULL, 'sandbox');
    INSERT INTO clinicas VALUES (4, 'Demo descontinuada', 'demo@vetcare.com', '', '2026-01-01', 'complete', 'active', '2099-01-01', NULL, NULL, 'sandbox');`);
  t.after(() => db.close());
  const calls = [];
  const payment = { id: 'pay_1', customer: 'cus_1', subscription: 'sub_1', status: 'RECEIVED', value: 97, netValue: 95.01, paymentDate: '2026-10-20', dueDate: '2026-10-20' };
  const gateway = { configured: true, sandbox: false,
    getSubscription: async id => { calls.push(['subscription', id]); return { id, customer: 'cus_1', status: 'ACTIVE', cycle: 'MONTHLY', value: 97, nextDueDate: '2026-11-20' }; },
    listCompanyPayments: async (id, offset) => { calls.push(['payments', id, offset]); return { hasMore: false, data: [payment] }; }
  };
  const overview = createCompanyOverview({ openDb: async () => db, gateway, clock: () => new Date('2026-10-30T18:00:00Z'), cacheMs });
  return { db, gateway, overview, calls, payment };
}
test('exportação automática usa cadastros reais e mensalidades; exclui pacientes, senhas, Sandbox e vitalícios da receita', async t => {
  const f = await fixture(t);
  const data = await f.overview('2026-10');
  assert.equal(data.clients.length, 3); assert.equal(data.summary.active, 1); assert.equal(data.summary.trial, 1); assert.equal(data.summary.lifetime, 1);
  assert.equal(data.summary.mrr, 9700); assert.equal(data.summary.income, 9700); assert.equal(data.summary.expense, 199); assert.equal(data.summary.balance, 9501);
  assert.equal(data.sync.complete, true); assert.equal(data.clients.find(c => c.id === '1').due_on, '2026-11-20');
  assert.equal(data.clients.find(c => c.id === '3').monthly_cents, 0);
  assert.ok(!JSON.stringify(data).includes('hash-nunca-exportar')); assert.ok(!JSON.stringify(data).includes('asaas_customer_id'));
  assert.equal((await f.overview('2026-11')).summary.income, 0);
  assert.equal(f.calls.length, 2);
  await assert.rejects(() => f.overview('2026-13'), /Mês inválido/);
});
test('mudança de cadastro aparece sem cópia e mensalidades Sandbox nunca são conciliadas como receita real', async t => {
  const f = await fixture(t);
  await f.overview('2026-10');
  await f.db.run("UPDATE clinicas SET nome = 'Clínica atualizada', asaas_environment = 'sandbox' WHERE id = 1");
  const data = await f.overview('2026-10');
  assert.equal(data.clients.find(c => c.id === '1').name, 'Clínica atualizada'); assert.equal(data.summary.income, 0); assert.equal(data.summary.mrr, 0);
  assert.equal(f.calls.length, 2);
});
test('sem Asaas de produção, financeiro fica indisponível mesmo sem assinaturas vinculadas', async t => {
  const f = await fixture(t);
  await f.db.run('UPDATE clinicas SET asaas_subscription_id = NULL');
  f.gateway.configured = false;
  const data = await f.overview('2026-10');
  assert.equal(data.sync.complete, false); assert.equal(data.summary.income, null); assert.equal(data.summary.expense, null);
  assert.equal(data.entries.length, 0); assert.equal(f.calls.length, 0);
});
test('paginação deduplica cobranças e consulta somente a assinatura vinculada', async t => {
  const f = await fixture(t);
  f.gateway.listCompanyPayments = async (id, offset) => ({ hasMore: offset === 0, data: offset === 0 ? [f.payment] : [f.payment, { ...f.payment, id: 'pay_2', value: 50, netValue: 49 }] });
  const data = await f.overview('2026-10');
  assert.equal(data.summary.income, 14700); assert.equal(data.entries.length, 4);
});
test('vínculo duplicado entre clínicas não duplica receitas e bloqueia a conciliação', async t => {
  const f = await fixture(t);
  await f.db.run("UPDATE clinicas SET asaas_subscription_id = 'sub_1', asaas_customer_id = 'cus_1', asaas_environment = 'production' WHERE id = 2");
  const data = await f.overview('2026-10');
  assert.equal(data.sync.complete, false); assert.equal(data.summary.income, null); assert.equal(data.entries.length, 0); assert.equal(f.calls.length, 0);
});
test('falha de provedor, vínculos divergentes e datas ausentes nunca aparecem como caixa zerado', async t => {
  const f = await fixture(t, { cacheMs: 0 });
  f.gateway.listCompanyPayments = async () => { throw new Error('Erro que poderia conter credencial'); };
  let data = await f.overview('2026-10');
  assert.equal(data.summary.income, null); assert.equal(data.sync.complete, false); assert.ok(!JSON.stringify(data).includes('credencial'));
  f.gateway.listCompanyPayments = async () => ({ data: [{ ...f.payment, customer: 'outro' }] });
  data = await f.overview('2026-10'); assert.equal(data.summary.income, null); assert.equal(data.entries.length, 0);
  f.gateway.listCompanyPayments = async () => ({ data: [{ ...f.payment, paymentDate: null }] });
  data = await f.overview('2026-10'); assert.equal(data.summary.income, null); assert.equal(data.entries.length, 0);
});
test('cancelamento, estorno e atraso do provedor são refletidos sem editar o sistema', async t => {
  const f = await fixture(t, { cacheMs: 0 });
  f.gateway.getSubscription = async () => ({ id: 'sub_1', customer: 'cus_1', status: 'INACTIVE', cycle: 'MONTHLY', value: 97 });
  f.payment.status = 'REFUNDED';
  let data = await f.overview('2026-10');
  assert.equal(data.summary.mrr, 0); assert.equal(data.summary.income, 0); assert.equal(data.clients.find(c => c.id === '1').status, 'cancelled');
  assert.equal((await f.db.get('SELECT status_assinatura FROM clinicas WHERE id = 1')).status_assinatura, 'active');
  f.gateway.getSubscription = async () => ({ id: 'sub_1', customer: 'cus_1', status: 'ACTIVE', cycle: 'MONTHLY', value: 97 });
  f.payment.status = 'OVERDUE'; data = await f.overview('2026-10'); assert.equal(data.summary.overdue, 1); assert.equal(data.summary.mrr, 0);
});
test('API empresarial recusa JWT de clínica e só permite segredo próprio em rota de leitura', async t => {
  const f = await fixture(t);
  const token = 'segredo-ficticio-da-integracao-1234567890';
  const app = express(); app.use('/api/company', createCompanyRouter({ token: () => token, overview: f.overview }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/company/overview?month=2026-10`;
  for (const authorization of ['', 'Bearer jwt-clinico', 'Bearer errado']) assert.equal((await fetch(url, { headers: { authorization } })).status, 401);
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal((await response.json()).automatic, true);
  assert.equal((await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` } })).status, 404);
});
