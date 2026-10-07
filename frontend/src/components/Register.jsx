// src/components/Register.jsx
// Pantalla de creación de cuenta. Tailwind responsivo: grid de campos apilados
// en móvil; en sm+ el nombre y el email comparten fila para aprovechar el ancho.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

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
      await register(name, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza a construir tus hábitos día a día."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-2.5 py-2 text-[13px] text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* flex en vez de grid: la clase Tailwind "grid" colisiona con la clase
            .grid del dashboard (grid-template-columns: 340px 1fr) y como esa regla
            del proyecto no está en una capa CSS, siempre gana — dejaba el Email en
            una columna de 0px desbordada. Con flex-row + flex-1 no hay colisión. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* min-w-0: permite que los campos encogan (los inputs tienen ancho
              intrínseco y sin esto desbordan la tarjeta en pantallas chicas). */}
          <div className="field min-w-0 flex-1">
            <span>Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              required
            />
          </div>

          <div className="field min-w-0 flex-1">
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
        </div>

        <div className="field">
          <span>Contraseña (mínimo 8 caracteres)</span>
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
          <span>Confirmar contraseña</span>
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
          disabled={submitting}
        >
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthLayout>
  );
}
