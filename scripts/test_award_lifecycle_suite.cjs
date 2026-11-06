const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Read server .env for JWT_SECRET
const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user, sessionId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: ['*'],
      sessionId,
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const userTenantA = {
  id: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['hr_admin'],
};

const userTenantB = {
  id: '003e540c-f476-497a-abd5-3d7596d29526',
  email: 'admin-a-1791971886012@acme.com',
  tenantId: 'test-tenant-a-1791971885429',
  roles: ['hr_admin'],
};

let tokenA;
let tokenB;

function request(options, data, isRaw = false) {
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
      if (isRaw || Buffer.isBuffer(data)) {
        req.write(data);
      } else {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
      }
    }
    req.end();
  });
}

function uploadMultipart({ port, path: reqPath, token, boundary, payloadBuffer }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path: reqPath,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payloadBuffer.length,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(payloadBuffer);
    req.end();
  });
}

async function runSuite() {
  console.log('=================================================================');
  console.log(' MASTERHRMS — AWARD TYPES & EMPLOYEE RECOGNITION BACKEND SUITE');
  console.log('=================================================================\n');

  const PORT = 4000; // backend port
  const prisma = new PrismaClient();
  let createdTypeId = null;
  let assignedAwardId = null;

  try {
    const sessionA = await prisma.deviceSession.create({
      data: {
        userId: userTenantA.id,
        tenantId: userTenantA.tenantId,
        deviceType: 'desktop',
        browser: 'Test',
        revoked: false,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    tokenA = makeToken(userTenantA, sessionA.id);

    const sessionB = await prisma.deviceSession.create({
      data: {
        userId: userTenantB.id,
        tenantId: userTenantB.tenantId,
        deviceType: 'desktop',
        browser: 'Test',
        revoked: false,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    tokenB = makeToken(userTenantB, sessionB.id);
    // 1. GET /api/hr/organization/award-types (List & check aggregates)
    console.log('TEST 1: List Award Types & verify authoritative aggregates');
    const res1 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/hr/organization/award-types?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
      },
    });
    console.log(`  HTTP status: ${res1.status}`);
    console.log(`  Total items: ${res1.body?.total}`);
    console.log(`  Counts:`, res1.body?.counts);
    if (res1.status !== 200 || !Array.isArray(res1.body?.data)) {
      throw new Error(`TEST 1 Failed: Expected 200 and data array, got ${res1.status}`);
    }
    console.log('  ✔ PASS: Award Types listing and aggregates verified.\n');

    // 2. POST /api/hr/organization/award-types/upload (Multipart PNG badge upload)
    console.log('TEST 2: Upload Award Badge Image (PNG magic bytes validation)');
    const samplePng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082',
      'hex'
    );
    const boundary = '----WebKitFormBoundaryAwardTest' + Date.now();
    const parts = [
      `--${boundary}\r\n`,
      'Content-Disposition: form-data; name="file"; filename="badge-gold-star.png"\r\n',
      'Content-Type: image/png\r\n\r\n',
    ];
    const footer = `\r\n--${boundary}--\r\n`;
    const payload = Buffer.concat([
      Buffer.from(parts.join(''), 'utf-8'),
      samplePng,
      Buffer.from(footer, 'utf-8'),
    ]);

    const res2 = await uploadMultipart({
      port: PORT,
      path: '/api/hr/organization/award-types/upload',
      token: tokenA,
      boundary,
      payloadBuffer: payload,
    });
    console.log(`  HTTP status: ${res2.status}`);
    console.log(`  Uploaded URL:`, res2.body?.url);
    if (res2.status !== 201 || !res2.body?.url) {
      throw new Error(`TEST 2 Failed: Expected 201 Created with url, got ${res2.status}: ${JSON.stringify(res2.body)}`);
    }
    const uploadedUrl = res2.body.url;
    const uploadedPath = res2.body.imageStoragePath;
    console.log('  ✔ PASS: Image upload succeeded and returned public URL & storage path.\n');

    // 3. POST /api/hr/organization/award-types/upload (Reject unsafe file)
    console.log('TEST 3: Reject Unsafe Non-Image File on Upload');
    const exeBuffer = Buffer.from('MZ90003000000004000000ffff0000b8000000000000004000000000000000', 'hex');
    const exeBoundary = '----WebKitFormBoundaryExeTest' + Date.now();
    const exeParts = [
      `--${exeBoundary}\r\n`,
      'Content-Disposition: form-data; name="file"; filename="dangerous.exe"\r\n',
      'Content-Type: application/x-dosexec\r\n\r\n',
    ];
    const exePayload = Buffer.concat([
      Buffer.from(exeParts.join(''), 'utf-8'),
      exeBuffer,
      Buffer.from(`\r\n--${exeBoundary}--\r\n`, 'utf-8'),
    ]);

    const res3 = await uploadMultipart({
      port: PORT,
      path: '/api/hr/organization/award-types/upload',
      token: tokenA,
      boundary: exeBoundary,
      payloadBuffer: exePayload,
    });
    console.log(`  HTTP status: ${res3.status}`);
    console.log(`  Error response:`, res3.body?.error);
    if (res3.status !== 400) {
      throw new Error(`TEST 3 Failed: Expected 400 Bad Request, got ${res3.status}`);
    }
    console.log('  ✔ PASS: Unsafe file strictly rejected by magic byte security gate.\n');

    // 4. POST /api/hr/organization/award-types (Create custom award type)
    console.log('TEST 4: Create Custom Award Type with Uploaded Image & Icon');
    const testTitle = `Excellence Badge ${Date.now()}`;
    const res4 = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/hr/organization/award-types',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: testTitle,
        description: 'Conferred for outstanding architectural engineering delivery',
        icon: 'Crown',
        imageUrl: uploadedUrl,
        imageStoragePath: uploadedPath,
        status: 'active',
      }
    );
    console.log(`  HTTP status: ${res4.status}`);
    console.log(`  Created ID:`, res4.body?.id);
    if (res4.status !== 201 && res4.status !== 200) {
      throw new Error(`TEST 4 Failed: Expected 201, got ${res4.status}: ${JSON.stringify(res4.body)}`);
    }
    createdTypeId = res4.body.id;
    console.log('  ✔ PASS: Custom Award Type created with image URL & icon.\n');

    // 5. PUT /api/hr/organization/award-types/:id (Deactivate award type)
    console.log('TEST 5: De-activate Award Type');
    const res5 = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/hr/organization/award-types/${createdTypeId}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        status: 'inactive',
      }
    );
    console.log(`  HTTP status: ${res5.status}`);
    console.log(`  Updated status:`, res5.body?.status);
    if (res5.status !== 200 || res5.body?.status !== 'inactive') {
      throw new Error(`TEST 5 Failed: Expected status='inactive', got ${res5.body?.status}`);
    }
    console.log('  ✔ PASS: Award Type deactivated.\n');

    // 6. POST /api/awards (Assigning inactive award type must be rejected)
    console.log('TEST 6: Reject Award Assignment for Inactive Award Type');
    const res6 = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/awards',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        employeeId: 'emp-demo-001',
        awardTypeId: createdTypeId,
        awardDate: '2026-11-06',
        description: 'Attempt to issue inactive award',
      }
    );
    console.log(`  HTTP status: ${res6.status}`);
    console.log(`  Rejection error:`, res6.body?.error);
    if (res6.status !== 400 || !res6.body?.error?.includes('inactive')) {
      throw new Error(`TEST 6 Failed: Expected 400 Bad Request regarding inactive award, got ${res6.status}`);
    }
    console.log('  ✔ PASS: Inactive Award Type assignment prevented.\n');

    // 7. PUT /api/hr/organization/award-types/:id (Reactivate award type)
    console.log('TEST 7: Reactivate Award Type');
    const res7 = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/hr/organization/award-types/${createdTypeId}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        status: 'active',
      }
    );
    console.log(`  HTTP status: ${res7.status}`);
    console.log(`  Updated status:`, res7.body?.status);
    if (res7.status !== 200 || res7.body?.status !== 'active') {
      throw new Error(`TEST 7 Failed: Expected status='active', got ${res7.body?.status}`);
    }
    console.log('  ✔ PASS: Award Type reactivated.\n');

    // 8. POST /api/awards (Assign active award type to employee)
    console.log('TEST 8: Assign Active Award Type to Employee (emp-demo-001)');
    const res8 = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/awards',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
      },
      {
        employeeId: 'emp-demo-001',
        awardTypeId: createdTypeId,
        awardDate: '2026-11-06',
        giftItem: testTitle,
        giftAmount: 10000,
        description: 'Exemplary execution and tenant-isolated architecture leadership',
        presentedBy: 'Executive Committee',
      }
    );
    console.log(`  HTTP status: ${res8.status}`);
    const awardData = res8.body?.data || res8.body;
    console.log(`  Award Certificate No:`, awardData?.certificateNo);
    console.log(`  Award ID:`, awardData?.id);
    if (res8.status !== 201 || !awardData?.id) {
      throw new Error(`TEST 8 Failed: Expected 201 Created, got ${res8.status}: ${JSON.stringify(res8.body)}`);
    }
    assignedAwardId = awardData.id;
    console.log('  ✔ PASS: Award successfully conferred and recorded in database.\n');

    // 9. DELETE /api/hr/organization/award-types/:id (Reject deletion of referenced award type)
    console.log('TEST 9: Reject Hard Deletion of Referenced Award Type (Dependency Guard)');
    const res9 = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/hr/organization/award-types/${createdTypeId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
      },
    });
    console.log(`  HTTP status: ${res9.status}`);
    console.log(`  Dependency check rejection:`, res9.body?.error);
    if (res9.status !== 409 || !res9.body?.referenced) {
      throw new Error(`TEST 9 Failed: Expected 409 Conflict with referenced=true, got ${res9.status}`);
    }
    console.log('  ✔ PASS: Referenced Award Type deletion safely rejected with 409 Conflict.\n');

    // 10. GET /api/hr/employees/emp-demo-001 (Verify Employee 360 includes assigned award with awardType and imageUrl)
    console.log('TEST 10: Verify Employee Master Profile 360 contains conferred award');
    const res10 = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/hr/employees/emp-demo-001',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
      },
    });
    console.log(`  HTTP status: ${res10.status}`);
    const empAwards = res10.body?.data?.awards || [];
    console.log(`  Employee awards count: ${empAwards.length}`);
    const foundAward = empAwards.find((a) => a.id === assignedAwardId);
    if (!foundAward) {
      throw new Error(`TEST 10 Failed: Newly assigned award ${assignedAwardId} not found in Employee 360 profile!`);
    }
    console.log(`  Found award title:`, foundAward.awardType?.name || foundAward.giftItem);
    console.log(`  Found award image URL:`, foundAward.awardType?.imageUrl);
    console.log(`  Found award certificate:`, foundAward.certificateNo);
    console.log('  ✔ PASS: Employee Master Profile seamlessly loaded assigned award.\n');

    // 11. Cross-Tenant Isolation: Tenant B cannot access Tenant A's award type or awards
    console.log('TEST 11: Cross-Tenant Isolation Enforcement');
    const res11 = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/hr/organization/award-types/${createdTypeId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
      },
    });
    console.log(`  Tenant B accessing Tenant A award type: HTTP ${res11.status}`);
    if (res11.status !== 404 && res11.status !== 403) {
      throw new Error(`TEST 11 Failed: Expected 404 or 403 for cross-tenant access, got ${res11.status}`);
    }
    console.log('  ✔ PASS: Cross-tenant access strictly blocked.\n');

    // 12. Cleanup: Revoke/delete the test award, then delete the test award type
    console.log('TEST 12: Clean Revocation & Lifecycle Completion');
    const res12a = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/awards/${assignedAwardId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
      },
    });
    console.log(`  Revoke award: HTTP ${res12a.status}`);
    if (res12a.status !== 200) {
      throw new Error(`TEST 12a Failed: Could not revoke award: ${JSON.stringify(res12a.body)}`);
    }

    // Now award type has 0 references, delete should succeed!
    const res12b = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/hr/organization/award-types/${createdTypeId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
      },
    });
    console.log(`  Delete unreferenced award type: HTTP ${res12b.status}`);
    if (res12b.status !== 200) {
      throw new Error(`TEST 12b Failed: Could not delete unreferenced award type: ${JSON.stringify(res12b.body)}`);
    }
    console.log('  ✔ PASS: Revocation and unreferenced deletion completed cleanly.\n');

    console.log('=================================================================');
    console.log(' ALL 12 BACKEND & ARCHITECTURE TESTS PASSED WITH 100% SUCCESS!');
    console.log('=================================================================');
  } catch (err) {
    console.error('❌ SUITE FAILURE:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSuite();
