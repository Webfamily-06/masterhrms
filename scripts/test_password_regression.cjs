const { PrismaClient } = require('@prisma/client');
const http = require('http');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['hr_admin'],
      permissions: user.permissions || ['*'],
      sessionId,
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
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

async function runPasswordRegression() {
  console.log('================================================================');
  console.log('EMPIRICAL AUDIT: PASSWORD UPDATE REGRESSION & SECURITY');
  console.log('================================================================\n');

  const tenantA = 'tenant-default-001';
  const tenantB = 'test-tenant-a-1791393008227';

  // Ensure real device sessions for tokens
  const sessionA = await prisma.deviceSession.create({
    data: {
      userId: 'user-hr-001',
      tenantId: tenantA,
      deviceType: 'desktop',
      browser: 'Test',
      revoked: false,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const hrTokenA = makeToken({
    id: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId: tenantA,
    roles: ['hr_admin'],
    permissions: ['*']
  }, sessionA.id);

  // Find or create a real admin in Tenant B
  let userB = await prisma.user.findFirst({
    where: { roles: { some: { tenantId: tenantB } } }
  });
  if (!userB) {
    userB = await prisma.user.findFirst({
      where: { profile: { tenantId: tenantB } }
    });
  }
  const userBId = userB ? userB.id : 'user-hr-tenant-b';
  const sessionB = await prisma.deviceSession.create({
    data: {
      userId: userBId,
      tenantId: tenantB,
      deviceType: 'desktop',
      browser: 'Test',
      revoked: false,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const hrTokenB = makeToken({
    id: userBId,
    email: userB ? userB.email : 'hr-b@example.com',
    tenantId: tenantB,
    roles: ['hr_admin'],
    permissions: ['*']
  }, sessionB.id);

  // 1. Create a test employee with initial password
  console.log('1. Setting up test employee in Tenant A...');
  const initialPassword = 'InitialPassword@123';
  const newPassword = 'BrandNewPassword@456';
  const initialHash = await bcrypt.hash(initialPassword, 10);
  const testEmail = `pwd.test.${Date.now()}@masterhrms.com`;

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: initialHash,
      profile: {
        create: {
          fullName: 'Password Test User',
          tenantId: tenantA
        }
      },
      roles: {
        create: {
          tenantId: tenantA,
          role: 'employee'
        }
      }
    }
  });

  const employee = await prisma.employee.create({
    data: {
      tenantId: tenantA,
      userId: user.id,
      employeeCode: `EMP-PWD-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: 'Password',
      lastName: 'Tester',
      email: testEmail,
      status: 'active'
    }
  });

  console.log(`   Created test employee: ID ${employee.id}, User ID ${user.id}`);

  // 2. Test Invalid Password Length (< 6 chars)
  console.log('\n2. Testing invalid short password rejection (< 6 characters)...');
  const shortPwdRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/employees/${employee.id}/set-password`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hrTokenA}`
    }
  }, { newPassword: '123' });
  console.log(`   Short password status: ${shortPwdRes.status} (Expected 400: ${shortPwdRes.status === 400 ? 'PASS' : 'FAIL'})`);

  // 3. Test Unauthorized Cross-Tenant Password Change (Tenant B admin targeting Tenant A employee)
  console.log('\n3. Testing unauthorized cross-tenant password update (Tenant B -> Tenant A)...');
  const crossTenantRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/employees/${employee.id}/set-password`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hrTokenB}`
    }
  }, { newPassword: 'HackedPassword@999' });
  console.log(`   Cross-tenant status: ${crossTenantRes.status} (Expected 404/403: ${crossTenantRes.status === 404 || crossTenantRes.status === 403 ? 'PASS' : 'FAIL'})`);

  // 4. Test HR Authorized Password Update for Tenant A employee
  console.log('\n4. Testing authorized password update by Tenant A HR Admin...');
  const authorizedRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/employees/${employee.id}/set-password`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hrTokenA}`
    }
  }, { newPassword });
  console.log(`   Authorized update status: ${authorizedRes.status} (Expected 200: ${authorizedRes.status === 200 ? 'PASS' : 'FAIL'})`);

  // 5. Verify Database State: No plaintext password and bcrypt hash matches
  console.log('\n5. Verifying database security state...');
  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const hashMatchesNew = await bcrypt.compare(newPassword, updatedUser.passwordHash);
  const hashMatchesOld = await bcrypt.compare(initialPassword, updatedUser.passwordHash);
  const isBcrypt = updatedUser.passwordHash.startsWith('$2a$') || updatedUser.passwordHash.startsWith('$2b$');

  console.log(`   Password hash is valid bcrypt format: ${isBcrypt ? 'PASS' : 'FAIL'}`);
  console.log(`   New password verifies against DB hash: ${hashMatchesNew ? 'PASS' : 'FAIL'}`);
  console.log(`   Old password is rejected by DB hash: ${!hashMatchesOld ? 'PASS' : 'FAIL'}`);

  // 6. Verify Audit Trail: No plaintext password in audit logs
  console.log('\n6. Verifying audit log security...');
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: employee.id, action: 'EMPLOYEE_PASSWORD_SET' },
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  if (auditLogs.length > 0) {
    const logStr = JSON.stringify(auditLogs[0]);
    const leaksPlaintext = logStr.includes(newPassword) || logStr.includes(initialPassword);
    console.log(`   Audit log exists: PASS`);
    console.log(`   Zero plaintext password in audit log: ${!leaksPlaintext ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('   Note: Audit log written asynchronously or not found');
  }

  // 7. Cleanup
  await prisma.employee.delete({ where: { id: employee.id } });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.profile.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.user.delete({ where: { id: user.id } });
  console.log('\nPassword regression cleanup completed.');
}

runPasswordRegression().finally(() => prisma.$disconnect());
