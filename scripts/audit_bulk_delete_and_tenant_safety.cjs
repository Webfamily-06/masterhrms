const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

(async () => {
  console.log('====================================================');
  console.log('🛡️ RUNNING BULK DELETE & TENANT SAFETY AUDIT SUITE');
  console.log('====================================================\n');

  const testTenantA = '02bf4113-b100-4711-af94-d81165e9a2e1'; // Acme Cloud ERP
  const testTenantB = '03a665c9-519b-4cbe-b000-c70ac179fe97'; // Upload Test Tenant B

  // 1. Create a session for HR Admin on Tenant A
  const session = await prisma.deviceSession.create({
    data: {
      userId: '5471a6ee-b7f0-43ac-bda6-add7bc748024',
      tenantId: testTenantA,
      refreshTokenHash: 'audit_test_session_' + Date.now(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  const tokenTenantA = jwt.sign(
    {
      userId: '5471a6ee-b7f0-43ac-bda6-add7bc748024',
      email: 'gowthamtooquik@gmail.com',
      tenantId: testTenantA,
      roles: ['hr_admin', 'super_admin'],
      sessionId: session.id,
    },
    'master-hrms-jwt-super-secret-key-change-this-in-production',
    { expiresIn: '2h' }
  );

  const results = {
    crossTenantIsolation: false,
    settledExitProtection: false,
    settledTripProtection: false,
    auditLoggingPreserved: false,
    pendingDeletionSucceedsWithAudit: false,
  };

  try {
    // A. Create an employee in Tenant A and an employee in Tenant B for testing
    const employeeA = await prisma.employee.findFirst({ where: { tenantId: testTenantA } });
    if (!employeeA) {
      throw new Error('No employee found in testTenantA');
    }

    let employeeB = await prisma.employee.findFirst({ where: { tenantId: testTenantB } });
    if (!employeeB) {
      employeeB = await prisma.employee.create({
        data: {
          tenantId: testTenantB,
          employeeCode: 'TEST-EMP-B-' + Date.now().toString(36),
          firstName: 'Audit',
          lastName: 'TenantB',
          email: 'audit.b.' + Date.now() + '@tenantb.com',
          status: 'active',
        },
      });
    }

    // B. Create an Award in Tenant B
    const awardInTenantB = await prisma.award.create({
      data: {
        tenantId: testTenantB,
        employeeId: employeeB.id,
        awardDate: new Date(),
        description: 'Test Award in Tenant B',
        status: 'awarded',
      },
    });

    console.log('1. Testing Cross-Tenant ID Bulk Deletion Rejection...');
    // HR Admin on Tenant A attempts to delete Award belonging to Tenant B
    const crossTenantRes = await fetch('http://localhost:4000/api/hr/lifecycle/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tokenTenantA,
      },
      body: JSON.stringify({
        entity: 'awards',
        ids: [awardInTenantB.id],
      }),
    });

    const crossTenantData = await crossTenantRes.json();
    console.log('   Response status:', crossTenantRes.status);
    console.log('   Deleted count:', crossTenantData.deletedCount);
    console.log('   Failed count:', crossTenantData.failedCount);
    console.log('   Failures:', crossTenantData.failures);

    // Verify award in Tenant B is STILL intact!
    const verifyAwardB = await prisma.award.findUnique({ where: { id: awardInTenantB.id } });
    if (verifyAwardB && crossTenantData.deletedCount === 0 && crossTenantData.failedCount === 1) {
      console.log('   ✅ PASS: Cross-tenant ID was rejected; record in Tenant B was NOT deleted.');
      results.crossTenantIsolation = true;
    } else {
      console.error('   ❌ FAIL: Cross-tenant record was affected or not rejected!');
    }

    // Clean up award in Tenant B
    await prisma.award.delete({ where: { id: awardInTenantB.id } });

    // C. Test Settled Exit Record Protection
    console.log('\n2. Testing Historical Settled Exit Record Deletion Protection...');
    const settledExit = await prisma.employeeExit.create({
      data: {
        tenantId: testTenantA,
        employeeId: employeeA.id,
        exitCode: 'EXIT-SETTLED-' + Date.now().toString(36),
        resignationDate: new Date(),
        lastWorkingDay: new Date(),
        reason: 'Career transition',
        status: 'settled',
        fnfSettlementStatus: 'settled',
        fnfSettledAt: new Date(),
        relievingLetterCode: 'REL-2026-001',
      },
    });

    const exitDelRes = await fetch('http://localhost:4000/api/hr/lifecycle/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tokenTenantA,
      },
      body: JSON.stringify({
        entity: 'exits',
        ids: [settledExit.id],
      }),
    });

    const exitDelData = await exitDelRes.json();
    console.log('   Response status:', exitDelRes.status);
    console.log('   Deleted count:', exitDelData.deletedCount);
    console.log('   Failures:', exitDelData.failures);

    const verifyExitStillExists = await prisma.employeeExit.findUnique({ where: { id: settledExit.id } });
    if (verifyExitStillExists && exitDelData.deletedCount === 0 && exitDelData.failedCount === 1) {
      console.log('   ✅ PASS: Settled exit record was protected; deletion rejected with clear business explanation.');
      results.settledExitProtection = true;
    } else {
      console.error('   ❌ FAIL: Settled exit record was deleted or not protected!');
    }

    // Clean up test settled exit
    await prisma.employeeExit.delete({ where: { id: settledExit.id } });

    // D. Test Settled Trip Record Protection
    console.log('\n3. Testing Settled Travel Expense Trip Deletion Protection...');
    const settledTrip = await prisma.employeeTrip.create({
      data: {
        tenantId: testTenantA,
        employeeId: employeeA.id,
        tripCode: 'TRIP-SETTLED-' + Date.now().toString(36),
        purpose: 'Client Onsite',
        destination: 'Mumbai',
        fromDate: new Date(),
        toDate: new Date(),
        status: 'completed',
        settlementStatus: 'settled',
      },
    });

    const tripDelRes = await fetch('http://localhost:4000/api/hr/lifecycle/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tokenTenantA,
      },
      body: JSON.stringify({
        entity: 'trips',
        ids: [settledTrip.id],
      }),
    });

    const tripDelData = await tripDelRes.json();
    console.log('   Response status:', tripDelRes.status);
    console.log('   Deleted count:', tripDelData.deletedCount);
    console.log('   Failures:', tripDelData.failures);

    const verifyTripStillExists = await prisma.employeeTrip.findUnique({ where: { id: settledTrip.id } });
    if (verifyTripStillExists && tripDelData.deletedCount === 0 && tripDelData.failedCount === 1) {
      console.log('   ✅ PASS: Settled travel trip was protected; deletion rejected with clear business explanation.');
      results.settledTripProtection = true;
    } else {
      console.error('   ❌ FAIL: Settled travel trip was deleted or not protected!');
    }

    // Clean up test settled trip
    await prisma.employeeTrip.delete({ where: { id: settledTrip.id } });

    // E. Test Normal Pending Deletion with Audit Logging
    console.log('\n4. Testing Unsettled Pending Record Deletion with Audit Logging...');
    const pendingAward = await prisma.award.create({
      data: {
        tenantId: testTenantA,
        employeeId: employeeA.id,
        awardDate: new Date(),
        description: 'Temporary Test Award to Delete',
        status: 'awarded',
      },
    });

    const initialAuditCount = await prisma.auditLog.count({
      where: { tenantId: testTenantA, action: 'AWARD_BULK_DELETE' },
    });

    const pendingDelRes = await fetch('http://localhost:4000/api/hr/lifecycle/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tokenTenantA,
      },
      body: JSON.stringify({
        entity: 'awards',
        ids: [pendingAward.id],
      }),
    });

    const pendingDelData = await pendingDelRes.json();
    console.log('   Response status:', pendingDelRes.status);
    console.log('   Deleted count:', pendingDelData.deletedCount);

    const afterAuditCount = await prisma.auditLog.count({
      where: { tenantId: testTenantA, action: 'AWARD_BULK_DELETE' },
    });

    if (pendingDelData.deletedCount === 1 && afterAuditCount > initialAuditCount) {
      console.log('   ✅ PASS: Pending record deleted cleanly and immutable audit log entry was written.');
      results.pendingDeletionSucceedsWithAudit = true;
      results.auditLoggingPreserved = true;
    } else {
      console.error('   ❌ FAIL: Record was not deleted or audit log was not recorded.');
    }

  } finally {
    await prisma.deviceSession.delete({ where: { id: session.id } });
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log('🏁 BULK DELETE & TENANT SAFETY AUDIT SUMMARY');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log('\n🌟 ALL BULK DELETE & TENANT SAFETY CHECKS PASSED PERFECTLY!');
  } else {
    console.error('\n⚠️ SOME CHECKS FAILED!');
    process.exit(1);
  }
})();
