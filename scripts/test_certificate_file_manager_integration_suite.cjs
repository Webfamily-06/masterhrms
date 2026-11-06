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
  const sessId = 'sess-int-' + Math.random().toString(36).substring(2, 9);
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
  console.log(' SUITE 1: CERTIFICATE FILE MANAGER UNIFIED STORAGE INTEGRATION TEST');
  console.log('================================================================================\n');

  let testTenant = null;
  let hrUser = null;
  let hrSessionId = null;
  let token = null;

  try {
    recipientEmp = await prisma.employee.findFirst({
      where: { userId: { not: null }, status: 'active' },
      include: { user: true, tenant: true },
    });
    if (!recipientEmp) {
      recipientEmp = await prisma.employee.findFirst({
        include: { user: true, tenant: true },
      });
    }
    testTenant = recipientEmp.tenant;
    const tenantId = testTenant.id;
    assert(testTenant !== null, `Active tenant found: ${testTenant.name}`);

    hrUser = recipientEmp.user;
    if (!hrUser && recipientEmp.userId) {
      hrUser = await prisma.user.findUnique({ where: { id: recipientEmp.userId } });
    }
    if (!hrUser) {
      hrUser = await prisma.user.findFirst();
    }
    assert(hrUser !== null, `HR User found: ${hrUser?.email}`);

    hrSessionId = await createTestSession(hrUser.id, testTenant.id);
    token = makeToken(
      {
        id: hrUser.id,
        email: hrUser.email,
        tenantId: testTenant.id,
        roles: ['admin', 'hr_admin', 'hr_manager'],
      },
      hrSessionId
    );

    // 1. Ensure folders endpoint
    console.log('\n--- Step 1: Ensure Certificates Folder Hierarchy ---');
    const ensureRes = await fetch(`${BASE_URL}/api/v1/files/certificates/ensure-folders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(ensureRes.status === 200, `ensure-folders returns HTTP 200 (Got: ${ensureRes.status})`);
    const ensureJson = await ensureRes.json();
    assert(ensureJson.success === true, 'ensure-folders reports success: true');
    assert(ensureJson.folders && (ensureJson.folders.rootFolder || ensureJson.folders.root), 'Root Certificates folder created');
    assert(ensureJson.folders.brandingFolder || ensureJson.folders.branding, 'Branding subfolder created');
    assert(ensureJson.folders.signaturesFolder || ensureJson.folders.signatures, 'Signatures subfolder created');
    assert(ensureJson.folders.templatesFolder || ensureJson.folders.templates, 'Templates subfolder created');
    assert(ensureJson.folders.generatedFolder || ensureJson.folders.generated, 'Generated subfolder created');

    // 2. Query folder hierarchy endpoint
    console.log('\n--- Step 2: Query Certificates Folders ---');
    const getFoldersRes = await fetch(`${BASE_URL}/api/certificate-studio/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(getFoldersRes.status === 200, `GET /folders returns HTTP 200 (Got: ${getFoldersRes.status})`);
    const foldersJson = await getFoldersRes.json();
    assert(foldersJson.folders !== undefined || foldersJson.success === true, 'GET /folders reports folders object');
    const root = foldersJson.folders.rootFolder || foldersJson.folders.root;
    assert(root && root.nameKey === 'certificates', 'Root folder nameKey is "certificates"');
    assert(root && root.systemModule === 'certificates', 'Root folder systemModule is "certificates"');

    // 3. Upload a sample SVG asset and verify MediaFile created
    console.log('\n--- Step 3: Upload Branding Asset and Verify File Manager Link ---');
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="gold" /></svg>`;
    const blob = new Blob([sampleSvg], { type: 'image/svg+xml' });
    const formData = new FormData();
    formData.append('file', blob, 'test_seal.svg');
    formData.append('assetType', 'SEAL');
    formData.append('assetName', 'Automated Test Seal 2026');

    const uploadRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    assert(uploadRes.status === 201, `Branding asset uploaded with HTTP 201 (Got: ${uploadRes.status})`);
    const uploadJson = await uploadRes.json();
    assert(uploadJson.asset && uploadJson.asset.id !== undefined, 'Upload returned asset with ID');
    assert(uploadJson.asset.fileId !== null && uploadJson.asset.fileId !== undefined, 'Asset fileId is linked to MediaFile');

    // Verify in database
    const dbAsset = await prisma.organizationBrandingAsset.findUnique({
      where: { id: uploadJson.asset.id },
      include: { file: true },
    });
    assert(dbAsset !== null, 'Asset retrieved from database');
    assert(dbAsset.fileId !== null, 'Database asset has fileId foreign key');
    assert(dbAsset.file !== null, 'Database asset has related MediaFile relation');
    assert(dbAsset.file.folder.includes('Certificates'), 'MediaFile folder is Certificates hierarchy');

    // 4. Test Deduplication
    console.log('\n--- Step 4: Test Safe Asset Deduplication ---');
    const dupFormData = new FormData();
    dupFormData.append('file', blob, 'test_seal.svg');
    dupFormData.append('assetType', 'SEAL');
    dupFormData.append('assetName', 'Automated Test Seal 2026 Duplicate');

    const dupUploadRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: dupFormData,
    });
    assert(dupUploadRes.status === 201, `Duplicate asset handled gracefully (Got: ${dupUploadRes.status})`);
    const dupJson = await dupUploadRes.json();
    assert(dupJson.asset.reused === true, 'Asset detected duplicate and flagged reused: true');
    assert(dupJson.asset.fileId === uploadJson.asset.fileId, 'Deduplication reused existing MediaFile record');

    // Clean up test assets created
    if (dupJson.asset.id !== uploadJson.asset.id) {
      await prisma.organizationBrandingAsset.delete({ where: { id: dupJson.asset.id } }).catch(() => {});
    }
    await prisma.organizationBrandingAsset.delete({ where: { id: uploadJson.asset.id } }).catch(() => {});
    if (uploadJson.asset.fileId) {
      await prisma.mediaFile.delete({ where: { id: uploadJson.asset.fileId } }).catch(() => {});
    }

    console.log('\n================================================================================');
    console.log(` SUITE 1 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 1 FAILED:', err);
    process.exit(1);
  } finally {
    if (hrSessionId) {
      await prisma.deviceSession.delete({ where: { id: hrSessionId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runSuite();
