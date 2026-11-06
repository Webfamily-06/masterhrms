const { PrismaClient } = require('@prisma/client');
const http = require('http');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';
const jwt = require('jsonwebtoken');

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles || ['employee'],
      permissions: user.permissions || [],
      sessionId: user.sessionId
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

async function runSessionAudit() {
  console.log('================================================================');
  console.log('EMPIRICAL SECURITY AUDIT: AUTHENTICATION SESSION REVOCATION');
  console.log('================================================================\n');

  const tenantId = 'tenant-default-001';

  // 1. Setup HR Admin token
  const hrToken = makeToken({
    id: 'user-hr-001',
    email: 'hr@masterhrms.com',
    tenantId,
    roles: ['hr_admin'],
    permissions: ['*']
  });

  // 2. Create Employee A test user, employee, and device session
  console.log('1. Setting up Employee A fixture...');
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const emailA = `audit.emp.a.${Date.now()}@example.com`;

  const userA = await prisma.user.create({
    data: {
      email: emailA,
      passwordHash,
      profile: {
        create: {
          fullName: 'Audit Employee A',
          tenantId
        }
      },
      roles: {
        create: {
          tenantId,
          role: 'employee'
        }
      }
    }
  });

  const empCodeA = `EMP-AUD-${Math.floor(1000 + Math.random() * 9000)}`;
  const employeeA = await prisma.employee.create({
    data: {
      tenantId,
      userId: userA.id,
      employeeCode: empCodeA,
      firstName: 'Audit',
      lastName: 'EmployeeA',
      email: emailA,
      status: 'active'
    }
  });

  // Create DeviceSession for Employee A
  const crypto = require('crypto');
  const rawRefreshTokenA = crypto.randomBytes(48).toString('hex');
  const refreshTokenHashA = crypto.createHash('sha256').update(rawRefreshTokenA).digest('hex');

  const sessionA = await prisma.deviceSession.create({
    data: {
      userId: userA.id,
      tenantId,
      deviceType: 'desktop',
      browser: 'Chrome',
      operatingSystem: 'Windows',
      refreshTokenHash: refreshTokenHashA,
      revoked: false,
      lastActiveAt: new Date()
    }
  });

  const tokenA = makeToken({
    id: userA.id,
    email: emailA,
    tenantId,
    roles: ['employee'],
    sessionId: sessionA.id
  });

  console.log(`   Employee A created: ID ${employeeA.id}, User ID ${userA.id}, Session ID ${sessionA.id}`);

  // 3. Create Employee B test user, employee, and session
  console.log('\n2. Setting up Employee B fixture (unaffected control)...');
  const emailB = `audit.emp.b.${Date.now()}@example.com`;
  const userB = await prisma.user.create({
    data: {
      email: emailB,
      passwordHash,
      profile: {
        create: {
          fullName: 'Audit Employee B',
          tenantId
        }
      },
      roles: {
        create: {
          tenantId,
          role: 'employee'
        }
      }
    }
  });

  const employeeB = await prisma.employee.create({
    data: {
      tenantId,
      userId: userB.id,
      employeeCode: `EMP-AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: 'Audit',
      lastName: 'EmployeeB',
      email: emailB,
      status: 'active'
    }
  });

  const rawRefreshTokenB = crypto.randomBytes(48).toString('hex');
  const refreshTokenHashB = crypto.createHash('sha256').update(rawRefreshTokenB).digest('hex');

  const sessionB = await prisma.deviceSession.create({
    data: {
      userId: userB.id,
      tenantId,
      deviceType: 'desktop',
      browser: 'Chrome',
      operatingSystem: 'Windows',
      refreshTokenHash: refreshTokenHashB,
      revoked: false,
      lastActiveAt: new Date()
    }
  });

  const tokenB = makeToken({
    id: userB.id,
    email: emailB,
    tenantId,
    roles: ['employee'],
    sessionId: sessionB.id
  });

  console.log(`   Employee B created: ID ${employeeB.id}, User ID ${userB.id}, Session ID ${sessionB.id}`);

  // 4. Test Employee A accessing authenticated API while active
  console.log('\n3. Testing active session access before termination (GET /api/v1/me/profile)...');
  const preTermRes = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/v1/me/profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`   Pre-termination API status: ${preTermRes.status} (Expected 200: ${preTermRes.status === 200 ? 'PASS' : 'FAIL'})`);

  // 5. Terminate Employee A via DELETE /api/employees/:id
  console.log('\n4. Terminating Employee A via DELETE /api/employees/:id...');
  const termRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/employees/${employeeA.id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${hrToken}` }
  });
  console.log(`   Termination response status: ${termRes.status}, body:`, JSON.stringify(termRes.body));

  // Check database state of Employee A and DeviceSession A
  const updatedEmpA = await prisma.employee.findUnique({ where: { id: employeeA.id } });
  const updatedSessionA = await prisma.deviceSession.findUnique({ where: { id: sessionA.id } });
  console.log(`   DB employeeA: status = ${updatedEmpA?.status}, userId = ${updatedEmpA?.userId}`);
  console.log(`   DB sessionA: revoked = ${updatedSessionA?.revoked}, revokedAt = ${updatedSessionA?.revokedAt}`);

  // 6. Test existing session token after termination
  console.log('\n5. Attempting to access authenticated API with existing Employee A token (GET /api/v1/me/profile)...');
  const postTermRes = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/v1/me/profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`   Post-termination API status: ${postTermRes.status}, body:`, JSON.stringify(postTermRes.body));
  if (postTermRes.status === 200) {
    console.log('   [CRITICAL SECURITY DEFECT] Terminated employee can still access authenticated API with existing session!');
  } else {
    console.log(`   [PASS] Terminated employee session access rejected with ${postTermRes.status}`);
  }

  // Also test another authenticated API (e.g. /api/me/awards)
  console.log('\n6. Attempting to access /api/me/awards with existing Employee A token...');
  const awardsRes = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/me/awards',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`   /api/me/awards status: ${awardsRes.status}, body:`, JSON.stringify(awardsRes.body));

  // 7. Test Refresh Token Reuse
  console.log('\n7. Testing refresh token reuse for Employee A (POST /api/auth/refresh)...');
  const refreshResA = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/auth/refresh',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    refreshToken: rawRefreshTokenA,
    sessionId: sessionA.id
  });
  console.log(`   Refresh token response status: ${refreshResA.status}, body:`, JSON.stringify(refreshResA.body));
  console.log(`   Refresh token rejected with 401: ${refreshResA.status === 401 ? 'PASS' : 'FAIL'}`);

  // 8. Test Employee B remains unaffected
  console.log('\n8. Verifying Employee B remains unaffected...');
  const postTermResB = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/v1/me/profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`   Employee B profile status: ${postTermResB.status} (Expected 200: ${postTermResB.status === 200 ? 'PASS' : 'FAIL'})`);

  const updatedSessionB = await prisma.deviceSession.findUnique({ where: { id: sessionB.id } });
  console.log(`   Employee B session revoked status in DB: ${updatedSessionB?.revoked} (Expected false: ${updatedSessionB?.revoked === false ? 'PASS' : 'FAIL'})`);

  // Cleanup test fixtures
  await prisma.deviceSession.deleteMany({ where: { id: { in: [sessionA.id, sessionB.id] } } });
  await prisma.employee.deleteMany({ where: { id: { in: [employeeA.id, employeeB.id] } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.userProfile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  console.log('\nAudit cleanup completed.');
}

runSessionAudit().finally(() => prisma.$disconnect());
