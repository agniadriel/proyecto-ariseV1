

const mongoose = require('mongoose');
const { isSlotValid, normalizeHHMM } = require('../utils/dates');

const HABIT_CATEGORIES = ['académico', 'salud', 'personal', 'otro'];


const timeSlotSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: [true, 'Cada ventana requiere una hora de inicio'],
      trim: true,
    },
    end: {
      type: String,
      required: [true, 'Cada ventana requiere una hora de fin'],
      trim: true,
    },
  },
  { _id: false }
);

const habitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del hábito es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede superar los 100 caracteres'],
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId es obligatorio'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: {
        values: HABIT_CATEGORIES,
        message: 'Categoría inválida',
      },
      default: 'otro',
      index: true,
    },

    goalPerMonth: {
      type: Number,
      required: [true, 'La meta mensual es obligatoria'],
      min: [1, 'La meta mínima es 1 día'],
      max: [31, 'La meta máxima es 31 días'],
      default: 26,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    timeSlots: {
      type: [timeSlotSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 8 && value.every((slot) => isSlotValid(slot));
        },
        message: 'Ventanas de tiempo inválidas (revisa formato HH:MM).',
      },
    },

    daysOfWeek: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6, 7],
      validate: {
        validator(value) {
          if (!Array.isArray(value) || value.length === 0 || value.length > 7) return false;
          const set = new Set(value);
          return (
            set.size === value.length &&
            value.every((n) => Number.isInteger(n) && n >= 1 && n <= 7)
          );
        },
        message: 'daysOfWeek debe tener entre 1 y 7 días únicos (1=Lunes ... 7=Domingo).',
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);


habitSchema.pre('validate', function normalizeSlots() {
  if (Array.isArray(this.timeSlots)) {
    this.timeSlots = this.timeSlots
      .map((s) => ({ start: normalizeHHMM(s.start), end: normalizeHHMM(s.end) }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  if (Array.isArray(this.daysOfWeek)) {
    this.daysOfWeek = [...new Set(this.daysOfWeek.map(Number))]
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
      .sort((a, b) => a - b);
  }
});

module.exports = mongoose.model('Habit', habitSchema);