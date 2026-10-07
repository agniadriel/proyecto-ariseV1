
const DAY_MS = 86400000;

/**
 * Valida los parámetros month (1-12) y year, y los devuelve normalizados.
 * @throws {Error} si los valores son inválidos.
 */
function parseMonthYear(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error('month debe ser un número entre 1 y 12');
  }
  if (!Number.isInteger(y) || y < 1970 || y > 9999) {
    throw new Error('year es inválido');
  }
  return { month: m, year: y };
}


function daysInMonth(month, year) {
  // llamar Date.UTC con el día 0 del mes siguiente devuelve el último día del mes anterior.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}


function utcMidnight(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}


function getMonthStart(month, year) {
  return utcMidnight(year, month - 1, 1);
}


function getNextMonthStart(month, year) {
  const nm = month === 12 ? 1 : month + 1;
  const ny = month === 12 ? year + 1 : year;
  return utcMidnight(ny, nm - 1, 1);
}


function getMonthRange(month, year) {
  return { start: getMonthStart(month, year), end: getNextMonthStart(month, year) };
}


function getPrevMonth(month, year) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}


function getTodayUTC() {
  const now = new Date();
  return utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}


function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @throws {Error} si la fecha no es representable.
 */
function parseDateInput(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime()) || String(input).trim().length < 8) {
    throw new Error('Fecha inválida. Usa el formato YYYY-MM-DD');
  }
  return utcMidnight(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const HHMM_RE = /^(2[0-3]|[01]?[0-9]):[0-5][0-9]$/;


function isValidHHMM(value) {
  return typeof value === 'string' && HHMM_RE.test(value.trim());
}

function hhmmToMinutes(value) {
  const [h, m] = value.trim().split(':').map(Number);
  return h * 60 + m;
}

/**
 * @throws {Error} si no es una hora válida.
 */
function normalizeHHMM(value) {
  if (!isValidHHMM(value)) {
    throw new Error(`Hora inválida: "${value}". Usa el formato HH:MM (24 h).`);
  }
  const [h, m] = value.trim().split(':');
  return `${String(Number(h)).padStart(2, '0')}:${m}`;
}

function isSlotValid(slot) {
  return slot && isValidHHMM(slot.start) && isValidHHMM(slot.end);
}


function crossesMidnight(slot) {
  if (!slot || !isValidHHMM(slot.start) || !isValidHHMM(slot.end)) return false;
  return hhmmToMinutes(slot.end) <= hhmmToMinutes(slot.start);
}


function weekdayNumber(date) {
  const d = date.getUTCDay(); // 0=Domingo ... 6=Sábado
  return d === 0 ? 7 : d;
}

module.exports = {
  DAY_MS,
  parseMonthYear,
  daysInMonth,
  getMonthStart,
  getNextMonthStart,
  getMonthRange,
  getPrevMonth,
  getTodayUTC,
  dateKey,
  parseDateInput,
  isValidHHMM,
  hhmmToMinutes,
  normalizeHHMM,
  isSlotValid,
  crossesMidnight,
  weekdayNumber,
};