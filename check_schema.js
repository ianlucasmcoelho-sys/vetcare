import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function test() {
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  console.log("Checking 'prontuarios' table info...");
  const info = await db.all("PRAGMA table_info(prontuarios)");
  console.log(info);

  console.log("\nChecking 'agendamentos' table info...");
  const infoAgend = await db.all("PRAGMA table_info(agendamentos)");
  console.log(infoAgend);

  console.log("\nChecking 'vacinas' table info...");
  const infoVac = await db.all("PRAGMA table_info(vacinas)");
  console.log(infoVac);

  console.log("\nChecking 'servicos' table info...");
  const infoServ = await db.all("PRAGMA table_info(servicos)");
  console.log(infoServ);

  await db.close();
}

test().catch(console.error);
