import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../src/db.js';
import { hashPassword } from '../src/security.js';

// JSON exclusivamente pela entrada padrão: não coloque senhas em argumentos ou arquivos.
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 4096) throw new Error('Entrada excessiva.');
}
let db;
try {
  const { name, email, password } = JSON.parse(input);
  if (typeof name !== 'string' || !name.trim() || name.length > 160 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Nome e e-mail válidos são obrigatórios.');
  const passwordHash = await hashPassword(password);
  db = await openDatabase();
  const existing = await db.get('SELECT id FROM owners WHERE email = ?', [email.trim().toLowerCase()]);
  if (existing) {
    await db.run('UPDATE owners SET name = ?, password_hash = ?, active = 1 WHERE id = ?', [name.trim(), passwordHash, existing.id]);
    await db.run('DELETE FROM sessions WHERE owner_id = ?', [existing.id]);
  } else {
    await db.run('INSERT INTO owners (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [randomUUID(), name.trim(), email.trim().toLowerCase(), passwordHash]);
  }
  console.log('Sócio provisionado. Sessões anteriores desse e-mail foram revogadas.');
} catch {
  console.error('Não foi possível provisionar. Envie JSON via stdin com name, email e password (12 a 256 caracteres) e confira o banco.');
  process.exitCode = 1;
} finally { if (db) await db.close(); }
