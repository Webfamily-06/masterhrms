const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user, permissions = ['*']) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: permissions,
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log(' VERIFICATION SUITE: MANDATORY ROUTE ARCHITECTURE CORRECTION — AWARDS');
  console.log('========================================================================\n');

  const PORT = 4000;

  // Let's find or create two employees in tenant-default-001
  const tenantIdA = 'tenant-default-001';
  const tenantIdB = 'test-tenant-a-1791971885429';

  const emps = await prisma.$queryRawUnsafe(`
    SELECT id, user_id as "userId", first_name as "firstName", last_name as "lastName", employee_code as "employeeCode", tenant_id as "tenantId"
    FROM employees
    WHERE tenant_id = $1
    LIMIT 3
  `, tenantIdA);

  console.log(`Found ${emps.length} employees in ${tenantIdA}:`);
  emps.forEach(e => console.log(` - Employee: ${e.firstName} ${e.lastName} (ID: ${e.id}, UserID: ${e.userId})`));

  let empA = emps[0];
  let empB = emps[1];

  if (!empB) {
    empB = await prisma.employee.create({
      data: {
        id: 'emp-test-b-' + Date.now(),
        tenantId: tenantIdA,
        userId: 'user-test-b-' + Date.now(),
        firstName: 'Jane',
        lastName: 'EmployeeB',
        employeeCode: 'EMP-B-' + Date.now().toString().slice(-4),
        status: 'ACTIVE',
        hireDate: new Date(),
      }
    });
  }

  // Ensure empA and empB have distinct userIds
  const hrUser = {
    id: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId: tenantIdA,
    roles: ['hr_admin'],
  };
  const hrToken = makeToken(hrUser, ['*']);

  const empUserA = {
    id: empA.userId || 'user-emp-a',
    email: 'empa@masterhrms.com',
    tenantId: tenantIdA,
    roles: ['employee'],
  };
  const empTokenA = makeToken(empUserA, ['hrm.employee.self']);

  const empUserB = {
    id: empB.userId || 'user-emp-b',
    email: 'empb@masterhrms.com',
    tenantId: tenantIdA,
    roles: ['employee'],
  };
  const empTokenB = makeToken(empUserB, ['hrm.employee.self']);

  // Employee without HR role trying to hit HR API
  const unauthorizedUser = {
    id: 'user-standard-no-hr',
    email: 'unauth@masterhrms.com',
    tenantId: tenantIdA,
    roles: ['employee', 'viewer'],
  };
  const unauthorizedToken = makeToken(unauthorizedUser, ['view.own.profile']);

  // Tenant B user
  const tenantBUser = {
    id: 'user-tenant-b-001',
    email: 'hr@tenantb.com',
    tenantId: tenantIdB,
    roles: ['hr_admin'],
  };
  const tenantBToken = makeToken(tenantBUser, ['*']);

  // Find an active award type
  const activeAwardType = await prisma.awardType.findFirst({
    where: { tenantId: tenantIdA, status: 'active' },
  });
  const awardTypeId = activeAwardType ? activeAwardType.id : null;

  // Make sure an award exists for empA
  const testAwardA = await prisma.award.create({
    data: {
      tenantId: tenantIdA,
      employeeId: empA.id,
      awardTypeId: awardTypeId,
      awardDate: new Date(),
      description: 'Outstanding contribution to team delivery',
      status: 'active',
      certificateNo: 'AWD-TEST-A-' + Date.now().toString().slice(-4),
    }
  });

  // Make sure an award exists for empB
  const testAwardB = await prisma.award.create({
    data: {
      tenantId: tenantIdA,
      employeeId: empB.id,
      awardTypeId: awardTypeId,
      awardDate: new Date(),
      description: 'Patented revolutionary microservices architecture',
      status: 'active',
      certificateNo: 'AWD-TEST-B-' + Date.now().toString().slice(-4),
    }
  });

  console.log(`\nCreated test awards:`);
  console.log(` - Award A for EmpA (${empA.firstName}): ${testAwardA.id} (Cert: ${testAwardA.certificateNo})`);
  console.log(` - Award B for EmpB (${empB.firstName}): ${testAwardB.id} (Cert: ${testAwardB.certificateNo})\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: HR can view awards belonging to employees in their tenant
    // -------------------------------------------------------------
    console.log('TEST 1: HR can view awards belonging to all employees in their tenant (/api/hr/awards)');
    const res1 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/hr/awards',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${hrToken}` },
    });
    console.log(`  HTTP status: ${res1.status}`);
    const hrAwards = Array.isArray(res1.body?.data) ? res1.body.data : (Array.isArray(res1.body) ? res1.body : []);
    console.log(`  Retrieved ${hrAwards.length} tenant-wide awards.`);
    const hasA = hrAwards.some(a => a.id === testAwardA.id);
    const hasB = hrAwards.some(a => a.id === testAwardB.id);
    if (res1.status !== 200 || !hasA || !hasB) {
      throw new Error(`TEST 1 FAILED: HR did not receive tenant awards. Status: ${res1.status}, hasA: ${hasA}, hasB: ${hasB}`);
    }
    console.log('  ✔ PASS: HR view successfully retrieves all tenant employee awards.\n');

    // -------------------------------------------------------------
    // TEST 2: Employee A can see only Employee A\'s awards via /api/me/awards
    // -------------------------------------------------------------
    console.log('TEST 2: Employee A can see only Employee A\'s awards via /api/me/awards (ESS)');
    const res2 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/me/awards',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empTokenA}` },
    });
    console.log(`  HTTP status: ${res2.status}`);
    const empAAwards = Array.isArray(res2.body?.data) ? res2.body.data : (Array.isArray(res2.body) ? res2.body : []);
    console.log(`  Employee A retrieved ${empAAwards.length} awards.`);
    const empAHasOwn = empAAwards.some(a => a.id === testAwardA.id);
    const empAHasOther = empAAwards.some(a => a.id === testAwardB.id);
    console.log(`  Contains EmpA award: ${empAHasOwn}`);
    console.log(`  Contains EmpB award (leak check): ${empAHasOther}`);
    if (res2.status !== 200 || !empAHasOwn || empAHasOther) {
      throw new Error(`TEST 2 FAILED: Employee A either did not see own award or saw Employee B award!`);
    }
    console.log('  ✔ PASS: Employee A strictly sees only their own awards.\n');

    // -------------------------------------------------------------
    // TEST 3: Employee A cannot access Employee B\'s awards by modifying a URL or query param
    // -------------------------------------------------------------
    console.log('TEST 3: Parameter tampering check: Employee A passes ?employeeId=<EmpB.id> to /api/me/awards');
    const res3 = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/me/awards?employeeId=${empB.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empTokenA}` },
    });
    console.log(`  HTTP status: ${res3.status}`);
    const tamperedAwards = Array.isArray(res3.body?.data) ? res3.body.data : (Array.isArray(res3.body) ? res3.body : []);
    const tamperedHasOther = tamperedAwards.some(a => a.id === testAwardB.id);
    console.log(`  Contains EmpB award despite query injection: ${tamperedHasOther}`);
    if (tamperedHasOther) {
      throw new Error(`TEST 3 FAILED: Server honored forged employeeId query parameter for ESS endpoint!`);
    }
    console.log('  ✔ PASS: Server strictly ignored query param tampering and derived identity from session.\n');

    // -------------------------------------------------------------
    // TEST 4: Cross-tenant access is rejected
    // -------------------------------------------------------------
    console.log('TEST 4: Cross-tenant access is rejected');
    // Tenant B HR trying to view Tenant A awards
    const res4a = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/hr/awards',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tenantBToken}` },
    });
    console.log(`  Tenant B HR GET /api/hr/awards -> HTTP status: ${res4a.status}`);
    const tenantBAwards = Array.isArray(res4a.body?.data) ? res4a.body.data : (Array.isArray(res4a.body) ? res4a.body : []);
    const tenantBHasA = tenantBAwards.some(a => a.id === testAwardA.id || a.id === testAwardB.id);
    console.log(`  Tenant B awards leak from Tenant A: ${tenantBHasA}`);
    if (tenantBHasA) {
      throw new Error('TEST 4 FAILED: Tenant B can see Tenant A awards!');
    }

    // Tenant B trying to delete Tenant A award
    const res4b = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/awards/${testAwardA.id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tenantBToken}` },
    });
    console.log(`  Tenant B DELETE /api/awards/${testAwardA.id} -> HTTP status: ${res4b.status}`);
    if (res4b.status !== 404 && res4b.status !== 403) {
      throw new Error(`TEST 4 FAILED: Cross-tenant delete returned ${res4b.status} instead of 404/403`);
    }
    console.log('  ✔ PASS: Cross-tenant isolation strictly verified.\n');

    // -------------------------------------------------------------
    // TEST 5: Employee cannot issue, update, or revoke an award
    // -------------------------------------------------------------
    console.log('TEST 5: Standard Employee is forbidden from issuing, updating, or revoking awards');
    // Try Issue
    const res5Issue = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/awards',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${empTokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        employeeId: empA.id,
        title: 'Hacked Award',
        awardType: 'Performance',
        awardDate: '2026-03-30',
      }
    );
    console.log(`  Employee POST /api/awards -> HTTP status: ${res5Issue.status} (Code: ${res5Issue.body?.code})`);
    if (res5Issue.status !== 403) {
      throw new Error(`TEST 5 FAILED: Employee was able to POST /api/awards! Status: ${res5Issue.status}`);
    }

    // Try Update
    const res5Update = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/awards/${testAwardA.id}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${empTokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'Tampered Title',
      }
    );
    console.log(`  Employee PUT /api/awards/${testAwardA.id} -> HTTP status: ${res5Update.status} (Code: ${res5Update.body?.code})`);
    if (res5Update.status !== 403) {
      throw new Error(`TEST 5 FAILED: Employee was able to PUT /api/awards! Status: ${res5Update.status}`);
    }

    // Try Revoke / Delete
    const res5Delete = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/awards/${testAwardA.id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${empTokenA}` },
    });
    console.log(`  Employee DELETE /api/awards/${testAwardA.id} -> HTTP status: ${res5Delete.status} (Code: ${res5Delete.body?.code})`);
    if (res5Delete.status !== 403) {
      throw new Error(`TEST 5 FAILED: Employee was able to DELETE /api/awards! Status: ${res5Delete.status}`);
    }
    console.log('  ✔ PASS: Employees are strictly forbidden (403 HR_ROLE_REQUIRED) from mutating awards.\n');

    // -------------------------------------------------------------
    // TEST 6: Role without the required permission is denied access to tenant-wide awards
    // -------------------------------------------------------------
    console.log('TEST 6: Role without HR permission is denied access to tenant-wide awards');
    const res6 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/awards',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empTokenA}` },
    });
    console.log(`  Non-HR employee GET /api/awards -> HTTP status: ${res6.status} (Code: ${res6.body?.code})`);
    if (res6.status !== 403 || res6.body?.code !== 'HR_ROLE_REQUIRED') {
      throw new Error(`TEST 6 FAILED: Non-HR role was not blocked with 403 HR_ROLE_REQUIRED from /api/awards! Status: ${res6.status}, Code: ${res6.body?.code}`);
    }
    console.log('  ✔ PASS: Tenant-wide awards route strictly requires HR authorization (403 HR_ROLE_REQUIRED).\n');

    // -------------------------------------------------------------
    // TEST 7: Employee 360 profile award history in /hr/employees/:employeeId continues to work
    // -------------------------------------------------------------
    console.log('TEST 7: Employee 360 Profile award history (/api/hr/employees/:id)');
    const res7 = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/hr/employees/${empA.id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${hrToken}` },
    });
    console.log(`  HR GET /api/hr/employees/${empA.id} -> HTTP status: ${res7.status}`);
    const emp360Awards = res7.body?.data?.awards || [];
    console.log(`  Retrieved ${emp360Awards.length} awards for Employee 360.`);
    const foundIn360 = emp360Awards.some(a => a.id === testAwardA.id);
    if (res7.status !== 200 || !foundIn360) {
      throw new Error(`TEST 7 FAILED: Employee 360 could not load employee award history.`);
    }
    console.log('  ✔ PASS: Employee 360 award history verified.\n');

    // -------------------------------------------------------------
    // TEST 8: Cross-Check /api/awards/my for Authenticated ESS
    // -------------------------------------------------------------
    console.log('TEST 8: Check /api/awards/my endpoint for ESS compatibility');
    const res8 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/awards/my',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empTokenA}` },
    });
    console.log(`  GET /api/awards/my -> HTTP status: ${res8.status}`);
    const myAwards = Array.isArray(res8.body?.data) ? res8.body.data : (Array.isArray(res8.body) ? res8.body : []);
    const myHasA = myAwards.some(a => a.id === testAwardA.id);
    const myHasB = myAwards.some(a => a.id === testAwardB.id);
    if (res8.status !== 200 || !myHasA || myHasB) {
      throw new Error('TEST 8 FAILED: /api/awards/my did not isolate Employee A!');
    }
    console.log('  ✔ PASS: /api/awards/my matches ESS expectations seamlessly.\n');

    console.log('========================================================================');
    console.log(' ALL 8 ROUTE ARCHITECTURE & AUTHORIZATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    // Cleanup test records
    await prisma.award.deleteMany({
      where: {
        id: { in: [testAwardA.id, testAwardB.id] },
      },
    });
    console.log('Cleaned up test awards from database.');
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
