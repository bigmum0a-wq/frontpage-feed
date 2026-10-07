// Category Model
import { getDatabase } from '../../config/database.js';

export const CategoryModel = {
  async getAll(userId = 'guest-user-001') {
    const db = await getDatabase();
    return db.prepare(`
      SELECT c.*, COUNT(DISTINCT uf.feed_id) AS feed_count
      FROM categories c
      LEFT JOIN user_feeds uf ON c.id = uf.category_id AND uf.user_id = ?
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all(userId, userId);
  },

  async getById(id, userId = 'guest-user-001') {
    const db = await getDatabase();
    return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
  },

  async create({ id, userId = 'guest-user-001', name, color = '#2563eb', background = '#dbeafe', sortOrder = 0 }) {
    const db = await getDatabase();
    const categoryId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    db.prepare(`
      INSERT INTO categories (id, user_id, name, color, background, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(categoryId, userId, name, color, background, sortOrder);
    return this.getById(categoryId, userId);
  },

  async update(id, userId, { name, color, background, sortOrder }) {
    const db = await getDatabase();
    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          color = COALESCE(?, color),
          background = COALESCE(?, background),
          sort_order = COALESCE(?, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(name, color, background, sortOrder, id, userId);
    return this.getById(id, userId);
  },

  async delete(id, userId = 'guest-user-001') {
    const db = await getDatabase();
    return db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
  },
};
