const http = require('http');
const https = require('https');
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const jwt = require('../server/node_modules/jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('MASTERHRMS — UNIFIED FILE MANAGER INTEGRATION & NAVIGATION TEST');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: CANONICAL PAGES (PORT 3000)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Canonical File Manager Routes on Frontend (Next.js) ---');
  const canonicalRoutes = [
    { path: '/super/files', name: 'Super Admin Canonical File Manager' },
    { path: '/tenant/files', name: 'Tenant Admin Canonical File Manager' },
    { path: '/hr/files', name: 'HR Admin Canonical File Manager' },
    { path: '/me/files', name: 'Employee Canonical File Manager' }
  ];

  for (const r of canonicalRoutes) {
    try {
      const res = await fetchUrl(`http://localhost:3000${r.path}`, { method: 'GET' });
      assert(res.statusCode === 200, `${r.name} (${r.path}) returned HTTP ${res.statusCode}`);
    } catch (err) {
      assert(false, `${r.name} (${r.path}) failed to connect: ${err.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: LEGACY REDIRECTS (PORT 3000)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Legacy Route Redirects to Canonical File Manager ---');
  const redirectRoutes = [
    { path: '/super/media', expected: '/super/files', name: 'Super Admin Media -> /super/files' },
    { path: '/hr/media', expected: '/hr/files', name: 'HR Media -> /hr/files' },
    { path: '/me/media', expected: '/me/files', name: 'Employee Media -> /me/files' },
    { path: '/media', expected: '/tenant/files', name: 'Tenant Media -> /tenant/files' },
    { path: '/apps/file-manager/list-view', expected: '/hr/files?view=list', name: 'Apps List View -> /hr/files?view=list' },
    { path: '/apps/file-manager/grid-view', expected: '/hr/files?view=grid', name: 'Apps Grid View -> /hr/files?view=grid' },
  ];

  for (const r of redirectRoutes) {
    try {
      const res = await fetchUrl(`http://localhost:3000${r.path}`, { method: 'GET' });
      const location = res.headers['location'] || '';
      const isRedirect = res.statusCode === 307 || res.statusCode === 308 || res.statusCode === 302;
      assert(isRedirect && location.includes(r.expected), `${r.name} redirects with status ${res.statusCode} to ${location}`);
    } catch (err) {
      assert(false, `${r.name} failed: ${err.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: SUPER ADMIN PLATFORM SCOPING (PORT 4000)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Backend Super Admin Platform File Scoping ---');
  const superAdmin = await prisma.user.findFirst({
    where: { roles: { some: { role: 'super_admin' } } },
    include: { roles: true }
  });

  if (superAdmin) {
    const superToken = jwt.sign({
      userId: superAdmin.id,
      email: superAdmin.email,
      roles: ['super_admin'],
      permissions: ['*']
    }, JWT_SECRET, { expiresIn: '1h' });

    const superRes = await fetchUrl('http://localhost:4000/api/v1/files?view=all', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${superToken}` }
    });
    
    assert(superRes.statusCode === 200, `Super Admin /api/v1/files responded 200 OK`);
    try {
      const body = JSON.parse(superRes.body);
      const allTenantNull = (body.items || []).every(item => item.tenantId === null);
      assert(allTenantNull, `Super Admin platform media returns strictly items with tenantId = null (${body.items?.length || 0} items)`);
    } catch (e) {
      assert(false, `Failed to parse Super Admin files response: ${e.message}`);
    }
  } else {
    console.log('[SKIP] No super_admin user found for platform file test');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: CHAT FOLDER HIERARCHY & UPLOAD INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Organization Chat Folder Integration & Hierarchy ---');
  const tenant = await prisma.tenant.findUnique({
    where: { id: 'tenant-default-001' }
  });
  const hrUser = await prisma.user.findUnique({
    where: { id: 'user-hr-001' }
  });

  if (tenant && hrUser) {
    // 4.1 Verify backfilled / existing Organization Chat folder structure
    const chatFolders = await prisma.mediaFile.findMany({
      where: {
        tenantId: tenant.id,
        folder: { contains: 'Organization Chat' }
      }
    });
    assert(chatFolders.length > 0, `Found ${chatFolders.length} items/folders inside canonical 'Organization Chat' hierarchy`);

    // 4.2 Test Chat Attachments filter query via API
    const userToken = jwt.sign({
      userId: hrUser.id,
      email: hrUser.email,
      tenantId: tenant.id,
      roles: ['hr_admin'],
      permissions: ['files.read']
    }, JWT_SECRET, { expiresIn: '1h' });

    const chatFilterRes = await fetchUrl('http://localhost:4000/api/v1/files?category=Chat', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert(chatFilterRes.statusCode === 200, `GET /api/v1/files?category=Chat responded 200 OK`);
    try {
      const body = JSON.parse(chatFilterRes.body);
      assert(Array.isArray(body.items) && body.items.length > 0, `Chat category query returned ${body.items?.length} items under canonical chat folders`);
    } catch (e) {
      assert(false, `Failed to parse Chat category query: ${e.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: DIRECT MESSAGE PRIVACY IN ORG BROWSING
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Direct Message Attachment Privacy Enforcement ---');
  if (tenant) {
    const users = await prisma.user.findMany({
      where: { profile: { tenantId: tenant.id } },
      take: 2
    });

    if (users.length >= 2) {
      const userA = users[0];
      const userB = users[1];

      // Find direct folder
      const directFolder = await prisma.mediaFile.findFirst({
        where: {
          tenantId: tenant.id,
          folder: 'Communication/Organization Chat/Direct Conversations/Attachments'
        }
      });

      const privateFile = await prisma.mediaFile.create({
        data: {
          tenantId: tenant.id,
          fileName: `confidential-dm-file-${Date.now()}.pdf`,
          fileSize: 1024,
          mimeType: 'application/pdf',
          filePath: '/test/dm-attachment.pdf',
          url: '/uploads/test/dm-attachment.pdf',
          checksumSha: 'sha256-test-privacy-file',
          folder: 'Communication/Organization Chat/Direct Conversations/Attachments',
          isFolder: false,
          ownerId: userA.id,
          uploadedBy: userA.id,
          category: 'Documents',
          parentId: directFolder ? directFolder.id : null,
        }
      });

      // User B browses organization files with view=org
      const userBToken = jwt.sign({
        userId: userB.id,
        email: userB.email,
        tenantId: tenant.id,
        roles: ['tenant_admin'],
        permissions: ['files.admin.view_all']
      }, JWT_SECRET, { expiresIn: '1h' });

      const orgRes = await fetchUrl('http://localhost:4000/api/v1/files?view=org&limit=100', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userBToken}` }
      });

      try {
        const body = JSON.parse(orgRes.body);
        const containsPrivateFile = (body.items || []).some(f => f.id === privateFile.id);
        assert(!containsPrivateFile, `User B (Tenant Admin) browsing view=org CANNOT see User A's private Direct Conversation attachment (Privacy by Default verified)`);
      } catch (e) {
        assert(false, `Failed to verify privacy in org view: ${e.message}`);
      }

      // Clean up test file
      await prisma.mediaFile.delete({ where: { id: privateFile.id } });
    }
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
