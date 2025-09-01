const express = require('express');
const SavingsGoal = require('../models/SavingsGoal');
const { auth } = require('../middleware/auth');

const router = express.Router();


const validateSavingsGoalInput = (req, res, next) => {
  const { name, targetAmount, targetDate } = req.body;
  
  if (!name || !targetAmount || !targetDate) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  if (isNaN(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ error: "Target amount must be a positive number" });
  }
  
  
  const today = new Date();
  const targetDateObj = new Date(targetDate);
  if (targetDateObj <= today) {
    return res.status(400).json({ error: "Target date must be in the future" });
  }
  
  next();
};


router.post('/', auth, validateSavingsGoalInput, async (req, res) => {
  try {
    const { name, targetAmount, targetDate, category, currentAmount = 0 } = req.body;
    
    const savingsGoal = new SavingsGoal({
      userId: req.user._id,
      name,
      targetAmount,
      currentAmount,
      targetDate: new Date(targetDate),
      category
    });
    
    await savingsGoal.save();
    res.status(201).json(savingsGoal);
  } catch (error) {
    console.error("Error creating savings goal:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/', auth, async (req, res) => {
  try {
    const { category } = req.query;
    
    
    const query = { userId: req.user._id };
    
    if (category) {
      query.category = category;
    }
    
    const savingsGoals = await SavingsGoal.find(query).sort({ targetDate: 1 });
    
    
    const goalsWithProgress = savingsGoals.map(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      
      
      const today = new Date();
      const targetDate = new Date(goal.targetDate);
      const timeDiff = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      
      const monthsRemaining = daysRemaining / 30;
      const requiredMonthlySavings = (goal.targetAmount - goal.currentAmount) / monthsRemaining;
      
      return {
        ...goal.toObject(),
        progress,
        daysRemaining,
        requiredMonthlySavings: monthsRemaining > 0 ? requiredMonthlySavings : 0
      };
    });
    
    res.json(goalsWithProgress);
  } catch (error) {
    console.error("Error fetching savings goals:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const savingsGoal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!savingsGoal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    
    
    const progress = (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100;
    
    
    const today = new Date();
    const targetDate = new Date(savingsGoal.targetDate);
    const timeDiff = targetDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    
    const monthsRemaining = daysRemaining / 30;
    const requiredMonthlySavings = (savingsGoal.targetAmount - savingsGoal.currentAmount) / monthsRemaining;
    
    res.json({
      ...savingsGoal.toObject(),
      progress,
      daysRemaining,
      requiredMonthlySavings: monthsRemaining > 0 ? requiredMonthlySavings : 0
    });
  } catch (error) {
    console.error("Error fetching savings goal:", error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', auth, validateSavingsGoalInput, async (req, res) => {
  try {
    const { name, targetAmount, targetDate, category, currentAmount } = req.body;
    
    const savingsGoal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name,
        targetAmount,
        currentAmount,
        targetDate: new Date(targetDate),
        category
      },
      { new: true, runValidators: true }
    );
    
    if (!savingsGoal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    
    res.json(savingsGoal);
  } catch (error) {
    console.error("Error updating savings goal:", error);
    res.status(400).json({ error: error.message });
  }
});


router.patch('/:id/amount', auth, async (req, res) => {
  try {
    const { currentAmount } = req.body;
    
    if (isNaN(currentAmount) || currentAmount < 0) {
      return res.status(400).json({ error: "Current amount must be a non-negative number" });
    }
    
    const savingsGoal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { currentAmount },
      { new: true, runValidators: true }
    );
    
    if (!savingsGoal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    
    res.json(savingsGoal);
  } catch (error) {
    console.error("Error updating savings goal amount:", error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const savingsGoal = await SavingsGoal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!savingsGoal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting savings goal:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;