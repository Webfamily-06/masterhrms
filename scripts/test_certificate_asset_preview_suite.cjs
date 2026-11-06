const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:4000';

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const JWT_SECRET = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

let passedTests = 0;
let totalTests = 0;

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
  const sessId = 'sess-prev-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  return sessId;
}

async function runSuite() {
  console.log('\n================================================================================');
  console.log(' SUITE 3: CERTIFICATE ASSET PREVIEW & STREAMING TEST SUITE');
  console.log('================================================================================\n');

  let hrSessionId = null;
  let testAsset = null;
  let testSignatory = null;

  try {
    const recipientEmp = await prisma.employee.findFirst({
      where: { userId: { not: null }, status: 'active' },
      include: { user: true, tenant: true },
    }) || await prisma.employee.findFirst({ include: { user: true, tenant: true } });

    const testTenant = recipientEmp.tenant;
    const hrUser = recipientEmp.user || await prisma.user.findFirst();

    hrSessionId = await createTestSession(hrUser.id, testTenant.id);
    const token = makeToken(
      {
        id: hrUser.id,
        email: hrUser.email,
        tenantId: testTenant.id,
        roles: ['admin', 'hr_admin', 'hr_manager'],
      },
      hrSessionId
    );

    // 1. Create a sample SVG asset
    console.log('--- Step 1: Upload Test SVG Branding Asset ---');
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100" height="100" fill="#3B82F6"/></svg>`;
    const blob = new Blob([sampleSvg], { type: 'image/svg+xml' });
    const formData = new FormData();
    formData.append('file', blob, 'test_preview_logo.svg');
    formData.append('assetType', 'LOGO_PRIMARY');
    formData.append('assetName', 'Preview Test Logo SVG');

    const uploadRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    assert(uploadRes.status === 201, `Uploaded test asset with 201 (Got: ${uploadRes.status})`);
    const uploadJson = await uploadRes.json();
    testAsset = uploadJson.asset;

    // 2. Test Stream via /api/certificate-studio/branding/:id/preview with Bearer Header
    console.log('\n--- Step 2: Stream Branding Asset via Bearer Header ---');
    const previewBearerRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/${testAsset.id}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(previewBearerRes.status === 200, `Preview returned HTTP 200 (Got: ${previewBearerRes.status})`);
    const contentType = previewBearerRes.headers.get('content-type') || '';
    assert(contentType.includes('image/svg+xml') || contentType.includes('svg'), `Content-Type is SVG (Got: ${contentType})`);

    // 3. Test Stream via Query Token (for <img> tags in browser)
    console.log('\n--- Step 3: Stream Branding Asset via ?token= Query Parameter (<img> tag simulation) ---');
    const previewQueryRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/${testAsset.id}/preview?token=${encodeURIComponent(token)}`);
    assert(previewQueryRes.status === 200, `Query token authentication returns HTTP 200 (Got: ${previewQueryRes.status})`);
    const querySvgText = await previewQueryRes.text();
    assert(querySvgText.includes('<svg') && querySvgText.includes('#3B82F6'), 'Asset content received correctly via query token');

    // 4. Test Signatory Signature Preview
    console.log('\n--- Step 4: Create Signatory and Test Signature Preview ---');
    const sigCreateRes = await fetch(`${BASE_URL}/api/certificate-studio/signatories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Director John Doe',
        designation: 'Managing Director',
        signatoryType: 'DIRECTOR',
        signatureAssetId: testAsset.id,
      }),
    });
    assert(sigCreateRes.status === 201, `Signatory created with HTTP 201 (Got: ${sigCreateRes.status})`);
    const sigCreateJson = await sigCreateRes.json();
    testSignatory = sigCreateJson.signatory;

    const sigPreviewRes = await fetch(`${BASE_URL}/api/certificate-studio/signatories/${testSignatory.id}/signature-preview?token=${encodeURIComponent(token)}`);
    assert(sigPreviewRes.status === 200, `Signatory signature preview returned HTTP 200 (Got: ${sigPreviewRes.status})`);

    // 5. Test Canonical /api/v1/files/:id/stream SVG support
    console.log('\n--- Step 5: Test /api/v1/files/:id/stream SVG MIME mapping ---');
    const streamRes = await fetch(`${BASE_URL}/api/v1/files/${testAsset.fileId}/stream?inline=true&token=${encodeURIComponent(token)}`);
    assert(streamRes.status === 200, `/api/v1/files/:id/stream returned HTTP 200 (Got: ${streamRes.status})`);
    const streamContentType = streamRes.headers.get('content-type') || '';
    assert(streamContentType.includes('image/svg+xml') || streamContentType.includes('svg'), `MIME is image/svg+xml (Got: ${streamContentType})`);

    // 6. Test /api/uploads/ Alias Route
    console.log('\n--- Step 6: Test /api/uploads/ Alias Route Resolution ---');
    const cleanPath = testAsset.storagePath.replace(/^\/+/, '');
    const aliasRes = await fetch(`${BASE_URL}/api/uploads/${cleanPath}?token=${encodeURIComponent(token)}`);
    assert(aliasRes.status === 200, `Alias /api/uploads/* returned HTTP 200 (Got: ${aliasRes.status})`);

    console.log('\n================================================================================');
    console.log(` SUITE 3 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 3 FAILED:', err);
    process.exit(1);
  } finally {
    // Clean up test records
    if (testSignatory) {
      await prisma.organizationSignatory.delete({ where: { id: testSignatory.id } }).catch(() => { });
    }
    if (testAsset) {
      await prisma.organizationBrandingAsset.delete({ where: { id: testAsset.id } }).catch(() => { });
      if (testAsset.fileId) {
        await prisma.mediaFile.delete({ where: { id: testAsset.fileId } }).catch(() => { });
      }
    }
    if (hrSessionId) {
      await prisma.deviceSession.delete({ where: { id: hrSessionId } }).catch(() => { });
    }
    await prisma.$disconnect();
  }
}

runSuite();
