// Canonicalisation au niveau edge : apex (sans-www) -> www en 301.
// S'exécute sur toutes les requêtes servies par Cloudflare Pages.
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  if (url.hostname === 'cda-blog-asso.com') {
    url.hostname = 'www.cda-blog-asso.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
