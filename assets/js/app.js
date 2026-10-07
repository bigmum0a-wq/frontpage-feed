import { getUnreadCount, setActiveView, setSearchQuery, state } from './state.js';
import { initialiseHeader } from './components/header.js';
import { initialiseGlobalSearch } from './components/search.js';
import { renderSidebar, initSidebarMobileToggle } from './components/sidebar.js';
import { openAddFeedModal } from './components/modal.js';
import { initialiseDigestView } from './views/digestView.js';
import { initialiseDiscoverView } from './views/discoverView.js';
import { applySavedPreferences, initialiseSettingsView } from './views/settingsView.js';
import { initialiseKeyboardShortcuts } from './components/keyboardShortcuts.js';
import { renderFeedView } from './views/feedView.js';
import { initialiseProfileView } from './views/profileView.js';
import { showToast } from './components/toast.js';
import { createHashRouter } from './router.js';
import { addLocalFeed, syncFeedsWithServer } from './services/feedService.js';
import { initialiseNetworkMonitoring } from './services/offlineSyncService.js';
import { updateAppBadge } from './services/badgeService.js';
import { initialiseAnalyticsView } from './views/analyticsView.js';
import { initAudioPlayerUI } from './components/audioPlayerUI.js';
import { initializeAuth, onAuthChange } from './services/authService.js';
import { renderLandingPage } from './components/landingHero.js';

let deferredInstallPrompt = null;

// Listen for PWA installation prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('frontpage:pwa-installable'));
});

export function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        showToast('Application installée avec succès !', 'success');
      }
      deferredInstallPrompt = null;
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  applySavedPreferences();
  initialiseNetworkMonitoring();

  // Register Service Worker for Offline-First capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('FrontPage ServiceWorker actif :', reg.scope);
      })
      .catch((err) => {
        console.warn('Échec enregistrement ServiceWorker :', err);
      });
  }
  
  // Initialize Authentication & Session (Guest or Authenticated User)
  await initializeAuth();

  // Background server sync
  syncFeedsWithServer().catch(() => {});
  updateAppBadge(getUnreadCount(state.articles));

  // Re-sync feeds when account changes
  onAuthChange(() => {
    syncFeedsWithServer().catch(() => {});
  });

  // Initialize persistent audio player bar (survives view changes)
  initAudioPlayerUI();

  // Listen for smart-rule notifications (action type: notify)
  window.addEventListener('frontpage:rule-notification', (e) => {
    const items = e.detail || [];
    items.slice(0, 3).forEach(({ rule, article }) => {
      showToast(`🔔 Règle "${rule.name}" : "${article.title?.slice(0, 50) || 'Article'}"`, 'info');
    });
  });

  const VIEW_CONFIG = {
    feed: {
      templateId: 'feed-template',
      title: 'All items',
      documentTitle: 'All items | FrontPage',
    },
    digest: {
      templateId: 'digest-template',
      title: 'Your digest',
      documentTitle: 'Digest | FrontPage',
    },
    discover: {
      templateId: 'discover-template',
      title: 'Discover sources',
      documentTitle: 'Discover | FrontPage',
    },
    settings: {
      templateId: 'settings-template',
      title: 'Settings',
      documentTitle: 'Settings | FrontPage',
    },
    profile: {
      templateId: 'profile-template',
      title: 'Profile',
      documentTitle: 'Profile | FrontPage',
    },
    analytics: {
      templateId: 'analytics-template',
      title: 'Analytics',
      documentTitle: 'Analytics | FrontPage',
    },
    welcome: {
      templateId: 'welcome-template',
      title: 'Welcome to FrontPage',
      documentTitle: 'Welcome | FrontPage',
    },
  };

  const mainContent = document.querySelector('#main-content');
  const navigationLinks = document.querySelectorAll('[data-view]');
  let router;

  function setActiveNavigation(viewName) {
    navigationLinks.forEach((link) => {
      const isActive = link.dataset.view === viewName;

      link.classList.toggle('active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function populateView(viewName) {
    if (viewName === 'welcome') {
      renderLandingPage();
      return;
    }

    if (viewName === 'feed') {
      renderFeedView(renderSidebarNavigation);
    }

    if (viewName === 'digest') {
      document.querySelector('#digest-title').textContent = 'Your digest';
      document.querySelector('#digest-period').textContent = 'Your reading summary will appear here.';
      initialiseDigestView(renderSidebarNavigation);
    }

    if (viewName === 'discover') {
      document.querySelector('#discover-title').textContent = 'Discover sources';
      initialiseDiscoverView();
    }

    if (viewName === 'settings') {
      initialiseSettingsView();
    }

    if (viewName === 'profile') {
      initialiseProfileView();
    }

    if (viewName === 'analytics') {
      initialiseAnalyticsView();
    }
  }

  function renderView(viewName) {
    const view = VIEW_CONFIG[viewName];
    const template = document.querySelector(`#${view.templateId}`);

    if (!template) {
      throw new Error(`The template "${view.templateId}" could not be found.`);
    }

    const viewFragment = template.content.cloneNode(true);

    document.body.classList.toggle('view-welcome-active', viewName === 'welcome');
    mainContent.replaceChildren(viewFragment);
    populateView(viewName);
    setActiveNavigation(viewName);
    document.title = view.documentTitle;
  }

  function handleNavigation(viewName) {
    setActiveView(viewName);
    renderView(viewName);
    renderSidebarNavigation();
  }

  function renderSidebarNavigation() {
    renderSidebar(() => {
      router.navigate('feed');
    });
  }

  router = createHashRouter(VIEW_CONFIG, handleNavigation);
  window.addEventListener('frontpage:feed-change', () => {
    const currentView = router.getCurrentView();
    if (currentView === 'feed') {
      renderView('feed');
    } else if (currentView === 'digest') {
      renderView('digest');
    }
    renderSidebarNavigation();
    updateAppBadge(getUnreadCount(state.articles));
  });

  initialiseGlobalSearch((query) => {
    setSearchQuery(query);

    if (router.getCurrentView() === 'feed') {
      renderView('feed');
      renderSidebarNavigation();
    } else {
      router.navigate('feed');
    }
  });

  initialiseHeader({
    onAddFeed() {
      openAddFeedModal((feed) => {
        try {
          addLocalFeed(feed);
          showToast(`${feed.name} was added to your local library.`, 'success');
          renderSidebarNavigation();
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    },
    onOpenProfile() {
      router.navigate('profile');
    },
  });

  initialiseKeyboardShortcuts();
  initSidebarMobileToggle();
  router.start();
  
});
