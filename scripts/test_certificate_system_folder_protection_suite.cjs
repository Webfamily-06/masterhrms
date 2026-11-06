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
  const sessId = 'sess-prot-' + Math.random().toString(36).substring(2, 9);
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
  console.log(' SUITE 2: CERTIFICATE SYSTEM FOLDER PROTECTION TEST SUITE');
  console.log('================================================================================\n');

  let testTenant = null;
  let hrUser = null;
  let hrSessionId = null;
  let token = null;

  try {
    const recipientEmp = await prisma.employee.findFirst({
      where: { userId: { not: null }, status: 'active' },
      include: { user: true, tenant: true },
    }) || await prisma.employee.findFirst({ include: { user: true, tenant: true } });

    testTenant = recipientEmp.tenant;
    assert(testTenant !== null, `Active tenant: ${testTenant.name}`);

    hrUser = recipientEmp.user || await prisma.user.findFirst();
    assert(hrUser !== null, `HR user: ${hrUser.email}`);

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

    // Ensure folder hierarchy
    const ensureRes = await fetch(`${BASE_URL}/api/v1/files/certificates/ensure-folders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const ensureJson = await ensureRes.json();
    const rootFolder = ensureJson.folders.rootFolder || ensureJson.folders.root;
    const brandingFolder = ensureJson.folders.brandingFolder || ensureJson.folders.branding;
    const signaturesFolder = ensureJson.folders.signaturesFolder || ensureJson.folders.signatures;
    const templatesFolder = ensureJson.folders.templatesFolder || ensureJson.folders.templates;
    const generatedFolder = ensureJson.folders.generatedFolder || ensureJson.folders.generated;

    assert(rootFolder && rootFolder.id, 'Root Certificates folder ID available');
    assert(brandingFolder && brandingFolder.id, 'Branding folder ID available');
    assert(signaturesFolder && signaturesFolder.id, 'Signatures folder ID available');

    // 1. Rename Protection: Root Folder
    console.log('\n--- Step 1: Attempt to Rename Root Certificates Folder ---');
    const renameRootRes = await fetch(`${BASE_URL}/api/v1/files/${rootFolder.id}/rename`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newName: 'Renamed_Certificates_Hacked' }),
    });
    assert(renameRootRes.status === 403, `Renaming root folder rejected with 403 (Got: ${renameRootRes.status})`);
    const renameRootJson = await renameRootRes.json();
    assert(renameRootJson.error && renameRootJson.error.includes('Protected system folder'), 'Error specifies protected system folder');

    // 2. Rename Protection: Managed Subfolder
    console.log('\n--- Step 2: Attempt to Rename Managed Subfolder (Branding) ---');
    const renameSubRes = await fetch(`${BASE_URL}/api/v1/files/${brandingFolder.id}/rename`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newName: 'My_Custom_Logos' }),
    });
    assert(renameSubRes.status === 403, `Renaming branding folder rejected with 403 (Got: ${renameSubRes.status})`);

    // 3. Move Protection: Root Folder
    console.log('\n--- Step 3: Attempt to Move Root Certificates Folder ---');
    const moveRootRes = await fetch(`${BASE_URL}/api/v1/files/${rootFolder.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetParentId: brandingFolder.id }),
    });
    assert(moveRootRes.status === 403, `Moving root folder rejected with 403 (Got: ${moveRootRes.status})`);

    // 4. Move Protection: Child Folder
    console.log('\n--- Step 4: Attempt to Move Signatures Folder ---');
    const moveSubRes = await fetch(`${BASE_URL}/api/v1/files/${signaturesFolder.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetParentId: null }),
    });
    assert(moveSubRes.status === 403, `Moving signatures folder rejected with 403 (Got: ${moveSubRes.status})`);

    // 5. Trash Protection: Root Folder
    console.log('\n--- Step 5: Attempt to Move Root Certificates Folder to Trash ---');
    const trashRootRes = await fetch(`${BASE_URL}/api/v1/files/trash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: [rootFolder.id] }),
    });
    assert(trashRootRes.status === 403, `Trashing root folder rejected with 403 (Got: ${trashRootRes.status})`);

    // 6. Trash Protection: Subfolder
    console.log('\n--- Step 6: Attempt to Move Generated Folder to Trash ---');
    const trashGenRes = await fetch(`${BASE_URL}/api/v1/files/trash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: [generatedFolder.id] }),
    });
    assert(trashGenRes.status === 403, `Trashing generated folder rejected with 403 (Got: ${trashGenRes.status})`);

    // 7. Permanent Purge Protection
    console.log('\n--- Step 7: Attempt to Permanently Purge Templates Folder ---');
    const purgeRes = await fetch(`${BASE_URL}/api/v1/files/nodes/${templatesFolder.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(purgeRes.status === 403, `Permanent deletion rejected with 403 (Got: ${purgeRes.status})`);

    // 8. Re-verify Folders Remain Intact in DB
    console.log('\n--- Step 8: Verify Folder Tree Retains Integrity in DB ---');
    const dbRoot = await prisma.mediaFile.findUnique({ where: { id: rootFolder.id } });
    assert(dbRoot !== null, 'Root folder exists in DB');
    assert(dbRoot.fileName === 'Certificates', 'Root folder name unmodified');
    assert(dbRoot.deletedAt === null, 'Root folder not marked deleted');

    console.log('\n================================================================================');
    console.log(` SUITE 2 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 2 FAILED:', err);
    process.exit(1);
  } finally {
    if (hrSessionId) {
      await prisma.deviceSession.delete({ where: { id: hrSessionId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runSuite();
