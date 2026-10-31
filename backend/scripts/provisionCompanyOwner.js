import 'dotenv/config';
import { openDb, closeDatabase } from '../src/db.js';
import { provisionCompanyOwner } from '../src/services/companyAuth.js';
let input = '';
try {
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error('Entrada excessiva.'); }
  await provisionCompanyOwner(await openDb(), JSON.parse(input));
  console.log('Conta empresarial provisionada. Sessões anteriores desse e-mail foram revogadas.');
} catch {
  console.error('Falha no provisionamento. Confira o banco e envie name, email e password (12 a 256 caracteres) por stdin.'); process.exitCode = 1;
} finally { await closeDatabase(); }
