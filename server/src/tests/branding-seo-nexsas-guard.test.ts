import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function run() {
  console.log('--- Running Branding, SEO Metadata, Favicon & Nexsas Removal Guard Tests ---');
  const rootDir = path.resolve(__dirname, '../../..');

  // Test 1: CMS/src/utils/generateMetaData.ts
  {
    console.log('[Test 1] CMS/src/utils/generateMetaData.ts authoritative configuration');
    const metaPath = path.join(rootDir, 'CMS/src/utils/generateMetaData.ts');
    assert.strictEqual(fs.existsSync(metaPath), true, 'generateMetaData.ts must exist');
    const content = fs.readFileSync(metaPath, 'utf8');

    assert.ok(content.includes("DEFAULT_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masterhrms.com'"), 'DEFAULT_URL must point to www.masterhrms.com');
    assert.ok(content.includes("DEFAULT_TITLE = 'MasterHRMS — Enterprise HRMS, Payroll & Workforce Management'"), 'DEFAULT_TITLE must match authoritative SEO title');
    assert.ok(content.includes('Manage your workforce with MasterHRMS'), 'DEFAULT_DESCRIPTION must match authoritative description');
    assert.ok(content.includes("DEFAULT_IMAGE_URL = 'https://www.masterhrms.com/og-image.png'"), 'DEFAULT_IMAGE_URL must point to production og-image.png');
    assert.ok(content.includes("siteName: 'MasterHRMS'"), 'Open Graph site name must be MasterHRMS');
    assert.ok(content.includes("card: 'summary_large_image'"), 'Twitter card must be summary_large_image');

    assert.ok(!/prismic\.io/i.test(content), 'Must not reference Prismic');
    assert.ok(!/staticmania/i.test(content), 'Must not reference Static Mania');
    assert.ok(!/nexsas/i.test(content), 'Must not reference Nexsas');
    assert.ok(!/next-saas/i.test(content), 'Must not reference Next-SaaS');
    console.log('  PASSED: generateMetaData.ts is fully authoritative');
  }

  // Test 2: CMS/src/app/layout.tsx
  {
    console.log('[Test 2] CMS/src/app/layout.tsx metadata, structured data & icons');
    const layoutPath = path.join(rootDir, 'CMS/src/app/layout.tsx');
    assert.strictEqual(fs.existsSync(layoutPath), true, 'layout.tsx must exist');
    const content = fs.readFileSync(layoutPath, 'utf8');

    assert.ok(content.includes('metadataBase: new URL("https://www.masterhrms.com")'), 'layout.tsx must define metadataBase');
    assert.ok(content.includes('template: "%s — MasterHRMS"'), 'layout.tsx must define MasterHRMS title template');
    assert.ok(content.includes('default: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management"'), 'layout.tsx must define default title');
    assert.ok(content.includes('applicationName: "MasterHRMS"'), 'layout.tsx must define applicationName');
    assert.ok(content.includes('canonical: "https://www.masterhrms.com"'), 'layout.tsx must define canonical URL');
    assert.ok(content.includes('og-image.png'), 'layout.tsx must reference og-image.png');
    assert.ok(content.includes('schema.org'), 'layout.tsx must include Schema.org structured data');
    assert.ok(content.includes('"@type": "Organization"'), 'layout.tsx must include Organization schema');
    assert.ok(content.includes('"@type": "SoftwareApplication"'), 'layout.tsx must include SoftwareApplication schema');
    assert.ok(content.includes('"@type": "WebSite"'), 'layout.tsx must include WebSite schema');
    assert.ok(!/nexsas/i.test(content), 'layout.tsx must not contain Nexsas');
    console.log('  PASSED: layout.tsx contains authoritative metadata and Schema.org JSON-LD');
  }

  // Test 3: Brand Assets Integrity
  {
    console.log('[Test 3] Brand assets existence, non-zero size & correct dimensions');
    const iconPaths = [
      'CMS/src/app/favicon.ico',
      'CMS/public/favicon.ico',
      'CMS/src/app/favicon-96x96.png',
      'CMS/src/app/apple-touch-icon.png',
      'CMS/src/app/web-app-manifest-192x192.png',
      'CMS/src/app/web-app-manifest-512x512.png',
      'CMS/src/app/favicon.svg',
      'CMS/public/favicon.webp',
      'CMS/public/og-image.png',
    ];

    for (const rel of iconPaths) {
      const full = path.join(rootDir, rel);
      assert.strictEqual(fs.existsSync(full), true, `Asset ${rel} must exist`);
      assert.ok(fs.statSync(full).size > 0, `Asset ${rel} must not be empty`);
    }

    const ogMeta = await sharp(path.join(rootDir, 'CMS/public/og-image.png')).metadata();
    assert.strictEqual(ogMeta.width, 1200, 'og-image.png must be 1200px wide');
    assert.strictEqual(ogMeta.height, 630, 'og-image.png must be 630px high');

    const appleMeta = await sharp(path.join(rootDir, 'CMS/src/app/apple-touch-icon.png')).metadata();
    assert.strictEqual(appleMeta.width, 180, 'apple-touch-icon.png must be 180px wide');
    assert.strictEqual(appleMeta.height, 180, 'apple-touch-icon.png must be 180px high');

    const pwa192Meta = await sharp(path.join(rootDir, 'CMS/src/app/web-app-manifest-192x192.png')).metadata();
    assert.strictEqual(pwa192Meta.width, 192, 'web-app-manifest-192x192.png must be 192px wide');
    assert.strictEqual(pwa192Meta.height, 192, 'web-app-manifest-192x192.png must be 192px high');

    const pwa512Meta = await sharp(path.join(rootDir, 'CMS/src/app/web-app-manifest-512x512.png')).metadata();
    assert.strictEqual(pwa512Meta.width, 512, 'web-app-manifest-512x512.png must be 512px wide');
    assert.strictEqual(pwa512Meta.height, 512, 'web-app-manifest-512x512.png must be 512px high');

    console.log('  PASSED: All brand assets verified with correct dimensions');
  }

  // Test 4: Web manifests
  {
    console.log('[Test 4] Web manifests');
    const manifests = [
      path.join(rootDir, 'CMS/src/app/site.webmanifest'),
      path.join(rootDir, 'CMS/public/manifest.webmanifest'),
    ];

    for (const m of manifests) {
      assert.strictEqual(fs.existsSync(m), true, `Manifest ${m} must exist`);
      const parsed = JSON.parse(fs.readFileSync(m, 'utf8'));
      assert.strictEqual(parsed.name, 'MasterHRMS');
      assert.strictEqual(parsed.short_name, 'MasterHRMS');
      assert.ok(Array.isArray(parsed.icons) && parsed.icons.length > 0, 'Manifest must have icons');
      assert.ok(!/nexsas/i.test(JSON.stringify(parsed)), 'Manifest must not reference Nexsas');
      assert.ok(!/pixels71/i.test(JSON.stringify(parsed)), 'Manifest must not reference Pixels71');
    }
    console.log('  PASSED: Web manifests valid and clean');
  }

  // Test 5: Search engine robots.ts and sitemap.ts
  {
    console.log('[Test 5] Search engine robots.ts and sitemap.ts');
    const robotsPath = path.join(rootDir, 'CMS/src/app/robots.ts');
    const sitemapPath = path.join(rootDir, 'CMS/src/app/sitemap.ts');

    assert.strictEqual(fs.existsSync(robotsPath), true, 'robots.ts must exist');
    assert.strictEqual(fs.existsSync(sitemapPath), true, 'sitemap.ts must exist');

    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    assert.ok(robotsContent.includes('https://www.masterhrms.com/sitemap.xml'), 'robots.ts must link to sitemap.xml');
    assert.ok(robotsContent.includes('/(workspace)/'), 'robots.ts must disallow workspace');
    assert.ok(robotsContent.includes('/super/'), 'robots.ts must disallow super admin');
    assert.ok(robotsContent.includes('/api/'), 'robots.ts must disallow API');

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    assert.ok(sitemapContent.includes('https://www.masterhrms.com'), 'sitemap.ts must use canonical production URL');
    console.log('  PASSED: Search engine crawling rules configured');
  }

  // Test 6: Zero prohibited template strings in CMS/src/app
  {
    console.log('[Test 6] Absence of prohibited template branding strings in CMS/src/app');
    const scanDirs = [
      path.join(rootDir, 'CMS/src/app'),
      path.join(rootDir, 'CMS/src/utils'),
    ];

    const forbidden = [
      /nexsas/i,
      /automation\s+saas\s*\|\|\s*nexsas/i,
      /staticmania/i,
      /prismic\.io/i,
      /next-saas-next/i,
    ];

    function checkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          checkDir(full);
        } else if (/\.(tsx|ts|js|jsx)$/.test(e.name)) {
          const content = fs.readFileSync(full, 'utf8');
          for (const pattern of forbidden) {
            assert.ok(!pattern.test(content), `Found prohibited string matching ${pattern} in ${path.relative(rootDir, full)}`);
          }
        }
      }
    }

    scanDirs.forEach(d => checkDir(d));
    console.log('  PASSED: Zero prohibited template strings in CMS app and utils');
  }

  // Test 7: server/src/routes/cms.routes.ts fallback
  {
    console.log('[Test 7] server/src/routes/cms.routes.ts fallback metadata');
    const routesPath = path.join(rootDir, 'server/src/routes/cms.routes.ts');
    const content = fs.readFileSync(routesPath, 'utf8');

    assert.ok(content.includes('title: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management"'), 'Home fallback must use MasterHRMS title');
    assert.ok(content.includes('Manage your workforce with MasterHRMS'), 'Home fallback must use MasterHRMS description');
    assert.ok(!/title:\s*["']Home\s*—\s*Next-Gen Automation SaaS["']/i.test(content), 'Home fallback must not use template title');
    console.log('  PASSED: cms.routes.ts fallback uses authoritative metadata');
  }

  // Test 8: server/scripts/seed-canonical-cms-pages.ts
  {
    console.log('[Test 8] server/scripts/seed-canonical-cms-pages.ts template purge');
    const seedPath = path.join(rootDir, 'server/scripts/seed-canonical-cms-pages.ts');
    const content = fs.readFileSync(seedPath, 'utf8');

    assert.ok(!/nexsas/i.test(content), 'seed script must not reference Nexsas');
    assert.ok(!/automation\s+saas/i.test(content), 'seed script must not reference Automation SaaS');
    assert.ok(content.includes('MasterHRMS — Enterprise HRMS, Payroll & Workforce Management'), 'seed script must use MasterHRMS title');
    console.log('  PASSED: seed-canonical-cms-pages.ts has all template branding purged');
  }

  console.log('=======================================================');
  console.log('ALL 8 BRANDING & SEO GUARD TESTS PASSED SUCCESSFULLY!  ');
  console.log('=======================================================');
}

run().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
