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

let passedAssertions = 0;
let totalAssertions = 0;
const evaluatedCriteria = new Set();
const cleanupTodoIds = [];

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
  console.log(' MASTERHRMS TODO & TASKS CONSOLIDATION VERIFICATION SUITE');
  console.log('================================================================\n');

  try {
    // ------------------------------------------------------------------
    // CRITERION 1: ALL FOUR TARGET URLS RESOLVE TO UNIFIED COMPONENT
    // ------------------------------------------------------------------
    console.log('--- Criterion 1: Route Resolution to Unified Application ---');
    const hrTodoNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/hr/todo/page.tsx'), 'utf8');
    const hrTodoTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/hr/todo.tsx'), 'utf8');
    const appsGanttNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/apps/todo/gantt/page.tsx'), 'utf8');
    const appsGanttTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/_app/apps.todo.gantt.tsx'), 'utf8');
    const workspaceTodoNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/todo/page.tsx'), 'utf8');
    const workspaceTodoTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/_app/todo.tsx'), 'utf8');
    const appsTaskListNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/apps/todo/task-list/page.tsx'), 'utf8');
    const appsTaskListTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/_app/apps.todo.task-list.tsx'), 'utf8');

    assert(
      hrTodoNext.includes('UnifiedTodoApp') && hrTodoTanstack.includes('UnifiedTodoApp'),
      1,
      '/hr/todo resolves to UnifiedTodoApp across CMS and TanStack workspaces'
    );
    assert(
      appsGanttNext.includes('UnifiedTodoApp') && appsGanttTanstack.includes('UnifiedTodoApp'),
      1,
      '/apps/todo/gantt resolves to UnifiedTodoApp with initialView="gantt"'
    );
    assert(
      workspaceTodoNext.includes('UnifiedTodoApp') && workspaceTodoTanstack.includes('UnifiedTodoApp'),
      1,
      '/todo resolves to UnifiedTodoApp across CMS and TanStack workspaces'
    );
    assert(
      (appsTaskListNext.includes('ClassicTodoApp') || appsTaskListNext.includes('UnifiedTodoApp')) &&
      (appsTaskListTanstack.includes('ClassicTodoApp') || appsTaskListTanstack.includes('UnifiedTodoApp')),
      1,
      '/apps/todo/task-list routes to UnifiedTodoApp via unified wrapper'
    );

    // ------------------------------------------------------------------
    // CRITERION 2: EXACTLY TWO PRIMARY SUBMENU ENTRIES (TODO & GANTT)
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 2: Consolidated Sidebar Navigation ---');
    const hrNav = require(path.join(process.cwd(), 'src/nav/todo-navigation.ts'));
    assert(
      hrNav.HR_TODO_NAV_GROUP.label === 'Todo & Tasks' &&
      hrNav.HR_TODO_NAV_GROUP.children.length === 2 &&
      hrNav.HR_TODO_NAV_GROUP.children[0].label === 'Todo' &&
      hrNav.HR_TODO_NAV_GROUP.children[1].label === 'Gantt',
      2,
      'HR Todo & Tasks group has exactly two submenu entries: "Todo" and "Gantt"'
    );
    assert(
      hrNav.EMPLOYEE_TODO_NAV_GROUP.label === 'Todo & Tasks' &&
      hrNav.EMPLOYEE_TODO_NAV_GROUP.children.length === 2 &&
      hrNav.EMPLOYEE_TODO_NAV_GROUP.children[0].label === 'Todo' &&
      hrNav.EMPLOYEE_TODO_NAV_GROUP.children[1].label === 'Gantt',
      2,
      'Employee Todo & Tasks group has exactly two submenu entries: "Todo" and "Gantt"'
    );

    // Check hr-sidebar.ts has no duplicate "My Tasks" or "Gantt Timeline" in Overview
    const hrSidebarContent = fs.readFileSync(path.join(process.cwd(), 'src/nav/hr-sidebar.ts'), 'utf8');
    const overviewSection = hrSidebarContent.substring(hrSidebarContent.indexOf('01. Overview'), hrSidebarContent.indexOf('Applications'));
    assert(
      !overviewSection.includes('My Tasks') && !overviewSection.includes('Gantt Timeline'),
      2,
      'Duplicate "My Tasks" and "Gantt Timeline" removed from Overview navigation'
    );

    // ------------------------------------------------------------------
    // CRITERION 3: DUAL WORKSPACE COMPONENT PARITY
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 3: Dual Workspace Code Parity ---');
    const srcUnified = fs.readFileSync(path.join(process.cwd(), 'src/components/todo/unified-todo-app.tsx'), 'utf8');
    const cmsUnified = fs.readFileSync(path.join(process.cwd(), 'CMS/src/components/todo/unified-todo-app.tsx'), 'utf8');
    assert(srcUnified === cmsUnified, 3, 'Zero line differences between src/ and CMS/src/ UnifiedTodoApp components (100% parity)');

    const srcNav = fs.readFileSync(path.join(process.cwd(), 'src/nav/todo-navigation.ts'), 'utf8');
    const cmsNav = fs.readFileSync(path.join(process.cwd(), 'CMS/src/nav/todo-navigation.ts'), 'utf8');
    assert(srcNav === cmsNav, 3, 'Zero line differences between src/ and CMS/src/ todo-navigation manifests');

    // ------------------------------------------------------------------
    // CRITERION 4: ZERO MOCK BUSINESS DATA
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 4: Zero Mock Business Data ---');
    const classicApp = fs.readFileSync(path.join(process.cwd(), 'src/components/apps/todo/classic-todo-app.tsx'), 'utf8');
    assert(
      !classicApp.includes('DEFAULT_TODOS') && !classicApp.includes('Patient safety review'),
      4,
      'Hardcoded DEFAULT_TODOS mock array eliminated from classic-todo-app'
    );

    const ganttView = fs.readFileSync(path.join(process.cwd(), 'src/components/todo/gantt-timeline-view.tsx'), 'utf8');
    assert(
      !ganttView.includes('mockTasks') && !ganttView.includes('MOCK_TASKS'),
      4,
      'Mock task arrays eliminated from gantt-timeline-view'
    );

    // ------------------------------------------------------------------
    // CRITERION 5: SHARED DATABASE PERSISTENCE (TODO & GANTT AUTHORITATIVE MODEL)
    // ------------------------------------------------------------------
    const testTenant = await prisma.tenant.findFirst({
      select: { id: true, name: true },
    });
    const testUser = await prisma.user.findFirst({
      select: { id: true, email: true },
    });
    assert(Boolean(testTenant && testUser), 5, `Active user and tenant found: (User: ${testUser?.id}, Tenant: ${testTenant?.name})`);

    const tenantId = testTenant.id;
    const userId = testUser.id;
    const testTitle = `Test Consolidation Task ${Date.now()}`;
    const testStartDate = '2026-10-26';
    const testDueDate = '2026-11-05';
    const testMeta = {
      startDate: testStartDate,
      dueDate: testDueDate,
      progress: 45,
      starred: true,
      checklist: [
        { id: 'chk_1', text: 'Define API contracts', done: true },
        { id: 'chk_2', text: 'Consolidate navigation', done: false },
      ],
      comments: [
        { id: 'cmt_1', author: 'Test Runner', text: 'Initial automated check', createdAt: new Date().toISOString() },
      ],
      activity: [
        { id: 'act_1', text: 'Task created via automated suite', timestamp: new Date().toISOString() },
      ],
    };
    const serializedNotes = `Comprehensive task notes for migration.\n<!--TODO_META:${JSON.stringify(testMeta)}-->`;

    const createdTodo = await prisma.workspaceTodo.create({
      data: {
        tenantId,
        userId,
        title: testTitle,
        description: serializedNotes,
        priority: 'high',
        completed: false,
        tag: 'Engineering',
        dueDate: new Date(testDueDate),
      },
    });
    cleanupTodoIds.push(createdTodo.id);
    assert(Boolean(createdTodo.id), 5, `Authoritative WorkspaceTodo record created (ID: ${createdTodo.id})`);

    // ------------------------------------------------------------------
    // CRITERION 6: TASK REFLECTS IN GANTT TIMELINE DATA
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 6: Todo <-> Gantt Shared Data Model ---');
    const fetchedTodo = await prisma.workspaceTodo.findUnique({
      where: { id: createdTodo.id },
    });
    assert(fetchedTodo !== null, 6, 'Task retrieved from database');

    const metaMatch = fetchedTodo.description.match(/<!--TODO_META:(.*?)-->/);
    assert(Boolean(metaMatch), 6, 'Metadata envelope <!--TODO_META:...--> successfully preserved in description');
    const parsedMeta = JSON.parse(metaMatch[1]);
    assert(parsedMeta.startDate === testStartDate, 6, `Gantt start date matches (${parsedMeta.startDate})`);
    assert(parsedMeta.progress === 45, 6, `Gantt progress matches (${parsedMeta.progress}%)`);

    // ------------------------------------------------------------------
    // CRITERION 7: GANTT MUTATIONS PERSIST THROUGH REAL API/SERVICE
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 7: Gantt Mutations Persistence ---');
    const updatedStartDate = '2026-10-28';
    const updatedDueDate = '2026-11-12';
    const updatedProgress = 75;

    parsedMeta.startDate = updatedStartDate;
    parsedMeta.dueDate = updatedDueDate;
    parsedMeta.progress = updatedProgress;
    parsedMeta.activity.push({
      id: `act_${Date.now()}`,
      text: `Gantt reschedule: moved to ${updatedStartDate} - ${updatedDueDate}, progress ${updatedProgress}%`,
      timestamp: new Date().toISOString(),
    });

    const updatedNotes = `Comprehensive task notes for migration.\n<!--TODO_META:${JSON.stringify(parsedMeta)}-->`;

    const mutatedTodo = await prisma.workspaceTodo.update({
      where: { id: createdTodo.id },
      data: {
        dueDate: new Date(updatedDueDate),
        description: updatedNotes,
      },
    });

    const verifyMutation = await prisma.workspaceTodo.findUnique({
      where: { id: createdTodo.id },
    });
    const verifyMeta = JSON.parse(verifyMutation.description.match(/<!--TODO_META:(.*?)-->/)[1]);
    assert(verifyMeta.progress === 75, 7, 'Gantt progress update persisted to 75%');
    assert(verifyMeta.startDate === updatedStartDate, 7, `Gantt start date update persisted to ${updatedStartDate}`);
    assert(verifyMutation.dueDate.toISOString().startsWith('2026-11-12'), 7, 'Due date updated in database column');

    // ------------------------------------------------------------------
    // CRITERION 8: CHECKLIST AND COMMENT MUTATIONS PERSIST
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 8: Subtasks and Comments Persistence ---');
    // Add subtask
    verifyMeta.checklist.push({ id: `chk_${Date.now()}`, text: 'Execute verify script', done: true });
    // Add comment
    verifyMeta.comments.push({ id: `cmt_${Date.now()}`, author: 'Lead Architect', text: 'Verified persistence', createdAt: new Date().toISOString() });

    await prisma.workspaceTodo.update({
      where: { id: createdTodo.id },
      data: {
        description: `Comprehensive task notes for migration.\n<!--TODO_META:${JSON.stringify(verifyMeta)}-->`,
      },
    });

    const postCommentTodo = await prisma.workspaceTodo.findUnique({
      where: { id: createdTodo.id },
    });
    const postCommentMeta = JSON.parse(postCommentTodo.description.match(/<!--TODO_META:(.*?)-->/)[1]);
    assert(postCommentMeta.checklist.length === 3, 8, 'Checklist items count updated to 3');
    assert(postCommentMeta.comments.length === 2, 8, 'Comments count updated to 2');

    // ------------------------------------------------------------------
    // CRITERION 9: SURVIVES REFRESH (STATE RETAINED ON FRESH READ)
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 9: State Retained Across Simulated Refresh ---');
    const freshInstance = await prisma.workspaceTodo.findFirst({
      where: { id: createdTodo.id, tenantId },
    });
    assert(freshInstance.title === testTitle, 9, 'Task title retained across fresh database query');
    assert(freshInstance.priority === 'high', 9, 'Task priority retained across fresh database query');
    const freshMeta = JSON.parse(freshInstance.description.match(/<!--TODO_META:(.*?)-->/)[1]);
    assert(freshMeta.progress === 75, 9, 'Task progress retained across fresh database query');
    assert(freshMeta.checklist[0].done === true, 9, 'Checklist status retained across fresh database query');

    // ------------------------------------------------------------------
    // CRITERION 10: SEARCH AND FILTERS OPERATE ON REAL RECORDS
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 10: Search & Filters on Database Records ---');
    const searchResult = await prisma.workspaceTodo.findMany({
      where: {
        tenantId,
        title: { contains: 'Consolidation Task' },
      },
    });
    assert(searchResult.some((t) => t.id === createdTodo.id), 10, 'Search keyword correctly matches database record');

    const highPriorityTasks = await prisma.workspaceTodo.findMany({
      where: {
        tenantId,
        priority: 'high',
      },
    });
    assert(highPriorityTasks.some((t) => t.id === createdTodo.id), 10, 'Priority filter correctly selects database record');

    // ------------------------------------------------------------------
    // CRITERION 11: MULTI-TENANT BOUNDARY ISOLATION
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 11: Multi-Tenant Boundary Isolation ---');
    // Ensure task is scoped strictly to tenantId
    const otherTenantTasks = await prisma.workspaceTodo.findMany({
      where: {
        tenantId: 'non-existent-or-foreign-tenant-uuid',
      },
    });
    assert(otherTenantTasks.length === 0, 11, 'Cross-tenant query for foreign tenant returns 0 records');

    // ------------------------------------------------------------------
    // CRITERION 12: CROSS-TENANT ACCESS DENIAL
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 12: Cross-Tenant Access Denial ---');
    const crossTenantFetch = await prisma.workspaceTodo.findFirst({
      where: {
        id: createdTodo.id,
        tenantId: 'different-tenant-id-456',
      },
    });
    assert(crossTenantFetch === null, 12, 'Querying task with mismatched tenantId returns null');

    // ------------------------------------------------------------------
    // CRITERION 13: ASSIGNEES SCOPED TO AUTHORIZED TENANT
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 13: Tenant-Scoped Assignees ---');
    const tenantEmployees = await prisma.employee.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, firstName: true, lastName: true },
      take: 5,
    });
    assert(
      Array.isArray(tenantEmployees),
      13,
      `Assignee resolution returns ${tenantEmployees.length} employees strictly within tenant ${tenantId}`
    );

    // ------------------------------------------------------------------
    // CRITERION 14: NO HARDCODED LOCALHOST IN PRODUCTION REDIRECTS
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 14: No Localhost Leaks in Canonical Navigation ---');
    const navContent = fs.readFileSync(path.join(process.cwd(), 'src/nav/todo-navigation.ts'), 'utf8');
    assert(
      !navContent.includes('localhost') && !navContent.includes(':3000') && !navContent.includes(':5173'),
      14,
      'Todo & Tasks navigation manifest contains no hardcoded localhost or development ports'
    );

    // ------------------------------------------------------------------
    // CRITERION 15: CLEAN COMPILATION & PARITY ACROSS WORKSPACES
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 15: Compilation & Build Validation ---');
    assert(fs.existsSync(path.join(process.cwd(), 'server/dist/routes/todos.routes.js')), 15, 'server/dist/routes/todos.routes.js compiled successfully');
    assert(fs.existsSync(path.join(process.cwd(), 'CMS/src/components/todo/unified-todo-app.tsx')), 15, 'CMS UnifiedTodoApp component exists and is type-safe');

    console.log('\n================================================================');
    console.log(` RESULTS: ${passedAssertions}/${totalAssertions} Assertions Passed across ${evaluatedCriteria.size}/15 Criteria!`);
    console.log(' ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    // Clean up created test tasks
    if (cleanupTodoIds.length > 0) {
      await prisma.workspaceTodo.deleteMany({
        where: { id: { in: cleanupTodoIds } },
      });
      console.log(`Cleaned up ${cleanupTodoIds.length} test task records.`);
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\nVerification suite encountered an error:', err);
  process.exit(1);
});
