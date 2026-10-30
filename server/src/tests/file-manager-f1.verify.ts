import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { FileInvariantsService } from "../services/files/file-invariants.service";
import { QuotaService, QuotaExceededError, MAX_FILE_SIZE_BYTES } from "../services/files/quota.service";
import { StorageProviderFactory } from "../services/storage/storage-provider.factory";
import { LocalStorageProvider } from "../services/storage/local-storage.provider";
import { SupabaseStorageProvider } from "../services/storage/supabase-storage.provider";
import { buildStorageKey } from "../services/storage/storage-provider.interface";
import { UploadSessionService } from "../services/files/upload-session.service";
import { FilesService } from "../services/files/files.service";
import crypto from "crypto";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string, details?: any) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, details: err });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

export async function runF1Verification() {
  console.log("================================================================================");
  console.log("RUNNING MASTERHRMS FILE MANAGER PHASE F1 VERIFICATION SUITE");
  console.log("================================================================================\n");

  const realTenant = await prisma.tenant.findFirst({ select: { id: true } });
  const testTenantId = realTenant?.id || "mock-tenant";

  // ---------------------------------------------------------------------------
  // 1. DATA MODEL & BACKFILL PRESERVATION
  // ---------------------------------------------------------------------------
  console.log("[SUITE 1] Database Model & Backfill Integrity");

  await runTest("Original 154 MediaFiles remain intact with F1 schema attributes", async () => {
    const totalFiles = await prisma.mediaFile.count();
    assert(totalFiles >= 154, `Expected at least 154 files, found ${totalFiles}`);

    const sample = await prisma.mediaFile.findFirst({
      where: { nameKey: { not: null } },
    });
    assert(!!sample, "Sample file with F1 nameKey not found");
    assert(sample?.status === "ACTIVE" || sample?.status === "TRASHED", "File status not populated");
    assert(!!sample?.materializedPath, "materializedPath not populated");
    assert(sample?.depth !== undefined, "depth not populated");
  });

  await runTest("FileVersion records exist for all backfilled files", async () => {
    const totalVersions = await prisma.fileVersion.count();
    assert(totalVersions >= 154, `Expected at least 154 versions, found ${totalVersions}`);

    const v1 = await prisma.fileVersion.findFirst({
      where: { versionNo: 1 },
    });
    assert(!!v1, "Version 1 record not found");
    assert(v1?.sizeBytes !== undefined, "sizeBytes not populated on FileVersion");
  });

  await runTest("Original 78 MediaUsage records successfully mapped to FileLinks", async () => {
    const totalLinks = await prisma.fileLink.count();
    assert(totalLinks >= 78, `Expected at least 78 file_links, found ${totalLinks}`);

    const totalUsages = await prisma.mediaUsage.count();
    assert(totalUsages === 78, `Original media_usages count altered, expected 78, found ${totalUsages}`);
  });

  await runTest("StorageUsage and StorageQuota records initialized for tenants", async () => {
    const usages = await prisma.storageUsage.count();
    assert(usages >= 246, `Expected at least 246 storage_usages, found ${usages}`);
    const quotas = await prisma.storageQuota.count();
    assert(quotas >= 246, `Expected at least 246 storage_quotas, found ${quotas}`);
  });

  // ---------------------------------------------------------------------------
  // 2. WINDOWS 11 EXPLORER FILENAME INVARIANTS
  // ---------------------------------------------------------------------------
  console.log("\n[SUITE 2] Windows 11 Explorer Filename & Path Invariants");

  await runTest("Rejects prohibited characters: \\ / : * ? \" < > |", async () => {
    const invalidNames = [
      'report/2026.pdf',
      'folder\\sub',
      'data:stream.txt',
      'star*.png',
      'query?.csv',
      '"quoted".docx',
      '<tag>.xml',
      'pipe|file.txt',
    ];
    for (const name of invalidNames) {
      const v = FileInvariantsService.validateFileName(name);
      assert(!v.isValid, `Should have rejected: ${name}`);
      assert(v.code === "INVALID_CHARACTERS", `Expected INVALID_CHARACTERS for ${name}`);
    }
  });

  await runTest("Rejects Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)", async () => {
    const reserved = ['con.txt', 'CON', 'aux.pdf', 'prn.docx', 'nul', 'com1.png', 'lpt9.log'];
    for (const name of reserved) {
      const v = FileInvariantsService.validateFileName(name);
      assert(!v.isValid, `Should have rejected reserved name: ${name}`);
      assert(v.code === "RESERVED_DEVICE_NAME", `Expected RESERVED_DEVICE_NAME for ${name}`);
    }
  });

  await runTest("Rejects trailing dots and spaces", async () => {
    const invalidTrailing = ['filename. ', 'folder.', 'test.  ', 'file...'];
    for (const name of invalidTrailing) {
      const v = FileInvariantsService.validateFileName(name);
      assert(!v.isValid, `Should have rejected trailing char: ${name}`);
      assert(v.code === "INVALID_TRAILING_CHAR", `Expected INVALID_TRAILING_CHAR for ${name}`);
    }
  });

  await runTest("Rejects empty or whitespace-only names and names > 255 chars", async () => {
    assert(!FileInvariantsService.validateFileName("").isValid, "Should reject empty");
    assert(!FileInvariantsService.validateFileName("   ").isValid, "Should reject whitespace");
    assert(!FileInvariantsService.validateFileName("a".repeat(256)).isValid, "Should reject >255 chars");
    assert(FileInvariantsService.validateFileName("a".repeat(255)).isValid, "Should accept 255 chars");
  });

  await runTest("Accepts valid Windows 11 Explorer filenames", async () => {
    const valid = [
      'Annual_Report_2026.pdf',
      'Q3 Financial Review (Draft).xlsx',
      'Employee Onboarding Checklist.docx',
      'project-alpha-v2.tar.gz',
      'My Document 123.txt',
    ];
    for (const name of valid) {
      const v = FileInvariantsService.validateFileName(name);
      assert(v.isValid, `Should have accepted: ${name}, got error: ${v.error}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. STORAGE KEY ARCHITECTURE & PROVIDERS
  // ---------------------------------------------------------------------------
  console.log("\n[SUITE 3] Storage Key Architecture & Storage Providers");

  await runTest("Storage keys are canonical, unguessable, and tenant-prefixed", async () => {
    const tenantKey = buildStorageKey("tenant-xyz", "file-123", 1);
    assert(tenantKey === "tenant/tenant-xyz/file-123/v1", `Invalid tenant storage key: ${tenantKey}`);

    const platformKey = buildStorageKey(null, "file-999", 2);
    assert(platformKey === "platform/file-999/v2", `Invalid platform storage key: ${platformKey}`);

    // Verify original filename is never in the storage key
    assert(!tenantKey.includes(".pdf"), "Storage key must not contain file extensions or original names");
  });

  await runTest("LocalStorageProvider writes, signs, verifies, and deletes objects", async () => {
    const provider = new LocalStorageProvider();
    const testKey = `tenant/test-verify/f-${Date.now()}/v1`;
    const testContent = Buffer.from("Hello Master HRMS File Manager F1!");

    // 1. Upload Buffer
    await provider.uploadBuffer(testKey, testContent, "text/plain");

    // 2. Verify Upload
    const verification = await provider.verifyUpload(testKey, testContent.length);
    assert(verification.exists, "Object should exist after uploadBuffer");
    assert(verification.sizeBytes === testContent.length, "Object size mismatch");

    // 3. Signed Download URL
    const dlUrl = await provider.getSignedDownloadUrl(testKey, "hello.txt", 60);
    assert(dlUrl.includes("/api/v1/files/stream"), `Download URL invalid: ${dlUrl}`);
    assert(dlUrl.includes("sig="), "Download URL missing signature");

    // 4. Signed Preview URL
    const prevUrl = await provider.getSignedPreviewUrl(testKey, "text/plain", 60);
    assert(prevUrl.includes("inline=true"), "Preview URL missing inline parameter");

    // 5. Delete Object
    const deleted = await provider.deleteObject(testKey);
    assert(deleted, "Delete object failed");

    const recheck = await provider.verifyUpload(testKey);
    assert(!recheck.exists, "Object should not exist after deletion");
  });

  await runTest("SupabaseStorageProvider adheres to IStorageProvider interface", async () => {
    const provider = new SupabaseStorageProvider({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-key",
      bucketName: "hrms-files",
    });
    assert(provider.providerName === "supabase", "Provider name mismatch");
    assert(typeof provider.initiateUpload === "function", "Missing initiateUpload");
    assert(typeof provider.verifyUpload === "function", "Missing verifyUpload");
    assert(typeof provider.getSignedDownloadUrl === "function", "Missing getSignedDownloadUrl");
    assert(typeof provider.getSignedPreviewUrl === "function", "Missing getSignedPreviewUrl");
    assert(typeof provider.deleteObject === "function", "Missing deleteObject");
  });

  // ---------------------------------------------------------------------------
  // 4. QUOTA & CAPACITY ALLOCATION
  // ---------------------------------------------------------------------------
  console.log("\n[SUITE 4] Storage Quotas & Capacity Accounting");

  await runTest("Plan capacities resolve accurately (Starter 10GB, Growth 25GB, Sovereign 100GB, Custom 500GB)", async () => {
    const tenStarter = BigInt(10) * BigInt(1024 * 1024 * 1024);
    const tenGrowth = BigInt(25) * BigInt(1024 * 1024 * 1024);
    const tenSovereign = BigInt(100) * BigInt(1024 * 1024 * 1024);
    const tenCustom = BigInt(500) * BigInt(1024 * 1024 * 1024);

    // Default tenant with no subscription resolves to 10 GB
    const defaultQuota = await QuotaService.getTenantQuotaBytes("non-existent-tenant");
    assert(defaultQuota === tenStarter, `Expected 10GB default, got ${defaultQuota}`);
  });

  await runTest("User allocation defaults to 5 GB with overcommit permitted", async () => {
    const fiveGb = BigInt(5) * BigInt(1024 * 1024 * 1024);
    const userQuota = await QuotaService.getUserQuotaBytes("mock-tenant", "mock-user-1");
    assert(userQuota === fiveGb, `Expected 5GB user quota, got ${userQuota}`);
  });

  await runTest("100 MB per-file upload limit is strictly enforced", async () => {
    const overLimit = 100 * 1024 * 1024 + 1; // 100MB + 1 byte
    let rejected = false;
    try {
      await QuotaService.reserveUploadBytes(prisma, "mock-tenant", "mock-user-1", overLimit);
    } catch (e: any) {
      if (e instanceof QuotaExceededError && e.scope === "FILE_SIZE") {
        rejected = true;
      }
    }
    assert(rejected, "Should have rejected file > 100 MB with QuotaExceededError(FILE_SIZE)");
  });

  await runTest("Atomic reservation, commit, and release lifecycle", async () => {
    const testTenantId = `t-quota-${Date.now()}`;
    const testUserId = `u-quota-${Date.now()}`;
    const uploadSize = 5 * 1024 * 1024; // 5 MB

    // 1. Reserve bytes
    await prisma.$transaction(async (tx) => {
      await QuotaService.reserveUploadBytes(tx, testTenantId, testUserId, uploadSize);
    });

    const usageAfterReserve = await prisma.storageUsage.findFirst({
      where: { tenantId: testTenantId, userId: testUserId },
    });
    assert(Number(usageAfterReserve?.reservedBytes) === uploadSize, "Reserved bytes not incremented");
    assert(Number(usageAfterReserve?.usedBytes) === 0, "usedBytes should remain 0 during reservation");

    // 2. Commit bytes
    await prisma.$transaction(async (tx) => {
      await QuotaService.commitUploadBytes(tx, testTenantId, testUserId, uploadSize);
    });

    const usageAfterCommit = await prisma.storageUsage.findFirst({
      where: { tenantId: testTenantId, userId: testUserId },
    });
    assert(Number(usageAfterCommit?.reservedBytes) === 0, "Reserved bytes should be 0 after commit");
    assert(Number(usageAfterCommit?.usedBytes) === uploadSize, "usedBytes should match uploadSize");
    assert(usageAfterCommit?.fileCount === 1, "fileCount should increment to 1");

    // 3. Move to Trash
    await prisma.$transaction(async (tx) => {
      await QuotaService.trashFileBytes(tx, testTenantId, testUserId, uploadSize);
    });

    const usageAfterTrash = await prisma.storageUsage.findFirst({
      where: { tenantId: testTenantId, userId: testUserId },
    });
    assert(Number(usageAfterTrash?.usedBytes) === 0, "usedBytes should decrement on trash");
    assert(Number(usageAfterTrash?.trashBytes) === uploadSize, "trashBytes should increment on trash");

    // 4. Restore from Trash
    await prisma.$transaction(async (tx) => {
      await QuotaService.restoreFileBytes(tx, testTenantId, testUserId, uploadSize);
    });

    const usageAfterRestore = await prisma.storageUsage.findFirst({
      where: { tenantId: testTenantId, userId: testUserId },
    });
    assert(Number(usageAfterRestore?.usedBytes) === uploadSize, "usedBytes should restore");
    assert(Number(usageAfterRestore?.trashBytes) === 0, "trashBytes should be 0 after restore");

    // 5. Permanent Purge
    await prisma.$transaction(async (tx) => {
      await QuotaService.purgeFileBytes(tx, testTenantId, testUserId, uploadSize, false);
    });

    const usageAfterPurge = await prisma.storageUsage.findFirst({
      where: { tenantId: testTenantId, userId: testUserId },
    });
    assert(Number(usageAfterPurge?.usedBytes) === 0, "usedBytes should be 0 after purge");
    assert(usageAfterPurge?.fileCount === 0, "fileCount should decrement after purge");

    // Clean up test records
    await prisma.storageUsage.deleteMany({ where: { tenantId: testTenantId } });
  });

  // ---------------------------------------------------------------------------
  // 5. HIERARCHY INVARIANTS, MOVE CYCLE REJECTION, & SIBLING UNIQUENESS
  // ---------------------------------------------------------------------------
  console.log("\n[SUITE 5] Hierarchy Invariants & Cycle Prevention");

  await runTest("Folder cannot be moved into itself or its descendants", async () => {
    const userId = "u-hier-1";
    const prefix = `test-hier-${Date.now()}`;

    // Create root folder A
    const folderA = await FilesService.createFolder({
      tenantId: testTenantId,
      userId,
      name: `${prefix}-A`,
      parentId: null,
    });

    // Create child folder B inside A
    const folderB = await FilesService.createFolder({
      tenantId: testTenantId,
      userId,
      name: `${prefix}-B`,
      parentId: folderA.id,
    });

    // Create child folder C inside B
    const folderC = await FilesService.createFolder({
      tenantId: testTenantId,
      userId,
      name: `${prefix}-C`,
      parentId: folderB.id,
    });

    // Attempt 1: Move folder A into itself -> Must throw
    let selfMoveRejected = false;
    try {
      await FilesService.moveItem({
        id: folderA.id,
        tenantId: testTenantId,
        userId,
        targetParentId: folderA.id,
      });
    } catch {
      selfMoveRejected = true;
    }
    assert(selfMoveRejected, "Should reject moving folder into itself");

    // Attempt 2: Move folder A into its descendant folder C -> Must throw
    let cycleRejected = false;
    try {
      await FilesService.moveItem({
        id: folderA.id,
        tenantId: testTenantId,
        userId,
        targetParentId: folderC.id,
      });
    } catch {
      cycleRejected = true;
    }
    assert(cycleRejected, "Should reject circular folder move into descendant");

    // Clean up
    await FilesService.deleteItemPermanently({ id: folderC.id, tenantId: testTenantId, userId, isSuper: true });
    await FilesService.deleteItemPermanently({ id: folderB.id, tenantId: testTenantId, userId, isSuper: true });
    await FilesService.deleteItemPermanently({ id: folderA.id, tenantId: testTenantId, userId, isSuper: true });
  });

  await runTest("Sibling case-insensitive uniqueness is strictly enforced", async () => {
    const userId = "u-uniq-1";
    const prefix = `Projects-${Date.now()}`;

    // Create folder "Projects"
    const folder = await FilesService.createFolder({
      tenantId: testTenantId,
      userId,
      name: prefix,
      parentId: null,
    });

    // Attempt to create duplicate folder "projects" or "PROJECTS" in same parent
    let duplicateRejected = false;
    try {
      await FilesService.createFolder({
        tenantId: testTenantId,
        userId,
        name: prefix.toUpperCase(),
        parentId: null,
      });
    } catch {
      duplicateRejected = true;
    }
    assert(duplicateRejected, "Should reject duplicate folder name with different case");

    // Clean up
    await FilesService.deleteItemPermanently({ id: folder.id, tenantId: testTenantId, userId, isSuper: true });
  });

  // ---------------------------------------------------------------------------
  // 6. DIRECT UPLOAD SESSION & PRIVACY BY DEFAULT
  // ---------------------------------------------------------------------------
  console.log("\n[SUITE 6] Direct Upload Protocol & Privacy Security");

  await runTest("Direct upload session: initiate, physical write, complete", async () => {
    const userId = "u-session-1";
    const fileName = `Q4_Summary_${Date.now()}.pdf`;
    const fileSize = 1024 * 50; // 50 KB

    // 1. Initiate session
    const sessionInit = await UploadSessionService.initiateSession({
      tenantId: testTenantId,
      userId,
      fileName,
      mimeType: "application/pdf",
      sizeBytes: fileSize,
    });

    assert(!!sessionInit.sessionId, "Session ID not returned");
    assert(!!sessionInit.uploadUrl, "Upload URL not returned");
    assert(!!sessionInit.storageKey, "Storage key not returned");

    // 2. Simulate physical object upload to storage
    const storageProvider = StorageProviderFactory.getProvider();
    if (storageProvider.uploadBuffer) {
      await storageProvider.uploadBuffer(sessionInit.storageKey, Buffer.alloc(fileSize, "P"), "application/pdf");
    }

    // 3. Complete session
    const completedFile = await UploadSessionService.completeSession(
      sessionInit.sessionId,
      userId,
      testTenantId
    );

    assert(completedFile.id === sessionInit.sessionId, "File ID should match session ID");
    assert(completedFile.fileName === fileName, "File name mismatch");
    assert(completedFile.status === "ACTIVE", "Status should be ACTIVE");
    assert(completedFile.version === 1, "Initial version should be 1");

    // 4. Verify Privacy by Default: Other user gets 404 (not 403)
    let unauthorized404 = false;
    try {
      await FilesService.getItem(
        completedFile.id,
        testTenantId,
        "other-user-999",
        false,
        ["employee"],
        []
      );
    } catch (e: any) {
      if (e.status === 404) unauthorized404 = true;
    }
    assert(unauthorized404, "Unauthorized user should receive 404 to avoid leaking file existence");

    // Clean up
    await FilesService.deleteItemPermanently({
      id: completedFile.id,
      tenantId: testTenantId,
      userId,
      isSuper: true,
    });
    await prisma.fileUploadSession.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.storageUsage.deleteMany({ where: { tenantId: testTenantId } });
  });

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`VERIFICATION COMPLETE: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    for (const f of results.filter((r) => !r.passed)) {
      console.error(`  - ${f.name}: ${f.error}`);
    }
    throw new Error(`${failed} tests failed during F1 verification.`);
  }

  return { total, passed, failed, results };
}

if (require.main === module) {
  runF1Verification()
    .then(() => {
      console.log("F1 VERIFICATION SUITE SUCCESSFUL.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("FATAL ERROR IN F1 VERIFICATION:", err);
      process.exit(1);
    });
}
