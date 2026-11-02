const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- Starting Playwright Browser Branding Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Test 1: Load Homepage with domcontentloaded
  console.log('Navigating to http://localhost:3000/...');
  const response = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Homepage status:', response.status());

  await page.waitForTimeout(1000);

  const title = await page.title();
  console.log('DOM Title:', title);

  const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
  console.log('DOM Description:', description);

  const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => null);
  console.log('DOM og:title:', ogTitle);

  const ogDesc = await page.$eval('meta[property="og:description"]', el => el.content).catch(() => null);
  console.log('DOM og:description:', ogDesc);

  const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);
  console.log('DOM og:image:', ogImage);

  const ogSiteName = await page.$eval('meta[property="og:site_name"]', el => el.content).catch(() => null);
  console.log('DOM og:site_name:', ogSiteName);

  const twitterCard = await page.$eval('meta[name="twitter:card"]', el => el.content).catch(() => null);
  console.log('DOM twitter:card:', twitterCard);

  const twitterImage = await page.$eval('meta[name="twitter:image"]', el => el.content).catch(() => null);
  console.log('DOM twitter:image:', twitterImage);

  const iconHrefs = await page.$$eval('link[rel*="icon"]', els => els.map(e => ({ rel: e.rel, href: e.href, sizes: e.getAttribute('sizes'), type: e.type })));
  console.log('DOM Icon Links:', JSON.stringify(iconHrefs, null, 2));

  const appleIcons = await page.$$eval('link[rel="apple-touch-icon"]', els => els.map(e => ({ rel: e.rel, href: e.href, sizes: e.getAttribute('sizes') })));
  console.log('DOM Apple Icons:', JSON.stringify(appleIcons, null, 2));

  const jsonLdContent = await page.$eval('script[type="application/ld+json"]', el => el.textContent).catch(() => null);
  console.log('DOM JSON-LD:', jsonLdContent ? jsonLdContent.slice(0, 300) : 'NOT FOUND');

  // Verify no Nexsas in whole page text
  const bodyText = await page.innerText('body');
  const nexsasFound = /nexsas/i.test(bodyText);
  console.log('Body contains Nexsas:', nexsasFound);

  // Capture Screenshots
  const outDir = path.join(process.cwd(), 'docs/Saas/screenshots/branding');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.screenshot({ path: path.join(outDir, '01_homepage_branded_1440.png'), fullPage: false });
  console.log('Saved: docs/Saas/screenshots/branding/01_homepage_branded_1440.png');

  // Mobile Viewport
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, '02_homepage_branded_390.png') });
  console.log('Saved: docs/Saas/screenshots/branding/02_homepage_branded_390.png');

  // Test direct asset endpoints
  const testEndpoints = [
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-96x96.png',
    '/favicon.webp',
    '/apple-touch-icon.png',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png',
    '/og-image.png',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest'
  ];

  console.log('\n--- Checking Asset HTTP Endpoints ---');
  for (const ep of testEndpoints) {
    const res = await page.request.get(`http://localhost:3000${ep}`);
    const bodyBuf = await res.body();
    console.log(`${ep.padEnd(30)} -> HTTP ${res.status()} [${res.headers()['content-type']}] (${bodyBuf.length} bytes)`);
  }

  await browser.close();
  console.log('\nPlaywright verification completed successfully!');
}

main().catch(e => {
  console.error('Playwright verification failed:', e);
  process.exit(1);
});
