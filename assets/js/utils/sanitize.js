import { SUPPORTED_FEED_PROTOCOLS } from './constants.js';

export function sanitizeText(value) {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

/**
 * Client-side HTML defense-in-depth sanitizer.
 * Strips script tags, event handlers, and javascript: protocols.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*["']\s*(?:javascript|data|vbscript):[^"']*["']/gi, ' $1="#"')
    .trim();
}

export function sanitizeFeedUrl(value) {
  const url = new URL(String(value ?? '').trim());

  if (!SUPPORTED_FEED_PROTOCOLS.includes(url.protocol)) {
    throw new Error('Use an HTTP or HTTPS feed URL.');
  }

  return url.toString();
}

