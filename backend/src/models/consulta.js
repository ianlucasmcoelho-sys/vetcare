import { openDb } from "../db.js";

export async function createConsulta(data) {
  const db = await openDb();
  const result = await db.run(
    "INSERT INTO consultas (animal_id, data, descricao, status) VALUES (?,?,?,?)",
    [data.animal_id, data.data, data.descricao, data.status]
  );
  return { id: result.lastID, ...data };
}

export async function getConsultas() {
  const db = await openDb();
  return db.all("SELECT * FROM consultas");
}

export async function updateConsulta(id, data) {
  const db = await openDb();
  await db.run(
    "UPDATE consultas SET animal_id=?, data=?, descricao=?, status=? WHERE id=?",
    [data.animal_id, data.data, data.descricao, data.status, id]
  );
  return { id, ...data };
}

export async function deleteConsulta(id) {
  const db = await openDb();
  await db.run("DELETE FROM consultas WHERE id=?", [id]);
  return { message: "Consulta removida com sucesso" };
}
