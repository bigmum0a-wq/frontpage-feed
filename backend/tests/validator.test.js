import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidUrl, sanitizeString, decodeHtmlEntities, normalizeDate } from '../utils/validator.js';

test('Validator: isValidUrl', () => {
  assert.equal(isValidUrl('https://example.com/feed.xml'), true);
  assert.equal(isValidUrl('http://localhost:3000/rss'), true);
  assert.equal(isValidUrl('ftp://invalid-scheme.com'), false);
  assert.equal(isValidUrl('not-a-url'), false);
  assert.equal(isValidUrl(''), false);
  assert.equal(isValidUrl(null), false);
});

test('Validator: sanitizeString', () => {
  assert.equal(sanitizeString('  Hello World!  '), 'Hello World!');
  assert.equal(sanitizeString('Hello <script>alert(1)</script> World'), 'Hello World');
  assert.equal(sanitizeString('Very long text here', 9), 'Very long');
  assert.equal(sanitizeString(null), '');
});

test('Validator: decodeHtmlEntities', () => {
  assert.equal(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39;'), '& < > " \'');
  assert.equal(decodeHtmlEntities('Articles &amp; News'), 'Articles & News');
  assert.equal(decodeHtmlEntities(null), '');
});

test('Validator: normalizeDate', () => {
  const dateStr = 'Mon, 02 Sep 2024 12:00:00 GMT';
  const iso = normalizeDate(dateStr);
  assert.equal(iso.startsWith('2024-09-02'), true);

  // Fallback for invalid date string
  const invalidIso = normalizeDate('invalid-date-string');
  assert.equal(typeof invalidIso, 'string');
  assert.equal(isNaN(Date.parse(invalidIso)), false);
});
