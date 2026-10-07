import { createFeedItem } from './feedItem.js';

function createEmptyState() {
  const message = document.createElement('p');

  message.className = 'empty-state-message';
  message.textContent = 'No articles match this selection yet.';
  return message;
}

export function renderFeedList(container, articles, { layout, onArticleOpen }) {
  if (!container) return;

  container.replaceChildren(
    ...(articles.length
      ? articles.map((article) => createFeedItem(article, () => onArticleOpen(article)))
      : [createEmptyState()]),
  );
  container.classList.toggle('articles-grid', layout === 'grid');
  container.classList.toggle('articles-magazine', layout === 'magazine');
  container.classList.toggle('articles-split', layout === 'split');
}
