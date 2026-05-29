// backend/src/controllers/consultaController.js
import { openDb, runTransaction } from '../db.js';

export const getAllConsultas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const consultas = await db.all(`
      SELECT a.*, an.nome as animal_nome, r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.clinica_id = ?
      ORDER BY a.data DESC, a.horario DESC
    `, [clinica_id]);
    
    res.json(consultas);
  } catch (error) {
    console.error('Erro ao buscar consultas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getConsultaById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const consulta = await db.get(`
      SELECT a.*, an.nome as animal_nome, r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.id = ? AND a.clinica_id = ?
    `, [id, clinica_id]);
    
    if (!consulta) {
      return res.status(404).json({ error: 'Consulta não encontrada ou sem permissão' });
    }
    
    res.json(consulta);
  } catch (error) {
    console.error('Erro ao buscar consulta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createConsulta = async (req, res) => {
  try {
    const { animal_id, data, horario, tipo_servico, status, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!animal_id || !data || !horario) {
      return res.status(400).json({ error: 'Animal, data e horário são obrigatórios' });
    }

    const result = await runTransaction(async (db) => {
      // Validar se o animal pertence à clínica
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) throw new Error('Animal não encontrado ou sem permissão');

      const insResult = await db.run(
        `INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status, observacoes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clinica_id, animal_id, data, horario, tipo_servico || 'Consulta', status || 'Agendado', observacoes]
      );
      return insResult.lastID;
    });
    
    res.status(201).json({ success: true, id: result });
  } catch (error) {
    console.error('Erro ao criar consulta:', error.message);
    res.status(error.message.includes('permissão') ? 404 : 500).json({ error: error.message });
  }
};

export const updateConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const { animal_id, data, horario, tipo_servico, status, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    await runTransaction(async (db) => {
      const existe = await db.get('SELECT id FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (!existe) throw new Error('Consulta não encontrada ou sem permissão');

      if (animal_id) {
        const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
        if (!animal) throw new Error('Animal não permitido');
      }

      await db.run(
        `UPDATE agendamentos SET 
          animal_id = COALESCE(?, animal_id), 
          data = COALESCE(?, data), 
          horario = COALESCE(?, horario), 
          tipo_servico = COALESCE(?, tipo_servico), 
          status = COALESCE(?, status), 
          observacoes = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND clinica_id = ?`,
        [animal_id, data, horario, tipo_servico, status, observacoes, id, clinica_id]
      );
    });
    
    res.json({ success: true, message: 'Consulta atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar consulta:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const deleteConsulta = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    
    await runTransaction(async (db) => {
      const result = await db.run('DELETE FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (result.changes === 0) throw new Error('Consulta não encontrada ou sem permissão');
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar consulta:', error.message);
    res.status(500).json({ error: error.message });
  }
};
