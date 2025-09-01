const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const Analytics = require('../models/Analytics');
const moment = require('moment');

class ReportService {
  
  
  static async generateCustomReport(userId, startDate, endDate, options = {}) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      
      const [expenses, income, budgets] = await Promise.all([
        Expense.find({
          userId,
          createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 }),
        
        Income.find({
          userId,
          date: { $gte: start, $lte: end }
        }).sort({ date: -1 }),
        
        Budget.find({
          userId,
          createdAt: { $gte: start, $lte: end }
        })
      ]);
      
      
      const summary = this.calculateSummary(expenses, income);
      
      
      const categoryAnalysis = this.analyzeCategoriesForPeriod(expenses);
      
      
      const trends = this.analyzeTrends(expenses, income, start, end);
      
      
      const budgetPerformance = await this.analyzeBudgetPerformance(userId, expenses, budgets, start, end);
      
      
      let comparison = null;
      if (options.includeComparison) {
        comparison = await this.generateComparison(userId, start, end);
      }
      
      return {
        period: {
          startDate: start,
          endDate: end,
          duration: moment(end).diff(moment(start), 'days') + 1
        },
        summary,
        categoryAnalysis,
        trends,
        budgetPerformance,
        comparison,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }
  
  
  static calculateSummary(expenses, income) {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
    
    
    const avgDailyExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
    const avgTransactionAmount = expenses.length > 0 ? totalExpenses / expenses.length : 0;
    
    
    const sortedExpenses = expenses.sort((a, b) => b.amount - a.amount);
    const largestExpense = sortedExpenses[0] || null;
    const smallestExpense = sortedExpenses[sortedExpenses.length - 1] || null;
    
    return {
      totalExpenses,
      totalIncome,
      netCashFlow,
      savingsRate,
      transactionCount: expenses.length,
      incomeTransactionCount: income.length,
      avgDailyExpense,
      avgTransactionAmount,
      largestExpense: largestExpense ? {
        name: largestExpense.name,
        amount: largestExpense.amount,
        category: largestExpense.category,
        date: largestExpense.createdAt
      } : null,
      smallestExpense: smallestExpense ? {
        name: smallestExpense.name,
        amount: smallestExpense.amount,
        category: smallestExpense.category,
        date: smallestExpense.createdAt
      } : null
    };
  }
  
  
  static analyzeCategoriesForPeriod(expenses) {
    const categories = {};
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    expenses.forEach(exp => {
      if (!categories[exp.category]) {
        categories[exp.category] = {
          amount: 0,
          count: 0,
          transactions: []
        };
      }
      
      categories[exp.category].amount += exp.amount;
      categories[exp.category].count += 1;
      categories[exp.category].transactions.push({
        name: exp.name,
        amount: exp.amount,
        date: exp.createdAt
      });
    });
    
    
    const categoryArray = Object.entries(categories).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
      avgAmount: data.count > 0 ? data.amount / data.count : 0,
      transactions: data.transactions.sort((a, b) => b.amount - a.amount)
    }));
    
    return categoryArray.sort((a, b) => b.amount - a.amount);
  }
  
  
  static analyzeTrends(expenses, income, startDate, endDate) {
    const dailyData = {};
    const weeklyData = {};
    const monthlyData = {};
    
    
    const current = moment(startDate);
    const end = moment(endDate);
    
    while (current.isSameOrBefore(end)) {
      const dateKey = current.format('YYYY-MM-DD');
      const weekKey = current.format('YYYY-WW');
      const monthKey = current.format('YYYY-MM');
      
      dailyData[dateKey] = { expenses: 0, income: 0, transactions: 0 };
      if (!weeklyData[weekKey]) weeklyData[weekKey] = { expenses: 0, income: 0, transactions: 0 };
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { expenses: 0, income: 0, transactions: 0 };
      
      current.add(1, 'day');
    }
    
    
    expenses.forEach(exp => {
      const dateKey = moment(exp.createdAt).format('YYYY-MM-DD');
      const weekKey = moment(exp.createdAt).format('YYYY-WW');
      const monthKey = moment(exp.createdAt).format('YYYY-MM');
      
      if (dailyData[dateKey]) {
        dailyData[dateKey].expenses += exp.amount;
        dailyData[dateKey].transactions += 1;
      }
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].expenses += exp.amount;
        weeklyData[weekKey].transactions += 1;
      }
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += exp.amount;
        monthlyData[monthKey].transactions += 1;
      }
    });
    
    income.forEach(inc => {
      const dateKey = moment(inc.date).format('YYYY-MM-DD');
      const weekKey = moment(inc.date).format('YYYY-WW');
      const monthKey = moment(inc.date).format('YYYY-MM');
      
      if (dailyData[dateKey]) dailyData[dateKey].income += inc.amount;
      if (weeklyData[weekKey]) weeklyData[weekKey].income += inc.amount;
      if (monthlyData[monthKey]) monthlyData[monthKey].income += inc.amount;
    });
    
    return {
      daily: Object.entries(dailyData).map(([date, data]) => ({ date, ...data })),
      weekly: Object.entries(weeklyData).map(([week, data]) => ({ week, ...data })),
      monthly: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }))
    };
  }
  
  
  static async analyzeBudgetPerformance(userId, expenses, budgets, startDate, endDate) {
    const performance = {
      totalBudgeted: 0,
      totalSpent: 0,
      adherenceRate: 0,
      categoryPerformance: [],
      overBudgetCategories: [],
      underBudgetCategories: []
    };
    
    if (budgets.length === 0) {
      return performance;
    }
    
    
    const expensesByCategory = {};
    expenses.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
    });
    
    
    budgets.forEach(budget => {
      const spent = expensesByCategory[budget.category] || 0;
      const budgeted = budget.amount;
      const adherence = budgeted > 0 ? (spent / budgeted) * 100 : 0;
      
      performance.totalBudgeted += budgeted;
      performance.totalSpent += spent;
      
      const categoryPerf = {
        category: budget.category,
        budgeted,
        spent,
        remaining: budgeted - spent,
        adherence,
        status: adherence > 100 ? 'over' : adherence > 80 ? 'warning' : 'good'
      };
      
      performance.categoryPerformance.push(categoryPerf);
      
      if (adherence > 100) {
        performance.overBudgetCategories.push(categoryPerf);
      } else if (adherence < 50) {
        performance.underBudgetCategories.push(categoryPerf);
      }
    });
    
    performance.adherenceRate = performance.totalBudgeted > 0 ? 
      (performance.totalSpent / performance.totalBudgeted) * 100 : 0;
    
    return performance;
  }
  
  
  static async generateComparison(userId, startDate, endDate) {
    const duration = moment(endDate).diff(moment(startDate), 'days') + 1;
    const prevStartDate = moment(startDate).subtract(duration, 'days').toDate();
    const prevEndDate = moment(startDate).subtract(1, 'day').toDate();
    
    
    const [prevExpenses, prevIncome] = await Promise.all([
      Expense.find({
        userId,
        createdAt: { $gte: prevStartDate, $lte: prevEndDate }
      }),
      Income.find({
        userId,
        date: { $gte: prevStartDate, $lte: prevEndDate }
      })
    ]);
    
    const currentExpenses = await Expense.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const currentIncome = await Income.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const prevTotal = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentTotal = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const prevIncomeTotal = prevIncome.reduce((sum, inc) => sum + inc.amount, 0);
    const currentIncomeTotal = currentIncome.reduce((sum, inc) => sum + inc.amount, 0);
    
    return {
      expenses: {
        current: currentTotal,
        previous: prevTotal,
        change: prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0,
        changeAmount: currentTotal - prevTotal
      },
      income: {
        current: currentIncomeTotal,
        previous: prevIncomeTotal,
        change: prevIncomeTotal > 0 ? ((currentIncomeTotal - prevIncomeTotal) / prevIncomeTotal) * 100 : 0,
        changeAmount: currentIncomeTotal - prevIncomeTotal
      },
      netCashFlow: {
        current: currentIncomeTotal - currentTotal,
        previous: prevIncomeTotal - prevTotal,
        change: (prevIncomeTotal - prevTotal) > 0 ?
          (((currentIncomeTotal - currentTotal) - (prevIncomeTotal - prevTotal)) / (prevIncomeTotal - prevTotal)) * 100 : 0
      }
    };
  }

  
  static calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  static calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  static groupExpensesByMonth(expenses) {
    const monthlyData = {};

    expenses.forEach(exp => {
      const monthKey = moment(exp.createdAt).format('YYYY-MM');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0 };
      }
      monthlyData[monthKey].total += exp.amount;
      monthlyData[monthKey].count += 1;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      total: data.total,
      count: data.count,
      average: data.count > 0 ? data.total / data.count : 0
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  static calculateDailyFrequency(expenses) {
    const dailyData = {};

    expenses.forEach(exp => {
      const dayKey = moment(exp.createdAt).format('YYYY-MM-DD');
      dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;
    });

    const frequencies = Object.values(dailyData);
    return {
      average: frequencies.length > 0 ? frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length : 0,
      max: frequencies.length > 0 ? Math.max(...frequencies) : 0,
      daysWithExpenses: frequencies.length
    };
  }

  static calculateWeeklyFrequency(expenses) {
    const weeklyData = {};

    expenses.forEach(exp => {
      const weekKey = moment(exp.createdAt).format('YYYY-WW');
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
    });

    const frequencies = Object.values(weeklyData);
    return {
      average: frequencies.length > 0 ? frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length : 0,
      max: frequencies.length > 0 ? Math.max(...frequencies) : 0,
      weeksWithExpenses: frequencies.length
    };
  }

  static calculateMonthlyFrequency(expenses) {
    const monthlyData = {};

    expenses.forEach(exp => {
      const monthKey = moment(exp.createdAt).format('YYYY-MM');
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    const frequencies = Object.values(monthlyData);
    return {
      average: frequencies.length > 0 ? frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length : 0,
      max: frequencies.length > 0 ? Math.max(...frequencies) : 0,
      monthsWithExpenses: frequencies.length
    };
  }

  static calculateCategoryTrend(expenses) {
    if (expenses.length < 2) return 'stable';

    
    const monthlyTotals = this.groupExpensesByMonth(expenses);

    if (monthlyTotals.length < 2) return 'stable';

    const values = monthlyTotals.map(m => m.total);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }
}

module.exports = ReportService;
