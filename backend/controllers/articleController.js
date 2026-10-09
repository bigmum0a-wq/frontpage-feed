import { ArticleModel } from '../models/articleModel.js';
import { summarizeArticle as summarizeService, generateDailyDigest } from '../services/aiService.js';

export const ArticleController = {
  async getArticles(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { categoryId, feedId, isSaved, search, sortOrder, limit, offset } = req.query;

      const articles = await ArticleModel.getArticles(userId, {
        categoryId,
        feedId,
        isSaved: isSaved === 'true' ? true : isSaved === 'false' ? false : null,
        search,
        sortOrder,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      const total = articles.total ?? articles.length;

      res.json({
        success: true,
        count: articles.length,
        total,
        offset: parsedOffset,
        hasMore: (parsedOffset + articles.length) < total,
        data: articles,
      });
    } catch (error) {
      next(error);
    }
  },

  async getArticleById(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;
      const article = await ArticleModel.getById(id, userId);

      if (!article) {
        return res.status(404).json({ success: false, error: { message: 'Article introuvable' } });
      }

      res.json({ success: true, data: article });
    } catch (error) {
      next(error);
    }
  },

  async summarizeArticle(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;
      const { forceRefresh = false } = req.body || {};

      const article = await ArticleModel.getById(id, userId);
      if (!article) {
        return res.status(404).json({ success: false, error: { message: 'Article introuvable' } });
      }

      // Check DB cache first unless forceRefresh is true
      if (!forceRefresh && article.aiSummary) {
        return res.json({
          success: true,
          cached: true,
          data: {
            summary: article.aiSummary,
            takeaways: article.aiTakeaways || [],
            tags: article.aiTags || [],
            readingTime: article.aiReadingTime || 2,
            generatedAt: article.aiGeneratedAt,
            source: 'cache',
          },
        });
      }

      // Generate AI summary
      const aiResult = await summarizeService({
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
      });

      // Save to SQLite
      await ArticleModel.saveAiSummary(id, {
        summary: aiResult.summary,
        takeaways: aiResult.takeaways,
        tags: aiResult.tags,
        readingTime: aiResult.readingTime,
      });

      res.json({
        success: true,
        cached: false,
        data: {
          ...aiResult,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async generateAiDigest(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const articles = await ArticleModel.getArticles(userId, { limit: 15 });

      const digest = await generateDailyDigest(articles);
      res.json({ success: true, data: digest });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;
      const { isRead = true } = req.body;

      await ArticleModel.markAsRead(userId, id, isRead);
      res.json({ success: true, message: `Article marked as ${isRead ? 'read' : 'unread'}` });
    } catch (error) {
      next(error);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { categoryId, feedId } = req.body;

      const count = await ArticleModel.markAllAsRead(userId, { categoryId, feedId });
      res.json({ success: true, count, message: `${count} articles marked as read` });
    } catch (error) {
      next(error);
    }
  },

  async toggleSaved(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;

      const isSaved = await ArticleModel.toggleSaved(userId, id);
      res.json({
        success: true,
        isSaved,
        message: isSaved ? 'Article added to starred' : 'Article removed from starred',
      });
    } catch (error) {
      next(error);
    }
  },
};

