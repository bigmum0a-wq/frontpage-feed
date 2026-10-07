// backend/middleware/authMiddleware.js
import { validateSessionToken } from '../services/authService.js';
import { UserModel } from '../models/userModel.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const userId = validateSessionToken(token);

    if (userId) {
      try {
        const user = await UserModel.getById(userId);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        console.warn('Auth token lookup error:', err.message);
      }
    }
  }

  // Default to Guest context
  req.user = {
    id: 'guest-user-001',
    is_guest: true,
    name: 'Guest User',
    email: 'guest@frontpage.local',
  };

  next();
}

/**
 * Strict guard for routes that require an authenticated user account
 */
export function requireAuth(req, res, next) {
  if (!req.user || req.user.is_guest) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Please sign in to access this feature.' },
    });
  }
  next();
}
