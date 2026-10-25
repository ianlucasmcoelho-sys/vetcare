// backend/src/controllers/agendamentoController.js
import { openDb, runTransaction } from '../db.js';

// Buscar todos os agendamentos da clínica com informações do animal
export const getAllAgendamentos = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const agendamentos = await db.all(`
      SELECT 
        a.*,
        an.nome as animal_nome,
        an.especie as animal_especie,
        an.raca as animal_raca,
        r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.clinica_id = ?
      ORDER BY a.data ASC, a.horario ASC
    `, [clinica_id]);
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar agendamento por ID na clínica
export const getAgendamentoById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamento = await db.get(`
      SELECT 
        a.*,
        an.nome as animal_nome,
        an.especie as animal_especie,
        r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.id = ? AND a.clinica_id = ?
    `, [id, clinica_id]);
    
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json(agendamento);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar agendamentos por data na clínica
export const getAgendamentosByData = async (req, res) => {
  try {
    const { data } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamentos = await db.all(`
      SELECT 
        a.*,
        an.nome as animal_nome,
        an.especie as animal_especie,
        r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.data = ? AND a.clinica_id = ?
      ORDER BY a.horario ASC
    `, [data, clinica_id]);
    
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos por data:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar agendamentos por período na clínica
export const getAgendamentosByPeriodo = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamentos = await db.all(`
      SELECT 
        a.*,
        an.nome as animal_nome,
        an.especie as animal_especie,
        r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.clinica_id = ? AND a.data BETWEEN ? AND ?
      ORDER BY a.data ASC, a.horario ASC
    `, [clinica_id, dataInicio, dataFim]);
    
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos por período:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar agendamentos por animal na clínica
export const getAgendamentosByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamentos = await db.all(`
      SELECT 
        a.*,
        an.nome as animal_nome,
        r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.animal_id = ? AND a.clinica_id = ?
      ORDER BY a.data DESC, a.horario DESC
    `, [animalId, clinica_id]);
    
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos do animal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar agendamentos por status na clínica
export const getAgendamentosByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamentos = await db.all(`
      SELECT 
        a.*,
        an.nome as animal_nome,
        r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.status = ? AND a.clinica_id = ?
      ORDER BY a.data ASC, a.horario ASC
    `, [status, clinica_id]);
    
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos por status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo agendamento com transação e proteção SaaS
export const createAgendamento = async (req, res) => {
  try {
    const {
      animal_id,
      data,
      horario,
      tipo_servico,
      status,
      domiciliar,
      observacoes
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!animal_id || !data || !horario) {
      return res.status(400).json({ error: 'Campos obrigatórios: animal_id, data e horario' });
    }

    const result = await runTransaction(async (db) => {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) throw new Error('Animal não encontrado ou sem permissão para esta clínica');

      const conflito = await db.get(`
        SELECT id FROM agendamentos 
        WHERE data = ? AND horario = ? AND clinica_id = ? AND status NOT IN ('Cancelado', 'Concluído')
      `, [data, horario, clinica_id]);
      
      if (conflito) throw new Error('Horário já ocupado nesta clínica');

      const insResult = await db.run(
        `INSERT INTO agendamentos (
          clinica_id, animal_id, data, horario, tipo_servico, status, domiciliar, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [clinica_id, animal_id, data, horario, tipo_servico || 'Consulta', status || 'Agendado', domiciliar ? 1 : 0, observacoes || null]
      );
      
      return insResult.lastID;
    });

    const db = await openDb();
    const novoAgendamento = await db.get(`
      SELECT a.*, an.nome as animal_nome, r.nome as tutor_nome, r.celular as tutor_celular
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.id = ? AND a.clinica_id = ?
    `, [result, clinica_id]);

    res.status(201).json({ success: true, ...novoAgendamento });
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error.message);
    res.status(error.message.includes('não encontrado') ? 404 : (error.message.includes('ocupado') ? 409 : 500))
       .json({ error: error.message });
  }
};

// Atualizar agendamento
export const updateAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { animal_id, data, horario, tipo_servico, status, domiciliar, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    await runTransaction(async (db) => {
      const existe = await db.get('SELECT id FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (!existe) throw new Error('Agendamento não encontrado');

      if (animal_id) {
        const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
        if (!animal) throw new Error('Animal não permitido');
      }

      if (data && horario) {
        const conflito = await db.get(`
          SELECT id FROM agendamentos WHERE data = ? AND horario = ? AND clinica_id = ? AND id != ? AND status NOT IN ('Cancelado', 'Concluído')
        `, [data, horario, clinica_id, id]);
        if (conflito) throw new Error('Horário ocupado');
      }

      await db.run(
        `UPDATE agendamentos SET
          animal_id = COALESCE(?, animal_id),
          data = COALESCE(?, data),
          horario = COALESCE(?, horario),
          tipo_servico = COALESCE(?, tipo_servico),
          status = COALESCE(?, status),
          domiciliar = COALESCE(?, domiciliar),
          observacoes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND clinica_id = ?`,
        [animal_id, data, horario, tipo_servico, status, domiciliar !== undefined ? (domiciliar ? 1 : 0) : null, observacoes || null, id, clinica_id]
      );
    });

    const db = await openDb();
    const atualizado = await db.get('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json({ success: true, ...atualizado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar status do agendamento
export const updateAgendamentoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const clinica_id = req.usuario.clinica_id;

    const statusValidos = ['Agendado', 'Confirmado', 'Concluído', 'Cancelado'];
    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const db = await openDb();
    const existe = await db.get('SELECT id FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await db.run(
      `UPDATE agendamentos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?`,
      [status, id, clinica_id]
    );

    const agendamentoAtualizado = await db.get('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json({ success: true, ...agendamentoAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar agendamento
export const deleteAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    
    await runTransaction(async (db) => {
      const result = await db.run('DELETE FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (result.changes === 0) throw new Error('Agendamento não encontrado');
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Agenda do dia (hoje) na clínica
export const getAgendaHoje = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamentos = await db.all(`
      SELECT 
        a.*, an.nome as animal_nome, an.especie as animal_especie, r.nome as tutor_nome, r.celular as tutor_celular
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.data = ? AND a.clinica_id = ? AND a.status NOT IN ('Cancelado', 'Concluído')
      ORDER BY a.horario ASC
    `, [hoje, clinica_id]);
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agenda do dia:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Próximos agendamentos na clínica
export const getProximosAgendamentos = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const agendamentos = await db.all(`
      SELECT 
        a.*, an.nome as animal_nome, r.nome as tutor_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE a.data >= ? AND a.clinica_id = ? AND a.status NOT IN ('Cancelado', 'Concluído')
      ORDER BY a.data ASC, a.horario ASC
      LIMIT 10
    `, [hoje, clinica_id]);
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
