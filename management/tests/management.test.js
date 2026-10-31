import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../src/db.js';
import { hashPassword, hashToken } from '../src/security.js';
import { createApp } from '../src/server.js';

test('gestão independente: autenticação, contratos, caixa e isolamento', async t => {
  const db = await openDatabase({ MANAGEMENT_SQLITE_PATH: ':memory:' });
  const ownerId = randomUUID();
  await db.run('INSERT INTO owners (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [ownerId, 'Sócio de teste', 'socio@example.test', await hashPassword('Senha-ficticia-12345')]);
  const { app } = await createApp({ db, env: { MANAGEMENT_ORIGIN: 'http://localhost:3010', MANAGEMENT_MANUAL_MODE: '1' } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function call(url, method = 'GET', body, origin = 'http://localhost:3010', session = cookie) {
    const response = await fetch(`${base}/api${url}`, { method, headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    return { status: response.status, data, response };
  }
  await t.test('API privada recusa visitante e cookie clínico', async () => {
    assert.equal((await call('/data')).status, 401);
    assert.equal((await call('/data', 'GET', null, null, 'token=clinica')).status, 401);
    assert.equal((await call('/health')).status, 200);
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await call('/register', 'POST', {})).status, 401);
  });
  await t.test('login exige origem e senha válidas; cookie HttpOnly e SameSite', async () => {
    assert.equal((await call('/login', 'POST', { email: 'socio@example.test', password: 'errada' })).status, 401);
    assert.equal((await call('/login', 'POST', {}, 'https://outro.example')).status, 403);
    assert.equal((await call('/login', 'POST', {}, null)).status, 403);
    const result = await call('/login', 'POST', { email: 'SOCIO@example.test', password: 'Senha-ficticia-12345' });
    assert.equal(result.status, 200);
    const header = result.response.headers.get('set-cookie');
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/);
    cookie = header.split(';')[0];
    const stored = await db.get('SELECT token_hash FROM sessions');
    assert.equal(stored.token_hash, hashToken(cookie.split('=')[1]));
    assert.equal((await call('/me')).data.name, 'Sócio de teste');
  });
  let planId, clientId, entryId;
  await t.test('base vazia e criação de plano sem preço fracionário inválido', async () => {
    const initial = await call('/data?month=2026-10');
    assert.deepEqual(initial.data.clients, []); assert.equal(initial.data.summary.mrr, 0);
    assert.equal((await call('/plans', 'POST', { name: 'Teste', monthly_cents: 1.5 })).status, 400);
    const plan = await call('/plans', 'POST', { name: 'Completo', monthly_cents: 9700 });
    assert.equal(plan.status, 201); planId = plan.data.id;
  });
  const client = { name: 'Clínica de teste', contact: 'Responsável fictício', email: 'clinica@example.test', phone: '', status: 'active', monthly_cents: 9700, started_on: '2026-10-30', due_on: '2026-11-30', notes: '' };
  await t.test('assinatura validada e dados clínicos ausentes', async () => {
    assert.equal((await call('/clients', 'POST', { ...client, started_on: '2026-02-30' })).status, 400);
    assert.equal((await call('/clients', 'POST', { ...client, started_on: '2026-99-99' })).status, 400);
    assert.equal((await call('/clients', 'POST', { ...client, email: 'sem-email' })).status, 400);
    assert.equal((await call('/clients', 'POST', { ...client, plan_id: 'inexistente' })).status, 400);
    const result = await call('/clients', 'POST', { ...client, plan_id: planId });
    assert.equal(result.status, 201); clientId = result.data.id;
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table'");
    assert.ok(!tables.some(v => ['animais', 'prontuarios', 'users'].includes(v.name)));
  });
  await t.test('MRR não é recebimento; plano atualizado preserva contrato', async () => {
    await call(`/plans/${planId}`, 'PUT', { name: 'Completo', monthly_cents: 12700 });
    const result = await call('/data?month=2026-10');
    assert.equal(result.data.summary.mrr, 9700); assert.equal(result.data.summary.income, 0);
    assert.equal(result.data.summary.active, 1); assert.equal(result.data.clients[0].monthly_cents, 9700);
  });
  await t.test('mês filtra caixa; valores em centavos e receita menos despesa', async () => {
    const result = await call('/entries', 'POST', { kind: 'income', description: 'Mensalidade', amount_cents: 9700, occurred_on: '2026-10-30', client_id: clientId });
    assert.equal(result.status, 201); entryId = result.data.id;
    assert.equal((await call('/entries', 'POST', { kind: 'expense', description: 'Hospedagem', amount_cents: 3000, occurred_on: '2026-10-30' })).status, 201);
    await call('/entries', 'POST', { kind: 'income', description: 'Outro mês', amount_cents: 5000, occurred_on: '2026-11-01' });
    const october = (await call('/data?month=2026-10')).data;
    assert.equal(october.summary.income, 9700); assert.equal(october.summary.expense, 3000); assert.equal(october.summary.balance, 6700);
    assert.equal(october.entries.length, 2); assert.equal((await call('/data?month=2026-11')).data.summary.income, 5000);
    assert.equal((await call('/data?month=2026-13')).status, 400);
    assert.equal((await call('/entries', 'POST', { kind: 'income', amount_cents: -1, description: 'Teste', occurred_on: '2026-10-30' })).status, 400);
  });
  await t.test('origem cruzada não altera dados; cancelamento retira MRR', async () => {
    assert.equal((await call(`/clients/${clientId}`, 'PUT', { ...client, status: 'cancelled' }, 'https://outro.example')).status, 403);
    assert.equal((await call(`/clients/${clientId}`, 'PUT', { ...client, plan_id: planId, status: 'cancelled' })).status, 200);
    const result = await call('/data?month=2026-10');
    assert.equal(result.data.summary.mrr, 0); assert.equal(result.data.summary.income, 9700);
  });
  await t.test('exclusão recalcula caixa e registra responsável na auditoria', async () => {
    assert.equal((await call(`/entries/${entryId}`, 'DELETE')).status, 200);
    assert.equal((await call(`/entries/${entryId}`, 'DELETE')).status, 404);
    const data = (await call('/data?month=2026-10')).data;
    assert.equal(data.summary.balance, -3000);
    assert.ok(data.auditLog.some(a => a.action === 'entry.deleted' && a.owner_name === 'Sócio de teste'));
  });
  await t.test('troca de senha e logout revogam sessões', async () => {
    assert.equal((await call('/password', 'POST', { current: 'errada', password: 'Outra-senha-12345' })).status, 403);
    assert.equal((await call('/password', 'POST', { current: 'Senha-ficticia-12345', password: 'curta' })).status, 400);
    assert.equal((await call('/password', 'POST', { current: 'Senha-ficticia-12345', password: 'Outra-senha-12345' })).status, 200);
    assert.equal((await call('/me')).status, 401);
    const login = await call('/login', 'POST', { email: 'socio@example.test', password: 'Outra-senha-12345' });
    cookie = login.response.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/logout', 'POST')).status, 200);
    assert.equal((await call('/me')).status, 401);
  });
});

test('produção exige banco próprio e HTTPS, com cookie seguro', async t => {
  await assert.rejects(() => openDatabase({ NODE_ENV: 'production' }), /MANAGEMENT_DATABASE_URL/);
  const db = await openDatabase({ MANAGEMENT_SQLITE_PATH: ':memory:' });
  t.after(() => db.close());
  await assert.rejects(() => createApp({ db, env: { NODE_ENV: 'production', MANAGEMENT_ORIGIN: 'http://localhost:3010' } }), /HTTPS/);
  await db.run('INSERT INTO owners (id, name, email, password_hash) VALUES (?, ?, ?, ?)', ['owner', 'Sócio', 'owner@example.test', await hashPassword('Senha-ficticia-12345')]);
  const { app } = await createApp({ db, env: { NODE_ENV: 'production', MANAGEMENT_ORIGIN: 'https://gestao.vetcaresistema.com' } });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const result = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://gestao.vetcaresistema.com' }, body: JSON.stringify({ email: 'owner@example.test', password: 'Senha-ficticia-12345' }) });
  assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /__Host-vetcare_management=/); assert.match(result.headers.get('set-cookie'), /; Secure/);
});
