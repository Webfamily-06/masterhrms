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

async function runCertTests() {
  console.log('================================================================================');
  console.log('🔬 SECTION 4: REAL CRUD RUNTIME TESTS & PERSISTENCE VERIFICATION');
  console.log('================================================================================\n');

  // Step 1: Pre-test Database Row Counts
  const preBranchCount = await prisma.branch.count({ where: { tenantId: userTenantA.tenantId } });
  const preDeptCount = await prisma.department.count({ where: { tenantId: userTenantA.tenantId } });
  const preDesigCount = await prisma.designation.count({ where: { tenantId: userTenantA.tenantId } });

  console.log(`Pre-test Database Counts for ${userTenantA.tenantId}:`);
  console.log(`  Branches:     ${preBranchCount}`);
  console.log(`  Departments:  ${preDeptCount}`);
  console.log(`  Designations: ${preDesigCount}\n`);

  const results = {
    designation: {},
    department: {},
    branch: {},
    security: {},
  };

  const timestamp = Date.now();
  let testDesigId = null;
  let testDeptId = null;
  let testBranchId = null;

  try {
    // =========================================================================
    // A. DESIGNATION CERTIFICATION
    // =========================================================================
    console.log('--- [A] Designation Real CRUD Certification ---');
    const desigName = `Cert Desig ${timestamp}`;

    // A1: Create
    const createDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/designations',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: desigName, status: 'inactive', description: 'Cert Initial Desc' });

    testDesigId = createDesigRes.body?.id;
    console.log(`  [A1] Create Inactive: HTTP ${createDesigRes.status}, ID: ${testDesigId}`);
    // Direct DB Verification
    const dbDesig1 = await prisma.designation.findUnique({ where: { id: testDesigId } });
    console.log(`       DB verification: name="${dbDesig1.name}", status="${dbDesig1.status}"`);
    results.designation.create = createDesigRes.status === 201 && dbDesig1.status === 'inactive';

    // A2: Read/List
    const listDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations?search=${encodeURIComponent(desigName)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    console.log(`  [A2] Read/List: HTTP ${listDesigRes.status}, Items found: ${listDesigRes.body?.data?.length}`);
    results.designation.read = listDesigRes.status === 200 && listDesigRes.body?.data?.some(d => d.id === testDesigId);

    // A3: Activate
    const activateDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { status: 'active' });
    const dbDesig2 = await prisma.designation.findUnique({ where: { id: testDesigId } });
    console.log(`  [A3] Activate: HTTP ${activateDesigRes.status}, DB status="${dbDesig2.status}", updatedAt=${dbDesig2.updatedAt}`);
    results.designation.activate = activateDesigRes.status === 200 && dbDesig2.status === 'active';

    // A4: De-activate
    const deactivateDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { status: 'inactive' });
    const dbDesig3 = await prisma.designation.findUnique({ where: { id: testDesigId } });
    console.log(`  [A4] De-activate: HTTP ${deactivateDesigRes.status}, DB status="${dbDesig3.status}"`);
    results.designation.deactivate = deactivateDesigRes.status === 200 && dbDesig3.status === 'inactive';

    // A5: Edit name and description
    const editDesigRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: `${desigName} Edited`, description: 'Cert Updated Desc' });
    const dbDesig4 = await prisma.designation.findUnique({ where: { id: testDesigId } });
    console.log(`  [A5] Edit: HTTP ${editDesigRes.status}, DB name="${dbDesig4.name}", desc="${dbDesig4.description}"`);
    results.designation.edit = editDesigRes.status === 200 && dbDesig4.name === `${desigName} Edited` && dbDesig4.description === 'Cert Updated Desc';

    // =========================================================================
    // B. DEPARTMENT CERTIFICATION
    // =========================================================================
    console.log('\n--- [B] Department Real CRUD Certification ---');
    const deptName = `Cert Dept ${timestamp}`;

    // B1: Create
    const createDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/departments',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: deptName, status: 'active', description: 'Cert Initial Dept Desc' });

    testDeptId = createDeptRes.body?.id;
    console.log(`  [B1] Create Active: HTTP ${createDeptRes.status}, ID: ${testDeptId}`);
    const dbDept1 = await prisma.department.findUnique({ where: { id: testDeptId } });
    console.log(`       DB verification: name="${dbDept1.name}", status="${dbDept1.status}"`);
    results.department.create = createDeptRes.status === 201 && dbDept1.status === 'active';

    // B2: Read/List
    const listDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments?search=${encodeURIComponent(deptName)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    console.log(`  [B2] Read/List: HTTP ${listDeptRes.status}, Items found: ${listDeptRes.body?.data?.length}`);
    results.department.read = listDeptRes.status === 200 && listDeptRes.body?.data?.some(d => d.id === testDeptId);

    // B3: De-activate
    const deactivateDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { status: 'inactive' });
    const dbDept2 = await prisma.department.findUnique({ where: { id: testDeptId } });
    console.log(`  [B3] De-activate: HTTP ${deactivateDeptRes.status}, DB status="${dbDept2.status}"`);
    results.department.deactivate = deactivateDeptRes.status === 200 && dbDept2.status === 'inactive';

    // B4: Re-activate
    const reactivateDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { status: 'active' });
    const dbDept3 = await prisma.department.findUnique({ where: { id: testDeptId } });
    console.log(`  [B4] Re-activate: HTTP ${reactivateDeptRes.status}, DB status="${dbDept3.status}"`);
    results.department.activate = reactivateDeptRes.status === 200 && dbDept3.status === 'active';

    // B5: Edit name and description
    const editDeptRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: `${deptName} Edited`, description: 'Cert Updated Dept Desc' });
    const dbDept4 = await prisma.department.findUnique({ where: { id: testDeptId } });
    console.log(`  [B5] Edit: HTTP ${editDeptRes.status}, DB name="${dbDept4.name}", desc="${dbDept4.description}"`);
    results.department.edit = editDeptRes.status === 200 && dbDept4.name === `${deptName} Edited`;

    // =========================================================================
    // C. BRANCH CERTIFICATION
    // =========================================================================
    console.log('\n--- [C] Branch Real CRUD Certification ---');
    const branchName = `Cert Branch ${timestamp}`;
    const branchCode = `CB${Math.floor(Math.random() * 899 + 100)}`;

    // C1: Create
    const createBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/organization/branches',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: branchName, code: branchCode, address: 'Cert Branch Address', phone: '+1-555-1111', status: 'active' });

    testBranchId = createBranchRes.body?.id;
    console.log(`  [C1] Create Active: HTTP ${createBranchRes.status}, ID: ${testBranchId}`);
    const dbBranch1 = await prisma.branch.findUnique({ where: { id: testBranchId } });
    console.log(`       DB verification: name="${dbBranch1.name}", code="${dbBranch1.code}", status="${dbBranch1.status}"`);
    results.branch.create = createBranchRes.status === 201 && dbBranch1.status === 'active';

    // C2: Read/List
    const listBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches?search=${encodeURIComponent(branchName)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    console.log(`  [C2] Read/List: HTTP ${listBranchRes.status}, Items found: ${listBranchRes.body?.data?.length}`);
    results.branch.read = listBranchRes.status === 200 && listBranchRes.body?.data?.some(b => b.id === testBranchId);

    // C3: De-activate
    const deactivateBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches/${testBranchId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { status: 'inactive' });
    const dbBranch2 = await prisma.branch.findUnique({ where: { id: testBranchId } });
    console.log(`  [C3] De-activate: HTTP ${deactivateBranchRes.status}, DB status="${dbBranch2.status}"`);
    results.branch.deactivate = deactivateBranchRes.status === 200 && dbBranch2.status === 'inactive';

    // C4: Re-activate
    const reactivateBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches/${testBranchId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { status: 'active' });
    const dbBranch3 = await prisma.branch.findUnique({ where: { id: testBranchId } });
    console.log(`  [C4] Re-activate: HTTP ${reactivateBranchRes.status}, DB status="${dbBranch3.status}"`);
    results.branch.activate = reactivateBranchRes.status === 200 && dbBranch3.status === 'active';

    // C5: Edit name and address
    const editBranchRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/branches/${testBranchId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: `${branchName} Edited`, address: 'New Street 999', phone: '+1-555-2222' });
    const dbBranch4 = await prisma.branch.findUnique({ where: { id: testBranchId } });
    console.log(`  [C5] Edit: HTTP ${editBranchRes.status}, DB name="${dbBranch4.name}", address="${dbBranch4.address}"`);
    results.branch.edit = editBranchRes.status === 200 && dbBranch4.name === `${branchName} Edited`;

    // =========================================================================
    // D. VALIDATION, DEPENDENCY GUARDS & TENANT ISOLATION
    // =========================================================================
    console.log('\n--- [D] Validation, Dependency & Isolation Certification ---');

    // D1: Duplicate Name Validation
    const dupRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { name: 'Engineering' });
    console.log(`  [D1] Duplicate Validation: HTTP ${dupRes.status}, error: "${dupRes.body?.error}"`);
    results.security.duplicateValidation = dupRes.status === 400 && dupRes.body?.error?.includes('already exists');

    // D2: Invalid-only payload rejection
    const invalidOnlyRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    }, { nonExistentField: true, injectedSql: 'DROP TABLE' });
    console.log(`  [D2] Invalid Payload Rejection: HTTP ${invalidOnlyRes.status}, error: "${invalidOnlyRes.body?.error}"`);
    results.security.invalidPayloadRejection = invalidOnlyRes.status === 400 && invalidOnlyRes.body?.error?.includes('No valid updatable fields');

    // D3: Dependency Conflict Handling on Delete (Engineering Dept has assigned employees)
    const engDept = await prisma.department.findFirst({ where: { name: 'Engineering', tenantId: userTenantA.tenantId } });
    const depConflictRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${engDept.id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    console.log(`  [D3] Dependency Conflict: HTTP ${depConflictRes.status}, referenced: ${depConflictRes.body?.referenced}`);
    results.security.dependencyGuard = depConflictRes.status === 409 && depConflictRes.body?.referenced === true;

    // D4: Cross-Tenant Access Rejection (Tenant B attempts to update Tenant A record)
    const crossUpdateRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/designations/${testDesigId}`,
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
    }, { status: 'inactive' });
    console.log(`  [D4] Cross-Tenant Update Rejection: HTTP ${crossUpdateRes.status}, error: "${crossUpdateRes.body?.error}"`);
    results.security.crossTenantUpdate = crossUpdateRes.status === 404;

    // D5: Cross-Tenant Delete Rejection
    const crossDeleteRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/organization/departments/${testDeptId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    console.log(`  [D5] Cross-Tenant Delete Rejection: HTTP ${crossDeleteRes.status}`);
    results.security.crossTenantDelete = crossDeleteRes.status === 404;

    // =========================================================================
    // E. CLEANUP OF TEST RECORDS & POST-TEST AUDIT
    // =========================================================================
    console.log('\n--- [E] Cleanup & Final Data Integrity Check ---');
    if (testDesigId) {
      const delDesig = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/organization/designations/${testDesigId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
      const dbCheck = await prisma.designation.findUnique({ where: { id: testDesigId } });
      console.log(`  Cleaned up test designation: HTTP ${delDesig.status}, DB exists=${Boolean(dbCheck)}`);
      results.designation.delete = delDesig.status === 200 && dbCheck === null;
    }

    if (testDeptId) {
      const delDept = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/organization/departments/${testDeptId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
      const dbCheck = await prisma.department.findUnique({ where: { id: testDeptId } });
      console.log(`  Cleaned up test department: HTTP ${delDept.status}, DB exists=${Boolean(dbCheck)}`);
      results.department.delete = delDept.status === 200 && dbCheck === null;
    }

    if (testBranchId) {
      const delBranch = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/organization/branches/${testBranchId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` },
      });
      const dbCheck = await prisma.branch.findUnique({ where: { id: testBranchId } });
      console.log(`  Cleaned up test branch: HTTP ${delBranch.status}, DB exists=${Boolean(dbCheck)}`);
      results.branch.delete = delBranch.status === 200 && dbCheck === null;
    }

    // Post-test Database Counts
    const postBranchCount = await prisma.branch.count({ where: { tenantId: userTenantA.tenantId } });
    const postDeptCount = await prisma.department.count({ where: { tenantId: userTenantA.tenantId } });
    const postDesigCount = await prisma.designation.count({ where: { tenantId: userTenantA.tenantId } });

    console.log(`\nPost-test Database Counts for ${userTenantA.tenantId}:`);
    console.log(`  Branches:     ${postBranchCount} (Delta: ${postBranchCount - preBranchCount})`);
    console.log(`  Departments:  ${postDeptCount} (Delta: ${postDeptCount - preDeptCount})`);
    console.log(`  Designations: ${postDesigCount} (Delta: ${postDesigCount - preDesigCount})`);

    const dataIntegrityPassed = (
      postBranchCount === preBranchCount &&
      postDeptCount === preDeptCount &&
      postDesigCount === preDesigCount
    );

    console.log(`\nDatabase Zero-Leak Data Integrity Passed: ${dataIntegrityPassed ? 'YES (100% CLEAN)' : 'FAILED'}`);
    results.dataIntegrity = {
      preCounts: { branch: preBranchCount, dept: preDeptCount, desig: preDesigCount },
      postCounts: { branch: postBranchCount, dept: postDeptCount, desig: postDesigCount },
      zeroLeak: dataIntegrityPassed,
    };

    fs.writeFileSync('scripts/crud_runtime_certification_results.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log('Results saved to scripts/crud_runtime_certification_results.json');

  } finally {
    await prisma.$disconnect();
  }
}

runCertTests().catch((err) => {
  console.error('Certification tests crashed:', err);
  process.exit(1);
});

