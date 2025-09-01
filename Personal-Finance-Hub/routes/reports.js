const express = require('express');
const moment = require('moment');
const ReportService = require('../services/reportService');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const { auth } = require('../middleware/auth');

const router = express.Router();


router.post('/custom', auth, async (req, res) => {
  try {
    const { startDate, endDate, includeComparison = false } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }
    
    const options = { includeComparison };
    const report = await ReportService.generateCustomReport(req.user._id, start, end, options);
    
    res.json(report);
  } catch (error) {
    console.error("Error generating custom report:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/monthly-comparison', auth, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const monthsToAnalyze = Math.min(parseInt(months), 24); 
    
    const reports = [];
    const now = moment();
    
    for (let i = 0; i < monthsToAnalyze; i++) {
      const monthStart = now.clone().subtract(i, 'months').startOf('month');
      const monthEnd = now.clone().subtract(i, 'months').endOf('month');
      
      const report = await ReportService.generateCustomReport(
        req.user._id, 
        monthStart.toDate(), 
        monthEnd.toDate(),
        { includeComparison: false }
      );
      
      reports.push({
        month: monthStart.format('YYYY-MM'),
        monthName: monthStart.format('MMMM YYYY'),
        ...report.summary,
        topCategory: report.categoryAnalysis[0] || null
      });
    }
    
    
    const trends = router.calculateMonthlyTrends(reports);
    
    res.json({
      reports: reports.reverse(), 
      trends,
      summary: {
        totalMonths: monthsToAnalyze,
        avgMonthlyExpenses: reports.reduce((sum, r) => sum + r.totalExpenses, 0) / reports.length,
        avgMonthlyIncome: reports.reduce((sum, r) => sum + r.totalIncome, 0) / reports.length,
        avgSavingsRate: reports.reduce((sum, r) => sum + r.savingsRate, 0) / reports.length
      }
    });
  } catch (error) {
    console.error("Error generating monthly comparison:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/category/:category', auth, async (req, res) => {
  try {
    const { category } = req.params;
    const { months = 12 } = req.query;
    
    const startDate = moment().subtract(parseInt(months), 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();
    
    const expenses = await Expense.find({
      userId: req.user._id,
      category,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });
    
    if (expenses.length === 0) {
      return res.json({
        category,
        message: "No expenses found for this category in the specified period",
        expenses: [],
        analysis: null
      });
    }
    
    
    const analysis = {
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      transactionCount: expenses.length,
      avgAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length,
      
      
      monthlyBreakdown: ReportService.groupExpensesByMonth(expenses),
      
      
      frequency: {
        daily: ReportService.calculateDailyFrequency(expenses),
        weekly: ReportService.calculateWeeklyFrequency(expenses),
        monthly: ReportService.calculateMonthlyFrequency(expenses)
      },
      
      
      amountDistribution: {
        min: Math.min(...expenses.map(e => e.amount)),
        max: Math.max(...expenses.map(e => e.amount)),
        median: ReportService.calculateMedian(expenses.map(e => e.amount)),
        standardDeviation: ReportService.calculateStandardDeviation(expenses.map(e => e.amount))
      },
      
      
      trend: ReportService.calculateCategoryTrend(expenses),
      
      
      topTransactions: expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map(exp => ({
          name: exp.name,
          amount: exp.amount,
          date: exp.createdAt
        }))
    };
    
    res.json({
      category,
      period: {
        startDate,
        endDate,
        months: parseInt(months)
      },
      expenses: expenses.slice(0, 50), 
      analysis
    });
  } catch (error) {
    console.error("Error generating category report:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/budget-variance', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    
    
    const [budgets, expenses] = await Promise.all([
      Budget.find({
        userId: req.user._id,
        year: currentYear,
        month: currentMonth.toString().padStart(2, '0')
      }),
      Expense.find({
        userId: req.user._id,
        month: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
      })
    ]);
    
    
    const variances = [];
    const expensesByCategory = {};
    
    expenses.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
    });
    
    budgets.forEach(budget => {
      const actualSpent = expensesByCategory[budget.category] || 0;
      const variance = actualSpent - budget.amount;
      const variancePercentage = budget.amount > 0 ? (variance / budget.amount) * 100 : 0;
      
      variances.push({
        category: budget.category,
        budgeted: budget.amount,
        actual: actualSpent,
        variance,
        variancePercentage,
        status: variance > 0 ? 'over' : variance < -budget.amount * 0.2 ? 'under' : 'on-track'
      });
    });
    
    
    Object.keys(expensesByCategory).forEach(category => {
      const hasBudget = budgets.some(b => b.category === category);
      if (!hasBudget) {
        variances.push({
          category,
          budgeted: 0,
          actual: expensesByCategory[category],
          variance: expensesByCategory[category],
          variancePercentage: Infinity,
          status: 'no-budget'
        });
      }
    });
    
    
    variances.sort((a, b) => b.variance - a.variance);
    
    const summary = {
      totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
      totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalVariance: variances.reduce((sum, v) => sum + v.variance, 0),
      categoriesOverBudget: variances.filter(v => v.status === 'over').length,
      categoriesUnderBudget: variances.filter(v => v.status === 'under').length,
      categoriesOnTrack: variances.filter(v => v.status === 'on-track').length,
      categoriesWithoutBudget: variances.filter(v => v.status === 'no-budget').length
    };
    
    res.json({
      period: {
        year: currentYear,
        month: currentMonth,
        monthName: moment().month(currentMonth - 1).format('MMMM')
      },
      summary,
      variances,
      recommendations: router.generateBudgetRecommendations(variances, summary)
    });
  } catch (error) {
    console.error("Error generating budget variance report:", error);
    res.status(500).json({ error: error.message });
  }
});


router.calculateMonthlyTrends = function(reports) {
  if (reports.length < 2) return null;
  
  const expenseTrend = this.calculateTrendDirection(reports.map(r => r.totalExpenses));
  const incomeTrend = this.calculateTrendDirection(reports.map(r => r.totalIncome));
  const savingsTrend = this.calculateTrendDirection(reports.map(r => r.savingsRate));
  
  return {
    expenses: expenseTrend,
    income: incomeTrend,
    savings: savingsTrend
  };
};

router.calculateTrendDirection = function(values) {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-3); 
  const older = values.slice(0, -3);
  
  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((sum, val) => sum + val, 0) / older.length : recentAvg;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
};

router.generateBudgetRecommendations = function(variances, summary) {
  const recommendations = [];
  
  if (summary.totalVariance > 0) {
    recommendations.push(`You're over budget by ₹${summary.totalVariance.toFixed(2)} this month`);
  }
  
  const overBudgetCategories = variances.filter(v => v.status === 'over');
  if (overBudgetCategories.length > 0) {
    const topOverCategory = overBudgetCategories[0];
    recommendations.push(`Consider reducing ${topOverCategory.category} expenses by ₹${topOverCategory.variance.toFixed(2)}`);
  }
  
  const noBudgetCategories = variances.filter(v => v.status === 'no-budget');
  if (noBudgetCategories.length > 0) {
    recommendations.push(`Create budgets for: ${noBudgetCategories.map(v => v.category).join(', ')}`);
  }
  
  return recommendations;
};

module.exports = router;
