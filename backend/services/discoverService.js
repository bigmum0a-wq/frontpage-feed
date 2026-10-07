// backend/services/discoverService.js
import { logger } from '../utils/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_FEEDS_PATH = path.resolve(__dirname, '../../assets/js/data-sample-feeds.json');

let curatedFeedsCache = null;

function loadCuratedFeeds() {
  if (curatedFeedsCache) return curatedFeedsCache;
  try {
    if (fs.existsSync(SAMPLE_FEEDS_PATH)) {
      const raw = fs.readFileSync(SAMPLE_FEEDS_PATH, 'utf-8');
      const data = JSON.parse(raw);
      const flat = [];
      (data.categories || []).forEach((cat) => {
        (cat.feeds || []).forEach((feed) => {
          flat.push({
            title: feed.title,
            feedUrl: feed.feedUrl,
            siteUrl: feed.siteUrl,
            description: feed.description || '',
            topics: [cat.name.toLowerCase()],
            categoryName: cat.name,
            subscribers: Math.floor(Math.random() * 5000) + 1200,
            iconUrl: '',
            isCurated: true,
          });
        });
      });
      curatedFeedsCache = flat;
      return flat;
    }
  } catch (err) {
    logger.warn('Failed to load local curated feeds:', err.message);
  }
  return [];
}

/**
 * Searches feeds using public feed discovery API with graceful fallback
 * @param {string} query - Search term or topic
 * @param {number} limit - Maximum number of results
 */
export async function searchWebFeeds(query = '', limit = 12) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return loadCuratedFeeds().slice(0, limit);
  }

  // 1. Attempt live web search via Feedly Cloud Search API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const endpoint = `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(cleanQuery)}&count=${encodeURIComponent(limit)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'FrontPage-Reader/1.0 (+https://github.com/frontpage)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        const results = data.results.map((item) => {
          let feedUrl = item.feedId || '';
          if (feedUrl.startsWith('feed/')) {
            feedUrl = feedUrl.slice(5);
          }

          return {
            title: item.title || cleanQuery,
            feedUrl: feedUrl || item.website || '',
            siteUrl: item.website || '',
            description: item.description || '',
            subscribers: item.subscribers || 0,
            iconUrl: item.iconUrl || item.visualUrl || '',
            topics: item.topics || [cleanQuery.toLowerCase()],
            language: item.language || 'en',
            isLive: true,
          };
        }).filter((f) => f.feedUrl && f.feedUrl.startsWith('http'));

        if (results.length > 0) {
          return results.slice(0, limit);
        }
      }
    }
  } catch (error) {
    logger.info(`Live web feed search skipped or timed out for "${cleanQuery}": ${error.message}. Falling back to curated index.`);
  }

  // 2. Fallback to curated catalog with keyword matching
  const curated = loadCuratedFeeds();
  const lower = cleanQuery.toLowerCase();
  const matched = curated.filter((feed) =>
    feed.title.toLowerCase().includes(lower) ||
    feed.description.toLowerCase().includes(lower) ||
    feed.topics.some((t) => t.includes(lower) || lower.includes(t)) ||
    (feed.categoryName && feed.categoryName.toLowerCase().includes(lower))
  );

  return (matched.length > 0 ? matched : curated).slice(0, limit);
}
