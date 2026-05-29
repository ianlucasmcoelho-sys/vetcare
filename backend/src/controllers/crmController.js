import { openDb } from '../db.js';

/**
 * CRM Controller - Inteligência de Retenção e Campanhas
 */

// 1. Clientes Sumidos (Sem movimentação/consulta há mais de 6 meses)
export const getClientesSumidos = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    // Filtro: Última consulta ou agendamento concluído há mais de 180 dias
    const seisMesesAtras = new Date();
    seisMesesAtras.setDate(seisMesesAtras.getDate() - 180);
    const dataLimite = seisMesesAtras.toISOString().split('T')[0];

    const sumidos = await db.all(`
      SELECT 
        r.id, r.nome, r.celular, r.email,
        MAX(a.data) as ultima_visita,
        COUNT(an.id) as total_pets
      FROM responsaveis r
      LEFT JOIN animais an ON r.id = an.responsavel_id
      LEFT JOIN agendamentos a ON an.id = a.animal_id
      WHERE r.clinica_id = ?
      GROUP BY r.id
      HAVING ultima_visita < ? OR ultima_visita IS NULL
      ORDER BY ultima_visita DESC
    `, [clinica_id, dataLimite]);

    res.json(sumidos);
  } catch (error) {
    console.error('Erro CRM Sumidos:', error);
    res.status(500).json({ error: 'Erro ao processar dados de retenção' });
  }
};

// 2. Campanhas de Vacinação (Pets com vacinas a vencer nos próximos 30 dias)
export const getCampanhasVacina = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const hoje = new Date().toISOString().split('T')[0];
    const trintaDias = new Date();
    trintaDias.setDate(trintaDias.getDate() + 30);
    const dataFim = trintaDias.toISOString().split('T')[0];

    const campanhas = await db.all(`
      SELECT 
        v.id as vacina_id, v.nome_vacina, v.proxima_dose,
        an.nome as pet_nome, an.especie,
        r.nome as tutor_nome, r.celular as tutor_celular
      FROM vacinas v
      JOIN animais an ON v.animal_id = an.id
      JOIN responsaveis r ON an.responsavel_id = r.id
      WHERE v.clinica_id = ? 
        AND v.proxima_dose BETWEEN ? AND ?
      ORDER BY v.proxima_dose ASC
    `, [clinica_id, hoje, dataFim]);

    res.json(campanhas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar campanhas de vacina' });
  }
};

// 3. Estatísticas de Engajamento
export const getCRMMetrics = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;

    // Total de tutores ativos
    const totalTutores = await db.get('SELECT COUNT(*) as total FROM responsaveis WHERE clinica_id = ?', [clinica_id]);
    
    // Tutores que vieram nos últimos 30 dias
    const umMesAtras = new Date();
    umMesAtras.setDate(umMesAtras.getDate() - 30);
    const ativosRecentes = await db.get(`
      SELECT COUNT(DISTINCT r.id) as total 
      FROM responsaveis r
      JOIN animais an ON r.id = an.responsavel_id
      JOIN agendamentos a ON an.id = a.animal_id
      WHERE r.clinica_id = ? AND a.data >= ?
    `, [clinica_id, umMesAtras.toISOString().split('T')[0]]);

    res.json({
      totalTutores: totalTutores.total,
      ativosRecentes: ativosRecentes.total,
      taxaRetencao: totalTutores.total > 0 ? ((ativosRecentes.total / totalTutores.total) * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular métricas' });
  }
};
