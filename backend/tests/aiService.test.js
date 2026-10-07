import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHeuristicSummary, generateDailyDigest } from '../services/aiService.js';
import { ArticleModel } from '../models/articleModel.js';
import { getDatabase } from '../../config/database.js';

test('AI Service: extractHeuristicSummary extracts TL;DR, takeaways and hashtags', () => {
  const article = {
    title: 'Optimizing Modern Web Performance with CSS Subgrid and Container Queries',
    excerpt: 'Web performance is evolving with modern CSS layout capabilities that reduce JavaScript dependencies.',
    content: `
      <p>Modern web development has undergone a major shift with modern CSS features. CSS Subgrid allows nested grids to participate in parent grid sizing without extra wrapper elements.</p>
      <p>Furthermore, Container Queries enable responsive component architectures based on container width rather than viewport width. This reduces complex JavaScript resize listeners and boosts rendering performance significantly.</p>
      <p>In addition, browsers now optimize rendering trees much faster when using content-visibility and containment properties. Developers should leverage these native CSS features to create faster, smoother web experiences.</p>
    `,
  };

  const result = extractHeuristicSummary(article);
  assert.ok(result.summary);
  assert.equal(typeof result.summary, 'string');
  assert.ok(Array.isArray(result.takeaways));
  assert.equal(result.takeaways.length >= 1, true);
  assert.ok(Array.isArray(result.tags));
  assert.equal(result.tags.length >= 2, true);
  assert.equal(result.tags.every(t => t.startsWith('#')), true);
  assert.equal(typeof result.readingTime, 'number');
  assert.equal(result.readingTime >= 1, true);
});

test('AI Service: generateDailyDigest generates synthesized multi-article briefing', async () => {
  const sampleArticles = [
    {
      title: 'Vite 6.0 Released with Environment API',
      feedName: 'Vite Blog',
      excerpt: 'Vite 6 introduces a new Environment API to support multi-environment setups like SSR and edge runtimes.',
    },
    {
      title: 'State of CSS 2026 Survey Results',
      feedName: 'CSS Tricks',
      excerpt: 'The State of CSS 2026 highlights massive adoption of CSS nesting, subgrid, and scroll-driven animations.',
    },
  ];

  const digest = await generateDailyDigest(sampleArticles);
  assert.ok(digest.briefing);
  assert.equal(typeof digest.briefing, 'string');
  assert.ok(Array.isArray(digest.topThemes));
  assert.ok(digest.date);
});

test('AI Database Persistence: saveAiSummary and getAiSummary in SQLite', async () => {
  const db = await getDatabase();
  assert.ok(db);

  const articles = await ArticleModel.getArticles('guest-user-001', { limit: 1 });
  if (articles.length > 0) {
    const targetArticle = articles[0];
    const aiData = {
      summary: 'Test TLDR summary generated for unit testing.',
      takeaways: ['Takeaway item 1', 'Takeaway item 2', 'Takeaway item 3'],
      tags: ['#Performance', '#Architecture', '#Testing'],
      readingTime: 4,
    };

    await ArticleModel.saveAiSummary(targetArticle.id, aiData);

    const retrieved = await ArticleModel.getAiSummary(targetArticle.id);
    assert.ok(retrieved);
    assert.equal(retrieved.summary, aiData.summary);
    assert.deepEqual(retrieved.takeaways, aiData.takeaways);
    assert.deepEqual(retrieved.tags, aiData.tags);
    assert.equal(retrieved.readingTime, 4);
  }
});
