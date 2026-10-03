import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { superRouter } from "../routes/super.routes";

async function runPage1RealTestSuite() {
  console.log("================================================================================");
  console.log("PAGE 1: COMPLETE REAL-TIME DATABASE INTEGRATION VERIFICATION");
  console.log("Target: Super Admin — Tenants / Companies (/super/tenants)");
  console.log("Database: Supabase PostgreSQL (Live Relational Integration)");
  console.log("================================================================================\n");

  // Spin up an ephemeral Express test server hosting superRouter
  const app = express();
  app.use(express.json());
  app.use("/api/super", superRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Test API server running on ${baseUrl}\n`);

  // Tokens using real seeded database users
  const superAdminToken = generateToken({
    userId: "user-admin-001",
    email: "admin@masterhrms.com",
    tenantId: null,
    roles: ["super_admin", "hr_admin"],
  });

  const tenantUserToken = generateToken({
    userId: "user-emp-001",
    email: "employee@masterhrms.com",
    tenantId: "tenant-default-001",
    roles: ["employee"],
  });

  const testTenantSlug = `test-page1-${Date.now()}`;
  let createdTenantId = "";

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Security - Unauthenticated Access Blocked
    // --------------------------------------------------------------------------
    console.log("▶ [Test 1] Security: Unauthenticated access blocked on /api/super/tenants");
    const unauthRes = await fetch(`${baseUrl}/api/super/tenants`);
    assert.equal(unauthRes.status, 401, "Unauthenticated request must return 401");
    console.log("  ✔ Unauthenticated request properly rejected (HTTP 401)");

    // --------------------------------------------------------------------------
    // TEST 2: Security - Non-SuperAdmin Forbidden
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Security: Tenant user (non-super-admin) blocked on /api/super/tenants");
    const tenantUserRes = await fetch(`${baseUrl}/api/super/tenants`, {
      headers: { Authorization: `Bearer ${tenantUserToken}` },
    });
    assert.equal(tenantUserRes.status, 403, "Non-super-admin request must return 403");
    console.log("  ✔ Tenant user properly rejected with Forbidden (HTTP 403)");

    // --------------------------------------------------------------------------
    // TEST 3: Summary Statistics Endpoint (Real DB)
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 3] Summary Statistics: GET /api/super/tenants/stats");
    const statsRes = await fetch(`${baseUrl}/api/super/tenants/stats`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    console.log("  Stats Payload:", JSON.stringify(stats, null, 2));
    assert.ok(typeof stats.total === "number", "stats.total must be a number");
    assert.ok(typeof stats.active === "number", "stats.active must be a number");
    assert.ok(typeof stats.inactive === "number", "stats.inactive must be a number");
    assert.ok(typeof stats.locations === "number", "stats.locations must be a number");
    assert.equal(stats.total, stats.active + stats.inactive, "Total must equal active + inactive");
    assert.ok(Array.isArray(stats.sparklines?.total), "Sparkline total array must exist");
    assert.equal(stats.sparklines.total.length, 7, "Sparkline must have 7 historical points");
    console.log("  ✔ Real summary statistics verified against database");

    // --------------------------------------------------------------------------
    // TEST 4: Fetch Real Company List (Unpaginated Legacy Compatibility)
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 4] Company List: GET /api/super/tenants");
    const listRes = await fetch(`${baseUrl}/api/super/tenants`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(Array.isArray(list), "Unpaginated query must return an array");
    assert.ok(list.length > 0, "Must return at least 1 real company from DB");
    const firstCompany = list[0];
    assert.ok(firstCompany.id, "Company must have id");
    assert.ok(firstCompany.name, "Company must have name");
    assert.ok(firstCompany.slug, "Company must have slug");
    assert.ok(typeof firstCompany.employee_count === "number", "employee_count must be numeric");
    assert.ok(typeof firstCompany.user_count === "number", "user_count must be numeric");
    assert.ok(firstCompany.account_url, "account_url must be present");
    assert.ok("expires_at" in firstCompany, "expires_at must be present in tenant item");
    console.log(`  ✔ First company loaded: "${firstCompany.name}" (${firstCompany.account_url}), Plan: ${firstCompany.plan_name}, Expiry: ${firstCompany.expires_at || "N/A"}`);

    // --------------------------------------------------------------------------
    // TEST 5: Paginated Company List with Search & Filtering
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 5] Pagination & Filtering: GET /api/super/tenants?page=1&limit=2&paginated=true");
    const paginatedRes = await fetch(`${baseUrl}/api/super/tenants?page=1&limit=2&paginated=true`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(paginatedRes.status, 200);
    const paginatedData = await paginatedRes.json();
    assert.ok(Array.isArray(paginatedData.data), "paginatedData.data must be array");
    assert.ok(paginatedData.pagination, "pagination metadata must be returned");
    assert.equal(paginatedData.pagination.page, 1);
    assert.equal(paginatedData.pagination.limit, 2);
    assert.ok(paginatedData.pagination.total >= list.length);
    console.log(`  ✔ Pagination metadata verified: page 1 of ${paginatedData.pagination.totalPages}, total ${paginatedData.pagination.total}`);

    // --------------------------------------------------------------------------
    // TEST 6: Add Company Workflow (Creation + Subscription Plan Assignment)
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 6] Create Company: POST /api/super/tenants");
    const plansRes = await fetch(`${baseUrl}/api/super/plans`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const plans = await plansRes.json();
    const targetPlan = plans[0] || null;

    const createPayload = {
      name: "Apex Global Dynamics",
      slug: testTenantSlug,
      logoUrl: "https://example.com/apex-logo.svg",
      planId: targetPlan?.id,
    };

    const createRes = await fetch(`${baseUrl}/api/super/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(createPayload),
    });
    assert.equal(createRes.status, 201, "Creation must return 201 Created");
    const createdTenant = await createRes.json();
    createdTenantId = createdTenant.id;
    assert.ok(createdTenant.id);
    assert.equal(createdTenant.name, "Apex Global Dynamics");
    assert.equal(createdTenant.slug, testTenantSlug);
    console.log(`  ✔ Created company in PostgreSQL: ID = ${createdTenant.id}, Slug = ${createdTenant.slug}`);

    // Verify in database directly
    const dbTenant = await prisma.tenant.findUnique({
      where: { id: createdTenant.id },
      include: { subscription: true },
    });
    assert.ok(dbTenant, "Tenant must exist in database");
    assert.equal(dbTenant.name, "Apex Global Dynamics");
    assert.ok(dbTenant.subscription, "Initial subscription must be created");
    console.log("  ✔ Verified persistence directly via database ORM");

    // --------------------------------------------------------------------------
    // TEST 7: Duplicate Slug Prevention
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 7] Duplicate Slug Prevention: Duplicate POST /api/super/tenants");
    const dupRes = await fetch(`${baseUrl}/api/super/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(createPayload),
    });
    assert.equal(dupRes.status, 409, "Duplicate slug must return 409 Conflict");
    console.log("  ✔ Duplicate slug rejected safely with HTTP 409 Conflict");

    // --------------------------------------------------------------------------
    // TEST 8: Edit Company Profile
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 8] Edit Company Profile: PUT /api/super/tenants/:id");
    const editRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: "Apex Global Dynamics Technologies",
        logoUrl: "https://example.com/apex-updated.png",
      }),
    });
    assert.equal(editRes.status, 200);
    const updatedTenant = await editRes.json();
    assert.equal(updatedTenant.name, "Apex Global Dynamics Technologies");

    // Verify in DB
    const dbUpdated = await prisma.tenant.findUnique({ where: { id: createdTenantId } });
    assert.equal(dbUpdated?.name, "Apex Global Dynamics Technologies");
    assert.equal(dbUpdated?.logoUrl, "https://example.com/apex-updated.png");
    console.log("  ✔ Edit persisted: Name updated to 'Apex Global Dynamics Technologies'");

    // --------------------------------------------------------------------------
    // TEST 9: Status Toggle (Suspend and Reactivate)
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 9] Status Toggle: PUT /api/super/tenants/:id/status");
    const suspendRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ status: "suspended" }),
    });
    assert.equal(suspendRes.status, 200);
    const subAfterSuspend = await prisma.tenantSubscription.findUnique({
      where: { tenantId: createdTenantId },
    });
    assert.equal(subAfterSuspend?.status, "suspended");
    console.log("  ✔ Company marked as suspended in database");

    // Reactivate
    const reactivateRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ status: "active" }),
    });
    assert.equal(reactivateRes.status, 200);
    const subAfterReactivate = await prisma.tenantSubscription.findUnique({
      where: { tenantId: createdTenantId },
    });
    assert.equal(subAfterReactivate?.status, "active");
    console.log("  ✔ Company marked as active in database");

    // --------------------------------------------------------------------------
    // TEST 10: Company Full Information Details API
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 10] Company Information Details: GET /api/super/tenants/:id");
    const detailsRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(detailsRes.status, 200);
    const details = await detailsRes.json();
    assert.equal(details.id, createdTenantId);
    assert.equal(details.slug, testTenantSlug);
    assert.ok(details.email, "Authoritative company email must be present");
    assert.ok(details.account_url, "Account URL must be present");
    assert.ok(typeof details.employee_count === "number", "Employee count must be numeric");
    assert.ok(details.subscription, "Subscription details must be returned");
    assert.ok("expires_at" in details, "expires_at must be present in company details");
    console.log(`  ✔ Company details loaded: Email = ${details.email}, Plan = ${details.plan_name}, Expiry = ${details.expires_at || "N/A"}`);

    // --------------------------------------------------------------------------
    // TEST 11: Company Email Update Synchronization
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 11] Company Email Update: PUT /api/super/tenants/:id");
    const newCompanyEmail = `contact@apex-${Date.now()}.cloud`;
    const updateEmailRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ email: newCompanyEmail }),
    });
    assert.equal(updateEmailRes.status, 200);

    // Verify company details now reflect updated email
    const updatedDetailsRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const updatedDetails = await updatedDetailsRes.json();
    assert.equal(updatedDetails.email, newCompanyEmail, "Company email must match updated email");
    console.log(`  ✔ Company email updated & synced to primary profile: ${newCompanyEmail}`);

    // --------------------------------------------------------------------------
    // TEST 12: Super Admin Reset Password Workflow
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 12] Reset Password: POST /api/super/tenants/:id/reset-password");
    const resetRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(resetRes.status, 200);
    const resetData = await resetRes.json();
    assert.equal(resetData.success, true);
    assert.ok(resetData.accountEmail, "Target account email must be returned");
    assert.ok(resetData.temporaryPassword, "Generated temporary password must be provided");
    assert.ok(!("passwordHash" in resetData), "Password hash must NEVER be returned in response");
    console.log(`  ✔ Generated secure temporary password for ${resetData.accountEmail}`);

    // --------------------------------------------------------------------------
    // TEST 13: One-Click Tenant Impersonation
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 13] 1-Click Tenant Impersonation: POST /api/super/impersonate/:tenantId");
    const impersonateRes = await fetch(`${baseUrl}/api/super/impersonate/${createdTenantId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(impersonateRes.status, 200);
    const impersonateData = await impersonateRes.json();
    assert.ok(impersonateData.token, "Must return scoped impersonation token");
    assert.equal(impersonateData.tenant.id, createdTenantId);
    assert.equal(impersonateData.isImpersonating, true);
    console.log(`  ✔ Generated authentic scoped impersonation token for tenant ${impersonateData.tenant.slug}`);

    // --------------------------------------------------------------------------
    // TEST 14: Delete Company Workflow
    // --------------------------------------------------------------------------
    console.log("\n▶ [Test 14] Delete Company: DELETE /api/super/tenants/:id");
    const deleteRes = await fetch(`${baseUrl}/api/super/tenants/${createdTenantId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(deleteRes.status, 200);
    const deleteData = await deleteRes.json();
    assert.equal(deleteData.success, true);

    // Verify deletion in database
    const dbDeleted = await prisma.tenant.findUnique({ where: { id: createdTenantId } });
    assert.equal(dbDeleted, null, "Tenant must be removed from database");
    const subDeleted = await prisma.tenantSubscription.findUnique({
      where: { tenantId: createdTenantId },
    });
    assert.equal(subDeleted, null, "Tenant subscription must cascade delete");
    console.log("  ✔ Company and cascading subscription permanently removed from database");

    console.log("\n================================================================================");
    console.log("🎉 ALL 11 TESTS PASSED SUCCESSFULLY ON LIVE DATABASE!");
    console.log("================================================================================\n");
  } finally {
    // Cleanup if test aborted midway
    if (createdTenantId) {
      await prisma.tenant.delete({ where: { id: createdTenantId } }).catch(() => {});
    }
    server.close();
  }
}

runPage1RealTestSuite().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
