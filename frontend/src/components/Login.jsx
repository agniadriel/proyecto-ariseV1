// src/components/Login.jsx
// Pantalla de inicio de sesión. Tailwind responsivo: campos y botón a ancho
// completo en móvil, tipografía y espaciado crecen en sm:/md:.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Entra para ver tu progreso de hábitos."
      footer={
        <>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          {' · '}
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-2.5 py-2 text-[13px] text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="btn primary mt-1 w-full px-3.5 py-2.5 text-sm sm:text-base"
          disabled={submitting}
        >
          {submitting ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthLayout>
  );
}
