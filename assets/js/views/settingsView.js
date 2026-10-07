import { setFeedLayout, state } from '../state.js';
import {
  ACCENT_PALETTE,
  calculateStorageUsage,
  clearCache,
  defaultPreferences,
  loadPreferences,
  resetPreferences,
  savePreferences,
} from '../services/preferences.js';
import { showToast } from '../components/toast.js';
import { initialiseRulesView } from './rulesView.js';
import { getCurrentUser, isGuestUser, logoutUser } from '../services/authService.js';
import { openAuthModal } from '../components/authModal.js';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function applyAccentColor(accentColor) {
  const paletteMatch = ACCENT_PALETTE.find((item) => item.color === accentColor) || ACCENT_PALETTE[0];
  document.documentElement.style.setProperty('--color-accent', paletteMatch.color);
  document.documentElement.style.setProperty('--color-accent-hover', paletteMatch.hover);
  document.documentElement.style.setProperty('--color-accent-subtle', paletteMatch.subtle);
  document.documentElement.dataset.accent = paletteMatch.id;
}

function applyPreferenceAttributes(preferences) {
  applyTheme(preferences.theme);
  applyAccentColor(preferences.accentColor);
  document.documentElement.dataset.textSize = preferences.textSize;
  document.documentElement.dataset.readerFont = preferences.readerFont;
  document.documentElement.dataset.displayDensity = preferences.displayDensity;
  document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
  document.documentElement.dataset.highContrast = String(preferences.highContrast);
  document.documentElement.dataset.emphasizeUnread = String(preferences.emphasizeUnread);
  document.documentElement.dataset.visualIndicators = String(preferences.visualIndicators);
  document.documentElement.dataset.readerLineHeight = preferences.readerLineHeight;
  document.documentElement.dataset.readerColumnWidth = preferences.readerColumnWidth;

  const userName = document.querySelector('#user-name');
  const profileButton = document.querySelector('.user-profile');
  const visibleName = preferences.userName?.trim() || 'Junior';

  if (userName) userName.textContent = visibleName;
  profileButton?.setAttribute('aria-label', `Open ${visibleName}'s profile settings`);
}

export function applySavedPreferences() {
  const preferences = loadPreferences();
  setFeedLayout(preferences.feedLayout);
  applyPreferenceAttributes(preferences);
  return preferences;
}

const FONT_FAMILIES = {
  serif: "'Georgia', 'Charter', serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  opendyslexic: "'OpenDyslexic', 'Comic Sans MS', sans-serif",
};

const TEXT_SIZES = {
  small: '0.875rem',
  normal: '1rem',
  large: '1.125rem',
  xlarge: '1.25rem',
};

const LINE_HEIGHTS = {
  tight: '1.3',
  normal: '1.5',
  loose: '1.8',
};

const COLUMN_WIDTHS = {
  narrow: '38rem',
  medium: '45rem',
  wide: '54rem',
};

function updateReaderPreview() {
  const previewBox = document.querySelector('#reader-preview-box');
  const fontSelect = document.querySelector('#settings-reader-font');
  const sizeSelect = document.querySelector('#settings-text-size');
  const lineSelect = document.querySelector('#settings-line-height');
  const widthSelect = document.querySelector('#settings-column-width');

  if (!previewBox) return;

  const font = fontSelect ? fontSelect.value : 'serif';
  const size = sizeSelect ? sizeSelect.value : 'normal';
  const line = lineSelect ? lineSelect.value : 'normal';
  const width = widthSelect ? widthSelect.value : 'medium';

  previewBox.style.fontFamily = FONT_FAMILIES[font] || FONT_FAMILIES.serif;
  previewBox.style.fontSize = TEXT_SIZES[size] || TEXT_SIZES.normal;
  previewBox.style.lineHeight = LINE_HEIGHTS[line] || LINE_HEIGHTS.normal;
  previewBox.style.maxWidth = COLUMN_WIDTHS[width] || COLUMN_WIDTHS.medium;
}

function updateStorageDisplay() {
  const usageText = document.querySelector('#storage-usage-text');
  const barFill = document.querySelector('#storage-bar-fill');
  if (usageText) {
    const usage = calculateStorageUsage();
    usageText.textContent = usage;
    if (barFill) {
      const num = parseFloat(usage);
      const percent = Math.min(100, Math.max(5, (num / 5120) * 100));
      barFill.style.width = `${percent.toFixed(1)}%`;
    }
  }
}

function renderAccentPalette(selectedColor, onSelect) {
  const container = document.querySelector('#accent-palette-container');
  if (!container) return;

  container.innerHTML = '';
  ACCENT_PALETTE.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `accent-swatch${item.color.toLowerCase() === selectedColor.toLowerCase() ? ' is-active' : ''}`;
    button.setAttribute('aria-label', `Select ${item.name}`);
    button.style.backgroundColor = item.color;

    const checkmark = document.createElement('span');
    checkmark.className = 'accent-check';
    checkmark.textContent = '✓';
    button.appendChild(checkmark);

    button.addEventListener('click', () => {
      container.querySelectorAll('.accent-swatch').forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      applyAccentColor(item.color);
      onSelect(item.color);
    });

    container.appendChild(button);
  });
}

function generateOpmlContent() {
  const categoriesMap = new Map();

  state.categories.forEach((cat) => {
    categoriesMap.set(cat.id, {
      name: cat.name,
      feeds: [],
    });
  });

  state.feeds.forEach((feed) => {
    const cat = categoriesMap.get(feed.categoryId);
    if (cat) {
      cat.feeds.push(feed);
    } else {
      if (!categoriesMap.has('uncategorized')) {
        categoriesMap.set('uncategorized', { name: 'Uncategorized', feeds: [] });
      }
      categoriesMap.get('uncategorized').feeds.push(feed);
    }
  });

  let outlines = '';
  categoriesMap.forEach((category) => {
    if (category.feeds.length > 0) {
      outlines += `    <outline text="${category.name}" title="${category.name}">\n`;
      category.feeds.forEach((feed) => {
        outlines += `      <outline type="rss" text="${feed.name}" title="${feed.name}" xmlUrl="https://example.com/feed/${feed.id}" htmlUrl="https://example.com/${feed.id}"/>\n`;
      });
      outlines += `    </outline>\n`;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Frontpage Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}  </body>
</opml>`;
}

export function initialiseSettingsView() {
  const form = document.querySelector('#settings-form');
  const preferences = applySavedPreferences();
  let currentAccentColor = preferences.accentColor;
  const connectedIntegrations = {
    pocket: preferences.pocketConnected,
    instapaper: preferences.instapaperConnected,
    readwise: preferences.readwiseConnected,
    raindrop: preferences.raindropConnected,
  };

  // 1. Appearance & UI
  renderAccentPalette(currentAccentColor, (color) => {
    currentAccentColor = color;
  });

  form?.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === preferences.theme;
    input.addEventListener('change', () => applyTheme(input.value));
  });

  const feedLayoutSelect = document.querySelector('#settings-feed-layout');
  const densitySelect = document.querySelector('#settings-density');
  const readerFontSelect = document.querySelector('#settings-reader-font');
  const textSizeSelect = document.querySelector('#settings-text-size');
  const lineHeightSelect = document.querySelector('#settings-line-height');
  const columnWidthSelect = document.querySelector('#settings-column-width');

  if (feedLayoutSelect) feedLayoutSelect.value = preferences.feedLayout;
  if (densitySelect) densitySelect.value = preferences.displayDensity;
  if (readerFontSelect) readerFontSelect.value = preferences.readerFont;
  if (textSizeSelect) textSizeSelect.value = preferences.textSize;
  if (lineHeightSelect) lineHeightSelect.value = preferences.readerLineHeight;
  if (columnWidthSelect) columnWidthSelect.value = preferences.readerColumnWidth;

  [readerFontSelect, textSizeSelect, lineHeightSelect, columnWidthSelect].forEach((el) => {
    el?.addEventListener('change', updateReaderPreview);
  });
  updateReaderPreview();

  // 2. Flux & Synchronisation
  const refreshSelect = document.querySelector('#settings-refresh');
  const wifiOnlyInput = document.querySelector('#settings-wifi-only');
  const markReadSelect = document.querySelector('#settings-mark-read');
  const unreadInput = document.querySelector('#settings-unread');
  const filterDuplicatesInput = document.querySelector('#settings-filter-duplicates');
  const autoPurgeSelect = document.querySelector('#settings-auto-purge');

  if (refreshSelect) refreshSelect.value = preferences.refreshInterval;
  if (wifiOnlyInput) wifiOnlyInput.checked = preferences.wifiOnlySync;
  if (markReadSelect) markReadSelect.value = preferences.markReadOn;
  if (unreadInput) unreadInput.checked = preferences.emphasizeUnread;
  if (filterDuplicatesInput) filterDuplicatesInput.checked = preferences.filterDuplicates;
  if (autoPurgeSelect) autoPurgeSelect.value = preferences.autoPurgeDays;

  // 3. Import, Export & Données
  updateStorageDisplay();

  const exportOpmlBtn = document.querySelector('#opml-export-btn');
  exportOpmlBtn?.addEventListener('click', () => {
    const opmlData = generateOpmlContent();
    const blob = new Blob([opmlData], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frontpage-feeds.opml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('OPML export downloaded successfully.', 'success');
  });

  const opmlFileInput = document.querySelector('#opml-file-input');
  const opmlStatus = document.querySelector('#opml-import-status');
  opmlFileInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const outlines = doc.querySelectorAll('outline[xmlUrl], outline[xmlurl]');
        const count = outlines.length;

        if (count > 0) {
          if (opmlStatus) opmlStatus.textContent = `${count} feeds found in "${file.name}"`;
          showToast(`${count} feeds imported from ${file.name}.`, 'success');
        } else {
          if (opmlStatus) opmlStatus.textContent = 'No valid feeds were found in this file.';
          showToast('No XML or RSS feeds were found in this OPML file.', 'warning');
        }
      } catch {
        showToast('Could not read the OPML file.', 'error');
      }
    };
    reader.readAsText(file);
  });

  const clearCacheBtn = document.querySelector('#clear-cache-btn');
  clearCacheBtn?.addEventListener('click', () => {
    if (confirm('Do you really want to clear the article cache?')) {
      clearCache();
      updateStorageDisplay();
      showToast('Article cache cleared.', 'info');
    }
  });

  // 4. Intégrations
  document.querySelectorAll('.btn-connect').forEach((button) => {
    const serviceName = button.dataset.service;
    const isConnected = Boolean(connectedIntegrations[serviceName]);

    button.classList.toggle('is-connected', isConnected);
    button.textContent = isConnected ? 'Connected ✓' : 'Connect';
    button.addEventListener('click', () => {
      const nextConnectionState = !button.classList.contains('is-connected');

      connectedIntegrations[serviceName] = nextConnectionState;
      if (!nextConnectionState) {
        button.classList.remove('is-connected');
        button.textContent = 'Connect';
        showToast(`Disconnected from ${serviceName}.`, 'info');
      } else {
        button.classList.add('is-connected');
        button.textContent = 'Connected ✓';
        showToast(`Connected to ${serviceName}.`, 'success');
      }
    });
  });

  const copyNewsletterBtn = document.querySelector('#copy-newsletter-btn');
  const newsletterInput = document.querySelector('#newsletter-address-input');
  if (newsletterInput) newsletterInput.value = preferences.newsletterAddress;
  copyNewsletterBtn?.addEventListener('click', () => {
    if (newsletterInput) {
      navigator.clipboard?.writeText(newsletterInput.value).then(() => {
        showToast('Newsletter address copied to the clipboard.', 'success');
      }).catch(() => {
        newsletterInput.select();
        document.execCommand('copy');
        showToast('Newsletter address copied.', 'success');
      });
    }
  });

  // 5. IA & Synthèse
  const aiSummaryToggle = document.querySelector('#settings-ai-summary');
  const aiStyleSelect = document.querySelector('#settings-ai-style');
  const digestTimeInput = document.querySelector('#settings-digest-time');
  const customDigestTimeField = document.querySelector('#settings-custom-digest-time-field');
  const customDigestTimeInput = document.querySelector('#settings-custom-digest-time');

  if (aiSummaryToggle) aiSummaryToggle.checked = preferences.enableAiSummary;
  if (aiStyleSelect) aiStyleSelect.value = preferences.aiSummaryStyle;
  if (digestTimeInput) {
    const savedTimeIsPreset = [...digestTimeInput.options].some((option) => option.value === preferences.digestTime);

    digestTimeInput.value = savedTimeIsPreset ? preferences.digestTime : 'custom';
    customDigestTimeField.hidden = digestTimeInput.value !== 'custom';
    if (customDigestTimeInput) customDigestTimeInput.value = savedTimeIsPreset ? '08:00' : preferences.digestTime;
    digestTimeInput.addEventListener('change', () => {
      customDigestTimeField.hidden = digestTimeInput.value !== 'custom';
    });
  }
  form?.querySelectorAll('input[name="digest-cat"]').forEach((input) => {
    input.checked = preferences.digestPriorityCategories.includes(input.value);
  });

  // 6. Raccourcis & Accessibilité
  const vimShortcutsToggle = document.querySelector('#settings-vim-shortcuts');
  const highContrastToggle = document.querySelector('#settings-high-contrast');
  const reducedMotionToggle = document.querySelector('#settings-reduced-motion');
  const visualIndicatorsToggle = document.querySelector('#settings-visual-indicators');

  if (vimShortcutsToggle) vimShortcutsToggle.checked = preferences.vimShortcuts;
  if (highContrastToggle) {
    highContrastToggle.checked = preferences.highContrast;
    highContrastToggle.addEventListener('change', () => {
      document.documentElement.dataset.highContrast = String(highContrastToggle.checked);
    });
  }
  if (reducedMotionToggle) {
    reducedMotionToggle.checked = preferences.reducedMotion;
    reducedMotionToggle.addEventListener('change', () => {
      document.documentElement.dataset.reducedMotion = String(reducedMotionToggle.checked);
    });
  }
  if (visualIndicatorsToggle) {
    visualIndicatorsToggle.checked = preferences.visualIndicators;
    visualIndicatorsToggle.addEventListener('change', () => {
      document.documentElement.dataset.visualIndicators = String(visualIndicatorsToggle.checked);
    });
  }

  // 7. Notifications
  const requestPushBtn = document.querySelector('#request-push-btn');
  const pushStatusDot = document.querySelector('#push-status-dot');
  const pushStatusLabel = document.querySelector('#push-status-label');
  const keywordsInput = document.querySelector('#settings-keywords');
  const emailDigestToggle = document.querySelector('#settings-email-digest');

  if (keywordsInput) keywordsInput.value = preferences.notifyKeywords;
  if (emailDigestToggle) emailDigestToggle.checked = preferences.emailDigest;

  Object.entries(preferences.shareServices).forEach(([service, enabled]) => {
    const input = document.querySelector(`#share-${service}`);
    if (input) input.checked = enabled;
  });

  function updateNotificationState() {
    if (!('Notification' in window)) {
      if (pushStatusLabel) pushStatusLabel.textContent = 'Not supported by this browser';
      return;
    }
    if (Notification.permission === 'granted') {
      pushStatusDot?.classList.remove('status-inactive');
      pushStatusDot?.classList.add('status-active');
      if (pushStatusLabel) pushStatusLabel.textContent = 'Desktop notifications allowed';
      if (requestPushBtn) requestPushBtn.disabled = true;
    } else if (Notification.permission === 'denied') {
      if (pushStatusLabel) pushStatusLabel.textContent = 'Notifications denied by the user';
    } else {
      if (pushStatusLabel) pushStatusLabel.textContent = 'Permission required';
    }
  }
  updateNotificationState();

  requestPushBtn?.addEventListener('click', () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        updateNotificationState();
        if (permission === 'granted') {
          showToast('Desktop notifications allowed.', 'success');
        } else {
          showToast('Notification permission was denied.', 'warning');
        }
      });
    } else {
      showToast('This browser does not support notifications.', 'error');
    }
  });

  // Reset to Defaults Button
  const resetBtn = document.querySelector('#settings-reset-btn');
  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset all preferences to their default values?')) {
      resetPreferences();
      const settingsView = document.querySelector('#settings-view');
      const template = document.querySelector('#settings-template');

      settingsView?.replaceWith(template.content.cloneNode(true));
      initialiseSettingsView();
      showToast('All preferences have been reset.', 'info');
    }
  });

  // Form Submit / Save
  form?.addEventListener('submit', (event) => {
    event.preventDefault();

    const chosenTheme = form.querySelector('input[name="theme"]:checked')?.value ?? 'system';
    const chosenPriorityCategories = Array.from(
      form.querySelectorAll('input[name="digest-cat"]:checked'),
    ).map((cb) => cb.value);

    const nextPreferences = {
      theme: chosenTheme,
      accentColor: currentAccentColor,
      feedLayout: feedLayoutSelect?.value || 'list',
      displayDensity: densitySelect?.value || 'comfortable',
      readerFont: readerFontSelect?.value || 'serif',
      textSize: textSizeSelect?.value || 'normal',
      readerLineHeight: lineHeightSelect?.value || 'normal',
      readerColumnWidth: columnWidthSelect?.value || 'medium',

      refreshInterval: refreshSelect?.value || 'manual',
      wifiOnlySync: wifiOnlyInput ? wifiOnlyInput.checked : false,
      markReadOn: markReadSelect?.value || 'open',
      emphasizeUnread: unreadInput ? unreadInput.checked : true,
      filterDuplicates: filterDuplicatesInput ? filterDuplicatesInput.checked : true,
      autoPurgeDays: autoPurgeSelect?.value || '30',

      enableAiSummary: aiSummaryToggle ? aiSummaryToggle.checked : true,
      aiSummaryStyle: aiStyleSelect?.value || 'keypoints',
      digestTime: digestTimeInput?.value === 'custom'
        ? (customDigestTimeInput?.value || '08:00')
        : (digestTimeInput?.value || '08:00'),
      digestPriorityCategories: chosenPriorityCategories,

      vimShortcuts: vimShortcutsToggle ? vimShortcutsToggle.checked : true,
      highContrast: highContrastToggle ? highContrastToggle.checked : false,
      reducedMotion: reducedMotionToggle ? reducedMotionToggle.checked : false,
      visualIndicators: visualIndicatorsToggle ? visualIndicatorsToggle.checked : false,

      userName: preferences.userName,
      userEmail: preferences.userEmail,

      notifyKeywords: keywordsInput?.value || '',
      emailDigest: emailDigestToggle ? emailDigestToggle.checked : false,
      newsletterAddress: newsletterInput?.value || defaultPreferences.newsletterAddress,
      pocketConnected: Boolean(connectedIntegrations.pocket),
      instapaperConnected: Boolean(connectedIntegrations.instapaper),
      readwiseConnected: Boolean(connectedIntegrations.readwise),
      raindropConnected: Boolean(connectedIntegrations.raindrop),
      shareServices: {
        twitter: document.querySelector('#share-twitter')?.checked ?? false,
        mastodon: document.querySelector('#share-mastodon')?.checked ?? false,
        linkedin: document.querySelector('#share-linkedin')?.checked ?? false,
        email: document.querySelector('#share-email')?.checked ?? false,
        copy: document.querySelector('#share-copy')?.checked ?? false,
      },
    };

    setFeedLayout(nextPreferences.feedLayout);
    applyPreferenceAttributes(nextPreferences);
    savePreferences(nextPreferences);

    showToast('Settings saved successfully.', 'success');
  });

  // Initialize Smart Filters & Automatic Rules Manager
  const rulesContainer = document.querySelector('#settings-rules-container');
  if (rulesContainer) {
    initialiseRulesView(rulesContainer);
  }

  // Initialize Account & Cloud Sync controls
  const accountStatusName = document.querySelector('#settings-account-status-name');
  const accountStatusTag = document.querySelector('#settings-account-status-tag');
  const accountPerks = document.querySelector('#settings-account-perks');
  const authActionBtn = document.querySelector('#settings-auth-action-btn');

  function updateSettingsAccount() {
    const user = getCurrentUser();
    const isGuest = isGuestUser();

    if (isGuest) {
      if (accountStatusName) accountStatusName.textContent = 'Guest Session (Local)';
      if (accountStatusTag) accountStatusTag.textContent = 'Unsynced';
      if (accountPerks) accountPerks.textContent = 'Your feeds and bookmarks are stored in this browser only. Sign in to back up your library to the SQLite database.';
      if (authActionBtn) {
        authActionBtn.textContent = 'Sign In / Create Account';
        authActionBtn.onclick = () => openAuthModal({ onComplete: () => updateSettingsAccount() });
      }
    } else {
      if (accountStatusName) accountStatusName.textContent = `Connected: ${user?.name || 'User'}`;
      if (accountStatusTag) accountStatusTag.textContent = 'Cloud Synced ✓';
      if (accountPerks) accountPerks.textContent = `All feeds and bookmarks are saved under ${user?.email || 'your account'}.`;
      if (authActionBtn) {
        authActionBtn.textContent = 'Sign Out';
        authActionBtn.onclick = () => {
          if (confirm('Are you sure you want to sign out? You will return to Guest mode.')) {
            logoutUser();
            updateSettingsAccount();
          }
        };
      }
    }
  }

  updateSettingsAccount();
}
