
const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: [true, 'habitId es obligatorio'],
    },
    date: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
    },
    completed: {
      type: Boolean,
      required: [true, 'El estado completed es obligatorio'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Las notas no pueden superar los 500 caracteres'],
      default: '',
    },
  },
  { timestamps: true }
);

entrySchema.index({ habitId: 1, date: 1 }, { unique: true });

entrySchema.index({ date: 1, completed: 1 });

module.exports = mongoose.model('Entry', entrySchema);