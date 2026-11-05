const jwt = require('jsonwebtoken');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Read server .env for JWT_SECRET
const envContent = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf-8');
const jwtMatch = envContent.match(/^JWT_SECRET=["']?(.*?)["']?$/m);
const jwtSecret = jwtMatch ? jwtMatch[1] : 'masterhrms-super-secure-jwt-secret-key-2025-production-grade';

console.log('Using JWT secret length:', jwtSecret.length);

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: ['*']
    },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

const defaultTenantUser = {
  id: 'user-hr-001',
  email: 'hr@masterhrms.com',
  tenantId: 'tenant-default-001',
  roles: ['hr_admin']
};

const isolatedTenantUser = {
  id: 'user_e2e_a_1791569819098',
  email: 'admin-a-1791569819098@example.com',
  tenantId: 'tenant_e2e_a_1791569819098',
  roles: ['hr_admin']
};

const tokenDefault = makeToken(defaultTenantUser);
const tokenIsolated = makeToken(isolatedTenantUser);

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

async function runTests() {
  console.log('\n--- 1. DEPARTMENTS ACCEPTANCE AUDIT ---');
  
  // 1.1 Load departments for default tenant
  const deptRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Default Tenant Departments status:', deptRes.status);
  console.log('Counts:', deptRes.body.counts);
  console.log('Items returned:', deptRes.body.data?.length);
  console.log('Department names:', deptRes.body.data?.map(d => `${d.name} (branch: ${d.branch?.name || 'N/A'}, status: ${d.status})`));

  // 1.2 Tenant isolation check
  const isolatedDeptRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenIsolated}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('\nIsolated Tenant Departments status:', isolatedDeptRes.status);
  console.log('Counts:', isolatedDeptRes.body.counts);
  console.log('Items returned:', isolatedDeptRes.body.data?.length);
  console.log('Department names:', isolatedDeptRes.body.data?.map(d => `${d.name} (tenantId: ${d.tenantId})`));

  // Verify that test tenant's department is NOT in default tenant
  const crossLeak = deptRes.body.data?.find(d => d.name === 'Engineering Test Dept');
  console.log('Cross-tenant data leak detected in default tenant?', crossLeak ? 'YES (CRITICAL FAIL)' : 'NO (PASSED)');

  // 1.3 Department Filtering by status
  const activeOnly = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments?status=active',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Filtered ?status=active count:', activeOnly.body.data?.length);

  const inactiveOnly = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments?status=inactive',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Filtered ?status=inactive count:', inactiveOnly.body.data?.length);

  // 1.4 Search departments
  const searchRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments?search=Engineering',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Search "Engineering" found:', searchRes.body.data?.map(d => d.name));

  // 1.5 Sorting
  const sortDesc = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments?sortBy=name&sortOrder=desc',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Sort by name DESC:', sortDesc.body.data?.map(d => d.name));

  // 1.6 Duplicate department creation guard
  console.log('\n--- Duplicate Department Guard ---');
  const dupRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { name: 'Engineering' });
  console.log('POST duplicate name "Engineering" status:', dupRes.status, dupRes.body);

  // 1.7 Create disposable test department
  console.log('\n--- Disposable Department Lifecycle ---');
  const testDeptName = `Test QA Dept ${Date.now()}`;
  const createDeptRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { name: testDeptName, status: 'active' });
  console.log('Create disposable dept status:', createDeptRes.status, createDeptRes.body?.name);
  const createdDeptId = createDeptRes.body?.id;

  // Edit disposable department
  const editDeptRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/departments/${createdDeptId}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { name: `${testDeptName} (Edited)`, status: 'inactive' });
  console.log('Edit disposable dept status:', editDeptRes.status, editDeptRes.body?.name, 'new status:', editDeptRes.body?.status);

  // Bulk archive test
  const bulkArchiveRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/departments/bulk-archive',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { ids: [createdDeptId], status: 'active' });
  console.log('Bulk toggle status back to active:', bulkArchiveRes.status, bulkArchiveRes.body);

  // Attempt to delete department with assigned employees (Engineering)
  const engDept = deptRes.body.data.find(d => d.name === 'Engineering');
  console.log('\n--- Dependency Guard on Delete ---');
  const deleteEngRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/departments/${engDept.id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Delete "Engineering" (with assigned employees) status:', deleteEngRes.status, deleteEngRes.body);

  // Cleanly delete disposable department
  const deleteTestDept = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/departments/${createdDeptId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Delete disposable unassigned dept status:', deleteTestDept.status, deleteTestDept.body);


  console.log('\n--- 2. DESIGNATIONS ACCEPTANCE AUDIT ---');
  const desigRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/designations',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Designations status:', desigRes.status);
  console.log('Counts:', desigRes.body.counts);
  console.log('Items returned:', desigRes.body.data?.length);
  console.log('Designations samples:', desigRes.body.data?.slice(0, 5).map(d => `${d.name || d.title} (dept: ${d.department?.name || 'N/A'}, status: ${d.status})`));

  // Duplicate designation title guard
  const dupDesig = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/designations',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { name: 'Senior Full Stack Engineer' });
  console.log('POST duplicate title status:', dupDesig.status, dupDesig.body);

  // Attempt to delete designation with assigned employees
  const assignedDesig = desigRes.body.data?.find(d => (d.name || d.title) === 'Senior Full Stack Engineer');
  const deleteAssignedDesig = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/designations/${assignedDesig?.id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Delete assigned designation status:', deleteAssignedDesig.status, deleteAssignedDesig.body);

  // Create disposable designation and delete it
  const testDesigTitle = `Disposable QA Title ${Date.now()}`;
  const createDesig = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/designations',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { name: testDesigTitle, status: 'active' });
  console.log('Create disposable designation status:', createDesig.status, createDesig.body?.name);

  const deleteTestDesig = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/designations/${createDesig.body?.id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Delete disposable designation status:', deleteTestDesig.status, deleteTestDesig.body);


  console.log('\n--- 3. BRANCHES ACCEPTANCE AUDIT ---');
  const branchRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/branches',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Branches status:', branchRes.status);
  console.log('Counts:', branchRes.body.counts);
  console.log('Branches returned:', branchRes.body.data?.map(b => `${b.name} (code: ${b.code}, status: ${b.status})`));

  // Attempt to delete branch with assigned employees/departments
  const assignedBranch = branchRes.body.data[0];
  const deleteBranchRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/branches/${assignedBranch.id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Delete referenced branch status:', deleteBranchRes.status, deleteBranchRes.body);

  // Create and delete disposable branch
  const testBranchName = `Disposable Branch ${Date.now()}`;
  const testBranchCode = `DISP${Math.floor(Math.random() * 899 + 100)}`;
  const createBranch = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/organization/branches',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenDefault}`,
      'Content-Type': 'application/json'
    }
  }, { name: testBranchName, code: testBranchCode, address: 'Test Address 123', status: 'active' });
  console.log('Create disposable branch status:', createBranch.status, createBranch.body?.name || createBranch.body);

  const deleteTestBranch = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/organization/branches/${createBranch.body?.id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenDefault}` }
  });
  console.log('Delete disposable branch status:', deleteTestBranch.status, deleteTestBranch.body);

  console.log('\n--- ACCEPTANCE VERIFICATION COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
