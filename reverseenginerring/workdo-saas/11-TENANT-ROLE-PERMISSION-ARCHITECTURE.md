# 11 — MASTERHRMS RBAC & Role-Permission Architecture
> Status: **IMPLEMENTED** | Evidence from Codebase Audit

---

## 1. Overview & Dual RBAC Model

MASTERHRMS implements a two-tier RBAC architecture:

1. **System / Platform Role Tier (`UserRole` model)**:
   - Global or workspace-scoped administrative role assignment (`super_admin`, `hr_admin`, `employee`, `client`, `manager`).
   - Controls top-level access guards (`requireAuth`, `requireSuperAdmin`, `requireHrAdmin`).
2. **Fine-Grained Granular Workspace RBAC Tier (`WorkspaceRole`, `Permission`, `RolePermission`, `UserRoleAssignment` models)**:
   - Dynamic, customizable tenant roles with module/resource/action-level permissions.
   - Seeded with 6 standard organizational roles and supports custom tenant roles.
   - Enforces data scoping (Self, Team, Department, Branch, All) and dynamic allowed actions.

---

## 2. Prisma Database Schema Models

**File:** `server/prisma/schema.prisma`

### 2.1 Core Relational Models

```prisma
model UserRole {
  id        String   @id @default(uuid()) @db.VarChar(36)
  userId    String   @map("user_id") @db.VarChar(36)
  role      AppRole  @default(employee)
  tenantId  String?  @map("tenant_id") @db.VarChar(36)
  createdAt DateTime @default(now()) @map("created_at")
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role, tenantId])
  @@map("user_roles")
}

model WorkspaceRole {
  id              String               @id @default(uuid()) @db.VarChar(36)
  tenantId        String               @map("tenant_id") @db.VarChar(36)
  name            String               @db.VarChar(100)
  description     String?              @db.VarChar(255)
  isSystem        Boolean              @default(false) @map("is_system")
  isActive        Boolean              @default(true) @map("is_active")
  createdAt       DateTime             @default(now()) @map("created_at")
  updatedAt       DateTime             @updatedAt @map("updated_at")
  permissions     RolePermission[]
  userAssignments UserRoleAssignment[]
  tenant          Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name])
  @@map("workspace_roles")
}

model Permission {
  id              String           @id @default(uuid()) @db.VarChar(36)
  code            String           @unique @db.VarChar(100)
  module          String           @db.VarChar(50)
  resource        String           @db.VarChar(50)
  action          String           @db.VarChar(50)
  name            String           @db.VarChar(150)
  description     String?          @db.VarChar(255)
  createdAt       DateTime         @default(now()) @map("created_at")
  rolePermissions RolePermission[]

  @@index([module, resource])
  @@map("permissions")
}

model RolePermission {
  id           String        @id @default(uuid()) @db.VarChar(36)
  roleId       String        @map("role_id") @db.VarChar(36)
  permissionId String        @map("permission_id") @db.VarChar(36)
  createdAt    DateTime      @default(now()) @map("created_at")
  permission   Permission    @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  role         WorkspaceRole @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

model UserRoleAssignment {
  id        String        @id @default(uuid()) @db.VarChar(36)
  userId    String        @map("user_id") @db.VarChar(36)
  roleId    String        @map("role_id") @db.VarChar(36)
  tenantId  String        @map("tenant_id") @db.VarChar(36)
  createdAt DateTime      @default(now()) @map("created_at")
  role      WorkspaceRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
  tenant    Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@map("user_role_assignments")
}
```

---

## 3. Seeded Standard Workspace Roles

**File:** `server/src/lib/seed-rbac.ts`

When a tenant is provisioned or seeded, 6 standard system/functional roles are established:

| Role Name | Description | Scope / Permissions |
|-----------|-------------|---------------------|
| **Workspace Admin** | Full administrative access to all workspace ERP modules, settings, users, and roles | All permissions across all active modules (`isSystem: true`) |
| **HR Manager** | Full access to Human Resources, Employees, Attendance, Leaves and Payroll | All `hrm.*` permissions + `analytics.dashboard.view`, `analytics.reports.view` |
| **Sales Manager** | Access to Sales CRM, Deals, Proposals, Inventory, Projects and Customer Support | 30 permissions across CRM, Inventory, Projects, Support, Analytics |
| **Finance Manager** | Invoicing, Expenses, Accounts, ledgers, and payment approvals | All `finance.*` permissions + `crm.quotations.approve`, `procurement.purchase_orders.view` |
| **Inventory Manager** | Catalog, Warehouses, Stock Adjustments, and Purchase tracking | All `inventory.*` permissions + `pos.terminal.view`, `procurement.purchase_orders.view` |
| **Employee** | Standard self-service attendance, leave submission, and assigned tasks | Self-service: `hrm.dashboard.view`, `attendance.view/create`, `leave.view/create`, `project.tasks.view`, `support.tickets.view/create` |

---

## 4. Module & Permission Catalog

**File:** `server/src/lib/erp-modules.ts`

The system defines 9 Core ERP Modules, each with structured resources and actions (`view`, `create`, `edit`, `delete`, `export`, `approve`, `manage`):

1. **`hrm`**: Human Resources (Employees, Sensitive, Documents, Attendance, Leave, Payroll)
2. **`pos`**: Point of Sale (Terminal, Sales, Receipts & Invoices)
3. **`inventory`**: Inventory Management (Products Catalog, Stock Levels, Categories, Warehouses)
4. **`crm`**: Sales CRM (Leads, Customers, Quotations & Proposals, Deals Pipeline)
5. **`finance`**: Accounting & Finance (Invoices & Billing, Expense Claims, General Ledger & Accounts)
6. **`project`**: Project Management (Project Registry, Tasks & Kanban, Milestones)
7. **`support`**: Helpdesk & Support (Support Tickets, SLA Policies, Knowledge Base)
8. **`procurement`**: Procurement & Purchases (Vendors & Suppliers, Purchase Orders, Goods Receipt Notes)
9. **`analytics`**: Business Analytics (Executive Dashboard, Operational Reports, Custom Metrics)

---

## 5. Organizational Data Scope & Hierarchy Resolution

**File:** `server/src/lib/data-scope.ts`

### 5.1 Security Context & Hierarchical Resolution

The server dynamically computes `UserSecurityContext` without trusting client-side headers:
- `isSuperAdmin` & `isTenantAdmin`
- Direct report IDs (`managerId === employeeId`)
- Recursive subordinate IDs resolved via Breadth-First Search (BFS) graph traversal across the employee hierarchy

```typescript
export type DataScope =
  | "SELF"
  | "TEAM_DIRECT"
  | "TEAM_ALL"
  | "DEPARTMENT"
  | "BRANCH"
  | "ALL";
```

### 5.2 Dynamic Allowed Actions

**File:** `server/src/lib/allowed-actions.ts`

`computeAllowedActions(entityType, record, userContext, permissions)` dynamically returns permitted actions based on workflow status and ownership:
- **Employee**: `VIEW`, `EDIT`, `TRANSFER`, `DEACTIVATE`, `DELETE`, `EDIT_PROFILE`, `REQUEST_CHANGE`
- **LeaveRequest**:
  - `DRAFT` → `EDIT`, `SUBMIT`, `DELETE`
  - `PENDING` → `WITHDRAW` (owner), `APPROVE`, `REJECT`, `DELEGATE` (manager/admin)
  - `APPROVED` → `CANCEL`, `DOWNLOAD_RECEIPT`
  - `REJECTED` → `RESUBMIT`
- **ApprovalRequest**: `WITHDRAW`, `APPROVE`, `REJECT`, `DELEGATE`

---

## 6. Field-Level Security & Redaction

**File:** `server/src/lib/field-security.ts`

Sensitive PII and financial fields are protected based on data classifications:
- Salary, Bank Account, IFSC, PAN, Aadhaar, ESI Number are strictly masked for non-privileged viewers.
- Only users with `hr.sensitive.view` or `isTenantAdmin` have access to unmasked payroll and statutory credentials.
