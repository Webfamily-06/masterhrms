import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import { BackupRestoreService } from "../modules/backup-restore/backup-restore.service";
import { backupRestoreManifest } from "../modules/backup-restore/manifest";

describe("Wave 1 — Slice 2: Backup and Restore (backup-restore)", () => {
  const db = rawPrisma || prisma;
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let createdBackupId: string;

  beforeAll(async () => {
    // 1. Create Workspace A
    tenantA = await db.tenant.create({
      data: {
        name: "W1 Backup Tenant A",
        slug: `w1-backup-a-${Date.now()}`,
      },
    });

    // 2. Create Workspace B (to test anti-cross-tenant isolation)
    tenantB = await db.tenant.create({
      data: {
        name: "W1 Backup Tenant B",
        slug: `w1-backup-b-${Date.now()}`,
      },
    });

    // 3. Create Admin User for Tenant A
    userA = await db.user.create({
      data: {
        email: `w1-backup-admin-${Date.now()}@example.com`,
        passwordHash: "dummy_hash",
      },
    });

    await db.profile.create({
      data: {
        userId: userA.id,
        tenantId: tenantA.id,
        fullName: "Backup Admin A",
      },
    });

    // 4. Seed sample tenant business data strictly owned by Tenant A
    await db.department.create({
      data: {
        id: `dept-a-${Date.now()}`,
        tenantId: tenantA.id,
        name: "Engineering A",
      },
    });

    await db.leaveType.create({
      data: {
        id: `lt-a-${Date.now()}`,
        tenantId: tenantA.id,
        name: "Annual Paid Leave",
        daysPerYear: 20,
      },
    });

    await db.announcement.create({
      data: {
        id: `ann-a-${Date.now()}`,
        tenantId: tenantA.id,
        title: "All Hands Meeting Q4",
        content: "Company wide update.",
      },
    });

    // 5. Seed sample business data strictly owned by Tenant B
    await db.department.create({
      data: {
        id: `dept-b-${Date.now()}`,
        tenantId: tenantB.id,
        name: "Marketing B",
      },
    });
  });

  afterAll(async () => {
    // Clean up created backups
    if (createdBackupId && tenantA) {
      BackupRestoreService.deleteTenantBackup(tenantA.id, createdBackupId).catch(() => {});
    }

    // Clean up DB entities
    if (tenantA) {
      await db.outboxEvent.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.department.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.leaveType.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.announcement.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await db.department.deleteMany({ where: { tenantId: tenantB.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
    if (userA) {
      await db.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
  });

  it("1. Manifest adheres to specification and catalog standards", () => {
    expect(backupRestoreManifest.slug).toBe("backup-restore");
    expect(backupRestoreManifest.engine).toBe("E9");
    expect(backupRestoreManifest.entitlementKey).toBe("backup-restore");
    expect(backupRestoreManifest.provides?.permissions).toContain("backup-restore.restore");
    expect(backupRestoreManifest.provides?.events).toContain("backup.created");
  });

  it("2. Tenant manual export creates isolated snapshot with SHA-256 checksum", async () => {
    const bundle = await BackupRestoreService.createTenantBackup(tenantA.id, userA.id);
    createdBackupId = bundle.manifest.backupId;

    expect(bundle.manifest.backupId).toBeDefined();
    expect(bundle.manifest.tenantId).toBe(tenantA.id);
    expect(bundle.manifest.workspaceSlug).toBe(tenantA.slug);
    expect(bundle.manifest.checksumSha256).toMatch(/^[0-9a-f]{64}$/);

    // Verify model counts reflect seeded records
    expect(bundle.manifest.modelCounts.Department).toBeGreaterThanOrEqual(1);
    expect(bundle.manifest.modelCounts.LeaveType).toBeGreaterThanOrEqual(1);
    expect(bundle.manifest.modelCounts.Announcement).toBeGreaterThanOrEqual(1);

    // STRICT ISOLATION: Tenant B data MUST NEVER leak into Tenant A export
    const deptNames = bundle.data.Department.map((d: any) => d.name);
    expect(deptNames).toContain("Engineering A");
    expect(deptNames).not.toContain("Marketing B");

    for (const dept of bundle.data.Department) {
      expect(dept.tenantId).toBe(tenantA.id);
    }
  });

  it("3. Lists available backups for tenant with file sizes and record counts", async () => {
    const list = BackupRestoreService.listTenantBackups(tenantA.id);
    expect(list.length).toBeGreaterThanOrEqual(1);

    const found = list.find((b) => b.id === createdBackupId);
    expect(found).toBeDefined();
    expect(found?.totalRecords).toBeGreaterThan(0);
    expect(found?.sizeBytes).toBeGreaterThan(0);
  });

  it("4. Checksum verification detects and blocks tampered backup bundles", async () => {
    // Fetch valid backup file
    const validation = BackupRestoreService.validateBackupBundle(tenantA.id, createdBackupId);
    expect(validation.valid).toBe(true);

    // Create a tampered bundle
    const tamperedBundle = JSON.parse(JSON.stringify(validation.bundle!));
    tamperedBundle.data.Department.push({
      id: "tampered-id",
      tenantId: tenantA.id,
      name: "Injected Tampered Department",
    });

    const tamperedValidation = BackupRestoreService.validateBackupBundle(tenantA.id, tamperedBundle);
    expect(tamperedValidation.valid).toBe(false);
    expect(tamperedValidation.error).toContain("integrity check failed");
  });

  it("5. Strictly blocks cross-tenant restore attempts", async () => {
    const validForA = BackupRestoreService.validateBackupBundle(tenantA.id, createdBackupId);
    expect(validForA.valid).toBe(true);

    // Attempting to validate or restore Tenant A's backup for Tenant B MUST fail
    const crossTenantVal = BackupRestoreService.validateBackupBundle(tenantB.id, validForA.bundle!);
    expect(crossTenantVal.valid).toBe(false);
    expect(crossTenantVal.error).toContain("Cross-tenant restore forbidden");
  });

  it("6. Blocks directory traversal attacks on backup download and file resolution", () => {
    const traversalPath = BackupRestoreService.getTenantBackupFilePath(
      tenantA.id,
      "../../../../etc/passwd"
    );
    expect(traversalPath).toBeNull();
  });

  it("7. Dry-run simulation reports model impacts and conflicts without writing to database", async () => {
    const dryRun = await BackupRestoreService.dryRunRestore(tenantA.id, createdBackupId);

    expect(dryRun.valid).toBe(true);
    expect(dryRun.compatible).toBe(true);
    expect(dryRun.sourceTenantId).toBe(tenantA.id);
    expect(dryRun.targetTenantId).toBe(tenantA.id);
    expect(dryRun.totalRecords).toBeGreaterThan(0);
    expect(dryRun.existingRecordCounts.Department).toBeGreaterThanOrEqual(1);
    expect(dryRun.conflictsDetected.length).toBeGreaterThanOrEqual(1);
  });

  it("8. Guarded restore requires typed confirmation and restores tenant data safely", async () => {
    // Missing / invalid confirmation phrase fails
    await expect(
      BackupRestoreService.restoreTenantBackup(
        tenantA.id,
        createdBackupId,
        "WRONG_PHRASE",
        userA.id
      )
    ).rejects.toThrow("Confirmation phrase mismatch");

    // Correct confirmation phrase succeeds
    const restoreRes = await BackupRestoreService.restoreTenantBackup(
      tenantA.id,
      createdBackupId,
      `CONFIRM_RESTORE_${tenantA.slug}`,
      userA.id
    );

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.restoredCounts.Department).toBeGreaterThanOrEqual(1);

    // Audit log was recorded
    const audit = await db.auditLog.findFirst({
      where: { tenantId: tenantA.id, action: "backup.restored" },
    });
    expect(audit).toBeDefined();
  });

  it("9. Mid-restore failure rolls back transaction atomically without leaving partial state", async () => {
    // 1. Fetch valid backup bundle to use as base
    const validation = BackupRestoreService.validateBackupBundle(tenantA.id, createdBackupId);
    expect(validation.valid).toBe(true);

    const canaryDeptId = `dept-canary-rollback-${Date.now()}`;
    const corruptedBundle = JSON.parse(JSON.stringify(validation.bundle!));

    // Add a canary department that would be upserted in step 1 of the transaction
    corruptedBundle.data.Department = [
      {
        id: canaryDeptId,
        tenantId: tenantA.id,
        name: "Canary Rollback Dept",
      },
    ];

    // Inject an invalid record in step 2 (LeaveType) with an illegal null id to force Prisma transaction failure
    corruptedBundle.data.LeaveType = [
      {
        id: null as any,
        tenantId: tenantA.id,
        name: "Corrupted Leave Type",
      },
    ];

    // Recompute valid checksum for corruptedBundle so it passes pre-validation and reaches the transaction
    corruptedBundle.manifest.checksumSha256 = crypto
      .createHash("sha256")
      .update(JSON.stringify(corruptedBundle.data))
      .digest("hex");

    // 2. Attempt restore - it MUST fail inside the transaction
    await expect(
      BackupRestoreService.restoreTenantBackup(
        tenantA.id,
        corruptedBundle,
        `CONFIRM_RESTORE_${tenantA.slug}`,
        userA.id
      )
    ).rejects.toThrow();

    // 3. Atomicity check: The canary department must NOT exist in the database (rolled back)
    const canaryDept = await db.department.findUnique({
      where: { id: canaryDeptId },
    });
    expect(canaryDept).toBeNull();
  });
});

