// Shared helpers for talking to the source WordPress REST API.
export const WP_BASE = process.env.WP_BASE || 'https://www.cda-blog-asso.com';
// Canonical host for the NEW site (www, per redirect requirement).
export const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://www.cda-blog-asso.com';

export async function wpFetch(path, { retries = 5 } = {}) {
  const url = path.startsWith('http') ? path : `${WP_BASE}${path}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'cda-blog-rebuild/1.0' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      const wait = Math.min(16_000, 1000 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export async function wpJson(path, opts) {
  const res = await wpFetch(path, opts);
  return res.json();
}

// Strip HTML entities that WP encodes in titles/rendered fields.
export function decodeEntities(str = '') {
  return str
    .replace(/&#8217;|&#x2019;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
