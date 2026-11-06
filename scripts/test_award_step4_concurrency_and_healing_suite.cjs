const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
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
  const sessId = 'sess-cnc-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Concurrency Suite',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  return sessId;
}

async function runConcurrencyAndHealingSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: CERTIFICATE CONCURRENCY & SELF-HEALING AUDIT SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let hrUser = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  await prisma.profile.upsert({
    where: { userId: hrUser.id },
    create: { userId: hrUser.id, tenantId, fullName: 'HR Concurrency Auditor', email: hrUser.email },
    update: { tenantId }
  }).catch(() => {});

  const hrSessionId = await createTestSession(hrUser.id, tenantId);
  const hrToken = makeToken({ ...hrUser, tenantId }, hrSessionId);
  const hrHeaders = {
    Authorization: `Bearer ${hrToken}`,
    'Content-Type': 'application/json'
  };

  // Recipient employee
  const recipEmail = `concurrency.recip.${Date.now()}@hrms.test`;
  const recipUser = await prisma.user.create({
    data: {
      id: `user-cnc-${Date.now()}`,
      email: recipEmail,
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecSoLAvWuv.2.S042',
      profile: {
        create: {
          tenantId,
          fullName: 'Concurrency Recipient',
          email: recipEmail
        }
      },
      roles: {
        create: {
          role: 'employee',
          tenantId
        }
      }
    }
  });

  const recipEmp = await prisma.employee.create({
    data: {
      id: `emp-cnc-${Date.now()}`,
      tenantId,
      userId: recipUser.id,
      employeeCode: `EMP-CNC-${Date.now().toString().slice(-4)}`,
      firstName: 'Alan',
      lastName: 'Turing',
      email: recipEmail,
      status: 'active'
    }
  });

  // AwardType
  let awardType = await prisma.awardType.findFirst({ where: { tenantId } });
  if (!awardType) {
    awardType = await prisma.awardType.create({
      data: {
        tenantId,
        name: `Concurrency Award ${Date.now()}`,
        status: 'active'
      }
    });
  }

  // System Template
  const sysTemplate = await prisma.certificateTemplate.findFirst({
    where: { isSystem: true }
  });

  // Base Award
  const award = await prisma.award.create({
    data: {
      id: `award-cnc-${Date.now()}`,
      tenantId,
      employeeId: recipEmp.id,
      awardTypeId: awardType.id,
      awardDate: new Date(),
      giftItem: 'Crystal Medallion',
      description: 'Pioneering computational integrity and fault tolerance.',
      presentedBy: 'Executive Council',
      status: 'awarded'
    }
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: SIMULTANEOUS CONCURRENT ISSUANCE REQUESTS FOR THE SAME AWARD
    // -------------------------------------------------------------------------
    console.log('--- 1. Simultaneous Concurrent Issuance Requests ---');
    const simultaneousIssuance = await Promise.all([
      fetch(`${BASE_URL}/awards/${award.id}/certificate/generate`, { method: 'POST', headers: hrHeaders }),
      fetch(`${BASE_URL}/awards/${award.id}/certificate/generate`, { method: 'POST', headers: hrHeaders }),
      fetch(`${BASE_URL}/awards/${award.id}/certificate/generate`, { method: 'POST', headers: hrHeaders }),
    ]);

    const statuses = simultaneousIssuance.map(r => r.status);
    console.log('  Issuance Statuses:', statuses);
    for (const r of simultaneousIssuance) {
      if (r.status !== 200 && r.status !== 201) {
        console.log('  Failed response body:', await r.text());
      }
    }
    assert(statuses.every(s => s === 200 || s === 201), 'All concurrent generation requests resolved successfully (200 or 201)');

    const payloads = await Promise.all(simultaneousIssuance.map(r => r.json()));
    const certIds = payloads.map(p => p.data.id);
    const uniqueCertIds = [...new Set(certIds)];

    assert(uniqueCertIds.length === 1, `Concurrency guard guaranteed exactly 1 unique certificate ID across all parallel requests (${uniqueCertIds[0]})`);

    // Verify DB count
    const activeCerts = await prisma.employeeAwardCertificate.findMany({
      where: { awardId: award.id, status: 'ACTIVE' }
    });
    assert(activeCerts.length === 1, `Database contains exactly 1 active certificate (found: ${activeCerts.length})`);

    const primaryCert = activeCerts[0];

    // -------------------------------------------------------------------------
    // TEST 2: SIMULTANEOUS CONCURRENT REISSUE REQUESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Simultaneous Concurrent Reissue Requests ---');
    const simultaneousReissue = await Promise.all([
      fetch(`${BASE_URL}/awards/${award.id}/certificate/reissue`, {
        method: 'POST',
        headers: hrHeaders,
        body: JSON.stringify({ reason: 'Parallel reissue batch A' })
      }),
      fetch(`${BASE_URL}/awards/${award.id}/certificate/reissue`, {
        method: 'POST',
        headers: hrHeaders,
        body: JSON.stringify({ reason: 'Parallel reissue batch B' })
      })
    ]);

    const reissueStatuses = simultaneousReissue.map(r => r.status);
    console.log('  Reissue Statuses:', reissueStatuses);
    assert(reissueStatuses.every(s => s === 200 || s === 201), 'Concurrent reissue requests resolved with success');

    // In DB, there must still be exactly ONE active certificate
    const activeAfterReissue = await prisma.employeeAwardCertificate.findMany({
      where: { awardId: award.id, status: 'ACTIVE' }
    });
    assert(activeAfterReissue.length === 1, `Exactly 1 active certificate remains in DB after parallel reissue operations (${activeAfterReissue[0].id})`);

    const reissuedCert = activeAfterReissue[0];
    assert(reissuedCert.id !== primaryCert.id, 'Reissued certificate has fresh unique ID');

    // Check old certificates are marked REVOKED
    const revokedCerts = await prisma.employeeAwardCertificate.findMany({
      where: { awardId: award.id, status: 'REVOKED' }
    });
    assert(revokedCerts.length >= 1, `Previous certificate(s) correctly transitioned to REVOKED in database (found: ${revokedCerts.length})`);

    // -------------------------------------------------------------------------
    // TEST 3: DUPLICATE CONCURRENT REVOCATION
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Duplicate Concurrent Revocation Requests ---');
    const simultaneousRevoke = await Promise.all([
      fetch(`${BASE_URL}/awards/certificates/${reissuedCert.id}/revoke`, {
        method: 'POST',
        headers: hrHeaders,
        body: JSON.stringify({ reason: 'Simultaneous duplicate revocation audit test' })
      }),
      fetch(`${BASE_URL}/awards/certificates/${reissuedCert.id}/revoke`, {
        method: 'POST',
        headers: hrHeaders,
        body: JSON.stringify({ reason: 'Simultaneous duplicate revocation audit test' })
      })
    ]);

    const revokeStatuses = simultaneousRevoke.map(r => r.status);
    console.log('  Revocation Statuses:', revokeStatuses);
    assert(revokeStatuses.every(s => s === 200 || s === 400), 'Concurrent revocation handled gracefully without server exception');

    const certAfterRevoke = await prisma.employeeAwardCertificate.findUnique({
      where: { id: reissuedCert.id }
    });
    assert(certAfterRevoke.status === 'REVOKED', 'Certificate status safely transitioned to REVOKED');

    // -------------------------------------------------------------------------
    // TEST 4: SELF-HEALING STORAGE RECOVERY (MISSING FILE REGENERATION)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Self-Healing Storage Recovery (Missing Disk File) ---');

    // Reissue once more to have an active certificate with a physical file
    const freshReissueRes = await fetch(`${BASE_URL}/awards/${award.id}/certificate/reissue`, {
      method: 'POST',
      headers: hrHeaders,
      body: JSON.stringify({ reason: 'Restoring active certificate for self-healing test' })
    });
    assert(freshReissueRes.status === 201, 'Fresh active certificate issued');
    const freshData = await freshReissueRes.json();
    const healingCertId = freshData.data.id;

    const healingCert = await prisma.employeeAwardCertificate.findUnique({
      where: { id: healingCertId }
    });

    // Locate physical file on disk
    let diskPath = path.resolve(__dirname, '../uploads', healingCert.storagePath);
    if (!fs.existsSync(diskPath)) {
      diskPath = path.resolve(__dirname, '../server/uploads', healingCert.storagePath);
    }
    assert(fs.existsSync(diskPath), `Original certificate PDF exists on disk: ${healingCert.storagePath}`);

    // SIMULATE DISK CORRUPTION / DATA LOSS BY REMOVING THE PHYSICAL FILE
    fs.unlinkSync(diskPath);
    assert(!fs.existsSync(diskPath), 'Physical file on disk successfully deleted to simulate storage corruption');

    // CONCURRENT DOWNLOAD WHILE RECOVERY RUNS
    console.log('  Executing concurrent downloads against missing disk file to test dynamic self-healing...');
    const concurrentDownloads = await Promise.all([
      fetch(`${BASE_URL}/awards/certificates/${healingCertId}/download`, { headers: hrHeaders }),
      fetch(`${BASE_URL}/awards/certificates/${healingCertId}/download`, { headers: hrHeaders }),
      fetch(`${BASE_URL}/awards/certificates/${healingCertId}/download`, { headers: hrHeaders })
    ]);

    assert(concurrentDownloads.every(r => r.status === 200), 'All parallel download requests returned 200 OK during self-healing');
    const firstContentType = concurrentDownloads[0].headers.get('content-type');
    assert(firstContentType && firstContentType.includes('application/pdf'), 'Streamed self-healed file is application/pdf');

    // Check that self-healing restored the file on disk
    assert(fs.existsSync(diskPath), 'Self-healing dynamically regenerated and restored the missing PDF to disk');
    const restoredBuffer = fs.readFileSync(diskPath);
    assert(restoredBuffer.length > 1000, `Restored binary PDF is substantial (${restoredBuffer.length} bytes)`);
    assert(restoredBuffer.toString('utf-8', 0, 5) === '%PDF-', 'Restored file starts with valid %PDF- magic bytes');

    // Verify Audit log entry for self-healing
    const healAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'AWARD_CERTIFICATE_SELF_HEALED',
        entityId: healingCertId
      }
    });
    assert(!!healAudit, 'Audit log recorded AWARD_CERTIFICATE_SELF_HEALED event');

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('CONCURRENCY & SELF-HEALING SUITE: 100% SUCCESS');
    console.log('================================================================');

  } finally {
    await prisma.deviceSession.deleteMany({
      where: { id: hrSessionId }
    }).catch(() => {});
    await prisma.$disconnect();
  }
}

runConcurrencyAndHealingSuite().catch(err => {
  console.error('\n❌ Concurrency suite execution error:', err);
  process.exit(1);
});
