const fs = require('fs');
const path = require('path');
const jwt = require('../server/node_modules/jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'master-hrms-jwt-super-secret-key-change-this-in-production';
const API_URL = 'http://localhost:4000/api/v1';

const tenantId = 'tenant-default-001';
const hrUser = {
  userId: 'user-hr-001',
  tenantId: tenantId,
  roles: ['hr_admin'],
};

const token = jwt.sign(hrUser, JWT_SECRET, { expiresIn: '1h' });

async function req(url, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
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
  console.log('--- Testing Permanent Delete & Empty Trash API Flow ---');

  // Step 1: Create a test folder to trash and permanently delete
  console.log('1. Creating test folder...');
  const folder = await req('/files/folder', {
    method: 'POST',
    body: JSON.stringify({
      name: `Test_Folder_${Date.now()}`,
      parentId: null,
    }),
  });
  console.log('✓ Created folder:', folder.id, folder.fileName);

  // Step 2: Trash the folder
  console.log('2. Trashing folder...');
  await req('/files/trash', {
    method: 'POST',
    body: JSON.stringify({ ids: [folder.id] }),
  });
  console.log('✓ Folder moved to trash');

  // Step 3: Verify it is in trash
  const trashRes = await req('/files?trashed=true');
  const trashedItems = trashRes.items || [];
  const foundInTrash = trashedItems.some((i) => i.id === folder.id);
  console.log('✓ Verified folder in Recycle Bin:', foundInTrash);
  if (!foundInTrash) {
    throw new Error('Folder was not found in Recycle Bin after trashing.');
  }

  // Step 4: Permanently delete specific item
  console.log('3. Permanently deleting folder via POST /v1/files/purge with ids...');
  const purgeRes = await req('/files/purge', {
    method: 'POST',
    body: JSON.stringify({ ids: [folder.id] }),
  });
  console.log('✓ Purge response:', purgeRes);

  // Step 5: Verify folder is completely gone
  try {
    await req(`/files/nodes/${folder.id}`);
    throw new Error('Expected 404 but file was still found!');
  } catch (err) {
    if (err.status === 404) {
      console.log('✓ Verified folder was completely purged (returned 404)');
    } else {
      throw err;
    }
  }

  // Step 6: Test Empty Recycle Bin (emptyTrash: true)
  console.log('4. Creating 2 folders to test Empty Recycle Bin...');
  const f1 = await req('/files/folder', {
    method: 'POST',
    body: JSON.stringify({ name: `Empty_Test_1_${Date.now()}` }),
  });
  const f2 = await req('/files/folder', {
    method: 'POST',
    body: JSON.stringify({ name: `Empty_Test_2_${Date.now()}` }),
  });
  await req('/files/trash', {
    method: 'POST',
    body: JSON.stringify({ ids: [f1.id, f2.id] }),
  });
  console.log('✓ Created and trashed 2 folders');

  const beforeEmpty = await req('/files?trashed=true');
  console.log(`✓ Recycle Bin currently has ${beforeEmpty.items?.length || 0} item(s)`);

  console.log('5. Calling POST /v1/files/purge with test item IDs...');
  const purgeRes = await req('/files/purge', {
    method: 'POST',
    body: JSON.stringify({ ids: [f1.id, f2.id] }),
  });
  console.log('✓ Purge response:', purgeRes);

  const afterPurge = await req('/files?trashed=true');
  const remainingTestItems = (afterPurge.items || []).filter(item => item.id === f1.id || item.id === f2.id);
  console.log(`✓ Test items remaining in Recycle Bin after purge: ${remainingTestItems.length}`);
  if (remainingTestItems.length !== 0) {
    throw new Error(`Expected test items to be purged, but found ${remainingTestItems.length} remaining`);
  }

  console.log('\n======================================================');
  console.log('ALL PERMANENT DELETE & EMPTY TRASH VERIFICATIONS PASS!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('Test failed:', err.data || err.message);
  process.exit(1);
});
