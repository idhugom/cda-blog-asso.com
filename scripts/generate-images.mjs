// Generate "ultra realistic" featured images with gpt-image-2 for PUBLISHED posts
// that have no existing featured image. Existing images are always reused (fetch-images.mjs).
//   node scripts/generate-images.mjs [--all-missing] [--ids a,b]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateImage } from './lib/openai.mjs';
import { processImage } from './fetch-images.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const getArg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const ONLY_IDS = getArg('ids', null)?.split(',').map((s) => Number(s.trim()));

const posts = JSON.parse(readFileSync(join(ROOT, 'data', 'posts.json'), 'utf8'));
const publishedIds = new Set(
  readdirSync(join(ROOT, 'content')).filter((f) => f.endsWith('.json')).map((f) => Number(f.replace('.json', '')))
);
const manifestPath = join(ROOT, 'data', 'images.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

let targets = posts.filter((p) => publishedIds.has(p.id) && !manifest[p.id] && !(p.image && (p.image.full || p.image.url)));
if (ONLY_IDS) targets = posts.filter((p) => ONLY_IDS.includes(p.id));

console.log(`→ ${targets.length} image(s) à générer via gpt-image-2`);

function promptFor(title) {
  return `Photographie éditoriale ultra réaliste, haut de gamme, illustrant le sujet : « ${title} ».
Style magazine, lumière naturelle douce, profondeur de champ maîtrisée, composition soignée et épurée, couleurs naturelles.
Cadrage horizontal. AUCUN texte, AUCUN logo, AUCun filigrane, pas de visage reconnaissable en gros plan.`;
}

let done = 0;
for (const p of targets) {
  try {
    const resp = await generateImage({
      model: 'gpt-image-2',
      prompt: promptFor(p.title),
      size: '1536x1024',
      quality: 'medium',
    });
    const b64 = resp.data?.[0]?.b64_json;
    if (!b64) throw new Error('pas de b64_json');
    const buf = Buffer.from(b64, 'base64');
    manifest[p.id] = { ...(await processImage(p.id, buf)), generated: true };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    done++;
    console.log(`  ✓ #${p.id} ${p.slug.slice(0, 44)} (image générée)`);
  } catch (e) {
    console.warn(`  ✗ #${p.id} — ${String(e.message || e).slice(0, 140)}`);
  }
}
console.log(`✓ ${done} image(s) générée(s).`);
