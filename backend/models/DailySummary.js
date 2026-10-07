

const mongoose = require('mongoose');

const dailySummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId es obligatorio'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
    },
    totalHabits: {
      type: Number,
      required: true,
      min: 0,
    },
    completedHabits: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

dailySummarySchema.index({ date: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('DailySummary', dailySummarySchema);
