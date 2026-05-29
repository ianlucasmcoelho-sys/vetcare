import { openDb } from "../db.js";

export async function createAnimal(data) {
  const db = await openDb();
  const result = await db.run(
    "INSERT INTO animais (nome, especie, raca, sexo, nascimento, responsavel_id) VALUES (?,?,?,?,?,?)",
    [data.nome, data.especie, data.raca, data.sexo, data.nascimento, data.responsavel_id]
  );
  return { id: result.lastID, ...data };
}

export async function getAnimais() {
  const db = await openDb();
  return db.all("SELECT * FROM animais");
}

export async function updateAnimal(id, data) {
  const db = await openDb();
  await db.run(
    "UPDATE animais SET nome=?, especie=?, raca=?, sexo=?, nascimento=?, responsavel_id=? WHERE id=?",
    [data.nome, data.especie, data.raca, data.sexo, data.nascimento, data.responsavel_id, id]
  );
  return { id, ...data };
}

export async function deleteAnimal(id) {
  const db = await openDb();
  await db.run("DELETE FROM animais WHERE id=?", [id]);
  return { message: "Animal removido com sucesso" };
}
