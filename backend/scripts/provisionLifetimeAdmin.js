import 'dotenv/config';
import { closeDatabase, initDb } from '../src/db.js';
import { provisionLifetimeAdminFromEnvironment } from '../src/services/lifetimeProvisioner.js';

try {
  await initDb();
  const result = await provisionLifetimeAdminFromEnvironment();
  const messages = {
    'not-configured': 'Provisionamento ignorado: as variáveis temporárias da conta vitalícia não foram configuradas.',
    'already-provisioned': 'A conta administradora vitalícia já está configurada.',
    created: 'Conta administradora vitalícia criada.',
    updated: 'Conta existente promovida para administradora vitalícia.',
  };
  console.log(messages[result]);
} finally {
  await closeDatabase();
}
