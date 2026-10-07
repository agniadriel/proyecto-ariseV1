const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const MAIL_FROM = process.env.MAIL_FROM || 'Habit Tracker <no-reply@habittracker.local>';

const useSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

/**
 * Envía un email. Con SMTP configurado usa el transporte real;
 * si no, lo registra en consola para poder probar el flujo en desarrollo.
 * @returns {Promise<{mode: 'smtp' | 'console'}>} modo usado (útil para logs/tests).
 */
async function sendMail({ to, subject, text, html }) {
  if (!useSmtp) {
    console.log('──────────────────────────────────────────────');
    console.log('📧 [MAILER·consola] SMTP no configurado; email simulado:');
    console.log(`   Para:   ${to}`);
    console.log(`   Asunto: ${subject}`);
    console.log(text);
    console.log('──────────────────────────────────────────────');
    return { mode: 'console' };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({ from: MAIL_FROM, to, subject, text, html });
  return { mode: 'smtp' };
}

module.exports = { sendMail, useSmtp };
