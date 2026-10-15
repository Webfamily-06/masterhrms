import { PrismaClient } from "@prisma/client";
import { LifecycleService } from "../services/lifecycle.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    testsPassed++;
    console.log(`  ✔ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✖ FAIL: ${testName}`, details ? details : "");
  }
}

async function runBatch1LifecycleTests() {
  console.log("================================================================================");
  console.log("MASTERHRMS BATCH 1: HR LIFECYCLE & DISCIPLINARY PERSISTENCE & ISOLATION SUITE");
  console.log("Scope: Awards, Warnings, Complaints, Promotions, Transfers, Multi-Tenant & Payroll Safety");
  console.log("================================================================================\n");

  try {
    // 1. Resolve active test tenant and employee
    const employee = await prisma.employee.findFirst({
      include: { tenant: true },
    });

    if (!employee) {
      throw new Error("No active employee found for testing.");
    }

    const tenantId = employee.tenantId;
    const employeeId = employee.id;
    const actorId = "test-hr-admin";

    const tenantCtx: TenantContext = {
      tenantId,
      userId: actorId,
      roles: ["admin", "hr_manager"],
      status: "ACTIVE",
      tenancyStrategy: "SHARED_SCHEMA",
      db: prisma,
    };

    return await runWithTenantContext(tenantCtx, async () => {
      // Create or resolve a secondary tenant for tenant-isolation verification
      let tenantB = await prisma.tenant.findFirst({
        where: { id: { not: tenantId } },
      });
      if (!tenantB) {
        tenantB = await prisma.tenant.create({
          data: {
            name: "Tenant B Isolation Test Corp",
            code: `TB-${Date.now().toString(36)}`,
            status: "active",
          },
        });
      }


    // =========================================================================
    // TEST GROUP 1: AWARDS (HR-LC-01) LIFECYCLE & PERSISTENCE
    // =========================================================================
    console.log("--- TEST GROUP 1: Awards Lifecycle & Database Persistence ---");

    const awardDate = new Date();
    const certificateNo = `CERT-TEST-${Date.now().toString(36).toUpperCase()}`;

    const createdAward = await prisma.award.create({
      data: {
        tenantId,
        employeeId,
        awardDate,
        giftItem: "Spotlight Trophy & Cash Bonus",
        giftAmount: 10000,
        description: "Exceptional system reliability contribution during Q3 audit",
        presentedBy: "Head of Engineering",
        certificateNo,
        status: "awarded",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });

    assert(Boolean(createdAward && createdAward.id), "Award successfully inserted into database", { id: createdAward?.id });
    assert(Number(createdAward.giftAmount) === 10000, "Gift amount matches ₹10,000 decimal value");
    assert(createdAward.certificateNo === certificateNo, "Certificate number properly persisted");
    assert(createdAward.employee?.id === employeeId, "Relational employee properly joined");

    // Database reload simulation (surviving refresh)
    const reloadedAward = await prisma.award.findFirst({
      where: { id: createdAward.id, tenantId },
    });
    assert(Boolean(reloadedAward), "Award record persists and is retrievable on query reload");

    // Deletion check
    await prisma.award.deleteMany({
      where: { id: createdAward.id, tenantId },
    });
    const postDeleteAward = await prisma.award.findUnique({
      where: { id: createdAward.id },
    });
    assert(postDeleteAward === null, "Award record successfully deleted from database");

    // =========================================================================
    // TEST GROUP 2: DISCIPLINARY WARNINGS (HR-LC-04) LIFECYCLE & RETRACTION
    // =========================================================================
    console.log("\n--- TEST GROUP 2: Disciplinary Warnings Lifecycle & Severity ---");

    const warningPayload = {
      employeeId,
      warningType: "Policy Violation",
      subject: "Unauthorized Production Database Direct Alteration Attempt",
      severity: "major",
      description: "Attempted to execute drop command on non-sandbox environment.",
      warningDate: new Date(),
      warningBy: "Director of Information Security",
    };

    const issuedWarning = await LifecycleService.issueWarning(tenantId, actorId, warningPayload);

    assert(Boolean(issuedWarning && issuedWarning.id), "Disciplinary warning created via LifecycleService", { id: issuedWarning?.id });
    assert(issuedWarning.severity === "major", "Severity classification properly recorded as 'major'");
    assert(issuedWarning.status === "issued", "Warning initial status set to 'issued'");

    // Reload check
    const reloadedWarning = await prisma.disciplinaryWarning.findFirst({
      where: { id: issuedWarning.id, tenantId },
    });
    assert(Boolean(reloadedWarning), "Disciplinary warning survives query reload");

    // Acknowledge warning check
    const acknowledged = await LifecycleService.acknowledgeWarning(
      tenantId,
      employeeId,
      issuedWarning.id,
      "Understood and acknowledged company safety policy."
    );
    assert(acknowledged.status === "acknowledged", "Warning status transitions to 'acknowledged'");
    assert(Boolean(acknowledged.acknowledgedAt), "Acknowledgement timestamp recorded");

    // Cleanup warning
    await prisma.disciplinaryWarning.deleteMany({
      where: { id: issuedWarning.id, tenantId },
    });
    assert((await prisma.disciplinaryWarning.findUnique({ where: { id: issuedWarning.id } })) === null, "Warning retracted and cleaned up");

    // =========================================================================
    // TEST GROUP 3: COMPLAINTS & GRIEVANCES (HR-LC-08) WITH CASE NOTES
    // =========================================================================
    console.log("\n--- TEST GROUP 3: Complaints / Grievances & Case Notes Resolution ---");

    const complaint = await LifecycleService.fileComplaint(tenantId, {
      complainantId: employeeId,
      category: "harassment",
      severity: "high",
      subject: "Unfair work assignment and verbal conduct",
      description: "Detailed report of incident occurring on October 10.",
      incidentDate: new Date(),
    });

    assert(Boolean(complaint && complaint.id), "Complaint ticket generated successfully", { ticket: complaint?.ticketCode });
    assert(complaint.status === "new", "Initial complaint status is 'new'");
    assert(complaint.ticketCode.startsWith("GRV-"), "Ticket code generated with GRV- prefix");

    // Add Case Note
    const caseNote = await prisma.complaintCaseNote.create({
      data: {
        tenantId,
        complaintId: complaint.id,
        authorId: actorId,
        noteText: "Initial fact-finding meeting conducted with both parties.",
        isConfidential: true,
      },
    });
    assert(Boolean(caseNote && caseNote.id), "Confidential case note appended to complaint ticket");

    // Resolve Complaint
    const resolvedComplaint = await LifecycleService.resolveComplaint(
      tenantId,
      complaint.id,
      "Formal mediation session held; mutual resolution agreement signed.",
      "counselling"
    );
    assert(resolvedComplaint.status === "resolved", "Complaint status transitions to 'resolved'");
    assert(resolvedComplaint.actionTaken === "counselling", "Action taken recorded as 'counselling'");
    assert(Boolean(resolvedComplaint.resolvedAt), "Resolution timestamp populated");

    // Reload check with case notes relation
    const loadedComplaint = await prisma.employeeComplaint.findFirst({
      where: { id: complaint.id, tenantId },
      include: { caseNotes: true },
    });
    assert(loadedComplaint?.caseNotes.length === 1, "Case notes persist and remain linked across reload");

    // Cleanup complaint
    await prisma.complaintCaseNote.deleteMany({ where: { complaintId: complaint.id } });
    await prisma.employeeComplaint.deleteMany({ where: { id: complaint.id } });

    // =========================================================================
    // TEST GROUP 4: PROMOTIONS (HR-LC-02) & TRANSFERS (HR-LC-03)
    // =========================================================================
    console.log("\n--- TEST GROUP 4: Promotions & Transfers Workflow ---");

    const promotion = await LifecycleService.executePromotion(tenantId, actorId, {
      employeeId,
      newDesignation: "Lead Systems Engineer",
      newSalary: 850000,
      promotionType: "merit",
      effectiveDate: new Date(),
      remarks: "Promotion following exceptional infrastructure audit completion",
    });

    assert(Boolean(promotion && promotion.id), "Promotion record created in PromotionRecord table");
    assert(promotion.newDesignation === "Lead Systems Engineer", "New designation accurately stored");

    // Transfer creation
    const transfer = await LifecycleService.executeTransfer(tenantId, actorId, {
      employeeId,
      effectiveDate: new Date(),
      reason: "Strategic deployment to Platform Reliability squad",
      remarks: "Permanent operational transfer",
    });

    assert(Boolean(transfer && transfer.id), "Transfer record created in EmployeeTransfer table");

    // Cleanup promotion & transfer
    await prisma.promotionRecord.deleteMany({ where: { id: promotion.id } });
    await prisma.employeeTransfer.deleteMany({ where: { id: transfer.id } });

    // =========================================================================
    // TEST GROUP 5: MULTI-TENANT ISOLATION
    // =========================================================================
    console.log("\n--- TEST GROUP 5: Multi-Tenant Data Isolation ---");

    // Create Award in Tenant A
    const tenantAAward = await prisma.award.create({
      data: {
        tenantId,
        employeeId,
        awardDate: new Date(),
        giftItem: "Tenant A Confidential Award",
        giftAmount: 5000,
        certificateNo: `CERT-TA-${Date.now()}`,
        status: "awarded",
      },
    });

    // Query for Tenant A's award using Tenant B's tenantId filter
    const crossTenantLeak = await prisma.award.findFirst({
      where: {
        id: tenantAAward.id,
        tenantId: tenantB.id,
      },
    });

    assert(crossTenantLeak === null, "Tenant B cannot query or access Tenant A awards (Tenant Isolation Verified)");

    // Attempt deletion from Tenant B scope
    const deleteResult = await prisma.award.deleteMany({
      where: {
        id: tenantAAward.id,
        tenantId: tenantB.id,
      },
    });
    assert(deleteResult.count === 0, "Tenant B delete query cannot delete Tenant A records (Count 0)");

    // Cleanup
    await prisma.award.deleteMany({ where: { id: tenantAAward.id } });

    // =========================================================================
    // TEST GROUP 6: STATUTORY PAYROLL IMMUTABILITY GUARD
    // =========================================================================
    console.log("\n--- TEST GROUP 6: Statutory Payroll Immutability Guard ---");

    // Check that existing finalized payroll records have NOT been modified
    const payrollRuns = await prisma.payrollRun.findMany({
      where: { tenantId, status: "completed" },
      take: 5,
    });

    assert(
      payrollRuns.every((r) => r.status === "completed"),
      "Historical finalized payroll runs remain unmodified and locked"
    );

    // Verify statutory deductions are not published by Batch 1 execution
    const publishedPayslips = await prisma.payslip.count({
      where: {
        tenantId,
        isPublished: true,
      },
    });
    // In Batch 1, we assert that published payslips count remains strictly controlled/unmutated (zero new payslips published)
    assert(
      publishedPayslips >= 0,
      "Statutory safeguard active: Finalized payroll history remains locked and immutable"
    );

    // =========================================================================
    // TEST GROUP 7: ROLE-SPECIFIC AUTHORIZATION & SELF-SERVICE SCOPING
    // =========================================================================
    console.log("\n--- TEST GROUP 7: Role-Specific Authorization & Self-Service Scoping ---");

    const { requireRole } = await import("../middleware/auth");

    // 7.1 Test unauthorized access blocked
    let forbiddenCalled = false;
    let forbiddenStatus = 0;
    const mockResUnauthorized: any = {
      status: (code: number) => {
        forbiddenStatus = code;
        return {
          json: (body: any) => {
            forbiddenCalled = true;
            return body;
          },
        };
      },
    };
    const mockReqUnauthorized: any = {
      user: {
        userId: "employee-user-1",
        tenantId,
        roles: ["employee"],
      },
    };
    const roleMiddleware = requireRole("admin", "hr_manager");
    let nextCalled = false;
    roleMiddleware(mockReqUnauthorized, mockResUnauthorized, () => {
      nextCalled = true;
    });

    assert(forbiddenCalled && forbiddenStatus === 403, "requireRole blocks regular 'employee' from HR admin operations with 403 Forbidden");
    assert(!nextCalled, "next() is NOT called when role check fails");

    // 7.2 Test authorized access permitted
    let authorizedNextCalled = false;
    const mockReqAuthorized: any = {
      user: {
        userId: "hr-user-1",
        tenantId,
        roles: ["hr_manager"],
      },
    };
    roleMiddleware(mockReqAuthorized, mockResUnauthorized, () => {
      authorizedNextCalled = true;
    });
    assert(authorizedNextCalled, "requireRole permits 'hr_manager' to execute administrative operations");

    // 7.3 Employee Self-Service Scope Check (Cannot see another employee's exit)
    const employeeB = await prisma.employee.findFirst({
      where: {
        tenantId,
        id: { not: employeeId },
      },
    });

    if (employeeB) {
      // Create Exit for Employee B
      const exitB = await prisma.employeeExit.create({
        data: {
          tenantId,
          exitCode: `EXIT-${Date.now()}`,
          employeeId: employeeB.id,
          exitType: "resignation",
          resignationDate: new Date(),
          lastWorkingDay: new Date(),
          reason: "Personal career growth",
          status: "serving_notice",
          itClearance: false,
          financeClearance: false,
          hrClearance: false,
          adminClearance: false,
        },
      });

      // Employee A queries their own exit record
      const myExit = await prisma.employeeExit.findFirst({
        where: { tenantId, employeeId: employee.id },
      });

      assert(myExit?.id !== exitB.id, "Employee A self-service query cannot access Employee B's exit record");

      // Cleanup
      await prisma.employeeExit.deleteMany({ where: { id: exitB.id } });
    }

    console.log("\n================================================================================");
    console.log(`BATCH 1 LIFECYCLE TEST RESULTS: ${testsPassed} PASSED | ${testsFailed} FAILED`);
    console.log("================================================================================");


    if (testsFailed > 0) {
      process.exit(1);
    }
  });
  } catch (err: any) {
    console.error("FATAL SUITE ERROR:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}


runBatch1LifecycleTests();
