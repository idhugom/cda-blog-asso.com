import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { loadPosts } from '../lib/posts';
import { SITE } from '../lib/site';

export function GET(context: APIContext) {
  const posts = loadPosts().slice(0, 50);
  return rss({
    title: SITE.fullName,
    description: SITE.description,
    site: context.site?.toString() || SITE.origin,
    trailingSlash: true,
    items: posts.map((p) => ({
      title: p.title,
      description: p.metaDescription,
      link: `/${p.permalink}/`,
      pubDate: new Date(p.date),
      categories: [p.category.name, ...p.tags],
    })),
    customData: `<language>fr-FR</language>`,
  });
}
