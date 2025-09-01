const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
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
    required: true
  },
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  dayOfMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 31
  },
  reminderDays: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'Cash'
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { collection: 'recurringexpenses' });


recurringExpenseSchema.index({ userId: 1, nextDueDate: 1 });
recurringExpenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);