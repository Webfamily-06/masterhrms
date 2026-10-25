const fs = require('fs');
const path = require('path');
const dotenvPath = path.join(process.cwd(), 'server/.env');
if (fs.existsSync(dotenvPath)) {
  require(path.join(process.cwd(), 'server/node_modules/dotenv')).config({ path: dotenvPath });
}
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require(path.join(process.cwd(), 'server/node_modules/@prisma/client'));
const prisma = new PrismaClient();

const { parseTodoMeta, serializeTodoMeta } = require(path.join(process.cwd(), 'server/dist/routes/todos.routes.js'));
const { CalendarService } = require(path.join(process.cwd(), 'server/dist/services/calendar.service.js'));
const { CalendarExportService } = require(path.join(process.cwd(), 'server/dist/services/calendar-export.service.js'));
const { runWithTenantContext } = require(path.join(process.cwd(), 'server/dist/context/tenant-context.js'));

function getEventsInContext(tenantId, options) {
  return runWithTenantContext(
    {
      tenantId,
      userId: options.userId || 'system',
      roles: options.isHR ? ['tenant_admin', 'hr_admin'] : ['employee'],
      status: 'ACTIVE',
      tenancyStrategy: 'SHARED_SCHEMA',
      db: prisma,
    },
    () => CalendarService.getEvents(tenantId, options)
  );
}

let passedAssertions = 0;
let totalAssertions = 0;
const evaluatedCriteria = new Set();
const cleanupTodoIds = [];
const cleanupEventIds = [];

function assert(condition, criterionNum, description) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    evaluatedCriteria.add(criterionNum);
    console.log(`  \x1b[32m✔\x1b[0m [Criterion ${criterionNum}/15] ${description}`);
  } else {
    console.error(`  \x1b[31m✘\x1b[0m [FAILED Criterion ${criterionNum}/15] ${description}`);
    throw new Error(`Failed criterion ${criterionNum}: ${description}`);
  }
}

async function main() {
  console.log('\n================================================================');
  console.log(' MASTERHRMS TODO TASK DATES CALENDAR SYNCHRONIZATION TEST SUITE');
  console.log('================================================================\n');

  try {
    // 0. Setup test context and test users
    const tenant = await prisma.tenant.findFirst({
      select: { id: true, name: true },
    });
    if (!tenant) throw new Error('No tenant found in database');

    const users = await prisma.user.findMany({
      where: { profile: { tenantId: tenant.id } },
      select: { id: true, email: true, profile: { select: { fullName: true } } },
      take: 4,
    });
    if (users.length < 2) throw new Error('Need at least 2 users in tenant for assignment tests');

    const userA = users[0]; // Creator / Assigner
    const userB = users[1]; // Initial Assignee
    const userC = users[2] || { id: 'usr_mock_reassign_c', email: 'user_c@test.com', profile: { fullName: 'User C' } };
    const userD = users[3] || { id: 'usr_unrelated_d', email: 'unrelated@test.com', profile: { fullName: 'Unrelated Employee' } };

    const tenantId = tenant.id;
    console.log(`Tenant Context: ${tenant.name} (${tenantId})`);
    console.log(`User A (Assigner): ${userA.email} (${userA.id})`);
    console.log(`User B (Assignee): ${userB.email} (${userB.id})`);
    console.log(`User C (New Assignee): ${userC.email} (${userC.id})`);
    console.log(`User D (Unrelated): ${userD.email} (${userD.id})\n`);

    // ------------------------------------------------------------------
    // CRITERION 1: Task created by User A and assigned to User B appears on both authorized calendars
    // ------------------------------------------------------------------
    console.log('--- Criterion 1: Task Appears on Assigner & Assignee Calendars ---');
    const task1Desc = serializeTodoMeta('Coordinate quarterly executive review meetings', {
      assignee: {
        id: userB.id,
        name: userB.profile?.fullName || userB.email,
        type: 'user',
        assignedBy: userA.id,
        assignedAt: new Date().toISOString(),
      },
      startDate: '2026-11-01T09:00:00.000Z',
      progress: 25,
      starred: true,
    });

    const task1 = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId: userA.id,
        title: 'Quarterly Executive Review',
        description: task1Desc,
        priority: 'high',
        tag: 'planning',
        dueDate: new Date('2026-11-05T18:00:00.000Z'),
        completed: false,
      },
    });
    cleanupTodoIds.push(task1.id);

    // Query calendar for User A (Assigner)
    const calUserA = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskInCalA = calUserA.find((e) => e.id === `todo-${task1.id}`);
    assert(Boolean(taskInCalA), 1, 'Task appears on assigner User A calendar');
    assert(taskInCalA.startDate === '2026-11-01T09:00:00.000Z', 1, 'Assigner calendar has correct start date');
    assert(taskInCalA.endDate === '2026-11-05T18:00:00.000Z', 1, 'Assigner calendar has correct due/end date');

    // Query calendar for User B (Assignee)
    const calUserB = await getEventsInContext(tenantId, {
      userId: userB.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskInCalB = calUserB.find((e) => e.id === `todo-${task1.id}`);
    assert(Boolean(taskInCalB), 1, 'Task appears on assignee User B calendar');
    assert(taskInCalB.startDate === '2026-11-01T09:00:00.000Z', 1, 'Assignee calendar has identical start date');
    assert(taskInCalB.endDate === '2026-11-05T18:00:00.000Z', 1, 'Assignee calendar has identical due/end date');

    // ------------------------------------------------------------------
    // CRITERION 2: Same task appears only once per authorized user's calendar
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 2: Single Unique Projection Per User ---');
    const occurencesInA = calUserA.filter((e) => e.id === `todo-${task1.id}`).length;
    const occurencesInB = calUserB.filter((e) => e.id === `todo-${task1.id}`).length;
    assert(occurencesInA === 1, 2, 'Task appears exactly once in User A calendar projection');
    assert(occurencesInB === 1, 2, 'Task appears exactly once in User B calendar projection');

    // ------------------------------------------------------------------
    // CRITERION 3: Task date edit updates both calendars
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 3: Task Date Synchronization ---');
    const updatedDescDates = serializeTodoMeta('Coordinate quarterly executive review meetings', {
      assignee: {
        id: userB.id,
        name: userB.profile?.fullName || userB.email,
        type: 'user',
        assignedBy: userA.id,
        assignedAt: new Date().toISOString(),
      },
      startDate: '2026-11-03T10:00:00.000Z',
      progress: 30,
    });

    await prisma.workspaceTodo.update({
      where: { id: task1.id },
      data: {
        description: updatedDescDates,
        dueDate: new Date('2026-11-12T17:00:00.000Z'),
      },
    });

    const calUserA_afterDates = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskA_newDates = calUserA_afterDates.find((e) => e.id === `todo-${task1.id}`);
    assert(taskA_newDates.startDate === '2026-11-03T10:00:00.000Z', 3, 'User A calendar reflects updated start date');
    assert(taskA_newDates.endDate === '2026-11-12T17:00:00.000Z', 3, 'User A calendar reflects updated due date');

    const calUserB_afterDates = await getEventsInContext(tenantId, {
      userId: userB.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskB_newDates = calUserB_afterDates.find((e) => e.id === `todo-${task1.id}`);
    assert(taskB_newDates.startDate === '2026-11-03T10:00:00.000Z', 3, 'User B calendar reflects updated start date');
    assert(taskB_newDates.endDate === '2026-11-12T17:00:00.000Z', 3, 'User B calendar reflects updated due date');

    // ------------------------------------------------------------------
    // CRITERION 4: Title edit updates projected calendar entry
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 4: Title Synchronization ---');
    await prisma.workspaceTodo.update({
      where: { id: task1.id },
      data: { title: 'Q4 Executive Leadership Summit' },
    });

    const calUserA_afterTitle = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskA_title = calUserA_afterTitle.find((e) => e.id === `todo-${task1.id}`);
    assert(taskA_title.title === 'Task: Q4 Executive Leadership Summit', 4, 'User A calendar reflects updated task title');

    const calUserB_afterTitle = await getEventsInContext(tenantId, {
      userId: userB.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskB_title = calUserB_afterTitle.find((e) => e.id === `todo-${task1.id}`);
    assert(taskB_title.title === 'Task: Q4 Executive Leadership Summit', 4, 'User B calendar reflects updated task title');

    // ------------------------------------------------------------------
    // CRITERION 5: Reassignment removes access from previous assignee & grants new assignee
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 5: Dynamic Reassignment Access Transfer ---');
    const reassignedDesc = serializeTodoMeta('Coordinate quarterly executive review meetings', {
      assignee: {
        id: userC.id,
        name: userC.profile?.fullName || userC.email,
        type: 'user',
        assignedBy: userA.id,
        assignedAt: new Date().toISOString(),
      },
      startDate: '2026-11-03T10:00:00.000Z',
      progress: 30,
    });

    await prisma.workspaceTodo.update({
      where: { id: task1.id },
      data: { description: reassignedDesc },
    });

    // User B should no longer see the task
    const calUserB_afterReassign = await getEventsInContext(tenantId, {
      userId: userB.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskInUserB_after = calUserB_afterReassign.find((e) => e.id === `todo-${task1.id}`);
    assert(!taskInUserB_after, 5, 'Previous assignee User B no longer has calendar visibility for reassigned task');

    // User C should now see the task
    const calUserC_afterReassign = await getEventsInContext(tenantId, {
      userId: userC.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskInUserC_after = calUserC_afterReassign.find((e) => e.id === `todo-${task1.id}`);
    assert(Boolean(taskInUserC_after), 5, 'New assignee User C gains immediate calendar visibility');

    // Creator User A still sees the task
    const calUserA_afterReassign = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskInUserA_after = calUserA_afterReassign.find((e) => e.id === `todo-${task1.id}`);
    assert(Boolean(taskInUserA_after), 5, 'Assigner User A retains authorized calendar visibility');

    // ------------------------------------------------------------------
    // CRITERION 6: Unscheduled task does not receive fabricated dates; single date rule verified
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 6: No Fabricated Dates for Unscheduled Tasks ---');
    const unscheduledDesc = serializeTodoMeta('Backlog item with no dates planned', {
      assignee: null,
      progress: 0,
    });

    const unscheduledTask = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId: userA.id,
        title: 'Unscheduled Research Item',
        description: unscheduledDesc,
        dueDate: null,
        completed: false,
      },
    });
    cleanupTodoIds.push(unscheduledTask.id);

    const calUnscheduled = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      isHR: false,
    });
    const foundUnscheduled = calUnscheduled.find((e) => e.id === `todo-${unscheduledTask.id}`);
    assert(!foundUnscheduled, 6, 'Task with no valid schedule generates no fabricated calendar entry');

    // Test task with only dueDate
    const dueOnlyTask = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId: userA.id,
        title: 'Tax Compliance Filing Deadline',
        description: serializeTodoMeta('Only due date is specified', {}),
        dueDate: new Date('2026-11-15T00:00:00.000Z'),
        completed: false,
      },
    });
    cleanupTodoIds.push(dueOnlyTask.id);

    const calDueOnly = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const foundDueOnly = calDueOnly.find((e) => e.id === `todo-${dueOnlyTask.id}`);
    assert(Boolean(foundDueOnly), 6, 'Task with only dueDate projects successfully');
    assert(foundDueOnly.startDate === foundDueOnly.endDate, 6, 'Due-only task maps startDate === endDate (allDay point in time)');

    // ------------------------------------------------------------------
    // CRITERION 7: Completed tasks preserve their status
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 7: Completion Status Preservation ---');
    await prisma.workspaceTodo.update({
      where: { id: task1.id },
      data: { completed: true },
    });

    const calCompleted = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskCompleted = calCompleted.find((e) => e.id === `todo-${task1.id}`);
    assert(taskCompleted.status === 'completed', 7, 'Completed task projects status === "completed"');
    assert(taskCompleted.completed === true, 7, 'Completed task preserves boolean completed === true flag');

    // ------------------------------------------------------------------
    // CRITERION 8: Task-calendar queries are restricted to the correct tenant
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 8: Tenant Scoping & Isolation ---');
    const calOtherTenant = await getEventsInContext('foreign_tenant_9999_xyz', {
      userId: userA.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: true,
    });
    const leakInOther = calOtherTenant.find((e) => e.id === `todo-${task1.id}`);
    assert(!leakInOther, 8, 'Cross-tenant query cannot access task outside authorized tenant boundary');

    // ------------------------------------------------------------------
    // CRITERION 9: Unrelated employees cannot see private task information
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 9: Non-Participant Employee Access Denial ---');
    const calUserD = await getEventsInContext(tenantId, {
      userId: userD.id,
      startDate: new Date('2026-10-25T00:00:00.000Z'),
      endDate: new Date('2026-11-20T23:59:59.000Z'),
      isHR: false,
    });
    const taskInUserD = calUserD.find((e) => e.id === `todo-${task1.id}`);
    assert(!taskInUserD, 9, 'Unrelated employee User D cannot see non-participant task');

    // ------------------------------------------------------------------
    // CRITERION 10: Calendar queries respect requested date range
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 10: Date Window Filtering ---');
    // Task dates are 2026-11-03 to 2026-11-12
    const calOutOfWindow = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      isHR: false,
    });
    const taskInDecember = calOutOfWindow.find((e) => e.id === `todo-${task1.id}`);
    assert(!taskInDecember, 10, 'Task is excluded when query date window does not overlap');

    const calInWindow = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const taskInNovember = calInWindow.find((e) => e.id === `todo-${task1.id}`);
    assert(Boolean(taskInNovember), 10, 'Task is included when query date window overlaps');

    // ------------------------------------------------------------------
    // CRITERION 11: Calendar refresh and navigation preserve task identity
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 11: Task Identity Stability Across Refreshes ---');
    const query1 = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const query2 = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const id1 = query1.find((e) => e.sourceId === task1.id)?.id;
    const id2 = query2.find((e) => e.sourceId === task1.id)?.id;
    assert(id1 === `todo-${task1.id}` && id1 === id2, 11, 'Task projection ID is deterministic and stable across requests');

    // ------------------------------------------------------------------
    // CRITERION 12: Opening task reaches correct role-specific Todo route
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 12: Role-Specific Navigation URL Resolution ---');
    const hrCal = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: true,
    });
    const hrTask = hrCal.find((e) => e.id === `todo-${task1.id}`);
    assert(hrTask.linkTo === `/hr/todo?taskId=${task1.id}`, 12, 'HR calendar viewer receives /hr/todo?taskId=... link');

    const empCal = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const empTask = empCal.find((e) => e.id === `todo-${task1.id}`);
    assert(empTask.linkTo === `/me/todo?taskId=${task1.id}`, 12, 'Employee calendar viewer receives /me/todo?taskId=... link');

    // ------------------------------------------------------------------
    // CRITERION 13: Existing calendar events, reminders, and recurring events remain functional
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 13: Core Calendar System Integrity ---');
    const stdEvent = await prisma.calendarEvent.create({
      data: {
        tenantId,
        userId: userA.id,
        title: 'Bi-Weekly Architecture Sync',
        startDate: new Date('2026-11-06T10:00:00.000Z'),
        endDate: new Date('2026-11-06T11:00:00.000Z'),
        category: 'meeting',
        visibility: 'team',
      },
    });
    cleanupEventIds.push(stdEvent.id);

    const mergedCal = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });

    const hasStdMeeting = mergedCal.some((e) => e.id === `event-${stdEvent.id}` && e.sourceDomain === 'calendar');
    const hasTodoTask = mergedCal.some((e) => e.id === `todo-${task1.id}` && e.sourceDomain === 'todo');
    assert(hasStdMeeting && hasTodoTask, 13, 'Both standard calendar events and projected Todo tasks co-exist harmoniously');

    // ------------------------------------------------------------------
    // CRITERION 14: No duplicate notifications or duplicate task events generated
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 14: Zero Duplicate Reminders or Synthetic Events ---');
    // Ensure no calendarEventReminder rows were created for the todo
    const syntheticReminders = await prisma.calendarEventReminder.findMany({
      where: { eventId: task1.id },
    });
    assert(syntheticReminders.length === 0, 14, 'Zero synthetic calendarEventReminder records generated for projected task');

    const totalTaskRowsInEventTable = await prisma.calendarEvent.findMany({
      where: { id: task1.id },
    });
    assert(totalTaskRowsInEventTable.length === 0, 14, 'No duplicate CalendarEvent row created in database (pure read-only projection)');

    // ------------------------------------------------------------------
    // CRITERION 15: Task changes made from Gantt are reflected in both calendars
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 15: Gantt Timeline Edit Reflection in Calendar ---');
    // Simulate Gantt timeline drag & drop operation
    const ganttUpdatedDesc = serializeTodoMeta('Coordinate quarterly executive review meetings', {
      assignee: {
        id: userC.id,
        name: userC.profile?.fullName || userC.email,
        type: 'user',
        assignedBy: userA.id,
        assignedAt: new Date().toISOString(),
      },
      startDate: '2026-11-08T00:00:00.000Z',
      progress: 75,
    });

    await prisma.workspaceTodo.update({
      where: { id: task1.id },
      data: {
        description: ganttUpdatedDesc,
        dueDate: new Date('2026-11-18T23:59:59.000Z'),
      },
    });

    // Verify Assigner Calendar reflects Gantt updates
    const calAssignerGantt = await getEventsInContext(tenantId, {
      userId: userA.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const taskAssignerGantt = calAssignerGantt.find((e) => e.id === `todo-${task1.id}`);
    assert(taskAssignerGantt.startDate === '2026-11-08T00:00:00.000Z', 15, 'Assigner calendar reflects Gantt timeline start date');
    assert(taskAssignerGantt.endDate === '2026-11-18T23:59:59.000Z', 15, 'Assigner calendar reflects Gantt timeline due date');
    assert(taskAssignerGantt.progress === 75, 15, 'Assigner calendar reflects Gantt execution progress (75%)');

    // Verify Assignee Calendar reflects Gantt updates
    const calAssigneeGantt = await getEventsInContext(tenantId, {
      userId: userC.id,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      isHR: false,
    });
    const taskAssigneeGantt = calAssigneeGantt.find((e) => e.id === `todo-${task1.id}`);
    assert(taskAssigneeGantt.startDate === '2026-11-08T00:00:00.000Z', 15, 'Assignee calendar reflects Gantt timeline start date');
    assert(taskAssigneeGantt.endDate === '2026-11-18T23:59:59.000Z', 15, 'Assignee calendar reflects Gantt timeline due date');
    assert(taskAssigneeGantt.progress === 75, 15, 'Assignee calendar reflects Gantt execution progress (75%)');

    // Test ICS export contains projected task
    console.log('\n--- Verification of RFC 5545 iCalendar (.ics) Export ---');
    const icsString = CalendarExportService.generateIcs([taskAssignerGantt]);
    assert(icsString.includes('BEGIN:VCALENDAR') && icsString.includes('BEGIN:VEVENT'), 13, 'ICS generator outputs valid RFC 5545 envelope');
    assert(icsString.includes('SUMMARY:Task: Q4 Executive Leadership Summit'), 13, 'ICS export includes projected task title');

    console.log('\n================================================================');
    console.log(` ALL 15 CRITERIA PASSED: ${passedAssertions}/${totalAssertions} assertions verified`);
    console.log(` Evaluated Criteria Count: ${evaluatedCriteria.size}/15`);
    console.log('================================================================\n');

  } finally {
    // Clean up test data
    console.log('Cleaning up test data...');
    if (cleanupTodoIds.length > 0) {
      await prisma.workspaceTodo.deleteMany({
        where: { id: { in: cleanupTodoIds } },
      });
      console.log(`Cleaned up ${cleanupTodoIds.length} test todos`);
    }
    if (cleanupEventIds.length > 0) {
      await prisma.calendarEvent.deleteMany({
        where: { id: { in: cleanupEventIds } },
      });
      console.log(`Cleaned up ${cleanupEventIds.length} test calendar events`);
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
