const Habit = require('../models/Habit');
const Entry = require('../models/Entry');
const {
  parseMonthYear,
  getMonthRange,
  getPrevMonth,
  getTodayUTC,
  daysInMonth,
  dateKey,
  weekdayNumber,
} = require('../utils/dates');


const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];


async function habitIdsOf(userId, opts = {}) {
  const filter = opts.historyPreserved ? { userId } : { userId, active: true, deleted: { $ne: true } };
  const docs = await Habit.find(filter, { _id: 1 });
  return docs.map((d) => d._id);
}

async function visibleScope(userId, year, month, isCurrent) {
  const endOfMonthUTC = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const historyFilter = {
    userId,
    $or: [{ active: false }, { deleted: true }],
    createdAt: { $lte: endOfMonthUTC },
  };
  const [current, history] = await Promise.all([
    Habit.find({ active: true, deleted: { $ne: true }, userId }).sort({ createdAt: 1 }),
    isCurrent ? Promise.resolve([]) : Habit.find(historyFilter).sort({ createdAt: 1 }),
  ]);
  return { habits: current, historyHabits: history };
}

function daySet(habit) {
  return new Set(
    Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0
      ? habit.daysOfWeek
      : ALL_DAYS
  );
}

function scheduledDaysInMonth(year, month, untilDay, set) {
  let n = 0;
  for (let day = 1; day <= untilDay; day++) {
    const wd = weekdayNumber(new Date(Date.UTC(year, month - 1, day)));
    if (set.has(wd)) n += 1;
  }
  return n;
}

function* monthDays(year, month, endDay) {
  for (let d = 1; d <= endDay; d++) yield new Date(Date.UTC(year, month - 1, d));
}


function findConflicts(habits) {
  const weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const byWeekday = new Map();

  for (const h of habits) {
    const set = daySet(h);
    const slots = h.timeSlots || [];
    for (const wd of set) {
      if (!byWeekday.has(wd)) byWeekday.set(wd, []);
      for (const s of slots) {
        byWeekday.get(wd).push({
          habitId: String(h._id),
          name: h.name,
          start: s.start,
          end: s.end,
        });
      }
    }
  }

  const conflicts = [];
  for (const [wd, items] of byWeekday) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.habitId === b.habitId) continue;
        
        if (a.start < b.end && b.start < a.end) {
          conflicts.push({
            weekday: wd,
            weekdayName: weekdayNames[wd - 1],
            habitA: a.name,
            habitB: b.name,
            a: `${a.start}–${a.end}`,
            b: `${b.start}–${b.end}`,
          });
        }
      }
    }
  }
  return conflicts;
}


function pct(part, total = 0) {
  return total > 0 ? Math.min(100, Math.round((part / total) * 1000) / 10) : 0;
}


async function countInRange(start, end, ids) {
  const rows = await Entry.aggregate([
    { $match: { habitId: { $in: ids }, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: ['$completed', 1, 0] } },
      },
    },
  ]);
  const r = rows[0] || {};
  return { totalEntries: r.total || 0, completed: r.completed || 0 };
}

async function completedDaysMap(start, end, ids) {
  const rows = await Entry.aggregate([
    { $match: { habitId: { $in: ids }, date: { $gte: start, $lt: end }, completed: true } },
    { $project: { habitId: 1, key: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } } },
    { $group: { _id: { habitId: '$habitId', key: '$key' } } },
  ]);
  const map = new Map();
  for (const row of rows) {
    const id = String(row._id.habitId);
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(row._id.key);
  }
  return map;
}


async function getDashboard(req, res) {
  try {
    const { month, year } = parseMonthYear(req.query.month, req.query.year);
    const { start, end } = getMonthRange(month, year);

    const today = getTodayUTC();
    const isCurrent = today.getUTCFullYear() === year && today.getUTCMonth() + 1 === month;
    const isFuture = !isCurrent && start.getTime() > today.getTime();
    
    // SOLUCIÓN AL BUG MATEMÁTICO:
    // Si es el mes en curso, evalúa hasta hoy. Si es pasado o futuro, evalúa los días totales del mes.
    const totalDaysInMonth = daysInMonth(month, year);
    const daysElapsed = isCurrent ? today.getUTCDate() : totalDaysInMonth;

    const ids = await habitIdsOf(req.user._id, { historyPreserved: !isCurrent && !isFuture });
    const { habits, historyHabits } = await visibleScope(req.user._id, year, month, isCurrent || isFuture);

    const scopeHabits = isCurrent ? habits : [...habits, ...historyHabits];
    
    // Calcula el total real de días programados para los hábitos en el rango de tiempo visible
    const scheduledTotal = scopeHabits.reduce(
      (acc, h) => acc + scheduledDaysInMonth(year, month, daysElapsed, daySet(h)),
      0
    );
    
    const gen = await countInRange(start, end, ids);
    
    const general = {
      totalPossible: scheduledTotal,
      completed: gen.completed,
      totalEntries: gen.totalEntries,
      percentage: pct(gen.completed, scheduledTotal), // Entrega el porcentaje exacto alineado al mes visible
    };

    const completedSet = await completedDaysMap(start, end, ids);
    const perHabitAgg = await Entry.aggregate([
      { $match: { habitId: { $in: ids }, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$habitId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
    ]);
    
    const statsById = new Map(perHabitAgg.map((r) => [String(r._id), r]));
    const perHabit = habits.map((h) => {
      const s = statsById.get(String(h._id)) || { total: 0, completed: 0 };
      const set = daySet(h);
      const scheduled = scheduledDaysInMonth(year, month, daysElapsed, set);

      // OPTIMIZACIÓN: Remoción limpia de la variable 'streak' (fuego) propensa a bugs analíticos
      return {
        habitId: h._id,
        name: h.name,
        category: h.category,
        goalPerMonth: h.goalPerMonth,
        timeSlots: h.timeSlots || [],
        daysOfWeek: set.size === 7 ? ALL_DAYS : [...set].sort((a, b) => a - b),
        scheduledDays: scheduled,
        totalDaysLogged: s.total,
        completedDays: s.completed,
        percentage: pct(s.completed, scheduled),
        active: true,
      };
    });

    if (!isCurrent) {
      for (const h of historyHabits) {
        const s = statsById.get(String(h._id)) || { total: 0, completed: 0 };
        const set = daySet(h);
        const scheduled = scheduledDaysInMonth(year, month, daysElapsed, set);

        perHabit.push({
          habitId: h._id,
          name: h.name,
          category: h.category,
          goalPerMonth: h.goalPerMonth,
          timeSlots: h.timeSlots || [],
          daysOfWeek: set.size === 7 ? ALL_DAYS : [...set].sort((a, b) => a - b),
          scheduledDays: scheduled,
          totalDaysLogged: s.total,
          completedDays: s.completed,
          percentage: pct(s.completed, scheduled),
          active: false,
        });
      }
    }

    const dailyAgg = isFuture
      ? []
      : await Entry.aggregate([
          { $match: { habitId: { $in: ids }, date: { $gte: start, $lt: end } } },
          { $project: { completed: 1, key: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } } },
          { $group: { _id: '$key', completed: { $sum: { $cond: ['$completed', 1, 0] } }, total: { $sum: 1 } } },
        ]);
        
    const dailyMap = new Map(dailyAgg.map((r) => [r._id, r]));
    const daily = [];
    
    for (const day of monthDays(year, month, daysElapsed)) {
      const wd = weekdayNumber(day);
      const scheduledThatDay = scopeHabits.reduce((c, h) => c + (daySet(h).has(wd) ? 1 : 0), 0);
      const r = dailyMap.get(dateKey(day)) || { completed: 0 };
      daily.push({
        date: dateKey(day),
        completed: r.completed,
        percentage: pct(r.completed, scheduledThatDay),
      });
    }

    // Bloque de analítica comparativa con el mes anterior
    const prev = getPrevMonth(month, year);
    const prevRange = getMonthRange(prev.month, prev.year);
    const prevDays = daysInMonth(prev.month, prev.year);

    const { historyHabits: prevHistory } = await visibleScope(req.user._id, prev.year, prev.month, false);
    const prevScheduled = [...habits, ...prevHistory].reduce(
      (acc, h) => acc + scheduledDaysInMonth(prev.year, prev.month, prevDays, daySet(h)),
      0
    );

    const prevIds = await habitIdsOf(req.user._id, { historyPreserved: true });
    const prevGen = await countInRange(prevRange.start, prevRange.end, prevIds);
    const previousPct = pct(prevGen.completed, prevScheduled);
    
    const comparison = {
      currentMonth: general.percentage,
      previousMonth: previousPct,
      delta: Math.round((general.percentage - previousPct) * 10) / 10,
      note: isFuture
        ? 'Mes futuro: todavía no hay registros.'
        : isCurrent
          ? 'El mes actual está en curso; la comparación es parcial y no literal con el mes completo anterior.'
          : 'Mes cerrado.',
    };

    const conflicts = findConflicts(habits);
    const habitsWithoutSchedule = habits
      .filter((h) => !h.timeSlots || h.timeSlots.length === 0)

    .map((h) => ({ habitId: h._id, name: h.name }));

    // Retorna la respuesta HTTP estructurada en JSON limpia para el Frontend PWA
    res.json({
      success: true,
      month,
      year,
      isCurrent,
      user: { id: req.user._id, name: req.user.name, email: req.user.email },
      general,
      perHabit,
      daily,
      comparison,
      conflicts,
      habitsWithoutSchedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno en el servidor analítico.', error: error.message });
  }
}

module.exports = { getDashboard };
