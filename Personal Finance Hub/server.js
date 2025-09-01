const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// Load environment variables
require('dotenv').config();

// Error handling for missing environment variables
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}


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

// Security and performance middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Body parsing middleware with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: false
}));

// Static file serving
app.use(express.static(path.join(__dirname), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Request logging and security middleware
app.use((req, res, next) => {
  // Log requests in production for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  }
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS headers (additional to cors middleware)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});


// Enhanced health check endpoint
app.get('/health', (req, res) => {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      mongodb: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || 'unknown'
      }
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

const MONGODB_URI = process.env.MONGODB_URI;

let mongooseConnected = false;

async function connectToMongo() {
  if (mongooseConnected) {
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    });
    
    mongooseConnected = true;
    console.log('Connected to MongoDB (Atlas)');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      mongooseConnected = false;
    });
    
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    mongooseConnected = false;
    throw err;
  }
}

// Connect to MongoDB
connectToMongo().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});


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


// Static file routes with proper error handling
app.get(["/", "/login", "/signup"], (req, res, next) => {
  try {
    const file = req.path === '/signup' ? 'signup.html' : req.path === '/login' ? 'login.html' : 'index.html';
    const filePath = path.join(__dirname, file);
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error serving ${file}:`, err);
        res.status(404).json({ error: 'Page not found' });
      }
    });
  } catch (error) {
    console.error('Route error:', error);
    next(error);
  }
});

// Catch-all handler for undefined routes
app.get('*', (req, res) => {
  try {
    // If it's an API request, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    }
    
    // For all other requests, serve the main app
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Catch-all route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Don't send error details in production
  const errorResponse = {
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  };
  
  res.status(err.statusCode || 500).json(errorResponse);
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});


const PORT = process.env.PORT || 3000;

// Only start the server if this file is run directly (not when imported)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;