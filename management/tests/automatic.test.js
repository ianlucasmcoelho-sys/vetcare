import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { openDatabase } from '../src/db.js';
import { hashPassword } from '../src/security.js';
import { createApp } from '../src/server.js';
import { createSystemSource } from '../src/source.js';

test('fonte automática exige configuração, HTTPS em produção e não segue redirecionamentos', async () => {
  await assert.rejects(() => createSystemSource({})('2026-10'), /Configure/);
  await assert.rejects(() => createSystemSource({ NODE_ENV: 'production', MANAGEMENT_SOURCE_URL: 'http://example.test', MANAGEMENT_SOURCE_TOKEN: 'x'.repeat(40) })('2026-10'), /HTTPS/);
  let observed;
  const source = createSystemSource({ MANAGEMENT_SOURCE_URL: 'https://vetcare.example', MANAGEMENT_SOURCE_TOKEN: 'x'.repeat(40) }, async (url, options) => { observed = { url, options }; return { ok: false }; });
  await assert.rejects(() => source('2026-10'), /Não foi possível/);
  assert.equal(observed.options.redirect, 'error'); assert.equal(observed.url.pathname, '/api/company/overview'); assert.equal(observed.url.searchParams.get('month'), '2026-10');
});
test('painel busca fonte automaticamente sem persistir duplicatas e recusa alterações manuais', async t => {
  const db = await openDatabase({ MANAGEMENT_SQLITE_PATH: ':memory:' });
  t.after(() => db.close());
  await db.run('INSERT INTO owners (id, name, email, password_hash) VALUES (?, ?, ?, ?)', ['owner', 'Sócio', 'owner@example.test', await hashPassword('Senha-local-teste-123')]);
  const token = 'segredo-ficticio-servidor-123456789012345';
  let clinicName = 'Clínica automática', calls = 0;
  const sourceApp = express();
  sourceApp.get('/api/company/overview', (req, res) => {
    assert.equal(req.get('authorization'), `Bearer ${token}`); calls++;
    res.json({ automatic: true, month: req.query.month, clients: [{ id: '1', name: clinicName }], entries: [], plans: [], auditLog: [], summary: { active: 1 }, sync: { complete: true, checked_at: new Date().toISOString(), issues: [] } });
  });
  const sourceServer = sourceApp.listen(0, '127.0.0.1'); await new Promise(resolve => sourceServer.once('listening', resolve));
  t.after(() => new Promise(resolve => sourceServer.close(resolve)));
  const { app } = await createApp({ db, env: { MANAGEMENT_ORIGIN: 'http://localhost:3010', MANAGEMENT_SOURCE_URL: `http://127.0.0.1:${sourceServer.address().port}`, MANAGEMENT_SOURCE_TOKEN: token } });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const login = await fetch(`${base}/login`, { method: 'POST', headers: { Origin: 'http://localhost:3010', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.test', password: 'Senha-local-teste-123' }) });
  const headers = { Cookie: login.headers.get('set-cookie').split(';')[0], Origin: 'http://localhost:3010', 'Content-Type': 'application/json' };
  let data = await (await fetch(`${base}/data?month=2026-10`, { headers })).json();
  assert.equal(data.clients[0].name, clinicName); assert.ok(!JSON.stringify(data).includes(token));
  clinicName = 'Mudou no sistema'; data = await (await fetch(`${base}/data?month=2026-10`, { headers })).json();
  assert.equal(data.clients[0].name, clinicName); assert.equal(calls, 2); assert.equal((await db.all('SELECT id FROM clients')).length, 0);
  for (const endpoint of ['clients', 'plans', 'entries']) assert.equal((await fetch(`${base}/${endpoint}`, { method: 'POST', headers, body: '{}' })).status, 409);
  assert.equal((await fetch(`${base}/entries/id`, { method: 'DELETE', headers })).status, 409);
});
