# 05. Role & Permission Matrix Implementation Report

This document details the audit and implementation of the Role & Permission Management interface in MASTERHRMS, comparing it against the WorkDo Spatie-style permission architecture.

---

## 1. Database Architecture & Permissions Inventory

Unlike platforms that rely on hardcoded static strings, MASTERHRMS features a fully relational, database-backed RBAC architecture seeded in PostgreSQL:

- **Total Permissions in Database**: `140` active permissions across all ERP and HRM modules.
- **Relational Schema**:
  - `WorkspaceRole`: Tenant-scoped role entity (`@@unique([tenantId, name])`).
  - `Permission`: Master catalog with `code` (e.g., `hrm.payroll.export`), `module`, `resource`, `action`, `name`, and `description`.
  - `RolePermission`: Join table linking roles to granted permission records (`@@unique([roleId, permissionId])`).
  - `UserRoleAssignment`: Associates a tenant's users with custom roles (`@@unique([userId, tenantId])`).

---

## 2. Supported Module Matrix & Available Actions

The 140 database-backed permissions cover all functional modules and actions:

| Module Key | Module Name | Resources Covered | Supported Actions |
|---|---|---|---|
| `hrm` | Human Resource Management | `employees`, `attendance`, `leave`, `payroll`, `recruitment`, `training`, `awards` | `view`, `create`, `edit`, `delete`, `approve`, `reject`, `export`, `import`, `manage` |
| `organization`| Organization Structure | `branches`, `departments`, `designations`, `holidays`, `announcements` | `view`, `create`, `edit`, `delete`, `manage` |
| `workspace` | Tenant Administration | `settings`, `users`, `roles`, `modules`, `branding`, `domains` | `view`, `edit`, `manage` |
| `project` | Projects & Tasks | `projects`, `tasks`, `milestones`, `timesheets` | `view`, `create`, `edit`, `delete`, `manage` |
| `crm` | Customer Relationship Mgmt | `leads`, `deals`, `contacts`, `pipelines` | `view`, `create`, `edit`, `delete`, `export` |
| `inventory` | Stock & Warehouse | `products`, `categories`, `warehouses`, `adjustments` | `view`, `create`, `edit`, `delete`, `export` |
| `procurement`| Procurement & Vendors | `vendors`, `purchase_orders`, `requests` | `view`, `create`, `edit`, `delete`, `export` |

---

## 3. UI Component Capabilities

- **Component**: `src/components/workspace-admin-settings.tsx` (Sub-tab: `roles`)
- **Route**: `/tenant/roles`
- **Features Verified**:
  1. **Dynamic Permission Tree**: Categorized by ERP module with collapsible accordions.
  2. **Select All / Deselect All**: 1-click bulk toggle per module and across the entire matrix.
  3. **Role Cloning ("Duplicate Role")**: 1-click duplication via `POST /api/workspace/roles/:id/duplicate`.
  4. **System Role Protection**: System-defined default roles cannot be deleted or renamed.
  5. **Assignment Guard**: Deletion is blocked if active users remain assigned to the role (`role._count.userAssignments > 0`).
  6. **Real-Time Auth Cache Invalidation**: Saving permissions immediately invokes `invalidateAuthCache(userId, tenantId)` across active sessions.
