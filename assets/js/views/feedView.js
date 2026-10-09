import { renderFeedList } from '../components/feedList.js';
import { openArticleReader } from '../components/reader.js';
import { showToast } from '../components/toast.js';
import { syncFeedsWithServer, loadMoreArticles } from '../services/feedService.js';
import { isGuestUser } from '../services/authService.js';
import { openAuthModal } from '../components/authModal.js';
import {
  getCategoryById,
  getFeedById,
  getUnreadCount,
  getVisibleArticles,
  markVisibleArticlesAsRead,
  setFeedLayout,
  setSearchQuery,
  state,
  toggleFeedSortOrder,
} from '../state.js';

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderSearchIntentBar(container, onClear) {
  if (!container) return;

  const query = state.searchQuery.trim();
  const intent = state.currentSearchIntent;

  if (!query || !intent || !intent.hasIntent) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  container.hidden = false;

  const badges = [];
  if (intent.cleanQuery) {
    badges.push(`<span class="intent-badge intent-query">🔍 "${escapeHtml(intent.cleanQuery)}"</span>`);
  }
  if (intent.facets.time) {
    badges.push(`<span class="intent-badge intent-time">⏱ ${escapeHtml(intent.facets.time.label)}</span>`);
  }
  if (intent.facets.status) {
    badges.push(`<span class="intent-badge intent-status">📖 ${escapeHtml(intent.facets.status.label)}</span>`);
  }
  if (intent.facets.saved) {
    badges.push(`<span class="intent-badge intent-saved">★ ${escapeHtml(intent.facets.saved.label)}</span>`);
  }
  if (intent.facets.category) {
    badges.push(`<span class="intent-badge intent-category">📂 ${escapeHtml(intent.facets.category.label)}</span>`);
  }
  if (intent.facets.feed) {
    badges.push(`<span class="intent-badge intent-feed">📻 ${escapeHtml(intent.facets.feed.label)}</span>`);
  }
  if (intent.facets.ai) {
    badges.push(`<span class="intent-badge intent-ai">✨ ${escapeHtml(intent.facets.ai.label)}</span>`);
  }

  const extraTokens = (intent.expandedTokens || []).filter((t) => !intent.tokens?.includes(t));
  const conceptsHtml = extraTokens.length > 0
    ? `<span class="intent-concepts-hint" title="Semantic concepts included in search">Concepts: ${extraTokens.slice(0, 4).map((t) => `#${escapeHtml(t)}`).join(' ')}</span>`
    : '';

  container.innerHTML = `
    <div class="search-intent-inner">
      <div class="search-intent-meta">
        <span class="search-intent-icon">🧠</span>
        <span class="search-intent-label">Detected filters:</span>
      </div>
      <div class="search-intent-badges">
        ${badges.join('')}
        ${conceptsHtml}
      </div>
      <button type="button" class="search-intent-clear-btn" title="Reset search" aria-label="Reset search">✕ Clear</button>
    </div>
  `;

  container.querySelector('.search-intent-clear-btn')?.addEventListener('click', onClear);
}

function getFeedTitle() {
  if (state.searchQuery.trim()) {
    return 'Search results';
  }

  if (state.showSavedItems) {
    return 'Saved items';
  }

  if (state.activeFeedId) {
    return getFeedById(state.activeFeedId)?.name ?? 'Feed';
  }

  if (state.activeCategoryId !== 'all') {
    return getCategoryById(state.activeCategoryId)?.name ?? 'Category';
  }

  return 'All items';
}

export function renderFeedView(onArticleRead) {
  const feedTitle = document.querySelector('#feed-title');
  const unreadCount = document.querySelector('#feed-unread-count');
  const newItemsCount = document.querySelector('#feed-new-items');
  const articlesContainer = document.querySelector('#feed-articles');
  const intentBar = document.querySelector('#search-intent-bar');
  const listButton = document.querySelector('#list-view');
  const gridButton = document.querySelector('#grid-view');
  const sortButton = document.querySelector('#newest');
  const refreshButton = document.querySelector('#refresh');
  const markAllReadButton = document.querySelector('#mark-all-read');

  if (!feedTitle || !unreadCount || !newItemsCount || !articlesContainer) {
    return;
  }

  const visibleArticles = getVisibleArticles();
  const unreadArticles = getUnreadCount(visibleArticles);
  const isGuest = isGuestUser();

  feedTitle.textContent = getFeedTitle();
  unreadCount.textContent = `${unreadArticles} unread`;

  if (isGuest) {
    newItemsCount.textContent = `${visibleArticles.length} sample preview ${visibleArticles.length === 1 ? 'article' : 'articles'} (Guest mode)`;
  } else if (state.searchQuery.trim()) {
    newItemsCount.textContent = `${visibleArticles.length} result${visibleArticles.length === 1 ? '' : 's'} for “${state.searchQuery.trim()}”`;
  } else if (state.totalArticlesCount && state.totalArticlesCount > visibleArticles.length) {
    newItemsCount.textContent = `Showing ${visibleArticles.length} of ${state.totalArticlesCount.toLocaleString()} articles in database`;
  } else if (unreadArticles) {
    newItemsCount.textContent = `${unreadArticles} new ${unreadArticles === 1 ? 'item' : 'items'} to read`;
  } else {
    newItemsCount.textContent = 'You are all caught up.';
  }

  // Show polite Guest Onboarding Banner if in guest mode
  const guestBanner = document.querySelector('#feed-guest-banner');
  if (guestBanner) {
    const isDismissed = sessionStorage.getItem('frontpage_dismiss_guest_banner') === 'true';
    if (isGuest && !isDismissed) {
      guestBanner.hidden = false;
      guestBanner.querySelector('.btn-guest-banner-signup')?.addEventListener('click', () => {
        openAuthModal({ initialTab: 'register' });
      }, { once: true });
      guestBanner.querySelector('.btn-guest-banner-dismiss')?.addEventListener('click', () => {
        guestBanner.hidden = true;
        sessionStorage.setItem('frontpage_dismiss_guest_banner', 'true');
      }, { once: true });
    } else {
      guestBanner.hidden = true;
    }
  }

  // Render semantic intent bar if active
  renderSearchIntentBar(intentBar, () => {
    setSearchQuery('');
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) searchBar.value = '';
    renderFeedView(onArticleRead);
    onArticleRead?.();
  });

  renderFeedList(articlesContainer, visibleArticles, {
    layout: state.feedLayout,
    onArticleOpen(openedArticle) {
      openArticleReader(openedArticle);
      renderFeedView(onArticleRead);
      onArticleRead?.();
    },
  });

  // Handle Load More pagination for authenticated users
  let paginationContainer = document.querySelector('#feed-pagination');
  if (!paginationContainer && articlesContainer.parentNode) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'feed-pagination';
    paginationContainer.className = 'feed-pagination';
    paginationContainer.style.cssText = 'text-align: center; margin: 2rem 0; padding-bottom: 2rem;';
    articlesContainer.parentNode.insertBefore(paginationContainer, articlesContainer.nextSibling);
  }

  if (paginationContainer) {
    const canLoadMore = !isGuest && !state.searchQuery.trim() && !state.showSavedItems && state.articles.length < (state.totalArticlesCount || 0);

    if (canLoadMore) {
      paginationContainer.hidden = false;
      paginationContainer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-lg" id="btn-load-more" style="min-width: 220px; font-weight: 500;">
          <span>Load more articles</span>
        </button>
        <p class="pagination-info" style="color: var(--text-muted, #64748b); font-size: 0.875rem; margin-top: 0.5rem;">
          Showing ${visibleArticles.length} of ${(state.totalArticlesCount || visibleArticles.length).toLocaleString()} articles in database
        </p>
      `;

      const loadMoreBtn = paginationContainer.querySelector('#btn-load-more');
      loadMoreBtn?.addEventListener('click', async () => {
        loadMoreBtn.disabled = true;
        const label = loadMoreBtn.querySelector('span');
        if (label) label.textContent = 'Loading more articles...';
        try {
          const loaded = await loadMoreArticles();
          if (loaded) {
            showToast('Additional articles loaded from database', 'info');
          } else {
            showToast('All articles have been loaded', 'info');
          }
        } catch {
          showToast('Failed to load more articles', 'error');
        } finally {
          renderFeedView(onArticleRead);
          onArticleRead?.();
        }
      });
    } else {
      paginationContainer.hidden = true;
      paginationContainer.innerHTML = '';
    }
  }

  [listButton, gridButton].forEach((button) => {
    if (!button) {
      return;
    }

    const isActive = button.id === `${state.feedLayout}-view`;

    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  listButton?.addEventListener('click', () => {
    setFeedLayout('list');
    renderFeedView(onArticleRead);
  });

  gridButton?.addEventListener('click', () => {
    setFeedLayout('grid');
    renderFeedView(onArticleRead);
  });

  if (sortButton) {
    sortButton.querySelector('span').textContent =
      state.feedSortOrder === 'newest' ? 'Newest' : 'Oldest';
    sortButton.setAttribute('aria-label', `Sort articles: ${state.feedSortOrder} first`);
    sortButton.addEventListener('click', () => {
      toggleFeedSortOrder();
      renderFeedView(onArticleRead);
    });
  }

  refreshButton?.addEventListener('click', async () => {
    refreshButton.disabled = true;
    const label = refreshButton.querySelector('span');
    if (label) label.textContent = 'Refreshing...';
    refreshButton.classList.add('spinning');

    try {
      await syncFeedsWithServer();
      renderFeedView(onArticleRead);
      onArticleRead?.();
      showToast('Feeds updated successfully', 'success');
    } catch {
      showToast('Unable to update feeds', 'error');
    } finally {
      refreshButton.disabled = false;
      refreshButton.classList.remove('spinning');
      if (label) label.textContent = 'Refresh';
    }
  });

  markAllReadButton?.addEventListener('click', () => {
    markVisibleArticlesAsRead();
    renderFeedView(onArticleRead);
    onArticleRead?.();
  });
}
