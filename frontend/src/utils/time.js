

export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // 1..12
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
export const PERIOD_OPTIONS = ['AM', 'PM'];

/** 'HH:MM' (24 h) → { hour:'11', minute:'12', period:'PM' } | null si es inválido. */
export function parse24(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h24 = Number(m[1]);
  const minute = String(Number(m[2])).padStart(2, '0'); // '9' → '09' (opcionales en <select>)
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour = h24 % 12 === 0 ? '12' : String(h24 % 12);
  return { hour, minute, period };
}

/** { hour, minute, period } → 'HH:MM' (24 h). Devuelve null si falta algo. */
export function to24({ hour, minute, period } = {}) {
  if (!hour || !minute || !period) return null;
  const h = Number(hour);
  if (h < 1 || h > 12) return null;
  const h24 = period === 'AM' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
  return `${String(h24).padStart(2, '0')}:${minute}`;
}

/** Etiqueta 12 h legible a partir de 'HH:MM' (24 h). '23:12' → '11:12 PM'. */
export function format12(hhmm) {
  const p = parse24(hhmm);
  return p ? `${p.hour}:${p.minute} ${p.period}` : String(hhmm || '');
}

/** Etiqueta de un slot 'HH:MM'→'HH:MM' (24 h): '23:12'→'06:00' → '11:12 PM – 6:00 AM (+1 día)'. */
export function formatSlot(slot) {
  if (!slot || !slot.start || !slot.end) return '';
  const crosses = toMinutes(slot.end) <= toMinutes(slot.start);
  return `${format12(slot.start)} – ${format12(slot.end)}${crosses ? ' (+1 día)' : ''}`;
}

/** 'HH:MM' → minutos desde medianoche (null si es inválido). */
export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function slotCrossesMidnight(slot) {
  if (!slot || !slot.start || !slot.end) return false;
  const s = toMinutes(slot.start);
  const e = toMinutes(slot.end);
  if (s == null || e == null) return false;
  return e <= s;
}
