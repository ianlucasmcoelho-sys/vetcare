const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('../src/client.cjs');
const reply = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
test('cliente aceita somente servidor fixo, métodos e caminhos permitidos', async () => {
  assert.throws(() => createClient({ origin: 'https://outro.example' }), /não autorizado/);
  assert.throws(() => createClient({ origin: 'http://vetcaresistema.com' }), /não autorizado/);
  const calls = [], client = createClient({ request: async (...args) => { calls.push(args); return reply(500, {}); } });
  for (const path of ['/data?month=2026-99', '/../../arquivo', '/api/company', 'https://outro.example']) assert.equal((await client.invoke(path)).status, 400);
  assert.equal((await client.invoke('/me')).status, 401); assert.equal(calls.length, 0);
});
test('token individual só permanece no processo principal; login, dados e logout', async () => {
  const token = 'a'.repeat(64), calls = [];
  const client = createClient({ request: async (url, options) => {
    calls.push({ url, options });
    if (url.pathname.endsWith('/login')) return reply(200, { token, owner: { id: '1', name: 'Sócio', email: 'owner@example.test' } });
    if (url.pathname.endsWith('/overview')) return reply(200, { automatic: true, month: '2026-10', clients: [], plans: [], entries: [], summary: {}, sync: {} });
    return reply(200, { ok: true });
  } });
  const result = await client.invoke('/login', { method: 'POST', body: JSON.stringify({ email: 'owner@example.test', password: 'Senha-ficticia-123' }) });
  assert.equal(result.status, 200); assert.ok(!JSON.stringify(result).includes(token));
  assert.equal((await client.invoke('/data?month=2026-10')).status, 200);
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${token}`);
  assert.equal(calls[1].options.redirect, 'error'); assert.equal(calls[1].url.origin, 'https://vetcaresistema.com');
  assert.equal((await client.invoke('/logout', { method: 'POST' })).status, 200);
  assert.equal((await client.invoke('/me')).status, 401);
});
test('servidor não publicado e rede indisponível têm erros legíveis', async () => {
  const options = { method: 'POST', body: JSON.stringify({ email: 'owner@example.test', password: 'Senha-ficticia-123' }) };
  const unpublished = createClient({ request: async () => reply(404, {}) });
  assert.match((await unpublished.invoke('/login', options)).data.error, /ainda não foi publicada/);
  const offline = createClient({ request: async () => { throw new Error('Erro interno com segredo'); } });
  assert.match((await offline.invoke('/login', options)).data.error, /internet/);
});
