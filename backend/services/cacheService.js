// In-Memory Cache Service with TTL
import { env } from '../../config/environment.js';

class CacheService {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlMinutes = env.CACHE_TTL_MINUTES) {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    this.store.set(key, { value, expiresAt });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const cacheService = new CacheService();
