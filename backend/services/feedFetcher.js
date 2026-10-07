// Feed Fetcher Service with Timeout, Conditional Headers & Error Handling
import { env } from '../../config/environment.js';
import { logger } from '../utils/logger.js';
import { parseFeedXml } from './rssParser.js';

export async function fetchFeed(feedUrl, options = {}) {
  const { etag = null, lastModified = null, timeoutMs = env.FEED_FETCH_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'User-Agent': 'FrontPage-Reader/1.0 (+https://github.com/frontpage)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  };

  if (etag) {
    headers['If-None-Match'] = etag;
  }
  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }

  try {
    const response = await fetch(feedUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // 304 Not Modified: The feed has not changed since last fetch
    if (response.status === 304) {
      return {
        notModified: true,
        etag,
        lastModified,
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const newEtag = response.headers.get('etag') || null;
    const newLastModified = response.headers.get('last-modified') || null;
    const finalUrl = response.url || feedUrl;

    const parsed = parseFeedXml(xmlText);

    return {
      notModified: false,
      finalUrl,
      etag: newEtag,
      lastModified: newLastModified,
      ...parsed,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logger.warn(`Feed fetch timeout: ${feedUrl}`);
      throw new Error(`Timeout (${timeoutMs}ms) exceeded for ${feedUrl}`);
    }
    logger.error(`Failed to fetch feed ${feedUrl}:`, error.message);
    throw error;
  }
}
