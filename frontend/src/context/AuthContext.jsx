// src/context/AuthContext.jsx
// Contexto global de sesión: guarda el usuario y el token, los persiste en
// localStorage y expone login / register / logout para toda la app.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Al arrancar: si hay token guardado, validamos con /auth/me.
  // Si el token caducó o fue revocado, limpiamos la sesión.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!api.getToken()) {
        setInitializing(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (!cancelled) setUser(res.data.user);
      } catch (e) {
        if (!cancelled && e.status === 401) api.setToken(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      async login(email, password) {
        const res = await api.login({ email, password });
        api.setToken(res.data.token);
        setUser(res.data.user);
        return res.data.user;
      },
      async register(name, email, password) {
        const res = await api.register({ name, email, password });
        api.setToken(res.data.token);
        setUser(res.data.user);
        return res.data.user;
      },
      /** Id del usuario activo (para claves de almacenamiento por usuario). */
      userId: user?.id ?? null,
      logout() {
        // Limpieza TOTAL del almacenamiento local del usuario: token, decisiones
        // de notificaciones y marcas de recordatorios. Así, al cambiar de cuenta
        // en el mismo navegador, el siguiente usuario no hereda ningún dato.
        api.clearUserStorage();
        setUser(null);
      },
    }),
    [user, initializing, user?.id]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
