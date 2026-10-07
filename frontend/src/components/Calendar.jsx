// src/components/Calendar.jsx
// Vista de calendario mensual: filas = hábitos, columnas = días del mes.
// - Cabecera muestra número + inicial del día de la semana.
// - Días no programados del hábito (según daysOfWeek) se muestran "—" y bloqueados.
// - Tooltip (title) en cada casilla muestra el horario del hábito ese día.
// - Clic marca/desmarca (upsert del backend). Los días futuros están deshabilitados.
import { WEEKDAYS, weekdayNumber, normalizeDays } from '../utils/format';
import { formatSlot } from '../utils/time';

const pad = (n) => String(n).padStart(2, '0');

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export default function Calendar({ perHabit = [], entryMap = {}, month, year, toggle }) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isCurrentMonth = year === todayUTC.getUTCFullYear() && month === todayUTC.getUTCMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const todayDate = now.getUTCDate();

  // Conjunto de días de la semana por hábito (para saber si un día aplica).
  const daySets = new Map(
    perHabit.map((h) => [String(h.habitId), new Set(normalizeDays(h.daysOfWeek))])
  );

  const handleClick = async (habitId, dateKey, completed, scheduled) => {
    if (!scheduled) return;
    if (isCurrentMonth && dateKey > todayDate) return; // días futuros bloqueados
    await toggle(habitId, dateKey, completed);
  };

  return (
    <section className="card calendar-card">
      <h3 className="card-title">Calendario mensual</h3>
      {perHabit.length === 0 ? (
        <p className="empty-text">No hay hábitos activos que mostrar.</p>
      ) : (
        <div className="calendar-scroll">
          <table className="calendar">
            <thead>
              <tr>
                <th className="cal-habit hidden-sm">Hábito</th>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                  const wInfo = WEEKDAYS.find(
                    (w) => w.value === weekdayNumber(new Date(Date.UTC(year, month - 1, d)))
                  );
                  return (
                    <th
                      key={d}
                      className={`cal-head ${d === todayDate && isCurrentMonth ? 'today' : ''}`}
                    >
                      <span className="cal-daynum">{d}</span>
                      <span className="cal-weekday">{wInfo?.label}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {perHabit.map((h) => {
                const dset = daySets.get(String(h.habitId)) || new Set(normalizeDays([]));
                const times =
                  Array.isArray(h.timeSlots) && h.timeSlots.length > 0
                    ? h.timeSlots.map((s) => formatSlot(s)).join(', ')
                    : null;
                return (
                  <tr key={h.habitId}>
                    <td className="cal-habit" title={h.name}>
                      <span className="cal-habit-name">{h.name}</span>
                    </td>
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                      const dateKeyFull = `${year}-${pad(month)}-${pad(d)}`;
                      const key = `${h.habitId}:${dateKeyFull}`;
                      const completed = entryMap[key];
                      const scheduled = dset.has(
                        weekdayNumber(new Date(Date.UTC(year, month - 1, d)))
                      );
                      const isFuture = isCurrentMonth && d > todayDate;
                      const isToday = isCurrentMonth && d === todayDate;
                      const cls = [
                        'cal-cell',
                        scheduled ? '' : 'off',
                        isFuture ? 'future' : '',
                        completed === true ? 'done' : '',
                        completed === false ? 'missed' : '',
                        isToday ? 'today-ring' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      const tip = scheduled
                        ? `${h.name}${times ? ` · ⏰ ${times}` : ''}`
                        : `${h.name} · no programado`;
                      return (
                        <td key={d}>
                          <button
                            type="button"
                            className={cls}
                            disabled={isFuture || !scheduled}
                            onClick={() => handleClick(h.habitId, dateKeyFull, completed, scheduled)}
                            title={tip}
                            aria-label={`${h.name} día ${d} (${scheduled ? 'programado' : 'no programado'})`}
                          >
                            {!scheduled ? '—' : completed === true ? '✅' : completed === false ? '❌' : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="cal-hint">
        Toca una casilla para marcar/desmarcar. Los días «—» no están programados para ese hábito y los futuros están bloqueados.
      </p>
    </section>
  );
}