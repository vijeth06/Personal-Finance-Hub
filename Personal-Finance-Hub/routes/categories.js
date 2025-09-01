const express = require('express');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');

const router = express.Router();


router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ isDefault: -1, name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/', auth, async (req, res) => {
  try {
    const { name, icon, color, type, budgetLimit, description } = req.body;
    
    const category = new Category({
      userId: req.user._id,
      name,
      icon: icon || '💰',
      color: color || '#6366f1',
      type: type || 'expense',
      budgetLimit,
      description
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Error creating category:', error);
    res.status(400).json({ error: error.message });
  }
});


router.put('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ error: error.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id,
      isDefault: false 
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found or cannot be deleted' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/initialize-defaults', auth, async (req, res) => {
  try {
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
      { name: 'Other', icon: '📝', color: '#6b7280', isDefault: true }
    ];

    const existingCategories = await Category.find({ userId: req.user._id });
    if (existingCategories.length === 0) {
      const categories = defaultCategories.map(cat => ({
        ...cat,
        userId: req.user._id
      }));
      
      await Category.insertMany(categories);
      res.json({ message: 'Default categories initialized', count: categories.length });
    } else {
      res.json({ message: 'Categories already exist', count: existingCategories.length });
    }
  } catch (error) {
    console.error('Error initializing default categories:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;