/**
 * MASTERHRMS — PHASE F4-F AUTOMATED E2E VERIFICATION SUITE
 * Enterprise Storage Retention Policy Automation & Legal Hold Governance
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const jwt = require('../server/node_modules/jsonwebtoken');

const prisma = new PrismaClient();
const PORT = 4000;
const HOST = 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      const payload = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }

    req.end();
  });
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runF4FSuite() {
  const optIn =
    process.env.CONFIRM_RETENTION_E2E === 'true' ||
    process.env.ALLOW_DESTRUCTIVE_TESTS === 'true' ||
    process.argv.includes('--confirm') ||
    process.env.NODE_ENV !== 'production';
  if (!optIn) {
    console.error('Refusing to run destructive tests without explicit opt-in.');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('🚀 MASTERHRMS — PHASE F4-F AUTOMATED E2E VERIFICATION SUITE');
  console.log('Enterprise Storage Retention Policy Automation & Legal Holds');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [TEST ${totalTests}] PASS: ${testName}`);
    } else {
      console.error(`  ✗ [TEST ${totalTests}] FAIL: ${testName} - ${details}`);
    }
  }

  // 1. Setup Test Identities and Tenants
  const superAdmin =
    (await prisma.user.findFirst({
      where: { email: 'admin@masterhrms.com' },
    })) ||
    (await prisma.user.findFirst({
      where: { roles: { some: { role: 'super_admin' } } },
    }));

  const tenantA =
    (await prisma.tenant.findFirst({
      where: { id: 'tenant-default-001' },
      include: { subscription: true },
    })) || (await prisma.tenant.findFirst({ include: { subscription: true } }));

  const tenantAdminA =
    (await prisma.user.findFirst({
      where: { email: 'hr@masterhrms.com' },
    })) ||
    (await prisma.user.findFirst({
      where: {
        profile: { tenantId: tenantA.id },
        roles: { some: { role: { in: ['admin', 'hr_admin'] } } },
      },
    }));

  const employeeUser =
    (await prisma.user.findFirst({
      where: { email: 'employee@masterhrms.com' },
    })) ||
    (await prisma.user.findFirst({
      where: {
        profile: { tenantId: tenantA.id },
        roles: { none: { role: { in: ['super_admin', 'admin', 'hr_admin', 'owner', 'workspace_admin'] } } },
      },
    }));

  if (!superAdmin || !tenantA || !tenantAdminA || !employeeUser) {
    throw new Error('Required test identities missing from database');
  }

  // 1. Setup Test Identities and Tenants
  // Clean up any pre-existing test retention policies for tenantA to verify clean defaults
  await prisma.storageRetentionPolicy.deleteMany({
    where: { tenantId: tenantA.id },
  });

  // Find another tenant for cross-tenant isolation tests
  const tenantB = await prisma.tenant.findFirst({
    where: { id: { not: tenantA.id } },
  });

  let userB = null;
  if (tenantB) {
    userB = await prisma.user.findFirst({
      where: { profile: { tenantId: tenantB.id } },
      include: { profile: true },
    });
    if (!userB) {
      userB = await prisma.user.create({
        data: {
          email: `admin-tenant-b-${Date.now()}@test.com`,
          password: 'dummy-password-hash',
          profile: {
            create: {
              fullName: 'Admin Tenant B',
              tenantId: tenantB.id,
            },
          },
          roles: {
            create: {
              role: 'admin',
            },
          },
        },
        include: { profile: true },
      });
    }
  }

  const tenantAdminTokenA = generateToken({
    id: tenantAdminA.id,
    userId: tenantAdminA.id,
    email: tenantAdminA.email,
    tenantId: tenantA.id,
    roles: ['admin', 'hr_admin', 'tenantadmin'],
  });

  const tenantAdminTokenB = userB
    ? generateToken({
        id: userB.id,
        userId: userB.id,
        email: userB.email,
        tenantId: tenantB.id,
        roles: ['admin', 'tenantadmin'],
      })
    : null;

  const employeeToken = generateToken({
    id: employeeUser.id,
    userId: employeeUser.id,
    email: employeeUser.email,
    tenantId: tenantA.id,
    roles: ['employee'],
  });

  const superAdminToken = generateToken({
    id: superAdmin.id,
    userId: superAdmin.id,
    email: superAdmin.email,
    tenantId: null,
    roles: ['super_admin'],
  });

  console.log(`[SETUP] Active Tenant A: ${tenantA.name} (${tenantA.id})`);
  if (tenantB) console.log(`[SETUP] Active Tenant B: ${tenantB.name} (${tenantB.id})`);
  console.log(`[SETUP] Test tokens initialized.\n`);

  // =========================================================================
  // SUITE 1: POLICY CONFIGURATION & SAFE DEFAULTS
  // =========================================================================
  console.log('--- SUITE 1: Policy Configuration & Safe Defaults ---');

  // Test 1: Fetch Default Policy
  const res1 = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/tenant/storage/retention/policy',
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
  });
  assert(res1.status === 200, 'GET /api/v1/tenant/storage/retention/policy returns 200 OK');
  assert(
    res1.data.trashRetentionDays === 30,
    'Default trash retention days is 30 (F0 decision preserved)',
    `Got ${res1.data.trashRetentionDays}`
  );
  assert(
    res1.data.isEnabled === false,
    'Safe-by-default: Policy is initialized in DISABLED status',
    `Got ${res1.data.isEnabled}`
  );
  assert(
    res1.data.isDryRun === true,
    'Safe-by-default: Policy is initialized in DRY-RUN mode',
    `Got ${res1.data.isDryRun}`
  );

  // Test 2: Update Policy Configuration
  const res2 = await makeRequest(
    {
      host: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/retention/policy',
      method: 'PUT',
      headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
    },
    {
      trashRetentionDays: 45,
      versionRetentionDays: 90,
      maxVersionsPerFile: 5,
      cleanExpiredLinks: true,
      cleanAbandonedSessions: true,
      requiresApproval: false,
      isDryRun: true,
      isEnabled: true,
    }
  );
  assert(res2.status === 200, 'PUT /api/v1/tenant/storage/retention/policy updates configuration');
  assert(res2?.data?.policy?.trashRetentionDays === 45, 'Policy updated trashRetentionDays to 45');
  assert(res2?.data?.policy?.versionRetentionDays === 90, 'Policy updated versionRetentionDays to 90');
  assert(res2?.data?.policy?.maxVersionsPerFile === 5, 'Policy updated maxVersionsPerFile to 5');
  assert((res2?.data?.policy?.policyVersion ?? 0) >= 1, 'Policy tracks incrementing policyVersion');

  // Test 3: Validation Guardrails on Policy
  const res3 = await makeRequest(
    {
      host: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/retention/policy',
      method: 'PUT',
      headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
    },
    {
      trashRetentionDays: 0, // Invalid: must be >= 1
    }
  );
  assert(res3.status === 400, 'Policy rejects invalid retention duration (< 1 day)');

  // =========================================================================
  // SUITE 2: LEGAL HOLD LIFECYCLE & IMMUTABILITY PROTECTION
  // =========================================================================
  console.log('\n--- SUITE 2: Legal Hold Lifecycle & Immutability Protection ---');

  let testFileA = null;
  let holdId = null;

  try {
    // Create test files in Tenant A
    testFileA = await prisma.mediaFile.create({
      data: {
        tenantId: tenantA.id,
        fileName: 'f4f_legal_contract_2026.pdf',
        filePath: '/storage/contracts/f4f_legal_contract_2026.pdf',
        url: 'https://storage.local/contracts/f4f_legal_contract_2026.pdf',
        fileSize: 1048576, // 1 MB
        mimeType: 'application/pdf',
        checksumSha: 'sha256-f4f-test-001',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      },
    });

    // Create version for file
    await prisma.fileVersion.create({
      data: {
        fileId: testFileA.id,
        versionNo: 1,
        storageKey: `tenant/${tenantA.id}/${testFileA.id}/v1`,
        sizeBytes: BigInt(1048576),
        createdBy: 'test-user',
        isCurrent: true,
      },
    });

    // Test 4: Place Legal Hold on File
    const resHoldCreate = await makeRequest(
      {
        host: HOST,
        port: PORT,
        path: '/api/v1/tenant/storage/retention/holds',
        method: 'POST',
        headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
      },
      {
        fileId: testFileA.id,
        reason: 'Audit Hold: SEC Litigation Pending #8839',
        holdScope: 'FILE',
      }
    );
    assert(resHoldCreate.status === 200, 'POST /api/v1/tenant/storage/retention/holds places legal hold');
    assert(resHoldCreate?.data?.hold?.reason?.includes('SEC Litigation'), 'Legal hold contains descriptive reason');
    holdId = resHoldCreate?.data?.hold?.id;

    // Test 5: List Legal Holds
    const resHoldList = await makeRequest({
      host: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/retention/holds',
      method: 'GET',
      headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
    });
    assert(resHoldList.status === 200, 'GET /api/v1/tenant/storage/retention/holds returns 200 OK');
    const foundHold = (resHoldList?.data?.holds || []).find(h => h.id === holdId);
    assert(!!foundHold, 'Active legal hold appears in tenant holds list');

    // Test 6: Direct Permanent Deletion is BLOCKED when Legal Hold is Active
    const resDelBlocked = await makeRequest({
      host: HOST,
      port: PORT,
      path: `/api/v1/files/nodes/${testFileA.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
    });
    assert(
      resDelBlocked.status === 403,
      'DELETE /api/v1/files/nodes/:id is strictly BLOCKED by active Legal Hold (403 Forbidden)',
      `Status: ${resDelBlocked.status}, body: ${JSON.stringify(resDelBlocked.data)}`
    );

    // Test 7: Release Legal Hold
    const resHoldRelease = await makeRequest(
      {
        host: HOST,
        port: PORT,
        path: `/api/v1/tenant/storage/retention/holds/${holdId}/release`,
        method: 'POST',
        headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
      },
      {
        releaseReason: 'Litigation matter settled, legal hold lifted by General Counsel',
      }
    );
    assert(resHoldRelease.status === 200, 'POST /api/v1/tenant/storage/retention/holds/:id/release succeeds');
    assert(!!resHoldRelease?.data?.hold?.releasedAt, 'Legal hold record marks releasedAt timestamp');
  } finally {
    // Clean up test file A safely in finally block
    if (testFileA) {
      await prisma.fileVersion.deleteMany({ where: { fileId: testFileA.id } });
      await prisma.storageLegalHold.deleteMany({ where: { fileId: testFileA.id } });
      await prisma.mediaFile.deleteMany({ where: { id: testFileA.id } });
    }
  }

  // =========================================================================
  // SUITE 3: CANDIDATE DISCOVERY & SAFETY EXCLUSION PIPELINE
  // =========================================================================
  console.log('\n--- SUITE 3: Candidate Discovery & Safety Exclusion Pipeline ---');

  let activeFile = null;
  let recentTrash = null;
  let eligibleTrash = null;
  let heldTrash = null;
  let refTrash = null;

  try {
    // 1. Active File (NEVER eligible for deletion by age)
    activeFile = await prisma.mediaFile.create({
      data: {
        tenantId: tenantA.id,
        fileName: 'active_business_doc.pdf',
        filePath: '/storage/active_business_doc.pdf',
        url: 'https://storage.local/active_business_doc.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
        checksumSha: 'sha256-active-doc',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days old
      },
    });

    // 2. Trash item BEFORE deadline (<30 days in trash)
    recentTrash = await prisma.mediaFile.create({
      data: {
        tenantId: tenantA.id,
        fileName: 'recent_trash.pdf',
        filePath: '/storage/recent_trash.pdf',
        url: 'https://storage.local/recent_trash.pdf',
        fileSize: 400000,
        mimeType: 'application/pdf',
        checksumSha: 'sha256-recent-trash',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    });

    // 3. Trash item PAST deadline (>30 days in trash, eligible!)
    eligibleTrash = await prisma.mediaFile.create({
      data: {
        tenantId: tenantA.id,
        fileName: 'expired_trash.pdf',
        filePath: '/storage/expired_trash.pdf',
        url: 'https://storage.local/expired_trash.pdf',
        fileSize: 600000,
        mimeType: 'application/pdf',
        checksumSha: 'sha256-expired-trash',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago (>45d cutoff)
      },
    });

    // 4. Trash item past deadline but PROTECTED by active Legal Hold
    heldTrash = await prisma.mediaFile.create({
      data: {
        tenantId: tenantA.id,
        fileName: 'held_expired_trash.pdf',
        filePath: '/storage/held_expired_trash.pdf',
        url: 'https://storage.local/held_expired_trash.pdf',
        fileSize: 700000,
        mimeType: 'application/pdf',
        checksumSha: 'sha256-held-trash',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000), // 65 days ago
      },
    });
    await prisma.storageLegalHold.create({
      data: {
        tenantId: tenantA.id,
        fileId: heldTrash.id,
        reason: 'DOJ Inquiry Active',
        createdBy: 'legal-counsel',
      },
    });

    // 5. Trash item past deadline but PROTECTED by MediaUsage reference
    refTrash = await prisma.mediaFile.create({
      data: {
        tenantId: tenantA.id,
        fileName: 'referenced_expired_trash.pdf',
        filePath: '/storage/referenced_expired_trash.pdf',
        url: 'https://storage.local/referenced_expired_trash.pdf',
        fileSize: 800000,
        mimeType: 'application/pdf',
        checksumSha: 'sha256-ref-trash',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000), // 70 days ago
      },
    });
    await prisma.mediaUsage.create({
      data: {
        mediaId: refTrash.id,
        entityType: 'PAYROLL_RECORD',
        entityId: 'pay-slip-001',
        fieldKey: 'attachment',
      },
    });

    // Test 8: Generate Dry-Run Candidate Preview
    const resPreview = await makeRequest({
      host: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/retention/preview',
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
    });
    assert(resPreview.status === 200, 'POST /api/v1/tenant/storage/retention/preview returns 200 OK');
    const sampleCandidates = resPreview?.data?.sampleCandidates || [];
    assert(
      sampleCandidates.some(c => c.id === eligibleTrash.id),
      'Candidate discovery identifies trash past retention deadline'
    );
    assert(
      !sampleCandidates.some(c => c.id === activeFile.id),
      'Safety Guard: Active file is NEVER in candidate list'
    );
    assert(
      !sampleCandidates.some(c => c.id === recentTrash.id),
      'Safety Guard: Trash item before retention deadline is excluded'
    );
    assert(
      !sampleCandidates.some(c => c.id === heldTrash.id),
      'Safety Guard: File under active Legal Hold is strictly excluded'
    );
    assert(
      !sampleCandidates.some(c => c.id === refTrash.id),
      'Safety Guard: File referenced by MediaUsage is strictly excluded'
    );
    assert(
      (resPreview?.data?.skippedBreakdown?.LEGAL_HOLD_PROTECTED ?? 0) >= 1,
      'Skipped breakdown records LEGAL_HOLD_PROTECTED items'
    );
    assert(
      (resPreview?.data?.skippedBreakdown?.BUSINESS_REFERENCE_PROTECTED ?? 0) >= 1,
      'Skipped breakdown records BUSINESS_REFERENCE_PROTECTED items'
    );

    // =========================================================================
    // SUITE 4: BOUNDED EXECUTION & RECONCILIATION ACCOUNTING
    // =========================================================================
    console.log('\n--- SUITE 4: Bounded Execution & Reconciliation Accounting ---');

    // Verify initial quota usage
    const initialUsage = await prisma.storageUsage.findFirst({
      where: { tenantId: tenantA.id, userId: null },
    });
    const initialTrashBytes = initialUsage ? BigInt(initialUsage.trashBytes) : BigInt(0);

    // Add dummy file version for eligibleTrash to simulate storage key
    await prisma.fileVersion.create({
      data: {
        fileId: eligibleTrash.id,
        versionNo: 1,
        storageKey: `tenant/${tenantA.id}/${eligibleTrash.id}/v1`,
        sizeBytes: BigInt(600000),
        createdBy: 'test-user',
        isCurrent: true,
      },
    });

    // Enable live purge mode in policy for execution test
    await makeRequest(
      {
        host: HOST,
        port: PORT,
        path: '/api/v1/tenant/storage/retention/policy',
        method: 'PUT',
        headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
      },
      {
        isDryRun: false,
        isEnabled: true,
      }
    );

    // Test 9: Execute Live Retention Cleanup
    const resExec = await makeRequest(
      {
        host: HOST,
        port: PORT,
        path: '/api/v1/tenant/storage/retention/execute',
        method: 'POST',
        headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
      },
      {
        isDryRun: false,
        force: true,
      }
    );
    assert(resExec.status === 200, 'POST /api/v1/tenant/storage/retention/execute returns 200 OK');
    assert((resExec?.data?.deletedCount ?? 0) >= 1, 'Retention execution purges eligible items');
    assert((resExec?.data?.deletedBytes ?? 0) > 0, 'Retention execution reclaims physical bytes');

    // Test 10: Verify Eligible File was Permanently Purged from DB
    const purgedFileCheck = await prisma.mediaFile.findUnique({
      where: { id: eligibleTrash.id },
    });
    assert(purgedFileCheck === null, 'Eligible file permanently purged from database');

    // Test 11: Verify Protected Files were NOT Touched
    const activeCheck = await prisma.mediaFile.findUnique({ where: { id: activeFile.id } });
    const recentCheck = await prisma.mediaFile.findUnique({ where: { id: recentTrash.id } });
    const heldCheck = await prisma.mediaFile.findUnique({ where: { id: heldTrash.id } });
    const refCheck = await prisma.mediaFile.findUnique({ where: { id: refTrash.id } });

    assert(activeCheck !== null, 'Active business file preserved intact');
    assert(recentCheck !== null, 'Recent trash file preserved intact');
    assert(heldCheck !== null, 'Legal hold file preserved intact');
    assert(refCheck !== null, 'MediaUsage referenced file preserved intact');

    // Test 12: Verify Retention Job Audit Trail
    const resHistory = await makeRequest({
      host: HOST,
      port: PORT,
      path: '/api/v1/tenant/storage/retention/history',
      method: 'GET',
      headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
    });
    assert(resHistory.status === 200, 'GET /api/v1/tenant/storage/retention/history returns 200 OK');
    assert((resHistory?.data?.jobs?.length ?? 0) >= 1, 'Execution history records completed retention job');
    assert(resHistory?.data?.jobs?.[0]?.status === 'COMPLETED', 'Retention job marked COMPLETED');
  } finally {
    // Clean up remaining test files safely in finally block
    const idsToClean = [
      activeFile?.id,
      recentTrash?.id,
      heldTrash?.id,
      refTrash?.id,
      eligibleTrash?.id,
    ].filter(Boolean);

    if (idsToClean.length > 0) {
      await prisma.storageLegalHold.deleteMany({ where: { fileId: { in: idsToClean } } });
      await prisma.mediaUsage.deleteMany({ where: { mediaId: { in: idsToClean } } });
      await prisma.fileVersion.deleteMany({ where: { fileId: { in: idsToClean } } });
      await prisma.mediaFile.deleteMany({ where: { id: { in: idsToClean } } });
    }
  }

  // =========================================================================
  // SUITE 5: ROLE-BASED AUTHORIZATION & CROSS-TENANT ISOLATION
  // =========================================================================
  console.log('\n--- SUITE 5: Role-Based Authorization & Cross-Tenant Isolation ---');

  // Test 13: Employee Denial
  const resEmp = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/tenant/storage/retention/policy',
    method: 'GET',
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert(resEmp.status === 403, 'Employee is denied retention policy access (403 Forbidden)');

  const resEmpPreview = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/tenant/storage/retention/preview',
    method: 'POST',
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert(resEmpPreview.status === 403, 'Employee is denied retention preview execution (403 Forbidden)');

  // Test 14: Cross-Tenant Isolation (Tenant B cannot access Tenant A legal holds)
  if (tenantAdminTokenB) {
    let crossTenantFile = null;
    let activeTenantAHold = null;
    try {
      crossTenantFile = await prisma.mediaFile.create({
        data: {
          tenantId: tenantA.id,
          fileName: 'cross_tenant_isolation_test.pdf',
          filePath: '/storage/cross_tenant_isolation_test.pdf',
          url: 'https://storage.local/cross_tenant_isolation_test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          checksumSha: 'sha256-cross-tenant',
          status: 'ACTIVE',
        },
      });
      activeTenantAHold = await prisma.storageLegalHold.create({
        data: {
          tenantId: tenantA.id,
          fileId: crossTenantFile.id,
          reason: 'Cross Tenant Boundary Test Hold',
          createdBy: tenantAdminA.id,
        },
      });

      const resBLeak = await makeRequest({
        host: HOST,
        port: PORT,
        path: '/api/v1/tenant/storage/retention/holds',
        method: 'GET',
        headers: { Authorization: `Bearer ${tenantAdminTokenB}` },
      });
      assert(resBLeak.status === 200, 'Tenant B accesses own legal holds endpoint');
      const holdsB = resBLeak?.data?.holds || [];
      assert(
        !holdsB.some((h) => h.id === activeTenantAHold.id),
        'Cross-tenant isolation: Tenant B cannot see Tenant A active legal hold'
      );
      const leakedItems = holdsB.filter((h) => h.tenantId === tenantA.id);
      assert(leakedItems.length === 0, 'Cross-tenant isolation: Tenant B sees zero Tenant A legal holds');
    } finally {
      if (activeTenantAHold) {
        await prisma.storageLegalHold.deleteMany({ where: { id: activeTenantAHold.id } });
      }
      if (crossTenantFile) {
        await prisma.mediaFile.deleteMany({ where: { id: crossTenantFile.id } });
      }
    }
  } else {
    console.log('  - SKIP: Tenant B not configured in database, skipping cross-tenant isolation test');
  }

  // =========================================================================
  // SUITE 6: SUPER ADMIN FLEET RETENTION OVERVIEW
  // =========================================================================
  console.log('\n--- SUITE 6: Super Admin Fleet Retention Overview ---');

  // Test 15: Fleet Retention Summary Endpoint
  const resFleet = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/super/storage/retention/fleet',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert(resFleet.status === 200, 'GET /api/v1/super/storage/retention/fleet returns 200 OK');
  assert(resFleet.data.totalTenants >= 1, 'Fleet retention summary reports total tenants');
  assert(typeof resFleet.data.activePolicies === 'number', 'Fleet summary reports active policies');
  assert(typeof resFleet.data.totalReclaimedBytes === 'number', 'Fleet summary reports total reclaimed bytes');
  assert(Array.isArray(resFleet.data.recentJobs), 'Fleet summary reports recent retention execution runs');

  // Test 16: Fleet History Endpoint
  const resFleetHistory = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/super/storage/retention/history',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert(resFleetHistory.status === 200, 'GET /api/v1/super/storage/retention/history returns 200 OK');
  assert(Array.isArray(resFleetHistory.data.jobs), 'Fleet history returns jobs array');

  // =========================================================================
  // SUITE 7: REGRESSION VERIFICATION (F1 - F4-E)
  // =========================================================================
  console.log('\n--- SUITE 7: Regression Verification (F1 - F4-E) ---');

  // F4-D Tenant Storage Summary
  const resF4DSummary = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/tenant/storage/summary',
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
  });
  assert(resF4DSummary.status === 200, 'Regression: GET /api/v1/tenant/storage/summary returns 200 OK');

  // F4-E Forecast Analytics
  const resF4EAnalytics = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/tenant/storage/analytics?lookbackDays=30',
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantAdminTokenA}` },
  });
  assert(resF4EAnalytics.status === 200, 'Regression: GET /api/v1/tenant/storage/analytics returns 200 OK');

  // Super Admin Fleet Analytics (F4-E)
  const resF4EFleet = await makeRequest({
    host: HOST,
    port: PORT,
    path: '/api/v1/super/storage/analytics/fleet',
    method: 'GET',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert(resF4EFleet.status === 200, 'Regression: GET /api/v1/super/storage/analytics/fleet returns 200 OK');

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL PHASE F4-F E2E VERIFICATION TESTS PASSED!');
  } else {
    console.error('⚠️ SOME TESTS FAILED. CHECK OUTPUT ABOVE.');
  }
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(totalTests === passedTests ? 0 : 1);
}

runF4FSuite().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  prisma.$disconnect();
  process.exit(1);
});
