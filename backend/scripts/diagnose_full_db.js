import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function diagnose() {
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  console.log('--- TABLES ---');
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(tables.map(t => t.name).join(', '));

  const tablesToInspect = ['usuarios', 'clinicas', 'retornos', 'prontuarios'];

  for (const table of tablesToInspect) {
    console.log(`\n--- ${table.toUpperCase()} SCHEMA ---`);
    const info = await db.all(`PRAGMA table_info(${table})`);
    console.log(JSON.stringify(info, null, 2));
  }

  await db.close();
}

diagnose().catch(console.error);
