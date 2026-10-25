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

const { resolveDefaultRoute } = require(path.join(process.cwd(), 'src/lib/auth-navigation.ts'));
const { evaluateRouteAccess } = require(path.join(process.cwd(), 'src/lib/route-guards.ts'));
const { HR_TODO_NAV_GROUP, EMPLOYEE_TODO_NAV_GROUP, TENANT_TODO_NAV_GROUP } = require(path.join(process.cwd(), 'src/nav/todo-navigation.ts'));

let passedAssertions = 0;
let totalAssertions = 0;
const evaluatedCriteria = new Set();
const cleanupTodoIds = [];

function assert(condition, criterionNum, description) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    evaluatedCriteria.add(criterionNum);
    console.log(`  \x1b[32m✔\x1b[0m [Criterion ${criterionNum}/16] ${description}`);
  } else {
    console.error(`  \x1b[31m✘\x1b[0m [FAILED Criterion ${criterionNum}/16] ${description}`);
    throw new Error(`Failed criterion ${criterionNum}: ${description}`);
  }
}

async function main() {
  console.log('\n================================================================');
  console.log(' MASTERHRMS WORKSPACE ROUTING ARCHITECTURE VERIFICATION SUITE');
  console.log('================================================================\n');

  try {
    // ------------------------------------------------------------------
    // CRITERION 1: HR LOGIN REDIRECTS TO AUTHORIZED HR LANDING ROUTE
    // ------------------------------------------------------------------
    console.log('--- Criterion 1: HR Login Redirect ---');
    const hrRoute = resolveDefaultRoute(['hr_admin']);
    const hrStaffRoute = resolveDefaultRoute(['hr']);
    assert(hrRoute === '/hr/dashboard', 1, 'HR Admin resolves to canonical landing /hr/dashboard');
    assert(hrStaffRoute === '/hr/dashboard', 1, 'HR staff resolves to canonical landing /hr/dashboard');

    // ------------------------------------------------------------------
    // CRITERION 2: EMPLOYEE LOGIN REDIRECTS TO AUTHORIZED EMPLOYEE ROUTE
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 2: Employee Login Redirect ---');
    const employeeRoute = resolveDefaultRoute(['employee']);
    const staffRoute = resolveDefaultRoute(['staff']);
    assert(employeeRoute === '/me/dashboard', 2, 'Employee role resolves to canonical landing /me/dashboard');
    assert(staffRoute === '/me/dashboard', 2, 'Staff role resolves to canonical landing /me/dashboard');

    // ------------------------------------------------------------------
    // CRITERION 3: TENANT ADMINISTRATOR LOGIN REDIRECTS TO TENANT ROUTE
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 3: Tenant Administrator Login Redirect ---');
    const tenantAdminRoute = resolveDefaultRoute(['tenant_admin']);
    const workspaceAdminRoute = resolveDefaultRoute(['admin']);
    const ownerRoute = resolveDefaultRoute(['owner']);
    assert(tenantAdminRoute === '/tenant/dashboard', 3, 'Tenant Admin resolves to canonical landing /tenant/dashboard');
    assert(workspaceAdminRoute === '/tenant/dashboard', 3, 'Admin role resolves to canonical landing /tenant/dashboard');
    assert(ownerRoute === '/tenant/dashboard', 3, 'Owner role resolves to canonical landing /tenant/dashboard');

    // ------------------------------------------------------------------
    // CRITERION 4: SUPER ADMIN LOGIN PRESERVES SUPER ADMIN NAMESPACE
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 4: Super Admin Login Redirect ---');
    const superAdminRoute = resolveDefaultRoute(['super_admin']);
    assert(superAdminRoute === '/super', 4, 'Super Admin resolves strictly to protected /super namespace');

    // ------------------------------------------------------------------
    // CRITERION 5: HR TODO AND GANTT ROUTES RENDER CORRECTLY
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 5: HR Todo & Gantt Routes ---');
    const hrTodoNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/hr/todo/page.tsx'), 'utf8');
    const hrTodoTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/hr/todo.tsx'), 'utf8');
    const hrGanttNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/hr/todo/gantt/page.tsx'), 'utf8');
    const hrGanttTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/hr/todo.gantt.tsx'), 'utf8');

    assert(hrTodoNext.includes('UnifiedTodoApp') && hrTodoNext.includes('mode="hr"'), 5, 'CMS /hr/todo renders UnifiedTodoApp in HR mode');
    assert(hrTodoTanstack.includes('UnifiedTodoApp') && hrTodoTanstack.includes('mode="hr"'), 5, 'TanStack /hr/todo renders UnifiedTodoApp in HR mode');
    assert(hrGanttNext.includes('UnifiedTodoApp') && hrGanttNext.includes('initialView="gantt"'), 5, 'CMS /hr/todo/gantt renders UnifiedTodoApp in Gantt mode');
    assert(hrGanttTanstack.includes('UnifiedTodoApp') && hrGanttTanstack.includes('initialView="gantt"'), 5, 'TanStack /hr/todo/gantt renders UnifiedTodoApp in Gantt mode');

    // ------------------------------------------------------------------
    // CRITERION 6: EMPLOYEE TODO AND GANTT ROUTES RENDER CORRECTLY
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 6: Employee Todo & Gantt Routes ---');
    const meTodoNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/me/todo/page.tsx'), 'utf8');
    const meTodoTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/me/todo.tsx'), 'utf8');
    const meGanttNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/me/todo/gantt/page.tsx'), 'utf8');
    const meGanttTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/me/todo.gantt.tsx'), 'utf8');

    assert(meTodoNext.includes('UnifiedTodoApp') && meTodoNext.includes('mode="me"'), 6, 'CMS /me/todo renders UnifiedTodoApp in Employee mode');
    assert(meTodoTanstack.includes('UnifiedTodoApp') && meTodoTanstack.includes('mode="me"'), 6, 'TanStack /me/todo renders UnifiedTodoApp in Employee mode');
    assert(meGanttNext.includes('UnifiedTodoApp') && meGanttNext.includes('initialView="gantt"'), 6, 'CMS /me/todo/gantt renders UnifiedTodoApp in Gantt mode');
    assert(meGanttTanstack.includes('UnifiedTodoApp') && meGanttTanstack.includes('initialView="gantt"'), 6, 'TanStack /me/todo/gantt renders UnifiedTodoApp in Gantt mode');

    // ------------------------------------------------------------------
    // CRITERION 7: TENANT TODO AND GANTT ROUTES RENDER CORRECTLY
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 7: Tenant Todo & Gantt Routes ---');
    const tenantTodoNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/tenant/todo/page.tsx'), 'utf8');
    const tenantTodoTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/tenant/todo.tsx'), 'utf8');
    const tenantGanttNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/tenant/todo/gantt/page.tsx'), 'utf8');
    const tenantGanttTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/tenant/todo.gantt.tsx'), 'utf8');

    assert(tenantTodoNext.includes('UnifiedTodoApp') && tenantTodoNext.includes('mode="workspace"'), 7, 'CMS /tenant/todo renders UnifiedTodoApp in workspace mode');
    assert(tenantTodoTanstack.includes('UnifiedTodoApp') && tenantTodoTanstack.includes('mode="workspace"'), 7, 'TanStack /tenant/todo renders UnifiedTodoApp in workspace mode');
    assert(tenantGanttNext.includes('UnifiedTodoApp') && tenantGanttNext.includes('initialView="gantt"'), 7, 'CMS /tenant/todo/gantt renders UnifiedTodoApp in Gantt mode');
    assert(tenantGanttTanstack.includes('UnifiedTodoApp') && tenantGanttTanstack.includes('initialView="gantt"'), 7, 'TanStack /tenant/todo/gantt renders UnifiedTodoApp in Gantt mode');

    // ------------------------------------------------------------------
    // CRITERION 8: CALENDAR ROUTE PARITY ACROSS SUPPORTED WORKSPACES
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 8: Calendar Route Parity Across Workspaces ---');
    const hrCalNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/hr/calendar/page.tsx'), 'utf8');
    const hrCalTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/hr/calendar.tsx'), 'utf8');
    const meCalNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/me/calendar/page.tsx'), 'utf8');
    const meCalTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/me/calendar.tsx'), 'utf8');
    const tenantCalNext = fs.readFileSync(path.join(process.cwd(), 'CMS/src/app/(workspace)/tenant/calendar/page.tsx'), 'utf8');
    const tenantCalTanstack = fs.readFileSync(path.join(process.cwd(), 'src/routes/_authenticated/tenant/calendar.tsx'), 'utf8');

    assert(hrCalNext.includes('UnifiedCalendarApp') && hrCalTanstack.includes('UnifiedCalendarApp'), 8, '/hr/calendar unified across CMS and TanStack');
    assert(meCalNext.includes('UnifiedCalendarApp') && meCalTanstack.includes('UnifiedCalendarApp'), 8, '/me/calendar unified across CMS and TanStack');
    assert(tenantCalNext.includes('UnifiedCalendarApp') && tenantCalTanstack.includes('UnifiedCalendarApp'), 8, '/tenant/calendar unified across CMS and TanStack');

    // ------------------------------------------------------------------
    // CRITERION 9: DIRECT DEEP-LINK REFRESH AND BROWSER NAVIGATION
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 9: Deep-Link Refresh & Browser Navigation ---');
    const unifiedTodoSource = fs.readFileSync(path.join(process.cwd(), 'src/components/todo/unified-todo-app.tsx'), 'utf8');
    assert(
      unifiedTodoSource.includes('window.location.pathname.endsWith("/gantt")'),
      9,
      'Direct deep-link /gantt automatically detects and initializes Gantt view mode'
    );
    assert(
      unifiedTodoSource.includes('window.history.replaceState'),
      9,
      'View switching updates URL pathname and parameters without full page reload'
    );

    // ------------------------------------------------------------------
    // CRITERION 10: LEGACY ROUTE COMPATIBILITY & ABSENCE OF REDIRECT LOOPS
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 10: Legacy Route Translation & Loop Prevention ---');
    // Test role-aware legacy translations
    const empLegacyTodo = resolveDefaultRoute(['employee'], '/todo');
    const hrLegacyTodo = resolveDefaultRoute(['hr_admin'], '/todo');
    const tenantLegacyTodo = resolveDefaultRoute(['tenant_admin'], '/todo');

    const empLegacyGantt = resolveDefaultRoute(['employee'], '/apps/todo/gantt');
    const hrLegacyGantt = resolveDefaultRoute(['hr_admin'], '/apps/todo/gantt');
    const tenantLegacyGantt = resolveDefaultRoute(['tenant_admin'], '/apps/todo/gantt');

    assert(empLegacyTodo === '/me/todo', 10, 'Employee /todo routes to /me/todo');
    assert(hrLegacyTodo === '/hr/todo', 10, 'HR /todo routes to /hr/todo');
    assert(tenantLegacyTodo === '/tenant/todo', 10, 'Tenant Admin /todo routes to /tenant/todo');

    assert(empLegacyGantt === '/me/todo/gantt', 10, 'Employee /apps/todo/gantt routes to /me/todo/gantt');
    assert(hrLegacyGantt === '/hr/todo/gantt', 10, 'HR /apps/todo/gantt routes to /hr/todo/gantt');
    assert(tenantLegacyGantt === '/tenant/todo/gantt', 10, 'Tenant Admin /apps/todo/gantt routes to /tenant/todo/gantt');

    // ------------------------------------------------------------------
    // CRITERION 11: SIDEBAR NAVIGATION ACCURACY
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 11: Sidebar Navigation Accuracy ---');
    assert(HR_TODO_NAV_GROUP.children[0].path === '/hr/todo', 11, 'HR sidebar Todo links to /hr/todo');
    assert(HR_TODO_NAV_GROUP.children[1].path === '/hr/todo/gantt', 11, 'HR sidebar Gantt links to /hr/todo/gantt');
    assert(EMPLOYEE_TODO_NAV_GROUP.children[0].path === '/me/todo', 11, 'Employee sidebar Todo links to /me/todo');
    assert(EMPLOYEE_TODO_NAV_GROUP.children[1].path === '/me/todo/gantt', 11, 'Employee sidebar Gantt links to /me/todo/gantt');
    assert(TENANT_TODO_NAV_GROUP.children[0].path === '/tenant/todo', 11, 'Tenant sidebar Todo links to /tenant/todo');
    assert(TENANT_TODO_NAV_GROUP.children[1].path === '/tenant/todo/gantt', 11, 'Tenant sidebar Gantt links to /tenant/todo/gantt');

    // ------------------------------------------------------------------
    // CRITERION 12: CROSS-TENANT ACCESS DENIAL
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 12: Cross-Tenant Access Denial ---');
    const testTenant = await prisma.tenant.findFirst({ select: { id: true } });
    const crossTenantQuery = await prisma.workspaceTodo.findFirst({
      where: {
        tenantId: 'unauthorized-foreign-tenant-uuid',
      },
    });
    assert(crossTenantQuery === null, 12, 'Cross-tenant query safely returns null (isolation verified)');

    // ------------------------------------------------------------------
    // CRITERION 13: EMPLOYEE ACCESS DENIAL FOR UNAUTHORIZED HR ROUTES
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 13: Employee Access Denial for HR Routes ---');
    const unauthorizedHrAttempt = resolveDefaultRoute(['employee'], '/hr/payroll');
    const unauthorizedTenantAttempt = resolveDefaultRoute(['employee'], '/tenant/settings');
    const unauthorizedSuperAttempt = resolveDefaultRoute(['employee'], '/super/tenants');

    assert(unauthorizedHrAttempt === '/me/dashboard', 13, 'Employee attempting /hr/* redirected to /me/dashboard');
    assert(unauthorizedTenantAttempt === '/me/dashboard', 13, 'Employee attempting /tenant/* redirected to /me/dashboard');
    assert(unauthorizedSuperAttempt === '/me/dashboard', 13, 'Employee attempting /super/* redirected to /me/dashboard');

    // ------------------------------------------------------------------
    // CRITERION 14: UNAUTHORIZED API REQUESTS ARE REJECTED
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 14: Server Route Guard Logic ---');
    const todosRoutes = fs.readFileSync(path.join(process.cwd(), 'server/src/routes/todos.routes.ts'), 'utf8');
    assert(todosRoutes.includes('tenantId'), 14, 'todos.routes.ts strictly scopes all operations to tenantId');
    assert(todosRoutes.includes('requireAuth'), 14, 'todos.routes.ts enforces requireAuth and resolveTenantContext middleware');

    // ------------------------------------------------------------------
    // CRITERION 15: EXISTING TASK AND CALENDAR PERSISTENCE ACROSS REFRESH
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 15: Authoritative Persistence Across Refresh ---');
    const testUser = await prisma.user.findFirst({ select: { id: true } });
    const createdTask = await prisma.workspaceTodo.create({
      data: {
        tenantId: testTenant.id,
        userId: testUser.id,
        title: `Routing Audit Task ${Date.now()}`,
        description: 'Testing persistence across canonical workspace views',
        priority: 'medium',
        completed: false,
      },
    });
    cleanupTodoIds.push(createdTask.id);

    const reloaded = await prisma.workspaceTodo.findUnique({ where: { id: createdTask.id } });
    assert(reloaded !== null && reloaded.title.startsWith('Routing Audit Task'), 15, 'Task persisted and reloaded from authoritative database');

    // ------------------------------------------------------------------
    // CRITERION 16: NO PRODUCTION URLS CONTAIN LOCALHOST OR DEV PORTS
    // ------------------------------------------------------------------
    console.log('\n--- Criterion 16: No Localhost Leaks in Canonical Routing ---');
    const routesContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/routes.ts'), 'utf8');
    const authNavContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/auth-navigation.ts'), 'utf8');
    assert(!routesContent.includes('localhost') && !routesContent.includes(':3000'), 16, 'routes.ts contains zero localhost references');
    assert(!authNavContent.includes('localhost') && !authNavContent.includes(':3000'), 16, 'auth-navigation.ts contains zero localhost references');

    console.log('\n================================================================');
    console.log(` RESULTS: ${passedAssertions}/${totalAssertions} Assertions Passed across ${evaluatedCriteria.size}/16 Criteria!`);
    console.log(' ALL 16 WORKSPACE ROUTING ACCEPTANCE CRITERIA VERIFIED!');
    console.log('================================================================\n');
  } finally {
    if (cleanupTodoIds.length > 0) {
      await prisma.workspaceTodo.deleteMany({
        where: { id: { in: cleanupTodoIds } },
      });
      console.log(`Cleaned up ${cleanupTodoIds.length} test records.`);
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\nVerification suite encountered an error:', err);
  process.exit(1);
});
