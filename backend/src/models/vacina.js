import { openDb } from "../db.js";

export async function createVacina(data) {
  const db = await openDb();
  const result = await db.run(
    "INSERT INTO vacinas (pet_nome, vacina_nome, data_aplicacao, proxima_dose, lote) VALUES (?,?,?,?,?)",
    [data.pet_nome, data.vacina_nome, data.data_aplicacao, data.proxima_dose, data.lote]
  );
  return { id: result.lastID, ...data };
}

export async function getVacinas() {
  const db = await openDb();
  // Buscamos todas e ordenamos pela data mais recente
  return db.all("SELECT * FROM vacinas ORDER BY data_aplicacao DESC");
}

export async function updateVacina(id, data) {
  const db = await openDb();
  await db.run(
    "UPDATE vacinas SET pet_nome=?, vacina_nome=?, data_aplicacao=?, proxima_dose=?, lote=? WHERE id=?",
    [data.pet_nome, data.vacina_nome, data.data_aplicacao, data.proxima_dose, data.lote, id]
  );
  return { id, ...data };
}

export async function deleteVacina(id) {
  const db = await openDb();
  await db.run("DELETE FROM vacinas WHERE id=?", [id]);
  return { message: "Vacina removida com sucesso" };
}