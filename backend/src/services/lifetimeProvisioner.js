import bcrypt from 'bcrypt';
import { runTransaction } from '../db.js';

export async function provisionLifetimeAdminFromEnvironment() {
  const email = process.env.LIFETIME_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.LIFETIME_ADMIN_PASSWORD;
  if (!email && !password) return 'not-configured';
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL é obrigatório para provisionar a conta vitalícia; SQLite local não será usado.');
  }
  if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('LIFETIME_ADMIN_EMAIL e LIFETIME_ADMIN_PASSWORD precisam estar configurados corretamente.');
  }

  const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
  if (!passwordPolicy.test(password)) {
    throw new Error('A senha da conta vitalícia precisa ter 8 caracteres e incluir maiúscula, minúscula, número e símbolo.');
  }

  const existingUser = await runTransaction(async (tx) => tx.get(
    `SELECT u.id, u.clinica_id, u.perfil, u.ativo, c.status_assinatura, c.plano_id
     FROM usuarios u LEFT JOIN clinicas c ON c.id = u.clinica_id
     WHERE LOWER(u.email) = ?`,
    [email]
  ));

  if (existingUser?.status_assinatura === 'vitalicio' && existingUser.plano_id === 'complete' && existingUser.perfil === 'admin' && existingUser.ativo) {
    return 'already-provisioned';
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return runTransaction(async (tx) => {
    const user = await tx.get('SELECT id, clinica_id FROM usuarios WHERE LOWER(email) = ?', [email]);
    let clinicId = user?.clinica_id;

    if (!clinicId) {
      const clinic = await tx.run(
        `INSERT INTO clinicas (nome, email, status_assinatura, data_expiracao, plano_id, onboarding_concluido)
         VALUES (?, ?, 'vitalicio', NULL, 'complete', 1)`,
        ['Ouro Pet Vet SJ', email]
      );
      clinicId = clinic.lastID;
    } else {
      await tx.run(
        `UPDATE clinicas
         SET status_assinatura = 'vitalicio', data_expiracao = NULL, plano_id = 'complete', onboarding_concluido = 1
         WHERE id = ?`,
        [clinicId]
      );
    }

    if (user) {
      await tx.run(
        `UPDATE usuarios SET clinica_id = ?, senha = ?, perfil = 'admin', ativo = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [clinicId, passwordHash, user.id]
      );
      return 'updated';
    }

    await tx.run(
      `INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo)
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [clinicId, 'Administrador Ouro Pet', email, passwordHash]
    );
    return 'created';
  });
}
