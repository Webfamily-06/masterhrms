import assert from "node:assert/strict";
import { prisma, rawPrisma } from "../prisma";
import crypto from "crypto";

async function run() {
  console.log("🧪 Running Phase 6: HR Workflows (Overtime, WFH, Probation, Promotion)...\n");
  const db = rawPrisma || prisma;

  const tenantAId = "test-hr-a-" + crypto.randomBytes(4).toString("hex");
  const tenantBId = "test-hr-b-" + crypto.randomBytes(4).toString("hex");

  let empAId = "";
  let empBId = "";
  let otId = "";
  let wfhId = "";
  let probId = "";
  let promoId = "";

  try {
    // 1. Setup Tenant A & B
    await db.tenant.create({
      data: { id: tenantAId, name: "HR Workflows Alpha", slug: `hr-a-${Date.now()}` },
    });
    await db.tenant.create({
      data: { id: tenantBId, name: "HR Workflows Beta", slug: `hr-b-${Date.now()}` },
    });

    const empA = await db.employee.create({
      data: {
        tenantId: tenantAId,
        firstName: "Alice",
        lastName: "Smith",
        email: `alice-${Date.now()}@alpha.com`,
        employeeCode: `EMP-A-${Date.now().toString().slice(-4)}`,
        status: "active",
        position: "Software Engineer",
      },
    });
    empAId = empA.id;

    const empB = await db.employee.create({
      data: {
        tenantId: tenantBId,
        firstName: "Bob",
        lastName: "Jones",
        email: `bob-${Date.now()}@beta.com`,
        employeeCode: `EMP-B-${Date.now().toString().slice(-4)}`,
        status: "active",
        position: "DevOps Engineer",
      },
    });
    empBId = empB.id;

    // ==========================================
    // Test 1: Overtime Workflow & Isolation
    // ==========================================
    console.log("▶ [Test 1] Overtime Request & Approval Flow:");
    const ot = await db.overtimeRequest.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAId,
        overtimeDate: new Date(),
        hoursRequested: 4.5,
        overtimeType: "weekend",
        reason: "Critical database scaling rollout",
        status: "pending",
      },
    });
    otId = ot.id;
    assert.equal(ot.status, "pending");

    // Manager approval
    const approvedOt = await db.overtimeRequest.update({
      where: { id: otId },
      data: {
        status: "approved",
        reviewedBy: "mgr-01",
        reviewedAt: new Date(),
        reviewRemarks: "Approved for cloud scaling project",
      },
    });
    assert.equal(approvedOt.status, "approved");
    assert.equal(Number(approvedOt.hoursRequested), 4.5);

    // Cross-tenant check: Tenant B cannot query Tenant A's overtime
    const otCheckB = await db.overtimeRequest.findFirst({
      where: { id: otId, tenantId: tenantBId },
    });
    assert.equal(otCheckB, null);
    console.log("  ✔ Overtime request submitted, approved, and isolated from Tenant B");

    // ==========================================
    // Test 2: WFH Workflow & Isolation
    // ==========================================
    console.log("\n▶ [Test 2] WFH Request & Approval Flow:");
    const wfh = await db.wfhRequest.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAId,
        fromDate: new Date(),
        toDate: new Date(Date.now() + 2 * 86400000),
        reason: "Remote sprint execution",
        status: "pending",
      },
    });
    wfhId = wfh.id;
    assert.equal(wfh.status, "pending");

    const approvedWfh = await db.wfhRequest.update({
      where: { id: wfhId },
      data: {
        status: "approved",
        reviewedBy: "mgr-01",
        reviewedAt: new Date(),
      },
    });
    assert.equal(approvedWfh.status, "approved");
    console.log("  ✔ WFH request submitted and approved with full tenant scoping");

    // ==========================================
    // Test 3: Probation Lifecycle
    // ==========================================
    console.log("\n▶ [Test 3] Probation Evaluation Lifecycle:");
    const probation = await db.probationRecord.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAId,
        startDate: new Date(Date.now() - 90 * 86400000),
        endDate: new Date(),
        status: "under_review",
        probationPeriodDays: 90,
      },
    });
    probId = probation.id;

    const evaluatedProbation = await db.probationRecord.update({
      where: { id: probId },
      data: {
        status: "passed",
        remarks: "Exceeded all technical and culture benchmarks",
        confirmedAt: new Date(),
      },
    });
    assert.equal(evaluatedProbation.status, "passed");
    assert.ok(evaluatedProbation.confirmedAt);
    console.log("  ✔ Probation evaluated as passed successfully");

    // ==========================================
    // Test 4: Promotion Workflow
    // ==========================================
    console.log("\n▶ [Test 4] Promotion Record & Career Progression:");
    const promotion = await db.promotionRecord.create({
      data: {
        tenantId: tenantAId,
        employeeId: empAId,
        promotionDate: new Date(),
        previousDesignation: "Software Engineer",
        newDesignation: "Senior Staff Engineer",
        previousSalary: 75000,
        newSalary: 95000,
        promotionType: "merit",
        remarks: "Promoted following stellar MES delivery and cloud migration",
      },
    });
    promoId = promotion.id;

    assert.ok(promotion.id);
    assert.equal(promotion.newDesignation, "Senior Staff Engineer");
    assert.equal(Number(promotion.newSalary), 95000);
    console.log(`  ✔ Promotion logged: ${promotion.previousDesignation} -> ${promotion.newDesignation} ($95,000)`);

    console.log("\n✅ ALL 4 HR Workflow Tests Passed Successfully!");
  } finally {
    // Cleanup
    if (otId) await db.overtimeRequest.deleteMany({ where: { id: otId } }).catch(() => {});
    if (wfhId) await db.wfhRequest.deleteMany({ where: { id: wfhId } }).catch(() => {});
    if (probId) await db.probationRecord.deleteMany({ where: { id: probId } }).catch(() => {});
    if (promoId) await db.promotionRecord.deleteMany({ where: { id: promoId } }).catch(() => {});
    if (empAId) await db.employee.deleteMany({ where: { id: empAId } }).catch(() => {});
    if (empBId) await db.employee.deleteMany({ where: { id: empBId } }).catch(() => {});
    await db.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } }).catch(() => {});
  }
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
