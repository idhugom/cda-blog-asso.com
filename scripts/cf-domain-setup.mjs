// One-shot: attach the apex custom domain to the Pages project + create the
// www -> non-www 301 redirect rule at the zone level.
// Run AFTER you have pointed the domain's nameservers to Cloudflare (zone active).
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
  // 1) Attacher le domaine apex (non-www) au projet Pages
  const dom = await call(`/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: APEX }),
  });
  console.log('Custom domain apex:', dom.success ? '✓ attaché' : JSON.stringify(dom.errors));

  // 2) Trouver la zone
  const zones = await call(`/zones?name=${APEX}`);
  const zone = zones.result?.[0];
  if (!zone) return console.error('✗ Zone introuvable (nameservers pas encore actifs ?)');
  console.log('Zone:', zone.id, '· statut:', zone.status);

  // 3) S'assurer qu'un enregistrement DNS www existe (proxied) pour capter la requête
  const existing = await call(`/zones/${zone.id}/dns_records?name=${WWW}`);
  if (!existing.result?.length) {
    const rec = await call(`/zones/${zone.id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: 'www', content: `${PROJECT}.pages.dev`, proxied: true }),
    });
    console.log('DNS www:', rec.success ? '✓ créé (proxied)' : JSON.stringify(rec.errors));
  } else {
    console.log('DNS www: déjà présent');
  }

  // 4) Redirect Rule www -> non-www (301) via ruleset dynamic redirect
  const phase = `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  const rule = {
    description: 'www -> non-www (canonicalisation)',
    expression: `(http.host eq "${WWW}")`,
    action: 'redirect',
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: { expression: `concat("https://${APEX}", http.request.uri.path)` },
        preserve_query_string: true,
      },
    },
  };
  const put = await call(phase, { method: 'PUT', body: JSON.stringify({ rules: [rule] }) });
  console.log('Redirect www→non-www:', put.success ? '✓ créé' : JSON.stringify(put.errors));

  console.log('\nTerminé. Vérifiez : https://www.cda-blog-asso.com/ doit renvoyer 301 vers https://cda-blog-asso.com/');
}
main().catch((e) => { console.error(e); process.exit(1); });
