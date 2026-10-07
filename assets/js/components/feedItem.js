import { getCategoryById, getFeedById, markArticleAsRead } from '../state.js';
import { formatRelativeDate } from '../utils/date.js';

export function createFeedItem(article, onArticleOpen) {
  const feed = getFeedById(article.feedId);
  const category = feed ? getCategoryById(feed.categoryId) : null;
  const articleElement = document.createElement('article');
  const articleButton = document.createElement('button');
  const meta = document.createElement('p');
  const categoryDot = document.createElement('span');
  const sourceBadge = document.createElement('span');
  const sourceName = document.createElement('span');
  const separator = document.createElement('span');
  const publishedDate = document.createElement('time');
  const title = document.createElement('h2');
  const excerpt = document.createElement('p');
  const categoryLabel = document.createElement('span');

  articleElement.className = `feed-item${article.isRead ? ' is-read' : ' is-unread'}${article.isSaved ? ' is-saved' : ''}`;
  articleElement.dataset.articleId = article.id;
  articleButton.className = 'feed-item-button';
  articleButton.type = 'button';
  articleButton.setAttribute(
    'aria-label',
    `${article.isRead ? 'Read' : 'Unread'} article: ${article.title}`,
  );

  meta.className = 'feed-item-meta';

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

  meta.append(categoryDot, sourceBadge, sourceName, separator, publishedDate);

  title.className = 'feed-item-title';
  title.textContent = article.title;

  excerpt.className = 'feed-item-excerpt';
  excerpt.textContent = article.excerpt;

  categoryLabel.className = 'feed-item-category';
  categoryLabel.textContent = category?.name ?? 'Uncategorized';
  categoryLabel.style.setProperty('--category-color', category?.color ?? 'var(--color-accent)');
  categoryLabel.style.setProperty('--category-background', category?.background ?? 'var(--color-accent-subtle)');

  articleButton.append(meta, title, excerpt, categoryLabel);
  articleButton.addEventListener('click', () => {
    markArticleAsRead(article.id);
    onArticleOpen(article);
  });

  articleElement.append(articleButton);

  return articleElement;
}

