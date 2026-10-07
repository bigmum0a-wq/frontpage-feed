// Feed Model
import { getDatabase } from '../../config/database.js';

export const FeedModel = {
  async getAll(userId = 'guest-user-001') {
    const db = await getDatabase();
    return db.prepare(`
      SELECT 
        f.*,
        uf.category_id AS categoryId,
        uf.custom_title AS customTitle,
        uf.is_favorite AS isFavorite,
        COUNT(CASE WHEN ua.is_read = 0 OR ua.is_read IS NULL THEN 1 END) AS unreadCount
      FROM feeds f
      JOIN user_feeds uf ON f.id = uf.feed_id AND uf.user_id = ?
      LEFT JOIN articles a ON f.id = a.feed_id
      LEFT JOIN user_articles ua ON a.id = ua.article_id AND ua.user_id = ?
      GROUP BY f.id
      ORDER BY f.title ASC
    `).all(userId, userId);
  },

  async getById(id, userId = 'guest-user-001') {
    const db = await getDatabase();
    return db.prepare(`
      SELECT f.*, uf.category_id AS categoryId, uf.custom_title AS customTitle
      FROM feeds f
      LEFT JOIN user_feeds uf ON f.id = uf.feed_id AND uf.user_id = ?
      WHERE f.id = ?
    `).get(userId, id);
  },

  async getByUrl(url) {
    const db = await getDatabase();
    return db.prepare('SELECT * FROM feeds WHERE url = ?').get(url);
  },

  async createOrUpdate(feed) {
    const db = await getDatabase();
    db.prepare(`
      INSERT INTO feeds (id, url, site_url, title, description, format, initials, color, etag, last_modified_header, last_fetched_at, last_successful_fetch_at, health_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active')
      ON CONFLICT(url) DO UPDATE SET
        site_url = COALESCE(excluded.site_url, feeds.site_url),
        title = COALESCE(excluded.title, feeds.title),
        description = COALESCE(excluded.description, feeds.description),
        format = COALESCE(excluded.format, feeds.format),
        etag = COALESCE(excluded.etag, feeds.etag),
        last_modified_header = COALESCE(excluded.last_modified_header, feeds.last_modified_header),
        last_fetched_at = CURRENT_TIMESTAMP,
        last_successful_fetch_at = CURRENT_TIMESTAMP,
        health_status = 'active',
        fetch_error_count = 0,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      feed.id,
      feed.url,
      feed.siteUrl || null,
      feed.title,
      feed.description || null,
      feed.format || 'rss2',
      feed.initials || feed.title.slice(0, 2).toUpperCase(),
      feed.color || '#2563eb',
      feed.etag || null,
      feed.lastModified || null,
    );
    return this.getByUrl(feed.url);
  },

  async subscribeUser(userId = 'guest-user-001', feedId, categoryId = 'frontend', customTitle = null) {
    const db = await getDatabase();
    const subId = `uf-${userId}-${feedId}`;
    db.prepare(`
      INSERT INTO user_feeds (id, user_id, feed_id, category_id, custom_title)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, feed_id) DO UPDATE SET
        category_id = excluded.category_id,
        custom_title = COALESCE(excluded.custom_title, user_feeds.custom_title)
    `).run(subId, userId, feedId, categoryId, customTitle);
    return this.getById(feedId, userId);
  },

  async updateHealth(feedId, { healthStatus, errorMessage = null, etag = null, lastModified = null }) {
    const db = await getDatabase();
    db.prepare(`
      UPDATE feeds
      SET health_status = ?,
          error_message = ?,
          etag = COALESCE(?, etag),
          last_modified_header = COALESCE(?, last_modified_header),
          last_fetched_at = CURRENT_TIMESTAMP,
          last_successful_fetch_at = CASE WHEN ? = 'active' THEN CURRENT_TIMESTAMP ELSE last_successful_fetch_at END,
          fetch_error_count = CASE WHEN ? = 'error' THEN fetch_error_count + 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(healthStatus, errorMessage, etag, lastModified, healthStatus, healthStatus, feedId);
  },

  async unsubscribeUser(userId = 'guest-user-001', feedId) {
    const db = await getDatabase();
    return db.prepare('DELETE FROM user_feeds WHERE user_id = ? AND feed_id = ?').run(userId, feedId);
  },
};
