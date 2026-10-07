

const path = require('path');

// 1) Resolver módulos desde el node_modules del backend (seeds/ no tiene el suyo propio).
const backendRoot = path.join(__dirname, '..', 'backend');
require(require.resolve('dotenv', { paths: [backendRoot] })).config({
  path: path.join(backendRoot, '.env'),
});
const mongoose = require(require.resolve('mongoose', { paths: [backendRoot] }));

// 2) Cargar modelos y utilidades del backend.
const User = require(path.join(backendRoot, 'models', 'User.js'));
const Habit = require(path.join(backendRoot, 'models', 'Habit.js'));
const Entry = require(path.join(backendRoot, 'models', 'Entry.js'));
const DailySummary = require(path.join(backendRoot, 'models', 'DailySummary.js'));
const {
  daysInMonth,
  getMonthRange,
  getPrevMonth,
  getTodayUTC,
  dateKey,
  weekdayNumber,
} = require(path.join(backendRoot, 'utils', 'dates.js'));


const HABITS = [
  { name: 'Estudiar Modelado y Simulación', category: 'académico', goalPerMonth: 20, probability: 0.82, daysOfWeek: [1, 2, 3, 4, 5, 6, 7], timeSlots: [{ start: '18:00', end: '20:00' }] },
  { name: 'Completar tareas de la facultad', category: 'académico', goalPerMonth: 16, probability: 0.74, daysOfWeek: [1, 2, 3, 4, 5], timeSlots: [{ start: '16:00', end: '18:00' }] },
  { name: 'Leer 20 páginas', category: 'académico', goalPerMonth: 15, probability: 0.52, daysOfWeek: [1, 2, 3, 4, 5, 6, 7], timeSlots: [{ start: '21:00', end: '21:45' }, { start: '07:30', end: '08:00' }] },
  { name: 'Hacer ejercicio 30 min', category: 'salud', goalPerMonth: 18, probability: 0.66, daysOfWeek: [1, 2, 3, 4, 5], timeSlots: [{ start: '07:00', end: '07:30' }] },
  { name: 'Dormir 7–8 horas', category: 'salud', goalPerMonth: 26, probability: 0.88, daysOfWeek: [1, 2, 3, 4, 5, 6, 7], timeSlots: [{ start: '23:00', end: '23:30' }, { start: '06:30', end: '07:00' }] },
  { name: 'Meditar 10 min (sin pantallas)', category: 'personal', goalPerMonth: 12, probability: 0.41, daysOfWeek: [1, 2, 3, 4, 5, 6], timeSlots: [{ start: '20:30', end: '20:40' }] },
  { name: 'Planear la semana', category: 'personal', goalPerMonth: 8, probability: 0.35, daysOfWeek: [1], timeSlots: [{ start: '09:00', end: '09:30' }] },
];

const includePrev = process.argv.includes('--include-prev');

/** Genera entries para un mes dado (month 1-indexed), respetando daysOfWeek.
 *  lastDay inclusive: los días no programados (ej. fines de semana) no reciben entrada. */
async function generateEntriesForMonth(month, year, lastDay, insertedHabits) {
  const docs = [];
  for (let day = 1; day <= lastDay; day++) {
    const wd = weekdayNumber(new Date(Date.UTC(year, month - 1, day)));
    for (const h of insertedHabits) {
      const days = h.daysOfWeek && h.daysOfWeek.length ? h.daysOfWeek : [1, 2, 3, 4, 5, 6, 7];
      if (!days.includes(wd)) continue; // hoy no está en el calendario de este hábito
      const completed = Math.random() < h.probability;
      docs.push({
        habitId: h._id,
        date: new Date(Date.UTC(year, month - 1, day)), // medianoche UTC
        completed,
        notes: completed && Math.random() < 0.12 ? 'semana regular' : '',
      });
    }
  }
  await Entry.insertMany(docs);
  return docs;
}

/** Recalcula y hace upsert del DailySummary (por usuario) para cada día del rango. */
async function rebuildDailySummaries(insertedHabits, month, year, lastDay, owner) {
  const activeCount = insertedHabits.length;
  const ids = insertedHabits.map((h) => h._id);
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const agg = await Entry.aggregate([
      { $match: { habitId: { $in: ids }, date: { $gte: date, $lt: next } } },
      { $group: { _id: null, completed: { $sum: { $cond: ['$completed', 1, 0] } } } },
    ]);
    const completedHabits = agg[0]?.completed || 0;
    const percentage = activeCount > 0 ? Math.round((completedHabits / activeCount) * 100) : 0;
    await DailySummary.findOneAndUpdate(
      { date, userId: owner._id },
      { date, userId: owner._id, totalHabits: activeCount, completedHabits, percentage },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/habit-tracker';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`✅ Conectado a ${uri}`);

  // Los hábitos son POR USUARIO: se siembran para la cuenta indicada en
  // SEED_USER_EMAIL (o, en su defecto, la primera cuenta registrada).
  const owner =
    (process.env.SEED_USER_EMAIL
      ? await User.findOne({ email: process.env.SEED_USER_EMAIL.toLowerCase() })
      : null) || (await User.findOne().sort({ createdAt: 1 }));
  if (!owner) {
    throw new Error('No hay usuarios en la BD. Regístrate en la app y vuelve a ejecutar el seed (o define SEED_USER_EMAIL).');
  }
  console.log(`👤 Sembrando hábitos para: ${owner.name} <${owner.email}>`);

  // Limpiar para que sea reproducible (solo los datos del usuario dueño).
  await Promise.all([
    Habit.deleteMany({ userId: owner._id }),
    Entry.deleteMany({}), // las entries cuelgan de los hábitos sembrados
    DailySummary.deleteMany({ userId: owner._id }),
  ]);


  const insertedHabits = await Habit.insertMany(
    HABITS.map(({ probability, ...rest }) => ({ ...rest, userId: owner._id }))
  );
  // Emparejamos cada documento insertado con su probabilidad y días originales (mismo orden).
  const seeded = insertedHabits.map((doc, i) => ({
    _id: doc._id,
    probability: HABITS[i].probability,
    daysOfWeek: doc.daysOfWeek,
  }));
  console.log(`📌 Hábitos insertados: ${seeded.length}`);

  // Mes en curso: sembrar hasta hoy (no sembramos días futuros).
  const now = getTodayUTC();
  const curMonth = now.getUTCMonth() + 1;
  const curYear = now.getUTCFullYear();
  let curDocs = [];
  curDocs = await generateEntriesForMonth(curMonth, curYear, now.getUTCDate(), seeded);
  await rebuildDailySummaries(seeded, curMonth, curYear, now.getUTCDate(), owner);
  console.log(`📅 Entries del mes ${curMonth}/${curYear}: ${curDocs.length} (hasta hoy, día ${now.getUTCDate()})`);

  // Mes anterior (opcional): mes completo, para que la comparación del dashboard tenga datos.
  if (includePrev) {
    const prev = getPrevMonth(curMonth, curYear);
    const prevDocs = await generateEntriesForMonth(prev.month, prev.year, daysInMonth(prev.month, prev.year), seeded);
    await rebuildDailySummaries(seeded, prev.month, prev.year, daysInMonth(prev.month, prev.year), owner);
    console.log(`📅 Entries del mes ${prev.month}/${prev.year}: ${prevDocs.length} (mes completo)`);
  }

  const totalEntries = await Entry.countDocuments({ habitId: { $in: insertedHabits.map((h) => h._id) } });
  const completed = await Entry.countDocuments({ completed: true });
  console.log(`📊 Total entries: ${totalEntries} | cumplidos: ${completed} (${(completed / totalEntries * 100).toFixed(1)}%)`);

  console.log('✅ Seed completado.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en el seed:', err.message);
  process.exit(1);
});