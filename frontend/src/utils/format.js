// src/utils/format.js
// Utilidades compartidas para los días de la semana (1=Lunes ... 7=Domingo).
export const WEEKDAYS = [
  { value: 1, label: 'L', short: 'Lun', full: 'Lunes' },
  { value: 2, label: 'M', short: 'Mar', full: 'Martes' },
  { value: 3, label: 'X', short: 'Mié', full: 'Miércoles' },
  { value: 4, label: 'J', short: 'Jue', full: 'Jueves' },
  { value: 5, label: 'V', short: 'Vie', full: 'Viernes' },
  { value: 6, label: 'S', short: 'Sáb', full: 'Sábado' },
  { value: 7, label: 'D', short: 'Dom', full: 'Domingo' },
];

export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Normaliza: sin duplicados, numéricos, ordenados; default = todos los días. */
export function normalizeDays(days) {
  if (Array.isArray(days) && days.length > 0) {
    return [...new Set(days.map(Number))].filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b);
  }
  return [...ALL_DAYS];
}

/** 'L M X' o 'todos los días' según el conjunto. */
export function formatDays(days) {
  const d = normalizeDays(days);
  if (d.length === 7) return 'todos los días';
  return d.map((v) => (WEEKDAYS.find((w) => w.value === v) || {}).label).join(' ');
}

/** Número de día (1=Lun ... 7=Dom) para una fecha. */
export function weekdayNumber(date) {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}
