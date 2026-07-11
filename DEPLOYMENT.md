# Déploiement — CDA Blog (Cloudflare Pages)

Site **statique Astro** → build `npm run build` → dossier `dist/`. Hébergé sur **Cloudflare Pages**.

- **Projet Pages** : `cda-blog-asso-preprod`
- **URL de préprod** : https://cda-blog-asso-preprod.pages.dev
- **Domaine cible (production)** : `cda-blog-asso.com` (non‑www canonique, `www` → redirigé)
- **Branche de production** : `main` · **Branche de dev** : `claude/cda-blog-redesign-9ayq7n`

---

## 1. Déploiement (déjà fonctionnel)

Deux chemins, au choix :

### A. Auto‑déploiement par GitHub Actions (déjà configuré) ✅
`.github/workflows/deploy.yml` builde et déploie à chaque push. `main` = production,
toute autre branche = préversion (URL `https://<branche>.cda-blog-asso-preprod.pages.dev`).

Ajoutez **deux secrets** au dépôt GitHub (`Settings → Secrets and variables → Actions`) :

| Secret | Valeur |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | votre token Cloudflare (Pages: Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | `1320e4…` (votre account id) |

### B. Intégration Git native Cloudflare (option dashboard)
Dans **Cloudflare → Workers & Pages → cda-blog-asso-preprod → Settings → Builds & deployments → Connect to Git** :

| Paramètre | Valeur |
| --- | --- |
| Dépôt | `idhugom/cda-blog-asso.com` |
| Branche de production | `main` |
| Commande de build | `npm run build` |
| Répertoire de sortie | `dist` |
| Répertoire racine | *(vide)* |
| Commentaires de build sur les PR/commits | **Activé** |

> La connexion Git native nécessite l'autorisation OAuth de l'app GitHub Cloudflare (étape manuelle
> dans le dashboard, non automatisable par token). Le chemin **A** ci‑dessus fait la même chose sans OAuth.

### Déploiement manuel (depuis n'importe quelle machine)
```bash
npm run build
npx wrangler pages deploy dist --project-name=cda-blog-asso-preprod --branch=main
```
(`CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` doivent être dans l'environnement.)

---

## 2. Passage en production (après validation de la préprod)

Le domaine `cda-blog-asso.com` est déjà **ajouté à Cloudflare** (zone en attente : les DNS/nameservers
ne pointent pas encore vers Cloudflare). Une fois la préprod validée :

1. **Pointer les nameservers** du domaine vers ceux indiqués par Cloudflare (dashboard → la zone `cda-blog-asso.com`).
   Attendre que la zone passe `active`.
2. **Attacher le domaine + créer la redirection www** en une commande :
   ```bash
   node scripts/cf-domain-setup.mjs
   ```
   Ce script :
   - attache **`cda-blog-asso.com`** (apex, non‑www) au projet Pages ;
   - crée l'enregistrement DNS `www` (CNAME proxied → `cda-blog-asso-preprod.pages.dev`) ;
   - crée la **Redirect Rule 301 `www.cda-blog-asso.com` → `https://cda-blog-asso.com/…`** (chemin + query préservés).
3. Vérifier : `curl -I https://www.cda-blog-asso.com/` doit renvoyer `301` vers `https://cda-blog-asso.com/`.

> **Mise en prod = fusion.** Le code vit sur `claude/cda-blog-redesign-9ayq7n`. Fusionner cette branche
> dans `main` déclenche le déploiement de production (chemin A) — c'est le seul geste nécessaire.

---

## 3. Canonicalisation & SEO

- **Host canonique unique : non‑www.** Toutes les balises `<link rel=canonical>`, l'`og:url`, le sitemap
  et le RSS utilisent `https://cda-blog-asso.com`.
- **Slugs 100 % identiques** à l'ancien site : permaliens `/{id}-{slug}/` (ex. `/2292-stylo-personnalise-…/`).
  Aucune redirection d'URL n'est donc nécessaire côté chemins ; seul le host `www` est redirigé.
- `robots.txt` + `sitemap-index.xml` + `rss.xml` générés automatiquement.
- En‑têtes de sécurité et cache immuable des assets : `public/_headers`.

---

## 4. Contenu (pipeline)

```bash
npm run data:posts        # récupère les 643 métadonnées (titre, slug, image) depuis WordPress
npm run gen:content -- --all --concurrency 5   # régénère TOUT le contenu via gpt-5.6-terra (reprend les manquants)
npm run data:images       # télécharge + optimise les images à la une des articles publiés (webp)
npm run gen:images        # génère via gpt-image-2 les images manquantes (articles sans image)
npm run build             # build statique → dist/
```

- `gen:content` est **idempotent et reprenable** : relancer ne régénère que les articles manquants.
  Options : `--limit N`, `--ids 1,2,3`, `--force`, `--concurrency N`.
- Un article n'est **publié** (page générée + listé) que lorsque son fichier `content/{id}.json` existe.
- Clés requises dans l'environnement : `OPENAI_API_KEY`, et pour le déploiement `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.
