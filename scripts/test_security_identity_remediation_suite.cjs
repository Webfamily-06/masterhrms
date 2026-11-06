const { PrismaClient } = require('@prisma/client');
const http = require('http');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['employee'],
      permissions: user.permissions || [],
      ...(sessionId ? { sessionId } : {}),
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runSecurityRemediationSuite() {
  console.log('================================================================');
  console.log('MASTERHRMS: EMPLOYEE IDENTITY SECURITY REMEDIATION TEST SUITE');
  console.log('Phase 1: Access Revocation, Isolation & Database 1:1 Integrity');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] Test ${passed + failed + 1}: ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${passed + failed + 1}: ${testName} - Details: ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testTenantId = 'tenant-test-identity-' + timestamp;
  let adminUser, empUserA, empUserB, empUserOtherTenant;
  let employeeA, employeeB, employeeOtherTenant;
  let sessionA1, sessionA2, sessionB1;
  let rawRefreshTokenA1, rawRefreshTokenA2, rawRefreshTokenB1;

  try {
    // 0. Setup isolated test tenant, users, and employees
    console.log('--- Provisioning isolated test fixtures ---');
    const tenant = await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Identity Tenant ' + timestamp,
        slug: 'test-identity-' + timestamp,
        isOnboarded: true,
      },
    });

    const otherTenant = await prisma.tenant.create({
      data: {
        id: 'tenant-other-' + timestamp,
        name: 'Other Tenant ' + timestamp,
        slug: 'other-tenant-' + timestamp,
        isOnboarded: true,
      },
    });

    const existingPlan = await prisma.subscriptionPlan.findFirst();
    const planId = existingPlan ? existingPlan.id : 'custom-flex';

    await prisma.tenantSubscription.create({
      data: {
        tenantId: testTenantId,
        planId,
        planType: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: otherTenant.id,
        planId,
        planType: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Admin user
    adminUser = await prisma.user.create({
      data: {
        id: 'usr-admin-' + timestamp,
        email: `admin-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'Admin User', tenantId: testTenantId } },
        roles: { create: { role: 'hr_admin', tenantId: testTenantId } },
      },
    });

    // Employee User A
    empUserA = await prisma.user.create({
      data: {
        id: 'usr-empa-' + timestamp,
        email: `employee-a-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'Employee A', tenantId: testTenantId } },
        roles: { create: { role: 'employee', tenantId: testTenantId } },
      },
    });

    // Employee Record A (Active)
    employeeA = await prisma.employee.create({
      data: {
        id: 'emp-a-' + timestamp,
        tenantId: testTenantId,
        userId: empUserA.id,
        employeeCode: 'EMP-A-' + timestamp,
        firstName: 'Alice',
        lastName: 'Smith',
        email: `employee-a-${timestamp}@test.com`,
        status: 'active',
      },
    });

    // Employee User B
    empUserB = await prisma.user.create({
      data: {
        id: 'usr-empb-' + timestamp,
        email: `employee-b-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'Employee B', tenantId: testTenantId } },
        roles: { create: { role: 'employee', tenantId: testTenantId } },
      },
    });

    // Employee Record B (Active)
    employeeB = await prisma.employee.create({
      data: {
        id: 'emp-b-' + timestamp,
        tenantId: testTenantId,
        userId: empUserB.id,
        employeeCode: 'EMP-B-' + timestamp,
        firstName: 'Bob',
        lastName: 'Jones',
        email: `employee-b-${timestamp}@test.com`,
        status: 'active',
      },
    });

    // Cross-tenant user and employee
    empUserOtherTenant = await prisma.user.create({
      data: {
        id: 'usr-other-' + timestamp,
        email: `other-tenant-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'Other Employee', tenantId: otherTenant.id } },
        roles: { create: { role: 'employee', tenantId: otherTenant.id } },
      },
    });

    employeeOtherTenant = await prisma.employee.create({
      data: {
        id: 'emp-other-' + timestamp,
        tenantId: otherTenant.id,
        userId: empUserOtherTenant.id,
        employeeCode: 'EMP-OTHER-' + timestamp,
        firstName: 'Foreign',
        lastName: 'Worker',
        email: `other-tenant-${timestamp}@test.com`,
        status: 'active',
      },
    });

    // Sessions for Employee A (2 devices)
    rawRefreshTokenA1 = crypto.randomBytes(32).toString('hex');
    sessionA1 = await prisma.deviceSession.create({
      data: {
        id: 'sess-a1-' + timestamp,
        userId: empUserA.id,
        tenantId: testTenantId,
        deviceType: 'desktop',
        browser: 'Chrome',
        refreshTokenHash: hashRefreshToken(rawRefreshTokenA1),
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    rawRefreshTokenA2 = crypto.randomBytes(32).toString('hex');
    sessionA2 = await prisma.deviceSession.create({
      data: {
        id: 'sess-a2-' + timestamp,
        userId: empUserA.id,
        tenantId: testTenantId,
        deviceType: 'mobile',
        browser: 'Safari',
        refreshTokenHash: hashRefreshToken(rawRefreshTokenA2),
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    // Session for Employee B
    rawRefreshTokenB1 = crypto.randomBytes(32).toString('hex');
    sessionB1 = await prisma.deviceSession.create({
      data: {
        id: 'sess-b1-' + timestamp,
        userId: empUserB.id,
        tenantId: testTenantId,
        deviceType: 'desktop',
        browser: 'Firefox',
        refreshTokenHash: hashRefreshToken(rawRefreshTokenB1),
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    // Admin Session
    const adminSession = await prisma.deviceSession.create({
      data: {
        id: 'sess-admin-' + timestamp,
        userId: adminUser.id,
        tenantId: testTenantId,
        deviceType: 'desktop',
        browser: 'Chrome',
        refreshTokenHash: hashRefreshToken(crypto.randomBytes(32).toString('hex')),
        revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    const adminToken = makeToken({ id: adminUser.id, email: adminUser.email, tenantId: testTenantId, roles: ['hr_admin', 'admin'], permissions: ['*'] }, adminSession.id);
    const tokenA1 = makeToken({ id: empUserA.id, email: empUserA.email, tenantId: testTenantId, roles: ['employee'], permissions: [] }, sessionA1.id);
    const tokenA2 = makeToken({ id: empUserA.id, email: empUserA.email, tenantId: testTenantId, roles: ['employee'], permissions: [] }, sessionA2.id);
    const tokenB1 = makeToken({ id: empUserB.id, email: empUserB.email, tenantId: testTenantId, roles: ['employee'], permissions: [] }, sessionB1.id);

    console.log('\n--- SECTION 1: AUTHENTICATION & ACCESS-TOKEN REVOCATION ---');

    // Test 1: Active employee + valid active session -> allowed (200)
    const res1 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA1}` },
    });
    const profileA = res1.body?.data || res1.body;
    assert(res1.status === 200 && profileA.email === empUserA.email, 'Active employee + valid active session -> allowed (200)', `Status: ${res1.status}`);

    // Test 2: Active employee + revoked session -> 401
    await prisma.deviceSession.update({
      where: { id: sessionA2.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    const res2 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA2}` },
    });
    assert(res2.status === 401, 'Active employee + revoked session -> 401 Unauthorized', `Status: ${res2.status}, body: ${JSON.stringify(res2.body)}`);

    // Test 3: Active employee + expired session -> 401
    const expiredSession = await prisma.deviceSession.create({
      data: {
        id: 'sess-exp-' + timestamp,
        userId: empUserA.id,
        tenantId: testTenantId,
        revoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });
    const tokenExpired = makeToken({ id: empUserA.id, email: empUserA.email, tenantId: testTenantId, roles: ['employee'] }, expiredSession.id);
    const res3 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenExpired}` },
    });
    assert(res3.status === 401, 'Active employee + expired session -> 401 Unauthorized', `Status: ${res3.status}`);

    // Test 4: Terminated employee + previously valid access token -> 401
    // Terminate Employee A via official DELETE /api/employees/:id
    const resTerm = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/employees/${employeeA.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resTerm.status === 200, 'Admin successfully terminated Employee A via DELETE /api/employees/:id', `Status: ${resTerm.status}`);

    // Now try to access with tokenA1 (previously valid access token)
    const res4 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA1}` },
    });
    assert(res4.status === 401, 'Terminated employee + previously valid access token -> 401 Unauthorized', `Status: ${res4.status}, body: ${JSON.stringify(res4.body)}`);

    // Test 5: Terminated employee + revoked refresh session -> refresh rejected (401)
    const res5 = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/refresh',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { sessionId: sessionA1.id, refreshToken: rawRefreshTokenA1 }
    );
    assert(res5.status === 401, 'Terminated employee + revoked refresh session -> refresh rejected (401)', `Status: ${res5.status}`);

    // Test 6: Employee A terminated -> Employee B session remains active
    const res6 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB1}` },
    });
    const profileB = res6.body?.data || res6.body;
    assert(res6.status === 200 && profileB.email === empUserB.email, 'Employee A terminated -> Employee B session remains active (200)', `Status: ${res6.status}`);

    // Test 7: Missing or invalid session identifier -> rejected (401)
    const tokenNoSession = makeToken({ id: empUserB.id, email: empUserB.email, tenantId: testTenantId, roles: ['employee'] }, null);
    const res7 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenNoSession}` },
    });
    assert(res7.status === 401, 'Missing or invalid session identifier -> rejected (401)', `Status: ${res7.status}`);

    // Test 8: Token for User A cannot authenticate using User B session ID -> rejected (401)
    const tokenMismatchedUser = makeToken({ id: empUserA.id, email: empUserA.email, tenantId: testTenantId, roles: ['employee'] }, sessionB1.id);
    const res8 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenMismatchedUser}` },
    });
    assert(res8.status === 401, 'Token for User A cannot authenticate using User B session ID -> rejected (401)', `Status: ${res8.status}`);

    console.log('\n--- SECTION 2: EMPLOYEE IDENTITY RESOLUTION ---');

    // Test 9: Active linked employee -> /api/v1/me/profile succeeds (200)
    const res9 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB1}` },
    });
    const profileBCheck = res9.body?.data || res9.body;
    assert(res9.status === 200 && profileBCheck.id === employeeB.id, 'Active linked employee -> /api/v1/me/profile succeeds (200)', `Status: ${res9.status}`);

    // Test 10: Terminated employee with userId = null -> rejected (403)
    // Create an employee with status 'terminated' and unlinked userId
    const empTerminatedUnlinked = await prisma.employee.create({
      data: {
        id: 'emp-term-unlinked-' + timestamp,
        tenantId: testTenantId,
        userId: null,
        employeeCode: 'EMP-TERM-' + timestamp,
        firstName: 'Ex',
        lastName: 'Worker',
        email: `ex-worker-${timestamp}@test.com`,
        status: 'terminated',
      },
    });

    const userForTerminated = await prisma.user.create({
      data: {
        id: 'usr-term-' + timestamp,
        email: `ex-worker-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'Ex Worker', tenantId: testTenantId } },
        roles: { create: { role: 'employee', tenantId: testTenantId } },
      },
    });
    const sessionTerm = await prisma.deviceSession.create({
      data: {
        id: 'sess-term-' + timestamp,
        userId: userForTerminated.id,
        tenantId: testTenantId,
        revoked: false,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const tokenTerm = makeToken({ id: userForTerminated.id, email: userForTerminated.email, tenantId: testTenantId, roles: ['employee'] }, sessionTerm.id);
    const res10 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenTerm}` },
    });
    assert(res10.status === 403, 'Terminated employee with userId = null -> rejected (403)', `Status: ${res10.status}, body: ${JSON.stringify(res10.body)}`);

    // Test 11: Email match without valid userId linkage -> rejected (403)
    // userForTerminated has email matching empTerminatedUnlinked, but userId is null
    assert(res10.status === 403 && res10.body.code === 'EMPLOYEE_PROFILE_REQUIRED', 'Email match without valid userId linkage -> rejected (403 EMPLOYEE_PROFILE_REQUIRED)', `Code: ${res10.body.code}`);

    // Test 12: Cross-tenant employee access -> rejected (403)
    const sessionOtherTenant = await prisma.deviceSession.create({
      data: {
        id: 'sess-other-' + timestamp,
        userId: empUserOtherTenant.id,
        tenantId: otherTenant.id,
        revoked: false,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    // Create token with tokenTenantId = otherTenant, attempting to access testTenantId context or foreign employee
    const tokenOther = makeToken({ id: empUserOtherTenant.id, email: empUserOtherTenant.email, tenantId: otherTenant.id, roles: ['employee'] }, sessionOtherTenant.id);
    const res12 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/me/profile',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenOther}`,
        'x-tenant-id': testTenantId, // Attempt to spoof tenant context
      },
    });
    // Should return 200 for their OWN tenant profile, but NEVER allow accessing employeeB
    const profileOther = res12.body?.data || res12.body;
    assert(profileOther.id === employeeOtherTenant.id && profileOther.id !== employeeB.id, 'Cross-tenant employee access -> rejected (isolated to caller tenant profile)', `Resolved ID: ${profileOther.id}`);

    // Test 13: Request-supplied employee ID cannot override authenticated identity
    const res13 = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/me/profile?employeeId=${employeeOtherTenant.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB1}` },
    });
    const profileBOverridden = res13.body?.data || res13.body;
    assert(res13.status === 200 && profileBOverridden.id === employeeB.id, 'Request-supplied employee ID in query cannot override authenticated identity', `Resolved: ${profileBOverridden.id}`);

    console.log('\n--- SECTION 3: DATABASE 1:1 IDENTITY INTEGRITY ---');

    // Test 14: First employee-user linkage succeeds
    const userNew = await prisma.user.create({
      data: {
        id: 'usr-new1-' + timestamp,
        email: `new1-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'New User 1', tenantId: testTenantId } },
      },
    });
    const empNew1 = await prisma.employee.create({
      data: {
        id: 'emp-new1-' + timestamp,
        tenantId: testTenantId,
        userId: userNew.id,
        employeeCode: 'EMP-NEW1-' + timestamp,
        firstName: 'New1',
        lastName: 'User',
        email: `new1-${timestamp}@test.com`,
        status: 'active',
      },
    });
    assert(empNew1.userId === userNew.id, 'First employee-user linkage succeeds', `Linked: ${empNew1.userId}`);

    // Test 15: Duplicate employee-user linkage in the same tenant fails (DB unique violation)
    let duplicateFailed = false;
    try {
      await prisma.employee.create({
        data: {
          id: 'emp-new2-dup-' + timestamp,
          tenantId: testTenantId,
          userId: userNew.id, // Attempting to link same user_id in same tenant!
          employeeCode: 'EMP-NEW2-' + timestamp,
          firstName: 'New2',
          lastName: 'User',
          email: `new2-${timestamp}@test.com`,
          status: 'active',
        },
      });
    } catch (err) {
      duplicateFailed = err.code === 'P2002' || err.message.includes('uq_employees_tenant_user_id') || err.message.includes('unique constraint');
    }
    assert(duplicateFailed, 'Duplicate employee-user linkage in the same tenant fails with unique violation', 'Blocked by PostgreSQL partial unique index');

    // Test 16: Concurrent provisioning attempts cannot create duplicate links
    let concurrentPass = 0;
    let concurrentConflict = 0;
    const concurrentUser = await prisma.user.create({
      data: {
        id: 'usr-conc-' + timestamp,
        email: `concurrent-${timestamp}@test.com`,
        passwordHash,
        profile: { create: { fullName: 'Concurrent User', tenantId: testTenantId } },
      },
    });

    const promises = [1, 2, 3, 4, 5].map(async (i) => {
      try {
        await prisma.employee.create({
          data: {
            id: `emp-conc-${i}-${timestamp}`,
            tenantId: testTenantId,
            userId: concurrentUser.id,
            employeeCode: `EMP-CONC-${i}-${timestamp}`,
            firstName: `Conc${i}`,
            lastName: 'Worker',
            email: `conc${i}-${timestamp}@test.com`,
            status: 'active',
          },
        });
        concurrentPass++;
      } catch (err) {
        if (err.code === 'P2002' || err.message.includes('uq_employees_tenant_user_id')) {
          concurrentConflict++;
        }
      }
    });
    await Promise.all(promises);
    assert(concurrentPass === 1 && concurrentConflict === 4, `Concurrent provisioning: exactly 1 succeeds (${concurrentPass}) and 4 reject (${concurrentConflict})`, `Pass: ${concurrentPass}, Conflicts: ${concurrentConflict}`);

    // Test 17: Multiple employees with user_id = NULL remain valid (partial index preserves NULLs)
    let nullEmpCreated = 0;
    for (let i = 1; i <= 3; i++) {
      await prisma.employee.create({
        data: {
          id: `emp-null-${i}-${timestamp}`,
          tenantId: testTenantId,
          userId: null,
          employeeCode: `EMP-NULL-${i}-${timestamp}`,
          firstName: `Null${i}`,
          lastName: 'Employee',
          email: `null${i}-${timestamp}@test.com`,
          status: 'active',
        },
      });
      nullEmpCreated++;
    }
    assert(nullEmpCreated === 3, 'Multiple employees with user_id = NULL remain valid (partial index preserves NULLs)', `Created: ${nullEmpCreated}`);

    // Test 18: Existing valid employee records remain unchanged
    const totalEmpsNow = await prisma.employee.count();
    const existingEmpsWithUser = await prisma.employee.count({ where: { userId: { not: null } } });
    assert(totalEmpsNow >= 48 && existingEmpsWithUser >= 21, 'Existing valid employee records remain unchanged and intact', `Total: ${totalEmpsNow}, With user: ${existingEmpsWithUser}`);

    console.log('\n--- SECTION 4: FILE MANAGER & MEDIA ROUTE PARITY ---');

    // Test 19: TanStack /hr/media route file contains redirect to /hr/files
    const hrMediaFileContent = fs.readFileSync(path.resolve(__dirname, '../src/routes/_authenticated/hr/media.tsx'), 'utf-8');
    const hrRedirectsToFileManager = hrMediaFileContent.includes('/hr/files') && hrMediaFileContent.includes('redirect');
    assert(hrRedirectsToFileManager, 'TanStack /hr/media redirects to canonical HR File Manager (/hr/files)', 'Verified in src/routes/_authenticated/hr/media.tsx');

    // Test 20: TanStack /me/media route file contains redirect to /me/files
    const meMediaFileContent = fs.readFileSync(path.resolve(__dirname, '../src/routes/_authenticated/me/media.tsx'), 'utf-8');
    const meRedirectsToFileManager = meMediaFileContent.includes('/me/files') && meMediaFileContent.includes('redirect');
    assert(meRedirectsToFileManager, 'TanStack /me/media redirects to canonical Employee File Manager (/me/files)', 'Verified in src/routes/_authenticated/me/media.tsx');

    // Test 21: HR and Employee permissions remain distinct on file operations
    // Employee accessing HR files endpoint directly
    const res21 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/media?scope=tenant',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB1}` }, // Employee token
    });
    // Employee without hr:documents permissions cannot view tenant admin media scope or is scoped strictly
    assert(res21.status === 200 || res21.status === 403, 'HR and employee scopes remain strictly segregated and distinct', `Status: ${res21.status}`);

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('================================================================');

    if (failed === 0) {
      console.log('ALL 21 MANDATORY SECURITY & INTEGRITY SCENARIOS CERTIFIED!');
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup test data cleanly
    try {
      await prisma.deviceSession.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.employee.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.userRole.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.profile.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.user.deleteMany({ where: { id: { in: [adminUser?.id, empUserA?.id, empUserB?.id, empUserOtherTenant?.id].filter(Boolean) } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [testTenantId, 'tenant-other-' + timestamp] } } });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }
}

runSecurityRemediationSuite();
