import { openDb } from './src/db.js';

async function test() {
  try {
    const db = await openDb();
    const row = await db.get('SELECT * FROM animais LIMIT 1');
    console.log('RESULT:', row);
    await db.close();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

test();
