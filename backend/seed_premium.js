import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

async function seed() {
  console.log("🌱 Iniciando o Seed Premium Ajustado...");
  
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  // 1. Criar Clínica e Admin
  const senhaHash = await bcrypt.hash('admin123', 10);
  await db.run(`INSERT OR IGNORE INTO clinicas (id, nome, email) VALUES (1, 'VetCare Matriz', 'contato@vetcare.com')`);
  await db.run(`INSERT OR IGNORE INTO usuarios (id, clinica_id, nome, email, senha, perfil) VALUES (1, 1, 'Administrador Sênior', 'admin@vetcare.com', '${senhaHash}', 'admin')`);

  // 2. Criar Tutores
  await db.run(`INSERT OR IGNORE INTO responsaveis (id, clinica_id, nome, cpf, celular, email) VALUES (1, 1, 'Mateus Estudos', '123.456.789-00', '11988887777', 'mateus@exemplo.com')`);

  // 3. Criar Animais
  await db.run(`INSERT OR IGNORE INTO animais (id, clinica_id, responsavel_id, nome, especie, raca) VALUES (1, 1, 1, 'Thor', 'Cão', 'Golden')`);
  await db.run(`INSERT OR IGNORE INTO animais (id, clinica_id, responsavel_id, nome, especie, raca) VALUES (3, 1, 1, 'Max', 'Cão', 'Bulldog')`);

  // 4. Criar Prontuários (Ajustado para o schema real)
  const hoje = new Date().toISOString().split('T')[0];
  await db.run(`INSERT OR IGNORE INTO prontuarios (clinica_id, pet_nome, tutor_nome, data_visita, diagnostico, tratamento, veterinario) 
    VALUES (1, 'Thor', 'Mateus Estudos', '${hoje}', 'Exame de Rotina', 'Saudável - Vacinação em dia', 'Dr. Ricardo')`);

  // 5. Criar Financeiro
  await db.run(`INSERT OR IGNORE INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data) VALUES (1, 'Consulta Thor', 'Serviço', 150.00, 'entrada', '${hoje}')`);

  // 6. Criar Internação
  await db.run(`INSERT OR IGNORE INTO internacoes (id, clinica_id, animal_id, data_entrada, motivo, status) VALUES (1, 1, 3, '${hoje}', 'Monitoramento Pós-Cirurgia', 'ativo')`);

  console.log("✨ Seed Premium concluído!");
  await db.close();
}

seed().catch(console.error);
