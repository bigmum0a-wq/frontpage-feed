// RSS 2.0, Atom 1.0, and RSS 1.0 / RDF Feed Parser
import { decodeHtmlEntities, normalizeDate } from '../utils/validator.js';

function extractCDataOrText(xmlSnippet, tagName) {
  if (!xmlSnippet) return '';
  // Match with CDATA or standard text
  const regex = new RegExp(`<${tagName}(?:[^>]*)>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tagName}>`, 'i');
  const match = xmlSnippet.match(regex);
  if (!match) return '';
  const content = match[1] !== undefined ? match[1] : match[2];
  return decodeHtmlEntities(content.trim());
}

function extractAttr(xmlSnippet, tagName, attrName) {
  if (!xmlSnippet) return '';
  const regex = new RegExp(`<${tagName}[^>]*?\\s${attrName}=["']([^"']+)["'][^>]*?>`, 'i');
  const match = xmlSnippet.match(regex);
  return match ? match[1].trim() : '';
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractFirstImage(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export function parseFeedXml(xmlContent) {
  if (typeof xmlContent !== 'string' || !xmlContent.trim()) {
    throw new Error('Contenu XML vide ou invalide');
  }

  const isAtom = /<feed[\s>]/i.test(xmlContent);
  const isRss = /<rss[\s>]/i.test(xmlContent) || /<rdf:RDF[\s>]/i.test(xmlContent);

  if (isAtom) {
    return parseAtomFeed(xmlContent);
  } else if (isRss) {
    return parseRssFeed(xmlContent);
  } else {
    // Attempt fallback parsing as RSS
    return parseRssFeed(xmlContent);
  }
}

function parseRssFeed(xml) {
  const channelMatch = xml.match(/<channel[\s\S]*?>([\s\S]*?)<\/channel>/i);
  const channelContent = channelMatch ? channelMatch[1] : xml;

  const title = extractCDataOrText(channelContent, 'title') || 'Sans titre';
  const description = extractCDataOrText(channelContent, 'description') || '';
  const siteUrl = extractCDataOrText(channelContent, 'link') || '';

  const items = [];
  const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const itemTitle = extractCDataOrText(itemXml, 'title') || 'Sans titre';
    const link = extractCDataOrText(itemXml, 'link') || extractAttr(itemXml, 'link', 'href') || '';
    const guid = extractCDataOrText(itemXml, 'guid') || link || itemTitle;
    const pubDate = extractCDataOrText(itemXml, 'pubDate') || extractCDataOrText(itemXml, 'dc:date');
    const descriptionText = extractCDataOrText(itemXml, 'description') || '';
    const encodedContent = extractCDataOrText(itemXml, 'content:encoded') || '';
    const author = extractCDataOrText(itemXml, 'author') || extractCDataOrText(itemXml, 'dc:creator') || '';

    // Extract image enclosure or media
    let imageUrl = extractAttr(itemXml, 'enclosure', 'url');
    if (!imageUrl) imageUrl = extractAttr(itemXml, 'media:content', 'url');
    if (!imageUrl) imageUrl = extractAttr(itemXml, 'media:thumbnail', 'url');
    if (!imageUrl) imageUrl = extractFirstImage(encodedContent || descriptionText);

    const fullContent = encodedContent || descriptionText;
    const excerpt = stripHtml(descriptionText || encodedContent).slice(0, 300);

    items.push({
      guid,
      title: itemTitle,
      url: link,
      excerpt,
      content: fullContent,
      author,
      imageUrl,
      publishedAt: normalizeDate(pubDate),
    });
  }

  return {
    format: 'rss2',
    title,
    description,
    siteUrl,
    items,
  };
}

function parseAtomFeed(xml) {
  const title = extractCDataOrText(xml, 'title') || 'Sans titre';
  const description = extractCDataOrText(xml, 'subtitle') || '';
  const siteUrl = extractAttr(xml, 'link', 'href') || '';

  const entries = [];
  const entryRegex = /<entry[\s\S]*?>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const entryTitle = extractCDataOrText(entryXml, 'title') || 'Sans titre';
    const link = extractAttr(entryXml, 'link', 'href') || extractCDataOrText(entryXml, 'link') || '';
    const id = extractCDataOrText(entryXml, 'id') || link || entryTitle;
    const published = extractCDataOrText(entryXml, 'published') || extractCDataOrText(entryXml, 'updated');
    const summary = extractCDataOrText(entryXml, 'summary') || '';
    const content = extractCDataOrText(entryXml, 'content') || summary;
    const author = extractCDataOrText(entryXml, 'name') || extractCDataOrText(entryXml, 'author') || '';

    let imageUrl = extractAttr(entryXml, 'media:content', 'url');
    if (!imageUrl) imageUrl = extractAttr(entryXml, 'media:thumbnail', 'url');
    if (!imageUrl) imageUrl = extractFirstImage(content || summary);

    const excerpt = stripHtml(summary || content).slice(0, 300);

    entries.push({
      guid: id,
      title: entryTitle,
      url: link,
      excerpt,
      content,
      author,
      imageUrl,
      publishedAt: normalizeDate(published),
    });
  }

  return {
    format: 'atom',
    title,
    description,
    siteUrl,
    items: entries,
  };
}
