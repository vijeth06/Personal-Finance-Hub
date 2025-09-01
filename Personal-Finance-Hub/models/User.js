const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  
  profile: {
    monthlyIncome: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    budgetingMethod: {
      type: String,
      enum: ['traditional', 'zero-based', '50-30-20', 'envelope'],
      default: 'traditional'
    },
    financialGoals: [{
      type: {
        type: String,
        enum: ['emergency-fund', 'debt-payoff', 'investment', 'savings', 'other']
      },
      target: Number,
      deadline: Date,
      description: String
    }]
  },
  
  analytics: {
    enablePredictiveAnalytics: {
      type: Boolean,
      default: true
    },
    enableAnomalyDetection: {
      type: Boolean,
      default: true
    },
    spendingAlertThreshold: {
      type: Number,
      default: 0.8 
    },
    reportFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


userSchema.pre('save', async function(next) {
  
  if (!this.isModified('password')) return next();
  
  try {
    
    const salt = await bcrypt.genSalt(10);
    
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});


userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);