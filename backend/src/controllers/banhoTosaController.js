import { randomBytes } from 'node:crypto';
import { openDb, runTransaction } from '../db.js';

export const BANHO_TOSA_ETAPAS = ['Agendado', 'Chegou', 'Banho', 'Tosa', 'Secagem', 'Finalizado', 'Indo até você'];

const publicUrl = (req, token) => {
  const base = new URL(process.env.FRONTEND_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`);
  return new URL(`/acompanhar-banho-tosa/${token}`, base.origin).href;
};

const mensagemAcompanhamento = (tutor, pet, link) => [
  `Ol\u00e1, ${tutor || 'tutor(a)'}! \uD83D\uDC3E`,
  '',
  `${pet} chegou ao nosso espa\u00e7o de banho e tosa. J\u00e1 come\u00e7amos o atendimento com todo o carinho!`,
  '',
  'Acompanhe cada etapa por este link:',
  link
].join('\n');

const getRegistro = async (db, id, clinicaId) => db.get(`
  SELECT b.*, an.nome AS animal_nome, r.nome AS tutor_nome, r.telefone AS tutor_telefone, r.celular AS tutor_celular
  FROM banho_tosa b
  LEFT JOIN animais an ON b.animal_id = an.id
  LEFT JOIN responsaveis r ON an.responsavel_id = r.id
  WHERE b.id = ? AND b.clinica_id = ?
`, [id, clinicaId]);

export const getPublicBanhoTosa = async (req, res) => {
  try {
    const db = await openDb();
    const row = await db.get(`
      SELECT an.nome AS animal_nome, b.data, b.horario, b.status, b.servicos
      FROM banho_tosa b JOIN animais an ON an.id = b.animal_id
      WHERE b.token_acompanhamento = ?
    `, [req.params.token]);
    if (!row) return res.status(404).json({ error: 'Acompanhamento não encontrado' });
    res.set('Cache-Control', 'no-store');
    res.json(row);
  } catch (error) {
    console.error('Erro ao consultar acompanhamento público:', error);
    res.status(500).json({ error: 'Não foi possível consultar o acompanhamento' });
  }
};

export const getAllBanhoTosa = async (req, res) => {
  try {
    const db = await openDb();
    const clinicaId = req.usuario.clinica_id;
    const { data, mostrar_encerrados } = req.query;
    let query = `SELECT b.*, an.nome AS animal_nome, an.especie AS animal_especie,
      r.nome AS tutor_nome, r.telefone AS tutor_telefone, r.celular AS tutor_celular
      FROM banho_tosa b LEFT JOIN animais an ON b.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id WHERE b.clinica_id = ?`;
    const params = [clinicaId];
    if (mostrar_encerrados !== '1') query += ' AND COALESCE(b.arquivado, 0) = 0';
    if (data) { query += ' AND b.data = ?'; params.push(data); }
    else {
      query += mostrar_encerrados === '1'
        ? ' AND (b.data >= ? OR COALESCE(b.arquivado, 0) = 1)'
        : ' AND b.data >= ?';
      params.push(new Date().toISOString().slice(0, 10));
    }
    query += ' ORDER BY b.data ASC, b.horario ASC';
    res.json(await db.all(query, params));
  } catch (error) {
    console.error('Erro ao buscar registros de Banho & Tosa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createBanhoTosa = async (req, res) => {
  try {
    const { animal_id, data, horario, pacote_mensal, status, observacoes, servicos } = req.body;
    const clinicaId = req.usuario.clinica_id;
    if (!animal_id || !data || !horario) return res.status(400).json({ error: 'Informe pet, data e horário.' });
    const initialStatus = status || 'Agendado';
    if (!BANHO_TOSA_ETAPAS.includes(initialStatus)) return res.status(400).json({ error: 'Etapa inválida.' });
    const token = randomBytes(24).toString('hex');
    const result = await runTransaction(async (db) => {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinicaId]);
      if (!animal) throw new Error('Animal não encontrado');
      const inserted = await db.run(`INSERT INTO banho_tosa
        (clinica_id, animal_id, data, horario, pacote_mensal, status, observacoes, token_acompanhamento, servicos, chegada_notificada)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clinicaId, animal_id, data, horario, pacote_mensal ? 1 : 0, initialStatus, observacoes || null, token,
        Array.isArray(servicos) ? servicos.join(', ') : (servicos || null), 0]);
      return inserted.lastID;
    });
    const db = await openDb();
    const registro = await getRegistro(db, result, clinicaId);
    res.status(201).json({ success: true, ...registro, link_acompanhamento: publicUrl(req, token) });
  } catch (error) {
    res.status(error.message === 'Animal não encontrado' ? 404 : 500).json({ error: error.message });
  }
};

export const updateBanhoTosa = async (req, res) => {
  try {
    const { id } = req.params;
    const { animal_id, data, horario, pacote_mensal, observacoes, servicos } = req.body;
    const clinicaId = req.usuario.clinica_id;
    if (!animal_id || !data || !horario) return res.status(400).json({ error: 'Informe pet, data e horário.' });
    const db = await openDb();
    const existing = await getRegistro(db, id, clinicaId);
    if (!existing) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinicaId]);
    if (!animal) return res.status(404).json({ error: 'Animal não encontrado.' });
    await db.run(`UPDATE banho_tosa SET animal_id = ?, data = ?, horario = ?, pacote_mensal = ?, observacoes = ?, servicos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?`,
      [animal_id, data, horario, pacote_mensal ? 1 : 0, observacoes || null,
        Array.isArray(servicos) ? servicos.join(', ') : (servicos || null), id, clinicaId]);
    const updated = await getRegistro(db, id, clinicaId);
    res.json({ success: true, ...updated, link_acompanhamento: publicUrl(req, updated.token_acompanhamento) });
  } catch (error) {
    console.error('Erro ao atualizar agendamento de banho e tosa:', error);
    res.status(500).json({ error: 'Não foi possível atualizar o agendamento.' });
  }
};

export const updateBanhoTosaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const clinicaId = req.usuario.clinica_id;
    if (!BANHO_TOSA_ETAPAS.includes(status)) return res.status(400).json({ error: 'Etapa inválida.' });
    const db = await openDb();
    const existing = await getRegistro(db, id, clinicaId);
    if (!existing) return res.status(404).json({ error: 'Registro não encontrado' });
    await db.run('UPDATE banho_tosa SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?', [status, id, clinicaId]);
    const updated = await getRegistro(db, id, clinicaId);
    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const enviarLinkBanhoTosa = async (req, res) => {
  try {
    const clinicaId = req.usuario.clinica_id;
    const db = await openDb();
    const registro = await getRegistro(db, req.params.id, clinicaId);
    if (!registro) return res.status(404).json({ error: 'Agendamento nao encontrado.' });

    let token = registro.token_acompanhamento;
    if (!token) {
      const candidate = randomBytes(24).toString('hex');
      await db.run("UPDATE banho_tosa SET token_acompanhamento = ? WHERE id = ? AND clinica_id = ? AND (token_acompanhamento IS NULL OR token_acompanhamento = '')", [candidate, registro.id, clinicaId]);
      const saved = await db.get('SELECT token_acompanhamento FROM banho_tosa WHERE id = ? AND clinica_id = ?', [registro.id, clinicaId]);
      token = saved?.token_acompanhamento || null;
    }
    if (!token) throw new Error('Nao foi possivel gerar um link de acompanhamento.');
    const telefone = registro.tutor_celular || registro.tutor_telefone || null;
    const link = publicUrl(req, token);
    const mensagem = mensagemAcompanhamento(registro.tutor_nome, registro.animal_nome, link);
    res.json({ success: true, telefone, mensagem, link, message: 'Mensagem pronta para abrir no WhatsApp Web.' });
  } catch (error) {
    console.error('Erro ao preparar link de acompanhamento para WhatsApp:', error);
    res.status(500).json({ error: 'Nao foi possivel preparar a mensagem.' });
  }
};

export const setBanhoTosaArquivado = async (req, res) => {
  try {
    if (typeof req.body.arquivado !== 'boolean') {
      return res.status(400).json({ error: 'Informe se o agendamento deve ficar arquivado.' });
    }
    const db = await openDb();
    const arquivado = req.body.arquivado ? 1 : 0;
    const result = await db.run(
      'UPDATE banho_tosa SET arquivado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?',
      [arquivado, req.params.id, req.usuario.clinica_id]
    );
    if (!result.changes) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    res.json({ success: true, arquivado: Boolean(arquivado) });
  } catch (error) {
    console.error('Erro ao arquivar agendamento de banho e tosa:', error);
    res.status(500).json({ error: 'Não foi possível atualizar o arquivamento.' });
  }
};

export const deleteBanhoTosa = async (req, res) => {
  try {
    const db = await openDb();
    const result = await db.run('DELETE FROM banho_tosa WHERE id = ? AND clinica_id = ?', [req.params.id, req.usuario.clinica_id]);
    if (!result.changes) return res.status(404).json({ error: 'Registro não encontrado' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
