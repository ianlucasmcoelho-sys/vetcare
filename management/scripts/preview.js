import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/server.js';
import { hashPassword } from '../src/security.js';
import { createCompanyRouter } from '../../backend/src/routes/companyRoutes.js';
import { createCompanyOverview } from '../../backend/src/services/companyOverview.js';

if (process.env.NODE_ENV === 'production') throw new Error('A prévia é exclusivamente local.');
// Só leitura: nunca inicializa nem migra o banco clínico.
const clinicDb = await open({ filename: fileURLToPath(new URL('../../backend/clinica.db', import.meta.url)), driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });
const db = await openDatabase({ MANAGEMENT_SQLITE_PATH: ':memory:' });
await db.run('INSERT INTO owners (id, name, email, password_hash) VALUES (?, ?, ?, ?)', ['preview', 'Sócio · prévia local', 'demo@example.test', await hashPassword('Demonstracao-local-2026')]);
const token = randomBytes(32).toString('hex');
const sourceApp = express();
sourceApp.use('/api/company', createCompanyRouter({ token: () => token, overview: createCompanyOverview({ openDb: async () => clinicDb, gateway: { configured: false, sandbox: false } }) }));
const sourceServer = sourceApp.listen(0, '127.0.0.1');
await new Promise(resolve => sourceServer.once('listening', resolve));
const env = { NODE_ENV: 'development', MANAGEMENT_ORIGIN: 'http://localhost:3010', MANAGEMENT_SOURCE_URL: `http://127.0.0.1:${sourceServer.address().port}`, MANAGEMENT_SOURCE_TOKEN: token, MANAGEMENT_LOCAL_SOURCE: '1' };
const { app } = await createApp({ db, env });
const server = app.listen(3010, '127.0.0.1', () => console.log('Prévia automática: http://localhost:3010 | demo@example.test | Demonstracao-local-2026 | fonte: banco LOCAL do sistema; Asaas de produção não conectado'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => {
  await new Promise(resolve => sourceServer.close(resolve)); await clinicDb.close(); await db.close(); process.exit(0);
}));
