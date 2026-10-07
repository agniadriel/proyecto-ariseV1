

const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { AppError } = require('../middleware/errorHandler');
const { signToken } = require('../utils/jwt');
const { sendMail, useSmtp } = require('../config/mailer');


function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt };
}


async function register(req, res) {
  const { name, email, password } = req.body || {};

  if (!name || !name.trim()) throw new AppError('name es obligatorio.', 400);
  if (!email || !email.trim()) throw new AppError('email es obligatorio.', 400);
  if (!password) throw new AppError('password es obligatoria.', 400);
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres.', 400);
  }

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw new AppError('Ese email ya está registrado.', 409);

  const user = await User.create({ name: name.trim(), email: email.trim(), password });

  res.status(201).json({
    success: true,
    message: 'Cuenta creada correctamente.',
    data: { user: toPublicUser(user), token: signToken(user._id.toString()) },
  });
}


async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError('email y password son obligatorios.', 400);
  }


  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Credenciales incorrectas.', 401);
  }

  res.json({
    success: true,
    message: 'Sesión iniciada.',
    data: { user: toPublicUser(user), token: signToken(user._id.toString()) },
  });
}


async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email || !email.trim()) throw new AppError('email es obligatorio.', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  let devHint;
  if (user) {
    const { token, ttlMinutes } = await PasswordResetToken.createForUser(user._id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: 'Recupera tu contraseña — Habit Tracker',
      text: [
        `Hola ${user.name},`,
        '',
        'Recibimos una solicitud para restablecer tu contraseña.',
        `Abre este enlace (caduca en ${ttlMinutes} minutos y funciona una sola vez):`,
        resetUrl,
        '',
        'Si no fuiste tú, ignora este mensaje y tu contraseña seguirá igual.',
      ].join('\n'),
      html: `<p>Hola <b>${user.name}</b>,</p>
             <p>Recibimos una solicitud para restablecer tu contraseña.</p>
             <p><a href="${resetUrl}">Restablecer contraseña</a></p>
             <p style="color:#94a3b8">El enlace caduca en ${ttlMinutes} minutos y funciona una sola vez.
             Si no fuiste tú, ignora este mensaje.</p>`,
    });

    
    if (!useSmtp) devHint = { resetUrl, ttlMinutes };
  }

  res.json({
    success: true,
    message: 'Si el email está registrado, recibirás un enlace para restablecer la contraseña.',
    ...(devHint ? { dev: devHint } : {}),
  });
}

async function resetPassword(req, res) {
  const { token, password } = req.body || {};

  if (!token) throw new AppError('token es obligatorio.', 400);
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new AppError('La nueva contraseña debe tener al menos 8 caracteres.', 400);
  }

  const userId = await PasswordResetToken.validateToken(token);

  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('El usuario de este enlace ya no existe.', 404);

  user.password = password;
  await user.save();

  await PasswordResetToken.markUsed(token);

  res.json({
    success: true,
    message: 'Contraseña restablecida. Ya puedes iniciar sesión con la nueva.',
  });
}


async function me(req, res) {
  res.json({ success: true, data: { user: toPublicUser(req.user) } });
}

module.exports = { register, login, forgotPassword, resetPassword, me };
