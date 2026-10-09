import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeedXml } from '../services/rssParser.js';

test('RSS Parser: parse RSS 2.0 feed', () => {
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Smashing Magazine</title>
      <link>https://www.smashingmagazine.com</link>
      <description>For web designers and developers</description>
      <item>
        <title><![CDATA[Modern CSS Layouts]]></title>
        <link>https://www.smashingmagazine.com/modern-css</link>
        <guid isPermaLink="true">https://www.smashingmagazine.com/modern-css</guid>
        <pubDate>Mon, 02 Sep 2024 10:00:00 GMT</pubDate>
        <description>Discover modern CSS tricks and grid subgrids.</description>
        <content:encoded><![CDATA[<p>Full article content with an image <img src="https://example.com/cover.jpg" alt="Cover" /></p>]]></content:encoded>
        <dc:creator>Rachel Andrew</dc:creator>
      </item>
    </channel>
  </rss>`;

  const result = parseFeedXml(rssXml);
  assert.equal(result.format, 'rss2');
  assert.equal(result.title, 'Smashing Magazine');
  assert.equal(result.siteUrl, 'https://www.smashingmagazine.com');
  assert.equal(result.items.length, 1);

  const item = result.items[0];
  assert.equal(item.title, 'Modern CSS Layouts');
  assert.equal(item.url, 'https://www.smashingmagazine.com/modern-css');
  assert.equal(item.author, 'Rachel Andrew');
  assert.equal(item.imageUrl, 'https://example.com/cover.jpg');
  assert.equal(item.excerpt.includes('Discover modern CSS'), true);
});

test('RSS Parser: parse Atom 1.0 feed', () => {
  const atomXml = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title>GitHub Changelog</title>
    <link href="https://github.blog/changelog" rel="alternate" />
    <subtitle>Updates and releases from GitHub</subtitle>
    <entry>
      <title>New AI Features Launched</title>
      <link href="https://github.blog/changelog/2024-09-02-ai-features" rel="alternate" />
      <id>tag:github.blog,2024:changelog-123</id>
      <updated>2024-09-02T14:30:00Z</updated>
      <summary>Summary of new features</summary>
      <content type="html"><![CDATA[<p>Detailed updates on GitHub Copilot workspace.</p>]]></content>
      <author>
        <name>GitHub Team</name>
      </author>
    </entry>
  </feed>`;

  const result = parseFeedXml(atomXml);
  assert.equal(result.format, 'atom');
  assert.equal(result.title, 'GitHub Changelog');
  assert.equal(result.items.length, 1);

  const item = result.items[0];
  assert.equal(item.title, 'New AI Features Launched');
  assert.equal(item.url, 'https://github.blog/changelog/2024-09-02-ai-features');
  assert.equal(item.author, 'GitHub Team');
  assert.equal(item.content.includes('Detailed updates'), true);
});

test('RSS Parser: handles invalid or empty XML cleanly', () => {
  assert.throws(() => {
    parseFeedXml('');
  }, /Contenu XML vide ou invalide/);
});

test('RSS Parser: sanitizes malicious script tags and event handlers from feed HTML', () => {
  const maliciousRss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Hacker Feed</title>
      <link>https://evil.com</link>
      <item>
        <title>Exploit Demo</title>
        <link>https://evil.com/xss</link>
        <content:encoded><![CDATA[<p>Hello <script>alert(localStorage.getItem('token'))</script><img src="x" onerror="steal()" /><a href="javascript:alert(1)">Click me</a> Safe paragraph.</p>]]></content:encoded>
      </item>
    </channel>
  </rss>`;

  const result = parseFeedXml(maliciousRss);
  const content = result.items[0].content;

  assert.equal(content.includes('<script>'), false, 'Script tags must be stripped');
  assert.equal(content.includes('alert('), false, 'Script payload must be stripped');
  assert.equal(content.includes('onerror='), false, 'Inline event handlers must be stripped');
  assert.equal(content.includes('javascript:'), false, 'Javascript pseudo-protocol must be disarmed');
  assert.equal(content.includes('Safe paragraph.'), true, 'Legitimate content must be preserved');
});

