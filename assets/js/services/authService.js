import { api } from './apiService.js';
import { resetToGuestSampleLibrary, state } from '../state.js';
import { showToast } from '../components/toast.js';

const TOKEN_KEY = 'frontpage_auth_token';
const USER_KEY = 'frontpage_current_user';

let authChangeListeners = [];

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function isGuestUser() {
  const user = getCurrentUser();
  return !user || Boolean(user.is_guest);
}

export function onAuthChange(listener) {
  if (typeof listener === 'function') {
    authChangeListeners.push(listener);
  }
}

function notifyAuthChange(user, isGuest) {
  authChangeListeners.forEach((fn) => {
    try {
      fn(user, isGuest);
    } catch (err) {
      console.error('Auth change listener error:', err);
    }
  });
}

/**
 * Loads current user from backend /api/auth/me
 */
export async function initializeAuth() {
  try {
    const res = await api.get('/auth/me');
    if (res && res.success && res.data) {
      const { user, isGuest } = res.data;
      setCurrentUser(user);
      notifyAuthChange(user, isGuest);
      return { user, isGuest };
    }
  } catch (error) {
    console.warn('Could not verify session with server, falling back to cached or guest:', error.message);
  }

  const cachedUser = getCurrentUser() || {
    id: 'guest-user-001',
    name: 'Guest User',
    email: 'guest@frontpage.local',
    is_guest: 1,
  };
  setCurrentUser(cachedUser);
  notifyAuthChange(cachedUser, isGuestUser());
  return { user: cachedUser, isGuest: isGuestUser() };
}

/**
 * Registers a new account
 */
export async function registerUser({ email, password, name }) {
  const res = await api.post('/auth/register', { email, password, name });
  if (res && res.success && res.data) {
    const { user, token } = res.data;
    setAuthToken(token);
    setCurrentUser(user);
    notifyAuthChange(user, false);
    showToast(`Welcome to FrontPage, ${user.name}!`, 'success');
    return user;
  }
  throw new Error(res?.error?.message || 'Failed to create account.');
}

/**
 * Logs in to an existing account
 */
export async function loginUser({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  if (res && res.success && res.data) {
    const { user, token } = res.data;
    setAuthToken(token);
    setCurrentUser(user);
    notifyAuthChange(user, false);
    showToast(`Welcome back, ${user.name}!`, 'success');
    return user;
  }
  throw new Error(res?.error?.message || 'Invalid email or password.');
}

/**
 * Logs out and resets to guest mode
 */
export async function logoutUser() {
  try {
    await api.post('/auth/logout', {});
  } catch (err) {
    console.warn('Logout notification error:', err.message);
  } finally {
    setAuthToken(null);
    const guestUser = {
      id: 'guest-user-001',
      name: 'Guest User',
      email: 'guest@frontpage.local',
      is_guest: 1,
    };
    setCurrentUser(guestUser);
    resetToGuestSampleLibrary();
    notifyAuthChange(guestUser, true);
    showToast('You have been signed out. Continuing in Guest mode.', 'info');
  }
}

/**
 * Requests password reset
 */
export async function requestPasswordReset(email, newPassword = '') {
  const res = await api.post('/auth/reset-password', { email, newPassword });
  if (res && res.success) {
    return res.message;
  }
  throw new Error(res?.error?.message || 'Could not reset password.');
}
