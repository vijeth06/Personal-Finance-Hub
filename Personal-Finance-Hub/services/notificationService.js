
class NotificationService {
  constructor() {
    this.userId = null;
    this.notifications = [];
  }

  
  init(userId) {
    this.userId = userId;
    this.checkBudgetAlerts();
    this.checkBillReminders();
    this.checkGoalProgress();
    this.checkUnusualSpending();
  }

  
  async createNotification(title, message, type, severity = 'medium', relatedId = null, actionRequired = false) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          message,
          type,
          severity,
          relatedId,
          actionRequired
        })
      });

      if (response.ok) {
        const notification = await response.json();
        this.notifications.unshift(notification);
        this.showToastNotification(notification);
        this.updateNotificationBadge();
        return notification;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  
  async checkBudgetAlerts() {
    try {
      const token = localStorage.getItem('token');
      
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [expensesRes, budgetsRes] = await Promise.all([
        fetch(`/api/expenses?month=${currentMonth}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/budgets', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (expensesRes.ok && budgetsRes.ok) {
        const expenses = await expensesRes.json();
        const budgets = await budgetsRes.json();

        
        const expensesByCategory = {};
        expenses.forEach(expense => {
          expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.amount;
        });

        
        budgets.forEach(budget => {
          if (budget.budgetType === 'traditional' && budget.category) {
            const spent = expensesByCategory[budget.category] || 0;
            const percentage = (spent / budget.amount) * 100;

            if (percentage >= 90) {
              this.createNotification(
                `Budget Alert: ${budget.category}`,
                `You've spent ₹${spent.toFixed(2)} (${percentage.toFixed(1)}%) of your ₹${budget.amount} ${budget.category} budget`,
                'budget_alert',
                'urgent',
                budget._id,
                true
              );
            } else if (percentage >= 75) {
              this.createNotification(
                `Budget Warning: ${budget.category}`,
                `You've spent ${percentage.toFixed(1)}% of your ${budget.category} budget`,
                'budget_alert',
                'high',
                budget._id
              );
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error);
    }
  }

  
  async checkBillReminders() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recurring-expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const recurringExpenses = await response.json();
        const today = new Date();
        
        recurringExpenses.forEach(expense => {
          const dueDate = new Date(expense.nextDueDate);
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue <= expense.reminderDays && daysUntilDue > 0) {
            this.createNotification(
              `Bill Reminder: ${expense.name}`,
              `${expense.name} of ₹${expense.amount} is due in ${daysUntilDue} days`,
              'bill_reminder',
              daysUntilDue <= 1 ? 'urgent' : 'high',
              expense._id,
              true
            );
          } else if (daysUntilDue < 0) {
            this.createNotification(
              `Overdue Bill: ${expense.name}`,
              `${expense.name} of ₹${expense.amount} was due ${Math.abs(daysUntilDue)} days ago`,
              'bill_reminder',
              'urgent',
              expense._id,
              true
            );
          }
        });
      }
    } catch (error) {
      console.error('Error checking bill reminders:', error);
    }
  }

  
  async checkGoalProgress() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const goals = await response.json();
        
        goals.forEach(goal => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          
          if (progress >= 100 && goal.status !== 'completed') {
            this.createNotification(
              `🎉 Goal Achieved: ${goal.title}`,
              `Congratulations! You've reached your goal of ₹${goal.targetAmount}`,
              'achievement',
              'medium',
              goal._id
            );
          } else if (progress >= 75 && progress < 100) {
            this.createNotification(
              `🎯 Almost There: ${goal.title}`,
              `You're ${progress.toFixed(1)}% of the way to your goal!`,
              'goal_progress',
              'medium',
              goal._id
            );
          }
        });
      }
    } catch (error) {
      console.error('Error checking goal progress:', error);
    }
  }

  
  async checkUnusualSpending() {
    try {
      const token = localStorage.getItem('token');
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      
      const [currentRes, previousRes] = await Promise.all([
        fetch(`/api/expenses?month=${currentMonth}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/expenses?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (currentRes.ok && previousRes.ok) {
        const currentExpenses = await currentRes.json();
        const allExpenses = await previousRes.json();

        const currentTotal = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        
        const monthlyTotals = {};
        allExpenses.forEach(exp => {
          if (exp.month !== currentMonth) {
            monthlyTotals[exp.month] = (monthlyTotals[exp.month] || 0) + exp.amount;
          }
        });

        const averageMonthly = Object.keys(monthlyTotals).length > 0 ?
          Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0) / Object.keys(monthlyTotals).length : 0;

        if (averageMonthly > 0 && currentTotal > averageMonthly * 1.5) {
          this.createNotification(
            '⚠️ High Spending Alert',
            `Your spending this month (₹${currentTotal.toFixed(2)}) is ${((currentTotal / averageMonthly - 1) * 100).toFixed(1)}% higher than usual`,
            'unusual_spending',
            'high'
          );
        }
      }
    } catch (error) {
      console.error('Error checking unusual spending:', error);
    }
  }

  
  showToastNotification(notification) {
    const toast = document.createElement('div');
    toast.className = `notification-toast ${notification.severity}`;
    toast.innerHTML = `
      <div class="toast-header">
        <strong>${notification.title}</strong>
        <button type="button" class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="toast-body">${notification.message}</div>
    `;

    const container = document.getElementById('toast-container') || this.createToastContainer();
    container.appendChild(toast);

    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  
  updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      const unreadCount = this.notifications.filter(n => !n.isRead).length;
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
  }

  
  async getNotifications() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.notifications = data.notifications;
        return data;
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    return { notifications: [], unreadCount: 0 };
  }

  
  async markAsRead(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const notification = this.notifications.find(n => n._id === notificationId);
        if (notification) {
          notification.isRead = true;
        }
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  
  async markAllAsRead() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.notifications.forEach(n => n.isRead = true);
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}


const notificationService = new NotificationService();


window.notificationService = notificationService;