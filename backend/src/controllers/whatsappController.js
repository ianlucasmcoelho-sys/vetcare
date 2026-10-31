import { openDb } from '../db.js';

export const getConfiguracao = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    let config = await db.get(`SELECT * FROM configuracoes_whatsapp WHERE clinica_id = ?`, [clinica_id]);
    
    if (!config) {
      await db.run(
        `INSERT INTO configuracoes_whatsapp (clinica_id, ativo, lembrete_consulta, lembrete_vacina, lembrete_aniversario, mensagem_consulta, mensagem_vacina, mensagem_aniversario) 
         VALUES (?, 0, 1, 1, 1, 'Olá! Lembrete da sua consulta agendada.', 'Olá! Lembrete de vacina do seu pet.', 'Feliz Aniversário!')`,
        [clinica_id]
      );
      config = await db.get(`SELECT * FROM configuracoes_whatsapp WHERE clinica_id = ?`, [clinica_id]);
    }
    
    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configuração do WhatsApp:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateConfiguracao = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const { 
      ativo, api_url, instancia, token, 
      lembrete_consulta, lembrete_vacina, lembrete_aniversario, 
      mensagem_consulta, mensagem_vacina, mensagem_aniversario 
    } = req.body;
    
    await db.run(`
      UPDATE configuracoes_whatsapp 
      SET ativo = ?, api_url = ?, instancia = ?, token = ?, 
          lembrete_consulta = ?, lembrete_vacina = ?, lembrete_aniversario = ?,
          mensagem_consulta = ?, mensagem_vacina = ?, mensagem_aniversario = ?
      WHERE clinica_id = ?
    `, [
      ativo, api_url, instancia, token, 
      lembrete_consulta, lembrete_vacina, lembrete_aniversario,
      mensagem_consulta, mensagem_vacina, mensagem_aniversario,
      clinica_id
    ]);
    
    res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar configuração do WhatsApp:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

import { getStatus, disconnect, gerarNovoQr } from '../services/whatsappManager.js';

export const getStatusQr = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const status = getStatus(clinica_id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
};

export const desconectarWhatsApp = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const success = await disconnect(clinica_id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
};

export const gerarNovoQrWhatsApp = async (req, res) => {
  try {
    const iniciado = await gerarNovoQr(req.usuario.clinica_id);
    if (!iniciado) return res.status(409).json({ error: 'Já existe uma solicitação de QR Code em andamento.' });
    res.status(202).json({ success: true, status: 'INICIANDO', message: 'Solicitamos um novo QR Code.' });
  } catch (error) {
    console.error('Erro ao gerar novo QR Code do WhatsApp:', error);
    res.status(500).json({ error: 'Não foi possível gerar outro QR Code.' });
  }
};
