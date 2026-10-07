import { API_BASE_URL } from '../utils/constants.js';
import { queueOfflineAction } from './offlineSyncService.js';

async function request(path, options = {}) {
  const fullUrl = `${API_BASE_URL}${path}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('frontpage_auth_token') : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(fullUrl, {
      headers: {
        Accept: 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => 'Request failed.');
      throw new Error(message || `Request failed with status ${response.status}.`);
    }

    if (response.status === 204) return null;

    return response.json();
  } catch (error) {
    const method = options.method || 'GET';
    // Intercept mutating requests when offline or server is unreachable
    if (method !== 'GET' && (!navigator.onLine || error.name === 'TypeError' || error.message?.includes('Failed to fetch'))) {
      queueOfflineAction({
        url: fullUrl,
        method,
        body: options.body ? JSON.parse(options.body) : null,
        description: `Action ${method} ${path}`,
      });
      return { success: true, offline: true };
    }
    throw error;
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  put: (path, body) => request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  patch: (path, body) => request(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  delete: (path) => request(path, { method: 'DELETE' }),

  // AI Helpers
  summarizeArticle: (id, forceRefresh = false) =>
    request(`/articles/${id}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceRefresh }),
    }),

  generateAiDigest: () =>
    request('/articles/digest/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),

  // Analytics Helpers
  getAnalyticsOverview: () => request('/analytics/overview'),
  getAnalyticsActivity: () => request('/analytics/activity'),
  getAnalyticsBreakdown: () => request('/analytics/breakdown'),
};

