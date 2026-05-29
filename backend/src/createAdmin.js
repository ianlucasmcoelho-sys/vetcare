// backend/src/createAdmin.js
import bcrypt from 'bcrypt';
import { openDb } from './db.js';

async function createAdmin() {
  const db = await openDb();
  
  try {
    // Verificar se já existe admin
    const adminExists = await db.get('SELECT id FROM usuarios WHERE email = ?', ['admin@vetcare.com']);
    
    if (!adminExists) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      
      await db.run(`
        INSERT INTO usuarios (nome, email, senha, perfil, ativo)
        VALUES ('Administrador', 'admin@vetcare.com', ?, 'admin', 1)
      `, [senhaHash]);
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 E-mail: admin@vetcare.com');
      console.log('🔑 Senha: admin123');
    } else {
      console.log('⚠️ Usuário admin já existe!');
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
}

createAdmin();