import { openDb } from '../db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = hoje.slice(0, 7);

    // 1. Estatísticas Gerais
    const stats = await Promise.all([
      db.get('SELECT COUNT(*) as total FROM responsaveis WHERE clinica_id = ?', [clinica_id]),
      db.get('SELECT COUNT(*) as total FROM animais WHERE clinica_id = ?', [clinica_id]),
      db.get('SELECT COUNT(*) as total FROM agendamentos WHERE clinica_id = ? AND data = ?', [clinica_id, hoje]),
      db.get('SELECT SUM(valor) as total FROM financeiro WHERE clinica_id = ? AND tipo = "entrada" AND data LIKE ?', [clinica_id, `${mesAtual}%`]),
      db.get('SELECT COUNT(*) as total FROM internacoes WHERE clinica_id = ? AND status = "ativo"', [clinica_id]),
      db.get('SELECT COUNT(*) as total FROM exames WHERE clinica_id = ? AND status = "pendente"', [clinica_id]),
      db.get('SELECT COUNT(*) as total FROM servicos WHERE clinica_id = ? AND quantidade <= estoqueMinimo', [clinica_id])
    ]);

    // 2. Consultas de Hoje
    const consultasHoje = await db.all(`
      SELECT 
        a.id, a.horario as hora, a.status, a.tipo_servico as tipo,
        p.nome as pet, t.nome as tutor
      FROM agendamentos a
      LEFT JOIN animais p ON a.animal_id = p.id
      LEFT JOIN responsaveis t ON p.responsavel_id = t.id
      WHERE a.clinica_id = ? AND a.data = ?
      ORDER BY a.horario ASC
    `, [clinica_id, hoje]);

    // 3. Atividades Recentes (Prontuários)
    const atividadesRecentes = await db.all(`
      SELECT 
        p.id, p.data_visita as data, p.diagnostico as desc,
        'Prontuário' as tipo
      FROM prontuarios p
      WHERE p.clinica_id = ?
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [clinica_id]);

    // 4. Dados Financeiros (6 meses)
    const meses = [];
    const entradas = [];
    const saidas = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mesAno = d.toISOString().slice(0, 7);
      const mesNome = d.toLocaleString('pt-BR', { month: 'short' });
      
      const f = await db.get(`
        SELECT 
          SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as ent,
          SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as sai
        FROM financeiro 
        WHERE clinica_id = ? AND data LIKE ?
      `, [clinica_id, `${mesAno}%`]);

      meses.push(mesNome);
      entradas.push(f.ent || 0);
      saidas.push(f.sai || 0);
    }

    res.json({
      stats: {
        tutores: stats[0].total,
        pets: stats[1].total,
        consultas: stats[2].total,
        receita: stats[3].total || 0,
        internados: stats[4].total,
        examesPendentes: stats[5].total,
        estoqueBaixo: stats[6].total
      },
      consultasHoje,
      atividadesRecentes,
      chartFinanceiro: { meses, entradas, saidas }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
