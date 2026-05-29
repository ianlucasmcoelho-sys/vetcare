// backend/src/controllers/configuracaoController.js
import { openDb } from '../db.js';

// Buscar configurações
export const getConfiguracoes = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    let config = await db.get('SELECT * FROM configuracoes WHERE clinica_id = ?', [clinica_id]);
    
    if (!config) {
      // Criar configuração padrão para a clínica
      await db.run(`
        INSERT INTO configuracoes (clinica_id, nome_clinica) VALUES (?, 'VetCare')
      `, [clinica_id]);
      config = await db.get('SELECT * FROM configuracoes WHERE clinica_id = ?', [clinica_id]);
    }
    
    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Salvar configurações
export const saveConfiguracoes = async (req, res) => {
  try {
    const {
      nome_clinica,
      logo,
      endereco,
      telefone,
      email,
      cnpj,
      crmv,
      assinatura_digital,
      horario_funcionamento,
      dias_funcionamento
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    const db = await openDb();
    
    await db.run(`
      UPDATE configuracoes SET
        nome_clinica = COALESCE(?, nome_clinica),
        logo = ?,
        endereco = ?,
        telefone = ?,
        email = ?,
        cnpj = ?,
        crmv = ?,
        assinatura_digital = ?,
        horario_funcionamento = ?,
        dias_funcionamento = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE clinica_id = ?
    `, [nome_clinica, logo, endereco, telefone, email, cnpj, crmv, assinatura_digital, horario_funcionamento, dias_funcionamento, clinica_id]);

    const configAtualizada = await db.get('SELECT * FROM configuracoes WHERE clinica_id = ?', [clinica_id]);
    res.json({ success: true, config: configAtualizada });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar logo
export const updateLogo = async (req, res) => {
  try {
    const { logo } = req.body;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    await db.run('UPDATE configuracoes SET logo = ?, updated_at = CURRENT_TIMESTAMP WHERE clinica_id = ?', [logo, clinica_id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar logo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};