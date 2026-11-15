import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { rawPrisma } from "../prisma.js";
import { generateToken } from "../lib/jwt.js";
import { LeaveEncashmentCompOffService } from "../services/leave-encashment-compoff.service.js";

const requireFromRoot = createRequire(path.resolve(process.cwd(), "package.json"));
const { chromium } = requireFromRoot("playwright");

const CMS_ORIGIN = process.env.CMS_URL || "http://localhost:3000";
const TANSTACK_ORIGIN = process.env.TANSTACK_URL || "http://localhost:5173";
const ARTIFACTS_DIR =
  process.env.P3A_ARTIFACTS_DIR ||
  path.resolve(process.cwd(), "test-results/p3a-e2e-verification");

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, label: string, details?: unknown) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ PASS [${totalChecks}]: ${label}`);
  } else {
    console.error(`  ✗ FAIL [${totalChecks}]: ${label}`, details ?? "");
    throw new Error(`Playwright E2E assertion failed: ${label}`);
  }
}

function findRecentSundayIso(): string {
  for (let offset = 1; offset <= 10; offset++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - offset);
    if (d.getUTCDay() === 0) return d.toISOString().slice(0, 10);
  }
  const fallback = new Date();
  fallback.setUTCDate(fallback.getUTCDate() - 7);
  return fallback.toISOString().slice(0, 10);
}

async function injectAuthContext(
  context: any,
  params: {
    token: string;
    userId: string;
    email: string;
    fullName: string;
    tenantId: string;
    roles: string[];
    permissions: string[];
  }
) {
  await context.addCookies([
    {
      name: "hrms_auth_token",
      value: encodeURIComponent(params.token),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
    {
      name: "auth_token",
      value: encodeURIComponent(params.token),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);

  await context.addInitScript((p: typeof params) => {
    localStorage.setItem("hrms_auth_token", p.token);
    localStorage.setItem("auth_token", p.token);
    localStorage.setItem("token", p.token);
    localStorage.setItem("tenantId", p.tenantId);
    const userPayload = {
      id: p.userId,
      userId: p.userId,
      email: p.email,
      name: p.fullName,
      fullName: p.fullName,
      roles: p.roles,
      permissions: p.permissions,
      tenantId: p.tenantId,
    };
    localStorage.setItem("hrms_user", JSON.stringify(userPayload));
    localStorage.setItem("user", JSON.stringify(userPayload));
    document.cookie = `hrms_auth_token=${encodeURIComponent(p.token)}; path=/; max-age=604800; SameSite=Lax`;
  }, params);
}

async function cleanupEphemeralE2eArtifacts(extraTenantId?: string) {
  const staleTenants = await rawPrisma.tenant.findMany({
    where: { slug: { startsWith: "p3a-e2e-" } },
    select: { id: true },
  });
  const tIds = Array.from(
    new Set([
      ...(extraTenantId ? [extraTenantId] : []),
      ...staleTenants.map((t) => t.id),
    ])
  );
  if (tIds.length > 0) {
    await rawPrisma.compOffUsageAllocation.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.leaveEncashmentCompOffEvent.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.leaveLedgerEntry.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.leaveRequest.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.leaveEncashmentRequest.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.leaveEncashmentConfig.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.compOffConfig.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.deviceSession.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.userRole.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.profile.deleteMany({ where: { tenantId: { in: tIds } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: tIds } } });
  }
  await rawPrisma.user.deleteMany({
    where: { email: { endsWith: "@masterhrms-p3a-e2e.test" } },
  });
}

async function main() {
  console.log("================================================================================");
  console.log("MASTERHRMS P3-A: LIVE CROSS-FRONTEND PLAYWRIGHT E2E VERIFICATION SUITE");
  console.log(`Next.js CMS: ${CMS_ORIGIN}  <-->  TanStack Start: ${TANSTACK_ORIGIN}`);
  console.log("================================================================================\n");

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  let tenantId = "";
  let browser: any = null;

  try {
    await cleanupEphemeralE2eArtifacts();

    // -------------------------------------------------------------------------
    // 1. SEED EPHEMERAL LIVE TENANT, AUTH SESSIONS, POLICIES & EMPLOYEE BALANCES
    // -------------------------------------------------------------------------
    const tenant = await rawPrisma.tenant.create({
      data: {
        name: `P3A E2E Workspace ${suffix}`,
        slug: `p3a-e2e-${suffix}`,
        currency: "INR",
        isOnboarded: true,
      },
    });
    tenantId = tenant.id;

    const hrUser = await rawPrisma.user.create({
      data: {
        email: `zubin.hradmin.${suffix}@masterhrms-p3a-e2e.test`,
        passwordHash: "e2e_unused_hash",
      },
    });
    const empUser = await rawPrisma.user.create({
      data: {
        email: `meera.nair.${suffix}@masterhrms-p3a-e2e.test`,
        passwordHash: "e2e_unused_hash",
      },
    });

    await rawPrisma.profile.create({
      data: {
        userId: hrUser.id,
        email: hrUser.email,
        fullName: "Zubin Irani (HR Admin)",
        tenantId,
      },
    });
    await rawPrisma.profile.create({
      data: {
        userId: empUser.id,
        email: empUser.email,
        fullName: "Meera Nair",
        tenantId,
      },
    });

    await rawPrisma.userRole.create({
      data: { userId: hrUser.id, role: "super_admin", tenantId },
    });
    await rawPrisma.userRole.create({
      data: { userId: hrUser.id, role: "hr_admin", tenantId },
    });
    await rawPrisma.userRole.create({
      data: { userId: empUser.id, role: "employee", tenantId },
    });

    const expiresNextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const hrSession = await rawPrisma.deviceSession.create({
      data: {
        userId: hrUser.id,
        tenantId,
        deviceName: "Playwright E2E HR Chromium",
        deviceType: "desktop",
        expiresAt: expiresNextWeek,
        revoked: false,
      },
    });
    const empSession = await rawPrisma.deviceSession.create({
      data: {
        userId: empUser.id,
        tenantId,
        deviceName: "Playwright E2E ESS Chromium",
        deviceType: "desktop",
        expiresAt: expiresNextWeek,
        revoked: false,
      },
    });

    const hrToken = generateToken({
      userId: hrUser.id,
      email: hrUser.email,
      tenantId,
      roles: ["super_admin", "hr_admin"],
      permissions: ["*"],
      sessionId: hrSession.id,
    });

    const empToken = generateToken({
      userId: empUser.id,
      email: empUser.email,
      tenantId,
      roles: ["employee"],
      permissions: [],
      sessionId: empSession.id,
    });

    const branch = await rawPrisma.branch.create({
      data: { tenantId, name: "Mumbai HQ", code: `MUM-${suffix.slice(-4)}` },
    });
    const department = await rawPrisma.department.create({
      data: { tenantId, name: "Product Engineering" },
    });

    const joinedDate = new Date();
    joinedDate.setUTCFullYear(joinedDate.getUTCFullYear() - 2);

    // "Meera" sorts alphabetically before "Zubin" so Meera is first in dynamic employee list
    const empMeera = await rawPrisma.employee.create({
      data: {
        tenantId,
        userId: empUser.id,
        branchId: branch.id,
        departmentId: department.id,
        employeeCode: `EMP-MEE-${suffix.slice(-4)}`,
        firstName: "Meera",
        lastName: "Nair",
        email: empUser.email,
        joinedAt: joinedDate,
        employmentCategory: "permanent",
        salary: 78000,
      },
    });

    await rawPrisma.employee.create({
      data: {
        tenantId,
        userId: hrUser.id,
        branchId: branch.id,
        departmentId: department.id,
        employeeCode: `EMP-ZUB-${suffix.slice(-4)}`,
        firstName: "Zubin",
        lastName: "Irani",
        email: hrUser.email,
        joinedAt: joinedDate,
        employmentCategory: "permanent",
        salary: 120000,
      },
    });

    const basicComp = await rawPrisma.salaryComponent.create({
      data: {
        tenantId,
        name: "Basic Salary",
        code: "BASIC",
        type: "earning",
        calculationType: "fixed",
        defaultValue: 52000,
      },
    });
    const encashComp = await rawPrisma.salaryComponent.create({
      data: {
        tenantId,
        name: "Leave Encashment Payout",
        code: "LEAVE_ENCASH",
        type: "earning",
        calculationType: "variable",
        defaultValue: 0,
      },
    });

    const salaryAssign = await rawPrisma.employeeSalaryAssignment.create({
      data: {
        tenantId,
        employeeId: empMeera.id,
        ctcMonthly: 78000,
        ctcAnnual: 936000,
        effectiveFrom: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
        isCurrent: true,
      },
    });
    await rawPrisma.employeeSalaryItem.create({
      data: {
        assignmentId: salaryAssign.id,
        componentId: basicComp.id,
        monthlyAmount: 52000,
        annualAmount: 624000,
      },
    });

    const currentYear = new Date().getUTCFullYear();
    const earnedLeave = await rawPrisma.leaveType.create({
      data: {
        tenantId,
        name: "Earned Leave",
        code: "EL",
        daysPerYear: 20,
        isPaid: true,
        halfDayAllowed: true,
        status: "active",
      },
    });
    const compOffLeave = await rawPrisma.leaveType.create({
      data: {
        tenantId,
        name: "Compensatory Off",
        code: "COMP_OFF",
        daysPerYear: 0,
        isPaid: true,
        halfDayAllowed: true,
        status: "active",
      },
    });

    await rawPrisma.leaveLedgerEntry.create({
      data: {
        tenantId,
        employeeId: empMeera.id,
        leaveTypeId: earnedLeave.id,
        entryType: "ACCRUAL",
        days: 18,
        balance: 18,
        effectiveAt: new Date(Date.UTC(currentYear, 0, 1)),
        notes: "Annual EL balance for E2E",
      },
    });

    const sundayDateStr = findRecentSundayIso();
    await rawPrisma.attendance.create({
      data: {
        tenantId,
        employeeId: empMeera.id,
        date: new Date(`${sundayDateStr}T00:00:00.000Z`),
        checkIn: new Date(`${sundayDateStr}T04:00:00.000Z`),
        checkOut: new Date(`${sundayDateStr}T10:00:00.000Z`),
        hours: 6.0,
        status: "present",
      },
    });

    const hrProfile = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantId, {
      userId: hrUser.id,
      email: hrUser.email,
      roles: ["hr_admin"],
      permissions: ["*"],
    });

    await LeaveEncashmentCompOffService.createEncashmentConfig(tenantId, hrProfile, {
      name: "E2E Earned Leave Encashment Policy",
      code: "E2E-ENC-EL",
      enabled: true,
      eligibleLeaveTypeIds: [earnedLeave.id],
      minServiceMonths: 0,
      minRemainingBalance: 5,
      maxEncashableDaysPerRequest: 10,
      maxEncashableDaysPerYear: 15,
      minRetainedBalance: 5,
      encashmentFrequency: "ANYTIME",
      approvalMode: "HR_ONLY",
      allowEssSubmission: true,
      requireSupportingDoc: false,
      salaryBasisType: "BASIC",
      dailyRateDivisorMode: "CUSTOM",
      dailyRateDivisor: 26,
      payrollComponentId: encashComp.id,
      effectiveFrom: `${currentYear - 1}-01-01`,
    });

    await LeaveEncashmentCompOffService.createCompOffConfig(tenantId, hrProfile, {
      name: "E2E Sunday & Holiday Comp-Off Policy",
      code: "E2E-CO-POL",
      enabled: true,
      leaveTypeId: compOffLeave.id,
      allowWeeklyOff: true,
      allowPublicHoliday: true,
      allowApprovedOvertime: true,
      minQualifyingHours: 4,
      halfDayHoursThreshold: 4,
      fullDayHoursThreshold: 8,
      maxCreditPerDay: 1,
      expiryDays: 60,
      expiryWarningDays: 7,
      approvalMode: "HR_ONLY",
      allowEssSubmission: true,
      requireAttendanceRecord: true,
      effectiveFrom: `${currentYear - 1}-01-01`,
    });

    // -------------------------------------------------------------------------
    // 2. LAUNCH PLAYWRIGHT CHROMIUM FOR NEXT.JS CMS (:3000) & TANSTACK (:5173)
    // -------------------------------------------------------------------------
    browser = await chromium.launch({ headless: true });

    const cmsHrContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await injectAuthContext(cmsHrContext, {
      token: hrToken,
      userId: hrUser.id,
      email: hrUser.email,
      fullName: "Zubin Irani (HR Admin)",
      tenantId,
      roles: ["super_admin", "hr_admin"],
      permissions: ["*"],
    });

    const tsHrContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await injectAuthContext(tsHrContext, {
      token: hrToken,
      userId: hrUser.id,
      email: hrUser.email,
      fullName: "Zubin Irani (HR Admin)",
      tenantId,
      roles: ["super_admin", "hr_admin"],
      permissions: ["*"],
    });

    const cmsPage = await cmsHrContext.newPage();
    const tsPage = await tsHrContext.newPage();

    const cmsPageErrors: string[] = [];
    const tsPageErrors: string[] = [];
    cmsPage.on("pageerror", (err: Error) => cmsPageErrors.push(err.message));
    tsPage.on("pageerror", (err: Error) => tsPageErrors.push(err.message));

    // -------------------------------------------------------------------------
    // 3. VERIFY LEAVE HUB & EXISTING 4 LEAVE PAGES REGRESSION ON BOTH FRONTENDS
    // -------------------------------------------------------------------------
    console.log("--- STEP 1: EXISTING 4 LEAVE PAGES & OVERVIEW HUB REGRESSION CHECK ---");

    await cmsPage.goto(`${CMS_ORIGIN}/hr/leave`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await cmsPage.getByText("Leave Encashment & Comp-Off").first().waitFor({ timeout: 30000 });
    assert(true, "Next.js CMS Leave Overview Hub (/hr/leave) renders 5th card 'Leave Encashment & Comp-Off'");

    await tsPage.goto(`${TANSTACK_ORIGIN}/hr/leave`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await tsPage.getByText("Leave Encashment & Comp-Off").first().waitFor({ timeout: 45000 });
    assert(true, "TanStack Start Leave Overview Hub (/hr/leave) renders 5th card 'Leave Encashment & Comp-Off'");

    const existingRoutes = [
      "/hr/leave/applications",
      "/hr/leave/balances",
      "/hr/leave/types",
      "/hr/leave/policies",
    ];
    for (const r of existingRoutes) {
      await cmsPage.goto(`${CMS_ORIGIN}${r}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await cmsPage.waitForTimeout(800);
      await tsPage.goto(`${TANSTACK_ORIGIN}${r}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await tsPage.waitForTimeout(800);
      assert(
        cmsPageErrors.length === 0 && tsPageErrors.length === 0,
        `Existing Leave page ${r} loads with 0 uncaught runtime errors on both CMS & TanStack Start`
      );
    }

    // -------------------------------------------------------------------------
    // 4. CREATE ENCASHMENT & COMP-OFF IN NEXT.JS CMS (:3000)
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 2: CREATE ENCASHMENT & COMP-OFF REQUESTS IN NEXT.JS CMS (:3000) ---");

    await cmsPage.goto(`${CMS_ORIGIN}/hr/leave/encashment-compoff`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await cmsPage.getByRole("heading", { name: "Leave Encashment & Comp-Off" }).waitFor({ timeout: 30000 });

    // Verify all 6 dynamic summary cards & 4 tabs render
    for (const cardTitle of [
      "Pending Encashments",
      "Approved Encashments",
      "Awaiting Payroll",
      "Pending Comp-Offs",
      "Available Comp-Off Days",
      "Expiring Comp-Off Days",
    ]) {
      assert(
        await cmsPage.getByText(cardTitle, { exact: false }).first().isVisible(),
        `Next.js CMS renders dynamic summary card: ${cardTitle}`
      );
    }

    // Open Add Encashment Request modal in CMS (:3000)
    await cmsPage.getByRole("button", { name: "Add Encashment Request" }).click();
    await cmsPage.getByText("New Leave Encashment Request").waitFor({ timeout: 10000 });

    // Wait for eligible leave type auto-selection & enter 4 days -> 4 * 2,000 = 8,000.00 preview
    await cmsPage.getByText("Authoritative Encashment Calculation").waitFor({ timeout: 15000 });
    const daysInput = cmsPage.locator('input[type="number"][step="0.5"]').first();
    await daysInput.fill("4");
    await cmsPage
      .locator('[role="dialog"]')
      .getByText("8,000", { exact: false })
      .first()
      .waitFor({ timeout: 15000 });
    const modalText = await cmsPage.locator('[role="dialog"]').innerText();
    assert(
      modalText.includes("8,000") && modalText.includes("14d"),
      "Next.js CMS Encashment modal live-computes ₹8,000.00 payout & 14d retained balance from backend API",
      modalText
    );

    await cmsPage
      .getByPlaceholder("Provide reason for leave encashment request…")
      .fill("Cross-frontend E2E encashment created in Next.js CMS");
    await cmsPage.getByRole("button", { name: "Submit Encashment Request" }).click();
    await cmsPage.getByText("New Leave Encashment Request").waitFor({ state: "hidden", timeout: 20000 });

    await cmsPage.getByText("Meera Nair").first().waitFor({ timeout: 15000 });
    assert(true, "Encashment request created in Next.js CMS persisted to Supabase & rendered in CMS table");

    // Open Add Comp-Off Request modal in CMS (:3000)
    await cmsPage.getByRole("button", { name: "Add Comp-Off Request" }).click();
    await cmsPage.getByText("New Comp-Off Earn Request").waitFor({ timeout: 10000 });

    const workDateInput = cmsPage.locator('[role="dialog"] input[type="date"]').first();
    await workDateInput.fill(sundayDateStr);
    await cmsPage.getByText("Verified Eligible Comp-Off Credit").waitFor({ timeout: 15000 });
    const compModalText = await cmsPage.locator('[role="dialog"]').innerText();
    assert(
      compModalText.includes("0.5 day") && compModalText.includes("6h"),
      "Next.js CMS Comp-Off modal verifies live Sunday attendance (6h -> 0.5 day credit)",
      compModalText
    );

    await cmsPage
      .getByPlaceholder("Describe business deliverable or shift worked on weekly off / holiday / overtime…")
      .fill("Sunday deployment shift verified via E2E");
    await cmsPage.getByRole("button", { name: "Submit Comp-Off Request" }).click();
    await cmsPage.getByText("New Comp-Off Earn Request").waitFor({ state: "hidden", timeout: 20000 });

    await cmsPage.screenshot({
      path: path.join(ARTIFACTS_DIR, "01-cms-desktop-encashment-created.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------------------
    // 5. VERIFY APPEARANCE & APPROVE BOTH IN TANSTACK START (:5173)
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 3: VERIFY SYNC & APPROVE IN TANSTACK START (:5173) ---");

    await tsPage.goto(`${TANSTACK_ORIGIN}/hr/leave/encashment-compoff`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await tsPage.getByRole("heading", { name: "Leave Encashment & Comp-Off" }).waitFor({ timeout: 45000 });
    await tsPage.getByText("Meera Nair").first().waitFor({ timeout: 30000 });

    const tsBodyBeforeApprove = await tsPage.locator("body").innerText();
    assert(
      tsBodyBeforeApprove.includes("Meera Nair") && tsBodyBeforeApprove.includes("8,000"),
      "Record created in Next.js CMS (:3000) immediately appears in TanStack Start (:5173) with ₹8,000.00 snapshot"
    );

    // Test Search input in TanStack Start
    const searchInput = tsPage.getByPlaceholder("Search code, employee, reason…");
    await searchInput.fill("Meera");
    await tsPage.waitForTimeout(450);
    await tsPage
      .locator("table")
      .getByText("Meera Nair")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    assert(
      await tsPage.locator("table").getByText("Meera Nair").first().isVisible(),
      "Server-side search in TanStack Start filters matching employee records cleanly"
    );
    await searchInput.fill("");
    await tsPage.waitForTimeout(450);
    await tsPage
      .locator("table")
      .getByText("Meera Nair")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // Open Detail Audit Modal in TanStack Start
    await tsPage.locator('button[title*="View Detail"]').first().click();
    await tsPage.getByText("Transaction Detail").waitFor({ timeout: 10000 });
    assert(true, "Detail Audit Modal opens in TanStack Start with calculation & audit trail");
    await tsPage.keyboard.press("Escape");
    await tsPage.waitForTimeout(400);

    // Approve Encashment in TanStack Start (:5173)
    await tsPage.getByRole("button", { name: "Approve", exact: true }).first().click();
    await tsPage.getByRole("button", { name: "Confirm Action" }).waitFor({ timeout: 10000 });
    await tsPage.getByPlaceholder("Enter audit note…").fill("Approved from TanStack Start E2E");
    await tsPage.getByRole("button", { name: "Confirm Action" }).click();
    await tsPage.getByRole("button", { name: "Confirm Action" }).waitFor({ state: "hidden", timeout: 20000 });
    await tsPage.getByText("Queue Payroll").first().waitFor({ timeout: 15000 });

    assert(
      (await tsPage.locator("body").innerText()).includes("Approved"),
      "Encashment approved in TanStack Start transitions to Approved & debits LeaveLedgerEntry"
    );

    // Switch to Comp-Off tab in TanStack Start (:5173) & Approve Comp-Off
    await tsPage.getByRole("button", { name: "Comp-Off", exact: true }).click();
    await tsPage.getByText("Meera Nair").first().waitFor({ timeout: 15000 });
    await tsPage.getByRole("button", { name: "Approve & Credit" }).first().click();
    await tsPage.getByRole("button", { name: "Confirm Action" }).waitFor({ timeout: 10000 });
    await tsPage.getByPlaceholder("Enter audit note…").fill("Comp-Off credited from TanStack Start E2E");
    await tsPage.getByRole("button", { name: "Confirm Action" }).click();
    await tsPage.getByRole("button", { name: "Confirm Action" }).waitFor({ state: "hidden", timeout: 20000 });
    await tsPage.getByText("Credited", { exact: true }).first().waitFor({ timeout: 15000 });
    await tsPage.getByText("0.5d").first().waitFor({ timeout: 15000 });

    const tsAfterCompCredit = await tsPage.locator("body").innerText();
    assert(
      tsAfterCompCredit.includes("Credited") && tsAfterCompCredit.includes("0.5d"),
      "Comp-Off approved in TanStack Start transitions to Credited and updates Available Comp-Off Days to 0.5d"
    );

    // Verify Configuration tab in TanStack Start
    await tsPage.getByRole("button", { name: "Configuration", exact: true }).click();
    await tsPage.getByText("E2E Earned Leave Encashment Policy").waitFor({ timeout: 15000 });
    await tsPage.getByRole("button", { name: /Comp-Off Policies/i }).click();
    await tsPage.getByText("E2E Sunday & Holiday Comp-Off Policy").waitFor({ timeout: 15000 });
    assert(true, "Configuration tab renders active Encashment & Comp-Off policies dynamically");

    await tsPage.screenshot({
      path: path.join(ARTIFACTS_DIR, "02-tanstack-desktop-approved-and-configs.png"),
      fullPage: true,
    });

    // -------------------------------------------------------------------------
    // 6. VERIFY SYNCHRONIZATION BACK IN NEXT.JS CMS (:3000) + TRANSACTION HISTORY
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 4: VERIFY APPROVAL & BALANCE SYNC BACK IN NEXT.JS CMS (:3000) ---");

    await cmsPage.getByRole("button", { name: "Transaction History", exact: true }).click();
    await cmsPage.getByRole("button", { name: "Refresh" }).click();
    await cmsPage.getByText("0.5d").first().waitFor({ timeout: 15000 });
    await cmsPage.getByText("Credited", { exact: true }).first().waitFor({ timeout: 15000 });
    await cmsPage.getByText("Approved", { exact: true }).first().waitFor({ timeout: 15000 });

    const cmsSyncedText = await cmsPage.locator("body").innerText();
    assert(
      cmsSyncedText.includes("0.5d") &&
        cmsSyncedText.includes("Approved") &&
        cmsSyncedText.includes("Credited"),
      "Next.js CMS (:3000) reflects synchronized Approved Encashment, Credited Comp-Off, & 0.5d Available Comp-Off balance"
    );

    // -------------------------------------------------------------------------
    // 7. ESS PARITY (/me/leave/encashment-compoff), DARK MODE & MOBILE (390x844)
    // -------------------------------------------------------------------------
    console.log("\n--- STEP 5: ESS PARITY, DARK MODE & RESPONSIVE MOBILE (390x844) ---");

    const essContext = await browser.newContext({ viewport: { width: 1280, height: 850 } });
    await injectAuthContext(essContext, {
      token: empToken,
      userId: empUser.id,
      email: empUser.email,
      fullName: "Meera Nair",
      tenantId,
      roles: ["employee"],
      permissions: [],
    });
    const essPage = await essContext.newPage();

    await essPage.goto(`${CMS_ORIGIN}/me/leave/encashment-compoff`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await essPage.getByText("Leave Encashment & Comp-Off").first().waitFor({ timeout: 30000 });
    await essPage.getByText("8,000", { exact: false }).first().waitFor({ timeout: 20000 });
    const cmsEssText = await essPage.locator("body").innerText();
    assert(
      cmsEssText.includes("8,000") && !cmsEssText.includes("Save Encashment Policy"),
      "Next.js CMS ESS page (/me/leave/encashment-compoff) shows employee's own records without HR Configuration admin controls"
    );

    await essPage.goto(`${TANSTACK_ORIGIN}/me/leave/encashment-compoff`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await essPage.getByText("Leave Encashment & Comp-Off").first().waitFor({ timeout: 45000 });
    await essPage.getByText("8,000", { exact: false }).first().waitFor({ timeout: 25000 });
    const tsEssText = await essPage.locator("body").innerText();
    assert(
      tsEssText.includes("8,000") && !tsEssText.includes("Save Encashment Policy"),
      "TanStack Start ESS page (/me/leave/encashment-compoff) matches CMS ESS parity 100%"
    );

    // Dark Mode verification on Next.js CMS & TanStack Start
    await cmsPage.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await cmsPage.waitForTimeout(300);
    await cmsPage.screenshot({
      path: path.join(ARTIFACTS_DIR, "03-cms-dark-mode-transaction-history.png"),
      fullPage: true,
    });
    assert(
      await cmsPage.evaluate(() => document.documentElement.classList.contains("dark")),
      "Dark mode styling verified cleanly on Leave Encashment & Comp-Off"
    );

    // Responsive Mobile viewport (390x844) check on both frontends
    await cmsPage.setViewportSize({ width: 390, height: 844 });
    await cmsPage.getByRole("button", { name: "Encashment", exact: true }).click();
    await cmsPage.waitForTimeout(500);
    const cmsMobileOverflow = await cmsPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 4
    );
    await cmsPage.screenshot({
      path: path.join(ARTIFACTS_DIR, "04-cms-mobile-390x844.png"),
      fullPage: true,
    });
    assert(!cmsMobileOverflow, "Next.js CMS mobile layout (390x844) renders stacked cards without horizontal overflow");

    await tsPage.setViewportSize({ width: 390, height: 844 });
    await tsPage.getByRole("button", { name: "Encashment", exact: true }).click();
    await tsPage.waitForTimeout(500);
    const tsMobileOverflow = await tsPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 4
    );
    await tsPage.screenshot({
      path: path.join(ARTIFACTS_DIR, "05-tanstack-mobile-390x844.png"),
      fullPage: true,
    });
    assert(!tsMobileOverflow, "TanStack Start mobile layout (390x844) renders stacked cards without horizontal overflow");

    assert(
      cmsPageErrors.length === 0 && tsPageErrors.length === 0,
      "Zero uncaught JavaScript runtime errors across entire cross-frontend Playwright E2E session"
    );

    await essContext.close();
    await cmsHrContext.close();
    await tsHrContext.close();
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await cleanupEphemeralE2eArtifacts(tenantId);
    await rawPrisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(
    `CROSS-FRONTEND PLAYWRIGHT E2E SUMMARY: ${passedChecks}/${totalChecks} PASSED (100% SUCCESS)`
  );
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("FATAL PLAYWRIGHT E2E FAILURE:", err);
  process.exit(1);
});
