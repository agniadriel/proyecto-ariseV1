// src/components/HabitManager.jsx
// Modal para gestionar hábitos: crear, editar y pausar/reactivar/eliminar desde la UI.
// Trabaja con todos los hábitos (GET /habits/all) para mostrar también los pausados.
import { useEffect, useState, useCallback } from 'react';
import {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
} from '../api/client';
import { WEEKDAYS, ALL_DAYS, normalizeDays, formatDays } from '../utils/format';
import {
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  PERIOD_OPTIONS,
  parse24,
  to24,
  formatSlot,
  slotCrossesMidnight,
} from '../utils/time';

const CATEGORIES = ['académico', 'salud', 'personal', 'otro'];
const CATEGORY_COLORS = {
  académico: '#22d3ee',
  salud: '#34d399',
  personal: '#a78bfa',
  otro: '#fbbf24',
};
const EMPTY_FORM = {
  name: '',
  category: 'otro',
  goalPerMonth: 26,
  timeSlots: [{ start: '', end: '' }],
  daysOfWeek: [...ALL_DAYS],
};

export default function HabitManager({ open, onClose, onChanged }) {
  const [habits, setHabits] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadHabits = useCallback(async () => {
    try {
      const res = await getAllHabits();
      setHabits(res.data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      loadHabits();
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
  }, [open, loadHabits]);

  if (!open) return null;

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (h) => {
    setEditingId(h._id);
    // La BD guarda 'HH:MM' (24 h); el formulario edita en 12 h AM/PM.
    const slots =
      Array.isArray(h.timeSlots) && h.timeSlots.length > 0
        ? h.timeSlots.map((s) => ({ start: parse24(s.start), end: parse24(s.end) }))
        : [{ start: null, end: null }];
    setForm({
      name: h.name,
      category: h.category,
      goalPerMonth: h.goalPerMonth,
      daysOfWeek: normalizeDays(h.daysOfWeek),
      timeSlots: slots,
    });
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleDay = (value) =>
    setForm((f) => {
      const has = f.daysOfWeek.includes(value);
      if (has && f.daysOfWeek.length === 1) return f; // no vaciar el selector
      const next = has ? f.daysOfWeek.filter((d) => d !== value) : [...f.daysOfWeek, value];
      return { ...f, daysOfWeek: next.sort((a, b) => a - b) };
    });

  // Actualiza una parte (hour | minute | period) de una hora en formato 12 h.
  const setSlotTime = (index, key, part, value) =>
    setForm((f) => ({
      ...f,
      timeSlots: f.timeSlots.map((s, i) =>
        i === index
          ? {
              ...s,
              [key]: {
                ...(s[key] || { hour: '', minute: '', period: 'AM' }),
                [part]: value,
              },
            }
          : s
      ),
    }));
  const addSlot = () =>
    setForm((f) => ({ ...f, timeSlots: [...f.timeSlots, { start: '', end: '' }] }));
  const removeSlot = (index) =>
    setForm((f) => ({ ...f, timeSlots: f.timeSlots.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim() === '') {
      setError('El nombre es obligatorio.');
      return;
    }
    // Convierte {hour, minute, period} (12 h) → 'HH:MM' (24 h) para la API.
    // Si fin <= inicio el backend lo interpreta como ventana que cruza la medianoche.
    const timeSlots = [];
    for (const s of form.timeSlots) {
      const hasStart = Boolean(s.start?.hour && s.start?.minute);
      const hasEnd = Boolean(s.end?.hour && s.end?.minute);
      if (!hasStart && !hasEnd) continue; // fila sin usar
      if (!hasStart || !hasEnd) {
        setError('Completa la hora de inicio Y la de fin (o deja la fila vacía).');
        return;
      }
      const start = to24(s.start);
      const end = to24(s.end);
      if (!start || !end) {
        setError('Revisa las horas seleccionadas de las ventanas de tiempo.');
        return;
      }
      timeSlots.push({ start, end });
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      goalPerMonth: Number(form.goalPerMonth),
      timeSlots,
      daysOfWeek: normalizeDays(form.daysOfWeek),
    };
    setSaving(true);
    setError(null);
    try {
      if (editingId) await updateHabit(editingId, payload);
      else await createHabit(payload);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadHabits();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (h) => {
    try {
      await updateHabit(h._id, { active: !h.active });
      await loadHabits();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (h) => {
    if (
      !window.confirm(
        `¿Eliminar el hábito "${h.name}"?\n\nDesaparecerá del calendario, pero su historial de cumplimiento se conserva para no alterar las estadísticas de meses anteriores.`
      )
    )
      return;
    try {
      await deleteHabit(h._id);
      await loadHabits();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Gestionar hábitos</h2>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="admin-stats">
          <span>Activos: <b>{habits.filter((h) => h.active).length}</b></span>
          <span>Pausados: <b>{habits.filter((h) => !h.active).length}</b></span>
          <span>Total: <b>{habits.length}</b></span>
        </div>

        {error && <p className="admin-error">⚠ {error}</p>}

        <form className="habit-form" onSubmit={handleSubmit}>
          <h3 className="form-title">{editingId ? 'Editar hábito' : 'Nuevo hábito'}</h3>
          <div className="form-row">
            <label className="field grow">
              <span>Nombre</span>
              <input
                type="text"
                value={form.name}
                maxLength={100}
                placeholder="Ej: Estudiar Modelado y Simulación"
                onChange={(e) => setField('name', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Categoría</span>
              <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Meta (días/mes)</span>
              <input
                type="number"
                min={1}
                max={31}
                value={form.goalPerMonth}
                onChange={(e) => setField('goalPerMonth', e.target.value)}
              />
            </label>
            <div className="form-actions">
              {editingId && (
                <button type="button" className="btn ghost" onClick={startCreate}>
                  Cancelar edición
                </button>
              )}
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear hábito'}
              </button>
            </div>
          </div>

          {/* Ventanas de tiempo del día */}
          <div className="slots-section">
            <span className="form-title">Horario del día (opcional)</span>
            <div className="slots-list">
              {form.timeSlots.map((slot, i) => {
                const startStr = to24(slot.start);
                const endStr = to24(slot.end);
                const crosses =
                  startStr && endStr && slotCrossesMidnight({ start: startStr, end: endStr });
                return (
                  <div className="slot-row" key={i}>
                    {[
                      ['start', 'Inicio'],
                      ['end', 'Fin'],
                    ].map(([key, label]) => {
                      const t = slot[key];
                      return (
                        <label className="field" key={key}>
                          <span>{label}</span>
                          <span className="time-group">
                            <select
                              aria-label={`${label} - hora`}
                              value={t?.hour ?? ''}
                              onChange={(e) => setSlotTime(i, key, 'hour', e.target.value)}
                            >
                              <option value="" disabled>--</option>
                              {HOUR_OPTIONS.map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <span className="time-colon">:</span>
                            <select
                              aria-label={`${label} - minutos`}
                              value={t?.minute ?? ''}
                              onChange={(e) => setSlotTime(i, key, 'minute', e.target.value)}
                            >
                              <option value="" disabled>--</option>
                              {MINUTE_OPTIONS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select
                              aria-label={`${label} - AM/PM`}
                              value={t?.period ?? 'AM'}
                              onChange={(e) => setSlotTime(i, key, 'period', e.target.value)}
                            >
                              {PERIOD_OPTIONS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </span>
                        </label>
                      );
                    })}
                    {crosses && (
                      <span className="slot-cross" title="Este hábito termina al día siguiente">
                        +1 día
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn small danger slot-remove"
                      onClick={() => removeSlot(i)}
                      aria-label="Quitar ventana"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="slot-hint">
              Si la hora de fin es menor o igual a la de inicio, el hábito termina al día
              siguiente (por ejemplo, dormir de 11:12 PM a 6:00 AM).
            </p>
            <button type="button" className="btn small ok slot-add" onClick={addSlot}>
              ＋ Añadir ventana de tiempo
            </button>
          </div>

          {/* Días de la semana en que aplica */}
          <div className="slots-section">
            <span className="form-title">Días de la semana</span>
            <div className="day-picker">
              {WEEKDAYS.map((w) => {
                const active = form.daysOfWeek.includes(w.value);
                return (
                  <button
                    type="button"
                    key={w.value}
                    className={`day-chip ${active ? 'on' : ''}`}
                    title={w.full}
                    onClick={() => toggleDay(w.value)}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
            <p className="day-picker-hint">{formatDays(form.daysOfWeek)}</p>
          </div>
        </form>

        <div className="habit-admin-list">
          {loading && <p className="empty-text">Cargando hábitos…</p>}
          {!loading && habits.length === 0 && <p className="empty-text">No hay hábitos todavía.</p>}
          {!loading &&
            habits.map((h) => (
              <div className={`habit-admin ${h.active ? '' : 'paused'}`} key={h._id}>
                <span className="habit-dot" style={{ background: CATEGORY_COLORS[h.category] }} />
                <div className="habit-admin-info">
                  <span className="habit-admin-name">{h.name}</span>
                  <span className="habit-admin-meta">
                    {h.category} · meta {h.goalPerMonth} días/mes · días: {formatDays(h.daysOfWeek)}
                    {Array.isArray(h.timeSlots) && h.timeSlots.length > 0 && (
                      <> · ⏰ {h.timeSlots.map((s) => formatSlot(s)).join(', ')}</>
                    )}
                  </span>
                </div>
                <span className={`status-badge ${h.active ? 'on' : 'off'}`}>
                  {h.active ? 'Activo' : 'Pausado'}
                </span>
                <div className="habit-admin-actions">
                  <button className="btn small" onClick={() => startEdit(h)}>Editar</button>
                  <button
                    className={`btn small ${h.active ? 'warn' : 'ok'}`}
                    onClick={() => togglePause(h)}
                  >
                    {h.active ? 'Pausar' : 'Reactivar'}
                  </button>
                  <button className="btn small danger" onClick={() => remove(h)}>Eliminar</button>
                </div>
              </div>
            ))}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}