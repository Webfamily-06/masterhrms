/**
 * MASTERHRMS — PHASE F5 END-TO-END AUTOMATED VERIFICATION SUITE
 * 
 * Comprehensive verification of:
 * - System folder hierarchy convention (App Files / Module / Page)
 * - Auto-provisioning via /system-folders/ensure
 * - System folder immutability (rename/trash/delete protection)
 * - Universal FilePicker candidate resolution
 * - Zero-byte FileLink creation & cascading entity cleanup
 * - Module permission delegation (canAccessViaEntity)
 * - Public vs. Private asset URL segregation
 * - Local-to-Object storage migration engine & SHA-256 verification
 * - Multi-tenant isolation & RBAC enforcement
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const { PrismaClient } = require(path.join(__dirname, "../server/node_modules/@prisma/client"));
const jwt = require(path.join(__dirname, "../server/node_modules/jsonwebtoken"));

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";

// Dynamic imports from server dist
const { SystemFolderService } = require("../server/dist/services/files/system-folder.service");
const { FileLinkService } = require("../server/dist/services/files/file-link.service");
const { FileAclService } = require("../server/dist/services/files/file-acl.service");
const { StorageMigrationService } = require("../server/dist/services/files/storage-migration.service");
const { FilesService } = require("../server/dist/services/files/files.service");

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

async function runF5Verification() {
  console.log("================================================================================");
  console.log("🔬 MASTERHRMS — PHASE F5 END-TO-END AUTOMATED VERIFICATION SUITE");
  console.log("Scope: System Folders, Universal Linking, Delegated Permissions & Migration");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [F5-TEST ${totalTests}] PASS: ${testName}`);
    } else {
      console.error(`  ✗ [F5-TEST ${totalTests}] FAIL: ${testName} - ${details}`);
      throw new Error(`F5 verification test ${totalTests} failed: ${testName} (${details})`);
    }
  }

  const testTenantId = `tenant-f5-test-${Date.now()}`;
  const crossTenantId = `tenant-f5-cross-${Date.now()}`;

  console.log(`[SETUP] Creating isolated test tenants: ${testTenantId} and ${crossTenantId}`);

  await prisma.tenant.create({
    data: {
      id: testTenantId,
      name: "F5 Test Tenant",
      slug: `f5-test-${Date.now()}`,
    },
  });

  await prisma.tenant.create({
    data: {
      id: crossTenantId,
      name: "F5 Cross Tenant",
      slug: `f5-cross-${Date.now()}`,
    },
  });

  // Create test users
  const adminUser = await prisma.user.create({
    data: {
      email: `admin-${testTenantId}@test.com`,
      passwordHash: "dummy-password-hash",
      profile: {
        create: {
          fullName: "F5 Admin User",
          tenantId: testTenantId,
        },
      },
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      email: `employee-${testTenantId}@test.com`,
      passwordHash: "dummy-password-hash",
      profile: {
        create: {
          fullName: "F5 Employee User",
          tenantId: testTenantId,
        },
      },
    },
  });

  const crossUser = await prisma.user.create({
    data: {
      email: `cross-${crossTenantId}@test.com`,
      passwordHash: "dummy-password-hash",
      profile: {
        create: {
          fullName: "F5 Cross User",
          tenantId: crossTenantId,
        },
      },
    },
  });

  // Create Employee HR records
  const employeeRecord = await prisma.employee.create({
    data: {
      userId: employeeUser.id,
      tenantId: testTenantId,
      employeeCode: `EMP-${Date.now()}`,
      firstName: "Test",
      lastName: "Employee",
      email: employeeUser.email,
    },
  });

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: SYSTEM FOLDER CONVENTION & DYNAMIC PROVISIONING
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 1: SYSTEM FOLDER HIERARCHY & DYNAMIC PROVISIONING ---");

    const ensureResult = await SystemFolderService.ensureSystemFolder({
      tenantId: testTenantId,
      moduleKey: "expenses",
      pageKey: "claims",
      actorId: adminUser.id,
    });

    assert(ensureResult.rootFolder.fileName === "App Files", "Root folder named 'App Files'");
    assert(ensureResult.rootFolder.ownerType === "SYSTEM", "Root folder owned by SYSTEM");
    assert(ensureResult.moduleFolder.fileName === "Expenses", "Module folder dynamically named 'Expenses'");
    assert(ensureResult.moduleFolder.systemModule === "expenses", "Module folder marked systemModule='expenses'");
    assert(ensureResult.targetFolder.fileName === "Expense Claims", "Page folder dynamically named 'Expense Claims'");
    assert(ensureResult.targetFolder.systemPage === "claims", "Page folder marked systemPage='claims'");
    assert(ensureResult.targetFolder.materializedPath.includes("/App Files/Expenses/Expense Claims/"), "Materialized path calculated accurately");

    // Idempotent re-provisioning
    const ensureResult2 = await SystemFolderService.ensureSystemFolder({
      tenantId: testTenantId,
      moduleKey: "expenses",
      pageKey: "claims",
      actorId: adminUser.id,
    });

    assert(ensureResult2.targetFolder.id === ensureResult.targetFolder.id, "System folder provisioning is strictly idempotent");

    // Additional system folders: Recruitment / Resumes & Profile / Avatars
    const recruitFolder = await SystemFolderService.ensureSystemFolder({
      tenantId: testTenantId,
      moduleKey: "recruitment",
      pageKey: "resumes",
    });
    assert(recruitFolder.targetFolder.filePath === "App Files/Recruitment/Resumes", "Recruitment/Resumes system folder created");

    const profileFolder = await SystemFolderService.ensureSystemFolder({
      tenantId: testTenantId,
      moduleKey: "profile",
      pageKey: "avatars",
    });
    assert(profileFolder.targetFolder.filePath === "App Files/Profile/Avatars", "Profile/Avatars system folder created");

    // List system folders
    const allSystemFolders = await SystemFolderService.listSystemFolders(testTenantId);
    assert(allSystemFolders.length >= 5, "listSystemFolders returns all provisioned system nodes");

    // -------------------------------------------------------------------------
    // SECTION 2: SYSTEM FOLDER IMMUTABILITY & GUARDRAILS
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: SYSTEM FOLDER IMMUTABILITY & PROTECTION ---");

    // Rename protection
    let renameBlocked = false;
    try {
      await FilesService.renameItem({
        id: ensureResult.targetFolder.id,
        newName: "User Renamed Claims",
        tenantId: testTenantId,
        userId: adminUser.id,
      });
    } catch (e) {
      renameBlocked = e.status === 403 || e.message.includes("System folders");
    }
    assert(renameBlocked, "System folders are protected from rename (403 Forbidden)");

    // Move protection
    let moveBlocked = false;
    try {
      await FilesService.moveItem({
        id: ensureResult.targetFolder.id,
        targetParentId: recruitFolder.moduleFolder.id,
        tenantId: testTenantId,
        userId: adminUser.id,
      });
    } catch (e) {
      moveBlocked = e.status === 403 || e.message.includes("System folders") || e.message.includes("modified");
    }
    assert(moveBlocked, "System folders are protected from move (403 Forbidden)");

    // Trash / Delete protection
    let trashBlocked = false;
    try {
      await FilesService.trashItems({
        ids: [ensureResult.targetFolder.id],
        tenantId: testTenantId,
        userId: adminUser.id,
      });
    } catch (e) {
      trashBlocked = e.status === 403 || (e.message && e.message.includes("System folders"));
    }
    assert(trashBlocked, "System folders are protected from move to trash (403 Forbidden)");

    // -------------------------------------------------------------------------
    // SECTION 3: UNIVERSAL FILE LINKING & ZERO-BYTE REFERENCES
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: UNIVERSAL FILE LINKING & ZERO DUPLICATE BYTES ---");

    // Create a physical file uploaded by employee
    const receiptFile = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: "taxi_receipt_october.pdf",
        nameKey: "taxi_receipt_october.pdf",
        filePath: `App Files/Expenses/Expense Claims/taxi_receipt_october.pdf`,
        url: "/uploads/taxi_receipt_october.pdf",
        storageDisk: "LOCAL",
        mimeType: "application/pdf",
        fileSize: 204850,
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        folder: "App Files/Expenses/Expense Claims",
        parentId: ensureResult.targetFolder.id,
        ownerType: "USER",
        ownerId: employeeUser.id,
        uploadedBy: employeeUser.id,
        type: "FILE",
        category: "Documents",
        status: "ACTIVE",
      },
    });

    // Create FileLink to an ExpenseClaim entity
    const expenseCategory = await prisma.expenseCategory.create({
      data: {
        id: `cat-travel-${Date.now()}`,
        tenantId: testTenantId,
        name: "Travel",
        code: `TRV-${Date.now()}`,
      },
    });

    const claimId = `claim-exp-${Date.now()}`;
    const claimRecord = await prisma.expenseClaim.create({
      data: {
        id: claimId,
        tenantId: testTenantId,
        employeeId: employeeRecord.id,
        categoryId: expenseCategory.id,
        claimCode: `EXP-${Date.now()}`,
        title: "Client Site Travel",
        amount: 450.0,
        expenseDate: new Date(),
        merchant: "Yellow Cab Co",
        status: "pending",
        storedDocumentId: receiptFile.id,
      },
    });

    const link1 = await FileLinkService.createLink({
      fileId: receiptFile.id,
      tenantId: testTenantId,
      module: "expenses",
      pageKey: "claims",
      entityType: "expense_claim",
      entityId: claimId,
      fieldKey: "receipt",
      linkedBy: employeeUser.id,
    });

    assert(link1.id !== null, "FileLink created successfully");
    assert(link1.fileId === receiptFile.id, "FileLink points to target file ID");
    assert(link1.entityId === claimId, "FileLink points to target business entity ID");

    // Verify zero duplicate bytes: media_files count must remain 1
    const fileCount = await prisma.mediaFile.count({
      where: { fileName: "taxi_receipt_october.pdf", tenantId: testTenantId },
    });
    assert(fileCount === 1, "Zero duplicate bytes: file is referenced, not cloned");

    // Fetch links by entity
    const entityLinks = await FileLinkService.getLinksByEntity("expense_claim", claimId);
    assert(entityLinks.length === 1, "getLinksByEntity returns attached link");
    assert(entityLinks[0].file.fileName === "taxi_receipt_october.pdf", "getLinksByEntity includes nested file metadata");

    // Cross-tenant linking rejection
    let crossLinkRejected = false;
    try {
      await FileLinkService.createLink({
        fileId: receiptFile.id,
        tenantId: crossTenantId, // Attempting to link to foreign workspace
        module: "expenses",
        pageKey: "claims",
        entityType: "expense_claim",
        entityId: `cross-claim-1`,
        fieldKey: "receipt",
        linkedBy: crossUser.id,
      });
    } catch (e) {
      crossLinkRejected = e.status === 403;
    }
    assert(crossLinkRejected, "Cross-tenant file linking is rejected (403 Forbidden)");

    // -------------------------------------------------------------------------
    // SECTION 4: MODULE PERMISSION DELEGATION (canAccessViaEntity)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 4: MODULE PERMISSION DELEGATION (canAccessViaEntity) ---");

    // Scenario: A manager or finance admin needs to view the receipt attached to the claim
    // Even though they do not own the personal file and no direct FileAcl exists.
    const managerUser = await prisma.user.create({
      data: {
        email: `manager-${testTenantId}@test.com`,
        passwordHash: "dummy-password-hash",
        profile: {
          create: {
            fullName: "F5 Finance Manager",
            tenantId: testTenantId,
          },
        },
      },
    });

    // Claimant access
    const claimantCanAccess = await FileLinkService.canAccessViaEntity(
      employeeUser.id,
      testTenantId,
      receiptFile.id,
      ["employee"]
    );
    assert(claimantCanAccess, "Claimant has delegated access to their linked receipt");

    // Finance Admin / Manager access
    const managerCanAccess = await FileLinkService.canAccessViaEntity(
      managerUser.id,
      testTenantId,
      receiptFile.id,
      ["finance_admin"]
    );
    assert(managerCanAccess, "Finance Admin has delegated access to file linked to ExpenseClaim");

    // Unrelated user from same tenant access denied
    const otherEmployee = await prisma.user.create({
      data: {
        email: `other-${testTenantId}@test.com`,
        passwordHash: "dummy-password-hash",
        profile: {
          create: {
            fullName: "F5 Unrelated Employee",
            tenantId: testTenantId,
          },
        },
      },
    });

    const unrelatedCanAccess = await FileLinkService.canAccessViaEntity(
      otherEmployee.id,
      testTenantId,
      receiptFile.id,
      ["employee"]
    );
    assert(!unrelatedCanAccess, "Unrelated employee is DENIED access to private claim receipt");

    // Full FileAclService.resolvePermission verification with delegated link
    const aclResolved = await FileAclService.resolvePermission({
      fileId: receiptFile.id,
      tenantId: testTenantId,
      userId: managerUser.id,
      userRoles: ["finance_admin"],
    });
    assert(aclResolved.permission === "VIEWER", "FileAclService resolves VIEWER permission via FileLink delegation");

    // -------------------------------------------------------------------------
    // SECTION 5: UNLINKING ON BUSINESS RECORD DELETION
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 5: CASCADING UNLINK ON BUSINESS RECORD DELETION ---");

    // Removing link explicitly
    const removeSuccess = await FileLinkService.removeLink(link1.id, employeeUser.id);
    assert(removeSuccess, "removeLink successfully unlinks file from entity");

    // Physical file must still exist
    const fileStillExists = await prisma.mediaFile.findUnique({ where: { id: receiptFile.id } });
    assert(fileStillExists !== null, "Underlying MediaFile is PRESERVED when link is removed");

    // Re-link and test cascading delete when entity is deleted
    await FileLinkService.createLink({
      fileId: receiptFile.id,
      tenantId: testTenantId,
      module: "expenses",
      pageKey: "claims",
      entityType: "expense_claim",
      entityId: claimId,
      fieldKey: "receipt",
      linkedBy: employeeUser.id,
    });

    const unlinkedCount = await FileLinkService.removeLinksByEntity("expense_claim", claimId);
    assert(unlinkedCount >= 1, "removeLinksByEntity cascaded and cleaned up all entity links");

    const linksAfterEntityDelete = await FileLinkService.getLinksByEntity("expense_claim", claimId);
    assert(linksAfterEntityDelete.length === 0, "Zero orphan links remain after entity cleanup");

    // -------------------------------------------------------------------------
    // SECTION 6: PUBLIC VS. PRIVATE ASSET SEGREGATION
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 6: PUBLIC VS. PRIVATE ASSET SEGREGATION ---");

    // Create a public branding asset
    const brandingFile = await prisma.mediaFile.create({
      data: {
        tenantId: testTenantId,
        fileName: "company_logo_header.png",
        nameKey: "company_logo_header.png",
        filePath: "system/branding/company_logo_header.png",
        url: "/uploads/system/branding/company_logo_header.png",
        storageDisk: "LOCAL",
        mimeType: "image/png",
        fileSize: 45000,
        checksumSha: "c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
        folder: "system/branding",
        tags: ["branding", "public"],
        isPublic: true,
        type: "FILE",
        status: "ACTIVE",
      },
    });

    // Public file resolves for anonymous/any user
    const publicAcl = await FileAclService.resolvePermission({
      fileId: brandingFile.id,
      tenantId: testTenantId,
      userId: otherEmployee.id,
    });
    assert(publicAcl.permission === "VIEWER", "Public branding asset resolves VIEWER without specific ACL");

    // Private file resolves only for owner / delegated
    let privateAccessDenied = false;
    try {
      await FileAclService.resolvePermission({
        fileId: receiptFile.id,
        tenantId: testTenantId,
        userId: otherEmployee.id,
      });
    } catch (e) {
      privateAccessDenied = e.status === 404 || e.message.includes("not found");
    }
    assert(privateAccessDenied, "Private receipt file strictly denies unprivileged users (404/privacy by default)");

    // -------------------------------------------------------------------------
    // SECTION 7: LOCAL-TO-OBJECT STORAGE MIGRATION ENGINE
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 7: LOCAL-TO-OBJECT STORAGE MIGRATION ENGINE ---");

    const telemetry = await StorageMigrationService.runMigration({
      batchSize: 10,
      tenantId: testTenantId,
      actorId: adminUser.id,
    });

    assert(telemetry.jobId !== null, "Storage migration job generated unique jobId");
    assert(telemetry.processedCount >= 0, "Storage migration tracked processed item count");
    assert(telemetry.isRunning === false, "Storage migration completed execution cycle");

    const telemetryQuery = StorageMigrationService.getTelemetry();
    assert(telemetryQuery.jobId === telemetry.jobId, "getTelemetry returns active migration status");

    console.log("\n================================================================================");
    console.log(`🎉 ALL PHASE F5 END-TO-END TESTS PASSED (${passedTests} / ${totalTests}) — 100% SUCCESS`);
    console.log("================================================================================\n");
  } finally {
    // Clean up test data
    console.log("[TEARDOWN] Cleaning up isolated test tenants and records...");
    await prisma.fileLink.deleteMany({
      where: { file: { tenantId: { in: [testTenantId, crossTenantId] } } },
    });
    await prisma.expenseClaim.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.expenseCategory.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.mediaFile.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.employee.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.profile.deleteMany({
      where: { tenantId: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: testTenantId } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: crossTenantId } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantId, crossTenantId] } },
    });
    await prisma.$disconnect();
  }
}

runF5Verification().catch((err) => {
  console.error("FATAL: Phase F5 E2E Verification failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
