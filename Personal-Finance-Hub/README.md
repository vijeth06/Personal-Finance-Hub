# Personal Finance Hub - Deployment Guide

## Deploying to Vercel

### Prerequisites
1. A GitHub repository with your code
2. A MongoDB Atlas database
3. A Vercel account

### Step-by-Step Deployment

#### 1. Environment Variables Setup
Before deployment, you'll need to set up the following environment variables in Vercel:

- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure random string for JWT token signing

#### 2. Deploy to Vercel

**Option A: Using Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it as a Node.js project
5. Add your environment variables in the "Environment Variables" section
6. Click "Deploy"

**Option B: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel

# Follow the prompts and add environment variables when asked
```

#### 3. Set Environment Variables in Vercel
In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = a secure random string

#### 4. MongoDB Atlas Setup
Make sure your MongoDB Atlas cluster:
1. Allows connections from anywhere (0.0.0.0/0) or add Vercel's IP ranges
2. Has a database user with read/write permissions
3. Your connection string is properly formatted

### Project Structure
```
Personal Finance Hub/
├── models/           # Mongoose models
├── routes/          # Express routes
├── services/        # Business logic services
├── middleware/      # Express middleware
├── *.html          # Frontend files
├── *.css           # Stylesheets
├── *.js            # Frontend JavaScript
├── server.js       # Main server file
├── package.json    # Dependencies
└── vercel.json     # Vercel configuration
```

### Features
- User authentication and authorization
- Expense tracking and categorization
- Budget management
- Savings goals
- Family expense sharing
- Analytics and reporting
- Recurring expenses
- Income tracking

### API Endpoints
- `/api/auth/*` - Authentication
- `/api/expenses/*` - Expense management
- `/api/budgets/*` - Budget operations
- `/api/savings/*` - Savings goals
- `/api/income/*` - Income tracking
- `/api/analytics/*` - Analytics data
- `/api/family/*` - Family features
- `/api/shared-expenses/*` - Shared expenses
- `/api/reports/*` - Reporting
- `/api/categories/*` - Category management
- `/api/notifications/*` - Notifications
- `/api/goals/*` - Goal management

### Troubleshooting
1. **MongoDB Connection Issues**: Ensure your MONGODB_URI is correct and Atlas allows connections
2. **Environment Variables**: Make sure all required env vars are set in Vercel
3. **Build Errors**: Check the build logs in Vercel dashboard
4. **CORS Issues**: The app is configured to handle CORS automatically