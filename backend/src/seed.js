import bcrypt from 'bcrypt';
import { openDb } from './db.js';

async function seed() {
  const db = await openDb();
  
  // Criar clínica padrão
  const clinica = await db.run(`
    INSERT INTO clinicas (nome, cnpj, telefone, email, endereco)
    VALUES ('VetCare Matriz', '00.000.000/0001-00', '(11) 99999-9999', 'contato@vetcare.com', 'Rua Principal, 123')
  `);
  const clinicaId = clinica.lastID;
  
  // Criar usuário admin
  const senhaHash = await bcrypt.hash('admin123', 10);
  await db.run(`
    INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo)
    VALUES (?, 'Administrador', 'admin@vetcare.com', ?, 'admin', 1)
  `, [clinicaId, senhaHash]);
  
  console.log('✅ Dados iniciais criados: clinica ID', clinicaId);
}

seed();