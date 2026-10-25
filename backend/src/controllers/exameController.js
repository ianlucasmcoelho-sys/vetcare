import { openDb } from '../db.js';

// Listar todos os exames da clínica
export const getAllExames = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const exames = await db.all(`
      SELECT 
        e.*,
        a.nome as animal_nome,
        r.nome as tutor_nome
      FROM exames e
      LEFT JOIN animais a ON e.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE e.clinica_id = ?
      ORDER BY e.data_solicitacao DESC
    `, [clinica_id]);
    res.json(exames);
  } catch (error) {
    console.error('Erro ao buscar exames:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar exames por animal
export const getExamesByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const exames = await db.all(`
      SELECT e.* FROM exames e
      WHERE e.animal_id = ? AND e.clinica_id = ?
      ORDER BY e.data_solicitacao DESC
    `, [animalId, clinica_id]);
    res.json(exames);
  } catch (error) {
    console.error('Erro ao buscar exames do animal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Solicitar novo exame
export const createExame = async (req, res) => {
  try {
    const { animal_id, tipo_exame, data_solicitacao, laboratorio, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!animal_id || !tipo_exame || !data_solicitacao) {
      return res.status(400).json({ error: 'Animal, tipo de exame e data de solicitação são obrigatórios' });
    }

    const db = await openDb();
    
    // Verificar animal
    const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado ou sem permissão' });
    }

    const result = await db.run(
      `INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, laboratorio, status) 
       VALUES (?, ?, ?, ?, ?, 'pendente')`,
      [clinica_id, animal_id, tipo_exame, data_solicitacao, laboratorio]
    );

    const novoExame = await db.get('SELECT * FROM exames WHERE id = ? AND clinica_id = ?', [result.lastID, clinica_id]);
    res.status(201).json({ success: true, ...novoExame });
  } catch (error) {
    console.error('Erro ao criar exame:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar resultado do exame
export const updateExame = async (req, res) => {
  try {
    const { id } = req.params;
    const { data_resultado, resultado, status, laboratorio } = req.body;
    const clinica_id = req.usuario.clinica_id;

    const db = await openDb();
    const existe = await db.get('SELECT id FROM exames WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Exame não encontrado ou sem permissão' });
    }

    await db.run(
      `UPDATE exames SET 
        data_resultado = COALESCE(?, data_resultado),
        resultado = COALESCE(?, resultado),
        status = COALESCE(?, status),
        laboratorio = COALESCE(?, laboratorio),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?`,
      [data_resultado, resultado, status, laboratorio, id, clinica_id]
    );

    const atualizado = await db.get('SELECT * FROM exames WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json({ success: true, ...atualizado });
  } catch (error) {
    console.error('Erro ao atualizar exame:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar exame
export const deleteExame = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const result = await db.run('DELETE FROM exames WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Exame não encontrado ou sem permissão' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar exame:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
