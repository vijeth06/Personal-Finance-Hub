# 💰 Personal Finance Hub

A comprehensive full-stack personal finance management application built with Node.js, Express, and MongoDB. Track expenses, manage budgets, set savings goals, and gain insights into your financial health.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)

## ✨ Features

### 💳 Core Functionality
- **Expense Tracking** - Log and categorize all your expenses
- **Income Management** - Track multiple income sources
- **Budget Planning** - Set and monitor budgets by category
- **Savings Goals** - Create and track progress toward financial goals
- **Recurring Expenses** - Automate tracking of regular payments

### 👨‍👩‍👧‍👦 Family & Sharing
- **Family Accounts** - Manage household finances together
- **Shared Expenses** - Split costs with family members
- **User Roles** - Admin and member permission levels

### 📊 Analytics & Reports
- **Visual Analytics** - Interactive charts powered by Chart.js
- **Custom Reports** - Generate detailed financial reports
- **Spending Insights** - Identify patterns and trends
- **Export Options** - Download reports as PDF

### 🔔 Smart Features
- **Notifications** - Stay informed about budget limits and goals
- **Category Management** - Customize expense categories
- **Responsive Design** - Works seamlessly on all devices
- **Secure Authentication** - JWT-based user authentication

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/personal-finance-hub.git
   cd personal-finance-hub/Personal-Finance-Hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/personal-finance-hub
   JWT_SECRET=your-secret-key-here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   # Production
   npm start

   # Development (with auto-reload)
   npm run dev
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
Personal-Finance-Hub/
├── models/              # Mongoose database models
│   ├── User.js
│   ├── Expense.js
│   ├── Budget.js
│   ├── Income.js
│   └── ...
├── routes/              # API route handlers
│   ├── auth.js
│   ├── expenses.js
│   ├── budgets.js
│   └── ...
├── services/            # Business logic layer
│   ├── analyticsService.js
│   ├── budgetService.js
│   └── ...
├── middleware/          # Express middleware
│   └── auth.js
├── *.html              # Frontend HTML pages
├── *.css               # Stylesheets
├── script.js           # Frontend JavaScript
├── server.js           # Express server entry point
└── package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Income
- `GET /api/income` - Get all income sources
- `POST /api/income` - Add income
- `DELETE /api/income/:id` - Delete income

### Analytics
- `GET /api/analytics/summary` - Get financial summary
- `GET /api/analytics/spending-trends` - Get spending trends
- `GET /api/analytics/category-breakdown` - Category analysis

### Reports
- `POST /api/reports/generate` - Generate custom report
- `GET /api/reports/export` - Export data

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **HTML5/CSS3** - Structure and styling
- **JavaScript (ES6+)** - Client-side logic
- **Chart.js** - Data visualization
- **Bootstrap** - UI components
- **Font Awesome** - Icons

## 🌐 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`

### Deploy to Heroku

1. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables**
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-secret-key
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

### MongoDB Atlas Setup
Make sure your MongoDB Atlas cluster:
1. Allows connections from anywhere (0.0.0.0/0) or add your deployment platform's IP ranges
2. Has a database user with read/write permissions
3. Your connection string is properly formatted

## 🔒 Security

- Passwords are hashed using bcrypt
- JWT tokens for secure authentication
- Protected API routes with middleware
- Input validation and sanitization
- CORS enabled for secure cross-origin requests

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**
- GitHub: [vijeth](https://github.com/vijeth06)
- Email: vijethb06@gmail.com

## 🙏 Acknowledgments

- Chart.js for beautiful visualizations
- MongoDB for robust data storage
- The open-source community for inspiration

## 📧 Support

For support, email your.email@example.com or open an issue in the GitHub repository.

---

⭐ If you find this project helpful, please consider giving it a star!
