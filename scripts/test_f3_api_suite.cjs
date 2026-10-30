const path = require('path');
const jwt = require('../server/node_modules/jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const API_URL = 'http://localhost:4000/api/v1';

const tenant1 = 'tenant-default-001';
const tenant2 = 'tenant-other-999';

// 1. HR Admin in Tenant 1
const hrAdmin = {
  userId: 'user-hr-admin-001',
  tenantId: tenant1,
  roles: ['admin', 'hr_admin'],
};
const hrToken = jwt.sign(hrAdmin, JWT_SECRET, { expiresIn: '1h' });

// 2. Regular Employee in Tenant 1
const employee1 = {
  userId: 'user-emp-001',
  tenantId: tenant1,
  roles: ['employee'],
};
const emp1Token = jwt.sign(employee1, JWT_SECRET, { expiresIn: '1h' });

// 3. User in Tenant 2 (Foreign Tenant)
const foreignUser = {
  userId: 'user-foreign-002',
  tenantId: tenant2,
  roles: ['employee'],
};
const foreignToken = jwt.sign(foreignUser, JWT_SECRET, { expiresIn: '1h' });

async function req(url, options = {}, token = hrToken) {
  const headers = {
    Authorization: token ? `Bearer ${token}` : undefined,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function run() {
  console.log('================================================================');
  console.log('MASTERHRMS — PHASE F3 API & COLLABORATION VERIFICATION SUITE');
  console.log('================================================================');

  // Step 0: Ensure Tenant and User profiles exist in DB for tenant1 and tenant2
  await prisma.tenant.upsert({
    where: { id: tenant1 },
    create: { id: tenant1, name: 'Default Tenant', slug: 'default-tenant' },
    update: {},
  });
  await prisma.tenant.upsert({
    where: { id: tenant2 },
    create: { id: tenant2, name: 'Other Tenant', slug: 'other-tenant' },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: hrAdmin.userId },
    create: { id: hrAdmin.userId, email: 'hr.admin@tenant1.com', passwordHash: 'hash' },
    update: {},
  });
  await prisma.profile.upsert({
    where: { userId: hrAdmin.userId },
    create: { userId: hrAdmin.userId, email: 'hr.admin@tenant1.com', fullName: 'HR Admin One', tenantId: tenant1 },
    update: { tenantId: tenant1 },
  });

  await prisma.user.upsert({
    where: { id: employee1.userId },
    create: { id: employee1.userId, email: 'emp1@tenant1.com', passwordHash: 'hash' },
    update: {},
  });
  await prisma.profile.upsert({
    where: { userId: employee1.userId },
    create: { userId: employee1.userId, email: 'emp1@tenant1.com', fullName: 'Employee One', tenantId: tenant1 },
    update: { tenantId: tenant1 },
  });

  await prisma.user.upsert({
    where: { id: foreignUser.userId },
    create: { id: foreignUser.userId, email: 'foreign@tenant2.com', passwordHash: 'hash' },
    update: {},
  });
  await prisma.profile.upsert({
    where: { userId: foreignUser.userId },
    create: { userId: foreignUser.userId, email: 'foreign@tenant2.com', fullName: 'Foreign User', tenantId: tenant2 },
    update: { tenantId: tenant2 },
  });

  console.log('✓ Test user profiles established in database.');

  // Test 1: Create a file as HR Admin
  console.log('\n--- 1. File Creation & Privacy by Default ---');
  const folder = await req('/files/folder', {
    method: 'POST',
    body: JSON.stringify({ name: `Collab_Folder_${Date.now()}` }),
  }, hrToken);
  console.log('✓ Created folder:', folder.id, folder.fileName);

  // Verify Employee 1 CANNOT see folder before it is shared (Privacy by default -> 404)
  try {
    await req(`/files/nodes/${folder.id}`, {}, emp1Token);
    throw new Error('Employee should not be able to access private folder before share!');
  } catch (err) {
    if (err.status === 404) {
      console.log('✓ PASS: Employee returned 404 (Privacy by Default preserved).');
    } else {
      throw err;
    }
  }

  // Test 2: Grant ACL to Employee 1
  console.log('\n--- 2. Internal ACL Grant & Permissions ---');
  const acl = await req(`/files/${folder.id}/acls`, {
    method: 'POST',
    body: JSON.stringify({
      principalType: 'USER',
      principalId: employee1.userId,
      permission: 'EDITOR',
      inherit: true,
    }),
  }, hrToken);
  console.log('✓ Granted EDITOR ACL to Employee 1:', acl.id, acl.permission);

  // Verify Employee 1 CAN now access the folder
  const empAccess = await req(`/files/nodes/${folder.id}`, {}, emp1Token);
  console.log('✓ PASS: Employee 1 can now access folder. Resolved permission:', empAccess.userPermission);
  if (empAccess.userPermission !== 'EDITOR') {
    throw new Error(`Expected EDITOR but received ${empAccess.userPermission}`);
  }

  // Test 3: Cross-Tenant Principal Rejection
  console.log('\n--- 3. Cross-Tenant Principal Isolation ---');
  try {
    await req(`/files/${folder.id}/acls`, {
      method: 'POST',
      body: JSON.stringify({
        principalType: 'USER',
        principalId: foreignUser.userId,
        permission: 'VIEWER',
      }),
    }, hrToken);
    throw new Error('Expected 400 when attempting to grant ACL to cross-tenant user!');
  } catch (err) {
    if (err.status === 400) {
      console.log('✓ PASS: Cross-tenant ACL grant rejected with 400 Bad Request.');
    } else {
      throw err;
    }
  }

  // Test 4: Permission Inheritance to Subfolder
  console.log('\n--- 4. Upward Permission Inheritance ---');
  const subfolder = await req('/files/folder', {
    method: 'POST',
    body: JSON.stringify({ name: `Subfolder_${Date.now()}`, parentId: folder.id }),
  }, hrToken);
  console.log('✓ Created subfolder inside shared folder:', subfolder.id, subfolder.fileName);

  // Employee 1 should inherit EDITOR permission on subfolder
  const subfolderAccess = await req(`/files/nodes/${subfolder.id}`, {}, emp1Token);
  console.log('✓ PASS: Employee 1 inherited permission on subfolder:', subfolderAccess.userPermission);
  if (subfolderAccess.userPermission !== 'EDITOR') {
    throw new Error(`Expected inherited EDITOR but received ${subfolderAccess.userPermission}`);
  }

  // Test 5: Principal Search Endpoint
  console.log('\n--- 5. Principal Autocomplete Search ---');
  const searchResults = await req('/files/principals/search?q=employee', {}, hrToken);
  console.log(`✓ Principal search returned ${searchResults.users?.length || 0} user(s).`);
  if (!searchResults.users?.some((u) => u.id === employee1.userId)) {
    throw new Error('Employee 1 was not found in principal search results.');
  }

  // Test 6: Team Folders & Membership Lifecycle
  console.log('\n--- 6. Team Folders Lifecycle ---');
  const team = await req('/files/teams', {
    method: 'POST',
    body: JSON.stringify({ name: `Engineering_Team_${Date.now()}`, description: 'Core Engineering' }),
  }, hrToken);
  console.log('✓ Created team:', team.id, team.name, 'with rootFolderId:', team.rootFolderId);

  // Add Employee 1 to Team as CONTRIBUTOR
  console.log('Adding Employee 1 to Team as CONTRIBUTOR...');
  const member = await req(`/files/teams/${team.id}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId: employee1.userId, role: 'CONTRIBUTOR' }),
  }, hrToken);
  console.log('✓ Member added:', member.userId, member.role);

  // Verify Employee 1 has access to team root folder
  const teamFolderAccess = await req(`/files/nodes/${team.rootFolderId}`, {}, emp1Token);
  console.log('✓ PASS: Employee 1 has access to team folder. Resolved permission:', teamFolderAccess.userPermission);

  // Remove Employee 1 from Team
  console.log('Removing Employee 1 from Team...');
  await req(`/files/teams/${team.id}/members/${employee1.userId}`, { method: 'DELETE' }, hrToken);
  console.log('✓ Employee 1 removed from team.');

  // Verify Employee 1 access to team folder is immediately revoked
  try {
    await req(`/files/nodes/${team.rootFolderId}`, {}, emp1Token);
    throw new Error('Employee 1 should not have access to team folder after removal!');
  } catch (err) {
    if (err.status === 404) {
      console.log('✓ PASS: Team folder access immediately revoked (404).');
    } else {
      throw err;
    }
  }

  // Safe team deletion (underlying folder NOT deleted)
  console.log('Deleting team safely...');
  await req(`/files/teams/${team.id}`, { method: 'DELETE' }, hrToken);
  console.log('✓ Team deleted.');
  const preservedFolder = await req(`/files/nodes/${team.rootFolderId}`, {}, hrToken);
  console.log('✓ PASS: Underlying folder preserved after team deletion! (id:', preservedFolder.id, ')');

  // Test 7: Public Links Security, Expiry, Password Protection
  console.log('\n--- 7. Cryptographically Secure External Public Links ---');
  const publicLink = await req(`/files/${subfolder.id}/public-link`, {
    method: 'POST',
    body: JSON.stringify({
      password: 'SecurePassword123!',
      allowDownload: true,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }),
  }, hrToken);
  console.log('✓ Created public link with token:', publicLink.token.slice(0, 16) + '...');
  console.log('  isPasswordProtected:', publicLink.isPasswordProtected);

  // Access public link anonymously (no JWT)
  const anonymousInfo = await req(`/public/files/link/${publicLink.token}`, {}, null);
  console.log('✓ PASS: Anonymous visitor retrieved link info without auth.');
  console.log('  requiresPassword:', anonymousInfo.requiresPassword);
  if (!anonymousInfo.requiresPassword) {
    throw new Error('Public link should require password!');
  }

  // Verify password protection on download
  try {
    await req(`/public/files/link/${publicLink.token}/download`, {
      method: 'POST',
      body: JSON.stringify({ password: 'WrongPassword' }),
    }, null);
    throw new Error('Expected 401 on incorrect password!');
  } catch (err) {
    if (err.status === 401) {
      console.log('✓ PASS: Incorrect password rejected with 401.');
    } else {
      throw err;
    }
  }

  // Provide correct password
  const downloadRes = await req(`/public/files/link/${publicLink.token}/download`, {
    method: 'POST',
    body: JSON.stringify({ password: 'SecurePassword123!' }),
  }, null);
  console.log('✓ PASS: Correct password verified. Issued signed download URL.');
  console.log('  expiresInSeconds:', downloadRes.expiresInSeconds);

  // Revoke public link
  console.log('Revoking public link...');
  await req(`/files/${subfolder.id}/public-link`, { method: 'DELETE' }, hrToken);
  console.log('✓ Public link revoked.');

  // Verify revoked link returns 404
  try {
    await req(`/public/files/link/${publicLink.token}`, {}, null);
    throw new Error('Expected 404 on revoked public link!');
  } catch (err) {
    if (err.status === 404) {
      console.log('✓ PASS: Revoked link returns 404 Not Found.');
    } else {
      throw err;
    }
  }

  // Clean up test folder
  await req('/files/purge', {
    method: 'POST',
    body: JSON.stringify({ ids: [folder.id, subfolder.id, team.rootFolderId] }),
  }, hrToken);
  console.log('✓ Cleaned up test records.');

  console.log('\n================================================================');
  console.log('ALL PHASE F3 API & COLLABORATION CHECKS PASSED EMPIRICALLY!');
  console.log('================================================================');
}

run()
  .catch((err) => {
    console.error('\n❌ F3 API Suite Failed:', err.data || err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
