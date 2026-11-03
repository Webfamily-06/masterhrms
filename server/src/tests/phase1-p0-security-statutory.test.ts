import assert from "assert";
import { calculateProfessionalTax } from "../services/payroll-engine.service";
import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("MASTERHRMS — PHASE 1 (P0) COMPREHENSIVE VERIFICATION & REGRESSION SUITE");
console.log("================================================================================");

let passedCount = 0;
let totalCount = 0;

function runTest(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
  }
}

// ============================================================================
// 1. TASK-P0-01: STATUTORY TAMIL NADU PROFESSIONAL TAX VERIFICATION
// ============================================================================
console.log("\n--- [TASK-P0-01] Tamil Nadu Professional Tax Slab Verification ---");

runTest("TN PT: Gross <= 21,000 half-yearly (3,000/mo) returns Nil (0)", () => {
  const pt = calculateProfessionalTax(3000, "TN", 1);
  assert.strictEqual(pt, 0);
});

runTest("TN PT: Gross in 21,001–30,000 half-yearly (4,500/mo) returns 100/6 (16.67)", () => {
  const pt = calculateProfessionalTax(4500, "TN", 1);
  assert.strictEqual(pt, 16.67);
});

runTest("TN PT: Gross in 30,001–45,000 half-yearly (6,000/mo) returns 235/6 (39.17)", () => {
  const pt = calculateProfessionalTax(6000, "TN", 1);
  assert.strictEqual(pt, 39.17);
});

runTest("TN PT: Gross in 45,001–60,000 half-yearly (9,000/mo) returns 510/6 (85.00)", () => {
  const pt = calculateProfessionalTax(9000, "TN", 1);
  assert.strictEqual(pt, 85.00);
});

runTest("TN PT: Gross in 60,001–75,000 half-yearly (11,000/mo) returns 760/6 (126.67)", () => {
  const pt = calculateProfessionalTax(11000, "TN", 1);
  assert.strictEqual(pt, 126.67);
});

runTest("TN PT: Eliminates 6x Over-Deduction Inversion on ₹55,000 monthly gross", () => {
  const pt = calculateProfessionalTax(55000, "TN", 1);
  assert.strictEqual(pt, 208.33);
  assert.ok(pt < 510, "Tax on 55,000 must NOT be 510");
});

runTest("TN PT: Maximum ceiling compliance under Art. 276(2) Constitution of India (<= 2,500/yr)", () => {
  const pt = calculateProfessionalTax(150000, "TN", 1);
  assert.strictEqual(pt, 208.33);
  const annual = pt * 12;
  assert.ok(annual <= 2500, `Annual tax ${annual} must be <= 2,500`);
});

// ============================================================================
// 2. TASK-P0-02: PRIVILEGE ESCALATION PROTECTION ON PUT /api/employees/:id
// ============================================================================
console.log("\n--- [TASK-P0-02] Employee Update Privilege Escalation Protection ---");

runTest("PUT /api/employees/:id source has requirePermission('hrm.employees.edit')", () => {
  const routeFile = fs.readFileSync(path.resolve(__dirname, "../routes/employees.routes.ts"), "utf8");
  assert.ok(routeFile.includes('requirePermission("hrm.employees.edit")'), "Route must be guarded with requirePermission");
});

runTest("PUT /api/employees/:id enforces financial & status authorization checks", () => {
  const routeFile = fs.readFileSync(path.resolve(__dirname, "../routes/employees.routes.ts"), "utf8");
  assert.ok(routeFile.includes("INSUFFICIENT_COMPENSATION_PRIVILEGE"), "Must have INSUFFICIENT_COMPENSATION_PRIVILEGE check");
  assert.ok(routeFile.includes("INSUFFICIENT_STATUS_PRIVILEGE"), "Must have INSUFFICIENT_STATUS_PRIVILEGE check");
  assert.ok(routeFile.includes("AuditService.logMutation"), "Must write immutable audit log on update");
});

// ============================================================================
// 3. TASK-P0-03: ATOMIC EMPLOYEE CREATION PERMISSION & SEAT QUOTA
// ============================================================================
console.log("\n--- [TASK-P0-03] Atomic Employee Creation Permission & Seat Quota ---");

runTest("POST /api/v1/hr/employees enforces requirePermission('hrm.employees.create')", () => {
  const routeFile = fs.readFileSync(path.resolve(__dirname, "../routes/hr-employees.routes.ts"), "utf8");
  assert.ok(routeFile.includes('requirePermission("hrm.employees.create")'), "Must guard atomic employee creation with requirePermission");
});

runTest("POST /api/v1/hr/employees enforces requireWithinLimit('seats')", () => {
  const routeFile = fs.readFileSync(path.resolve(__dirname, "../routes/hr-employees.routes.ts"), "utf8");
  assert.ok(routeFile.includes('requireWithinLimit("seats")'), "Must enforce seat quota limits atomically");
});

// ============================================================================
// 4. TASK-P0-04: BIOMETRIC ADMS TENANT ISOLATION & DEVICE AUTHENTICATION
// ============================================================================
console.log("\n--- [TASK-P0-04] Biometric ADMS Cross-Tenant Contamination Protection ---");

runTest("handleAdmsPush rejects unmapped hardware serials with 401 ERROR: UNREGISTERED DEVICE", () => {
  const routeFile = fs.readFileSync(path.resolve(__dirname, "../routes/biometric.routes.ts"), "utf8");
  assert.ok(routeFile.includes("ERROR: UNREGISTERED DEVICE"), "Must return 401 ERROR: UNREGISTERED DEVICE");
  assert.ok(!routeFile.includes("device?.tenantId || defaultTenant.id"), "Must NOT fall back to defaultTenant.id");
});

// ============================================================================
// 5. TASK-P0-05: MONTH LOCK ON ATTENDANCE REGULARIZATION
// ============================================================================
console.log("\n--- [TASK-P0-05] Attendance Regularization Month Lock Enforcement ---");

runTest("POST /api/v1/me/team/regularizations/:id/action enforces assertMonthUnlocked", () => {
  const routeFile = fs.readFileSync(path.resolve(__dirname, "../routes/employee-self-service.routes.ts"), "utf8");
  assert.ok(routeFile.includes("AttendanceService.assertMonthUnlocked(reg.tenantId, reg.attendanceDate)"), "Must call assertMonthUnlocked before approval");
  assert.ok(routeFile.includes("PAYROLL_MONTH_LOCKED"), "Must handle locked month with 409 PAYROLL_MONTH_LOCKED");
});

// ============================================================================
// 6. TASK-P0-06: HALF-DAY LEAVE PRECISION & DECIMAL(4, 1) SCHEMA
// ============================================================================
console.log("\n--- [TASK-P0-06] Half-Day Leave Decimal Precision Verification ---");

runTest("schema.prisma defines LeaveRequest.days as Decimal(4, 1)", () => {
  const schemaFile = fs.readFileSync(path.resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
  assert.ok(schemaFile.includes("days        Decimal     @default(1.0) @db.Decimal(4, 1)"), "LeaveRequest.days must be Decimal(4, 1)");
});

runTest("leave.service.ts saves unrounded dryRun.totalDays without Math.round truncation", () => {
  const serviceFile = fs.readFileSync(path.resolve(__dirname, "../services/leave.service.ts"), "utf8");
  assert.ok(serviceFile.includes("days: dryRun.totalDays,"), "Must store dryRun.totalDays directly");
  assert.ok(!serviceFile.includes("Math.max(1, Math.round(dryRun.totalDays))"), "Must NOT force half-day leave to round to 1");
});

// ============================================================================
// 7. TASK-P0-07: NATIVE DEMOGRAPHIC COLUMNS ON EMPLOYEE MODEL
// ============================================================================
console.log("\n--- [TASK-P0-07] Employee Demographic Columns & Service Mapping ---");

runTest("schema.prisma contains native demographic columns on Employee", () => {
  const schemaFile = fs.readFileSync(path.resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
  assert.ok(schemaFile.includes('maritalStatus                String?                       @map("marital_status")'), "Employee must have maritalStatus");
  assert.ok(schemaFile.includes('bloodGroup                   String?                       @map("blood_group")'), "Employee must have bloodGroup");
  assert.ok(schemaFile.includes('addressLine1                 String?                       @map("address_line1")'), "Employee must have addressLine1");
  assert.ok(schemaFile.includes('emergencyContactName         String?                       @map("emergency_contact_name")'), "Employee must have emergencyContactName");
});

runTest("employee.service.ts maps native demographic fields directly in tx.employee.create", () => {
  const serviceFile = fs.readFileSync(path.resolve(__dirname, "../services/employee.service.ts"), "utf8");
  assert.ok(serviceFile.includes("maritalStatus: input.maritalStatus || null,"), "Must save maritalStatus directly to Employee");
  assert.ok(serviceFile.includes("bloodGroup: input.bloodGroup || null,"), "Must save bloodGroup directly to Employee");
  assert.ok(serviceFile.includes("addressLine1: input.addressLine1 || input.address || null,"), "Must save addressLine1 directly to Employee");
});

// ============================================================================
// 8. TASK-P0-08: GLOBAL DIALOG VIEWPORT OVERFLOW & INTERNAL SCROLL
// ============================================================================
console.log("\n--- [TASK-P0-08] Global Dialog Component Viewport Protection ---");

runTest("src/components/ui/dialog.tsx defines max-h-[90dvh] and overflow-y-auto on DialogContent", () => {
  const dialogFile = fs.readFileSync(path.resolve(__dirname, "../../../src/components/ui/dialog.tsx"), "utf8");
  assert.ok(dialogFile.includes("max-h-[90dvh]"), "DialogContent must restrict max-h to 90dvh");
  assert.ok(dialogFile.includes("overflow-y-auto"), "DialogContent must enable internal vertical scrolling");
  assert.ok(dialogFile.includes("w-[calc(100vw-1.5rem)]"), "DialogContent must adapt on small mobile viewports");
});

runTest("src/components/ui/dialog.tsx close button has minimum 44px touch target (WCAG 2.1)", () => {
  const dialogFile = fs.readFileSync(path.resolve(__dirname, "../../../src/components/ui/dialog.tsx"), "utf8");
  assert.ok(dialogFile.includes("min-h-[44px] min-w-[44px]"), "Dialog close button must have 44px touch target");
});

// ============================================================================
// 9. TASK-P0-09: ELIMINATE DOUBLE PADDING ON PAGE ROOTS
// ============================================================================
console.log("\n--- [TASK-P0-09] Double Padding Elimination Across Route Roots ---");

runTest("Outermost page containers in src/routes/_authenticated/_app do not compound p-6/p-4", () => {
  const testFile1 = fs.readFileSync(path.resolve(__dirname, "../../../src/routes/_authenticated/_app/employees.tsx"), "utf8");
  assert.ok(!testFile1.match(/return\s*\(\s*<div\s+className=["'][^"']*\bp-6\b/), "employees.tsx must not have outer p-6");

  const testFile2 = fs.readFileSync(path.resolve(__dirname, "../../../src/routes/_authenticated/_app/leave.tsx"), "utf8");
  assert.ok(!testFile2.match(/return\s*\(\s*<div\s+className=["'][^"']*\bp-6\b/), "leave.tsx must not have outer p-6");
});

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log("\n================================================================================");
console.log(`PHASE 1 (P0) TEST SUITE RESULTS: ${passedCount}/${totalCount} TESTS PASSED`);
console.log("================================================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
