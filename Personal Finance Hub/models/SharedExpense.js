const mongoose = require('mongoose');

const sharedExpenseSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },
  
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
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
  date: {
    type: Date,
    required: true
  },
  
  
  paidBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  },
  
  
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'amount', 'shares'],
    default: 'equal'
  },
  
  
  splits: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    shares: {
      type: Number,
      min: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    }
  }],
  
  
  requiresApproval: {
    type: Boolean,
    default: false
  },
  
  approvals: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending'
    },
    comment: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'settled'],
    default: 'pending'
  },
  
  
  settlements: [{
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    settledAt: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'other'],
      default: 'cash'
    },
    reference: {
      type: String,
      trim: true
    }
  }],
  
  
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  
  tags: [String],
  notes: {
    type: String,
    trim: true
  },
  
  
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringSettings: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    endDate: Date,
    nextDueDate: Date
  },
  
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


sharedExpenseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  
  if (this.splits && this.splits.length > 0) {
    const totalSplitAmount = this.splits.reduce((sum, split) => sum + split.amount, 0);
    const tolerance = 0.01; 
    
    if (Math.abs(totalSplitAmount - this.amount) > tolerance) {
      return next(new Error('Split amounts must equal the total expense amount'));
    }
  }
  
  next();
});


sharedExpenseSchema.index({ familyId: 1, date: -1 });
sharedExpenseSchema.index({ 'paidBy.userId': 1 });
sharedExpenseSchema.index({ 'splits.userId': 1 });
sharedExpenseSchema.index({ status: 1 });
sharedExpenseSchema.index({ category: 1 });


sharedExpenseSchema.methods.calculateEqualSplit = function(memberIds) {
  const splitAmount = this.amount / memberIds.length;
  
  this.splits = memberIds.map(userId => ({
    userId,
    amount: splitAmount,
    percentage: 100 / memberIds.length
  }));
  
  return this;
};

sharedExpenseSchema.methods.calculatePercentageSplit = function(percentages) {
  this.splits = percentages.map(({ userId, percentage }) => ({
    userId,
    percentage,
    amount: (this.amount * percentage) / 100
  }));
  
  return this;
};

sharedExpenseSchema.methods.calculateAmountSplit = function(amounts) {
  this.splits = amounts.map(({ userId, amount }) => ({
    userId,
    amount,
    percentage: (amount / this.amount) * 100
  }));
  
  return this;
};

sharedExpenseSchema.methods.getBalances = function() {
  const balances = new Map();
  
  
  this.splits.forEach(split => {
    balances.set(split.userId.toString(), 0);
  });
  
  
  this.splits.forEach(split => {
    const userId = split.userId.toString();
    balances.set(userId, balances.get(userId) - split.amount);
  });
  
  
  const payerId = this.paidBy.userId.toString();
  balances.set(payerId, balances.get(payerId) + this.paidBy.amount);
  
  return balances;
};

sharedExpenseSchema.methods.isFullySettled = function() {
  return this.splits.every(split => split.isPaid);
};

sharedExpenseSchema.methods.markSplitAsPaid = function(userId) {
  const split = this.splits.find(split => 
    split.userId.toString() === userId.toString()
  );
  
  if (split) {
    split.isPaid = true;
    split.paidAt = new Date();
    
    
    if (this.isFullySettled()) {
      this.status = 'settled';
    }
  }
  
  return this.save();
};

module.exports = mongoose.model('SharedExpense', sharedExpenseSchema);
