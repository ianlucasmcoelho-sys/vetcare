// backend/src/controllers/retornoController.js
import { openDb } from '../db.js';

// Buscar todos os retornos da clínica
export const getAllRetornos = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const retornos = await db.all(`
      SELECT * FROM retornos 
      WHERE clinica_id = ?
      ORDER BY data_retorno ASC, horario ASC
    `, [clinica_id]);
    res.json(retornos);
  } catch (error) {
    console.error('Erro ao buscar retornos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar retorno por ID na clínica
export const getRetornoById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const retorno = await db.get('SELECT * FROM retornos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (!retorno) {
      return res.status(404).json({ error: 'Retorno não encontrado ou sem permissão' });
    }
    
    res.json(retorno);
  } catch (error) {
    console.error('Erro ao buscar retorno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar retornos por pet na clínica
export const getRetornosByPet = async (req, res) => {
  try {
    const { petNome } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const retornos = await db.all(`
      SELECT * FROM retornos 
      WHERE pet_nome LIKE ? AND clinica_id = ?
      ORDER BY data_retorno DESC
    `, [`%${petNome}%`, clinica_id]);
    
    res.json(retornos);
  } catch (error) {
    console.error('Erro ao buscar retornos do pet:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo retorno vinculado à clínica
export const createRetorno = async (req, res) => {
  try {
    const {
      consulta_id,
      pet_nome,
      tutor_nome,
      data_retorno,
      horario,
      motivo,
      observacoes
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    // Validação de campos obrigatórios
    if (!pet_nome || !tutor_nome || !data_retorno || !horario) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: pet_nome, tutor_nome, data_retorno e horario' 
      });
    }

    const db = await openDb();
    if (consulta_id) {
      const consulta = await db.get('SELECT id FROM agendamentos WHERE id = ? AND clinica_id = ?', [consulta_id, clinica_id]);
      if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada nesta clínica.' });
    }
    const result = await db.run(
      `INSERT INTO retornos (
        clinica_id, consulta_id, pet_nome, tutor_nome, data_retorno, 
        horario, motivo, observacoes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinica_id,
        consulta_id || null,
        pet_nome,
        tutor_nome,
        data_retorno,
        horario,
        motivo || null,
        observacoes || null,
        'Pendentes'
      ]
    );

    const novoRetorno = await db.get('SELECT * FROM retornos WHERE id = ? AND clinica_id = ?', [result.lastID, clinica_id]);
    
    res.status(201).json(novoRetorno);
  } catch (error) {
    console.error('Erro ao criar retorno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar retorno na clínica
export const updateRetorno = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      consulta_id,
      pet_nome,
      tutor_nome,
      data_retorno,
      horario,
      motivo,
      observacoes,
      status
    } = req.body;

    const db = await openDb();
    
    // Verificar se o retorno existe e pertence à clínica
    const existe = await db.get('SELECT id FROM retornos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Retorno não encontrado ou sem permissão' });
    }

    if (consulta_id) {
      const consulta = await db.get('SELECT id FROM agendamentos WHERE id = ? AND clinica_id = ?', [consulta_id, clinica_id]);
      if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada nesta clínica.' });
    }

    await db.run(
      `UPDATE retornos SET
        consulta_id = ?,
        pet_nome = ?,
        tutor_nome = ?,
        data_retorno = ?,
        horario = ?,
        motivo = ?,
        observacoes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?`,
      [
        consulta_id || null,
        pet_nome,
        tutor_nome,
        data_retorno,
        horario,
        motivo || null,
        observacoes || null,
        status || 'Pendentes',
        id,
        clinica_id
      ]
    );

    const retornoAtualizado = await db.get('SELECT * FROM retornos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json(retornoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar retorno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar status do retorno na clínica
export const updateRetornoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const { status } = req.body;

    if (!status || !['Pendentes', 'Concluídos', 'Cancelados'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const db = await openDb();
    
    const existe = await db.get('SELECT id FROM retornos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Retorno não encontrado ou sem permissão' });
    }

    await db.run(
      `UPDATE retornos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?`,
      [status, id, clinica_id]
    );

    const retornoAtualizado = await db.get('SELECT * FROM retornos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json(retornoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar status do retorno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar retorno na clínica
export const deleteRetorno = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const result = await db.run('DELETE FROM retornos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Retorno não encontrado ou sem permissão' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar retorno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar retornos por status na clínica
export const getRetornosByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const retornos = await db.all(`
      SELECT * FROM retornos 
      WHERE status = ? AND clinica_id = ?
      ORDER BY data_retorno ASC
    `, [status, clinica_id]);
    
    res.json(retornos);
  } catch (error) {
    console.error('Erro ao buscar retornos por status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar retornos por período na clínica
export const getRetornosByPeriodo = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const retornos = await db.all(`
      SELECT * FROM retornos 
      WHERE data_retorno BETWEEN ? AND ? AND clinica_id = ?
      ORDER BY data_retorno ASC
    `, [dataInicio, dataFim, clinica_id]);
    
    res.json(retornos);
  } catch (error) {
    console.error('Erro ao buscar retornos por período:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
