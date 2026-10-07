import {
  getCategoryById,
  getFeedById,
  markArticleAsRead,
  toggleArticleRead,
  toggleArticleSaved,
} from '../state.js';
import { formatRelativeDate } from '../utils/date.js';
import { showToast } from './toast.js';

export function createFeedItem(article, onArticleOpen) {
  const feed = getFeedById(article.feedId);
  const category = feed ? getCategoryById(feed.categoryId) : null;
  const articleElement = document.createElement('article');
  const articleButton = document.createElement('button');
  const meta = document.createElement('p');
  const unreadDot = document.createElement('span');
  const categoryDot = document.createElement('span');
  const sourceBadge = document.createElement('span');
  const sourceName = document.createElement('span');
  const separator = document.createElement('span');
  const publishedDate = document.createElement('time');
  const title = document.createElement('h2');
  const excerpt = document.createElement('p');
  const footerRow = document.createElement('div');
  const categoryLabel = document.createElement('span');
  const actionsWrap = document.createElement('div');
  const toggleReadBtn = document.createElement('button');
  const toggleSaveBtn = document.createElement('button');

  articleElement.className = `feed-item${article.isRead ? ' is-read' : ' is-unread'}${article.isSaved ? ' is-saved' : ''}`;
  articleElement.dataset.articleId = article.id;
  articleButton.className = 'feed-item-button';
  articleButton.type = 'button';
  articleButton.setAttribute(
    'aria-label',
    `${article.isRead ? 'Read' : 'Unread'}: ${article.title}`,
  );

  meta.className = 'feed-item-meta';

  // Visual read / unread indicator dot
  unreadDot.className = `feed-item-unread-dot ${article.isRead ? 'is-read' : 'is-unread'}`;
  unreadDot.title = article.isRead ? 'Read article' : 'Unread article';
  unreadDot.setAttribute('aria-label', article.isRead ? 'Read' : 'Unread');

  categoryDot.className = 'feed-category-dot';
  categoryDot.style.backgroundColor = category?.color ?? 'var(--color-text-tertiary)';
  categoryDot.setAttribute('aria-hidden', 'true');

  sourceBadge.className = 'feed-source-badge';
  sourceBadge.style.backgroundColor = feed?.color ?? 'var(--color-text-secondary)';
  sourceBadge.textContent = feed?.initials ?? '?';
  sourceBadge.setAttribute('aria-hidden', 'true');

  sourceName.className = 'feed-source-name';
  sourceName.textContent = feed?.name ?? 'Unknown source';

  separator.className = 'feed-meta-separator';
  separator.textContent = '·';
  separator.setAttribute('aria-hidden', 'true');

  publishedDate.dateTime = article.publishedAt;
  publishedDate.textContent = formatRelativeDate(article.publishedAt);

  meta.append(unreadDot, categoryDot, sourceBadge, sourceName, separator, publishedDate);

  title.className = 'feed-item-title';
  title.textContent = article.title;

  excerpt.className = 'feed-item-excerpt';
  excerpt.textContent = article.excerpt;

  footerRow.className = 'feed-item-footer-row';

  categoryLabel.className = 'feed-item-category';
  categoryLabel.textContent = category?.name ?? 'Uncategorized';
  categoryLabel.style.setProperty('--category-color', category?.color ?? 'var(--color-accent)');
  categoryLabel.style.setProperty('--category-background', category?.background ?? 'var(--color-accent-subtle)');

  actionsWrap.className = 'feed-item-actions';

  // Read / Unread quick toggle
  toggleReadBtn.type = 'button';
  toggleReadBtn.className = `feed-item-action-btn btn-action-read ${article.isRead ? 'is-read' : 'is-unread'}`;
  toggleReadBtn.title = article.isRead ? 'Mark as unread' : 'Mark as read';
  toggleReadBtn.setAttribute('aria-label', toggleReadBtn.title);
  toggleReadBtn.innerHTML = article.isRead
    ? `<span class="action-icon">✓</span> <span class="action-text">Read</span>`
    : `<span class="action-icon">○</span> <span class="action-text">Unread</span>`;
  toggleReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleArticleRead(article.id);
    showToast(article.isRead ? 'Marked as unread' : 'Marked as read', 'info');
  });

  // Save for later quick toggle
  toggleSaveBtn.type = 'button';
  toggleSaveBtn.className = `feed-item-action-btn btn-action-save ${article.isSaved ? 'is-saved' : ''}`;
  toggleSaveBtn.title = article.isSaved ? 'Remove from saved' : 'Save for later';
  toggleSaveBtn.setAttribute('aria-label', toggleSaveBtn.title);
  toggleSaveBtn.innerHTML = article.isSaved
    ? `<span class="action-icon">★</span> <span class="action-text">Saved</span>`
    : `<span class="action-icon">☆</span> <span class="action-text">Save</span>`;
  toggleSaveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleArticleSaved(article.id);
    showToast(article.isSaved ? 'Removed from saved' : 'Article saved for later', 'info');
  });

  actionsWrap.append(toggleReadBtn, toggleSaveBtn);
  footerRow.append(categoryLabel, actionsWrap);

  articleButton.append(meta, title, excerpt, footerRow);

  articleButton.addEventListener('click', () => {
    markArticleAsRead(article.id);
    onArticleOpen(article);
  });

  articleElement.append(articleButton);

  return articleElement;
}


