import { openDb } from './src/db.js';

async function run() {
  const connection = await openDb();
  await connection.run("UPDATE clinicas SET status_assinatura = 'active', plano_id = 'complete' WHERE email = 'ianlucasmcoelho@gmail.com'");
  console.log('User ianlucasmcoelho@gmail.com updated to lifetime access (complete).');
  process.exit(0);
}
run();
