
const mongoose = require('mongoose');
const crypto = require('crypto');
const { AppError } = require('../middleware/errorHandler');

const TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 15);

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 300 });

passwordResetTokenSchema.statics.createForUser = async function createForUser(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = PasswordResetToken.hashToken(token);
  await PasswordResetToken.deleteMany({ userId });
  await PasswordResetToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
  });
  return { token, ttlMinutes: TOKEN_TTL_MINUTES };
};


passwordResetTokenSchema.statics.hashToken = function hashToken(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
};

/**
 * Valida un token plano recibido del email: existe, no usado y no caducado.
 * @returns {Promise<string>} el userId dueño del token.
 * @throws {AppError} 400 si el token es inválido, caducó o ya se usó.
 */
passwordResetTokenSchema.statics.validateToken = async function validateToken(plainToken) {
  const doc = await PasswordResetToken.findOne({ tokenHash: PasswordResetToken.hashToken(plainToken) });
  if (!doc) throw new AppError('Token de recuperación inválido.', 400);
  if (doc.usedAt) throw new AppError('Este enlace de recuperación ya fue utilizado.', 400);
  if (doc.expiresAt.getTime() < Date.now()) {
    throw new AppError('El enlace de recuperación ha caducado. Solicita uno nuevo.', 400);
  }
  return doc.userId.toString();
};

passwordResetTokenSchema.statics.markUsed = async function markUsed(plainToken) {
  await PasswordResetToken.updateOne(
    { tokenHash: PasswordResetToken.hashToken(plainToken) },
    { $set: { usedAt: new Date() } }
  );
};

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

module.exports = PasswordResetToken;
