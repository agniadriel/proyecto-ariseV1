
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa-install-dismissed';

/** Detecta si ya se ejecuta como app instalada (display: standalone). */
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

export default function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault(); // evita el mini-infobar nativo de Chrome
      setDeferredEvent(e);
    }
    function onInstalled() {
      // Ya se instaló: limpiamos el estado del aviso.
      setDeferredEvent(null);
      localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const ua = window.navigator.userAgent || '';
    const isAppleMobile =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes('Mac') && 'ontouchend' in document);
    setIsIOS(isAppleMobile);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function handleInstallClick() {
    if (!deferredEvent) return;
    deferredEvent.prompt(); // muestra el diálogo nativo de instalación
    deferredEvent.userChoice.finally(() => setDeferredEvent(null));
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (dismissed || isStandalone()) return null;

  if (deferredEvent) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 shadow-[var(--shadow)] max-w-[calc(100vw-2rem)]">
        <span className="text-xs text-[var(--muted)] hidden sm:inline">
          Instala la app en tu dispositivo
        </span>
        <button
          type="button"
          onClick={handleInstallClick}
          className="btn primary small whitespace-nowrap"
        >
          ⬇ Instalar
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="btn ghost small"
          aria-label="No mostrar de nuevo"
        >
          ✕
        </button>
      </div>
    );
  }

  // iOS: pista manual (Safari no expone beforeinstallprompt).
  if (isIOS) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 shadow-[var(--shadow)] max-w-[calc(100vw-2rem)]">
        <span className="text-xs text-[var(--muted)]">
          iOS: Compartir <b>⎋</b> → “Añadir a pantalla de inicio”
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          className="btn ghost small"
          aria-label="No mostrar de nuevo"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
