/**
 * End-to-End Verification Test Suite:
 * Employee Identity, Password Update, Coordinated Deletion & File Manager
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function runTestSuite() {
  console.log("=================================================================");
  console.log("MASTERHRMS E2E VERIFICATION SUITE: EMPLOYEE IDENTITY & FILE MGR");
  console.log("=================================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      testPassed++;
    } else {
      console.error(`[FAIL] ${name}`);
      testFailed++;
    }
  }

  // 1. Fetch or create a test tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error("No tenant found to test with.");
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log(`Testing with Tenant ID: ${tenantId} (${tenant.name})\n`);

  const timestamp = Date.now();
  const testEmail = `test.employee.${timestamp}@example.com`;
  let createdEmployee = null;
  let createdUser = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Schema parity verification for 17 columns
    // -------------------------------------------------------------------------
    console.log("--- TEST 1: Physical Schema Parity for 17 Columns ---");
    const checkColumnsSql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name IN (
        'father_or_spouse_name', 'present_address', 'permanent_address', 
        'completion_480_days_date', 'permanent_employment_date', 
        'worker_age_classification', 'maternity_nomination_date', 
        'marital_status', 'blood_group', 'address_line1', 'address_line2', 
        'city', 'district', 'postal_code', 'emergency_contact_name', 
        'emergency_contact_relationship', 'emergency_contact_phone'
      );
    `;
    const foundCols = await prisma.$queryRawUnsafe(checkColumnsSql);
    assert(foundCols.length === 17, `All 17 demographic & statutory columns exist physically in PostgreSQL (found: ${foundCols.length}/17)`);

    // -------------------------------------------------------------------------
    // TEST 2: Independent Employee Identity & User Provisioning
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Independent Employee Identity Provisioning ---");
    const initialPassword = "InitialSecurePassword@123";
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    // Create user account
    createdUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        profile: {
          create: {
            fullName: "Test Verification User",
            email: testEmail,
            tenantId,
          },
        },
        roles: {
          create: {
            role: "employee",
            tenantId,
          },
        },
      },
      include: { profile: true, roles: true },
    });

    assert(createdUser && createdUser.id, "User login account created successfully");
    assert(createdUser.roles.length === 1 && createdUser.roles[0].role === "employee", "Default user role is strictly 'employee'");

    // Create employee record linked to user
    createdEmployee = await prisma.employee.create({
      data: {
        tenantId,
        userId: createdUser.id,
        firstName: "Test",
        lastName: "Verification",
        email: testEmail,
        employeeCode: `E2E-${timestamp.toString().slice(-4)}`,
        position: "Quality Assurance Specialist",
        status: "active",
        employmentType: "full_time",
        fatherOrSpouseName: "Senior Verification Parent",
        city: "Chennai",
        bloodGroup: "O+",
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        fatherOrSpouseName: true,
        city: true,
        bloodGroup: true,
      },
    });

    assert(createdEmployee && createdEmployee.id, "Employee record created and linked 1:1 to User");
    assert(createdEmployee.fatherOrSpouseName === "Senior Verification Parent", "Column 'father_or_spouse_name' reads & writes correctly");

    // -------------------------------------------------------------------------
    // TEST 3: Password Update without Schema Crash
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Employee Password Update ---");
    const newPassword = "UpdatedSecurePassword@456";
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password on user
    await prisma.user.update({
      where: { id: createdUser.id },
      data: { passwordHash: newPasswordHash },
    });

    // Update employee (the exact query that previously crashed)
    const updatedEmployee = await prisma.employee.update({
      where: { id: createdEmployee.id },
      data: { userId: createdUser.id },
      select: { id: true, userId: true },
    });

    assert(updatedEmployee.userId === createdUser.id, "Employee updated without Prisma 42703 column error");

    // Verify password verification
    const refreshedUser = await prisma.user.findUnique({ where: { id: createdUser.id } });
    const passwordMatches = await bcrypt.compare(newPassword, refreshedUser.passwordHash);
    assert(passwordMatches === true, "New password verified with bcrypt comparison");

    // -------------------------------------------------------------------------
    // TEST 4: Coordinated Session Management & Revocation
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Device Session Creation & Coordinated Revocation ---");
    const session = await prisma.deviceSession.create({
      data: {
        userId: createdUser.id,
        tenantId,
        deviceName: "Test Browser Session",
        deviceType: "desktop",
        ipAddress: "127.0.0.1",
        userAgent: "Playwright E2E Runner",
        revoked: false,
      },
    });
    assert(session && session.revoked === false, "Active DeviceSession created");

    // Simulate employee deactivation/deletion
    await prisma.$transaction(async (tx) => {
      // 1. Revoke active sessions
      await tx.deviceSession.updateMany({
        where: { userId: createdUser.id, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
      // 2. Soft archive employee
      await tx.employee.update({
        where: { id: createdEmployee.id },
        data: { status: "terminated", userId: null },
        select: { id: true },
      });
      // 3. Remove user roles for tenant
      await tx.userRole.deleteMany({
        where: { userId: createdUser.id, tenantId },
      });
    });

    const revokedSessions = await prisma.deviceSession.findMany({
      where: { userId: createdUser.id },
    });
    assert(revokedSessions.every((s) => s.revoked === true), "All active DeviceSessions are revoked (revoked = true)");

    const remainingRoles = await prisma.userRole.findMany({
      where: { userId: createdUser.id, tenantId },
    });
    assert(remainingRoles.length === 0, "Tenant access roles cleanly removed");

    const archivedEmployee = await prisma.employee.findUnique({
      where: { id: createdEmployee.id },
      select: { id: true, status: true, userId: true },
    });
    assert(archivedEmployee.status === "terminated" && archivedEmployee.userId === null, "Employee archived/terminated and login identity safely unlinked");

    // -------------------------------------------------------------------------
    // TEST 5: File Manager Folder Structure & parentId Scoping
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: File Manager Folder Structure & parentId Scoping ---");
    // Create test folder
    const testFolder = await prisma.mediaFile.create({
      data: {
        tenantId,
        uploadedBy: createdUser.id,
        ownerId: createdUser.id,
        fileName: `E2E_Test_Folder_${timestamp}`,
        filePath: `/folders/${timestamp}`,
        url: `/folders/${timestamp}`,
        mimeType: "application/vnd.folder",
        fileSize: 0,
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        isFolder: true,
        status: "ACTIVE",
        folder: "root",
      },
    });
    assert(testFolder && testFolder.isFolder === true, "Test folder created successfully");

    // Create child file inside folder
    const childFile = await prisma.mediaFile.create({
      data: {
        tenantId,
        uploadedBy: createdUser.id,
        ownerId: createdUser.id,
        fileName: `child_document_${timestamp}.pdf`,
        filePath: `/files/${timestamp}/child_document.pdf`,
        url: `/files/${timestamp}/child_document.pdf`,
        mimeType: "application/pdf",
        fileSize: 2048,
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        isFolder: false,
        status: "ACTIVE",
        parentId: testFolder.id,
        folder: testFolder.fileName,
      },
    });
    assert(childFile && childFile.parentId === testFolder.id, "Child file created inside test folder with parentId");

    // Query children using parentId
    const folderContents = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        parentId: testFolder.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    });
    assert(folderContents.length === 1 && folderContents[0].id === childFile.id, "Folder contents retrieved correctly by parentId filter");

    // Cleanup test file manager entries
    await prisma.mediaFile.delete({ where: { id: childFile.id } });
    await prisma.mediaFile.delete({ where: { id: testFolder.id } });

  } catch (err) {
    console.error("Test Suite execution encountered an error:", err);
    testFailed++;
  } finally {
    // Cleanup created test records
    if (createdEmployee) {
      try {
        await prisma.employee.delete({ where: { id: createdEmployee.id } });
      } catch {}
    }
    if (createdUser) {
      try {
        await prisma.deviceSession.deleteMany({ where: { userId: createdUser.id } });
        await prisma.profile.deleteMany({ where: { userId: createdUser.id } });
        await prisma.userRole.deleteMany({ where: { userId: createdUser.id } });
        await prisma.user.delete({ where: { id: createdUser.id } });
      } catch {}
    }
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log("=================================================================");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTestSuite();
