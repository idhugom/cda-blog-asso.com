import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'https://cda-blog-asso-preprod.pages.dev';
const OUT = '/home/user/cda-blog-asso.com/media-cache/shots';
mkdirSync(OUT, { recursive: true });

const pages = [
  ['home', '/'],
  ['article', '/2220-modification-bail-location/'],
  ['rubriques', '/rubriques/'],
  ['articles', '/articles/'],
  ['apropos', '/a-propos/'],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function shoot(name, path, { width, height, theme, full }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(900);
  // reveal-all: force any not-yet-revealed elements visible for the shot
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.setAttribute('data-reveal', 'in')));
  await page.waitForTimeout(300);
  const file = `${OUT}/${name}-${theme}-${width}.png`;
  await page.screenshot({ path: file, fullPage: !!full });
  console.log('✓', file);
  await ctx.close();
}

await shoot('home', '/', { width: 1440, height: 900, theme: 'light', full: true });
await shoot('home', '/', { width: 1440, height: 900, theme: 'dark', full: true });
await shoot('article', '/2220-modification-bail-location/', { width: 1440, height: 900, theme: 'light', full: true });
await shoot('rubriques', '/rubriques/', { width: 1440, height: 900, theme: 'light', full: false });
await shoot('articles', '/articles/', { width: 1440, height: 900, theme: 'light', full: false });
await shoot('home-mobile', '/', { width: 390, height: 844, theme: 'light', full: true });
await shoot('article-mobile', '/2220-modification-bail-location/', { width: 390, height: 844, theme: 'dark', full: false });

await browser.close();
console.log('done');
