import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import speakeasy from "speakeasy";
import { rawPrisma as prisma } from "../prisma";
import { ActivityLogsService, redactSensitiveData } from "../modules/activity-logs/activity-logs.service";
import { BackupRestoreService } from "../modules/backup-restore/backup-restore.service";
import { InternalRemindersService } from "../modules/internal-reminders/internal-reminders.service";
import { PublicApiService } from "../modules/public-api/public-api.service";
import { TwoFactorService, hashBackupCode, generateRandomBackupCodes } from "../modules/two-factor-auth/two-factor.service";

describe("Core Modular Add-ons Verification Suite (Node Native)", () => {
  const tenantAId = `mod_tenant_a_${Date.now()}`;
  const tenantBId = `mod_tenant_b_${Date.now()}`;
  const userAId = `mod_user_a_${Date.now()}`;
  const userBId = `mod_user_b_${Date.now()}`;

  before(async () => {
    // Upsert test tenants
    await prisma.tenant.upsert({
      where: { id: tenantAId },
      create: { id: tenantAId, name: "Modular Tenant Alpha", slug: `mod-alpha-${Date.now()}` },
      update: {},
    });
    await prisma.tenant.upsert({
      where: { id: tenantBId },
      create: { id: tenantBId, name: "Modular Tenant Beta", slug: `mod-beta-${Date.now()}` },
      update: {},
    });

    // Upsert test users
    for (const u of [
      { id: userAId, email: `usera_${Date.now()}@example.com`, tenantId: tenantAId },
      { id: userBId, email: `userb_${Date.now()}@example.com`, tenantId: tenantBId },
    ]) {
      await prisma.user.upsert({
        where: { id: u.id },
        create: { id: u.id, email: u.email, passwordHash: "dummyhash123" },
        update: {},
      });
      await prisma.profile.upsert({
        where: { userId: u.id },
        create: { userId: u.id, email: u.email, fullName: u.id, tenantId: u.tenantId },
        update: {},
      });
    }
  });

  after(async () => {
    // Cleanup settings, audit logs, and test entities
    await prisma.setting.deleteMany({
      where: { scopeId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await prisma.auditLog.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await prisma.workspaceTodo.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
    await prisma.profile.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    }).catch(() => {});
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ADDON-118: Activity Logs
  // ───────────────────────────────────────────────────────────────────────────
  describe("1. Activity Logs (ADDON-118)", () => {
    it("should deep redact sensitive credentials from payload data", () => {
      const sensitivePayload = {
        username: "admin",
        password: "SuperSecretPassword123!",
        apiKey: "mhr_live_9988776655",
        metadata: {
          token: "eyJhbGciOi...",
          cvv: "123",
          safeNote: "All systems nominal",
        },
      };

      const redacted = redactSensitiveData(sensitivePayload);
      assert.equal(redacted.username, "admin");
      assert.equal(redacted.password, "[REDACTED]");
      assert.equal(redacted.apiKey, "[REDACTED]");
      assert.equal(redacted.metadata.token, "[REDACTED]");
      assert.equal(redacted.metadata.cvv, "[REDACTED]");
      assert.equal(redacted.metadata.safeNote, "All systems nominal");
    });

    it("should persist and retrieve activity logs with strict tenant isolation", async () => {
      // Create log in Tenant A
      const logA = await prisma.auditLog.create({
        data: {
          tenantId: tenantAId,
          actorId: userAId,
          actorEmail: "usera@example.com",
          action: "EMPLOYEE_PROMOTION",
          entityType: "Employee",
          entityId: "emp_101",
          afterJson: { newRole: "Senior Lead", secretKey: "leaked_val" },
        },
      });

      // Create log in Tenant B
      const logB = await prisma.auditLog.create({
        data: {
          tenantId: tenantBId,
          actorId: userBId,
          actorEmail: "userb@example.com",
          action: "PAYROLL_DISBURSED",
          entityType: "Payroll",
          entityId: "pay_202",
        },
      });

      // Tenant A listing must contain logA and NOT logB
      const listA = await ActivityLogsService.listActivityLogs(tenantAId);
      assert.ok(listA.items.some((i: any) => i.id === logA.id));
      assert.equal(listA.items.some((i: any) => i.id === logB.id), false);

      // Verify secret redaction on retrieval
      const fetchedA = await ActivityLogsService.getActivityLog(tenantAId, logA.id);
      assert.ok(fetchedA !== null);
      assert.equal(fetchedA?.afterJson.secretKey, "[REDACTED]");
      assert.equal(fetchedA?.afterJson.newRole, "Senior Lead");

      // Cross-tenant access check: Tenant B cannot fetch logA
      const crossTenantFetch = await ActivityLogsService.getActivityLog(tenantBId, logA.id);
      assert.equal(crossTenantFetch, null);
    });

    it("should generate valid RFC 4180 CSV export with redacted details", async () => {
      const csv = await ActivityLogsService.exportActivityLogsCsv(tenantAId);
      assert.ok(csv.startsWith("Timestamp,Action,Entity Type,Entity ID,Actor Email,Actor ID,IP Address,Details"));
      assert.ok(csv.includes("EMPLOYEE_PROMOTION"));
      assert.ok(csv.includes("[REDACTED]"));
      assert.equal(csv.includes("leaked_val"), false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ADDON-125: Tenant Backup & Restore
  // ───────────────────────────────────────────────────────────────────────────
  describe("2. Tenant Backup & Restore (ADDON-125)", () => {
    let generatedBackupId: string;

    it("should generate a complete tenant backup bundle with manifest and checksum", async () => {
      const bundle = await BackupRestoreService.createTenantBackup(tenantAId, userAId);
      assert.ok(bundle.manifest !== undefined);
      assert.equal(bundle.manifest.tenantId, tenantAId);
      assert.ok(bundle.manifest.checksumSha256.length === 64); // SHA-256
      assert.ok(Array.isArray(bundle.manifest.modulesIncluded));
      assert.ok(bundle.manifest.modulesIncluded.includes("Department"));

      generatedBackupId = bundle.manifest.backupId;
    });

    it("should list persisted backups for tenant with file metadata", () => {
      const backups = BackupRestoreService.listTenantBackups(tenantAId);
      assert.ok(backups.length >= 1);
      const found = backups.find((b) => b.id === generatedBackupId);
      assert.ok(found !== undefined);
      assert.ok(found.sizeBytes > 0);
      assert.ok(found.checksumSha256.length === 64);
    });

    it("should execute dry-run restore validation check", async () => {
      const dryRun = await BackupRestoreService.dryRunRestore(tenantAId, generatedBackupId);
      assert.equal(dryRun.valid, true);
      assert.equal(dryRun.compatible, true);
      assert.equal(dryRun.sourceTenantId, tenantAId);
      assert.equal(dryRun.targetTenantId, tenantAId);
      assert.equal(dryRun.conflictsDetected.length, 0);
    });

    it("should enforce tenant boundary on backups (Tenant B cannot read Tenant A backup)", () => {
      const backupsB = BackupRestoreService.listTenantBackups(tenantBId);
      assert.equal(backupsB.some((b) => b.id === generatedBackupId), false);

      const filePathB = BackupRestoreService.getTenantBackupFilePath(tenantBId, generatedBackupId);
      assert.equal(filePathB, null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ADDON-120: Internal Reminders
  // ───────────────────────────────────────────────────────────────────────────
  describe("3. Internal Reminders (ADDON-120)", () => {
    let createdReminderId: string;

    it("should create contextual reminder with entity link and priority", async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const result = await InternalRemindersService.createReminder(tenantAId, userAId, {
        title: "Review probation period for Alice",
        description: "Schedule probation review before the 3-month mark.",
        priority: "high",
        entityType: "HR",
        entityId: "emp_probation_42",
        reminderType: "PROBATION_REVIEW",
        dueDate,
      });

      assert.equal(result.duplicatePrevented, false);
      assert.ok(result.reminder.id !== undefined);
      assert.equal(result.reminder.priority, "high");
      assert.equal(result.reminder.entityType, "HR");
      assert.equal(result.reminder.entityId, "emp_probation_42");
      assert.equal(result.reminder.completed, false);

      createdReminderId = result.reminder.id;
    });

    it("should prevent duplicate reminders for identical contextual entity", async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const duplicateAttempt = await InternalRemindersService.createReminder(tenantAId, userAId, {
        title: "Review probation period for Alice (re-attempt)",
        priority: "high",
        entityType: "HR",
        entityId: "emp_probation_42",
        reminderType: "PROBATION_REVIEW",
        dueDate,
      });

      assert.equal(duplicateAttempt.duplicatePrevented, true);
      assert.equal(duplicateAttempt.reminder.id, createdReminderId);
    });

    it("should complete reminder status and filter by tenant", async () => {
      const completed = await InternalRemindersService.completeReminder(
        tenantAId,
        createdReminderId,
        userAId
      );
      assert.equal(completed.completed, true);

      const list = await InternalRemindersService.listReminders(tenantAId, { completed: true });
      assert.ok(list.some((r) => r.id === createdReminderId));

      // Tenant B listing must not see Tenant A reminders
      const listB = await InternalRemindersService.listReminders(tenantBId);
      assert.equal(listB.some((r) => r.id === createdReminderId), false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ADDON-115: Public Developer API
  // ───────────────────────────────────────────────────────────────────────────
  describe("4. Public Developer API (ADDON-115)", () => {
    let testRawKey: string;
    let testKeyId: string;

    it("should generate API key with mhr_live_ prefix and store SHA-256 hash", async () => {
      const created = await PublicApiService.createApiKey(tenantAId, userAId, {
        name: "Zapier Integration Key",
        scopes: ["employees:read", "attendance:read"],
        rateLimit: 10,
      });

      assert.ok(created.rawKey.startsWith("mhr_live_"));
      assert.ok(created.key.keyPrefix.startsWith("mhr_live_"));
      assert.equal(created.key.name, "Zapier Integration Key");
      assert.equal(created.key.status, "active");

      testRawKey = created.rawKey;
      testKeyId = created.key.id;
    });

    it("should verify valid key with required scope", async () => {
      const verifySuccess = await PublicApiService.verifyApiKey(testRawKey, "employees:read");
      assert.equal(verifySuccess.valid, true);
      assert.equal(verifySuccess.tenantId, tenantAId);
      assert.equal(verifySuccess.keyId, testKeyId);

      // Fails when requiring an ungranted scope
      const verifyScopeFail = await PublicApiService.verifyApiKey(testRawKey, "payroll:write");
      assert.equal(verifyScopeFail.valid, false);
      assert.equal(verifyScopeFail.error, "INSUFFICIENT_SCOPE");
    });

    it("should revoke API key and reject subsequent requests", async () => {
      const revoked = await PublicApiService.revokeApiKey(tenantAId, testKeyId, userAId);
      assert.equal(revoked.status, "revoked");

      const verifyRevoked = await PublicApiService.verifyApiKey(testRawKey, "employees:read");
      assert.equal(verifyRevoked.valid, false);
      assert.equal(verifyRevoked.error, "REVOKED_KEY");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. ADDON-126: Two-Factor Authentication
  // ───────────────────────────────────────────────────────────────────────────
  describe("5. Two-Factor Authentication (ADDON-126)", () => {
    it("should generate random backup codes and verify SHA-256 normalization", () => {
      const codes = generateRandomBackupCodes(8);
      assert.equal(codes.length, 8);
      for (const code of codes) {
        assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}$/);
        const hash1 = hashBackupCode(code);
        const hash2 = hashBackupCode(code.toLowerCase().replace("-", " "));
        assert.equal(hash1, hash2); // Case & whitespace insensitive hashing
      }
    });

    it("should initiate and confirm TOTP setup with speakeasy verification", async () => {
      const setup = await TwoFactorService.initiateTotpSetup(userAId, tenantAId);
      assert.ok(setup.secret !== undefined);
      assert.ok(setup.otpauthUrl?.startsWith("otpauth://totp/"));
      assert.ok(setup.qrCode.startsWith("data:image/png;base64,"));
      assert.equal(setup.backupCodes.length, 8);

      // Generate valid TOTP token using the returned secret
      const validToken = speakeasy.totp({
        secret: setup.secret,
        encoding: "base32",
      });

      // Confirm setup
      const confirmation = await TwoFactorService.confirmTotpSetup(userAId, validToken, tenantAId);
      assert.equal(confirmation.success, true);
      assert.equal(confirmation.twoFactorEnabled, true);

      // Check status
      const status = await TwoFactorService.getStatus(userAId);
      assert.equal(status.twoFactorEnabled, true);
    });

    it("should record failed attempts and lock out user upon exceeding threshold", () => {
      const testLockoutUserId = `user_lockout_${Date.now()}`;

      for (let i = 1; i <= 4; i++) {
        const failure = TwoFactorService.recordFailure(testLockoutUserId);
        assert.equal(failure.locked, false);
        assert.equal(failure.attemptsLeft, 5 - i);
      }

      // 5th failure triggers lockout
      const finalFailure = TwoFactorService.recordFailure(testLockoutUserId);
      assert.equal(finalFailure.locked, true);
      assert.equal(finalFailure.attemptsLeft, 0);

      const status = TwoFactorService.isLockedOut(testLockoutUserId);
      assert.equal(status.locked, true);
      assert.ok(status.secondsRemaining > 0);
    });
  });
});
