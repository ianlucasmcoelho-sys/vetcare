import { saveAppointment, dayAvailability, readSchedule, saveSchedule } from '../services/appointmentSchedule.js';
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
    const result = await runTransaction(db => saveAppointment(db, req.usuario.clinica_id, req.body));
    res.status(201).json({ success: true, ...result });
  } catch (error) { res.status(error.httpStatus || 500).json({ error: error.httpStatus ? error.message : 'Não foi possível criar o agendamento.' }); }
};

export const updateAgendamento = async (req, res) => {
  try {
    const result = await runTransaction(db => saveAppointment(db, req.usuario.clinica_id, req.body, req.params.id));
    res.json({ success: true, ...result });
  } catch (error) { res.status(error.httpStatus || 500).json({ error: error.httpStatus ? error.message : 'Não foi possível atualizar o agendamento.' }); }
};

export const updateAgendamentoStatus = async (req, res) => {
  try {
    if (!req.body.status) return res.status(400).json({error:'Informe o status.'});
    const result = await runTransaction(db => saveAppointment(db, req.usuario.clinica_id, { status: req.body.status }, req.params.id));
    res.json({ success: true, ...result });
  } catch (error) { res.status(error.httpStatus || 500).json({ error: error.httpStatus ? error.message : 'Não foi possível atualizar o status.' }); }
};

export const getScheduleProfessionals = async (req, res) => {
  try { res.json(await (await openDb()).all("SELECT id, nome, perfil FROM usuarios WHERE clinica_id = ? AND ativo = 1 AND perfil IN ('admin', 'veterinario') ORDER BY nome", [req.usuario.clinica_id])); }
  catch { res.status(500).json({error:'Não foi possível consultar os profissionais.'}); }
};
export const getScheduleAvailability = async (req, res) => {
  try { res.json(await dayAvailability(await openDb(), req.usuario.clinica_id, req.query)); }
  catch(error) { res.status(error.httpStatus || 500).json({error:error.httpStatus ? error.message : 'Não foi possível consultar a disponibilidade.'}); }
};
export const getScheduleSettings = async (req, res) => {
  try { res.json(await readSchedule(await openDb(), req.usuario.clinica_id)); }
  catch { res.status(500).json({error:'Não foi possível consultar o expediente.'}); }
};
export const updateScheduleSettings = async (req, res) => {
  try { res.json(await runTransaction(db => saveSchedule(db, req.usuario.clinica_id, req.body))); }
  catch(error) { res.status(error.httpStatus || 500).json({error:error.httpStatus ? error.message : 'Não foi possível salvar o expediente.'}); }
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
