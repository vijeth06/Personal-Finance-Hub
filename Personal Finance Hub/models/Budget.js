const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
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
  budgetType: {
    type: String,
    enum: ['traditional', 'zero-based', '50-30-20', 'envelope'],
    default: 'traditional'
  },
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },

  
  category: {
    type: String,
    required: function() { return this.budgetType === 'traditional'; }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  month: {
    type: String,
    required: function() { return this.period === 'monthly'; }
  },
  year: {
    type: Number,
    required: true
  },

  
  fiftyThirtyTwenty: {
    needs: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      categories: [String]
    },
    wants: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      categories: [String]
    },
    savings: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      categories: [String]
    }
  },

  
  zeroBased: {
    totalIncome: { type: Number, default: 0 },
    allocations: [{
      category: String,
      amount: Number,
      priority: { type: Number, min: 1, max: 10 },
      isFixed: { type: Boolean, default: false },
      description: String
    }],
    unallocated: { type: Number, default: 0 }
  },

  
  envelope: {
    envelopes: [{
      name: String,
      budgetAmount: Number,
      currentAmount: Number,
      categories: [String],
      color: { type: String, default: '#007bff' },
      isVirtual: { type: Boolean, default: true }
    }]
  },

  
  currency: {
    type: String,
    default: 'INR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },

  
  settings: {
    autoRollover: { type: Boolean, default: false },
    alertThreshold: { type: Number, default: 0.8 }, 
    includeRecurring: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true }
  },

  
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  lastModified: {
    type: Date,
    default: Date.now
  }
});


budgetSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});


budgetSchema.index({ userId: 1, budgetType: 1, year: 1, month: 1 });
budgetSchema.index({ userId: 1, status: 1 });
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 });


budgetSchema.virtual('utilizationPercentage').get(function() {
  if (this.budgetType === 'traditional') {
    
    return 0;
  }
  return 0;
});

module.exports = mongoose.model('Budget', budgetSchema);