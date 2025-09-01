const express = require('express');
const Income = require('../models/Income');
const { auth } = require('../middleware/auth');

const router = express.Router();


const validateIncomeInput = (req, res, next) => {
  const { source, amount, category, date } = req.body;
  
  if (!source || !amount || !category || !date) {
    return res.status(400).json({ error: "Source, amount, category, and date are required" });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }
  
  const validCategories = ['salary', 'freelance', 'business', 'investment', 'rental', 'bonus', 'gift', 'other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  
  next();
};


router.post('/', auth, validateIncomeInput, async (req, res) => {
  try {
    const { 
      source, 
      amount, 
      category, 
      frequency = 'one-time',
      date,
      isRecurring = false,
      nextExpectedDate,
      description,
      tags = [],
      taxable = true
    } = req.body;
    
    const income = new Income({
      userId: req.user._id,
      source,
      amount,
      category,
      frequency,
      date: new Date(date),
      isRecurring,
      nextExpectedDate: nextExpectedDate ? new Date(nextExpectedDate) : null,
      description,
      tags,
      taxable
    });
    
    await income.save();
    res.status(201).json(income);
  } catch (error) {
    console.error("Error creating income:", error);
    res.status(400).json({ error: error.message });
  }
});


router.get('/', auth, async (req, res) => {
  try {
    const { 
      category, 
      frequency,
      startDate,
      endDate,
      search, 
      sort = 'date', 
      order = 'desc',
      page = 1,
      limit = 50
    } = req.query;
    
    
    const query = { userId: req.user._id };
    
    if (category) {
      query.category = category;
    }
    
    if (frequency) {
      query.frequency = frequency;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (search) {
      query.$or = [
        { source: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [income, total] = await Promise.all([
      Income.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Income.countDocuments(query)
    ]);

    
    res.json(income);
  } catch (error) {
    console.error("Error fetching income:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/summary', auth, async (req, res) => {
  try {
    const { period = 'monthly', year, month } = req.query;
    
    let matchStage = { userId: req.user._id };
    
    
    if (period === 'monthly' && year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      matchStage.date = { $gte: startDate, $lte: endDate };
    } else if (period === 'yearly' && year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      matchStage.date = { $gte: startDate, $lte: endDate };
    }
    
    const summary = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$amount' },
          averageIncome: { $avg: '$amount' },
          transactionCount: { $sum: 1 },
          categoryBreakdown: {
            $push: {
              category: '$category',
              amount: '$amount'
            }
          }
        }
      }
    ]);
    
    
    let categoryTotals = {};
    if (summary.length > 0) {
      summary[0].categoryBreakdown.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
      });
    }
    
    const result = summary.length > 0 ? {
      totalIncome: summary[0].totalIncome,
      averageIncome: summary[0].averageIncome,
      transactionCount: summary[0].transactionCount,
      categoryBreakdown: Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount,
        percentage: summary[0].totalIncome > 0 ? (amount / summary[0].totalIncome) * 100 : 0
      }))
    } : {
      totalIncome: 0,
      averageIncome: 0,
      transactionCount: 0,
      categoryBreakdown: []
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching income summary:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/trends', auth, async (req, res) => {
  try {
    const { period = 'monthly', months = 12 } = req.query;
    
    const trends = await Income.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - parseInt(months)))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalIncome: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          categories: {
            $push: {
              category: '$category',
              amount: '$amount'
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    res.json(trends);
  } catch (error) {
    console.error("Error fetching income trends:", error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', auth, validateIncomeInput, async (req, res) => {
  try {
    const { 
      source, 
      amount, 
      category, 
      frequency,
      date,
      isRecurring,
      nextExpectedDate,
      description,
      tags,
      taxable
    } = req.body;
    
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        source,
        amount,
        category,
        frequency,
        date: new Date(date),
        isRecurring,
        nextExpectedDate: nextExpectedDate ? new Date(nextExpectedDate) : null,
        description,
        tags,
        taxable
      },
      { new: true, runValidators: true }
    );
    
    if (!income) {
      return res.status(404).json({ error: "Income entry not found" });
    }
    
    res.json(income);
  } catch (error) {
    console.error("Error updating income:", error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!income) {
      return res.status(404).json({ error: "Income entry not found" });
    }
    
    res.json({ message: "Income entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting income:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
