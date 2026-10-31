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
    const { internacao_id, medicamento, dosagem, horario_agendado } = req.body;
    const dataInicio = req.body.data_inicio || req.body.data_agendada;
    const dataFim = req.body.data_fim || dataInicio;
    const clinica_id = req.usuario.clinica_id;
    if (!internacao_id || !medicamento?.trim() || !horario_agendado || !dataInicio || !dataFim) {
      return res.status(400).json({ error: 'Informe medicamento, horário e período.' });
    }
    const inicioMs = Date.parse(`${dataInicio}T00:00:00.000Z`);
    const fimMs = Date.parse(`${dataFim}T00:00:00.000Z`);
    const dataValida = (data, timestamp) => /^\d{4}-\d{2}-\d{2}$/.test(data)
      && Number.isFinite(timestamp)
      && new Date(timestamp).toISOString().slice(0, 10) === data;
    if (!dataValida(dataInicio, inicioMs) || !dataValida(dataFim, fimMs) || fimMs < inicioMs) {
      return res.status(400).json({ error: 'Informe um período de datas válido.' });
    }
    const quantidadeDias = Math.floor((fimMs - inicioMs) / 86400000) + 1;
    if (quantidadeDias > 90) {
      return res.status(400).json({ error: 'O período de medicação pode ter no máximo 90 dias.' });
    }
    const db = await openDb();

    const internacao = await db.get('SELECT id FROM internacoes WHERE id = ? AND clinica_id = ?', [internacao_id, clinica_id]);
    if (!internacao) return res.status(404).json({ error: 'Internação não encontrada.' });

    await runTransaction(async (tx) => {
      for (let dia = 0; dia < quantidadeDias; dia += 1) {
        const dataAgendada = new Date(inicioMs + dia * 86400000).toISOString().slice(0, 10);
        await tx.run(`
          INSERT INTO internacao_medicacoes (internacao_id, medicamento, dosagem, horario_agendado, data_agendada)
          VALUES (?, ?, ?, ?, ?)
        `, [internacao_id, medicamento.trim(), dosagem || null, horario_agendado, dataAgendada]);
      }
    });

    res.status(201).json({ success: true, dias_agendados: quantidadeDias });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao agendar medicação' });
  }
};

// Corrigir uma dose sem alterar seu status ou trilha de aplicação.
export const editarMedicacao = async (req, res) => {
  try {
    const { medicamento, dosagem, horario_agendado } = req.body;
    const dataAgendada = req.body.data_agendada || req.body.data_inicio;
    const timestamp = Date.parse(`${dataAgendada}T00:00:00.000Z`);
    const clinica_id = req.usuario.clinica_id;
    if (!medicamento?.trim() || !horario_agendado || !/^\d{4}-\d{2}-\d{2}$/.test(dataAgendada || '')
      || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== dataAgendada) {
      return res.status(400).json({ error: 'Informe medicamento, dose, horário e uma data válida.' });
    }
    const db = await openDb();
    const result = await db.run(`
      UPDATE internacao_medicacoes
      SET medicamento = ?, dosagem = ?, horario_agendado = ?, data_agendada = ?
      WHERE id = ? AND internacao_id IN (SELECT id FROM internacoes WHERE clinica_id = ?)
    `, [medicamento.trim(), dosagem || null, horario_agendado, dataAgendada, req.params.id, clinica_id]);
    if (!result.changes) return res.status(404).json({ error: 'Medicação não encontrada.' });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao corrigir medicação da internação:', error);
    res.status(500).json({ error: 'Não foi possível corrigir a medicação.' });
  }
};

export const aplicarMedicacao = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const usuario_id = req.usuario.id;
    const db = await openDb();
    
    const result = await db.run(`
      UPDATE internacao_medicacoes 
      SET status = 'aplicado', aplicado_em = CURRENT_TIMESTAMP, usuario_id = ?
      WHERE id = ? AND internacao_id IN (SELECT id FROM internacoes WHERE clinica_id = ?)
    `, [usuario_id, id, clinica_id]);
    if (!result.changes) return res.status(404).json({ error: 'Medicação não encontrada.' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar aplicação' });
  }
};

// Registrar sinais vitais
export const registrarSinaisVitais = async (req, res) => {
  try {
    const { internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao } = req.body;
    const clinica_id = req.usuario.clinica_id;
    const usuario_id = req.usuario.id;
    const campos = [temperatura, frequencia_cardiaca, frequencia_respiratoria, peso];
    const valores = campos.map((valor) => valor === '' || valor === null || valor === undefined ? null : Number(valor));
    if (valores.some((valor) => valor !== null && !Number.isFinite(valor)) || (valores.every((valor) => valor === null) && !observacao?.trim())) {
      return res.status(400).json({ error: 'Informe ao menos um sinal vital ou uma observação clínica válida.' });
    }
    const db = await openDb();

    const internacao = await db.get('SELECT id FROM internacoes WHERE id = ? AND clinica_id = ?', [internacao_id, clinica_id]);
    if (!internacao) return res.status(404).json({ error: 'Internação não encontrada.' });

    await db.run(`
      INSERT INTO internacao_sinais_vitais 
      (internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [internacao_id, ...valores, observacao?.trim() || null, usuario_id]);

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar sinais vitais' });
  }
};

// Corrigir medições mantendo o horário original do registro clínico.
export const editarSinaisVitais = async (req, res) => {
  try {
    const { temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao } = req.body;
    const clinica_id = req.usuario.clinica_id;
    const campos = [temperatura, frequencia_cardiaca, frequencia_respiratoria, peso];
    const valores = campos.map((valor) => valor === '' || valor === null || valor === undefined ? null : Number(valor));
    if (valores.some((valor) => valor !== null && !Number.isFinite(valor)) || (valores.every((valor) => valor === null) && !observacao?.trim())) {
      return res.status(400).json({ error: 'Informe ao menos um sinal vital ou uma observação clínica válida.' });
    }
    const db = await openDb();
    const result = await db.run(`
      UPDATE internacao_sinais_vitais
      SET temperatura = ?, frequencia_cardiaca = ?, frequencia_respiratoria = ?, peso = ?, observacao = ?
      WHERE id = ? AND internacao_id IN (SELECT id FROM internacoes WHERE clinica_id = ?)
    `, [...valores, observacao?.trim() || null, req.params.id, clinica_id]);
    if (!result.changes) return res.status(404).json({ error: 'Registro de sinais vitais não encontrado.' });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao corrigir sinais vitais da internação:', error);
    res.status(500).json({ error: 'Não foi possível corrigir os sinais vitais.' });
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
