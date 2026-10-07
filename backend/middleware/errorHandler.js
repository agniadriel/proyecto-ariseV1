
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}


function mongooseToStatus(err) {
  if (err.code === 11000) {
    
    return new AppError('Registro duplicado (este hábito ya tiene entrada ese día).', 409);
  }
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map((e) => e.message).join('; ');
    return new AppError(msg, 400);
  }
  if (err.name === 'CastError') {
    return new AppError('Identificador (Id) no válido.', 400);
  }
  if (err.name === 'MongoNetworkError' || /buffering|ECONNREFUSED|topology/.test(err.message)) {
    return new AppError('No se pudo conectar a la base de datos.', 503);
  }
  return err;
}


function notFound(req, res, next) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}


function errorHandler(err, req, res, next) {
  const mapped = err.isOperational ? err : mongooseToStatus(err);
  const status = mapped.statusCode || 500;
  if (status >= 500) console.error('💥 Error interno:', err);
  res.status(status).json({ success: false, error: mapped.message, status });
}

module.exports = { AppError, mongooseToStatus, notFound, errorHandler };