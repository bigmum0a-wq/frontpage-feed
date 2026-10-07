import { SUPPORTED_FEED_PROTOCOLS } from './constants.js';

export function sanitizeText(value) {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

export function sanitizeFeedUrl(value) {
  const url = new URL(String(value ?? '').trim());

  if (!SUPPORTED_FEED_PROTOCOLS.includes(url.protocol)) {
    throw new Error('Use an HTTP or HTTPS feed URL.');
  }

  return url.toString();
}
