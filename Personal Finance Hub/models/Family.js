const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    permissions: {
      canAddExpenses: { type: Boolean, default: true },
      canEditBudgets: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: true },
      canInviteMembers: { type: Boolean, default: false }
    }
  }],
  
  
  settings: {
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
    expenseApprovalRequired: {
      type: Boolean,
      default: false
    },
    expenseApprovalThreshold: {
      type: Number,
      default: 1000
    }
  },
  
  
  sharedBudgets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget'
  }],
  
  sharedGoals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavingsGoal'
  }],
  
  
  stats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    totalExpenses: {
      type: Number,
      default: 0
    },
    totalIncome: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  
  
  invitations: [{
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    token: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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


familySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.stats.totalMembers = this.members.length;
  next();
});


familySchema.index({ 'members.userId': 1 });
familySchema.index({ createdBy: 1 });
familySchema.index({ 'invitations.email': 1 });
familySchema.index({ 'invitations.token': 1 });


familySchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this family');
  }
  
  this.members.push({
    userId,
    role,
    permissions: this.getDefaultPermissions(role)
  });
  
  return this.save();
};

familySchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.userId.toString() !== userId.toString()
  );
  
  return this.save();
};

familySchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  member.role = newRole;
  member.permissions = this.getDefaultPermissions(newRole);
  
  return this.save();
};

familySchema.methods.getDefaultPermissions = function(role) {
  switch (role) {
    case 'admin':
      return {
        canAddExpenses: true,
        canEditBudgets: true,
        canViewReports: true,
        canInviteMembers: true
      };
    case 'member':
      return {
        canAddExpenses: true,
        canEditBudgets: false,
        canViewReports: true,
        canInviteMembers: false
      };
    case 'viewer':
      return {
        canAddExpenses: false,
        canEditBudgets: false,
        canViewReports: true,
        canInviteMembers: false
      };
    default:
      return {
        canAddExpenses: false,
        canEditBudgets: false,
        canViewReports: false,
        canInviteMembers: false
      };
  }
};

familySchema.methods.canUserPerformAction = function(userId, action) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (!member) {
    return false;
  }
  
  return member.permissions[action] || false;
};

module.exports = mongoose.model('Family', familySchema);
