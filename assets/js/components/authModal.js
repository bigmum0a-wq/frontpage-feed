// assets/js/components/authModal.js
import { loginUser, registerUser, requestPasswordReset, isGuestUser, getCurrentUser } from '../services/authService.js';
import { showToast } from './toast.js';

let modalElement = null;

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function openAuthModal({ initialTab = 'login', onComplete = null } = {}) {
  closeAuthModal();

  modalElement = document.createElement('div');
  modalElement.className = 'auth-modal-overlay';
  modalElement.setAttribute('role', 'dialog');
  modalElement.setAttribute('aria-modal', 'true');
  modalElement.setAttribute('aria-labelledby', 'auth-modal-title');

  modalElement.innerHTML = `
    <div class="auth-modal-dialog">
      <div class="auth-modal-header">
        <div class="auth-logo">
          <img src="assets/icons/fontpage-logo.svg" alt="" width="32" height="32">
          <span class="auth-brand">FrontPage</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm auth-modal-close" aria-label="Close dialog">✕</button>
      </div>

      <div class="auth-modal-tabs" role="tablist">
        <button type="button" class="auth-tab-btn ${initialTab === 'login' ? 'is-active' : ''}" data-tab="login" role="tab" aria-selected="${initialTab === 'login'}">Sign In</button>
        <button type="button" class="auth-tab-btn ${initialTab === 'register' ? 'is-active' : ''}" data-tab="register" role="tab" aria-selected="${initialTab === 'register'}">Create Account</button>
        <button type="button" class="auth-tab-btn ${initialTab === 'reset' ? 'is-active' : ''}" data-tab="reset" role="tab" aria-selected="${initialTab === 'reset'}">Reset</button>
      </div>

      <div class="auth-modal-body">
        <!-- LOGIN TAB -->
        <form id="auth-login-form" class="auth-form ${initialTab !== 'login' ? 'is-hidden' : ''}">
          <h2 id="auth-modal-title" class="auth-heading">Welcome Back</h2>
          <p class="auth-subheading">Sign in to sync your feeds, reading history and custom categories.</p>

          <div class="auth-field">
            <label for="login-email">Email Address</label>
            <input type="email" id="login-email" required placeholder="you@domain.com" autocomplete="email">
          </div>

          <div class="auth-field">
            <div class="auth-label-row">
              <label for="login-password">Password</label>
              <button type="button" class="btn-link-subtle switch-to-reset">Forgot?</button>
            </div>
            <input type="password" id="login-password" required placeholder="••••••••" autocomplete="current-password">
          </div>

          <button type="submit" class="btn btn-primary auth-submit-btn">Sign In</button>
        </form>

        <!-- REGISTER TAB -->
        <form id="auth-register-form" class="auth-form ${initialTab !== 'register' ? 'is-hidden' : ''}">
          <h2 class="auth-heading">Create your FrontPage</h2>
          <p class="auth-subheading">Save custom feeds, configure AI digests and sync across your devices.</p>

          <div class="auth-field">
            <label for="register-name">Full Name</label>
            <input type="text" id="register-name" required placeholder="Jane Developer" autocomplete="name">
          </div>

          <div class="auth-field">
            <label for="register-email">Email Address</label>
            <input type="email" id="register-email" required placeholder="you@domain.com" autocomplete="email">
          </div>

          <div class="auth-field">
            <label for="register-password">Password</label>
            <input type="password" id="register-password" required minlength="6" placeholder="At least 6 characters" autocomplete="new-password">
          </div>

          <button type="submit" class="btn btn-primary auth-submit-btn">Create Account</button>
        </form>

        <!-- RESET TAB -->
        <form id="auth-reset-form" class="auth-form ${initialTab !== 'reset' ? 'is-hidden' : ''}">
          <h2 class="auth-heading">Reset Password</h2>
          <p class="auth-subheading">Enter your email and a new password to recover access to your account.</p>

          <div class="auth-field">
            <label for="reset-email">Email Address</label>
            <input type="email" id="reset-email" required placeholder="you@domain.com">
          </div>

          <div class="auth-field">
            <label for="reset-new-password">New Password</label>
            <input type="password" id="reset-new-password" required minlength="6" placeholder="New password (min 6 characters)">
          </div>

          <button type="submit" class="btn btn-primary auth-submit-btn">Update Password</button>
        </form>
      </div>

      <div class="auth-modal-footer">
        <span class="auth-guest-hint">Just exploring?</span>
        <button type="button" class="btn btn-ghost btn-sm btn-continue-guest">Try as Guest →</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalElement);

  // Tab switching logic
  const tabBtns = modalElement.querySelectorAll('.auth-tab-btn');
  const forms = {
    login: modalElement.querySelector('#auth-login-form'),
    register: modalElement.querySelector('#auth-register-form'),
    reset: modalElement.querySelector('#auth-reset-form'),
  };

  function switchTab(tabName) {
    tabBtns.forEach((btn) => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    Object.keys(forms).forEach((key) => {
      forms[key].classList.toggle('is-hidden', key !== tabName);
    });
    const firstInput = forms[tabName]?.querySelector('input');
    firstInput?.focus();
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  modalElement.querySelector('.switch-to-reset')?.addEventListener('click', () => {
    switchTab('reset');
  });

  // Close handlers
  modalElement.querySelector('.auth-modal-close')?.addEventListener('click', closeAuthModal);
  modalElement.querySelector('.btn-continue-guest')?.addEventListener('click', () => {
    closeAuthModal();
    showToast('Browsing in Guest mode. Your settings are active for this session.', 'info');
  });

  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) closeAuthModal();
  });

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closeAuthModal();
  };
  window.addEventListener('keydown', onKeyDown, { once: true });

  // Handle Login submission
  forms.login.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = modalElement.querySelector('#login-email').value.trim();
    const password = modalElement.querySelector('#login-password').value;
    const btn = forms.login.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const user = await loginUser({ email, password });
      closeAuthModal();
      if (onComplete) onComplete(user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Handle Register submission
  forms.register.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = modalElement.querySelector('#register-name').value.trim();
    const email = modalElement.querySelector('#register-email').value.trim();
    const password = modalElement.querySelector('#register-password').value;
    const btn = forms.register.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const user = await registerUser({ name, email, password });
      closeAuthModal();
      if (onComplete) onComplete(user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  // Handle Reset submission
  forms.reset.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = modalElement.querySelector('#reset-email').value.trim();
    const newPassword = modalElement.querySelector('#reset-new-password').value;
    const btn = forms.reset.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
      const msg = await requestPasswordReset(email, newPassword);
      showToast(msg, 'success');
      switchTab('login');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });

  // Initial focus
  forms[initialTab]?.querySelector('input')?.focus();
}

export function closeAuthModal() {
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
  }
}
