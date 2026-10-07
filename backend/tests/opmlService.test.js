import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOpml, parseOpml } from '../services/opmlService.js';

test('OPML Service: generate OPML from categories and feeds', () => {
  const categories = [
    { id: 'tech', name: 'Technologie' }
  ];
  const feeds = [
    {
      title: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      site_url: 'https://news.ycombinator.com',
      category_id: 'tech'
    }
  ];

  const xml = generateOpml(categories, feeds);
  assert.equal(xml.includes('<opml version="2.0">'), true);
  assert.equal(xml.includes('text="Technologie"'), true);
  assert.equal(xml.includes('xmlUrl="https://news.ycombinator.com/rss"'), true);
  assert.equal(xml.includes('htmlUrl="https://news.ycombinator.com"'), true);
});

test('OPML Service: parse OPML XML content', () => {
  const opmlXml = `<?xml version="1.0" encoding="UTF-8"?>
  <opml version="2.0">
    <head><title>My Feeds</title></head>
    <body>
      <outline text="Dev" title="Dev">
        <outline text="CSS Tricks" title="CSS Tricks" type="rss" xmlUrl="https://css-tricks.com/feed/" htmlUrl="https://css-tricks.com" />
      </outline>
      <outline text="Smashing Magazine" type="rss" xmlUrl="https://smashingmagazine.com/feed/" htmlUrl="https://smashingmagazine.com" />
    </body>
  </opml>`;

  const parsed = parseOpml(opmlXml);
  assert.equal(parsed.totalParsed, 2);
  assert.equal(parsed.feeds.length, 2);

  const feed1 = parsed.feeds.find(f => f.xmlUrl === 'https://css-tricks.com/feed/');
  assert.equal(feed1.title, 'CSS Tricks');
  assert.equal(feed1.category, 'Dev');

  const feed2 = parsed.feeds.find(f => f.xmlUrl === 'https://smashingmagazine.com/feed/');
  assert.equal(feed2.title, 'Smashing Magazine');
  assert.equal(feed2.category, 'General');
});
