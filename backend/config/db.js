const mongoose = require('mongoose');

/**
 * Establece la conexión con la base de datos habit-tracker.
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/habit-tracker';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB conectado: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };