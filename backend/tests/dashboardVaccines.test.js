import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getDashboardVaccines } from '../src/services/dashboardVaccines.js';

test('vacinas: vencimento, limites, última dose, óbito e isolamento por clínica', async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  try {
    await db.exec(`CREATE TABLE animais (id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, obito INTEGER);
      CREATE TABLE vacinas (id INTEGER PRIMARY KEY, clinica_id INTEGER, animal_id INTEGER, nome_vacina TEXT, data_aplicacao TEXT, proxima_dose TEXT);
      INSERT INTO animais VALUES (1,1,'Luna',0),(2,1,'Bob',1),(3,2,'Outra clínica',0);
      INSERT INTO vacinas VALUES
      (1,1,1,'V10','2025-01-01','2026-10-01'),
      (2,1,1,'v10','2026-10-01','2027-10-01'),
      (3,1,1,'Raiva','2025-01-01','2026-10-25'),
      (4,1,1,'Gripe','2025-01-01','2026-10-26'),
      (5,1,1,'Giárdia','2025-01-01','2026-11-25'),
      (6,1,1,'Outra','2025-01-01','2026-11-26'),
      (7,1,2,'Raiva','2025-01-01','2026-01-01'),
      (8,2,3,'Raiva','2025-01-01','2026-01-01'),
      (9,1,1,'Sem reforço','2025-01-01',NULL),
      (10,1,1,'Empate','2025-01-01','2026-01-01'),
      (11,1,1,'Empate','2025-01-01',NULL);`);
    const result = await getDashboardVaccines(db, 1, '2026-10-26');
    assert.equal(result.vencidas, 1);
    assert.equal(result.pendentes, 2);
    assert.deepEqual(result.itens.map(item => item.id), [3, 4, 5]);
    assert.deepEqual(await getDashboardVaccines(db, 99, '2026-10-26'), { vencidas: 0, pendentes: 0, itens: [] });
    for (let i = 0; i < 7; i++) await db.run('INSERT INTO vacinas VALUES (?,1,1,?, ?, ?)', [20+i, `Vacina ${i}`, '2025-01-01', '2026-10-01']);
    const limited = await getDashboardVaccines(db, 1, '2026-10-26');
    assert.equal(limited.vencidas, 8);
    assert.equal(limited.itens.length, 5);
  } finally { await db.close(); }
});
