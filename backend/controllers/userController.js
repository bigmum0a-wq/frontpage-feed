// User Controller
import { UserModel } from '../models/userModel.js';
import { sanitizeString } from '../utils/validator.js';

export const UserController = {
  async getProfile(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const user = await UserModel.getById(userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async updatePreferences(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const preferences = req.body;
      const updated = await UserModel.updatePreferences(userId, preferences);
      res.json({ success: true, data: updated, message: 'Preferences updated' });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { name, email, avatarUrl } = req.body;
      const updated = await UserModel.updateProfile(userId, {
        name: name ? sanitizeString(name) : undefined,
        email: email ? sanitizeString(email) : undefined,
        avatarUrl,
      });
      res.json({ success: true, data: updated, message: 'Profile updated' });
    } catch (error) {
      next(error);
    }
  },
};
