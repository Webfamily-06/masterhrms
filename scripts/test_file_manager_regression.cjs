const { PrismaClient } = require('@prisma/client');
const http = require('http');
const path = require('path');
const fs = require('fs');
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
      roles: user.roles || ['tenant_admin', 'hr_admin'],
      permissions: user.permissions || ['*', 'files.admin.view_all'],
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

async function runFileManagerRegression() {
  console.log('================================================================');
  console.log('EMPIRICAL AUDIT: FILE MANAGER INTEGRITY & ISOLATION');
  console.log('================================================================\n');

  const tenantA = 'tenant-default-001';
  const tenantB = 'test-tenant-a-1791393008227';

  const sessionHrA = await prisma.deviceSession.create({
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
    roles: ['tenant_admin', 'hr_admin', 'admin'],
    permissions: ['*', 'files.admin.view_all']
  }, sessionHrA.id);

  const sessionEmpA = await prisma.deviceSession.create({
    data: {
      userId: 'user-emp-001',
      tenantId: tenantA,
      deviceType: 'desktop',
      browser: 'Test',
      revoked: false,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const empTokenA = makeToken({
    id: 'user-emp-001',
    email: 'employee@masterhrms.com',
    tenantId: tenantA,
    roles: ['employee'],
    permissions: []
  }, sessionEmpA.id);

  // Find a real user in Tenant B
  let userB = await prisma.user.findFirst({
    where: { roles: { some: { tenantId: tenantB } } }
  });
  if (!userB) {
    userB = await prisma.user.findFirst({
      where: { profile: { tenantId: tenantB } }
    });
  }
  const userBId = userB ? userB.id : 'user-hr-b';
  const sessionHrB = await prisma.deviceSession.create({
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
    roles: ['tenant_admin', 'hr_admin', 'admin'],
    permissions: ['*', 'files.admin.view_all']
  }, sessionHrB.id);

  // 1. Create root test folder in Tenant A
  console.log('1. Creating parent folder in Tenant A (POST /api/v1/files/folders)...');
  const parentFolderRes = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/v1/files/folders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hrTokenA}`
    }
  }, {
    name: `Audit_Parent_Folder_${Date.now()}`,
    parentId: null
  });
  console.log(`   Parent folder status: ${parentFolderRes.status}`);
  const parentId = parentFolderRes.body?.id;
  console.log(`   Created Parent Folder ID: ${parentId}`);

  // 2. Create nested child folder inside parent folder
  console.log('\n2. Creating nested child folder inside parent folder...');
  const childFolderRes = await request({
    host: 'localhost',
    port: 4000,
    path: '/api/v1/files/folders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hrTokenA}`
    }
  }, {
    name: `Audit_Child_Folder_${Date.now()}`,
    parentId: parentId
  });
  console.log(`   Child folder status: ${childFolderRes.status}`);
  const childId = childFolderRes.body?.id;
  console.log(`   Created Child Folder ID: ${childId}`);

  // 3. Query parent folder contents (parentId = parentId)
  console.log('\n3. Querying contents of parent folder (GET /api/v1/files?parentId=' + parentId + ')...');
  const parentContentsRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/v1/files?parentId=${parentId}&view=org`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${hrTokenA}`
    }
  });
  console.log(`   Parent contents status: ${parentContentsRes.status}`);
  const parentItems = parentContentsRes.body?.items || [];
  const foundChild = parentItems.some(i => i.id === childId);
  console.log(`   Found nested child folder in parent contents: ${foundChild ? 'PASS' : 'FAIL'} (items count: ${parentItems.length})`);

  // 4. Role Scoping: Verify view=org vs view=my
  console.log('\n4. Testing Role-Scoped Views: HR (view=org) vs Employee (view=my)...');
  const hrViewRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/v1/files?view=org`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hrTokenA}` }
  });
  console.log(`   HR view=org status: ${hrViewRes.status} (item count: ${(hrViewRes.body?.items || []).length})`);

  const empViewRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/v1/files?view=my`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empTokenA}` }
  });
  console.log(`   Employee view=my status: ${empViewRes.status} (item count: ${(empViewRes.body?.items || []).length})`);

  // 5. Cross-Tenant Folder Access Protection
  console.log('\n5. Testing Cross-Tenant Access Protection (Tenant B user accessing Tenant A folder)...');
  const crossTenantGet = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/v1/files/nodes/${parentId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hrTokenB}` }
  });
  console.log(`   Tenant B accessing Tenant A node status: ${crossTenantGet.status} (Expected 404/403: ${crossTenantGet.status === 404 || crossTenantGet.status === 403 ? 'PASS' : 'FAIL'})`);

  const crossTenantQuery = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/v1/files?parentId=${parentId}&view=org`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hrTokenB}` }
  });
  const crossTenantItems = crossTenantQuery.body?.items || [];
  console.log(`   Tenant B listing Tenant A parentId contents count: ${crossTenantItems.length} (Expected 0 leaks: ${crossTenantItems.length === 0 ? 'PASS' : 'FAIL'})`);

  // 6. Cleanup
  if (childId) await prisma.fileNode.delete({ where: { id: childId } }).catch(() => {});
  if (parentId) await prisma.fileNode.delete({ where: { id: parentId } }).catch(() => {});
  console.log('\nFile Manager regression cleanup completed.');
}

runFileManagerRegression().finally(() => prisma.$disconnect());
