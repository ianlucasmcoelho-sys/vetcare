// backend/src/controllers/responsavelController.js
import { openDb } from '../db.js';  // ← caminho correto: ../db.js

// Buscar todos os responsáveis da clínica
export const getAllResponsaveis = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const responsaveis = await db.all('SELECT * FROM responsaveis WHERE clinica_id = ? ORDER BY nome ASC', [clinica_id]);
    res.json(responsaveis);
  } catch (error) {
    console.error('Erro ao buscar responsáveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar responsável por ID na clínica
export const getResponsavelById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    const responsavel = await db.get('SELECT * FROM responsaveis WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (!responsavel) {
      return res.status(404).json({ error: 'Responsável não encontrado' });
    }
    
    res.json(responsavel);
  } catch (error) {
    console.error('Erro ao buscar responsável:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo responsável
export const createResponsavel = async (req, res) => {
  try {
    const {
      nome, cpf, rg, nascimento, telefone, celular, email,
      cep, endereco, cidade, estado, observacoes
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!nome || !celular) {
      return res.status(400).json({ error: 'Nome e celular são obrigatórios' });
    }

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO responsaveis (
        clinica_id, nome, cpf, rg, nascimento, telefone, celular, email,
        cep, endereco, cidade, estado, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clinica_id, nome, cpf, rg, nascimento, telefone, celular, email, cep, endereco, cidade, estado, observacoes]
    );

    res.status(201).json({ success: true, id: result.lastID, ...req.body });
  } catch (error) {
    console.error('Erro ao criar responsável:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar responsável
export const updateResponsavel = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, cpf, rg, nascimento, telefone, celular, email,
      cep, endereco, cidade, estado, observacoes
    } = req.body;
    const clinica_id = req.usuario.clinica_id;

    const db = await openDb();
    const result = await db.run(
      `UPDATE responsaveis SET
        nome = ?, cpf = ?, rg = ?, nascimento = ?, telefone = ?, celular = ?, email = ?,
        cep = ?, endereco = ?, cidade = ?, estado = ?, observacoes = ?
      WHERE id = ? AND clinica_id = ?`,
      [nome, cpf, rg, nascimento, telefone, celular, email, cep, endereco, cidade, estado, observacoes, id, clinica_id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Responsável não encontrado ou sem permissão' });
    }

    res.json({ success: true, id, ...req.body });
  } catch (error) {
    console.error('Erro ao atualizar responsável:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar responsável
export const deleteResponsavel = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    // Verificar se existem animais vinculados
    const animais = await db.get('SELECT COUNT(*) as total FROM animais WHERE responsavel_id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (animais.total > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um responsável que possui animais cadastrados' });
    }
    
    const result = await db.run('DELETE FROM responsaveis WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Responsável não encontrado ou sem permissão' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar responsável:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Listar responsáveis simples para a clínica
export const listResponsaveisSimples = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const responsaveis = await db.all('SELECT id, nome FROM responsaveis WHERE clinica_id = ? ORDER BY nome ASC', [clinica_id]);
    res.json(responsaveis);
  } catch (error) {
    console.error('Erro ao listar responsáveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};