import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openDatabase } from './db.js';
import { hashPassword, hashToken, verifyPassword } from './security.js';
import { createSystemSource } from './source.js';

const statuses = ['trial', 'active', 'overdue', 'cancelled'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function text(value, label, max = 160, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${label}: informe um texto válido com até ${max} caracteres.`);
  return value.trim();
}
function cents(value, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0) || value > 1000000000) fail('Valor inválido.');
  return value;
}
function date(value, optional = false) {
  if (optional && !value) return '';
  const parsed = typeof value === 'string' ? new Date(`${value}T12:00:00Z`) : new Date(NaN);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 2000 || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('Data inválida.');
  return value;
}
const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const now = () => new Date().toISOString();

export async function createApp({ db, env = process.env, source } = {}) {
  db ||= await openDatabase(env);
  const app = express();
  const automatic = env.MANAGEMENT_MANUAL_MODE !== '1';
  source ||= createSystemSource(env);
  const production = env.NODE_ENV === 'production';
  const origin = env.MANAGEMENT_ORIGIN || 'http://localhost:3010';
  if (production && (!env.MANAGEMENT_ORIGIN || new URL(origin).protocol !== 'https:')) throw new Error('Configure MANAGEMENT_ORIGIN com HTTPS.');
  const cookieName = production ? '__Host-vetcare_management' : 'vetcare_management';
  if (env.MANAGEMENT_TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ strictTransportSecurity: production ? undefined : false, contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'style-src': ["'self'"], 'upgrade-insecure-requests': production ? [] : null } } }));
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => { req.body ||= {}; next(); });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== origin) return res.status(403).json({ error: 'Origem não autorizada.' });
    next();
  });
  app.get('/api/health', safe(async (req, res) => { await db.get('SELECT 1 AS ok'); res.json({ status: 'ok', application: 'vetcare-management' }); }));
  app.post('/api/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } }), safe(async (req, res) => {
    const email = text(req.body.email, 'E-mail', 254).toLowerCase();
    const owner = await db.get('SELECT * FROM owners WHERE email = ? AND active = 1', [email]);
    // Executa scrypt mesmo para e-mails inexistentes para reduzir diferença de tempo.
    const dummy = `00000000000000000000000000000000:${'00'.repeat(64)}`;
    const valid = await verifyPassword(req.body.password, owner?.password_hash || dummy);
    if (!owner || !valid) fail('E-mail ou senha inválidos.', 401);
    await db.run('DELETE FROM sessions WHERE expires_at <= ?', [now()]);
    const token = randomBytes(32).toString('hex');
    await db.run('INSERT INTO sessions (token_hash, owner_id, expires_at) VALUES (?, ?, ?)', [hashToken(token), owner.id, new Date(Date.now() + 8 * 3600000).toISOString()]);
    res.cookie(cookieName, token, { httpOnly: true, secure: production, sameSite: 'strict', path: '/', maxAge: 8 * 3600000 });
    res.json({ name: owner.name, email: owner.email });
  }));
  app.use('/api', safe(async (req, res, next) => {
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) fail('Entre com sua conta de sócio.', 401);
    const owner = await db.get('SELECT o.id, o.name, o.email FROM sessions s JOIN owners o ON o.id = s.owner_id WHERE s.token_hash = ? AND s.expires_at > ? AND o.active = 1', [hashToken(token), now()]);
    if (!owner) fail('Sessão expirada. Entre novamente.', 401);
    req.owner = owner; req.tokenHash = hashToken(token); next();
  }));
  const audit = (req, action, target) => db.run('INSERT INTO audit_log (id, owner_id, action, target_id, created_at) VALUES (?, ?, ?, ?, ?)', [randomUUID(), req.owner.id, action, target, now()]);
  app.get('/api/me', (req, res) => res.json(req.owner));
  app.post('/api/logout', safe(async (req, res) => {
    await db.run('DELETE FROM sessions WHERE token_hash = ?', [req.tokenHash]);
    res.clearCookie(cookieName, { httpOnly: true, secure: production, sameSite: 'strict', path: '/' }); res.json({ ok: true });
  }));
  app.post('/api/password', safe(async (req, res) => {
    const owner = await db.get('SELECT password_hash FROM owners WHERE id = ?', [req.owner.id]);
    if (!await verifyPassword(req.body.current, owner.password_hash)) fail('Senha atual inválida.', 403);
    const hash = await hashPassword(req.body.password).catch(() => fail('Use uma senha de 12 a 256 caracteres.'));
    await db.run('UPDATE owners SET password_hash = ? WHERE id = ?', [hash, req.owner.id]);
    await db.run('DELETE FROM sessions WHERE owner_id = ?', [req.owner.id]);
    await audit(req, 'password.changed', req.owner.id);
    res.clearCookie(cookieName, { httpOnly: true, secure: production, sameSite: 'strict', path: '/' }); res.json({ ok: true });
  }));
  app.get('/api/data', safe(async (req, res) => {
    const month = req.query.month || new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date());
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('Mês inválido.');
    if (automatic) return res.json({ ...await source(month), demo: false, local_source: env.MANAGEMENT_LOCAL_SOURCE === '1' });
    const [clients, plans, entries, auditLog] = await Promise.all([
      db.all('SELECT c.*, p.name AS plan_name FROM clients c LEFT JOIN plans p ON p.id = c.plan_id ORDER BY c.created_at DESC'),
      db.all('SELECT * FROM plans ORDER BY name'),
      db.all('SELECT e.*, c.name AS client_name FROM entries e LEFT JOIN clients c ON c.id = e.client_id WHERE e.occurred_on LIKE ? ORDER BY e.occurred_on DESC, e.created_at DESC', [`${month}-%`]),
      db.all('SELECT a.action, a.created_at, o.name AS owner_name FROM audit_log a JOIN owners o ON o.id = a.owner_id ORDER BY a.created_at DESC LIMIT 12')
    ]);
    const income = entries.filter(e => e.kind === 'income').reduce((sum, e) => sum + e.amount_cents, 0);
    const expense = entries.filter(e => e.kind === 'expense').reduce((sum, e) => sum + e.amount_cents, 0);
    res.json({ clients, plans, entries, auditLog, month, demo: env.MANAGEMENT_DEMO === '1', summary: {
      active: clients.filter(c => c.status === 'active').length,
      trial: clients.filter(c => c.status === 'trial').length,
      overdue: clients.filter(c => c.status === 'overdue').length,
      mrr: clients.filter(c => c.status === 'active').reduce((sum, c) => sum + c.monthly_cents, 0),
      income, expense, balance: income - expense
    } });
  }));
  app.use(['/api/clients', '/api/plans', '/api/entries'], (req, res, next) => {
    if (automatic && !['GET', 'HEAD'].includes(req.method)) return res.status(409).json({ error: 'Dados sincronizados do sistema. Alterações manuais estão desativadas.' });
    next();
  });
  for (const method of ['post', 'put']) {
    app[method](`/api/plans${method === 'put' ? '/:id' : ''}`, safe(async (req, res) => {
      const id = req.params.id || randomUUID();
      const name = text(req.body.name, 'Nome do plano');
      const price = cents(req.body.monthly_cents);
      const active = req.body.active === false || req.body.active === 0 ? 0 : 1;
      if (method === 'put') {
        if (!await db.get('SELECT id FROM plans WHERE id = ?', [id])) fail('Plano não encontrado.', 404);
        await db.run('UPDATE plans SET name = ?, monthly_cents = ?, active = ? WHERE id = ?', [name, price, active, id]);
      } else await db.run('INSERT INTO plans (id, name, monthly_cents, active) VALUES (?, ?, ?, ?)', [id, name, price, active]);
      await audit(req, `plan.${method === 'put' ? 'updated' : 'created'}`, id); res.status(method === 'put' ? 200 : 201).json({ id });
    }));
    app[method](`/api/clients${method === 'put' ? '/:id' : ''}`, safe(async (req, res) => {
      const b = req.body;
      const id = req.params.id || randomUUID();
      const email = text(b.email, 'E-mail', 254, true).toLowerCase();
      if (email && !emailPattern.test(email)) fail('E-mail inválido.');
      if (!statuses.includes(b.status)) fail('Situação inválida.');
      const plan = b.plan_id ? await db.get('SELECT id, active FROM plans WHERE id = ?', [b.plan_id]) : null;
      if (b.plan_id && !plan) fail('Plano não encontrado.');
      let existing;
      if (method === 'put') {
        existing = await db.get('SELECT id, plan_id FROM clients WHERE id = ?', [id]);
        if (!existing) fail('Clínica não encontrada.', 404);
      }
      if (plan && !plan.active && existing?.plan_id !== plan.id) fail('Este plano está inativo.');
      const values = [text(b.name, 'Clínica'), text(b.contact, 'Responsável'), email, text(b.phone, 'Telefone', 40, true), b.status, plan?.id || null, cents(b.monthly_cents), date(b.started_on), date(b.due_on, true), text(b.notes, 'Observações', 2000, true)];
      if (method === 'put') await db.run('UPDATE clients SET name = ?, contact = ?, email = ?, phone = ?, status = ?, plan_id = ?, monthly_cents = ?, started_on = ?, due_on = ?, notes = ? WHERE id = ?', [...values, id]);
      else await db.run('INSERT INTO clients (name, contact, email, phone, status, plan_id, monthly_cents, started_on, due_on, notes, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [...values, id, now()]);
      await audit(req, `client.${method === 'put' ? 'updated' : 'created'}`, id); res.status(method === 'put' ? 200 : 201).json({ id });
    }));
  }
  app.post('/api/entries', safe(async (req, res) => {
    const b = req.body;
    if (!['income', 'expense'].includes(b.kind)) fail('Tipo inválido.');
    if (b.client_id && !await db.get('SELECT id FROM clients WHERE id = ?', [b.client_id])) fail('Clínica não encontrada.');
    const id = randomUUID();
    await db.run('INSERT INTO entries (id, kind, description, amount_cents, occurred_on, client_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, b.kind, text(b.description, 'Descrição', 300), cents(b.amount_cents, true), date(b.occurred_on), b.client_id || null, now()]);
    await audit(req, 'entry.created', id); res.status(201).json({ id });
  }));
  app.delete('/api/entries/:id', safe(async (req, res) => {
    if (!await db.get('SELECT id FROM entries WHERE id = ?', [req.params.id])) fail('Lançamento não encontrado.', 404);
    await db.run('DELETE FROM entries WHERE id = ?', [req.params.id]);
    await audit(req, 'entry.deleted', req.params.id); res.json({ ok: true });
  }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url)), { index: 'index.html' }));
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('Falha interna na gestão:', err.code || err.name);
    res.status(status).json({ error: status >= 500 && err.status !== 503 ? 'Não foi possível concluir. Tente novamente.' : err.message });
  });
  return { app, db };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { app, db } = await createApp();
  const port = Number(process.env.PORT || 3010);
  const server = app.listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.log(`VetCare Gestão: http://localhost:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
}
