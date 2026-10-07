// src/components/AuthLayout.jsx
// Layout compartido por Login / Registro / Recuperar / Restablecer.
// Tailwind responsivo (sm:/md:/lg:) sobre el tema oscuro del proyecto.
// También monta el aviso discreto de instalación de la PWA.

import { Link } from 'react-router-dom';
import InstallPrompt from './InstallPrompt';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--panel)] to-[var(--bg-soft)] shadow-[var(--shadow)] px-6 py-7 sm:px-7 sm:py-8">
        <div className="brand mb-4">
          <span className="brand-dot" />
          Habit<span>Tracker</span>
        </div>

        <h1 className="mt-0 mb-1.5 text-xl sm:text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0 mb-5 text-[13px] text-[var(--muted)]">{subtitle}</p>}

        {children}

        {footer && (
          <div className="mt-4 text-[13px] text-[var(--muted)] text-center [&_a]:text-[var(--accent)] [&_a]:font-semibold [&_a]:no-underline hover:[&_a]:underline">
            {footer}
          </div>
        )}
      </div>

      <InstallPrompt />
    </div>
  );
}
