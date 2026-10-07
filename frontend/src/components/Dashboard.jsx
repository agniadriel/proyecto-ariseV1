import RingChart from './RingChart';
import HabitProgress from './HabitProgress';
import MonthGrid from './MonthGrid';

export default function Dashboard({
  data,
  loading,
  error,
  entryMap,
  toggle,
  month,
  year,
  onOpenManager,
}) {
  if (loading) return <div className="state center">⌛ Cargando datos…</div>;
  if (error)
    return (
      <div className="state error">
        <strong>No se pudo cargar el dashboard.</strong>
        <span>{error}</span>
        <small>
          Verifica que el backend esté corriendo en <code>localhost:4000</code> y que Mongo esté
          activo.
        </small>
      </div>
    );

  const d = data.dashboard;

  // Filtrar únicamente los hábitos activos del mes seleccionado
  const habits = (d.perHabit || []).filter((h) => h.active !== false);
  const conflicts = d.conflicts || [];
  const withoutSchedule = d.habitsWithoutSchedule || [];

  // CORRECCIÓN MATEMÁTICA DEFINITIVA: Suma y conversión a porcentaje real base 100
  const totalCompletados = habits.reduce((acc, h) => acc + (h.completedDays || 0), 0);
  const totalPosibles = habits.reduce((acc, h) => acc + (h.scheduledDays || 0), 0);
  const porcentajeReal = totalPosibles > 0 ? Math.round((totalCompletados / totalPosibles) * 100) : 0;

  return (
    <>
      {(conflicts.length > 0 || withoutSchedule.length > 0) && (
        <div className="alerts">
          {conflicts.length > 0 && (
            <div className="alert warn">
              <strong>⚠ Conflicto de horario:</strong>{' '}
              {conflicts
                .slice(0, 3)
                .map((c) => `${c.habitA} vs ${c.habitB} (${c.weekdayName} ${c.a})`)
                .join(' · ')}
              {conflicts.length > 3 ? ` … y ${conflicts.length - 3} más` : ''}
            </div>
          )}
          {withoutSchedule.length > 0 && (
            <div className="alert info">
              <strong>📌 Sin horario definido:</strong>{' '}
              {withoutSchedule.map((w) => w.name).join(', ')} — añade ventanas de tiempo en
              «Gestionar hábitos».
            </div>
          )}
        </div>
      )}

      <main className="dash-layout">
        {/* ---------- Sidebar izquierda ---------- */}
        <aside className="dash-side">
          <section className="card side-summary">
            {/* Se envía el porcentaje matemático corregido en vivo */}
            <RingChart percentage={porcentajeReal} value="Cumplimiento general" />
            <div className="stat-chips">
              <div className="chip">
                <b>{totalCompletados}</b>
                <span>completados</span>
              </div>
              <div className="chip">
                <b>{totalPosibles}</b>
                <span>programados</span>
              </div>
              <div className="chip">
                <b>{habits.length}</b>
                <span>hábitos</span>
              </div>
            </div>
            
            {/* Comparación analítica limpia basada en la métrica optimizada */}
            <div className={`cmp ${porcentajeReal >= (d.comparison?.previousMonth || 0) ? 'up' : 'down'}`}>
              vs. mes anterior:{' '}
              <b>
                {porcentajeReal >= (d.comparison?.previousMonth || 0) ? '▲' : '▼'}{' '}
                {Math.abs(Math.round(porcentajeReal - (d.comparison?.previousMonth || 0)))} pts
              </b>
              <span className="cmp-note">({d.comparison?.previousMonth ?? 0}% anterior)</span>
            </div>
          </section>

          <button
            type="button"
            className="btn primary side-manage"
            onClick={onOpenManager}
          >
            ＋ Gestionar hábitos
          </button>

          <section className="card side-habits">
            <h3 className="card-title">Mis hábitos</h3>
            <HabitProgress habits={habits} />
          </section>
        </aside>

        {/* ---------- Área principal: calendario mensual ---------- */}
        <section className="dash-main">
          <MonthGrid
            perHabit={habits}
            entryMap={entryMap}
            month={month}
            year={year}
            toggle={toggle}
          />
        </section>
      </main>
    </>
  );
}
