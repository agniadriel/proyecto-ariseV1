require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const entryRoutes = require('./routes/entryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors()); // permite al frontend (Vite en otro puerto) consumir la API
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime(), db: mongoose?.connection?.readyState === 1 ? 'connected' : 'unknown' });
});


app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/dashboard', dashboardRoutes);


app.use(notFound);
app.use(errorHandler);


const PORT = Number(process.env.PORT) || 4000;


require('./utils/jwt'); // valida la presencia de JWT_SECRET al arrancar


async function dropLegacyIndexes() {
  const summaries = mongoose.connection.db.collection('dailysummaries');
  const indexes = await summaries.indexes();
  const legacy = indexes.find((i) => i.name === 'date_1' && i.unique);
  if (legacy) {
    await summaries.dropIndex('date_1');
    console.log('🧹 Índice legacy {date: 1} de dailysummaries eliminado (causaba "Registro duplicado" entre usuarios)');
  }
}

async function start() {
  await connectDB();
  await dropLegacyIndexes();
  app.listen(PORT, () => {
    console.log(`🚀 API escuchando en http://localhost:${PORT}`);
  });
}

start();