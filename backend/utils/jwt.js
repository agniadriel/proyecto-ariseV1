const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  // Falla rápido: sin secreto los tokens serían falsificables.
  throw new Error('JWT_SECRET no está definido. Cópialo en backend/.env (ver .env.example).');
}

/**

 * @param {string} userId - id de MongoDB del usuario.
 * @returns {string} token firmado (payload: { sub: userId }).
 */
function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * @throws lanza si el token es inválido o caducó (lo captura el errorHandler).
 */
function verifyToken(token) {
  jwt.verify(token, JWT_SECRET); // valida firma y expiración
}

module.exports = { signToken, verifyToken };
