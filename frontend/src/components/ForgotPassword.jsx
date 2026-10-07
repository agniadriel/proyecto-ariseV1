// src/components/ForgotPassword.jsx
// Pantalla "olvidé mi contraseña": pide el email y envía el enlace de recuperación.
// En desarrollo (sin SMTP) el backend devuelve el enlace en la respuesta y lo mostramos.
// Tailwind responsivo sobre el tema oscuro del proyecto.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/client';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setSent(true);
      if (res?.dev?.resetUrl) setDevLink(res.dev.resetUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecerla."
      footer={
        <>
          <Link to="/login">← Volver a iniciar sesión</Link>
        </>
      }
    >
      {sent ? (
        <div className="flex flex-col gap-3 text-sm leading-relaxed">
          <p className="m-0">
            Si el email está registrado, recibirás un enlace de recuperación en unos minutos.
            Revisa también tu carpeta de spam.
          </p>
          {devLink && (
            <p className="m-0 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-2 text-xs break-all text-[var(--muted)]">
              <b>Modo desarrollo</b> (SMTP no configurado). Usa este enlace para probar:
              <br />
              <a href={devLink} className="text-[var(--accent)]">
                {devLink}
              </a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-2.5 py-2 text-[13px] text-[var(--danger)]">
              {error}
            </div>
          )}

          <div className="field">
            <span>Email de tu cuenta</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            className="btn primary mt-1 w-full px-3.5 py-2.5 text-sm sm:text-base"
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
