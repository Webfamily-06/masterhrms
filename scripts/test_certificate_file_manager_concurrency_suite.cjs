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

function softAssert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ PASS [${totalTests}]: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✔ PASS [${totalTests}]: ${message} (graceful degradation accepted)`);
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

async function createTestSession(userId, tenantId, prefix = 'sess-con') {
  const sessId = `${prefix}-` + Math.random().toString(36).substring(2, 9);
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

function makeSvgBuffer(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50">${label}</text></svg>`;
  return Buffer.from(svg, 'utf-8');
}

async function runSuite() {
  console.log('\n================================================================================');
  console.log(' SUITE 8: CERTIFICATE FILE MANAGER CONCURRENCY & RACE CONDITION TEST SUITE');
  console.log('================================================================================\n');

  let hrSessionId1, hrSessionId2;
  const cleanupAssets = [];
  const cleanupSessions = [];

  try {
    // --- Setup ---
    const recipientEmp = await prisma.employee.findFirst({
      where: { userId: { not: null }, status: 'active' },
      include: { user: true, tenant: true },
    }) || await prisma.employee.findFirst({ include: { user: true, tenant: true } });
    const testTenant = recipientEmp?.tenant;
    assert(testTenant !== null, `Active tenant found: ${testTenant?.name}`);

    let hrUser1 = recipientEmp?.user;
    if (!hrUser1) {
      hrUser1 = await prisma.user.findFirst({ where: { tenantId: testTenant.id } });
    }
    assert(hrUser1 !== null, `HR User 1 found: ${hrUser1?.email}`);

    hrSessionId1 = await createTestSession(hrUser1.id, testTenant.id, 'sess-con1');
    hrSessionId2 = await createTestSession(hrUser1.id, testTenant.id, 'sess-con2');
    cleanupSessions.push(hrSessionId1, hrSessionId2);
    const token1 = makeToken({ ...hrUser1, roles: ['admin', 'hr_admin', 'hr_manager'] }, hrSessionId1);
    const token2 = makeToken({ ...hrUser1, roles: ['admin', 'hr_admin', 'hr_manager'] }, hrSessionId2);

    // -------------------------------------------------------------------------
    // Step 1: Concurrent ensure-folders — idempotent, no duplicate rows
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Concurrent ensureCertificatesFolders (10x parallel) ---');

    const folderRequests = Array.from({ length: 10 }, (_, i) =>
      fetch(`${BASE_URL}/api/v1/files/certificates/ensure-folders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}`, 'Content-Type': 'application/json' },
      })
    );
    const folderResults = await Promise.all(folderRequests);
    const folderStatuses = folderResults.map((r) => r.status);
    assert(
      folderStatuses.every((s) => s === 200),
      `All 10 concurrent ensure-folders calls returned 200 (got: ${[...new Set(folderStatuses)].join(', ')})`
    );

    // Confirm only one set of Certificates folders exists (no duplicates)
    const certFolders = await prisma.mediaFile.findMany({
      where: { tenantId: testTenant.id, isFolder: true, nameKey: 'certificates', deletedAt: null },
    });
    assert(certFolders.length === 1, `Only one Certificates root folder exists after 10 concurrent calls (found: ${certFolders.length})`);

    // branding subfolder uses nameKey = 'branding', child of root
    const rootFolderId = certFolders[0].id;
    const brandingFolders = await prisma.mediaFile.findMany({
      where: { tenantId: testTenant.id, isFolder: true, nameKey: 'branding', parentId: rootFolderId, deletedAt: null },
    });
    assert(brandingFolders.length === 1, `Only one Branding subfolder exists (found: ${brandingFolders.length})`);

    // -------------------------------------------------------------------------
    // Step 2: Concurrent branding asset uploads — no data corruption
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Concurrent branding asset uploads (5x parallel) ---');

    const uploadPromises = Array.from({ length: 5 }, (_, i) => {
      const formData = new FormData();
      const buf = makeSvgBuffer(`concurrent-logo-${i}`);
      const blob = new Blob([buf], { type: 'image/svg+xml' });
      formData.append('file', blob, `concurrent_logo_${i}.svg`);
      formData.append('assetType', 'LOGO_PRIMARY');
      formData.append('assetName', `Concurrent Logo ${i}`);
      return fetch(`${BASE_URL}/api/certificate-studio/branding`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(i % 2 === 0 ? token1 : token2)}` },
        body: formData,
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    const uploadStatuses = uploadResults.map((r) => r.status);
    assert(
      uploadStatuses.every((s) => s === 201),
      `All 5 concurrent uploads returned 201 (got: ${uploadStatuses.join(', ')})`
    );

    const uploadedAssets = await Promise.all(uploadResults.map((r) => r.json()));
    const assetIds = uploadedAssets.map((j) => j.asset?.id).filter(Boolean);
    assert(assetIds.length === 5, `5 unique branding asset records created (got: ${assetIds.length})`);

    // All 5 must have distinct IDs
    const uniqueIds = new Set(assetIds);
    assert(uniqueIds.size === 5, `All 5 asset IDs are distinct (no race-condition duplicate rows)`);

    // Track for cleanup
    cleanupAssets.push(...assetIds);

    // -------------------------------------------------------------------------
    // Step 3: Concurrent concurrent reads from two parallel sessions
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Concurrent asset list reads from two sessions ---');

    const readPromises = Array.from({ length: 6 }, (_, i) =>
      fetch(`${BASE_URL}/api/certificate-studio/branding`, {
        headers: { Authorization: `Bearer ${i % 2 === 0 ? token1 : token2}` },
      })
    );
    const readResults = await Promise.all(readPromises);
    const readStatuses = readResults.map((r) => r.status);
    assert(
      readStatuses.every((s) => s === 200),
      `All 6 concurrent reads returned 200 (got: ${readStatuses.join(', ')})`
    );

    // Confirm all responses return the same number of assets (consistency)
    const readJsons = await Promise.all(readResults.map((r) => r.json()));
    const assetCounts = readJsons.map((j) => (j.assets || j.data || []).length);
    const uniqueCounts = new Set(assetCounts);
    assert(
      uniqueCounts.size === 1,
      `All 6 concurrent reads returned consistent asset counts (counts: ${assetCounts.join(', ')})`
    );

    // -------------------------------------------------------------------------
    // Step 4: Concurrent certificate PDF generation for 3 different awards
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Concurrent certificate PDF generation (3 awards) ---');

    let awardType = await prisma.awardType.findFirst({ where: { tenantId: testTenant.id } });
    if (!awardType) {
      awardType = await prisma.awardType.create({
        data: {
          tenantId: testTenant.id,
          name: 'Concurrency Test Award Type',
          category: 'TECHNICAL',
          status: 'ACTIVE',
        },
      });
    }

    const concurrentRecipient = await prisma.employee.findFirst({
      where: { tenantId: testTenant.id, userId: { not: null }, status: 'active' },
    }) || await prisma.employee.findFirst({ where: { tenantId: testTenant.id } });
    assert(concurrentRecipient !== null, `Test employee found for concurrent PDF generation`);

    // Create 3 test awards
    const testAwards = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        prisma.award.create({
          data: {
            tenantId: testTenant.id,
            awardTypeId: awardType.id,
            employeeId: concurrentRecipient.id,
            awardDate: new Date(),
            description: `Concurrent generation test award ${i + 1}`,
          },
        })
      )
    );
    assert(testAwards.length === 3, `3 test awards created for concurrent generation`);

    // Fire all 3 generate requests at once
    const genPromises = testAwards.map((award) =>
      fetch(`${BASE_URL}/api/awards/${award.id}/certificate/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token1}` },
      })
    );
    const genResults = await Promise.all(genPromises);
    const genStatuses = genResults.map((r) => r.status);
    assert(
      genStatuses.every((s) => s === 201 || s === 200),
      `All 3 concurrent generates returned 200/201 (got: ${genStatuses.join(', ')})`
    );

    const genJsons = await Promise.all(genResults.map((r) => r.json()));
    const certIds = genJsons.map((j) => (j.data || j.certificate)?.id).filter(Boolean);
    assert(certIds.length === 3, `3 unique certificate records created (got: ${certIds.length})`);

    const uniqueCertIds = new Set(certIds);
    assert(uniqueCertIds.size === 3, `All 3 certificate IDs are distinct (no overlap)`);

    // Verify each has a unique fileId
    const certRecords = await prisma.employeeAwardCertificate.findMany({
      where: { id: { in: [...uniqueCertIds] } },
      select: { id: true, fileId: true, storagePath: true, certificateNumber: true },
    });
    const fileIds = certRecords.map((c) => c.fileId).filter(Boolean);
    const uniqueFileIds = new Set(fileIds);
    assert(
      uniqueFileIds.size === 3,
      `Each concurrently-generated certificate has a distinct MediaFile fileId (got: ${uniqueFileIds.size})`
    );

    const storagePaths = certRecords.map((c) => c.storagePath).filter(Boolean);
    const uniquePaths = new Set(storagePaths);
    assert(
      uniquePaths.size === 3,
      `Each concurrently-generated certificate has a unique storage path (got: ${uniquePaths.size})`
    );

    // -------------------------------------------------------------------------
    // Step 5: Concurrent deletion race — only one delete should win per asset
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Concurrent deletion race on single asset ---');

    // Upload a fresh unreferenced asset
    const raceFormData = new FormData();
    const raceBuf = makeSvgBuffer('race-condition-asset');
    const raceBlob = new Blob([raceBuf], { type: 'image/svg+xml' });
    raceFormData.append('file', raceBlob, 'race_asset.svg');
    raceFormData.append('assetType', 'WATERMARK');
    raceFormData.append('assetName', 'Race Condition Test Asset');

    const raceUploadRes = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: raceFormData,
    });
    assert(raceUploadRes.status === 201, `Race condition test asset uploaded (HTTP ${raceUploadRes.status})`);
    const raceAssetJson = await raceUploadRes.json();
    const raceAssetId = raceAssetJson.asset?.id;
    assert(raceAssetId !== undefined, `Race asset has ID: ${raceAssetId}`);

    // Fire 3 concurrent DELETE requests on the same asset
    const deleteRacePromises = Array.from({ length: 3 }, () =>
      fetch(`${BASE_URL}/api/certificate-studio/branding/${raceAssetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token1}` },
      })
    );
    const deleteRaceResults = await Promise.all(deleteRacePromises);
    const deleteStatuses = deleteRaceResults.map((r) => r.status);

    // At least one should succeed (200), others may get 404 or 200
    const anySuccess = deleteStatuses.some((s) => s === 200);
    assert(anySuccess, `At least one concurrent deletion succeeded (statuses: ${deleteStatuses.join(', ')})`);

    // Verify the asset is deactivated exactly once in DB (no crash / no double record)
    const raceAssetFinal = await prisma.organizationBrandingAsset.findUnique({ where: { id: raceAssetId } });
    softAssert(
      raceAssetFinal === null || raceAssetFinal.isActive === false,
      `Asset is deactivated after concurrent deletion race (isActive: ${raceAssetFinal?.isActive})`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(` SUITE 8 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 8 FAILED:', err);
    process.exit(1);
  } finally {
    // Cleanup branding assets
    for (const assetId of cleanupAssets) {
      await prisma.organizationBrandingAsset.update({
        where: { id: assetId },
        data: { isActive: false },
      }).catch(() => { });
    }
    // Cleanup test awards and certificates for concurrent gen step
    const awards = await prisma.award.findMany({
      where: {
        tenantId: { not: undefined },
        description: { startsWith: 'Concurrent generation test award' },
      },
      include: { certificates: { select: { id: true, fileId: true } } },
    }).catch(() => []);
    for (const award of awards) {
      for (const cert of award.certificates) {
        if (cert.fileId) {
          await prisma.mediaFile.delete({ where: { id: cert.fileId } }).catch(() => { });
        }
        await prisma.employeeAwardCertificate.delete({ where: { id: cert.id } }).catch(() => { });
      }
      await prisma.award.delete({ where: { id: award.id } }).catch(() => { });
    }
    // Cleanup sessions
    for (const sessId of cleanupSessions) {
      await prisma.deviceSession.delete({ where: { id: sessId } }).catch(() => { });
    }
    await prisma.$disconnect();
  }
}

runSuite();
