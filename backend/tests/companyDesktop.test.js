import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { createCompanyAuth, initCompanyAuth, provisionCompanyOwner, sessionHash } from '../src/services/companyAuth.js';
import { createCompanyDesktopRouter } from '../src/routes/companyDesktopRoutes.js';
import desktopClient from '../../desktop/src/client.cjs';
import { createPostgresAdapter } from '../src/db.js';

async function fixture(t) {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  t.after(() => db.close()); await initCompanyAuth(db);
  await provisionCompanyOwner(db, { name: 'Sócio teste', email: 'owner@example.test', password: 'Senha-ficticia-123' });
  return { db, auth: createCompanyAuth({ openDb: async () => db }) };
}
test('login com adaptador PostgreSQL grava sessão sem exigir coluna id', async t => {
  const { db } = await fixture(t);
  // Usa o adaptador real e um motor SQL local com o mesmo schema da sessão.
  // A ponte só converte parâmetros $n; validação de colunas e persistência são reais.
  const adapter = createPostgresAdapter({
    query: async (sql, params = []) => {
      const rows = await db.all(sql.replace(/\$\d+/g, '?'), params);
      return { rows, rowCount: rows.length };
    }
  });
  const auth = createCompanyAuth({ openDb: async () => adapter });
  const session = await auth.login('owner@example.test', 'Senha-ficticia-123');
  assert.equal((await auth.authenticate(session.token)).email, 'owner@example.test');
  assert.equal((await db.get('SELECT token_hash FROM company_owner_sessions')).token_hash, sessionHash(session.token));
  await auth.logout(session.token);
  await assert.rejects(() => auth.authenticate(session.token), /revogada/);
});
test('contas empresariais isoladas, sessão com hash, revogação e desativação', async t => {
  const { db, auth } = await fixture(t);
  await assert.rejects(() => auth.login('clinica@example.test', 'Senha-ficticia-123'), /inválidos/);
  await assert.rejects(() => auth.login('owner@example.test', 'errada'), /inválidos/);
  await assert.rejects(() => auth.authenticate('jwt-de-clinica'), /sócio/);
  const session = await auth.login('OWNER@example.test', 'Senha-ficticia-123');
  assert.equal((await auth.authenticate(session.token)).name, 'Sócio teste');
  assert.equal((await db.get('SELECT token_hash FROM company_owner_sessions')).token_hash, sessionHash(session.token));
  await auth.logout(session.token); await assert.rejects(() => auth.authenticate(session.token), /revogada/);
  const other = await auth.login('owner@example.test', 'Senha-ficticia-123');
  await db.run('UPDATE company_owner_accounts SET active = 0'); await assert.rejects(() => auth.authenticate(other.token), /revogada/);
});
test('troca de senha revoga todos os computadores; reprovisionamento recupera acesso', async t => {
  const { db, auth } = await fixture(t);
  const one = await auth.login('owner@example.test', 'Senha-ficticia-123'), two = await auth.login('owner@example.test', 'Senha-ficticia-123');
  await assert.rejects(() => auth.password(one.owner.id, 'errada', 'Nova-senha-ficticia-123'), /atual inválida/);
  await assert.rejects(() => auth.password(one.owner.id, 'Senha-ficticia-123', 'curta'), /12 a 256/);
  await auth.password(one.owner.id, 'Senha-ficticia-123', 'Nova-senha-ficticia-123');
  await assert.rejects(() => auth.authenticate(one.token), /revogada/); await assert.rejects(() => auth.authenticate(two.token), /revogada/);
  await assert.rejects(() => auth.login('owner@example.test', 'Senha-ficticia-123'), /inválidos/);
  const session = await auth.login('owner@example.test', 'Nova-senha-ficticia-123');
  await provisionCompanyOwner(db, { name: 'Sócio', email: 'owner@example.test', password: 'Recuperada-ficticia-123' });
  await assert.rejects(() => auth.authenticate(session.token), /revogada/);
});
test('rotas desktop recusam usuários de clínica, origem de site e operações sem sessão de sócio', async t => {
  const { auth } = await fixture(t);
  const app = express(); app.use(express.json());
  app.use('/api/company/desktop', createCompanyDesktopRouter({ auth, overview: async month => ({ automatic: true, month, clients: [] }) }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/company/desktop`;
  assert.equal((await fetch(`${base}/overview?month=2026-10`)).status, 401);
  assert.equal((await fetch(`${base}/overview?month=2026-10`, { headers: { Authorization: 'Bearer jwt-clinica' } })).status, 401);
  const payload = JSON.stringify({ email: 'owner@example.test', password: 'Senha-ficticia-123' });
  assert.equal((await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://vetcaresistema.com' }, body: payload })).status, 403);
  const response = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
  assert.equal(response.status, 200); const data = await response.json();
  assert.equal((await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${data.token}` } })).status, 200);
  assert.equal((await fetch(`${base}/overview?month=2026-10`, { headers: { Authorization: `Bearer ${data.token}` } })).status, 200);
  assert.equal((await fetch(`${base}/register`, { method: 'POST' })).status, 401);
});
test('cliente desktop e API empresarial funcionam juntos por HTTP, sem expor token às telas', async t => {
  const { auth } = await fixture(t);
  const app = express(); app.use(express.json());
  app.use('/api/company/desktop', createCompanyDesktopRouter({ auth, overview: async month => ({ automatic: true, month, clients: [{ id: '1', name: 'Clínica de teste' }], plans: [], entries: [], summary: { income: 0 }, sync: { complete: true } }) }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const client = desktopClient.createClient({ origin: `http://127.0.0.1:${server.address().port}`, development: true });
  const login = await client.invoke('/login', { method: 'POST', body: JSON.stringify({ email: 'owner@example.test', password: 'Senha-ficticia-123' }) });
  assert.equal(login.status, 200); assert.equal(login.data.name, 'Sócio teste'); assert.ok(!('token' in login.data));
  const result = await client.invoke('/data?month=2026-10');
  assert.equal(result.status, 200); assert.equal(result.data.clients[0].name, 'Clínica de teste');
  assert.equal((await client.invoke('/logout', { method: 'POST' })).status, 200);
  assert.equal((await client.invoke('/me')).status, 401);
});
test('falha SQL registra somente código e operação, sem dados de login', async t => {
  const logs = [];
  const app = express(); app.use(express.json());
  app.use('/api/company/desktop', createCompanyDesktopRouter({ auth: { login: async () => { throw Object.assign(new Error('senha-e-dados-sensiveis'), { code: '42703' }); } }, logger: { error: (...args) => logs.push(args) } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/company/desktop`;
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.authVersion, 2);
  const response = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.test', password: 'Senha-ficticia-123' }) });
  assert.equal(response.status, 503);
  const data = await response.json(); assert.match(data.error, /Tente novamente/);
  assert.deepEqual(logs[0][1], { operation: '/login', code: '42703' });
  for (const secret of ['owner@example.test', 'Senha-ficticia-123', 'senha-e-dados-sensiveis']) assert.ok(!JSON.stringify({ logs, data }).includes(secret));
});
