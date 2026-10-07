
const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const Habit = require('../models/Habit');
const DailySummary = require('../models/DailySummary');
const { AppError } = require('../middleware/errorHandler');
const {
  parseMonthYear,
  getMonthRange,
  parseDateInput,
  getTodayUTC,
} = require('../utils/dates');


async function habitIdsOf(userId) {
  const docs = await Habit.find({ userId }, { _id: 1 });
  return docs.map((d) => d._id);
}


async function refreshDailySummary(date, userId) {
  const ids = await habitIdsOf(userId);
  const activeCount = await Habit.countDocuments({ _id: { $in: ids }, active: true });
  const [agg = {}] = await Entry.aggregate([
    { $match: { habitId: { $in: ids }, date: { $gte: date, $lt: new Date(date.getTime() + 86400000) } } },
    {
      $group: {
        _id: null,
        completed: { $sum: { $cond: ['$completed', 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);

  const completedHabits = agg.completed || 0;
  const percentage = activeCount > 0 ? Math.round((completedHabits / activeCount) * 100) : 0;

  const upsertSummary = () =>
    DailySummary.findOneAndUpdate(
      { date, userId },
      { date, userId, totalHabits: activeCount, completedHabits, percentage },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  try {
    await upsertSummary();
  } catch (err) {
    if (err.code === 11000) {
      await DailySummary.deleteMany({ date, userId });
      await upsertSummary();
    } else {
      throw err;
    }
  }
}

async function upsertEntry(req, res) {
  const { habitId, completed, notes } = req.body;

  if (!mongoose.isValidObjectId(habitId)) throw new AppError('habitId no es un ObjectId válido.', 400);
  if (typeof completed !== 'boolean') throw new AppError('completed debe ser true o false.', 400);


  const habit = await Habit.findOne({ _id: habitId, userId: req.user._id, deleted: { $ne: true } });
  if (!habit) throw new AppError('Hábito no encontrado.', 404);

  const date = parseDateInput(req.body.date);

  if (date.getTime() > getTodayUTC().getTime()) {
    throw new AppError('No se pueden marcar hábitos en días futuros.', 400);
  }

  let entry;
  try {
    entry = await Entry.findOneAndUpdate(
      { habitId, date },
      { $set: { completed, notes: notes || '' } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {

      entry = await Entry.findOneAndUpdate(
        { habitId, date },
        { $set: { completed, notes: notes || '' } },
        { new: true, runValidators: true }
      );
    } else {
      throw err;
    }
  }

  await refreshDailySummary(date, req.user._id);
  res.status(201).json({ success: true, data: entry, updated: !!entry.$isNew });
}

async function listMonthEntries(req, res) {
  const { month, year } = parseMonthYear(req.query.month, req.query.year);
  const { start, end } = getMonthRange(month, year);

  const entries = await Entry.find({ habitId: { $in: await habitIdsOf(req.user._id) }, date: { $gte: start, $lt: end } })
    .sort({ date: 1, habitId: 1 })
    .populate('habitId', 'name category goalPerMonth active');

  res.json({ success: true, month, year, count: entries.length, data: entries });
}


async function listDayEntries(req, res) {
  if (!req.query.date) throw new AppError('Se requiere date=YYYY-MM-DD si no se envían month y year.', 400);
  const date = parseDateInput(req.query.date);
  const entries = await Entry.find({ habitId: { $in: await habitIdsOf(req.user._id) }, date }).populate('habitId', 'name category active');
  res.json({ success: true, date: date.toISOString().slice(0, 10), count: entries.length, data: entries });
}

async function listTodayEntries(req, res) {
  const today = getTodayUTC();
  const entries = await Entry.find({ habitId: { $in: await habitIdsOf(req.user._id) }, date: today }).populate('habitId', 'name category active');
  res.json({ success: true, date: today.toISOString().slice(0, 10), count: entries.length, data: entries });
}

module.exports = { upsertEntry, listMonthEntries, listDayEntries, listTodayEntries };
