import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { customFieldsRouter } from "../routes/custom-fields.routes";
import { campaignsRouter } from "../routes/campaigns.routes";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE VERIFICATION: WAVE 1 — M08 CUSTOM FIELDS & M10 CAMPAIGNS");
  console.log("================================================================================\n");

  const app = express();
  app.use(express.json());

  app.use("/api/custom-fields", customFieldsRouter);
  app.use("/api/campaigns", campaignsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const tenantAlphaId = `test-wave1-alpha-${timestamp}`;
  const tenantBetaId = `test-wave1-beta-${timestamp}`;
  const userAlphaId = `user-w1-alpha-${timestamp}`;
  const userBetaId = `user-w1-beta-${timestamp}`;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error("     Detail:", detail);
    }
  }

  let customField1Id = "";
  let customField2Id = "";
  let campaign1Id = "";
  let campaign2Id = "";

  try {
    console.log("▶ [Setup] Provisioning test tenants and users in MySQL...");

    await prisma.tenant.createMany({
      data: [
        { id: tenantAlphaId, name: "Wave 1 Alpha Corp", slug: `wave1-alpha-${timestamp}` },
        { id: tenantBetaId, name: "Wave 1 Beta Corp", slug: `wave1-beta-${timestamp}` },
      ],
    });

    await prisma.user.createMany({
      data: [
        { id: userAlphaId, email: `alpha-${timestamp}@test.com`, passwordHash: "dummy" },
        { id: userBetaId, email: `beta-${timestamp}@test.com`, passwordHash: "dummy" },
      ],
    });

    await prisma.profile.createMany({
      data: [
        { id: `prof-alpha-${timestamp}`, userId: userAlphaId, tenantId: tenantAlphaId, fullName: "Alpha Admin" },
        { id: `prof-beta-${timestamp}`, userId: userBetaId, tenantId: tenantBetaId, fullName: "Beta Admin" },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: userAlphaId, tenantId: tenantAlphaId, role: "hr_admin" },
        { userId: userBetaId, tenantId: tenantBetaId, role: "hr_admin" },
      ],
    });

    const tokenAlpha = generateToken({
      userId: userAlphaId,
      email: `alpha-${timestamp}@test.com`,
      tenantId: tenantAlphaId,
      roles: ["hr_admin"],
    });

    const tokenBeta = generateToken({
      userId: userBetaId,
      email: `beta-${timestamp}@test.com`,
      tenantId: tenantBetaId,
      roles: ["hr_admin"],
    });

    const headersAlpha = {
      Authorization: `Bearer ${tokenAlpha}`,
      "Content-Type": "application/json",
    };

    const headersBeta = {
      Authorization: `Bearer ${tokenBeta}`,
      "Content-Type": "application/json",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PART 1: M08 CUSTOM FIELDS ENGINE TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test Group 1] M08 Custom Fields Engine API & Persistence");

    // 1.1 Validation error when missing required fields
    const resVal = await fetch(`${baseUrl}/api/custom-fields`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({ label: "Missing module" }),
    });
    assert(resVal.status === 400, "1.1 Rejects creation when required fields are missing");

    // 1.2 Create Custom Field for Employees
    const resCreate1 = await fetch(`${baseUrl}/api/custom-fields`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({
        module: "Employees",
        label: "Preferred Language",
        fieldType: "select",
        defaultValue: "English",
        options: ["English", "Spanish", "French", "German"],
        isRequired: true,
        status: "active",
        sortOrder: 1,
      }),
    });
    const dataCreate1 = await resCreate1.json();
    assert(resCreate1.status === 201 && dataCreate1.data?.id, "1.2 Successfully created Custom Field (Preferred Language)");
    customField1Id = dataCreate1.data?.id;

    // 1.3 Create Custom Field for Projects
    const resCreate2 = await fetch(`${baseUrl}/api/custom-fields`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({
        module: "Projects",
        label: "Project Type",
        fieldType: "select",
        defaultValue: "Internal",
        options: ["Internal", "Client", "R&D"],
        isRequired: true,
        status: "active",
        sortOrder: 2,
      }),
    });
    const dataCreate2 = await resCreate2.json();
    assert(resCreate2.status === 201 && dataCreate2.data?.id, "1.3 Successfully created Custom Field (Project Type)");
    customField2Id = dataCreate2.data?.id;

    // 1.4 List all custom fields for tenant Alpha
    const resListAlpha = await fetch(`${baseUrl}/api/custom-fields`, {
      headers: headersAlpha,
    });
    const dataListAlpha = await resListAlpha.json();
    assert(
      dataListAlpha.success && dataListAlpha.data.length === 2,
      "1.4 Lists all created custom fields for Tenant Alpha",
      dataListAlpha
    );

    // 1.5 Filter custom fields by module
    const resFilterModule = await fetch(`${baseUrl}/api/custom-fields?module=Employees`, {
      headers: headersAlpha,
    });
    const dataFilterModule = await resFilterModule.json();
    assert(
      dataFilterModule.success && dataFilterModule.data.length === 1 && dataFilterModule.data[0].label === "Preferred Language",
      "1.5 Correctly filters custom fields by module"
    );

    // 1.6 Tenant Isolation: Tenant Beta cannot see Tenant Alpha's custom fields
    const resListBeta = await fetch(`${baseUrl}/api/custom-fields`, {
      headers: headersBeta,
    });
    const dataListBeta = await resListBeta.json();
    assert(
      dataListBeta.success && dataListBeta.data.length === 0,
      "1.6 Tenant Beta receives 0 fields (strict tenant isolation)"
    );

    // 1.7 Update Custom Field
    const resUpdate = await fetch(`${baseUrl}/api/custom-fields/${customField1Id}`, {
      method: "PUT",
      headers: headersAlpha,
      body: JSON.stringify({
        label: "Primary Language",
        defaultValue: "Spanish",
      }),
    });
    const dataUpdate = await resUpdate.json();
    assert(
      resUpdate.status === 200 && dataUpdate.data.label === "Primary Language" && dataUpdate.data.defaultValue === "Spanish",
      "1.7 Successfully updated custom field label and default value"
    );

    // 1.8 Tenant Isolation: Tenant Beta cannot update Tenant Alpha's field
    const resCrossUpdate = await fetch(`${baseUrl}/api/custom-fields/${customField1Id}`, {
      method: "PUT",
      headers: headersBeta,
      body: JSON.stringify({ label: "Hacked" }),
    });
    assert(resCrossUpdate.status === 404, "1.8 Cross-tenant update blocked with 404 Not Found");

    // 1.9 Custom Field Values Upserting for an entity (e.g. employee-123)
    const testEntityId = "emp-test-001";
    const resUpsertValues = await fetch(`${baseUrl}/api/custom-fields/values/${testEntityId}`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({
        values: [
          { customFieldId: customField1Id, value: "French" },
        ],
      }),
    });
    const dataUpsert = await resUpsertValues.json();
    assert(resUpsertValues.status === 200 && dataUpsert.data.length === 1, "1.9 Successfully upserted custom field values for entity");

    // 1.10 Custom Field Values Retrieval
    const resGetValues = await fetch(`${baseUrl}/api/custom-fields/values/${testEntityId}`, {
      headers: headersAlpha,
    });
    const dataGetValues = await resGetValues.json();
    assert(
      dataGetValues.success && dataGetValues.data.length === 1 && dataGetValues.data[0].value === "French",
      "1.10 Successfully retrieved entity custom field values with relation"
    );

    // 1.11 Delete custom field
    const resDel = await fetch(`${baseUrl}/api/custom-fields/${customField2Id}`, {
      method: "DELETE",
      headers: headersAlpha,
    });
    assert(resDel.status === 200, "1.11 Successfully deleted custom field");

    // ─────────────────────────────────────────────────────────────────────────
    // PART 2: M10 MARKETING CAMPAIGNS TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [Test Group 2] M10 Marketing Campaigns API & Persistence");

    // 2.1 Validation on missing required fields
    const resCampVal = await fetch(`${baseUrl}/api/campaigns`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({ name: "Incomplete Campaign" }),
    });
    assert(resCampVal.status === 400, "2.1 Rejects campaign creation when missing channel/type");

    // 2.2 Create Campaign with Auto-Code generation
    const resCamp1 = await fetch(`${baseUrl}/api/campaigns`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({
        name: "Summer Sale 2026",
        campaignType: "Promotional",
        channel: "Email",
        budget: 15000,
        spent: 8200,
        currency: "USD",
        period: "Months",
        periodValue: 2,
        targetAudience: "Customers",
        description: "Annual summer promotional email drip",
        startDate: "2026-06-11T00:00:00.000Z",
        status: "active",
      }),
    });
    const dataCamp1 = await resCamp1.json();
    assert(
      resCamp1.status === 201 && dataCamp1.data?.campaignCode?.startsWith("#CAM"),
      `2.2 Created campaign with auto code (${dataCamp1.data?.campaignCode})`
    );
    campaign1Id = dataCamp1.data?.id;

    // 2.3 Create Second Campaign (Completed status)
    const resCamp2 = await fetch(`${baseUrl}/api/campaigns`, {
      method: "POST",
      headers: headersAlpha,
      body: JSON.stringify({
        name: "Product Launch Q3",
        campaignType: "Brand Awareness",
        channel: "Social Media",
        budget: 25000,
        spent: 12400,
        currency: "USD",
        period: "Weeks",
        periodValue: 6,
        targetAudience: "Leads",
        description: "Q3 flagship product announcement",
        startDate: "2026-06-05T00:00:00.000Z",
        status: "completed",
      }),
    });
    const dataCamp2 = await resCamp2.json();
    assert(resCamp2.status === 201 && dataCamp2.data?.id, "2.3 Created second campaign (Completed status)");
    campaign2Id = dataCamp2.data?.id;

    // 2.4 List Campaigns and verify statistics
    const resCampList = await fetch(`${baseUrl}/api/campaigns`, {
      headers: headersAlpha,
    });
    const dataCampList = await resCampList.json();
    assert(
      dataCampList.stats?.total === 2 &&
      dataCampList.stats?.active === 1 &&
      dataCampList.stats?.completed === 1 &&
      dataCampList.stats?.totalBudget === 40000 &&
      dataCampList.stats?.totalSpent === 20600,
      "2.4 Returns exact aggregated statistics (budget, spent, counts)",
      dataCampList.stats
    );

    // 2.5 Filter campaigns by active tab
    const resActiveTab = await fetch(`${baseUrl}/api/campaigns?status=active`, {
      headers: headersAlpha,
    });
    const dataActiveTab = await resActiveTab.json();
    assert(
      dataActiveTab.data.length === 1 && dataActiveTab.data[0].name === "Summer Sale 2026",
      "2.5 Filters campaigns correctly by 'active' status tab"
    );

    // 2.6 Tenant Isolation: Tenant Beta gets 0 campaigns
    const resBetaCamp = await fetch(`${baseUrl}/api/campaigns`, {
      headers: headersBeta,
    });
    const dataBetaCamp = await resBetaCamp.json();
    assert(
      dataBetaCamp.data.length === 0 && dataBetaCamp.stats?.total === 0,
      "2.6 Tenant Beta receives 0 campaigns and 0 stats (tenant isolation)"
    );

    // 2.7 Update campaign status to 'archived'
    const resArchive = await fetch(`${baseUrl}/api/campaigns/${campaign1Id}/status`, {
      method: "PATCH",
      headers: headersAlpha,
      body: JSON.stringify({ status: "archived" }),
    });
    const dataArchive = await resArchive.json();
    assert(
      resArchive.status === 200 && dataArchive.data?.status === "archived",
      "2.7 Successfully transitioned campaign status to 'archived'"
    );

    // 2.8 Unarchive campaign back to 'active'
    const resUnarchive = await fetch(`${baseUrl}/api/campaigns/${campaign1Id}/status`, {
      method: "PATCH",
      headers: headersAlpha,
      body: JSON.stringify({ status: "active" }),
    });
    const dataUnarchive = await resUnarchive.json();
    assert(
      resUnarchive.status === 200 && dataUnarchive.data?.status === "active",
      "2.8 Successfully unarchived campaign back to 'active'"
    );

    // 2.9 Delete campaign
    const resDelCamp = await fetch(`${baseUrl}/api/campaigns/${campaign2Id}`, {
      method: "DELETE",
      headers: headersAlpha,
    });
    assert(resDelCamp.status === 200, "2.9 Successfully deleted campaign");

    // 2.10 Cross-tenant delete is blocked
    const resCrossDel = await fetch(`${baseUrl}/api/campaigns/${campaign1Id}`, {
      method: "DELETE",
      headers: headersBeta,
    });
    assert(resCrossDel.status === 404, "2.10 Cross-tenant deletion blocked with 404");

  } finally {
    console.log("\n▶ [Teardown] Cleaning up test fixtures from MySQL...");
    try {
      await prisma.customFieldValue.deleteMany({
        where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      });
      await prisma.customField.deleteMany({
        where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      });
      await prisma.marketingCampaign.deleteMany({
        where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      });
      await prisma.userRole.deleteMany({
        where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      });
      await prisma.profile.deleteMany({
        where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userAlphaId, userBetaId] } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantAlphaId, tenantBetaId] } },
      });
    } catch (cleanErr) {
      console.warn("Teardown cleanup warning:", cleanErr);
    }
    server.close();
  }

  console.log("\n================================================================================");
  console.log(`📊 RESULTS: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
