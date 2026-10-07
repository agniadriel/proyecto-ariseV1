// src/components/HabitProgress.jsx
// Barras de progreso por hábito individual (cumplimiento del mes) + racha actual.
import { formatDays } from '../utils/format';
import { formatSlot } from '../utils/time';

const CATEGORY_COLORS = {
  académico: '#22d3ee',
  salud: '#34d399',
  personal: '#a78bfa',
  otro: '#fbbf24',
};

export default function HabitProgress({ habits = [] }) {
  return (
    <div className="habit-list">
      {habits.length === 0 && <p className="empty-text">Sin hábitos activos.</p>}
      {habits.map((h) => {
        const color = CATEGORY_COLORS[h.category] || '#22d3ee';
        const pct = Math.round(h.percentage * 10) / 10;
        return (
          <div className="habit-row" key={h.habitId}>
            <div className="habit-head">
              <span className="habit-dot" style={{ background: color }} />
              <span className="habit-name">{h.name}</span>
              <span className={`streak-badge ${h.streak > 0 ? 'on' : 'off'}`}>
                🔥 {h.streak}
              </span>
              <span className="habit-value">{pct}%</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <div className="habit-meta">
              <span>{h.completedDays} de {h.scheduledDays} programados</span>
              <span>meta {h.goalPerMonth} días/mes</span>
            </div>
            {Array.isArray(h.timeSlots) && h.timeSlots.length > 0 && (
              <div className="habit-slots" title="Ventanas de tiempo diarias">
                ⏰ {h.timeSlots.map((s) => formatSlot(s)).join(' · ')}
              </div>
            )}
            <div className="habit-slots" title="Días de la semana en que aplica">
              📅 {formatDays(h.daysOfWeek)}
            </div>
          </div>
        );
      })}
    </div>
  );
}