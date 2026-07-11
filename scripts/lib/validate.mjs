import { VALID_CATS } from './prompt.mjs';

export function slugify(s = '') {
  return s
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'section';
}

// Keep only a tiny inline whitelist: strong, em, a[href], br.
export function sanitizeInline(html = '') {
  let s = String(html);
  s = s.replace(/<\s*(script|style|iframe)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
    const t = tag.toLowerCase();
    const closing = m.startsWith('</');
    if (t === 'b') return closing ? '</strong>' : '<strong>';
    if (t === 'i') return closing ? '</em>' : '<em>';
    if (t === 'strong' || t === 'em') return closing ? `</${t}>` : `<${t}>`;
    if (t === 'br') return '<br>';
    if (t === 'p' || t === 'span' || t === 'div') return closing ? '' : ''; // unwrap
    if (t === 'a') {
      if (closing) return '</a>';
      const href = (attrs.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
      if (/^(https?:|mailto:|\/)/i.test(href)) {
        const ext = /^https?:/i.test(href);
        return `<a href="${href.replace(/"/g, '&quot;')}"${ext ? ' rel="noopener"' : ''}>`;
      }
      return '<a>';
    }
    return ''; // drop anything else
  });
  return s.replace(/\s+/g, ' ').replace(/\s([.,;:!?])/g, '$1').trim();
}

function asText(s = '') {
  return sanitizeInline(s).replace(/<[^>]+>/g, '').trim();
}

function normBlock(b, ids) {
  if (!b || typeof b !== 'object' || !b.type) return null;
  switch (b.type) {
    case 'lead':
    case 'paragraph': {
      const html = sanitizeInline(b.html || b.text || '');
      return html.length > 1 ? { type: b.type, html } : null;
    }
    case 'heading': {
      const text = asText(b.text || b.html || '');
      if (!text) return null;
      const level = [2, 3, 4].includes(Number(b.level)) ? Number(b.level) : 2;
      let id = slugify(b.id || text);
      while (ids.has(id)) id = id.replace(/(-\d+)?$/, (m) => `-${(parseInt((m||'').slice(1)) || 1) + 1}`);
      ids.add(id);
      return { type: 'heading', level, id, text };
    }
    case 'list': {
      const items = (Array.isArray(b.items) ? b.items : []).map(sanitizeInline).filter((x) => x.length > 1);
      return items.length ? { type: 'list', ordered: !!b.ordered, items } : null;
    }
    case 'callout': {
      const variant = ['info', 'tip', 'warning', 'key'].includes(b.variant) ? b.variant : 'info';
      let html = sanitizeInline(b.html || b.text || '');
      if (!html) return null;
      if (!/^</.test(html)) html = `<p>${html}</p>`;
      else html = html.split(/<br>\s*<br>/).map((p) => `<p>${p}</p>`).join('');
      const title = b.title ? asText(b.title) : undefined;
      return { type: 'callout', variant, title, html };
    }
    case 'table': {
      const headers = (Array.isArray(b.headers) ? b.headers : []).map(asText).filter(Boolean);
      const rows = (Array.isArray(b.rows) ? b.rows : [])
        .map((r) => (Array.isArray(r) ? r.map((c) => sanitizeInline(String(c))) : null))
        .filter((r) => r && r.length);
      if (headers.length < 2 || rows.length < 1) return null;
      const width = headers.length;
      const fixed = rows.map((r) => {
        const rr = r.slice(0, width);
        while (rr.length < width) rr.push('');
        return rr;
      });
      return { type: 'table', caption: b.caption ? asText(b.caption) : undefined, headers, rows: fixed };
    }
    case 'compare': {
      const pane = (p) =>
        p && typeof p === 'object'
          ? { title: asText(p.title || ''), points: (Array.isArray(p.points) ? p.points : []).map(sanitizeInline).filter(Boolean) }
          : null;
      const a = pane(b.a), bb = pane(b.b);
      if (!a || !bb || !a.points.length || !bb.points.length) return null;
      return { type: 'compare', title: b.title ? asText(b.title) : undefined, a, b: bb };
    }
    case 'steps': {
      const items = (Array.isArray(b.items) ? b.items : [])
        .map((it) => ({ title: it.title ? asText(it.title) : undefined, html: sanitizeInline(it.html || it.text || '') }))
        .filter((it) => it.html.length > 1);
      return items.length ? { type: 'steps', items } : null;
    }
    case 'stats': {
      const items = (Array.isArray(b.items) ? b.items : [])
        .map((it) => ({ value: asText(it.value || ''), label: asText(it.label || '') }))
        .filter((it) => it.value && it.label);
      return items.length ? { type: 'stats', items } : null;
    }
    case 'quote': {
      const html = sanitizeInline(b.html || b.text || '');
      return html ? { type: 'quote', html, cite: b.cite ? asText(b.cite) : undefined } : null;
    }
    default:
      return null;
  }
}

export function normalizeContent(raw, meta) {
  let obj = raw;
  if (typeof raw === 'string') {
    let s = raw.trim().replace(/^```json\s*/i, '').replace(/```$/,'').trim();
    obj = JSON.parse(s);
  }
  const ids = new Set();
  const blocks = (Array.isArray(obj.blocks) ? obj.blocks : []).map((b) => normBlock(b, ids)).filter(Boolean);

  // Guardrails: need a real body.
  const headingCount = blocks.filter((b) => b.type === 'heading' && b.level === 2).length;
  const hasTable = blocks.some((b) => b.type === 'table');
  if (blocks.length < 6 || headingCount < 3) {
    throw new Error(`corps insuffisant (blocks=${blocks.length}, h2=${headingCount})`);
  }

  const category = VALID_CATS.has(obj.category) ? obj.category : 'culture-societe';
  const faq = (Array.isArray(obj.faq) ? obj.faq : [])
    .map((f) => ({ q: asText(f.q || ''), a: sanitizeInline(f.a || f.answer || '') }))
    .filter((f) => f.q && f.a)
    .map((f) => ({ q: f.q, a: /^</.test(f.a) ? `<p>${f.a.replace(/<p>|<\/p>/g,'')}</p>` : `<p>${f.a}</p>` }))
    .slice(0, 6);

  const clamp = (s, n) => (s.length > n ? s.slice(0, n - 1).trim() + '…' : s);

  return {
    id: meta.id,
    slug: meta.slug,
    title: meta.title,
    metaTitle: clamp(asText(obj.metaTitle || meta.title) || meta.title, 65),
    metaDescription: clamp(asText(obj.metaDescription || obj.dek || '') || meta.excerpt, 160),
    dek: asText(obj.dek || obj.metaDescription || '') || meta.excerpt,
    category,
    tags: (Array.isArray(obj.tags) ? obj.tags : []).map(asText).filter(Boolean).slice(0, 6),
    keyTakeaways: (Array.isArray(obj.keyTakeaways) ? obj.keyTakeaways : []).map(asText).filter(Boolean).slice(0, 5),
    blocks,
    faq,
    updatedAt: new Date(2026, 6, 11).toISOString(),
    generatedAt: new Date(2026, 6, 11).toISOString(),
    model: 'gpt-5.6-terra',
    _meta: { hasTable, headingCount },
  };
}
