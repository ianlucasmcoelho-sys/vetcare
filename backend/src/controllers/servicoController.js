// backend/src/controllers/servicoController.js
import { openDb } from '../db.js';

// Buscar todos os itens da clínica
export const getAllServicos = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const servicos = await db.all(`
      SELECT * FROM servicos 
      WHERE clinica_id = ?
      ORDER BY nome ASC
    `, [clinica_id]);
    res.json(servicos);
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar item por ID na clínica
export const getServicoById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const servico = await db.get('SELECT * FROM servicos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (!servico) {
      return res.status(404).json({ error: 'Item não encontrado ou sem permissão' });
    }
    
    res.json(servico);
  } catch (error) {
    console.error('Erro ao buscar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar itens por categoria na clínica
export const getServicosByCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const servicos = await db.all(`
      SELECT * FROM servicos 
      WHERE categoria = ? AND clinica_id = ?
      ORDER BY nome ASC
    `, [categoria, clinica_id]);
    
    res.json(servicos);
  } catch (error) {
    console.error('Erro ao buscar itens por categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar itens com estoque baixo na clínica (quantidade <= 5)
export const getServicosBaixoEstoque = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const servicos = await db.all(`
      SELECT * FROM servicos 
      WHERE quantidade <= 5 AND clinica_id = ?
      ORDER BY quantidade ASC
    `, [clinica_id]);
    
    res.json(servicos);
  } catch (error) {
    console.error('Erro ao buscar itens com estoque baixo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar itens expirados na clínica
export const getServicosExpirados = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const servicos = await db.all(`
      SELECT * FROM servicos 
      WHERE dataExpiracao IS NOT NULL 
      AND dataExpiracao < ? AND clinica_id = ?
      ORDER BY dataExpiracao ASC
    `, [hoje, clinica_id]);
    
    res.json(servicos);
  } catch (error) {
    console.error('Erro ao buscar itens expirados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo item vinculado à clínica
export const createServico = async (req, res) => {
  try {
    const {
      nome,
      categoria,
      quantidade,
      unidade,
      precoVenda,
      precoCusto,
      margemLucro,
      lote,
      fabricante,
      estoqueMinimo,
      fornecedor,
      dataExpiracao,
      codigoBarras,
      observacoes
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    // Validação de campos obrigatórios (quantidade pode ser 0)
    if (!nome || !categoria || quantidade === undefined || !unidade || precoVenda === undefined) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome, categoria, quantidade, unidade e precoVenda' 
      });
    }

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO servicos (
        clinica_id, nome, categoria, quantidade, unidade, 
        precoVenda, precoCusto, margemLucro, lote, fabricante, 
        estoqueMinimo, fornecedor, dataExpiracao, codigoBarras, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinica_id,
        nome,
        categoria,
        parseInt(quantidade) || 0,
        unidade,
        String(precoVenda),
        precoCusto ? String(precoCusto) : null,
        margemLucro ? String(margemLucro) : null,
        lote || null,
        fabricante || null,
        parseInt(estoqueMinimo) || 5,
        fornecedor || null,
        dataExpiracao || null,
        codigoBarras || null,
        observacoes || null
      ]
    );

    const novoServico = await db.get('SELECT * FROM servicos WHERE id = ? AND clinica_id = ?', [result.lastID, clinica_id]);
    
    res.status(201).json({ success: true, ...novoServico });
  } catch (error) {
    console.error('Erro ao criar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar item na clínica
export const updateServico = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      nome,
      categoria,
      quantidade,
      unidade,
      precoVenda,
      precoCusto,
      margemLucro,
      lote,
      fabricante,
      estoqueMinimo,
      fornecedor,
      dataExpiracao,
      codigoBarras,
      observacoes
    } = req.body;

    const db = await openDb();
    
    // Verificar se o item existe na clínica
    const existe = await db.get('SELECT id FROM servicos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) {
      return res.status(404).json({ error: 'Item não encontrado ou sem permissão' });
    }

    await db.run(
      `UPDATE servicos SET
        nome = COALESCE(?, nome),
        categoria = COALESCE(?, categoria),
        quantidade = COALESCE(?, quantidade),
        unidade = COALESCE(?, unidade),
        precoVenda = COALESCE(?, precoVenda),
        precoCusto = ?,
        margemLucro = ?,
        lote = ?,
        fabricante = ?,
        estoqueMinimo = COALESCE(?, estoqueMinimo),
        fornecedor = ?,
        dataExpiracao = ?,
        codigoBarras = ?,
        observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?`,
      [
        nome,
        categoria,
        quantidade !== undefined ? parseInt(quantidade) : null,
        unidade,
        precoVenda,
        precoCusto ? String(precoCusto) : null,
        margemLucro ? String(margemLucro) : null,
        lote || null,
        fabricante || null,
        estoqueMinimo !== undefined ? parseInt(estoqueMinimo) : null,
        fornecedor || null,
        dataExpiracao || null,
        codigoBarras || null,
        observacoes || null,
        id,
        clinica_id
      ]
    );

    const servicoAtualizado = await db.get('SELECT * FROM servicos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json({ success: true, ...servicoAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar item na clínica
export const deleteServico = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const result = await db.run('DELETE FROM servicos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item não encontrado ou sem permissão' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Estatísticas do estoque da clínica
export const getServicosStats = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const hoje = new Date().toISOString().split('T')[0];
    
    const total = await db.get('SELECT COUNT(*) as total FROM servicos WHERE clinica_id = ?', [clinica_id]);
    const baixoEstoque = await db.get('SELECT COUNT(*) as total FROM servicos WHERE quantidade <= 5 AND clinica_id = ?', [clinica_id]);
    const expirados = await db.get(`
      SELECT COUNT(*) as total FROM servicos 
      WHERE dataExpiracao IS NOT NULL AND dataExpiracao < ? AND clinica_id = ?
    `, [hoje, clinica_id]);
    
    const valorTotal = await db.get(`
      SELECT SUM(CAST(REPLACE(precoVenda, ",", ".") AS REAL) * quantidade) as total 
      FROM servicos WHERE clinica_id = ?
    `, [clinica_id]);
    
    res.json({
      total: total.total,
      baixoEstoque: baixoEstoque.total,
      expirados: expirados.total,
      valorTotalEstoque: valorTotal.total || 0
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
