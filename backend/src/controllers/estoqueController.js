import { openDb, runTransaction } from '../db.js';

// Registrar movimentação e atualizar saldo
export const registrarMovimentacao = async (req, res) => {
  try {
    const { produto_id, tipo, quantidade, motivo } = req.body;
    const clinica_id = req.usuario.clinica_id;
    const usuario_id = req.usuario.id;

    if (!produto_id || !tipo || !quantidade) {
      return res.status(400).json({ error: 'Campos obrigatórios: produto_id, tipo e quantidade' });
    }

    await runTransaction(async (db) => {
      // 1. Verificar se o produto pertence à clínica
      const produto = await db.get('SELECT id, quantidade FROM servicos WHERE id = ? AND clinica_id = ?', [produto_id, clinica_id]);
      if (!produto) throw new Error('Produto não encontrado ou sem permissão');

      // 2. Calcular novo saldo
      const novaQtde = tipo === 'entrada' 
        ? produto.quantidade + parseInt(quantidade)
        : produto.quantidade - parseInt(quantidade);

      if (novaQtde < 0) throw new Error('Saldo insuficiente em estoque');

      // 3. Atualizar saldo no produto
      await db.run('UPDATE servicos SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [novaQtde, produto_id]);

      // 4. Registrar log de movimentação
      await db.run(`
        INSERT INTO estoque_movimentacoes (clinica_id, produto_id, tipo, quantidade, motivo, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [clinica_id, produto_id, tipo, quantidade, motivo, usuario_id]);
    });

    res.json({ success: true, message: 'Movimentação registrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar histórico de movimentações da clínica
export const getHistoricoMovimentacoes = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const historico = await db.all(`
      SELECT 
        m.*, 
        s.nome as produto_nome, 
        u.nome as usuario_nome
      FROM estoque_movimentacoes m
      JOIN servicos s ON m.produto_id = s.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.clinica_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100
    `, [clinica_id]);
    res.json(historico);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};
