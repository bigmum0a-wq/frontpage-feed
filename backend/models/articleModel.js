// Article Model
import crypto from 'node:crypto';
import { getDatabase } from '../../config/database.js';

export const ArticleModel = {
  async getArticles(userId = 'guest-user-001', options = {}) {
    const db = await getDatabase();
    const {
      categoryId = null,
      feedId = null,
      isSaved = null,
      search = '',
      sortOrder = 'newest',
      limit = 100,
      offset = 0,
    } = options;

    let query = `
      SELECT 
        a.id,
        a.feed_id AS feedId,
        a.guid,
        a.url,
        a.title,
        a.excerpt,
        a.content,
        a.author,
        a.image_url AS imageUrl,
        a.published_at AS publishedAt,
        a.ai_summary AS aiSummary,
        a.ai_takeaways AS aiTakeaways,
        a.ai_tags AS aiTags,
        a.ai_reading_time AS aiReadingTime,
        a.ai_generated_at AS aiGeneratedAt,
        f.title AS feedName,
        f.initials AS feedInitials,
        f.color AS feedColor,
        uf.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        c.background AS categoryBackground,
        COALESCE(ua.is_read, 0) AS isRead,
        COALESCE(ua.is_saved, 0) AS isSaved
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      JOIN user_feeds uf ON f.id = uf.feed_id AND uf.user_id = ?
      LEFT JOIN categories c ON uf.category_id = c.id
      LEFT JOIN user_articles ua ON a.id = ua.article_id AND ua.user_id = ?
      WHERE 1=1
    `;

    const params = [userId, userId];

    if (feedId) {
      query += ' AND a.feed_id = ?';
      params.push(feedId);
    }

    if (categoryId && categoryId !== 'all') {
      query += ' AND uf.category_id = ?';
      params.push(categoryId);
    }

    if (isSaved === true || isSaved === 'true') {
      query += ' AND ua.is_saved = 1';
    }

    if (search && search.trim()) {
      query += ' AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.author LIKE ? OR a.ai_tags LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += sortOrder === 'oldest' 
      ? ' ORDER BY a.published_at ASC' 
      : ' ORDER BY a.published_at DESC';

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    return rows.map((row) => formatArticleRow(row));
  },

  async getById(articleId, userId = 'guest-user-001') {
    const db = await getDatabase();
    const row = db.prepare(`
      SELECT 
        a.*,
        a.ai_summary AS aiSummary,
        a.ai_takeaways AS aiTakeaways,
        a.ai_tags AS aiTags,
        a.ai_reading_time AS aiReadingTime,
        a.ai_generated_at AS aiGeneratedAt,
        f.title AS feedName,
        f.site_url AS siteUrl,
        uf.category_id AS categoryId,
        c.name AS categoryName,
        COALESCE(ua.is_read, 0) AS isRead,
        COALESCE(ua.is_saved, 0) AS isSaved
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      LEFT JOIN user_feeds uf ON f.id = uf.feed_id AND uf.user_id = ?
      LEFT JOIN categories c ON uf.category_id = c.id
      LEFT JOIN user_articles ua ON a.id = ua.article_id AND ua.user_id = ?
      WHERE a.id = ?
    `).get(userId, userId, articleId);

    return row ? formatArticleRow(row) : null;
  },

  async saveAiSummary(articleId, { summary, takeaways = [], tags = [], readingTime = 2 }) {
    const db = await getDatabase();
    const takeawaysJson = typeof takeaways === 'string' ? takeaways : JSON.stringify(takeaways);
    const tagsJson = typeof tags === 'string' ? tags : JSON.stringify(tags);

    return db.prepare(`
      UPDATE articles 
      SET 
        ai_summary = ?,
        ai_takeaways = ?,
        ai_tags = ?,
        ai_reading_time = ?,
        ai_generated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(summary, takeawaysJson, tagsJson, readingTime, articleId);
  },

  async getAiSummary(articleId) {
    const db = await getDatabase();
    const row = db.prepare(`
      SELECT 
        ai_summary AS summary,
        ai_takeaways AS takeaways,
        ai_tags AS tags,
        ai_reading_time AS readingTime,
        ai_generated_at AS generatedAt
      FROM articles
      WHERE id = ?
    `).get(articleId);

    if (!row || !row.summary) return null;

    return {
      summary: row.summary,
      takeaways: parseJsonSafe(row.takeaways, []),
      tags: parseJsonSafe(row.tags, []),
      readingTime: row.readingTime || 2,
      generatedAt: row.generatedAt,
    };
  },

  async upsertArticles(feedId, items = []) {
    const db = await getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO articles (id, feed_id, guid, url, title, excerpt, content, author, image_url, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(feed_id, guid) DO UPDATE SET
        title = excluded.title,
        excerpt = COALESCE(excluded.excerpt, articles.excerpt),
        content = COALESCE(excluded.content, articles.content),
        url = excluded.url,
        author = COALESCE(excluded.author, articles.author),
        image_url = COALESCE(excluded.image_url, articles.image_url),
        published_at = excluded.published_at,
        updated_at = CURRENT_TIMESTAMP
    `);

    let insertedCount = 0;
    for (const item of items) {
      const rawKey = `${feedId}:${item.guid || item.url || item.title}`;
      const hash = crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 16);
      const articleId = `art-${feedId.slice(0, 15)}-${hash}`;

      insertStmt.run(
        articleId,
        feedId,
        item.guid || item.url,
        item.url,
        item.title,
        item.excerpt || null,
        item.content || null,
        item.author || null,
        item.imageUrl || null,
        item.publishedAt,
      );
      insertedCount += 1;
    }


    return insertedCount;
  },

  async markAsRead(userId = 'guest-user-001', articleId, isRead = true) {
    const db = await getDatabase();
    return db.prepare(`
      INSERT INTO user_articles (user_id, article_id, is_read, read_at)
      VALUES (?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT(user_id, article_id) DO UPDATE SET
        is_read = excluded.is_read,
        read_at = excluded.read_at
    `).run(userId, articleId, isRead ? 1 : 0, isRead ? 1 : 0);
  },

  async markAllAsRead(userId = 'guest-user-001', { categoryId = null, feedId = null } = {}) {
    const db = await getDatabase();
    let targetArticlesQuery = `
      SELECT a.id 
      FROM articles a
      JOIN user_feeds uf ON a.feed_id = uf.feed_id AND uf.user_id = ?
      WHERE 1=1
    `;
    const params = [userId];

    if (feedId) {
      targetArticlesQuery += ' AND a.feed_id = ?';
      params.push(feedId);
    }
    if (categoryId && categoryId !== 'all') {
      targetArticlesQuery += ' AND uf.category_id = ?';
      params.push(categoryId);
    }

    const articles = db.prepare(targetArticlesQuery).all(...params);
    const markStmt = db.prepare(`
      INSERT INTO user_articles (user_id, article_id, is_read, read_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, article_id) DO UPDATE SET
        is_read = 1,
        read_at = CURRENT_TIMESTAMP
    `);

    for (const art of articles) {
      markStmt.run(userId, art.id);
    }

    return articles.length;
  },

  async toggleSaved(userId = 'guest-user-001', articleId) {
    const db = await getDatabase();
    const current = db.prepare('SELECT is_saved FROM user_articles WHERE user_id = ? AND article_id = ?').get(userId, articleId);
    const nextSaved = current && current.is_saved ? 0 : 1;

    db.prepare(`
      INSERT INTO user_articles (user_id, article_id, is_saved, saved_at)
      VALUES (?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT(user_id, article_id) DO UPDATE SET
        is_saved = ?,
        saved_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
    `).run(userId, articleId, nextSaved, nextSaved, nextSaved, nextSaved);

    return nextSaved === 1;
  },
};

function parseJsonSafe(jsonString, fallback = []) {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

function formatArticleRow(row) {
  if (!row) return null;
  return {
    ...row,
    isRead: Boolean(row.isRead),
    isSaved: Boolean(row.isSaved),
    aiTakeaways: parseJsonSafe(row.aiTakeaways, []),
    aiTags: parseJsonSafe(row.aiTags, []),
    aiReadingTime: row.aiReadingTime || (row.content ? Math.max(1, Math.round(row.content.split(/\s+/).length / 200)) : 2),
  };
}

