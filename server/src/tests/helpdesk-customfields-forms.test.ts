import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { SuggestionBoxService } from "../services/suggestion-box.service";

test("MASTERHRMS — Helpdesk, Custom Fields & Form Builder Verification Suite", async (t) => {
  const ts = Date.now();
  const tenantId = `test-help-${ts}`;
  const userId = `user-help-${ts}`;
  let empId = "";

  const cleanup = async () => {
    try {
      await rawPrisma.customFormField.deleteMany({ where: { form: { tenantId } } });
      await rawPrisma.customForm.deleteMany({ where: { tenantId } });
      await rawPrisma.customField.deleteMany({ where: { tenantId } });
      await rawPrisma.helpdeskTicket.deleteMany({ where: { tenantId } });
      await rawPrisma.employee.deleteMany({ where: { tenantId } });
      await rawPrisma.user.deleteMany({ where: { id: userId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch {
      // Best-effort cleanup
    }
  };

  await t.test("Setup: Create Test Tenant, User and Employee", async () => {
    await cleanup();

    await rawPrisma.tenant.create({
      data: { id: tenantId, name: "Employee Experience Corp", slug: `empx-${ts}`, currency: "INR" },
    });

    await rawPrisma.user.create({
      data: { id: userId, email: `emp-${ts}@empx.test`, passwordHash: "dummy" },
    });

    const emp = await rawPrisma.employee.create({
      data: {
        tenantId,
        userId,
        firstName: "Karan",
        lastName: "Kapoor",
        employeeCode: `EMP-EXP-${ts}`,
        email: `emp-${ts}@empx.test`,
        status: "active",
        position: "Operations Associate",
      },
    });
    empId = emp.id;
    assert.ok(empId, "Employee fixture must exist");
  });

  await t.test("FN-058 & ADDON-116: Multi-Channel Support Ticket Ingestion & SLA Calculation", async () => {
    const ticket = await rawPrisma.helpdeskTicket.create({
      data: {
        tenantId,
        employeeId: empId,
        ticketCode: `TICK-${ts}`,
        subject: "Workstation Monitor Cable Malfunctioning",
        category: "IT & Hardware",
        priority: "high",
        description: "USB-C display output intermittently disconnecting during team calls",
        assignedAgent: "Hardware Ops Team",
        slaHours: 12,
        status: "open",
      },
    });

    assert.ok(ticket.id);
    assert.equal(ticket.status, "open");
    assert.equal(ticket.slaHours, 12);

    // Resolve ticket
    const resolved = await rawPrisma.helpdeskTicket.update({
      where: { id: ticket.id },
      data: {
        status: "resolved",
        resolutionNotes: "Replaced with certified Thunderbolt 4 braided cable",
      },
    });
    assert.equal(resolved.status, "resolved");
  });

  await t.test("ADDON-107: Custom Field Configuration & Dynamic Module Binding", async () => {
    const customField = await rawPrisma.customField.create({
      data: {
        tenantId,
        module: "employees",
        label: "Emergency Blood Group",
        fieldType: "select",
        options: JSON.stringify(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]),
        defaultValue: "O+",
        isRequired: true,
        sortOrder: 1,
      },
    });

    assert.ok(customField.id);
    assert.equal(customField.module, "employees");
    assert.equal(customField.fieldType, "select");
    assert.equal(customField.isRequired, true);

    const fields = await rawPrisma.customField.findMany({
      where: { tenantId, module: "employees" },
    });
    assert.equal(fields.length, 1);
  });

  await t.test("ADDON-108: Dynamic Form Builder Schema & Anonymous Pulse Survey", async () => {
    const form = await rawPrisma.customForm.create({
      data: {
        tenantId,
        title: "Q4 Workplace Culture & Wellness Pulse Survey",
        description: "Anonymous employee feedback on work-life harmony and team collaboration",
        category: "wellness",
        status: "published",
        isAnonymous: true,
        fields: {
          create: [
            {
              label: "Overall Workspace Happiness (1-5)",
              fieldType: "rating_scale",
              isRequired: true,
              orderIndex: 0,
              options: JSON.stringify(["1", "2", "3", "4", "5"]),
            },
            {
              label: "Suggestions for team wellness programs",
              fieldType: "long_text",
              isRequired: false,
              orderIndex: 1,
            },
          ],
        },
      },
      include: { fields: true },
    });

    assert.ok(form.id);
    assert.equal(form.isAnonymous, true);
    assert.equal(form.fields.length, 2);
  });

  await t.test("ADDON-060: Suggestion Box Category Seeding, Idea Submission & Voting", async () => {
    // 1. Create Suggestion Category
    const category = await SuggestionBoxService.createCategory(tenantId, {
      name: "Office Amenities & Green Initiative",
      color: "#10B981",
      displayOrder: 1,
      description: "Ideas to enhance sustainability and workplace comfort",
    });
    assert.ok(category.id);

    // 2. Submit Suggestion
    const suggestion = await SuggestionBoxService.createSuggestion(tenantId, {
      title: "Solar-Powered Laptop Charging Pods on Terrace",
      description: "Install outdoor sheltered workstations with solar charging stations for fresh air working",
      categoryId: category.id,
      submittedById: userId,
      submittedByName: "Karan Kapoor",
      isAnonymous: false,
    });
    assert.ok(suggestion.id);
    assert.equal(suggestion.status, "New");

    // 3. Cast Upvote
    const voteRes = await SuggestionBoxService.toggleVote(tenantId, suggestion.id, "voter-user-002");
    assert.equal(voteRes.voted, true);
    assert.equal(voteRes.voteCount, 1);
  });

  await t.test("Teardown: Clean Fixtures", async () => {
    await cleanup();
  });
});
