import fs from 'node:fs';
import path from 'node:path';
import type { Post } from './posts';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'data', 'images.json');

type ImgEntry = { id: number; sm: string; lg: string; width: number; height: number; bg: string };
let _manifest: Record<string, ImgEntry> | null = null;

function manifest(): Record<string, ImgEntry> {
  if (_manifest) return _manifest;
  _manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  return _manifest!;
}

export type RenderImage = {
  src: string;
  srcset?: string;
  width?: number;
  height?: number;
  bg: string;
  alt: string;
  local: boolean;
};

export function imageFor(post: Post, altFallback?: string): RenderImage | null {
  const alt = post.image?.alt || altFallback || post.title;
  const m = manifest()[String(post.id)];
  if (m) {
    return {
      src: m.lg,
      srcset: `${m.sm} 800w, ${m.lg} 1600w`,
      width: m.width,
      height: m.height,
      bg: m.bg,
      alt,
      local: true,
    };
  }
  // Fallback to remote (source WordPress) until migrated locally.
  if (post.image?.url) {
    return {
      src: post.image.url,
      width: post.image.width || undefined,
      height: post.image.height || undefined,
      bg: '#e9e7e0',
      alt,
      local: false,
    };
  }
  return null;
}
