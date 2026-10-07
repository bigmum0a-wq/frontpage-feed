// App Icon Badging API Manager
export function updateAppBadge(unreadCount = 0) {
  const count = Math.max(0, parseInt(unreadCount, 10) || 0);

  // 1. Native Web Badging API (PWA icon on Windows/macOS/Android)
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  // 2. Tab title badge update
  const currentTitle = document.title.replace(/^\(\d+\)\s*/, '');
  if (count > 0) {
    document.title = `(${count}) ${currentTitle}`;
  } else {
    document.title = currentTitle;
  }
}
