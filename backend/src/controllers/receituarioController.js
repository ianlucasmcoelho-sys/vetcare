// backend/src/controllers/receituarioController.js
import { openDb } from '../db.js';

export const getAllReceitas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const receitas = await db.all(`
      SELECT 
        r.*,
        a.nome as animal_nome,
        resp.nome as tutor_nome
      FROM receituario r
      LEFT JOIN animais a ON r.animal_id = a.id
      LEFT JOIN responsaveis resp ON r.tutor_id = resp.id
      WHERE r.clinica_id = ?
      ORDER BY r.data_emissao DESC
    `, [clinica_id]);
    res.json(receitas);
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getReceitaById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const receita = await db.get(`
      SELECT 
        r.*,
        a.nome as animal_nome,
        resp.nome as tutor_nome
      FROM receituario r
      LEFT JOIN animais a ON r.animal_id = a.id
      LEFT JOIN responsaveis resp ON r.tutor_id = resp.id
      WHERE r.id = ? AND r.clinica_id = ?
    `, [id, clinica_id]);
    
    if (!receita) {
      return res.status(404).json({ error: 'Receita não encontrada ou sem permissão' });
    }
    
    res.json(receita);
  } catch (error) {
    console.error('Erro ao buscar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getReceitasByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const receitas = await db.all(`
      SELECT 
        r.*,
        a.nome as animal_nome,
        resp.nome as tutor_nome
      FROM receituario r
      LEFT JOIN animais a ON r.animal_id = a.id
      LEFT JOIN responsaveis resp ON r.tutor_id = resp.id
      WHERE r.animal_id = ? AND r.clinica_id = ?
      ORDER BY r.data_emissao DESC
    `, [animalId, clinica_id]);
    
    res.json(receitas);
  } catch (error) {
    console.error('Erro ao buscar receitas do animal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getReceitasByTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const receitas = await db.all(`
      SELECT 
        r.*,
        a.nome as animal_nome,
        resp.nome as tutor_nome
      FROM receituario r
      LEFT JOIN animais a ON r.animal_id = a.id
      LEFT JOIN responsaveis resp ON r.tutor_id = resp.id
      WHERE r.tutor_id = ? AND r.clinica_id = ?
      ORDER BY r.data_emissao DESC
    `, [tutorId, clinica_id]);
    
    res.json(receitas);
  } catch (error) {
    console.error('Erro ao buscar receitas do tutor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getReceitasByPeriodo = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const receitas = await db.all(`
      SELECT 
        r.*,
        a.nome as animal_nome,
        resp.nome as tutor_nome
      FROM receituario r
      LEFT JOIN animais a ON r.animal_id = a.id
      LEFT JOIN responsaveis resp ON r.tutor_id = resp.id
      WHERE r.clinica_id = ? AND r.data_emissao BETWEEN ? AND ?
      ORDER BY r.data_emissao DESC
    `, [clinica_id, dataInicio, dataFim]);
    
    res.json(receitas);
  } catch (error) {
    console.error('Erro ao buscar receitas por período:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createReceita = async (req, res) => {
  try {
    const {
      animal_id,
      tutor_id,
      data_emissao,
      medicamentos,
      posologia,
      observacoes,
      validade,
      medico_responsavel,
      crmv
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!animal_id || !tutor_id || !data_emissao || !medicamentos || !posologia) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: animal_id, tutor_id, data_emissao, medicamentos e posologia' 
      });
    }

    const db = await openDb();
    
    const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado ou sem permissão' });
    }
    
    const tutor = await db.get('SELECT id FROM responsaveis WHERE id = ? AND clinica_id = ?', [tutor_id, clinica_id]);
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor não encontrado ou sem permissão' });
    }

    const result = await db.run(
      `INSERT INTO receituario (
        clinica_id, animal_id, tutor_id, data_emissao, medicamentos, 
        posologia, observacoes, validade, medico_responsavel, crmv
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinica_id,
        animal_id,
        tutor_id,
        data_emissao,
        medicamentos,
        posologia,
        observacoes || null,
        validade || null,
        medico_responsavel || null,
        crmv || null
      ]
    );

    const novaReceita = await db.get('SELECT * FROM receituario WHERE id = ?', [result.lastID]);
    
    res.status(201).json({ success: true, ...novaReceita });
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateReceita = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      animal_id,
      tutor_id,
      data_emissao,
      medicamentos,
      posologia,
      observacoes,
      validade,
      medico_responsavel,
      crmv
    } = req.body;

    const db = await openDb();
    
    const existe = await db.get('SELECT id FROM receituario WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Receita não encontrada ou sem permissão' });
    }

    await db.run(
      `UPDATE receituario SET
        animal_id = ?,
        tutor_id = ?,
        data_emissao = ?,
        medicamentos = ?,
        posologia = ?,
        observacoes = ?,
        validade = ?,
        medico_responsavel = ?,
        crmv = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?`,
      [
        animal_id,
        tutor_id,
        data_emissao,
        medicamentos,
        posologia,
        observacoes || null,
        validade || null,
        medico_responsavel || null,
        crmv || null,
        id,
        clinica_id
      ]
    );

    const receitaAtualizada = await db.get('SELECT * FROM receituario WHERE id = ?', [id]);
    res.json({ success: true, ...receitaAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteReceita = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const result = await db.run('DELETE FROM receituario WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Receita não encontrada ou sem permissão' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getReceitasStats = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const total = await db.get('SELECT COUNT(*) as total FROM receituario WHERE clinica_id = ?', [clinica_id]);
    
    const mesAtual = new Date().toISOString().slice(0, 7);
    const receitasMes = await db.get(`
      SELECT COUNT(*) as total FROM receituario 
      WHERE substr(data_emissao, 1, 7) = ? AND clinica_id = ?
    `, [mesAtual, clinica_id]);
    
    res.json({
      total: total.total,
      receitasMes: receitasMes.total
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};