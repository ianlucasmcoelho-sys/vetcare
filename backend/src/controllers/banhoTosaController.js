import { randomBytes } from 'node:crypto';
import { openDb, runTransaction } from '../db.js';
import { enviarWhatsApp } from '../services/whatsappService.js';
import { getStatus as getWhatsAppStatus } from '../services/whatsappManager.js';

export const BANHO_TOSA_ETAPAS = ['Agendado', 'Chegou', 'Banho', 'Tosa', 'Secagem', 'Finalizado', 'Indo até você'];

const publicUrl = (req, token) => {
  const base = new URL(process.env.FRONTEND_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`);
  return new URL(`/acompanhar-banho-tosa/${token}`, base.origin).href;
};

const mensagemAcompanhamento = (tutor, pet, link) => [
  `Olá, ${tutor || 'tutor(a)'}! 🐾`,
  '',
  `${pet} chegou ao nosso espaço de banho e tosa. Já começamos o atendimento com todo o carinho!`,
  '',
  'Acompanhe cada etapa por este link:',
  link
].join('\n');

const notifyTutor = async (registro, req, token) => {
  const telefone = registro.tutor_celular || registro.tutor_telefone;
  if (!telefone) return;
  const trackingUrl = publicUrl(req, token);
  const mensagem = [`Olá, ${registro.tutor_nome || 'tutor(a)'}! 🐾`, '', `${registro.animal_nome} chegou ao banho e tosa e o atendimento já começou com todo o carinho.`, '', 'Acompanhe as próximas etapas por este link:', trackingUrl].join('\n');
  try {
    await enviarWhatsApp(telefone, mensagem, registro.clinica_id);
  } catch (error) {
    console.warn('Não foi possível enviar atualização do banho e tosa pelo WhatsApp:', error.message);
  }
};

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
        Array.isArray(servicos) ? servicos.join(', ') : (servicos || null), initialStatus === 'Chegou' ? 1 : 0]);
      return inserted.lastID;
    });
    const db = await openDb();
    const registro = await getRegistro(db, result, clinicaId);
    if (initialStatus === 'Chegou') await notifyTutor(registro, req, token);
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
    if (existing.status !== status && status === 'Chegou') {
      const notificacaoReivindicada = await db.run(
        'UPDATE banho_tosa SET chegada_notificada = 1 WHERE id = ? AND clinica_id = ? AND chegada_notificada = 0',
        [id, clinicaId]
      );
      if (notificacaoReivindicada.changes > 0) {
        await notifyTutor(updated, req, updated.token_acompanhamento);
      }
    }
    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const enviarLinkBanhoTosa = async (req, res) => {
  try {
    const clinicaId = req.usuario.clinica_id;
    const whatsapp = getWhatsAppStatus(clinicaId);
    if (whatsapp.status !== 'CONECTADO') {
      const sincronizando = ['AUTENTICADO', 'SINCRONIZANDO'].includes(whatsapp.status);
      return res.status(409).json({
        error: sincronizando
          ? 'O WhatsApp reconheceu a sessão e está sincronizando. Aguarde o status “Conectado” antes de enviar.'
          : 'O WhatsApp ainda não está conectado. Conecte-o nas configurações e tente novamente.'
      });
    }
    const db = await openDb();
    const registro = await getRegistro(db, req.params.id, clinicaId);
    if (!registro) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const telefone = registro.tutor_celular || registro.tutor_telefone;
    if (!telefone) return res.status(400).json({ error: 'O tutor deste pet não tem telefone cadastrado.' });

    const token = registro.token_acompanhamento || randomBytes(24).toString('hex');
    if (!registro.token_acompanhamento) {
      await db.run('UPDATE banho_tosa SET token_acompanhamento = ? WHERE id = ? AND clinica_id = ?', [token, registro.id, registro.clinica_id]);
    }
    const link = publicUrl(req, token);
    const mensagem = mensagemAcompanhamento(registro.tutor_nome, registro.animal_nome, link);
    const enviado = await enviarWhatsApp(telefone, mensagem, registro.clinica_id, { manual: true });
    if (!enviado) {
      return res.status(503).json({ error: 'Não foi possível enviar. Confira se o WhatsApp da clínica está conectado nas configurações.' });
    }
    res.json({ success: true, message: `Mensagem enviada para ${registro.tutor_nome || 'o tutor'} pelo WhatsApp.`, link });
  } catch (error) {
    console.error('Erro ao enviar link de acompanhamento pelo WhatsApp:', error);
    res.status(500).json({ error: 'Não foi possível enviar a mensagem pelo WhatsApp.' });
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
