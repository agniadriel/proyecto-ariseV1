// src/components/DashboardPage.jsx
// Vista principal del panel: barra superior (con cerrar sesión), navegación de mes,
// dashboard de progreso y gestor de hábitos. Está protegida por RequireAuth.

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useHabitReminders } from '../hooks/useHabitReminders';
import Dashboard from './Dashboard';
import HabitManager from './HabitManager';
import NotificationPermission from './NotificationPermission';

const now = new Date();
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function DashboardPage() {
  const { user, logout, userId } = useAuth();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [showManager, setShowManager] = useState(false);

  const { data, loading, error, entryMap, toggle, reload } = useDashboard(month, year);

  // Monitoreo de horarios: dispara notificaciones nativas 5 min antes y a la
  // hora exacta de inicio de cada hábito programado (vía Service Worker).
  useHabitReminders(data?.dashboard?.perHabit || [], userId);

  const goPrev = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Habit<span>Tracker</span>
        </div>
        {/* Tailwind: en móvil los controles fluyen en dos filas compactas;
            en sm+ se alinean en una sola fila. El botón de gestión vive ahora
            en el sidebar del Dashboard (estilo Google Calendar). */}
        <div className="topbar-right flex flex-wrap items-center gap-x-3 gap-y-2 max-sm:w-full max-sm:justify-between">
          <div className="month-nav max-sm:order-1">
            <button className="icon-btn" onClick={goPrev} aria-label="Mes anterior">‹</button>
            <span className="month-label">{MONTHS[month - 1]} {year}</span>
            <button className="icon-btn" onClick={goNext} aria-label="Mes siguiente">›</button>
          </div>
          {user && (
            <div className="user-menu flex items-center gap-2 max-sm:order-2">
              <span
                className="text-[13px] text-[var(--muted)] max-w-[140px] truncate"
                title={user.email}
              >
                {user.name}
              </span>
              <button className="btn ghost small" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <Dashboard
        data={data}
        loading={loading}
        error={error}
        entryMap={entryMap}
        toggle={toggle}
        month={month}
        year={year}
        onOpenManager={() => setShowManager(true)}
      />

      <HabitManager
        open={showManager}
        onClose={() => setShowManager(false)}
        onChanged={reload}
      />

      {/* Solicitud respetuosa del permiso de notificaciones (banner esquinado). */}
      <NotificationPermission />
    </div>
  );
}
