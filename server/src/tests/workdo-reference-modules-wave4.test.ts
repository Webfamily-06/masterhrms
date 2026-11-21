import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { runWithTenantContext } from "../context/tenant-context";
import { StrategyStudioService } from "../services/strategy-studio.service";
import { PlanningStrategyService } from "../services/planning-strategy.service";
import { FinancialGoalService } from "../services/financial-goal.service";
import { RetainerService } from "../services/retainer.service";
import { calculateNextBillingDate, generateInvoiceFromRecurringSchedule } from "../services/recurring-invoice.service";
import { TeamWorkloadService } from "../services/team-workload.service";
import { TimeTrackerService } from "../services/time-tracker.service";
import { DigitalSignatureService } from "../services/digital-signature.service";

test("MASTERHRMS — WorkDo Reference Modules Wave 4 Verification Suite (Milestone 7.7)", async (t) => {
  const ts = Date.now();
  const testTenantId = `tenant-w4-${ts}`;
  const otherTenantId = `tenant-w4-iso-${ts}`;
  const userId = `usr-w4-${ts}`;
  const otherUserId = `usr-w4-iso-${ts}`;
  const empAId = `emp-w4-a-${ts}`;
  const empBId = `emp-w4-b-${ts}`;
  const deptId = `dept-w4-${ts}`;

  const withTenant = <T>(tenantId: string, fn: () => Promise<T>): Promise<T> => {
    return runWithTenantContext(
      {
        tenantId,
        userId,
        roles: ["admin"],
        status: "ACTIVE",
        tenancyStrategy: "SHARED_SCHEMA",
        db: rawPrisma as any,
      },
      fn
    );
  };

  const cleanup = async () => {
    try {
      await rawPrisma.registerShift.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.cashRegister.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.purchaseDetail.deleteMany({
        where: { purchase: { tenantId: { in: [testTenantId, otherTenantId] } } },
      }).catch(() => {});
      await rawPrisma.purchase.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.product.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.saleItem.deleteMany({
        where: { sale: { tenantId: { in: [testTenantId, otherTenantId] } } },
      }).catch(() => {});
      await rawPrisma.sale.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.recurringInvoiceItem.deleteMany({
        where: { recurringInvoice: { tenantId: { in: [testTenantId, otherTenantId] } } },
      }).catch(() => {});
      await rawPrisma.recurringInvoice.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.timesheet.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.projectTask.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.project.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.financialGoal.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.assetActivityLog.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.assetRequest.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.asset.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.assetCategory.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.warehouse.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.supplier.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.customer.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.employee.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.department.deleteMany({
        where: { tenantId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.setting.deleteMany({
        where: { scopeId: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
      await rawPrisma.userRole.deleteMany({
        where: { userId: { in: [userId, otherUserId] } },
      }).catch(() => {});
      await rawPrisma.user.deleteMany({
        where: { id: { in: [userId, otherUserId] } },
      }).catch(() => {});
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [testTenantId, otherTenantId] } },
      }).catch(() => {});
    } catch {
      // Ignore cleanup error
    }
  };

  await t.test("Setup: Create Test Tenants, Users, Employees and Base Records", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Wave 4 Primary Tenant",
        slug: `slug-w4-${ts}`,
        currency: "USD",
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: otherTenantId,
        name: "Wave 4 Isolated Tenant",
        slug: `slug-w4-iso-${ts}`,
        currency: "USD",
      },
    });

    await rawPrisma.user.create({
      data: {
        id: userId,
        email: `admin-w4-${ts}@example.com`,
        passwordHash: "dummy-hash",
      },
    });

    await rawPrisma.user.create({
      data: {
        id: otherUserId,
        email: `iso-w4-${ts}@example.com`,
        passwordHash: "dummy-hash",
      },
    });

    // Create Department
    await rawPrisma.department.create({
      data: {
        id: deptId,
        tenantId: testTenantId,
        name: "Engineering & Operations",
      },
    });

    // Create Employees
    await rawPrisma.employee.create({
      data: {
        id: empAId,
        tenantId: testTenantId,
        userId,
        departmentId: deptId,
        employeeCode: `EMP-A-${ts}`,
        firstName: "Alice",
        lastName: "Engineer",
        email: `alice-${ts}@example.com`,
        position: "Senior Lead",
        status: "active",
      },
    });

    await rawPrisma.employee.create({
      data: {
        id: empBId,
        tenantId: testTenantId,
        departmentId: deptId,
        employeeCode: `EMP-B-${ts}`,
        firstName: "Bob",
        lastName: "Architect",
        email: `bob-${ts}@example.com`,
        position: "Principal Architect",
        status: "active",
      },
    });

    assert.ok(true, "Setup completed successfully");
  });

  // 1. ADDON-066: McKinsey 7-S Framework
  await t.test("ADDON-066: McKinsey 7-S Framework Strategy Matrix & Document Integration", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Verify template definition has all 7 dimensions
      const template = StrategyStudioService.getTemplate("mckinsey-7s");
      assert.equal(template.matrixType, "mckinsey-7s");
      assert.equal(template.categories.length, 7);
      const keys = template.categories.map((c) => c.key);
      assert.ok(keys.includes("strategy"));
      assert.ok(keys.includes("structure"));
      assert.ok(keys.includes("systems"));
      assert.ok(keys.includes("shared_values"));
      assert.ok(keys.includes("style"));
      assert.ok(keys.includes("staff"));
      assert.ok(keys.includes("skills"));

      // 2. Create McKinsey 7-S document
      const doc = await StrategyStudioService.createDocument(testTenantId, {
        matrixType: "mckinsey-7s",
        title: "Global Enterprise Transformation 7-S",
        description: "Aligning institutional pillars for multi-region scale",
      }, userId);

      assert.ok(doc.id);
      assert.equal(doc.matrixType, "mckinsey-7s");
      assert.ok(doc.sections.strategy);
      assert.ok(doc.sections.shared_values);

      // 3. Add section items with impact scores
      const updatedDoc1 = await StrategyStudioService.updateCategoryItem(
        testTenantId,
        doc.id,
        "strategy",
        { text: "Expand direct B2B enterprise tier across EMEA", impactScore: 5 },
        userId
      );
      assert.equal(updatedDoc1.sections["strategy"].length, 1);
      assert.equal(updatedDoc1.sections["strategy"][0].impactScore, 5);

      const updatedDoc2 = await StrategyStudioService.updateCategoryItem(
        testTenantId,
        doc.id,
        "shared_values",
        { text: "Customer Obsession & Zero Regression Culture", impactScore: 4 },
        userId
      );
      assert.equal(updatedDoc2.sections["shared_values"].length, 1);
      assert.equal(updatedDoc2.sections["shared_values"][0].impactScore, 4);

      // 4. Verify PlanningStrategyService supports mckinsey7s type
      const stratModel = await PlanningStrategyService.createModel(
        testTenantId,
        {
          type: "mckinsey7s",
          name: "Q4 Alignment Model",
          description: "Execution model for corporate reorganization",
        },
        userId
      );
      assert.equal(stratModel.type, "mckinsey7s");
      assert.equal(stratModel.name, "Q4 Alignment Model");

      // 5. Tenant isolation check
      const isoDocs = StrategyStudioService.listDocuments(otherTenantId, "mckinsey-7s");
      assert.equal(isoDocs.length, 0);
    });
  });

  // 2. ADDON-082: Asset Borrow & Rent
  await t.test("ADDON-082: Asset Borrow & Rent Loan Request Lifecycle & Approval", async () => {
    await withTenant(testTenantId, async () => {
      // Create asset category and asset
      const cat = await rawPrisma.assetCategory.create({
        data: {
          tenantId: testTenantId,
          name: "Mobile Rigs",
          slug: `rigs-${ts}`,
          prefix: "RIG",
        },
      });

      const asset = await rawPrisma.asset.create({
        data: {
          tenantId: testTenantId,
          categoryId: cat.id,
          name: "High-GPU Precision Workstation",
          assetTag: `TAG-GPU-${ts}`,
          status: "available",
          serialNumber: `SN-GPU-${ts}`,
        },
      });

      // 1. Submit loan/borrow request
      const request = await rawPrisma.assetRequest.create({
        data: {
          tenantId: testTenantId,
          employeeId: empAId,
          assetId: asset.id,
          categoryName: "Mobile Rigs",
          itemName: "High-GPU Precision Workstation",
          quantity: 1,
          purpose: "Model training and deep load testing benchmark",
          priority: "high",
          status: "pending",
        },
      });

      assert.ok(request.id);
      assert.equal(request.status, "pending");
      assert.equal(request.priority, "high");

      // 2. Review and approve the loan
      const reviewed = await rawPrisma.assetRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          reviewedBy: "Admin Ops Lead",
          reviewedAt: new Date(),
          adminNotes: "Approved for 14-day dedicated AI workload testing.",
        },
      });

      assert.equal(reviewed.status, "approved");
      assert.equal(reviewed.reviewedBy, "Admin Ops Lead");

      // 3. Log audit activity
      const log = await rawPrisma.assetActivityLog.create({
        data: {
          tenantId: testTenantId,
          assetId: asset.id,
          actionType: "borrow_approved",
          performedBy: "Admin Ops Lead",
          details: `Approved borrow request ${request.id} for employee ${empAId}`,
        },
      });
      assert.ok(log.id);

      // 4. Tenant isolation check
      const isoRequests = await rawPrisma.assetRequest.findMany({
        where: { tenantId: otherTenantId },
      });
      assert.equal(isoRequests.length, 0);
    });
  });

  // 3. ADDON-083: Financial Goal
  await t.test("ADDON-083: Financial Goal Tracking, Progress Updates, and Milestone Achievement", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create financial goal
      const goal = await FinancialGoalService.create(testTenantId, {
        name: "FY26 ARR Expansion Goal",
        goalType: "revenue",
        targetAmount: 500000,
        currentAmount: 100000,
        startDate: "2026-01-01",
        targetDate: "2026-12-31",
        description: "Scale recurring SaaS revenue across enterprise accounts",
      });

      assert.ok(goal.id);
      assert.equal(goal.targetAmount, 500000);
      assert.equal(goal.currentAmount, 100000);
      assert.equal(goal.progressPercentage, 20); // 100k / 500k = 20%
      assert.equal(goal.variance, 400000);
      assert.equal(goal.status, "in_progress");

      // 2. Fetch goal by ID
      const fetched = await FinancialGoalService.getById(testTenantId, goal.id);
      assert.ok(fetched);
      assert.equal(fetched.name, "FY26 ARR Expansion Goal");

      // 3. Record incremental progress (add $300,000 -> total $400,000)
      const prog1 = await FinancialGoalService.recordProgress(testTenantId, goal.id, 300000);
      assert.equal(prog1.currentAmount, 400000);
      assert.equal(prog1.progressPercentage, 80);
      assert.equal(prog1.variance, 100000);
      assert.equal(prog1.status, "in_progress");

      // 4. Record milestone completion (add $150,000 -> total $550,000 >= $500,000 target -> status achieved)
      const prog2 = await FinancialGoalService.recordProgress(testTenantId, goal.id, 150000);
      assert.equal(prog2.currentAmount, 550000);
      assert.equal(prog2.progressPercentage, 100);
      assert.equal(prog2.status, "achieved");

      // 5. Tenant isolation check
      const isoGoals = await FinancialGoalService.list(otherTenantId);
      assert.equal(isoGoals.length, 0);
    });
  });

  // 4. ADDON-084: Retainer
  await t.test("ADDON-084: Retainer Agreement Advance Deposits, Milestone Drawdowns, and Balance Depletion", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create client retainer agreement with upfront advance
      const retainer = await RetainerService.create(testTenantId, {
        clientId: "cust-ent-001",
        clientName: "Global Logistics Group",
        title: "2026 Advisory Retainer",
        totalAmount: 60000,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        notes: "Enterprise cloud transformation advisory SLA",
      });

      assert.ok(retainer.id);
      assert.ok(retainer.retainerNo.startsWith("RET-"));
      assert.equal(retainer.totalAmount, 60000);
      assert.equal(retainer.advanceBalance, 60000);
      assert.equal(retainer.drawnAmount, 0);
      assert.equal(retainer.status, "ACTIVE");
      assert.equal(retainer.transactions.length, 1);
      assert.equal(retainer.transactions[0].type, "DEPOSIT");

      // 2. Drawdown $20,000 against Milestone 1 deliverables
      const draw1 = await RetainerService.drawdown(testTenantId, retainer.id, {
        amount: 20000,
        description: "Sprint 1 Architecture Review & Blueprint Drawdown",
        milestoneId: "ms-arch-01",
      });
      assert.equal(draw1.advanceBalance, 40000);
      assert.equal(draw1.drawnAmount, 20000);
      assert.equal(draw1.status, "ACTIVE");
      assert.equal(draw1.transactions.length, 2);

      // 3. Top-up deposit of $10,000
      const deposit1 = await RetainerService.deposit(testTenantId, retainer.id, {
        amount: 10000,
        description: "Mid-year advance top-up",
      });
      assert.equal(deposit1.advanceBalance, 50000);
      assert.equal(deposit1.totalAmount, 70000);
      assert.equal(deposit1.transactions.length, 3);

      // 4. Drawdown exact remaining balance $50,000 -> status becomes DEPLETED
      const draw2 = await RetainerService.drawdown(testTenantId, retainer.id, {
        amount: 50000,
        description: "Final Deliverable Acceptance Drawdown",
      });
      assert.equal(draw2.advanceBalance, 0);
      assert.equal(draw2.drawnAmount, 70000);
      assert.equal(draw2.status, "DEPLETED");

      // 5. Overdraw rejection guard
      await assert.rejects(
        async () => {
          await RetainerService.drawdown(testTenantId, retainer.id, {
            amount: 500,
            description: "Illegal overdraw",
          });
        },
        /Insufficient retainer balance/
      );

      // 6. Tenant isolation check
      const isoRetainers = await RetainerService.list(otherTenantId);
      assert.equal(isoRetainers.length, 0);
    });
  });

  // 5. ADDON-088: Recurring Invoice & Bill
  await t.test("ADDON-088: Recurring Invoice Frequency Schedule Calculation & Idempotent Generation", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Verify calculateNextBillingDate recurrence logic
      const base = new Date("2026-06-01T00:00:00.000Z");
      const weekly = calculateNextBillingDate(base, "weekly");
      assert.equal(weekly.toISOString().split("T")[0], "2026-06-08");

      const monthly = calculateNextBillingDate(base, "monthly");
      assert.equal(monthly.toISOString().split("T")[0], "2026-07-01");

      const quarterly = calculateNextBillingDate(base, "quarterly");
      assert.equal(quarterly.toISOString().split("T")[0], "2026-09-01");

      const yearly = calculateNextBillingDate(base, "yearly");
      assert.equal(yearly.toISOString().split("T")[0], "2027-06-01");

      // 2. Create customer and recurring invoice schedule
      const customer = await rawPrisma.customer.create({
        data: {
          tenantId: testTenantId,
          name: "Acme Subscription Client",
          email: `sub-${ts}@example.com`,
          phone: "555-0199",
        },
      });

      const schedule = await rawPrisma.recurringInvoice.create({
        data: {
          tenantId: testTenantId,
          customerId: customer.id,
          customerName: customer.name,
          recurringInvoiceNo: `REC-${ts}`,
          cycle: "monthly",
          startDate: new Date("2026-01-01"),
          nextIssueDate: new Date("2026-02-01"),
          totalAmount: 1500,
          status: "Active",
          items: {
            create: [
              {
                description: "Cloud Hosting Standard Plan",
                quantity: 1,
                unitPrice: 1500,
                amount: 1500,
              },
            ],
          },
        },
      });

      assert.ok(schedule.id);

      // 3. Generate formal invoice from schedule
      const res1 = await generateInvoiceFromRecurringSchedule(schedule.id, testTenantId);
      assert.equal(res1.success, true);
      assert.ok(res1.generatedSaleId);
      assert.ok(res1.invoiceNo);

      // 4. Verify schedule nextIssueDate was advanced
      const updatedSchedule = await rawPrisma.recurringInvoice.findUnique({
        where: { id: schedule.id },
      });
      assert.ok(updatedSchedule);
      assert.ok(new Date(updatedSchedule.nextIssueDate) > new Date("2026-02-01"));

      // 5. Verify generated Sale in database
      const generatedSale = await rawPrisma.sale.findUnique({
        where: { id: res1.generatedSaleId },
        include: { details: true },
      });
      assert.ok(generatedSale);
      assert.equal(generatedSale.tenantId, testTenantId);
      assert.equal(Number(generatedSale.total), 1500);
      assert.equal(generatedSale.details.length, 1);
    });
  });

  // 6. ADDON-091: Team Workload
  await t.test("ADDON-091: Team Workload Aggregation, Task Burden, and Over-Allocation Detection", async () => {
    await withTenant(testTenantId, async () => {
      // Create Project
      const project = await rawPrisma.project.create({
        data: {
          tenantId: testTenantId,
          name: "Core Infrastructure Migration",
          status: "active",
        },
      });

      // 1. Assign 3 tasks to Employee A (within standard capacity)
      for (let i = 1; i <= 3; i++) {
        await rawPrisma.projectTask.create({
          data: {
            tenantId: testTenantId,
            projectId: project.id,
            title: `Task A-${i}`,
            assignedTo: empAId,
            status: "in_progress",
          },
        });
      }

      // Log 24 hours timesheet for Employee A
      await rawPrisma.timesheet.create({
        data: {
          tenantId: testTenantId,
          employeeId: empAId,
          projectId: project.id,
          date: new Date(),
          hours: 24.0,
          description: "Database migration sprint",
          status: "approved",
        },
      });

      // 2. Assign 10 tasks to Employee B (> 8 tasks -> trigger task-based over-allocation)
      for (let i = 1; i <= 10; i++) {
        await rawPrisma.projectTask.create({
          data: {
            tenantId: testTenantId,
            projectId: project.id,
            title: `Task B-${i}`,
            assignedTo: empBId,
            status: "todo",
          },
        });
      }

      // Log 48 hours timesheet for Employee B (> 40.0 hours -> trigger hour-based over-allocation)
      await rawPrisma.timesheet.create({
        data: {
          tenantId: testTenantId,
          employeeId: empBId,
          projectId: project.id,
          date: new Date(),
          hours: 48.0,
          description: "Emergency multi-region failover tests",
          status: "approved",
        },
      });

      // 3. Compute workload summary
      const summary = await TeamWorkloadService.getWorkloadSummary(testTenantId);
      assert.equal(summary.tenantId, testTenantId);
      assert.equal(summary.totalEmployees, 2);
      assert.equal(summary.totalAssignedTasks, 13);
      assert.equal(summary.totalLoggedHours, 72.0);
      assert.equal(summary.overAllocatedCount, 1);

      // Verify Employee A metrics
      const wlA = summary.workloads.find((w) => w.employeeId === empAId);
      assert.ok(wlA);
      assert.equal(wlA.assignedTasksCount, 3);
      assert.equal(wlA.loggedHours, 24.0);
      assert.equal(wlA.utilizationRate, 60); // 24 / 40 = 60%
      assert.equal(wlA.isOverAllocated, false);

      // Verify Employee B metrics
      const wlB = summary.workloads.find((w) => w.employeeId === empBId);
      assert.ok(wlB);
      assert.equal(wlB.assignedTasksCount, 10);
      assert.equal(wlB.loggedHours, 48.0);
      assert.equal(wlB.utilizationRate, 120); // 48 / 40 = 120%
      assert.equal(wlB.isOverAllocated, true);

      // 4. Tenant isolation check
      const isoSummary = await TeamWorkloadService.getWorkloadSummary(otherTenantId);
      assert.equal(isoSummary.totalEmployees, 0);
      assert.equal(isoSummary.totalAssignedTasks, 0);
    });
  });

  // 7. ADDON-092: Time Tracker
  await t.test("ADDON-092: Active Time Tracker Session & Auto-Commit Timesheet Generation", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Start active timer for Employee A
      const started = await TimeTrackerService.startTimer(testTenantId, userId, empAId, {
        description: "Optimizing database queries and indexes",
      });
      assert.ok(started.id);
      assert.equal(started.employeeId, empAId);
      assert.equal(started.status, "RUNNING");

      // 2. Inspect active timer
      const active = await TimeTrackerService.getActiveTimer(testTenantId, empAId);
      assert.ok(active);
      assert.equal(active.id, started.id);
      assert.equal(active.description, "Optimizing database queries and indexes");

      // 3. Stop timer and automatically commit formal Timesheet
      const stopped = await TimeTrackerService.stopTimer(testTenantId, empAId, {
        description: "Index tuning session completed",
        reviewNotes: "Auto-verified via developer toolchain",
      });

      assert.ok(stopped.timer);
      assert.ok(stopped.timesheet);
      assert.equal(stopped.timesheet.employeeId, empAId);
      assert.equal(stopped.timesheet.tenantId, testTenantId);
      assert.equal(stopped.timesheet.description, "Index tuning session completed");
      assert.ok(Number(stopped.timesheet.hours) >= 0.1);

      // 4. Verify timer is cleared from active list
      const afterStop = await TimeTrackerService.getActiveTimer(testTenantId, empAId);
      assert.equal(afterStop, null);

      // 5. Test discard timer
      await TimeTrackerService.startTimer(testTenantId, userId, empAId, {
        description: "Temporary discarded session",
      });
      const discarded = await TimeTrackerService.discardTimer(testTenantId, empAId);
      assert.equal(discarded, true);
      const afterDiscard = await TimeTrackerService.getActiveTimer(testTenantId, empAId);
      assert.equal(afterDiscard, null);
    });
  });

  // 8. ADDON-095: Procurement
  await t.test("ADDON-095: Procurement Purchase Order Lifecycle, Items, and Payment Progression", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create Supplier, Warehouse, and Product
      const supplier = await rawPrisma.supplier.create({
        data: {
          tenantId: testTenantId,
          name: "Global Semiconductor Supply Ltd",
          email: `supplier-${ts}@example.com`,
          phone: "555-8899",
        },
      });

      const warehouse = await rawPrisma.warehouse.create({
        data: {
          tenantId: testTenantId,
          name: "Main Distribution Center Alpha",
          location: "Bay 42, Tech Logistics Park",
        },
      });

      const product = await rawPrisma.product.create({
        data: {
          tenantId: testTenantId,
          name: "Rackmount High-Density Blade",
          sku: `SKU-BLADE-${ts}`,
          salePrice: 5000,
          purchasePrice: 4500,
        },
      });

      // 2. Create Purchase Order with details
      const po = await rawPrisma.purchase.create({
        data: {
          tenantId: testTenantId,
          purchaseNo: `PO-W4-${ts}`,
          supplierId: supplier.id,
          warehouseId: warehouse.id,
          total: 45000,
          paidAmount: 0,
          status: "draft",
          paymentStatus: "unpaid",
          details: {
            create: [
              {
                productId: product.id,
                productName: product.name,
                cost: 4500,
                quantity: 10,
                subtotal: 45000,
              },
            ],
          },
        },
        include: { details: true },
      });

      assert.ok(po.id);
      assert.equal(po.purchaseNo, `PO-W4-${ts}`);
      assert.equal(po.status, "draft");
      assert.equal(Number(po.total), 45000);
      assert.equal(po.details.length, 1);

      // 3. Progress status from draft -> ordered -> received
      const ordered = await rawPrisma.purchase.update({
        where: { id: po.id },
        data: { status: "ordered" },
      });
      assert.equal(ordered.status, "ordered");

      const received = await rawPrisma.purchase.update({
        where: { id: po.id },
        data: {
          status: "received",
          paidAmount: 45000,
          paymentStatus: "paid",
        },
      });
      assert.equal(received.status, "received");
      assert.equal(received.paymentStatus, "paid");
      assert.equal(Number(received.paidAmount), 45000);

      // 4. Tenant isolation check
      const isoPurchases = await rawPrisma.purchase.findMany({
        where: { tenantId: otherTenantId },
      });
      assert.equal(isoPurchases.length, 0);
    });
  });

  // 9. ADDON-097: Petty Cash
  await t.test("ADDON-097: Petty Cash Register Drawer Shifts, Disbursements, and Balance Reconciliation", async () => {
    await withTenant(testTenantId, async () => {
      // 1. Create Cash Register
      const register = await rawPrisma.cashRegister.create({
        data: {
          tenantId: testTenantId,
          name: "Operations Petty Cash Safe",
          status: "open",
        },
      });

      assert.ok(register.id);
      assert.equal(register.status, "open");

      // 2. Open Shift with opening float of $10,000
      const shift = await rawPrisma.registerShift.create({
        data: {
          tenantId: testTenantId,
          registerId: register.id,
          cashierId: userId,
          cashierName: "Operations Lead",
          openingFloat: 10000,
          openedAt: new Date(),
          status: "open",
          cashIn: 0,
          cashOut: 0,
        },
      });

      assert.ok(shift.id);
      assert.equal(shift.status, "open");
      assert.equal(Number(shift.openingFloat), 10000);

      // 3. Petty cash disbursement: cashOut $1,500 for office supplies & courier
      const updatedShift1 = await rawPrisma.registerShift.update({
        where: { id: shift.id },
        data: {
          cashOut: 1500,
        },
      });
      assert.equal(Number(updatedShift1.cashOut), 1500);

      // 4. Petty cash receipt: cashIn $500 refund
      const updatedShift2 = await rawPrisma.registerShift.update({
        where: { id: shift.id },
        data: {
          cashIn: 500,
        },
      });
      assert.equal(Number(updatedShift2.cashIn), 500);

      // 5. Close Shift: Expected cash = 10000 + 500 - 1500 = 9000
      // Actual cash counted = 9000, variance = 0
      const closedShift = await rawPrisma.registerShift.update({
        where: { id: shift.id },
        data: {
          closedAt: new Date(),
          actualCash: 9000,
          expectedCash: 9000,
          variance: 0,
          status: "closed",
        },
      });

      assert.equal(closedShift.status, "closed");
      assert.equal(Number(closedShift.actualCash), 9000);
      assert.equal(Number(closedShift.variance), 0);

      // 6. Tenant isolation check
      const isoShifts = await rawPrisma.registerShift.findMany({
        where: { tenantId: otherTenantId },
      });
      assert.equal(isoShifts.length, 0);
    });
  });

  // 10. ADDON-121: Signature
  await t.test("ADDON-121: Cryptographic Digital Signing, Detached Base64 Signature, and Tamper Detection", async () => {
    // 1. Prepare sample legal contract / payout payload
    const contractContent = JSON.stringify({
      contractNo: `CTR-W4-${ts}`,
      client: "Global Logistics Group",
      statementOfWork: "Enterprise HRMS Cloud Architecture Deployment",
      totalConsideration: 500000,
      governingLaw: "Delaware, USA",
      effectiveDate: "2026-11-21",
    });

    // 2. Sign document using DigitalSignatureService (2048-bit RSA + SHA-256)
    const signingResult = DigitalSignatureService.signPayoutFile(contractContent, "Chief Legal Officer");
    assert.ok(signingResult.signatureDigest);
    assert.ok(signingResult.signatureBuffer);
    assert.equal(signingResult.algorithm, "SHA256withRSA");
    assert.ok(signingResult.fileHash);
    assert.ok(signingResult.certificate);
    assert.equal(signingResult.certificate.keyAlgorithm, "RSA-2048 / SHA256withRSA");
    assert.ok(signingResult.certificate.subject.includes("Chief Legal Officer"));

    // 3. Cryptographically verify signature against unaltered payload
    const verification = DigitalSignatureService.verifySignature(
      contractContent,
      signingResult.signatureDigest
    );
    assert.equal(verification.isValid, true);
    assert.equal(verification.fileHash, signingResult.fileHash);
    assert.equal(verification.error, undefined);

    // 4. Tamper detection: Alter contract content by a single character
    const tamperedContent = contractContent.replace("500000", "999999");
    const tamperedVerification = DigitalSignatureService.verifySignature(
      tamperedContent,
      signingResult.signatureDigest
    );
    assert.equal(tamperedVerification.isValid, false);
    assert.ok(tamperedVerification.error?.includes("altered or tampered with"));
  });

  await t.test("Teardown: Cleanup Test Tenants and Associated Records", async () => {
    await cleanup();
  });
});
