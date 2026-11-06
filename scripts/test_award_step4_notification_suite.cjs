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
  const sessId = 'sess-notif-' + Math.random().toString(36).substring(2, 9);
  await prisma.deviceSession.create({
    data: {
      id: sessId,
      userId,
      tenantId,
      revoked: false,
      ipAddress: '127.0.0.1',
      userAgent: 'Notification & Issuance Suite',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  return sessId;
}

async function runNotificationSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: STEP 4 CERTIFICATE ISSUANCE & NOTIFICATION DELIVERY SUITE');
  console.log('================================================================\n');

  const tenant = await prisma.tenant.findFirst();
  const tenantId = tenant ? tenant.id : 'tenant-default-001';

  let hrUser = await prisma.user.findFirst({
    where: { employees: { some: { tenantId } } }
  }) || await prisma.user.findFirst();

  const hrSessionId = await createTestSession(hrUser.id, tenantId);
  const hrToken = makeToken({ ...hrUser, tenantId }, hrSessionId);
  const hrHeaders = {
    Authorization: `Bearer ${hrToken}`,
    'Content-Type': 'application/json'
  };

  // Create recipient user & employee
  const recipientEmail = `recipient.${Date.now()}@hrms.test`;
  const recipientUser = await prisma.user.create({
    data: {
      id: `user-recip-${Date.now()}`,
      email: recipientEmail,
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecSoLAvWuv.2.S042',
      profile: {
        create: {
          tenantId,
          fullName: 'Eleanor Vance',
          email: recipientEmail
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

  const recipientEmp = await prisma.employee.create({
    data: {
      id: `emp-recip-${Date.now()}`,
      tenantId,
      userId: recipientUser.id,
      employeeCode: `EMP-REC-${Date.now().toString().slice(-4)}`,
      firstName: 'Eleanor',
      lastName: 'Vance',
      email: recipientEmail,
      status: 'active'
    }
  });

  // Find or create an AwardType
  let awardType = await prisma.awardType.findFirst({ where: { tenantId } });
  if (!awardType) {
    awardType = await prisma.awardType.create({
      data: {
        tenantId,
        name: `Distinction Award ${Date.now()}`,
        status: 'active'
      }
    });
  }

  // Find a system certificate template
  const systemTemplate = await prisma.certificateTemplate.findFirst({
    where: { isSystem: true, category: 'Employee Excellence' }
  }) || await prisma.certificateTemplate.findFirst();

  assert(!!systemTemplate, 'System template found for assignment');

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: ASSIGN TEMPLATE TO AWARD TYPE
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: Award Type Template Assignment ---');
    const assignRes = await fetch(`${BASE_URL}/certificate-studio/assignments`, {
      method: 'POST',
      headers: hrHeaders,
      body: JSON.stringify({
        awardTypeId: awardType.id,
        templateId: systemTemplate.id,
        signatoryConfiguration: {
          hrSignatoryId: 'sig-hr-default',
          directorSignatoryId: 'sig-dir-default'
        }
      })
    });

    if (assignRes.status !== 200) {
      console.error(`Assignment failed with ${assignRes.status}:`, await assignRes.text());
    }
    assert(assignRes.status === 200, 'POST /certificate-studio/assignments/:awardTypeId returns 200 OK');
    const assignJson = await assignRes.json();
    assert(assignJson.assignment && assignJson.assignment.templateId === systemTemplate.id, 'AwardType is successfully bound to Certificate Studio template');

    // ------------------------------------------------------------------------
    // SECTION 2: CREATE AWARD RECORD
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Issue Award to Recipient ---');
    const award = await prisma.award.create({
      data: {
        id: `award-step4-${Date.now()}`,
        tenantId,
        employeeId: recipientEmp.id,
        awardTypeId: awardType.id,
        awardDate: new Date(),
        giftItem: 'Crystal Trophy & Honors Certificate',
        description: 'For exceptional performance and innovative contributions to the cloud infrastructure project.',
        presentedBy: 'Executive Committee',
        status: 'awarded'
      }
    });

    assert(!!award.id, 'Award successfully created in database');

    // ------------------------------------------------------------------------
    // SECTION 3: AUTOMATED CERTIFICATE GENERATION VIA ASSIGNED STUDIO TEMPLATE
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Automated Certificate Generation ---');
    const genRes = await fetch(`${BASE_URL}/awards/${award.id}/certificate/generate`, {
      method: 'POST',
      headers: hrHeaders
    });

    assert(genRes.status === 201, 'POST /awards/:id/certificate/generate returns 201 Created');
    const genData = await genRes.json();
    assert(genData.success === true, 'Generation reports success: true');
    assert(genData.data && genData.data.certificateNumber, 'Generated certificate contains valid certificateNumber');

    const certId = genData.data.id;
    const certNumber = genData.data.certificateNumber;
    const certCode = genData.data.verificationCode;

    // Verify database row for EmployeeAwardCertificate
    const certRecord = await prisma.employeeAwardCertificate.findUnique({
      where: { id: certId }
    });

    assert(!!certRecord, 'Certificate record persisted in database');
    assert(certRecord.templateId === systemTemplate.id, 'Certificate references assigned studio templateId');
    assert(!!certRecord.snapshotData, 'Certificate has snapshotData persisted');
    assert(certRecord.snapshotData.templateName === systemTemplate.name, 'Snapshot captures templateName accurately');
    assert(certRecord.status === 'ACTIVE', 'Certificate status is ACTIVE');

    // Verify physical file on disk
    let certFilePath = path.resolve(__dirname, '../uploads', certRecord.storagePath);
    if (!fs.existsSync(certFilePath)) {
      certFilePath = path.resolve(__dirname, '../server/uploads', certRecord.storagePath);
    }
    assert(fs.existsSync(certFilePath), `Vector PDF file exists on disk: ${certRecord.storagePath}`);
    const certFileBuffer = fs.readFileSync(certFilePath);
    assert(certFileBuffer.length > 1000, `Generated certificate is substantial binary PDF (${certFileBuffer.length} bytes)`);
    assert(certFileBuffer.toString('utf-8', 0, 5) === '%PDF-', 'Certificate starts with %PDF- header magic bytes');

    // ------------------------------------------------------------------------
    // SECTION 4: IN-APP RECIPIENT NOTIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Recipient In-App Notification Delivery ---');
    const notification = await prisma.notification.findFirst({
      where: {
        tenantId,
        userId: recipientUser.id,
        module: 'award_certificate'
      },
      orderBy: { createdAt: 'desc' }
    });

    assert(!!notification, 'In-app notification created for recipient employee user');
    assert(notification.title === 'Award Certificate Available', 'Notification title is "Award Certificate Available"');
    assert(notification.linkTo === '/me/awards', 'Notification links to employee self-service /me/awards');
    assert(notification.metadataJson && notification.metadataJson.certificateId === certId, 'Notification metadata links certificateId');

    // ------------------------------------------------------------------------
    // SECTION 5: TRANSACTIONAL OUTBOX EVENT DELIVERY
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Resilient Transactional Outbox Event ---');
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        tenantId,
        entityType: 'EmployeeAwardCertificate',
        entityId: certId,
        eventType: 'award.certificate.generated'
      },
      orderBy: { createdAt: 'desc' }
    });

    assert(!!outboxEvent, 'Outbox event created with eventType "award.certificate.generated"');
    assert(outboxEvent.status === 'PENDING' || outboxEvent.status === 'PROCESSED', 'Outbox event has valid lifecycle status');

    // ------------------------------------------------------------------------
    // SECTION 6: IDEMPOTENCY VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Certificate Generation Idempotency ---');
    const secondGenRes = await fetch(`${BASE_URL}/awards/${award.id}/certificate/generate`, {
      method: 'POST',
      headers: hrHeaders
    });

    assert(secondGenRes.status === 200, 'Second call returns 200 OK (idempotent reuse)');
    const secondGenData = await secondGenRes.json();
    assert(secondGenData.reused === true, 'Response reports reused: true');
    assert(secondGenData.data.id === certId, 'Returns existing certificate ID without creating duplicates');

    // ------------------------------------------------------------------------
    // SECTION 7: CERTIFICATE RE-ISSUANCE & REVOCATION LIFECYCLE
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Certificate Reissuance & Supersession ---');
    const reissueRes = await fetch(`${BASE_URL}/awards/${award.id}/certificate/reissue`, {
      method: 'POST',
      headers: hrHeaders,
      body: JSON.stringify({
        reason: 'Correction of recipient spelling and updated executive title'
      })
    });

    assert(reissueRes.status === 201, 'POST /awards/:id/certificate/reissue returns 201 Created');
    const reissueData = await reissueRes.json();
    assert(reissueData.success === true, 'Reissue reports success');
    const newCertId = reissueData.data.id;
    assert(newCertId !== certId, 'New certificate ID generated on reissue');

    // Verify old certificate is marked REVOKED
    const oldCert = await prisma.employeeAwardCertificate.findUnique({
      where: { id: certId }
    });
    assert(oldCert.status === 'REVOKED', 'Previous certificate status transitioned to REVOKED');
    assert(oldCert.revocationReason.includes('Correction of recipient spelling') || oldCert.revocationReason.includes('Superseded'), 'Revocation reason recorded');

    // Verify outbox event for reissue
    const reissueOutbox = await prisma.outboxEvent.findFirst({
      where: {
        tenantId,
        entityType: 'EmployeeAwardCertificate',
        entityId: newCertId,
        eventType: 'award.certificate.reissued'
      }
    });
    assert(!!reissueOutbox, 'Outbox event created with eventType "award.certificate.reissued"');

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('CERTIFICATE ISSUANCE & NOTIFICATION SUITE: 100% SUCCESS');
    console.log('================================================================');

  } finally {
    // Cleanup sessions
    await prisma.deviceSession.deleteMany({
      where: { id: { in: [hrSessionId] } }
    }).catch(() => {});
    await prisma.$disconnect();
  }
}

runNotificationSuite().catch(err => {
  console.error('\n❌ Suite execution failed:', err);
  process.exit(1);
});
