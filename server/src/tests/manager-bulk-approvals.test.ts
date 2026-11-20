import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { LeaveService, LeaveHttpError } from "../services/leave.service";
import { AttendanceService } from "../services/attendance.service";
import { EmployeeChangeRequestService } from "../services/employee-change-request.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";
import { AuditService } from "../services/audit.service";

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

test("MASTERHRMS — Phase 3 Milestone 2: P1 Manager Bulk Approvals & Atomic Transactions Suite", async (t) => {
  const timestamp = Date.now();
  const tenantAId = `test-m2-tenant-a-${timestamp}`;
  const tenantBId = `test-m2-tenant-b-${timestamp}`;

  const hrUserAId = `user-m2-hr-${timestamp}`;
  const managerUserAId = `user-m2-mgr-${timestamp}`;
  const reportUser1Id = `user-m2-rep1-${timestamp}`;
  const reportUser2Id = `user-m2-rep2-${timestamp}`;
  const foreignUserBId = `user-m2-foreign-${timestamp}`;

  let managerEmpId = "";
  let reportEmp1Id = "";
  let reportEmp2Id = "";
  let foreignEmpBId = "";
  let leaveTypePaidId = "";

  const cleanup = async () => {
    try {
      const allTenants = [tenantAId, tenantBId];
      await rawPrisma.leaveLedgerEntry.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.leaveRequest.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.attendanceRegularization.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.attendance.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.employeeChangeRequest.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.auditLog.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.leaveType.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.employee.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.userRole.deleteMany({
        where: { userId: { in: [hrUserAId, managerUserAId, reportUser1Id, reportUser2Id, foreignUserBId] } },
      });
      await rawPrisma.profile.deleteMany({
        where: { userId: { in: [hrUserAId, managerUserAId, reportUser1Id, reportUser2Id, foreignUserBId] } },
      });
      await rawPrisma.user.deleteMany({
        where: { id: { in: [hrUserAId, managerUserAId, reportUser1Id, reportUser2Id, foreignUserBId] } },
      });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: allTenants } } });
    } catch (err) {
      console.warn("Cleanup warning:", err);
    }
  };

  // Helper simulating the core all-or-nothing atomic execution of POST /team/approvals/bulk-action
  const executeBulkApprovalAction = async (params: {
    tenantId: string;
    action: "approve" | "reject";
    items: Array<{ id: string; type: string }>;
    reviewerUserId: string;
    reviewerEmployeeId: string;
    reviewerRoles: string[];
    reason?: string;
  }) => {
    const { tenantId, action, items, reviewerUserId, reviewerEmployeeId, reviewerRoles, reason } = params;
    const effectiveReason = (reason || "").trim();

    if (!["approve", "reject"].includes(action)) {
      throw { status: 400, code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'" };
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw { status: 400, code: "EMPTY_ITEMS", message: "Items array must contain at least one item." };
    }
    if (items.length > 50) {
      throw { status: 400, code: "BATCH_LIMIT_EXCEEDED", message: "Bulk operations are limited to 50 items per batch." };
    }
    if (action === "reject" && !effectiveReason) {
      throw { status: 400, code: "REJECTION_REASON_REQUIRED", message: "A clear rejection reason is mandatory when rejecting requests in bulk." };
    }

    const allowedTypes = new Set(["leave", "regularization", "profile_change"]);
    const seenKeys = new Set<string>();
    const uniqueItems: Array<{ id: string; type: "leave" | "regularization" | "profile_change" }> = [];

    for (const item of items) {
      if (!item || !item.id || !item.type) {
        throw { status: 400, code: "INVALID_ITEM_PAYLOAD", message: "Each item must have an id and type" };
      }
      if (!allowedTypes.has(item.type)) {
        throw { status: 400, code: "INVALID_ITEM_TYPE", message: `Invalid item type: ${item.type}` };
      }
      const key = `${item.type}:${item.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueItems.push({ id: String(item.id), type: item.type as any });
      }
    }

    const isHrAdmin = Boolean(reviewerRoles.includes("hr_admin") || reviewerRoles.includes("super_admin"));
    const processedItems: Array<{ id: string; type: string; status: string }> = [];

    await rawPrisma.$transaction(async (tx: any) => {
      for (const item of uniqueItems) {
        if (item.type === "leave") {
          const updated = await LeaveService.decideApplication(
            tenantId,
            item.id,
            action,
            reviewerUserId,
            effectiveReason || undefined,
            reviewerRoles,
            { tx, suppressNotifications: true }
          );
          processedItems.push({ id: item.id, type: "leave", status: updated.status });
        } else if (item.type === "regularization") {
          const updated = await AttendanceService.decideRegularization(
            tenantId,
            item.id,
            action,
            reviewerEmployeeId,
            reviewerUserId,
            reviewerRoles,
            effectiveReason || undefined,
            { tx, suppressNotifications: true }
          );
          processedItems.push({ id: item.id, type: "regularization", status: updated.status.toLowerCase() });
        } else if (item.type === "profile_change") {
          const result = await EmployeeChangeRequestService.processReviewDecision({
            tenantId,
            reviewerUserId,
            reviewerEmployeeId,
            isHrAdmin,
            requestId: item.id,
            action,
            reviewComments: effectiveReason || (action === "approve" ? "Bulk approved" : undefined),
            tx,
            suppressNotifications: true,
          });
          const reqStatus = (result.data?.status || (action === "approve" ? "APPROVED" : "REJECTED")).toLowerCase();
          processedItems.push({ id: item.id, type: "profile_change", status: reqStatus });
        }
      }

      await AuditService.logMutation(
        {
          tenantId,
          actorId: reviewerUserId,
          action: action === "approve" ? "BULK_APPROVAL_EXECUTED" : "BULK_REJECTION_EXECUTED",
          entityType: "BulkApprovalBatch",
          entityId: `bulk-${Date.now()}`,
          newState: { itemCount: processedItems.length, action, items: processedItems, reason: effectiveReason || null },
        },
        tx
      );
    });

    return {
      success: true,
      message: `Successfully ${action === "approve" ? "approved" : "rejected"} ${processedItems.length} request(s).`,
      data: {
        action,
        totalProcessed: processedItems.length,
        successfulCount: processedItems.length,
        processedItems,
      },
    };
  };

  try {
    // --------------------------------------------------------------------------
    // 0. PROVISION TENANTS, USERS, AND EMPLOYEES
    // --------------------------------------------------------------------------
    await rawPrisma.tenant.createMany({
      data: [
        { id: tenantAId, name: "Tenant M2 Alpha", slug: `alpha-m2-${timestamp}` },
        { id: tenantBId, name: "Tenant M2 Beta", slug: `beta-m2-${timestamp}` },
      ],
    });

    // Users
    await rawPrisma.user.createMany({
      data: [
        { id: hrUserAId, email: `hr-m2-${timestamp}@masterhrms.com`, passwordHash: "dummy" },
        { id: managerUserAId, email: `mgr-m2-${timestamp}@masterhrms.com`, passwordHash: "dummy" },
        { id: reportUser1Id, email: `rep1-m2-${timestamp}@masterhrms.com`, passwordHash: "dummy" },
        { id: reportUser2Id, email: `rep2-m2-${timestamp}@masterhrms.com`, passwordHash: "dummy" },
        { id: foreignUserBId, email: `foreign-m2-${timestamp}@masterhrms.com`, passwordHash: "dummy" },
      ],
    });

    await rawPrisma.userRole.createMany({
      data: [
        { userId: hrUserAId, role: "hr_admin" },
        { userId: managerUserAId, role: "manager" },
        { userId: reportUser1Id, role: "employee" },
        { userId: reportUser2Id, role: "employee" },
        { userId: foreignUserBId, role: "employee" },
      ],
    });

    // Employees in Tenant A
    const managerEmp = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: managerUserAId,
        firstName: "Marcus",
        lastName: "Manager",
        email: `mgr-m2-${timestamp}@masterhrms.com`,
        employeeCode: `MGR-${timestamp.toString().slice(-4)}`,
        status: "active",
      },
    });
    managerEmpId = managerEmp.id;

    const reportEmp1 = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: reportUser1Id,
        firstName: "Alice",
        lastName: "Developer",
        email: `rep1-m2-${timestamp}@masterhrms.com`,
        employeeCode: `REP1-${timestamp.toString().slice(-4)}`,
        managerId: managerEmpId,
        status: "active",
        phone: "+91 9123456780",
      },
    });
    reportEmp1Id = reportEmp1.id;

    const reportEmp2 = await rawPrisma.employee.create({
      data: {
        tenantId: tenantAId,
        userId: reportUser2Id,
        firstName: "Bob",
        lastName: "Tester",
        email: `rep2-m2-${timestamp}@masterhrms.com`,
        employeeCode: `REP2-${timestamp.toString().slice(-4)}`,
        managerId: managerEmpId,
        status: "active",
        phone: "+91 9123456781",
      },
    });
    reportEmp2Id = reportEmp2.id;

    // Foreign employee in Tenant B
    const foreignEmp = await rawPrisma.employee.create({
      data: {
        tenantId: tenantBId,
        userId: foreignUserBId,
        firstName: "Zara",
        lastName: "Beta",
        email: `foreign-m2-${timestamp}@masterhrms.com`,
        employeeCode: `FOR-${timestamp.toString().slice(-4)}`,
        status: "active",
      },
    });
    foreignEmpBId = foreignEmp.id;

    // Leave Type with default entitlement quota of 20 days
    const paidLeaveType = await rawPrisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: "Paid Leave",
        code: `PL-${timestamp.toString().slice(-4)}`,
        daysPerYear: 20,
        isPaid: true,
        status: "active",
      },
    });
    leaveTypePaidId = paidLeaveType.id;

    // --------------------------------------------------------------------------
    // TEST 1: Request Validation & Constraint Guards
    // --------------------------------------------------------------------------
    await t.test("1.1 Empty items array rejects with EMPTY_ITEMS (400)", async () => {
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: [],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        }),
        (err: any) => err.code === "EMPTY_ITEMS" && err.status === 400
      );
    });

    await t.test("1.2 Invalid action rejects with INVALID_ACTION (400)", async () => {
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "undecided" as any,
          items: [{ id: "req-1", type: "leave" }],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        }),
        (err: any) => err.code === "INVALID_ACTION" && err.status === 400
      );
    });

    await t.test("1.3 Invalid item type rejects with INVALID_ITEM_TYPE (400)", async () => {
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: [{ id: "req-1", type: "timesheet" as any }],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        }),
        (err: any) => err.code === "INVALID_ITEM_TYPE" && err.status === 400
      );
    });

    await t.test("1.4 Rejection without reason rejects with REJECTION_REASON_REQUIRED (400)", async () => {
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "reject",
          items: [{ id: "req-1", type: "leave" }],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
          reason: "   ",
        }),
        (err: any) => err.code === "REJECTION_REASON_REQUIRED" && err.status === 400
      );
    });

    await t.test("1.5 Batch exceeding 50 items rejects with BATCH_LIMIT_EXCEEDED (400)", async () => {
      const oversizedItems = Array.from({ length: 51 }, (_, i) => ({ id: `req-${i}`, type: "leave" }));
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: oversizedItems,
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        }),
        (err: any) => err.code === "BATCH_LIMIT_EXCEEDED" && err.status === 400
      );
    });

    // --------------------------------------------------------------------------
    // TEST 2: Segregation of Duties & Scope Enforcement
    // --------------------------------------------------------------------------
    await t.test("2.1 Anti-Self-Approval: Manager cannot include own request in bulk batch", async () => {
      // Create leave for Alice and leave for Manager
      const aliceLeave = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp1Id,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-02"),
          days: 2,
          reason: "Alice Vacation",
          status: "pending",
        },
      });

      const managerLeave = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: managerEmpId,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-02"),
          days: 2,
          reason: "Manager Vacation",
          status: "pending",
        },
      });

      // Attempt bulk action including own manager leave
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: [
            { id: aliceLeave.id, type: "leave" },
            { id: managerLeave.id, type: "leave" },
          ],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        }),
        (err: any) => {
          const isForbidden =
            err.code === "SELF_APPROVAL_FORBIDDEN" ||
            (err.message && err.message.includes("Segregation of duties"));
          return Boolean(isForbidden);
        }
      );

      // Verify ATOMIC ROLLBACK: Alice's leave MUST still be 'pending' with zero debits
      const aliceReload = await rawPrisma.leaveRequest.findUnique({ where: { id: aliceLeave.id } });
      assert.strictEqual(aliceReload?.status, "pending", "Alice leave must remain pending due to batch rollback");

      const aliceDebits = await rawPrisma.leaveLedgerEntry.count({
        where: { tenantId: tenantAId, employeeId: reportEmp1Id, entryType: "DEBIT" },
      });
      assert.strictEqual(aliceDebits, 0, "Zero DEBIT ledger entries must exist on rolled back batch");

      const aliceBaseBal = await LeaveService.getEmployeeBalance(tenantAId, reportEmp1Id, leaveTypePaidId, undefined, {
        ignorePending: true,
      });
      assert.strictEqual(aliceBaseBal, 20, "Alice base balance must remain intact on rolled back batch");

      // Cleanup test requests
      await rawPrisma.leaveRequest.deleteMany({ where: { id: { in: [aliceLeave.id, managerLeave.id] } } });
    });

    await t.test("2.2 Unauthorized reviewer cannot approve requests for non-direct reports", async () => {
      const bobLeave = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp2Id,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-07-01"),
          endDate: new Date("2026-07-01"),
          days: 1,
          reason: "Bob Personal Day",
          status: "pending",
        },
      });

      // Employee 1 attempts to approve Employee 2's leave
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: [{ id: bobLeave.id, type: "leave" }],
          reviewerUserId: reportUser1Id,
          reviewerEmployeeId: reportEmp1Id,
          reviewerRoles: ["employee"],
        }),
        (err: any) => err.status === 403 || (err.message && err.message.includes("Forbidden"))
      );

      await rawPrisma.leaveRequest.delete({ where: { id: bobLeave.id } });
    });

    // --------------------------------------------------------------------------
    // TEST 3: All-or-Nothing Atomic Rollback Integrity
    // --------------------------------------------------------------------------
    await t.test("3.1 Single failure in mixed batch rolls back ALL items completely", async () => {
      // Item 1: Valid leave for Alice
      const leave1 = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp1Id,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-08-10"),
          endDate: new Date("2026-08-11"),
          days: 2,
          reason: "Trip to hills",
          status: "pending",
        },
      });

      // Item 2: Valid regularization for Bob
      const reg2 = await rawPrisma.attendanceRegularization.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp2Id,
          attendanceDate: new Date("2026-08-05"),
          reason: "Biometric glitch",
          status: "PENDING",
          proposedIn: new Date("2026-08-05T09:00:00Z"),
          proposedOut: new Date("2026-08-05T18:00:00Z"),
        },
      });

      // Item 3: Stale/non-existent leave item
      const invalidLeaveId = "stale-non-existent-id-999";

      // Execute batch with Item 1, Item 2, and Item 3
      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: [
            { id: leave1.id, type: "leave" },
            { id: reg2.id, type: "regularization" },
            { id: invalidLeaveId, type: "leave" },
          ],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        })
      );

      // Verify Item 1: STILL pending, balance untouched
      const leave1Reload = await rawPrisma.leaveRequest.findUnique({ where: { id: leave1.id } });
      assert.strictEqual(leave1Reload?.status, "pending");

      const debits = await rawPrisma.leaveLedgerEntry.count({
        where: { tenantId: tenantAId, referenceId: leave1.id },
      });
      assert.strictEqual(debits, 0, "No ledger entry should exist for rolled back leave");

      // Verify Item 2: STILL PENDING, attendance record NOT created
      const reg2Reload = await rawPrisma.attendanceRegularization.findUnique({ where: { id: reg2.id } });
      assert.strictEqual(reg2Reload?.status, "PENDING");

      const attnRecord = await rawPrisma.attendance.findFirst({
        where: { tenantId: tenantAId, employeeId: reportEmp2Id, date: new Date("2026-08-05") },
      });
      assert.strictEqual(attnRecord, null, "Attendance record must NOT be created on failed batch");

      // Cleanup
      await rawPrisma.leaveRequest.delete({ where: { id: leave1.id } });
      await rawPrisma.attendanceRegularization.delete({ where: { id: reg2.id } });
    });

    // --------------------------------------------------------------------------
    // TEST 4: Successful Multi-Type Heterogeneous Bulk Approval
    // --------------------------------------------------------------------------
    await t.test("4.1 Heterogeneous bulk approval (Leave + Regularization + Profile Change) succeeds atomically", async () => {
      // 1. Leave for Alice (2 days)
      const leave = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp1Id,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-09-02"),
          days: 2,
          reason: "Family function",
          status: "pending",
        },
      });

      // 2. Regularization for Bob
      const regDate = new Date("2026-09-03");
      const reg = await rawPrisma.attendanceRegularization.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp2Id,
          attendanceDate: regDate,
          reason: "Card forgotten",
          status: "PENDING",
          proposedIn: new Date("2026-09-03T09:15:00Z"),
          proposedOut: new Date("2026-09-03T18:15:00Z"),
        },
      });

      // 3. Profile Change for Alice (Update phone)
      const newPhone = "+91 9999988888";
      const changeReq = await rawPrisma.employeeChangeRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp1Id,
          fieldCategory: "personal",
          fieldKey: "phone",
          oldValueJson: JSON.stringify({ phone: "+91 9123456780" }),
          newValueJson: JSON.stringify({ category: "personal", changes: { phone: newPhone } }),
          status: "PENDING",
        },
      });

      // Execute bulk approval
      const result = await executeBulkApprovalAction({
        tenantId: tenantAId,
        action: "approve",
        items: [
          { id: leave.id, type: "leave" },
          { id: reg.id, type: "regularization" },
          { id: changeReq.id, type: "profile_change" },
        ],
        reviewerUserId: managerUserAId,
        reviewerEmployeeId: managerEmpId,
        reviewerRoles: ["manager"],
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.successfulCount, 3);

      // Verify Leave: status approved, balance decremented by 2, exactly 1 DEBIT ledger
      const leaveReload = await rawPrisma.leaveRequest.findUnique({ where: { id: leave.id } });
      assert.strictEqual(leaveReload?.status, "approved");
      assert.strictEqual(leaveReload?.approverId, managerUserAId);

      const aliceBal = await LeaveService.getEmployeeBalance(tenantAId, reportEmp1Id, leaveTypePaidId);
      assert.strictEqual(aliceBal, 18);

      const ledgerEntries = await rawPrisma.leaveLedgerEntry.findMany({
        where: { tenantId: tenantAId, employeeId: reportEmp1Id, referenceId: leave.id, entryType: "DEBIT" },
      });
      assert.strictEqual(ledgerEntries.length, 1, "Exactly one ledger DEBIT entry must exist for approved leave");
      assert.strictEqual(Number(ledgerEntries[0].days), 2);

      // Verify Regularization: status APPROVED, Attendance row created with 'present'
      const regReload = await rawPrisma.attendanceRegularization.findUnique({ where: { id: reg.id } });
      assert.strictEqual(regReload?.status, "APPROVED");

      const attnRecord = await rawPrisma.attendance.findFirst({
        where: { tenantId: tenantAId, employeeId: reportEmp2Id, date: regDate },
      });
      assert.ok(attnRecord, "Attendance record must be upserted");
      assert.strictEqual(attnRecord.status, "present");

      // Verify Profile Change: status APPROVED, authoritative Employee.phone updated
      const crReload = await rawPrisma.employeeChangeRequest.findUnique({ where: { id: changeReq.id } });
      assert.strictEqual(crReload?.status, "APPROVED");

      const aliceEmp = await rawPrisma.employee.findUnique({ where: { id: reportEmp1Id } });
      assert.strictEqual(aliceEmp?.phone, newPhone, "Authoritative Employee phone must reflect approved change");

      // Verify Batch Audit Record
      const batchAudit = await rawPrisma.auditLog.findFirst({
        where: { tenantId: tenantAId, action: "BULK_APPROVAL_EXECUTED" },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(batchAudit, "Batch audit log must be recorded");

      // Cleanup
      await rawPrisma.leaveLedgerEntry.deleteMany({ where: { referenceId: leave.id } });
      await rawPrisma.leaveRequest.delete({ where: { id: leave.id } });
      await rawPrisma.attendanceRegularization.delete({ where: { id: reg.id } });
      await rawPrisma.attendance.deleteMany({ where: { tenantId: tenantAId, employeeId: reportEmp2Id } });
      await rawPrisma.employeeChangeRequest.delete({ where: { id: changeReq.id } });
    });

    // --------------------------------------------------------------------------
    // TEST 5: Successful Multi-Type Heterogeneous Bulk Rejection
    // --------------------------------------------------------------------------
    await t.test("5.1 Bulk rejection with mandatory reason records individual reasons without balance debit", async () => {
      // 1. Leave for Bob (3 days)
      const leave = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp2Id,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-10-03"),
          days: 3,
          reason: "Long weekend",
          status: "pending",
        },
      });

      // 2. Regularization for Alice
      const reg = await rawPrisma.attendanceRegularization.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp1Id,
          attendanceDate: new Date("2026-10-04"),
          reason: "WFH forgot to punch",
          status: "PENDING",
        },
      });

      const rejectionReason = "Project deadline delivery week - team presence required";

      // Execute bulk rejection
      const result = await executeBulkApprovalAction({
        tenantId: tenantAId,
        action: "reject",
        items: [
          { id: leave.id, type: "leave" },
          { id: reg.id, type: "regularization" },
        ],
        reviewerUserId: managerUserAId,
        reviewerEmployeeId: managerEmpId,
        reviewerRoles: ["manager"],
        reason: rejectionReason,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.successfulCount, 2);

      // Verify Leave: status rejected, rejectionReason stored, balance untouched
      const leaveReload = await rawPrisma.leaveRequest.findUnique({ where: { id: leave.id } });
      assert.strictEqual(leaveReload?.status, "rejected");
      assert.strictEqual(leaveReload?.rejectionReason, rejectionReason);

      const bobBal = await LeaveService.getEmployeeBalance(tenantAId, reportEmp2Id, leaveTypePaidId);
      assert.strictEqual(bobBal, 20);

      // Verify Regularization: status REJECTED, reviewComments stored
      const regReload = await rawPrisma.attendanceRegularization.findUnique({ where: { id: reg.id } });
      assert.strictEqual(regReload?.status, "REJECTED");
      assert.strictEqual(regReload?.reviewComments, rejectionReason);

      // Verify Batch Audit Record
      const batchAudit = await rawPrisma.auditLog.findFirst({
        where: { tenantId: tenantAId, action: "BULK_REJECTION_EXECUTED" },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(batchAudit, "Batch rejection audit log must be recorded");

      // Cleanup
      await rawPrisma.leaveRequest.delete({ where: { id: leave.id } });
      await rawPrisma.attendanceRegularization.delete({ where: { id: reg.id } });
    });

    // --------------------------------------------------------------------------
    // TEST 6: Concurrency & Duplicate Action Protection
    // --------------------------------------------------------------------------
    await t.test("6.1 Re-processing already decided request throws conflict and rolls back", async () => {
      // Create approved leave
      const leave = await rawPrisma.leaveRequest.create({
        data: {
          tenantId: tenantAId,
          employeeId: reportEmp1Id,
          leaveTypeId: leaveTypePaidId,
          startDate: new Date("2026-11-01"),
          endDate: new Date("2026-11-01"),
          days: 1,
          status: "approved",
        },
      });

      await assert.rejects(
        executeBulkApprovalAction({
          tenantId: tenantAId,
          action: "approve",
          items: [{ id: leave.id, type: "leave" }],
          reviewerUserId: managerUserAId,
          reviewerEmployeeId: managerEmpId,
          reviewerRoles: ["manager"],
        }),
        (err: any) => err.status === 409 || (err.message && err.message.includes("already"))
      );

      await rawPrisma.leaveRequest.delete({ where: { id: leave.id } });
    });
  } finally {
    await cleanup();
  }
});
