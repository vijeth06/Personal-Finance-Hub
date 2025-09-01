const express = require('express');
const RecurringExpense = require('../models/RecurringExpense');
const { auth } = require('../middleware/auth');

const router = express.Router();


const validateRecurringExpenseInput = (req, res, next) => {
  const { name, amount, category, frequency, dayOfMonth, reminderDays } = req.body;
  
  
  if (!name || !amount || !category || !frequency || !dayOfMonth || !reminderDays) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  
  if (isNaN(amount) || isNaN(dayOfMonth) || isNaN(reminderDays)) {
    return res.status(400).json({ error: "Invalid numeric values" });
  }
  
  
  if (dayOfMonth < 1 || dayOfMonth > 31) {
    return res.status(400).json({ error: "Day of month must be between 1 and 31" });
  }
  
  if (reminderDays < 1 || reminderDays > 10) {
    return res.status(400).json({ error: "Reminder days must be between 1 and 10" });
  }
  
  next();
};


router.post('/', auth, validateRecurringExpenseInput, async (req, res) => {
  try {
    const { name, amount, category, frequency, dayOfMonth, reminderDays, nextDueDate, paymentMethod, notes } = req.body;
    
    
    let computedNextDueDate = nextDueDate ? new Date(nextDueDate) : null;
    if (!computedNextDueDate) {
      const today = new Date();
      computedNextDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
      if (computedNextDueDate <= today) {
        computedNextDueDate.setMonth(computedNextDueDate.getMonth() + 1);
      }
    }
    
    const recurringExpense = new RecurringExpense({
      userId: req.user._id,
      name,
      amount,
      category,
      frequency,
      dayOfMonth,
      reminderDays,
      nextDueDate: computedNextDueDate,
      paymentMethod,
      notes
    });
    
    await recurringExpense.save();
    res.status(201).json(recurringExpense);
  } catch (error) {
    console.error("Error creating recurring expense:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/upcoming/due', auth, async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const upcomingExpenses = await RecurringExpense.find({
      userId: req.user._id,
      isActive: true,
      nextDueDate: { $gte: today, $lte: nextWeek }
    }).sort({ nextDueDate: 1 });
    
    
    const expensesWithDaysUntilDue = upcomingExpenses.map(expense => {
      const dueDate = new Date(expense.nextDueDate);
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return {
        ...expense.toObject(),
        daysUntilDue
      };
    });
    
    res.json(expensesWithDaysUntilDue);
  } catch (error) {
    console.error("Error fetching upcoming expenses:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/', auth, async (req, res) => {
  try {
    const { category, isActive, sort = 'nextDueDate', order = 'asc' } = req.query;
    
    
    const query = { userId: req.user._id };
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    const recurringExpenses = await RecurringExpense.find(query).sort(sortOptions);
    res.json(recurringExpenses);
  } catch (error) {
    console.error("Error fetching recurring expenses:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!recurringExpense) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    
    res.json(recurringExpense);
  } catch (error) {
    console.error("Error fetching recurring expense:", error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', auth, validateRecurringExpenseInput, async (req, res) => {
  try {
    const { name, amount, category, frequency, dayOfMonth, reminderDays, nextDueDate, paymentMethod, notes, isActive } = req.body;
    
    const recurringExpense = await RecurringExpense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name,
        amount,
        category,
        frequency,
        dayOfMonth,
        reminderDays,
        nextDueDate: new Date(nextDueDate),
        paymentMethod,
        notes,
        isActive
      },
      { new: true, runValidators: true }
    );
    
    if (!recurringExpense) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    
    res.json(recurringExpense);
  } catch (error) {
    console.error("Error updating recurring expense:", error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!recurringExpense) {
      return res.status(404).json({ error: "Recurring expense not found" });
    }
    
    res.json({ message: 'Recurring expense deleted successfully' });
  } catch (error) {
    console.error("Error deleting recurring expense:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;