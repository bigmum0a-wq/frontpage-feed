// backend/models/userModel.js
import { getDatabase } from '../../config/database.js';
import crypto from 'node:crypto';
import { hashPassword, verifyPassword } from '../services/authService.js';

export const UserModel = {
  async getById(id = 'guest-user-001') {
    const db = await getDatabase();
    const user = db.prepare('SELECT id, email, name, avatar_url, is_guest, created_at FROM users WHERE id = ?').get(id);
    if (!user) return null;
    const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(id);
    return { ...user, preferences: preferences || {} };
  },

  async findByEmail(email) {
    if (!email) return null;
    const db = await getDatabase();
    return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  },

  async create({ email, password, name = 'User', isGuest = false }) {
    const db = await getDatabase();
    const id = isGuest ? `guest-${crypto.randomBytes(8).toString('hex')}` : `user-${crypto.randomBytes(8).toString('hex')}`;
    const cleanEmail = email ? email.trim().toLowerCase() : `${id}@frontpage.local`;
    const passwordHash = password ? await hashPassword(password) : null;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, is_guest)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, cleanEmail, passwordHash, name.trim(), isGuest ? 1 : 0);

    // Initialize default preferences
    db.prepare(`
      INSERT INTO user_preferences (user_id)
      VALUES (?)
      ON CONFLICT(user_id) DO NOTHING
    `).run(id);

    return this.getById(id);
  },

  async verifyCredentials(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.password_hash) return null;

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return null;

    return this.getById(user.id);
  },

  async updatePassword(userId, newPassword) {
    const db = await getDatabase();
    const passwordHash = await hashPassword(newPassword);
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, userId);

    return true;
  },

  async updatePreferences(userId = 'guest-user-001', prefs = {}) {
    const db = await getDatabase();
    const fields = [
      'theme', 'accent_color', 'feed_layout', 'display_density', 'reader_font',
      'text_size', 'reader_line_height', 'reader_column_width', 'refresh_interval',
      'wifi_only_sync', 'mark_read_on', 'filter_duplicates', 'auto_purge_days',
      'enable_ai_summary', 'ai_summary_style', 'digest_time', 'vim_shortcuts',
      'high_contrast', 'reduced_motion', 'emphasize_unread', 'visual_indicators',
      'browser_notifications', 'notify_keywords', 'email_digest'
    ];

    const current = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) || {};
    const merged = { ...current, ...prefs, user_id: userId };

    const setClauses = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => merged[f] !== undefined ? merged[f] : null);

    db.prepare(`
      INSERT INTO user_preferences (user_id, ${fields.join(', ')})
      VALUES (?, ${fields.map(() => '?').join(', ')})
      ON CONFLICT(user_id) DO UPDATE SET
        ${setClauses},
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, ...values, ...values);

    return this.getById(userId);
  },

  async updateProfile(userId = 'guest-user-001', { name, email, avatarUrl }) {
    const db = await getDatabase();
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, email, avatarUrl, userId);
    return this.getById(userId);
  },
};
