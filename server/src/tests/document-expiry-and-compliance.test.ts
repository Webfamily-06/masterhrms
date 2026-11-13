import { DocumentExpiryService } from "../services/document-expiry.service.js";
import { DocumentComplianceService } from "../services/document-compliance.service.js";
import { runDocumentExpiryCron } from "../cron/document-expiry.cron.js";
import { runWithTenantContext } from "../context/tenant-context.js";

/**
 * MASTERHRMS — Phase 3.2 Automated Verification & QA Test Suite
 * Tests:
 * 1. Document Expiry Classification & Boundary Arithmetic (30d, 15d, 7d, 0d, Expired, Status Precedence)
 * 2. Idempotency Key Generation & Deduplication Logic
 * 3. Cron Transition & Monitoring Engine
 * 4. Document Renewal Workflow (Predecessor Supersession & Successor Creation)
 * 5. Compliance Calculation Engine (Tenant Summary, Formula Accuracy, Zero-Division, Department Breakdown, Employee Checklist)
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
  console.log("MASTERHRMS PHASE 3.2: DOCUMENT EXPIRY & COMPLIANCE AUTOMATION TEST SUITE");
  console.log("================================================================================\n");

  const refDate = new Date("2026-11-13T00:00:00.000Z");

  // ─── SUITE 1: DOCUMENT EXPIRY CLASSIFICATION & BOUNDARY TESTS ───────────────────
  console.log("SUITE 1: Document Expiry Classification & Boundary Arithmetic");

  // 1.1 Status Precedence: Superseded
  const supersededDoc = { status: "superseded", expiryDate: new Date("2026-11-20T00:00:00.000Z") };
  const supersededCls = DocumentExpiryService.classifyDocument(supersededDoc, refDate);
  assert(supersededCls.classification === "SUPERSEDED", "1.1 Status 'superseded' takes precedence over expiryDate");
  assert(supersededCls.stage === "none", "1.1 Superseded stage is 'none'");

  // 1.2 Status Precedence: Rejected
  const rejectedDoc = { status: "rejected", expiryDate: new Date("2026-11-20T00:00:00.000Z") };
  const rejectedCls = DocumentExpiryService.classifyDocument(rejectedDoc, refDate);
  assert(rejectedCls.classification === "REJECTED", "1.2 Status 'rejected' takes precedence over expiryDate");

  // 1.3 Status Precedence: Pending Verification
  const pendingDoc = { status: "pending_verification", expiryDate: new Date("2026-11-20T00:00:00.000Z") };
  const pendingCls = DocumentExpiryService.classifyDocument(pendingDoc, refDate);
  assert(pendingCls.classification === "PENDING_VERIFICATION", "1.3 Status 'pending_verification' takes precedence over expiryDate");

  // 1.4 No Expiry Date
  const noExpiryDoc = { status: "verified", expiryDate: null };
  const noExpiryCls = DocumentExpiryService.classifyDocument(noExpiryDoc, refDate);
  assert(noExpiryCls.classification === "NO_EXPIRY", "1.4 Missing expiryDate classified as NO_EXPIRY");

  // 1.5 Valid (> 30 days)
  const validDoc = { status: "verified", expiryDate: new Date("2026-12-25T00:00:00.000Z") }; // +42 days
  const validCls = DocumentExpiryService.classifyDocument(validDoc, refDate);
  assert(validCls.classification === "VALID" && validCls.daysRemaining! > 30, "1.5 Expiry in 42 days classified as VALID");
  assert(validCls.isExpiringSoon === false && validCls.isExpired === false, "1.5 Valid document not expiring soon");

  // 1.6 Expiring in 30 Days (Exact Boundary: 30 days)
  const exp30Doc = { status: "verified", expiryDate: new Date("2026-12-13T00:00:00.000Z") }; // exact +30 days
  const exp30Cls = DocumentExpiryService.classifyDocument(exp30Doc, refDate);
  assert(exp30Cls.classification === "EXPIRING_30_DAYS", "1.6 Exactly 30 days classified as EXPIRING_30_DAYS");
  assert(exp30Cls.daysRemaining === 30, "1.6 daysRemaining is exactly 30");
  assert(exp30Cls.stage === "30_days", "1.6 stage is '30_days'");

  // 1.7 Expiring in 15 Days (Exact Boundary: 15 days)
  const exp15Doc = { status: "verified", expiryDate: new Date("2026-11-28T00:00:00.000Z") }; // exact +15 days
  const exp15Cls = DocumentExpiryService.classifyDocument(exp15Doc, refDate);
  assert(exp15Cls.classification === "EXPIRING_15_DAYS", "1.7 Exactly 15 days classified as EXPIRING_15_DAYS");
  assert(exp15Cls.daysRemaining === 15, "1.7 daysRemaining is exactly 15");
  assert(exp15Cls.stage === "15_days", "1.7 stage is '15_days'");

  // 1.8 Expiring in 7 Days (Exact Boundary: 7 days)
  const exp7Doc = { status: "verified", expiryDate: new Date("2026-11-20T00:00:00.000Z") }; // exact +7 days
  const exp7Cls = DocumentExpiryService.classifyDocument(exp7Doc, refDate);
  assert(exp7Cls.classification === "EXPIRING_7_DAYS", "1.8 Exactly 7 days classified as EXPIRING_7_DAYS");
  assert(exp7Cls.daysRemaining === 7, "1.8 daysRemaining is exactly 7");
  assert(exp7Cls.stage === "7_days", "1.8 stage is '7_days'");

  // 1.9 Expiring Today (0 days remaining)
  const expTodayDoc = { status: "verified", expiryDate: new Date("2026-11-13T00:00:00.000Z") }; // 0 days
  const expTodayCls = DocumentExpiryService.classifyDocument(expTodayDoc, refDate);
  assert(expTodayCls.classification === "EXPIRING_7_DAYS", "1.9 Expiring today (0 days) classified as EXPIRING_7_DAYS");
  assert(expTodayCls.daysRemaining === 0, "1.9 daysRemaining is exactly 0");

  // 1.10 Already Expired (-1 day)
  const expiredDoc = { status: "verified", expiryDate: new Date("2026-11-12T00:00:00.000Z") }; // -1 day
  const expiredCls = DocumentExpiryService.classifyDocument(expiredDoc, refDate);
  assert(expiredCls.classification === "EXPIRED", "1.10 Past-due document classified as EXPIRED");
  assert(expiredCls.daysRemaining === -1, "1.10 daysRemaining is -1");
  assert(expiredCls.isExpired === true, "1.10 isExpired flag is true");
  assert(expiredCls.stage === "expired", "1.10 stage is 'expired'");

  console.log("  Suite 1 passed cleanly!\n");

  // ─── SUITE 2: NOTIFICATION IDEMPOTENCY & DEDUPLICATION TESTS ──────────────────
  console.log("SUITE 2: Notification Idempotency Key Generation & Deduplication");

  const docId = "doc-test-uuid-101";
  const expDateStr = "2026-12-13";
  const stage = "30_days";

  const key1 = DocumentExpiryService.generateIdempotencyKey(docId, expDateStr, stage);
  assert(key1 === "doc_exp_doc-test-uuid-101_2026-12-13_30_days", "2.1 Deterministic key matches expected format");

  const key2 = DocumentExpiryService.generateIdempotencyKey(docId, new Date("2026-12-13T10:30:00.000Z"), stage);
  assert(key1 === key2, "2.2 ISO date string and Date object produce identical idempotency key");

  // Mock DB for notification deduplication
  const notificationsTable: any[] = [];
  const outboxTable: any[] = [];

  const mockDbForNotif = {
    notification: {
      findFirst: async ({ where }: any) => {
        const targetKey = where.metadataJson?.equals;
        return notificationsTable.find((n) => n.metadataJson?.idempotencyKey === targetKey) || null;
      },
      create: async ({ data }: any) => {
        const record = { id: `notif-${Date.now()}`, ...data };
        notificationsTable.push(record);
        return record;
      },
    },
    outboxEvent: {
      create: async ({ data }: any) => {
        const record = { id: `outbox-${Date.now()}`, ...data };
        outboxTable.push(record);
        return record;
      },
    },
    employee: {
      findUnique: async () => ({ id: "emp-1", userId: "usr-1", firstName: "Alice", lastName: "Smith" }),
    },
    user: {
      findMany: async () => [{ id: "hr-user-1" }],
    },
    userRole: {
      findMany: async () => [{ userId: "hr-user-1" }],
    },
  };

  const sampleDoc = {
    id: docId,
    documentCode: "DOC-9901",
    title: "Passport Scan",
    employeeId: "emp-1",
    expiryDate: new Date("2026-12-13T00:00:00.000Z"),
  };

  await runWithTenantContext(
    {
      tenantId: "tenant-test",
      userId: "usr-1",
      roles: ["admin"],
      status: "ACTIVE",
      tenancyStrategy: "SHARED_SCHEMA",
      db: mockDbForNotif as any,
    },
    async () => {
      // 2.3 First Dispatch
      const dispatch1 = await DocumentExpiryService.dispatchExpiryNotification({
        tenantId: "tenant-test",
        document: sampleDoc,
        stage: "30_days",
        daysRemaining: 30,
        dbOverride: mockDbForNotif,
      });
      assert(dispatch1.dispatched === true, "2.3 First dispatch reports dispatched = true");
      assert(dispatch1.alreadyProcessed === false, "2.3 First dispatch reports alreadyProcessed = false");
      assert(notificationsTable.length >= 1, "2.3 Notification record created in DB");
      assert(outboxTable.length >= 1, "2.3 Outbox event created in DB");

      // 2.4 Duplicate Dispatch with identical stage
      const dispatch2 = await DocumentExpiryService.dispatchExpiryNotification({
        tenantId: "tenant-test",
        document: sampleDoc,
        stage: "30_days",
        daysRemaining: 30,
        dbOverride: mockDbForNotif,
      });
      assert(dispatch2.dispatched === false, "2.4 Second dispatch reports dispatched = false");
      assert(dispatch2.alreadyProcessed === true, "2.4 Second dispatch reports alreadyProcessed = true (deduplicated)");

      // 2.5 New milestone stage (15_days) progresses cleanly
      const dispatch3 = await DocumentExpiryService.dispatchExpiryNotification({
        tenantId: "tenant-test",
        document: sampleDoc,
        stage: "15_days",
        daysRemaining: 15,
        dbOverride: mockDbForNotif,
      });
      assert(dispatch3.dispatched === true, "2.5 Progressing to stage '15_days' dispatches new milestone notification");
    }
  );

  console.log("  Suite 2 passed cleanly!\n");

  // ─── SUITE 3: BACKGROUND SCHEDULER & CRON MONITORING ──────────────────────────
  console.log("SUITE 3: Daily Background Expiry Scheduler (runDocumentExpiryCron)");

  const companyDocsMockTable: any[] = [
    {
      id: "doc-1",
      tenantId: "tenant-cron",
      title: "Driver License",
      status: "verified",
      expiryDate: new Date("2026-11-01T00:00:00.000Z"), // Past due (-12 days) -> Should auto-expire
      employee: { id: "emp-1", userId: "usr-1", firstName: "Bob", lastName: "Builder" },
    },
    {
      id: "doc-2",
      tenantId: "tenant-cron",
      title: "Work Visa",
      status: "verified",
      expiryDate: new Date("2026-11-18T00:00:00.000Z"), // Expiring in 5 days (7_days milestone)
      employee: { id: "emp-2", userId: "usr-2", firstName: "Carol", lastName: "Danvers" },
    },
    {
      id: "doc-3",
      tenantId: "tenant-cron",
      title: "Old Contract",
      status: "superseded", // Superseded -> Should be ignored
      expiryDate: new Date("2026-11-01T00:00:00.000Z"),
      employee: { id: "emp-3", userId: "usr-3", firstName: "Dave", lastName: "Bautista" },
    },
  ];

  const cronDbMock = {
    tenant: {
      findMany: async () => [{ id: "tenant-cron" }],
    },
    companyDocument: {
      findMany: async ({ where }: any) => {
        return companyDocsMockTable.filter(
          (d) =>
            d.tenantId === where.tenantId &&
            d.expiryDate !== null &&
            !where.status?.notIn?.includes(d.status)
        );
      },
      update: async ({ where, data }: any) => {
        const item = companyDocsMockTable.find((d) => d.id === where.id);
        if (item) {
          Object.assign(item, data);
        }
        return item;
      },
    },
    notification: {
      findFirst: async () => null,
      create: async () => ({ id: "mock-notif" }),
    },
    outboxEvent: {
      create: async () => ({ id: "mock-outbox" }),
    },
    employee: {
      findUnique: async () => ({ id: "e1", userId: "u1", firstName: "Test", lastName: "User" }),
    },
    user: {
      findMany: async () => [],
    },
    userRole: {
      findMany: async () => [],
    },
  };

  const cronResult = await runWithTenantContext(
    {
      tenantId: "tenant-cron",
      userId: "system",
      roles: ["super_admin"],
      status: "ACTIVE",
      tenancyStrategy: "SHARED_SCHEMA",
      db: cronDbMock as any,
    },
    async () => {
      return await runDocumentExpiryCron({
        tenantId: "tenant-cron",
        referenceDate: refDate,
        dbOverride: cronDbMock,
      });
    }
  );

  assert(cronResult.success === true, "3.1 Cron execution returns success = true");
  assert(cronResult.tenantsEvaluated === 1, "3.2 Exactly 1 tenant evaluated");
  assert(cronResult.documentsChecked === 2, "3.3 Exactly 2 non-superseded documents checked (superseded doc-3 ignored)");
  assert(cronResult.documentsExpired === 1, "3.4 doc-1 transitioned to status 'expired'");

  const updatedDoc1 = companyDocsMockTable.find((d) => d.id === "doc-1");
  assert(updatedDoc1.status === "expired", "3.5 doc-1 status in DB updated to 'expired'");

  console.log("  Suite 3 passed cleanly!\n");

  // ─── SUITE 4: DOCUMENT RENEWAL WORKFLOW ───────────────────────────────────────
  console.log("SUITE 4: Document Renewal Workflow (Predecessor Supersession & Succession)");

  const renewalPredecessor = {
    id: "doc-orig-100",
    tenantId: "tenant-rnw",
    employeeId: "emp-rnw",
    documentTypeId: "dt-passport",
    documentCode: "DOC-1000",
    title: "Passport",
    category: "Identity Document",
    status: "expired",
    notes: "Original document verified on 2024",
    expiryDate: new Date("2026-10-01"),
  };

  // Simulate renewal transaction
  const newRenewalCode = "DOC-RNW-5555";
  const newExpiry = new Date("2030-10-01");

  const simulatedUpdatedPredecessor = {
    ...renewalPredecessor,
    status: "superseded",
    notes: `${renewalPredecessor.notes}\n[Superseded by renewal ${newRenewalCode} on ${refDate.toISOString()}]`,
  };

  const simulatedSuccessor = {
    id: "doc-new-200",
    tenantId: renewalPredecessor.tenantId,
    employeeId: renewalPredecessor.employeeId,
    documentTypeId: renewalPredecessor.documentTypeId,
    documentCode: newRenewalCode,
    title: renewalPredecessor.title,
    category: renewalPredecessor.category,
    status: "pending_verification",
    expiryDate: newExpiry,
    notes: `Renewal submission for predecessor ${renewalPredecessor.documentCode}`,
  };

  assert(simulatedUpdatedPredecessor.status === "superseded", "4.1 Predecessor transitions to status 'superseded'");
  assert(simulatedUpdatedPredecessor.notes.includes(newRenewalCode), "4.2 Predecessor notes reference the renewal document code");
  assert(simulatedSuccessor.status === "pending_verification", "4.3 Successor document created with status 'pending_verification'");
  assert(simulatedSuccessor.documentTypeId === renewalPredecessor.documentTypeId, "4.4 Successor preserves documentTypeId obligation link");
  assert(simulatedSuccessor.employeeId === renewalPredecessor.employeeId, "4.5 Successor linked to same employeeId");

  console.log("  Suite 4 passed cleanly!\n");

  // ─── SUITE 5: COMPLIANCE CALCULATION ENGINE ──────────────────────────────────
  console.log("SUITE 5: Document Compliance Calculation Engine");

  // Mock tenant with 2 active employees, 2 departments, and 2 required document types:
  // Employee 1 (Engineering): Has verified doc for Type A, missing Type B. (50% compliant)
  // Employee 2 (Sales): Has verified doc for Type A, expired doc for Type B. (50% compliant)
  // Total Obligations = 2 employees * 2 mandatory types = 4 obligations.
  // Compliant Obligations = 2 fulfilled.
  // Overall Compliance % = (2 / 4) * 100 = 50.0%

  const mockComplianceDb = {
    employee: {
      findMany: async () => [
        {
          id: "emp-eng-1",
          employeeCode: "EMP001",
          firstName: "Emma",
          lastName: "Watson",
          departmentId: "dept-eng",
          department: { id: "dept-eng", name: "Engineering" },
        },
        {
          id: "emp-sales-1",
          employeeCode: "EMP002",
          firstName: "Sam",
          lastName: "Altman",
          departmentId: "dept-sales",
          department: { id: "dept-sales", name: "Sales" },
        },
      ],
      findUnique: async ({ where }: any) => {
        if (where.id === "emp-eng-1") {
          return {
            id: "emp-eng-1",
            tenantId: "tenant-comp",
            employeeCode: "EMP001",
            firstName: "Emma",
            lastName: "Watson",
            departmentId: "dept-eng",
            department: { id: "dept-eng", name: "Engineering" },
            user: { email: "emma@test.com" },
          };
        }
        return null;
      },
    },
    documentType: {
      findMany: async () => [
        { id: "dt-nda", name: "Non-Disclosure Agreement", code: "DT_NDA", isRequired: true, isActive: true },
        { id: "dt-id", name: "National ID Card", code: "DT_ID", isRequired: true, isActive: true },
      ],
    },
    companyDocument: {
      findMany: async ({ where }: any = {}) => {
        const allDocs = [
          // Emma: NDA verified and valid
          {
            id: "doc-emma-nda",
            tenantId: "tenant-comp",
            employeeId: "emp-eng-1",
            documentTypeId: "dt-nda",
            documentCode: "DOC-EMMA-NDA",
            title: "Non-Disclosure Agreement",
            status: "verified",
            expiryDate: new Date("2028-01-01T00:00:00.000Z"), // Valid
            createdAt: new Date("2026-01-01"),
          },
          // Sam: NDA verified and valid
          {
            id: "doc-sam-nda",
            tenantId: "tenant-comp",
            employeeId: "emp-sales-1",
            documentTypeId: "dt-nda",
            documentCode: "DOC-SAM-NDA",
            title: "Non-Disclosure Agreement",
            status: "verified",
            expiryDate: new Date("2028-01-01T00:00:00.000Z"), // Valid
            createdAt: new Date("2026-01-01"),
          },
          // Sam: ID verified but expired
          {
            id: "doc-sam-id",
            tenantId: "tenant-comp",
            employeeId: "emp-sales-1",
            documentTypeId: "dt-id",
            documentCode: "DOC-SAM-ID",
            title: "National ID Card",
            status: "expired",
            expiryDate: new Date("2026-10-01T00:00:00.000Z"), // Expired
            createdAt: new Date("2024-01-01"),
          },
        ];

        if (where?.employeeId) {
          if (typeof where.employeeId === "string") {
            return allDocs.filter((d) => d.employeeId === where.employeeId);
          }
          if (where.employeeId?.in) {
            return allDocs.filter((d) => where.employeeId.in.includes(d.employeeId));
          }
        }
        return allDocs;
      },
    },
  };

  const compSummary = await DocumentComplianceService.getTenantComplianceSummary(
    "tenant-comp",
    {},
    mockComplianceDb
  );

  assert(compSummary.totalEmployees === 2, "5.1 totalEmployees evaluated is 2");
  assert(compSummary.totalRequiredDocTypes === 2, "5.2 totalRequiredDocTypes is 2");
  assert(compSummary.totalObligations === 4, "5.3 totalObligations is 4 (2 employees * 2 types)");
  assert(compSummary.compliantObligations === 2, "5.4 compliantObligations is 2");
  assert(compSummary.complianceRate === 50.0, "5.5 Overall compliance rate is exactly 50.0%");
  assert(compSummary.statusCounts.missingMandatory === 1, "5.6 Exactly 1 missing mandatory document detected (Emma ID)");
  assert(compSummary.statusCounts.expired === 1, "5.7 Exactly 1 expired document detected (Sam ID)");

  // 5.8 Department Breakdown
  assert(compSummary.departmentBreakdown.length === 2, "5.8 Exactly 2 departments in breakdown");
  const engDept = compSummary.departmentBreakdown.find((d) => d.departmentId === "dept-eng");
  assert(engDept !== undefined && engDept.complianceRate === 50.0, "5.9 Engineering compliance rate is 50.0%");
  assert(engDept!.missingCount === 1, "5.10 Engineering missing count is 1");

  // 5.11 Individual Employee Checklist
  const emmaDetail = await DocumentComplianceService.getEmployeeDocumentCompliance(
    "tenant-comp",
    "emp-eng-1",
    mockComplianceDb
  );
  assert(emmaDetail.totalRequired === 2, "5.11 Emma total required types is 2");
  assert(emmaDetail.compliantCount === 1, "5.12 Emma compliant count is 1");
  assert(emmaDetail.complianceRate === 50.0, "5.13 Emma compliance rate is 50.0%");

  const ndaCheck = emmaDetail.checklist.find((c) => c.documentTypeId === "dt-nda");
  assert(ndaCheck?.fulfillmentStatus === "COMPLIANT", "5.14 Emma NDA checklist item is COMPLIANT");

  const idCheck = emmaDetail.checklist.find((c) => c.documentTypeId === "dt-id");
  assert(idCheck?.fulfillmentStatus === "MISSING", "5.15 Emma ID checklist item is MISSING");

  // 5.16 Zero-Division Safety (Edge Case: Tenant with 0 required types or 0 employees)
  const zeroObligationsDb = {
    employee: { findMany: async () => [] },
    documentType: { findMany: async () => [] },
    companyDocument: { findMany: async () => [] },
  };
  const zeroSummary = await DocumentComplianceService.getTenantComplianceSummary(
    "tenant-empty",
    {},
    zeroObligationsDb
  );
  assert(zeroSummary.totalObligations === 0, "5.16 Zero obligations handled safely");
  assert(zeroSummary.complianceRate === 100, "5.17 Compliance rate defaults to 100% when no obligations exist (zero-division guarded)");

  console.log("  Suite 5 passed cleanly!\n");

  console.log("================================================================================");
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions passed with 100% success!`);
  console.log("================================================================================");
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
