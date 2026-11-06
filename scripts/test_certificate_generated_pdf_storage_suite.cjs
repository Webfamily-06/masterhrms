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
  const sessId = 'sess-pdf-' + Math.random().toString(36).substring(2, 9);
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
  console.log(' SUITE 7: CERTIFICATE GENERATED PDF UNIFIED STORAGE & RESILIENCE TEST');
  console.log('================================================================================\n');

  let hrSessionId = null;
  let testAward = null;
  let testCert = null;

  try {
    const recipientEmp = await prisma.employee.findFirst({
      where: { userId: { not: null }, status: 'active' },
      include: { user: true, tenant: true },
    }) || await prisma.employee.findFirst({ include: { user: true, tenant: true } });

    const testTenant = recipientEmp.tenant;
    const hrUser = recipientEmp.user || await prisma.user.findFirst();

    await prisma.userRole.upsert({
      where: { userId_role_tenantId: { userId: hrUser.id, role: 'hr_admin', tenantId: testTenant.id } },
      create: { userId: hrUser.id, role: 'hr_admin', tenantId: testTenant.id },
      update: {}
    }).catch(() => {});

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

    // 1. Find or create an employee award
    console.log('--- Step 1: Prepare Test Employee Award ---');
    let awardType = await prisma.awardType.findFirst({ where: { tenantId: testTenant.id } });
    if (!awardType) {
      awardType = await prisma.awardType.create({
        data: {
          tenantId: testTenant.id,
          name: 'Excellence in Engineering 2026',
          category: 'TECHNICAL',
          status: 'ACTIVE',
        },
      });
    }

    testAward = await prisma.award.create({
      data: {
        tenantId: testTenant.id,
        awardTypeId: awardType.id,
        employeeId: recipientEmp.id,
        awardDate: new Date(),
        description: 'Demonstrating architectural excellence and reliability.',
      },
    });
    assert(testAward !== null && testAward.id !== undefined, 'Test award record created');

    // 2. Generate Certificate via Award Certificate API
    console.log('\n--- Step 2: Generate Award Certificate ---');
    const genRes = await fetch(`${BASE_URL}/api/awards/${testAward.id}/certificate/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(genRes.status === 201 || genRes.status === 200, `Generate certificate endpoint returned HTTP ${genRes.status}`);
    const genJson = await genRes.json();
    testCert = genJson.data || genJson.certificate;
    assert(testCert !== null && testCert.id !== undefined, 'Certificate record created');
    assert(testCert.certificateNumber !== undefined, `Certificate number assigned: ${testCert.certificateNumber}`);

    // 3. Verify MediaFile in File Manager Certificates/Generated
    console.log('\n--- Step 3: Verify PDF Record Stored in File Manager Certificates/Generated ---');
    const dbCert = await prisma.employeeAwardCertificate.findUnique({
      where: { id: testCert.id },
      include: { file: true },
    });
    assert(dbCert !== null, 'Certificate retrieved from DB');
    assert(dbCert.fileId !== null, `Certificate fileId populated (${dbCert.fileId})`);
    assert(dbCert.file !== null, 'Related MediaFile record exists');
    assert(dbCert.file.folder.includes('Generated') || dbCert.file.category === 'Generated' || dbCert.file.folder.includes('Certificates'), 'MediaFile is organized inside Certificates/Generated folder');
    assert(dbCert.file.mimeType === 'application/pdf', 'MediaFile mimeType is application/pdf');

    // 4. Verify Physical PDF File Exists on Disk
    console.log('\n--- Step 4: Verify Physical File on Storage Disk ---');
    const uploadsRoot = path.resolve(__dirname, '../uploads');
    const pdfAbsPath = path.resolve(uploadsRoot, dbCert.storagePath);
    assert(fs.existsSync(pdfAbsPath), `Physical PDF file exists on disk: ${dbCert.storagePath}`);

    // 5. Download Certificate PDF Stream
    console.log('\n--- Step 5: Download Certificate Stream from File Manager API ---');
    const downloadRes = await fetch(`${BASE_URL}/api/v1/files/${dbCert.fileId}/stream?token=${encodeURIComponent(token)}`);
    assert(downloadRes.status === 200, `Stream returned HTTP 200 (Got: ${downloadRes.status})`);
    const downloadBuf = await downloadRes.arrayBuffer();
    assert(downloadBuf.byteLength > 1000, `PDF size is valid (${downloadBuf.byteLength} bytes)`);

    // 6. Test Self-Healing Regeneration: Temporarily delete physical PDF
    console.log('\n--- Step 6: Test Dynamic Self-Healing File Regeneration ---');
    if (fs.existsSync(pdfAbsPath)) {
      fs.unlinkSync(pdfAbsPath);
    }
    assert(!fs.existsSync(pdfAbsPath), 'Physical PDF temporarily removed to test healing');

    // Call getCertificate endpoint (should detect missing physical file, re-render, and resync)
    const healRes = await fetch(`${BASE_URL}/api/awards/certificates/${testCert.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(healRes.status === 200, `Certificate query returns HTTP 200 during self-healing`);
    const healBuf = await healRes.arrayBuffer();
    assert(healBuf.byteLength > 1000, `Self-healed PDF stream re-delivered successfully (${healBuf.byteLength} bytes)`);
    assert(fs.existsSync(pdfAbsPath), 'Physical PDF was regenerated on disk by self-healing logic');

    console.log('\n================================================================================');
    console.log(` SUITE 7 COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================================\n');
  } catch (err) {
    console.error('\n✖ SUITE 7 FAILED:', err);
    process.exit(1);
  } finally {
    if (testCert) {
      await prisma.employeeAwardCertificate.delete({ where: { id: testCert.id } }).catch(() => { });
      if (testCert.fileId) {
        await prisma.mediaFile.delete({ where: { id: testCert.fileId } }).catch(() => { });
      }
    }
    if (testAward) {
      await prisma.award.delete({ where: { id: testAward.id } }).catch(() => { });
    }
    if (hrSessionId) {
      await prisma.deviceSession.delete({ where: { id: hrSessionId } }).catch(() => { });
    }
    await prisma.$disconnect();
  }
}

runSuite();
