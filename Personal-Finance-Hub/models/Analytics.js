const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    type: String,
    required: true 
  },
  periodType: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  
  
  spendingPatterns: {
    totalExpenses: {
      type: Number,
      default: 0
    },
    totalIncome: {
      type: Number,
      default: 0
    },
    netCashFlow: {
      type: Number,
      default: 0
    },
    categoryBreakdown: [{
      category: String,
      amount: Number,
      percentage: Number,
      transactionCount: Number
    }],
    dailyAverages: {
      weekdays: Number,
      weekends: Number
    },
    peakSpendingDays: [String], 
    spendingVelocity: Number 
  },
  
  
  anomalies: [{
    type: {
      type: String,
      enum: ['unusual-amount', 'unusual-category', 'unusual-frequency', 'budget-breach']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    description: String,
    amount: Number,
    category: String,
    date: Date,
    confidence: Number 
  }],
  
  
  predictions: {
    nextMonthExpenses: {
      predicted: Number,
      confidence: Number,
      breakdown: [{
        category: String,
        amount: Number
      }]
    },
    budgetRisk: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      categories: [String], 
      probability: Number
    },
    savingsPotential: {
      amount: Number,
      recommendations: [String]
    }
  },
  
  
  seasonalTrends: {
    monthlyMultipliers: [{
      month: Number, 
      multiplier: Number 
    }],
    seasonalCategories: [{
      category: String,
      peakMonths: [Number],
      variance: Number
    }]
  },
  
  
  metrics: {
    budgetAdherence: Number, 
    savingsRate: Number, 
    expenseGrowthRate: Number, 
    financialHealthScore: Number, 
    debtToIncomeRatio: Number
  },
  
  computedAt: {
    type: Date,
    default: Date.now
  }
});


analyticsSchema.index({ userId: 1, period: 1, periodType: 1 }, { unique: true });
analyticsSchema.index({ userId: 1, computedAt: -1 });
analyticsSchema.index({ 'anomalies.severity': 1, 'anomalies.date': -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
