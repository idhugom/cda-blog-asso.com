import fs from 'node:fs';
import path from 'node:path';
import taxonomy from '../../data/taxonomy.json';
import type { Category } from './site';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');

export const CATEGORIES: Category[] = taxonomy.categories;
const CAT_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export type Block =
  | { type: 'lead'; html: string }
  | { type: 'paragraph'; html: string }
  | { type: 'heading'; level: 2 | 3 | 4; id: string; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning' | 'key'; title?: string; html: string }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'compare'; title?: string; a: ComparePane; b: ComparePane }
  | { type: 'steps'; items: { title?: string; html: string }[] }
  | { type: 'stats'; items: { value: string; label: string }[] }
  | { type: 'quote'; html: string; cite?: string };

export type ComparePane = { title: string; points: string[] };
export type Faq = { q: string; a: string };

export type PostImage = {
  url: string | null;
  full?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string;
  local?: string | null; // path under /public once downloaded
};

export type PostMeta = {
  id: number;
  slug: string;
  permalink: string;
  title: string;
  excerpt: string;
  date: string;
  modified: string;
  image: PostImage | null;
};

export type PostContent = {
  id: number;
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  dek?: string;
  category?: string;
  tags?: string[];
  keyTakeaways?: string[];
  blocks?: Block[];
  faq?: Faq[];
  updatedAt?: string;
  generatedAt?: string;
  model?: string;
};

export type Post = PostMeta & {
  content: PostContent;
  category: Category;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  dek: string;
  keyTakeaways: string[];
  blocks: Block[];
  faq: Faq[];
  toc: { id: string; text: string }[];
  wordCount: number;
  readingTime: number;
  updatedAt: string;
};

let _posts: Post[] | null = null;

function readMeta(): PostMeta[] {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
}

function readContent(id: number): PostContent | null {
  const f = path.join(CONTENT_DIR, `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!c || !Array.isArray(c.blocks) || c.blocks.length === 0) return null;
    return c;
  } catch {
    return null;
  }
}

function stripTags(s = ''): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function estimateWords(content: PostContent): number {
  let text = `${content.title} ${content.dek || ''} `;
  for (const b of content.blocks || []) {
    if ('html' in b && b.html) text += stripTags(b.html) + ' ';
    if (b.type === 'heading') text += b.text + ' ';
    if (b.type === 'list') text += b.items.map(stripTags).join(' ') + ' ';
    if (b.type === 'table') text += b.rows.flat().map(stripTags).join(' ') + ' ';
    if (b.type === 'compare')
      text += [...b.a.points, ...b.b.points].map(stripTags).join(' ') + ' ';
    if (b.type === 'steps') text += b.items.map((i) => stripTags(i.html)).join(' ') + ' ';
  }
  for (const f of content.faq || []) text += `${f.q} ${stripTags(f.a)} `;
  return text.trim().split(/\s+/).length;
}

function buildToc(blocks: Block[]): { id: string; text: string }[] {
  return blocks
    .filter((b): b is Extract<Block, { type: 'heading' }> => b.type === 'heading' && b.level === 2)
    .map((b) => ({ id: b.id, text: b.text }));
}

export function loadPosts(): Post[] {
  if (_posts) return _posts;
  const meta = readMeta();
  const out: Post[] = [];
  for (const m of meta) {
    const content = readContent(m.id);
    if (!content) continue; // only publish posts with regenerated content
    const category = CAT_BY_SLUG.get(content.category || '') || CATEGORIES[CATEGORIES.length - 2];
    const blocks = content.blocks || [];
    const wordCount = estimateWords(content);
    out.push({
      ...m,
      content,
      category,
      tags: (content.tags || []).slice(0, 6),
      metaTitle: content.metaTitle || m.title,
      metaDescription: content.metaDescription || content.excerpt || m.excerpt,
      dek: content.dek || content.excerpt || m.excerpt,
      keyTakeaways: content.keyTakeaways || [],
      blocks,
      faq: content.faq || [],
      toc: buildToc(blocks),
      wordCount,
      readingTime: Math.max(2, Math.round(wordCount / 220)),
      updatedAt: content.updatedAt || m.modified || m.date,
    });
  }
  out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  _posts = out;
  return out;
}

export function getCategoriesWithCounts(): (Category & { count: number })[] {
  const posts = loadPosts();
  return CATEGORIES.map((c) => ({
    ...c,
    count: posts.filter((p) => p.category.slug === c.slug).length,
  })).filter((c) => c.count > 0);
}

export function getPostsByCategory(slug: string): Post[] {
  return loadPosts().filter((p) => p.category.slug === slug);
}

export function getRelated(post: Post, n = 3): Post[] {
  const posts = loadPosts().filter((p) => p.id !== post.id);
  const scored = posts.map((p) => {
    let score = p.category.slug === post.category.slug ? 3 : 0;
    const shared = p.tags.filter((t) => post.tags.includes(t)).length;
    score += shared;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score || +new Date(b.p.date) - +new Date(a.p.date));
  return scored.slice(0, n).map((s) => s.p);
}

export function totalSourceCount(): number {
  return readMeta().length;
}
