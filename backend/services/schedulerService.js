// Background Periodic Feed Sync Worker
import { FeedModel } from '../models/feedModel.js';
import { ArticleModel } from '../models/articleModel.js';
import { fetchFeed } from './feedFetcher.js';
import { logger } from '../utils/logger.js';
import { env } from '../../config/environment.js';

let schedulerInterval = null;
let isRefreshing = false;

export async function refreshAllSubscribedFeeds() {
  if (isRefreshing) {
    logger.info('Scheduler: A refresh is already in progress, skipping.');
    return;
  }

  isRefreshing = true;
  logger.info('Scheduler: Starting automatic feed refresh...');

  try {
    const feeds = await FeedModel.getAll('guest-user-001');
    if (!feeds || feeds.length === 0) {
      logger.info('Scheduler: No feeds to refresh.');
      isRefreshing = false;
      return;
    }

    let updatedCount = 0;
    let totalNewArticles = 0;

    // Process in batches of 4 concurrent requests
    const batchSize = 4;
    for (let i = 0; i < feeds.length; i += batchSize) {
      const batch = feeds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (feed) => {
          try {
            const fetched = await fetchFeed(feed.url, {
              etag: feed.etag,
              lastModified: feed.last_modified_header,
            });

            if (fetched.notModified) {
              await FeedModel.updateHealth(feed.id, { healthStatus: 'active' });
              return;
            }

            let newArticles = 0;
            if (fetched.items && fetched.items.length > 0) {
              newArticles = await ArticleModel.upsertArticles(feed.id, fetched.items);
              totalNewArticles += newArticles;
            }

            await FeedModel.updateHealth(feed.id, {
              healthStatus: 'active',
              etag: fetched.etag,
              lastModified: fetched.lastModified,
            });

            updatedCount += 1;
          } catch (err) {
            logger.warn(`Scheduler: Error updating feed [${feed.title}]:`, err.message);
            await FeedModel.updateHealth(feed.id, {
              healthStatus: 'error',
              errorMessage: err.message,
            });
          }
        })
      );
    }

    logger.info(`Scheduler: Refresh complete. ${updatedCount}/${feeds.length} feeds updated (${totalNewArticles} new articles).`);
  } catch (error) {
    logger.error('Scheduler: Global refresh error:', error);
  } finally {
    isRefreshing = false;
  }
}

export function startFeedScheduler(intervalMinutes = env.CACHE_TTL_MINUTES || 15) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;
  logger.info(`Scheduler: Background task started (interval: ${intervalMinutes} min).`);

  schedulerInterval = setInterval(() => {
    refreshAllSubscribedFeeds();
  }, intervalMs);
}

export function stopFeedScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Scheduler: Background task stopped.');
  }
}
