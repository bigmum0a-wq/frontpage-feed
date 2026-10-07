/**
 * discoverView.js — Dynamic Live Feed Discovery & Web Topic Search
 *
 * Connects the Discover view to live web feeds via the /api/feeds/discover endpoint.
 * Supports:
 * - Dynamic topic browsing with live web queries
 * - Instant debounced search for any topic or RSS publication
 * - 1-Click Follow/Unfollow with real server and local library sync
 */
import { state, addFeed } from '../state.js';
import { api } from '../services/apiService.js';
import { showToast } from '../components/toast.js';
import { addFeedRemote, syncFeedsWithServer } from '../services/feedService.js';

let cachedStarterFeeds = null;
let searchDebounceTimer = null;
let currentSearchQuery = '';

function isFeedFollowed(feedUrl, title) {
  if (!feedUrl && !title) return false;
  return state.feeds.some((f) => {
    if (feedUrl && f.url && f.url.toLowerCase() === feedUrl.toLowerCase()) return true;
    if (title && f.name && f.name.toLowerCase() === title.toLowerCase()) return true;
    return false;
  });
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Creates a reactive follow button connected to server & local state
 */
function createFollowButton(feed) {
  const followed = isFeedFollowed(feed.feedUrl || feed.url, feed.title || feed.name);
  const button = createElement(
    'button',
    `btn btn-ghost btn-sm ${followed ? 'is-following' : ''}`,
    followed ? 'Following ✓' : 'Follow'
  );

  button.type = 'button';
  button.setAttribute('aria-pressed', String(followed));

  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    const alreadyFollowing = button.classList.contains('is-following');

    if (alreadyFollowing) {
      showToast(`You are already following "${feed.title || feed.name}".`, 'info');
      return;
    }

    button.disabled = true;
    button.textContent = 'Subscribing...';

    try {
      const feedUrl = feed.feedUrl || feed.url;
      const title = feed.title || feed.name || 'New Feed';
      const categoryId = feed.categoryId || 'frontend';

      // Remote subscription (adds to sqlite + fetches initial articles)
      await addFeedRemote({
        name: title,
        url: feedUrl,
        categoryId,
      });

      button.classList.add('is-following');
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Following ✓';
      showToast(`Successfully subscribed to "${title}"!`, 'success');

      // Refresh sidebar and library
      await syncFeedsWithServer();
    } catch (err) {
      console.error('Subscription error:', err);
      button.textContent = 'Follow';
      showToast(`Could not subscribe to "${feed.title}": ${err.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  });

  return button;
}

/**
 * Renders a source card for curated or live feeds
 */
function createSourceCard(feed, categoryName = 'General') {
  const card = createElement('article', 'source-card');
  const top = createElement('div', 'source-card-top');
  
  const iconText = (feed.title || 'FP').slice(0, 3).toUpperCase();
  const icon = createElement('span', 'source-icon', iconText);
  if (feed.iconUrl) {
    const img = document.createElement('img');
    img.src = feed.iconUrl;
    img.alt = '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.onerror = () => img.remove();
    icon.textContent = '';
    icon.appendChild(img);
  }

  const title = createElement('h3', '', feed.title);
  const description = createElement('p', '', feed.description || 'No description provided.');
  
  const metaRow = createElement('div', 'source-meta-row');
  const catSpan = createElement('span', '', `${categoryName} · ${feed.format ? feed.format.toUpperCase() : 'RSS'}`);
  const subsSpan = createElement('span', '', feed.subscribers ? `👥 ${feed.subscribers.toLocaleString()} readers` : '🌐 Open Web');
  metaRow.append(catSpan, subsSpan);

  top.append(icon, createFollowButton(feed));
  card.append(top, title, description, metaRow);

  return card;
}

function createPopularSource(feed, categoryName) {
  const source = createElement('article', 'popular-source');
  const icon = createElement('span', 'source-icon', (feed.title || 'FP').slice(0, 2).toUpperCase());
  const content = createElement('div');
  const title = createElement('h3', '', feed.title);
  const description = createElement('p', '', `${feed.description || ''} ${categoryName ? `(${categoryName})` : ''}`);

  content.append(title, description);
  source.append(icon, content, createFollowButton(feed));

  return source;
}

function createCollection(category) {
  const card = createElement('article', 'collection-card');
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  const label = createElement('span', '', category.name.toUpperCase());
  const title = createElement('h3', '', `${category.name} reading list`);
  const description = createElement(
    'p',
    '',
    `Curated collection of ${category.feeds.length} essential sources for ${category.name}. Click to explore feeds.`
  );

  const footer = createElement('div', 'collection-card-footer');
  const count = createElement('small', '', `📚 ${category.feeds.length} sources`);
  const cta = createElement('span', 'collection-explore-link', 'Explore collection →');
  footer.append(count, cta);

  card.append(label, title, description, footer);

  const activateCategory = () => {
    const topicBtn = Array.from(
      document.querySelectorAll('.topic-pills-grid button, .topic-card-grid button')
    ).find((b) => (b.dataset.topic || '').toLowerCase() === category.name.toLowerCase());

    if (topicBtn) {
      topicBtn.click();
    } else {
      const searchInput = document.querySelector('#discover-search-input');
      if (searchInput) searchInput.value = category.name;
      performLiveDiscovery(category.name, category.name);
    }
  };

  card.addEventListener('click', activateCategory);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateCategory();
    }
  });

  return card;
}

function renderStarterSources(feedData) {
  const recommendedContainer = document.querySelector('#recommended-sources-list');
  const popularContainer = document.querySelector('#popular-sources-list');
  const collectionsContainer = document.querySelector('#collections-list');

  const allFeeds = feedData.categories.flatMap((category) =>
    category.feeds.map((feed) => ({ ...feed, categoryName: category.name }))
  );
  const recommendedFeeds = allFeeds.slice(0, 3);
  const popularFeeds = allFeeds.filter((feed) =>
    ['web.dev', 'The GitHub Blog', "Simon Willison's Weblog"].includes(feed.title)
  );

  recommendedContainer?.replaceChildren(
    ...recommendedFeeds.map((feed) => createSourceCard(feed, feed.categoryName))
  );
  popularContainer?.replaceChildren(
    ...popularFeeds.map((feed) => createPopularSource(feed, feed.categoryName))
  );
  collectionsContainer?.replaceChildren(
    ...feedData.categories.slice(0, 3).map(createCollection)
  );
}

/**
 * Searches feeds live from backend /api/feeds/discover with instant curated pre-population
 */
async function performLiveDiscovery(query, topicLabel = '') {
  const liveSection = document.querySelector('#discover-live-results-section');
  const liveList = document.querySelector('#discover-live-results-list');
  const loadingEl = document.querySelector('#discover-live-loading');
  const descEl = document.querySelector('#discover-live-results-desc');
  const emptyState = document.querySelector('#discover-empty-state');
  const badgeEl = document.querySelector('#topic-active-badge');
  const defaultSections = document.querySelector('#discover-default-sections');

  if (!liveSection || !liveList) return;

  const trimmed = query.trim();
  if (!trimmed) {
    if (defaultSections) defaultSections.hidden = false;
    liveSection.hidden = true;
    liveList.innerHTML = '';
    return;
  }

  // Switch to dedicated search mode: hide default clutter
  if (defaultSections) defaultSections.hidden = true;
  liveSection.hidden = false;
  if (loadingEl) loadingEl.hidden = false;
  if (emptyState) emptyState.hidden = true;

  if (badgeEl) {
    badgeEl.textContent = topicLabel ? `✦ Topic: ${topicLabel}` : `✦ Search: ${trimmed}`;
  }

  if (descEl) {
    descEl.textContent = topicLabel
      ? `Live feeds and curated publications for "${topicLabel}"`
      : `Live web feeds matching "${trimmed}"`;
  }

  // 1. Immediately render any matching curated feeds (ZERO-WAIT for the user!)
  const seenUrls = new Set();
  const initialCards = [];

  if (cachedStarterFeeds && Array.isArray(cachedStarterFeeds.categories)) {
    const lowerQ = trimmed.toLowerCase();
    cachedStarterFeeds.categories.forEach((cat) => {
      const catMatches = cat.name.toLowerCase().includes(lowerQ) || lowerQ.includes(cat.name.toLowerCase());
      (cat.feeds || []).forEach((feed) => {
        const titleMatches = feed.title && feed.title.toLowerCase().includes(lowerQ);
        const descMatches = feed.description && feed.description.toLowerCase().includes(lowerQ);
        if (catMatches || titleMatches || descMatches) {
          const urlKey = (feed.feedUrl || feed.url || '').toLowerCase();
          if (urlKey && !seenUrls.has(urlKey)) {
            seenUrls.add(urlKey);
            initialCards.push(createSourceCard(feed, cat.name));
          }
        }
      });
    });
  }

  if (initialCards.length > 0) {
    liveList.replaceChildren(...initialCards);
  } else {
    liveList.innerHTML = '';
  }

  // Scroll smoothly to results container
  liveSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 2. Fetch live web feeds in parallel and merge
  try {
    const res = await fetch(`/api/feeds/discover?q=${encodeURIComponent(trimmed)}&limit=12`);
    const json = await res.json();

    if (loadingEl) loadingEl.hidden = true;

    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      const newLiveFeeds = json.data.filter((feed) => {
        const urlKey = (feed.feedUrl || feed.url || '').toLowerCase();
        if (!urlKey || seenUrls.has(urlKey)) return false;
        seenUrls.add(urlKey);
        return true;
      });

      if (newLiveFeeds.length > 0) {
        const newCards = newLiveFeeds.map((feed) =>
          createSourceCard(feed, topicLabel || feed.categoryName || 'Web')
        );
        liveList.append(...newCards);
      }

      if (emptyState) emptyState.hidden = true;
    } else if (liveList.children.length === 0) {
      liveList.innerHTML = '<p class="discover-empty-state" style="grid-column: 1 / -1;">No active web feeds found for this search. Try a different topic or keyword.</p>';
    }
  } catch (err) {
    if (loadingEl) loadingEl.hidden = true;
    console.error('Discover query error:', err);
    if (liveList.children.length === 0) {
      liveList.innerHTML = '<p class="discover-empty-state" style="grid-column: 1 / -1;">Unable to connect to live web search right now. Please check your internet connection.</p>';
    }
  }
}

export async function initialiseDiscoverView() {
  const searchForm = document.querySelector('#discover-search');
  const searchInput = document.querySelector('#discover-search-input');
  const clearBtn = document.querySelector('#btn-clear-discover-search');
  const liveSection = document.querySelector('#discover-live-results-section');
  const defaultSections = document.querySelector('#discover-default-sections');

  // Reset to default recommendations view
  const resetToAll = () => {
    if (searchInput) searchInput.value = '';
    if (liveSection) liveSection.hidden = true;
    if (defaultSections) defaultSections.hidden = false;
    document.querySelectorAll('.topic-pills-grid button, .topic-card-grid button').forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
  };

  clearBtn?.addEventListener('click', resetToAll);

  // Search input handler with debounce
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = searchInput?.value ?? '';
    performLiveDiscovery(query);
  });

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const query = searchInput.value;
    if (query.trim().length >= 2) {
      searchDebounceTimer = setTimeout(() => {
        performLiveDiscovery(query);
      }, 400);
    } else if (!query.trim()) {
      resetToAll();
    }
  });

  // Topic Buttons / Pills: Connected to live web discovery
  document.querySelectorAll('.topic-pills-grid button, .topic-card-grid button').forEach((button) => {
    button.addEventListener('click', () => {
      const topic = button.dataset.topic || button.querySelector('strong')?.textContent || '';
      const isAlreadyActive = button.classList.contains('is-active');

      document.querySelectorAll('.topic-pills-grid button, .topic-card-grid button').forEach((topicBtn) => {
        topicBtn.classList.remove('is-active');
        topicBtn.setAttribute('aria-pressed', 'false');
      });

      if (isAlreadyActive) {
        resetToAll();
        return;
      }

      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');

      if (searchInput) searchInput.value = topic;
      performLiveDiscovery(topic, topic);
    });
  });

  // Load curated starter feeds
  try {
    if (!cachedStarterFeeds) {
      const response = await fetch('./assets/js/data-sample-feeds.json');
      if (response.ok) {
        cachedStarterFeeds = await response.json();
      }
    }
    if (cachedStarterFeeds) {
      renderStarterSources(cachedStarterFeeds);
    }
  } catch (error) {
    console.warn('Sample feed data could not be loaded:', error.message);
  }
}
