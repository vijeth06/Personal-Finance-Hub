

let expenses = [];
let recurringExpenses = [];
let income = [];
let currentUser = null;
let budgets = [];
let goals = [];
let categories = [];


const API_BASE = window.location.origin;


async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const config = { ...defaultOptions, ...options };
  if (config.headers) {
    config.headers = { ...defaultOptions.headers, ...options.headers };
  }

  try {
    showProgressIndicator(`Making request to ${endpoint}...`);
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
    throw error;
  } finally {
    hideProgressIndicator();
  }
}


function showProgressIndicator(message = 'Loading...') {
  let indicator = document.getElementById('progress-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'progress-indicator';
    indicator.className = 'progress-indicator';
    document.body.appendChild(indicator);
  }
  
  indicator.innerHTML = `
    <div style="text-align: center;">
      <div style="margin-bottom: 1rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
      </div>
      <div style="font-weight: 600; color: var(--text);">${message}</div>
      <div class="progress-bar" style="width: 100%; height: 4px; background: var(--border); border-radius: 2px; margin-top: 1rem; overflow: hidden;">
        <div class="progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); transition: width 0.3s ease;"></div>
      </div>
    </div>
  `;
  
  indicator.style.display = 'flex';
  
  
  const progressFill = indicator.querySelector('.progress-fill');
  if (progressFill) {
    setTimeout(() => progressFill.style.width = '70%', 100);
  }
}

function hideProgressIndicator() {
  const indicator = document.getElementById('progress-indicator');
  if (!indicator) return;

  const progressFill = indicator.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = '100%';
  }

  setTimeout(() => {
    indicator.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
  }, 500);
}


function getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('user');
}

function getCurrentUser() {
  const user = localStorage.getItem('user');
  if (!user) {
    console.log('No user found, redirecting to login');
    window.location.href = 'login.html';
    return null;
  }
  try {
    return JSON.parse(user);
  } catch (e) {
    console.log('Invalid user data, redirecting to login');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    return null;
  }
}

function checkAuthentication() {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  currentUser = user;
  return true;
}


function showNotification(message, isError = false) {
  console.log(`Notification: ${message} (Error: ${isError})`);
  
  const notificationsContainer = document.getElementById("notifications");
  if (!notificationsContainer) {
    console.warn('Notifications container not found');
    return;
  }

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

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN');
}


async function loadExpenses() {
  try {
    showProgressIndicator('Loading expenses...');
    const data = await apiRequest('/api/expenses');
    if (data) {
      expenses = data;
      renderExpenses();
      updateDashboard();
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

async function loadGoals() {
  try {
    const data = await apiRequest('/api/goals');
    if (data) {
      goals = data;
      updateGoalsDisplay();
    }
  } catch (error) {
    console.error('Error loading goals:', error);
    showNotification('Failed to load goals', true);
  }
}

async function loadBudgets() {
  try {
    const data = await apiRequest('/api/budgets');
    if (data) {
      budgets = data;
      updateBudgetDisplay();
    }
  } catch (error) {
    console.error('Error loading budgets:', error);
    showNotification('Failed to load budgets', true);
  }
}

async function loadCategories() {
  try {
    const data = await apiRequest('/api/categories');
    if (data) {
      categories = data;
      updateCategorySelects();
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    
    categories = [
      { name: 'Rent', icon: '🏠' },
      { name: 'Water', icon: '💧' },
      { name: 'Electricity', icon: '⚡' },
      { name: 'Internet', icon: '🌐' },
      { name: 'Food', icon: '🍽️' },
      { name: 'Transport', icon: '🚗' },
      { name: 'Entertainment', icon: '🎬' },
      { name: 'Healthcare', icon: '🏥' },
      { name: 'Shopping', icon: '🛍️' },
      { name: 'Other', icon: '📦' }
    ];
    updateCategorySelects();
  }
}


function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Saved ${key} to localStorage:`, data);
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    showNotification(`Error saving ${key}`, true);
    return false;
  }
}

function loadFromLocalStorage(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      console.log(`Loaded ${key} from localStorage:`, parsed);
      return parsed;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
}


function loadExpenses() {
  console.log('Loading expenses...');
  const userExpenses = loadFromLocalStorage(`expenses_${currentUser.id}`, []);
  expenses = userExpenses;
  renderExpenses();
  updateDashboard();
  showNotification(`Loaded ${expenses.length} expenses`);
}

function loadRecurringExpenses() {
  console.log('Loading recurring expenses...');
  const userRecurring = loadFromLocalStorage(`recurring_${currentUser.id}`, []);
  recurringExpenses = userRecurring;
  renderRecurringExpenses();
  showNotification(`Loaded ${recurringExpenses.length} recurring expenses`);
}

function loadIncome() {
  console.log('Loading income...');
  const userIncome = loadFromLocalStorage(`income_${currentUser.id}`, []);
  income = userIncome;
  updateCashFlow();
  showNotification(`Loaded ${income.length} income entries`);
}

function loadBudgets() {
  console.log('Loading budgets...');
  budgets = loadFromLocalStorage(`budgets_${currentUser.id}`, []);
  updateBudgetDisplay();
}

function loadGoals() {
  console.log('Loading goals...');
  goals = loadFromLocalStorage(`goals_${currentUser.id}`, []);
  updateGoalsDisplay();
}

function loadCategories() {
  console.log('Loading categories...');
  categories = loadFromLocalStorage(`categories_${currentUser.id}`, getDefaultCategories());
  updateCategorySelects();
}

function getDefaultCategories() {
  return [
    { id: '1', name: 'Rent', icon: '🏠', color: '#667eea' },
    { id: '2', name: 'Water', icon: '💧', color: '#54a0ff' },
    { id: '3', name: 'Electricity', icon: '⚡', color: '#feca57' },
    { id: '4', name: 'Internet', icon: '🌐', color: '#4facfe' },
    { id: '5', name: 'Food', icon: '🍽️', color: '#00d4aa' },
    { id: '6', name: 'Transport', icon: '🚗', color: '#ff6b6b' },
    { id: '7', name: 'Entertainment', icon: '🎬', color: '#f093fb' },
    { id: '8', name: 'Healthcare', icon: '🏥', color: '#ff9ff3' },
    { id: '9', name: 'Shopping', icon: '🛍️', color: '#a5b4fc' },
    { id: '10', name: 'Other', icon: '📦', color: '#94a3b8' }
  ];
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
      id: generateId(),
      userId: currentUser.id,
      name,
      amount,
      category,
      month,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    
    expenses.push(expenseData);
    
    
    if (saveToLocalStorage(`expenses_${currentUser.id}`, expenses)) {
      showNotification(`Expense "${name}" added successfully! ${formatCurrency(amount)}`);
      
      
      form.reset();
      
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      document.getElementById('expense-month').value = currentMonth;
      
      
      renderExpenses();
      updateDashboard();
      
      
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
    
    const today = new Date();
    const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (nextDueDate <= today) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    const recurringData = {
      id: generateId(),
      userId: currentUser.id,
      name,
      amount,
      category,
      frequency,
      dayOfMonth,
      reminderDays,
      nextDueDate: nextDueDate.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    
    recurringExpenses.push(recurringData);
    
    
    if (saveToLocalStorage(`recurring_${currentUser.id}`, recurringExpenses)) {
      showNotification(`Recurring expense "${name}" added successfully!`);
      
      
      form.reset();
      document.getElementById("reminder-days").value = "3"; 
      
      
      renderRecurringExpenses();
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
      id: generateId(),
      userId: currentUser.id,
      source,
      amount,
      category,
      frequency: frequency || 'one-time',
      date,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    
    income.push(incomeData);
    
    
    if (saveToLocalStorage(`income_${currentUser.id}`, income)) {
      showNotification(`Income "${source}" added successfully! ${formatCurrency(amount)}`);
      
      
      form.reset();
      
      
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('income-date').value = today;
      
      
      updateCashFlow();
      updateDashboard();
    }
  } catch (error) {
    console.error('Error adding income:', error);
    showNotification('Failed to add income', true);
  } finally {
    setButtonLoading(submitButton, false);
  }
}


function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) {
    return;
  }

  try {
    const index = expenses.findIndex(exp => exp.id === id);
    if (index !== -1) {
      const deletedExpense = expenses.splice(index, 1)[0];
      
      if (saveToLocalStorage(`expenses_${currentUser.id}`, expenses)) {
        showNotification(`Expense "${deletedExpense.name}" deleted successfully`);
        renderExpenses();
        updateDashboard();
      }
    } else {
      showNotification('Expense not found', true);
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    showNotification('Failed to delete expense', true);
  }
}

function deleteRecurringExpense(id) {
  if (!confirm('Are you sure you want to delete this recurring expense?')) {
    return;
  }

  try {
    const index = recurringExpenses.findIndex(exp => exp.id === id);
    if (index !== -1) {
      const deletedExpense = recurringExpenses.splice(index, 1)[0];
      
      if (saveToLocalStorage(`recurring_${currentUser.id}`, recurringExpenses)) {
        showNotification(`Recurring expense "${deletedExpense.name}" deleted successfully`);
        renderRecurringExpenses();
      }
    } else {
      showNotification('Recurring expense not found', true);
    }
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    showNotification('Failed to delete recurring expense', true);
  }
}

function deleteIncome(id) {
  if (!confirm('Are you sure you want to delete this income entry?')) {
    return;
  }

  try {
    const index = income.findIndex(inc => inc.id === id);
    if (index !== -1) {
      const deletedIncome = income.splice(index, 1)[0];
      
      if (saveToLocalStorage(`income_${currentUser.id}`, income)) {
        showNotification(`Income "${deletedIncome.source}" deleted successfully`);
        updateCashFlow();
        updateDashboard();
      }
    } else {
      showNotification('Income entry not found', true);
    }
  } catch (error) {
    console.error('Error deleting income:', error);
    showNotification('Failed to delete income', true);
  }
}


function renderExpenses() {
  const tableBody = document.getElementById("expense-table-body");
  if (!tableBody) {
    console.warn('Expense table body not found');
    return;
  }

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
      <td style="font-weight: 700; color: var(--danger);">${formatCurrency(expense.amount)}</td>
      <td>
        <span class="category-badge category-${expense.category.toLowerCase()}">
          ${getCategoryIcon(expense.category)} ${expense.category}
        </span>
      </td>
      <td>${expense.month}</td>
      <td>${formatDate(expense.createdAt)}</td>
      <td>
        <button onclick="deleteExpense('${expense.id}')" 
                class="btn-modern btn-danger btn-sm"
                title="Delete expense">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  console.log(`Rendered ${sortedExpenses.length} expenses`);
}

function renderRecurringExpenses() {
  const tableBody = document.getElementById("due-expenses-table");
  if (!tableBody) {
    console.warn('Due expenses table not found');
    return;
  }

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
        <td style="font-weight: 700; color: var(--danger);">${formatCurrency(expense.amount)}</td>
        <td>
          <span class="category-badge category-${expense.category.toLowerCase()}">
            ${getCategoryIcon(expense.category)} ${expense.category}
          </span>
        </td>
        <td>${formatDate(expense.nextDueDate)}</td>
        <td>
          <span class="status-badge ${statusClass}">
            ${daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days`}
          </span>
        </td>
        <td>
          <button onclick="deleteRecurringExpense('${expense.id}')" 
                  class="btn-modern btn-danger btn-sm"
                  title="Delete recurring expense">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  console.log(`Rendered ${recurringExpenses.length} recurring expenses`);
}


function updateDashboard() {
  console.log('Updating dashboard...');
  
  if (!expenses || expenses.length === 0) {
    document.getElementById("total-expense").textContent = formatCurrency(0);
    const avgSpendEl = document.getElementById("avg-spend");
    const highestExpEl = document.getElementById("highest-expense");
    const savingsEl = document.getElementById("savings");
    
    if (avgSpendEl) avgSpendEl.textContent = "0";
    if (highestExpEl) highestExpEl.textContent = "0";
    if (savingsEl) savingsEl.textContent = "0";
    return;
  }

  
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgSpend = total / expenses.length;
  const highestExpense = Math.max(...expenses.map(exp => exp.amount));

  
  const totalExpenseEl = document.getElementById("total-expense");
  const avgSpendEl = document.getElementById("avg-spend");
  const highestExpEl = document.getElementById("highest-expense");
  const savingsEl = document.getElementById("savings");

  if (totalExpenseEl) totalExpenseEl.textContent = formatCurrency(total);
  if (avgSpendEl) avgSpendEl.textContent = avgSpend.toLocaleString();
  if (highestExpEl) highestExpEl.textContent = highestExpense.toLocaleString();
  
  
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const savings = Math.max(0, totalIncome - total);
  if (savingsEl) savingsEl.textContent = savings.toLocaleString();

  
  updateInsights();
  
  console.log(`Dashboard updated - Total: ${formatCurrency(total)}, Avg: ${avgSpend.toFixed(2)}`);
}

function updateCashFlow() {
  console.log('Updating cash flow...');
  
  const totalIncomeAmount = income.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netCashFlow = totalIncomeAmount - totalExpenseAmount;
  const savingsRate = totalIncomeAmount > 0 ? ((netCashFlow / totalIncomeAmount) * 100) : 0;

  
  const totalIncomeEl = document.getElementById("total-income");
  const avgIncomeEl = document.getElementById("avg-income");
  const netCashFlowEl = document.getElementById("net-cash-flow");
  const savingsRateEl = document.getElementById("savings-rate");

  if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncomeAmount);
  if (avgIncomeEl) {
    const avgIncome = income.length > 0 ? totalIncomeAmount / income.length : 0;
    avgIncomeEl.textContent = formatCurrency(avgIncome);
  }
  if (netCashFlowEl) {
    netCashFlowEl.textContent = formatCurrency(netCashFlow);
    netCashFlowEl.style.color = netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (savingsRateEl) {
    savingsRateEl.textContent = `${savingsRate.toFixed(1)}%`;
    savingsRateEl.style.color = savingsRate >= 20 ? 'var(--success)' : savingsRate >= 10 ? 'var(--warning)' : 'var(--danger)';
  }
  
  console.log(`Cash flow updated - Income: ${formatCurrency(totalIncomeAmount)}, Net: ${formatCurrency(netCashFlow)}`);
}

function updateInsights() {
  updateSpendingTrends();
  updateCategoryAnalysis();
  updateUpcomingExpenses();
  updateBudgetStatus();
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
        <div class="stat-value" style="color: var(--primary);">${formatCurrency(currentMonthSpending)}</div>
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
          <span class="month-amount">${formatCurrency(monthlyData[month])}</span>
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
              <div class="category-amount">${formatCurrency(amount)}</div>
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
            <span class="upcoming-amount">${formatCurrency(expense.amount)}</span>
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

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const budgetUtilization = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100) : 0;

  let statusColor = 'var(--success)';
  let statusText = 'Excellent';
  
  if (budgetUtilization > 90) {
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
          ${totalIncome > totalExpenses ? 
            `You're saving ${formatCurrency(totalIncome - totalExpenses)} this period` :
            totalExpenses > totalIncome ?
            `You're over budget by ${formatCurrency(totalExpenses - totalIncome)}` :
            'You\'re right on budget'}
        </div>
      </div>
    </div>
  `;
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
    'Entertainment': '🎬',
    'Healthcare': '🏥',
    'Shopping': '🛍️'
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
      formatDate(exp.createdAt)
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
      if (icon) icon.className = 'fas fa-sun';
      if (text) text.textContent = 'Light Mode';
    } else {
      if (icon) icon.className = 'fas fa-moon';
      if (text) text.textContent = 'Dark Mode';
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




function addBudget() {
  const category = prompt('Enter category name:');
  const amount = parseFloat(prompt('Enter budget amount:'));
  
  if (category && amount && amount > 0) {
    const budget = {
      id: generateId(),
      userId: currentUser.id,
      category,
      amount,
      spent: 0,
      createdAt: new Date().toISOString()
    };
    
    budgets.push(budget);
    saveToLocalStorage(`budgets_${currentUser.id}`, budgets);
    updateBudgetDisplay();
    showNotification(`Budget for ${category} added successfully!`);
  }
}

function updateBudgetDisplay() {
  
  console.log('Budget display updated');
}


async function submitGoalForm() {
  console.log("Submitting goal form");

  const form = document.getElementById("goal-form-element");
  if (!form) {
    showNotification("Goal form not found", true);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!validateForm(form)) {
    showNotification("Please fill in all required fields", true);
    return;
  }

  setButtonLoading(submitButton, true);
  
  const name = document.getElementById("goal-name").value.trim();
  const targetAmount = parseFloat(document.getElementById("goal-target-amount").value);
  const currentAmount = parseFloat(document.getElementById("goal-current-amount").value) || 0;
  const targetDate = document.getElementById("goal-target-date").value;
  const category = document.getElementById("goal-category").value;
  const description = document.getElementById("goal-description").value.trim();

  if (!name || !targetAmount || !targetDate || !category) {
    showNotification("Please fill out all required fields", true);
    setButtonLoading(submitButton, false);
    return;
  }

  if (targetAmount <= 0) {
    showNotification("Target amount must be greater than 0", true);
    setButtonLoading(submitButton, false);
    return;
  }

  try {
    const goalData = {
      name,
      targetAmount,
      currentAmount,
      targetDate,
      category,
      description
    };

    const result = await apiRequest('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    });

    if (result) {
      showNotification(`Goal "${name}" added successfully! Target: ₹${targetAmount.toLocaleString()}`);
      
      
      form.reset();
      document.getElementById('goal-current-amount').value = '0';
      
      
      await loadGoals();
    }
  } catch (error) {
    console.error('Error adding goal:', error);
    showNotification('Failed to add goal', true);
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function addGoal() {
  
  smoothScrollTo('goal-form');
}

function updateGoalsDisplay() {
  
  console.log('Goals display updated');
}


function updateCategorySelects() {
  const selects = document.querySelectorAll('#expense-category, #bill-category');
  selects.forEach(select => {
    if (select) {
      select.innerHTML = categories.map(cat => 
        `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`
      ).join('');
    }
  });
}


function filterExpenses() {
  const searchTerm = document.getElementById('search-box')?.value.toLowerCase() || '';
  const monthFilter = document.getElementById('month-filter')?.value || '';
  
  let filteredExpenses = expenses;
  
  if (searchTerm) {
    filteredExpenses = filteredExpenses.filter(exp => 
      exp.name.toLowerCase().includes(searchTerm) || 
      exp.category.toLowerCase().includes(searchTerm)
    );
  }
  
  if (monthFilter) {
    filteredExpenses = filteredExpenses.filter(exp => exp.month === monthFilter);
  }
  
  
  renderFilteredExpenses(filteredExpenses);
}

function renderFilteredExpenses(filteredExpenses) {
  const tableBody = document.getElementById("expense-table-body");
  if (!tableBody) return;

  if (filteredExpenses.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
          <div>No expenses match your search criteria</div>
        </td>
      </tr>
    `;
    return;
  }

  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tableBody.innerHTML = sortedExpenses.map(expense => `
    <tr style="transition: all 0.2s ease;">
      <td style="font-weight: 600;">${expense.name}</td>
      <td style="font-weight: 700; color: var(--danger);">${formatCurrency(expense.amount)}</td>
      <td>
        <span class="category-badge category-${expense.category.toLowerCase()}">
          ${getCategoryIcon(expense.category)} ${expense.category}
        </span>
      </td>
      <td>${expense.month}</td>
      <td>${formatDate(expense.createdAt)}</td>
      <td>
        <button onclick="deleteExpense('${expense.id}')" 
                class="btn-modern btn-danger btn-sm"
                title="Delete expense">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}


function initializeApp() {
  console.log('Initializing Personal Finance Hub...');
  
  
  if (!checkAuthentication()) {
    return;
  }

  
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
    loadExpenses();
    loadRecurringExpenses();
    loadIncome();
    loadBudgets();
    loadGoals();
    loadCategories();
    
    console.log('Application initialized successfully');
    showNotification('Welcome back! Data loaded successfully.');
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error loading data. Please refresh the page.', true);
  }

  
  addEventListeners();
}

function addEventListeners() {
  
  const searchBox = document.getElementById('search-box');
  if (searchBox) {
    searchBox.addEventListener('input', filterExpenses);
  }

  
  const monthFilter = document.getElementById('month-filter');
  if (monthFilter) {
    monthFilter.addEventListener('change', filterExpenses);
  }

  
  populateMonthFilter();
}

function populateMonthFilter() {
  const monthFilter = document.getElementById('month-filter');
  if (!monthFilter) return;

  const months = [...new Set(expenses.map(exp => exp.month))].sort();
  monthFilter.innerHTML = '<option value="">📅 All Months</option>' + 
    months.map(month => `<option value="${month}">${month}</option>`).join('');
}


document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  initializeApp();
});


window.submitExpenseForm = submitExpenseForm;
window.submitRecurringExpenseForm = submitRecurringExpenseForm;
window.submitIncomeForm = submitIncomeForm;
window.submitGoalForm = submitGoalForm;
window.deleteExpense = deleteExpense;
window.deleteRecurringExpense = deleteRecurringExpense;
window.deleteIncome = deleteIncome;
window.exportToCSV = exportToCSV;
window.toggleTheme = toggleTheme;
window.smoothScrollTo = smoothScrollTo;
window.scrollToExpenseForm = scrollToExpenseForm;
window.logout = logout;
window.addBudget = addBudget;
window.addGoal = addGoal;
window.filterExpenses = filterExpenses;