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
    `${article.isRead ? 'Lu' : 'Non lu'} : ${article.title}`,
  );

  meta.className = 'feed-item-meta';

  // Marqueur visuel lu / non lu (point coloré)
  unreadDot.className = `feed-item-unread-dot ${article.isRead ? 'is-read' : 'is-unread'}`;
  unreadDot.title = article.isRead ? 'Article lu' : 'Article non lu';
  unreadDot.setAttribute('aria-label', article.isRead ? 'Lu' : 'Non lu');

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

  // Bouton d'action rapide Lu / Non lu
  toggleReadBtn.type = 'button';
  toggleReadBtn.className = `feed-item-action-btn btn-action-read ${article.isRead ? 'is-read' : 'is-unread'}`;
  toggleReadBtn.title = article.isRead ? 'Marquer comme non lu' : 'Marquer comme lu';
  toggleReadBtn.setAttribute('aria-label', toggleReadBtn.title);
  toggleReadBtn.innerHTML = article.isRead
    ? `<span class="action-icon">✓</span> <span class="action-text">Lu</span>`
    : `<span class="action-icon">○</span> <span class="action-text">Non lu</span>`;
  toggleReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleArticleRead(article.id);
    showToast(article.isRead ? 'Marqué comme non lu' : 'Marqué comme lu', 'info');
  });

  // Bouton d'action rapide Sauvegarder pour plus tard
  toggleSaveBtn.type = 'button';
  toggleSaveBtn.className = `feed-item-action-btn btn-action-save ${article.isSaved ? 'is-saved' : ''}`;
  toggleSaveBtn.title = article.isSaved ? 'Retirer des sauvegardes' : 'Sauvegarder pour plus tard';
  toggleSaveBtn.setAttribute('aria-label', toggleSaveBtn.title);
  toggleSaveBtn.innerHTML = article.isSaved
    ? `<span class="action-icon">★</span> <span class="action-text">Sauvegardé</span>`
    : `<span class="action-icon">☆</span> <span class="action-text">Sauvegarder</span>`;
  toggleSaveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleArticleSaved(article.id);
    showToast(article.isSaved ? 'Retiré des favoris' : 'Article sauvegardé pour plus tard', 'info');
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


