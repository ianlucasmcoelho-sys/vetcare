import { openDb } from './src/db.js';

async function expireAccount() {
  const email = 'teste2@gmail.com';
  console.log(`Forçando expiração da conta: ${email}`);
  
  const db = await openDb();

  const user = await db.get('SELECT clinica_id FROM usuarios WHERE email = ?', [email]);
  
  if (user && user.clinica_id) {
    // Definir como vencido e data expirada
    await db.run('UPDATE clinicas SET status_assinatura = "vencido", data_expiracao = "2020-01-01T00:00:00.000Z" WHERE id = ?', [user.clinica_id]);
    console.log(`✅ Sucesso: Clínica associada a ${email} (ID: ${user.clinica_id}) definida como VENCIDA.`);
  } else {
    console.log(`❌ Usuário ${email} não encontrado no banco de dados.`);
  }
}

expireAccount().catch(console.error);
