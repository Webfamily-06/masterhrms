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
  const sessId = 'sess-del-' + Math.random().toString(36).substring(2, 9);
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
  console.log(' SUITE 5: CERTIFICATE ASSET DELETION GUARD & REPLACEMENT TEST SUITE');
  console.log('================================================================================\n');

  let hrSessionId = null;
  let testAsset = null;
  let replacementAsset = null;

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

    // 1. Upload an unreferenced branding asset
    console.log('--- Step 1: Upload Unreferenced Watermark Asset ---');
    const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    const blob = new Blob([samplePng], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'temp_watermark.png');
    formData.append('assetType', 'WATERMARK');
    formData.append('assetName', 'Temporary Test Watermark');

    const uploadRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    assert(uploadRes.status === 201, `Uploaded temporary watermark (HTTP ${uploadRes.status})`);
    const uploadJson = await uploadRes.json();
    testAsset = uploadJson.asset;
    const fileId = testAsset.fileId;
    assert(fileId !== null && fileId !== undefined, 'Asset linked to MediaFile');

    // 2. Delete the unreferenced asset
    console.log('\n--- Step 2: Delete Unreferenced Asset ---');
    const deleteRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/${testAsset.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const deleteJson = await deleteRes.json();
    if (deleteRes.status !== 200) {
      console.log('Delete failed response:', deleteJson);
    }
    assert(deleteRes.status === 200, `Deletion of unreferenced asset succeeded (HTTP ${deleteRes.status})`);
    assert(deleteJson.success === true, 'Response reports success: true');

    // 3. Verify asset is deactivated in database
    console.log('\n--- Step 3: Verify Asset Deactivated in DB ---');
    const checkAsset = await prisma.organizationBrandingAsset.findUnique({ where: { id: testAsset.id } });
    assert(checkAsset !== null && checkAsset.isActive === false, 'Branding asset record marked inactive in DB');

    // 4. Test Asset Replacement Flow
    console.log('\n--- Step 4: Test Safe Asset Replacement Flow ---');
    // Upload initial asset
    const initialFormData = new FormData();
    initialFormData.append('file', blob, 'logo_v1.png');
    initialFormData.append('assetType', 'LOGO_SECONDARY');
    initialFormData.append('assetName', 'Company Secondary Logo V1');

    const initRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: initialFormData,
    });
    assert(initRes.status === 201, `Uploaded V1 logo (HTTP ${initRes.status})`);
    const initJson = await initRes.json();
    const v1Asset = initJson.asset;

    // Perform replacement with V2
    const replaceFormData = new FormData();
    const sampleV2Png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mN88P//fwYGBgZGRgYGBwB8iQP/cWkMbgAAAABJRU5ErkJggg==', 'base64');
    const v2Blob = new Blob([sampleV2Png], { type: 'image/png' });
    replaceFormData.append('file', v2Blob, 'logo_v2.png');
    replaceFormData.append('oldAssetId', v1Asset.id);
    replaceFormData.append('assetType', 'LOGO_SECONDARY');
    replaceFormData.append('assetName', 'Company Secondary Logo V2');

    const replaceRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/replace`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: replaceFormData,
    });
    assert(replaceRes.status === 201, `Replacement succeeded (HTTP ${replaceRes.status})`);
    const replaceJson = await replaceRes.json();
    replacementAsset = replaceJson.asset;
    assert(replacementAsset.id !== v1Asset.id, 'New asset created with unique ID');
    assert(replacementAsset.assetName === 'Company Secondary Logo V2', 'New asset has updated display name');

    // Verify V1 asset was cleaned up since it was unreferenced
    const oldAssetCheck = await prisma.organizationBrandingAsset.findUnique({ where: { id: v1Asset.id } });
    assert(oldAssetCheck === null || oldAssetCheck.isActive === false, 'Old unreferenced asset safely deactivated after replacement');

    console.log('\n================================================================================');
    console.log(` SUITE 5 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 5 FAILED:', err);
    process.exit(1);
  } finally {
    if (replacementAsset) {
      await prisma.organizationBrandingAsset.delete({ where: { id: replacementAsset.id } }).catch(() => { });
      if (replacementAsset.fileId) {
        await prisma.mediaFile.delete({ where: { id: replacementAsset.fileId } }).catch(() => { });
      }
    }
    if (hrSessionId) {
      await prisma.deviceSession.delete({ where: { id: hrSessionId } }).catch(() => { });
    }
    await prisma.$disconnect();
  }
}

runSuite();
