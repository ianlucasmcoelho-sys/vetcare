import { openDb } from './src/db.js';

async function migrateSaas() {
  console.log("Iniciando migração SaaS no banco de dados...");
  const db = await openDb();

  try {
    // Adicionar colunas
    await db.exec('ALTER TABLE clinicas ADD COLUMN plano_id TEXT DEFAULT "free"');
    console.log("Coluna plano_id adicionada.");
  } catch (e) { console.log("A coluna plano_id possivelmente já existe."); }

  try {
    await db.exec('ALTER TABLE clinicas ADD COLUMN status_assinatura TEXT DEFAULT "trial"');
    console.log("Coluna status_assinatura adicionada.");
  } catch (e) { console.log("A coluna status_assinatura possivelmente já existe."); }

  try {
    await db.exec('ALTER TABLE clinicas ADD COLUMN data_expiracao TEXT');
    console.log("Coluna data_expiracao adicionada.");
  } catch (e) { console.log("A coluna data_expiracao possivelmente já existe."); }

  // Calcular data + 7 dias
  const hoje = new Date();
  hoje.setDate(hoje.getDate() + 7);
  const expiracaoTrial = hoje.toISOString();

  // Atualizar todas as clínicas para 'trial' e data limite
  await db.run('UPDATE clinicas SET status_assinatura = "trial", data_expiracao = ? WHERE status_assinatura IS NULL OR status_assinatura = "trial"', [expiracaoTrial]);
  console.log("Todas as clínicas existentes receberam 7 dias de trial.");

  // Procurar o admin ouro
  const adminEmail = 'ianlucasmcoelho@gmail.com';
  const user = await db.get('SELECT clinica_id FROM usuarios WHERE email = ?', [adminEmail]);
  
  if (user && user.clinica_id) {
    // Definir vitalício
    await db.run('UPDATE clinicas SET status_assinatura = "vitalicio", plano_id = "premium", data_expiracao = "2099-12-31T23:59:59.000Z" WHERE id = ?', [user.clinica_id]);
    console.log(`✅ Sucesso: Clínica associada a ${adminEmail} (ID: ${user.clinica_id}) definida como VITALÍCIA.`);
  } else {
    console.log(`Aviso: Usuário ${adminEmail} não encontrado. Nenhuma conta recebeu status vitalício ainda.`);
  }

  console.log("Migração concluída com sucesso!");
}

migrateSaas().catch(console.error);
