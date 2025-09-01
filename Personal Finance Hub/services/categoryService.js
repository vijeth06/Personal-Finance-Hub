
class CategoryService {
  constructor() {
    this.categories = [];
    this.initialized = false;
  }

  
  async initialize() {
    try {
      const token = localStorage.getItem('token');
      
      
      let response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.categories = await response.json();
        
        
        if (this.categories.length === 0) {
          await this.initializeDefaultCategories();
        }
      }
      
      this.initialized = true;
      return this.categories;
    } catch (error) {
      console.error('Error initializing categories:', error);
      return [];
    }
  }

  
  async initializeDefaultCategories() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories/initialize-defaults', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        
        const categoriesResponse = await fetch('/api/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (categoriesResponse.ok) {
          this.categories = await categoriesResponse.json();
        }
      }
    } catch (error) {
      console.error('Error initializing default categories:', error);
    }
  }

  
  getCategories() {
    return this.categories;
  }

  
  getExpenseCategories() {
    return this.categories.filter(cat => cat.type === 'expense' || cat.type === 'both');
  }

  
  getIncomeCategories() {
    return this.categories.filter(cat => cat.type === 'income' || cat.type === 'both');
  }

  
  async createCategory(categoryData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        const newCategory = await response.json();
        this.categories.push(newCategory);
        this.updateCategoryDropdowns();
        return newCategory;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  
  async updateCategory(id, categoryData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        const index = this.categories.findIndex(cat => cat._id === id);
        if (index !== -1) {
          this.categories[index] = updatedCategory;
        }
        this.updateCategoryDropdowns();
        return updatedCategory;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  
  async deleteCategory(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.categories = this.categories.filter(cat => cat._id !== id);
        this.updateCategoryDropdowns();
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  
  updateCategoryDropdowns() {
    const dropdowns = document.querySelectorAll('select[id*="category"]');
    
    dropdowns.forEach(dropdown => {
      const currentValue = dropdown.value;
      const isIncomeDropdown = dropdown.id.includes('income');
      
      
      dropdown.innerHTML = '';
      
      
      const categories = isIncomeDropdown ? this.getIncomeCategories() : this.getExpenseCategories();
      
      
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = `${category.icon} ${category.name}`;
        dropdown.appendChild(option);
      });
      
      
      if (currentValue && [...dropdown.options].some(opt => opt.value === currentValue)) {
        dropdown.value = currentValue;
      }
    });
  }

  
  getCategoryByName(name) {
    return this.categories.find(cat => cat.name === name);
  }

  
  getCategoryColors() {
    const colors = {};
    this.categories.forEach(cat => {
      colors[cat.name] = cat.color;
    });
    return colors;
  }

  
  getCategoryIcons() {
    const icons = {};
    this.categories.forEach(cat => {
      icons[cat.name] = cat.icon;
    });
    return icons;
  }
}


const categoryService = new CategoryService();


window.categoryService = categoryService;