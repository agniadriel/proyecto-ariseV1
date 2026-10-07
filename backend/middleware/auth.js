

const { AppError } = require('./errorHandler');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');


async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('No autenticado: falta el token Bearer.', 401));
  }

  try {
    verifyToken(token);
  } catch {
    return next(new AppError('Token inválido o caducado. Inicia sesión de nuevo.', 401));
  }

  const payload = require('jsonwebtoken').decode(token);
  const user = await User.findById(payload?.sub);
  if (!user) {
    return next(new AppError('El usuario del token ya no existe.', 401));
  }

  req.user = user;
  return next();
}

module.exports = { requireAuth };
