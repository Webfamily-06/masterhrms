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

function makeToken(user, sessionId, roles = ['admin', 'hr_manager']) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
      permissions: ['*'],
      sessionId,
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

async function createTestSession(userId, tenantId) {
  const sessId = 'sess-iso-' + Math.random().toString(36).substring(2, 9);
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
  console.log(' SUITE 6: CERTIFICATE FILE TENANT ISOLATION & RBAC BOUNDARY SUITE');
  console.log('================================================================================\n');

  let tenantA = null;
  let tenantB = null;
  let hrUserA = null;
  let hrSessionA = null;
  let tokenA = null;
  let hrUserB = null;
  let hrSessionB = null;
  let tokenB = null;
  let empUserA = null;
  let empSessionA = null;
  let empTokenA = null;

  let assetA = null;
  let signatoryA = null;

  try {
    // 1. Setup Tenant A
    tenantA = await prisma.tenant.findFirst({ where: { name: { not: 'Isolated Tenant B' } } });
    assert(tenantA !== null, `Tenant A found: ${tenantA.name}`);

    // Setup Tenant B
    tenantB = await prisma.tenant.findFirst({ where: { id: { not: tenantA.id } } });
    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          name: 'Isolated Tenant B',
          slug: 'isolated-tenant-b-' + Date.now(),
          isOnboarded: true,
        },
      });
    }
    assert(tenantB !== null, `Tenant B configured: ${tenantB.name}`);

    // Users for Tenant A
    const empA = await prisma.employee.findFirst({
      where: { tenantId: tenantA.id, userId: { not: null } },
      include: { user: true },
    }) || await prisma.employee.findFirst({ where: { tenantId: tenantA.id }, include: { user: true } });

    hrUserA = empA?.user || await prisma.user.findFirst();
    hrSessionA = await createTestSession(hrUserA.id, tenantA.id);
    tokenA = makeToken({ id: hrUserA.id, email: hrUserA.email, tenantId: tenantA.id }, hrSessionA, ['admin', 'hr_manager', 'hr_admin']);

    // Regular Employee for Tenant A (Non-HR)
    empUserA = await prisma.user.create({
      data: { email: `emp.regular.${Date.now()}@tenantA.com`, passwordHash: 'hash123' },
    });
    empSessionA = await createTestSession(empUserA.id, tenantA.id);
    empTokenA = jwt.sign(
      {
        userId: empUserA.id,
        email: empUserA.email,
        tenantId: tenantA.id,
        roles: ['employee'],
        permissions: ['files.read'],
        sessionId: empSessionA,
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '2h' }
    );

    // HR User for Tenant B
    hrUserB = await prisma.user.create({
      data: { email: `hr.tenantB.${Date.now()}@tenantB.com`, passwordHash: 'hash123' },
    });
    hrSessionB = await createTestSession(hrUserB.id, tenantB.id);
    tokenB = makeToken({ id: hrUserB.id, email: hrUserB.email, tenantId: tenantB.id }, hrSessionB, ['admin', 'hr_admin']);

    // 2. Upload asset in Tenant A
    console.log('--- Step 1: Upload Asset in Tenant A ---');
    const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const blob = new Blob([samplePng], { type: 'image/png' });
    const formDataA = new FormData();
    formDataA.append('file', blob, 'tenantA_seal.png');
    formDataA.append('assetType', 'SEAL');
    formDataA.append('assetName', 'Tenant A Confidential Seal');

    const uploadResA = await fetch(`${BASE_URL}/api/certificate-studio/branding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formDataA,
    });
    assert(uploadResA.status === 201, `Tenant A asset uploaded (HTTP ${uploadResA.status})`);
    const uploadJsonA = await uploadResA.json();
    assetA = uploadJsonA.asset;

    // Create signatory in Tenant A
    const sigResA = await fetch(`${BASE_URL}/api/certificate-studio/signatories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Tenant A Director',
        designation: 'Director',
        signatoryType: 'DIRECTOR',
        signatureAssetId: assetA.id,
      }),
    });
    assert(sigResA.status === 201, `Tenant A signatory created (HTTP ${sigResA.status})`);
    const sigJsonA = await sigResA.json();
    signatoryA = sigJsonA.signatory;

    // 3. Cross-Tenant Preview Breach Attempt
    console.log('\n--- Step 2: Tenant B Attempts to Stream Tenant A Asset ---');
    const crossPreviewRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/${assetA.id}/preview`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert([403, 404].includes(crossPreviewRes.status), `Cross-tenant preview rejected with 403/404 (Got: ${crossPreviewRes.status})`);

    // 4. Cross-Tenant Signatory Preview Breach Attempt
    console.log('\n--- Step 3: Tenant B Attempts to Stream Tenant A Signatory Signature ---');
    const crossSigRes = await fetch(`${BASE_URL}/api/certificate-studio/signatories/${signatoryA.id}/signature-preview`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert([403, 404].includes(crossSigRes.status), `Cross-tenant signature preview rejected with 403/404 (Got: ${crossSigRes.status})`);

    // 5. Cross-Tenant Deletion Breach Attempt
    console.log('\n--- Step 4: Tenant B Attempts to Delete Tenant A Asset ---');
    const crossDeleteRes = await fetch(`${BASE_URL}/api/certificate-studio/branding/${assetA.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert([403, 404].includes(crossDeleteRes.status), `Cross-tenant deletion rejected with 403/404 (Got: ${crossDeleteRes.status})`);

    // 6. RBAC Guard: Non-HR Employee browsing Certificates folders
    console.log('\n--- Step 5: Regular Employee Attempts to Browse Protected Certificates/Branding ---');
    // Get Tenant A's branding folder ID
    const foldersResA = await fetch(`${BASE_URL}/api/certificate-studio/folders`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const foldersJsonA = await foldersResA.json();
    const brandingFolderA = foldersJsonA.folders.brandingFolder || foldersJsonA.folders.branding;

    const empBrowseRes = await fetch(`${BASE_URL}/api/v1/files?parentId=${brandingFolderA.id}`, {
      headers: { Authorization: `Bearer ${empTokenA}` },
    });
    assert(empBrowseRes.status === 403, `Non-HR browsing of Certificates/Branding rejected with 403 (Got: ${empBrowseRes.status})`);

    console.log('\n================================================================================');
    console.log(` SUITE 6 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 6 FAILED:', err);
    process.exit(1);
  } finally {
    if (signatoryA) {
      await prisma.organizationSignatory.delete({ where: { id: signatoryA.id } }).catch(() => { });
    }
    if (assetA) {
      await prisma.organizationBrandingAsset.delete({ where: { id: assetA.id } }).catch(() => { });
      if (assetA.fileId) {
        await prisma.mediaFile.delete({ where: { id: assetA.fileId } }).catch(() => { });
      }
    }
    if (hrSessionA) await prisma.deviceSession.delete({ where: { id: hrSessionA } }).catch(() => { });
    if (empSessionA) await prisma.deviceSession.delete({ where: { id: empSessionA } }).catch(() => { });
    if (empUserA) await prisma.user.delete({ where: { id: empUserA.id } }).catch(() => { });
    if (hrSessionB) await prisma.deviceSession.delete({ where: { id: hrSessionB } }).catch(() => { });
    if (hrUserB) await prisma.user.delete({ where: { id: hrUserB.id } }).catch(() => { });
    await prisma.$disconnect();
  }
}

runSuite();
