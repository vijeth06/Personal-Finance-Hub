const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const Income = require('../models/Income');

class BudgetService {
  
  
  static async create50302Budget(userId, totalIncome, year, month) {
    const needs = totalIncome * 0.5;
    const wants = totalIncome * 0.3;
    const savings = totalIncome * 0.2;
    
    const budget = new Budget({
      userId,
      name: `50/30/20 Budget - ${month}/${year}`,
      budgetType: '50-30-20',
      year,
      month,
      amount: totalIncome,
      fiftyThirtyTwenty: {
        needs: {
          allocated: needs,
          categories: ['Rent', 'Utilities', 'Groceries', 'Transportation', 'Insurance']
        },
        wants: {
          allocated: wants,
          categories: ['Entertainment', 'Dining Out', 'Shopping', 'Hobbies']
        },
        savings: {
          allocated: savings,
          categories: ['Emergency Fund', 'Retirement', 'Investments']
        }
      }
    });
    
    return await budget.save();
  }
  
  
  static async createZeroBasedBudget(userId, totalIncome, allocations, year, month) {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const unallocated = totalIncome - totalAllocated;
    
    const budget = new Budget({
      userId,
      name: `Zero-Based Budget - ${month}/${year}`,
      budgetType: 'zero-based',
      year,
      month,
      amount: totalIncome,
      zeroBased: {
        totalIncome,
        allocations,
        unallocated
      }
    });
    
    return await budget.save();
  }
  
  
  static async createEnvelopeBudget(userId, envelopes, year, month) {
    const totalAmount = envelopes.reduce((sum, env) => sum + env.budgetAmount, 0);
    
    const budget = new Budget({
      userId,
      name: `Envelope Budget - ${month}/${year}`,
      budgetType: 'envelope',
      year,
      month,
      amount: totalAmount,
      envelope: {
        envelopes: envelopes.map(env => ({
          ...env,
          currentAmount: env.budgetAmount 
        }))
      }
    });
    
    return await budget.save();
  }
  
  
  static async updateBudgetSpending(userId, budgetId, expenses) {
    const budget = await Budget.findOne({ _id: budgetId, userId });
    if (!budget) throw new Error('Budget not found');
    
    switch (budget.budgetType) {
      case '50-30-20':
        return await this.update50302Spending(budget, expenses);
      case 'zero-based':
        return await this.updateZeroBasedSpending(budget, expenses);
      case 'envelope':
        return await this.updateEnvelopeSpending(budget, expenses);
      default:
        return budget;
    }
  }
  
  
  static async update50302Spending(budget, expenses) {
    const needsCategories = budget.fiftyThirtyTwenty.needs.categories;
    const wantsCategories = budget.fiftyThirtyTwenty.wants.categories;
    const savingsCategories = budget.fiftyThirtyTwenty.savings.categories;
    
    let needsSpent = 0;
    let wantsSpent = 0;
    let savingsSpent = 0;
    
    expenses.forEach(expense => {
      if (needsCategories.includes(expense.category)) {
        needsSpent += expense.amount;
      } else if (wantsCategories.includes(expense.category)) {
        wantsSpent += expense.amount;
      } else if (savingsCategories.includes(expense.category)) {
        savingsSpent += expense.amount;
      }
    });
    
    budget.fiftyThirtyTwenty.needs.spent = needsSpent;
    budget.fiftyThirtyTwenty.wants.spent = wantsSpent;
    budget.fiftyThirtyTwenty.savings.spent = savingsSpent;
    
    return await budget.save();
  }
  
  
  static async updateZeroBasedSpending(budget, expenses) {
    const categorySpending = {};
    
    expenses.forEach(expense => {
      categorySpending[expense.category] = (categorySpending[expense.category] || 0) + expense.amount;
    });
    
    budget.zeroBased.allocations.forEach(allocation => {
      allocation.spent = categorySpending[allocation.category] || 0;
    });
    
    return await budget.save();
  }
  
  
  static async updateEnvelopeSpending(budget, expenses) {
    budget.envelope.envelopes.forEach(envelope => {
      let spent = 0;
      
      expenses.forEach(expense => {
        if (envelope.categories.includes(expense.category)) {
          spent += expense.amount;
        }
      });
      
      envelope.currentAmount = Math.max(0, envelope.budgetAmount - spent);
    });
    
    return await budget.save();
  }
  
  
  static async getBudgetAnalysis(userId, budgetId) {
    const budget = await Budget.findOne({ _id: budgetId, userId });
    if (!budget) throw new Error('Budget not found');
    
    const analysis = {
      budget,
      performance: {},
      recommendations: [],
      alerts: []
    };
    
    switch (budget.budgetType) {
      case '50-30-20':
        analysis.performance = this.analyze50302Performance(budget);
        break;
      case 'zero-based':
        analysis.performance = this.analyzeZeroBasedPerformance(budget);
        break;
      case 'envelope':
        analysis.performance = this.analyzeEnvelopePerformance(budget);
        break;
    }
    
    
    analysis.recommendations = this.generateRecommendations(budget, analysis.performance);
    analysis.alerts = this.generateAlerts(budget, analysis.performance);
    
    return analysis;
  }
  
  
  static analyze50302Performance(budget) {
    const { needs, wants, savings } = budget.fiftyThirtyTwenty;
    
    return {
      needs: {
        allocated: needs.allocated,
        spent: needs.spent,
        remaining: needs.allocated - needs.spent,
        percentage: needs.allocated > 0 ? (needs.spent / needs.allocated) * 100 : 0
      },
      wants: {
        allocated: wants.allocated,
        spent: wants.spent,
        remaining: wants.allocated - wants.spent,
        percentage: wants.allocated > 0 ? (wants.spent / wants.allocated) * 100 : 0
      },
      savings: {
        allocated: savings.allocated,
        spent: savings.spent,
        remaining: savings.allocated - savings.spent,
        percentage: savings.allocated > 0 ? (savings.spent / savings.allocated) * 100 : 0
      }
    };
  }
  
  
  static analyzeZeroBasedPerformance(budget) {
    const { totalIncome, allocations, unallocated } = budget.zeroBased;
    
    const performance = {
      totalIncome,
      totalAllocated: allocations.reduce((sum, alloc) => sum + alloc.amount, 0),
      totalSpent: allocations.reduce((sum, alloc) => sum + (alloc.spent || 0), 0),
      unallocated,
      categories: []
    };
    
    allocations.forEach(allocation => {
      const spent = allocation.spent || 0;
      performance.categories.push({
        category: allocation.category,
        allocated: allocation.amount,
        spent,
        remaining: allocation.amount - spent,
        percentage: allocation.amount > 0 ? (spent / allocation.amount) * 100 : 0,
        priority: allocation.priority,
        isFixed: allocation.isFixed
      });
    });
    
    return performance;
  }
  
  
  static analyzeEnvelopePerformance(budget) {
    const { envelopes } = budget.envelope;
    
    return {
      totalBudget: envelopes.reduce((sum, env) => sum + env.budgetAmount, 0),
      totalRemaining: envelopes.reduce((sum, env) => sum + env.currentAmount, 0),
      envelopes: envelopes.map(envelope => ({
        name: envelope.name,
        budgetAmount: envelope.budgetAmount,
        currentAmount: envelope.currentAmount,
        spent: envelope.budgetAmount - envelope.currentAmount,
        percentage: envelope.budgetAmount > 0 ? 
          ((envelope.budgetAmount - envelope.currentAmount) / envelope.budgetAmount) * 100 : 0,
        categories: envelope.categories,
        color: envelope.color
      }))
    };
  }
  
  
  static generateRecommendations(budget, performance) {
    const recommendations = [];
    
    if (budget.budgetType === '50-30-20') {
      if (performance.needs.percentage > 100) {
        recommendations.push('Consider reducing needs expenses or increasing income');
      }
      if (performance.wants.percentage > 100) {
        recommendations.push('You\'re overspending on wants. Try to cut back on discretionary expenses');
      }
      if (performance.savings.percentage < 50) {
        recommendations.push('Great job on savings! Consider increasing your savings rate');
      }
    }
    
    return recommendations;
  }
  
  
  static generateAlerts(budget, performance) {
    const alerts = [];
    const threshold = budget.settings.alertThreshold;
    
    if (budget.budgetType === '50-30-20') {
      if (performance.needs.percentage >= threshold * 100) {
        alerts.push({
          type: 'warning',
          message: `Needs spending is at ${performance.needs.percentage.toFixed(1)}% of budget`,
          category: 'needs'
        });
      }
    }
    
    return alerts;
  }
}

module.exports = BudgetService;
