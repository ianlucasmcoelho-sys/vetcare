import { openDb } from '../db.js';

export const getRegras = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const regras = await db.all(`
      SELECT cr.id, cr.usuario_id, cr.tipo_comissao, cr.valor, u.nome as usuario_nome, u.perfil
      FROM comissoes_regras cr
      JOIN usuarios u ON cr.usuario_id = u.id
      WHERE cr.clinica_id = ?
    `, [clinica_id]);
    
    res.json(regras);
  } catch (error) {
    console.error('Erro ao buscar regras de comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const upsertRegra = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const { usuario_id, tipo_comissao, valor } = req.body;
    
    if (!usuario_id || !tipo_comissao || valor === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: usuario_id, tipo_comissao, valor' });
    }
    
    const db = await openDb();
    
    const regraExistente = await db.get(
      'SELECT id FROM comissoes_regras WHERE clinica_id = ? AND usuario_id = ?',
      [clinica_id, usuario_id]
    );
    
    if (regraExistente) {
      await db.run(
        'UPDATE comissoes_regras SET tipo_comissao = ?, valor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [tipo_comissao, valor, regraExistente.id]
      );
    } else {
      await db.run(
        'INSERT INTO comissoes_regras (clinica_id, usuario_id, tipo_comissao, valor) VALUES (?, ?, ?, ?)',
        [clinica_id, usuario_id, tipo_comissao, valor]
      );
    }
    
    res.json({ success: true, message: 'Regra de comissão salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar regra de comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getComissoes = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const comissoes = await db.all(`
      SELECT c.*, u.nome as veterinario_nome, f.descricao as servico_descricao, f.data as data_venda
      FROM comissoes c
      JOIN usuarios u ON c.usuario_id = u.id
      JOIN financeiro f ON c.financeiro_id = f.id
      WHERE c.clinica_id = ?
      ORDER BY c.status ASC, c.created_at DESC
    `, [clinica_id]);
    
    res.json(comissoes);
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const pagarComissoes = async (req, res) => {
  try {
    const clinica_id = req.usuario.clinica_id;
    const { comissao_ids, gerar_saida } = req.body;
    
    if (!comissao_ids || !Array.isArray(comissao_ids) || comissao_ids.length === 0) {
      return res.status(400).json({ error: 'Nenhuma comissão selecionada.' });
    }
    
    const db = await openDb();
    const dataPagamento = new Date().toISOString();
    
    await db.exec('BEGIN TRANSACTION');
    
    try {
      const placeholders = comissao_ids.map(() => '?').join(',');
      await db.run(`
        UPDATE comissoes 
        SET status = 'pago', data_pagamento = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE clinica_id = ? AND id IN (${placeholders})
      `, [dataPagamento, clinica_id, ...comissao_ids]);
      
      if (gerar_saida) {
        const result = await db.get(`
          SELECT SUM(valor_comissao) as total_pago 
          FROM comissoes 
          WHERE clinica_id = ? AND id IN (${placeholders})
        `, [clinica_id, ...comissao_ids]);
        
        const valorTotal = result.total_pago || 0;
        
        if (valorTotal > 0) {
          await db.run(
            `INSERT INTO financeiro (
              clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              clinica_id,
              'Pagamento de Comissões',
              'Comissões',
              valorTotal,
              'saida',
              dataPagamento,
              'Transferência',
              `Fechamento de comissões (IDs: ${comissao_ids.join(', ')})`
            ]
          );
        }
      }
      
      await db.exec('COMMIT');
      res.json({ success: true, message: 'Comissões pagas com sucesso.' });
    } catch (txError) {
      await db.exec('ROLLBACK');
      throw txError;
    }
    
  } catch (error) {
    console.error('Erro ao pagar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
