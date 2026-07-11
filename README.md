# CDA — Le magazine

Édition 2027 du magazine associatif **cda-blog-asso.com**. Site **statique**, ultra‑optimisé SEO & vitesse,
au design minimaliste (paper × encre, un seul accent, animations sobres et accessibles).

## Stack
- **[Astro](https://astro.build)** — sortie statique `dist/`, zéro JS par défaut, îlots d'animation légers.
- Design system maison (`src/styles/`) : tokens fluides, thèmes clair/sombre, prose éditoriale
  (tableaux, callouts, comparaisons 2 colonnes, FAQ, steps, stats).
- Contenu régénéré via **OpenAI `gpt-5.6-terra`** (reasoning *high*, verbosité *high*), structuré en blocs.
- Images à la une réutilisées depuis la source et optimisées en WebP ; images manquantes générées via **`gpt-image-2`**.

## Développement
```bash
npm install
npm run dev            # http://localhost:4321
npm run build          # → dist/
npm run preview
```

## Structure
```
data/          posts.json (métadonnées 643 articles), taxonomy.json, images.json
content/        {id}.json  — contenu régénéré par article (source de vérité du rendu)
scripts/        fetch-posts · generate-content · fetch-images · generate-images · cf-domain-setup
src/
  layouts/      BaseLayout (SEO complet + JSON-LD + thème + interactions)
  components/    Header, Footer, PostCard, PostImage, Blocks, Faq, CategoryIcon
  pages/         index · [permalink] (article) · articles · rubriques · a-propos · 404 · rss.xml …
  lib/           posts.ts, images.ts, site.ts
public/         _headers, _redirects, robots.txt, favicon, og-default
```

## Déploiement
Voir **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Cloudflare Pages, domaine, redirection www→non‑www.

## SEO & performance
- Permaliens **identiques** à l'ancien site (`/{id}-{slug}/`), host canonique **non‑www**.
- JSON-LD `Organization` / `WebSite` / `BlogPosting` / `BreadcrumbList` / `FAQPage`.
- Sitemap + RSS + robots, images `width/height` (zéro CLS), polices variables auto‑hébergées,
  CSS critique en ligne, cache immuable des assets, `prefers-reduced-motion` respecté.
