const Analytics = require('../models/Analytics');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const moment = require('moment');

class AnalyticsService {
  
  
  static async computeAnalytics(userId, periodType = 'monthly') {
    try {
      const currentPeriod = this.getCurrentPeriod(periodType);
      const previousPeriod = this.getPreviousPeriod(periodType);
      
      
      const currentData = await this.getPeriodData(userId, currentPeriod, periodType);
      const previousData = await this.getPeriodData(userId, previousPeriod, periodType);
      const historicalData = await this.getHistoricalData(userId, periodType, 12);
      
      
      const spendingPatterns = await this.analyzeSpendingPatterns(currentData, previousData);
      const anomalies = await this.detectAnomalies(userId, currentData, historicalData);
      const predictions = await this.generatePredictions(historicalData, currentData);
      const seasonalTrends = await this.analyzeSeasonalTrends(historicalData);
      const metrics = await this.calculateMetrics(userId, currentData, previousData);
      
      
      const analytics = await Analytics.findOneAndUpdate(
        { userId, period: currentPeriod, periodType },
        {
          userId,
          period: currentPeriod,
          periodType,
          spendingPatterns,
          anomalies,
          predictions,
          seasonalTrends,
          metrics,
          computedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      return analytics;
    } catch (error) {
      console.error('Error computing analytics:', error);
      throw error;
    }
  }
  
  
  static async analyzeSpendingPatterns(currentData, previousData) {
    const { expenses, income } = currentData;
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const netCashFlow = totalIncome - totalExpenses;
    
    
    const categoryBreakdown = this.calculateCategoryBreakdown(expenses);
    
    
    const dailyAverages = this.calculateDailyAverages(expenses);
    
    
    const peakSpendingDays = this.findPeakSpendingDays(expenses);
    
    
    const previousTotal = previousData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const spendingVelocity = previousTotal > 0 ? 
      ((totalExpenses - previousTotal) / previousTotal) * 100 : 0;
    
    return {
      totalExpenses,
      totalIncome,
      netCashFlow,
      categoryBreakdown,
      dailyAverages,
      peakSpendingDays,
      spendingVelocity
    };
  }
  
  
  static async detectAnomalies(userId, currentData, historicalData) {
    const anomalies = [];
    const { expenses } = currentData;
    
    
    const historicalStats = this.calculateHistoricalStats(historicalData);
    
    for (const expense of expenses) {
      
      const categoryStats = historicalStats.categories[expense.category];
      if (categoryStats) {
        const zScore = Math.abs((expense.amount - categoryStats.mean) / categoryStats.stdDev);
        
        if (zScore > 2) { 
          anomalies.push({
            type: 'unusual-amount',
            severity: zScore > 3 ? 'high' : 'medium',
            description: `Unusual ${expense.category} expense: ₹${expense.amount} (avg: ₹${categoryStats.mean.toFixed(2)})`,
            amount: expense.amount,
            category: expense.category,
            date: expense.createdAt,
            confidence: Math.min(zScore / 3, 1)
          });
        }
      }
      
      
      const categoryFreq = historicalStats.frequency[expense.category] || 0;
      const currentMonthCategoryCount = expenses.filter(e => e.category === expense.category).length;
      
      if (currentMonthCategoryCount > categoryFreq * 2) {
        anomalies.push({
          type: 'unusual-frequency',
          severity: 'medium',
          description: `Unusual frequency for ${expense.category}: ${currentMonthCategoryCount} times this period`,
          category: expense.category,
          date: new Date(),
          confidence: 0.7
        });
      }
    }
    
    return anomalies;
  }
  
  
  static async generatePredictions(historicalData, currentData) {
    const monthlyTotals = historicalData.map(period => 
      period.expenses.reduce((sum, exp) => sum + exp.amount, 0)
    );
    
    
    const predicted = this.linearRegression(monthlyTotals);
    
    
    const categoryBreakdown = this.predictCategoryBreakdown(historicalData, predicted);
    
    
    const budgetRisk = await this.assessBudgetRisk(currentData, predicted);
    
    
    const savingsPotential = this.calculateSavingsPotential(currentData, historicalData);
    
    return {
      nextMonthExpenses: {
        predicted,
        confidence: 0.75, 
        breakdown: categoryBreakdown
      },
      budgetRisk,
      savingsPotential
    };
  }
  
  
  static getCurrentPeriod(periodType) {
    const now = moment();
    switch (periodType) {
      case 'weekly':
        return now.format('YYYY-WW');
      case 'monthly':
        return now.format('YYYY-MM');
      case 'quarterly':
        return now.format('YYYY-Q');
      case 'yearly':
        return now.format('YYYY');
      default:
        return now.format('YYYY-MM');
    }
  }
  
  static getPreviousPeriod(periodType) {
    const now = moment();
    switch (periodType) {
      case 'weekly':
        return now.subtract(1, 'week').format('YYYY-WW');
      case 'monthly':
        return now.subtract(1, 'month').format('YYYY-MM');
      case 'quarterly':
        return now.subtract(1, 'quarter').format('YYYY-Q');
      case 'yearly':
        return now.subtract(1, 'year').format('YYYY');
      default:
        return now.subtract(1, 'month').format('YYYY-MM');
    }
  }
  
  static async getPeriodData(userId, period, periodType) {
    const startDate = this.getPeriodStartDate(period, periodType);
    const endDate = this.getPeriodEndDate(period, periodType);
    
    const expenses = await Expense.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const income = await Income.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    return { expenses, income, period };
  }
  
  static getPeriodStartDate(period, periodType) {
    switch (periodType) {
      case 'weekly':
        return moment(period, 'YYYY-WW').startOf('week').toDate();
      case 'monthly':
        return moment(period, 'YYYY-MM').startOf('month').toDate();
      case 'quarterly':
        return moment(period, 'YYYY-Q').startOf('quarter').toDate();
      case 'yearly':
        return moment(period, 'YYYY').startOf('year').toDate();
      default:
        return moment(period, 'YYYY-MM').startOf('month').toDate();
    }
  }
  
  static getPeriodEndDate(period, periodType) {
    switch (periodType) {
      case 'weekly':
        return moment(period, 'YYYY-WW').endOf('week').toDate();
      case 'monthly':
        return moment(period, 'YYYY-MM').endOf('month').toDate();
      case 'quarterly':
        return moment(period, 'YYYY-Q').endOf('quarter').toDate();
      case 'yearly':
        return moment(period, 'YYYY').endOf('year').toDate();
      default:
        return moment(period, 'YYYY-MM').endOf('month').toDate();
    }
  }

  static async getHistoricalData(userId, periodType, periods = 12) {
    const historicalData = [];
    const now = moment();

    for (let i = 0; i < periods; i++) {
      let period;
      switch (periodType) {
        case 'weekly':
          period = now.clone().subtract(i, 'weeks').format('YYYY-WW');
          break;
        case 'monthly':
          period = now.clone().subtract(i, 'months').format('YYYY-MM');
          break;
        case 'quarterly':
          period = now.clone().subtract(i, 'quarters').format('YYYY-Q');
          break;
        case 'yearly':
          period = now.clone().subtract(i, 'years').format('YYYY');
          break;
        default:
          period = now.clone().subtract(i, 'months').format('YYYY-MM');
      }

      const data = await this.getPeriodData(userId, period, periodType);
      historicalData.push(data);
    }

    return historicalData.reverse(); 
  }

  static calculateCategoryBreakdown(expenses) {
    const categories = {};
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    expenses.forEach(exp => {
      if (!categories[exp.category]) {
        categories[exp.category] = { amount: 0, count: 0 };
      }
      categories[exp.category].amount += exp.amount;
      categories[exp.category].count += 1;
    });

    return Object.entries(categories).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
      transactionCount: data.count
    }));
  }

  static calculateDailyAverages(expenses) {
    const weekdayExpenses = [];
    const weekendExpenses = [];

    expenses.forEach(exp => {
      const dayOfWeek = moment(exp.createdAt).day();
      if (dayOfWeek === 0 || dayOfWeek === 6) { 
        weekendExpenses.push(exp.amount);
      } else {
        weekdayExpenses.push(exp.amount);
      }
    });

    return {
      weekdays: weekdayExpenses.length > 0 ?
        weekdayExpenses.reduce((sum, amt) => sum + amt, 0) / weekdayExpenses.length : 0,
      weekends: weekendExpenses.length > 0 ?
        weekendExpenses.reduce((sum, amt) => sum + amt, 0) / weekendExpenses.length : 0
    };
  }

  static findPeakSpendingDays(expenses) {
    const dayTotals = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    expenses.forEach(exp => {
      const dayOfWeek = moment(exp.createdAt).day();
      const dayName = dayNames[dayOfWeek];

      if (!dayTotals[dayName]) {
        dayTotals[dayName] = 0;
      }
      dayTotals[dayName] += exp.amount;
    });

    return Object.entries(dayTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);
  }

  static calculateHistoricalStats(historicalData) {
    const categories = {};
    const frequency = {};

    historicalData.forEach(period => {
      period.expenses.forEach(exp => {
        if (!categories[exp.category]) {
          categories[exp.category] = [];
        }
        categories[exp.category].push(exp.amount);

        frequency[exp.category] = (frequency[exp.category] || 0) + 1;
      });
    });

    
    Object.keys(categories).forEach(category => {
      const amounts = categories[category];
      const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      categories[category] = { mean, stdDev, count: amounts.length };
    });

    
    Object.keys(frequency).forEach(category => {
      frequency[category] = frequency[category] / historicalData.length;
    });

    return { categories, frequency };
  }

  static linearRegression(values) {
    const n = values.length;
    if (n === 0) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    
    return slope * n + intercept;
  }

  static predictCategoryBreakdown(historicalData, totalPredicted) {
    const categoryTotals = {};
    let overallTotal = 0;

    
    historicalData.forEach(period => {
      const periodTotal = period.expenses.reduce((sum, exp) => sum + exp.amount, 0);

      period.expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
          categoryTotals[exp.category] = [];
        }
        if (periodTotal > 0) {
          categoryTotals[exp.category].push((exp.amount / periodTotal) * 100);
        }
      });

      overallTotal += periodTotal;
    });

    
    const categoryBreakdown = [];
    Object.keys(categoryTotals).forEach(category => {
      const percentages = categoryTotals[category];
      const avgPercentage = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;

      categoryBreakdown.push({
        category,
        amount: (totalPredicted * avgPercentage) / 100
      });
    });

    return categoryBreakdown;
  }

  static async assessBudgetRisk(currentData, predictedExpenses) {
    const { expenses } = currentData;
    const currentTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    
    const spendingIncrease = predictedExpenses > currentTotal ?
      ((predictedExpenses - currentTotal) / currentTotal) * 100 : 0;

    let level = 'low';
    let probability = 0.2;

    if (spendingIncrease > 20) {
      level = 'high';
      probability = 0.8;
    } else if (spendingIncrease > 10) {
      level = 'medium';
      probability = 0.5;
    }

    
    const categoryGrowth = {};
    expenses.forEach(exp => {
      categoryGrowth[exp.category] = (categoryGrowth[exp.category] || 0) + exp.amount;
    });

    const categoriesAtRisk = Object.entries(categoryGrowth)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return {
      level,
      categories: categoriesAtRisk,
      probability
    };
  }

  static calculateSavingsPotential(currentData, historicalData) {
    const { expenses, income } = currentData;
    const currentTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    
    let historicalSavingsRates = [];
    historicalData.forEach(period => {
      const periodExpenses = period.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const periodIncome = period.income.reduce((sum, inc) => sum + inc.amount, 0);

      if (periodIncome > 0) {
        const savingsRate = ((periodIncome - periodExpenses) / periodIncome) * 100;
        historicalSavingsRates.push(savingsRate);
      }
    });

    const avgSavingsRate = historicalSavingsRates.length > 0 ?
      historicalSavingsRates.reduce((sum, rate) => sum + rate, 0) / historicalSavingsRates.length : 0;

    
    const currentSavingsRate = currentIncome > 0 ?
      ((currentIncome - currentTotal) / currentIncome) * 100 : 0;

    const targetSavingsRate = Math.max(avgSavingsRate + 5, 20); 
    const potentialSavings = currentIncome > 0 ?
      (currentIncome * (targetSavingsRate / 100)) - (currentIncome - currentTotal) : 0;

    const recommendations = [];
    if (potentialSavings > 0) {
      recommendations.push(`Reduce spending by ₹${potentialSavings.toFixed(2)} to reach ${targetSavingsRate.toFixed(1)}% savings rate`);
      recommendations.push('Consider reviewing discretionary expenses');
      recommendations.push('Look for subscription services you can cancel');
    }

    return {
      amount: Math.max(potentialSavings, 0),
      recommendations
    };
  }

  static async calculateMetrics(userId, currentData, previousData) {
    const { expenses, income } = currentData;
    const currentExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    const previousExpenses = previousData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const previousIncome = previousData.income.reduce((sum, inc) => sum + inc.amount, 0);

    
    const budgets = await Budget.find({ userId });
    let budgetAdherence = 100;

    if (budgets.length > 0) {
      const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
      budgetAdherence = totalBudget > 0 ?
        Math.max(0, ((totalBudget - currentExpenses) / totalBudget) * 100) : 0;
    }

    
    const savingsRate = currentIncome > 0 ?
      ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;

    
    const expenseGrowthRate = previousExpenses > 0 ?
      ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;

    
    const healthScore = this.calculateFinancialHealthScore({
      savingsRate,
      budgetAdherence,
      expenseGrowthRate,
      debtToIncomeRatio: 0 
    });

    return {
      budgetAdherence,
      savingsRate,
      expenseGrowthRate,
      financialHealthScore: healthScore,
      debtToIncomeRatio: 0 
    };
  }

  static calculateFinancialHealthScore({ savingsRate, budgetAdherence, expenseGrowthRate, debtToIncomeRatio }) {
    let score = 0;

    
    if (savingsRate >= 20) score += 30;
    else if (savingsRate >= 10) score += 20;
    else if (savingsRate >= 5) score += 10;

    
    score += (budgetAdherence / 100) * 25;

    
    if (expenseGrowthRate <= 0) score += 25; 
    else if (expenseGrowthRate <= 5) score += 20;
    else if (expenseGrowthRate <= 10) score += 10;

    
    if (debtToIncomeRatio <= 0.1) score += 20;
    else if (debtToIncomeRatio <= 0.3) score += 15;
    else if (debtToIncomeRatio <= 0.5) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  static async analyzeSeasonalTrends(historicalData) {
    const monthlyData = {};

    
    historicalData.forEach(period => {
      const month = moment(period.period, 'YYYY-MM').month() + 1; 

      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }

      const total = period.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      monthlyData[month].push(total);
    });

    
    const overallAverage = Object.values(monthlyData)
      .flat()
      .reduce((sum, val, _, arr) => sum + val / arr.length, 0);

    const monthlyMultipliers = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyData[month] || [];
      const monthAverage = monthData.length > 0 ?
        monthData.reduce((sum, val) => sum + val, 0) / monthData.length : overallAverage;

      monthlyMultipliers.push({
        month,
        multiplier: overallAverage > 0 ? monthAverage / overallAverage : 1
      });
    }

    return {
      monthlyMultipliers,
      seasonalCategories: [] 
    };
  }
}

module.exports = AnalyticsService;
