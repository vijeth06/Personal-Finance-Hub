const express = require('express');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const BudgetService = require('../services/budgetService');
const { auth } = require('../middleware/auth');

const router = express.Router();


const validateBudgetInput = (req, res, next) => {
  const { category, amount, month, year } = req.body;
  
  if (!category || !amount || !month || !year) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }
  
  if (isNaN(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ error: "Invalid year" });
  }
  
  next();
};


router.post('/', auth, validateBudgetInput, async (req, res) => {
  try {
    const { category, amount, month, year } = req.body;
    
    
    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      category,
      month,
      year
    });
    
    if (existingBudget) {
      
      existingBudget.amount = amount;
      await existingBudget.save();
      return res.json(existingBudget);
    }
    
    
    const budget = new Budget({
      userId: req.user._id,
      category,
      amount,
      month,
      year
    });
    
    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    console.error("Error creating budget:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    
    const query = { userId: req.user._id };
    
    if (month) {
      query.month = month;
    }
    
    if (year) {
      query.year = parseInt(year);
    }
    
    const budgets = await Budget.find(query).sort({ year: -1, month: -1 });
    res.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/vs-actual', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }
    
    
    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year: parseInt(year)
    });
    
    
    const expenses = await Expense.find({
      userId: req.user._id,
      month: `${year}-${month}`
    });
    
    
    const actualByCategory = {};
    expenses.forEach(expense => {
      if (!actualByCategory[expense.category]) {
        actualByCategory[expense.category] = 0;
      }
      actualByCategory[expense.category] += expense.amount;
    });
    
    
    const result = budgets.map(budget => {
      const actual = actualByCategory[budget.category] || 0;
      const remaining = budget.amount - actual;
      const percentUsed = (actual / budget.amount) * 100;
      
      return {
        category: budget.category,
        budgeted: budget.amount,
        actual,
        remaining,
        percentUsed
      };
    });
    
    
    Object.keys(actualByCategory).forEach(category => {
      const hasBudget = budgets.some(budget => budget.category === category);
      if (!hasBudget) {
        result.push({
          category,
          budgeted: 0,
          actual: actualByCategory[category],
          remaining: -actualByCategory[category],
          percentUsed: Infinity
        });
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching budget vs actual:", error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', auth, validateBudgetInput, async (req, res) => {
  try {
    const { category, amount, month, year } = req.body;
    
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { category, amount, month, year },
      { new: true, runValidators: true }
    );
    
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    res.json(budget);
  } catch (error) {
    console.error("Error updating budget:", error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting budget:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/50-30-20', auth, async (req, res) => {
  try {
    const { totalIncome, year, month } = req.body;

    if (!totalIncome || !year || !month) {
      return res.status(400).json({ error: "Total income, year, and month are required" });
    }

    if (totalIncome <= 0) {
      return res.status(400).json({ error: "Total income must be positive" });
    }

    const budget = await BudgetService.create50302Budget(req.user._id, totalIncome, year, month);
    res.status(201).json(budget);
  } catch (error) {
    console.error("Error creating 50/30/20 budget:", error);
    res.status(400).json({ error: error.message });
  }
});


router.post('/zero-based', auth, async (req, res) => {
  try {
    const { totalIncome, allocations, year, month } = req.body;

    if (!totalIncome || !allocations || !year || !month) {
      return res.status(400).json({ error: "Total income, allocations, year, and month are required" });
    }

    if (!Array.isArray(allocations)) {
      return res.status(400).json({ error: "Allocations must be an array" });
    }

    const budget = await BudgetService.createZeroBasedBudget(req.user._id, totalIncome, allocations, year, month);
    res.status(201).json(budget);
  } catch (error) {
    console.error("Error creating zero-based budget:", error);
    res.status(400).json({ error: error.message });
  }
});


router.post('/envelope', auth, async (req, res) => {
  try {
    const { envelopes, year, month } = req.body;

    if (!envelopes || !year || !month) {
      return res.status(400).json({ error: "Envelopes, year, and month are required" });
    }

    if (!Array.isArray(envelopes)) {
      return res.status(400).json({ error: "Envelopes must be an array" });
    }

    const budget = await BudgetService.createEnvelopeBudget(req.user._id, envelopes, year, month);
    res.status(201).json(budget);
  } catch (error) {
    console.error("Error creating envelope budget:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/:id/analysis', auth, async (req, res) => {
  try {
    const analysis = await BudgetService.getBudgetAnalysis(req.user._id, req.params.id);
    res.json(analysis);
  } catch (error) {
    console.error("Error getting budget analysis:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/:id/update-spending', auth, async (req, res) => {
  try {
    const { expenses } = req.body;

    if (!Array.isArray(expenses)) {
      return res.status(400).json({ error: "Expenses must be an array" });
    }

    const budget = await BudgetService.updateBudgetSpending(req.user._id, req.params.id, expenses);
    res.json(budget);
  } catch (error) {
    console.error("Error updating budget spending:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id/recommendations', auth, async (req, res) => {
  try {
    const analysis = await BudgetService.getBudgetAnalysis(req.user._id, req.params.id);
    res.json({
      recommendations: analysis.recommendations,
      alerts: analysis.alerts
    });
  } catch (error) {
    console.error("Error getting budget recommendations:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/auto-create', auth, async (req, res) => {
  try {
    const { budgetType, year, month } = req.body;

    if (!budgetType || !year || !month) {
      return res.status(400).json({ error: "Budget type, year, and month are required" });
    }

    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const incomeData = await Income.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    const totalIncome = incomeData.reduce((sum, income) => sum + income.amount, 0);

    if (totalIncome <= 0) {
      return res.status(400).json({ error: "No income found for the specified period" });
    }

    let budget;

    switch (budgetType) {
      case '50-30-20':
        budget = await BudgetService.create50302Budget(req.user._id, totalIncome, year, month);
        break;
      default:
        return res.status(400).json({ error: "Unsupported budget type for auto-creation" });
    }

    res.status(201).json(budget);
  } catch (error) {
    console.error("Error auto-creating budget:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;