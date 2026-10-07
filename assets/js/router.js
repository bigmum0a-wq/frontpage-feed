// assets/js/router.js
export function createHashRouter(views, onNavigate) {
  function getCurrentView() {
    const rawHash = window.location.hash.slice(1);

    if (rawHash && Object.hasOwn(views, rawHash)) {
      return rawHash;
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('frontpage_auth_token') : null;
    const guestActive = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('frontpage_guest_active') : null;

    // First-time or unauthenticated visit without active guest session: show Welcome landing page!
    if (!token && !guestActive) {
      return 'welcome';
    }

    return 'feed';
  }

  function navigate(viewName) {
    if (!Object.hasOwn(views, viewName)) return;

    if (getCurrentView() === viewName) {
      onNavigate(viewName);
    } else {
      window.location.hash = viewName;
    }
  }

  function start() {
    window.addEventListener('hashchange', () => onNavigate(getCurrentView()));
    onNavigate(getCurrentView());
  }

  return { getCurrentView, navigate, start };
}
