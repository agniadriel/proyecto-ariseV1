// src/components/ResetPassword.jsx
// Pantalla a la que llega el usuario desde el enlace del email:
// /reset-password?token=... — pide la nueva contraseña dos veces.
// Tailwind responsivo sobre el tema oscuro del proyecto.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client';
import AuthLayout from './AuthLayout';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Falta el token de recuperación en el enlace. Solicita uno nuevo.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Elige una contraseña nueva para tu cuenta."
      footer={
        <>
          <Link to="/login">← Volver a iniciar sesión</Link>
        </>
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 text-sm">
          <p className="m-0">¡Contraseña restablecida!</p>
          <button
            type="button"
            className="btn primary px-3.5 py-2.5 text-sm"
            onClick={() => navigate('/login')}
          >
            Ir a iniciar sesión
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-2.5 py-2 text-[13px] text-[var(--danger)]">
              {error}
            </div>
          )}
          {!token && (
            <div className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-2.5 py-2 text-[13px] text-[var(--danger)]">
              El enlace no incluye el token. Solicita uno nuevo desde{' '}
              <Link to="/forgot-password" className="text-[var(--accent)]">
                Recuperar contraseña
              </Link>
              .
            </div>
          )}

          <div className="field">
            <span>Nueva contraseña (mínimo 8 caracteres)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="field">
            <span>Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="btn primary mt-1 w-full px-3.5 py-2.5 text-sm sm:text-base"
            disabled={submitting || !token}
          >
            {submitting ? 'Guardando…' : 'Restablecer contraseña'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
