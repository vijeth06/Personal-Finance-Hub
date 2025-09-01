
class GoalService {
  constructor() {
    this.goals = [];
  }

  
  async getGoals() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.goals = await response.json();
        return this.goals;
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
    return [];
  }

  
  async createGoal(goalData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(goalData)
      });

      if (response.ok) {
        const newGoal = await response.json();
        this.goals.push(newGoal);
        return newGoal;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  
  async updateGoal(id, goalData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(goalData)
      });

      if (response.ok) {
        const updatedGoal = await response.json();
        const index = this.goals.findIndex(goal => goal._id === id);
        if (index !== -1) {
          this.goals[index] = updatedGoal;
        }
        return updatedGoal;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  
  async addContribution(goalId, amount, description = '') {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/goals/${goalId}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, description })
      });

      if (response.ok) {
        const updatedGoal = await response.json();
        const index = this.goals.findIndex(goal => goal._id === goalId);
        if (index !== -1) {
          this.goals[index] = updatedGoal;
        }
        return updatedGoal;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error adding contribution:', error);
      throw error;
    }
  }

  
  async deleteGoal(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.goals = this.goals.filter(goal => goal._id !== id);
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  
  async getGoalsSummary() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/goals/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching goals summary:', error);
    }
    return {
      total: 0,
      active: 0,
      completed: 0,
      totalTarget: 0,
      totalCurrent: 0,
      overallProgress: 0
    };
  }

  
  calculateProgress(goal) {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  
  calculateDaysRemaining(goal) {
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const timeDiff = targetDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  
  getGoalStatus(goal) {
    const progress = this.calculateProgress(goal);
    const daysRemaining = this.calculateDaysRemaining(goal);
    
    if (goal.status === 'completed') {
      return { status: 'Completed', color: '#10b981', class: 'success' };
    } else if (daysRemaining < 0) {
      return { status: 'Overdue', color: '#ef4444', class: 'danger' };
    } else if (progress >= 75) {
      return { status: 'On Track', color: '#10b981', class: 'success' };
    } else if (progress >= 50) {
      return { status: 'Progressing', color: '#f59e0b', class: 'warning' };
    } else if (daysRemaining <= 30) {
      return { status: 'Behind', color: '#ef4444', class: 'danger' };
    } else {
      return { status: 'Started', color: '#6366f1', class: 'info' };
    }
  }

  
  async renderGoalsDashboard() {
    const goalsContainer = document.getElementById('goals-dashboard');
    if (!goalsContainer) return;

    try {
      const goals = await this.getGoals();
      const summary = await this.getGoalsSummary();

      goalsContainer.innerHTML = `
        <div class="goals-summary">
          <h3>💰 Financial Goals</h3>
          <div class="summary-cards">
            <div class="summary-card">
              <span class="summary-label">Total Goals</span>
              <span class="summary-value">${summary.total}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Active</span>
              <span class="summary-value">${summary.active}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Completed</span>
              <span class="summary-value">${summary.completed}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Overall Progress</span>
              <span class="summary-value">${summary.overallProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div class="goals-list">
          ${goals.length > 0 ? goals.map(goal => this.renderGoalCard(goal)).join('') : '<p>No goals set yet. <a href="#" onclick="showCreateGoalModal()">Create your first goal</a></p>'}
        </div>
      `;
    } catch (error) {
      console.error('Error rendering goals dashboard:', error);
      goalsContainer.innerHTML = '<p>Error loading goals. Please try again.</p>';
    }
  }

  
  renderGoalCard(goal) {
    const progress = this.calculateProgress(goal);
    const daysRemaining = this.calculateDaysRemaining(goal);
    const status = this.getGoalStatus(goal);
    
    return `
      <div class="goal-card" style="border-left: 4px solid ${goal.color}">
        <div class="goal-header">
          <span class="goal-icon">${goal.icon}</span>
          <div class="goal-info">
            <h4>${goal.title}</h4>
            <p>${goal.description || goal.type.replace('_', ' ')}</p>
          </div>
          <div class="goal-status ${status.class}">
            ${status.status}
          </div>
        </div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%; background-color: ${goal.color}"></div>
          </div>
          <div class="progress-text">
            ₹${goal.currentAmount.toFixed(2)} / ₹${goal.targetAmount.toFixed(2)} (${progress.toFixed(1)}%)
          </div>
        </div>
        <div class="goal-details">
          <span class="goal-detail">
            📅 ${daysRemaining > 0 ? `${daysRemaining} days left` : daysRemaining === 0 ? 'Due today' : `${Math.abs(daysRemaining)} days overdue`}
          </span>
          <span class="goal-detail">
            🎯 ${goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
          </span>
        </div>
        <div class="goal-actions">
          <button class="btn-small btn-primary" onclick="showContributeModal('${goal._id}')">
            💰 Contribute
          </button>
          <button class="btn-small btn-secondary" onclick="editGoal('${goal._id}')">
            ✏️ Edit
          </button>
          ${goal.status !== 'completed' ? `
            <button class="btn-small btn-danger" onclick="deleteGoal('${goal._id}')">
              🗑️ Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
}


const goalService = new GoalService();


window.goalService = goalService;