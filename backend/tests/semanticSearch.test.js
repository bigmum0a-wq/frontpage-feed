import test from 'node:test';
import assert from 'node:assert/strict';

const {
  parseSearchIntent,
  expandSemanticTokens,
  scoreArticle,
  semanticSearch,
} = await import('../../assets/js/services/semanticSearchService.js');

test('Semantic Search: parseSearchIntent extracts temporal, status, category and clean terms', () => {
  const categories = [
    { id: 'frontend', name: 'Frontend' },
    { id: 'design', name: 'Design' },
    { id: 'ai-ml', name: 'AI & ML' },
  ];
  const feeds = [
    { id: 'smashing-magazine', name: 'Smashing Magazine' },
  ];

  // 1. Natural language query with time, status, and keywords
  const q1 = 'articles sur la performance parus cette semaine non lus';
  const intent1 = parseSearchIntent(q1, categories, feeds);

  assert.equal(intent1.hasIntent, true);
  assert.equal(intent1.facets.time?.label, 'This week');
  assert.equal(intent1.facets.status?.isRead, false);
  assert.ok(intent1.tokens.includes('performance'));

  // 2. Query with category and saved filter
  const q2 = 'articles design favoris';
  const intent2 = parseSearchIntent(q2, categories, feeds);

  assert.equal(intent2.facets.saved?.isSaved, true);
  assert.equal(intent2.facets.category?.id, 'design');

  // 3. Query with AI summary requirement
  const q3 = 'new articles with AI summary';
  const intent3 = parseSearchIntent(q3, categories, feeds);

  assert.equal(intent3.facets.ai?.hasAiSummary, true);
});

test('Semantic Search: expandSemanticTokens discovers technical synonyms', () => {
  const tokens = ['performance', 'css'];
  const expanded = expandSemanticTokens(tokens);

  // Performance should expand to cache, latency, speed...
  assert.ok(expanded.includes('performance'));
  assert.ok(expanded.some((t) => ['speed', 'cache', 'latency', 'lcp', 'vitesse'].includes(t)));

  // CSS should expand to styles, flexbox, grid...
  assert.ok(expanded.some((t) => ['style', 'styles', 'flexbox', 'grid'].includes(t)));
});

test('Semantic Search: semanticSearch scores and ranks articles by relevance', () => {
  const categories = [
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' },
  ];

  const articles = [
    {
      id: 'art-1',
      title: 'Guide to Web Performance Optimization and Caching',
      excerpt: 'Learn how to speed up your website with browser cache.',
      aiSummary: 'Practical tips to reduce latency and improve CWV scores.',
      aiTags: ['#performance', '#cache'],
      publishedAt: new Date().toISOString(),
      isRead: false,
      isSaved: true,
      categoryId: 'frontend',
    },
    {
      id: 'art-2',
      title: 'Introduction to Python Flask',
      excerpt: 'Build your first REST API in Python.',
      publishedAt: new Date().toISOString(),
      isRead: true,
      isSaved: false,
      categoryId: 'backend',
    },
    {
      id: 'art-3',
      title: 'CSS Grid Layouts for Beginners',
      excerpt: 'Master modern CSS grid and responsive layout.',
      publishedAt: new Date().toISOString(),
      isRead: false,
      isSaved: false,
      categoryId: 'frontend',
    },
  ];

  // Search "performance" -> art-1 should be rank #1 with high score
  const res1 = semanticSearch(articles, 'performance', { categories });
  assert.equal(res1.results.length >= 1, true);
  assert.equal(res1.results[0].id, 'art-1');
  assert.ok(res1.results[0]._searchScore > 30);

  // Search "non lus" (unread) -> art-1 and art-3, art-2 filtered out
  const res2 = semanticSearch(articles, 'non lus', { categories });
  assert.equal(res2.results.length, 2);
  assert.ok(res2.results.every((a) => !a.isRead));

  // Search "favoris" (saved) -> art-1 only
  const res3 = semanticSearch(articles, 'favoris', { categories });
  assert.equal(res3.results.length, 1);
  assert.equal(res3.results[0].id, 'art-1');

  // Semantic synonym search: "vitesse" (speed) should match art-1 via expanded synonyms!
  const res4 = semanticSearch(articles, 'vitesse', { categories });
  assert.ok(res4.results.some((a) => a.id === 'art-1'));
});
