const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const JWT_SECRET = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ PASS [${totalTests}]: ${message}`);
  } else {
    console.error(`  ✖ FAIL [${totalTests}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_manager', 'hr_admin'],
      permissions: user.permissions || ['*'],
      sessionId,
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

async function createTestSession(userId, tenantId) {
  const sessId = 'sess-brand-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Branding Test Suite',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  return sessId;
}

async function runBrandingSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: CERTIFICATE BRANDING & SIGNATORY TEST SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let user = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  const hrSessionId = await createTestSession(user.id, tenantId);
  const hrToken = makeToken({ id: user.id, email: user.email, tenantId }, hrSessionId);

  // Other tenant user for cross-tenant isolation tests
  let otherTenant = await prisma.tenant.findFirst({
    where: { id: { not: tenantId } }
  });
  if (!otherTenant) {
    otherTenant = await prisma.tenant.create({
      data: {
        id: 'tenant-brand-isolated-' + Date.now(),
        name: 'Isolated Brand Tenant',
        slug: 'isolated-brand-' + Date.now(),
      }
    });
  }
  const otherTenantId = otherTenant.id;
  const otherUser = await prisma.user.create({
    data: {
      id: 'user-isolated-' + Date.now(),
      email: `isolated-${Date.now()}@example.com`,
      passwordHash: 'hash',
    }
  });
  const otherSessionId = await createTestSession(otherUser.id, otherTenantId);
  const otherToken = makeToken({ id: otherUser.id, email: otherUser.email, tenantId: otherTenantId }, otherSessionId);

  let uploadedAssetId = null;
  let createdSignatoryId = null;

  try {
    // 1. Upload Valid Organization Logo (PNG)
    console.log('--- 1. Organization Logo Upload ---');
    const form = new FormData();
    const dummyPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00]);
    form.append('file', dummyPng, { filename: 'org-logo.png', contentType: 'image/png' });
    form.append('assetType', 'LOGO_PRIMARY');
    form.append('assetName', 'Corporate Sapphire Crest');

    const uploadRes = await fetch(`${BASE_URL}/certificate-studio/branding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (uploadRes.status !== 201) {
      console.log('Upload error status:', uploadRes.status, await uploadRes.text());
    }
    assert(uploadRes.status === 201, 'POST /certificate-studio/branding returns 201 Created');
    const uploadJson = await uploadRes.json();
    uploadedAssetId = uploadJson.asset?.id;
    assert(uploadedAssetId != null, 'Uploaded asset returns valid asset ID');
    assert(uploadJson.asset.assetName === 'Corporate Sapphire Crest', 'Asset name recorded accurately');

    // 2. Fetch Branding Assets List
    console.log('\n--- 2. Fetch Branding Assets ---');
    const listRes = await fetch(`${BASE_URL}/certificate-studio/branding`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(listRes.status === 200, 'GET /certificate-studio/branding returns 200');
    const listJson = await listRes.json();
    assert(Array.isArray(listJson.assets), 'Returns array of branding assets');
    const foundAsset = listJson.assets.find(a => a.id === uploadedAssetId);
    assert(foundAsset != null, 'Uploaded logo asset exists in tenant assets list');

    // 3. SVG Sanitization Test
    console.log('\n--- 3. SVG Security Sanitization ---');
    const svgForm = new FormData();
    const maliciousSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red" onclick="alert('XSS')" />
        <script>alert('Malicious Script Execution')</script>
        <iframe src="http://attacker.com"></iframe>
      </svg>
    `;
    svgForm.append('file', Buffer.from(maliciousSvg, 'utf-8'), { filename: 'seal.svg', contentType: 'image/svg+xml' });
    svgForm.append('assetType', 'OFFICIAL_SEAL');
    svgForm.append('assetName', 'Sanitized Official Seal');

    const svgRes = await fetch(`${BASE_URL}/certificate-studio/branding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        ...svgForm.getHeaders()
      },
      body: svgForm
    });

    assert(svgRes.status === 201, 'SVG upload processed and sanitized (201)');
    const svgJson = await svgRes.json();
    const diskPath = path.resolve(__dirname, '../uploads', svgJson.asset.storagePath);
    const sanitizedContent = fs.readFileSync(diskPath, 'utf-8');
    assert(!sanitizedContent.includes('<script>'), 'Sanitized SVG stripped <script> tag');
    assert(!sanitizedContent.includes('onclick'), 'Sanitized SVG stripped onclick event handler');
    assert(!sanitizedContent.includes('<iframe'), 'Sanitized SVG stripped <iframe> tag');

    // 4. Invalid File Type Rejection
    console.log('\n--- 4. Invalid File Rejection ---');
    const badForm = new FormData();
    badForm.append('file', Buffer.from('echo malicious', 'utf-8'), { filename: 'malware.exe', contentType: 'application/x-msdownload' });
    badForm.append('assetType', 'LOGO_PRIMARY');
    badForm.append('assetName', 'Malware Test');

    const badRes = await fetch(`${BASE_URL}/certificate-studio/branding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        ...badForm.getHeaders()
      },
      body: badForm
    });
    assert(badRes.status === 400, 'Executable file upload rejected with 400 Bad Request');

    // 5. Cross-Tenant Isolation
    console.log('\n--- 5. Cross-Tenant Asset Isolation ---');
    const otherListRes = await fetch(`${BASE_URL}/certificate-studio/branding`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    const otherListJson = await otherListRes.json();
    const leakFound = otherListJson.assets?.some(a => a.id === uploadedAssetId);
    assert(!leakFound, 'Tenant A branding assets are strictly hidden from Tenant B');

    // 6. Signatory Management & Authorization
    console.log('\n--- 6. Signatory Creation & Authorization ---');
    const sigRes = await fetch(`${BASE_URL}/certificate-studio/signatories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        name: 'Dr. Arthur Pendelton',
        designation: 'Chief Executive Officer',
        department: 'Executive Board',
        signatoryType: 'CEO',
        signatureAssetId: uploadedAssetId
      })
    });

    assert(sigRes.status === 201, 'POST /certificate-studio/signatories returns 201 Created');
    const sigJson = await sigRes.json();
    createdSignatoryId = sigJson.signatory?.id;
    assert(createdSignatoryId != null, 'Signatory created with valid ID');
    assert(sigJson.signatory.authorizationStatus === 'AUTHORIZED', 'Signatory authorized upon administrator creation');

    // 7. Toggle Authorization Status
    console.log('\n--- 7. Toggle Signatory Authorization Status ---');
    const authRes = await fetch(`${BASE_URL}/certificate-studio/signatories/${createdSignatoryId}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ status: 'REVOKED' })
    });
    assert(authRes.status === 200, 'Status updated to REVOKED');
    const authJson = await authRes.json();
    assert(authJson.signatory.authorizationStatus === 'REVOKED', 'Signatory status successfully set to REVOKED');

    // 8. Historical Asset Preservation
    console.log('\n--- 8. Historical Asset Preservation on Deactivation ---');
    const delRes = await fetch(`${BASE_URL}/certificate-studio/branding/${uploadedAssetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(delRes.status === 200, 'DELETE /certificate-studio/branding/:id soft deactivates asset');
    const dbAsset = await prisma.organizationBrandingAsset.findUnique({ where: { id: uploadedAssetId } });
    assert(dbAsset != null && dbAsset.isActive === false, 'Asset record preserved in database with isActive: false (no hard delete)');

    console.log('\n================================================================');
    console.log(` ALL BRANDING TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBrandingSuite();
