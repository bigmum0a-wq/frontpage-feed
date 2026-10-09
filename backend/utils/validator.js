// Input and URL Validator Utility
export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeDate(dateString) {
  if (!dateString) return new Date().toISOString();
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
}

/**
 * Server-side HTML sanitizer for RSS/Atom article bodies.
 * Strips executable scripts, event handlers, and dangerous tags, while allowing
 * safe typography, structure, links, and media.
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  let html = dirtyHtml;

  // 1. Remove dangerous blocks: script, style, iframe, object, embed, form, input, base, link
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '');

  // 2. Remove inline event handlers (onload, onclick, onerror, etc.)
  html = html.replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

  // 3. Disallow javascript: and data: pseudo-protocols in href and src
  html = html.replace(/\s+(href|src)\s*=\s*["']\s*(?:javascript|data|vbscript):[^"']*["']/gi, ' $1="#"');

  return html.trim();
}

