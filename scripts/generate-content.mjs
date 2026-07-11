// Regenerate article content with gpt-5.6-terra (Responses API).
// Idempotent + resumable: skips posts already generated unless --force.
//   node scripts/generate-content.mjs [--all] [--limit N] [--ids a,b] [--concurrency N] [--force]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { callResponses, outputText } from './lib/openai.mjs';
import { INSTRUCTIONS, buildInput } from './lib/prompt.mjs';
import { normalizeContent } from './lib/validate.mjs';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'content');
mkdirSync(CONTENT_DIR, { recursive: true });

const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);

const CONCURRENCY = Number(getArg('concurrency', 4));
const FORCE = has('force');
const LIMIT = has('all') ? Infinity : Number(getArg('limit', 12));
const ONLY_IDS = getArg('ids', null)?.split(',').map((s) => Number(s.trim()));

const MODEL = getArg('model', 'gpt-5.6-terra');
const EFFORT = getArg('reasoning', 'high');
const VERBOSITY = getArg('verbosity', 'high');

const posts = JSON.parse(readFileSync(join(ROOT, 'data', 'posts.json'), 'utf8'));

function needsGen(p) {
  if (ONLY_IDS && !ONLY_IDS.includes(p.id)) return false;
  const f = join(CONTENT_DIR, `${p.id}.json`);
  if (FORCE) return true;
  if (!existsSync(f)) return true;
  try {
    const c = JSON.parse(readFileSync(f, 'utf8'));
    return !(c && Array.isArray(c.blocks) && c.blocks.length >= 6);
  } catch {
    return true;
  }
}

let targets = posts.filter(needsGen);
if (Number.isFinite(LIMIT)) targets = targets.slice(0, LIMIT);

console.log(`→ ${targets.length} article(s) à générer (modèle ${MODEL}, effort ${EFFORT}, verbosité ${VERBOSITY}, concurrence ${CONCURRENCY})`);
if (targets.length === 0) { console.log('✓ Rien à faire.'); process.exit(0); }

let done = 0, failed = 0;
const failures = [];
const t0 = Date.now();

async function generateOne(p) {
  const body = {
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: buildInput({ title: p.title, excerpt: p.excerpt }),
    reasoning: { effort: EFFORT },
    text: { verbosity: VERBOSITY, format: { type: 'json_object' } },
    max_output_tokens: 16000,
  };
  const resp = await callResponses(body);
  const text = outputText(resp);
  if (!text) throw new Error('réponse vide');
  const content = normalizeContent(text, p);
  writeFileSync(join(CONTENT_DIR, `${p.id}.json`), JSON.stringify(content, null, 2));
  const u = resp.usage || {};
  return { words: content.blocks.length, tok: u.total_tokens || 0, cat: content.category, hasTable: content._meta?.hasTable };
}

async function worker(queue) {
  while (queue.length) {
    const p = queue.shift();
    const n = ++done + failed;
    try {
      const r = await generateOne(p);
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  ✓ [${done}/${targets.length}] #${p.id} ${p.slug.slice(0, 48)} — ${r.cat}${r.hasTable ? ' +tbl' : ''} (${secs}s)`);
    } catch (err) {
      failed++; done--;
      failures.push({ id: p.id, slug: p.slug, error: String(err.message || err).slice(0, 200) });
      console.warn(`  ✗ #${p.id} ${p.slug.slice(0, 40)} — ${String(err.message || err).slice(0, 120)}`);
    }
  }
}

const queue = [...targets];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));

if (failures.length) {
  writeFileSync(join(ROOT, 'data', 'gen-failures.json'), JSON.stringify(failures, null, 2));
}
const mins = ((Date.now() - t0) / 60000).toFixed(1);
console.log(`\n✓ Terminé : ${done} générés, ${failed} échecs en ${mins} min.`);
if (failed) console.log(`  (détails → data/gen-failures.json ; relancer la commande reprendra les manquants)`);
