/**
 * searchService.js — Search service entry point with semantic capabilities
 */
import {
  parseSearchIntent,
  scoreArticle,
  semanticSearch,
  expandSemanticTokens,
} from './semanticSearchService.js';

export {
  parseSearchIntent,
  scoreArticle,
  semanticSearch,
  expandSemanticTokens,
};

export function normalizeSearchQuery(query) {
  return String(query ?? '').trim().toLowerCase();
}

/**
 * Checks if an article matches a query. Uses semantic scoring under the hood.
 */
export function articleMatchesQuery(article, feed, query, category = null) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;

  const intent = parseSearchIntent(normalizedQuery);
  const score = scoreArticle(article, intent, feed, category);

  return score > 0;
}
