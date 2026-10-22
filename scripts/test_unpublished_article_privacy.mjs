// Empirical Verification for Gate 2: Unpublished Article Privacy
import assert from 'node:assert/strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('../server/node_modules/jsonwebtoken');

async function testUnpublishedPrivacy() {
  console.log('--- Starting Gate 2: Unpublished Article Privacy Verification ---');

  const superToken = jwt.sign(
    {
      userId: '0c99980d-69c9-42fb-9d68-7df14554576c',
      email: 'super-admin@platform.com',
      roles: ['super_admin'],
    },
    process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production'
  );

  // 1. Create a temporary UNPUBLISHED draft article
  const draftSlug = `draft-test-article-${Date.now()}`;
  console.log(`\n[STEP 1] Creating temporary unpublished draft article (${draftSlug})...`);
  const createRes = await fetch('http://localhost:4000/api/cms/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superToken}`,
    },
    body: JSON.stringify({
      slug: draftSlug,
      title: 'Top Secret Draft Roadmap',
      published: false,
      content: {
        body: 'Confidential unpublished product strategy.',
        excerpt: 'Confidential draft excerpt',
        seoTitle: 'Top Secret Draft Roadmap',
      },
    }),
  });

  const created = await createRes.json();
  console.log('Created draft id:', created.id, 'published:', created.published);
  assert.equal(created.published, false, 'Article must be created in unpublished draft status');

  try {
    // 2. Anonymous access via public Next.js page route
    console.log('\n[STEP 2] Attempting anonymous access to draft on Next.js public route...');
    const publicPageRes = await fetch(`http://localhost:3000/blog/${draftSlug}`);
    const publicHtml = await publicPageRes.text();
    console.log(`GET http://localhost:3000/blog/${draftSlug} -> HTTP Status:`, publicPageRes.status);
    
    // Check that unauthorized public request displays Not Found and contains NO confidential content
    const isNotFoundPage = publicPageRes.status === 404 || publicHtml.includes('Post Not Found') || publicHtml.includes('404');
    console.log('Public route triggered Not Found:', isNotFoundPage);
    assert.equal(isNotFoundPage, true, 'Anonymous request to unpublished draft MUST trigger Not Found');

    const leaksTitle = publicHtml.includes('Top Secret Draft Roadmap');
    const leaksBody = publicHtml.includes('Confidential unpublished product strategy');
    console.log('HTML leaks draft title:', leaksTitle);
    console.log('HTML leaks draft body:', leaksBody);
    assert.equal(leaksTitle, false, 'Public HTML MUST NOT reveal draft title');
    assert.equal(leaksBody, false, 'Public HTML MUST NOT reveal draft body');
    console.log('PASS: Next.js page route completely concealed draft content');

    // 3. Anonymous access via backend API /api/cms/pages/:slug
    console.log('\n[STEP 3] Attempting anonymous access via /api/cms/pages/:slug ...');
    const apiSlugRes = await fetch(`http://localhost:4000/api/cms/pages/${draftSlug}`);
    console.log(`GET /api/cms/pages/${draftSlug} -> HTTP Status:`, apiSlugRes.status);
    assert.equal(apiSlugRes.status, 404, 'Anonymous request to /api/cms/pages/:slug for draft MUST return 404');
    console.log('PASS: Backend /api/cms/pages/:slug returned 404 for anonymous user');

    // 4. Anonymous access via backend API /api/cms/pages/by-id/:id
    console.log('\n[STEP 4] Attempting anonymous access via /api/cms/pages/by-id/:id ...');
    const apiIdRes = await fetch(`http://localhost:4000/api/cms/pages/by-id/${created.id}`);
    console.log(`GET /api/cms/pages/by-id/${created.id} -> HTTP Status:`, apiIdRes.status);
    assert.equal(apiIdRes.status, 404, 'Anonymous request to /api/cms/pages/by-id/:id for draft MUST return 404');
    console.log('PASS: Backend /api/cms/pages/by-id/:id returned 404 for anonymous user');

    // 5. Anonymous access via list endpoint /api/cms/pages
    console.log('\n[STEP 5] Checking if unpublished draft leaks in anonymous /api/cms/pages list...');
    const listRes = await fetch('http://localhost:4000/api/cms/pages');
    const list = await listRes.json();
    const foundInList = list.some((p) => p.slug === draftSlug || p.id === created.id);
    console.log('Draft visible in anonymous public list:', foundInList);
    assert.equal(foundInList, false, 'Unpublished draft MUST NOT appear in public pages list');
    console.log('PASS: Draft is completely excluded from public API page list');

    // 6. Super Admin access with preview=true
    console.log('\n[STEP 6] Verifying Super Admin CAN access draft preview...');
    const adminApiRes = await fetch(`http://localhost:4000/api/cms/pages/${draftSlug}`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    console.log('Super Admin GET /api/cms/pages/:slug -> HTTP Status:', adminApiRes.status);
    assert.equal(adminApiRes.status, 200, 'Super Admin MUST have access to draft article');
    console.log('PASS: Super Admin authorized access granted');
  } finally {
    // Clean up temporary draft article
    console.log('\n[CLEANUP] Deleting temporary draft article...');
    await fetch(`http://localhost:4000/api/cms/pages/${draftSlug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superToken}` },
    });
    console.log('Cleanup complete.');
  }

  console.log('\n======================================================');
  console.log('ALL UNPUBLISHED ARTICLE PRIVACY CHECKS PASSED (5/5)!');
  console.log('======================================================\n');
}

testUnpublishedPrivacy();
