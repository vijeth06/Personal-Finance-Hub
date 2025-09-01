const express = require('express');
const Expense = require('../models/Expense');
const { auth } = require('../middleware/auth');

const router = express.Router();


const validateExpenseInput = (req, res, next) => {
  const { name, amount, category, month } = req.body;
  
  if (!name || !amount || !category || !month) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }
  
  next();
};


router.post('/', auth, validateExpenseInput, async (req, res) => {
  try {
    const { name, amount, category, month, paymentMethod, notes, tags } = req.body;
    
    const expense = new Expense({
      userId: req.user._id,
      name,
      amount,
      category,
      month,
      paymentMethod,
      notes,
      tags
    });
    
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    
    const query = { userId: req.user._id };
    if (month && year) {
      query.month = `${year}-${month}`;
    }
    
    
    const expenses = await Expense.find(query);
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    
    const categories = {};
    expenses.forEach(expense => {
      if (!categories[expense.category]) {
        categories[expense.category] = 0;
      }
      categories[expense.category] += expense.amount;
    });
    
    
    let highestExpense = { amount: 0 };
    expenses.forEach(expense => {
      if (expense.amount > highestExpense.amount) {
        highestExpense = expense;
      }
    });
    
    
    const yearQuery = { userId: req.user._id };
    if (year) {
      yearQuery.month = { $regex: `^${year}-` };
    }
    
    const yearExpenses = await Expense.find(yearQuery);
    
    
    const monthlyTotals = {};
    yearExpenses.forEach(expense => {
      const month = expense.month;
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = 0;
      }
      monthlyTotals[month] += expense.amount;
    });
    
    const monthCount = Object.keys(monthlyTotals).length || 1;
    const averageMonthly = Object.values(monthlyTotals).reduce((sum, total) => sum + total, 0) / monthCount;
    
    res.json({
      total,
      categories,
      highestExpense: highestExpense.amount > 0 ? highestExpense : null,
      averageMonthly
    });
  } catch (error) {
    console.error("Error fetching expense statistics:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/stats/trends', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    
    const months = [];
    for (let i = 0; i < 6; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      const monthStr = month.toString().padStart(2, '0');
      months.unshift(`${year}-${monthStr}`);
    }
    
    
    const expenses = await Expense.find({
      userId,
      month: { $in: months }
    });
    
    
    const categories = {};
    const monthlyTotals = {};
    
    
    months.forEach(month => {
      monthlyTotals[month] = 0;
    });
    
    
    expenses.forEach(expense => {
      
      monthlyTotals[expense.month] += expense.amount;
      
      
      if (!categories[expense.category]) {
        categories[expense.category] = {};
        months.forEach(month => {
          categories[expense.category][month] = 0;
        });
      }
      
      categories[expense.category][expense.month] += expense.amount;
    });
    
    
    const categoryData = Object.keys(categories).map(category => {
      return {
        name: category,
        values: months.map(month => categories[category][month])
      };
    });
    
    res.json({
      months,
      monthlyTotals: months.map(month => monthlyTotals[month]),
      categories: categoryData
    });
  } catch (error) {
    console.error("Error fetching expense trends:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/', auth, async (req, res) => {
  try {
    const { month, category, search, sort = 'createdAt', order = 'desc' } = req.query;
    
    
    const query = { userId: req.user._id };
    
    if (month) {
      query.month = month;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    const expenses = await Expense.find(query).sort(sortOptions);
    res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    res.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', auth, validateExpenseInput, async (req, res) => {
  try {
    const { name, amount, category, month, paymentMethod, notes, tags } = req.body;
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name,
        amount,
        category,
        month,
        paymentMethod,
        notes,
        tags
      },
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    res.json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;