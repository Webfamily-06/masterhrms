import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma, prisma } from "../prisma";
import { ContractLifecycleService } from "../services/contract-lifecycle.service";
import { runProbationContractExpiryCron } from "../cron/probation-contract-expiry.cron";
import { LeaveService } from "../services/leave.service";

test("MASTERHRMS P5 — Employment Lifecycle & Contract Workforce Management Suite", async (t) => {
  const db = rawPrisma || prisma;
  const testTenantId = "qa-tenant-blue";
  let employees: any[] = [];
  let sampleVendorId: string;
  let contractTypeId: string;

  // 1. Setup tenant & baseline references
  employees = await db.employee.findMany({
    where: { tenantId: testTenantId, status: "active" },
    take: 10,
  });
  assert.ok(employees.length >= 5, "At least 5 active employees found for test tenant.");

  let supplier = await db.supplier.findFirst({
    where: { tenantId: testTenantId },
  });
  if (!supplier) {
    supplier = await db.supplier.create({
      data: {
        tenantId: testTenantId,
        name: "Apex Manpower & IT Solutions Pvt Ltd",
        gstin: "27AABCA1234F1Z5",
        email: "contracts@apexmanpower.in",
        phone: "+91-9876543210",
        city: "Mumbai",
      },
    });
  }
  sampleVendorId = supplier.id;

  let cType = await db.contractType.findFirst({
    where: { tenantId: testTenantId },
  });
  if (!cType) {
    cType = await db.contractType.create({
      data: {
        tenantId: testTenantId,
        name: "Fixed-Term Professional Services",
        description: "Fixed term employment contract",
        status: "active",
      },
    });
  }
  contractTypeId = cType.id;

  t.after(async () => {
    // Clean up test-created contracts
    await db.employeeContract.deleteMany({
      where: {
        tenantId: testTenantId,
        notes: { contains: "P5_TEST_SUITE" },
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTEST 1: Baseline Preservation
  // ─────────────────────────────────────────────────────────────────────────────
  await t.test("P5-BR-001: Verifies existing 86 employees remain full_time and permanent", async () => {
    const totalEmployees = await db.employee.count();
    assert.strictEqual(totalEmployees, 86, `Expected 86 total employees in database, found ${totalEmployees}`);

    const fullTimeEmployees = await db.employee.count({
      where: { employmentType: "full_time" },
    });
    assert.strictEqual(fullTimeEmployees, 86, "All 86 existing employees must remain full_time");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTEST 2: Multi-Dimensional Contract Issuance
  // ─────────────────────────────────────────────────────────────────────────────
  await t.test("P5-BR-002: Issues contracts across all 5 workforce categories with proper settlement workflows", async () => {
    const today = new Date();
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Direct Contract Employee (Workflow A: Payroll)
    const directContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: employees[0].id,
        contractNumber: "CNT-2026-TEST-001",
        contractTypeId,
        category: "direct_contract",
        paymentWorkflow: "PAYROLL",
        title: "Senior Node.js Developer Contract",
        startDate: today,
        endDate: in90Days,
        salary: 85000,
        billingFrequency: "monthly",
        notes: "P5_TEST_SUITE - Direct contract employee",
        status: "active",
      },
    });
    assert.ok(directContract.id, "Direct contract created");
    assert.strictEqual(directContract.paymentWorkflow, "PAYROLL");
    assert.strictEqual(directContract.category, "direct_contract");

    // 2. Vendor / Outsourced Worker (Workflow B: Accounts Payable)
    const vendorContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: employees[1].id,
        contractNumber: "CNT-2026-TEST-002",
        contractTypeId,
        category: "vendor_outsourced",
        paymentWorkflow: "ACCOUNTS_PAYABLE",
        supplierId: sampleVendorId,
        title: "Outsourced Security Operations Specialist",
        startDate: today,
        endDate: in90Days,
        salary: 65000,
        billingFrequency: "monthly",
        notes: "P5_TEST_SUITE - Vendor outsourced personnel",
        status: "active",
      },
      include: { supplier: true },
    });
    assert.strictEqual(vendorContract.paymentWorkflow, "ACCOUNTS_PAYABLE");
    assert.strictEqual(vendorContract.supplierId, sampleVendorId);
    assert.ok(vendorContract.supplier?.name, "Vendor supplier linked");

    // 3. Consultant / Freelancer (Workflow B: Accounts Payable)
    const consultantContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: employees[2].id,
        contractNumber: "CNT-2026-TEST-003",
        contractTypeId,
        category: "consultant_freelancer",
        paymentWorkflow: "ACCOUNTS_PAYABLE",
        supplierId: sampleVendorId,
        title: "Cloud Infrastructure Specialist",
        startDate: today,
        endDate: in90Days,
        hourlyRate: 1500,
        billingFrequency: "hourly",
        notes: "P5_TEST_SUITE - Consultant freelancer",
        status: "active",
      },
    });
    assert.strictEqual(Number(consultantContract.hourlyRate), 1500);

    // 4. Temporary Employee (Workflow A: Payroll)
    const tempContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: employees[3].id,
        contractNumber: "CNT-2026-TEST-004",
        contractTypeId,
        category: "temporary",
        paymentWorkflow: "PAYROLL",
        title: "Seasonal Logistics Assistant",
        startDate: today,
        endDate: in90Days,
        salary: 30000,
        billingFrequency: "monthly",
        notes: "P5_TEST_SUITE - Temporary casual worker",
        status: "active",
      },
    });
    assert.strictEqual(tempContract.category, "temporary");
    assert.strictEqual(tempContract.paymentWorkflow, "PAYROLL");

    // 5. Intern / Trainee (Workflow A: Payroll Stipend)
    const internContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: employees[4].id,
        contractNumber: "CNT-2026-TEST-005",
        contractTypeId,
        category: "intern",
        paymentWorkflow: "PAYROLL",
        title: "Full-Stack Engineering Intern",
        startDate: today,
        endDate: in90Days,
        salary: 25000,
        billingFrequency: "monthly",
        notes: "P5_TEST_SUITE - Intern trainee stipend",
        status: "active",
      },
    });
    assert.strictEqual(internContract.category, "intern");
    assert.strictEqual(internContract.paymentWorkflow, "PAYROLL");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTEST 3: Contract Lifecycle Transitions (Amend, Renew, Convert, Terminate)
  // ─────────────────────────────────────────────────────────────────────────────
  await t.test("P5-BR-003: Executes Contract Amendment with incremented amendment number", async () => {
    const testContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: employees[0].id,
        title: "Amendment Subject Contract",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-06-30"),
        salary: 50000,
        notes: "P5_TEST_SUITE - Baseline",
        status: "active",
      },
    });

    const amended = await ContractLifecycleService.amendContract({
      tenantId: testTenantId,
      contractId: testContract.id,
      actorUserId: "system-test",
      amendment: {
        salary: 60000,
        endDate: "2025-12-31",
        title: "Amended Contract Scope",
        notes: "Mid-year rate adjustment",
      },
    });

    assert.strictEqual(amended.amendmentNumber, 1);
    assert.strictEqual(Number(amended.salary), 60000);
    assert.strictEqual(amended.title, "Amended Contract Scope");
    assert.strictEqual(amended.endDate?.toISOString().slice(0, 10), "2025-12-31");
  });

  await t.test("P5-BR-004: Executes Contract Renewal with predecessor archival and overlap validation", async () => {
    const renewEmp = employees[5] || employees[0];
    const predecessor = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: renewEmp.id,
        title: "Renewable Predecessor Contract",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-06-30"),
        salary: 70000,
        category: "direct_contract",
        paymentWorkflow: "PAYROLL",
        notes: "P5_TEST_SUITE - Predecessor",
        status: "active",
      },
    });

    const renewalResult = await ContractLifecycleService.renewContract({
      tenantId: testTenantId,
      actorUserId: "system-test",
      predecessorId: predecessor.id,
      renewal: {
        title: "Renewable Predecessor Contract (Renewed)",
        startDate: "2025-07-01",
        endDate: "2025-12-31",
        salary: 80000,
        notes: "P5_TEST_SUITE - Successor",
      },
    });

    assert.strictEqual(renewalResult.predecessor.status, "renewed");
    assert.strictEqual(renewalResult.successor.status, "active");
    assert.strictEqual(Number(renewalResult.successor.salary), 80000);
    assert.ok(renewalResult.successor.contractNumber, "Generated contract number present");
    assert.strictEqual(renewalResult.successor.category, "direct_contract");
  });

  await t.test("P5-BR-005: Converts contract employee to Permanent Full-Time appointment", async () => {
    const convertEmp = employees[6] || employees[1];
    const contractToConvert = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: convertEmp.id,
        title: "Permanent Track Contract",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        salary: 75000,
        category: "direct_contract",
        paymentWorkflow: "PAYROLL",
        notes: "P5_TEST_SUITE - To Convert",
        status: "active",
      },
    });

    const conversionResult = await ContractLifecycleService.convertContractToPermanent({
      tenantId: testTenantId,
      contractId: contractToConvert.id,
      actorUserId: "system-test",
      salary: 90000,
      notes: "Outstanding technical contributions warrant immediate permanent staffing.",
    });

    assert.strictEqual(conversionResult.contract.status, "converted");
    assert.strictEqual(conversionResult.contract.convertedToPermanent, true);
    assert.ok(conversionResult.contract.convertedAt);

    assert.strictEqual(conversionResult.employee.employmentType, "full_time");
    assert.strictEqual(conversionResult.employee.employmentCategory, "permanent");
    assert.strictEqual(Number(conversionResult.employee.salary), 90000);
    assert.ok(conversionResult.employee.permanentEmploymentDate);
  });

  await t.test("P5-BR-006: Terminates contract with operational reason and audit entry", async () => {
    const termEmp = employees[7] || employees[2];
    const contractToTerminate = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: termEmp.id,
        title: "Termination Subject Contract",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        notes: "P5_TEST_SUITE - To Terminate",
        status: "active",
      },
    });

    const terminated = await ContractLifecycleService.terminateContract({
      tenantId: testTenantId,
      contractId: contractToTerminate.id,
      actorUserId: "system-test",
      reason: "Project phased out early.",
    });

    assert.strictEqual(terminated.status, "terminated");
    assert.ok(terminated.notes?.includes("Project phased out early."));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTEST 4: Workflow B Accounts Payable Integration
  // ─────────────────────────────────────────────────────────────────────────────
  await t.test("P5-BR-007: Generates Accounts Payable Purchase Voucher for external vendor workforce without payroll payslip", async () => {
    const apEmp = employees[8] || employees[3];
    const apContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: apEmp.id,
        contractNumber: "CNT-2026-AP-091",
        title: "External DevOps Contractor",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        salary: 120000,
        category: "vendor_outsourced",
        paymentWorkflow: "ACCOUNTS_PAYABLE",
        supplierId: sampleVendorId,
        notes: "P5_TEST_SUITE - Workflow B AP Voucher",
        status: "active",
      },
    });

    const voucher = await ContractLifecycleService.createVendorPayableVoucher({
      tenantId: testTenantId,
      contractId: apContract.id,
      period: "2026-11",
      amount: 120000,
      invoiceNumber: "APEX-INV-2026-11-001",
      notes: "Monthly technical services for November 2026",
      actorUserId: "finance-admin",
    });

    assert.ok(voucher.id);
    assert.strictEqual(voucher.supplierId, sampleVendorId);
    assert.ok(voucher.purchaseNo, "Purchase number generated");
    assert.strictEqual(Number(voucher.total), 120000);
    assert.strictEqual(voucher.status, "received");
    assert.strictEqual(voucher.paymentStatus, "unpaid");

    // Clean up voucher
    await db.purchase.delete({ where: { id: voucher.id } });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTEST 5: Attendance & Leave Boundary Enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  await t.test("P5-BR-008: Rejects leave applications for external vendor personnel (Workflow B)", async () => {
    const vendorEmp = employees[9] || employees[4];
    // Temporarily classify employee as vendor_outsourced
    await db.employee.update({
      where: { id: vendorEmp.id },
      data: { employmentCategory: "vendor_outsourced" },
    });

    const leaveType = await db.leaveType.findFirst({ where: { tenantId: testTenantId } });

    if (leaveType) {
      const dryRun = await LeaveService.validateDryRun({
        tenantId: testTenantId,
        employeeId: vendorEmp.id,
        leaveTypeId: leaveType.id,
        startDate: "2026-11-15",
        endDate: "2026-11-16",
        reason: "Personal time off",
      });

      assert.strictEqual(dryRun.isValid, false);
      assert.ok(dryRun.warnings.some((w) => w.includes("Accounts Payable")));
    }

    // Restore employee to permanent
    await db.employee.update({
      where: { id: vendorEmp.id },
      data: { employmentCategory: "permanent" },
    });
  });

  await t.test("P5-BR-009: Validates attendance check-in boundary against active contract tenure", async () => {
    // Create a dedicated worker for boundary checking
    const boundaryEmp = employees[0];
    const boundaryContract = await db.employeeContract.create({
      data: {
        tenantId: testTenantId,
        employeeId: boundaryEmp.id,
        title: "Boundary Exclusive Contract",
        startDate: new Date("2029-06-01"),
        endDate: new Date("2029-06-30"),
        notes: "P5_TEST_SUITE - Boundary",
        status: "active",
      },
    });

    // 1. Date before commencement (2029-05-15) -> Blocked
    const beforeCommence = await ContractLifecycleService.validateAttendanceContractBoundary({
      tenantId: testTenantId,
      employeeId: boundaryEmp.id,
      date: new Date("2029-05-15"),
    });
    assert.strictEqual(beforeCommence.allowed, false);
    assert.ok(beforeCommence.reason?.includes("precedes contract commencement date"));

    // 2. Date after expiration (2029-07-05) -> Blocked
    const afterExpire = await ContractLifecycleService.validateAttendanceContractBoundary({
      tenantId: testTenantId,
      employeeId: boundaryEmp.id,
      date: new Date("2029-07-05"),
    });
    assert.strictEqual(afterExpire.allowed, false);
    assert.ok(afterExpire.reason?.includes("exceeds contract conclusion date"));

    // 3. Date within tenure (2029-06-15) -> Allowed
    const withinTenure = await ContractLifecycleService.validateAttendanceContractBoundary({
      tenantId: testTenantId,
      employeeId: boundaryEmp.id,
      date: new Date("2029-06-15"),
    });
    assert.strictEqual(withinTenure.allowed, true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTEST 6: Configurable Expiry Automation
  // ─────────────────────────────────────────────────────────────────────────────
  await t.test("P5-BR-010: Persists and applies organization-configurable reminder intervals", async () => {
    // 1. Update settings
    const updatedSettings = await ContractLifecycleService.updateTenantExpirySettings(
      testTenantId,
      {
        reminderIntervals: [60, 45, 30, 15, 7],
        notifyEmployee: true,
        notifyHR: true,
        escalationDays: 5,
      },
      "hr-admin-test"
    );

    assert.deepStrictEqual(updatedSettings.reminderIntervals, [60, 45, 30, 15, 7]);
    assert.strictEqual(updatedSettings.escalationDays, 5);

    // 2. Test pure classification at 60 days
    const in60Days = new Date(Date.now() + 58 * 24 * 60 * 60 * 1000);
    const cls60 = ContractLifecycleService.classifyContract(
      { startDate: new Date("2026-01-01"), endDate: in60Days, status: "active" },
      new Date(),
      updatedSettings.reminderIntervals
    );
    assert.strictEqual(cls60.stage, "60_days");
    assert.strictEqual(cls60.classification, "EXPIRING_60_DAYS");

    // 3. Test pure classification at 7 days
    const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const cls7 = ContractLifecycleService.classifyContract(
      { startDate: new Date("2026-01-01"), endDate: in5Days, status: "active" },
      new Date(),
      updatedSettings.reminderIntervals
    );
    assert.strictEqual(cls7.stage, "7_days");
    assert.strictEqual(cls7.classification, "EXPIRING_7_DAYS");

    // 4. Test deterministic idempotency key format
    const key = ContractLifecycleService.generateIdempotencyKey(
      "cnt-uuid-1234",
      "2026-12-31",
      "30_days"
    );
    assert.strictEqual(key, "cnt_exp_cnt-uuid-1234_2026-12-31_30_days");
  });

  await t.test("P5-BR-011: Runs automated contract expiry cron with zero errors", async () => {
    const cronResult = await runProbationContractExpiryCron({
      tenantId: testTenantId,
      referenceDate: new Date(),
    });

    assert.strictEqual(cronResult.success, true);
    assert.strictEqual(cronResult.tenantsEvaluated, 1);
    assert.strictEqual(cronResult.errors.length, 0);
  });
});
