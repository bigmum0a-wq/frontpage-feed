/**
 * exportService.js — Client-Side Integrations & Exports (Read-it-Later, Obsidian, Notion, EPUB, PDF)
 */
import { showToast } from '../components/toast.js';

function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || d.innerText || '').trim();
}

function slugify(text) {
  return String(text || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'article';
}

/**
 * Formats an article into clean Markdown with YAML frontmatter
 */
export function formatArticleMarkdown(article, feed = null) {
  const tags = (Array.isArray(article.aiTags) ? article.aiTags : [])
    .map((t) => `"${t.replace(/^#/, '')}"`)
    .join(', ');

  const takeaways = Array.isArray(article.aiTakeaways) && article.aiTakeaways.length > 0
    ? article.aiTakeaways.map((t) => `- ${t}`).join('\n')
    : '- No key takeaways extracted.';

  const plainContent = stripHtml(article.content || article.excerpt || '');

  return `---
title: "${(article.title || '').replace(/"/g, '\\"')}"
source: "${article.url || ''}"
feed: "${feed?.name || article.feedName || ''}"
date: "${article.publishedAt || new Date().toISOString()}"
tags: [${tags}]
---

# ${article.title || 'Untitled'}

> 💡 **AI Summary:** ${article.aiSummary || article.excerpt || 'No summary available.'}

## 📌 Key Takeaways
${takeaways}

## 📖 Content
${plainContent}

---
*Exported from FrontPage on ${new Date().toLocaleDateString('en-US')}*
`;
}

/**
 * Downloads a raw string content as a local file
 */
export function triggerFileDownload(filename, content, mimeType = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Read-it-Later Services ──────────────────────────────────────────────────

export function exportToPocket(article) {
  if (!article.url) {
    showToast('This article has no source URL.', 'error');
    return;
  }
  const pocketUrl = `https://getpocket.com/save?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title || '')}`;
  window.open(pocketUrl, '_blank', 'noopener,noreferrer');
  showToast('Sending to Pocket...', 'success');
}

export function exportToObsidian(article, feed = null) {
  const md = formatArticleMarkdown(article, feed);
  const noteName = (article.title || 'Note FrontPage').slice(0, 60);

  // Try opening via obsidian:// URI
  const uri = `obsidian://new?name=${encodeURIComponent(noteName)}&content=${encodeURIComponent(md)}`;
  const link = document.createElement('a');
  link.href = uri;
  link.click();

  // Also offer immediate markdown download
  triggerFileDownload(`${slugify(noteName)}.md`, md);
  showToast('Article exported for Obsidian (note created + .md file downloaded)', 'success');
}

export async function exportToNotion(article, feed = null) {
  const md = formatArticleMarkdown(article, feed);
  try {
    await navigator.clipboard.writeText(md);
    showToast('Markdown note copied to clipboard! Ready to paste in Notion.', 'success');
  } catch {
    triggerFileDownload(`${slugify(article.title)}.md`, md);
    showToast('Markdown file downloaded for Notion.', 'info');
  }
}

export function exportToWallabag(article, wallabagInstanceUrl = '') {
  if (!article.url) {
    showToast('This article has no source URL.', 'error');
    return;
  }
  const base = wallabagInstanceUrl.trim() || 'https://app.wallabag.it';
  const url = `${base.replace(/\/+$/, '')}/bookmarklet?url=${encodeURIComponent(article.url)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('Sending to Wallabag...', 'success');
}

export function downloadArticleMarkdown(article, feed = null) {
  const md = formatArticleMarkdown(article, feed);
  const filename = `${slugify(article.title || 'article')}.md`;
  triggerFileDownload(filename, md);
  showToast(`File "${filename}" downloaded`, 'success');
}

// ─── Magazine & EPUB Exports ─────────────────────────────────────────────────

export async function exportDigestEpub(articles = [], title = 'FrontPage Digest') {
  if (!articles || articles.length === 0) {
    showToast('No articles available for EPUB export.', 'warning');
    return;
  }

  showToast('Generating EPUB e-book...', 'info');

  try {
    const res = await fetch('/api/export/epub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        author: 'FrontPage AI Digest',
        articles,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(title)}.epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast('EPUB e-book generated and downloaded successfully!', 'success');
  } catch (err) {
    console.error('[Export] EPUB export error:', err);
    showToast('Failed to generate EPUB.', 'error');
  }
}

export async function openMagazinePrintView(articles = [], title = 'FrontPage Magazine') {
  if (!articles || articles.length === 0) {
    showToast('No articles for magazine edition.', 'warning');
    return;
  }

  showToast('Preparing magazine edition...', 'info');

  try {
    const res = await fetch('/api/export/magazine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        articles,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      showToast('Please allow pop-ups to display the magazine.', 'warning');
    }
  } catch (err) {
    console.error('[Export] Magazine export error:', err);
    showToast('Failed to generate magazine.', 'error');
  }
}
