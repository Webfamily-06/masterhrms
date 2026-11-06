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
  const sessId = 'sess-ref-' + Math.random().toString(36).substring(2, 9);
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
  console.log(' SUITE 4: CERTIFICATE ASSET REFERENCE INTEGRITY TEST SUITE');
  console.log('================================================================================\n');

  let hrSessionId = null;
  let testAsset = null;
  let testSignatory = null;
  let testTemplate = null;

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

    // 1. Upload a branding asset
    console.log('--- Step 1: Upload Test Branding Asset ---');
    const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const blob = new Blob([samplePng], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'ref_test_signature.png');
    formData.append('assetType', 'SIGNATURE');
    formData.append('assetName', 'Reference Test Signatory Asset');

    const uploadRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    assert(uploadRes.status === 201, `Uploaded asset (HTTP ${uploadRes.status})`);
    const uploadJson = await uploadRes.json();
    testAsset = uploadJson.asset;

    // 2. Bind asset to a Signatory
    console.log('\n--- Step 2: Bind Asset to Active Signatory ---');
    const sigRes = await fetch(`${BASE_URL}/api/certificate-studio/signatories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Chief Executive Officer',
        designation: 'CEO',
        signatoryType: 'CEO',
        signatureAssetId: testAsset.id,
      }),
    });
    assert(sigRes.status === 201, `Signatory created with signature asset (HTTP ${sigRes.status})`);
    const sigJson = await sigRes.json();
    testSignatory = sigJson.signatory;

    // 3. Attempt to delete asset via Certificate Studio
    console.log('\n--- Step 3: Attempt Deletion of Asset in Active Use by Signatory ---');
    const deleteAssetRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/${testAsset.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(deleteAssetRes.status === 409, `Deletion rejected with HTTP 409 Conflict (Got: ${deleteAssetRes.status})`);
    const deleteAssetJson = await deleteAssetRes.json();
    assert(deleteAssetJson.code === 'CERTIFICATE_ASSET_IN_USE', 'Error code is CERTIFICATE_ASSET_IN_USE');
    assert(deleteAssetJson.references && (deleteAssetJson.references.signatories > 0 || Array.isArray(deleteAssetJson.references)), 'Response includes active references details');

    // 4. Attempt to delete the MediaFile via File Manager DELETE /nodes/:id
    console.log('\n--- Step 4: Attempt to Purge Underlying MediaFile via File Manager ---');
    const purgeMediaRes = await fetch(`${BASE_URL}/api/v1/files/nodes/${testAsset.fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(purgeMediaRes.status === 409, `File Manager node purge rejected with HTTP 409 (Got: ${purgeMediaRes.status})`);
    const purgeMediaJson = await purgeMediaRes.json();
    assert(purgeMediaJson.error && (purgeMediaJson.error.includes('referenced') || purgeMediaJson.error.includes('in use')), 'File Manager returns reference in-use message');

    // 5. Attempt to Trash the MediaFile via File Manager POST /trash
    console.log('\n--- Step 5: Attempt to Move Referenced MediaFile to Recycle Bin ---');
    const trashMediaRes = await fetch(`${BASE_URL}/api/v1/files/trash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: [testAsset.fileId] }),
    });
    assert(trashMediaRes.status === 409, `File Manager trashing rejected with HTTP 409 (Got: ${trashMediaRes.status})`);

    // 6. Verify Asset and MediaFile still exist and active
    console.log('\n--- Step 6: Verify Database Records Remain Unmodified ---');
    const assetInDb = await prisma.organizationBrandingAsset.findUnique({ where: { id: testAsset.id } });
    assert(assetInDb !== null, 'Branding asset record intact in DB');
    const fileInDb = await prisma.mediaFile.findUnique({ where: { id: testAsset.fileId } });
    assert(fileInDb !== null && fileInDb.deletedAt === null, 'MediaFile record intact in DB without soft delete');

    console.log('\n================================================================================');
    console.log(` SUITE 4 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 4 FAILED:', err);
    process.exit(1);
  } finally {
    // Unlink and clean up
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
