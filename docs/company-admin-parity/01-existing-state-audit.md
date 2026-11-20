# 01. Existing-State Audit & Forensic Gap Matrix

This document presents the detailed architectural and forensic audit of MASTERHRMS's existing Company Admin foundation, benchmarking the local implementation against the WorkDo HRMS reference reports (`docs/workdo-reverse-engineering/`).

---

## 1. Architectural Component Inspection

### 1.1 Existing Routes & Layouts
- **Layout Shell**: `src/routes/_authenticated/tenant.tsx` wraps `AppShell` (`src/routes/_authenticated/_app/route.tsx`) with `evaluateRouteAccess({ targetPortal: "tenant" })`.
- **Navigation Registry**: Configured in `src/nav/registry.ts` under `TENANT_NAVIGATION_REGISTRY` (lines 1730-2030) and consumed by `PortalSidebar` (`src/components/navigation/portal-sidebar.tsx`).
- **Portal Views**:
  - `src/routes/_authenticated/tenant/dashboard.tsx`: Tenant dashboard with quick stats, attendance overview, and module links.
  - `src/routes/_authenticated/tenant/company-profile.tsx`: Full company legal profile and GST identity editor.
  - `src/routes/_authenticated/tenant/settings.tsx`: Scoped settings shell for locale, branding, and system preferences.
  - `src/routes/_authenticated/tenant/users.tsx`: User list and invite modal.
  - `src/routes/_authenticated/tenant/roles.tsx`: Workspace role administration and permission assignment.
  - `src/routes/_authenticated/tenant/modules.tsx`: Modular add-on toggles (ERP modules).
  - `src/routes/_authenticated/tenant/billing.tsx` & `subscription.tsx`: Subscription quota and plan usage.
  - `src/routes/_authenticated/tenant/audit-logs.tsx`: Tenant-scoped activity audit trail.

---

### 1.2 Existing Prisma Models (`server/prisma/schema.prisma`)
The database schema natively supports full tenant-scoped RBAC and organizational hierarchy:

| Model Name | Table Name | Key Fields | Purpose / Cardinality |
|---|---|---|---|
| `Tenant` | `tenants` | `id`, `name`, `slug`, `status` | Core workspace root entity |
| `WorkspaceRole` | `workspace_roles` | `id`, `tenantId`, `name`, `isSystem`, `isActive` | Tenant-scoped custom and system roles (`@@unique([tenantId, name])`) |
| `Permission` | `permissions` | `id`, `code`, `module`, `resource`, `action`, `name` | Global master permission registry |
| `RolePermission` | `role_permissions` | `id`, `roleId`, `permissionId` | Join table binding permissions to roles (`@@unique([roleId, permissionId])`) |
| `UserRoleAssignment` | `user_role_assignments` | `id`, `userId`, `roleId`, `tenantId` | Assigns a tenant workspace role to a user (`@@unique([userId, tenantId])`) |
| `Branch` | `branches` | `id`, `tenantId`, `name`, `code`, `status` | Physical or logical company branches |
| `Department` | `departments` | `id`, `tenantId`, `branchId`, `name`, `status` | Functional departments linked to branches |
| `Designation` | `designations` | `id`, `tenantId`, `departmentId`, `name`, `status` | Job titles and organizational hierarchy |
| `Employee` | `employees` | `id`, `tenantId`, `userId`, `branchId`, `departmentId` | Active workforce entity linked to `User` |

---

### 1.3 Backend APIs & Authorization Middleware (`server/src/`)
- **Middleware**:
  - `requireAuth` (`server/src/middleware/authMiddleware.ts`): Extracts JWT, validates expiration, and attaches `req.user` (`id`, `email`, `tenantId`, `roles`).
  - `requireWorkspaceAdminGuard` (`server/src/routes/workspace.routes.ts`): Enforces that `req.user.roles` contains `workspace_admin`, `admin`, `tenant_admin`, or `super_admin`.
- **API Endpoints**:
  - `GET /api/workspace/roles`: Lists all workspace roles with permission counts and assigned user counts.
  - `POST /api/workspace/roles`: Provisions custom workspace role.
  - `PUT /api/workspace/roles/:id`: Updates role name, description, and permission IDs.
  - `POST /api/workspace/roles/:id/duplicate`: Clones existing role.
  - `DELETE /api/workspace/roles/:id`: Deletes unassigned role (fails if users are assigned).
  - `GET /api/workspace/permissions`: Returns complete permission hierarchy.
  - `GET /api/workspace/users`: Lists workspace users with current role assignment.
  - `PUT /api/workspace/users/:userId/role`: Updates user's assigned role and invalidates cached token claims.
  - `GET /api/hr/organization/branches`, `/departments`, `/designations`: Handled by `createMasterDataRouter` with automated dependency checking.

---

## 2. Forensic Gap Matrix

| Area | Feature | WorkDo Reference | MASTERHRMS Existing State | Status | Evidence / File Path |
|---|---|---|---|---|---|
| **Company Config** | Legal Profile (PAN, TAN, CIN, GST) | Basic company fields | Comprehensive GST & Legal Identity | 🟢 Implemented | `src/components/settings/company-profile-settings.tsx`, `/api/v1/company-profile` |
| **Company Config** | Branding (Logo, Favicon, Theme) | Upload brand modal | Upload logos, colors, favicon in `SharedSettingsShell` | 🟢 Implemented | `src/components/settings/shared-settings-shell.tsx`, `/v1/settings/TENANT/branding` |
| **Company Config** | Timezone, Locale, Currency | Basic settings tab | Persisted in `SettingsService` | 🟢 Implemented | `server/src/services/settings.service.ts` |
| **Organisation** | Branches CRUD | Code, Name, Address | Full CRUD with dependency check | 🟢 Implemented | `src/routes/_authenticated/hr/organization/branches.tsx`, `organization.routes.ts` |
| **Organisation** | Departments CRUD | Branch mapping, Name | Branch-linked CRUD with dependency check | 🟢 Implemented | `src/routes/_authenticated/hr/organization/departments.tsx`, `organization.routes.ts` |
| **Organisation** | Designations CRUD | Department mapping, Name | Dept-linked CRUD with employee check | 🟢 Implemented | `src/routes/_authenticated/hr/organization/designations.tsx`, `organization.routes.ts` |
| **Organisation** | Sidebar Direct Link | Direct links in sidebar | Only accessible via HR Panel group | 🟡 Partially Implemented | `src/nav/registry.ts` (Need direct links in `TENANT_NAVIGATION_REGISTRY`) |
| **User Mgmt** | List Workspace Users | Table with name, role, email | Table with name, role, email | 🟢 Implemented | `src/routes/_authenticated/tenant/users.tsx`, `GET /workspace/users` |
| **User Mgmt** | Invite / Create User | Modal with email and role | Invite dialog present, but missing direct creation | 🟡 Partially Implemented | `tenant/users.tsx` |
| **User Mgmt** | Edit User Profile | Modal to edit name/email | 🔴 Missing | Missing | Need Edit User modal in `tenant/users.tsx` |
| **User Mgmt** | Toggle Active/Inactive | Row switch toggle | 🔴 Missing | Missing | Need Toggle status in `tenant/users.tsx` & backend endpoint |
| **User Mgmt** | Reset Password | Row action modal | 🔴 Missing | Missing | Need Reset Password modal in `tenant/users.tsx` & endpoint |
| **User Mgmt** | Map User to Employee | Dropdown selector | 🔴 Missing | Missing | Need Employee linkage in `tenant/users.tsx` |
| **Role & RBAC** | Role Management | 19 roles, CRUD | Custom role CRUD + Duplicate + Delete | 🟢 Implemented | `src/components/workspace-admin-settings.tsx`, `/workspace/roles` |
| **Role & RBAC** | Permission Matrix | Checkbox grid by module | Module-categorized permission checkboxes | 🟢 Implemented | `src/components/workspace-admin-settings.tsx`, `/workspace/permissions` |
| **Role & RBAC** | Backend Enforcement | Spatie gate checks | Middleware guards on routes | 🟢 Implemented | `requireWorkspaceAdminGuard`, `requireAuth` |
| **Security** | Cross-Tenant Read Block | Row-level `workspace_id` | `where: { tenantId }` in all Prisma queries | 🟢 Implemented | `organization.routes.ts`, `workspace.routes.ts` |
| **Security** | Cross-Tenant Modify Block | 404 / 403 on foreign ID | Verified foreign ID check in all mutations | 🟢 Implemented | `workspace.routes.ts` lines 784-798 |
| **Audit Logs** | User Action History | Action log table | Full audit trail in `tenant/audit-logs.tsx` | 🟢 Implemented | `src/routes/_authenticated/tenant/audit-logs.tsx`, `audit-logs.routes.ts` |

---

## 3. Targeted Remediation Tasks for Phase 2

1. **Organization Navigation Parity**: Add direct child links for Branches, Departments, and Designations to `TENANT_NAVIGATION_REGISTRY` in `src/nav/registry.ts` so Company Admins can access them directly without switching to the HR portal.
2. **User Management Parity in `src/routes/_authenticated/tenant/users.tsx`**:
   - Add backend endpoints in `server/src/routes/workspace.routes.ts`:
     - `POST /workspace/users`: Direct creation of user account with role assignment and optional employee mapping.
     - `PUT /workspace/users/:userId`: Update user details (fullName, email).
     - `PATCH /workspace/users/:userId/status`: Toggle user active/inactive status.
     - `POST /workspace/users/:userId/reset-password`: Secure password reset with temporary password generation.
   - Add full action cluster in `src/routes/_authenticated/tenant/users.tsx`:
     - Edit User Dialog
     - Activate / Deactivate Toggle Button
     - Change Role Dialog
     - Reset Password Dialog
     - Employee Mapping Badge / Selector
3. **Automated Verification**:
   - Run type-check on web and server.
   - Run cross-tenant security isolation tests.
