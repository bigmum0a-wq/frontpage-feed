// OPML Import and Export Service (OPML 2.0)
import { decodeHtmlEntities } from '../utils/validator.js';

export function parseOpml(xmlContent) {
  if (typeof xmlContent !== 'string' || !xmlContent.trim()) {
    throw new Error('Contenu OPML vide');
  }

  const feeds = [];
  const categoryStack = ['General'];

  // Tokenize outline opening, self-closing, and closing tags
  const tagRegex = /<(\/)?outline([^>]*?)(\/)?>/gi;
  let match;

  while ((match = tagRegex.exec(xmlContent)) !== null) {
    const isClosing = Boolean(match[1]);
    const attrString = match[2];
    const isSelfClosing = Boolean(match[3]) || (attrString && attrString.trim().endsWith('/'));

    if (isClosing) {
      if (categoryStack.length > 1) {
        categoryStack.pop();
      }
      continue;
    }

    const getAttr = (name) => {
      const reg = new RegExp(`(?:^|\\s)${name}=["']([^"']+)["']`, 'i');
      const m = attrString.match(reg);
      return m ? decodeHtmlEntities(m[1].trim()) : '';
    };

    const xmlUrl = getAttr('xmlUrl') || getAttr('xmlurl');
    const title = getAttr('title') || getAttr('text') || 'Flux sans titre';
    const htmlUrl = getAttr('htmlUrl') || getAttr('htmlurl') || '';
    const type = getAttr('type');

    if (xmlUrl) {
      feeds.push({
        title,
        xmlUrl,
        htmlUrl,
        category: categoryStack[categoryStack.length - 1] || 'General',
        type: type || 'rss',
      });
    } else if (!isSelfClosing) {
      const categoryName = getAttr('text') || getAttr('title') || 'Dossier';
      categoryStack.push(categoryName);
    }
  }

  // Deduplicate by xmlUrl
  const seenUrls = new Set();
  const uniqueFeeds = [];
  let duplicatesCount = 0;

  for (const feed of feeds) {
    if (seenUrls.has(feed.xmlUrl)) {
      duplicatesCount += 1;
    } else {
      seenUrls.add(feed.xmlUrl);
      uniqueFeeds.push(feed);
    }
  }

  return {
    totalParsed: feeds.length,
    uniqueCount: uniqueFeeds.length,
    duplicatesCount,
    feeds: uniqueFeeds,
  };
}

export function generateOpml(categories = [], feeds = []) {
  const categoryMap = new Map();

  categories.forEach((cat) => {
    categoryMap.set(cat.id, { name: cat.name, feeds: [] });
  });

  feeds.forEach((feed) => {
    const catId = feed.categoryId || feed.category_id;
    const cat = categoryMap.get(catId);
    if (cat) {
      cat.feeds.push(feed);
    } else {
      if (!categoryMap.has('uncategorized')) {
        categoryMap.set('uncategorized', { name: 'Uncategorized', feeds: [] });
      }
      categoryMap.get('uncategorized').feeds.push(feed);
    }
  });

  let outlinesXml = '';

  categoryMap.forEach((category) => {
    if (category.feeds.length > 0) {
      outlinesXml += `    <outline text="${escapeXml(category.name)}" title="${escapeXml(category.name)}">\n`;
      category.feeds.forEach((feed) => {
        const siteUrl = feed.siteUrl || feed.site_url || '';
        outlinesXml += `      <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(siteUrl)}"/>\n`;
      });
      outlinesXml += `    </outline>\n`;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>FrontPage RSS Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <docs>http://opml.org/spec2.opml</docs>
  </head>
  <body>
${outlinesXml}  </body>
</opml>`;
}

function escapeXml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
