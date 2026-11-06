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
  const sessId = 'sess-s4-' + Math.random().toString(36).substring(2, 9);
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

async function runStep4CertificateSuite() {
  console.log('\n================================================================================');
  console.log(' MASTERHRMS — AWARDS STEP 4: CERTIFICATE GENERATION & DISTRIBUTION TEST SUITE');
  console.log('================================================================================\n');

  let testTenant = null;
  let hrUser = null;
  let hrSessionId = null;
  let recipientEmp = null;
  let recipientUser = null;
  let empSessionId = null;
  let otherEmp = null;
  let otherUser = null;
  let otherSessionId = null;
  let awardType = null;
  let createdAward = null;
  let generatedCert = null;
  let reissuedCert = null;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 1: Database Schema & Additive Model Verification (Scenarios 1-4)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- MODULE 1: Database Schema & Additive Model Verification ---');

    // 1. Table existence
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'employee_award_certificates';
    `;
    assert(tableCheck.length === 1, 'Table employee_award_certificates exists in PostgreSQL');

    // 2. Column definitions
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'employee_award_certificates';
    `;
    const colNames = columns.map(c => c.column_name);
    assert(
      ['id', 'tenant_id', 'award_id', 'nomination_id', 'employee_id', 'certificate_number', 'verification_code', 'storage_path', 'status', 'metadata', 'file_size'].every(col => colNames.includes(col)),
      'All mandatory columns exist in employee_award_certificates'
    );

    // 3. Partial unique index check
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef FROM pg_indexes 
      WHERE tablename = 'employee_award_certificates';
    `;
    const indexDefs = indexes.map(i => i.indexdef);
    const hasActivePartialUnique = indexDefs.some(def => 
      def.includes('tenant_id') && def.includes('award_id') && def.includes('ACTIVE')
    );
    assert(hasActivePartialUnique, 'Partial unique index on (tenant_id, award_id) WHERE status = ACTIVE exists');

    // 4. Prisma model integration
    const countCertificatesPrisma = await prisma.employeeAwardCertificate.count();
    assert(typeof countCertificatesPrisma === 'number', 'Prisma Client successfully queries model EmployeeAwardCertificate');

    // ─────────────────────────────────────────────────────────────────────────
    // SETUP TEST FIXTURES
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Find existing active employee with user
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

    if (!recipientEmp.userId) {
      recipientUser = await prisma.user.create({
        data: {
          email: recipientEmp.email || `emp.step4.${Date.now()}@test.com`,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        },
      });
      await prisma.employee.update({
        where: { id: recipientEmp.id },
        data: { userId: recipientUser.id },
      });
      recipientEmp.userId = recipientUser.id;
    } else {
      recipientUser = recipientEmp.user;
    }

    // HR User: Find or create in DB
    hrUser = await prisma.user.findFirst({
      where: {
        employees: { some: { tenantId } },
      },
    });
    if (!hrUser) {
      hrUser = await prisma.user.create({
        data: {
          email: `hr.suite.${Date.now()}@masterhrms.com`,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        },
      });
    }

    // Dedicated Unprivileged Colleague (for authorization boundary check)
    otherUser = await prisma.user.create({
      data: {
        email: `colleague.${Date.now()}@testhrms.com`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      },
    });
    otherEmp = await prisma.employee.create({
      data: {
        tenantId,
        userId: otherUser.id,
        employeeCode: `EMP-COL-${Date.now().toString().slice(-4)}`,
        firstName: 'Devendra',
        lastName: 'Joshi',
        email: otherUser.email,
        status: 'active',
      },
    });

    // Ensure Profiles exist for all test users so auth workspace onboarding check passes
    for (const u of [recipientUser, hrUser, otherUser]) {
      if (u && u.id) {
        await prisma.profile.upsert({
          where: { userId: u.id },
          create: { userId: u.id, tenantId, fullName: u.email?.split('@')[0] || 'Test User', email: u.email },
          update: { tenantId }
        }).catch(() => {});
      }
    }
    // Sessions in device_sessions
    hrSessionId = await createTestSession(hrUser.id, tenantId);
    empSessionId = await createTestSession(recipientUser.id, tenantId);
    otherSessionId = await createTestSession(otherUser.id, tenantId);

    // Award Type
    awardType = await prisma.awardType.findFirst({
      where: { tenantId, status: 'active' },
    });
    if (!awardType) {
      awardType = await prisma.awardType.create({
        data: {
          tenantId,
          name: 'Leadership Excellence',
          icon: 'Award',
          description: 'Recognizing outstanding strategic leadership',
          status: 'active',
        },
      });
    }

    // Base Award
    createdAward = await prisma.award.create({
      data: {
        tenantId,
        employeeId: recipientEmp.id,
        awardTypeId: awardType.id,
        awardDate: new Date(),
        giftItem: 'Gold Medal & Certificate of Distinction',
        giftAmount: 10000,
        description: 'Exemplary leadership in architectural modularization and zero-defect delivery.',
        presentedBy: 'Executive Committee',
        status: 'awarded',
      },
    });

    const hrToken = makeToken({ id: hrUser.id, email: hrUser.email, tenantId, roles: ['hr_manager', 'hr_admin'], permissions: ['*'] }, hrSessionId);
    const empToken = makeToken({ id: recipientUser.id, email: recipientUser.email, tenantId, roles: ['employee'], permissions: [] }, empSessionId);
    const otherToken = makeToken({ id: otherUser.id, email: otherUser.email, tenantId, roles: ['employee'], permissions: [] }, otherSessionId);
    console.log('empToken decoded:', jwt.decode(empToken));

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 2: Authoritative Certificate Generation & Formats (Scenarios 5-8)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 2: Authoritative Certificate Generation & Formats ---');

    // 5. Generate Certificate via API
    const genRes = await fetch(`${BASE_URL}/api/awards/${createdAward.id}/certificate/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
    });
    const genData = await genRes.json();
    if (genRes.status !== 201) {
      console.log('Generate Failed Response:', genRes.status, genData);
    }
    assert(genRes.status === 201 && genData.success === true, 'POST /api/awards/:id/certificate/generate returns 201 Created');
    generatedCert = genData.data;

    // 6. Certificate Number structure
    assert(
      /^CERT-\d{4}-[A-F0-9]{8}$/.test(generatedCert.certificateNumber),
      `Certificate number format valid (${generatedCert.certificateNumber})`
    );

    // 7. Unguessable Verification Code
    assert(
      /^VERIFY-[A-F0-9]{32}$/.test(generatedCert.verificationCode),
      `Verification code format is unguessable 32-char hex (${generatedCert.verificationCode})`
    );

    // 8. Immutable Metadata Snapshot
    const meta = generatedCert.metadata;
    assert(
      meta.recipientName.includes(recipientEmp.firstName) &&
      meta.awardTitle === awardType.name &&
      meta.certificateNumber === generatedCert.certificateNumber &&
      meta.verificationCode === generatedCert.verificationCode &&
      Boolean(meta.verificationUrl),
      'Immutable snapshot correctly preserves recipient, title, numbers, and verification URL'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 3: Landscape A4 Vector PDF Rendering & Integrity (Scenarios 9-12)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 3: Landscape A4 Vector PDF Rendering & Integrity ---');

    // 9. PDF File Exists on Disk
    const uploadsRoot = path.resolve(__dirname, '../server/uploads');
    let absolutePdfPath = path.resolve(uploadsRoot, generatedCert.storagePath);
    if (!fs.existsSync(absolutePdfPath)) {
      absolutePdfPath = path.resolve(__dirname, '../uploads', generatedCert.storagePath);
    }
    assert(fs.existsSync(absolutePdfPath), `PDF file physically stored on disk (${absolutePdfPath})`);

    // 10. PDF Buffer Signature
    const fileBytes = fs.readFileSync(absolutePdfPath);
    const pdfHeader = fileBytes.subarray(0, 5).toString('ascii');
    assert(pdfHeader === '%PDF-', `File header confirms authoritative PDF binary (${pdfHeader})`);

    // 11. PDF Size Integrity
    assert(fileBytes.length > 2000, `PDF size is substantial and vector-rendered (${fileBytes.length} bytes)`);
    assert(fileBytes.length === generatedCert.fileSize, 'File size on disk exactly matches recorded database fileSize');

    // 12. Landscape Geometry & Page Definition
    const pdfContentStr = fileBytes.toString('latin1');
    assert(
      pdfContentStr.includes('841.89 595.28') && pdfContentStr.includes('/MediaBox'),
      'PDF binary structure validates landscape A4 dimensions (841.89 x 595.28 pt)'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 4: Tenant Storage Isolation & File System Security (Scenarios 13-15)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 4: Tenant Storage Isolation & File System Security ---');

    // 13. Tenant isolated folder path
    assert(
      generatedCert.storagePath.startsWith(`tenants/${tenantId}/awards/certificates/`),
      `Storage path enforces strict tenant directory isolation (${generatedCert.storagePath})`
    );

    // 14. Award record updated
    const updatedAward = await prisma.award.findUnique({ where: { id: createdAward.id } });
    assert(
      updatedAward.certificateNo === generatedCert.certificateNumber &&
      updatedAward.certificateUrl.includes(generatedCert.id),
      'Base award record synchronized with certificateNo and certificateUrl'
    );

    // 15. Security path traversal protection
    const foreignCertRes = await fetch(`${BASE_URL}/api/awards/certificates/../../etc/passwd/download`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      foreignCertRes.status === 404 || foreignCertRes.status === 400,
      'Directory traversal attempts on download endpoint are rejected'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 5: Idempotency & Concurrency Safety (Scenarios 16-17)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 5: Idempotency & Concurrency Safety ---');

    // 16. Second generation call returns existing certificate
    const repeatRes = await fetch(`${BASE_URL}/api/awards/${createdAward.id}/certificate/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
    });
    const repeatData = await repeatRes.json();
    assert(
      repeatRes.status === 200 && repeatData.reused === true && repeatData.data.id === generatedCert.id,
      'Calling generate twice on same award returns existing certificate idempotently (reused: true)'
    );

    // 17. Only one active certificate in database
    const activeCount = await prisma.employeeAwardCertificate.count({
      where: { awardId: createdAward.id, status: 'ACTIVE' },
    });
    assert(activeCount === 1, 'Database guarantees exactly one active certificate for this award');

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 6: Controlled Revocation Lifecycle (Scenarios 18-21)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 6: Controlled Revocation Lifecycle ---');

    // 18. Revocation rejected without reason (<3 chars)
    const badRevokeRes = await fetch(`${BASE_URL}/api/awards/certificates/${generatedCert.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({ reason: ' ' }),
    });
    assert(badRevokeRes.status === 400, 'Revocation without valid reason is rejected with 400');

    // 19. Revocation rejected for non-HR
    const empRevokeRes = await fetch(`${BASE_URL}/api/awards/certificates/${generatedCert.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ reason: 'Unauthorized revocation attempt' }),
    });
    if (empRevokeRes.status !== 403) {
      console.error('Test 20 failed with status:', empRevokeRes.status, await empRevokeRes.text());
    }
    assert(empRevokeRes.status === 403, 'Non-HR employee cannot revoke certificates (403 Forbidden)');

    // 20. Authoritative Revocation
    const validRevokeRes = await fetch(`${BASE_URL}/api/awards/certificates/${generatedCert.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({ reason: 'Administrative recalculation of award criteria' }),
    });
    const revokeData = await validRevokeRes.json();
    assert(validRevokeRes.status === 200 && revokeData.data.status === 'REVOKED', 'HR successfully revokes certificate with mandatory reason');

    // 21. Database status is REVOKED
    const dbRevokedCert = await prisma.employeeAwardCertificate.findUnique({ where: { id: generatedCert.id } });
    assert(
      dbRevokedCert.status === 'REVOKED' &&
      dbRevokedCert.revokedAt !== null &&
      dbRevokedCert.revocationReason === 'Administrative recalculation of award criteria',
      'Database verifies revoked_at timestamp and revocation_reason audit trail'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 7: Immutable Reissue Lifecycle (Scenarios 22-24)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 7: Immutable Reissue Lifecycle ---');

    // 22. Reissue Certificate
    const reissueRes = await fetch(`${BASE_URL}/api/awards/${createdAward.id}/certificate/reissue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({ reason: 'Re-issued with updated corporate citation and signatures' }),
    });
    const reissueData = await reissueRes.json();
    assert(reissueRes.status === 201 && reissueData.success === true, 'POST /api/awards/:id/certificate/reissue returns 201');
    reissuedCert = reissueData.data;

    // 23. New Certificate has unique identifiers
    assert(
      reissuedCert.id !== generatedCert.id &&
      reissuedCert.certificateNumber !== generatedCert.certificateNumber &&
      reissuedCert.verificationCode !== generatedCert.verificationCode,
      'Reissued certificate possesses distinct ID, Certificate No, and Verification Code'
    );

    // 24. Audit history preserved
    const allCertsForAward = await prisma.employeeAwardCertificate.findMany({
      where: { awardId: createdAward.id },
      orderBy: { createdAt: 'asc' },
    });
    assert(
      allCertsForAward.length === 2 &&
      allCertsForAward[0].status === 'REVOKED' &&
      allCertsForAward[1].status === 'ACTIVE',
      'Full reissue audit history preserved in DB: 1 REVOKED original + 1 ACTIVE reissue'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 8: Public Certificate Verification API (Zero-PII Boundary) (Scenarios 25-28)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 8: Public Certificate Verification API (Zero-PII Boundary) ---');

    // 25. Public verification of ACTIVE reissued certificate (No Auth!)
    const pubVerifyRes = await fetch(`${BASE_URL}/api/awards/certificates/verify/${reissuedCert.verificationCode}`);
    const pubVerifyData = await pubVerifyRes.json();
    assert(
      pubVerifyRes.status === 200 && pubVerifyData.success === true && pubVerifyData.data.valid === true,
      'Unauthenticated public verification endpoint returns 200 for active certificate'
    );

    // 26. Zero-PII Exposure Verification
    const pubPayload = pubVerifyData.data;
    assert(
      pubPayload.recipientName.includes(recipientEmp.firstName) &&
      pubPayload.awardTitle === awardType.name &&
      pubPayload.email === undefined &&
      pubPayload.recipientEmail === undefined &&
      pubPayload.salary === undefined &&
      pubPayload.phone === undefined &&
      pubPayload.storagePath === undefined,
      'Public verification payload enforces zero-PII standard (no email, phone, salary, or storage paths)'
    );

    // 27. Public verification of REVOKED original certificate
    const pubRevokedVerifyRes = await fetch(`${BASE_URL}/api/awards/certificates/verify/${generatedCert.verificationCode}`);
    const pubRevokedData = await pubRevokedVerifyRes.json();
    assert(
      pubRevokedData.data.status === 'REVOKED' &&
      pubRevokedData.data.valid === false &&
      pubRevokedData.data.revocationReason.includes('Administrative recalculation'),
      'Public verification correctly identifies revoked certificate and displays non-sensitive revocation note'
    );

    // 28. Nonexistent verification code returns 404
    const bogusVerifyRes = await fetch(`${BASE_URL}/api/awards/certificates/verify/BOGUS-VERIFY-CODE-99999`);
    const bogusData = await bogusVerifyRes.json();
    assert(
      bogusVerifyRes.status === 404 && bogusData.valid === false,
      'Invalid verification code returns 404 with failure confirmation'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 9: Secure Distribution & Authenticated Streaming (Scenarios 29-31)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 9: Secure Distribution & Authenticated Streaming ---');

    // 29. HR Manager can stream and download PDF
    const hrDownloadRes = await fetch(`${BASE_URL}/api/awards/certificates/${reissuedCert.id}/download`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      hrDownloadRes.status === 200 &&
      hrDownloadRes.headers.get('content-type') === 'application/pdf',
      'HR Manager can stream active certificate PDF with application/pdf header'
    );
    const hrBlob = await hrDownloadRes.arrayBuffer();
    assert(hrBlob.byteLength > 2000, `Streamed PDF size is complete (${hrBlob.byteLength} bytes)`);

    // 30. Recipient Employee can download their own certificate via ESS
    const essDownloadRes = await fetch(`${BASE_URL}/api/v1/me/awards/${createdAward.id}/certificate/download`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    if (essDownloadRes.status !== 200) {
      console.error('Test 32 failed with status:', essDownloadRes.status, await essDownloadRes.text());
    }
    assert(
      essDownloadRes.status === 200 &&
      essDownloadRes.headers.get('content-type') === 'application/pdf',
      'Recipient employee can stream their certificate via /api/v1/me/awards/:id/certificate/download'
    );

    // 31. Unauthorized Colleague cannot download another employee's certificate
    const unauthorizedDownloadRes = await fetch(`${BASE_URL}/api/awards/certificates/${reissuedCert.id}/download`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    const unauthBody = await unauthorizedDownloadRes.text();
    console.log('Test 31 status:', unauthorizedDownloadRes.status, unauthBody.slice(0, 100));
    assert(
      unauthorizedDownloadRes.status === 403,
      'Unauthorized colleague attempting to download certificate is rejected with 403 Forbidden'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 10: Multi-Channel Notification & Transactional Outbox (Scenarios 32-33)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- MODULE 10: Multi-Channel Notification & Transactional Outbox ---');

    // 32. In-App Notification check for recipient employee
    const notifications = await prisma.notification.findMany({
      where: {
        tenantId,
        userId: recipientUser.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const awardNotif = notifications.find(n => n.module === 'award_certificate' || n.title.includes('Award Certificate'));
    assert(
      Boolean(awardNotif),
      'In-App notification generated for the recipient employee upon certificate generation'
    );

    // 33. Transactional Outbox Event verification
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        tenantId,
        entityType: 'EmployeeAwardCertificate',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    assert(
      outboxEvents.length >= 1 &&
      ['award.certificate.generated', 'award.certificate.reissued', 'award.certificate.revoked'].includes(outboxEvents[0].eventType),
      `Transactional outbox recorded certificate event (${outboxEvents[0]?.eventType})`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // FINAL CERTIFICATION SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n================================================================================');
    console.log(` ALL ${totalTests} SCENARIOS COMPLETED: ${passedTests}/${totalTests} PASSED (100% SUCCESS)`);
    console.log(' AWARDS STEP 4 CERTIFICATE GENERATION & DISTRIBUTION OFFICIALLY CERTIFIED');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', error.message);
    process.exit(1);
  } finally {
    // Cleanup generated test files and DB records cleanly to leave DB pristine
    try {
      if (hrSessionId) await prisma.deviceSession.deleteMany({ where: { id: hrSessionId } });
      if (empSessionId) await prisma.deviceSession.deleteMany({ where: { id: empSessionId } });
      if (otherSessionId) await prisma.deviceSession.deleteMany({ where: { id: otherSessionId } });

      if (createdAward) {
        const certs = await prisma.employeeAwardCertificate.findMany({ where: { awardId: createdAward.id } });
        for (const cert of certs) {
          const uploadsRoot = path.resolve(__dirname, '../server/uploads');
          let p = path.resolve(uploadsRoot, cert.storagePath);
          if (!fs.existsSync(p)) {
            p = path.resolve(__dirname, '../uploads', cert.storagePath);
          }
          if (fs.existsSync(p)) {
            try { fs.unlinkSync(p); } catch {}
          }
        }
        await prisma.employeeAwardCertificate.deleteMany({ where: { awardId: createdAward.id } });
        await prisma.award.delete({ where: { id: createdAward.id } });
      }
    } catch (cleanErr) {
      console.warn('Cleanup note:', cleanErr.message);
    }
    await prisma.$disconnect();
  }
}

runStep4CertificateSuite();
