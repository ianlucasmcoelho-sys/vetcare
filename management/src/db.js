import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function openDatabase(env = process.env) {
  let db;
  if (env.MANAGEMENT_DATABASE_URL) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: env.MANAGEMENT_DATABASE_URL,
      ...(env.MANAGEMENT_PGSSL === 'true' ? { ssl: {
        rejectUnauthorized: true,
        ...(env.MANAGEMENT_PGSSL_CA_BASE64 ? { ca: Buffer.from(env.MANAGEMENT_PGSSL_CA_BASE64, 'base64').toString() } : {})
      } } : {})
    });
    const query = (sql, params = []) => {
      let i = 0;
      return pool.query(sql.replace(/\?/g, () => `$${++i}`), params);
    };
    db = {
      all: async (sql, params) => (await query(sql, params)).rows,
      get: async (sql, params) => (await query(sql, params)).rows[0],
      run: async (sql, params) => query(sql, params),
      close: () => pool.end()
    };
  } else {
    if (env.NODE_ENV === 'production') throw new Error('MANAGEMENT_DATABASE_URL é obrigatório em produção.');
    const filename = env.MANAGEMENT_SQLITE_PATH || fileURLToPath(new URL('../data/management.sqlite', import.meta.url));
    if (filename !== ':memory:') await fs.mkdir(path.dirname(path.resolve(filename)), { recursive: true });
    const [{ open }, { default: sqlite3 }] = await Promise.all([import('sqlite'), import('sqlite3')]);
    db = await open({ filename, driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  }
  for (const sql of schema) await db.run(sql);
  return db;
}

const schema = [
  `CREATE TABLE IF NOT EXISTS owners (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id), expires_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, monthly_cents INTEGER NOT NULL CHECK(monthly_cents >= 0), active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL, plan_id TEXT REFERENCES plans(id), monthly_cents INTEGER NOT NULL CHECK(monthly_cents >= 0), started_on TEXT NOT NULL, due_on TEXT NOT NULL, notes TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('income','expense')), description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), occurred_on TEXT NOT NULL, client_id TEXT REFERENCES clients(id), created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id), action TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL)`
];
