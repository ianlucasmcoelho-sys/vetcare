import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function test() {
  try {
    const db = await open({
      filename: './clinica.db',
      driver: sqlite3.Database
    });

    console.log("Checking 'prontuarios' table info...");
    const info = await db.all("PRAGMA table_info(prontuarios)");
    console.log(JSON.stringify(info, null, 2));

    console.log("\nChecking 'animais' table info...");
    const infoAnim = await db.all("PRAGMA table_info(animais)");
    console.log(JSON.stringify(infoAnim, null, 2));

    console.log("\nChecking 'vacinas' table info...");
    const infoVac = await db.all("PRAGMA table_info(vacinas)");
    console.log(JSON.stringify(infoVac, null, 2));

    await db.close();
  } catch (err) {
    console.error("Test error:", err);
  }
}

test();
