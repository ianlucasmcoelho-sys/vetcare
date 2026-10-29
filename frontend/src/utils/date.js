// A clinical calendar date has no timezone. Parsing YYYY-MM-DD as UTC shifts it
// to the previous day in Brazil, so construct it in local time instead.
export function calendarDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, fallback = 'Não informada') {
  return calendarDate(value)?.toLocaleDateString('pt-BR') || fallback;
}

export function localDateInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
