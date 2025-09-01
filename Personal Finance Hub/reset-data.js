
const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const RecurringExpense = require('./models/RecurringExpense');
const Income = require('./models/Income');
const Budget = require('./models/Budget');
const Category = require('./models/Category');
const SavingsGoal = require('./models/SavingsGoal');
const Goal = require('./models/Goal');
const Notification = require('./models/Notification');
const User = require('./models/User');
const BudgetService = require('./services/budgetService');
const AnalyticsService = require('./services/analyticsService');


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      
      const demoEmail = 'vijethvijeth957@gmail.com';
      const demoPassword = '123456';
      let user = await User.findOne({ email: demoEmail });
      
      if (!user) {
        console.log(`Demo user ${demoEmail} not found. Creating...`);
        const newUser = new User({
          name: 'Vijeth',
          email: demoEmail,
          password: demoPassword
        });
        await newUser.save();
        console.log('Vijeth created successfully');
        user = newUser;
      } else {
        
        if (user.name !== 'Vijeth') {
          user.name = 'Vijeth';
          await user.save();
          console.log('User name updated to Vijeth');
        } else {
          console.log('User Vijeth already exists with correct name');
        }
      }
      const userId = user._id;
      
      
      await Promise.all([
        Expense.deleteMany({ userId }),
        RecurringExpense.deleteMany({ userId }),
        Income.deleteMany({ userId }),
        Budget.deleteMany({ userId }),
        Category.deleteMany({ userId }),
        SavingsGoal.deleteMany({ userId }),
        Goal.deleteMany({ userId }),
        Notification.deleteMany({ userId })
      ]);
      console.log('Cleared existing user data');
      
      
      const today = new Date();
      const currentMonth = today.toISOString().slice(0, 7);
      
      
      const getMonthString = (monthsAgo) => {
        const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
        return date.toISOString().slice(0, 7);
      };
      
      const lastMonth = getMonthString(1);
      const twoMonthsAgo = getMonthString(2);
      const threeMonthsAgo = getMonthString(3);
      
      
      const julyMonth = '2025-07';
      const yearNum = today.getFullYear();
      const monthStr = String(today.getMonth() + 1).padStart(2, '0');
      
      
      const sampleExpenses = [
        
        {
          name: 'Monthly Rent',
          amount: 5000,
          category: 'Rent',
          month: currentMonth,
          userId
        },
        {
          name: 'Electricity Bill',
          amount: 1200,
          category: 'Electricity',
          month: currentMonth,
          userId
        },
        {
          name: 'Water Bill',
          amount: 450,
          category: 'Water',
          month: currentMonth,
          userId
        },
        {
          name: 'Internet Bill',
          amount: 999,
          category: 'Internet',
          month: currentMonth,
          userId
        },
        {
          name: 'Grocery Shopping',
          amount: 1500,
          category: 'Other',
          month: currentMonth,
          userId
        },
        
        
        {
          name: 'Monthly Rent',
          amount: 5000,
          category: 'Rent',
          month: lastMonth,
          userId
        },
        {
          name: 'Electricity Bill',
          amount: 1350,
          category: 'Electricity',
          month: lastMonth,
          userId
        },
        {
          name: 'Water Bill',
          amount: 420,
          category: 'Water',
          month: lastMonth,
          userId
        },
        {
          name: 'Internet Bill',
          amount: 999,
          category: 'Internet',
          month: lastMonth,
          userId
        },
        {
          name: 'Grocery Shopping',
          amount: 1800,
          category: 'Other',
          month: lastMonth,
          userId
        },
        
        
        {
          name: 'Monthly Rent',
          amount: 5000,
          category: 'Rent',
          month: twoMonthsAgo,
          userId
        },
        {
          name: 'Electricity Bill',
          amount: 1100,
          category: 'Electricity',
          month: twoMonthsAgo,
          userId
        },
        {
          name: 'Water Bill',
          amount: 400,
          category: 'Water',
          month: twoMonthsAgo,
          userId
        },
        {
          name: 'Internet Bill',
          amount: 999,
          category: 'Internet',
          month: twoMonthsAgo,
          userId
        },
        {
          name: 'Grocery Shopping',
          amount: 1600,
          category: 'Other',
          month: twoMonthsAgo,
          userId
        },
        
        
        {
          name: 'Electricity Bill',
          amount: 1200,
          category: 'Electricity',
          month: julyMonth,
          userId
        },
        {
          name: 'Water Bill',
          amount: 450,
          category: 'Water',
          month: julyMonth,
          userId
        },
        {
          name: 'Internet Bill',
          amount: 999,
          category: 'Internet',
          month: julyMonth,
          userId
        },
        {
          name: 'Grocery Shopping',
          amount: 1800,
          category: 'Food',
          month: julyMonth,
          userId
        },
        {
          name: 'Emergency Car Repair',
          amount: 2000,
          category: 'Emergency Fund',
          month: julyMonth,
          userId
        },
        {
          name: 'Medical Emergency',
          amount: 1500,
          category: 'Emergency Fund',
          month: julyMonth,
          userId
        },
        {
          name: 'Movie Night',
          amount: 600,
          category: 'Entertainment',
          month: julyMonth,
          userId
        },
        {
          name: 'Fuel',
          amount: 450,
          category: 'Transportation',
          month: julyMonth,
          userId
        }
      ];
      
      
      await Expense.insertMany(sampleExpenses);
      console.log(`${sampleExpenses.length} sample expenses added`);
      
      
      const calculateNextDueDate = (dayOfMonth) => {
        const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
        
        
        if (nextDueDate < today) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
        
        return nextDueDate;
      };
      
      
      const sampleRecurringExpenses = [
        {
          name: 'Monthly Rent',
          amount: 5000,
          category: 'Rent',
          frequency: 'monthly',
          dayOfMonth: 5,
          reminderDays: 3,
          nextDueDate: calculateNextDueDate(5),
          userId
        },
        {
          name: 'Electricity Bill',
          amount: 1200,
          category: 'Electricity',
          frequency: 'monthly',
          dayOfMonth: 15,
          reminderDays: 2,
          nextDueDate: calculateNextDueDate(15),
          userId
        },
        {
          name: 'Water Bill',
          amount: 450,
          category: 'Water',
          frequency: 'monthly',
          dayOfMonth: 20,
          reminderDays: 2,
          nextDueDate: calculateNextDueDate(20),
          userId
        },
        {
          name: 'Internet Bill',
          amount: 999,
          category: 'Internet',
          frequency: 'monthly',
          dayOfMonth: 10,
          reminderDays: 3,
          nextDueDate: calculateNextDueDate(10),
          userId
        },
        {
          name: 'Home Insurance',
          amount: 3000,
          category: 'Healthcare',
          frequency: 'monthly',
          dayOfMonth: 25,
          reminderDays: 5,
          nextDueDate: calculateNextDueDate(25),
          userId
        },
        {
          name: 'Mobile Bill',
          amount: 599,
          category: 'Internet',
          frequency: 'monthly',
          dayOfMonth: 28,
          reminderDays: 3,
          nextDueDate: calculateNextDueDate(28),
          userId
        },
        {
          name: 'Grocery Budget',
          amount: 2000,
          category: 'Food',
          frequency: 'monthly',
          dayOfMonth: 5,
          reminderDays: 2,
          nextDueDate: calculateNextDueDate(5),
          userId
        }
      ];
      
      
      await RecurringExpense.insertMany(sampleRecurringExpenses);
      console.log(`${sampleRecurringExpenses.length} sample recurring expenses added`);

      
      const defaultCategories = [
        { name: 'Rent', icon: '🏠', color: '#ef4444', isDefault: true },
        { name: 'Water', icon: '💧', color: '#3b82f6', isDefault: true },
        { name: 'Electricity', icon: '⚡', color: '#f59e0b', isDefault: true },
        { name: 'Internet', icon: '🌐', color: '#8b5cf6', isDefault: true },
        { name: 'Food', icon: '🍽️', color: '#10b981', isDefault: true },
        { name: 'Transportation', icon: '🚗', color: '#f97316', isDefault: true },
        { name: 'Healthcare', icon: '🏥', color: '#ec4899', isDefault: true },
        { name: 'Entertainment', icon: '🎬', color: '#06b6d4', isDefault: true },
        { name: 'Shopping', icon: '🛍️', color: '#84cc16', isDefault: true },
        { name: 'Emergency Fund', icon: '🚨', color: '#dc2626', isDefault: true },
        { name: 'Other', icon: '📝', color: '#6b7280', isDefault: true }
      ].map(c => ({ ...c, userId }));
      await Category.insertMany(defaultCategories);
      console.log(`${defaultCategories.length} default categories added`);

      
      const sampleIncome = [
        { userId, source: 'Salary', amount: 25000, category: 'salary', frequency: 'monthly', date: new Date(yearNum, today.getMonth(), 1), description: 'Monthly salary' },
        { userId, source: 'Freelance Project', amount: 6000, category: 'freelance', frequency: 'one-time', date: new Date(yearNum, today.getMonth(), 12), description: 'Side project' },
        { userId, source: 'Salary', amount: 25000, category: 'salary', frequency: 'monthly', date: new Date(yearNum, today.getMonth() - 1, 1), description: 'Monthly salary' },
        { userId, source: 'Salary', amount: 25000, category: 'salary', frequency: 'monthly', date: new Date(yearNum, today.getMonth() - 2, 1), description: 'Monthly salary' },
        { userId, source: 'Bonus', amount: 3000, category: 'bonus', frequency: 'one-time', date: new Date(yearNum, today.getMonth() - 2, 15), description: 'Quarterly bonus' },
        { userId, source: 'Salary', amount: 25000, category: 'salary', frequency: 'monthly', date: new Date(2024, 6, 1), description: 'July 2024 salary' },
        { userId, source: 'Freelance Work', amount: 4500, category: 'freelance', frequency: 'one-time', date: new Date(2024, 6, 20), description: 'July freelance project' },
        { userId, source: 'Salary', amount: 45000, category: 'salary', frequency: 'monthly', date: new Date(2025, 6, 1), description: 'July 2025 salary' },
        { userId, source: 'Bonus', amount: 5000, category: 'bonus', frequency: 'one-time', date: new Date(2025, 6, 15), description: 'July 2025 bonus' }
      ];
      await Income.insertMany(sampleIncome);
      console.log(`${sampleIncome.length} income entries added`);

      
      const estimateTestIncome = {
        userId,
        source: 'Estimate Test Income',
        amount: 12345,
        category: 'other',
        frequency: 'one-time',
        date: new Date(yearNum, today.getMonth(), today.getDate()),
        description: 'For testing Estimated Savings display'
      };
      await Income.create(estimateTestIncome);
      console.log('Added Estimate Test Income (₹12345) for current date');

      
      const sampleBudgets = [
        { userId, name: `Rent Budget - ${currentMonth}`, budgetType: 'traditional', amount: 5000, month: monthStr, year: yearNum, category: 'Rent' },
        { userId, name: `Utilities Budget - ${currentMonth}`, budgetType: 'traditional', amount: 3000, month: monthStr, year: yearNum, category: 'Electricity' },
        { userId, name: `Water Budget - ${currentMonth}`, budgetType: 'traditional', amount: 600, month: monthStr, year: yearNum, category: 'Water' },
        { userId, name: `Internet Budget - ${currentMonth}`, budgetType: 'traditional', amount: 1000, month: monthStr, year: yearNum, category: 'Internet' },
        { userId, name: `Other Budget - ${currentMonth}`, budgetType: 'traditional', amount: 3000, month: monthStr, year: yearNum, category: 'Other' },
        
        
        { userId, name: 'Rent Budget - July 2024', budgetType: 'traditional', amount: 5000, month: '07', year: 2024, category: 'Rent' },
        { userId, name: 'Utilities Budget - July 2024', budgetType: 'traditional', amount: 3000, month: '07', year: 2024, category: 'Electricity' },
        { userId, name: 'Water Budget - July 2024', budgetType: 'traditional', amount: 600, month: '07', year: 2024, category: 'Water' },
        { userId, name: 'Internet Budget - July 2024', budgetType: 'traditional', amount: 1000, month: '07', year: 2024, category: 'Internet' },
        { userId, name: 'Food Budget - July 2024', budgetType: 'traditional', amount: 2500, month: '07', year: 2024, category: 'Food' },
        { userId, name: 'Emergency Fund Budget - July 2024', budgetType: 'traditional', amount: 4000, month: '07', year: 2024, category: 'Emergency Fund' },
        { userId, name: 'Entertainment Budget - July 2024', budgetType: 'traditional', amount: 1000, month: '07', year: 2024, category: 'Entertainment' },
        { userId, name: 'Transportation Budget - July 2024', budgetType: 'traditional', amount: 1500, month: '07', year: 2024, category: 'Transportation' },
        { userId, name: 'Shopping Budget - July 2024', budgetType: 'traditional', amount: 3000, month: '07', year: 2024, category: 'Shopping' },
        { userId, name: 'Healthcare Budget - July 2024', budgetType: 'traditional', amount: 2000, month: '07', year: 2024, category: 'Healthcare' }
      ];
      await Budget.insertMany(sampleBudgets);
      console.log(`${sampleBudgets.length} traditional budgets added`);

      
      await BudgetService.create50302Budget(userId, 25000, yearNum, monthStr);
      console.log('50/30/20 budget created');

      
      const savings = new SavingsGoal({ userId, name: 'Emergency Fund', targetAmount: 60000, currentAmount: 15000, targetDate: new Date(yearNum, today.getMonth() + 6, 1), category: 'General' });
      await savings.save();
      
      
      const monthlyExpenses = 8000; 
      const emergencyFundGoal = new Goal({ 
        userId, 
        title: 'Emergency Fund', 
        description: '6 months expenses for financial security', 
        type: 'emergency_fund', 
        targetAmount: monthlyExpenses * 6, 
        currentAmount: 15000, 
        targetDate: new Date(yearNum, today.getMonth() + 8, 1), 
        priority: 'urgent', 
        category: 'Emergency', 
        icon: '🚨', 
        color: '#dc2626' 
      });
      await emergencyFundGoal.save();
      
      const vacationGoal = new Goal({ userId, title: 'Vacation Trip', description: 'Trip to Goa', type: 'savings', targetAmount: 40000, currentAmount: 10000, targetDate: new Date(yearNum, today.getMonth() + 4, 15), priority: 'high', category: 'Leisure', icon: '✈️', color: '#3b82f6' });
      await vacationGoal.save();
      
      console.log('Goals added');

      
      const notifications = [
        { userId, title: 'Welcome!', message: 'Sample data loaded. Explore your dashboard.', type: 'info', severity: 'medium' },
        { userId, title: 'Budget Alert: Electricity', message: 'You have used 80% of Electricity budget.', type: 'budget_alert', severity: 'high', actionRequired: false }
      ];
      await Notification.insertMany(notifications);
      console.log('Notifications added');

      
      await AnalyticsService.computeAnalytics(userId, 'monthly');
      console.log('Analytics computed');

      
      const allExpenses = await Expense.find({ userId }).sort({ createdAt: -1 });
      console.log('All expenses (latest first):');
      allExpenses.forEach(e => {
        console.log(`- ${e.name} | ₹${e.amount} | ${e.category} | ${e.month} | ${new Date(e.createdAt).toLocaleDateString()}`);
      });
      
      console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Error resetting database:', error);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });