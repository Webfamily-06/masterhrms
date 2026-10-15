import { PrismaClient } from "@prisma/client";
import { generateToken } from "../lib/jwt";

function unwrapArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

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

async function runRbacSecurityTests() {
  console.log("================================================================================");
  console.log("MASTERHRMS BATCH 1: RBAC AUTHORIZATION & SECURITY ENFORCEMENT AUDIT");
  console.log("Scope: hr-lifecycle.routes.ts Role Guards, Tenant Isolation, Self-Service Parity");
  console.log("================================================================================\n");

  try {
    const tenantAId = "tenant-default-001";
    const hrUser = await prisma.user.findFirst({
      where: { email: "hr@masterhrms.com" },
      include: { profile: true, roles: true },
    });
    const empUser = await prisma.user.findFirst({
      where: { email: "employee@masterhrms.com" },
      include: { profile: true, roles: true },
    });

    if (!hrUser || !empUser) {
      throw new Error("Required test users (hr@masterhrms.com, employee@masterhrms.com) not found.");
    }

    const employeeAlex = await prisma.employee.findFirst({
      where: { tenantId: tenantAId, employeeCode: "EMP-0001" },
    });
    if (!employeeAlex) throw new Error("Employee EMP-0001 not found.");

    const hrToken = generateToken({
      userId: hrUser.id,
      email: hrUser.email,
      tenantId: tenantAId,
      roles: hrUser.roles.map((r) => r.role),
    });

    const empToken = generateToken({
      userId: empUser.id,
      email: empUser.email,
      tenantId: tenantAId,
      roles: empUser.roles.map((r) => r.role),
    });

    // -------------------------------------------------------------------------
    // 1. REGULAR EMPLOYEE ATTEMPTING ADMINISTRATIVE WRITES (MUST FAIL WITH 403)
    // -------------------------------------------------------------------------
    console.log("--- TEST GROUP 1: Regular Employee Blocked from Administrative Writes ---");

    // 1.1 Award Creation Attempt by Employee
    const empAwardCreateRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        employeeId: employeeAlex.id,
        awardDate: new Date().toISOString(),
        giftItem: "Unauthorized Employee Self-Award",
        giftAmount: 99999,
      }),
    });
    assertTest(
      empAwardCreateRes.status === 403,
      "POST /hr/lifecycle/awards: Regular employee blocked with 403 Forbidden",
      { status: empAwardCreateRes.status }
    );

    // Verify no DB record was created
    const leakedAward = await prisma.award.findFirst({
      where: { giftItem: "Unauthorized Employee Self-Award" },
    });
    assertTest(leakedAward === null, "DB Mutation Guard: Unauthorized award was NOT inserted into database");

    // 1.2 Award Deletion Attempt by Employee
    const empAwardDeleteRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards/any-id`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empAwardDeleteRes.status === 403,
      "DELETE /hr/lifecycle/awards/:id: Regular employee blocked with 403 Forbidden",
      { status: empAwardDeleteRes.status }
    );

    // 1.3 Warning Issue Attempt by Employee
    const empWarningCreateRes = await fetch(`${API_BASE}/v1/hr/lifecycle/warnings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        employeeId: employeeAlex.id,
        warningType: "Fake Warning",
        subject: "Employee issuing warning",
        severity: "major",
        warningDate: new Date().toISOString(),
      }),
    });
    assertTest(
      empWarningCreateRes.status === 403,
      "POST /hr/lifecycle/warnings: Regular employee blocked with 403 Forbidden",
      { status: empWarningCreateRes.status }
    );

    // 1.4 Warning Deletion Attempt by Employee
    const empWarningDeleteRes = await fetch(`${API_BASE}/v1/hr/lifecycle/warnings/any-id`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empWarningDeleteRes.status === 403,
      "DELETE /hr/lifecycle/warnings/:id: Regular employee blocked with 403 Forbidden",
      { status: empWarningDeleteRes.status }
    );

    // 1.5 Promotion Attempt by Employee
    const empPromotionRes = await fetch(`${API_BASE}/v1/hr/lifecycle/promotions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        employeeId: employeeAlex.id,
        newDesignation: "CEO",
        effectiveDate: new Date().toISOString(),
      }),
    });
    assertTest(
      empPromotionRes.status === 403,
      "POST /hr/lifecycle/promotions: Regular employee blocked with 403 Forbidden",
      { status: empPromotionRes.status }
    );

    // 1.6 Transfer Attempt by Employee
    const empTransferRes = await fetch(`${API_BASE}/v1/hr/lifecycle/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        employeeId: employeeAlex.id,
        reason: "Unauthorized Transfer",
      }),
    });
    assertTest(
      empTransferRes.status === 403,
      "POST /hr/lifecycle/transfers: Regular employee blocked with 403 Forbidden",
      { status: empTransferRes.status }
    );

    // 1.7 Termination Attempt by Employee
    const empTerminationRes = await fetch(`${API_BASE}/v1/hr/lifecycle/terminations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        employeeId: employeeAlex.id,
        reason: "Unauthorized Termination",
      }),
    });
    assertTest(
      empTerminationRes.status === 403,
      "POST /hr/lifecycle/terminations: Regular employee blocked with 403 Forbidden",
      { status: empTerminationRes.status }
    );

    // 1.8 Complaint Resolution & Case Note Attempt by Employee
    const empResolveRes = await fetch(`${API_BASE}/v1/hr/lifecycle/complaints/any-id/resolve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({ resolutionNotes: "Dismissed by unauthorized employee" }),
    });
    assertTest(
      empResolveRes.status === 403,
      "PUT /hr/lifecycle/complaints/:id/resolve: Regular employee blocked with 403 Forbidden",
      { status: empResolveRes.status }
    );

    const empCaseNoteRes = await fetch(`${API_BASE}/v1/hr/lifecycle/complaints/any-id/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({ noteText: "Unauthorized Case Note" }),
    });
    assertTest(
      empCaseNoteRes.status === 403,
      "POST /hr/lifecycle/complaints/:id/notes: Regular employee blocked with 403 Forbidden",
      { status: empCaseNoteRes.status }
    );

    // -------------------------------------------------------------------------
    // 2. CONFIDENTIAL DATA ACCESS CONTROL (READ ENDPOINTS)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 2: Confidential Administrative Read Protections ---");

    // 2.1 Employee attempting to read ALL organizational complaints
    const empReadComplaintsRes = await fetch(`${API_BASE}/v1/hr/lifecycle/complaints`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empReadComplaintsRes.status === 403,
      "GET /hr/lifecycle/complaints: Employee blocked from confidential complaint registry with 403",
      { status: empReadComplaintsRes.status }
    );

    // 2.2 Employee attempting to read ALL organizational awards / disciplinary files
    const empReadAwardsRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empReadAwardsRes.status === 403,
      "GET /hr/lifecycle/awards: Employee blocked from administrative awards registry with 403",
      { status: empReadAwardsRes.status }
    );

    const empReadWarningsRes = await fetch(`${API_BASE}/v1/hr/lifecycle/warnings`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empReadWarningsRes.status === 403,
      "GET /hr/lifecycle/warnings: Employee blocked from disciplinary warning registry with 403",
      { status: empReadWarningsRes.status }
    );

    // -------------------------------------------------------------------------
    // 3. AUTHORIZED HR ADMINISTRATOR ACCESS (MUST SUCCEED)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 3: Authorized HR Administrator Permitted Operations ---");

    // 3.1 HR Admin can read awards
    const hrReadAwardsRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(
      hrReadAwardsRes.status === 200,
      "GET /hr/lifecycle/awards: HR Admin permitted with 200 OK",
      { status: hrReadAwardsRes.status }
    );

    // 3.2 HR Admin can read overview metrics
    const hrOverviewRes = await fetch(`${API_BASE}/v1/hr/lifecycle/overview`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(
      hrOverviewRes.status === 200,
      "GET /hr/lifecycle/overview: HR Admin permitted with 200 OK",
      { status: hrOverviewRes.status }
    );

    // 3.3 HR Admin can read complaints
    const hrComplaintsRes = await fetch(`${API_BASE}/v1/hr/lifecycle/complaints`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assertTest(
      hrComplaintsRes.status === 200,
      "GET /hr/lifecycle/complaints: HR Admin permitted to access complaints registry with 200 OK",
      { status: hrComplaintsRes.status }
    );

    // -------------------------------------------------------------------------
    // 4. EMPLOYEE SELF-SERVICE PARITY (MUST REMAIN ACCESSIBLE TO EMPLOYEE)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 4: Employee Self-Service Legitimate Access Preservation ---");

    // 4.1 Employee can access own awards
    const empMyAwardsRes = await fetch(`${API_BASE}/v1/me/lifecycle/awards`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empMyAwardsRes.status === 200,
      "GET /me/lifecycle/awards: Employee retains legitimate access to their own awards (200 OK)",
      { status: empMyAwardsRes.status }
    );

    // 4.2 Employee can access own complaints (filed by employee)
    const empMyComplaintsRes = await fetch(`${API_BASE}/v1/me/lifecycle/complaints`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assertTest(
      empMyComplaintsRes.status === 200,
      "GET /me/lifecycle/complaints: Employee retains legitimate access to their filed grievances (200 OK)",
      { status: empMyComplaintsRes.status }
    );

    // -------------------------------------------------------------------------
    // 5. CROSS-TENANT ISOLATION UNDER HR ADMIN ROLE
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 5: Cross-Tenant Isolation Enforcement Under Admin Role ---");

    const userB = await prisma.user.findUnique({
      where: { id: "094c95f9-12cc-4f7b-a433-21ebc58b1f71" },
      include: { profile: true, roles: true },
    });

    if (userB) {
      const tokenB = generateToken({
        userId: userB.id,
        email: userB.email,
        tenantId: userB.profile!.tenantId!,
        roles: userB.roles.map((r) => r.role),
      });

      const tenantBAwardsRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const tenantBAwards = unwrapArray(await tenantBAwardsRes.json());
      const hasTenantAData = tenantBAwards.some((a: any) => a.tenantId === tenantAId);

      assertTest(
        tenantBAwardsRes.status === 200 && !hasTenantAData,
        "Tenant B HR Admin CANNOT access Tenant A lifecycle data (Multi-Tenant Isolation Strict)",
        { count: tenantBAwards.length, hasTenantAData }
      );
    }

    // -------------------------------------------------------------------------
    // 6. FAIL-CLOSED BOUNDARY VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 6: Fail-Closed Boundary Verification ---");

    const noAuthRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards`);
    assertTest(
      noAuthRes.status === 401,
      "Missing Authorization header fails closed with 401 Unauthorized"
    );

    const badTokenRes = await fetch(`${API_BASE}/v1/hr/lifecycle/awards`, {
      headers: { Authorization: "Bearer forged.invalid.token" },
    });
    assertTest(
      badTokenRes.status === 401,
      "Tampered / forged token fails closed with 401 Unauthorized"
    );

    console.log("\n================================================================================");
    console.log(`RBAC SECURITY AUDIT SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("================================================================================");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("FATAL RBAC AUDIT ERROR:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRbacSecurityTests();
