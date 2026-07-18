// backend/src/controllers/financeiroController.js
import { openDb, runTransaction } from '../db.js';

export const getAllFinanceiro = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const transacoes = await db.all(`
      SELECT * FROM financeiro 
      WHERE clinica_id = ?
      ORDER BY data DESC, created_at DESC
    `, [clinica_id]);
    res.json(transacoes);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getFinanceiroById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const transacao = await db.get('SELECT * FROM financeiro WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (!transacao) {
      return res.status(404).json({ error: 'Transação não encontrada ou sem permissão' });
    }
    
    res.json(transacao);
  } catch (error) {
    console.error('Erro ao buscar transação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createFinanceiro = async (req, res) => {
  try {
    const {
      descricao,
      categoria,
      valor,
      tipo,
      data,
      metodo_pagamento,
      observacoes,
      veterinario_id
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!descricao || !categoria || valor === undefined || !tipo || !data) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: descricao, categoria, valor, tipo e data' 
      });
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico)) {
      return res.status(400).json({ error: 'O valor deve ser um número válido' });
    }

    const result = await runTransaction(async (db) => {
      const financeiroRes = await db.run(
        `INSERT INTO financeiro (
          clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes, veterinario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clinica_id,
          descricao,
          categoria,
          valorNumerico,
          tipo,
          data,
          metodo_pagamento || null,
          observacoes || null,
          veterinario_id || null
        ]
      );
      
      const novoFinanceiroId = financeiroRes.lastID;

      // Se for entrada e tiver veterinário, verificar regras de comissão
      if (tipo === 'entrada' && veterinario_id) {
        const regra = await db.get(
          'SELECT tipo_comissao, valor FROM comissoes_regras WHERE clinica_id = ? AND usuario_id = ?',
          [clinica_id, veterinario_id]
        );

        if (regra) {
          let valor_comissao = 0;
          if (regra.tipo_comissao === 'percentual') {
            valor_comissao = (valorNumerico * regra.valor) / 100;
          } else if (regra.tipo_comissao === 'fixo') {
            valor_comissao = regra.valor;
          }

          if (valor_comissao > 0) {
            await db.run(
              `INSERT INTO comissoes (clinica_id, financeiro_id, usuario_id, valor_comissao, status) 
               VALUES (?, ?, ?, ?, 'pendente')`,
              [clinica_id, novoFinanceiroId, veterinario_id, valor_comissao]
            );
          }
        }
      }

      return novoFinanceiroId;
    });

    const db = await openDb();
    const novaTransacao = await db.get('SELECT * FROM financeiro WHERE id = ?', [result]);
    res.status(201).json({ success: true, ...novaTransacao });
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateFinanceiro = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      descricao,
      categoria,
      valor,
      tipo,
      data,
      metodo_pagamento,
      observacoes
    } = req.body;

    const valorNumerico = valor !== undefined ? parseFloat(valor) : null;

    const result = await runTransaction(async (db) => {
      const existe = await db.get('SELECT id FROM financeiro WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (!existe) {
        throw new Error('Transação não encontrada ou sem permissão');
      }

      await db.run(
        `UPDATE financeiro SET
          descricao = COALESCE(?, descricao),
          categoria = COALESCE(?, categoria),
          valor = COALESCE(?, valor),
          tipo = COALESCE(?, tipo),
          data = COALESCE(?, data),
          metodo_pagamento = COALESCE(?, metodo_pagamento),
          observacoes = COALESCE(?, observacoes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND clinica_id = ?`,
        [descricao, categoria, valorNumerico, tipo, data, metodo_pagamento, observacoes, id, clinica_id]
      );
      
      return id;
    });

    const db = await openDb();
    const transacaoAtualizada = await db.get('SELECT * FROM financeiro WHERE id = ?', [result]);
    res.json({ success: true, ...transacaoAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar transação:', error.message);
    res.status(error.message.includes('não encontrada') ? 404 : 500).json({ error: error.message });
  }
};

export const deleteFinanceiro = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    
    await runTransaction(async (db) => {
      const result = await db.run('DELETE FROM financeiro WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (result.changes === 0) {
        throw new Error('Transação não encontrada ou sem permissão');
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar transação:', error.message);
    res.status(error.message.includes('não encontrada') ? 404 : 500).json({ error: error.message });
  }
};

export const getFinanceiroResumo = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const totalEntradas = await db.get(`
      SELECT COALESCE(SUM(valor), 0) as total FROM financeiro 
      WHERE tipo = 'entrada' AND clinica_id = ?
    `, [clinica_id]);
    
    const totalSaidas = await db.get(`
      SELECT COALESCE(SUM(valor), 0) as total FROM financeiro 
      WHERE tipo = 'saida' AND clinica_id = ?
    `, [clinica_id]);
    
    res.json({
      totalEntradas: totalEntradas.total,
      totalSaidas: totalSaidas.total,
      saldo: totalEntradas.total - totalSaidas.total
    });
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
