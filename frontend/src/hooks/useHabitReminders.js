
import { useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 30 * 1000; // frecuencia de revisión
const LEAD_MS = 5 * 60 * 1000; // aviso 5 minutos antes del inicio

const DUE_WINDOW_MS = 90 * 1000;
const SENT_PREFIX = 'habit-notif-sent:'; // marcas anti-duplicado en localStorage
const SENT_TTL_MS = 24 * 60 * 60 * 1000; // limpieza de marcas de más de un día


const MOTIVATIONAL_MESSAGES = [
  '¡Tu futuro te está esperando! 💪',
  'Un pequeño paso hoy, un gran cambio mañana. 🚀',
  'La disciplina es el puente entre tus metas y tus logros. 🌟',
  '¡Tú controlas tu día, no al revés! 🔥',
  'Cada intento cuenta: ¡dale con todo! ✨',
  'Los grandes resultados nacen de hábitos pequeños. 🏆',
  'Tu yo del futuro te agradece. ¡Vamos! 💙',
];


function hhmmToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}


function localDateKey(now) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}


function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

function pickMessage(seed) {
  return MOTIVATIONAL_MESSAGES[Math.abs(seed) % MOTIVATIONAL_MESSAGES.length];
}

function wasSent(key) {
  try {
    return localStorage.getItem(SENT_PREFIX + key) != null;
  } catch {
    return false;
  }
}

function markSent(key) {
  try {
    localStorage.setItem(SENT_PREFIX + key, String(Date.now()));
  } catch {
    /* modo privado: sin persistencia, el intervalo no duplicará en la misma sesión */
  }
}

function pruneSentMarks(nowMs) {
  try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(SENT_PREFIX)) continue;
      const ts = Number(localStorage.getItem(k));
      if (!Number.isFinite(ts) || nowMs - ts > SENT_TTL_MS) stale.push(k);
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage no disponible */
  }
}


async function showNativeNotification({ title, body, tag }) {
  const opts = {
    body,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag, // misma tag reemplaza la notificación anterior (sin duplicados visuales)
    data: { url: '/dashboard' },
  };
  try {
    const reg = await navigator.serviceWorker.ready;
    // Vía estándar: registration.showNotification (la que usa el SW para responder).
    if (typeof reg.showNotification === 'function') {
      await reg.showNotification(title, opts);
      return true;
    }
    // Fallback no estándar: showNotification expuesto en el worker activo.
    const sw = reg.active || reg.waiting || reg.installing;
    if (sw && typeof sw.showNotification === 'function') {
      await sw.showNotification(title, opts);
      return true;
    }
    // Último recurso (SW aún inicializando): notificación desde la página.
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, opts);
      return true;
    }
  } catch {
    /* navegador o SO lo bloqueó: silencioso */
  }
  return false;
}

export function useHabitReminders(perHabit = [], userId = null) {
  // Refs para leer la lista y el usuario más recientes sin reiniciar el intervalo.
  const perHabitRef = useRef(perHabit);
  perHabitRef.current = perHabit;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return undefined;

    let disposed = false;

    async function checkReminders() {
      if (disposed) return;
      if (Notification.permission !== 'granted') return; // aún sin permiso

      const now = new Date();
      pruneSentMarks(now.getTime());

      // Hora local del dispositivo (no UTC): los timeSlots son horario local.
      const localWd = now.getDay() === 0 ? 7 : now.getDay(); // 1=Lun … 7=Dom
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      const nowMs = now.getTime() - midnight.getTime(); // ms desde medianoche local
      const dateKey = localDateKey(now);

      for (const habit of perHabitRef.current) {
        const days =
          Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0
            ? habit.daysOfWeek
            : [1, 2, 3, 4, 5, 6, 7];
        if (!days.includes(localWd)) continue;

        const slots = Array.isArray(habit.timeSlots) ? habit.timeSlots : [];
        for (const slot of slots) {
          const startMin = hhmmToMinutes(slot && slot.start);
          if (startMin == null) continue;
          const startMs = startMin * 60 * 1000;
          const preMs = startMs - LEAD_MS;


          if (nowMs >= preMs && nowMs <= preMs + DUE_WINDOW_MS) {
            await fire(habit, slot, 'pre', dateKey);
          }
          // "start": hora exacta (+ ventana de tolerancia).
          if (nowMs >= startMs && nowMs <= startMs + DUE_WINDOW_MS) {
            await fire(habit, slot, 'start', dateKey);
          }
        }
      }
    }

    async function fire(habit, slot, type, dateKey) {

      const uid = userIdRef.current;
      const dedupeKey = `${uid ? `${uid}:` : ''}${habit.habitId}:${dateKey}:${type}`;
      if (wasSent(dedupeKey)) return;
      markSent(dedupeKey); // se marca ANTES de disparar para evitar carreras

      const title =
        type === 'pre'
          ? `⏰ En 5 minutos: ${habit.name}`
          : `🚀 ¡Es la hora! ${habit.name}`;
      const when =
        type === 'pre'
          ? `Empieza a las ${slot.start}. `
          : `Tu hábito te espera (${slot.start}${slot.end ? `–${slot.end}` : ''}). `;
      const body = when + pickMessage(hashSeed(dedupeKey));

      await showNativeNotification({
        title,
        body,
        tag: `habit-${habit.habitId}-${dateKey}-${type}`,
      });
    }


    const onVisible = () => {
      if (document.visibilityState === 'visible') checkReminders();
    };
    const onPermissionChanged = () => checkReminders();

    checkReminders();
    const intervalId = setInterval(checkReminders, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('habit-notif-permission-changed', onPermissionChanged);

    return () => {
      disposed = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('habit-notif-permission-changed', onPermissionChanged);
    };
  }, []);
}
