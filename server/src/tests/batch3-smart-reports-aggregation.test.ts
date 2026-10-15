import { PrismaClient } from "@prisma/client";
import { generateToken } from "../lib/jwt";
import { SmartReportsService } from "../services/smart-reports.service";

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000/api";

let passedCount = 0;
let failedCount = 0;

function assertTest(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passedCount++;
    console.log(`  ✔ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✖ FAIL: ${testName}`, details ? details : "");
  }
}

async function runBatch3SmartReportsTests() {
  console.log("================================================================================");
  console.log("MASTERHRMS BATCH 3A: SMART REPORTS & ANALYTICS DATABASE AGGREGATION AUDIT");
  console.log("Scope: Database-backed aggregation, Zero-Mock removal, RBAC, Multi-Tenant & CSV");
  console.log("================================================================================\n");

  const tenantAId = "tenant-default-001";
  const zeroTenantId = `tenant-zero-${Date.now()}`;
  const tenantBId = `tenant-iso-${Date.now()}`;

  // Cleanup tracking arrays
  const createdRecordIds = {
    attendances: [] as string[],
    payslips: [] as string[],
    payrollRuns: [] as string[],
    leaveRequests: [] as string[],
    leaveTypes: [] as string[],
    sales: [] as string[],
    customers: [] as string[],
    purchases: [] as string[],
    suppliers: [] as string[],
    deals: [] as string[],
    products: [] as string[],
    productWarehouses: [] as string[],
    warehouses: [] as string[],
    projects: [] as string[],
    projectTasks: [] as string[],
    tenants: [] as string[],
    users: [] as string[],
    modules: [] as string[],
    employees: [] as string[],
  };

  try {
    // -------------------------------------------------------------------------
    // Setup Test Tenants and Tokens
    // -------------------------------------------------------------------------
    console.log("--- SETUP: Provisioning Test Tenants and Authenticated Users ---");

    // Baseline historical payroll check
    const baselinePayrollRuns = await prisma.payrollRun.count({ where: { status: "completed" } });
    const baselinePublishedPayslips = await prisma.payslip.count({ where: { isPublished: true } });
    console.log(`  Initial state: ${baselinePayrollRuns} completed payroll runs, ${baselinePublishedPayslips} published payslips.`);

    // 1. Create Zero-Record Tenant with smart-reports enabled
    await prisma.tenant.create({
      data: {
        id: zeroTenantId,
        name: "Zero Records Corp",
        slug: `zero-${Date.now()}`,
      },
    });
    createdRecordIds.tenants.push(zeroTenantId);

    const zeroModule = await prisma.tenantModule.create({
      data: {
        tenantId: zeroTenantId,
        moduleKey: "smart-reports",
        isEnabled: true,
      },
    });
    createdRecordIds.modules.push(zeroModule.id);

    // Create authenticated user for Zero Tenant
    const zeroUser = await prisma.user.create({
      data: {
        id: `u-zero-${Date.now()}`,
        email: `zero-${Date.now()}@zero.local`,
        passwordHash: "hash123",
        profile: {
          create: {
            tenantId: zeroTenantId,
            fullName: "Zero Admin",
          },
        },
        roles: {
          create: [{ role: "super_admin", tenantId: zeroTenantId }],
        },
      },
    });
    createdRecordIds.users.push(zeroUser.id);

    const zeroTenantAdminToken = generateToken({
      userId: zeroUser.id,
      email: zeroUser.email,
      tenantId: zeroTenantId,
      roles: ["super_admin"],
    });

    // 2. Create Isolated Tenant B for cross-tenant testing
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Tenant B Isolation Corp",
        slug: `tenant-b-${Date.now()}`,
      },
    });
    createdRecordIds.tenants.push(tenantBId);

    const bModule = await prisma.tenantModule.create({
      data: {
        tenantId: tenantBId,
        moduleKey: "smart-reports",
        isEnabled: true,
      },
    });
    createdRecordIds.modules.push(bModule.id);

    // Create authenticated user for Tenant B
    const tenantBUser = await prisma.user.create({
      data: {
        id: `u-b-${Date.now()}`,
        email: `b-${Date.now()}@b.local`,
        passwordHash: "hash123",
        profile: {
          create: {
            tenantId: tenantBId,
            fullName: "Tenant B Admin",
          },
        },
        roles: {
          create: [{ role: "super_admin", tenantId: tenantBId }],
        },
      },
    });
    createdRecordIds.users.push(tenantBUser.id);

    const tenantBAdminToken = generateToken({
      userId: tenantBUser.id,
      email: tenantBUser.email,
      tenantId: tenantBId,
      roles: ["super_admin"],
    });

    // 3. Create Super Admin and Manager under Tenant A
    const tenantAAdmin = await prisma.user.create({
      data: {
        id: `u-admin-a-${Date.now()}`,
        email: `admin-a-${Date.now()}@hrms.local`,
        passwordHash: "hash123",
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Tenant A Super Admin",
          },
        },
        roles: {
          create: [{ role: "super_admin", tenantId: tenantAId }],
        },
      },
    });
    createdRecordIds.users.push(tenantAAdmin.id);

    const superAdminToken = generateToken({
      userId: tenantAAdmin.id,
      email: tenantAAdmin.email,
      tenantId: tenantAId,
      roles: ["super_admin"],
    });

    const tenantAManager = await prisma.user.create({
      data: {
        id: `u-mgr-a-${Date.now()}`,
        email: `mgr-a-${Date.now()}@hrms.local`,
        passwordHash: "hash123",
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Tenant A Manager",
          },
        },
        roles: {
          create: [{ role: "manager", tenantId: tenantAId }],
        },
      },
    });
    createdRecordIds.users.push(tenantAManager.id);

    const managerToken = generateToken({
      userId: tenantAManager.id,
      email: tenantAManager.email,
      tenantId: tenantAId,
      roles: ["manager"],
    });

    // Use existing verified users for HR Admin and Employee in Tenant A
    const hrUser = await prisma.user.findFirst({
      where: { email: "hr@masterhrms.com" },
      include: { profile: true, roles: true },
    });
    const empUser = await prisma.user.findFirst({
      where: { email: "employee@masterhrms.com" },
      include: { profile: true, roles: true },
    });

    if (!hrUser || !empUser) {
      throw new Error("Baseline HR and Employee test users not found in database.");
    }

    const hrAdminToken = generateToken({
      userId: hrUser.id,
      email: hrUser.email,
      tenantId: tenantAId,
      roles: hrUser.roles.map((r) => r.role),
    });

    const employeeToken = generateToken({
      userId: empUser.id,
      email: empUser.email,
      tenantId: tenantAId,
      roles: empUser.roles.map((r) => r.role),
    });

    // =========================================================================
    // TEST GROUP 1: Zero-Record Tenants Produce Genuine Zero / Empty Results
    // =========================================================================
    console.log("\n--- TEST GROUP 1: Zero-Record Tenants Produce Genuine Zero / Empty Results ---");

    const reports = [
      "attendance-summary",
      "payroll-sheet",
      "leave-report",
      "sales-invoice",
      "purchase-invoice",
      "deal-pipeline",
      "product-stock",
      "project-progress",
    ];

    for (const repId of reports) {
      const res = await fetch(`${API_BASE}/smart-reports/${repId}`, {
        headers: { Authorization: `Bearer ${zeroTenantAdminToken}` },
      });
      assertTest(res.status === 200, `GET /smart-reports/${repId} on empty tenant returns 200 OK`);
      const json = await res.json();
      assertTest(json.success === true, `Report ${repId} response has success: true`);
      assertTest(Array.isArray(json.data?.records), `Report ${repId} records is an array`);
      assertTest(json.data?.records.length === 0, `Report ${repId} has 0 records on empty tenant`);

      // Check metrics are genuine zero values, not mock template values (e.g. not 493125.87, not 18)
      const metrics = json.data?.metrics || {};
      const metricValues = Object.values(metrics);
      const hasMockValue = metricValues.some(
        (val) => val === 493125.87 || val === 350000 || val === 18 || val === "493,126"
      );
      assertTest(!hasMockValue, `Report ${repId} has NO synthetic fallback mock constants`);
    }

    // Check catalogue overview on zero tenant
    const catRes = await fetch(`${API_BASE}/smart-reports/catalogue`, {
      headers: { Authorization: `Bearer ${zeroTenantAdminToken}` },
    });
    assertTest(catRes.status === 200, "GET /smart-reports/catalogue on empty tenant returns 200 OK");
    const catJson = await catRes.json();
    assertTest(catJson.success === true, "Catalogue response success is true");
    assertTest(Array.isArray(catJson.data) && catJson.data.length === 8, "Catalogue lists 8 available reports");
    const attRep = catJson.data.find((r: any) => r.id === "attendance-summary");
    const payRep = catJson.data.find((r: any) => r.id === "payroll-sheet");
    assertTest(attRep && attRep.count === 0, "Catalogue attendance-summary count is 0 on empty tenant");
    assertTest(payRep && payRep.count === 0, "Catalogue payroll-sheet count is 0 on empty tenant");

    // =========================================================================
    // TEST GROUP 2: Persisted Records Aggregation Accuracy
    // =========================================================================
    console.log("\n--- TEST GROUP 2: Persisted Database Records Aggregation Accuracy ---");

    // Setup an employee in tenantA for real records
    const testEmployee = await prisma.employee.create({
      data: {
        tenantId: tenantAId,
        firstName: "Report",
        lastName: "Tester",
        email: `test-rep-${Date.now()}@hrms.local`,
        employeeCode: `EMP-REP-${Date.now()}`,
        status: "active",
      },
    });
    createdRecordIds.employees.push(testEmployee.id);

    // 1. Persist Attendance
    const today = new Date();
    const att1 = await prisma.attendance.create({
      data: {
        tenantId: tenantAId,
        employeeId: testEmployee.id,
        date: today,
        status: "present",
        hours: 8,
        overtimeMinutes: 60,
      },
    });
    const att2 = await prisma.attendance.create({
      data: {
        tenantId: tenantAId,
        employeeId: testEmployee.id,
        date: new Date(today.getTime() - 86400000),
        status: "present",
        hours: 8,
        overtimeMinutes: 0,
      },
    });
    const att3 = await prisma.attendance.create({
      data: {
        tenantId: tenantAId,
        employeeId: testEmployee.id,
        date: new Date(today.getTime() - 86400000 * 2),
        status: "late",
        hours: 6,
        overtimeMinutes: 0,
      },
    });
    createdRecordIds.attendances.push(att1.id, att2.id, att3.id);

    // 2. Persist Leave Request
    const leaveType = await prisma.leaveType.create({
      data: {
        tenantId: tenantAId,
        name: `Privilege Leave-${Date.now()}`,
        code: `PL-${Date.now()}`,
        daysPerYear: 20,
      },
    });
    createdRecordIds.leaveTypes.push(leaveType.id);

    const leave1 = await prisma.leaveRequest.create({
      data: {
        tenantId: tenantAId,
        employeeId: testEmployee.id,
        leaveTypeId: leaveType.id,
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-05"),
        days: 5,
        status: "approved",
      },
    });
    const leave2 = await prisma.leaveRequest.create({
      data: {
        tenantId: tenantAId,
        employeeId: testEmployee.id,
        leaveTypeId: leaveType.id,
        startDate: new Date("2026-10-10"),
        endDate: new Date("2026-10-12"),
        days: 3,
        status: "pending",
      },
    });
    createdRecordIds.leaveRequests.push(leave1.id, leave2.id);

    // 3. Persist Payroll Run & Payslip (draft mode for testing reports)
    const testPayrollRun = await prisma.payrollRun.create({
      data: {
        tenantId: tenantAId,
        periodMonth: 10,
        periodYear: 2026,
        status: "draft",
        totalAmount: 80000,
        totalNet: 72000,
        totalDeductions: 8000,
      },
    });
    createdRecordIds.payrollRuns.push(testPayrollRun.id);

    const testPayslip = await prisma.payslip.create({
      data: {
        tenantId: tenantAId,
        payrollRunId: testPayrollRun.id,
        employeeId: testEmployee.id,
        periodMonth: 10,
        periodYear: 2026,
        grossSalary: 80000,
        deductions: 8000,
        netSalary: 72000,
        status: "draft",
        isPublished: false,
      },
    });
    createdRecordIds.payslips.push(testPayslip.id);

    // 4. Persist Sales Invoice
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenantAId,
        name: "Acme Global Dynamics",
        email: `acme-${Date.now()}@test.com`,
      },
    });
    createdRecordIds.customers.push(customer.id);

    const saleInvoice = await prisma.sale.create({
      data: {
        tenantId: tenantAId,
        customerId: customer.id,
        invoiceNo: `INV-${Date.now()}`,
        date: new Date(),
        subtotal: 50000,
        total: 50000,
        paidAmount: 30000,
        paymentStatus: "partial",
      },
    });
    createdRecordIds.sales.push(saleInvoice.id);

    // 5. Persist Purchase Invoice
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: tenantAId,
        name: "Prime Hardware Supplies",
        email: `prime-${Date.now()}@test.com`,
      },
    });
    createdRecordIds.suppliers.push(supplier.id);

    const purchaseInvoice = await prisma.purchase.create({
      data: {
        tenantId: tenantAId,
        supplierId: supplier.id,
        purchaseNo: `PO-${Date.now()}`,
        date: new Date(),
        total: 40000,
        paidAmount: 25000,
        paymentStatus: "partial",
      },
    });
    createdRecordIds.purchases.push(purchaseInvoice.id);

    // 6. Persist CRM Deal
    const deal = await prisma.crmDeal.create({
      data: {
        tenantId: tenantAId,
        name: "Enterprise Cloud Migration Deal",
        customer: "Acme Global Dynamics",
        value: 100000,
        stage: "proposal",
        probability: 60,
      },
    });
    createdRecordIds.deals.push(deal.id);

    // 7. Persist Product & Warehouse Stock
    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId: tenantAId,
        name: "Central Logistics Hub",
        location: "Main Depot",
      },
    });
    createdRecordIds.warehouses.push(warehouse.id);

    const product = await prisma.product.create({
      data: {
        tenantId: tenantAId,
        name: "Enterprise Core Router X5",
        sku: `SKU-${Date.now()}`,
        barcode: `BC-${Date.now()}`,
        purchasePrice: 1500,
        salePrice: 2200,
        type: "standard",
        isActive: true,
      },
    });
    createdRecordIds.products.push(product.id);

    const pw = await prisma.productWarehouse.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 10,
      },
    });
    createdRecordIds.productWarehouses.push(pw.id);

    // 8. Persist Project
    const project = await prisma.project.create({
      data: {
        tenantId: tenantAId,
        name: "NextGen HRMS Rollout",
        budget: 150000,
        progress: 45,
        status: "in_progress",
      },
    });
    createdRecordIds.projects.push(project.id);

    // Now verify live database aggregations via API
    // A. Attendance Summary
    const attRes = await fetch(`${API_BASE}/smart-reports/attendance-summary?employeeId=${testEmployee.id}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(attRes.status === 200, "GET /attendance-summary for test employee returns 200 OK");
    const attData = (await attRes.json()).data;
    assertTest(Number(attData.metrics.workingHours) === 22, "Attendance workingHours correctly aggregates to 22 hrs (8+8+6)");
    assertTest(Number(attData.metrics.overtimeHours) === 1, "Attendance overtimeHours correctly aggregates to 1 hr (60 mins)");
    assertTest(attData.records.length === 3, "Attendance records count is 3");

    // B. Payroll Sheet
    const payRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet?payrollRunId=${testPayrollRun.id}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(payRes.status === 200, "GET /payroll-sheet returns 200 OK for Super Admin");
    const payData = (await payRes.json()).data;
    assertTest(Number(payData.metrics.grossPay) === 80000, "Payroll grossPay aggregates accurately to 80,000");
    assertTest(Number(payData.metrics.totalDeductions) === 8000, "Payroll deductions aggregate accurately to 8,000");
    assertTest(Number(payData.metrics.netPay) === 72000, "Payroll netPay aggregates accurately to 72,000");

    // C. Leave Report
    const leaveRes = await fetch(`${API_BASE}/smart-reports/leave-report`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(leaveRes.status === 200, "GET /leave-report returns 200 OK");
    const leaveData = (await leaveRes.json()).data;
    assertTest(Number(leaveData.metrics.approvedDays) >= 5, "Leave approvedDays reflects persisted approved leave (>= 5)");
    assertTest(Number(leaveData.metrics.pendingRequests) >= 1, "Leave pendingRequests reflects persisted pending request (>= 1)");

    // D. Sales Invoice
    const salesRes = await fetch(`${API_BASE}/smart-reports/sales-invoice`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(salesRes.status === 200, "GET /sales-invoice returns 200 OK for Super Admin");
    const salesData = (await salesRes.json()).data;
    assertTest(Number(salesData.metrics.totalSales) >= 50000, "Sales totalSales aggregates >= 50,000");
    assertTest(Number(salesData.metrics.totalReceivables) >= 20000, "Sales totalReceivables reflects persisted dueAmount >= 20,000");

    // E. Purchase Invoice
    const purRes = await fetch(`${API_BASE}/smart-reports/purchase-invoice`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(purRes.status === 200, "GET /purchase-invoice returns 200 OK for Super Admin");
    const purData = (await purRes.json()).data;
    assertTest(Number(purData.metrics.totalPurchases) >= 40000, "Purchase totalPurchases aggregates >= 40,000");
    assertTest(Number(purData.metrics.totalPayables) >= 15000, "Purchase totalPayables reflects persisted dueAmount >= 15,000");

    // F. Deal Pipeline
    const dealRes = await fetch(`${API_BASE}/smart-reports/deal-pipeline`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(dealRes.status === 200, "GET /deal-pipeline returns 200 OK");
    const dealData = (await dealRes.json()).data;
    assertTest(Number(dealData.metrics.totalPipeline) >= 100000, "Pipeline value aggregates >= 100,000");
    assertTest(Number(dealData.metrics.weightedForecast) >= 60000, "Weighted forecast computes accurately (100000 * 60% = 60,000)");

    // G. Product Stock
    const stockRes = await fetch(`${API_BASE}/smart-reports/product-stock`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(stockRes.status === 200, "GET /product-stock returns 200 OK");
    const stockData = (await stockRes.json()).data;
    assertTest(Number(stockData.metrics.totalStockUnits) >= 10, "Total stock units reflects persisted quantity (>= 10)");
    assertTest(Number(stockData.metrics.totalStockValue) >= 15000, "Total stock value reflects 10 * 1500 = 15,000");

    // H. Project Progress
    const projRes = await fetch(`${API_BASE}/smart-reports/project-progress`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(projRes.status === 200, "GET /project-progress returns 200 OK");
    const projData = (await projRes.json()).data;
    assertTest(Number(projData.metrics.totalBudget) >= 150000, "Project budget aggregates >= 150,000");

    // =========================================================================
    // TEST GROUP 3: Filters and Period Boundaries
    // =========================================================================
    console.log("\n--- TEST GROUP 3: Filters and Period Boundaries ---");

    // Test payroll sheet with periodYear = 2025 (where no runs exist)
    const pastYearRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet?periodYear=2025`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(pastYearRes.status === 200, "GET /payroll-sheet?periodYear=2025 returns 200 OK");
    const pastYearData = (await pastYearRes.json()).data;
    assertTest(pastYearData.records.length === 0, "Year boundary 2025 returns 0 records");
    assertTest(Number(pastYearData.metrics.grossPay) === 0, "Year boundary 2025 returns 0 grossPay");

    // Test attendance with date filter outside range
    const pastDateRes = await fetch(`${API_BASE}/smart-reports/attendance-summary?startDate=2020-01-01&endDate=2020-01-02`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(pastDateRes.status === 200, "GET /attendance-summary with historical date range returns 200 OK");
    const pastDateData = (await pastDateRes.json()).data;
    assertTest(pastDateData.records.length === 0, "Historical date range returns 0 records");

    // =========================================================================
    // TEST GROUP 4: Missing or Malformed Parameters Handled Gracefully
    // =========================================================================
    console.log("\n--- TEST GROUP 4: Missing or Malformed Parameters Handled Gracefully ---");

    const malformedRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet?periodMonth=999&periodYear=invalid`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(malformedRes.status === 200, "Malformed query params return 200 OK without crashing");
    const malformedData = (await malformedRes.json()).data;
    assertTest(Number(malformedData.metrics.grossPay) === 0, "Malformed query results in genuine 0 grossPay, no fallback mock");
    assertTest(malformedData.records.length === 0, "Malformed query results in empty records array");

    // =========================================================================
    // TEST GROUP 5: Unauthenticated Requests Fail Closed
    // =========================================================================
    console.log("\n--- TEST GROUP 5: Unauthenticated Requests Fail Closed ---");

    const noAuthRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet`);
    assertTest(noAuthRes.status === 401, "Missing Authorization header fails closed with 401 Unauthorized");

    const fakeTokenRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet`, {
      headers: { Authorization: "Bearer forged-token-xyz" },
    });
    assertTest(fakeTokenRes.status === 401, "Forged JWT token fails closed with 401 Unauthorized");

    // =========================================================================
    // TEST GROUP 6: Least-Privilege Role Authorization Denial
    // =========================================================================
    console.log("\n--- TEST GROUP 6: Least-Privilege Role Authorization Denial ---");

    // 1. Regular employee denied from payroll-sheet
    const empPayRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assertTest(empPayRes.status === 403, "Regular employee denied from /payroll-sheet with 403 Forbidden");

    // 2. Regular employee denied from sales-invoice
    const empSalesRes = await fetch(`${API_BASE}/smart-reports/sales-invoice`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assertTest(empSalesRes.status === 403, "Regular employee denied from /sales-invoice with 403 Forbidden");

    // 3. Regular employee denied from export
    const empExportRes = await fetch(`${API_BASE}/smart-reports/export/payroll-sheet`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assertTest(empExportRes.status === 403, "Regular employee denied from /export/payroll-sheet with 403 Forbidden");

    // 4. HR Admin allowed on payroll, attendance, leave
    const hrPayRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet`, {
      headers: { Authorization: `Bearer ${hrAdminToken}` },
    });
    assertTest(hrPayRes.status === 200, "HR Admin permitted on /payroll-sheet with 200 OK");

    const hrAttRes = await fetch(`${API_BASE}/smart-reports/attendance-summary`, {
      headers: { Authorization: `Bearer ${hrAdminToken}` },
    });
    assertTest(hrAttRes.status === 200, "HR Admin permitted on /attendance-summary with 200 OK");

    // 5. HR Admin denied from finance reports (sales-invoice and purchase-invoice)
    const hrSalesRes = await fetch(`${API_BASE}/smart-reports/sales-invoice`, {
      headers: { Authorization: `Bearer ${hrAdminToken}` },
    });
    assertTest(hrSalesRes.status === 403, "HR Admin denied from /sales-invoice with 403 Forbidden");

    const hrPurRes = await fetch(`${API_BASE}/smart-reports/purchase-invoice`, {
      headers: { Authorization: `Bearer ${hrAdminToken}` },
    });
    assertTest(hrPurRes.status === 403, "HR Admin denied from /purchase-invoice with 403 Forbidden");

    // 6. Manager permitted on operational/sales reports (deals, stock, projects)
    const mgrDealRes = await fetch(`${API_BASE}/smart-reports/deal-pipeline`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assertTest(mgrDealRes.status === 200, "Manager permitted on /deal-pipeline with 200 OK");

    const mgrStockRes = await fetch(`${API_BASE}/smart-reports/product-stock`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assertTest(mgrStockRes.status === 200, "Manager permitted on /product-stock with 200 OK");

    // 7. Manager denied from payroll and finance
    const mgrPayRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assertTest(mgrPayRes.status === 403, "Manager denied from /payroll-sheet with 403 Forbidden");

    const mgrSalesRes = await fetch(`${API_BASE}/smart-reports/sales-invoice`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assertTest(mgrSalesRes.status === 403, "Manager denied from /sales-invoice with 403 Forbidden");

    // 8. Super Admin permitted on all endpoints
    const superPayRes = await fetch(`${API_BASE}/smart-reports/payroll-sheet`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(superPayRes.status === 200, "Super Admin permitted on /payroll-sheet with 200 OK");

    const superSalesRes = await fetch(`${API_BASE}/smart-reports/sales-invoice`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(superSalesRes.status === 200, "Super Admin permitted on /sales-invoice with 200 OK");

    // =========================================================================
    // TEST GROUP 7: Cross-Tenant Data Isolation
    // =========================================================================
    console.log("\n--- TEST GROUP 7: Cross-Tenant Data Isolation ---");

    // Tenant B queries attendance
    const bAttRes = await fetch(`${API_BASE}/smart-reports/attendance-summary`, {
      headers: { Authorization: `Bearer ${tenantBAdminToken}` },
    });
    assertTest(bAttRes.status === 200, "Tenant B queries /attendance-summary with 200 OK");
    const bAttData = (await bAttRes.json()).data;
    assertTest(bAttData.records.length === 0, "Tenant B sees 0 attendance records from Tenant A");
    assertTest(Number(bAttData.metrics.workingHours) === 0, "Tenant B workingHours aggregate is strictly 0");

    // Tenant B queries sales invoices
    const bSalesRes = await fetch(`${API_BASE}/smart-reports/sales-invoice`, {
      headers: { Authorization: `Bearer ${tenantBAdminToken}` },
    });
    assertTest(bSalesRes.status === 200, "Tenant B queries /sales-invoice with 200 OK");
    const bSalesData = (await bSalesRes.json()).data;
    assertTest(bSalesData.records.length === 0, "Tenant B sees 0 sales records from Tenant A");
    assertTest(Number(bSalesData.metrics.totalSales) === 0, "Tenant B totalSales is 0 (no leakage of Tenant A's 50,000 invoice)");

    // Tenant B queries catalogue
    const bCatRes = await fetch(`${API_BASE}/smart-reports/catalogue`, {
      headers: { Authorization: `Bearer ${tenantBAdminToken}` },
    });
    assertTest(bCatRes.status === 200, "Tenant B queries /catalogue with 200 OK");
    const bCatData = (await bCatRes.json()).data;
    assertTest(Array.isArray(bCatData) && bCatData.length === 8, "Tenant B catalogue lists 8 reports");
    const bAttRep = bCatData.find((r: any) => r.id === "attendance-summary");
    assertTest(bAttRep && bAttRep.count === 0, "Tenant B catalogue attendance count is strictly 0");

    // =========================================================================
    // TEST GROUP 8: CSV and JSON Exports & Formula Injection Mitigation
    // =========================================================================
    console.log("\n--- TEST GROUP 8: CSV & JSON Exports & Formula Injection Mitigation ---");

    // 1. JSON Export
    const jsonExpRes = await fetch(`${API_BASE}/smart-reports/export/payroll-sheet?format=json`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(jsonExpRes.status === 200, "GET /export/payroll-sheet?format=json returns 200 OK");
    assertTest(jsonExpRes.headers.get("content-type")?.includes("application/json") || false, "JSON export content-type is application/json");
    const jsonExpBody = await jsonExpRes.json();
    assertTest(jsonExpBody.metrics !== undefined, "JSON export contains metrics object");

    // 2. CSV Export
    const csvExpRes = await fetch(`${API_BASE}/smart-reports/export/payroll-sheet?format=csv`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(csvExpRes.status === 200, "GET /export/payroll-sheet?format=csv returns 200 OK");
    assertTest(csvExpRes.headers.get("content-type")?.includes("text/csv") || false, "CSV export content-type is text/csv");
    const csvText = await csvExpRes.text();
    assertTest(csvText.includes("grossPay"), "CSV text contains header 'grossPay'");
    assertTest(csvText.includes("netPay"), "CSV text contains header 'netPay'");

    // 3. Formula Injection Neutralization Test
    const formulaPayloads = [
      "=cmd|' /C calc'!A0",
      "+SUM(A1:A10)",
      "-2+3*[calc]",
      "@import('evil.com')",
    ];

    for (const payload of formulaPayloads) {
      const sanitized = SmartReportsService.sanitizeCsvValue(payload);
      assertTest(
        sanitized.startsWith("'"),
        `Formula payload '${payload}' is escaped with leading single quote: '${sanitized}'`
      );
    }

    // =========================================================================
    // TEST GROUP 9: Statutory Payroll Immutability Guard
    // =========================================================================
    console.log("\n--- TEST GROUP 9: Statutory Payroll Immutability Guard ---");

    const postPayrollRuns = await prisma.payrollRun.count({ where: { status: "completed" } });
    const postPublishedPayslips = await prisma.payslip.count({ where: { isPublished: true } });

    assertTest(
      postPayrollRuns === baselinePayrollRuns,
      `Completed payroll runs unchanged (Baseline: ${baselinePayrollRuns}, Post-test: ${postPayrollRuns})`
    );
    assertTest(
      postPublishedPayslips === baselinePublishedPayslips,
      `Published payslips count unchanged (Baseline: ${baselinePublishedPayslips}, Post-test: ${postPublishedPayslips})`
    );

    // =========================================================================
    // TEST GROUP 10: Dynamic Alias Route Compatibility
    // =========================================================================
    console.log("\n--- TEST GROUP 10: Dynamic Alias Route Compatibility (/report/:reportId) ---");

    const aliasRes = await fetch(`${API_BASE}/smart-reports/report/deal-pipeline`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(aliasRes.status === 200, "GET /smart-reports/report/deal-pipeline returns 200 OK via alias");
    const aliasJson = await aliasRes.json();
    assertTest(aliasJson.success === true, "Alias response success is true");
    assertTest(aliasJson.data?.metrics?.totalPipeline !== undefined, "Alias response contains live metrics");

    const unknownAliasRes = await fetch(`${API_BASE}/smart-reports/report/unknown-report-xyz`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assertTest(unknownAliasRes.status === 404, "Unknown report alias returns 404 Not Found");

    // Clean up created records
    console.log("\n--- CLEANUP: Removing Created Test Records ---");
    await prisma.productWarehouse.deleteMany({ where: { id: { in: createdRecordIds.productWarehouses } } });
    await prisma.product.deleteMany({ where: { id: { in: createdRecordIds.products } } });
    await prisma.warehouse.deleteMany({ where: { id: { in: createdRecordIds.warehouses } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdRecordIds.projectTasks } } });
    await prisma.project.deleteMany({ where: { id: { in: createdRecordIds.projects } } });
    await prisma.crmDeal.deleteMany({ where: { id: { in: createdRecordIds.deals } } });
    await prisma.sale.deleteMany({ where: { id: { in: createdRecordIds.sales } } });
    await prisma.customer.deleteMany({ where: { id: { in: createdRecordIds.customers } } });
    await prisma.purchase.deleteMany({ where: { id: { in: createdRecordIds.purchases } } });
    await prisma.supplier.deleteMany({ where: { id: { in: createdRecordIds.suppliers } } });
    await prisma.payslip.deleteMany({ where: { id: { in: createdRecordIds.payslips } } });
    await prisma.payrollRun.deleteMany({ where: { id: { in: createdRecordIds.payrollRuns } } });
    await prisma.attendance.deleteMany({ where: { id: { in: createdRecordIds.attendances } } });
    await prisma.leaveRequest.deleteMany({ where: { id: { in: createdRecordIds.leaveRequests } } });
    await prisma.leaveType.deleteMany({ where: { id: { in: createdRecordIds.leaveTypes } } });
    await prisma.employee.deleteMany({ where: { id: { in: createdRecordIds.employees } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: createdRecordIds.users } } });
    await prisma.profile.deleteMany({ where: { userId: { in: createdRecordIds.users } } });
    await prisma.user.deleteMany({ where: { id: { in: createdRecordIds.users } } });
    await prisma.tenantModule.deleteMany({ where: { id: { in: createdRecordIds.modules } } });
    await prisma.tenant.deleteMany({ where: { id: { in: createdRecordIds.tenants } } });
    console.log("  ✔ All created test records cleanly removed.");

  } catch (error: any) {
    console.error("  ✖ BATCH 3A TEST RUNNER EXCEPTION:", error);
    failedCount++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`BATCH 3A SMART REPORTS TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBatch3SmartReportsTests();
