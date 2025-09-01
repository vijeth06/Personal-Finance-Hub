const express = require('express');
const Goal = require('../models/Goal');
const { auth } = require('../middleware/auth');

const router = express.Router();


router.get('/', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { userId: req.user._id };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    const goals = await Goal.find(query).sort({ priority: 1, targetDate: 1 });
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      targetAmount,
      currentAmount = 0,
      targetDate,
      category,
      type,
      priority = 'medium',
      icon = '🎯',
      color = '#10b981'
    } = req.body;

    
    const mappedTitle = title || name;
    const mappedType = (type || category || 'other').replace(/-/g, '_');

    const goal = new Goal({
      userId: req.user._id,
      title: mappedTitle,
      description: description || '',
      type: ['savings','debt_payoff','emergency_fund','investment','purchase','other'].includes(mappedType) ? mappedType : 'other',
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      targetDate: new Date(targetDate),
      priority,
      category: category || 'Other',
      icon,
      color
    });

    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(400).json({ error: error.message });
  }
});


router.put('/:id', auth, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.name && !update.title) update.title = update.name;
    if (update.category || update.type) {
      const mappedType = (update.type || update.category).replace(/-/g, '_');
      if (['savings','debt_payoff','emergency_fund','investment','purchase','other'].includes(mappedType)) {
        update.type = mappedType;
      } else {
        update.type = 'other';
      }
    }
    if (update.targetAmount !== undefined) update.targetAmount = Number(update.targetAmount);
    if (update.currentAmount !== undefined) update.currentAmount = Number(update.currentAmount);
    if (update.targetDate) update.targetDate = new Date(update.targetDate);

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true, runValidators: true }
    );
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(400).json({ error: error.message });
  }
});


router.post('/:id/contribute', auth, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    goal.currentAmount += amount;
    
    
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    }
    
    await goal.save();
    
    
    
    res.json(goal);
  } catch (error) {
    console.error('Error adding contribution:', error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/summary', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id });
    
    const summary = {
      total: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrent: goals.reduce((sum, g) => sum + g.currentAmount, 0),
      overallProgress: 0
    };
    
    if (summary.totalTarget > 0) {
      summary.overallProgress = (summary.totalCurrent / summary.totalTarget) * 100;
    }
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching goal summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;