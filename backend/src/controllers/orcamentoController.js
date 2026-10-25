// backend/src/controllers/orcamentoController.js
import { openDb } from '../db.js';

// Buscar todos os orçamentos da clínica
export const getAllOrcamentos = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const orcamentos = await db.all(`
      SELECT o.*, a.nome AS pet_nome_cadastro, r.nome AS tutor_nome_cadastro
      FROM orcamentos o
      LEFT JOIN animais a ON o.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE o.clinica_id = ?
      ORDER BY o.data_emissao DESC, o.created_at DESC
    `, [clinica_id]);
    res.json(orcamentos);
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar orçamento por ID na clínica
export const getOrcamentoById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const orcamento = await db.get(`
      SELECT o.*, a.nome AS pet_nome_cadastro, r.nome AS tutor_nome_cadastro
      FROM orcamentos o
      LEFT JOIN animais a ON o.animal_id = a.id
      LEFT JOIN responsaveis r ON a.responsavel_id = r.id
      WHERE o.id = ? AND o.clinica_id = ?
    `, [id, clinica_id]);
    
    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado ou sem permissão' });
    }
    
    res.json(orcamento);
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo orçamento vinculado à clínica
export const createOrcamento = async (req, res) => {
  try {
    const {
      animal_id,
      tutor_nome,
      pet_nome,
      data_emissao,
      validade,
      status,
      observacoes,
      itens,
      total
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!tutor_nome || !pet_nome || !data_emissao || !itens || total === undefined) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: tutor_nome, pet_nome, data_emissao, itens e total' 
      });
    }

    // itens deve vir como array do frontend, vamos salvar como string JSON
    const itensString = typeof itens === 'string' ? itens : JSON.stringify(itens);

    const db = await openDb();

    if (animal_id) {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) return res.status(404).json({ error: 'Animal não encontrado nesta clínica.' });
    }
    
    const result = await db.run(
      `INSERT INTO orcamentos (
        clinica_id, animal_id, tutor_nome, pet_nome, data_emissao, 
        validade, status, observacoes, itens, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinica_id,
        animal_id || null,
        tutor_nome,
        pet_nome,
        data_emissao,
        validade || '10',
        status || 'Pendente',
        observacoes || null,
        itensString,
        total
      ]
    );

    const novoOrcamento = await db.get('SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?', [result.lastID, clinica_id]);
    
    res.status(201).json({ success: true, ...novoOrcamento });
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar orçamento da clínica
export const updateOrcamento = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const {
      animal_id,
      tutor_nome,
      pet_nome,
      data_emissao,
      validade,
      status,
      observacoes,
      itens,
      total
    } = req.body;

    const db = await openDb();
    const orcamentoExistente = await db.get(
      'SELECT id FROM orcamentos WHERE id = ? AND clinica_id = ?', 
      [id, clinica_id]
    );

    if (!orcamentoExistente) {
      return res.status(404).json({ error: 'Orçamento não encontrado ou sem permissão' });
    }

    if (animal_id) {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) return res.status(404).json({ error: 'Animal não encontrado nesta clínica.' });
    }

    const itensString = typeof itens === 'string' ? itens : JSON.stringify(itens);

    await db.run(
      `UPDATE orcamentos 
       SET animal_id = ?, tutor_nome = ?, pet_nome = ?, data_emissao = ?, 
           validade = ?, status = ?, observacoes = ?, itens = ?, total = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinica_id = ?`,
      [
        animal_id || null,
        tutor_nome,
        pet_nome,
        data_emissao,
        validade,
        status,
        observacoes || null,
        itensString,
        total,
        id,
        clinica_id
      ]
    );

    const orcamentoAtualizado = await db.get('SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json({ success: true, ...orcamentoAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar orçamento da clínica
export const deleteOrcamento = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;

    const db = await openDb();
    const orcamentoExistente = await db.get(
      'SELECT id FROM orcamentos WHERE id = ? AND clinica_id = ?', 
      [id, clinica_id]
    );

    if (!orcamentoExistente) {
      return res.status(404).json({ error: 'Orçamento não encontrado ou sem permissão' });
    }

    await db.run('DELETE FROM orcamentos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.json({ success: true, message: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
