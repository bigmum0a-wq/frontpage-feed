// Offline Action Queue & Background Sync Manager
import { showToast } from '../components/toast.js';

const QUEUE_KEY = 'frontpage_offline_actions';

export function getOfflineQueue() {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue = []) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('frontpage:offline-queue-change', { detail: { count: queue.length } }));
  } catch (err) {
    console.warn('Impossible de sauvegarder la file hors-ligne:', err);
  }
}

export function queueOfflineAction(action) {
  const queue = getOfflineQueue();
  const item = {
    id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    url: action.url,
    method: action.method || 'POST',
    body: action.body || null,
    description: action.description || 'Action utilisateur',
    createdAt: new Date().toISOString(),
  };

  queue.push(item);
  saveOfflineQueue(queue);

  // Request Service Worker background sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => reg.sync.register('sync-offline-actions'))
      .catch(() => {});
  }

  showToast(`${item.description} (enregistré hors-ligne)`, 'info');
  return item;
}

let isProcessing = false;

export async function processOfflineQueue() {
  if (isProcessing || !navigator.onLine) return;

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isProcessing = true;
  const remaining = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (response.ok || response.status === 204) {
        syncedCount += 1;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error (e.g. 404), discard to prevent queue poison
        console.warn(`Action hors-ligne ignorée (${response.status}):`, item);
      } else {
        // Server error (5xx) or timeout, retry later
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  isProcessing = false;

  if (syncedCount > 0) {
    showToast(`Synchronisation terminée (${syncedCount} action${syncedCount > 1 ? 's' : ''} envoyée${syncedCount > 1 ? 's' : ''})`, 'success');
    window.dispatchEvent(new CustomEvent('frontpage:feed-change'));
  }
}

export function updateNetworkStatusUI(isOnline = navigator.onLine) {
  let indicator = document.querySelector('#network-status-indicator');

  if (!indicator) {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
      indicator = document.createElement('div');
      indicator.id = 'network-status-indicator';
      indicator.className = 'network-status-badge';
      headerActions.prepend(indicator);
    }
  }

  if (indicator) {
    const queueLength = getOfflineQueue().length;
    indicator.className = `network-status-badge ${isOnline ? 'is-online' : 'is-offline'}`;
    indicator.innerHTML = isOnline
      ? `<span class="status-dot"></span><span class="status-text">${queueLength > 0 ? `Sync (${queueLength})` : 'En ligne'}</span>`
      : `<span class="status-dot"></span><span class="status-text">Hors-ligne ${queueLength > 0 ? `(${queueLength})` : ''}</span>`;
    indicator.title = isOnline
      ? 'Connecté au serveur en temps réel'
      : 'Mode hors-ligne : la lecture locale et la file de synchronisation sont actives';
  }
}

export function initialiseNetworkMonitoring() {
  window.addEventListener('online', () => {
    updateNetworkStatusUI(true);
    showToast('Connexion rétablie !', 'success');
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    updateNetworkStatusUI(false);
    showToast('Mode hors-ligne activé. Les données locales restent accessibles.', 'info');
  });

  window.addEventListener('frontpage:offline-queue-change', () => {
    updateNetworkStatusUI(navigator.onLine);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PROCESS_OFFLINE_QUEUE') {
        processOfflineQueue();
      }
    });
  }

  updateNetworkStatusUI(navigator.onLine);
}
