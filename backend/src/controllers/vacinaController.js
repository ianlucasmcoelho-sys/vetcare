// backend/src/controllers/vacinaController.js
import { openDb, runTransaction } from '../db.js';

// Buscar todas as vacinas da clínica com informações do animal
export const getAllVacinas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const vacinas = await db.all(`
      SELECT 
        v.*,
        a.nome as animal_nome,
        a.especie as animal_especie,
        a.raca as animal_raca,
        r.nome as tutor_nome
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE v.clinica_id = ?
      ORDER BY v.data_aplicacao DESC
    `, [clinica_id]);
    res.json(vacinas);
  } catch (error) {
    console.error('Erro ao buscar vacinas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar vacina por ID na clínica
export const getVacinaById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const vacina = await db.get(`
      SELECT 
        v.*,
        a.nome as animal_nome,
        a.especie as animal_especie
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.id = ? AND v.clinica_id = ?
    `, [id, clinica_id]);
    
    if (!vacina) {
      return res.status(404).json({ error: 'Vacina não encontrada ou sem permissão' });
    }
    
    res.json(vacina);
  } catch (error) {
    console.error('Erro ao buscar vacina:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar vacinas por animal na clínica
export const getVacinasByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const vacinas = await db.all(`
      SELECT 
        v.*,
        a.nome as animal_nome
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.animal_id = ? AND v.clinica_id = ?
      ORDER BY v.data_aplicacao DESC
    `, [animalId, clinica_id]);
    
    res.json(vacinas);
  } catch (error) {
    console.error('Erro ao buscar vacinas do animal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar vacinas por período na clínica
export const getVacinasByPeriodo = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const vacinas = await db.all(`
      SELECT 
        v.*,
        a.nome as animal_nome
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.clinica_id = ? AND v.data_aplicacao BETWEEN ? AND ?
      ORDER BY v.data_aplicacao DESC
    `, [clinica_id, dataInicio, dataFim]);
    
    res.json(vacinas);
  } catch (error) {
    console.error('Erro ao buscar vacinas por período:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar vacinas próximas do vencimento na clínica (próximos 30 dias)
export const getVacinasProximas = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const trintaDias = new Date();
    trintaDias.setDate(trintaDias.getDate() + 30);
    const dataLimite = trintaDias.toISOString().split('T')[0];
    const clinica_id = req.usuario.clinica_id;
    
    const db = await openDb();
    const vacinas = await db.all(`
      SELECT 
        v.*,
        a.nome as animal_nome,
        a.especie as animal_especie,
        r.nome as tutor_nome,
        r.celular as tutor_celular
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE v.clinica_id = ? AND v.proxima_dose BETWEEN ? AND ?
        AND v.proxima_dose IS NOT NULL
      ORDER BY v.proxima_dose ASC
    `, [clinica_id, hoje, dataLimite]);
    
    res.json(vacinas);
  } catch (error) {
    console.error('Erro ao buscar vacinas próximas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar vacinas vencidas na clínica
export const getVacinasVencidas = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const clinica_id = req.usuario.clinica_id;
    
    const db = await openDb();
    const vacinas = await db.all(`
      SELECT 
        v.*,
        a.nome as animal_nome,
        a.especie as animal_especie,
        r.nome as tutor_nome,
        r.celular as tutor_celular
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE v.clinica_id = ? AND v.proxima_dose < ?
        AND v.proxima_dose IS NOT NULL
      ORDER BY v.proxima_dose ASC
    `, [clinica_id, hoje]);
    
    res.json(vacinas);
  } catch (error) {
    console.error('Erro ao buscar vacinas vencidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar nova vacina vinculada à clínica com baixa automática de estoque
export const createVacina = async (req, res) => {
  try {
    const {
      nome_vacina,
      data_aplicacao,
      proxima_dose,
      lote,
      fabricante,
      observacoes,
      animal_id,
      servico_id // ID do item no estoque para dar baixa
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!nome_vacina || !data_aplicacao || !animal_id) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome_vacina, data_aplicacao e animal_id' 
      });
    }

    const result = await runTransaction(async (db) => {
      // 1. Verificar se o animal existe na clínica
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) throw new Error('Animal não encontrado ou sem permissão');

      // 2. Dar baixa no estoque se um servico_id foi fornecido
      if (servico_id) {
        const servico = await db.get('SELECT quantidade FROM servicos WHERE id = ? AND clinica_id = ?', [servico_id, clinica_id]);
        if (!servico) throw new Error('Item de estoque não encontrado');
        if (servico.quantidade <= 0) throw new Error('Estoque insuficiente para esta vacina');

        await db.run(
          'UPDATE servicos SET quantidade = quantidade - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?',
          [servico_id, clinica_id]
        );
      }

      // 3. Inserir o registro da vacina
      const insResult = await db.run(
        `INSERT INTO vacinas (
          clinica_id, nome_vacina, data_aplicacao, proxima_dose, 
          lote, fabricante, observacoes, animal_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clinica_id,
          nome_vacina,
          data_aplicacao,
          proxima_dose || null,
          lote || null,
          fabricante || null,
          observacoes || null,
          animal_id
        ]
      );
      
      return insResult.lastID;
    });

    const db = await openDb();
    const novaVacina = await db.get(`
      SELECT 
        v.*,
        a.nome as animal_nome,
        a.especie as animal_especie
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.id = ?
    `, [result]);
    
    res.status(201).json({ success: true, ...novaVacina });
  } catch (error) {
    console.error('❌ Erro ao criar vacina:', error.message);
    res.status(error.message.includes('não encontrado') ? 404 : 500).json({ error: error.message });
  }
};

// Atualizar vacina na clínica
export const updateVacina = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      nome_vacina,
      data_aplicacao,
      proxima_dose,
      lote,
      fabricante,
      observacoes,
      animal_id
    } = req.body;

    const db = await openDb();
    
    // Verificar se a vacina existe na clínica
    const existe = await db.get('SELECT id FROM vacinas WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Vacina não encontrada ou sem permissão' });
    }

    // Verificar se o animal existe na clínica (se foi alterado)
    if (animal_id) {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) {
        return res.status(404).json({ error: 'Animal não encontrado ou sem permissão' });
      }
    }

    await db.run(
      `UPDATE vacinas SET
        nome_vacina = COALESCE(?, nome_vacina),
        data_aplicacao = COALESCE(?, data_aplicacao),
        proxima_dose = ?,
        lote = ?,
        fabricante = ?,
        observacoes = ?,
        animal_id = COALESCE(?, animal_id)
      WHERE id = ? AND clinica_id = ?`,
      [
        nome_vacina,
        data_aplicacao,
        proxima_dose || null,
        lote || null,
        fabricante || null,
        observacoes || null,
        animal_id,
        id,
        clinica_id
      ]
    );

    const vacinaAtualizada = await db.get(`
      SELECT 
        v.*,
        a.nome as animal_nome,
        a.especie as animal_especie
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.id = ?
    `, [id]);
    
    res.json({ success: true, ...vacinaAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar vacina:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar vacina na clínica
export const deleteVacina = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const result = await db.run('DELETE FROM vacinas WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vacina não encontrada ou sem permissão' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar vacina:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Estatísticas de vacinas da clínica
export const getVacinasStats = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const total = await db.get('SELECT COUNT(*) as total FROM vacinas WHERE clinica_id = ?', [clinica_id]);
    const proximas = await db.get(`
      SELECT COUNT(*) as total FROM vacinas 
      WHERE clinica_id = ? AND proxima_dose IS NOT NULL 
      AND date(proxima_dose) >= date('now')
      AND date(proxima_dose) <= date('now', '+30 days')
    `, [clinica_id]);
    const vencidas = await db.get(`
      SELECT COUNT(*) as total FROM vacinas 
      WHERE clinica_id = ? AND proxima_dose IS NOT NULL 
      AND date(proxima_dose) < date('now')
    `, [clinica_id]);
    
    res.json({
      total: total.total,
      proximas: proximas.total,
      vencidas: vencidas.total
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
