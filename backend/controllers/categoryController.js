// Category Controller
import { CategoryModel } from '../models/categoryModel.js';
import { sanitizeString } from '../utils/validator.js';

export const CategoryController = {
  async getCategories(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const categories = await CategoryModel.getAll(userId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  },

  async createCategory(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { name, color, background } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Category name is required' } });
      }

      const category = await CategoryModel.create({
        userId,
        name: sanitizeString(name),
        color: color || '#2563eb',
        background: background || '#dbeafe',
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  },

  async updateCategory(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;
      const { name, color, background, sortOrder } = req.body;

      const category = await CategoryModel.update(id, userId, {
        name: name ? sanitizeString(name) : undefined,
        color,
        background,
        sortOrder,
      });

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  },

  async deleteCategory(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;
      await CategoryModel.delete(id, userId);
      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      next(error);
    }
  },
};
