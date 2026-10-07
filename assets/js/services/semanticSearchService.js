/**
 * semanticSearchService.js — Advanced Natural Language & Semantic Search Engine
 *
 * Provides:
 * 1. Intent & facet parsing (time ranges, read/saved status, category, feed, AI summaries).
 * 2. Semantic concept expansion (bilingual FR/EN tech synonym graph).
 * 3. Multi-field weighted relevance scoring (title > tags > AI summary > excerpt > recency).
 * 4. 100% offline & instantaneous client-side execution.
 */

// ─── Semantic Synonym Graph ──────────────────────────────────────────────────
const SEMANTIC_CONCEPTS = {
  performance: [
    'vitesse', 'speed', 'latency', 'latence', 'optimisation', 'optimize', 'cache',
    'caching', 'cdn', 'lcp', 'cwv', 'web vitals', 'fast', 'rapide', 'bundle',
    'memory', 'cpu', 'profiling', 'edge', 'p99',
  ],
  ai: [
    'ia', 'intelligence artificielle', 'artificial intelligence', 'ml', 'machine learning',
    'llm', 'gpt', 'gemini', 'claude', 'rag', 'deep learning', 'neural', 'embeddings',
    'prompt', 'model', 'modele', 'transformers',
  ],
  css: [
    'style', 'styles', 'layout', 'design system', 'flexbox', 'grid', 'tailwind',
    'container queries', 'responsive', 'animation', 'typography', 'typographie',
    'cascade', 'selector', 'media queries',
  ],
  frontend: [
    'front-end', 'ui', 'interface', 'javascript', 'js', 'typescript', 'ts', 'react',
    'vue', 'angular', 'svelte', 'dom', 'browser', 'navigateur', 'web', 'pwa',
  ],
  backend: [
    'back-end', 'server', 'serveur', 'api', 'rest', 'graphql', 'database', 'bdd',
    'sql', 'sqlite', 'postgres', 'node', 'express', 'microservices', 'cloud',
  ],
  devops: [
    'docker', 'kubernetes', 'k8s', 'ci', 'cd', 'deploy', 'deploiement', 'pipeline',
    'infrastructure', 'infra', 'monitoring', 'observability', 'grafana', 'linux',
  ],
  security: [
    'securite', 'auth', 'authentication', 'authentification', 'token', 'jwt', 'oauth',
    'vulnerability', 'vulnerabilite', 'cve', 'xss', 'csrf', 'encryption', 'chiffrement',
  ],
  design: [
    'figma', 'ux', 'ui', 'user experience', 'accessibility', 'accessibilite', 'a11y',
    'color', 'couleur', 'palette', 'wireframe', 'prototype', 'tokens',
  ],
  architecture: [
    'pattern', 'clean architecture', 'refactoring', 'system design', 'microservices',
    'monolith', 'solid', 'cqrs', 'event-driven',
  ],
};

// ─── Stopwords (French & English) ─────────────────────────────────────────────
const STOPWORDS = new Set([
  'a', 'about', 'all', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
  'what', 'when', 'where', 'who', 'will', 'with', 'the', 'show', 'find', 'get',
  'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'elle', 'en', 'et',
  'eux', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'lui', 'mais', 'me', 'meme',
  'mes', 'moi', 'mon', 'ne', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas',
  'pour', 'qu', 'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te', 'tes',
  'toi', 'ton', 'tout', 'un', 'une', 'vos', 'votre', 'vous', 'articles', 'article',
  'parus', 'paru', 'publie', 'publies', 'donne', 'cherche', 'trouve', 'parlant',
]);

// ─── Intent Parser ────────────────────────────────────────────────────────────

/**
 * Parses natural language query to extract facets and cleaned keywords.
 */
export function parseSearchIntent(rawQuery, categories = [], feeds = []) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      rawQuery: '',
      cleanQuery: '',
      tokens: [],
      expandedTokens: [],
      facets: {},
      hasIntent: false,
    };
  }

  let text = rawQuery.trim().toLowerCase();
  const facets = {};

  // 1. Time facets
  const now = new Date();
  if (/\b(aujourd'?hui|today)\b/i.test(text)) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    facets.time = { label: 'Today', after: startOfToday.toISOString() };
    text = text.replace(/\b(aujourd'?hui|today)\b/gi, '');
  } else if (/\b(cette\s+semaine|this\s+week|derniers?\s+7\s+jours?|past\s+7\s+days)\b/i.test(text)) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    facets.time = { label: 'This week', after: weekAgo.toISOString() };
    text = text.replace(/\b(cette\s+semaine|this\s+week|derniers?\s+7\s+jours?|past\s+7\s+days)\b/gi, '');
  } else if (/\b(ce\s+mois(-ci)?|this\s+month|derniers?\s+30\s+jours?|past\s+30\s+days)\b/i.test(text)) {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    facets.time = { label: 'This month', after: monthAgo.toISOString() };
    text = text.replace(/\b(ce\s+mois(-ci)?|this\s+month|derniers?\s+30\s+jours?|past\s+30\s+days)\b/gi, '');
  }

  // 2. Read / Unread status facets
  if (/\b(non\s*lus?|un-?read|à\s+lire|pas\s+lus?)\b/i.test(text)) {
    facets.status = { isRead: false, label: 'Unread' };
    text = text.replace(/\b(non\s*lus?|un-?read|à\s+lire|pas\s+lus?)\b/gi, '');
  } else if (/\b(déjà\s+lus?|lus|read|archives?)\b/i.test(text)) {
    facets.status = { isRead: true, label: 'Already read' };
    text = text.replace(/\b(déjà\s+lus?|lus|read|archives?)\b/gi, '');
  }

  // 3. Saved / Starred status facets
  if (/\b(favoris?|sauvegardés?|saved|starred|bookmarks?)\b/i.test(text)) {
    facets.saved = { isSaved: true, label: 'Starred' };
    text = text.replace(/\b(favoris?|sauvegardés?|saved|starred|bookmarks?)\b/gi, '');
  }

  // 4. AI summary facet
  if (/\b(avec\s+résumé(\s+ia)?|synthèse(\s+ia)?|ai\s+summary|résumés?)\b/i.test(text)) {
    facets.ai = { hasAiSummary: true, label: 'With AI summary' };
    text = text.replace(/\b(avec\s+résumé(\s+ia)?|synthèse(\s+ia)?|ai\s+summary|résumés?)\b/gi, '');
  }

  // 5. Category matching
  for (const cat of categories) {
    const catName = cat.name.toLowerCase();
    const catId = cat.id.toLowerCase();
    const regex = new RegExp(`\\b(${catName}|${catId})\\b`, 'i');
    if (regex.test(text)) {
      facets.category = { id: cat.id, name: cat.name, label: cat.name };
      // Remove match to keep core query terms clean
      text = text.replace(regex, '');
      break;
    }
  }

  // 6. Feed matching
  for (const feed of feeds) {
    const feedName = feed.name.toLowerCase();
    if (feedName.length > 3) {
      const regex = new RegExp(`\\b${feedName}\\b`, 'i');
      if (regex.test(text)) {
        facets.feed = { id: feed.id, name: feed.name, label: feed.name };
        text = text.replace(regex, '');
        break;
      }
    }
  }

  // 7. Tokenize and clean core search terms
  const rawTokens = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents for matching
    .replace(/[^\w\s#]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 2 && !STOPWORDS.has(tok));

  // 8. Semantic expansion
  const expandedTokens = expandSemanticTokens(rawTokens);

  const cleanQuery = rawTokens.join(' ');
  const hasIntent = Object.keys(facets).length > 0 || expandedTokens.length > 0;

  return {
    rawQuery,
    cleanQuery,
    tokens: rawTokens,
    expandedTokens,
    facets,
    hasIntent,
  };
}

/**
 * Expands tokens with synonyms from the semantic knowledge graph.
 */
export function expandSemanticTokens(tokens) {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const normalized = token.toLowerCase();

    // Check each concept bucket
    for (const [conceptKey, terms] of Object.entries(SEMANTIC_CONCEPTS)) {
      if (conceptKey === normalized || terms.includes(normalized)) {
        expanded.add(conceptKey);
        // Add top 4 associated terms
        terms.slice(0, 4).forEach((t) => expanded.add(t));
      }
    }
  }

  return Array.from(expanded);
}

// ─── Relevance Scoring Engine ─────────────────────────────────────────────────

/**
 * Computes a relevance score (0..100+) for an article against a parsed intent.
 */
export function scoreArticle(article, parsedIntent, feed = null, category = null) {
  const { tokens, expandedTokens, cleanQuery, facets } = parsedIntent;

  // ── 1. Facet Filtering (hard constraints) ──
  if (facets.time?.after) {
    if (!article.publishedAt || new Date(article.publishedAt) < new Date(facets.time.after)) {
      return 0; // Filtered out by date
    }
  }

  if (facets.status) {
    if (article.isRead !== facets.status.isRead) {
      return 0; // Filtered out by read/unread status
    }
  }

  if (facets.saved) {
    if (!article.isSaved) {
      return 0; // Filtered out by saved status
    }
  }

  if (facets.ai) {
    if (!article.aiSummary) {
      return 0; // Filtered out by lack of AI summary
    }
  }

  if (facets.category) {
    const catId = category?.id || article.categoryId || feed?.categoryId;
    if (catId !== facets.category.id) {
      return 0; // Filtered out by category
    }
  }

  if (facets.feed) {
    if (article.feedId !== facets.feed.id) {
      return 0; // Filtered out by feed
    }
  }

  // If there are no search terms left after facets, base score is 50 (matched all facets)
  if (tokens.length === 0) {
    return 50;
  }

  // ── 2. Content Preparation ──
  const title = (article.title || '').toLowerCase();
  const excerpt = (article.excerpt || '').toLowerCase();
  const summary = (article.aiSummary || '').toLowerCase();
  const tags = (Array.isArray(article.aiTags) ? article.aiTags.join(' ') : (article.aiTags || '')).toLowerCase();
  const feedName = (feed?.name || article.feedName || '').toLowerCase();

  let score = 0;

  // Exact phrase match in title (massive boost)
  if (cleanQuery && title.includes(cleanQuery)) {
    score += 40;
  } else if (cleanQuery && (excerpt.includes(cleanQuery) || summary.includes(cleanQuery))) {
    score += 20;
  }

  // Token matches
  for (const token of tokens) {
    const t = token.toLowerCase();

    // Title match (weight 15)
    if (title.includes(t)) {
      score += 15;
      if (title.startsWith(t)) score += 5; // prefix bonus
    }

    // AI Tags match (weight 12)
    if (tags.includes(t)) {
      score += 12;
    }

    // AI Summary match (weight 8)
    if (summary.includes(t)) {
      score += 8;
    }

    // Excerpt match (weight 5)
    if (excerpt.includes(t)) {
      score += 5;
    }

    // Feed / Category match (weight 4)
    if (feedName.includes(t)) {
      score += 4;
    }
  }

  // Semantic expanded tokens matches (lower weight, discovers related content)
  for (const expToken of expandedTokens) {
    if (tokens.includes(expToken)) continue; // Already scored
    const t = expToken.toLowerCase();

    if (title.includes(t)) score += 6;
    else if (tags.includes(t)) score += 5;
    else if (summary.includes(t)) score += 4;
    else if (excerpt.includes(t)) score += 2;
  }

  // Recency bonus: recent articles (within 14 days) get a slight boost (up to 5 points)
  if (article.publishedAt) {
    const ageDays = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= 0 && ageDays <= 14) {
      score += Math.max(1, Math.round(5 - (ageDays / 3)));
    }
  }

  return score;
}

// ─── Main Semantic Search Function ───────────────────────────────────────────

/**
 * Searches and ranks articles using natural language intent parsing and semantic scoring.
 *
 * @param {Array} articles - List of article objects
 * @param {string} rawQuery - Natural language query
 * @param {Object} options - { categories, feeds, minScore = 1 }
 * @returns {{ results: Array, intent: Object, totalMatches: number }}
 */
export function semanticSearch(articles = [], rawQuery = '', options = {}) {
  const { categories = [], feeds = [], minScore = 1 } = options;

  if (!rawQuery || !rawQuery.trim()) {
    return {
      results: articles,
      intent: { hasIntent: false, facets: {}, tokens: [] },
      totalMatches: articles.length,
    };
  }

  const intent = parseSearchIntent(rawQuery, categories, feeds);

  // Score each article
  const scored = [];
  for (const article of articles) {
    const feed = feeds.find((f) => f.id === article.feedId) || null;
    const category = categories.find((c) => c.id === feed?.categoryId) || null;

    const score = scoreArticle(article, intent, feed, category);

    if (score >= minScore) {
      scored.push({
        ...article,
        _searchScore: score,
      });
    }
  }

  // Sort descending by score, then by date
  scored.sort((a, b) => {
    if (b._searchScore !== a._searchScore) {
      return b._searchScore - a._searchScore;
    }
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });

  return {
    results: scored,
    intent,
    totalMatches: scored.length,
  };
}
