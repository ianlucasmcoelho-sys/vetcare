import { openDb } from "../db.js";

// Criar animal
export async function createAnimal(req, res) {
  try {
    const db = await openDb();
    const {
      nome, microchip, especie, raca, sexo, nascimento,
      idade, idade_unidade, temperamento, porte, pelagem,
      castrado, rga, plano_saude, carteirinha_numero,
      carteirinha_validade, alergias, doencas_cronicas,
      responsavel_id, obito, data_obito
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    const result = await db.run(
      `INSERT INTO animais (
        clinica_id, nome, microchip, especie, raca, sexo, nascimento,
        idade, idade_unidade, temperamento, porte, pelagem,
        castrado, rga, plano_saude, carteirinha_numero,
        carteirinha_validade, alergias, doencas_cronicas,
        responsavel_id, obito, data_obito
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        clinica_id, nome, microchip, especie, raca, sexo, nascimento,
        idade, idade_unidade, temperamento, porte, pelagem,
        castrado, rga, plano_saude, carteirinha_numero,
        carteirinha_validade, alergias, doencas_cronicas,
        responsavel_id, obito || 0, data_obito || null
      ]
    );

    res.status(201).json({ success: true, id: result.lastID, message: "Animal cadastrado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cadastrar animal" });
  }
}

// Listar animais
export async function getAnimais(req, res) {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const animais = await db.all("SELECT * FROM animais WHERE clinica_id = ?", [clinica_id]);
    res.json(animais);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar animais" });
  }
}

// Buscar animal por ID
export async function getAnimalById(req, res) {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const animal = await db.get("SELECT * FROM animais WHERE id = ? AND clinica_id = ?", [id, clinica_id]);
    
    if (!animal) {
      return res.status(404).json({ error: "Animal não encontrado" });
    }
    
    res.json(animal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar animal" });
  }
}

// Atualizar animal
export async function updateAnimal(req, res) {
  try {
    const db = await openDb();
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      nome, microchip, especie, raca, sexo, nascimento,
      idade, idade_unidade, temperamento, porte, pelagem,
      castrado, rga, plano_saude, carteirinha_numero,
      carteirinha_validade, alergias, doencas_cronicas,
      responsavel_id, obito, data_obito
    } = req.body;

    const result = await db.run(
      `UPDATE animais SET
        nome=?, microchip=?, especie=?, raca=?, sexo=?, nascimento=?,
        idade=?, idade_unidade=?, temperamento=?, porte=?, pelagem=?,
        castrado=?, rga=?, plano_saude=?, carteirinha_numero=?,
        carteirinha_validade=?, alergias=?, doencas_cronicas=?,
        responsavel_id=?, obito=?, data_obito=?
      WHERE id=? AND clinica_id=?`,
      [
        nome, microchip, especie, raca, sexo, nascimento,
        idade, idade_unidade, temperamento, porte, pelagem,
        castrado, rga, plano_saude, carteirinha_numero,
        carteirinha_validade, alergias, doencas_cronicas,
        responsavel_id, obito || 0, data_obito || null, id, clinica_id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Animal não encontrado ou sem permissão" });
    }

    res.json({ success: true, message: "Animal atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar animal" });
  }
}

// Excluir animal
export async function deleteAnimal(req, res) {
  try {
    const db = await openDb();
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    
    const result = await db.run("DELETE FROM animais WHERE id=? AND clinica_id=?", [id, clinica_id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Animal não encontrado ou sem permissão" });
    }

    res.json({ success: true, message: "Animal excluído com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir animal" });
  }
}

// Buscar Prontuário Completo (Timeline)
export async function getAnimalTimeline(req, res) {
  try {
    const db = await openDb();
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;

    // 1. Busca os dados básicos do animal
    const animal = await db.get("SELECT * FROM animais WHERE id = ? AND clinica_id = ?", [id, clinica_id]);

    if (!animal) {
      return res.status(404).json({ error: "Animal não encontrado" });
    }

    // 2. Busca o histórico de consultas
    const consultas = await db.all(
      "SELECT * FROM prontuarios WHERE clinica_id = ? AND animal_id = ? ORDER BY data_visita DESC", 
      [clinica_id, id]
    );

    // 3. Busca o histórico de vacinas
    const vacinas = await db.all(
      "SELECT * FROM vacinas WHERE animal_id = ? AND clinica_id = ? ORDER BY data_aplicacao DESC", 
      [id, clinica_id]
    );

    // 4. Retorna tudo estruturado
    res.json({
      ...animal,
      historico: {
        consultas: consultas || [],
        vacinas: vacinas || []
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar prontuário do animal" });
  }
}