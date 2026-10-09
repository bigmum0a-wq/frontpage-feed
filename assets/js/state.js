import { loadLibrary, saveLibrary } from './services/storageService.js';
import { articleMatchesQuery, semanticSearch } from './services/searchService.js';
import { createInitials } from './utils/helpers.js';
import { toDateKey } from './utils/date.js';
import { applyAllRules } from './services/rulesService.js';
import { api } from './services/apiService.js';

const categories = [
  { id: 'frontend', name: 'Frontend', color: '#2563eb', background: '#dbeafe' },
  { id: 'design', name: 'Design', color: '#db2777', background: '#fce7f3' },
  { id: 'backend-devops', name: 'Backend & DevOps', color: '#d97706', background: '#fef3c7' },
  { id: 'general-tech', name: 'General Tech', color: '#4f46e5', background: '#e0e7ff' },
  { id: 'ai-ml', name: 'AI & ML', color: '#7c3aed', background: '#ede9fe' },
];

export const sampleFeeds = [
  // Frontend
  { id: 'smashing-magazine', name: 'Smashing Magazine', categoryId: 'frontend', initials: 'SM', color: '#e53e3e' },
  { id: 'josh-comeau', name: 'Josh W. Comeau', categoryId: 'frontend', initials: 'JC', color: '#5b5ce2' },
  // Design
  { id: 'figma-blog', name: 'Figma Blog', categoryId: 'design', initials: 'FB', color: '#f24e1e' },
  { id: 'sidebar-io', name: 'Sidebar.io', categoryId: 'design', initials: 'SB', color: '#ee5a24' },
  // Backend & DevOps
  { id: 'cloudflare-blog', name: 'Cloudflare Blog', categoryId: 'backend-devops', initials: 'CF', color: '#f38020' },
  { id: 'vercel-blog', name: 'Vercel Blog', categoryId: 'backend-devops', initials: 'VB', color: '#000000' },
  // General Tech
  { id: 'hacker-news', name: 'Hacker News Best', categoryId: 'general-tech', initials: 'HN', color: '#ff6600' },
  { id: 'pragmatic-engineer', name: 'The Pragmatic Engineer', categoryId: 'general-tech', initials: 'PE', color: '#3b82f6' },
  // AI & ML
  { id: 'simon-willison', name: "Simon Willison's Weblog", categoryId: 'ai-ml', initials: 'SW', color: '#7c3aed' },
  { id: 'hugging-face', name: 'Hugging Face Blog', categoryId: 'ai-ml', initials: 'HF', color: '#ffd21e' },
];

export const sampleArticles = [
  // Frontend
  {
    id: 'sample-colorblind-users',
    feedId: 'smashing-magazine',
    title: 'Practical Guide to Designing for Colorblind Users',
    excerpt: "Color blindness affects roughly 8% of men and 0.5% of women worldwide. Here's how to design interfaces that work for everyone.",
    publishedAt: '2026-09-05T08:00:00Z',
    isRead: false,
    isSaved: false,
  },
  {
    id: 'sample-container-queries',
    feedId: 'josh-comeau',
    title: 'The Surprising Truth About CSS Container Queries',
    excerpt: 'Container queries have been available for a while, but most developers are still using them like media queries.',
    publishedAt: '2026-09-05T05:00:00Z',
    isRead: false,
    isSaved: false,
  },
  // Design
  {
    id: 'sample-figma-variables',
    feedId: 'figma-blog',
    title: 'Introducing Variables 2.0: Design Tokens Meet Real Logic',
    excerpt: 'Variables now support conditional logic, mathematical expressions, and cross-file references for richer design systems.',
    publishedAt: '2026-09-05T04:00:00Z',
    isRead: true,
    isSaved: false,
  },
  {
    id: 'sample-design-systems-scale',
    feedId: 'sidebar-io',
    title: 'Design Systems at Scale: Component Architecture Principles',
    excerpt: 'How leading design teams structure design tokens, component libraries, and accessibility contracts for multi-brand apps.',
    publishedAt: '2026-09-04T12:00:00Z',
    isRead: false,
    isSaved: false,
  },
  // Backend & DevOps
  {
    id: 'sample-edge-first-caching',
    feedId: 'cloudflare-blog',
    title: 'How We Reduced P99 Latency by 60% with Edge-First Caching',
    excerpt: 'Our engineering team spent the last quarter rethinking how we cache at the edge, with dramatic results for customers.',
    publishedAt: '2026-09-05T07:00:00Z',
    isRead: false,
    isSaved: true,
  },
  {
    id: 'sample-server-components-ttfb',
    feedId: 'vercel-blog',
    title: 'Streaming Server Components: Architecting Ultra-Fast TTFB',
    excerpt: 'How progressive hydration and parallel edge streaming deliver instantaneous first contentful paint across the globe.',
    publishedAt: '2026-09-04T14:30:00Z',
    isRead: false,
    isSaved: false,
  },
  // General Tech
  {
    id: 'sample-thoughtful-rss',
    feedId: 'hacker-news',
    title: 'Why a Thoughtful RSS Reader Still Matters',
    excerpt: 'A calm place to read can be more valuable than another algorithmic feed competing for your attention.',
    publishedAt: '2026-09-04T17:00:00Z',
    isRead: true,
    isSaved: true,
  },
  {
    id: 'sample-engineering-velocity',
    feedId: 'pragmatic-engineer',
    title: 'Engineering Velocity: What Top Tech Teams Measure',
    excerpt: 'DORA metrics vs developer productivity frameworks: what high-growth engineering organizations track in 2026.',
    publishedAt: '2026-09-04T09:15:00Z',
    isRead: false,
    isSaved: false,
  },
  // AI & ML
  {
    id: 'sample-effective-rag-systems',
    feedId: 'simon-willison',
    title: 'Building Effective RAG Systems: What Actually Works in Production',
    excerpt: "After months of experimenting with retrieval-augmented generation, here's what I have learned about making systems reliable.",
    publishedAt: '2026-09-05T06:00:00Z',
    isRead: false,
    isSaved: false,
  },
  {
    id: 'sample-open-source-models',
    feedId: 'hugging-face',
    title: 'Open Source Models in 2026: From Inference to Fine-Tuning',
    excerpt: 'Small language models running locally are outperforming previous generation frontier models on targeted coding tasks.',
    publishedAt: '2026-09-03T18:00:00Z',
    isRead: false,
    isSaved: false,
  },
];

const hasAuthToken = typeof window !== 'undefined' && Boolean(window.localStorage?.getItem('frontpage_auth_token'));
const storedLibrary = hasAuthToken ? loadLibrary() : null;

function createInitialReadingActivity() {
  return sampleArticles
    .filter((article) => article.isRead)
    .reduce((activity, article) => {
      const date = article.publishedAt.slice(0, 10);
      activity[date] = (activity[date] ?? 0) + 1;
      return activity;
    }, {});
}

function persistLibrary() {
  saveLibrary({
    feeds: state.feeds,
    articles: state.articles,
    readingActivity: state.readingActivity,
  });
}

function recordReadingActivity() {
  const today = toDateKey();
  state.readingActivity[today] = (state.readingActivity[today] ?? 0) + 1;
}

export function resetToGuestSampleLibrary() {
  state.feeds = sampleFeeds.map((f) => ({ ...f }));
  state.articles = sampleArticles.map((a) => ({ ...a }));
  state.totalArticlesCount = sampleArticles.length;
}

export const state = {
  activeView: 'feed',
  activeCategoryId: 'all',
  activeFeedId: null,
  showSavedItems: false,
  selectedArticleId: null,
  feedLayout: 'list',
  feedSortOrder: 'newest',
  searchQuery: '',
  currentSearchIntent: null,
  categories,
  feeds: storedLibrary?.feeds ?? sampleFeeds.map((f) => ({ ...f })),
  articles: storedLibrary?.articles ?? sampleArticles.map((a) => ({ ...a })),
  totalArticlesCount: storedLibrary?.articles?.length ?? sampleArticles.length,
  readingActivity: storedLibrary?.readingActivity ?? createInitialReadingActivity(),
};

export function getFeedById(feedId) {
  return state.feeds.find((feed) => feed.id === feedId) ?? null;
}

export function getCategoryById(categoryId) {
  return state.categories.find((category) => category.id === categoryId) ?? null;
}

export function getVisibleArticles() {
  const query = state.searchQuery.trim();

  // Enrich articles with feedName for rule matching and search
  const enriched = state.articles.map((article) => {
    const feed = getFeedById(article.feedId);
    return { ...article, feedName: feed?.name || '' };
  });

  // Apply smart rules (mark_read, mark_saved, skip, add_tag, notify)
  const { articles: filtered, notifications } = applyAllRules(enriched);

  // Show notifications for triggered notify rules
  if (notifications.length > 0) {
    window.dispatchEvent(new CustomEvent('frontpage:rule-notification', { detail: notifications }));
  }

  // 1. Semantic Search Mode
  if (query) {
    const searchRes = semanticSearch(filtered, query, {
      categories: state.categories,
      feeds: state.feeds,
    });

    state.currentSearchIntent = searchRes.intent;
    let searchArticles = searchRes.results;

    if (state.showSavedItems && !searchRes.intent.facets.saved) {
      searchArticles = searchArticles.filter((a) => a.isSaved);
    }
    if (state.activeFeedId && !searchRes.intent.facets.feed) {
      searchArticles = searchArticles.filter((a) => a.feedId === state.activeFeedId);
    }
    if (state.activeCategoryId !== 'all' && !searchRes.intent.facets.category) {
      searchArticles = searchArticles.filter((a) => {
        const feed = getFeedById(a.feedId);
        return feed?.categoryId === state.activeCategoryId;
      });
    }

    return searchArticles;
  }

  // 2. Normal View Mode (no search query)
  state.currentSearchIntent = null;

  return filtered
    .filter((article) => {
      const feed = getFeedById(article.feedId);

      if (state.showSavedItems) {
        return article.isSaved;
      }

      if (state.activeFeedId) {
        return article.feedId === state.activeFeedId;
      }

      if (state.activeCategoryId === 'all') {
        return true;
      }

      return feed?.categoryId === state.activeCategoryId;
    })
    .sort((firstArticle, secondArticle) => {
      const dateDifference = new Date(secondArticle.publishedAt) - new Date(firstArticle.publishedAt);

      return state.feedSortOrder === 'newest' ? dateDifference : -dateDifference;
    });
}

export function getUnreadCount(articlesToCount = state.articles) {
  return articlesToCount.filter((article) => !article.isRead).length;
}

export function setActiveView(viewName) {
  state.activeView = viewName;
}

export function setActiveCategory(categoryId) {
  state.activeCategoryId = categoryId;
  state.activeFeedId = null;
  state.showSavedItems = false;
}

export function setActiveFeed(feedId) {
  state.activeFeedId = feedId;
  state.activeCategoryId = 'all';
  state.showSavedItems = false;
}

export function setSavedItemsView() {
  state.activeCategoryId = 'all';
  state.activeFeedId = null;
  state.showSavedItems = true;
}

export function setFeedLayout(layout) {
  state.feedLayout = layout;
}

export function setSearchQuery(query) {
  state.searchQuery = query;
}

export function toggleFeedSortOrder() {
  state.feedSortOrder = state.feedSortOrder === 'newest' ? 'oldest' : 'newest';
}

export function markArticleAsRead(articleId) {
  const article = state.articles.find((item) => item.id === articleId);

  if (article && !article.isRead) {
    recordReadingActivity();
    article.isRead = true;
    persistLibrary();
    api.put(`/articles/${articleId}/read`, { isRead: true }).catch(() => {});
    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
  }
}

export function toggleArticleRead(articleId) {
  const article = state.articles.find((item) => item.id === articleId);

  if (article) {
    article.isRead = !article.isRead;
    if (article.isRead) recordReadingActivity();
    persistLibrary();
    api.put(`/articles/${articleId}/read`, { isRead: article.isRead }).catch(() => {});
    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
  }
}

export function toggleArticleSaved(articleId) {
  const article = state.articles.find((item) => item.id === articleId);

  if (article) {
    article.isSaved = !article.isSaved;
    persistLibrary();
    api.put(`/articles/${articleId}/save`, { isSaved: article.isSaved }).catch(() => {});
    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
  }
}

export function updateArticleAiSummary(articleId, aiData) {
  const article = state.articles.find((item) => item.id === articleId);

  if (article && aiData) {
    article.aiSummary = aiData.summary;
    article.aiTakeaways = aiData.takeaways || [];
    article.aiTags = aiData.tags || [];
    article.aiReadingTime = aiData.readingTime || article.aiReadingTime || 2;
    persistLibrary();
    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
  }
}

export function markVisibleArticlesAsRead() {
  getVisibleArticles().forEach((article) => {
    if (!article.isRead) {
      recordReadingActivity();
      article.isRead = true;
      api.put(`/articles/${article.id}/read`, { isRead: true }).catch(() => {});
    }
  });
  persistLibrary();
  window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
}

export function markAllArticlesAsRead() {
  state.articles.forEach((article) => {
    if (!article.isRead) {
      recordReadingActivity();
      article.isRead = true;
    }
  });
  persistLibrary();
  api.post('/articles/mark-all-read', {}).catch(() => {});
  window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
}

export function addFeed({ name, url, categoryId }) {
  const category = getCategoryById(categoryId) ?? categories[0];
  const baseId = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'feed';
  const id = `${baseId}-${Date.now().toString(36)}`;
  const initials = createInitials(name);

  state.feeds.push({
    id,
    name: name.trim(),
    url: url.trim(),
    categoryId: category.id,
    initials,
    color: category.color,
  });
  persistLibrary();

  return id;
}
