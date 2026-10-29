// backend/src/controllers/prontuarioController.js
import { openDb } from '../db.js';

// Buscar todos os prontuários da clínica
export const getAllProntuarios = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const prontuarios = await db.all(`
      SELECT p.*, COALESCE(a.nome, p.pet_nome) AS pet_nome, COALESCE(r.nome, p.tutor_nome) AS tutor_nome
      FROM prontuarios p
      LEFT JOIN animais a ON p.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE p.clinica_id = ?
      ORDER BY p.data_visita DESC, p.created_at DESC
    `, [clinica_id]);
    res.json(prontuarios);
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar prontuário por ID na clínica
export const getProntuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const prontuario = await db.get(`
      SELECT p.*, COALESCE(a.nome, p.pet_nome) AS pet_nome, COALESCE(r.nome, p.tutor_nome) AS tutor_nome
      FROM prontuarios p
      LEFT JOIN animais a ON p.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE p.id = ? AND p.clinica_id = ?
    `, [id, clinica_id]);
    
    if (!prontuario) {
      return res.status(404).json({ error: 'Prontuário não encontrado ou sem permissão' });
    }
    
    res.json(prontuario);
  } catch (error) {
    console.error('Erro ao buscar prontuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar prontuários por pet na clínica
export const getProntuariosByPet = async (req, res) => {
  try {
    const { petNome } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const prontuarios = await db.all(`
      SELECT p.*, COALESCE(a.nome, p.pet_nome) AS pet_nome, COALESCE(r.nome, p.tutor_nome) AS tutor_nome
      FROM prontuarios p
      LEFT JOIN animais a ON p.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE a.nome LIKE ? AND p.clinica_id = ?
      ORDER BY p.data_visita DESC
    `, [`%${petNome}%`, clinica_id]);
    
    res.json(prontuarios);
  } catch (error) {
    console.error('Erro ao buscar prontuários do pet:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar prontuários por ID do animal
export const getProntuariosByAnimalId = async (req, res) => {
  try {
    const { animalId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const prontuarios = await db.all(`
      SELECT p.*, COALESCE(a.nome, p.pet_nome) AS pet_nome, COALESCE(r.nome, p.tutor_nome) AS tutor_nome
      FROM prontuarios p
      LEFT JOIN animais a ON p.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE p.animal_id = ? AND p.clinica_id = ?
      ORDER BY p.data_visita DESC
    `, [animalId, clinica_id]);
    
    res.json(prontuarios);
  } catch (error) {
    console.error('Erro ao buscar prontuários por ID do animal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo prontuário vinculado à clínica
export const createProntuario = async (req, res) => {
  try {
    const {
      animal_id,
      pet_nome,
      tutor_nome,
      veterinario,
      veterinario_id,
      data_visita,
      peso,
      temperatura,
      proxima_visita,
      sintomas,
      diagnostico,
      tratamento,
      prescricoes,
      observacoes
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    // Validação de campos obrigatórios conforme o schema (NOT NULL)
    if (!pet_nome || !tutor_nome || !data_visita) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: pet_nome, tutor_nome e data_visita' 
      });
    }

    const db = await openDb();
    if (animal_id) {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) return res.status(404).json({ error: 'Animal não encontrado nesta clínica.' });
    }
    if (veterinario_id) {
      const veterinarioDaClinica = await db.get('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?', [veterinario_id, clinica_id]);
      if (!veterinarioDaClinica) return res.status(404).json({ error: 'Veterinário não encontrado nesta clínica.' });
    }
    const result = await db.run(
      `INSERT INTO prontuarios (
        clinica_id, animal_id, pet_nome, tutor_nome, 
        veterinario, veterinario_id, data_visita,
        peso, temperatura, proxima_visita, sintomas,
        diagnostico, tratamento, prescricoes, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinica_id,
        animal_id || null,
        pet_nome,
        tutor_nome,
        veterinario || null,
        veterinario_id || null,
        data_visita,
        peso || null,
        temperatura || null,
        proxima_visita || null,
        sintomas || null,
        diagnostico || null,
        tratamento || null,
        prescricoes || null,
        observacoes || null
      ]
    );

    const novoProntuario = await db.get(`
      SELECT p.*, 
             COALESCE(a.nome, p.pet_nome) AS pet_nome, 
             COALESCE(r.nome, p.tutor_nome) AS tutor_nome
      FROM prontuarios p
      LEFT JOIN animais a ON p.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE p.id = ? AND p.clinica_id = ?
    `, [result.lastID, clinica_id]);
    
    res.status(201).json(novoProntuario);
  } catch (error) {
    console.error('Erro ao criar prontuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};

// Atualizar prontuário na clínica
export const updateProntuario = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      animal_id,
      pet_nome,
      tutor_nome,
      veterinario,
      veterinario_id,
      data_visita,
      peso,
      temperatura,
      proxima_visita,
      sintomas,
      diagnostico,
      tratamento,
      prescricoes,
      observacoes
    } = req.body;

    const db = await openDb();
    
    // Verificar se o prontuário existe na clínica
    const existe = await db.get('SELECT id FROM prontuarios WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Prontuário não encontrado ou sem permissão' });
    }

    if (animal_id) {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) return res.status(404).json({ error: 'Animal não encontrado nesta clínica.' });
    }
    if (veterinario_id) {
      const veterinarioDaClinica = await db.get('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?', [veterinario_id, clinica_id]);
      if (!veterinarioDaClinica) return res.status(404).json({ error: 'Veterinário não encontrado nesta clínica.' });
    }

    await db.run(
      `UPDATE prontuarios SET
        animal_id = ?,
        pet_nome = ?,
        tutor_nome = ?,
        veterinario = ?,
        veterinario_id = ?,
        data_visita = ?,
        peso = ?,
        temperatura = ?,
        proxima_visita = ?,
        sintomas = ?,
        diagnostico = ?,
        tratamento = ?,
        prescricoes = ?,
        observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?`,
      [
        animal_id || null,
        pet_nome,
        tutor_nome,
        veterinario || null,
        veterinario_id || null,
        data_visita,
        peso || null,
        temperatura || null,
        proxima_visita || null,
        sintomas || null,
        diagnostico || null,
        tratamento || null,
        prescricoes || null,
        observacoes || null,
        id,
        clinica_id
      ]
    );

    const prontuarioAtualizado = await db.get(`
      SELECT p.*, 
             COALESCE(a.nome, p.pet_nome) AS pet_nome, 
             COALESCE(r.nome, p.tutor_nome) AS tutor_nome
      FROM prontuarios p
      LEFT JOIN animais a ON p.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE p.id = ? AND p.clinica_id = ?
    `, [id, clinica_id]);
    res.json(prontuarioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar prontuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};

// Deletar prontuário na clínica
export const deleteProntuario = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const result = await db.run('DELETE FROM prontuarios WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prontuário não encontrado ou sem permissão' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar prontuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
