import {
  getUnreadCount,
  setActiveCategory,
  setActiveFeed,
  setSavedItemsView,
  state,
} from '../state.js';

function getArticlesForCategory(categoryId) {
  return state.articles.filter((article) => {
    const feed = state.feeds.find((item) => item.id === article.feedId);

    return feed?.categoryId === categoryId;
  });
}

function getArticlesForFeed(feedId) {
  return state.articles.filter((article) => article.feedId === feedId);
}


/**
 * Crée un badge de compteur pour la sidebar.
 * - Si `unread > 0` : affiche le nombre non lus (accent rouge).
 * - Si `unread === 0` et `total > 0` : affiche le total (gris neutre).
 * - Si `total === 0` : n'affiche rien.
 */
function createCountBadge(unread, total) {
  if (total === 0) return null;

  const span = document.createElement('span');

  if (unread > 0) {
    span.className = 'sidebar-count is-unread';
    span.textContent = unread > 99 ? '99+' : String(unread);
    span.setAttribute('aria-label', `${unread} non lu${unread > 1 ? 's' : ''}`);
  } else {
    span.className = 'sidebar-count is-total';
    span.textContent = total > 99 ? '99+' : String(total);
    span.setAttribute('aria-label', `${total} article${total > 1 ? 's' : ''}`);
  }

  return span;
}

function createNavigationItem({ label, unread, total, isActive, onSelect, className = '', href = '#feed' }) {
  const listItem = document.createElement('li');
  const link = document.createElement('a');
  const labelElement = document.createElement('span');

  listItem.className = className;
  link.href = href;
  labelElement.textContent = label;

  link.classList.toggle('active', isActive);

  if (isActive) {
    link.setAttribute('aria-current', 'page');
  }

  const badge = createCountBadge(unread ?? 0, total ?? 0);

  if (badge !== null) {
    link.append(labelElement, badge);
  } else {
    link.append(labelElement);
  }

  link.addEventListener('click', (event) => {
    event.preventDefault();
    closeMobileSidebar();
    onSelect(event);
  });

  listItem.append(link);

  return listItem;
}


function createCategoryLabel(category) {
  const label = document.createElement('span');
  const dot = document.createElement('span');
  const text = document.createElement('span');

  label.className = 'sidebar-category-label';
  dot.className = 'sidebar-category-dot';
  dot.style.backgroundColor = category.color;
  dot.setAttribute('aria-hidden', 'true');
  text.textContent = category.name;

  label.append(dot, text);

  return label;
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.app-sidebar');
  const toggleBtn = document.querySelector('#sidebar-mobile-toggle');
  if (sidebar?.classList.contains('is-open')) {
    sidebar.classList.remove('is-open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    const caret = toggleBtn?.querySelector('.toggle-caret');
    if (caret) caret.textContent = '▼';
  }
}

function renderFeedSidebar(onFeedSelection) {
  const mainList = document.createElement('ul');
  const categoryGroup = document.createElement('section');
  const categoryHeading = document.createElement('h2');
  const categoryList = document.createElement('ul');
  const savedCount = state.articles.filter((article) => article.isSaved).length;

  mainList.className = 'sidebar-main-list';
  categoryGroup.className = 'sidebar-category-group';
  categoryHeading.className = 'sidebar-section-title';
  categoryHeading.textContent = 'Categories';
  categoryList.className = 'sidebar-category-list';

  const allTotal = state.articles.length;
  const allUnread = getUnreadCount();

  mainList.append(
    createNavigationItem({
      label: 'All items',
      unread: allUnread,
      total: allTotal,
      isActive:
        !state.showSavedItems && state.activeCategoryId === 'all' && !state.activeFeedId,
      onSelect: () => {
        setActiveCategory('all');
        onFeedSelection();
      },
    }),
    createNavigationItem({
      label: 'Saved',
      unread: 0,
      total: savedCount,
      isActive: state.showSavedItems,
      onSelect: () => {
        setSavedItemsView();
        onFeedSelection();
      },
    }),
  );

  state.categories.forEach((category) => {
    const categoryItems = getArticlesForCategory(category.id);
    const catUnread = getUnreadCount(categoryItems);
    const catTotal = categoryItems.length;

    const categoryItem = createNavigationItem({
      label: category.name,
      unread: catUnread,
      total: catTotal,
      isActive: !state.showSavedItems && state.activeCategoryId === category.id,
      className: 'sidebar-category-item',
      onSelect: () => {
        setActiveCategory(category.id);
        onFeedSelection();
      },
    });
    const feedsList = document.createElement('ul');

    categoryItem.querySelector('a > span')?.replaceWith(createCategoryLabel(category));

    feedsList.className = 'sidebar-feed-list';

    state.feeds
      .filter((feed) => feed.categoryId === category.id)
      .forEach((feed) => {
        const feedItems = getArticlesForFeed(feed.id);
        const feedUnread = getUnreadCount(feedItems);
        const feedTotal = feedItems.length;

        feedsList.append(
          createNavigationItem({
            label: feed.name,
            unread: feedUnread,
            total: feedTotal,
            isActive: !state.showSavedItems && state.activeFeedId === feed.id,
            className: 'sidebar-feed-item',
            onSelect: () => {
              setActiveFeed(feed.id);
              onFeedSelection();
            },
          }),
        );
      });

    categoryItem.append(feedsList);
    categoryList.append(categoryItem);
  });

  categoryGroup.append(categoryHeading, categoryList);

  return [mainList, categoryGroup];
}

const VIEW_SECTIONS = {
  digest: {
    heading: 'Digest',
    items: [
      { id: 'digest-overview', label: 'Overview' },
      { id: 'digest-brief', label: 'Quick brief' },
      { id: 'trending', label: 'What\'s trending' },
      { id: 'top-stories', label: 'Top stories' },
      { id: 'by-topic', label: 'By topic' },
      { id: 'catch-up', label: 'Catch up' },
    ],
  },
  discover: {
    heading: 'Discover',
    items: [
      { id: 'discover-search', label: 'Search sources' },
      { id: 'recommended-sources', label: 'Recommended for you' },
      { id: 'explore-topics', label: 'Explore by topic' },
      { id: 'featured-collections', label: 'Featured collections' },
      { id: 'popular-sources', label: 'Popular sources' },
    ],
  },
  welcome: {
    heading: 'Welcome',
    items: [
      { id: 'welcome-view', label: 'Product overview' },
      { id: 'landing-features', label: 'Key features' },
      { id: 'landing-preview-section', label: 'Starter collection' },
    ],
  },
  profile: {
    heading: 'Profile & Library',
    items: [
      { id: 'profile-view', label: 'Identity & sync' },
      { id: 'reading-activity', label: 'Reading streaks' },
      { id: 'profile-saved-articles-list', label: 'Saved bookmarks' },
    ],
  },
  settings: {
    heading: 'Settings',
    items: [
      { id: 'panel-appearance', label: 'Appearance & UI' },
      { id: 'panel-sync', label: 'Feeds & sync' },
      { id: 'panel-data', label: 'Import & data' },
      { id: 'panel-integrations', label: 'Integrations' },
      { id: 'panel-ai', label: 'AI & digest' },
      { id: 'panel-accessibility', label: 'Accessibility' },
      { id: 'panel-account', label: 'Account & profile' },
      { id: 'panel-notifications', label: 'Notifications' },
    ],
  },
};

function renderSectionSidebar(viewName) {
  const sectionConfig = VIEW_SECTIONS[viewName] || { heading: 'Navigation', items: [] };
  const sectionGroup = document.createElement('section');
  const sectionHeading = document.createElement('h2');
  const sectionList = document.createElement('ul');

  sectionGroup.className = 'sidebar-section-group';
  sectionHeading.className = 'sidebar-section-title';
  sectionHeading.textContent = sectionConfig.heading;
  sectionList.className = 'sidebar-section-list';

  sectionConfig.items.forEach((section) => {
    sectionList.append(
      createNavigationItem({
        label: section.label,
        href: `#${section.id}`,
        isActive: viewName === 'settings' && section.id === 'panel-appearance',
        onSelect: (event) => {
          const targetElement = document.querySelector(`#${section.id}`);

          if (targetElement) {
            if (viewName === 'settings' && targetElement.classList.contains('settings-panel')) {
              document.querySelectorAll('.settings-panel').forEach((panel) => {
                const isSelected = panel === targetElement;

                panel.hidden = !isSelected;
                panel.classList.toggle('is-active', isSelected);
              });
              sectionList.querySelectorAll('a').forEach((link) => link.classList.remove('active'));
              event.currentTarget.classList.add('active');
            }
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        },
      }),
    );
  });

  sectionGroup.append(sectionHeading, sectionList);

  return [sectionGroup];
}

export function updateMobileSidebarTitle() {
  const titleEl = document.querySelector('#sidebar-mobile-title');
  if (!titleEl) return;

  if (state.activeView === 'feed') {
    if (state.showSavedItems) {
      titleEl.textContent = 'Saved Articles';
    } else if (state.activeFeedId) {
      const feed = state.feeds.find((f) => f.id === state.activeFeedId);
      titleEl.textContent = feed ? `Feed: ${feed.name}` : 'Feeds';
    } else if (state.activeCategoryId) {
      const cat = state.categories.find((c) => c.id === state.activeCategoryId);
      titleEl.textContent = cat ? `Category: ${cat.name}` : 'Categories';
    } else {
      titleEl.textContent = `All Feeds (${state.feeds.length})`;
    }
  } else if (state.activeView === 'profile') {
    titleEl.textContent = 'Profile & Library';
  } else if (state.activeView === 'digest') {
    titleEl.textContent = 'Digest Navigation';
  } else if (state.activeView === 'discover') {
    titleEl.textContent = 'Discover Topics';
  } else if (state.activeView === 'settings') {
    titleEl.textContent = 'Settings Navigation';
  } else if (state.activeView === 'analytics') {
    titleEl.textContent = 'Analytics Navigation';
  } else {
    titleEl.textContent = 'Navigation & Feeds';
  }
}

export function initSidebarMobileToggle() {
  const toggleBtn = document.querySelector('#sidebar-mobile-toggle');
  const sidebar = document.querySelector('.app-sidebar');
  if (!toggleBtn || !sidebar) return;

  toggleBtn.onclick = (e) => {
    e.stopPropagation();
    const isOpen = sidebar.classList.toggle('is-open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    const caret = toggleBtn.querySelector('.toggle-caret');
    if (caret) caret.textContent = isOpen ? '▲' : '▼';
  };

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target)) {
      closeMobileSidebar();
    }
  });

  document.querySelector('#settings-link')?.addEventListener('click', () => {
    closeMobileSidebar();
  });
}

export function renderSidebar(onFeedSelection) {
  const sidebarNavigation = document.querySelector('#sidebar-navigation');

  if (!sidebarNavigation) {
    return;
  }

  const sidebarContent =
    state.activeView === 'feed'
      ? renderFeedSidebar(onFeedSelection)
      : renderSectionSidebar(state.activeView);

  sidebarNavigation.replaceChildren(...sidebarContent);
  updateMobileSidebarTitle();
}
