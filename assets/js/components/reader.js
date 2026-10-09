import {
  getCategoryById,
  getFeedById,
  markArticleAsRead,
  toggleArticleSaved,
  toggleArticleRead,
  updateArticleAiSummary,
} from '../state.js';
import { openAudioPlayer } from './audioPlayer.js';
import { showToast } from './toast.js';
import { api } from '../services/apiService.js';
import { getPreferences } from '../services/preferences.js';
import {
  exportToPocket,
  exportToObsidian,
  exportToNotion,
  exportToWallabag,
  downloadArticleMarkdown,
} from '../services/exportService.js';
import { sanitizeHtml } from '../utils/sanitize.js';

function getReaderDialog() {
  let dialog = document.querySelector('#article-reader');

  if (dialog) {
    return dialog;
  }

  dialog = document.createElement('dialog');
  dialog.id = 'article-reader';
  dialog.className = 'article-reader';
  document.body.append(dialog);

  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      dialog.close();
    }
  });

  return dialog;
}

function formatArticleDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function renderAiSummaryBlock(article, container) {
  container.innerHTML = '';

  if (article.aiSummary) {
    const card = document.createElement('div');
    card.className = 'reader-ai-card';

    const header = document.createElement('div');
    header.className = 'reader-ai-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'reader-ai-title-group';
    titleGroup.innerHTML = `
      <span class="reader-ai-icon">✨</span>
      <strong>AI Summary &amp; Key Takeaways</strong>
      <span class="reader-ai-time">⏱ ${article.aiReadingTime || 2} min read</span>
    `;

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'reader-ai-refresh-btn';
    refreshBtn.title = 'Regenerate summary';
    refreshBtn.innerHTML = '🔄 <span>Regenerate</span>';
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('spinning');
      try {
        const res = await api.summarizeArticle(article.id, true);
        if (res?.data) {
          updateArticleAiSummary(article.id, res.data);
          article.aiSummary = res.data.summary;
          article.aiTakeaways = res.data.takeaways;
          article.aiTags = res.data.tags;
          article.aiReadingTime = res.data.readingTime;
          renderAiSummaryBlock(article, container);
          showToast('AI summary refreshed', 'success');
        }
      } catch (err) {
        showToast('Error refreshing summary', 'error');
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('spinning');
      }
    });

    header.append(titleGroup, refreshBtn);

    // TLDR
    const tldr = document.createElement('div');
    tldr.className = 'reader-ai-tldr';
    tldr.innerHTML = `<span class="tldr-badge">TL;DR</span><p>${article.aiSummary}</p>`;

    // Takeaways
    let takeawaysList = null;
    if (article.aiTakeaways && article.aiTakeaways.length > 0) {
      takeawaysList = document.createElement('ul');
      takeawaysList.className = 'reader-ai-takeaways';
      article.aiTakeaways.forEach((point) => {
        const li = document.createElement('li');
        li.textContent = point;
        takeawaysList.append(li);
      });
    }

    // Tags
    let tagsContainer = null;
    if (article.aiTags && article.aiTags.length > 0) {
      tagsContainer = document.createElement('div');
      tagsContainer.className = 'reader-ai-tags';
      article.aiTags.forEach((tag) => {
        const pill = document.createElement('span');
        pill.className = 'reader-tag-pill';
        pill.textContent = tag.startsWith('#') ? tag : `#${tag}`;
        tagsContainer.append(pill);
      });
    }

    card.append(header, tldr);
    if (takeawaysList) card.append(takeawaysList);
    if (tagsContainer) card.append(tagsContainer);
    container.append(card);
  } else {
    // No AI summary yet: keep container empty (button is now in the persistent bottom toolbar)
    container.innerHTML = '';
  }
}

export function openArticleReader(article) {
  // 1. Mark as read
  markArticleAsRead(article.id);

  const feed = getFeedById(article.feedId);
  const category = feed && getCategoryById(feed.categoryId);
  const dialog = getReaderDialog();
  const prefs = getPreferences();

  // Apply reader typography preferences
  const fontFamilies = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif',
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
  };

  const fontSizes = {
    small: '0.925rem',
    medium: '1.05rem',
    large: '1.2rem',
  };

  const lineHeights = {
    compact: '1.5',
    normal: '1.75',
    relaxed: '2.0',
  };

  dialog.style.setProperty('--reader-font-family', fontFamilies[prefs.readingFont] || fontFamilies.sans);
  dialog.style.setProperty('--reader-font-size', fontSizes[prefs.fontSize] || fontSizes.medium);
  dialog.style.setProperty('--reader-line-height', lineHeights[prefs.lineHeight] || lineHeights.normal);

  // Build Reader DOM
  const wrapper = document.createElement('div');
  wrapper.className = 'reader-wrapper';

  // Navigation / Header Bar
  const topBar = document.createElement('div');
  topBar.className = 'reader-topbar';

  const metaGroup = document.createElement('div');
  metaGroup.className = 'reader-topbar-meta';

  const feedBadge = document.createElement('span');
  feedBadge.className = 'reader-feed-badge';
  feedBadge.textContent = feed?.initials || (feed?.name ? feed.name.slice(0, 2).toUpperCase() : 'FP');
  feedBadge.style.backgroundColor = feed?.color || '#2563eb';

  const feedName = document.createElement('span');
  feedName.className = 'reader-feed-name';
  feedName.textContent = feed?.name || 'Unknown source';

  const dateSpan = document.createElement('span');
  dateSpan.className = 'reader-date';
  dateSpan.textContent = `· ${formatArticleDate(article.publishedAt)}`;

  const categoryLabel = document.createElement('span');
  categoryLabel.className = 'feed-item-category';
  categoryLabel.textContent = category?.name ?? 'General';
  categoryLabel.style.setProperty('--category-color', category?.color ?? 'var(--color-accent)');
  categoryLabel.style.setProperty('--category-background', category?.background ?? 'var(--color-accent-subtle)');

  metaGroup.append(feedBadge, feedName, dateSpan, categoryLabel);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'reader-close';
  closeButton.setAttribute('aria-label', 'Close reader');
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => dialog.close());

  topBar.append(metaGroup, closeButton);

  // Article Content
  const articleContent = document.createElement('article');
  articleContent.className = 'reader-content';

  const title = document.createElement('h1');
  title.className = 'reader-title';
  title.textContent = article.title;

  let authorSpan = null;
  if (article.author) {
    authorSpan = document.createElement('p');
    authorSpan.className = 'reader-author';
    authorSpan.textContent = `By ${article.author}`;
  }

  // Cover Image
  let coverImage = null;
  if (article.imageUrl) {
    coverImage = document.createElement('img');
    coverImage.className = 'reader-cover-image';
    coverImage.src = article.imageUrl;
    coverImage.alt = article.title;
    coverImage.loading = 'lazy';
    coverImage.onerror = () => coverImage.remove();
  }

  // AI Summary Container
  const aiContainer = document.createElement('div');
  aiContainer.className = 'reader-ai-wrapper';
  renderAiSummaryBlock(article, aiContainer);

  // Body HTML (Sanitized against XSS)
  const bodyText = document.createElement('div');
  bodyText.className = 'reader-body';
  if (article.content && article.content.trim()) {
    bodyText.innerHTML = sanitizeHtml(article.content);
  } else {
    bodyText.innerHTML = `<p class="reader-excerpt-lead">${article.excerpt || 'No text content available.'}</p>`;
  }

  // Toolbar Actions Footer
  const toolbar = document.createElement('div');
  toolbar.className = 'reader-toolbar';

  const listenBtn = document.createElement('button');
  listenBtn.type = 'button';
  listenBtn.className = 'reader-action-btn';
  listenBtn.innerHTML = '🎧 <span>Listen</span>';
  listenBtn.addEventListener('click', () => {
    openAudioPlayer({ title: article.title, article });
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = `reader-action-btn ${article.isSaved ? 'is-active' : ''}`;
  saveBtn.innerHTML = `${article.isSaved ? '★' : '☆'} <span>${article.isSaved ? 'Bookmarked' : 'Bookmark'}</span>`;
  saveBtn.addEventListener('click', () => {
    toggleArticleSaved(article.id);
    article.isSaved = !article.isSaved;
    saveBtn.className = `reader-action-btn ${article.isSaved ? 'is-active' : ''}`;
    saveBtn.innerHTML = `${article.isSaved ? '★' : '☆'} <span>${article.isSaved ? 'Bookmarked' : 'Bookmark'}</span>`;
    showToast(article.isSaved ? 'Added to bookmarks' : 'Removed from bookmarks', 'info');
  });

  // Read-it-Later & Export Dropdown Menu
  const exportWrapper = document.createElement('div');
  exportWrapper.className = 'reader-export-wrapper';
  exportWrapper.innerHTML = `
    <button type="button" class="reader-action-btn reader-export-btn" aria-haspopup="true" aria-expanded="false" title="Export or read later">
      📤 <span>Export ▾</span>
    </button>
    <div class="reader-export-menu" hidden>
      <div class="reader-export-header">Read-it-Later &amp; Notes</div>
      <button type="button" class="reader-export-item" data-export="pocket">
        <span class="export-icon">🟣</span> Pocket
      </button>
      <button type="button" class="reader-export-item" data-export="obsidian">
        <span class="export-icon">📜</span> Obsidian (.md)
      </button>
      <button type="button" class="reader-export-item" data-export="notion">
        <span class="export-icon">📓</span> Copy for Notion
      </button>
      <button type="button" class="reader-export-item" data-export="wallabag">
        <span class="export-icon">🦔</span> Wallabag
      </button>
      <button type="button" class="reader-export-item" data-export="markdown">
        <span class="export-icon">📥</span> Download Markdown
      </button>
    </div>
  `;

  const exportTrigger = exportWrapper.querySelector('.reader-export-btn');
  const exportMenu = exportWrapper.querySelector('.reader-export-menu');

  exportTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = exportMenu.hidden;
    exportMenu.hidden = !isHidden;
    exportTrigger.setAttribute('aria-expanded', String(isHidden));
  });

  exportMenu.querySelectorAll('.reader-export-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.hidden = true;
      exportTrigger.setAttribute('aria-expanded', 'false');
      const action = item.dataset.export;
      if (action === 'pocket') exportToPocket(article);
      else if (action === 'obsidian') exportToObsidian(article, feed);
      else if (action === 'notion') exportToNotion(article, feed);
      else if (action === 'wallabag') exportToWallabag(article);
      else if (action === 'markdown') downloadArticleMarkdown(article, feed);
    });
  });

  dialog.addEventListener('click', () => {
    if (exportMenu && !exportMenu.hidden) {
      exportMenu.hidden = true;
      exportTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  // AI Summarize Action Button (Always available in the toolbar)
  const summarizeBtn = document.createElement('button');
  summarizeBtn.type = 'button';
  summarizeBtn.className = 'reader-action-btn reader-action-ai';
  summarizeBtn.innerHTML = `✨ <span>${article.aiSummary ? 'Summary' : 'Summarize'}</span>`;
  summarizeBtn.title = article.aiSummary ? 'View / Refresh AI summary' : 'Generate AI summary & key takeaways';
  if (article.aiSummary) {
    summarizeBtn.classList.add('is-active');
  }

  summarizeBtn.addEventListener('click', async () => {
    // If summary already exists, scroll directly to it
    if (article.aiSummary) {
      aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    summarizeBtn.disabled = true;
    summarizeBtn.classList.add('is-loading');
    summarizeBtn.innerHTML = `<span class="loading-spinner"></span> <span>Summarizing...</span>`;

    try {
      const res = await api.summarizeArticle(article.id);
      if (res?.data) {
        updateArticleAiSummary(article.id, res.data);
        article.aiSummary = res.data.summary;
        article.aiTakeaways = res.data.takeaways;
        article.aiTags = res.data.tags;
        article.aiReadingTime = res.data.readingTime;
        renderAiSummaryBlock(article, aiContainer);
        summarizeBtn.classList.add('is-active');
        summarizeBtn.innerHTML = `✨ <span>Summary</span>`;
        summarizeBtn.title = 'View AI summary';
        showToast('AI summary generated successfully!', 'success');
        aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      showToast('Unable to generate AI summary', 'error');
      summarizeBtn.innerHTML = `✨ <span>Retry summary</span>`;
    } finally {
      summarizeBtn.disabled = false;
      summarizeBtn.classList.remove('is-loading');
    }
  });

  const sourceLink = document.createElement('a');
  sourceLink.className = 'reader-action-btn reader-action-primary';
  sourceLink.href = article.url;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLink.innerHTML = '🔗 <span>View original</span>';

  toolbar.append(summarizeBtn, listenBtn, saveBtn, exportWrapper, sourceLink);

  articleContent.append(title);
  if (authorSpan) articleContent.append(authorSpan);
  if (coverImage) articleContent.append(coverImage);
  articleContent.append(aiContainer, bodyText);

  wrapper.append(topBar, articleContent, toolbar);
  dialog.replaceChildren(wrapper);

  if (!dialog.open) {
    dialog.showModal();
  }
}

export { openArticleReader as openReader };
