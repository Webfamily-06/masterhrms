import { validateReportingHierarchy } from "../lib/reporting-hierarchy-validator.js";
import { ReportingManagerChangeService } from "../services/reporting-manager-change.service.js";
import { runReportingManagerChangeScheduler } from "../cron/reporting-manager-change.cron.js";
import { OrganizationTreeService } from "../services/organization-tree.service.js";

/**
 * MASTERHRMS — Phase 3.4 Automated Verification & QA Test Suite
 * Tests:
 * 1. Hierarchy Integrity & Circular Reporting Prevention (Self, Direct Sub, Deep 3-Level & 4-Level Cycle, Cross-Tenant, Inactive, Clearing Manager)
 * 2. Reporting Manager Change Request Creation, Validation, and Idempotency
 * 3. Segregation of Duties & Approval Workflow (Anti-Self-Approval, Rejection, Correction Requested)
 * 4. Effective-Date Processing (Immediate Application vs Future Awaiting Date)
 * 5. Daily Background Scheduler & Auto-Application Engine
 * 6. Historical Lineage Tracking in EmployeeTransfer
 * 7. Organization Tree Structure Recalculation & Report Counts
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
  console.log("MASTERHRMS PHASE 3.4: ORGANIZATION CHART & REPORTING HIERARCHY TEST SUITE");
  console.log("================================================================================\n");

  const tenantA = "tenant-org-alpha";
  const tenantB = "tenant-org-beta";

  // Mock employee graph:
  // CEO (emp-ceo, manager: null)
  //   ├── VP Eng (emp-vp, manager: emp-ceo)
  //   │     └── Lead (emp-lead, manager: emp-vp)
  //   │           └── Dev (emp-dev, manager: emp-lead)
  //   └── HR Dir (emp-hr, manager: emp-ceo)
  // Inactive emp: (emp-inactive, status: inactive)
  // Cross-tenant: (emp-foreign, tenant: tenantB)

  const inMemoryEmployees: Record<string, any> = {
    "emp-ceo": {
      id: "emp-ceo",
      tenantId: tenantA,
      userId: "usr-ceo",
      firstName: "Charles",
      lastName: "Executive",
      employeeCode: "CEO001",
      status: "active",
      managerId: null,
      departmentId: "dept-mgmt",
      branchId: "branch-hq",
      designationId: "desig-ceo",
      salary: 250000,
    },
    "emp-vp": {
      id: "emp-vp",
      tenantId: tenantA,
      userId: "usr-vp",
      firstName: "Victoria",
      lastName: "President",
      employeeCode: "VP001",
      status: "active",
      managerId: "emp-ceo",
      departmentId: "dept-eng",
      branchId: "branch-hq",
      designationId: "desig-vp",
      salary: 180000,
    },
    "emp-lead": {
      id: "emp-lead",
      tenantId: tenantA,
      userId: "usr-lead",
      firstName: "Leonard",
      lastName: "Leader",
      employeeCode: "LEAD001",
      status: "active",
      managerId: "emp-vp",
      departmentId: "dept-eng",
      branchId: "branch-hq",
      designationId: "desig-lead",
      salary: 130000,
    },
    "emp-dev": {
      id: "emp-dev",
      tenantId: tenantA,
      userId: "usr-dev",
      firstName: "David",
      lastName: "Developer",
      employeeCode: "DEV001",
      status: "active",
      managerId: "emp-lead",
      departmentId: "dept-eng",
      branchId: "branch-hq",
      designationId: "desig-dev",
      salary: 95000,
    },
    "emp-hr": {
      id: "emp-hr",
      tenantId: tenantA,
      userId: "usr-hr",
      firstName: "Hannah",
      lastName: "Recruiter",
      employeeCode: "HR001",
      status: "active",
      managerId: "emp-ceo",
      departmentId: "dept-hr",
      branchId: "branch-hq",
      designationId: "desig-hr",
      salary: 110000,
    },
    "emp-inactive": {
      id: "emp-inactive",
      tenantId: tenantA,
      userId: "usr-inact",
      firstName: "Ian",
      lastName: "Inactive",
      employeeCode: "INACT001",
      status: "inactive",
      managerId: "emp-ceo",
      departmentId: "dept-eng",
      branchId: "branch-hq",
      designationId: "desig-dev",
      salary: 80000,
    },
    "emp-foreign": {
      id: "emp-foreign",
      tenantId: tenantB,
      userId: "usr-foreign",
      firstName: "Fiona",
      lastName: "Foreign",
      employeeCode: "FOR001",
      status: "active",
      managerId: null,
      departmentId: "dept-b",
      branchId: "branch-b",
      designationId: "desig-b",
      salary: 90000,
    },
  };

  const inMemoryTransfers: Record<string, any> = {};

  const stubDb: any = {
    employee: {
      findFirst: async ({ where }: any) => {
        let list = Object.values(inMemoryEmployees);
        if (where.tenantId) list = list.filter((e) => e.tenantId === where.tenantId);
        if (where.id) list = list.filter((e) => e.id === where.id);
        if (where.status) list = list.filter((e) => e.status === where.status);
        if (where.userId) list = list.filter((e) => e.userId === where.userId);
        return list[0] ? { ...list[0] } : null;
      },
      findUnique: async ({ where }: any) => {
        const emp = inMemoryEmployees[where.id];
        return emp ? { ...emp } : null;
      },
      findMany: async ({ where }: any) => {
        let list = Object.values(inMemoryEmployees);
        if (where?.tenantId) list = list.filter((e) => e.tenantId === where.tenantId);
        if (where?.status && where.status !== "all") list = list.filter((e) => e.status === where.status);
        if (where?.id?.in) list = list.filter((e) => where.id.in.includes(e.id));
        return list.map((e) => ({
          ...e,
          department: { id: e.departmentId, name: e.departmentId },
          branch: { id: e.branchId, name: e.branchId, code: e.branchId },
          designation: { id: e.designationId, name: e.designationId },
          subordinates: Object.values(inMemoryEmployees).filter((sub) => sub.managerId === e.id),
        }));
      },
      update: async ({ where, data }: any) => {
        const emp = inMemoryEmployees[where.id];
        if (!emp) throw new Error("Employee not found");
        Object.assign(emp, data);
        return { ...emp };
      },
    },
    employeeTransfer: {
      create: async ({ data }: any) => {
        const id = data.id || `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        inMemoryTransfers[id] = record;
        return { ...record };
      },
      findFirst: async ({ where }: any) => {
        let list = Object.values(inMemoryTransfers);
        if (where.tenantId) list = list.filter((t) => t.tenantId === where.tenantId);
        if (where.id) list = list.filter((t) => t.id === where.id);
        if (where.employeeId) list = list.filter((t) => t.employeeId === where.employeeId);
        if (where.status?.in) list = list.filter((t) => where.status.in.includes(t.status));
        if (where.status && typeof where.status === "string") list = list.filter((t) => t.status === where.status);
        if (where.reason?.contains) list = list.filter((t) => (t.reason || "").includes(where.reason.contains));
        const res = list[0];
        if (!res) return null;
        return {
          ...res,
          employee: inMemoryEmployees[res.employeeId],
        };
      },
      findMany: async ({ where }: any) => {
        let list = Object.values(inMemoryTransfers);
        if (where.tenantId) list = list.filter((t) => t.tenantId === where.tenantId);
        if (where.employeeId) list = list.filter((t) => t.employeeId === where.employeeId);
        if (where.status) list = list.filter((t) => t.status === where.status);
        if (where.reason?.contains) list = list.filter((t) => (t.reason || "").includes(where.reason.contains));
        return list.map((t) => ({
          ...t,
          employee: inMemoryEmployees[t.employeeId],
        }));
      },
      count: async ({ where }: any) => {
        let list = Object.values(inMemoryTransfers);
        if (where.tenantId) list = list.filter((t) => t.tenantId === where.tenantId);
        if (where.reason?.contains) list = list.filter((t) => (t.reason || "").includes(where.reason.contains));
        return list.length;
      },
      update: async ({ where, data }: any) => {
        const t = inMemoryTransfers[where.id];
        if (!t) throw new Error("Transfer not found");
        Object.assign(t, data, { updatedAt: new Date() });
        return { ...t, employee: inMemoryEmployees[t.employeeId] };
      },
    },
    tenant: {
      findMany: async () => [{ id: tenantA, name: "Alpha Tenant" }],
    },
    userRole: {
      findMany: async () => [{ userId: "usr-hr" }],
      findFirst: async () => ({ userId: "usr-hr", role: "hr_admin" }),
    },
    notification: {
      create: async () => ({ id: "notif-1" }),
      findFirst: async () => null,
    },
    $transaction: async (ops: any[]) => {
      return Promise.all(ops);
    },
  };

  // ─── SUITE 1: HIERARCHY INTEGRITY & CIRCULAR REPORTING VALIDATION ───────────────
  console.log("SUITE 1: Hierarchy Integrity & Circular Reporting Prevention");

  // 1.1 Self-Reporting Prevention
  const selfCheck = await validateReportingHierarchy(tenantA, "emp-lead", "emp-lead", stubDb);
  assert(selfCheck.valid === false, "1.1 Self-reporting rejected");
  assert(selfCheck.error!.includes("Self-reporting is forbidden"), "1.1 Explains self-reporting constraint");

  // 1.2 Direct Subordinate Assignment Prevention
  // emp-vp reports to emp-ceo. emp-lead reports to emp-vp. Assigning emp-vp to report to emp-lead creates a 2-node cycle!
  const directSubCheck = await validateReportingHierarchy(tenantA, "emp-vp", "emp-lead", stubDb);
  assert(directSubCheck.valid === false, "1.2 Direct subordinate assignment rejected");
  assert(directSubCheck.error!.includes("Circular reporting detected"), "1.2 Explains circular reporting constraint");

  // 1.3 Deep Circular Reporting (3-Level Loop: emp-ceo -> emp-vp -> emp-lead -> emp-dev -> emp-ceo)
  const deepCycleCheck = await validateReportingHierarchy(tenantA, "emp-ceo", "emp-dev", stubDb);
  assert(deepCycleCheck.valid === false, "1.3 Deep circular reporting (3-level) rejected");
  assert(deepCycleCheck.error!.includes("Circular reporting detected"), "1.3 Deep cycle detected in ancestor traversal");

  // 1.4 Cross-Tenant Manager Assignment
  const crossTenantCheck = await validateReportingHierarchy(tenantA, "emp-dev", "emp-foreign", stubDb);
  assert(crossTenantCheck.valid === false, "1.4 Cross-tenant manager assignment rejected");
  assert(crossTenantCheck.error!.includes("does not exist in this organization workspace"), "1.4 Cross-tenant boundary enforced");

  // 1.5 Inactive Employee as Manager
  const inactiveCheck = await validateReportingHierarchy(tenantA, "emp-dev", "emp-inactive", stubDb);
  assert(inactiveCheck.valid === false, "1.5 Inactive manager rejected");
  assert(inactiveCheck.error!.includes("Cannot assign inactive employee"), "1.5 Inactive status detected");

  // 1.6 Clearing Manager (Promote to Top Executive)
  const clearCheckNull = await validateReportingHierarchy(tenantA, "emp-vp", null, stubDb);
  assert(clearCheckNull.valid === true, "1.6 Clearing manager (null) is valid for top executives");

  const clearCheckEmpty = await validateReportingHierarchy(tenantA, "emp-vp", "", stubDb);
  assert(clearCheckEmpty.valid === true, "1.6 Clearing manager (empty string) is valid");

  // 1.7 Valid Hierarchy Change (emp-dev moving to report to emp-hr)
  const validCheck = await validateReportingHierarchy(tenantA, "emp-dev", "emp-hr", stubDb);
  assert(validCheck.valid === true, "1.7 Valid hierarchy transition accepted");

  // ─── SUITE 2: MANAGER CHANGE REQUEST CREATION & IDEMPOTENCY ────────────────────
  console.log("\nSUITE 2: Manager Change Request Creation, Validation & Idempotency");

  // 2.1 Missing Reason Rejected
  let missingReasonCaught = false;
  try {
    await ReportingManagerChangeService.createRequest({
      tenantId: tenantA,
      actorUserId: "usr-hr",
      employeeId: "emp-dev",
      newManagerId: "emp-hr",
      effectiveDate: "2026-11-20",
      reason: "",
      dbOverride: stubDb,
    });
  } catch (err: any) {
    missingReasonCaught = true;
    assert(err.message.includes("justification reason is mandatory"), "2.1 Empty reason rejected");
  }
  assert(missingReasonCaught, "2.1 Empty reason blocked");

  // 2.2 Proposing Current Manager Rejected
  let sameManagerCaught = false;
  try {
    await ReportingManagerChangeService.createRequest({
      tenantId: tenantA,
      actorUserId: "usr-hr",
      employeeId: "emp-dev",
      newManagerId: "emp-lead", // Current manager of emp-dev
      effectiveDate: "2026-11-20",
      reason: "No actual change",
      dbOverride: stubDb,
    });
  } catch (err: any) {
    sameManagerCaught = true;
    assert(err.message.includes("Proposed manager is identical"), "2.2 Identity manager assignment rejected");
  }
  assert(sameManagerCaught, "2.2 Redundant manager assignment blocked");

  // 2.3 Successful Request Creation
  const createRes = await ReportingManagerChangeService.createRequest({
    tenantId: tenantA,
    actorUserId: "usr-hr",
    employeeId: "emp-dev",
    newManagerId: "emp-hr",
    effectiveDate: "2026-11-20",
    reason: "Cross-functional assignment to HR technology group.",
    dbOverride: stubDb,
  });

  assert(createRes.request.status === "PENDING", "2.3 Request initialized to PENDING");
  assert(createRes.request.oldManagerId === "emp-lead", "2.3 Authoritative oldManagerId captured");
  assert(createRes.request.newManagerId === "emp-hr", "2.3 Proposed newManagerId captured");
  assert(createRes.request.fromBranchId === null && createRes.request.toBranchId === null, "2.3 Branch remains null (untouched)");
  assert(createRes.request.fromDeptId === null && createRes.request.toDeptId === null, "2.3 Department remains null (untouched)");

  // 2.4 Duplicate Conflicting Request Prevention
  let conflictCaught = false;
  try {
    await ReportingManagerChangeService.createRequest({
      tenantId: tenantA,
      actorUserId: "usr-hr",
      employeeId: "emp-dev",
      newManagerId: "emp-vp",
      effectiveDate: "2026-11-25",
      reason: "Second conflicting proposal",
      dbOverride: stubDb,
    });
  } catch (err: any) {
    conflictCaught = true;
    assert(err.message.includes("conflicting manager change request"), "2.4 Conflicting pending request rejected");
  }
  assert(conflictCaught, "2.4 Duplicate active request blocked");

  // 2.5 Deterministic Idempotency Key
  const idempKey = ReportingManagerChangeService.generateIdempotencyKey(createRes.request.id, "submitted");
  assert(idempKey === `mgr_chg_${createRes.request.id}_submitted`, "2.5 Idempotency key format verified");

  // ─── SUITE 3: APPROVAL WORKFLOW & SEGREGATION OF DUTIES ─────────────────────────
  console.log("\nSUITE 3: Approval Workflow & Segregation of Duties");

  // 3.1 Self-Approval Prevention (Target employee cannot approve own request)
  let selfApproveCaught = false;
  try {
    await ReportingManagerChangeService.reviewRequest({
      tenantId: tenantA,
      actorUserId: "usr-dev", // dev is the target employee
      requestId: createRes.request.id,
      action: "APPROVE",
      dbOverride: stubDb,
    });
  } catch (err: any) {
    selfApproveCaught = true;
    assert(err.message.includes("Employees cannot approve or review their own"), "3.1 Anti-self-approval rule enforced");
  }
  assert(selfApproveCaught, "3.1 Target employee self-approval blocked");

  // 3.2 Request Correction Mandates Comments
  let correctionNoComments = false;
  try {
    await ReportingManagerChangeService.reviewRequest({
      tenantId: tenantA,
      actorUserId: "usr-hr",
      requestId: createRes.request.id,
      action: "REQUEST_CORRECTION",
      comments: "",
      dbOverride: stubDb,
    });
  } catch (err: any) {
    correctionNoComments = true;
    assert(err.message.includes("justification comment is mandatory"), "3.2 Mandatory comment on REQUEST_CORRECTION");
  }
  assert(correctionNoComments, "3.2 Correction request requires explanation");

  // 3.3 Execute Request Correction
  const correctionRes = await ReportingManagerChangeService.reviewRequest({
    tenantId: tenantA,
    actorUserId: "usr-hr",
    requestId: createRes.request.id,
    action: "REQUEST_CORRECTION",
    comments: "Please confirm whether this is a temporary 3-month rotation.",
    dbOverride: stubDb,
  });
  assert(correctionRes.request.status === "CORRECTION_REQUESTED", "3.3 Status updated to CORRECTION_REQUESTED");
  assert(correctionRes.request.reason.includes("CORRECTION_REQUESTED on"), "3.3 Correction note appended to history");

  // 3.4 Rejection Mandates Comments
  let rejectNoComments = false;
  try {
    await ReportingManagerChangeService.reviewRequest({
      tenantId: tenantA,
      actorUserId: "usr-hr",
      requestId: createRes.request.id,
      action: "REJECT",
      comments: "",
      dbOverride: stubDb,
    });
  } catch (err: any) {
    rejectNoComments = true;
    assert(err.message.includes("justification comment is mandatory"), "3.4 Mandatory comment on REJECT");
  }
  assert(rejectNoComments, "3.4 Rejection requires explanation");

  // ─── SUITE 4: EFFECTIVE-DATE PROCESSING (IMMEDIATE VS FUTURE) ──────────────────
  console.log("\nSUITE 4: Effective-Date Processing (Immediate vs Future)");

  // 4.1 Future-Effective Request Approval (Awaiting Effective Date)
  // createRes.request has effectiveDate: 2026-11-20 (future relative to ref date or today if in future)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);

  const futureRequest = await ReportingManagerChangeService.createRequest({
    tenantId: tenantA,
    actorUserId: "usr-hr",
    employeeId: "emp-lead",
    newManagerId: "emp-hr",
    effectiveDate: futureDate.toISOString(),
    reason: "Strategic organizational transfer effective next sprint.",
    dbOverride: stubDb,
  });

  const futureApproveRes = await ReportingManagerChangeService.reviewRequest({
    tenantId: tenantA,
    actorUserId: "usr-hr",
    requestId: futureRequest.request.id,
    action: "APPROVE",
    comments: "Approved for future execution.",
    dbOverride: stubDb,
  });

  assert(futureApproveRes.request.status === "APPROVED", "4.1 Status set to APPROVED");
  assert(futureApproveRes.applied === false, "4.1 Not applied prematurely");
  assert(futureApproveRes.awaitingEffectiveDate === true, "4.1 Flagged awaitingEffectiveDate");
  assert(inMemoryEmployees["emp-lead"].managerId === "emp-vp", "4.1 Active hierarchy UNCHANGED before effective date");

  // 4.2 Immediate-Effective Approval (Effective Date <= Today)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday

  const immediateRequest = await ReportingManagerChangeService.createRequest({
    tenantId: tenantA,
    actorUserId: "usr-hr",
    employeeId: "emp-hr",
    newManagerId: "emp-vp",
    effectiveDate: pastDate.toISOString(),
    reason: "Realignment of HR operations under VP.",
    dbOverride: stubDb,
  });

  const immediateApproveRes = await ReportingManagerChangeService.reviewRequest({
    tenantId: tenantA,
    actorUserId: "usr-ceo",
    requestId: immediateRequest.request.id,
    action: "APPROVE",
    comments: "Immediate reorganization approved.",
    dbOverride: stubDb,
  });

  assert(immediateApproveRes.applied === true, "4.2 Applied immediately due to past/current effective date");
  assert(immediateApproveRes.request.status === "COMPLETED", "4.2 Status transitioned to COMPLETED");
  assert(inMemoryEmployees["emp-hr"].managerId === "emp-vp", "4.2 Active employee.managerId updated in database");

  // 4.3 Integrity Check: Salary, Branch, Department, Designation untouched!
  const empHr = inMemoryEmployees["emp-hr"];
  assert(empHr.departmentId === "dept-hr", "4.3 Department remains dept-hr (unmodified)");
  assert(empHr.branchId === "branch-hq", "4.3 Branch remains branch-hq (unmodified)");
  assert(empHr.designationId === "desig-hr", "4.3 Designation remains desig-hr (unmodified)");
  assert(empHr.salary === 110000, "4.3 Salary remains 110000 (unmodified)");

  // ─── SUITE 5: DAILY BACKGROUND SCHEDULER & AUTO-APPLICATION ────────────────────
  console.log("\nSUITE 5: Daily Background Scheduler & Auto-Application");

  // At this point: futureRequest (emp-lead -> emp-hr) has status: "APPROVED", effectiveDate: futureDate.
  // Run scheduler with referenceDate = futureDate + 1 day: should auto-apply!
  const schedRunDate = new Date(futureDate.getTime() + 24 * 60 * 60 * 1000);

  const schedRes = await runReportingManagerChangeScheduler({
    tenantId: tenantA,
    referenceDate: schedRunDate,
    dbOverride: stubDb,
  });

  assert(schedRes.success === true, "5.1 Scheduler executed successfully");
  assert(schedRes.tenantsEvaluated === 1, "5.2 Processed 1 tenant");
  assert(schedRes.changesEvaluated >= 1, "5.3 Evaluated due future transfers");
  assert(schedRes.changesApplied >= 1, "5.4 Applied due transfer");
  assert(inMemoryEmployees["emp-lead"].managerId === "emp-hr", "5.5 emp-lead now reports to emp-hr after cron run");

  // ─── SUITE 6: HISTORICAL LINEAGE IN EMPLOYEETRANSFER ───────────────────────────
  console.log("\nSUITE 6: Historical Lineage in EmployeeTransfer");

  const history = await ReportingManagerChangeService.getEmployeeManagerHistory(
    tenantA,
    "emp-lead",
    stubDb
  );

  assert(history.length >= 1, "6.1 History records retrieved for emp-lead");
  assert(history[0].oldManager?.id === "emp-vp", "6.2 Previous manager recorded as emp-vp");
  assert(history[0].newManager?.id === "emp-hr", "6.3 New manager recorded as emp-hr");
  assert(history[0].appliedAt !== undefined, "6.4 Application timestamp preserved");

  // ─── SUITE 7: ORGANIZATION TREE RECALCULATION & REPORT COUNTS ──────────────────
  console.log("\nSUITE 7: Organization Tree Structure Recalculation");

  const treeResult = await OrganizationTreeService.getEmployeeHierarchy(tenantA, {}, stubDb);
  assert(treeResult.orgChart.length > 0, "7.1 Org chart generated");

  // Find emp-hr in tree (OrgTreeNode uses `subordinates`, not `children`)
  const findNode = (nodes: any[], id: string): any => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.subordinates && n.subordinates.length > 0) {
        const found = findNode(n.subordinates, id);
        if (found) return found;
      }
    }
    return null;
  };

  const hrNode = findNode(treeResult.orgChart, "emp-hr");
  assert(hrNode !== null, "7.2 emp-hr located in tree");
  // emp-lead was reassigned to emp-hr
  const leadChild = hrNode.subordinates.find((c: any) => c.id === "emp-lead");
  assert(leadChild !== undefined, "7.3 emp-lead is a direct child of emp-hr in org chart");
  assert(hrNode.directReportsCount >= 1, "7.4 directReportsCount updated to reflect new subordinate");

  console.log("\n================================================================================");
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} tests succeeded with 0 failures.`);
  console.log("================================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("FATAL TEST SUITE ERROR:", err);
  process.exit(1);
});
