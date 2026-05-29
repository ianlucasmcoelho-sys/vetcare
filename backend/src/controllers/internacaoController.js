import { openDb, runTransaction } from '../db.js';

// Listar todas as internações ativas da clínica
export const getInternacoesAtivas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const internacoes = await db.all(`
      SELECT 
        i.*,
        a.nome as animal_nome,
        a.especie as animal_especie,
        r.nome as tutor_nome,
        r.celular as tutor_celular
      FROM internacoes i
      LEFT JOIN animais a ON i.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE i.clinica_id = ? AND i.status = 'ativo'
      ORDER BY i.data_entrada DESC
    `, [clinica_id]);
    res.json(internacoes);
  } catch (error) {
    console.error('Erro ao buscar internações ativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar histórico de internações da clínica (ativas e encerradas)
export const getHistoricoInternacoes = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const internacoes = await db.all(`
      SELECT 
        i.*,
        a.nome as animal_nome,
        a.especie as animal_especie,
        r.nome as tutor_nome
      FROM internacoes i
      LEFT JOIN animais a ON i.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE i.clinica_id = ?
      ORDER BY i.data_entrada DESC
    `, [clinica_id]);
    res.json(internacoes);
  } catch (error) {
    console.error('Erro ao buscar histórico de internações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Detalhes de uma internação com medicações e sinais vitais
export const getInternacaoDetalhes = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    const internacao = await db.get(`
      SELECT i.*, a.nome as animal_nome, a.especie as animal_especie
      FROM internacoes i
      JOIN animais a ON i.animal_id = a.id
      WHERE i.id = ? AND i.clinica_id = ?
    `, [id, clinica_id]);

    if (!internacao) return res.status(404).json({ error: 'Internação não encontrada' });

    const medicacoes = await db.all(`
      SELECT * FROM internacao_medicacoes 
      WHERE internacao_id = ? 
      ORDER BY data_agendada ASC, horario_agendado ASC
    `, [id]);

    const sinais = await db.all(`
      SELECT * FROM internacao_sinais_vitais 
      WHERE internacao_id = ? 
      ORDER BY created_at DESC
    `, [id]);

    res.json({ ...internacao, medicacoes, sinais });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar detalhes da internação' });
  }
};

// Criar nova internação
export const createInternacao = async (req, res) => {
  try {
    const { animal_id, data_entrada, motivo, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!animal_id || !data_entrada) {
      return res.status(400).json({ error: 'Animal e data de entrada são obrigatórios' });
    }

    const db = await openDb();
    const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
    if (!animal) return res.status(404).json({ error: 'Animal não encontrado ou sem permissão' });

    const result = await db.run(
      `INSERT INTO internacoes (clinica_id, animal_id, data_entrada, motivo, observacoes, status) 
       VALUES (?, ?, ?, ?, ?, 'ativo')`,
      [clinica_id, animal_id, data_entrada, motivo, observacoes]
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar internação' });
  }
};

// Agendar medicação
export const agendarMedicacao = async (req, res) => {
  try {
    const { internacao_id, medicamento, dosagem, horario_agendado, data_agendada } = req.body;
    const db = await openDb();
    
    await db.run(`
      INSERT INTO internacao_medicacoes (internacao_id, medicamento, dosagem, horario_agendado, data_agendada)
      VALUES (?, ?, ?, ?, ?)
    `, [internacao_id, medicamento, dosagem, horario_agendado, data_agendada]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao agendar medicação' });
  }
};

// Registrar aplicação de medicação
export const aplicarMedicacao = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;
    const db = await openDb();
    
    await db.run(`
      UPDATE internacao_medicacoes 
      SET status = 'aplicado', aplicado_em = CURRENT_TIMESTAMP, usuario_id = ?
      WHERE id = ?
    `, [usuario_id, id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar aplicação' });
  }
};

// Registrar sinais vitais
export const registrarSinaisVitais = async (req, res) => {
  try {
    const { internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao } = req.body;
    const usuario_id = req.usuario.id;
    const db = await openDb();

    await db.run(`
      INSERT INTO internacao_sinais_vitais 
      (internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar sinais vitais' });
  }
};

// Dar alta ou atualizar internação
export const updateInternacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { data_saida, status, motivo, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    const db = await openDb();
    const existe = await db.get('SELECT id FROM internacoes WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) return res.status(404).json({ error: 'Internação não encontrada' });

    await db.run(
      `UPDATE internacoes SET 
        data_saida = COALESCE(?, data_saida),
        status = COALESCE(?, status),
        motivo = COALESCE(?, motivo),
        observacoes = COALESCE(?, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?`,
      [data_saida, status, motivo, observacoes, id, clinica_id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar internação' });
  }
};

// Deletar internação
export const deleteInternacao = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const result = await db.run('DELETE FROM internacoes WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar' });
  }
};
