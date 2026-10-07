const PREFERENCES_KEY = 'frontpage-preferences';

export const ACCENT_PALETTE = [
  { id: 'blue', name: 'Royal Blue', color: '#2563eb', hover: '#1d4ed8', subtle: '#eff6ff', darkSubtle: '#1a2332' },
  { id: 'emerald', name: 'Emerald', color: '#059669', hover: '#047857', subtle: '#ecfdf5', darkSubtle: '#062d22' },
  { id: 'violet', name: 'Deep Violet', color: '#7c3aed', hover: '#6d28d9', subtle: '#f5f3ff', darkSubtle: '#22153b' },
  { id: 'rose', name: 'Bright Rose', color: '#e11d48', hover: '#be123c', subtle: '#fff1f2', darkSubtle: '#3b1219' },
  { id: 'amber', name: 'Warm Amber', color: '#d97706', hover: '#b45309', subtle: '#fffbeb', darkSubtle: '#362005' },
  { id: 'cyan', name: 'Electric Cyan', color: '#0891b2', hover: '#0e7490', subtle: '#ecfeff', darkSubtle: '#082b33' },
];

export const defaultPreferences = {
  // 1. Language & Locale
  language: 'en', // 'en' | 'fr'

  // 2. Appearance & Interface
  theme: 'system', // 'system' | 'light' | 'dark'
  accentColor: '#2563eb',
  feedLayout: 'list', // 'list' | 'grid' | 'magazine' | 'split'
  displayDensity: 'comfortable', // 'comfortable' | 'compact' | 'dense'
  readerFont: 'serif', // 'sans' | 'serif' | 'mono' | 'opendyslexic'
  textSize: 'normal', // 'small' | 'normal' | 'large' | 'xlarge'
  readerLineHeight: 'normal', // 'tight' | 'normal' | 'loose'
  readerColumnWidth: 'medium', // 'narrow' | 'medium' | 'wide'

  // 2. Gestion des flux & Sync
  refreshInterval: 'manual', // '15' | '30' | '60' | 'manual'
  wifiOnlySync: false,
  markReadOn: 'open', // 'open' | 'scroll'
  filterDuplicates: true,
  autoPurgeDays: '30', // '7' | '30' | '90' | 'never'

  // 3. Import & Données
  // (Données gérées via storage)

  // 4. Intégrations & Services
  pocketConnected: false,
  instapaperConnected: false,
  readwiseConnected: false,
  raindropConnected: false,
  shareServices: {
    twitter: true,
    mastodon: true,
    linkedin: false,
    email: true,
    copy: true,
  },
  newsletterAddress: 'junior.reader@frontpage.app',

  // 5. IA & Synthèse
  enableAiSummary: true,
  aiSummaryStyle: 'keypoints', // 'short' | 'keypoints' | 'analytical'
  digestTime: '08:00',
  digestPriorityCategories: ['frontend', 'design', 'ai-ml'],

  // 6. Raccourcis & Accessibilité
  vimShortcuts: true,
  highContrast: false,
  reducedMotion: false,
  emphasizeUnread: true,
  visualIndicators: false,

  // 7. Compte & Sécurité
  userName: 'Junior',
  userEmail: 'junior@example.com',
  accountType: 'guest', // 'guest' | 'free' | 'pro'

  // 8. Notifications
  browserNotifications: false,
  notifyKeywords: '',
  emailDigest: false,
};

export function loadPreferences() {
  try {
    const saved = window.localStorage.getItem(PREFERENCES_KEY);
    if (!saved) return { ...defaultPreferences };

    const parsed = JSON.parse(saved);
    return {
      ...defaultPreferences,
      ...parsed,
      shareServices: {
        ...defaultPreferences.shareServices,
        ...(parsed.shareServices || {}),
      },
      digestPriorityCategories: Array.isArray(parsed.digestPriorityCategories)
        ? parsed.digestPriorityCategories
        : defaultPreferences.digestPriorityCategories,
    };
  } catch {
    return { ...defaultPreferences };
  }
}

export const getPreferences = loadPreferences;

export function savePreferences(preferences) {
  try {
    const current = loadPreferences();
    const merged = { ...current, ...preferences };
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

export function resetPreferences() {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(defaultPreferences));
    return true;
  } catch {
    return false;
  }
}

export function calculateStorageUsage() {
  try {
    let totalBytes = 0;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      const val = window.localStorage.getItem(key) || '';
      totalBytes += (key.length + val.length) * 2; // UTF-16 characters
    }
    const kb = (totalBytes / 1024).toFixed(1);
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return totalBytes > 1024 * 1024 ? `${mb} Mo` : `${kb} Ko`;
  } catch {
    return '0 Ko';
  }
}

export function clearCache() {
  try {
    const preserveKeys = [PREFERENCES_KEY];
    const keysToRemove = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!preserveKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
