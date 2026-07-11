// Download + optimize featured images for PUBLISHED posts (those with generated content).
// Produces public/media/{id}-sm.webp + {id}-lg.webp and data/images.json manifest.
// Self-contained output so the site no longer depends on the source WordPress.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const MEDIA_DIR = join(ROOT, 'public', 'media');
const CACHE_DIR = join(ROOT, 'media-cache');
mkdirSync(MEDIA_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const FORCE = has('force');
const ALL = has('all'); // process every post with an image, not only published

const posts = JSON.parse(readFileSync(join(ROOT, 'data', 'posts.json'), 'utf8'));
const publishedIds = new Set(
  readdirSync(join(ROOT, 'content')).filter((f) => f.endsWith('.json')).map((f) => Number(f.replace('.json', '')))
);
const manifestPath = join(ROOT, 'data', 'images.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

let targets = posts.filter((p) => (ALL || publishedIds.has(p.id)) && p.image && (p.image.full || p.image.url));
if (!FORCE) targets = targets.filter((p) => !manifest[p.id]);

console.log(`→ ${targets.length} image(s) à récupérer / optimiser`);

const CONCURRENCY = 6;
let done = 0, failed = 0;

async function fetchBuffer(url) {
  for (let a = 0; a <= 4; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'cda-img/1.0' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (a === 4) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** a));
    }
  }
}

async function toHex(img) {
  try {
    const { dominant } = await img.clone().stats();
    const h = (n) => n.toString(16).padStart(2, '0');
    return `#${h(dominant.r)}${h(dominant.g)}${h(dominant.b)}`;
  } catch {
    return '#e9e7e0';
  }
}

export async function processImage(id, buf) {
  const base = sharp(buf, { failOn: 'none' }).rotate();
  const meta = await base.metadata();
  const w = meta.width || 1600;
  const h = meta.height || 1000;
  const ratio = h / w;
  const bg = await toHex(base);

  const lgW = Math.min(1600, w);
  const smW = Math.min(800, w);
  await sharp(buf, { failOn: 'none' }).rotate().resize({ width: lgW, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 }).toFile(join(MEDIA_DIR, `${id}-lg.webp`));
  await sharp(buf, { failOn: 'none' }).rotate().resize({ width: smW, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 }).toFile(join(MEDIA_DIR, `${id}-sm.webp`));

  return {
    id,
    sm: `/media/${id}-sm.webp`,
    lg: `/media/${id}-lg.webp`,
    width: lgW,
    height: Math.round(lgW * ratio),
    bg,
  };
}

async function worker(queue) {
  while (queue.length) {
    const p = queue.shift();
    try {
      const buf = await fetchBuffer(p.image.full || p.image.url);
      manifest[p.id] = await processImage(p.id, buf);
      done++;
      if (done % 10 === 0 || done === targets.length) {
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`  … ${done}/${targets.length} optimisées`);
      }
    } catch (e) {
      failed++;
      console.warn(`  ✗ #${p.id} — ${String(e.message || e).slice(0, 100)}`);
    }
  }
}

if (targets.length) {
  const queue = [...targets];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✓ ${done} optimisées, ${failed} échecs → data/images.json (${Object.keys(manifest).length} au total)`);
