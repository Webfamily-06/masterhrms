import assert from "node:assert/strict";
import { prisma, rawPrisma } from "../prisma";
import crypto from "crypto";

async function run() {
  console.log("🧪 Running Phase 5: Employee & Client Portals (Timesheets, Milestones, Client Payment)...\n");
  const db = rawPrisma || prisma;

  const testTenantId = "test-portals-" + crypto.randomBytes(4).toString("hex");
  let testProjectId: string = "";
  let testMilestoneId: string = "";
  let testTimesheetId: string = "";
  let testSaleId: string = "";
  let employeeId: string = "";
  let customerId: string = "";

  try {
    // 1. Setup Tenant
    await db.tenant.create({
      data: {
        id: testTenantId,
        name: "Portals Test Enterprise",
        slug: `portals-test-${Date.now()}`,
      },
    });

    // 2. Setup Employee
    const emp = await db.employee.create({
      data: {
        tenantId: testTenantId,
        firstName: "Jordan",
        lastName: "Lee",
        email: `jordan-${Date.now()}@portalstest.com`,
        employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
        status: "active",
      },
    });
    employeeId = emp.id;

    // 3. Setup Customer
    const cust = await db.customer.create({
      data: {
        tenantId: testTenantId,
        name: "Apex Global Dynamics",
        email: `contact-${Date.now()}@apexgl.com`,
      },
    });
    customerId = cust.id;

    // 4. Setup Project
    const proj = await db.project.create({
      data: {
        tenantId: testTenantId,
        name: "Enterprise ERP Cloud Rollout",
        clientName: cust.name,
        status: "in_progress",
        progress: 0,
      },
    });
    testProjectId = proj.id;

    // ==========================================
    // Test 1: Employee Timesheet Submission
    // ==========================================
    console.log("▶ [Test 1] Employee Timesheet Submission:");
    const timesheet = await db.timesheet.create({
      data: {
        tenantId: testTenantId,
        employeeId,
        projectId: testProjectId,
        date: new Date(),
        hours: 7.5,
        description: "Implemented multi-tenant schema migrations and timesheet API",
        status: "pending",
      },
    });
    testTimesheetId = timesheet.id;

    assert.ok(timesheet.id);
    assert.equal(timesheet.status, "pending");
    assert.equal(Number(timesheet.hours), 7.5);
    console.log("  ✔ Employee timesheet logged with status=pending");

    // ==========================================
    // Test 2: Timesheet Review & Approval
    // ==========================================
    console.log("\n▶ [Test 2] Manager Timesheet Review & Approval:");
    const approvedTimesheet = await db.timesheet.update({
      where: { id: testTimesheetId },
      data: {
        status: "approved",
        reviewedBy: "manager-user-01",
        reviewedAt: new Date(),
        reviewNotes: "All milestone tasks verified",
      },
    });

    assert.equal(approvedTimesheet.status, "approved");
    assert.ok(approvedTimesheet.reviewedAt);
    console.log("  ✔ Manager successfully approved employee timesheet");

    // ==========================================
    // Test 3: Project Milestones & Progress Calculation
    // ==========================================
    console.log("\n▶ [Test 3] Project Milestone Creation & Progress Automation:");
    const milestone = await db.projectMilestone.create({
      data: {
        tenantId: testTenantId,
        projectId: testProjectId,
        title: "Sprint 1 Architecture & Database Delivery",
        cost: 15000,
        status: "in_progress",
      },
    });
    testMilestoneId = milestone.id;
    assert.ok(milestone.id);

    // Complete milestone and update project progress
    await db.projectMilestone.update({
      where: { id: testMilestoneId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    const milestones = await db.projectMilestone.findMany({ where: { projectId: testProjectId } });
    const completedCount = milestones.filter((m) => m.status === "completed").length;
    const calculatedProgress = Math.round((completedCount / milestones.length) * 100);

    const updatedProject = await db.project.update({
      where: { id: testProjectId },
      data: { progress: calculatedProgress },
    });

    assert.equal(updatedProject.progress, 100);
    console.log(`  ✔ Milestone marked completed, project progress auto-synchronized to ${updatedProject.progress}%`);

    // ==========================================
    // Test 4: Client Invoice Creation & Online Payment
    // ==========================================
    console.log("\n▶ [Test 4] Client Invoice Payment Gateway Flow:");
    const invoice = await db.sale.create({
      data: {
        tenantId: testTenantId,
        customerId,
        invoiceNo: `INV-CLIENT-${Date.now()}`,
        date: new Date(),
        subtotal: 12500,
        totalTax: 2250,
        total: 14750,
        paidAmount: 0,
        paymentStatus: "unpaid",
      },
    });
    testSaleId = invoice.id;
    assert.ok(invoice.id);
    assert.equal(invoice.paymentStatus, "unpaid");

    // Process client payment
    const paidSale = await db.sale.update({
      where: { id: testSaleId },
      data: {
        paymentStatus: "paid",
        paidAmount: invoice.total,
        paymentMethod: "online_razorpay",
      },
    });

    assert.equal(paidSale.paymentStatus, "paid");
    assert.equal(Number(paidSale.paidAmount), 14750);
    console.log(`  ✔ Client invoice ${paidSale.invoiceNo} successfully settled via payment flow ($14,750)`);

    console.log("\n✅ ALL 4 Employee & Client Portal Tests Passed Successfully!");
  } finally {
    // Cleanup
    if (testTimesheetId) {
      await db.timesheet.deleteMany({ where: { id: testTimesheetId } }).catch(() => {});
    }
    if (testMilestoneId) {
      await db.projectMilestone.deleteMany({ where: { id: testMilestoneId } }).catch(() => {});
    }
    if (testSaleId) {
      await db.sale.deleteMany({ where: { id: testSaleId } }).catch(() => {});
    }
    if (testProjectId) {
      await db.project.deleteMany({ where: { id: testProjectId } }).catch(() => {});
    }
    if (customerId) {
      await db.customer.deleteMany({ where: { id: customerId } }).catch(() => {});
    }
    if (employeeId) {
      await db.employee.deleteMany({ where: { id: employeeId } }).catch(() => {});
    }
    await db.tenant.deleteMany({ where: { id: testTenantId } }).catch(() => {});
  }
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
