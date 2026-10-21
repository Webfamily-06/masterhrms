const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function runTests() {
  const results = [];
  const testDraftSlug = 'blog-test-confidential-draft-2026';
  const publicSlug = 'test-confidential-draft-2026';

  console.log('--- 1. Setting up Draft Blog Fixture in MySQL ---');
  await prisma.cmsPage.upsert({
    where: { slug: testDraftSlug },
    create: {
      id: testDraftSlug,
      slug: testDraftSlug,
      title: 'Confidential Internal Restructuring Plan 2026',
      content: {
        body: 'SECRET INTERNAL MEMO: Do not disclose under any circumstances.',
        excerpt: 'Confidential summary that must never leak.',
        category: 'ERP Systems',
        publishedAt: '2026-10-21',
      },
      published: false, // DRAFT
    },
    update: {
      title: 'Confidential Internal Restructuring Plan 2026',
      content: {
        body: 'SECRET INTERNAL MEMO: Do not disclose under any circumstances.',
        excerpt: 'Confidential summary that must never leak.',
        category: 'ERP Systems',
        publishedAt: '2026-10-21',
      },
      published: false, // DRAFT
    },
  });

  // Super Admin token
  const superUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'super_admin' } } },
    include: { roles: true },
  });
  const superToken = jwt.sign(
    { userId: superUser.id, email: superUser.email, roles: ['super_admin'] },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Tenant Admin token (hr_admin)
  const tenantUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'hr_admin' }, none: { role: 'super_admin' } } },
    include: { roles: true },
  });
  const tenantToken = tenantUser
    ? jwt.sign(
        { userId: tenantUser.id, email: tenantUser.email, roles: ['hr_admin'], tenantId: tenantUser.tenantId },
        JWT_SECRET,
        { expiresIn: '1h' }
      )
    : jwt.sign(
        { userId: 'tenant-user-123', email: 'tenant@test.com', roles: ['hr_admin'], tenantId: 'tenant-1' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

  console.log('--- 2. Testing Phase 1: Draft Blog Privacy ---');

  // Test 1.1: Logged-out visit WITHOUT ?preview=true
  try {
    const res = await fetch(`http://localhost:3000/blog/${publicSlug}`);
    const text = await res.text();
    const isNotFound = text.includes('Post Not Found') || res.status === 404;
    const passed = isNotFound && !text.includes('SECRET INTERNAL MEMO');
    results.push({
      test: '1.1 Logged-out visitor WITHOUT ?preview=true returns Not Found',
      status: res.status,
      renderedNotFound: isNotFound,
      secretLeaked: text.includes('SECRET INTERNAL MEMO'),
      passed,
    });
  } catch (e) {
    results.push({ test: '1.1 Logged-out visitor WITHOUT ?preview=true', error: e.message, passed: false });
  }

  // Test 1.2: Logged-out visit WITH ?preview=true
  try {
    const res = await fetch(`http://localhost:3000/blog/${publicSlug}?preview=true`);
    const text = await res.text();
    const isNotFound = text.includes('Post Not Found') || res.status === 404;
    const passed = isNotFound && !text.includes('SECRET INTERNAL MEMO');
    results.push({
      test: '1.2 Logged-out visitor WITH ?preview=true rejected with Not Found',
      status: res.status,
      renderedNotFound: isNotFound,
      secretLeaked: text.includes('SECRET INTERNAL MEMO'),
      passed,
    });
  } catch (e) {
    results.push({ test: '1.2 Logged-out visitor WITH ?preview=true', error: e.message, passed: false });
  }

  // Test 1.3: Tenant Admin session WITH ?preview=true
  try {
    const res = await fetch(`http://localhost:3000/blog/${publicSlug}?preview=true`, {
      headers: { Cookie: `hrms_auth_token=${encodeURIComponent(tenantToken)}` },
    });
    const text = await res.text();
    const isNotFound = text.includes('Post Not Found') || res.status === 404;
    const passed = isNotFound && !text.includes('SECRET INTERNAL MEMO');
    results.push({
      test: '1.3 Tenant Admin session WITH ?preview=true rejected with Not Found',
      status: res.status,
      renderedNotFound: isNotFound,
      secretLeaked: text.includes('SECRET INTERNAL MEMO'),
      passed,
    });
  } catch (e) {
    results.push({ test: '1.3 Tenant Admin session WITH ?preview=true', error: e.message, passed: false });
  }

  // Test 1.4: Super Admin session WITH ?preview=true
  try {
    const res = await fetch(`http://localhost:3000/blog/${publicSlug}?preview=true`, {
      headers: { Cookie: `hrms_auth_token=${encodeURIComponent(superToken)}` },
    });
    const text = await res.text();
    const passed = res.status === 200 && text.includes('SECRET INTERNAL MEMO') && text.includes('SUPER ADMIN PREVIEW MODE');
    results.push({
      test: '1.4 Super Admin session WITH ?preview=true succeeds (HTTP 200 + Preview Banner)',
      status: res.status,
      renderedContent: text.includes('SECRET INTERNAL MEMO'),
      bannerPresent: text.includes('SUPER ADMIN PREVIEW MODE'),
      passed,
    });
  } catch (e) {
    results.push({ test: '1.4 Super Admin session WITH ?preview=true', error: e.message, passed: false });
  }

  // Test 1.5: Published article accessible without auth
  try {
    const res = await fetch('http://localhost:3000/blog/automating-multi-country-payroll-2026');
    const text = await res.text();
    const passed = res.status === 200 && text.includes('Automating Multi-Country Payroll');
    results.push({
      test: '1.5 Normal published article accessible to public (HTTP 200)',
      status: res.status,
      passed,
    });
  } catch (e) {
    results.push({ test: '1.5 Published article accessible', error: e.message, passed: false });
  }

  console.log('--- 3. Testing Phase 2: Resource Guides CMS Endpoints ---');

  // Test 2.1: Public GET /api/cms/guides returns active items only
  try {
    const res = await fetch('http://localhost:4000/api/cms/guides');
    const guides = await res.json();
    const passed = res.status === 200 && Array.isArray(guides) && guides.every(g => g.isActive !== false);
    results.push({
      test: '2.1 Public GET /api/cms/guides returns active guides only',
      count: guides.length,
      passed,
    });
  } catch (e) {
    results.push({ test: '2.1 Public GET /api/cms/guides', error: e.message, passed: false });
  }

  // Test 2.2: Unauthenticated POST /api/cms/guides rejected
  try {
    const res = await fetch('http://localhost:4000/api/cms/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacked Guide', description: 'Malicious upload', downloadUrl: '/hacked.pdf' }),
    });
    const passed = res.status === 401;
    results.push({
      test: '2.2 Unauthenticated POST /api/cms/guides returns 401',
      status: res.status,
      passed,
    });
  } catch (e) {
    results.push({ test: '2.2 Unauthenticated POST /api/cms/guides', error: e.message, passed: false });
  }

  // Test 2.3: Tenant Admin POST /api/cms/guides rejected with 403
  try {
    const res = await fetch('http://localhost:4000/api/cms/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({ title: 'Tenant Guide', description: 'Unauthorized guide', downloadUrl: '/tenant.pdf' }),
    });
    const passed = res.status === 403;
    results.push({
      test: '2.3 Tenant Admin POST /api/cms/guides returns 403',
      status: res.status,
      passed,
    });
  } catch (e) {
    results.push({ test: '2.3 Tenant Admin POST /api/cms/guides', error: e.message, passed: false });
  }

  // Test 2.4: Super Admin POST /api/cms/guides creates new guide
  let createdGuideId = null;
  try {
    const res = await fetch('http://localhost:4000/api/cms/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superToken}`,
      },
      body: JSON.stringify({
        title: 'Audit Test Playbook 2026',
        description: 'Comprehensive test guide for automated verification.',
        category: 'Compliance',
        type: 'PDF · 10 pages',
        downloadUrl: '/downloads/audit-test-playbook.pdf',
        isActive: true,
      }),
    });
    const data = await res.json();
    createdGuideId = data.id;
    const passed = res.status === 201 && data.id && data.title === 'Audit Test Playbook 2026';
    results.push({
      test: '2.4 Super Admin POST /api/cms/guides returns 201 and persists record',
      status: res.status,
      createdId: data.id,
      passed,
    });
  } catch (e) {
    results.push({ test: '2.4 Super Admin POST /api/cms/guides', error: e.message, passed: false });
  }

  // Test 2.5: Super Admin PUT /api/cms/guides/:id updates guide to inactive
  if (createdGuideId) {
    try {
      const res = await fetch(`http://localhost:4000/api/cms/guides/${createdGuideId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          title: 'Audit Test Playbook 2026 (Updated)',
          isActive: false, // Unpublish
        }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.isActive === false;
      results.push({
        test: '2.5 Super Admin PUT /api/cms/guides/:id unpublishes guide (isActive: false)',
        status: res.status,
        passed,
      });

      // Verify it is hidden from public GET
      const pubRes = await fetch('http://localhost:4000/api/cms/guides');
      const pubGuides = await pubRes.json();
      const hidden = !pubGuides.some(g => g.id === createdGuideId);
      results.push({
        test: '2.6 Unpublished guide is hidden from public GET /api/cms/guides',
        hiddenFromPublic: hidden,
        passed: hidden,
      });
    } catch (e) {
      results.push({ test: '2.5/2.6 Guide update and unpublish', error: e.message, passed: false });
    }

    // Test 2.7: Super Admin DELETE /api/cms/guides/:id cleans up test guide
    try {
      const res = await fetch(`http://localhost:4000/api/cms/guides/${createdGuideId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superToken}` },
      });
      const passed = res.status === 200;
      results.push({
        test: '2.7 Super Admin DELETE /api/cms/guides/:id cleans up test guide',
        status: res.status,
        passed,
      });
    } catch (e) {
      results.push({ test: '2.7 Guide cleanup delete', error: e.message, passed: false });
    }
  }

  // Clean up draft blog fixture
  await prisma.cmsPage.deleteMany({ where: { slug: testDraftSlug } });
  console.log('Cleaned up test draft blog fixture.');

  console.log('\n==========================================');
  console.log('FINAL REMEDIATION SUITE OUTCOME');
  console.log('==========================================');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = results.every(r => r.passed);
  console.log(`\nTOTAL TESTS: ${results.length} | ALL PASSED: ${allPassed}`);
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
