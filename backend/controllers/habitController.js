

const Habit = require('../models/Habit');
const Entry = require('../models/Entry');
const { AppError } = require('../middleware/errorHandler');
const { normalizeHHMM, isSlotValid } = require('../utils/dates');

const ALLOWED_UPDATE_FIELDS = ['name', 'category', 'goalPerMonth', 'active', 'timeSlots', 'daysOfWeek'];

/**

 * @throws {AppError} 400 si la entrada es inválida.
 */
function prepareTimeSlots(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new AppError('timeSlots debe ser un array de {start, end}.', 400);
  }
  const filled = input.filter(
    (s) => s && ((s.start && s.start.trim()) || (s.end && s.end.trim()))
  );
  if (filled.length === 0) return [];
  if (filled.some((s) => !s.start || !s.end)) {
    throw new AppError('Cada ventana de tiempo requiere una hora de inicio y una de fin.', 400);
  }
  let normalized;
  try {
    normalized = filled.map((s) => ({ start: normalizeHHMM(s.start), end: normalizeHHMM(s.end) }));
  } catch (e) {
    throw new AppError(e.message, 400);
  }
  
  if (normalized.some((s) => !isSlotValid(s))) {
    throw new AppError('Ventana de tiempo inválida: revisa el formato de las horas.', 400);
  }
  if (normalized.length > 8) {
    throw new AppError('Máximo 8 ventanas de tiempo por hábito.', 400);
  }
  return normalized.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Normaliza y valida los días de la semana (array 1=Lunes ... 7=Domingo).
 * Elimina duplicados e inválidos; exige al menos uno.
 * @throws {AppError} 400 si la entrada es inválida.
 */
function prepareDaysOfWeek(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    throw new AppError('daysOfWeek debe ser un array de números (1=Lunes ... 7=Domingo).', 400);
  }
  const clean = [...new Set(input.map(Number))]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
    .sort((a, b) => a - b);
  if (clean.length === 0) {
    throw new AppError('daysOfWeek debe incluir al menos un día (1=Lunes ... 7=Domingo).', 400);
  }
  return clean;
}

async function findOwnedHabit(habitId, userId) {
  if (!habitId) throw new AppError('Falta el id del hábito.', 400);
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw new AppError('Hábito no encontrado.', 404);
  return habit;
}


async function createHabit(req, res) {
  const { name, category, goalPerMonth, active, timeSlots, daysOfWeek } = req.body;
  if (!name || name.trim() === '') {
    throw new AppError('name es obligatorio.', 400);
  }
  const habit = await Habit.create({
    name: name.trim(),
    userId: req.user._id,
    category,
    goalPerMonth,
    active,
    timeSlots: prepareTimeSlots(timeSlots),
    daysOfWeek: prepareDaysOfWeek(daysOfWeek),
  });
  res.status(201).json({ success: true, data: habit });
}

async function listHabits(req, res) {
  // $ne: true en vez de false: tolera documentos antiguos sin el campo deleted.
  const habits = await Habit.find({ active: true, deleted: { $ne: true }, userId: req.user._id }).sort({ createdAt: 1, name: 1 });
  res.json({ success: true, count: habits.length, data: habits });
}

async function updateHabit(req, res) {
  const { id } = req.params;
  const habit = await findOwnedHabit(id, req.user._id);

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      habit[field] =
        field === 'timeSlots'
          ? prepareTimeSlots(req.body[field])
          : field === 'daysOfWeek'
            ? prepareDaysOfWeek(req.body[field])
            : req.body[field];
    }
  }
  await habit.save();
  res.json({ success: true, data: habit });
}

async function listAllHabits(req, res) {
  const habits = await Habit.find({ deleted: { $ne: true }, userId: req.user._id }).sort({ createdAt: 1, name: 1 });
  res.json({ success: true, count: habits.length, data: habits });
}

async function deleteHabit(req, res) {
  const { id } = req.params;
  const habit = await Habit.findOneAndUpdate(
    { _id: id, userId: req.user._id, deleted: { $ne: true } },
    { $set: { deleted: true, active: false } },
    { new: true }
  );
  if (!habit) throw new AppError('Hábito no encontrado.', 404);

  res.json({
    success: true,
    message: 'Hábito eliminado. Su historial se conserva para las estadísticas.',
    data: habit,
  });
}

module.exports = { createHabit, listHabits, updateHabit, listAllHabits, deleteHabit };
