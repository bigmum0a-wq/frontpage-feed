// assets/js/views/profileView.js
import { state, toggleArticleSaved } from '../state.js';
import { loadPreferences, savePreferences } from '../services/preferences.js';
import { getCurrentUser, isGuestUser, logoutUser } from '../services/authService.js';
import { openAuthModal } from '../components/authModal.js';
import { openArticleReader } from '../components/reader.js';
import { api } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

function activityDates(dayCount = 84) {
  const dates = [];
  const today = new Date();

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dates.push(date);
  }

  return dates;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function activityLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export function initialiseProfileView() {
  const user = getCurrentUser() || {};
  const isGuest = isGuestUser();
  const preferences = loadPreferences();

  const displayName = user.name?.trim() || preferences.userName?.trim() || (isGuest ? 'Guest User' : 'Reader');
  const email = user.email || (isGuest ? 'guest@frontpage.local' : 'user@example.com');
  const handle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}`;

  // 1. Header & Identity
  const nameEl = document.querySelector('#profile-name');
  const handleEl = document.querySelector('#profile-handle');
  const emailEl = document.querySelector('#profile-email');
  const avatarEl = document.querySelector('#profile-avatar');
  const badgeEl = document.querySelector('#profile-status-badge');
  const authBtn = document.querySelector('#profile-auth-action-btn');
  const editNameBtn = document.querySelector('#profile-edit-name-btn');

  if (nameEl) nameEl.textContent = displayName;
  if (handleEl) handleEl.textContent = handle;
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

  if (badgeEl) {
    if (isGuest) {
      badgeEl.textContent = 'Guest Session · Local';
      badgeEl.className = 'profile-status-badge badge-warning';
    } else {
      badgeEl.textContent = '✓ Cloud Synced Account';
      badgeEl.className = 'profile-status-badge badge-success';
    }
  }

  if (authBtn) {
    if (isGuest) {
      authBtn.textContent = 'Sign In / Register';
      authBtn.className = 'btn btn-sm btn-primary';
      authBtn.onclick = () => openAuthModal({
        initialTab: 'login',
        onComplete: () => initialiseProfileView(),
      });
    } else {
      authBtn.textContent = 'Sign Out';
      authBtn.className = 'btn btn-sm btn-ghost';
      authBtn.onclick = () => {
        if (confirm('Are you sure you want to sign out? You will return to Guest mode.')) {
          logoutUser();
          initialiseProfileView();
        }
      };
    }
  }

  // Edit Name button
  if (editNameBtn) {
    editNameBtn.onclick = async () => {
      const newName = prompt('Enter your display name:', displayName);
      if (newName && newName.trim() && newName.trim() !== displayName) {
        const cleanName = newName.trim();
        try {
          await api.put('/users/profile', { name: cleanName });
          preferences.userName = cleanName;
          savePreferences(preferences);

          if (user) {
            user.name = cleanName;
            localStorage.setItem('frontpage_current_user', JSON.stringify(user));
          }

          initialiseProfileView();
          const headerUserName = document.querySelector('#user-name');
          if (headerUserName) headerUserName.textContent = cleanName;

          showToast('Profile name updated!', 'success');
        } catch (err) {
          showToast(`Could not update name: ${err.message}`, 'error');
        }
      }
    };
  }

  // 2. Cloud Sync Card
  const cloudDesc = document.querySelector('#profile-cloud-desc');
  const cloudCtaContainer = document.querySelector('#profile-cloud-cta-container');

  if (cloudDesc && cloudCtaContainer) {
    if (isGuest) {
      cloudDesc.textContent = 'You are currently browsing as a guest. Subscriptions, reading streaks, and saved bookmarks are kept in this browser only.';
      cloudCtaContainer.innerHTML = `
        <button type="button" class="btn btn-sm btn-primary btn-cloud-signup">
          Save &amp; Sync Account →
        </button>
      `;
      cloudCtaContainer.querySelector('.btn-cloud-signup')?.addEventListener('click', () => {
        openAuthModal({ initialTab: 'register', onComplete: () => initialiseProfileView() });
      });
    } else {
      cloudDesc.textContent = `All feeds, reading activity, and custom categories are synced to your account (${email}).`;
      cloudCtaContainer.innerHTML = `
        <span class="cloud-synced-pill">🟢 Cloud Synced</span>
      `;
    }
  }

  // 3. Reading Statistics
  const dates = activityDates();
  const activity = state.readingActivity || {};
  const totalReads = Object.values(activity).reduce((total, count) => total + count, 0);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const monthlyStart = new Date(today);
  monthlyStart.setDate(today.getDate() - 29);
  const readsSince = (startDate) => dates
    .filter((date) => date >= startDate)
    .reduce((total, date) => total + (activity[toDateKey(date)] ?? 0), 0);

  const savedArticles = state.articles.filter((article) => article.isSaved);

  const feedCountEl = document.querySelector('#profile-feed-count');
  const savedCountEl = document.querySelector('#profile-saved-count');
  const weekCountEl = document.querySelector('#profile-week-count');
  const monthCountEl = document.querySelector('#profile-month-count');
  const totalCountEl = document.querySelector('#profile-total-count');
  const activityTotalEl = document.querySelector('#profile-activity-total');

  if (feedCountEl) feedCountEl.textContent = state.feeds.length;
  if (savedCountEl) savedCountEl.textContent = savedArticles.length;
  if (weekCountEl) weekCountEl.textContent = readsSince(weekStart);
  if (monthCountEl) monthCountEl.textContent = readsSince(monthlyStart);
  if (totalCountEl) totalCountEl.textContent = totalReads;
  if (activityTotalEl) activityTotalEl.textContent = `${totalReads} article${totalReads === 1 ? '' : 's'} read in the last 12 weeks`;

  // 4. Activity Heatmap Grid
  const grid = document.querySelector('#reading-activity-grid');
  if (grid) {
    grid.replaceChildren(...dates.map((date) => {
      const count = activity[toDateKey(date)] ?? 0;
      const cell = document.createElement('span');

      cell.className = `activity-cell activity-level-${activityLevel(count)}`;
      cell.title = `${formatDate(date)}: ${count} article${count === 1 ? '' : 's'} read`;
      cell.setAttribute('aria-label', cell.title);
      return cell;
    }));
  }

  // 5. Saved Articles List (Interactive Bookmarks Library)
  const savedListContainer = document.querySelector('#profile-saved-articles-list');
  if (savedListContainer) {
    if (savedArticles.length === 0) {
      savedListContainer.innerHTML = `
        <div class="profile-empty-saved">
          <span class="empty-icon">🔖</span>
          <p>No saved articles yet.</p>
          <small>Click the bookmark icon on any article in your feeds to access it here anytime.</small>
        </div>
      `;
    } else {
      savedListContainer.innerHTML = '';
      savedArticles.forEach((article) => {
        const item = document.createElement('div');
        item.className = 'profile-saved-item';

        const feed = state.feeds.find((f) => f.id === article.feedId);
        const feedName = feed?.name || 'Feed';
        const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';

        item.innerHTML = `
          <div class="saved-item-main">
            <span class="saved-feed-badge">${feedName}</span>
            <h3 class="saved-item-title">${article.title}</h3>
            <span class="saved-item-date">${dateStr}</span>
          </div>
          <div class="saved-item-actions">
            <button type="button" class="btn btn-sm btn-secondary btn-read-saved" aria-label="Read article">Read</button>
            <button type="button" class="btn btn-sm btn-ghost btn-remove-saved" aria-label="Remove from saved">✕</button>
          </div>
        `;

        item.querySelector('.btn-read-saved')?.addEventListener('click', () => {
          openArticleReader(article);
        });

        item.querySelector('.saved-item-title')?.addEventListener('click', () => {
          openArticleReader(article);
        });

        item.querySelector('.btn-remove-saved')?.addEventListener('click', () => {
          toggleArticleSaved(article.id);
          initialiseProfileView();
          showToast('Removed from saved bookmarks.', 'info');
        });

        savedListContainer.appendChild(item);
      });
    }
  }
}
