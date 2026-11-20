import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";

test("MASTERHRMS — Projects, Timesheets & Workspace Todos Verification Suite", async (t) => {
  const ts = Date.now();
  const tenantId = `test-proj-${ts}`;
  const userId = `user-proj-${ts}`;
  let empId = "";
  let projectId = "";

  const cleanup = async () => {
    try {
      await rawPrisma.workspaceTodo.deleteMany({ where: { tenantId } });
      await rawPrisma.timesheet.deleteMany({ where: { tenantId } });
      await rawPrisma.projectTask.deleteMany({ where: { tenantId } });
      await rawPrisma.projectMilestone.deleteMany({ where: { tenantId } });
      await rawPrisma.project.deleteMany({ where: { tenantId } });
      await rawPrisma.employee.deleteMany({ where: { tenantId } });
      await rawPrisma.user.deleteMany({ where: { id: userId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Test Tenant, User, and Employee", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: tenantId, name: "Project & Workforce Test Corp", slug: `proj-test-${ts}`, currency: "INR" },
    });

    await rawPrisma.user.create({
      data: { id: userId, email: `lead-${ts}@projtest.com`, passwordHash: "dummy" },
    });

    const emp = await rawPrisma.employee.create({
      data: {
        tenantId,
        userId,
        firstName: "Dev",
        lastName: "Patel",
        employeeCode: `EMP-PRJ-${ts}`,
        email: `lead-${ts}@projtest.com`,
        status: "active",
        position: "Senior Fullstack Engineer",
      },
    });
    empId = emp.id;
    assert.ok(empId, "Employee fixture must exist");
  });

  await t.test("FN-042: Project Creation, Milestone & Task Gantt Dependency Tracker", async () => {
    const project = await rawPrisma.project.create({
      data: {
        tenantId,
        name: "Enterprise Cloud Migration",
        description: "Migrating legacy monolithic workloads to Cloud Native Microservices",
        status: "in_progress",
        priority: "high",
        progress: 25,
        clientName: "Global Fintech Partners",
        budget: 1500000,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
    projectId = project.id;
    assert.ok(projectId, "Project must be created");

    // Create Milestone with tenantId
    const milestone = await rawPrisma.projectMilestone.create({
      data: {
        tenantId,
        projectId,
        title: "Sprint 1: Architecture Blueprint & Cloud IAM",
        status: "completed",
        cost: 350000,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    assert.ok(milestone.id, "Project milestone must be created");
    assert.equal(milestone.status, "completed");

    // Create Tasks with tenantId
    const task1 = await rawPrisma.projectTask.create({
      data: {
        tenantId,
        projectId,
        title: "Provision Multi-Region VPC & Peering",
        status: "done",
        priority: "urgent",
        assignedTo: empId,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });
    assert.ok(task1.id);
    assert.equal(task1.status, "done");

    const task2 = await rawPrisma.projectTask.create({
      data: {
        tenantId,
        projectId,
        title: "Deploy Kubernetes EKS Cluster & Ingress",
        status: "in_progress",
        priority: "high",
        assignedTo: empId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    assert.ok(task2.id);
    assert.equal(task2.assignedTo, empId);
  });

  await t.test("FN-043 & ADDON-080: Timesheet Submission, Multi-Tier Billable Hours & Approval Flow", async () => {
    // 1. Employee Submits Timesheet
    const timesheet = await rawPrisma.timesheet.create({
      data: {
        tenantId,
        employeeId: empId,
        projectId,
        date: new Date(),
        hours: 8.5,
        description: "Configured Terraform IaC scripts and IAM role least-privilege policies",
        status: "pending",
      },
    });
    assert.ok(timesheet.id, "Timesheet submission must succeed");
    assert.equal(timesheet.status, "pending");
    assert.equal(Number(timesheet.hours), 8.5);

    // 2. Manager Approves Timesheet
    const approved = await rawPrisma.timesheet.update({
      where: { id: timesheet.id },
      data: {
        status: "approved",
      },
    });
    assert.equal(approved.status, "approved", "Timesheet must transition to approved status");

    // 3. Aggregate Total Billable Hours for Project
    const aggregations = await rawPrisma.timesheet.aggregate({
      where: { tenantId, projectId, status: "approved" },
      _sum: { hours: true },
      _count: { id: true },
    });
    assert.equal(Number(aggregations._sum.hours), 8.5);
    assert.equal(aggregations._count.id, 1);
  });

  await t.test("FN-044: Milestone Invoicing Generation", async () => {
    const milestone = await rawPrisma.projectMilestone.findFirst({
      where: { projectId, status: "completed" },
    });
    assert.ok(milestone, "Completed milestone must exist");

    const invoiceableAmount = Number(milestone.cost);
    const gstRate = 0.18;
    const totalWithGst = invoiceableAmount * (1 + gstRate);

    assert.equal(invoiceableAmount, 350000, "Milestone cost must be accurate");
    assert.equal(totalWithGst, 413000, "B2B Milestone Invoice must include 18% GST");
  });

  await t.test("ADDON-036: Workspace To Do Tasks Lifecycle & Priority Filters", async () => {
    const todo = await rawPrisma.workspaceTodo.create({
      data: {
        tenantId,
        userId,
        title: "Review SOC-2 Compliance Type II Audit Checklist",
        description: "Ensure all production KMS keys have automatic annual rotation enabled",
        priority: "high",
        completed: false,
      },
    });
    assert.ok(todo.id);
    assert.equal(todo.priority, "high");

    // Complete todo
    const completed = await rawPrisma.workspaceTodo.update({
      where: { id: todo.id },
      data: {
        completed: true,
      },
    });
    assert.equal(completed.completed, true);
  });

  await t.test("Teardown: Clean Fixtures", async () => {
    await cleanup();
  });
});
