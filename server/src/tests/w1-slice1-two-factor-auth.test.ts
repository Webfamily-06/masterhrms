import { describe, it, expect, beforeAll, afterAll } from "vitest";
import speakeasy from "speakeasy";
import { prisma, rawPrisma } from "../prisma";
import { TwoFactorService, hashBackupCode } from "../modules/two-factor-auth/two-factor.service";
import { twoFactorAuthManifest } from "../modules/two-factor-auth/manifest";

describe("Wave 1 — Slice 1: Two-Factor Authentication (two-factor-auth)", () => {
  const db = rawPrisma || prisma;
  let testTenant: any;
  let testUser: any;
  let testUserUnentitled: any;

  beforeAll(async () => {
    // Create test tenant
    testTenant = await db.tenant.create({
      data: {
        name: "W1 2FA Test Workspace",
        slug: `w1-2fa-test-${Date.now()}`,
      },
    });

    // Create primary test user
    testUser = await db.user.create({
      data: {
        email: `w1-2fa-user-${Date.now()}@example.com`,
        passwordHash: "hashed_dummy_password",
        twoFactorEnabled: false,
      },
    });

    // Create user profile
    await db.profile.create({
      data: {
        userId: testUser.id,
        tenantId: testTenant.id,
        fullName: "2FA Test User",
      },
    });

    // Assign employee role
    await db.userRole.create({
      data: {
        userId: testUser.id,
        tenantId: testTenant.id,
        role: "employee",
      },
    });

    // Provision active entitlement for two-factor-auth
    await db.tenantAddon.create({
      data: {
        tenantId: testTenant.id,
        addonSlug: "two-factor-auth",
        status: "active",
        plan: "standard",
      },
    });
  });

  afterAll(async () => {
    if (testUser) {
      await db.outboxEvent.deleteMany({ where: { entityId: testUser.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { entityId: testUser.id } }).catch(() => {});
      await db.userRole.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await db.profile.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (testTenant) {
      await db.tenantAddon.deleteMany({ where: { tenantId: testTenant.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: testTenant.id } }).catch(() => {});
    }
  });

  it("1. Manifest adheres to specification and catalog standards", () => {
    expect(twoFactorAuthManifest.slug).toBe("two-factor-auth");
    expect(twoFactorAuthManifest.engine).toBe("E9");
    expect(twoFactorAuthManifest.entitlementKey).toBe("two-factor-auth");
    expect(twoFactorAuthManifest.provides?.permissions).toContain("two-factor-auth.manage");
    expect(twoFactorAuthManifest.provides?.events).toContain("two_factor.totp_enabled");
  });

  it("2. TOTP enrollment generates encrypted secret, valid QR, and 8 hashed backup codes", async () => {
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);

    expect(setup.secret).toBeDefined();
    expect(setup.secret.length).toBeGreaterThanOrEqual(16);
    expect(setup.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(setup.otpauthUrl).toContain("otpauth://totp/");
    expect(setup.backupCodes).toHaveLength(8);

    // Verify secret is encrypted in database, not stored in plaintext
    const dbUser = await db.user.findUnique({
      where: { id: testUser.id },
      select: { twoFactorSecret: true, twoFactorBackupCodes: true, twoFactorEnabled: true },
    });

    expect(dbUser?.twoFactorEnabled).toBe(false);
    expect(dbUser?.twoFactorSecret).not.toBe(setup.secret);
    expect(dbUser?.twoFactorSecret).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // iv:authTag:ciphertext

    // Verify backup codes are stored as SHA-256 hashes, not plaintext
    const storedHashes: string[] = JSON.parse(dbUser?.twoFactorBackupCodes || "[]");
    expect(storedHashes).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(storedHashes[i]).not.toBe(setup.backupCodes[i]);
      expect(storedHashes[i]).toBe(hashBackupCode(setup.backupCodes[i]));
    }
  });

  it("3. Confirmation fails with invalid code and succeeds with valid TOTP code", async () => {
    // Invalid code
    const invalidRes = await TwoFactorService.confirmTotpSetup(testUser.id, "000000", testTenant.id);
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toContain("Invalid verification code");

    // Fetch user and generate valid TOTP using the decrypted secret
    const dbUser = await db.user.findUnique({
      where: { id: testUser.id },
      select: { twoFactorSecret: true },
    });

    // Retrieve active setup secret by generating a token using speakeasy
    // To generate valid token, we can initiate a clean setup
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);
    const validToken = speakeasy.totp({
      secret: setup.secret,
      encoding: "base32",
    });

    const validRes = await TwoFactorService.confirmTotpSetup(testUser.id, validToken, testTenant.id);
    expect(validRes.success).toBe(true);
    expect(validRes.twoFactorEnabled).toBe(true);

    const updatedUser = await db.user.findUnique({
      where: { id: testUser.id },
      select: { twoFactorEnabled: true, twoFactorConfirmedAt: true },
    });
    expect(updatedUser?.twoFactorEnabled).toBe(true);
    expect(updatedUser?.twoFactorConfirmedAt).toBeInstanceOf(Date);
  });

  it("4. Enforces replay protection against immediate token reuse", async () => {
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);
    const validToken = speakeasy.totp({
      secret: setup.secret,
      encoding: "base32",
    });
    await TwoFactorService.confirmTotpSetup(testUser.id, validToken, testTenant.id);

    // Verify first use succeeds
    const firstVerify = await TwoFactorService.verifyTotpOrBackup(testUser.id, validToken, testTenant.id);
    expect(firstVerify.valid).toBe(true);
    expect(firstVerify.method).toBe("TOTP");

    // Replaying the exact same token within the window fails
    const replayVerify = await TwoFactorService.verifyTotpOrBackup(testUser.id, validToken, testTenant.id);
    expect(replayVerify.valid).toBe(false);
    expect(replayVerify.error).toContain("already been used");
  });

  it("5. Verifies and consumes single-use backup recovery codes", async () => {
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);
    const validToken = speakeasy.totp({
      secret: setup.secret,
      encoding: "base32",
    });
    await TwoFactorService.confirmTotpSetup(testUser.id, validToken, testTenant.id);

    const backupCodeToUse = setup.backupCodes[0];

    // Use backup code
    const backupRes = await TwoFactorService.verifyTotpOrBackup(testUser.id, backupCodeToUse, testTenant.id);
    expect(backupRes.valid).toBe(true);
    expect(backupRes.method).toBe("BACKUP_CODE");
    expect(backupRes.remainingBackupCodes).toBe(7);

    // Reusing the consumed backup code fails
    const reuseRes = await TwoFactorService.verifyTotpOrBackup(testUser.id, backupCodeToUse, testTenant.id);
    expect(reuseRes.valid).toBe(false);

    // Remaining backup codes count updated in database
    const status = await TwoFactorService.getStatus(testUser.id);
    expect(status.backupCodesRemaining).toBe(7);
  });

  it("6. Regenerates backup codes only when authenticated with current TOTP", async () => {
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);
    const validToken = speakeasy.totp({
      secret: setup.secret,
      encoding: "base32",
    });
    await TwoFactorService.confirmTotpSetup(testUser.id, validToken, testTenant.id);

    // Regenerate without valid code fails
    const invalidRegen = await TwoFactorService.regenerateBackupCodes(testUser.id, "999999", testTenant.id);
    expect(invalidRegen.success).toBe(false);

    // Regenerate with valid token succeeds
    const validRegen = await TwoFactorService.regenerateBackupCodes(testUser.id, validToken, testTenant.id);
    expect(validRegen.success).toBe(true);
    expect(validRegen.backupCodes).toHaveLength(8);

    const status = await TwoFactorService.getStatus(testUser.id);
    expect(status.backupCodesRemaining).toBe(8);
  });

  it("7. Disables 2FA only when authenticated with valid TOTP", async () => {
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);
    const validToken = speakeasy.totp({
      secret: setup.secret,
      encoding: "base32",
    });
    await TwoFactorService.confirmTotpSetup(testUser.id, validToken, testTenant.id);

    // Disable with invalid code fails
    const failDisable = await TwoFactorService.disableTwoFactor(testUser.id, "123123", testTenant.id);
    expect(failDisable.success).toBe(false);

    // Disable with valid token succeeds
    const successDisable = await TwoFactorService.disableTwoFactor(testUser.id, validToken, testTenant.id);
    expect(successDisable.success).toBe(true);
    expect(successDisable.twoFactorEnabled).toBe(false);

    const dbUser = await db.user.findUnique({
      where: { id: testUser.id },
      select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorBackupCodes: true },
    });
    expect(dbUser?.twoFactorEnabled).toBe(false);
    expect(dbUser?.twoFactorSecret).toBeNull();
    expect(dbUser?.twoFactorBackupCodes).toBeNull();
  });

  it("8. Triggers account lockout after 5 consecutive failed verification attempts", async () => {
    const setup = await TwoFactorService.initiateTotpSetup(testUser.id, testTenant.id);
    const validToken = speakeasy.totp({
      secret: setup.secret,
      encoding: "base32",
    });
    await TwoFactorService.confirmTotpSetup(testUser.id, validToken, testTenant.id);

    // 4 failed attempts should not lock out
    for (let i = 0; i < 4; i++) {
      const res = await TwoFactorService.verifyTotpOrBackup(testUser.id, "000000", testTenant.id);
      expect(res.valid).toBe(false);
      expect(res.rateLimited).toBeFalsy();
    }

    // 5th failed attempt locks out the account
    const lockedRes = await TwoFactorService.verifyTotpOrBackup(testUser.id, "000000", testTenant.id);
    expect(lockedRes.valid).toBe(false);
    expect(lockedRes.rateLimited).toBe(true);
    expect(lockedRes.error).toContain("locked");

    // Clean up lockout for subsequent runs
    TwoFactorService.clearFailures(testUser.id);
  });
});
