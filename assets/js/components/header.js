// assets/js/components/header.js
import { onAuthChange, isGuestUser, getCurrentUser, logoutUser } from '../services/authService.js';
import { openAuthModal } from './authModal.js';
import { getUnreadCount, markAllArticlesAsRead, state } from '../state.js';
import { showToast } from './toast.js';

export function initialiseHeader({ onAddFeed, onOpenProfile }) {
  const addFeedButton = document.querySelector('.add');
  const profileButton = document.querySelector('.user-profile');
  const authButton = document.querySelector('#btn-header-auth');

  addFeedButton?.addEventListener('click', onAddFeed);
  profileButton?.addEventListener('click', onOpenProfile);

  authButton?.addEventListener('click', () => {
    if (isGuestUser()) {
      openAuthModal({ initialTab: 'login' });
    } else {
      logoutUser();
    }
  });

  // Listen to auth changes and update header state
  onAuthChange((user, isGuest) => {
    updateHeaderUser(user, isGuest);
  });

  // Initial update
  updateHeaderUser(getCurrentUser(), isGuestUser());

  // Initialise Sub-header Persistent Ticker
  initialiseSubHeaderTicker();
}

function updateHeaderUser(user, isGuest) {
  const userName = document.querySelector('#user-name');
  const profileButton = document.querySelector('.user-profile');
  const authButton = document.querySelector('#btn-header-auth');

  if (isGuest) {
    if (userName) userName.textContent = 'Guest';
    if (authButton) {
      authButton.textContent = 'Sign In';
      authButton.title = 'Sign in or create account';
      authButton.classList.remove('btn-ghost');
      authButton.classList.add('btn-secondary');
    }
    profileButton?.setAttribute('aria-label', 'Open Guest profile');
  } else {
    const displayName = user?.name?.trim() || 'Reader';
    if (userName) userName.textContent = displayName;
    if (authButton) {
      authButton.textContent = 'Sign Out';
      authButton.title = `Signed in as ${user?.email || displayName}. Click to sign out.`;
      authButton.classList.remove('btn-secondary');
      authButton.classList.add('btn-ghost');
    }
    profileButton?.setAttribute('aria-label', `Open ${displayName}'s profile`);
  }
}

export function setHeaderProfileName(name) {
  const userName = document.querySelector('#user-name');
  if (userName && name) userName.textContent = name.trim();
}

function initialiseSubHeaderTicker() {
  // Update whenever feed change event occurs
  window.addEventListener('frontpage:feed-change', () => {
    updateSubHeaderTicker();
  });

  updateSubHeaderTicker();
}

export function updateSubHeaderTicker() {
  const tickerEl = document.querySelector('#sub-header-ticker');
  const countEl = document.querySelector('#ticker-unread-count');
  const statusEl = document.querySelector('#ticker-status-text');
  const liveDot = document.querySelector('#ticker-live-dot');

  if (!tickerEl || !statusEl) return;

  const unreadCount = getUnreadCount(state.articles);

  if (unreadCount > 0) {
    tickerEl.hidden = false;
    document.body.classList.add('has-sub-header-ticker');
    if (countEl) countEl.textContent = unreadCount;
    statusEl.innerHTML = `<strong id="ticker-unread-count">${unreadCount}</strong> ${unreadCount === 1 ? 'unread article' : 'unread articles'}`;
    liveDot?.classList.remove('is-caught-up');
    liveDot?.classList.add('is-active');
  } else {
    // Hide bar completely when all articles are read
    tickerEl.hidden = true;
    document.body.classList.remove('has-sub-header-ticker');
  }
}


