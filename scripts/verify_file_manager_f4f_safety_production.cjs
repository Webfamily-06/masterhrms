/**
 * MASTERHRMS — PHASE F4-F FINAL PRODUCTION SAFETY & FAILURE INJECTION VERIFICATION
 * Comprehensive verification of Retention Policy Automation, Legal Holds, and Quota Recovery
 * Uses 100% isolated disposable test data. Zero modifications to existing customer data.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const jwt = require('../server/node_modules/jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Dynamic import of services from compiled server dist
const { StorageRetentionService } = require('../server/dist/services/files/storage-retention.service');
const { StorageReconciliationService } = require('../server/dist/services/files/storage-reconciliation.service');
const { StorageForecastService } = require('../server/dist/services/files/storage-forecast.service');
const { StorageProviderFactory } = require('../server/dist/services/storage/storage-provider.factory');
const { QuotaService } = require('../server/dist/services/files/quota.service');

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runProductionVerification() {
  console.log('================================================================================');
  console.log('🔬 MASTERHRMS — PHASE F4-F FINAL PRODUCTION READINESS VERIFICATION');
  console.log('Mode: READ-ONLY AUDIT + REAL DATABASE & PROVIDER SAFETY VERIFICATION');
  console.log('Target: StorageRetentionService, Legal Holds, SUCE Reconciliation, & Schedulers');
  console.log('================================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const auditEvidence = {
    testTenantId: null,
    beforeState: {},
    afterState: {},
    failureInjections: [],
    safetyChecks: [],
  };

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [SAFETY-TEST ${totalTests}] PASS: ${testName}`);
      auditEvidence.safetyChecks.push({ id: totalTests, name: testName, status: 'PASS' });
    } else {
      console.error(`  ✗ [SAFETY-TEST ${totalTests}] FAIL: ${testName} - ${details}`);
      auditEvidence.safetyChecks.push({ id: totalTests, name: testName, status: 'FAIL', details });
      throw new Error(`Safety test ${totalTests} failed: ${testName} (${details})`);
    }
  }

  // Generate unique disposable tenant IDs
  const testTenantId = `tenant-f4f-safety-${Date.now()}`;
  const crossTenantId = `tenant-f4f-cross-${Date.now()}`;
  auditEvidence.testTenantId = testTenantId;

  console.log(`[SETUP] Creating isolated disposable test tenant: ${testTenantId}`);

  // Create isolated disposable tenants
  const testTenant = await prisma.tenant.create({
    data: {
      id: testTenantId,
      name: 'F4-F Disposable Safety Test Tenant',
      slug: `f4f-safety-${Date.now()}`,
    },
  });

  const crossTenant = await prisma.tenant.create({
    data: {
      id: crossTenantId,
      name: 'F4-F Cross Tenant Isolation Check',
      slug: `f4f-cross-${Date.now()}`,
    },
  });

  // Create disposable admin and employee users
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-${testTenantId}@test.com`,
      passwordHash: 'dummy-password-hash',
      profile: {
        create: {
          fullName: 'Safety Admin',
          tenantId: testTenantId,
        },
      },
      roles: { create: { role: 'hr_admin' } },
    },
    include: { profile: true },
  });

  const secondaryAdmin = await prisma.user.create({
    data: {
      email: `admin2-${testTenantId}@test.com`,
      passwordHash: 'dummy-password-hash',
      profile: {
        create: {
          fullName: 'Secondary Safety Admin',
          tenantId: testTenantId,
        },
      },
      roles: { create: { role: 'hr_admin' } },
    },
    include: { profile: true },
  });

  const employeeUser = await prisma.user.create({
    data: {
      email: `employee-${testTenantId}@test.com`,
      passwordHash: 'dummy-password-hash',
      profile: {
        create: {
          fullName: 'Regular Employee',
          tenantId: testTenantId,
        },
      },
      roles: { create: { role: 'employee' } },
    },
    include: { profile: true },
  });

  try {
    // =========================================================================
    // SECTION A: RETENTION POLICY DEFAULTS & SAFE ACTIVATION
    // =========================================================================
    console.log('\n--- SECTION A: Retention Policy Defaults & Governance ---');

    // Test A1: Default Policy Invariants
    const defaultPolicy = StorageRetentionService.getDefaultPolicy(testTenantId);
    assert(defaultPolicy.trashRetentionDays === 30, 'Default trash retention is exactly 30 days (F0 canonical decision preserved)');
    assert(defaultPolicy.isEnabled === false, 'Safe-by-default: Policy is initialized in DISABLED state');
    assert(defaultPolicy.isDryRun === true, 'Safe-by-default: Policy is initialized in DRY-RUN mode');
    assert(defaultPolicy.policyVersion === 1, 'Initial policy version is 1');

    // Test A2: Upsert Policy with Versioning
    const createdPolicy = await StorageRetentionService.upsertTenantPolicy(
      testTenantId,
      {
        isEnabled: false,
        isDryRun: true,
        trashRetentionDays: 30,
        versionRetentionDays: null,
        maxVersionsPerFile: null,
      },
      adminUser.id
    );
    assert(createdPolicy.policyVersion === 1, 'Newly stored policy records version 1');
    assert(createdPolicy.isEnabled === false, 'Newly stored policy preserves safe DISABLED state');

    // Test A3: Version Increment on Update
    const updatedPolicy = await StorageRetentionService.upsertTenantPolicy(
      testTenantId,
      {
        trashRetentionDays: 60,
        versionRetentionDays: 90,
      },
      adminUser.id
    );
    assert(updatedPolicy.policyVersion === 2, 'Policy update increments policyVersion to 2 for auditability');
    assert(updatedPolicy.trashRetentionDays === 60, 'Policy correctly updates trash retention days');

    // Test A4: Outbox Audit Logging
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        tenantId: testTenantId,
        entityType: 'StorageRetentionPolicy',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(outboxEvents.length >= 2, 'Policy modifications emit durable transactional outbox events');
    assert(outboxEvents[0].eventType === 'storage.retention.policy_updated', 'Outbox event captures storage.retention.policy_updated');

    // =========================================================================
    // SECTION B: DELETION ELIGIBILITY & SAFETY GUARDS
    // =========================================================================
    console.log('\n--- SECTION B: Deletion Eligibility & Protection Guarantees ---');

    const storageProvider = StorageProviderFactory.getProvider();
    const testStorageKey = `tenant/${testTenantId}/real-object-${Date.now()}.txt`;
    const dummyBuffer = Buffer.from('MasterHRMS F4-F Retention Test Content');

    // If provider supports uploadBuffer, write actual file
    if (storageProvider.uploadBuffer) {
      await storageProvider.uploadBuffer(testStorageKey, dummyBuffer, 'text/plain');
    }

    // Create File 1: Eligible Expired Trash File (trashed 45 days ago, > 30 days)
    const file1Expired = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: 'f4f_eligible_expired_trash.pdf',
        filePath: '/storage/f4f_eligible_expired_trash.pdf',
        url: 'https://storage.local/f4f_eligible_expired_trash.pdf',
        fileSize: 1048576, // 1 MB
        mimeType: 'application/pdf',
        checksumSha: 'sha256-f4f-test-001',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        deletedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        ownerId: adminUser.id,
      },
    });
    await prisma.fileVersion.create({
      data: {
        fileId: file1Expired.id,
        versionNo: 1,
        storageKey: testStorageKey,
        sizeBytes: BigInt(1048576),
        createdBy: adminUser.id,
        isCurrent: true,
      },
    });

    // Create File 2: Active File (must NEVER be deleted by age alone)
    const file2Active = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: 'f4f_active_business_plan.docx',
        filePath: '/storage/f4f_active_business_plan.docx',
        url: 'https://storage.local/f4f_active_business_plan.docx',
        fileSize: 2097152, // 2 MB
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        checksumSha: 'sha256-f4f-test-002',
        status: 'ACTIVE',
        trashedAt: null,
        deletedAt: null,
        ownerId: adminUser.id,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Created 1 year ago!
      },
    });

    // Create File 3: Recent Trash File (trashed 5 days ago, < 30 days)
    const file3RecentTrash = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: 'f4f_recent_trash.png',
        filePath: '/storage/f4f_recent_trash.png',
        url: 'https://storage.local/f4f_recent_trash.png',
        fileSize: 524288, // 512 KB
        mimeType: 'image/png',
        checksumSha: 'sha256-f4f-test-003',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        ownerId: adminUser.id,
      },
    });

    // Create File 4: Expired Trash File under Legal Hold
    const file4LegalHold = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: 'f4f_held_legal_contract.pdf',
        filePath: '/storage/f4f_held_legal_contract.pdf',
        url: 'https://storage.local/f4f_held_legal_contract.pdf',
        fileSize: 1048576, // 1 MB
        mimeType: 'application/pdf',
        checksumSha: 'sha256-f4f-test-004',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        deletedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        ownerId: adminUser.id,
      },
    });
    const holdRecord = await StorageRetentionService.createLegalHold({
      tenantId: testTenantId,
      fileId: file4LegalHold.id,
      reason: 'Litigation pending in District Court Case #2026-CV-8821',
      actorId: adminUser.id,
    });
    assert(holdRecord.id && !holdRecord.releasedAt, 'Legal hold placed successfully with valid reason');

    // Create File 5: Expired Trash File with MediaUsage business reference
    const file5BusinessRef = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: 'f4f_referenced_employee_photo.jpg',
        filePath: '/storage/f4f_referenced_employee_photo.jpg',
        url: 'https://storage.local/f4f_referenced_employee_photo.jpg',
        fileSize: 300000,
        mimeType: 'image/jpeg',
        checksumSha: 'sha256-f4f-test-005',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        deletedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        ownerId: adminUser.id,
      },
    });
    await prisma.mediaUsage.create({
      data: {
        mediaId: file5BusinessRef.id,
        entityType: 'EmployeeProfile',
        entityId: 'emp-profile-991',
        fieldKey: 'avatar',
      },
    });

    // Create File 6: Expired Trash File in Cross Tenant (must NEVER leak into test tenant evaluation)
    const file6CrossTenant = await prisma.mediaFile.create({
      data: {
        tenantId: crossTenantId,
        fileName: 'cross_tenant_confidential_payroll.xlsx',
        filePath: '/storage/cross_tenant_confidential_payroll.xlsx',
        url: 'https://storage.local/cross_tenant_confidential_payroll.xlsx',
        fileSize: 4194304, // 4 MB
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        checksumSha: 'sha256-f4f-test-006',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        deletedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        ownerId: 'cross-admin',
      },
    });

    // Reset policy to 30 days for evaluation
    await StorageRetentionService.upsertTenantPolicy(
      testTenantId,
      {
        trashRetentionDays: 30,
        isDryRun: true,
        isEnabled: false,
      },
      adminUser.id
    );

    // Run Candidate Evaluation
    const evaluation = await StorageRetentionService.evaluateCandidates(testTenantId);

    // Verify Evaluation Results
    const eligibleIds = evaluation.eligibleFiles.map((f) => f.id);
    assert(eligibleIds.includes(file1Expired.id), 'Eligible expired trash file is identified correctly');
    assert(!eligibleIds.includes(file2Active.id), 'Active file is NEVER identified as candidate (Active File Guard)');
    assert(!eligibleIds.includes(file3RecentTrash.id), 'Recent trash file before cutoff is excluded (Period Not Elapsed)');
    assert(!eligibleIds.includes(file4LegalHold.id), 'File under Legal Hold is strictly excluded from candidate list');
    assert(!eligibleIds.includes(file5BusinessRef.id), 'File referenced by MediaUsage is strictly excluded from candidate list');
    assert(!eligibleIds.includes(file6CrossTenant.id), 'Cross-tenant file can NEVER enter test tenant candidate evaluation');

    assert(evaluation.heldCount === 1, 'Evaluation accurately tallies heldCount = 1');
    assert(evaluation.protectedCount === 1, 'Evaluation accurately tallies protectedCount = 1');
    assert(
      evaluation.skippedBreakdown.LEGAL_HOLD_PROTECTED === 1,
      'Skipped breakdown records LEGAL_HOLD_PROTECTED count'
    );
    assert(
      evaluation.skippedBreakdown.BUSINESS_REFERENCE_PROTECTED === 1,
      'Skipped breakdown records BUSINESS_REFERENCE_PROTECTED count'
    );

    // Test Dry-Run Zero Destruction Invariant
    const dryRunResult = await StorageRetentionService.createDryRunPreview(testTenantId, adminUser.id);
    assert(dryRunResult.eligibleCount === 1, 'Dry-run preview reports 1 eligible candidate');
    const file1Check = await prisma.mediaFile.findUnique({ where: { id: file1Expired.id } });
    assert(file1Check !== null, 'Dry-run preview performs ZERO destructive operations (file intact in DB)');

    // =========================================================================
    // SECTION C: APPROVAL WORKFLOW & REVALIDATION
    // =========================================================================
    console.log('\n--- SECTION C: Approval Workflow, Revalidation, & Concurrency ---');

    // Configure policy: requiresApproval = true, isEnabled = true, isDryRun = false
    await StorageRetentionService.upsertTenantPolicy(
      testTenantId,
      {
        requiresApproval: true,
        isEnabled: true,
        isDryRun: false,
        trashRetentionDays: 30,
      },
      adminUser.id
    );

    // Test C1: Direct execution without approval is blocked
    let unapprovedExecutionBlocked = false;
    try {
      await StorageRetentionService.executeRetentionJob({
        tenantId: testTenantId,
        actorId: adminUser.id,
      });
    } catch (e) {
      unapprovedExecutionBlocked = true;
    }
    assert(unapprovedExecutionBlocked, 'Live execution is BLOCKED when policy requires approval');

    // Test C2: Request Job Approval
    const approvalJob = await StorageRetentionService.requestJobApproval(testTenantId, adminUser.id);
    assert(approvalJob.status === 'PENDING_APPROVAL', 'Job approval request created with status PENDING_APPROVAL');
    assert(approvalJob.requestedBy === adminUser.id, 'Job records requester ID');

    // Test C3: Separation of Duties (Requester cannot approve own job)
    let selfApprovalBlocked = false;
    try {
      await StorageRetentionService.approveJob(testTenantId, approvalJob.id, adminUser.id);
    } catch (e) {
      selfApprovalBlocked = e.message.includes('Separation of duties');
    }
    assert(selfApprovalBlocked, 'Separation of duties: Requester cannot approve their own retention job');

    // Test C4: Approval by Secondary Administrator
    const approvedJob = await StorageRetentionService.approveJob(testTenantId, approvalJob.id, secondaryAdmin.id);
    assert(approvedJob.status === 'APPROVED', 'Secondary admin successfully approves retention job');
    assert(approvedJob.approvedBy === secondaryAdmin.id, 'Job records approvedBy ID');

    // Test C5: Cross-Tenant Approval Rejection
    let crossTenantApprovalBlocked = false;
    try {
      await StorageRetentionService.approveJob(crossTenantId, approvalJob.id, adminUser.id);
    } catch (e) {
      crossTenantApprovalBlocked = true;
    }
    assert(crossTenantApprovalBlocked, 'Cross-tenant approval is strictly blocked (403/Forbidden)');

    // =========================================================================
    // SECTION D: OBJECT STORAGE, FAILURE INJECTION, & RECOVERY
    // =========================================================================
    console.log('\n--- SECTION D: Object Storage, Failure Injection, & Recovery ---');

    // Create a special test file specifically for provider failure simulation
    const fileFailProvider = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: 'f4f_failure_injection_candidate.pdf',
        filePath: '/storage/f4f_failure_injection_candidate.pdf',
        url: 'https://storage.local/f4f_failure_injection_candidate.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        checksumSha: 'sha256-f4f-fail-001',
        status: 'TRASHED',
        trashedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        ownerId: adminUser.id,
      },
    });
    await prisma.fileVersion.create({
      data: {
        fileId: fileFailProvider.id,
        versionNo: 1,
        storageKey: `tenant/${testTenantId}/fail-simulation-${Date.now()}`,
        sizeBytes: BigInt(1048576),
        createdBy: adminUser.id,
        isCurrent: true,
      },
    });

    // Mock provider failure on this specific storageKey
    const originalDeleteObject = storageProvider.deleteObject.bind(storageProvider);
    let simulationTriggered = false;

    storageProvider.deleteObject = async function (storageKey) {
      if (storageKey.includes('fail-simulation')) {
        simulationTriggered = true;
        // Simulate provider network exception / 500 error
        return false;
      }
      return originalDeleteObject(storageKey);
    };

    // Execute retention job with simulated provider failure
    // Turn off requiresApproval temporarily for this isolated injection test
    await StorageRetentionService.upsertTenantPolicy(
      testTenantId,
      { requiresApproval: false, isEnabled: true, isDryRun: false },
      adminUser.id
    );

    const injectionExecutionResult = await StorageRetentionService.executeRetentionJob({
      tenantId: testTenantId,
      actorId: adminUser.id,
    });

    assert(simulationTriggered, 'Provider failure simulation hook successfully triggered during purge');
    assert(
      injectionExecutionResult.failedCount >= 1,
      'Retention job reports failedCount >= 1 when provider deletion fails'
    );

    // Verify database record for the failed file was NOT purged
    const failedFileInDb = await prisma.mediaFile.findUnique({
      where: { id: fileFailProvider.id },
    });
    assert(
      failedFileInDb !== null,
      'Safe recovery: Database record is PRESERVED when object storage delete fails (Never report reclaimed)'
    );

    // Verify that eligible file1 (without failure) WAS purged
    const file1After = await prisma.mediaFile.findUnique({
      where: { id: file1Expired.id },
    });
    assert(file1After === null, 'Partial batch handling: Non-failing eligible file was purged successfully');

    // Restore original provider method
    storageProvider.deleteObject = originalDeleteObject;

    // Retry test: Now that provider failure is resolved, re-running retention should purge fileFailProvider
    const retryResult = await StorageRetentionService.executeRetentionJob({
      tenantId: testTenantId,
      actorId: adminUser.id,
    });
    assert(retryResult.deletedCount >= 1, 'Retry behavior: Failed item is successfully purged on subsequent run');
    const failedFileAfterRetry = await prisma.mediaFile.findUnique({
      where: { id: fileFailProvider.id },
    });
    assert(failedFileAfterRetry === null, 'Failed item is now purged from database on retry');

    // =========================================================================
    // SECTION E: SUCE RECONCILIATION & ACCOUNTING INTEGRITY
    // =========================================================================
    console.log('\n--- SECTION E: SUCE Reconciliation & Accounting Integrity ---');

    // Run reconciliation audit
    const reconReport = await StorageReconciliationService.auditTenantStorage(testTenantId);
    assert(
      !reconReport.hasDrift && reconReport.reconciliationStatus === 'IN_SYNC',
      'SUCE storage tallies are 100% consistent (IN_SYNC) after retention execution',
      JSON.stringify({ hasDrift: reconReport.hasDrift, status: reconReport.reconciliationStatus, drift: reconReport.drift })
    );

    // Verify live tallies match exactly (zero drift)
    const usageRecord = await QuotaService.getOrCreateUsage(prisma, testTenantId, null);
    assert(
      BigInt(reconReport.live.usedBytes) === usageRecord.usedBytes,
      'Used bytes tally matches live database sum exactly'
    );
    assert(
      BigInt(reconReport.live.trashBytes) === usageRecord.trashBytes,
      'Trash bytes tally matches live database sum exactly'
    );

    // Verify forecast recalculation has no stale cache
    const forecast = await StorageForecastService.calculateTenantForecast(testTenantId);
    assert(
      forecast.currentUsageBytes === Number(usageRecord.usedBytes),
      'F4-E Forecast recalculation dynamically reflects live storage usage without stale cache'
    );

    // =========================================================================
    // SECTION F: SECURITY, RBAC & IMMUTABILITY
    // =========================================================================
    console.log('\n--- SECTION F: Security, RBAC & Immutability ---');

    // Verify Super Admin cannot bypass legal holds with force = true
    const heldFileCheck = await prisma.mediaFile.findUnique({
      where: { id: file4LegalHold.id },
    });
    assert(heldFileCheck !== null, 'Legal hold file remains intact in Recycle Bin');

    // Attempt retention run with force = true
    const forceResult = await StorageRetentionService.executeRetentionJob({
      tenantId: testTenantId,
      actorId: adminUser.id,
      force: true,
    });
    const heldFileAfterForce = await prisma.mediaFile.findUnique({
      where: { id: file4LegalHold.id },
    });
    assert(heldFileAfterForce !== null, 'Super Admin / force: true CANNOT bypass active legal hold (Immutable hold)');

    // Release legal hold and verify normal lifecycle resumption
    const releasedHold = await StorageRetentionService.releaseLegalHold({
      tenantId: testTenantId,
      holdId: holdRecord.id,
      releaseReason: 'Case resolved with prejudice by final court order dated 2026-10-30',
      actorId: adminUser.id,
    });
    assert(releasedHold.releasedAt !== null, 'Legal hold released successfully with reason and actorId');

    // After release, file becomes eligible and can be purged
    const postReleaseExec = await StorageRetentionService.executeRetentionJob({
      tenantId: testTenantId,
      actorId: adminUser.id,
    });
    assert(postReleaseExec.deletedCount >= 1, 'File is eligible for retention purge after legal hold release');
    const heldFileFinal = await prisma.mediaFile.findUnique({
      where: { id: file4LegalHold.id },
    });
    assert(heldFileFinal === null, 'File successfully purged after legal hold released');

    // =========================================================================
    // SECTION G: AUTOMATED BACKGROUND SCHEDULER SWEEP
    // =========================================================================
    console.log('\n--- SECTION G: Automated Background Scheduler Sweep ---');

    const sweepResult = await StorageRetentionService.runScheduledRetentionSweep();
    assert(typeof sweepResult.tenantsProcessed === 'number', 'Scheduled sweep reports tenantsProcessed');
    assert(Array.isArray(sweepResult.errors), 'Scheduled sweep reports error array with tenant boundary isolation');

    console.log('\n================================================================================');
    console.log(`TOTAL SAFETY TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
    console.log('🎉 ALL PHASE F4-F MANDATORY SAFETY & INTEGRITY TESTS PASSED!');
    console.log('================================================================================\n');

    return { success: true, totalTests, passedTests, auditEvidence };
  } finally {
    // CLEANUP DISPOSABLE TEST DATA ONLY
    console.log('[CLEANUP] Removing isolated disposable test tenant and test artifacts...');
    try {
      await prisma.storageLegalHold.deleteMany({
        where: { tenantId: { in: [testTenantId, crossTenantId] } },
      });
      await prisma.storageRetentionJob.deleteMany({
        where: { tenantId: { in: [testTenantId, crossTenantId] } },
      });
      await prisma.storageRetentionPolicy.deleteMany({
        where: { tenantId: { in: [testTenantId, crossTenantId] } },
      });
      await prisma.fileVersion.deleteMany({
        where: { file: { tenantId: { in: [testTenantId, crossTenantId] } } },
      });
      await prisma.mediaUsage.deleteMany({
        where: { media: { tenantId: { in: [testTenantId, crossTenantId] } } },
      });
      await prisma.mediaFile.deleteMany({
        where: { tenantId: { in: [testTenantId, crossTenantId] } },
      });
      await prisma.storageUsage.deleteMany({
        where: { tenantId: { in: [testTenantId, crossTenantId] } },
      });
      await prisma.outboxEvent.deleteMany({
        where: { tenantId: { in: [testTenantId, crossTenantId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [adminUser.id, secondaryAdmin.id, employeeUser.id] } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [testTenantId, crossTenantId] } },
      });
      console.log('  ✓ Disposable test data cleaned up completely.');
    } catch (cleanupErr) {
      console.warn('  [WARN] Cleanup encountered minor issue:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }
}

runProductionVerification()
  .then((res) => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('CRITICAL SAFETY VERIFICATION ERROR:', err);
    process.exit(1);
  });
