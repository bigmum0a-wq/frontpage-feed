// Feed Controller
import { FeedModel } from '../models/feedModel.js';
import { CategoryModel } from '../models/categoryModel.js';
import { ArticleModel } from '../models/articleModel.js';
import { fetchFeed } from '../services/feedFetcher.js';
import { generateOpml, parseOpml } from '../services/opmlService.js';
import { searchWebFeeds } from '../services/discoverService.js';
import { isValidUrl, sanitizeString } from '../utils/validator.js';
import { logger } from '../utils/logger.js';

export const FeedController = {
  async discoverFeeds(req, res, next) {
    try {
      const query = String(req.query.q || req.query.query || '').trim();
      const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));
      const results = await searchWebFeeds(query, limit);
      res.json({ success: true, count: results.length, data: results });
    } catch (error) {
      next(error);
    }
  },

  async getFeeds(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const feeds = await FeedModel.getAll(userId);
      res.json({ success: true, data: feeds });
    } catch (error) {
      next(error);
    }
  },

  async addFeed(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { url, name, categoryId = 'frontend' } = req.body;

      if (!url || !isValidUrl(url)) {
        return res.status(400).json({ success: false, error: { message: 'URL de flux invalide' } });
      }

      logger.info(`Ajout du flux: ${url}`);
      const fetched = await fetchFeed(url);

      const feedId = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : fetched.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const feedData = {
        id: `feed-${feedId}-${Date.now().toString(36)}`,
        url: fetched.finalUrl || url,
        siteUrl: fetched.siteUrl || '',
        title: sanitizeString(name || fetched.title),
        description: sanitizeString(fetched.description, 500),
        format: fetched.format,
        initials: (name || fetched.title).slice(0, 2).toUpperCase(),
        color: '#2563eb',
        etag: fetched.etag,
        lastModified: fetched.lastModified,
      };

      const savedFeed = await FeedModel.createOrUpdate(feedData);
      await FeedModel.subscribeUser(userId, savedFeed.id, categoryId, name || null);

      if (fetched.items && fetched.items.length > 0) {
        await ArticleModel.upsertArticles(savedFeed.id, fetched.items);
      }

      res.status(201).json({
        success: true,
        data: savedFeed,
        message: `${fetched.items.length} articles imported`,
      });
    } catch (error) {
      next(error);
    }
  },

  async refreshFeed(req, res, next) {
    try {
      const { id } = req.params;
      const feed = await FeedModel.getById(id);

      if (!feed) {
        return res.status(404).json({ success: false, error: { message: 'Flux introuvable' } });
      }

      try {
        const fetched = await fetchFeed(feed.url, {
          etag: feed.etag,
          lastModified: feed.last_modified_header,
        });

        if (fetched.notModified) {
          await FeedModel.updateHealth(id, { healthStatus: 'active' });
          return res.json({ success: true, message: 'Feed already up to date (304 Not Modified)' });
        }

        await FeedModel.updateHealth(id, {
          healthStatus: 'active',
          etag: fetched.etag,
          lastModified: fetched.lastModified,
        });

        let newArticlesCount = 0;
        if (fetched.items && fetched.items.length > 0) {
          newArticlesCount = await ArticleModel.upsertArticles(id, fetched.items);
        }

        res.json({
          success: true,
          message: `Feed refreshed successfully (${newArticlesCount} articles updated)`,
        });
      } catch (fetchError) {
        await FeedModel.updateHealth(id, {
          healthStatus: 'error',
          errorMessage: fetchError.message,
        });
        throw fetchError;
      }
    } catch (error) {
      next(error);
    }
  },

  async refreshAllFeeds(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const feeds = await FeedModel.getAll(userId);

      const results = await Promise.allSettled(
        feeds.map(async (feed) => {
          const fetched = await fetchFeed(feed.url, {
            etag: feed.etag,
            lastModified: feed.last_modified_header,
          });

          if (!fetched.notModified && fetched.items) {
            await ArticleModel.upsertArticles(feed.id, fetched.items);
          }

          await FeedModel.updateHealth(feed.id, {
            healthStatus: 'active',
            etag: fetched.etag,
            lastModified: fetched.lastModified,
          });
        })
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      res.json({
        success: true,
        message: `${succeeded}/${feeds.length} feeds refreshed`,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteFeed(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { id } = req.params;
      await FeedModel.unsubscribeUser(userId, id);
      res.json({ success: true, message: 'Subscription removed' });
    } catch (error) {
      next(error);
    }
  },

  async exportOpml(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const categories = await CategoryModel.getAll(userId);
      const feeds = await FeedModel.getAll(userId);

      const xml = generateOpml(categories, feeds);
      res.setHeader('Content-Type', 'text/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="frontpage-subscriptions.opml"');
      res.send(xml);
    } catch (error) {
      next(error);
    }
  },

  async importOpml(req, res, next) {
    try {
      const userId = req.user?.id || 'guest-user-001';
      const { opmlContent } = req.body;

      if (!opmlContent) {
        return res.status(400).json({ success: false, error: { message: 'Contenu OPML requis' } });
      }

      const parsed = parseOpml(opmlContent);
      let importedCount = 0;

      for (const feed of parsed.feeds) {
        try {
          const fetched = await fetchFeed(feed.xmlUrl);
          const feedId = `feed-${feed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
          const savedFeed = await FeedModel.createOrUpdate({
            id: feedId,
            url: feed.xmlUrl,
            siteUrl: feed.htmlUrl || fetched.siteUrl,
            title: feed.title || fetched.title,
            description: fetched.description,
            format: fetched.format,
          });
          await FeedModel.subscribeUser(userId, savedFeed.id, 'frontend');
          if (fetched.items) {
            await ArticleModel.upsertArticles(savedFeed.id, fetched.items);
          }
          importedCount += 1;
        } catch (err) {
          logger.warn(`Impossible d'importer le flux ${feed.xmlUrl}:`, err.message);
        }
      }

      res.json({
        success: true,
        message: `${importedCount} feeds imported successfully`,
        totalInFile: parsed.totalParsed,
      });
    } catch (error) {
      next(error);
    }
  },
};
