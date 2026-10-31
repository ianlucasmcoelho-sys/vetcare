import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const sessionHash = value => createHash('sha256').update(value).digest('hex');
export async function ownerPasswordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw Object.assign(new Error('Use uma senha de 12 a 256 caracteres.'), { httpStatus: 400 });
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
async function passwordMatches(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const [salt, hash] = encoded.split(':');
  const actual = await scrypt(password, salt, 64), expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function initCompanyAuth(db) {
  await db.run(`CREATE TABLE IF NOT EXISTS company_owner_accounts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)`);
  await db.run(`CREATE TABLE IF NOT EXISTS company_owner_sessions (
    token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES company_owner_accounts(id), expires_at TEXT NOT NULL)`);
  if (db.dialect === 'postgres') {
    // Supabase expõe public via PostgREST. Contas/sessões são exclusivas do backend.
    for (const table of ['company_owner_accounts', 'company_owner_sessions']) {
      await db.run(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await db.run(`REVOKE ALL ON TABLE ${table} FROM PUBLIC`);
      for (const role of ['anon', 'authenticated']) {
        if (await db.get('SELECT 1 AS present FROM pg_roles WHERE rolname = ?', [role])) await db.run(`REVOKE ALL ON TABLE ${table} FROM ${role}`);
      }
    }
  }
}
export async function provisionCompanyOwner(db, { name, email, password }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 160 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Nome e e-mail válidos são obrigatórios.');
  const hash = await ownerPasswordHash(password);
  await initCompanyAuth(db);
  const normalized = email.trim().toLowerCase();
  const owner = await db.get('SELECT id FROM company_owner_accounts WHERE email = ?', [normalized]);
  if (owner) {
    await db.run('UPDATE company_owner_accounts SET name = ?, password_hash = ?, active = 1 WHERE id = ?', [name.trim(), hash, owner.id]);
    await db.run('DELETE FROM company_owner_sessions WHERE owner_id = ?', [owner.id]);
  } else await db.run('INSERT INTO company_owner_accounts (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [randomUUID(), name.trim(), normalized, hash]);
}
export function createCompanyAuth({ openDb, clock = () => new Date() }) {
  const fail = (message, httpStatus = 401) => { throw Object.assign(new Error(message), { httpStatus }); };
  return {
    async login(email, password) {
      if (typeof email !== 'string' || email.length > 254) fail('E-mail ou senha inválidos.');
      const db = await openDb();
      const owner = await db.get('SELECT * FROM company_owner_accounts WHERE email = ? AND active = 1', [email.trim().toLowerCase()]);
      const valid = await passwordMatches(password, owner?.password_hash || `00000000000000000000000000000000:${'00'.repeat(64)}`);
      if (!owner || !valid) fail('E-mail ou senha inválidos.');
      const token = randomBytes(32).toString('hex'), expiresAt = new Date(+clock() + 8 * 3600000).toISOString();
      await db.run('DELETE FROM company_owner_sessions WHERE expires_at <= ?', [clock().toISOString()]);
      await db.run('INSERT INTO company_owner_sessions (token_hash, owner_id, expires_at) VALUES (?, ?, ?) RETURNING token_hash', [sessionHash(token), owner.id, expiresAt]);
      return { token, expires_at: expiresAt, owner: { id: owner.id, name: owner.name, email: owner.email } };
    },
    async authenticate(token) {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail('Entre com sua conta de sócio.');
      const owner = await (await openDb()).get(`SELECT o.id, o.name, o.email FROM company_owner_sessions s
        JOIN company_owner_accounts o ON o.id = s.owner_id
        WHERE s.token_hash = ? AND s.expires_at > ? AND o.active = 1`, [sessionHash(token), clock().toISOString()]);
      if (!owner) fail('Sessão expirada ou revogada. Entre novamente.');
      return owner;
    },
    async logout(token) { await (await openDb()).run('DELETE FROM company_owner_sessions WHERE token_hash = ?', [sessionHash(token)]); },
    async password(ownerId, current, password) {
      const db = await openDb();
      const owner = await db.get('SELECT password_hash FROM company_owner_accounts WHERE id = ? AND active = 1', [ownerId]);
      if (!owner || !await passwordMatches(current, owner.password_hash)) fail('Senha atual inválida.', 403);
      const hash = await ownerPasswordHash(password);
      await db.run('UPDATE company_owner_accounts SET password_hash = ? WHERE id = ?', [hash, ownerId]);
      await db.run('DELETE FROM company_owner_sessions WHERE owner_id = ?', [ownerId]);
    }
  };
}
