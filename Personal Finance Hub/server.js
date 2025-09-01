const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require('dotenv').config();


const User = require("./models/User");
const Expense = require("./models/Expense");
const RecurringExpense = require("./models/RecurringExpense");
const Budget = require("./models/Budget");
const SavingsGoal = require("./models/SavingsGoal");
const Income = require("./models/Income");
const Analytics = require("./models/Analytics");
const Family = require("./models/Family");
const SharedExpense = require("./models/SharedExpense");
const Category = require("./models/Category");
const Notification = require("./models/Notification");
const Goal = require("./models/Goal");


const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");
const recurringRoutes = require("./routes/recurring");
const budgetRoutes = require("./routes/budgets");
const savingsRoutes = require("./routes/savings");
const incomeRoutes = require("./routes/income");
const analyticsRoutes = require("./routes/analytics");
const familyRoutes = require("./routes/family");
const sharedExpensesRoutes = require("./routes/sharedExpenses");
const reportsRoutes = require("./routes/reports");
const categoryRoutes = require("./routes/categories");
const notificationRoutes = require("./routes/notifications");
const goalRoutes = require("./routes/goals");


const { auth } = require("./middleware/auth");

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});


app.use((req, res, next) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});


const MONGODB_URI = process.env.MONGODB_URI;

async function connectToMongo() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set. Please set it in your .env file.');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB (Atlas)');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    
    process.exit(1);
  }
}

connectToMongo();


app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/recurring-expenses", recurringRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/savings", savingsRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/shared-expenses", sharedExpensesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/goals", goalRoutes);


app.get(["/", "/login", "/signup"], (req, res, next) => {
  const file = req.path === '/signup' ? 'signup.html' : req.path === '/login' ? 'login.html' : 'index.html';
  res.sendFile(path.join(__dirname, file));
});

// Catch-all handler for undefined routes
app.get('*', (req, res) => {
  // If it's an API request, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // For all other requests, serve the main app
  res.sendFile(path.join(__dirname, 'index.html'));
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});