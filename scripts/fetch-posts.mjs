// Fetch ALL posts metadata from the source WordPress site and persist to data/posts.json.
// Keeps id + slug 100% identical, captures featured image URL/alt, date, categories.
import { writeFile, mkdir } from 'node:fs/promises';
import { wpJson, decodeEntities } from './lib/wp.mjs';

const PER_PAGE = 100;
const FIELDS = 'id,slug,date,modified,title,excerpt,link,categories,tags,featured_media,_links';

async function main() {
  console.log('→ Fetching post metadata from WordPress…');
  let page = 1;
  let all = [];
  while (true) {
    const batch = await wpJson(
      `/wp-json/wp/v2/posts?per_page=${PER_PAGE}&page=${page}&_embed=wp:featuredmedia,wp:term&_fields=${FIELDS},_embedded`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const p of batch) {
      const fm = p._embedded?.['wp:featuredmedia']?.[0] || null;
      const terms = (p._embedded?.['wp:term'] || []).flat();
      const cats = terms.filter((t) => t?.taxonomy === 'category').map((t) => t.name);
      const tags = terms.filter((t) => t?.taxonomy === 'post_tag').map((t) => t.name);
      const sizes = fm?.media_details?.sizes || {};
      const best = sizes.large || sizes['1536x1536'] || sizes.full || null;
      all.push({
        id: p.id,
        slug: p.slug,
        permalink: `${p.id}-${p.slug}`,
        title: decodeEntities(p.title?.rendered || ''),
        excerpt: decodeEntities((p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim()),
        date: p.date,
        modified: p.modified,
        categories: cats,
        tags,
        image: fm
          ? {
              url: best?.source_url || fm.source_url || null,
              full: fm.source_url || null,
              width: best?.width || fm.media_details?.width || null,
              height: best?.height || fm.media_details?.height || null,
              alt: decodeEntities(fm.alt_text || ''),
            }
          : null,
      });
    }
    console.log(`  page ${page}: ${batch.length} posts (total ${all.length})`);
    if (batch.length < PER_PAGE) break;
    page++;
  }

  // Newest first, stable by id.
  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  await mkdir('data', { recursive: true });
  await writeFile('data/posts.json', JSON.stringify(all, null, 2));
  console.log(`✓ Saved ${all.length} posts → data/posts.json`);
}

main().catch((e) => {
  console.error('✗ fetch-posts failed:', e);
  process.exit(1);
});
