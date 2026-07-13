# CLAUDE.md — Guide de travail pour Claude sur **cda-blog-asso.com**

> Ce fichier fixe **comment intervenir** sur le projet. Il **complète** l'état actuel du
> site (il ne le remplace pas et ne demande aucune refonte). En cas de doute, la priorité
> est : ne rien casser, respecter la ligne éditoriale, publier de la qualité.

---

## ⚠️ Règles d'intervention (impératives)

### Règle n°1 — TOUJOURS travailler sur `main`
Toute session — développement, rédaction, amélioration, correction — se fait **directement
sur la branche `main`**. **Ne JAMAIS créer de branche** ni travailler sur une branche
secondaire. On commit et on pousse sur `main`.

```bash
git checkout main
# … modifications …
git add -A && git commit -m "…"
git push -u origin main
```

### Règle n°2 — Toujours en qualité optimale
Se mettre **systématiquement en qualité maximale** du modèle (le réglage le plus intelligent /
le plus performant : modèle le plus capable + effort de raisonnement élevé) pour **chaque**
intervention — rédaction comme code.
**Seule exception :** la génération d'image OpenAI reste en **`quality: "medium"`** (voir §6).

### Règle n°3 — Clés API / tokens : depuis l'environnement, jamais en dur
Les clés et tokens nécessaires sont fournis par l'**environnement cloud de Claude Code**
(`process.env`). Il faut les **lire depuis l'environnement**, ne jamais les redemander, et
**ne jamais les écrire en dur** dans le code, un fichier de config ou un commit.

Variables attendues dans l'environnement :

| Variable | Usage |
| --- | --- |
| `OPENAI_API_KEY` | Génération des **images** (et, historiquement, du contenu). |
| `OPENAI_TEXT_MODEL` | Modèle texte OpenAI (pipeline historique — voir §0). |
| `OPENAI_IMAGE_MODEL` | Modèle image OpenAI (défaut projet : `gpt-image-2`). |
| `OPENAI_BASE_URL` | (optionnel) surcharge de l'endpoint OpenAI. |
| `CLOUDFLARE_API_TOKEN` | Déploiement Cloudflare Pages. |
| `CLOUDFLARE_ACCOUNT_ID` | Déploiement Cloudflare Pages. |

> Ne jamais committer ces valeurs. `.env`, secrets et tokens restent hors du dépôt.

---

## 1. Le site en bref

**CDA — Le magazine** (`www.cda-blog-asso.com`) est un **magazine associatif indépendant**
francophone, grand public. Il **décrypte le quotidien** : conseils pratiques, comparatifs et
guides fiables pour **aider le lecteur à décider** (auto, assurance, maison, mode, voyage,
santé, et plus).

- **Signature :** « Les idées claires sur tout ce qui compte ».
- **Nature :** site **statique** (Astro, sortie `dist/`), **ultra-optimisé SEO & vitesse**,
  zéro JS par défaut, design minimaliste (papier × encre, un seul accent, animations sobres
  et accessibles, thèmes clair/sombre).
- **Indépendance :** aucun annonceur ne dicte la ligne. Pas de publicité intrusive.
- **Modèle de rendu :** chaque article est un fichier **`content/{id}.json`** (blocs
  structurés) — c'est la **source de vérité** du rendu. Un article n'est **publié** que si son
  `content/{id}.json` existe (avec au moins 6 blocs).

**Stack & arborescence utile**

```
data/        posts.json (métadonnées), taxonomy.json (12 rubriques), images.json (manifeste)
content/     {id}.json  — contenu structuré par article (SOURCE DE VÉRITÉ du rendu)
scripts/     fetch-posts · generate-content · fetch-images · generate-images · cf-domain-setup
src/lib/     posts.ts (chargement + related), images.ts, site.ts
src/pages/   index · [permalink] (article) · articles · rubriques · a-propos · rss.xml · 404 …
public/      _headers, _redirects, robots.txt, favicon, /media (images webp)
```

**Commandes**

```bash
npm run dev            # http://localhost:4321
npm run build          # → dist/ (build statique)
npm run preview        # prévisualiser le build
npm run gen:images -- --ids <id>   # générer l'image à la une d'un article (gpt-image-2)
```

**Rubriques (12 — slugs exacts, cf. `data/taxonomy.json`)**

`auto-mobilite` · `assurance-finance` · `maison-immobilier` · `mode-style` · `voyage-evasion`
· `sante-bien-etre` · `loisirs-sport` · `famille-education` · `business-pro` · `tech-objets`
· `culture-societe` · `nature-animaux`.

Chaque article se range dans **une seule** rubrique (champ `category` = le slug).

---

## 2. Identité & ton

- **Langue :** français, **vouvoiement** systématique.
- **Voix :** claire, précise, **pédagogique et vivante**. On écrit pour être **compris**, pas
  pour impressionner. Zéro jargon inutile, zéro remplissage, zéro paraphrase creuse.
- **Valeurs de la marque :** **Clarté · Indépendance · Utilité · Rigueur.**
- **Promesse :** partir d'une **vraie question** et y répondre **entièrement**, pour que le
  lecteur reparte avec une **décision actionnable** (choisir, comparer, agir).
- **Fiabilité (E-E-A-T) — non négociable :**
  - N'**invente jamais** de statistique précise, d'étude, de source, de citation ou de prix
    présentés comme vérifiés. Utilise des **ordres de grandeur prudents** (« comptez souvent »,
    « en général », « selon les modèles »).
  - Ne **mentionne jamais** l'IA, ni ce système, ni la façon dont l'article est produit.
  - Neutralité commerciale : on informe, on ne vend pas ; on nomme les compromis honnêtement.

---

## 0. Règles d'or de la rédaction (prioritaires)

> Numérotées « 0 » car elles **priment** sur le reste des consignes rédactionnelles.

1. **La rédaction est faite par Claude, pas par l'API.**
   Le **corps de l'article est écrit par Claude directement en session** (modèle le plus
   intelligent, qualité maximale — Règle n°2). On **n'utilise plus le pipeline texte OpenAI**
   (`gen:content` / `gpt-5.6-terra`) pour produire de nouveaux articles. **Seules les images**
   passent encore par OpenAI (§6). *(Le script historique `scripts/generate-content.mjs`
   reste dans le dépôt pour référence mais n'est plus le mode de création.)*

2. **Anti-cannibalisation.** Si le sujet est libre, **vérifier d'abord l'existant** : chaque
   nouvel article doit porter sur un **sujet distinct** de ce qui est déjà publié, pour éviter
   la cannibalisation SEO (voir §3).

3. **Qualité avant tout.** Chaque article doit apporter **les meilleures informations** sur
   son sujet : des détails en plus et, **selon la pertinence**, des éléments riches (tableau,
   comparaison, astuces, FAQ, citation, chiffres…). Ce sont des **exemples** — inutile de tout
   mettre à chaque fois (voir §4).

4. **Photo OpenAI obligatoire.** **Jamais** publier un article **sans visuel**. Toujours une
   **vraie photo à la une générée par OpenAI**, « photo généraliste sur le thème, ultra
   réaliste », **avant publication** (voir §6).

5. **Liens internes.** Ajouter **1 à 3 liens internes** par article (jusqu'à 4 si vraiment
   pertinent) vers d'autres pages du site (voir §5).

---

## 3. Avant d'écrire — anti-cannibalisation

Avant de rédiger (surtout si le sujet est libre) :

1. **Inventorier l'existant.** Parcourir `data/posts.json` (titres, slugs, excerpts) et les
   `content/{id}.json` de la rubrique visée pour repérer les sujets déjà traités.
   ```bash
   node -e "require('./data/posts.json').forEach(p=>console.log(p.id, p.title))"
   ```
2. **Un article = un angle unique.** Le nouveau sujet doit se **distinguer nettement** d'un
   article existant (angle, intention de recherche, mot-clé principal). En cas de proximité,
   **changer d'angle** (public, cas d'usage, sous-question) plutôt que dupliquer.
3. **Mot-clé principal clair.** Choisir **une** intention de recherche dominante et bâtir le
   `metaTitle`/`H1` autour d'elle. Deux articles ne doivent pas viser le même mot-clé.
4. **Maillage plutôt que doublon.** Si un sujet proche existe, on **lie** vers lui (§5) au
   lieu de le réécrire.

---

## 4. Qualité rédactionnelle

**Objectif :** le meilleur contenu disponible sur la question, pas le plus long.

- **Longueur cible :** ~**1300 à 1900 mots** de contenu substantiel (hors FAQ). Le volume
  n'est jamais un but ; la **densité utile** l'est.
- **Structure attendue** (blocs de `content/{id}.json`, cf. §7) :
  - un **`lead`** d'accroche (2-4 phrases) qui pose l'enjeu et promet la réponse ;
  - **6 à 9 sections `heading` H2** (level 2), sous-parties H3 si utile, en progression
    logique ; `id` de titre en minuscules, sans accent, mots séparés par tirets, uniques ;
  - une **section conclusive actionnable** (pas un simple « En conclusion ») ;
  - **3 à 5 `keyTakeaways`** (l'essentiel, phrases courtes) ;
  - une **FAQ de 4 à 6** vraies questions de longue traîne, réponses complètes.
- **Enrichir seulement quand ça aide vraiment le lecteur** (exemples, pas obligations) :
  - **`table`** — au moins un **tableau comparatif** pertinent est généralement attendu ;
  - **`compare`** (2 colonnes A/B) dès qu'il y a un **choix** ou une opposition d'options ;
  - **`callout`** — mises en avant : `info` (bon à savoir), `tip` (conseil), `warning`
    (attention / erreur fréquente), `key` (à retenir) ;
  - **`steps`** pour toute procédure / méthode ;
  - **`stats`** pour 2-4 chiffres-clés en **ordres de grandeur** (jamais de faux chiffres
    précis) ;
  - **`quote`** avec `cite` optionnel.
- **HTML inline autorisé uniquement** dans les champs `html`/`items` : `<strong>`, `<em>`,
  `<a href="…">`, `<br>`. **Rien d'autre** (pas de balise de bloc, style ni script).
- **Champs SEO :** `metaTitle` **≤ 62 caractères** (contient le mot-clé principal),
  `metaDescription` **150-158 caractères**, `dek` (chapô 1-2 phrases), `tags` **3-6** courts.

---

## 5. Liens internes (1 à 3 par article, jusqu'à 4)

- **Combien :** **1 à 3** liens internes contextuels par article (jusqu'à **4** si réellement
  pertinent). Placés **dans le corps** du texte, au fil des paragraphes — en plus des articles
  liés affichés automatiquement en bas de page (`getRelated`).
- **Format d'URL :** un lien interne pointe vers un permalien **relatif** :
  **`/{id}-{slug}/`** (ex. `/9001-automatiser-taches-repetitives-ia-methode-julien-jimenez/`).
  Dans un bloc, cela donne : `<a href="/9001-automatiser-…/">texte d'ancre</a>`.
- **Vérifier la cible :** le lien doit pointer vers un article **réellement publié** (une
  entrée dans `data/posts.json` **et** un `content/{id}.json` existant). Ne jamais lier vers
  une page inexistante.
- **Ancre naturelle & pertinente :** texte d'ancre descriptif (pas « cliquez ici »), et lien
  **thématiquement lié** — priorité aux articles de la **même rubrique** ou aux tags partagés.
- **Sens du maillage :** privilégier les liens qui **aident le lecteur à approfondir** ou à
  décider ; c'est aussi le bon réflexe anti-cannibalisation (§3).

---

## 6. Photo — toujours une vraie photo OpenAI avant publication

**Règle absolue :** jamais publier un article sans visuel. Toujours **une** vraie **photo de
couverture (hero) générée par OpenAI**, « **ultra réaliste** », avant publication.

- **Modèle & paramètres** (via `OPENAI_API_KEY`, modèle `gpt-image-2`) :
  ```json
  { "model": "gpt-image-2", "size": "1536x1024", "quality": "medium" }
  ```
- **Une seule image (hero) par article.** **Pas de galerie**, pas d'image dans le corps.
- **Style de prompt :** photographie éditoriale **ultra réaliste**, généraliste sur le thème,
  lumière naturelle, composition soignée et épurée, cadrage **horizontal**, **aucun texte /
  logo / filigrane**, pas de visage reconnaissable en gros plan.
- **Méthode recommandée** (génère + optimise en WebP + met à jour `data/images.json`) :
  ```bash
  npm run gen:images -- --ids <id>
  ```
  Le script produit `/public/media/{id}-sm.webp` + `{id}-lg.webp` (1536×1024) et enregistre
  l'entrée dans `data/images.json`. Renseigner un `alt` descriptif dans l'entrée `image` de
  `data/posts.json`.

---

## 7. Créer un nouvel article (workflow « Claude rédige »)

Un article publié = **3 éléments cohérents** portant le même `id` :

1. **Métadonnées** dans `data/posts.json` (tableau, le plus récent en tête) :
   ```json
   {
     "id": 9002,
     "slug": "mon-sujet-en-slug",
     "permalink": "9002-mon-sujet-en-slug",
     "title": "Titre lisible de l'article",
     "excerpt": "Chapô/résumé court (sert de fallback).",
     "date": "2026-07-13T09:00:00",
     "modified": "2026-07-13T09:00:00",
     "image": { "url": "/media/9002-lg.webp", "full": "/media/9002-lg.webp", "width": 1536, "height": 1024, "alt": "Description de la photo" }
   }
   ```
   > **Convention d'`id` pour les articles rédigés par Claude : plage `9000+`** (le dernier
   > utilisé est **9001** → prendre `9002`, `9003`, …). Cela évite toute collision avec les
   > `id` hérités de l'ancien site.

2. **Contenu** dans `content/{id}.json` — **rédigé par Claude** (voir §2, §4), au format :
   `metaTitle`, `metaDescription`, `dek`, `category` (slug), `tags[]`, `keyTakeaways[]`,
   `blocks[]` (`lead`, `heading`, `paragraph`, `list`, `callout`, `table`, `compare`, `steps`,
   `stats`, `quote`), `faq[]`. S'inspirer d'un `content/{id}.json` existant comme gabarit.
   Ne pas mentionner l'IA. **Insérer les liens internes** (§5) dans les blocs.

3. **Image à la une** via OpenAI (§6) → `data/images.json` + `/public/media/{id}-*.webp`.

Puis **vérifier** :

```bash
npm run build && npm run preview   # contrôler le rendu de l'article et des liens internes
```

Enfin **committer et pousser sur `main`** (Règle n°1). L'article n'apparaît sur le site que
lorsque `content/{id}.json` existe (≥ 6 blocs) — la présence des 3 éléments ci-dessus garantit
une publication propre, avec visuel.

---

## 8. SEO, performance & déploiement (à préserver)

- **Permaliens identiques** à l'ancien site : `/{id}-{slug}/`. **Ne pas** changer les URLs
  déjà indexées. Host canonique = **www**.
- **JSON-LD** `Organization` / `WebSite` / `BlogPosting` / `BreadcrumbList` / `FAQPage`,
  sitemap + RSS + robots générés automatiquement — ne pas casser ces sorties.
- **Zéro CLS** : images avec `width`/`height`, WebP, polices variables auto-hébergées, CSS
  critique en ligne, `prefers-reduced-motion` respecté.
- **Déploiement :** Cloudflare Pages ; un push sur `main` déclenche la prod (cf.
  `DEPLOYMENT.md`). Ne pas exposer de secrets dans les commits.

---

### Rappel final
Travailler **sur `main`**, en **qualité maximale**, avec les **clés depuis l'environnement**.
Rédiger soi-même un contenu **utile, honnête et unique**, **maillé** en interne, illustré d'une
**photo OpenAI ultra réaliste** — **avant** toute publication.
