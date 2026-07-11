import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Canonical origin is NON-www (www → non-www 301 handled at the edge + _redirects).
const SITE = process.env.SITE_ORIGIN || 'https://cda-blog-asso.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: {
    format: 'directory', // → /{id-slug}/index.html, matching legacy permalinks
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  image: {
    // Local, build-time optimization via sharp (AVIF/WebP), no runtime cost.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/404'),
    }),
  ],
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
