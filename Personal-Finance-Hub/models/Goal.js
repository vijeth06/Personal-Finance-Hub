const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['savings', 'debt_payoff', 'emergency_fund', 'investment', 'purchase', 'other'],
    required: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    default: 'Other'
  },
  icon: {
    type: String,
    default: '🎯'
  },
  color: {
    type: String,
    default: '#10b981'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  milestones: [{
    amount: Number,
    date: Date,
    description: String,
    achieved: { type: Boolean, default: false },
    achievedAt: Date
  }],
  autoContribution: {
    enabled: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    frequency: { type: String, enum: ['weekly', 'bi-weekly', 'monthly'], default: 'monthly' }
  },
  linkedAccounts: [{
    accountName: String,
    accountType: { type: String, enum: ['savings', 'checking', 'investment', 'other'] },
    contribution: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


goalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});


goalSchema.virtual('progressPercentage').get(function() {
  return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
});


goalSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const timeDiff = this.targetDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});


goalSchema.index({ userId: 1, status: 1, targetDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);