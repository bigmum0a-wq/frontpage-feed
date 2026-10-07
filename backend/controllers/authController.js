// backend/controllers/authController.js
import { UserModel } from '../models/userModel.js';
import { createSessionToken, invalidateSessionToken } from '../services/authService.js';
import { isValidUrl, sanitizeString } from '../utils/validator.js';

export const AuthController = {
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: { message: 'A valid email address is required.' } });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters long.' } });
      }

      const existing = await UserModel.findByEmail(email);
      if (existing && !existing.is_guest) {
        return res.status(409).json({ success: false, error: { message: 'An account with this email already exists.' } });
      }

      let user;
      if (existing && existing.is_guest) {
        // Upgrade existing guest user to full account
        await UserModel.updatePassword(existing.id, password);
        user = await UserModel.updateProfile(existing.id, {
          name: name ? sanitizeString(name) : 'User',
          email: email.trim().toLowerCase(),
        });
      } else {
        user = await UserModel.create({
          email: email.trim().toLowerCase(),
          password,
          name: name ? sanitizeString(name) : 'User',
          isGuest: false,
        });
      }

      const { token, expiresAt } = createSessionToken(user.id);
      res.status(201).json({
        success: true,
        data: {
          user,
          token,
          expiresAt,
        },
        message: 'Account created successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: { message: 'Email and password are required.' } });
      }

      const user = await UserModel.verifyCredentials(email, password);
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
      }

      const { token, expiresAt } = createSessionToken(user.id);
      res.json({
        success: true,
        data: {
          user,
          token,
          expiresAt,
        },
        message: 'Logged in successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        invalidateSessionToken(token);
      }
      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      if (req.user && req.user.id && !req.user.is_guest) {
        const user = await UserModel.getById(req.user.id);
        if (user) {
          return res.json({ success: true, data: { user, isGuest: false } });
        }
      }

      // Guest fallback
      const guest = await UserModel.getById('guest-user-001');
      res.json({
        success: true,
        data: {
          user: guest || {
            id: 'guest-user-001',
            name: 'Guest User',
            email: 'guest@frontpage.local',
            is_guest: 1,
            preferences: {},
          },
          isGuest: true,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: { message: 'A valid email address is required.' } });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Return generic success to avoid email enumeration
        return res.json({
          success: true,
          message: 'If an account exists with this email, instructions have been sent.',
        });
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters long.' } });
        }
        await UserModel.updatePassword(user.id, newPassword);
        return res.json({
          success: true,
          message: 'Your password has been successfully updated. You can now log in.',
        });
      }

      res.json({
        success: true,
        message: 'Password reset link sent to your email address.',
      });
    } catch (error) {
      next(error);
    }
  },
};
