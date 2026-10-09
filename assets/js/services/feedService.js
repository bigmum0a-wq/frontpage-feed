import { addFeed, getCategoryById, resetToGuestSampleLibrary, state } from '../state.js';
import { MAX_FEED_NAME_LENGTH } from '../utils/constants.js';
import { createInitials } from '../utils/helpers.js';
import { sanitizeFeedUrl, sanitizeText } from '../utils/sanitize.js';
import { api } from './apiService.js';
import { isGuestUser } from './authService.js';

export function validateFeedDetails({ name, url, categoryId }) {
  const safeName = sanitizeText(name);

  if (!safeName) throw new Error('Un nom de flux est requis.');
  if (safeName.length > MAX_FEED_NAME_LENGTH) throw new Error(`Le nom est limité à ${MAX_FEED_NAME_LENGTH} caractères.`);
  if (!getCategoryById(categoryId)) throw new Error('Veuillez choisir une catégorie valide.');

  return {
    name: safeName,
    url: sanitizeFeedUrl(url),
    categoryId,
    initials: createInitials(safeName),
  };
}

export function addLocalFeed(feedDetails) {
  return addFeed(validateFeedDetails(feedDetails));
}

export async function addFeedRemote(feedDetails) {
  try {
    const validated = validateFeedDetails(feedDetails);
    const response = await api.post('/feeds', validated);
    if (response && response.success && response.data) {
      addFeed({
        id: response.data.id,
        name: response.data.title,
        categoryId: response.data.categoryId || validated.categoryId,
        initials: response.data.initials || validated.initials,
        color: response.data.color || '#2563eb',
      });
      return response.data;
    }
    return addLocalFeed(feedDetails);
  } catch (error) {
    // Fallback to local
    console.warn('Backend indisponible, ajout en local:', error.message);
    return addLocalFeed(feedDetails);
  }
}

export async function syncFeedsWithServer() {
  if (isGuestUser()) {
    // Guest Mode: strictly maintain the lightweight sample preview dataset
    resetToGuestSampleLibrary();
    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
    return true;
  }

  try {
    const [categoriesRes, feedsRes, articlesRes] = await Promise.all([
      api.get('/categories').catch(() => null),
      api.get('/feeds').catch(() => null),
      api.get('/articles?limit=100&offset=0').catch(() => null),
    ]);

    if (categoriesRes?.success && Array.isArray(categoriesRes.data) && categoriesRes.data.length > 0) {
      state.categories = categoriesRes.data.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color || '#2563eb',
        background: c.background || '#dbeafe',
      }));
    }

    if (feedsRes?.success && Array.isArray(feedsRes.data) && feedsRes.data.length > 0) {
      state.feeds = feedsRes.data.map((f) => ({
        id: f.id,
        name: f.title || f.name,
        categoryId: f.categoryId || f.category_id || 'frontend',
        initials: f.initials || (f.title || f.name || 'FP').slice(0, 2).toUpperCase(),
        color: f.color || '#2563eb',
        url: f.url,
        siteUrl: f.site_url || f.siteUrl,
      }));
    }

    if (articlesRes?.success && Array.isArray(articlesRes.data) && articlesRes.data.length > 0) {
      state.totalArticlesCount = articlesRes.total || articlesRes.data.length;
      state.articles = articlesRes.data.map((a) => {
        const localArticle = state.articles.find((item) => item.id === a.id);
        const isRead = localArticle !== undefined ? localArticle.isRead : Boolean(a.isRead);
        const isSaved = localArticle !== undefined ? localArticle.isSaved : Boolean(a.isSaved);
        return {
          id: a.id,
          feedId: a.feedId || a.feed_id,
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          author: a.author,
          imageUrl: a.imageUrl || a.image_url,
          publishedAt: a.publishedAt || a.published_at,
          isRead,
          isSaved,
          aiSummary: a.aiSummary,
          aiTakeaways: a.aiTakeaways,
          aiTags: a.aiTags,
          aiReadingTime: a.aiReadingTime,
        };
      });
    }

    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
    return true;
  } catch (err) {
    console.warn('Sync serveur ignorée (mode hors-ligne):', err.message);
    return false;
  }
}

export async function loadMoreArticles() {
  if (isGuestUser()) return false;
  const currentOffset = state.articles.length;
  try {
    const articlesRes = await api.get(`/articles?limit=100&offset=${currentOffset}`);
    if (articlesRes?.success && Array.isArray(articlesRes.data) && articlesRes.data.length > 0) {
      state.totalArticlesCount = articlesRes.total || (currentOffset + articlesRes.data.length);
      const existingIds = new Set(state.articles.map((item) => item.id));
      const newArticles = articlesRes.data
        .filter((a) => !existingIds.has(a.id))
        .map((a) => ({
          id: a.id,
          feedId: a.feedId || a.feed_id,
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          author: a.author,
          imageUrl: a.imageUrl || a.image_url,
          publishedAt: a.publishedAt || a.published_at,
          isRead: Boolean(a.isRead),
          isSaved: Boolean(a.isSaved),
          aiSummary: a.aiSummary,
          aiTakeaways: a.aiTakeaways,
          aiTags: a.aiTags,
          aiReadingTime: a.aiReadingTime,
        }));

      state.articles = [...state.articles, ...newArticles];
      window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
      return newArticles.length > 0;
    }
    return false;
  } catch (err) {
    console.warn('Failed to load more articles:', err.message);
    return false;
  }
}
