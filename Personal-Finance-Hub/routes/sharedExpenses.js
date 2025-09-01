const express = require('express');
const SharedExpense = require('../models/SharedExpense');
const Family = require('../models/Family');
const { auth } = require('../middleware/auth');

const router = express.Router();


router.post('/', auth, async (req, res) => {
  try {
    const {
      familyId,
      name,
      description,
      amount,
      category,
      date,
      splitType = 'equal',
      splits,
      tags,
      notes
    } = req.body;
    
    if (!familyId || !name || !amount || !category || !date) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    
    
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    const isMember = family.members.some(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this family" });
    }
    
    
    if (!family.canUserPerformAction(req.user._id, 'canAddExpenses')) {
      return res.status(403).json({ error: "You don't have permission to add expenses" });
    }
    
    const sharedExpense = new SharedExpense({
      familyId,
      name,
      description,
      amount,
      category,
      date: new Date(date),
      paidBy: {
        userId: req.user._id,
        amount
      },
      splitType,
      tags,
      notes,
      createdBy: req.user._id,
      requiresApproval: family.settings.expenseApprovalRequired && 
                       amount >= family.settings.expenseApprovalThreshold
    });
    
    
    if (splitType === 'equal') {
      const memberIds = family.members.map(member => member.userId);
      sharedExpense.calculateEqualSplit(memberIds);
    } else if (splits && Array.isArray(splits)) {
      switch (splitType) {
        case 'percentage':
          sharedExpense.calculatePercentageSplit(splits);
          break;
        case 'amount':
          sharedExpense.calculateAmountSplit(splits);
          break;
        default:
          sharedExpense.splits = splits;
      }
    }
    
    
    if (sharedExpense.requiresApproval) {
      sharedExpense.status = 'pending';
      
      
      const adminMembers = family.members.filter(member => member.role === 'admin');
      sharedExpense.approvals = adminMembers.map(admin => ({
        userId: admin.userId,
        status: 'pending'
      }));
    } else {
      sharedExpense.status = 'approved';
    }
    
    await sharedExpense.save();
    await sharedExpense.populate([
      { path: 'paidBy.userId', select: 'name email' },
      { path: 'splits.userId', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    res.status(201).json(sharedExpense);
  } catch (error) {
    console.error("Error creating shared expense:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/family/:familyId', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, status, page = 1, limit = 20 } = req.query;
    
    
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    const isMember = family.members.some(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    
    const query = { familyId: req.params.familyId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (category) query.category = category;
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [expenses, total] = await Promise.all([
      SharedExpense.find(query)
        .populate('paidBy.userId', 'name email')
        .populate('splits.userId', 'name email')
        .populate('createdBy', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SharedExpense.countDocuments(query)
    ]);
    
    res.json({
      expenses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error("Error fetching shared expenses:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/balance/:familyId', auth, async (req, res) => {
  try {
    
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    const isMember = family.members.some(member => 
      member.userId.toString() === req.user._id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    
    const expenses = await SharedExpense.find({
      familyId: req.params.familyId,
      status: { $in: ['approved', 'settled'] }
    }).populate('paidBy.userId', 'name email')
      .populate('splits.userId', 'name email');
    
    
    const balances = new Map();
    const memberBalances = new Map();
    
    
    family.members.forEach(member => {
      const userId = member.userId.toString();
      balances.set(userId, 0);
      memberBalances.set(userId, {
        userId: member.userId,
        name: '', 
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0
      });
    });
    
    
    expenses.forEach(expense => {
      const expenseBalances = expense.getBalances();
      
      expenseBalances.forEach((balance, userId) => {
        const currentBalance = balances.get(userId) || 0;
        balances.set(userId, currentBalance + balance);
        
        const memberBalance = memberBalances.get(userId);
        if (memberBalance) {
          if (balance > 0) {
            memberBalance.totalPaid += balance;
          } else {
            memberBalance.totalOwed += Math.abs(balance);
          }
        }
      });
    });
    
    
    balances.forEach((balance, userId) => {
      const memberBalance = memberBalances.get(userId);
      if (memberBalance) {
        memberBalance.netBalance = balance;
        
        
        const member = family.members.find(m => m.userId.toString() === userId);
        if (member) {
          memberBalance.name = member.userId.name || 'Unknown';
        }
      }
    });
    
    
    const balanceArray = Array.from(memberBalances.values())
      .sort((a, b) => b.netBalance - a.netBalance);
    
    
    const settlements = calculateSettlements(balanceArray);
    
    res.json({
      balances: balanceArray,
      settlements,
      summary: {
        totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        totalTransactions: expenses.length,
        pendingSettlements: settlements.length
      }
    });
  } catch (error) {
    console.error("Error calculating balances:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/:expenseId/pay', auth, async (req, res) => {
  try {
    const expense = await SharedExpense.findById(req.params.expenseId);
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    
    const userSplit = expense.splits.find(split => 
      split.userId.toString() === req.user._id.toString()
    );
    
    if (!userSplit) {
      return res.status(403).json({ error: "You are not part of this expense" });
    }
    
    if (userSplit.isPaid) {
      return res.status(400).json({ error: "This split is already marked as paid" });
    }
    
    await expense.markSplitAsPaid(req.user._id);
    
    res.json({ message: "Split marked as paid successfully" });
  } catch (error) {
    console.error("Error marking split as paid:", error);
    res.status(500).json({ error: error.message });
  }
});


function calculateSettlements(balances) {
  const settlements = [];
  const creditors = balances.filter(b => b.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance);
  const debtors = balances.filter(b => b.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance);
  
  let i = 0, j = 0;
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    const settlementAmount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));
    
    if (settlementAmount > 0.01) { 
      settlements.push({
        from: {
          userId: debtor.userId,
          name: debtor.name
        },
        to: {
          userId: creditor.userId,
          name: creditor.name
        },
        amount: settlementAmount
      });
      
      creditor.netBalance -= settlementAmount;
      debtor.netBalance += settlementAmount;
    }
    
    if (Math.abs(creditor.netBalance) < 0.01) i++;
    if (Math.abs(debtor.netBalance) < 0.01) j++;
  }
  
  return settlements;
}

module.exports = router;
