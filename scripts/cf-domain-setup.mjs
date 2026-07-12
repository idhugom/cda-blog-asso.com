// One-shot: attach the WWW custom domain to the Pages project + create the
// apex (non-www) -> www 301 redirect rule at the zone level.
// Canonical host = https://www.cda-blog-asso.com
//   node scripts/cf-domain-setup.mjs
const API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PROJECT = 'cda-blog-asso-preprod';
const APEX = 'cda-blog-asso.com';
const WWW = 'www.cda-blog-asso.com';

const h = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const call = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, { headers: h, ...opts });
  return res.json();
};

async function main() {
  // 1) Attacher le domaine www (canonique) au projet Pages
  const dom = await call(`/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: WWW }),
  });
  console.log('Custom domain www:', dom.success ? '✓ attaché' : JSON.stringify(dom.errors));

  // 2) Trouver la zone
  const zones = await call(`/zones?name=${APEX}`);
  const zone = zones.result?.[0];
  if (!zone) return console.error('✗ Zone introuvable / inactive');
  console.log('Zone:', zone.id, '· statut:', zone.status);

  // 3) DNS www : CNAME proxied -> Pages (souvent créé automatiquement par l'attache ci-dessus)
  const wwwRec = await call(`/zones/${zone.id}/dns_records?name=${WWW}`);
  if (!wwwRec.result?.length) {
    const rec = await call(`/zones/${zone.id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: 'www', content: `${PROJECT}.pages.dev`, proxied: true }),
    });
    console.log('DNS www:', rec.success ? '✓ créé (proxied)' : JSON.stringify(rec.errors));
  } else {
    console.log('DNS www: déjà présent');
  }

  // 4) DNS apex : un enregistrement proxied doit exister pour capter la requête à rediriger
  const apexRec = await call(`/zones/${zone.id}/dns_records?name=${APEX}`);
  if (!apexRec.result?.length) {
    const rec = await call(`/zones/${zone.id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: '@', content: `${PROJECT}.pages.dev`, proxied: true }),
    });
    console.log('DNS apex:', rec.success ? '✓ créé (proxied)' : JSON.stringify(rec.errors));
  } else {
    console.log('DNS apex: déjà présent');
  }

  // 5) Redirect Rule apex -> www (301)
  const phase = `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  const rule = {
    description: 'apex -> www (canonicalisation)',
    expression: `(http.host eq "${APEX}")`,
    action: 'redirect',
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: { expression: `concat("https://${WWW}", http.request.uri.path)` },
        preserve_query_string: true,
      },
    },
  };
  const put = await call(phase, { method: 'PUT', body: JSON.stringify({ rules: [rule] }) });
  console.log('Redirect apex→www:', put.success ? '✓ créé' : JSON.stringify(put.errors));

  console.log('\nTerminé. Vérifiez : https://cda-blog-asso.com/ doit renvoyer 301 vers https://www.cda-blog-asso.com/');
}
main().catch((e) => { console.error(e); process.exit(1); });
