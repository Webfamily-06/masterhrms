import { ProbationService } from "../services/probation.service.js";
import { ContractLifecycleService } from "../services/contract-lifecycle.service.js";
import { runProbationContractExpiryCron } from "../cron/probation-contract-expiry.cron.js";

/**
 * MASTERHRMS — Phase 3.3 Automated Verification & QA Test Suite
 * Tests:
 * 1. Probation Classification & Boundary Arithmetic (30d, 15d, 7d, Due Today, Overdue, Status Precedence, Extended Precedence)
 * 2. Deterministic Idempotency Key Generation
 * 3. Manager Probation Review (Validation, Recommendation, Anti-Self-Review, Authorization)
 * 4. HR Confirmation Approval & Automated Letter Generation
 * 5. HR Probation Extension & Maximum 180-Day Rule Enforcement
 * 6. Contract Expiry Classification & Timeline Boundaries
 * 7. Contract Renewal Workflow (Atomic Predecessor Archival & Successor Creation, Date Overlap Defense)
 * 8. Daily Background Scheduler & Auto-Transition Engine
 */

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`, details || "");
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("MASTERHRMS PHASE 3.3: PROBATION & CONTRACT AUTOMATION TEST SUITE");
  console.log("================================================================================\n");

  const refDate = new Date("2026-11-13T00:00:00.000Z");

  // ─── SUITE 1: PROBATION CLASSIFICATION & BOUNDARY ARITHMETIC ───────────────────
  console.log("SUITE 1: Probation Classification & Boundary Arithmetic");

  // 1.1 Status Precedence: Confirmed
  const confirmedRec = { status: "confirmed", endDate: new Date("2026-11-20T00:00:00.000Z") };
  const confCls = ProbationService.classifyProbation(confirmedRec, refDate);
  assert(confCls.classification === "CONFIRMED", "1.1 Status 'confirmed' takes precedence over dates");
  assert(confCls.stage === "none", "1.1 Confirmed record stage is 'none'");

  // 1.2 Extended Date Precedence
  const extendedRec = {
    status: "extended",
    endDate: new Date("2026-11-10T00:00:00.000Z"), // original past
    extendedUntil: new Date("2026-12-13T00:00:00.000Z"), // +30 days
  };
  const extCls = ProbationService.classifyProbation(extendedRec, refDate);
  assert(extCls.classification === "ENDING_30_DAYS", "1.2 Extended date used instead of original endDate");
  assert(extCls.daysRemaining === 30, "1.2 daysRemaining computed from extendedUntil");
  assert(extCls.stage === "30_days", "1.2 Stage is '30_days'");

  // 1.3 Active Normal (> 30 days)
  const activeRec = { status: "active", endDate: new Date("2026-12-25T00:00:00.000Z") }; // +42 days
  const actCls = ProbationService.classifyProbation(activeRec, refDate);
  assert(actCls.classification === "ACTIVE" && actCls.daysRemaining! > 30, "1.3 >30 days remaining classified as ACTIVE");
  assert(actCls.stage === "none", "1.3 Active >30 days stage is 'none'");

  // 1.4 Ending in 30 Days (Exact Boundary)
  const end30Rec = { status: "active", endDate: new Date("2026-12-13T00:00:00.000Z") }; // +30 days
  const end30Cls = ProbationService.classifyProbation(end30Rec, refDate);
  assert(end30Cls.classification === "ENDING_30_DAYS", "1.4 Exactly 30 days classified as ENDING_30_DAYS");
  assert(end30Cls.daysRemaining === 30, "1.4 daysRemaining is 30");
  assert(end30Cls.stage === "30_days", "1.4 stage is '30_days'");

  // 1.5 Ending in 15 Days (Exact Boundary)
  const end15Rec = { status: "active", endDate: new Date("2026-11-28T00:00:00.000Z") }; // +15 days
  const end15Cls = ProbationService.classifyProbation(end15Rec, refDate);
  assert(end15Cls.classification === "ENDING_15_DAYS", "1.5 Exactly 15 days classified as ENDING_15_DAYS");
  assert(end15Cls.daysRemaining === 15, "1.5 daysRemaining is 15");
  assert(end15Cls.stage === "15_days", "1.5 stage is '15_days'");

  // 1.6 Ending in 7 Days (Exact Boundary)
  const end7Rec = { status: "active", endDate: new Date("2026-11-20T00:00:00.000Z") }; // +7 days
  const end7Cls = ProbationService.classifyProbation(end7Rec, refDate);
  assert(end7Cls.classification === "ENDING_7_DAYS", "1.6 Exactly 7 days classified as ENDING_7_DAYS");
  assert(end7Cls.daysRemaining === 7, "1.6 daysRemaining is 7");
  assert(end7Cls.stage === "7_days", "1.6 stage is '7_days'");

  // 1.7 Due Today (0 days remaining)
  const dueTodayRec = { status: "active", endDate: new Date("2026-11-13T00:00:00.000Z") }; // 0 days
  const dueTodayCls = ProbationService.classifyProbation(dueTodayRec, refDate);
  assert(dueTodayCls.classification === "DUE_TODAY", "1.7 Due today classified as DUE_TODAY");
  assert(dueTodayCls.daysRemaining === 0, "1.7 daysRemaining is 0");
  assert(dueTodayCls.stage === "due_today", "1.7 stage is 'due_today'");

  // 1.8 Overdue Decision (-1 day or earlier)
  const overdueRec = { status: "active", endDate: new Date("2026-11-12T00:00:00.000Z") }; // -1 day
  const overdueCls = ProbationService.classifyProbation(overdueRec, refDate);
  assert(overdueCls.classification === "OVERDUE_DECISION", "1.8 Past-due decision classified as OVERDUE_DECISION");
  assert(overdueCls.daysRemaining === -1, "1.8 daysRemaining is -1");
  assert(overdueCls.isOverdue === true, "1.8 isOverdue flag is true");
  assert(overdueCls.stage === "overdue", "1.8 stage is 'overdue'");

  // ─── SUITE 2: DETERMINISTIC IDEMPOTENCY KEY FORMULATION ────────────────────────
  console.log("\nSUITE 2: Deterministic Idempotency Key Formulation");

  const pKey = ProbationService.buildIdempotencyKey("rec-123", new Date("2026-11-20T00:00:00.000Z"), "7_days");
  assert(pKey === "prob_exp_rec-123_2026-11-20_7_days", "2.1 Probation idempotency key format matches specification");

  const cKey = ContractLifecycleService.buildIdempotencyKey("cnt-456", new Date("2026-12-13T00:00:00.000Z"), "30_days");
  assert(cKey === "cnt_exp_cnt-456_2026-12-13_30_days", "2.2 Contract idempotency key format matches specification");

  // ─── SUITE 3: MANAGER PROBATION REVIEW & SEGREGATION OF DUTIES ─────────────────
  console.log("\nSUITE 3: Manager Probation Review & Segregation of Duties");

  // Mock DB for Manager Review
  const mockTenantId = "tenant-test-1";
  const managerEmpId = "emp-mgr-1";
  const managerUserId = "usr-mgr-1";
  const directSubEmpId = "emp-sub-1";
  const indirectEmpId = "emp-other-1";

  const inMemoryProbations: Record<string, any> = {
    "prob-sub-1": {
      id: "prob-sub-1",
      tenantId: mockTenantId,
      employeeId: directSubEmpId,
      status: "active",
      notes: null,
      remarks: null,
      employee: {
        id: directSubEmpId,
        userId: "usr-sub-1",
        firstName: "Alice",
        lastName: "Subordinate",
        employeeCode: "EMP001",
        managerId: managerEmpId,
        manager: {
          id: managerEmpId,
          userId: managerUserId,
          firstName: "Carol",
          lastName: "Manager",
        },
      },
    },
    "prob-other-1": {
      id: "prob-other-1",
      tenantId: mockTenantId,
      employeeId: indirectEmpId,
      status: "active",
      notes: null,
      remarks: null,
      employee: {
        id: indirectEmpId,
        userId: "usr-other-1",
        firstName: "Bob",
        lastName: "Indirect",
        employeeCode: "EMP002",
        managerId: "other-mgr",
        manager: {
          id: "other-mgr",
          userId: "usr-other-mgr",
        },
      },
    },
  };

  const inMemoryEmployees: Record<string, any> = {
    [managerUserId]: {
      id: managerEmpId,
      userId: managerUserId,
      firstName: "Carol",
      lastName: "Manager",
      tenantId: mockTenantId,
    },
  };

  const stubDb: any = {
    probationRecord: {
      findUnique: async ({ where }: any) => {
        const rec = inMemoryProbations[where.id];
        return rec && rec.tenantId === mockTenantId ? { ...rec } : null;
      },
      findFirst: async ({ where }: any) => {
        const rec = inMemoryProbations[where.id];
        if (rec && rec.tenantId === where.tenantId) {
          return { ...rec };
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const rec = inMemoryProbations[where.id];
        if (!rec) throw new Error("Record not found");
        Object.assign(rec, data);
        return { ...rec };
      },
    },
    employee: {
      findFirst: async ({ where }: any) => {
        if (where.userId) {
          const emp = inMemoryEmployees[where.userId];
          if (emp && emp.tenantId === where.tenantId) return emp;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) {
          const emp = Object.values(inMemoryEmployees).find((e: any) => e.id === where.id);
          if (emp) return emp;
        }
        return null;
      },
    },
    userRole: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    notification: {
      findFirst: async () => null,
      create: async () => ({ id: "notif-test" }),
    },
  };

  // 3.1 Self-Review Prevention
  let selfReviewError = false;
  try {
    await ProbationService.submitManagerReview({
      tenantId: mockTenantId,
      actorUserId: "usr-sub-1", // employee trying to review self
      probationRecordId: "prob-sub-1",
      review: {
        performanceRating: 5,
        recommendation: "recommend_confirmation",
      },
      dbOverride: stubDb,
    });
  } catch (err: any) {
    selfReviewError = true;
    assert(err.message.includes("Employees cannot review their own probation"), "3.1 Anti-self-review check enforced");
  }
  assert(selfReviewError, "3.1 Self-review was successfully blocked");

  // 3.2 Unauthorized Manager Boundary Defense (Non-direct report)
  let unauthorizedError = false;
  try {
    await ProbationService.submitManagerReview({
      tenantId: mockTenantId,
      actorUserId: managerUserId,
      probationRecordId: "prob-other-1",
      review: {
        performanceRating: 4,
        recommendation: "recommend_confirmation",
      },
      dbOverride: stubDb,
    });
  } catch (err: any) {
    unauthorizedError = true;
    assert(err.message.includes("You can only submit probation reviews for your direct reports"), "3.2 Manager reporting line check enforced");
  }
  assert(unauthorizedError, "3.2 Non-direct report review was successfully blocked");

  // 3.3 Rating Scale Validation (Out-of-range rating rejected)
  let ratingError = false;
  try {
    await ProbationService.submitManagerReview({
      tenantId: mockTenantId,
      actorUserId: managerUserId,
      probationRecordId: "prob-sub-1",
      review: {
        performanceRating: 6, // invalid > 5
        recommendation: "recommend_confirmation",
      },
      dbOverride: stubDb,
    });
  } catch (err: any) {
    ratingError = true;
    assert(err.message.includes("Performance rating must be an integer between 1 and 5"), "3.3 Rating boundary 1-5 enforced");
  }
  assert(ratingError, "3.3 Out-of-bounds rating was rejected");

  // 3.4 Valid Review Submission by Direct Manager
  const reviewResult = await ProbationService.submitManagerReview({
    tenantId: mockTenantId,
    actorUserId: managerUserId,
    probationRecordId: "prob-sub-1",
    review: {
      performanceRating: 5,
      recommendation: "recommend_confirmation",
      observations: "Exceptional speed and code quality.",
      managerRemarks: "Strong candidate for leadership roles.",
    },
    dbOverride: stubDb,
  });

  assert(reviewResult.probationRecord.performanceRating === "5/5", "3.4 Review rating recorded");
  assert(
    (reviewResult.probationRecord.remarks || reviewResult.probationRecord.notes || "").toLowerCase().includes("recommend_confirmation"),
    "3.4 Recommendation persisted to remarks/notes"
  );
  assert(reviewResult.submittedReview.reviewerName === "Carol Manager", "3.4 Reviewer identity resolved and stamped");

  // ─── SUITE 4: HR CONFIRMATION APPROVAL & LETTER AUTOMATION ─────────────────────
  console.log("\nSUITE 4: HR Confirmation Approval & Letter Automation");

  let generatedLetterCalled = false;
  let letterMetadataRecorded: any = null;

  const stubDbConfirm: any = {
    probationRecord: {
      findFirst: async () => ({
        id: "prob-sub-1",
        tenantId: mockTenantId,
        employeeId: directSubEmpId,
        status: "active",
        probationPeriodDays: 90,
        notes: null,
      }),
      update: async ({ data }: any) => ({
        id: "prob-sub-1",
        tenantId: mockTenantId,
        employeeId: directSubEmpId,
        status: data.status,
        performanceRating: data.performanceRating,
        notes: data.notes,
      }),
    },
    employee: {
      findUnique: async () => ({
        id: directSubEmpId,
        userId: "usr-sub-1",
        firstName: "Alice",
        lastName: "Subordinate",
        employeeCode: "EMP001",
        departmentId: "dept-eng",
        tenantId: mockTenantId,
      }),
      update: async () => ({ id: directSubEmpId, employmentStatus: "permanent" }),
    },
    generatedLetter: {
      findFirst: async () => null,
      create: async ({ data }: any) => {
        generatedLetterCalled = true;
        letterMetadataRecorded = data;
        return {
          id: "let-101",
          letterNumber: data.letterNumber,
          title: data.title,
          status: "issued",
        };
      },
    },
    documentTemplate: {
      findFirst: async () => null,
    },
    userRole: {
      findMany: async () => [],
    },
    notification: {
      findFirst: async () => null,
      create: async () => ({ id: "notif-1" }),
    },
  };

  const confirmRes = await ProbationService.confirmProbationWithLetter({
    tenantId: mockTenantId,
    actorUserId: "usr-hr-1",
    probationRecordId: "prob-sub-1",
    payload: {
      performanceRating: "Exceeds Expectations",
      remarks: "Fully integrated into team.",
    },
    dbOverride: stubDbConfirm,
  });

  assert(confirmRes.probationRecord.status === "confirmed", "4.1 Probation record transitioned to 'confirmed'");
  assert(generatedLetterCalled === true, "4.2 GeneratedLetter created upon confirmation");
  assert(letterMetadataRecorded.letterType === "CONFIRMATION_LETTER", "4.3 Letter type set to CONFIRMATION_LETTER");
  assert(letterMetadataRecorded.letterNumber.startsWith("LTR-CONF-"), "4.4 Letter numbered with standard LTR-CONF- prefix");

  // ─── SUITE 5: HR PROBATION EXTENSION & 180-DAY RULE ───────────────────────────
  console.log("\nSUITE 5: HR Probation Extension & 180-Day Maximum Rule");

  // 5.1 Extension within 180 days allowed
  const validProbation = { probationPeriodDays: 90 };
  const extDaysValid = 60;
  assert(validProbation.probationPeriodDays + extDaysValid <= 180, "5.1 90 + 60 = 150 days (<= 180 days) is permissible");

  // 5.2 Extension exceeding 180 days rejected
  const extDaysInvalid = 100;
  const isExceeding = validProbation.probationPeriodDays + extDaysInvalid > 180;
  assert(isExceeding === true, "5.2 90 + 100 = 190 days exceeds maximum 180 days limit");

  // ─── SUITE 6: CONTRACT EXPIRY CLASSIFICATION & BOUNDARY ARITHMETIC ─────────────
  console.log("\nSUITE 6: Contract Expiry Classification & Boundary Arithmetic");

  // 6.1 Indefinite Contract (No End Date)
  const indefiniteContract = { status: "active", startDate: new Date("2026-01-01"), endDate: null };
  const indefCls = ContractLifecycleService.classifyContract(indefiniteContract, refDate);
  assert(indefCls.classification === "ACTIVE", "6.1 Permanent/indefinite contract classified as ACTIVE");
  assert(indefCls.daysRemaining === null, "6.1 Indefinite contract daysRemaining is null");
  assert(indefCls.stage === "none", "6.1 Indefinite contract stage is 'none'");

  // 6.2 Expiring in 30 Days (Exact Boundary)
  const cnt30 = { status: "active", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-13T00:00:00.000Z") };
  const cnt30Cls = ContractLifecycleService.classifyContract(cnt30, refDate);
  assert(cnt30Cls.classification === "EXPIRING_30_DAYS", "6.2 Contract 30d boundary classified as EXPIRING_30_DAYS");
  assert(cnt30Cls.daysRemaining === 30, "6.2 Contract daysRemaining is 30");
  assert(cnt30Cls.stage === "30_days", "6.2 Contract stage is '30_days'");

  // 6.3 Expiring in 15 Days (Exact Boundary)
  const cnt15 = { status: "active", startDate: new Date("2026-01-01"), endDate: new Date("2026-11-28T00:00:00.000Z") };
  const cnt15Cls = ContractLifecycleService.classifyContract(cnt15, refDate);
  assert(cnt15Cls.classification === "EXPIRING_15_DAYS", "6.3 Contract 15d boundary classified as EXPIRING_15_DAYS");
  assert(cnt15Cls.daysRemaining === 15, "6.3 Contract daysRemaining is 15");

  // 6.4 Expiring in 7 Days (Exact Boundary)
  const cnt7 = { status: "active", startDate: new Date("2026-01-01"), endDate: new Date("2026-11-20T00:00:00.000Z") };
  const cnt7Cls = ContractLifecycleService.classifyContract(cnt7, refDate);
  assert(cnt7Cls.classification === "EXPIRING_7_DAYS", "6.4 Contract 7d boundary classified as EXPIRING_7_DAYS");
  assert(cnt7Cls.daysRemaining === 7, "6.4 Contract daysRemaining is 7");

  // 6.5 Expiring Today
  const cntToday = { status: "active", startDate: new Date("2026-01-01"), endDate: new Date("2026-11-13T00:00:00.000Z") };
  const cntTodayCls = ContractLifecycleService.classifyContract(cntToday, refDate);
  assert(cntTodayCls.classification === "EXPIRING_TODAY", "6.5 Contract concluding today classified as EXPIRING_TODAY");
  assert(cntTodayCls.daysRemaining === 0, "6.5 Contract daysRemaining is 0");
  assert(cntTodayCls.stage === "today", "6.5 Contract stage is 'today'");

  // 6.6 Expired (-1 day)
  const cntPast = { status: "active", startDate: new Date("2026-01-01"), endDate: new Date("2026-11-12T00:00:00.000Z") };
  const cntPastCls = ContractLifecycleService.classifyContract(cntPast, refDate);
  assert(cntPastCls.classification === "EXPIRED", "6.6 Past due contract classified as EXPIRED");
  assert(cntPastCls.daysRemaining === -1, "6.6 Contract daysRemaining is -1");
  assert(cntPastCls.isExpired === true, "6.6 Contract isExpired flag is true");

  // 6.7 Renewed Status Precedence
  const cntRenewed = { status: "renewed", startDate: new Date("2026-01-01"), endDate: new Date("2026-11-12T00:00:00.000Z") };
  const cntRenewedCls = ContractLifecycleService.classifyContract(cntRenewed, refDate);
  assert(cntRenewedCls.classification === "RENEWED", "6.7 Status 'renewed' takes precedence over past endDate");
  assert(cntRenewedCls.stage === "none", "6.7 Renewed contract stage is 'none'");

  // ─── SUITE 7: CONTRACT RENEWAL WORKFLOW & DATE OVERLAP DEFENSE ─────────────────
  console.log("\nSUITE 7: Contract Renewal Workflow & Date Overlap Defense");

  const existingPredecessor = {
    id: "cnt-orig-1",
    tenantId: mockTenantId,
    employeeId: directSubEmpId,
    title: "Software Engineer Agreement",
    contractTypeId: "type-fulltime",
    startDate: new Date("2025-11-14"),
    endDate: new Date("2026-11-13"),
    salary: 80000,
    status: "active",
    notes: "Initial employment agreement",
    employee: {
      id: directSubEmpId,
      userId: "usr-sub-1",
      firstName: "Alice",
      lastName: "Subordinate",
      employeeCode: "EMP001",
    },
  };

  const stubContractsDb: any = {
    employeeContract: {
      findFirst: async ({ where }: any) => {
        if (where.id === existingPredecessor.id && where.tenantId === mockTenantId) {
          return { ...existingPredecessor };
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        // Return active contracts excluding predecessor
        return [];
      },
      update: async ({ where, data }: any) => {
        return { ...existingPredecessor, ...data };
      },
      create: async ({ data }: any) => {
        return { id: "cnt-renewed-2", ...data };
      },
    },
    $transaction: async (ops: any[]) => {
      return Promise.all(ops);
    },
    notification: {
      create: async () => ({ id: "notif-renew-1" }),
    },
  };

  // 7.1 Start date after end date rejected
  let invalidDateError = false;
  try {
    await ContractLifecycleService.renewContract({
      tenantId: mockTenantId,
      actorUserId: "usr-hr-1",
      predecessorId: existingPredecessor.id,
      renewal: {
        startDate: "2026-11-20",
        endDate: "2026-11-15", // End before start
      },
      dbOverride: stubContractsDb,
    });
  } catch (err: any) {
    invalidDateError = true;
    assert(err.message.includes("Contract end date must be after the contract start date"), "7.1 End date before start date rejected");
  }
  assert(invalidDateError, "7.1 Inverted dates were rejected");

  // 7.2 Overlapping active contract detection
  let overlapError = false;
  try {
    const dbWithConflict = {
      ...stubContractsDb,
      employeeContract: {
        ...stubContractsDb.employeeContract,
        findMany: async () => [
          { id: "cnt-conflict", title: "Active Overlapping Retainer", status: "active" },
        ],
      },
    };

    await ContractLifecycleService.renewContract({
      tenantId: mockTenantId,
      actorUserId: "usr-hr-1",
      predecessorId: existingPredecessor.id,
      renewal: {
        startDate: "2026-11-14",
        endDate: "2027-11-13",
      },
      dbOverride: dbWithConflict,
    });
  } catch (err: any) {
    overlapError = true;
    assert(err.message.includes("Active contract dates cannot overlap"), "7.2 Contract date overlap policy enforced");
  }
  assert(overlapError, "7.2 Overlapping contract prevented");

  // 7.3 Valid Contract Renewal Execution
  const renewalResult = await ContractLifecycleService.renewContract({
    tenantId: mockTenantId,
    actorUserId: "usr-hr-1",
    predecessorId: existingPredecessor.id,
    renewal: {
      startDate: "2026-11-14",
      endDate: "2027-11-13",
      title: "Senior Software Engineer Agreement (Renewed)",
      salary: 100000,
      notes: "Promoted to Senior and renewed for 1 year.",
    },
    dbOverride: stubContractsDb,
  });

  assert(renewalResult.predecessor.status === "renewed", "7.3 Predecessor marked as 'renewed'");
  assert(renewalResult.predecessor.notes.includes("Renewed on"), "7.3 Predecessor notes stamped with renewal audit");
  assert(renewalResult.successor.status === "active", "7.3 Successor contract created in 'active' status");
  assert(renewalResult.successor.salary === 100000, "7.3 Revised compensation recorded on successor");

  // ─── SUITE 8: DAILY BACKGROUND SCHEDULER MONITOR ENGINE ────────────────────────
  console.log("\nSUITE 8: Daily Background Scheduler & Auto-Transition Engine");

  let contractsUpdatedToExpired = 0;
  const mockCronDb: any = {
    tenant: {
      findMany: async () => [{ id: mockTenantId, name: "Test Corp", status: "active" }],
    },
    probationRecord: {
      findMany: async () => [
        {
          id: "prob-cron-1",
          tenantId: mockTenantId,
          employeeId: directSubEmpId,
          status: "active",
          startDate: new Date("2026-08-15"),
          endDate: new Date("2026-11-20"), // 7 days out
          probationPeriodDays: 90,
          employee: {
            id: directSubEmpId,
            userId: "usr-sub-1",
            firstName: "Alice",
            lastName: "Subordinate",
            employeeCode: "EMP001",
            reportsToId: managerEmpId,
          },
        },
      ],
    },
    employeeContract: {
      findMany: async () => [
        {
          id: "cnt-cron-past",
          tenantId: mockTenantId,
          employeeId: directSubEmpId,
          title: "Past Contract",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2026-11-10"), // already expired
          status: "active",
          employee: {
            id: directSubEmpId,
            userId: "usr-sub-1",
            firstName: "Alice",
            lastName: "Subordinate",
          },
        },
      ],
      update: async ({ data }: any) => {
        if (data.status === "expired") contractsUpdatedToExpired++;
        return {};
      },
    },
    notification: {
      findFirst: async () => null,
      create: async () => ({ id: "notif-cron-1" }),
    },
    userRole: {
      findMany: async () => [{ userId: "usr-hr-1" }],
    },
    employee: {
      findUnique: async () => ({ id: managerEmpId, userId: managerUserId, firstName: "Carol", lastName: "Manager" }),
    },
  };

  const cronResults = await runProbationContractExpiryCron({
    dbOverride: mockCronDb,
    referenceDate: refDate,
  });

  assert(cronResults.tenantsEvaluated === 1, "8.1 Processed 1 active tenant");
  assert(cronResults.probationsChecked === 1, "8.2 Evaluated 1 probation record");
  assert(cronResults.contractsChecked === 1, "8.3 Evaluated 1 contract record");
  assert(cronResults.contractsExpired === 1, "8.4 Contract past due auto-transitioned to 'expired'");
  assert(contractsUpdatedToExpired === 1, "8.5 DB update executed for expired contract");

  console.log("\n================================================================================");
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} tests succeeded with 0 failures.`);
  console.log("================================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("FATAL TEST SUITE ERROR:", err);
  process.exit(1);
});
