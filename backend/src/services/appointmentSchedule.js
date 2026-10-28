export const defaultSchedule = { inicio: '08:00', fim: '18:00', pausa_inicio: '12:00', pausa_fim: '13:00', intervalo: 30, dias_semana: [1, 2, 3, 4, 5] };
const validStatuses = ['Agendado', 'Confirmado', 'Concluído', 'Cancelado'];
const clinicalTypes = ['Consulta', 'Vacina', 'Retorno', 'Cirurgia', 'Exame', 'Emergência'];
export function scheduleError(message, httpStatus = 400) { return Object.assign(new Error(message), { httpStatus }); }
export function timeMinutes(value) {
  const text = String(value ?? '').trim();
  if (!/^([01]?\d|2[0-3]):[0-5]\d(?::00)?$/.test(text)) throw scheduleError('Informe um horário válido no formato HH:mm.');
  const [hour, minute] = text.split(':');
  return Number(hour) * 60 + Number(minute);
}
const normalizedTime = value => { const minutes = timeMinutes(value); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; };
export function validateScheduleDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw scheduleError('Informe uma data válida.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw scheduleError('Informe uma data válida.');
  return date;
}
export function appointmentDuration(value = 30) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 5 || result > 240) throw scheduleError('A duração deve ser de 5 a 240 minutos.');
  return result;
}
export const intervalsOverlap = (start, duration, otherStart, otherDuration) => start < otherStart + otherDuration && start + duration > otherStart;
export function normalizeSchedule(input) {
  const inicio = normalizedTime(input.inicio); const fim = normalizedTime(input.fim);
  if (timeMinutes(inicio) >= timeMinutes(fim)) throw scheduleError('O fim do expediente deve ser depois do início.');
  const pausa_inicio = input.pausa_inicio ? normalizedTime(input.pausa_inicio) : ''; const pausa_fim = input.pausa_fim ? normalizedTime(input.pausa_fim) : '';
  if (Boolean(pausa_inicio) !== Boolean(pausa_fim)) throw scheduleError('Informe o início e o fim do intervalo, ou deixe ambos vazios.');
  if (pausa_inicio && (timeMinutes(pausa_inicio) < timeMinutes(inicio) || timeMinutes(pausa_fim) > timeMinutes(fim) || timeMinutes(pausa_inicio) >= timeMinutes(pausa_fim))) throw scheduleError('O intervalo deve estar dentro do expediente.');
  const intervalo = Number(input.intervalo);
  if (![15, 30, 60].includes(intervalo)) throw scheduleError('A grade deve usar intervalos de 15, 30 ou 60 minutos.');
  let days;
  try { days = typeof input.dias_semana === 'string' ? JSON.parse(input.dias_semana) : input.dias_semana; } catch { throw scheduleError('Dias de atendimento inválidos.'); }
  if (!Array.isArray(days) || days.length === 0 || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw scheduleError('Selecione ao menos um dia da semana.');
  return { inicio, fim, pausa_inicio, pausa_fim, intervalo, dias_semana: [...new Set(days)].sort() };
}
export async function readSchedule(db, clinicId) {
  const row = await db.get('SELECT inicio, fim, pausa_inicio, pausa_fim, intervalo, dias_semana FROM agenda_expediente WHERE clinica_id = ?', [clinicId]);
  return row ? normalizeSchedule(row) : { ...defaultSchedule, dias_semana: [...defaultSchedule.dias_semana] };
}
export async function saveSchedule(db, clinicId, input) {
  const schedule = normalizeSchedule(input);
  await db.run(`INSERT INTO agenda_expediente (clinica_id, inicio, fim, pausa_inicio, pausa_fim, intervalo, dias_semana)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(clinica_id) DO UPDATE SET inicio = excluded.inicio, fim = excluded.fim,
    pausa_inicio = excluded.pausa_inicio, pausa_fim = excluded.pausa_fim, intervalo = excluded.intervalo, dias_semana = excluded.dias_semana RETURNING clinica_id`,
  [clinicId, schedule.inicio, schedule.fim, schedule.pausa_inicio, schedule.pausa_fim, schedule.intervalo, JSON.stringify(schedule.dias_semana)]);
  return schedule;
}
async function validateProfessional(db, clinicId, value) {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw scheduleError('Profissional inválido.');
  const person = await db.get("SELECT id FROM usuarios WHERE id = ? AND clinica_id = ? AND ativo = 1 AND perfil IN ('admin', 'veterinario')", [id, clinicId]);
  if (!person) throw scheduleError('Profissional não encontrado nesta clínica.', 404);
  return id;
}
function inWorkingHours(schedule, date, start, duration) {
  if (!schedule.dias_semana.includes(validateScheduleDate(date).getUTCDay())) return false;
  if (start < timeMinutes(schedule.inicio) || start + duration > timeMinutes(schedule.fim)) return false;
  return !schedule.pausa_inicio || !intervalsOverlap(start, duration, timeMinutes(schedule.pausa_inicio), timeMinutes(schedule.pausa_fim) - timeMinutes(schedule.pausa_inicio));
}
export async function dayAvailability(db, clinicId, { data, veterinario_id, duracao_minutos = 30 }) {
  validateScheduleDate(data);
  const duration = appointmentDuration(duracao_minutos);
  const professional = await validateProfessional(db, clinicId, veterinario_id);
  const schedule = await readSchedule(db, clinicId);
  const appointments = await db.all(`SELECT a.*,
    an.nome AS animal_nome, u.nome AS veterinario_nome FROM agendamentos a
    LEFT JOIN animais an ON an.id = a.animal_id AND an.clinica_id = a.clinica_id
    LEFT JOIN usuarios u ON u.id = a.veterinario_id AND u.clinica_id = a.clinica_id
    WHERE a.clinica_id = ? AND a.data = ? AND COALESCE(a.status, 'Agendado') <> 'Cancelado'
      AND (CAST(? AS INTEGER) IS NULL OR a.veterinario_id = ? OR a.veterinario_id IS NULL) ORDER BY a.horario, a.id`, [clinicId, data, professional, professional]);
  const aberto = schedule.dias_semana.includes(validateScheduleDate(data).getUTCDay());
  const horarios = [];
  if (aberto) for (let minute = timeMinutes(schedule.inicio); minute + duration <= timeMinutes(schedule.fim); minute += schedule.intervalo) {
    const working = inWorkingHours(schedule, data, minute, duration);
    const busy = appointments.some(row => intervalsOverlap(minute, duration, timeMinutes(row.horario), row.duracao_minutos || 30));
    horarios.push({ horario: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`, disponivel: working && !busy, motivo: !working ? 'Intervalo' : busy ? 'Ocupado' : 'Livre' });
  }
  return { data, aberto, expediente: schedule, horarios, agendamentos: appointments.map(row => ({ ...row, horario: normalizedTime(row.horario) })) };
}
// Run inside runTransaction. A write lock serializes bookings in the same clinic
// on both SQLite and PostgreSQL, preventing two requests from taking one slot.
export async function saveAppointment(db, clinicId, input, id = null) {
  await db.run('INSERT INTO agenda_expediente (clinica_id) VALUES (?) ON CONFLICT(clinica_id) DO NOTHING RETURNING clinica_id', [clinicId]);
  await db.run('UPDATE agenda_expediente SET inicio = inicio WHERE clinica_id = ?', [clinicId]);
  const previous = id ? await db.get('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinicId]) : null;
  if (id && !previous) throw scheduleError('Agendamento não encontrado.', 404);
  const data = { ...(previous || {}), ...input };
  const animalId = Number(data.animal_id);
  if (!Number.isSafeInteger(animalId) || animalId <= 0) throw scheduleError('Selecione um paciente válido.');
  const animal = await db.get('SELECT id, obito FROM animais WHERE id = ? AND clinica_id = ?', [animalId, clinicId]);
  if (!animal) throw scheduleError('Animal não encontrado nesta clínica.', 404);
  validateScheduleDate(data.data);
  const start = timeMinutes(data.horario);
  data.horario = normalizedTime(data.horario);
  const duration = appointmentDuration(data.duracao_minutos ?? 30);
  const status = data.status || 'Agendado';
  const professional = status === 'Cancelado' && previous && Number(previous.veterinario_id) === Number(data.veterinario_id) ? (previous.veterinario_id || null) : await validateProfessional(db, clinicId, data.veterinario_id);
  if (!validStatuses.includes(status)) throw scheduleError('Status inválido.');
  const type = data.tipo_servico || 'Consulta';
  if (!clinicalTypes.includes(type) && type !== previous?.tipo_servico) throw scheduleError('Selecione um serviço clínico disponível.');
  if (status !== 'Cancelado') {
    const changed = !previous || previous.data !== data.data || previous.horario !== data.horario || Number(previous.duracao_minutos || 30) !== duration || (previous.veterinario_id || null) !== professional || previous.status === 'Cancelado';
    if (changed && animal.obito) throw scheduleError('Não é possível agendar um novo atendimento para um paciente com óbito registrado.');
    if (changed && !inWorkingHours(await readSchedule(db, clinicId), data.data, start, duration)) throw scheduleError('Horário fora do expediente ou dentro do intervalo. Confira a agenda completa.');
    const others = await db.all(`SELECT horario, duracao_minutos FROM agendamentos WHERE clinica_id = ? AND data = ? AND id <> ?
      AND COALESCE(status, 'Agendado') <> 'Cancelado' AND (CAST(? AS INTEGER) IS NULL OR veterinario_id = ? OR veterinario_id IS NULL)`, [clinicId, data.data, id || 0, professional, professional]);
    if (others.some(row => intervalsOverlap(start, duration, timeMinutes(row.horario), row.duracao_minutos || 30))) throw scheduleError('Este horário já está ocupado para o profissional ou para a agenda da clínica.', 409);
  }
  const values = [animalId, data.data, data.horario, type, status, data.domiciliar ? 1 : 0, data.observacoes || null, professional, duration];
  if (id) {
    await db.run(`UPDATE agendamentos SET animal_id = ?, data = ?, horario = ?, tipo_servico = ?, status = ?, domiciliar = ?, observacoes = ?, veterinario_id = ?, duracao_minutos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?`, [...values, id, clinicId]);
  } else {
    const result = await db.run(`INSERT INTO agendamentos (animal_id, data, horario, tipo_servico, status, domiciliar, observacoes, veterinario_id, duracao_minutos, clinica_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...values, clinicId]);
    id = result.lastID;
  }
  return db.get('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?', [id, clinicId]);
}
