const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

// Read server .env for JWT_SECRET
const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: ['*'],
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
  id: 'user_e2e_a_1791569819098',
  email: 'admin-a-1791569819098@example.com',
  tenantId: 'tenant_e2e_a_1791569819098',
  roles: ['hr_admin'],
};

const tokenA = makeToken(userTenantA);
const tokenB = makeToken(userTenantB);

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

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================================');
  console.log('🧪 PHASE 3: COMPREHENSIVE END-TO-END LIFECYCLE & PRISMA RECONCILIATION TEST');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(condition, name, details) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.error(`  ✗ ${name}`);
      if (details) console.error('    Details:', details);
    }
  }

  const timestamp = Date.now();
  let testDesigId = null;
  let testDeptId = null;
  let testBranchId = null;

  try {
    // -------------------------------------------------------------------------
    // 1. DESIGNATION LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Designation Lifecycle ---');
    const desigName = `QA Lifecycle Engineer ${timestamp}`;
    const createDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/designations',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: desigName, status: 'inactive', description: 'Initial inactive state' });

    assertTest(createDesigRes.status === 201 && createDesigRes.body?.id,
      'POST /designations creates designation with status=inactive (201 Created)',
      createDesigRes.body
    );
    testDesigId = createDesigRes.body?.id;

    // 1.1 Activate the inactive Designation
    const activateDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'active' });

    assertTest(activateDesigRes.status === 200 && activateDesigRes.body?.status === 'active',
      'PUT /designations/:id activates designation (status=active, no updatedBy schema error)',
      activateDesigRes.body
    );

    // Verify in DB
    const desigInDb1 = await prisma.designation.findUnique({ where: { id: testDesigId } });
    assertTest(desigInDb1?.status === 'active', 'Database confirms Designation status is active');

    // 1.2 De-activate the active Designation
    const deactivateDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'inactive' });

    assertTest(deactivateDesigRes.status === 200 && deactivateDesigRes.body?.status === 'inactive',
      'PUT /designations/:id de-activates designation (status=inactive)',
      deactivateDesigRes.body
    );

    const desigInDb2 = await prisma.designation.findUnique({ where: { id: testDesigId } });
    assertTest(desigInDb2?.status === 'inactive', 'Database confirms Designation status is inactive');

    // 1.3 Edit Designation
    const editDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: `${desigName} (Renamed)`, description: 'Updated description' });

    assertTest(editDesigRes.status === 200 && editDesigRes.body?.name === `${desigName} (Renamed)`,
      'PUT /designations/:id edits designation properties cleanly',
      editDesigRes.body
    );

    // -------------------------------------------------------------------------
    // 2. DEPARTMENT LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Department Lifecycle ---');
    const deptName = `QA Lifecycle Dept ${timestamp}`;
    const createDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/departments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: deptName, status: 'active', description: 'Initial active state' });

    assertTest(createDeptRes.status === 201 && createDeptRes.body?.id,
      'POST /departments creates department (201 Created)',
      createDeptRes.body
    );
    testDeptId = createDeptRes.body?.id;

    // 2.1 De-activate Department
    const deactivateDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'inactive' });

    assertTest(deactivateDeptRes.status === 200 && deactivateDeptRes.body?.status === 'inactive',
      'PUT /departments/:id de-activates department (status=inactive)',
      deactivateDeptRes.body
    );

    // 2.2 Re-activate Department
    const reactivateDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'active' });

    assertTest(reactivateDeptRes.status === 200 && reactivateDeptRes.body?.status === 'active',
      'PUT /departments/:id re-activates department (status=active)',
      reactivateDeptRes.body
    );

    // 2.3 Edit Department
    const editDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: `${deptName} (Renamed)`, description: 'New description' });

    assertTest(editDeptRes.status === 200 && editDeptRes.body?.name === `${deptName} (Renamed)`,
      'PUT /departments/:id edits department cleanly',
      editDeptRes.body
    );

    // -------------------------------------------------------------------------
    // 3. BRANCH LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Branch Lifecycle ---');
    const branchName = `QA Lifecycle Branch ${timestamp}`;
    const branchCode = `LC${Math.floor(Math.random() * 899 + 100)}`;
    const createBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/branches',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: branchName, code: branchCode, address: 'Old Address 100', status: 'active' });

    assertTest(createBranchRes.status === 201 && createBranchRes.body?.id,
      'POST /branches creates branch (201 Created)',
      createBranchRes.body
    );
    testBranchId = createBranchRes.body?.id;

    // 3.1 De-activate Branch
    const deactivateBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches/${testBranchId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'inactive' });

    assertTest(deactivateBranchRes.status === 200 && deactivateBranchRes.body?.status === 'inactive',
      'PUT /branches/:id de-activates branch facility',
      deactivateBranchRes.body
    );

    // 3.2 Re-activate Branch
    const reactivateBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches/${testBranchId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'active' });

    assertTest(reactivateBranchRes.status === 200 && reactivateBranchRes.body?.status === 'active',
      'PUT /branches/:id re-activates branch facility',
      reactivateBranchRes.body
    );

    // 3.3 Edit Branch
    const editBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches/${testBranchId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: `${branchName} (HQ)`, address: 'New Highway 500', phone: '+1-555-0199' });

    assertTest(editBranchRes.status === 200 && editBranchRes.body?.address === 'New Highway 500',
      'PUT /branches/:id edits branch cleanly',
      editBranchRes.body
    );

    // -------------------------------------------------------------------------
    // 4. DUPLICATE & INVALID INPUT HANDLING
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Duplicate & Invalid Input Handling ---');

    // 4.1 Duplicate name update rejection
    const dupRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { name: 'Engineering' }); // Engineering already exists in tenant-default-001

    assertTest(dupRes.status === 400 && dupRes.body?.error?.includes('already exists'),
      'PUT duplicate name is rejected with HTTP 400 (not 500)',
      dupRes.body
    );

    // 4.2 Only invalid fields rejection
    const invalidFieldsOnlyRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { maliciousField: 'drop table', fakeCol: 1234 });

    assertTest(invalidFieldsOnlyRes.status === 400 && invalidFieldsOnlyRes.body?.error?.includes('No valid updatable fields'),
      'PUT with only unsupported fields is rejected with HTTP 400',
      invalidFieldsOnlyRes.body
    );

    // 4.3 Unsupported field along with valid field
    const mixedFieldsRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'active', updatedBy: 'attacker-id', extraUnsupportedCol: 'ignored' });

    assertTest(mixedFieldsRes.status === 200 && mixedFieldsRes.body?.status === 'active',
      'PUT with unsupported fields alongside valid fields safely strips unsupported fields and succeeds (HTTP 200)',
      mixedFieldsRes.body
    );

    // -------------------------------------------------------------------------
    // 5. TENANT ISOLATION (CROSS-TENANT REJECTION)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Tenant Isolation ---');
    // Tenant B attempts to update Tenant A's designation
    const crossTenantUpdateRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
    }, { status: 'inactive' });

    assertTest(crossTenantUpdateRes.status === 404 && crossTenantUpdateRes.body?.error === 'Designation not found',
      'Cross-tenant update is strictly rejected with HTTP 404',
      crossTenantUpdateRes.body
    );

    // Tenant B attempts to delete Tenant A's department
    const crossTenantDeleteRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });

    assertTest(crossTenantDeleteRes.status === 404 && crossTenantDeleteRes.body?.error === 'Department not found',
      'Cross-tenant delete is strictly rejected with HTTP 404',
      crossTenantDeleteRes.body
    );

    // -------------------------------------------------------------------------
    // 6. DEPENDENCY GUARDS ON DELETE
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Dependency Guards On Delete ---');
    const deptsList = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/departments',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const engDept = deptsList.body.data?.find((d) => d.name === 'Engineering');

    const deleteReferencedDept = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${engDept.id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });

    assertTest(deleteReferencedDept.status === 409 && deleteReferencedDept.body?.referenced === true,
      'DELETE referenced Department returns HTTP 409 Conflict with dependency warning',
      deleteReferencedDept.body
    );

    // -------------------------------------------------------------------------
    // 7. AUDIT TRAIL VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Verifying Audit Trail in Database ---');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: userTenantA.tenantId,
        entityId: testDesigId,
      },
      orderBy: { createdAt: 'desc' },
    });

    assertTest(auditLogs.length > 0, 'AuditLog entries were persisted for Designation lifecycle');
    const updateLog = auditLogs.find((l) => l.action === 'DESIGNATION_UPDATE');
    assertTest(updateLog && updateLog.actorId === userTenantA.id,
      'AuditLog records actorId ("user-hr-001"), action ("DESIGNATION_UPDATE"), and entityType ("Designation")'
    );

    // -------------------------------------------------------------------------
    // 8. TEARDOWN DISPOSABLE TEST ENTITIES
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Cleanup of Disposable Test Records ---');
    if (testDesigId) {
      const del = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/organization/designations/${testDesigId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
      assertTest(del.status === 200, 'Cleaned up disposable designation');
    }
    if (testDeptId) {
      const del = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/organization/departments/${testDeptId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
      assertTest(del.status === 200, 'Cleaned up disposable department');
    }
    if (testBranchId) {
      const del = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/organization/branches/${testBranchId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
      assertTest(del.status === 200, 'Cleaned up disposable branch');
    }

  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================================');
  console.log(`Phase 3 Lifecycle Verification Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in Phase 3 test:', err);
  process.exit(1);
});
