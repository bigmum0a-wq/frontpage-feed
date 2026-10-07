// assets/js/components/header.js
import { onAuthChange, isGuestUser, getCurrentUser, logoutUser } from '../services/authService.js';
import { openAuthModal } from './authModal.js';

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



