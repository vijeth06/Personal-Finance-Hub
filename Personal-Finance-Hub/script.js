
let expenses = [];
let recurringExpenses = [];
let income = [];
let currentUser = null;


let API_BASE = window.location.origin;
if (window.location.protocol === 'file:' || API_BASE === 'null') {
  API_BASE = 'http://localhost:3000';
}
const savedApiBase = localStorage.getItem('apiBase');
if (savedApiBase) {
  API_BASE = savedApiBase;
}


function getAuthToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return token;
}


function getCurrentUser() {
  const user = localStorage.getItem('user');
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(user);
}


async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  if (!token) return null;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  const config = { ...defaultOptions, ...options };
  if (config.headers) {
    config.headers = { ...defaultOptions.headers, ...options.headers };
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return null;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    showNotification(error.message || 'Network error occurred', true);
    return null;
  }
}


function showNotification(message, isError = false) {
  const notificationsContainer = document.getElementById("notifications");
  if (!notificationsContainer) return;

  const notification = document.createElement("div");
  notification.className = `notification ${isError ? "error" : "success"}`;

  const icon = isError ? "❌" : "✅";
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <span style="font-size: 1.25rem;">${icon}</span>
      <span style="flex: 1; font-weight: 500;">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()"
              style="background: none; border: none; font-size: 1.5rem; cursor: pointer; opacity: 0.7; color: inherit; padding: 0; margin-left: 0.5rem;">
        ×
      </button>
    </div>
  `;

  notificationsContainer.appendChild(notification);

  
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  }, 10);

  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}


function setButtonLoading(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  } else {
    button.classList.remove('loading');
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}


function validateForm(formElement) {
  const inputs = formElement.querySelectorAll('input[required], select[required]');
  let isValid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.style.borderColor = 'var(--danger)';
      input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
      isValid = false;

      input.addEventListener('input', function() {
        this.style.borderColor = '';
        this.style.boxShadow = '';
      }, { once: true });
    }
  });

  return isValid;
}


function showProgressIndicator(text = 'Loading...') {
  const indicator = document.getElementById('progress-indicator');
  if (!indicator) return;
  
  const progressText = indicator.querySelector('.progress-text');
  const progressFill = indicator.querySelector('.progress-fill');

  if (progressText) progressText.textContent = text;
  if (progressFill) progressFill.style.width = '0%';
  indicator.style.display = 'flex';

  setTimeout(() => {
    if (progressFill) progressFill.style.width = '30%';
  }, 100);
}

function hideProgressIndicator() {
  const indicator = document.getElementById('progress-indicator');
  if (!indicator) return;
  
  const progressFill = indicator.querySelector('.progress-fill');
  if (progressFill) progressFill.style.width = '100%';

  setTimeout(() => {
    indicator.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
  }, 500);
}


async function loadExpenses() {
  try {
    showProgressIndicator('Loading expenses...');
    const data = await apiRequest('/api/expenses');
    if (data) {
      expenses = data;
      renderExpenses();
      updateDashboard();
      updateBudgetStatus();
      updateEmergencyFund();
    }
  } catch (error) {
    console.error('Error loading expenses:', error);
    showNotification('Failed to load expenses', true);
  } finally {
    hideProgressIndicator();
  }
}

async function loadRecurringExpenses() {
  try {
    const data = await apiRequest('/api/recurring-expenses');
    if (data) {
      recurringExpenses = data;
      renderRecurringExpenses();
      updateUpcomingExpenses();
    }
  } catch (error) {
    console.error('Error loading recurring expenses:', error);
    showNotification('Failed to load recurring expenses', true);
  }
}

async function loadIncome() {
  try {
    const data = await apiRequest('/api/income');
    if (data) {
      income = data;
      updateCashFlow();
    }
  } catch (error) {
    console.error('Error loading income:', error);
    showNotification('Failed to load income', true);
  }
}


async function submitExpenseForm() {
  console.log("Submitting expense form");

  const form = document.getElementById("expense-form-element");
  if (!form) {
    showNotification("Expense form not found", true);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!validateForm(form)) {
    showNotification("Please fill in all required fields", true);
    return;
  }

  setButtonLoading(submitButton, true);
  
  const name = document.getElementById("expense-name").value.trim();
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const category = document.getElementById("expense-category").value;
  const month = document.getElementById("expense-month").value;

  if (!name || !amount || !category || !month) {
    showNotification("Please fill out all fields", true);
    setButtonLoading(submitButton, false);
    return;
  }

  if (amount <= 0) {
    showNotification("Amount must be greater than 0", true);
    setButtonLoading(submitButton, false);
    return;
  }

  try {
    const expenseData = {
      name,
      amount,
      category,
      month
    };

    const result = await apiRequest('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });

    if (result) {
      showNotification(`Expense "${name}" added successfully! ₹${amount}`);
      
      
      form.reset();
      
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      document.getElementById('expense-month').value = currentMonth;
      
      
      await loadExpenses();
      
      
      const totalElement = document.getElementById("total-expense");
      if (totalElement) {
        totalElement.classList.add('pulse');
        setTimeout(() => totalElement.classList.remove('pulse'), 2000);
      }
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    showNotification('Failed to add expense', true);
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function submitRecurringExpenseForm() {
  console.log("Submitting recurring expense form");

  const form = document.getElementById("recurring-expense-form");
  if (!form) {
    showNotification("Recurring expense form not found", true);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!validateForm(form)) {
    showNotification("Please fill in all required fields", true);
    return;
  }

  setButtonLoading(submitButton, true);
  
  const name = document.getElementById("bill-name").value.trim();
  const amount = parseFloat(document.getElementById("bill-amount").value);
  const category = document.getElementById("bill-category").value;
  const frequency = document.getElementById("bill-frequency").value;
  const dayOfMonth = parseInt(document.getElementById("bill-day").value);
  const reminderDays = parseInt(document.getElementById("reminder-days").value);

  if (!name || !amount || !category || !frequency || !dayOfMonth || !reminderDays) {
    showNotification("Please fill out all fields", true);
    setButtonLoading(submitButton, false);
    return;
  }

  if (amount <= 0) {
    showNotification("Amount must be greater than 0", true);
    setButtonLoading(submitButton, false);
    return;
  }

  if (dayOfMonth < 1 || dayOfMonth > 31) {
    showNotification("Day of month must be between 1 and 31", true);
    setButtonLoading(submitButton, false);
    return;
  }

  try {
    const recurringData = {
      name,
      amount,
      category,
      frequency,
      dayOfMonth,
      reminderDays
    };

    const result = await apiRequest('/api/recurring-expenses', {
      method: 'POST',
      body: JSON.stringify(recurringData)
    });

    if (result) {
      showNotification(`Recurring expense "${name}" added successfully!`);
      
      
      form.reset();
      document.getElementById("reminder-days").value = "3"; 
      
      
      await loadRecurringExpenses();
    }
  } catch (error) {
    console.error('Error adding recurring expense:', error);
    showNotification('Failed to add recurring expense', true);
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function submitIncomeForm() {
  console.log("Submitting income form");

  const form = document.getElementById("income-form-element");
  if (!form) {
    showNotification("Income form not found", true);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!validateForm(form)) {
    showNotification("Please fill in all required fields", true);
    return;
  }

  setButtonLoading(submitButton, true);
  
  const source = document.getElementById("income-source").value.trim();
  const amount = parseFloat(document.getElementById("income-amount").value);
  const category = document.getElementById("income-category").value;
  const frequency = document.getElementById("income-frequency").value;
  const date = document.getElementById("income-date").value;
  const description = document.getElementById("income-description").value.trim();

  if (!source || !amount || !category || !date) {
    showNotification("Please fill out all required fields", true);
    setButtonLoading(submitButton, false);
    return;
  }

  if (amount <= 0) {
    showNotification("Amount must be greater than 0", true);
    setButtonLoading(submitButton, false);
    return;
  }

  try {
    const incomeData = {
      source,
      amount,
      category,
      frequency: frequency || 'one-time',
      date,
      description
    };

    const result = await apiRequest('/api/income', {
      method: 'POST',
      body: JSON.stringify(incomeData)
    });

    if (result) {
      showNotification(`Income "${source}" added successfully! ₹${amount}`);
      
      
      form.reset();
      
      
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('income-date').value = today;
      
      
      await loadIncome();
      updateCashFlow();
    }
  } catch (error) {
    console.error('Error adding income:', error);
    showNotification('Failed to add income', true);
  } finally {
    setButtonLoading(submitButton, false);
  }
}


async function submitGoalForm() {
  const form = document.getElementById('goal-form-element');
  if (!form) {
    showNotification('Goal form not found', true);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (!validateForm(form)) {
    showNotification('Please fill in all required fields', true);
    return;
  }

  setButtonLoading(submitButton, true);

  const name = document.getElementById('goal-name').value.trim();
  const targetAmount = parseFloat(document.getElementById('goal-target-amount').value);
  const currentAmount = parseFloat(document.getElementById('goal-current-amount').value) || 0;
  const targetDate = document.getElementById('goal-target-date').value;
  const category = document.getElementById('goal-category').value;
  const description = document.getElementById('goal-description').value.trim();

  try {
    const goalData = { name, targetAmount, currentAmount, targetDate, category, description };
    const result = await apiRequest('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    });

    if (result) {
      showNotification(`Goal "${name}" added successfully!`);
      form.reset();
      document.getElementById('goal-current-amount').value = '0';
      if (window.goalService && typeof window.goalService.renderGoalsDashboard === 'function') {
        await window.goalService.renderGoalsDashboard();
      }
    }
  } catch (error) {
    console.error('Error adding goal:', error);
    showNotification('Failed to add goal', true);
  } finally {
    setButtonLoading(submitButton, false);
  }
}


async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) {
    return;
  }

  try {
    const result = await apiRequest(`/api/expenses/${id}`, {
      method: 'DELETE'
    });

    if (result) {
      showNotification('Expense deleted successfully');
      await loadExpenses();
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    showNotification('Failed to delete expense', true);
  }
}

async function deleteRecurringExpense(id) {
  if (!confirm('Are you sure you want to delete this recurring expense?')) {
    return;
  }

  try {
    const result = await apiRequest(`/api/recurring-expenses/${id}`, {
      method: 'DELETE'
    });

    if (result) {
      showNotification('Recurring expense deleted successfully');
      await loadRecurringExpenses();
    }
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    showNotification('Failed to delete recurring expense', true);
  }
}


function renderExpenses() {
  const tableBody = document.getElementById("expense-table-body");
  if (!tableBody) return;

  if (!expenses || expenses.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">💸</div>
          <div style="font-size: 1.1rem; font-weight: 600;">No expenses found</div>
          <div style="font-size: 0.9rem; margin-top: 0.5rem;">Add your first expense to get started!</div>
        </td>
      </tr>
    `;
    return;
  }

  
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tableBody.innerHTML = sortedExpenses.map(expense => `
    <tr style="transition: all 0.2s ease;">
      <td style="font-weight: 600;">${expense.name}</td>
      <td style="font-weight: 700; color: var(--danger);">₹${expense.amount.toLocaleString()}</td>
      <td>
        <span class="category-badge category-${expense.category.toLowerCase()}">
          ${getCategoryIcon(expense.category)} ${expense.category}
        </span>
      </td>
      <td>${expense.month}</td>
      <td>${new Date(expense.createdAt).toLocaleDateString()}</td>
      <td>
        <button onclick="deleteExpense('${expense._id}')" 
                class="btn-modern btn-danger btn-sm"
                title="Delete expense">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderRecurringExpenses() {
  const tableBody = document.getElementById("due-expenses-table");
  if (!tableBody) return;

  if (!recurringExpenses || recurringExpenses.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
          <div style="font-size: 1.1rem; font-weight: 600;">No recurring expenses</div>
          <div style="font-size: 0.9rem; margin-top: 0.5rem;">Add recurring bills to track due dates!</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = recurringExpenses.map(expense => {
    const dueDate = new Date(expense.nextDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    let statusClass = 'status-upcoming';
    let statusText = 'Upcoming';
    
    if (daysUntilDue < 0) {
      statusClass = 'status-overdue';
      statusText = 'Overdue';
    } else if (daysUntilDue <= expense.reminderDays) {
      statusClass = 'status-due-soon';
      statusText = 'Due Soon';
    }

    return `
      <tr style="transition: all 0.2s ease;">
        <td style="font-weight: 600;">${expense.name}</td>
        <td style="font-weight: 700; color: var(--danger);">₹${expense.amount.toLocaleString()}</td>
        <td>
          <span class="category-badge category-${expense.category.toLowerCase()}">
            ${getCategoryIcon(expense.category)} ${expense.category}
          </span>
        </td>
        <td>${dueDate.toLocaleDateString()}</td>
        <td>
          <span class="status-badge ${statusClass}">
            ${daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days`}
          </span>
        </td>
        <td>
          <button onclick="deleteRecurringExpense('${expense._id}')" 
                  class="btn-modern btn-danger btn-sm"
                  title="Delete recurring expense">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}


function updateDashboard() {
  if (!expenses || expenses.length === 0) {
    document.getElementById("total-expense").textContent = "₹0";
    document.getElementById("avg-spend").textContent = "0";
    document.getElementById("highest-expense").textContent = "0";
    document.getElementById("savings").textContent = "0";
    return;
  }

  
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgSpend = total / expenses.length;
  const highestExpense = Math.max(...expenses.map(exp => exp.amount));

  
  document.getElementById("total-expense").textContent = `₹${total.toLocaleString()}`;
  document.getElementById("avg-spend").textContent = avgSpend.toLocaleString();
  document.getElementById("highest-expense").textContent = highestExpense.toLocaleString();
  
  
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const savings = Math.max(0, totalIncome - total);
  document.getElementById("savings").textContent = savings.toLocaleString();

  
  updateInsights();

  
  renderCharts();
}

function updateCashFlow() {
  const totalIncomeAmount = income.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netCashFlow = totalIncomeAmount - totalExpenseAmount;
  const savingsRate = totalIncomeAmount > 0 ? ((netCashFlow / totalIncomeAmount) * 100) : 0;

  
  const totalIncomeEl = document.getElementById("total-income");
  const avgIncomeEl = document.getElementById("avg-income");
  const netCashFlowEl = document.getElementById("net-cash-flow");
  const savingsRateEl = document.getElementById("savings-rate");

  if (totalIncomeEl) totalIncomeEl.textContent = `₹${totalIncomeAmount.toLocaleString()}`;
  if (avgIncomeEl) {
    const avgIncome = income.length > 0 ? totalIncomeAmount / income.length : 0;
    avgIncomeEl.textContent = `₹${avgIncome.toLocaleString()}`;
  }
  if (netCashFlowEl) {
    netCashFlowEl.textContent = `₹${netCashFlow.toLocaleString()}`;
    netCashFlowEl.style.color = netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (savingsRateEl) {
    savingsRateEl.textContent = `${savingsRate.toFixed(1)}%`;
    savingsRateEl.style.color = savingsRate >= 20 ? 'var(--success)' : savingsRate >= 10 ? 'var(--warning)' : 'var(--danger)';
  }
}

function updateInsights() {
  
  updateSpendingTrends();
  
  
  updateCategoryAnalysis();
  
  
  updateUpcomingExpenses();
  
  
  updateBudgetStatus();
  
  
  updateEmergencyFund();
}

function updateSpendingTrends() {
  const container = document.getElementById('spending-trends-content');
  if (!container) return;

  if (expenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 1rem;">📊</div>
        <div>No spending data available</div>
      </div>
    `;
    return;
  }

  
  const monthlyData = {};
  expenses.forEach(expense => {
    const month = expense.month;
    if (!monthlyData[month]) {
      monthlyData[month] = 0;
    }
    monthlyData[month] += expense.amount;
  });

  const months = Object.keys(monthlyData).sort();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSpending = monthlyData[currentMonth] || 0;

  container.innerHTML = `
    <div class="insight-summary">
      <div class="insight-stat">
        <div class="stat-value" style="color: var(--primary);">₹${currentMonthSpending.toLocaleString()}</div>
        <div class="stat-label">This Month</div>
      </div>
      <div class="insight-stat">
        <div class="stat-value" style="color: var(--secondary);">${months.length}</div>
        <div class="stat-label">Active Months</div>
      </div>
    </div>
    <div class="monthly-breakdown">
      ${months.slice(-3).map(month => `
        <div class="month-item">
          <span class="month-name">${new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          <span class="month-amount">₹${monthlyData[month].toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function updateCategoryAnalysis() {
  const container = document.getElementById('category-analysis-content');
  if (!container) return;

  if (expenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🎯</div>
        <div>No category data available</div>
      </div>
    `;
    return;
  }

  
  const categoryData = {};
  expenses.forEach(expense => {
    if (!categoryData[expense.category]) {
      categoryData[expense.category] = 0;
    }
    categoryData[expense.category] += expense.amount;
  });

  const sortedCategories = Object.entries(categoryData)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const total = Object.values(categoryData).reduce((sum, amount) => sum + amount, 0);

  container.innerHTML = `
    <div class="category-list">
      ${sortedCategories.map(([category, amount]) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        return `
          <div class="category-item">
            <div class="category-info">
              <span class="category-icon">${getCategoryIcon(category)}</span>
              <span class="category-name">${category}</span>
            </div>
            <div class="category-stats">
              <div class="category-amount">₹${amount.toLocaleString()}</div>
              <div class="category-percentage">${percentage}%</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function updateUpcomingExpenses() {
  const container = document.getElementById('upcoming-expenses-content');
  if (!container) return;

  if (recurringExpenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⏰</div>
        <div>No upcoming bills</div>
      </div>
    `;
    return;
  }

  const today = new Date();
  const upcomingExpenses = recurringExpenses
    .map(expense => {
      const dueDate = new Date(expense.nextDueDate);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return { ...expense, daysUntilDue };
    })
    .filter(expense => expense.daysUntilDue >= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 5);

  container.innerHTML = `
    <div class="upcoming-list">
      ${upcomingExpenses.map(expense => `
        <div class="upcoming-item">
          <div class="upcoming-info">
            <span class="upcoming-name">${expense.name}</span>
            <span class="upcoming-amount">₹${expense.amount.toLocaleString()}</span>
          </div>
          <div class="upcoming-due">
            ${expense.daysUntilDue === 0 ? 'Due Today' : 
              expense.daysUntilDue === 1 ? 'Due Tomorrow' : 
              `Due in ${expense.daysUntilDue} days`}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function updateBudgetStatus() {
  const container = document.getElementById('savings-potential-content');
  if (!container) return;

  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses
    .filter(exp => exp.month === currentMonth)
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const currentMonthIncome = income
    .filter(inc => {
      const incomeMonth = new Date(inc.date).toISOString().slice(0, 7);
      return incomeMonth === currentMonth;
    })
    .reduce((sum, inc) => sum + inc.amount, 0);

  
  let monthlyExpenses = currentMonthExpenses;
  let monthlyIncome = currentMonthIncome;
  
  if (monthlyExpenses === 0 && expenses.length > 0) {
    const uniqueMonths = new Set(expenses.map(exp => exp.month));
    monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) / uniqueMonths.size;
  }
  
  if (monthlyIncome === 0 && income.length > 0) {
    monthlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0) / 
      Math.max(1, new Set(income.map(inc => new Date(inc.date).toISOString().slice(0, 7))).size);
  }

  
  if (monthlyIncome === 0) {
    monthlyIncome = 50000; 
  }

  const budgetUtilization = monthlyIncome > 0 ? ((monthlyExpenses / monthlyIncome) * 100) : 0;

  let statusColor = 'var(--success)';
  let statusText = 'Excellent';
  
  if (budgetUtilization > 100) {
    statusColor = 'var(--danger)';
    statusText = 'Over Budget';
  } else if (budgetUtilization > 80) {
    statusColor = 'var(--warning)';
    statusText = 'High Usage';
  } else if (budgetUtilization > 60) {
    statusColor = 'var(--info)';
    statusText = 'Moderate';
  }

  container.innerHTML = `
    <div class="budget-overview">
      <div class="budget-stat">
        <div class="stat-value" style="color: ${statusColor};">${budgetUtilization.toFixed(1)}%</div>
        <div class="stat-label">Budget Used</div>
      </div>
      <div class="budget-status">
        <div class="status-text" style="color: ${statusColor};">${statusText}</div>
        <div class="status-description">
          ${monthlyIncome > monthlyExpenses ? 
            `You're saving ₹${(monthlyIncome - monthlyExpenses).toLocaleString()} this month` :
            monthlyExpenses > monthlyIncome ?
            `You're over budget by ₹${(monthlyExpenses - monthlyIncome).toLocaleString()}` :
            'You\'re right on budget'}
        </div>
      </div>
    </div>
  `;
}

function updateEmergencyFund() {
  const container = document.getElementById('emergency-fund-content');
  
  
  const emergencyFundExpenses = expenses.filter(exp => exp.category === 'Emergency Fund');
  const totalEmergencyFund = emergencyFundExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  
  const regularExpenses = expenses.filter(exp => exp.category !== 'Emergency Fund');
  const monthlyExpenses = regularExpenses.reduce((sum, exp) => sum + exp.amount, 0) / 
    Math.max(1, new Set(regularExpenses.map(exp => exp.month)).size);
  const sixMonthsTarget = monthlyExpenses * 6;
  
  const progress = sixMonthsTarget > 0 ? (totalEmergencyFund / sixMonthsTarget) * 100 : 0;
  
  
  const emergencyFundElement = document.getElementById('emergency-fund');
  const emergencyTargetElement = document.getElementById('emergency-target');
  
  if (emergencyFundElement) {
    emergencyFundElement.textContent = `₹${totalEmergencyFund.toLocaleString()}`;
  }
  
  if (emergencyTargetElement) {
    emergencyTargetElement.textContent = `₹${sixMonthsTarget.toLocaleString()}`;
  }
  
  
  if (container) {
    container.innerHTML = `
      <div class="emergency-fund-overview">
        <div class="fund-stat">
          <div class="stat-value" style="color: var(--success);">₹${totalEmergencyFund.toLocaleString()}</div>
          <div class="stat-label">Emergency Fund</div>
        </div>
        <div class="fund-target">
          <div class="target-info">
            <span class="target-label">Target: 6 months expenses</span>
            <span class="target-amount">₹${sixMonthsTarget.toLocaleString()}</span>
          </div>
          <div class="progress-bar" style="background: var(--border); border-radius: 10px; height: 8px; margin: 10px 0;">
            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%; background: var(--success); height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>
          </div>
          <div class="progress-text" style="font-size: 0.9rem; color: var(--text-muted);">
            ${progress.toFixed(1)}% Complete
            ${totalEmergencyFund < sixMonthsTarget ? 
              ` • ₹${(sixMonthsTarget - totalEmergencyFund).toLocaleString()} remaining` : 
              ' • Target achieved! 🎉'}
          </div>
        </div>
      </div>
    `;
  }
}


function getCategoryIcon(category) {
  const icons = {
    'Rent': '🏠',
    'Water': '💧',
    'Electricity': '⚡',
    'Internet': '🌐',
    'Other': '📦',
    'Food': '🍽️',
    'Transport': '🚗',
    'Transportation': '🚗',
    'Entertainment': '🎬',
    'Healthcare': '🏥',
    'Shopping': '🛍️',
    'Emergency Fund': '🚨'
  };
  return icons[category] || '📦';
}


function exportToCSV() {
  if (!expenses || expenses.length === 0) {
    showNotification("No expenses to export", true);
    return;
  }

  let csvContent = "Name,Amount,Category,Month,Date\n";
  
  expenses.forEach(exp => {
    const row = [
      exp.name,
      exp.amount,
      exp.category,
      exp.month,
      new Date(exp.createdAt).toLocaleDateString()
    ].map(item => `"${item}"`).join(",");
    
    csvContent += row + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `expenses_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification("Expenses exported to CSV!");
}


function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDarkMode = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDarkMode);

  const themeToggle = document.getElementById("toggle-theme");
  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    const text = themeToggle.querySelector('span');
    
    if (isDarkMode) {
      icon.className = 'fas fa-sun';
      text.textContent = 'Light Mode';
    } else {
      icon.className = 'fas fa-moon';
      text.textContent = 'Dark Mode';
    }
  }

  showNotification(`Switched to ${isDarkMode ? 'dark' : 'light'} mode`);
}

function applySavedTheme() {
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    const themeToggle = document.getElementById("toggle-theme");
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      const text = themeToggle.querySelector('span');
      if (icon) icon.className = 'fas fa-sun';
      if (text) text.textContent = 'Light Mode';
    }
  }
}


function smoothScrollTo(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('onclick')?.includes(elementId)) {
        item.classList.add('active');
      }
    });
  }
}

function scrollToExpenseForm() {
  smoothScrollTo('expense-form');
}


function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
}


async function initializeApp() {
  console.log('Initializing application...');
  
  
  currentUser = getCurrentUser();
  if (!currentUser) return;

  
  const userNameEl = document.getElementById('user-name');
  if (userNameEl && currentUser.name) {
    userNameEl.textContent = currentUser.name;
  }

  
  applySavedTheme();

  
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const incomeDateEl = document.getElementById('income-date');
  const expenseMonthEl = document.getElementById('expense-month');
  
  if (incomeDateEl) incomeDateEl.value = today;
  if (expenseMonthEl) expenseMonthEl.value = currentMonth;

  
  try {
    await Promise.all([
      loadExpenses(),
      loadRecurringExpenses(),
      loadIncome()
    ]);
    
    console.log('Application initialized successfully');
    showNotification('Welcome back! Data loaded successfully.');
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error loading data. Please refresh the page.', true);
  }
}


document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  initializeApp();
});


window.submitExpenseForm = submitExpenseForm;
window.submitRecurringExpenseForm = submitRecurringExpenseForm;
window.submitIncomeForm = submitIncomeForm;
window.deleteExpense = deleteExpense;
window.deleteRecurringExpense = deleteRecurringExpense;
window.exportToCSV = exportToCSV;
window.toggleTheme = toggleTheme;
window.smoothScrollTo = smoothScrollTo;
window.scrollToExpenseForm = scrollToExpenseForm;
window.logout = logout;


let expenseCategoryChartInstance = null;
let monthlyTrendChartInstance = null;

function renderCharts() {
  try {
    const expenseCanvas = document.getElementById('expense-chart');
    const trendCanvas = document.getElementById('monthly-trend-chart');
    if (!expenseCanvas || !trendCanvas) {
      return;
    }

    
    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    const categoryLabels = Object.keys(categoryTotals);
    const categoryValues = Object.values(categoryTotals);

    
    const palette = [
      '#6366F1','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#06B6D4','#84CC16','#F97316'
    ];
    const colors = categoryLabels.map((_, idx) => palette[idx % palette.length]);

    
    if (expenseCategoryChartInstance) {
      expenseCategoryChartInstance.destroy();
    }

    expenseCategoryChartInstance = new Chart(expenseCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: categoryLabels,
        datasets: [{
          data: categoryValues,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    
    const monthsMap = {};
    const now = new Date();
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
      monthKeys.push(key);
      monthsMap[key] = 0;
    }
    expenses.forEach(exp => {
      if (monthsMap.hasOwnProperty(exp.month)) {
        monthsMap[exp.month] += exp.amount;
      }
    });
    const monthLabels = monthKeys.map(k => new Date(`${k}-01`).toLocaleDateString('en-US', { month: 'short' }));
    const monthValues = monthKeys.map(k => monthsMap[k]);

    if (monthlyTrendChartInstance) {
      monthlyTrendChartInstance.destroy();
    }

    monthlyTrendChartInstance = new Chart(trendCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Monthly Expenses',
          data: monthValues,
          backgroundColor: '#6366F1'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (err) {
    console.error('Error rendering charts:', err);
  }
}

function exportChartAsImage(canvasId, filename = 'chart.png') {
  try {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      showNotification('Chart not found', true);
      return;
    }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    link.download = filename;
    link.click();
    showNotification('Chart exported!');
  } catch (error) {
    console.error('Error exporting chart:', error);
    showNotification('Failed to export chart', true);
  }
}

async function exportToPDF() {
  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      showNotification('PDF library not loaded', true);
      return;
    }
    const doc = new jsPDF('p', 'pt', 'a4');
    const container = document.querySelector('.main-container');
    if (!container) {
      showNotification('Nothing to export', true);
      return;
    }
    const canvas = await html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let y = 20;
    if (imgHeight > pageHeight - 40) {
      
      let remaining = imgHeight;
      let position = 0;
      while (remaining > 0) {
        doc.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight, undefined, 'FAST');
        remaining -= pageHeight;
        position -= pageHeight;
        if (remaining > 0) doc.addPage();
      }
    } else {
      doc.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight, undefined, 'FAST');
    }
    doc.save(`finance_report_${new Date().toISOString().slice(0,10)}.pdf`);
    showNotification('PDF exported!');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showNotification('Failed to export PDF', true);
  }
}


window.exportChartAsImage = exportChartAsImage;
window.exportToPDF = exportToPDF;


async function loadAnalytics() {
  try {
    
    const analytics = await apiRequest('/api/analytics');
    if (analytics) {
      renderExpenseForecast(analytics.predictions);
    } else {
      
      const computed = await apiRequest('/api/analytics/compute', {
        method: 'POST',
        body: JSON.stringify({ periodType: 'monthly' })
      });
      if (computed && computed.analytics) {
        renderExpenseForecast(computed.analytics.predictions);
      }
    }
  } catch (err) {
    
    console.warn('Analytics load failed:', err?.message || err);
  }
}

function renderExpenseForecast(predictions) {
  const container = document.getElementById('expense-forecast-content');
  if (!container || !predictions) return;

  const next = predictions.nextMonthExpenses || {};
  const total = next.predicted || 0;
  const confidence = typeof next.confidence === 'number' ? Math.round(next.confidence * 100) : 0;
  const breakdown = Array.isArray(next.breakdown) ? next.breakdown.slice(0, 5) : [];

  container.innerHTML = `
    <div class="insight-summary">
      <div class="insight-stat">
        <div class="stat-value" style="color: var(--primary);">₹${Math.round(total).toLocaleString()}</div>
        <div class="stat-label">Forecast Next Month</div>
      </div>
      <div class="insight-stat">
        <div class="stat-value" style="color: var(--secondary);">${confidence}%</div>
        <div class="stat-label">Confidence</div>
      </div>
    </div>
    ${breakdown.length ? `
      <div class="category-list">
        ${breakdown.map(item => `
          <div class="category-item">
            <div class="category-info">
              <span class="category-icon">${getCategoryIcon(item.category)}</span>
              <span class="category-name">${item.category}</span>
            </div>
            <div class="category-stats">
              <div class="category-amount">₹${Math.round(item.amount).toLocaleString()}</div>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
  `;
}

async function generateCustomReport() {
  const startEl = document.getElementById('report-start-date');
  const endEl = document.getElementById('report-end-date');
  const includeComparison = document.getElementById('include-comparison')?.checked;
  if (!startEl || !endEl || !startEl.value || !endEl.value) {
    showNotification('Please select start and end dates', true);
    return;
  }

  try {
    const report = await apiRequest('/api/reports/custom', {
      method: 'POST',
      body: JSON.stringify({ startDate: startEl.value, endDate: endEl.value, includeComparison })
    });

    const host = startEl.closest('.report-card');
    const outputId = 'custom-report-output';
    let out = document.getElementById(outputId);
    if (!out) {
      out = document.createElement('div');
      out.id = outputId;
      out.style.marginTop = '1rem';
      if (host) host.appendChild(out); else document.body.appendChild(out);
    }

    const s = report.summary || {};
    out.innerHTML = `
      <div class="glass-card" style="padding: var(--space-4);">
        <div class="quick-actions-grid">
          <div><strong>Total Expenses</strong><div>₹${(s.totalExpenses||0).toLocaleString()}</div></div>
          <div><strong>Total Income</strong><div>₹${(s.totalIncome||0).toLocaleString()}</div></div>
          <div><strong>Net Cash Flow</strong><div style="color:${(s.netCashFlow||0)>=0?'var(--success)':'var(--danger)'}">₹${(s.netCashFlow||0).toLocaleString()}</div></div>
          <div><strong>Savings Rate</strong><div>${((s.savingsRate||0)).toFixed(1)}%</div></div>
        </div>
      </div>
    `;
    showNotification('Report generated');
  } catch (err) {
    showNotification(err?.message || 'Failed to generate report', true);
  }
}

async function generateMonthlyComparison() {
  const months = document.getElementById('comparison-months')?.value || '6';
  try {
    const data = await apiRequest(`/api/reports/monthly-comparison?months=${encodeURIComponent(months)}`);
    const host = document.getElementById('monthly-comparison-form')?.closest('.report-card');
    const outputId = 'monthly-comparison-output';
    let out = document.getElementById(outputId);
    if (!out) {
      out = document.createElement('div');
      out.id = outputId;
      out.style.marginTop = '1rem';
      if (host) host.appendChild(out); else document.body.appendChild(out);
    }
    const rows = (data?.reports || []).map(r => `
      <tr>
        <td>${r.monthName}</td>
        <td>₹${(r.totalExpenses||0).toLocaleString()}</td>
        <td>₹${(r.totalIncome||0).toLocaleString()}</td>
        <td>${(r.savingsRate||0).toFixed(1)}%</td>
        <td>${r.topCategory?.category || '—'}</td>
      </tr>
    `).join('');
    out.innerHTML = `
      <div class="table-responsive">
        <table class="modern-table">
          <thead><tr><th>Month</th><th>Expenses</th><th>Income</th><th>Savings</th><th>Top Category</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    showNotification('Monthly comparison ready');
  } catch (err) {
    showNotification(err?.message || 'Failed to generate comparison', true);
  }
}

async function generateCategoryAnalysis() {
  const type = document.getElementById('analysis-type')?.value || 'spending-trends';
  const host = document.getElementById('category-analysis-form')?.closest('.report-card');
  const outputId = 'category-analysis-output';
  let out = document.getElementById(outputId);
  if (!out) {
    out = document.createElement('div');
    out.id = outputId;
    out.style.marginTop = '1rem';
    if (host) host.appendChild(out); else document.body.appendChild(out);
  }
  try {
    if (type === 'budget-variance') {
      const data = await apiRequest('/api/reports/budget-variance');
      const rows = (data?.variances || []).slice(0, 10).map(v => `
        <tr>
          <td>${v.category}</td>
          <td>₹${(v.budgeted||0).toLocaleString()}</td>
          <td>₹${(v.actual||0).toLocaleString()}</td>
          <td>₹${(v.variance||0).toLocaleString()}</td>
          <td>${v.status}</td>
        </tr>
      `).join('');
      out.innerHTML = `
        <div class="table-responsive">
          <table class="modern-table">
            <thead><tr><th>Category</th><th>Budgeted</th><th>Actual</th><th>Variance</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } else if (type === 'spending-trends') {
      const data = await apiRequest('/api/expenses/stats/trends');
      const months = (data?.months || []);
      const totals = (data?.monthlyTotals || []);
      out.innerHTML = `
        <div class="monthly-breakdown">
          ${months.map((m, i) => `
            <div class="month-item">
              <span class="month-name">${new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              <span class="month-amount">₹${(totals[i]||0).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (type === 'seasonal-patterns') {
      const trends = await apiRequest('/api/analytics/seasonal');
      const rows = (trends?.monthlyMultipliers || []).map(t => `
        <tr><td>${t.month}</td><td>${(t.multiplier*100).toFixed(1)}%</td></tr>
      `).join('');
      out.innerHTML = `
        <div class="table-responsive">
          <table class="modern-table">
            <thead><tr><th>Month</th><th>Relative Spend</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } else {
      out.innerHTML = '<div class="loading">Analysis coming soon.</div>';
    }
    showNotification('Category analysis ready');
  } catch (err) {
    showNotification(err?.message || 'Failed to analyze categories', true);
  }
}