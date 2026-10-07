// src/components/MonthGrid.jsx
// Calendario mensual estilo Google Calendar:
//  - Cuadrícula fija de 7 columnas (Lun→Dom) con los días del mes en cajas cuadradas.
//  - Cada hábito programado aparece como píldora de color (por categoría) dentro del día.
//  - Clic en la píldora: marca/desmarca (upsert del backend). Completado = verde suave + check.
//  - Días de otros meses: celdas vacías atenuadas, sin interacción.
//  - Hoy: número resaltado con anillo cian. Días futuros del mes: bloqueados.

import { useRef } from 'react';
import { WEEKDAYS, weekdayNumber, normalizeDays } from '../utils/format';
import { formatSlot } from '../utils/time';

const pad = (n) => String(n).padStart(2, '0');

/** Colores por categoría (misma paleta que HabitProgress). */
const CATEGORY_COLORS = {
  académico: '#22d3ee',
  salud: '#34d399',
  personal: '#a78bfa',
  otro: '#fbbf24',
};

/** Colores hex → rgba() con alpha. */
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Construye la matriz de semanas del mes: 6 filas × 7 columnas (Lun=0 … Dom=6).
 * Cada celda: { day, inMonth } — day=null para los huecos fuera de mes.
 */
function buildWeeks(year, month) {
  const total = daysInMonth(year, month);
  const firstWeekday = weekdayNumber(new Date(Date.UTC(year, month - 1, 1))) - 1; // 0=Lun
  const cells = [];

  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, inMonth: false });
  for (let d = 1; d <= total; d++) cells.push({ day: d, inMonth: true });
  // Relleno hasta 42 celdas (6 semanas) para altura uniforme entre meses.
  while (cells.length < 42) cells.push({ day: null, inMonth: false });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Confeti de celebración: genera piezas absolutas dentro del calendario que
 * saltan desde (x, y) con gravedad y rotación, y se autodestruyen al terminar
 * la animación. Ligero (sin librerías) y respeta prefers-reduced-motion vía CSS.
 */
function burstConfetti(host, x, y, baseColor) {
  if (!host) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const COLORS = [baseColor, '#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#f472b6'];
  const PIECES = 28;
  for (let i = 0; i < PIECES; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    const angle = (Math.PI * 2 * i) / PIECES + Math.random() * 0.6;
    const dist = 42 + Math.random() * 66;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = COLORS[i % COLORS.length];
    p.style.setProperty('--cx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--cy', `${Math.sin(angle) * dist - 34}px`);
    p.style.setProperty('--rot', `${(Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 240)}deg`);
    p.style.width = `${5 + Math.random() * 4}px`;
    p.style.height = `${8 + Math.random() * 5}px`;
    if (Math.random() > 0.5) p.style.borderRadius = '50%';
    p.style.animationDelay = `${Math.random() * 0.05}s`;
    host.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
    setTimeout(() => p.remove(), 1600); // red de seguridad
  }
}

export default function MonthGrid({ perHabit = [], entryMap = {}, month, year, toggle }) {
  const gridRef = useRef(null);
  const now = new Date();
  const isCurrentMonth =
    year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
  // Meses futuros: todo el mes queda bloqueado (no se puede marcar nada).
  const isFutureMonth =
    year > now.getUTCFullYear() ||
    (year === now.getUTCFullYear() && month > now.getUTCMonth() + 1);
  const todayDate = now.getUTCDate();
  const total = daysInMonth(year, month);
  const weeks = buildWeeks(year, month);

  // Por cada día del mes: lista de hábitos programados ese día con su estado.
  const byDay = new Map();
  for (const h of perHabit) {
    const color = CATEGORY_COLORS[h.category] || CATEGORY_COLORS.otro;
    const dset = new Set(normalizeDays(h.daysOfWeek));
    const times =
      Array.isArray(h.timeSlots) && h.timeSlots.length > 0
        ? h.timeSlots.map((s) => formatSlot(s)).join(', ')
        : null;

    for (let d = 1; d <= total; d++) {
      const wd = weekdayNumber(new Date(Date.UTC(year, month - 1, d)));
      if (!dset.has(wd)) continue;
      const key = `${h.habitId}:${year}-${pad(month)}-${pad(d)}`;
      const item = {
        habitId: h.habitId,
        name: h.name,
        color,
        completed: entryMap[key],
        times,
      };
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(item);
    }
  }

  const isFutureDay = (d) => (isCurrentMonth && d > todayDate) || isFutureMonth;
  const isToday = (d) => isCurrentMonth && d === todayDate;

  const handlePillClick = async (e, item, d) => {
    e.stopPropagation();
    if (isFutureDay(d)) return; // días futuros bloqueados
    // Capturamos el botón y su posición ANTES del await (el evento se recicla).
    const btn = e.currentTarget;
    const gridRect = gridRef.current?.getBoundingClientRect();
    const rect = btn?.getBoundingClientRect();
    // Celebración optimista: se dispara al instante al pasar a completado.
    // Las piezas viven en el DOM (no en React), así que sobreviven al re-render
    // de la recarga silenciosa que hace toggle() detrás.
    if (item.completed !== true && rect && gridRect) {
      burstConfetti(
        gridRef.current,
        rect.left + rect.width / 2 - gridRect.left,
        rect.top + rect.height / 2 - gridRect.top,
        item.color
      );
      // Pequeño "pop" de la píldora (clase temporal, controlada por JS).
      btn.classList.add('mg-just-done');
      setTimeout(() => btn.classList.remove('mg-just-done'), 700);
    }
    await toggle(item.habitId, `${year}-${pad(month)}-${pad(d)}`, item.completed);
  };

  return (
    <section className="monthgrid-card card">
      {/* Cabecera: Lun…Dom */}
      <div className="mg-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w.value} className="mg-weekday">
            <span className="mg-weekday-short">{w.short}</span>
            <span className="mg-weekday-letter">{w.label}</span>
          </div>
        ))}
      </div>

      {/* Cuadrícula de días: 6 semanas × 7 columnas */}
      <div className="mg-grid" ref={gridRef}>
        {weeks.flat().map((cell, idx) => {
          if (!cell.inMonth) {
            return <div key={`x${idx}`} className="mg-cell mg-cell-out" aria-hidden="true" />;
          }
          const d = cell.day;
          const future = isFutureDay(d);
          const pills = byDay.get(d) || [];
          return (
            <div
              key={d}
              className={`mg-cell${future ? ' mg-future' : ''}${isToday(d) ? ' mg-today' : ''}`}
            >
              <span className="mg-daynum">{d}</span>
              <div className="mg-pills">
                {pills.map((item) => (
                  <button
                    key={item.habitId}
                    type="button"
                    className={`mg-pill${item.completed === true ? ' mg-done' : ''}${
                      item.completed === false ? ' mg-missed' : ''
                    }${future ? ' mg-pill-future' : ''}`}
                    style={
                      item.completed === true
                        ? undefined
                        : {
                            '--pill-color': item.color,
                            '--pill-bg': hexToRgba(item.color, 0.14),
                            '--pill-border': hexToRgba(item.color, 0.45),
                          }
                    }
                    onClick={(e) => handlePillClick(e, item, d)}
                    disabled={future}
                    title={
                      `${item.name}${item.times ? ` · ⏰ ${item.times}` : ''}` +
                      (item.completed === true
                        ? ' — completado ✓ (clic para desmarcar)'
                        : ' — clic para marcar como completado')
                    }
                    aria-pressed={item.completed === true}
                    aria-label={`${item.name} el día ${d}`}
                  >
                    <span className="mg-pill-dot" />
                    <span className="mg-pill-name">{item.name}</span>
                    {item.completed === true && <span className="mg-pill-check">✓</span>}
                    {item.completed === false && <span className="mg-pill-miss">✗</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {perHabit.length === 0 && (
        <p className="empty-text">No hay hábitos activos que mostrar.</p>
      )}
    </section>
  );
}
