import dotenv from "dotenv";
import path from "path";
import assert from "node:assert";
import { EmployeeChangeRequestService, ALLOWED_FIELDS_BY_CATEGORY, PROTECTED_SYSTEM_FIELDS } from "../services/employee-change-request.service";
import { prisma, rawPrisma } from "../prisma";
import { NotificationService } from "../services/notification.service";
import { OutboxService } from "../services/outbox.service";
import { AuditService } from "../services/audit.service";
import { WorkflowService } from "../services/workflow.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runSelfServiceRequestCentreTests() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE SUITE: EMPLOYEE SELF-SERVICE REQUEST CENTRE (PHASE 3.1)");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const tenantId = `tenant-ess-${timestamp}`;
  const otherTenantId = `tenant-other-${timestamp}`;
  const empAId = `emp-a-${timestamp}`;
  const empBId = `emp-b-${timestamp}`;
  const managerId = `mgr-${timestamp}`;
  const hrUserId = `user-hr-${timestamp}`;
  const userAId = `user-a-${timestamp}`;
  const userBId = `user-b-${timestamp}`;

  // In-memory mock store for test isolation
  const mockEmployees: Record<string, any> = {
    [empAId]: {
      id: empAId,
      tenantId,
      userId: userAId,
      employeeCode: "EMP-001",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      phone: "+91 9876543210",
      dateOfBirth: new Date("1995-05-15"),
      gender: "female",
      maritalStatus: "single",
      bloodGroup: "O+",
      fatherOrSpouseName: "Robert Smith",
      presentAddress: "123 Main St, Bangalore",
      permanentAddress: "456 Heritage Rd, Mysore",
      addressLine1: "123 Main St",
      addressLine2: "Apt 4B",
      city: "Bangalore",
      district: "Bangalore Urban",
      state: "Karnataka",
      postalCode: "560001",
      emergencyContactName: "Robert Smith",
      emergencyContactRelationship: "Father",
      emergencyContactPhone: "+91 9876500000",
      bankName: "State Bank of India",
      bankAccount: "112233445566",
      bankIfsc: "SBIN0001234",
      bankBranch: "Indiranagar",
      pan: "ABCDE1234F",
      aadhaar: "123456789012",
      uan: "100200300400",
      esiNumber: "3100012345",
      pfNumber: "PF/BLR/1001",
      managerId,
      manager: {
        id: managerId,
        userId: "user-mgr-001",
        firstName: "Marcus",
        lastName: "Vance",
        email: "marcus@example.com",
      },
    },
    [empBId]: {
      id: empBId,
      tenantId,
      userId: userBId,
      employeeCode: "EMP-002",
      firstName: "Bob",
      lastName: "Jones",
      email: "bob@example.com",
      managerId,
      manager: {
        id: managerId,
        userId: "user-mgr-001",
        firstName: "Marcus",
        lastName: "Vance",
      },
    },
  };

  const mockChangeRequests: Record<string, any> = {};
  const mockNotifications: any[] = [];
  const mockOutboxEvents: any[] = [];
  const mockAuditLogs: any[] = [];
  const mockApprovalRequests: Record<string, any> = {};

  // Stub services
  const origNotification = NotificationService.createNotification;
  const origOutbox = OutboxService.createOutboxEvent;
  const origAudit = AuditService.logMutation;
  const origWfSubmit = WorkflowService.submit;
  const origWfApprove = WorkflowService.approveStep;
  const origWfReject = WorkflowService.rejectStep;
  const origWfWithdraw = WorkflowService.withdrawRequest;

  NotificationService.createNotification = async (params: any) => {
    mockNotifications.push(params);
    return { id: `notif-${Date.now()}` };
  };

  OutboxService.createOutboxEvent = async (params: any) => {
    mockOutboxEvents.push(params);
    return { id: `outbox-${Date.now()}` };
  };

  AuditService.logMutation = async (params: any) => {
    mockAuditLogs.push(params);
    return { id: `audit-${Date.now()}` };
  };

  WorkflowService.submit = async (params: any) => {
    const id = `wf-req-${Date.now()}`;
    mockApprovalRequests[params.entityId] = {
      id,
      entityType: params.entityType,
      entityId: params.entityId,
      status: "PENDING",
      actions: [],
    };
    return mockApprovalRequests[params.entityId];
  };

  WorkflowService.approveStep = async (params: any) => {
    return { status: "APPROVED" };
  };

  WorkflowService.rejectStep = async (params: any) => {
    return { status: "REJECTED" };
  };

  WorkflowService.withdrawRequest = async (params: any) => {
    return { status: "WITHDRAWN" };
  };

  // Stub Prisma methods
  const db: any = rawPrisma || prisma;
  const origEmpFindUnique = db.employee.findUnique;
  const origEmpFindFirst = db.employee.findFirst;
  const origEmpUpdate = db.employee.update;
  const origCrCreate = db.employeeChangeRequest.create;
  const origCrFindUnique = db.employeeChangeRequest.findUnique;
  const origCrFindFirst = db.employeeChangeRequest.findFirst;
  const origCrFindMany = db.employeeChangeRequest.findMany;
  const origCrCount = db.employeeChangeRequest.count;
  const origCrUpdate = db.employeeChangeRequest.update;
  const origCrGroupBy = db.employeeChangeRequest.groupBy;
  const origTransaction = db.$transaction;
  const origMediaFileFindUnique = db.mediaFile?.findUnique;
  const origApprovalReqFindFirst = db.approvalRequest?.findFirst;

  if (!db.mediaFile) db.mediaFile = {};
  db.mediaFile.findUnique = async ({ where }: any) => ({
    id: where.id,
    fileName: "bank_cheque.pdf",
    fileSize: 102400,
    mimeType: "application/pdf",
    url: "/uploads/bank_cheque.pdf",
  });

  if (!db.approvalRequest) db.approvalRequest = {};
  db.approvalRequest.findFirst = async ({ where }: any) => {
    return mockApprovalRequests[where.entityId] || null;
  };

  db.employee.findUnique = async ({ where }: any) => mockEmployees[where.id] || null;
  db.employee.findFirst = async ({ where }: any) => {
    if (where.tenantId && where.id) {
      const emp = mockEmployees[where.id];
      return emp && emp.tenantId === where.tenantId ? emp : null;
    }
    return null;
  };
  db.employee.update = async ({ where, data }: any) => {
    const emp = mockEmployees[where.id];
    if (!emp) throw new Error("Employee not found");
    Object.assign(emp, data);
    return emp;
  };

  db.employeeChangeRequest.create = async ({ data }: any) => {
    const id = `cr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      ...data,
      createdAt: new Date(),
    };
    mockChangeRequests[id] = record;
    return record;
  };

  db.employeeChangeRequest.findUnique = async ({ where }: any) => {
    const req = mockChangeRequests[where.id];
    if (!req) return null;
    return {
      ...req,
      employee: mockEmployees[req.employeeId],
    };
  };

  db.employeeChangeRequest.findFirst = async ({ where }: any) => {
    for (const req of Object.values(mockChangeRequests)) {
      let match = true;
      if (where.id && req.id !== where.id) match = false;
      if (where.tenantId && req.tenantId !== where.tenantId) match = false;
      if (where.employeeId && req.employeeId !== where.employeeId) match = false;
      if (match) {
        return {
          ...req,
          employee: mockEmployees[req.employeeId],
        };
      }
    }
    return null;
  };

  db.employeeChangeRequest.findMany = async ({ where }: any) => {
    return Object.values(mockChangeRequests).filter((r: any) => {
      if (where.tenantId && r.tenantId !== where.tenantId) return false;
      if (where.employeeId && r.employeeId !== where.employeeId) return false;
      if (where.status && r.status !== where.status) return false;
      if (where.fieldCategory && r.fieldCategory !== where.fieldCategory) return false;
      return true;
    }).map((r: any) => ({ ...r, employee: mockEmployees[r.employeeId] }));
  };

  db.employeeChangeRequest.count = async ({ where }: any) => {
    return (await db.employeeChangeRequest.findMany({ where })).length;
  };

  db.employeeChangeRequest.update = async ({ where, data }: any) => {
    const req = mockChangeRequests[where.id];
    if (!req) throw new Error("Change request not found");
    Object.assign(req, data);
    return { ...req, employee: mockEmployees[req.employeeId] };
  };

  db.employeeChangeRequest.groupBy = async () => [
    { status: "PENDING", _count: { id: 1 } },
    { status: "APPROVED", _count: { id: 1 } },
  ];

  db.$transaction = async (fn: any) => fn(db);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: COMPOUND PAYLOAD & ALLOWLIST VALIDATION
    // -------------------------------------------------------------------------
    console.log("▶ [Test 1] Compound Payload & Allowlist Validation");

    // 1a. Personal info valid compound
    assert.doesNotThrow(() => {
      EmployeeChangeRequestService.validateChanges("personal", {
        firstName: "Alicia",
        lastName: "Smith-Jones",
        dateOfBirth: "1994-08-20",
        gender: "female",
        phone: "+91 9999988888",
      });
    }, "Valid personal info payload must pass validation");

    // 1b. Protected field rejection (salary, role, status)
    assert.throws(
      () => {
        EmployeeChangeRequestService.validateChanges("personal", {
          firstName: "Alicia",
          salary: 1000000,
        });
      },
      /Modification of protected administrative field 'salary' is strictly forbidden/,
      "Protected field 'salary' must be strictly rejected"
    );

    assert.throws(
      () => {
        EmployeeChangeRequestService.validateChanges("banking", {
          bankName: "HDFC",
          role: "super_admin",
        });
      },
      /Modification of protected administrative field 'role' is strictly forbidden/,
      "Protected field 'role' must be strictly rejected"
    );

    // 1c. Invalid PAN formatting
    assert.throws(
      () => {
        EmployeeChangeRequestService.validateChanges("tax_identity", {
          pan: "INVALIDPAN12",
        });
      },
      /Invalid PAN format/,
      "Invalid PAN format must be rejected"
    );

    // 1d. Invalid IFSC code formatting
    assert.throws(
      () => {
        EmployeeChangeRequestService.validateChanges("banking", {
          bankIfsc: "12345",
        });
      },
      /Invalid IFSC format/,
      "Invalid IFSC must be rejected"
    );

    console.log("  ✔ Passed: Field allowlists, protected field security, and format regex checks enforce strict boundaries.\n");

    // -------------------------------------------------------------------------
    // TEST 2: SUBMITTING COMPOUND BANKING REQUEST WITH OLD VALUE SNAPSHOT
    // -------------------------------------------------------------------------
    console.log("▶ [Test 2] Submitting Compound Banking Request with Old Value Snapshot");

    const bankingReq = await EmployeeChangeRequestService.createRequest({
      tenantId,
      employeeId: empAId,
      userId: userAId,
      fieldCategory: "banking",
      changes: {
        bankName: "HDFC Bank",
        bankAccount: "50100987654321",
        bankIfsc: "HDFC0001234",
        bankBranch: "Koramangala, Bangalore",
      },
      reason: "Salary account updated to HDFC",
      proofMediaId: "med-bank-proof-01",
    });

    assert.strictEqual(bankingReq.status, "PENDING", "Initial active submission status must be PENDING");
    assert.strictEqual(bankingReq.fieldCategory, "banking");
    assert.strictEqual(bankingReq.proofMediaId, "med-bank-proof-01");

    // Verify old value snapshot was captured from official record
    assert.ok(bankingReq.oldValues, "Old values snapshot must exist");
    assert.strictEqual(bankingReq.oldValues.bankName, "State Bank of India");

    // Verify official employee record is UNTOUCHED before approval
    assert.strictEqual(mockEmployees[empAId].bankName, "State Bank of India", "Official employee record must NOT change on submission");
    assert.strictEqual(mockEmployees[empAId].bankAccount, "112233445566", "Official account must remain unchanged");

    // Verify notification was sent to manager
    const mgrNotif = mockNotifications.find((n) => n.metadata?.changeRequestId === bankingReq.id);
    assert.ok(mgrNotif, "Manager notification must be dispatched upon submission");

    console.log("  ✔ Passed: Old snapshot recorded, official record unchanged, and manager notification dispatched.\n");

    // -------------------------------------------------------------------------
    // TEST 3: DRAFT WORKFLOW & RESUBMISSION
    // -------------------------------------------------------------------------
    console.log("▶ [Test 3] Draft Lifecycle & Submission");

    const draftReq = await EmployeeChangeRequestService.createRequest({
      tenantId,
      employeeId: empAId,
      userId: userAId,
      fieldCategory: "address",
      changes: {
        addressLine1: "789 Park Lane",
        city: "Bangalore",
        postalCode: "560025",
      },
      isDraft: true,
      reason: "Draft address update",
    });

    assert.strictEqual(draftReq.status, "DRAFT", "Draft request must have DRAFT status");

    // Update draft and submit now
    const submittedDraft = await EmployeeChangeRequestService.updateDraftOrCorrection({
      tenantId,
      employeeId: empAId,
      userId: userAId,
      requestId: draftReq.id,
      changes: {
        addressLine1: "789 Park Lane, Suite 10",
        city: "Bangalore",
        postalCode: "560025",
      },
      submitNow: true,
    });

    assert.strictEqual(submittedDraft.status, "PENDING", "Submitting draft must transition to PENDING");
    console.log("  ✔ Passed: DRAFT saved and transitioned to PENDING upon submitNow.\n");

    // -------------------------------------------------------------------------
    // TEST 4: CORRECTION REQUESTED LOOP
    // -------------------------------------------------------------------------
    console.log("▶ [Test 4] Correction Requested Loop");

    // Manager requests correction on banking request
    const correctionResult = await EmployeeChangeRequestService.processReviewDecision({
      tenantId,
      reviewerUserId: "user-mgr-001",
      reviewerEmployeeId: managerId,
      isHrAdmin: false,
      requestId: bankingReq.id,
      action: "request_correction",
      reviewComments: "Account holder name on cheque does not match legal employee name. Please upload revised proof.",
    });

    assert.strictEqual(correctionResult.data.status, "CORRECTION_REQUESTED");
    assert.strictEqual(mockChangeRequests[bankingReq.id].status, "CORRECTION_REQUESTED");

    // Employee responds to correction request
    const resubmittedReq = await EmployeeChangeRequestService.updateDraftOrCorrection({
      tenantId,
      employeeId: empAId,
      userId: userAId,
      requestId: bankingReq.id,
      changes: {
        bankName: "HDFC Bank",
        bankAccount: "50100987654321",
        bankIfsc: "HDFC0001234",
        bankBranch: "Koramangala, Bangalore",
      },
      proofMediaId: "med-revised-cheque-02",
      reason: "Uploaded revised cancelled cheque with matching name.",
      submitNow: true,
    });

    assert.strictEqual(resubmittedReq.status, "PENDING", "Resubmission after correction must transition status back to PENDING");
    console.log("  ✔ Passed: Request returned for correction and successfully resubmitted to PENDING.\n");

    // -------------------------------------------------------------------------
    // TEST 5: SEGREGATION OF DUTIES & OWNERSHIP ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("▶ [Test 5] Segregation of Duties & Access Control");

    // 5a. Self-approval blocked
    await assert.rejects(
      async () => {
        await EmployeeChangeRequestService.processReviewDecision({
          tenantId,
          reviewerUserId: userAId,
          reviewerEmployeeId: empAId, // Self!
          isHrAdmin: true,
          requestId: bankingReq.id,
          action: "approve",
        });
      },
      /Segregation of duties violation: You cannot approve or review your own change request/,
      "Self-approval must be blocked by segregation of duties"
    );

    // 5b. Cross-employee unauthorized cancellation
    await assert.rejects(
      async () => {
        await EmployeeChangeRequestService.cancelRequest(
          tenantId,
          empBId, // Bob attempting to cancel Alice's request
          userBId,
          bankingReq.id
        );
      },
      /Change request not found or not authorized to cancel/,
      "Employee cannot cancel another employee's request"
    );

    // 5c. Cross-tenant isolation
    await assert.rejects(
      async () => {
        await EmployeeChangeRequestService.getRequestDetails(otherTenantId, bankingReq.id, {
          isHrAdmin: true,
        });
      },
      /Change request not found/,
      "Cross-tenant request lookup must be rejected"
    );

    console.log("  ✔ Passed: Self-approval rejected, cross-employee and cross-tenant boundaries strictly enforced.\n");

    // -------------------------------------------------------------------------
    // TEST 6: FINAL APPROVAL & ATOMIC PROFILE UPDATE
    // -------------------------------------------------------------------------
    console.log("▶ [Test 6] Final Approval & Atomic Authoritative Profile Update");

    const approvalResult = await EmployeeChangeRequestService.processReviewDecision({
      tenantId,
      reviewerUserId: hrUserId,
      reviewerEmployeeId: null,
      isHrAdmin: true,
      requestId: bankingReq.id,
      action: "approve",
      reviewComments: "Verified against cancelled cheque. Approved.",
    });

    assert.strictEqual(approvalResult.success, true);
    assert.strictEqual(approvalResult.data.status, "APPROVED");

    // Verify official employee record is now atomically updated!
    const updatedEmployee = mockEmployees[empAId];
    assert.strictEqual(updatedEmployee.bankName, "HDFC Bank", "Official bankName must be updated to HDFC Bank");
    assert.strictEqual(updatedEmployee.bankAccount, "50100987654321", "Official bankAccount must be updated");
    assert.strictEqual(updatedEmployee.bankIfsc, "HDFC0001234", "Official bankIfsc must be updated");
    assert.strictEqual(updatedEmployee.bankBranch, "Koramangala, Bangalore", "Official bankBranch must be updated");

    // Verify audit log mutation and outbox event were recorded
    const approveAudit = mockAuditLogs.find((a) => a.action === "PROFILE_CHANGE_REQUEST_APPROVED");
    assert.ok(approveAudit, "Audit log mutation for approval must exist");

    const approveOutbox = mockOutboxEvents.find((o) => o.eventType === "profile.change_approved");
    assert.ok(approveOutbox, "Outbox event for approval must exist");

    console.log("  ✔ Passed: Atomic transaction successfully updated authoritative employee record with audit trail.\n");

    // -------------------------------------------------------------------------
    // TEST 7: SENSITIVE DATA MASKING
    // -------------------------------------------------------------------------
    console.log("▶ [Test 7] Sensitive Data Masking Verification");

    // Fetch details as standard viewer (canViewSensitive = false)
    const maskedDetails = await EmployeeChangeRequestService.getRequestDetails(tenantId, bankingReq.id, {
      employeeId: empAId,
      isHrAdmin: false,
      canViewSensitive: false,
    });

    assert.ok(maskedDetails.newValues.bankAccount.includes("••••"), "Bank account must be masked in standard API response");
    assert.strictEqual(maskedDetails.newValues.bankAccount.slice(-4), "4321", "Last 4 digits remain visible");

    // Verify plaintext bank account was NOT logged in audit newState
    assert.strictEqual(approveAudit.newState.bankAccount, undefined, "Sensitive bank account must not be logged in plain audit state");

    console.log("  ✔ Passed: Bank accounts properly masked in responses and logs.\n");

    console.log("================================================================================");
    console.log("🎉 ALL 7 PHASE 3.1 EMPLOYEE SELF-SERVICE REQUEST SUITES PASSED FLAWLESSLY!");
    console.log("================================================================================\n");

  } finally {
    // Restore mocks
    NotificationService.createNotification = origNotification;
    OutboxService.createOutboxEvent = origOutbox;
    AuditService.logMutation = origAudit;
    WorkflowService.submit = origWfSubmit;
    WorkflowService.approveStep = origWfApprove;
    WorkflowService.rejectStep = origWfReject;
    WorkflowService.withdrawRequest = origWfWithdraw;

    db.employee.findUnique = origEmpFindUnique;
    db.employee.findFirst = origEmpFindFirst;
    db.employee.update = origEmpUpdate;
    db.employeeChangeRequest.create = origCrCreate;
    db.employeeChangeRequest.findUnique = origCrFindUnique;
    db.employeeChangeRequest.findFirst = origCrFindFirst;
    db.employeeChangeRequest.findMany = origCrFindMany;
    db.employeeChangeRequest.count = origCrCount;
    db.employeeChangeRequest.update = origCrUpdate;
    db.employeeChangeRequest.groupBy = origCrGroupBy;
    db.$transaction = origTransaction;
    if (db.mediaFile) db.mediaFile.findUnique = origMediaFileFindUnique;
    if (db.approvalRequest) db.approvalRequest.findFirst = origApprovalReqFindFirst;
  }
}

runSelfServiceRequestCentreTests().catch((err) => {
  console.error("❌ Test Suite Failure:", err);
  process.exit(1);
});
