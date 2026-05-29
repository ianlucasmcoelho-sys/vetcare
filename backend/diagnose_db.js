import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function diagnose() {
  console.log("🔍 Iniciando diagnóstico do banco de dados...");
  
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  const tables = [
    'clinicas', 'usuarios', 'responsaveis', 'animais', 'agendamentos', 
    'vacinas', 'prontuarios', 'retornos', 'servicos', 'financeiro', 
    'receituario', 'internacoes', 'exames', 'configuracoes', 'templates'
  ];

  for (const table of tables) {
    try {
      const info = await db.all(`PRAGMA table_info(${table})`);
      if (info.length === 0) {
        console.log(`❌ Tabela '${table}' NÃO existe.`);
      } else {
        const columns = info.map(c => c.name);
        if (!columns.includes('clinica_id') && table !== 'clinicas') {
          console.log(`⚠️ Tabela '${table}' não possui a coluna 'clinica_id'. Adicionando...`);
          await db.exec(`ALTER TABLE ${table} ADD COLUMN clinica_id INTEGER DEFAULT 1`);
        } else {
          console.log(`✅ Tabela '${table}' está OK.`);
        }
      }
    } catch (e) {
      console.error(`❌ Erro ao verificar tabela '${table}':`, e.message);
    }
  }

  // Verificar se existe a clínica 1
  const clinica = await db.get('SELECT id FROM clinicas WHERE id = 1');
  if (!clinica) {
    console.log("⚠️ Clínica padrão não encontrada. Criando...");
    await db.exec(`
      INSERT INTO clinicas (id, nome, email) 
      VALUES (1, 'VetCare Matriz', 'contato@vetcare.com')
    `);
  }

  // Verificar se o admin padrão tem clinica_id
  const admin = await db.get('SELECT * FROM usuarios WHERE email = ?', ['admin@vetcare.com']);
  if (admin && !admin.clinica_id) {
    console.log("⚠️ Admin padrão sem clinica_id. Ajustando...");
    await db.run('UPDATE usuarios SET clinica_id = 1 WHERE id = ?', [admin.id]);
  }

  console.log("✅ Diagnóstico concluído!");
  await db.close();
}

diagnose().catch(console.error);
