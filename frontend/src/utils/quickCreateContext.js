export const quickContextKeys = ['animal_id', 'tutor_id', 'data', 'horario', 'veterinario_id', 'duracao_minutos'];
export function parseQuickContext(params) {
  const result = {};
  for (const key of ['animal_id', 'tutor_id', 'veterinario_id']) {
    const raw = params.get(key);
    if (/^\d+$/.test(raw || '') && Number.isSafeInteger(Number(raw)) && Number(raw) > 0) result[key] = String(Number(raw));
  }
  const date = params.get('data');
  if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    const parsed = new Date(`${date}T12:00:00Z`);
    if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) result.data = date;
  }
  const time = params.get('horario');
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) result.horario = time;
  const duration = Number(params.get('duracao_minutos'));
  if (Number.isInteger(duration) && duration >= 5 && duration <= 240) result.duracao_minutos = duration;
  return result;
}
