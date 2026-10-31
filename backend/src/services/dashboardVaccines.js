// Only the latest application of each vaccine contributes a next-dose reminder.
export async function getDashboardVaccines(db, clinicaId, hoje, { split = false } = {}) {
  const limite = new Date(`${hoje}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 30);
  const dataLimite = limite.toISOString().slice(0, 10);
  const due = 'SUBSTR(CAST(v.proxima_dose AS TEXT), 1, 10)';
  const from = `FROM vacinas v
    JOIN animais a ON a.id = v.animal_id AND a.clinica_id = v.clinica_id
    WHERE v.clinica_id = ? AND COALESCE(a.obito, 0) = 0
      AND v.proxima_dose IS NOT NULL AND v.proxima_dose <> ''
      AND NOT EXISTS (
        SELECT 1 FROM vacinas newer
        WHERE newer.clinica_id = v.clinica_id AND newer.animal_id = v.animal_id
          AND LOWER(TRIM(newer.nome_vacina)) = LOWER(TRIM(v.nome_vacina))
          AND (newer.data_aplicacao > v.data_aplicacao
            OR (newer.data_aplicacao = v.data_aplicacao AND newer.id > v.id))
      )`;
  const [contagem, itens] = await Promise.all([
    db.get(`SELECT
      COALESCE(SUM(CASE WHEN ${due} < ? THEN 1 ELSE 0 END), 0) AS vencidas,
      COALESCE(SUM(CASE WHEN ${due} BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) AS pendentes
      ${from}`, [hoje, hoje, dataLimite, clinicaId]),
    db.all(`SELECT v.id, v.animal_id, v.nome_vacina, v.proxima_dose, a.nome AS animal_nome
      ${from} AND ${due} <= ? ORDER BY ${due} ASC, v.id ASC LIMIT 5`, [clinicaId, dataLimite])
  ]);
  const result = { vencidas: Number(contagem.vencidas), pendentes: Number(contagem.pendentes), itens };
  if (split) {
    [result.vencidasItens, result.pendentesItens] = await Promise.all([
      db.all(`SELECT v.id, v.animal_id, v.nome_vacina, v.proxima_dose, a.nome AS animal_nome ${from} AND ${due} < ? ORDER BY ${due}, v.id LIMIT 5`, [clinicaId, hoje]),
      db.all(`SELECT v.id, v.animal_id, v.nome_vacina, v.proxima_dose, a.nome AS animal_nome ${from} AND ${due} BETWEEN ? AND ? ORDER BY ${due}, v.id LIMIT 5`, [clinicaId, hoje, dataLimite])
    ]);
  }
  return result;
}
