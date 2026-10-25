import { openDb, runTransaction } from '../db.js';

// Buscar todos os registros do dia ou futuros
export const getAllBanhoTosa = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const { data } = req.query; // opcional para filtrar por dia específico

    let query = `
      SELECT 
        b.*,
        an.nome as animal_nome,
        an.especie as animal_especie,
        r.nome as tutor_nome,
        r.telefone as tutor_telefone,
        r.celular as tutor_celular
      FROM banho_tosa b
      LEFT JOIN animais an ON b.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE b.clinica_id = ?
    `;
    const params = [clinica_id];

    if (data) {
      query += ` AND b.data = ?`;
      params.push(data);
    } else {
      // Por padrão pega os do dia atual em diante (ou sem filtro de data)
      const hoje = new Date().toISOString().split('T')[0];
      query += ` AND b.data >= ?`;
      params.push(hoje);
    }

    query += ` ORDER BY b.data ASC, b.horario ASC`;

    const registros = await db.all(query, params);
    res.json(registros);
  } catch (error) {
    console.error('Erro ao buscar registros de Banho & Tosa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo registro de Banho & Tosa
export const createBanhoTosa = async (req, res) => {
  try {
    const { animal_id, data, horario, pacote_mensal, status, observacoes } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!animal_id || !data || !horario) {
      return res.status(400).json({ error: 'Campos obrigatórios: animal_id, data, horario' });
    }

    const result = await runTransaction(async (db) => {
      const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
      if (!animal) throw new Error('Animal não encontrado');

      const insResult = await db.run(
        `INSERT INTO banho_tosa (
          clinica_id, animal_id, data, horario, pacote_mensal, status, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clinica_id, animal_id, data, horario, pacote_mensal ? 1 : 0, status || 'Aguardando', observacoes || null]
      );
      return insResult.lastID;
    });

    const db = await openDb();
    const novoRegistro = await db.get(`
      SELECT b.*, an.nome as animal_nome, r.nome as tutor_nome, r.celular as tutor_celular 
      FROM banho_tosa b
      LEFT JOIN animais an ON b.animal_id = an.id
      LEFT JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE b.id = ? AND b.clinica_id = ?
    `, [result, clinica_id]);

    res.status(201).json({ success: true, ...novoRegistro });
  } catch (error) {
    res.status(error.message === 'Animal não encontrado' ? 404 : 500).json({ error: error.message });
  }
};

// Atualizar status (Aguardando, No Banho, Secagem, Finalizado)
export const updateBanhoTosaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const clinica_id = req.usuario.clinica_id;

    if (!status) return res.status(400).json({ error: 'Status é obrigatório' });

    const db = await openDb();
    const existe = await db.get('SELECT id FROM banho_tosa WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!existe) return res.status(404).json({ error: 'Registro não encontrado' });

    await db.run(
      `UPDATE banho_tosa SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?`,
      [status, id, clinica_id]
    );

    res.json({ success: true, id, status });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Excluir registro
export const deleteBanhoTosa = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    
    await runTransaction(async (db) => {
      const result = await db.run('DELETE FROM banho_tosa WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
      if (result.changes === 0) throw new Error('Registro não encontrado');
    });

    res.status(204).send();
  } catch (error) {
    res.status(error.message === 'Registro não encontrado' ? 404 : 500).json({ error: error.message });
  }
};
