import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function migrate() {
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  console.log("🚀 Iniciando migração da tabela 'prontuarios'...");

  try {
    const info = await db.all("PRAGMA table_info(prontuarios)");
    const columns = info.map(c => c.name);

    if (!columns.includes('animal_id')) {
      console.log("➕ Adicionando coluna 'animal_id'...");
      await db.exec("ALTER TABLE prontuarios ADD COLUMN animal_id INTEGER");
    }

    if (!columns.includes('veterinario_id')) {
      console.log("➕ Adicionando coluna 'veterinario_id'...");
      await db.exec("ALTER TABLE prontuarios ADD COLUMN veterinario_id INTEGER");
    }

    if (!columns.includes('clinica_id')) {
        console.log("➕ Adicionando coluna 'clinica_id'...");
        await db.exec("ALTER TABLE prontuarios ADD COLUMN clinica_id INTEGER DEFAULT 1");
    }

    console.log("✅ Migração concluída com sucesso!");
  } catch (err) {
    console.error("❌ Erro na migração:", err);
  } finally {
    await db.close();
  }
}

migrate();
