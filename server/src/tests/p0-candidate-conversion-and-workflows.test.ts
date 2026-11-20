import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { RecruitmentService } from "../services/recruitment.service";
import { LeaveService, LeaveHttpError } from "../services/leave.service";
import { AttendanceService } from "../services/attendance.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>, userId = "admin-actor-1", roles = ["admin", "hr_admin"]): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId,
    roles,
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma as any,
  };
  return runWithTenantContext(ctx, fn);
}

test("MASTERHRMS — Phase 3 Milestone 1: P0 Workflows & ATS Leave Seeding Verification Suite", async (t) => {
  const timestamp = Date.now();
  const tenantAId = `test-p0-tenant-a-${timestamp}`;
  const tenantBId = `test-p0-tenant-b-${timestamp}`;
  const tenantNoLeavesId = `test-p0-tenant-nl-${timestamp}`;

  const hrUserAId = `user-hr-a-${timestamp}`;
  const managerAId = `user-mgr-a-${timestamp}`;
  const unauthorizedUserAId = `user-unauth-a-${timestamp}`;
  const candidateUserId = `user-cand-${timestamp}`;

  let employeeAId = "";
  let managerEmployeeAId = "";
  let leaveTypeAnnualId = "";
  let leaveTypeCasualId = "";
  let leaveTypeInactiveId = "";
  let leaveTypeBId = "";
  let candidateAId = "";
  let candidateNoLeavesId = "";

  const cleanup = async () => {
    try {
      const allTenants = [tenantAId, tenantBId, tenantNoLeavesId];
      await rawPrisma.leaveLedgerEntry.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.compOffUsageAllocation.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.leaveRequest.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.leaveType.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.attendance.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.candidateOnboardingTask.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.candidateOnboarding.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.jobCandidate.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.jobPosting.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.companyDocument.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.employee.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.userRole.deleteMany({ where: { userId: { in: [hrUserAId, managerAId, unauthorizedUserAId, candidateUserId] } } });
      await rawPrisma.profile.deleteMany({ where: { userId: { in: [hrUserAId, managerAId, unauthorizedUserAId, candidateUserId] } } });
      await rawPrisma.user.deleteMany({ where: { id: { in: [hrUserAId, managerAId, unauthorizedUserAId, candidateUserId] } } });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: allTenants } } });
    } catch (err) {
      console.warn("Cleanup notice:", err);
    }
  };

  try {
    // --------------------------------------------------------------------------
    // 0. PROVISION TEST TENANTS & USERS
    // --------------------------------------------------------------------------
    await rawPrisma.tenant.createMany({
      data: [
        { id: tenantAId, name: "Tenant Alpha P0", slug: `alpha-p0-${timestamp}` },
        { id: tenantBId, name: "Tenant Beta P0", slug: `beta-p0-${timestamp}` },
        { id: tenantNoLeavesId, name: "Tenant No Leaves P0", slug: `nl-p0-${timestamp}` },
      ],
    });

    // Create HR Admin user for Tenant A
    await rawPrisma.user.create({
      data: {
        id: hrUserAId,
        email: `hr-alpha-${timestamp}@masterhrms.com`,
        passwordHash: "hash-hr-pass",
      },
    });
    await rawPrisma.profile.create({
      data: { userId: hrUserAId, fullName: "Alpha HR Admin" },
    });
    await rawPrisma.userRole.create({
      data: { userId: hrUserAId, role: "hr_admin" },
    });

    // Create Manager user for Tenant A
    await rawPrisma.user.create({
      data: {
        id: managerAId,
        email: `mgr-alpha-${timestamp}@masterhrms.com`,
        passwordHash: "hash-mgr-pass",
      },
    });
    await rawPrisma.profile.create({
      data: { userId: managerAId, fullName: "Alpha Reporting Manager" },
    });
    await rawPrisma.userRole.create({
      data: { userId: managerAId, role: "manager" },
    });

    // Create Manager Employee record
    const mgrEmp = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: managerAId,
        employeeCode: `MGR-${timestamp.toString().slice(-4)}`,
        firstName: "Alpha",
        lastName: "Manager",
        email: `mgr-alpha-${timestamp}@masterhrms.com`,
        status: "active",
      },
    });
    managerEmployeeAId = mgrEmp.id;

    // Create Unauthorized regular employee user for Tenant A
    await rawPrisma.user.create({
      data: {
        id: unauthorizedUserAId,
        email: `unauth-alpha-${timestamp}@masterhrms.com`,
        passwordHash: "hash-unauth-pass",
      },
    });
    await rawPrisma.userRole.create({
      data: { userId: unauthorizedUserAId, role: "employee" },
    });

    // Create Candidate User account
    await rawPrisma.user.create({
      data: {
        id: candidateUserId,
        email: `cand-alpha-${timestamp}@masterhrms.com`,
        passwordHash: "hash-cand-pass",
      },
    });
    await rawPrisma.profile.create({
      data: { userId: candidateUserId, fullName: "Alpha Candidate User" },
    });
    await rawPrisma.userRole.create({
      data: { userId: candidateUserId, role: "employee" },
    });

    // Configure Leave Types for Tenant A (2 Active, 1 Inactive)
    const ltAnnual = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Annual Leave",
        code: "AL",
        daysPerYear: 18,
        isPaid: true,
        status: "active",
      },
    });
    leaveTypeAnnualId = ltAnnual.id;

    const ltCasual = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Casual Leave",
        code: "CL",
        daysPerYear: 12,
        isPaid: true,
        status: "active",
      },
    });
    leaveTypeCasualId = ltCasual.id;

    const ltInactive = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Old Sabbatical",
        code: "OS",
        daysPerYear: 30,
        isPaid: false,
        status: "inactive", // MUST BE EXCLUDED FROM INITIAL SEEDING
      },
    });
    leaveTypeInactiveId = ltInactive.id;

    // Configure Leave Type for Tenant B (Must NEVER be seeded to Tenant A)
    const ltB = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantBId,
        name: "Cross Tenant Leave",
        code: "CTL",
        daysPerYear: 25,
        isPaid: true,
        status: "active",
      },
    });
    leaveTypeBId = ltB.id;

    // --------------------------------------------------------------------------
    // SUITE 1: ATS CANDIDATE CONVERSION & INITIAL LEAVE BALANCE SEEDING (WORKFLOW C)
    // --------------------------------------------------------------------------
    await t.test("Workflow C: Candidate Conversion and Automatic Leave Seeding", async (st) => {
      // 1.1 Setup job posting and candidate with onboarding tasks
      const jobA = await rawPrisma.jobPosting.create({
        data: {
          tenantId: tenantAId,
          title: "Fullstack Engineer",
          slug: `fullstack-eng-${timestamp}`,
          description: "Fullstack engineering role",
          status: "published",
        },
      });

      const candidateA = await rawPrisma.jobCandidate.create({
        data: {
          tenantId: tenantAId,
          jobPostingId: jobA.id,
          fullName: "Rohan Sharma",
          email: `rohan.sharma.${timestamp}@example.com`,
          phone: "+919876543210",
          stage: "interview",
        },
      });
      candidateAId = candidateA.id;

      const onboardingA = await rawPrisma.candidateOnboarding.create({
        data: {
          tenantId: tenantAId,
          candidateId: candidateA.id,
          status: "in_progress",
          bgvStatus: "verified",
          joiningDate: new Date(),
        },
      });

      await rawPrisma.candidateOnboardingTask.create({
        data: {
          tenantId: tenantAId,
          onboardingId: onboardingA.id,
          title: "Submit PAN Card",
          category: "pan",
          description: "PAN is ABCDE1234F",
          isMandatory: true,
          status: "completed",
        },
      });

      // 1.2 Execute Candidate Conversion
      const conversionResult = await executeAsTenant(tenantAId, () =>
        RecruitmentService.convertCandidateToEmployee(
          tenantAId,
          hrUserAId,
          candidateA.id,
          {
            createLoginAccount: false,
          }
        )
      );

      assert.equal(conversionResult.success, true, "Conversion must report success: true");
      assert.ok(conversionResult.employee, "Converted employee object must exist");
      assert.equal(conversionResult.employee.tenantId, tenantAId, "Employee must belong to Tenant A");
      assert.ok(conversionResult.employee.employeeCode.startsWith("EMP-"), "Auto-generated employeeCode must have EMP- prefix");
      employeeAId = conversionResult.employee.id;

      // 1.3 Verify Candidate and Onboarding status updates
      const updatedCandidate = await rawPrisma.jobCandidate.findUnique({ where: { id: candidateA.id } });
      assert.equal(updatedCandidate?.isConvertedToEmployee, true, "Candidate isConvertedToEmployee must be true");
      assert.equal(updatedCandidate?.convertedEmployeeId, employeeAId, "Candidate convertedEmployeeId must match created employee");
      assert.equal(updatedCandidate?.stage, "hired", "Candidate stage must be updated to hired");

      const updatedOnboarding = await rawPrisma.candidateOnboarding.findUnique({ where: { id: onboardingA.id } });
      assert.equal(updatedOnboarding?.status, "joined", "Onboarding status must be updated to joined");

      // 1.4 Verify Automatic Initial Leave Balance Seeding
      const seededLedgerEntries = await rawPrisma.leaveLedgerEntry.findMany({
        where: { tenantId: tenantAId, employeeId: employeeAId },
      });

      // Exactly 2 active leave types seeded (Annual: 18, Casual: 12)
      assert.equal(seededLedgerEntries.length, 2, "Must seed exactly 2 ledger entries for the 2 active leave types");

      const annualEntry = seededLedgerEntries.find((e) => e.leaveTypeId === leaveTypeAnnualId);
      assert.ok(annualEntry, "Annual Leave ACCRUAL entry must exist");
      assert.equal(annualEntry.entryType, "ACCRUAL");
      assert.equal(Number(annualEntry.days), 18, "Annual Leave must seed 18 days");
      assert.equal(Number(annualEntry.balance), 18, "Annual Leave initial balance must equal quota 18");

      const casualEntry = seededLedgerEntries.find((e) => e.leaveTypeId === leaveTypeCasualId);
      assert.ok(casualEntry, "Casual Leave ACCRUAL entry must exist");
      assert.equal(casualEntry.entryType, "ACCRUAL");
      assert.equal(Number(casualEntry.days), 12, "Casual Leave must seed 12 days");
      assert.equal(Number(casualEntry.balance), 12, "Casual Leave initial balance must equal quota 12");

      // 1.5 Verify Inactive Leave Type is EXCLUDED
      const inactiveEntry = seededLedgerEntries.find((e) => e.leaveTypeId === leaveTypeInactiveId);
      assert.equal(inactiveEntry, undefined, "Inactive leave type must NOT be seeded");

      // 1.6 Verify Cross-Tenant Leave Type is NEVER accessed
      const crossTenantEntry = seededLedgerEntries.find((e) => e.leaveTypeId === leaveTypeBId);
      assert.equal(crossTenantEntry, undefined, "Cross-tenant leave type must NEVER be seeded");

      // 1.7 Verify Tenant with No Leave Types handles conversion safely without inventing balances
      const jobNL = await rawPrisma.jobPosting.create({
        data: {
          tenantId: tenantNoLeavesId,
          title: "Designer",
          slug: `designer-${timestamp}`,
          description: "Product design role",
          status: "published",
        },
      });
      const candidateNL = await rawPrisma.jobCandidate.create({
        data: {
          tenantId: tenantNoLeavesId,
          jobPostingId: jobNL.id,
          fullName: "Aarav Patel",
          email: `aarav.patel.${timestamp}@example.com`,
          stage: "interview",
        },
      });
      candidateNoLeavesId = candidateNL.id;

      const nlConversionResult = await executeAsTenant(tenantNoLeavesId, () =>
        RecruitmentService.convertCandidateToEmployee(
          tenantNoLeavesId,
          hrUserAId,
          candidateNL.id,
          { createLoginAccount: false }
        )
      );
      assert.equal(nlConversionResult.success, true, "Tenant with no leave types must still successfully convert candidate");

      const nlLedgerEntries = await rawPrisma.leaveLedgerEntry.findMany({
        where: { tenantId: tenantNoLeavesId, employeeId: nlConversionResult.employee.id },
      });
      assert.equal(nlLedgerEntries.length, 0, "No leave ledger entries must be created when tenant has no active leave types");

      // 1.8 Verify Idempotency: Repeated balance sync does NOT duplicate allocations
      const currentYear = new Date().getUTCFullYear();
      const reSyncResult = await LeaveService.synchronizeEmployeeYearlyAccruals(
        tenantAId,
        currentYear,
        hrUserAId,
        employeeAId
      );
      assert.equal(reSyncResult.success, true);
      assert.equal(reSyncResult.createdEntriesCount, 0, "Re-syncing already seeded employee must create 0 new allocations");

      const entriesAfterReSync = await rawPrisma.leaveLedgerEntry.findMany({
        where: { tenantId: tenantAId, employeeId: employeeAId },
      });
      assert.equal(entriesAfterReSync.length, 2, "Total entries must remain exactly 2 without duplication");

      // 1.9 Verify Candidate conversion rejection if already converted
      await assert.rejects(
        async () => {
          await executeAsTenant(tenantAId, () =>
            RecruitmentService.convertCandidateToEmployee(tenantAId, hrUserAId, candidateA.id)
          );
        },
        /already been converted/,
        "Must reject conversion if candidate was already marked converted"
      );
    });

    // --------------------------------------------------------------------------
    // SUITE 2: ATTENDANCE PUNCH VERIFICATION (WORKFLOW A)
    // --------------------------------------------------------------------------
    await t.test("Workflow A: Attendance Punch, Duplicate Guard & Tenant Isolation", async (st) => {
      // 2.1 Valid Check-in
      const punchInResult = await AttendanceService.recordPunch(tenantAId, employeeAId, {
        type: "check_in",
        notes: "On-time web check-in",
        source: "WEB",
      });
      assert.ok(punchInResult.record, "Attendance record must be returned");
      assert.ok(["present", "late"].includes(punchInResult.record.status), "Punch status must be valid attendance state");
      assert.ok(punchInResult.record.checkIn, "checkIn timestamp must be set");
      assert.equal(punchInResult.action, "check_in");

      // 2.2 Duplicate Punch Prevention
      await assert.rejects(
        async () => {
          await AttendanceService.recordPunch(tenantAId, employeeAId, {
            type: "check_in",
            source: "WEB",
          });
        },
        /Already checked in for today/,
        "Duplicate check-in on the same day must throw an error"
      );

      // 2.3 Clock-out
      const punchOutResult = await AttendanceService.recordPunch(tenantAId, employeeAId, {
        type: "check_out",
        notes: "End of day punch",
        source: "WEB",
      });
      assert.ok(punchOutResult.record.checkOut, "checkOut timestamp must be populated");
      assert.equal(punchOutResult.action, "check_out");

      // 2.4 Tenant Isolation Guard: Punch with cross-tenant employee ID must be rejected
      await assert.rejects(
        async () => {
          await AttendanceService.recordPunch(tenantBId, employeeAId, {
            type: "check_in",
          });
        },
        /Employee not found in tenant/,
        "Cross-tenant punch attempt must be rejected fail-closed"
      );
    });

    // --------------------------------------------------------------------------
    // SUITE 3: LEAVE REQUEST & APPROVAL VERIFICATION (WORKFLOW B)
    // --------------------------------------------------------------------------
    await t.test("Workflow B: Leave Dry-Run, Submission, Segregation of Duties & Single Deduction", async (st) => {
      // Assign manager to Employee A
      await rawPrisma.employee.update({
        where: { id: employeeAId },
        data: {
          managerId: managerEmployeeAId,
          userId: candidateUserId, // Link to a test user account for self-approval check
        },
      });

      // 3.1 Dry-Run Calculation
      const today = new Date();
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
      const nextTuesday = new Date(nextMonday);
      nextTuesday.setDate(nextMonday.getDate() + 1);

      const startDateStr = nextMonday.toISOString().slice(0, 10);
      const endDateStr = nextTuesday.toISOString().slice(0, 10);

      const dryRun = await LeaveService.validateDryRun({
        tenantId: tenantAId,
        employeeId: employeeAId,
        leaveTypeId: leaveTypeAnnualId,
        startDate: startDateStr,
        endDate: endDateStr,
        bypassNoticePeriod: true,
      });

      assert.equal(dryRun.valid, true, "Dry-run validation must be valid");
      assert.equal(dryRun.totalDays, 2, "Mon to Tue must produce exactly 2 deductible days");

      // 3.2 Submit Leave Application
      const application = await LeaveService.submitApplication(
        tenantAId,
        employeeAId,
        {
          leaveTypeId: leaveTypeAnnualId,
          startDate: startDateStr,
          endDate: endDateStr,
          reason: "Family event travel",
        },
        candidateUserId,
        { bypassNoticePeriod: true }
      );

      assert.ok(application.id, "Leave application must return created ID");
      assert.equal(application.status, "pending", "Submitted leave must be in pending status");
      assert.equal(Number(application.days), 2, "Application must record 2 days");

      // 3.3 Segregation of Duties: Employee self-approval strictly forbidden
      await assert.rejects(
        async () => {
          await LeaveService.decideApplication(
            tenantAId,
            application.id,
            "approve",
            candidateUserId // Reviewer is the applicant themselves
          );
        },
        (err: any) => {
          return err instanceof LeaveHttpError && err.status === 403 && err.code === "SELF_APPROVAL_FORBIDDEN";
        },
        "Must forbid employee from approving their own leave application"
      );

      // 3.4 Unauthorized approver rejected
      await assert.rejects(
        async () => {
          await LeaveService.decideApplication(
            tenantAId,
            application.id,
            "approve",
            unauthorizedUserAId // Random employee without manager or HR role
          );
        },
        (err: any) => {
          return err instanceof LeaveHttpError && err.status === 403 && err.code === "UNAUTHORIZED_APPROVER";
        },
        "Must forbid unauthorized employee from approving"
      );

      // 3.5 Authorized Manager Approval
      const approvedResult = await LeaveService.decideApplication(
        tenantAId,
        application.id,
        "approve",
        managerAId, // Authorized reporting manager
        "Approved by manager"
      );
      assert.equal(approvedResult.status, "approved", "Request status must transition to approved");

      // 3.6 Single Balance Deduction Guarantee
      const debitEntries = await rawPrisma.leaveLedgerEntry.findMany({
        where: {
          tenantId: tenantAId,
          employeeId: employeeAId,
          leaveTypeId: leaveTypeAnnualId,
          entryType: "DEBIT",
          referenceId: application.id,
        },
      });
      assert.equal(debitEntries.length, 1, "Exactly ONE DEBIT ledger entry must be created");
      assert.equal(Number(debitEntries[0].days), 2, "Debit entry must deduct exactly 2 days");

      // Verify net available balance: Initial 18 - Used 2 = 16 available
      const currentBalance = await LeaveService.getEmployeeBalance(
        tenantAId,
        employeeAId,
        leaveTypeAnnualId,
        new Date().getUTCFullYear()
      );
      assert.equal(currentBalance, 16, "Available balance must be exactly 16 after single deduction");

      // 3.7 Double Approval Prevention
      await assert.rejects(
        async () => {
          await LeaveService.decideApplication(
            tenantAId,
            application.id,
            "approve",
            managerAId
          );
        },
        (err: any) => {
          return err instanceof LeaveHttpError && (err.status === 409 || err.code === "INVALID_LEAVE_STATE");
        },
        "Must reject duplicate approval attempt on already approved request"
      );

      // 3.8 Tenant Isolation: Cross-tenant approval rejection
      await assert.rejects(
        async () => {
          await LeaveService.decideApplication(
            tenantBId,
            application.id,
            "approve",
            hrUserAId
          );
        },
        (err: any) => {
          return err instanceof LeaveHttpError && err.status === 404;
        },
        "Cross-tenant approval attempt must return 404 not found"
      );
    });

  } finally {
    await cleanup();
  }
});
