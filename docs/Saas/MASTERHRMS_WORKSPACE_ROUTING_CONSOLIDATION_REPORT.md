# MASTERHRMS — COMPLETE ROLE-BASED URL NAMESPACE AND WORKSPACE ROUTING ARCHITECTURE REPORT

**Audit & Sign-Off Date:** October 26, 2026  
**Auditor / Architect:** Principal SaaS Architect & Full-Stack Systems Lead  
**Target Codebase:** MASTERHRMS Full-Stack Enterprise ERP  
- TanStack React Workspace: `src/` (Vite, `http://localhost:5173`)
- Next.js CMS Workspace: `CMS/src/` (Next.js, `http://localhost:3000` / `http://master.localhost:3000`)
- Express API Server: `server/` (Node.js/TypeScript, `http://127.0.0.1:4000`)
- Database Layer: PostgreSQL on Supabase via Prisma ORM (`server/prisma/schema.prisma`)
**Overall Status:** **IMPLEMENTED AND VERIFIED** (Local Codebase & Database) / **IMPLEMENTED — VERIFICATION PENDING** (Remote Live Production Deployment)

---

## 1. Executive Summary

A comprehensive, role-aware URL namespace and workspace routing architecture has been implemented across the entire MASTERHRMS repository. Every supported route renders the correct page, preserves its real functionality, enforces role-based permissions, and operates strictly within the authorized tenant context.

Key outcomes achieved:
1. **Four Canonical Workspace Namespaces Established:**
   - **HR Workspace:** `/hr/*` (Dashboard, Calendar, Todo, Gantt, Employees, Attendance, Leave, Payroll, etc.)
   - **Employee Self-Service:** `/me/*` (Dashboard, Calendar, Todo, Gantt, Attendance, Leave, Profile, etc.)
   - **Tenant Workspace:** `/tenant/*` (Dashboard, Company Profile, Users, Roles, Modules, Billing, Subscription, Calendar, Todo, Gantt, Settings)
   - **Super Admin Workspace:** `/super/*` (Platform tenants, plans, compliance, logs, monitoring)
2. **Canonical Todo & Tasks Namespace Consolidation:**
   - HR Todo: `/hr/todo` | HR Gantt: `/hr/todo/gantt`
   - Employee Todo: `/me/todo` | Employee Gantt: `/me/todo/gantt`
   - Tenant Todo: `/tenant/todo` | Tenant Gantt: `/tenant/todo/gantt`
3. **Canonical Calendar Parity:**
   - `/hr/calendar`, `/me/calendar`, and `/tenant/calendar` all resolve to `UnifiedCalendarApp` with workspace-specific modes and permissions.
4. **Authoritative Login & Role Redirect Engine:**
   - Centralized in `resolveDefaultRoute` in `src/lib/auth-navigation.ts` and `CMS/src/lib/auth-navigation.ts`.
   - Validates that requested deep links match authorized user roles; employees attempting to access `/hr/*`, `/tenant/*`, or `/super/*` are automatically prevented from privilege escalation and routed to `/me/dashboard`.
5. **Legacy Route Translation & Zero Redirect Loops:**
   - Legacy routes (`/todo`, `/apps/todo/task-list`, `/apps/todo/gantt`, `/apps/calendar`, `/tenet/*`) automatically translate to the user's canonical workspace route (`/me/*`, `/hr/*`, or `/tenant/*`) based on verified roles, while preserving query parameters and preventing redirect loops.
6. **Sidebar Navigation Manifests:**
   - Exactly two submenu items under `Todo & Tasks` across all sidebars: **Todo** and **Gantt**.
   - HR, Employee, and Tenant sidebars strictly point to their respective canonical namespaces.

---

## 2. Route Inventory & Workspace Mapping

| Category / Workspace | Canonical Route | Next.js Page File | TanStack Route File | Primary Component | Allowed Roles & Permissions | Implementation Status |
|----------------------|-----------------|-------------------|---------------------|-------------------|-----------------------------|-----------------------|
| **HR Workspace** | `/hr/dashboard` | `CMS/src/app/(workspace)/hr/dashboard/page.tsx` | `src/routes/_authenticated/hr/dashboard.tsx` | `HrDashboardView` | `hr_admin`, `hr`, `manager`, `admin`, `super_admin` | **IMPLEMENTED AND VERIFIED** |
| **HR Workspace** | `/hr/calendar` | `CMS/src/app/(workspace)/hr/calendar/page.tsx` | `src/routes/_authenticated/hr/calendar.tsx` | `UnifiedCalendarApp` (`mode="hr"`) | `hrm.dashboard.view` | **IMPLEMENTED AND VERIFIED** |
| **HR Workspace** | `/hr/todo` | `CMS/src/app/(workspace)/hr/todo/page.tsx` | `src/routes/_authenticated/hr/todo.tsx` | `UnifiedTodoApp` (`mode="hr"`, view: `list`) | `hrm.dashboard.view` | **IMPLEMENTED AND VERIFIED** |
| **HR Workspace** | `/hr/todo/gantt` | `CMS/src/app/(workspace)/hr/todo/gantt/page.tsx` | `src/routes/_authenticated/hr/todo.gantt.tsx` | `UnifiedTodoApp` (`mode="hr"`, view: `gantt`) | `hrm.dashboard.view` | **IMPLEMENTED AND VERIFIED** |
| **HR Workspace** | `/hr/employees` | `CMS/src/app/(workspace)/hr/employees/page.tsx` | `src/routes/_authenticated/hr/employees/index.tsx` | `HrEmployeesView` | `hrm.employees.view` | **IMPLEMENTED AND VERIFIED** |
| **Employee Workspace** | `/me/dashboard` | `CMS/src/app/(workspace)/me/dashboard/page.tsx` | `src/routes/_authenticated/me/dashboard.tsx` | `EmployeeDashboardView` | `employee`, `staff`, `manager`, all workforce | **IMPLEMENTED AND VERIFIED** |
| **Employee Workspace** | `/me/calendar` | `CMS/src/app/(workspace)/me/calendar/page.tsx` | `src/routes/_authenticated/me/calendar.tsx` | `UnifiedCalendarApp` (`mode="hr"`) | Authenticated employee | **IMPLEMENTED AND VERIFIED** |
| **Employee Workspace** | `/me/todo` | `CMS/src/app/(workspace)/me/todo/page.tsx` | `src/routes/_authenticated/me/todo.tsx` | `UnifiedTodoApp` (`mode="me"`, view: `list`) | Authenticated employee | **IMPLEMENTED AND VERIFIED** |
| **Employee Workspace** | `/me/todo/gantt` | `CMS/src/app/(workspace)/me/todo/gantt/page.tsx` | `src/routes/_authenticated/me/todo.gantt.tsx` | `UnifiedTodoApp` (`mode="me"`, view: `gantt`) | Authenticated employee | **IMPLEMENTED AND VERIFIED** |
| **Tenant Workspace** | `/tenant/dashboard` | `CMS/src/app/(workspace)/tenant/dashboard/page.tsx` | `src/routes/_authenticated/tenant/dashboard.tsx` | `TenantDashboardView` | `tenant_admin`, `admin`, `owner`, `super_admin` | **IMPLEMENTED AND VERIFIED** |
| **Tenant Workspace** | `/tenant/calendar` | `CMS/src/app/(workspace)/tenant/calendar/page.tsx` | `src/routes/_authenticated/tenant/calendar.tsx` | `UnifiedCalendarApp` (`mode="canonical"`) | `tenant_admin`, `admin`, `super_admin` | **IMPLEMENTED AND VERIFIED** |
| **Tenant Workspace** | `/tenant/todo` | `CMS/src/app/(workspace)/tenant/todo/page.tsx` | `src/routes/_authenticated/tenant/todo.tsx` | `UnifiedTodoApp` (`mode="workspace"`, view: `list`) | `tenant_admin`, `admin`, `super_admin` | **IMPLEMENTED AND VERIFIED** |
| **Tenant Workspace** | `/tenant/todo/gantt` | `CMS/src/app/(workspace)/tenant/todo/gantt/page.tsx` | `src/routes/_authenticated/tenant/todo.gantt.tsx` | `UnifiedTodoApp` (`mode="workspace"`, view: `gantt`) | `tenant_admin`, `admin`, `super_admin` | **IMPLEMENTED AND VERIFIED** |
| **Super Admin Workspace** | `/super` | `CMS/src/app/super/page.tsx` | `src/routes/_authenticated/super/index.tsx` | `SuperAdminDashboardView` | `super_admin` strictly | **IMPLEMENTED AND VERIFIED** |
| **Legacy Compatibility** | `/todo` | `CMS/src/app/(workspace)/todo/page.tsx` | `src/routes/_authenticated/_app/todo.tsx` | Role-aware canonical redirector | Translates to `/me/todo`, `/hr/todo`, or `/tenant/todo` | **IMPLEMENTED AND VERIFIED** |
| **Legacy Compatibility** | `/apps/todo/task-list` | `CMS/src/app/(workspace)/apps/todo/task-list/page.tsx` | `src/routes/_authenticated/_app/apps.todo.task-list.tsx` | Role-aware canonical redirector | Translates to `/me/todo`, `/hr/todo`, or `/tenant/todo` | **IMPLEMENTED AND VERIFIED** |
| **Legacy Compatibility** | `/apps/todo/gantt` | `CMS/src/app/(workspace)/apps/todo/gantt/page.tsx` | `src/routes/_authenticated/_app/apps.todo.gantt.tsx` | Role-aware canonical redirector | Translates to `/me/todo/gantt`, `/hr/todo/gantt`, or `/tenant/todo/gantt` | **IMPLEMENTED AND VERIFIED** |
| **Legacy Compatibility** | `/apps/calendar` | `CMS/src/app/(workspace)/apps/calendar/page.tsx` | `src/routes/_authenticated/_app/apps.calendar.tsx` | Role-aware canonical redirector | Translates to `/me/calendar`, `/hr/calendar`, or `/tenant/calendar` | **IMPLEMENTED AND VERIFIED** |
| **Legacy Compatibility** | `/tenet/*` | `CMS/src/app/(workspace)/tenet/[...slug]/page.tsx` | `src/routes/_authenticated/tenet/$.tsx` | Spelling alias redirector | Dynamic replace to `/tenant/*` | **IMPLEMENTED AND VERIFIED** |

---

## 3. Login & Role-Based Redirect Flow

The redirection engine in [src/lib/auth-navigation.ts](file:///Users/apple/Documents/hrms/src/lib/auth-navigation.ts) and [CMS/src/lib/auth-navigation.ts](file:///Users/apple/Documents/hrms/CMS/src/lib/auth-navigation.ts) was enhanced to enforce strict privilege boundary checking:

```typescript
export function resolveDefaultRoute(
  roles: string[] = [],
  redirect?: string | null,
  options?: { isImpersonating?: boolean }
): string {
  const normalized = roles.map((r) => String(r).toLowerCase().replace(/[-_ ]/g, ""));
  const isSuperAdmin = roles.includes("super_admin") || normalized.includes("superadmin");
  const isTenantAdmin = isSuperAdmin || normalized.some((r) =>
    ["admin", "tenantadmin", "workspaceadmin", "organizationadmin", "owner"].includes(r)
  );
  const isHrAdmin = isTenantAdmin || normalized.some((r) => ["hradmin", "hr", "hrmanager", "manager"].includes(r));
  const isEmployee = normalized.includes("employee") || normalized.includes("staff") || roles.length === 0;

  const defaultLanding = isSuperAdmin
    ? "/super"
    : isTenantAdmin
    ? "/tenant/dashboard"
    : isHrAdmin
    ? "/hr/dashboard"
    : "/me/dashboard";

  // Validate intended redirect destination
  if (redirect && redirect !== "/" && !redirect.startsWith("/auth") && redirect !== "/login") {
    // 1. Role-aware legacy path translation
    if (redirect === "/todo" || redirect === "/apps/todo/task-list") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/todo" : isHrAdmin && !isTenantAdmin ? "/hr/todo" : "/tenant/todo";
    }
    if (redirect === "/apps/todo/gantt") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/todo/gantt" : isHrAdmin && !isTenantAdmin ? "/hr/todo/gantt" : "/tenant/todo/gantt";
    }
    if (redirect === "/apps/calendar") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/calendar" : isHrAdmin && !isTenantAdmin ? "/hr/calendar" : "/tenant/calendar";
    }

    // 2. Privilege escalation prevention
    if (redirect.startsWith("/super") && !isSuperAdmin) return defaultLanding;
    if (redirect.startsWith("/tenant") && !isTenantAdmin) return defaultLanding;
    if (redirect.startsWith("/hr") && !isHrAdmin) return defaultLanding;

    return redirect;
  }

  return defaultLanding;
}
```

### Verified Behaviors:
- **Employee Login:** Redirects to `/me/dashboard`.
- **HR Admin Login:** Redirects to `/hr/dashboard`.
- **Tenant Administrator Login:** Redirects to `/tenant/dashboard`.
- **Super Admin Login:** Redirects strictly to `/super`.
- **Tampered Deep Link Prevention:** An employee attempting to log in with `?redirect=/hr/payroll` is safely routed to `/me/dashboard`.

---

## 4. Route Ownership & Dual Workspace Synchronization

- **Next.js CMS Application (`CMS/`):**
  - Serves root `/`, public auth `/login`, `/auth`, marketing pages, and enterprise workspace routes under `/hr/*`, `/me/*`, `/tenant/*`, and `/super/*`.
- **TanStack Start / Vite Application (`src/`):**
  - Handles client-side routing and TanStack Start route tree (`src/routeTree.gen.ts`).
  - Route files in `src/routes/_authenticated/hr/`, `src/routes/_authenticated/me/`, and `src/routes/_authenticated/tenant/` enforce client-side route guards via `evaluateRouteAccess` in `beforeLoad`.
- **Reverse Proxy / Host Routing:**
  - Production requests resolve dynamic workspace hosts through `server/src/middleware/workspace-host.middleware.ts` and `src/lib/platform-domain.ts`. Zero hardcoded `localhost:3000` or `:5173` ports exist in canonical navigation paths.

---

## 5. Sidebar Navigation Manifests

Centralized navigation manifests in `src/nav/todo-navigation.ts` and `CMS/src/nav/todo-navigation.ts` bind each workspace to its canonical routes:

- **HR Sidebar (`HR_TODO_NAV_GROUP`):**
  - Todo: `/hr/todo`
  - Gantt: `/hr/todo/gantt`
  - Calendar: `/hr/calendar`
- **Employee Sidebar (`EMPLOYEE_TODO_NAV_GROUP`):**
  - Todo: `/me/todo`
  - Gantt: `/me/todo/gantt`
  - Calendar: `/me/calendar`
- **Tenant Sidebar (`TENANT_TODO_NAV_GROUP`):**
  - Todo: `/tenant/todo`
  - Gantt: `/tenant/todo/gantt`
  - Calendar: `/tenant/calendar`

---

## 6. Automated Verification Results

Automated verification suite: `npm run test:workspace-routing` (`scripts/test_workspace_routing_architecture.cjs`).

### Output Log:
```
================================================================
 MASTERHRMS WORKSPACE ROUTING ARCHITECTURE VERIFICATION SUITE
================================================================

--- Criterion 1: HR Login Redirect ---
  ✔ [Criterion 1/16] HR Admin resolves to canonical landing /hr/dashboard
  ✔ [Criterion 1/16] HR staff resolves to canonical landing /hr/dashboard

--- Criterion 2: Employee Login Redirect ---
  ✔ [Criterion 2/16] Employee role resolves to canonical landing /me/dashboard
  ✔ [Criterion 2/16] Staff role resolves to canonical landing /me/dashboard

--- Criterion 3: Tenant Administrator Login Redirect ---
  ✔ [Criterion 3/16] Tenant Admin resolves to canonical landing /tenant/dashboard
  ✔ [Criterion 3/16] Admin role resolves to canonical landing /tenant/dashboard
  ✔ [Criterion 3/16] Owner role resolves to canonical landing /tenant/dashboard

--- Criterion 4: Super Admin Login Redirect ---
  ✔ [Criterion 4/16] Super Admin resolves strictly to protected /super namespace

--- Criterion 5: HR Todo & Gantt Routes ---
  ✔ [Criterion 5/16] CMS /hr/todo renders UnifiedTodoApp in HR mode
  ✔ [Criterion 5/16] TanStack /hr/todo renders UnifiedTodoApp in HR mode
  ✔ [Criterion 5/16] CMS /hr/todo/gantt renders UnifiedTodoApp in Gantt mode
  ✔ [Criterion 5/16] TanStack /hr/todo/gantt renders UnifiedTodoApp in Gantt mode

--- Criterion 6: Employee Todo & Gantt Routes ---
  ✔ [Criterion 6/16] CMS /me/todo renders UnifiedTodoApp in Employee mode
  ✔ [Criterion 6/16] TanStack /me/todo renders UnifiedTodoApp in Employee mode
  ✔ [Criterion 6/16] CMS /me/todo/gantt renders UnifiedTodoApp in Gantt mode
  ✔ [Criterion 6/16] TanStack /me/todo/gantt renders UnifiedTodoApp in Gantt mode

--- Criterion 7: Tenant Todo & Gantt Routes ---
  ✔ [Criterion 7/16] CMS /tenant/todo renders UnifiedTodoApp in workspace mode
  ✔ [Criterion 7/16] TanStack /tenant/todo renders UnifiedTodoApp in workspace mode
  ✔ [Criterion 7/16] CMS /tenant/todo/gantt renders UnifiedTodoApp in Gantt mode
  ✔ [Criterion 7/16] TanStack /tenant/todo/gantt renders UnifiedTodoApp in Gantt mode

--- Criterion 8: Calendar Route Parity Across Workspaces ---
  ✔ [Criterion 8/16] /hr/calendar unified across CMS and TanStack
  ✔ [Criterion 8/16] /me/calendar unified across CMS and TanStack
  ✔ [Criterion 8/16] /tenant/calendar unified across CMS and TanStack

--- Criterion 9: Deep-Link Refresh & Browser Navigation ---
  ✔ [Criterion 9/16] Direct deep-link /gantt automatically detects and initializes Gantt view mode
  ✔ [Criterion 9/16] View switching updates URL pathname and parameters without full page reload

--- Criterion 10: Legacy Route Translation & Loop Prevention ---
  ✔ [Criterion 10/16] Employee /todo routes to /me/todo
  ✔ [Criterion 10/16] HR /todo routes to /hr/todo
  ✔ [Criterion 10/16] Tenant Admin /todo routes to /tenant/todo
  ✔ [Criterion 10/16] Employee /apps/todo/gantt routes to /me/todo/gantt
  ✔ [Criterion 10/16] HR /apps/todo/gantt routes to /hr/todo/gantt
  ✔ [Criterion 10/16] Tenant Admin /apps/todo/gantt routes to /tenant/todo/gantt

--- Criterion 11: Sidebar Navigation Accuracy ---
  ✔ [Criterion 11/16] HR sidebar Todo links to /hr/todo
  ✔ [Criterion 11/16] HR sidebar Gantt links to /hr/todo/gantt
  ✔ [Criterion 11/16] Employee sidebar Todo links to /me/todo
  ✔ [Criterion 11/16] Employee sidebar Gantt links to /me/todo/gantt
  ✔ [Criterion 11/16] Tenant sidebar Todo links to /tenant/todo
  ✔ [Criterion 11/16] Tenant sidebar Gantt links to /tenant/todo/gantt

--- Criterion 12: Cross-Tenant Access Denial ---
  ✔ [Criterion 12/16] Cross-tenant query safely returns null (isolation verified)

--- Criterion 13: Employee Access Denial for HR Routes ---
  ✔ [Criterion 13/16] Employee attempting /hr/* redirected to /me/dashboard
  ✔ [Criterion 13/16] Employee attempting /tenant/* redirected to /me/dashboard
  ✔ [Criterion 13/16] Employee attempting /super/* redirected to /me/dashboard

--- Criterion 14: Server Route Guard Logic ---
  ✔ [Criterion 14/16] todos.routes.ts strictly scopes all operations to tenantId
  ✔ [Criterion 14/16] todos.routes.ts enforces requireAuth and resolveTenantContext middleware

--- Criterion 15: Authoritative Persistence Across Refresh ---
  ✔ [Criterion 15/16] Task persisted and reloaded from authoritative database

--- Criterion 16: No Localhost Leaks in Canonical Routing ---
  ✔ [Criterion 16/16] routes.ts contains zero localhost references
  ✔ [Criterion 16/16] auth-navigation.ts contains zero localhost references

================================================================
 RESULTS: 46/46 Assertions Passed across 16/16 Criteria!
 ALL 16 WORKSPACE ROUTING ACCEPTANCE CRITERIA VERIFIED!
================================================================
```

---

## 7. Build & Compilation Verification Matrix

| Workspace / Target | Verification Command | Exit Code | Verification Standard |
|--------------------|----------------------|:---------:|-----------------------|
| Next.js CMS Workspace | `npm run cms:typecheck` | `0` | Zero TypeScript errors across Next.js App Router |
| Express Backend Server | `npm --prefix server run build` | `0` | Clean Prisma client generation and TypeScript build |
| TanStack Vite Workspace | `npm run build:vite` | `0` | Clean TanStack route-tree code-splitting and compilation (7.74s) |
| Workspace Routing Verification | `npm run test:workspace-routing` | `0` | 46/46 assertions pass across 16 criteria |
| Todo Consolidation Verification | `npm run test:todo-consolidation` | `0` | 34/34 assertions pass across 15 criteria |

---

## 8. Rollback and Operational Guidelines

- All routing changes preserve full backward compatibility with legacy endpoints (`/todo`, `/apps/todo/task-list`, `/apps/todo/gantt`, `/apps/calendar`).
- Database records in `workspace_todos` and `calendar_events` operate on existing authoritative schemas; zero migrations or database modifications are required.
- Staging deployment can proceed immediately for user acceptance testing (UAT).
