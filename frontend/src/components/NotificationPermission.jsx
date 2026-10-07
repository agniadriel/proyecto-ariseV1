import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa-notif-dismissed';
const OPTOUT_KEY = 'pwa-notif-optout';

export function notificationsSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/** Icono de campana (SVG inline: escala perfecta, sin desalinear el texto). */
function BellIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export default function NotificationPermission() {
  // Arranca oculto; el useEffect lo muestra si el permiso sigue pendiente de decisión.
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    if (!notificationsSupported()) return undefined;


    if (Notification.permission === 'default' && !localStorage.getItem(OPTOUT_KEY)) {
      if (!sessionStorage.getItem(DISMISS_KEY)) {
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
      return undefined;
    }

    // Permiso ya decidido: nos sincronizamos con cambios hechos desde el navegador.
    let sub = null;
    try {
      navigator.permissions
        ?.query({ name: 'notifications' })
        .then((s) => {
          sub = s;
          s.onchange = () => setPermission(Notification.permission);
        })
        .catch(() => {});
    } catch {
      /* Safari: sin Permissions API para notificaciones; no pasa nada. */
    }
    return () => {
      if (sub) sub.onchange = null;
    };
  }, []);

  // Escape cierra el modal (equivalente a "Más tarde") mientras esté visible.
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setVisible(false);
        sessionStorage.setItem(DISMISS_KEY, '1');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  async function handleAllow() {
    if (!notificationsSupported()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
    // El hook de recordatorios escucha esto para empezar a monitorear de inmediato.
    window.dispatchEvent(new Event('habit-notif-permission-changed'));
    if (result === 'granted') {
      // Confirmación inmediata: demuestra que el sistema de avisos funciona.
      navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification('¡Recordatorios activados! 🎉', {
            body: 'Te avisaremos 5 minutos antes de cada hábito. ¡Vamos con todo!',
            icon: '/pwa-192.png',
            badge: '/pwa-192.png',
            tag: 'reminders-enabled',
          })
        )
        .catch(() => {});
    }
  }

  function handleLater() {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }

  function handleOptOut() {
    localStorage.setItem(OPTOUT_KEY, '1');
    setVisible(false);
  }

  if (!notificationsSupported()) return null;

  // ---------- Modal de solicitud (decisión aún pendiente) ----------
  if (visible && Notification.permission === 'default') {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/60 px-4 pt-[10vh] backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-perm-title"
        onClick={handleLater}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera: campana en chip cian + título y descripción */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-400/40">
              <BellIcon className="h-6 w-6 text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="notif-perm-title"
                className="m-0 text-[15px] font-bold leading-snug text-slate-100"
              >
                ¿Te avisamos cuando toque cada hábito?
              </h2>
              <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-slate-400">
                Te enviaremos un recordatorio{' '}
                <b className="font-semibold text-slate-200">5 minutos antes</b> y a la hora
                exacta de inicio. Sin spam: solo tus hábitos, en tu dispositivo.
              </p>
            </div>
          </div>

          {/* Acciones: fila principal en desktop, columna táctil en móvil */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              autoFocus
              onClick={handleAllow}
              className="w-full cursor-pointer rounded-xl border-0 bg-cyan-400 px-4 py-2.5 text-[13px] font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 sm:flex-1"
            >
              Sí, permitir
            </button>
            <button
              type="button"
              onClick={handleLater}
              className="w-full cursor-pointer rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-[13px] font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 sm:w-auto"
            >
              Más tarde
            </button>
          </div>
          <button
            type="button"
            onClick={handleOptOut}
            className="mt-3 w-full cursor-pointer border-0 bg-transparent p-0 text-center text-[11px] text-slate-500 underline decoration-dotted underline-offset-2 transition hover:text-slate-300"
          >
            No volver a preguntar
          </button>
        </div>
      </div>
    );
  }

  // ---------- Permiso concedido: pastilla de estado discreta ----------
  if (permission === 'granted') {
    return (
      <div
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/95 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-lg shadow-black/40"
        title="Los recordatorios de hábitos están activos"
      >
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
          aria-hidden="true"
        />
        Recordatorios activos
      </div>
    );
  }

  return null;
}
