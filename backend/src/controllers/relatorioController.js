// backend/src/controllers/relatorioController.js
import { openDb } from '../db.js';

// Relatório Financeiro da clínica
export const relatorioFinanceiro = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const transacoes = await db.all(`
      SELECT * FROM financeiro 
      WHERE clinica_id = ? AND data BETWEEN ? AND ?
      ORDER BY data ASC
    `, [clinica_id, dataInicio, dataFim]);
    
    const entradas = transacoes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
    const saidas = transacoes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
    
    res.json({
      transacoes,
      resumo: { entradas, saidas, saldo: entradas - saidas }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Relatório de Vacinas da clínica
export const relatorioVacinas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const vacinas = await db.all(`
      SELECT 
        v.*,
        a.nome as pet_nome
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.clinica_id = ?
      ORDER BY v.data_aplicacao DESC
    `, [clinica_id]);
    
    res.json({ vacinas });
  } catch (error) {
    console.error('Erro ao gerar relatório de vacinas:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Relatório de Retornos da clínica
export const relatorioRetornos = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const retornos = await db.all(`
      SELECT r.*, a.nome as pet_nome, res.nome as tutor_nome
      FROM retornos r
      LEFT JOIN animais a ON r.animal_id = a.id
      LEFT JOIN responsaveis res ON a.responsavel_id = res.id
      WHERE r.clinica_id = ?
      ORDER BY r.data_retorno DESC
    `, [clinica_id]);
    
    res.json({ retornos });
  } catch (error) {
    console.error('Erro ao gerar relatório de retornos:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Relatório de Produção da clínica
export const relatorioProducao = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const agendamentos = await db.all(`
      SELECT 
        a.*,
        an.nome as animal_nome
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      WHERE a.clinica_id = ? AND a.data BETWEEN ? AND ?
      ORDER BY a.data ASC
    `, [clinica_id, dataInicio, dataFim]);
    
    res.json({ agendamentos });
  } catch (error) {
    console.error('Erro ao gerar relatório de produção:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Dashboard Stats da clínica
export const dashboardStats = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = hoje.slice(0, 7);
    
    const totalTutores = await db.get('SELECT COUNT(*) as total FROM responsaveis WHERE clinica_id = ?', [clinica_id]);
    const totalAnimais = await db.get('SELECT COUNT(*) as total FROM animais WHERE clinica_id = ?', [clinica_id]);
    const consultasHoje = await db.get('SELECT COUNT(*) as total FROM agendamentos WHERE clinica_id = ? AND data = ?', [clinica_id, hoje]);
    const receitaMes = await db.get(`
      SELECT SUM(valor) as total FROM financeiro 
      WHERE clinica_id = ? AND tipo = 'entrada' AND strftime('%Y-%m', data) = ?
    `, [clinica_id, mesAtual]);
    
    res.json({
      totalTutores: totalTutores.total,
      totalAnimais: totalAnimais.total,
      consultasHoje: consultasHoje.total,
      receitaMensal: receitaMes?.total || 0
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};