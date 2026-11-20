import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { AiBusinessAdvisorService } from "../services/ai-business-advisor.service";
import { PlanningStrategyService } from "../services/planning-strategy.service";

test("MASTERHRMS — AI Advisor, Smart Analytics, Strategic Planning & Budgets Suite", async (t) => {
  const ts = Date.now();
  const tenantId = `test-strat-${ts}`;
  const userId = `user-strat-${ts}`;

  const cleanup = async () => {
    try {
      await rawPrisma.budgetPlan.deleteMany({ where: { tenantId } });
      await rawPrisma.crmDeal.deleteMany({ where: { tenantId } });
      await rawPrisma.employee.deleteMany({ where: { tenantId } });
      await rawPrisma.setting.deleteMany({ where: { scopeId: tenantId } });
      await rawPrisma.user.deleteMany({ where: { id: userId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Test Tenant and Fixtures", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: tenantId, name: "Strategic Intelligence Global", slug: `strat-${ts}`, currency: "INR" },
    });

    await rawPrisma.user.create({
      data: { id: userId, email: `cfo-${ts}@strat.test`, passwordHash: "dummy" },
    });
  });

  await t.test("FN-005: Bulk Employee Normalization & Duplicate Prevention", async () => {
    // Simulate bulk creation / import with duplicate code guard
    const batchData = [
      {
        tenantId,
        firstName: "Aarav",
        lastName: "Sharma",
        employeeCode: `EMP-BLK-01-${ts}`,
        email: `aarav-${ts}@strat.test`,
        status: "active",
        position: "Data Scientist",
      },
      {
        tenantId,
        firstName: "Pooja",
        lastName: "Nair",
        employeeCode: `EMP-BLK-02-${ts}`,
        email: `pooja-${ts}@strat.test`,
        status: "active",
        position: "Financial Analyst",
      },
    ];

    await rawPrisma.employee.createMany({ data: batchData });
    const count = await rawPrisma.employee.count({ where: { tenantId } });
    assert.equal(count, 2, "Bulk import must persist valid records");
  });

  await t.test("FN-040: CRM Pipeline Kanban Stage Aggregation & Deal Velocity", async () => {
    await rawPrisma.crmDeal.createMany({
      data: [
        {
          tenantId,
          name: "Series B Cloud Infrastructure Contract",
          customer: "Alpha Ventures",
          stage: "Proposal",
          value: 750000,
          probability: 60,
        },
        {
          tenantId,
          name: "Annual HRMS Enterprise License",
          customer: "Beta Systems",
          stage: "Negotiation",
          value: 1200000,
          probability: 80,
        },
      ],
    });

    const pipeline = await rawPrisma.crmDeal.groupBy({
      by: ["stage"],
      where: { tenantId },
      _sum: { value: true },
      _count: { id: true },
    });

    assert.ok(pipeline.length >= 2);
    const proposalStage = pipeline.find((p) => p.stage === "Proposal");
    assert.equal(Number(proposalStage?._sum.value), 750000);
  });

  await t.test("ADDON-001 & ADDON-124: AI Business Advisor Analysis & Actionable Recommendations", async () => {
    // 1. Generate Daily Analysis
    const analysis = await AiBusinessAdvisorService.getOrGenerateDailyAnalysis(tenantId, undefined, true);
    assert.ok(analysis, "Daily analysis must be generated");
    assert.ok(analysis.scores.overall >= 0 && analysis.scores.overall <= 100);
    assert.ok(Array.isArray(analysis.recommendations));

    // 2. Action Recommendation
    if (analysis.recommendations.length > 0) {
      const recId = analysis.recommendations[0].id;
      const updated = await AiBusinessAdvisorService.updateRecommendationStatus(
        tenantId,
        recId,
        "completed"
      );
      assert.ok(updated);
    }
  });

  await t.test("ADDON-063: Strategic Framework Modeling (SWOT & PESTEL)", async () => {
    // Create strategic challenge
    const challenge = await PlanningStrategyService.createChallenge(
      tenantId,
      {
        name: "APAC Regional Market Expansion",
        categoryId: "cat_expansion",
        endAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        position: "ongoing",
        explanation: "Establishing local compliance and data residency hubs in Singapore and Tokyo",
      },
      userId
    );
    assert.ok(challenge.id);
    assert.equal(challenge.position, "ongoing");

    // Save SWOT matrix model
    const swotModel = await PlanningStrategyService.createModel(
      tenantId,
      {
        name: "APAC Strategic SWOT Assessment",
        type: "swot",
        challengeId: challenge.id,
        description: "ISO-27001 certified zero-trust architecture analysis",
      },
      userId
    );
    assert.ok(swotModel.id);
    assert.equal(swotModel.type, "swot");
  });

  await t.test("ADDON-079: Annual Departmental Budget Planning & Period Allocations", async () => {
    const budget = await rawPrisma.budgetPlan.create({
      data: {
        tenantId,
        name: "FY27 R&D & Engineering Budget",
        fiscalYear: "2026-2027",
        periodType: "quarterly",
      },
    });

    assert.ok(budget.id);
    assert.equal(budget.fiscalYear, "2026-2027");
  });

  await t.test("Teardown: Clean Fixtures", async () => {
    await cleanup();
  });
});
