const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['salary', 'freelance', 'business', 'investment', 'rental', 'bonus', 'gift', 'other'],
    required: true
  },
  frequency: {
    type: String,
    enum: ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'one-time'
  },
  date: {
    type: Date,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  nextExpectedDate: {
    type: Date
  },
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  taxable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


incomeSchema.index({ userId: 1, date: 1 });
incomeSchema.index({ userId: 1, category: 1 });
incomeSchema.index({ userId: 1, frequency: 1 });

module.exports = mongoose.model('Income', incomeSchema);
