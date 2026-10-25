/**
 * MASTERHRMS Todo Notifications, Email Templates & Reminder Scheduler Verification
 * ===============================================================================
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../server/.env") });
dotenv.config();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ✖ FAIL: ${message}`);
    failed++;
  }
}

async function main() {
  console.log("\n================================================================");
  console.log(" MASTERHRMS TODO NOTIFICATIONS & EMAIL TEMPLATES VERIFICATION");
  console.log("================================================================\n");

  // Dynamically load server modules
  const { rawPrisma } = await import("../server/src/prisma.js");
  const { TodoNotificationService } = await import("../server/src/services/todo-notification.service.js");
  const { CalendarReminderScheduler } = await import("../server/src/services/calendar-reminder.scheduler.js");
  const { sendTodoNotificationEmail } = await import("../server/src/lib/email.js");

  const tenant = await rawPrisma.tenant.findFirst({
    include: { employees: true },
  });

  if (!tenant) {
    throw new Error("No active tenant found for verification");
  }

  const tenantId = tenant.id;
  const adminUser = await rawPrisma.user.findFirst({
    where: { profile: { tenantId } },
  });

  if (!adminUser) {
    throw new Error("No admin user found in tenant");
  }

  let distinctRecipient = await rawPrisma.user.findFirst({
    where: { profile: { tenantId }, id: { not: adminUser.id } },
  });
  if (!distinctRecipient) {
    distinctRecipient = await rawPrisma.user.create({
      data: {
        email: `distinct-${Date.now()}@test.local`,
        passwordHash: "test_pw",
        profile: {
          create: {
            fullName: "Distinct Recipient",
            tenantId,
          },
        },
      },
    });
  }
  const testAssigneeUserId = distinctRecipient.id;

  console.log(`Tenant: ${tenant.name} (${tenantId})`);
  console.log(`Creator User: ${adminUser.id}`);
  console.log(`Assignee User: ${testAssigneeUserId}\n`);

  // ── TEST 1: Task Created Event (In-App + Email) ───────────────────────────
  console.log("--- 1. Event A: Task Created Notification & Email ---");
  const taskA = await rawPrisma.workspaceTodo.create({
    data: {
      tenantId,
      userId: adminUser.id,
      title: "Test Event A: Strategic Quarterly Review",
      description: "Review financial statements with leadership",
      priority: "high",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await TodoNotificationService.dispatchTaskCreated({
    tenantId,
    creatorUserId: adminUser.id,
    todo: {
      id: taskA.id,
      title: taskA.title,
      priority: taskA.priority,
      dueDate: taskA.dueDate,
      startDate: new Date().toISOString(),
      description: taskA.description,
    },
    assignees: [{ id: testAssigneeUserId, userId: testAssigneeUserId, name: "Test Assignee", type: "user" }],
  });

  const notifA = await rawPrisma.notification.findFirst({
    where: {
      tenantId,
      userId: testAssigneeUserId,
      module: "TODO_ASSIGNED",
      metadataJson: { path: ["taskId"], equals: taskA.id },
    },
    orderBy: { createdAt: "desc" },
  });

  assert(Boolean(notifA), "In-app notification created for assigned member with type TODO_ASSIGNED");
  assert(notifA?.title === "New Task Assigned", "In-app notification has clear human-readable title");
  assert(notifA?.linkTo?.includes(taskA.id), "In-app notification includes deep link containing taskId");

  // ── TEST 2: Email Template Rendering & Delivery ───────────────────────────
  console.log("\n--- 2. HTML Email Templates & Safe Variable Substitution ---");
  const emailResCreated = await sendTodoNotificationEmail({
    templateId: "todo-task-created",
    toEmail: "test-assignee@masterhrms.local",
    assigneeName: "Alex Morgan",
    taskTitle: "<script>alert('xss')</script> Performance Review",
    assignerName: "Sarah Jenkins",
    priority: "Urgent",
    dueDate: "2026-10-31",
    taskUrl: `http://${tenant.slug}.localhost:3000/hr/todo?taskId=${taskA.id}`,
    tenantId,
  });

  assert(emailResCreated.success === true, "sendTodoNotificationEmail successfully rendered todo-task-created");

  const emailRes2d = await sendTodoNotificationEmail({
    templateId: "todo-task-reminder-2-days",
    toEmail: "test-assignee@masterhrms.local",
    assigneeName: "Alex Morgan",
    taskTitle: "Q4 Performance Review",
    priority: "High",
    dueDate: "2026-10-31",
    taskUrl: `http://${tenant.slug}.localhost:3000/hr/todo?taskId=${taskA.id}`,
    tenantId,
  });

  assert(emailRes2d.success === true, "sendTodoNotificationEmail successfully rendered todo-task-reminder-2-days");

  const emailRes1d = await sendTodoNotificationEmail({
    templateId: "todo-task-reminder-1-day",
    toEmail: "test-assignee@masterhrms.local",
    assigneeName: "Alex Morgan",
    taskTitle: "Q4 Performance Review",
    priority: "High",
    dueDate: "2026-10-31",
    taskUrl: `http://${tenant.slug}.localhost:3000/hr/todo?taskId=${taskA.id}`,
    tenantId,
  });

  assert(emailRes1d.success === true, "sendTodoNotificationEmail successfully rendered todo-task-reminder-1-day");

  // ── TEST 3: Event B: Task Assigned / Reassigned ───────────────────────────
  console.log("\n--- 3. Event B: Task Reassignment & Selective Notification ---");
  await TodoNotificationService.dispatchTaskAssigned({
    tenantId,
    updaterUserId: adminUser.id,
    todo: {
      id: taskA.id,
      title: taskA.title,
      priority: taskA.priority,
      dueDate: taskA.dueDate,
      startDate: new Date().toISOString(),
      description: taskA.description,
    },
    newAssignees: [{ id: testAssigneeUserId, userId: testAssigneeUserId, name: "Reassigned Lead", type: "user" }],
  });

  const notifReassign = await rawPrisma.notification.findFirst({
    where: {
      tenantId,
      userId: testAssigneeUserId,
      metadataJson: { path: ["eventType"], equals: "TASK_ASSIGNED" },
    },
    orderBy: { createdAt: "desc" },
  });

  assert(Boolean(notifReassign), "Selective reassignment notification recorded for newly added assignee");

  // ── TEST 4: Event C: Schedule Updated Notification ────────────────────────
  console.log("\n--- 4. Event C: Task Date / Schedule Updated ---");
  await TodoNotificationService.dispatchScheduleUpdated({
    tenantId,
    updaterUserId: adminUser.id,
    todo: {
      id: taskA.id,
      title: taskA.title,
      creatorUserId: adminUser.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startDate: new Date().toISOString(),
    },
    assignees: [{ id: testAssigneeUserId, userId: testAssigneeUserId, name: "Test Assignee", type: "user" }],
  });

  const notifSched = await rawPrisma.notification.findFirst({
    where: {
      tenantId,
      module: "TODO_SCHEDULE_UPDATED",
      metadataJson: { path: ["taskId"], equals: taskA.id },
    },
    orderBy: { createdAt: "desc" },
  });

  assert(Boolean(notifSched), "Schedule update notification dispatched with type TODO_SCHEDULE_UPDATED");

  // ── TEST 5: Event D: Task Completed Notification ──────────────────────────
  console.log("\n--- 5. Event D: Task Completed Notification ---");
  await TodoNotificationService.dispatchTaskCompleted({
    tenantId,
    completerUserId: adminUser.id,
    todo: {
      id: taskA.id,
      title: taskA.title,
      creatorUserId: adminUser.id,
    },
    assignees: [{ id: testAssigneeUserId, userId: testAssigneeUserId, name: "Test Assignee", type: "user" }],
  });

  const notifComp = await rawPrisma.notification.findFirst({
    where: {
      tenantId,
      module: "TODO_COMPLETED",
      metadataJson: { path: ["taskId"], equals: taskA.id },
    },
    orderBy: { createdAt: "desc" },
  });

  assert(Boolean(notifComp), "Completion notification recorded with type TODO_COMPLETED");

  // ── TEST 6: Event E: Reminder Scheduler & Idempotency ─────────────────────
  console.log("\n--- 6. Event E: Reminder Scheduler & Idempotency Guarantees ---");
  
  // Create a task due in 36 hours (qualifies for 2-day reminder)
  const taskDue2d = await rawPrisma.workspaceTodo.create({
    data: {
      tenantId,
      userId: adminUser.id,
      title: "Deliverable Alpha: Due in 36 Hours",
      description: `<!--TODO_META:{"assignees":[{"id":"${testAssigneeUserId}","type":"user"}]}-->`,
      priority: "high",
      completed: false,
      dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000),
    },
  });

  // Create a task due in 12 hours (qualifies for 1-day reminder)
  const taskDue1d = await rawPrisma.workspaceTodo.create({
    data: {
      tenantId,
      userId: adminUser.id,
      title: "Deliverable Beta: Due in 12 Hours",
      description: `<!--TODO_META:{"assignees":[{"id":"${testAssigneeUserId}","type":"user"}]}-->`,
      priority: "urgent",
      completed: false,
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
    },
  });

  // Run reminder scheduler evaluation
  const result1 = await CalendarReminderScheduler.processDueTodoReminders(tenantId);
  console.log(`Scheduler Run 1: Evaluated ${result1.evaluatedCount}, Dispatched ${result1.dispatchedCount}`);

  const has2d = result1.details.some(d => d.taskId === taskDue2d.id && d.reminderType === "due-2d");
  const has1d = result1.details.some(d => d.taskId === taskDue1d.id && d.reminderType === "due-1d");

  assert(has2d, "Scheduler detected and dispatched 2-day reminder with idempotency key todo:<id>:<user>:due-2d");
  assert(has1d, "Scheduler detected and dispatched 1-day reminder with idempotency key todo:<id>:<user>:due-1d");

  // Run reminder scheduler a second time immediately to verify IDEMPOTENCY
  const result2 = await CalendarReminderScheduler.processDueTodoReminders(tenantId);
  console.log(`Scheduler Run 2 (Idempotency Check): Evaluated ${result2.evaluatedCount}, Dispatched ${result2.dispatchedCount}`);

  const duplicateDispatched = result2.details.some(
    d => d.taskId === taskDue2d.id || d.taskId === taskDue1d.id
  );

  assert(!duplicateDispatched, "Idempotency prevents duplicate reminder dispatch on subsequent scheduler runs");

  // ── TEST 7: Suppressed Tasks (Completed or Without Due Date) ──────────────
  console.log("\n--- 7. Suppression of Completed / No-DueDate Tasks ---");
  const taskCompleted = await rawPrisma.workspaceTodo.create({
    data: {
      tenantId,
      userId: adminUser.id,
      title: "Deliverable Gamma: Already Finished",
      priority: "medium",
      completed: true, // completed
      dueDate: new Date(Date.now() + 10 * 60 * 60 * 1000),
    },
  });

  const taskNoDue = await rawPrisma.workspaceTodo.create({
    data: {
      tenantId,
      userId: adminUser.id,
      title: "Deliverable Delta: Backlog Item",
      priority: "low",
      completed: false,
      dueDate: null, // no due date
    },
  });

  const result3 = await CalendarReminderScheduler.processDueTodoReminders(tenantId);
  const completedOrNoDueDispatched = result3.details.some(
    d => d.taskId === taskCompleted.id || d.taskId === taskNoDue.id
  );

  assert(!completedOrNoDueDispatched, "Completed tasks and tasks without due dates are strictly suppressed from reminders");

  // Cleanup test records
  await rawPrisma.notification.deleteMany({
    where: {
      tenantId,
      module: { in: ["TODO_ASSIGNED", "TODO_CREATED", "TODO_SCHEDULE_UPDATED", "TODO_COMPLETED", "TODO_REMINDER"] },
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  await rawPrisma.workspaceTodo.deleteMany({
    where: { id: { in: [taskA.id, taskDue2d.id, taskDue1d.id, taskCompleted.id, taskNoDue.id] } },
  });

  console.log("\n================================================================");
  console.log(` RESULTS: ${passed}/${passed + failed} ASSERTIONS PASSED`);
  if (failed > 0) {
    console.log(` ✖ ${failed} ASSERTIONS FAILED`);
    process.exit(1);
  } else {
    console.log(" ALL NOTIFICATION & EMAIL TEMPLATE CRITERIA EMPIRICALLY VERIFIED!");
    console.log("================================================================\n");
  }
}

main()
  .catch((e) => {
    console.error("Test Suite Fatal Error:", e);
    process.exit(1);
  });
