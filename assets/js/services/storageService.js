const LIBRARY_KEY = 'frontpage-library';

export function loadLibrary() {
  try {
    const savedLibrary = window.localStorage.getItem(LIBRARY_KEY);

    if (!savedLibrary) return null;

    const parsedLibrary = JSON.parse(savedLibrary);

    return Array.isArray(parsedLibrary.feeds) && Array.isArray(parsedLibrary.articles)
      ? parsedLibrary
      : null;
  } catch {
    return null;
  }
}

export function saveLibrary({ feeds, articles, readingActivity }) {
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify({ feeds, articles, readingActivity }));
    return true;
  } catch {
    return false;
  }
}
