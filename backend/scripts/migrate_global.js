import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function migrate() {
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  console.log("🚀 Iniciando migração global...");

  const addColumn = async (table, column, type) => {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`✅ Coluna '${column}' adicionada à tabela '${table}'.`);
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`ℹ️ Coluna '${column}' já existe em '${table}'.`);
      } else {
        console.error(`❌ Erro ao adicionar '${column}' em '${table}':`, err.message);
      }
    }
  };

  // Clinicas
  await addColumn('clinicas', 'cnpj', 'TEXT');

  // Usuarios
  await addColumn('usuarios', 'ativo', 'INTEGER DEFAULT 1');
  await addColumn('usuarios', 'tentativas_login', 'INTEGER DEFAULT 0');
  await addColumn('usuarios', 'ultimo_login', 'TEXT');
  await addColumn('usuarios', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

  // Retornos
  await addColumn('retornos', 'consulta_id', 'INTEGER');
  await addColumn('retornos', 'pet_nome', 'TEXT');
  await addColumn('retornos', 'tutor_nome', 'TEXT');
  await addColumn('retornos', 'data_retorno', 'TEXT');
  await addColumn('retornos', 'horario', 'TEXT');
  await addColumn('retornos', 'observacoes', 'TEXT');
  await addColumn('retornos', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

  console.log("✅ Migração global concluída!");
  await db.close();
}

migrate();
