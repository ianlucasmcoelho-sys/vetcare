import { getDashboardVaccines } from './dashboardVaccines.js';

export function overviewDates(now = new Date()) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
  const start = new Date(`${hoje}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  return { hoje, inicio: start.toISOString().slice(0, 10), mes: hoje.slice(5, 7) };
}
const dateColumn = column => `SUBSTR(CAST(${column} AS TEXT), 1, 10)`;

export async function getClinicHome(db, clinicId, now) {
  const { hoje, mes } = overviewDates(now);
  const [clinica, vacinas, animais, tutores, registros, aniversariosPets, aniversariosTutores, retornos, contagemRetornos, agenda, contagemAgenda] = await Promise.all([
    db.get('SELECT id, nome, plano_id, status_assinatura, data_expiracao, created_at FROM clinicas WHERE id = ?', [clinicId]),
    getDashboardVaccines(db, clinicId, hoje, { split: true }),
    db.all('SELECT id, nome, especie, created_at FROM animais WHERE clinica_id = ? ORDER BY created_at DESC, id DESC LIMIT 4', [clinicId]),
    db.all('SELECT id, nome, created_at FROM responsaveis WHERE clinica_id = ? ORDER BY created_at DESC, id DESC LIMIT 4', [clinicId]),
    db.all('SELECT id, animal_id, pet_nome, data_visita, veterinario, diagnostico FROM prontuarios WHERE clinica_id = ? ORDER BY data_visita DESC, id DESC LIMIT 5', [clinicId]),
    db.all(`SELECT id, nome, nascimento FROM animais WHERE clinica_id = ? AND COALESCE(obito, 0) = 0 AND SUBSTR(CAST(nascimento AS TEXT), 6, 2) = ? ORDER BY SUBSTR(CAST(nascimento AS TEXT), 9, 2), nome LIMIT 6`, [clinicId, mes]),
    db.all(`SELECT id, nome, nascimento FROM responsaveis WHERE clinica_id = ? AND SUBSTR(CAST(nascimento AS TEXT), 6, 2) = ? ORDER BY SUBSTR(CAST(nascimento AS TEXT), 9, 2), nome LIMIT 6`, [clinicId, mes]),
    db.all(`SELECT id, animal_id, pet_nome, tutor_nome, data_retorno, horario, motivo FROM retornos WHERE clinica_id = ? AND status IN ('Pendentes', 'Atrasados') ORDER BY data_retorno, horario, id LIMIT 6`, [clinicId]),
    db.get(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN ${dateColumn('data_retorno')} < ? THEN 1 ELSE 0 END), 0) AS atrasados FROM retornos WHERE clinica_id = ? AND status IN ('Pendentes', 'Atrasados')`, [hoje, clinicId]),
    db.all(`SELECT ag.id, ag.animal_id, ag.horario, ag.tipo_servico, ag.status, a.nome AS pet_nome, r.nome AS tutor_nome
      FROM agendamentos ag LEFT JOIN animais a ON a.id = ag.animal_id AND a.clinica_id = ag.clinica_id
      LEFT JOIN responsaveis r ON r.id = a.responsavel_id AND r.clinica_id = ag.clinica_id
      WHERE ag.clinica_id = ? AND ${dateColumn('ag.data')} = ? AND COALESCE(ag.status, '') <> 'Cancelado'
      ORDER BY ag.horario, ag.id LIMIT 8`, [clinicId, hoje]),
    db.get(`SELECT COUNT(*) AS total FROM agendamentos WHERE clinica_id = ? AND ${dateColumn('data')} = ? AND COALESCE(status, '') <> 'Cancelado'`, [clinicId, hoje])
  ]);
  return { hoje, clinica, vacinas, cadastros: { animais, tutores }, registros,
    aniversarios: { animais: aniversariosPets, tutores: aniversariosTutores },
    retornos: { total: Number(contagemRetornos.total), atrasados: Number(contagemRetornos.atrasados), itens: retornos },
    agenda: { total: Number(contagemAgenda.total), itens: agenda } };
}

export async function getClinicalOverview(db, clinicId, perfil, now) {
  const { hoje, inicio } = overviewDates(now);
  // Identifiers come only from this fixed list; all clinic/date values are bound.
  const sources = [
    ['tutores', 'responsaveis', 'created_at'], ['pacientes', 'animais', 'created_at'],
    ['consultas', 'prontuarios', 'data_visita'], ['vacinas', 'vacinas', 'data_aplicacao'],
    ['exames', 'exames', 'data_solicitacao'], ['prescricoes', 'receituario', 'data_emissao']
  ];
  const countsPromise = Promise.all(sources.map(async ([key, table, date]) => {
    const counts = await db.get(`SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN ${dateColumn(date)} BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) AS recentes
      FROM ${table} WHERE clinica_id = ?`, [inicio, hoje, clinicId]);
    return [key, { total: Number(counts.total), recentes: Number(counts.recentes) }];
  }));
  const [clinica, counts, equipe, especies, internados, examesPendentes, retornosAtrasados, registros] = await Promise.all([
    db.get('SELECT id, nome, cnpj, endereco, telefone, created_at, plano_id, status_assinatura FROM clinicas WHERE id = ?', [clinicId]),
    countsPromise,
    db.all("SELECT id, nome, perfil FROM usuarios WHERE clinica_id = ? AND ativo = 1 ORDER BY nome LIMIT 12", [clinicId]),
    db.all("SELECT COALESCE(NULLIF(TRIM(especie), ''), 'Não informado') AS especie, COUNT(*) AS total FROM animais WHERE clinica_id = ? AND COALESCE(obito, 0) = 0 GROUP BY COALESCE(NULLIF(TRIM(especie), ''), 'Não informado') ORDER BY total DESC, especie LIMIT 8", [clinicId]),
    db.get("SELECT COUNT(*) AS total FROM internacoes WHERE clinica_id = ? AND status = 'ativo'", [clinicId]),
    db.get("SELECT COUNT(*) AS total FROM exames WHERE clinica_id = ? AND status = 'pendente'", [clinicId]),
    db.get(`SELECT COUNT(*) AS total FROM retornos WHERE clinica_id = ? AND status IN ('Pendentes', 'Atrasados') AND ${dateColumn('data_retorno')} < ?`, [clinicId, hoje]),
    db.all('SELECT id, animal_id, pet_nome, veterinario, data_visita, diagnostico FROM prontuarios WHERE clinica_id = ? ORDER BY data_visita DESC, id DESC LIMIT 5', [clinicId])
  ]);
  let financeiro = null;
  const planoPago = clinica && ((clinica.plano_id || 'free') !== 'free' || clinica.status_assinatura === 'vitalicio');
  if (planoPago && ['admin', 'veterinario', 'recepcionista'].includes(perfil)) {
    const result = await db.get(`SELECT
      COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS saidas
      FROM financeiro WHERE clinica_id = ? AND ${dateColumn('data')} BETWEEN ? AND ?`, [clinicId, inicio, hoje]);
    financeiro = { entradas: Number(result.entradas), saidas: Number(result.saidas) };
  }
  return { hoje, inicio, clinica, indicadores: Object.fromEntries(counts), equipe,
    especies: especies.map(row => ({ ...row, total: Number(row.total) })),
    prioridades: { internados: Number(internados.total), examesPendentes: Number(examesPendentes.total), retornosAtrasados: Number(retornosAtrasados.total) },
    registros, financeiro };
}
