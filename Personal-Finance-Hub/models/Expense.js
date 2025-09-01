const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
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
  month: {
    type: String,
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
  tags: [String],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});


expenseSchema.index({ userId: 1, month: 1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
