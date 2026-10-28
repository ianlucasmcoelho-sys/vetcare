// Run inside a transaction before serving requests during the first production start.
// This installation used only Asaas Sandbox before environment tracking was added.
export async function migrateSandboxBilling(db, environment) {
  if (environment !== 'production') return 0;
  const clinics = await db.all("SELECT * FROM clinicas WHERE asaas_environment = 'sandbox' AND (asaas_customer_id IS NOT NULL OR asaas_subscription_id IS NOT NULL)");
  let migrated = 0;
  for (const candidate of clinics) {
    await db.run('UPDATE clinicas SET asaas_environment = asaas_environment WHERE id = ?',[candidate.id]);
    const clinic = await db.get('SELECT * FROM clinicas WHERE id = ?',[candidate.id]);
    if (clinic.asaas_environment !== 'sandbox') continue;
    await db.run(`INSERT INTO billing_environment_archive
      (clinica_id, environment, customer_id, subscription_id, status_assinatura, plano_id, data_expiracao)
      VALUES (?, 'sandbox', ?, ?, ?, ?, ?)`,[clinic.id,clinic.asaas_customer_id,clinic.asaas_subscription_id,clinic.status_assinatura,clinic.plano_id,clinic.data_expiracao]);
    const testPaid = clinic.status_assinatura === 'active';
    await db.run(`UPDATE clinicas SET asaas_customer_id = NULL, asaas_subscription_id = NULL, asaas_environment = 'production',
      status_assinatura = ?, plano_id = ?, data_expiracao = ? WHERE id = ?`,[
      testPaid ? 'vencido' : clinic.status_assinatura,
      testPaid ? 'free' : clinic.plano_id,
      testPaid ? new Date().toISOString() : clinic.data_expiracao,clinic.id]);
    await db.run("UPDATE billing_checkouts SET state = 'ready' WHERE clinica_id = ?",[clinic.id]);
    migrated++;
  }
  return migrated;
}
