import test from 'node:test';
import assert from 'node:assert/strict';

const { searchWebFeeds } = await import('../services/discoverService.js');

test('Discover Service: fallback to curated feeds when query is empty or offline', async () => {
  const emptyResults = await searchWebFeeds('', 5);
  assert.ok(Array.isArray(emptyResults));
  assert.ok(emptyResults.length > 0);
  assert.ok(emptyResults[0].title);
  assert.ok(emptyResults[0].feedUrl);
});

test('Discover Service: searchWebFeeds finds relevant feeds for tech topics', async () => {
  const results = await searchWebFeeds('Frontend', 5);
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  assert.ok(results[0].title);
  assert.ok(results[0].feedUrl.startsWith('http'));
});
