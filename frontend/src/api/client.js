

const BASE = '/api';
const TOKEN_KEY = 'habit_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}


const USER_SCOPED_KEYS = [
  'habit_token', // JWT de sesión
  'pwa-notif-dismissed', // aviso de permisos: decisión por usuario
  'pwa-notif-optout', // "no volver a preguntar": decisión por usuario
];

const USER_SCOPED_PREFIXES = [
  'habit-notif-sent:', // marcas anti-duplicado de recordatorios (por usuario+fecha)
];


export function clearUserStorage() {
  const stores = [localStorage, sessionStorage];
  for (const store of stores) {
    try {
      USER_SCOPED_KEYS.forEach((k) => store.removeItem(k));
      const doomed = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && USER_SCOPED_PREFIXES.some((p) => k.startsWith(p))) doomed.push(k);
      }
      doomed.forEach((k) => store.removeItem(k));
    } catch {
      /* almacenamiento no disponible (modo privado): nada que limpiar */
    }
  }
}

export function userKey(userId, key) {
  if (!userId) return null;
  return `${key}:${userId}`;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    let status = res.status;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
      if (body && typeof body.status === 'number') status = body.status;
    } catch {
      /* cuerpo no-JSON: usamos el mensaje genérico */
    }
    const err = new Error(message);
    err.status = status;
    throw err;
  }
  return res.json();
}


export const register = (payload) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });

export const login = (payload) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });

export const forgotPassword = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });

export const resetPassword = (token, password) =>
  request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });

export const getMe = () => request('/auth/me');


export const getHabits = () => request('/habits');

export const getAllHabits = () => request('/habits/all');

export const createHabit = (payload) =>
  request('/habits', { method: 'POST', body: JSON.stringify(payload) });

export const updateHabit = (id, payload) =>
  request(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteHabit = (id) =>
  request(`/habits/${id}`, { method: 'DELETE' });

export const getDashboard = (month, year) =>
  request(`/dashboard?month=${month}&year=${year}`);

export const getEntries = (month, year) =>
  request(`/entries?month=${month}&year=${year}`);

export const upsertEntry = (habitId, date, completed) =>
  request('/entries', {
    method: 'POST',
    body: JSON.stringify({ habitId, date, completed }),
  });
