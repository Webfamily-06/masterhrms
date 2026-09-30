# Phase 1 Step 3: Prisma Client Auto-Scoping Extension Design

**Document Version**: 1.0.0  
**Status**: Implemented & Empirically Validated  
**Date**: September 26, 2026  
**Auditor & Systems Architect**: Antigravity Deep Forensic Agent  

---

## 1. Executive Summary

In shared-schema multi-tenancy, the greatest security vulnerability is **developer oversight**: accidentally forgetting to include `where: { tenantId }` in a database query. 

Phase 1 Step 3 designs and implements a **Prisma Client Extension (`$extends`)** that intercepts all model queries at the ORM layer and **automatically injects `tenantId`** based on the active request's `AsyncLocalStorage` context.

### Key Architectural Tenets:
1. **Model Classification Architecture**: Explicitly segregates all 107 database models into three categories: `GLOBAL_MODELS`, `DIRECT_TENANT_MODELS`, and `CHILD_DEPENDENT_MODELS`.
2. **Operation-Specific Query Rewriting**: Intercepts `findMany`, `findFirst`, `findUnique`, `count`, `create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`, and `upsert`.
3. **Payload Sanitization**: Automatically overrides client-supplied `tenantId` values on creation to prevent payload forgery attacks.
4. **Isolated Scope**: Integrated strictly for the pilot module and test runners. Global application routes continue running on standard Prisma behavior until Step 4.

---

## 2. Model Classification Architecture

Located in [server/src/config/tenant-models.config.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/config/tenant-models.config.ts):

### 2.1 Category 1: Platform-Global Models (`GLOBAL_MODELS`)
* **Definition**: Models that belong strictly to the platform control plane and have no tenant isolation.
* **List (7 Models)**:
  `User`, `SubscriptionPlan`, `Addon`, `CmsPage`, `Permission`, `RolePermission`, `TwoFactorOtp`.
* **Auto-Scoping Action**: **BYPASSED**. The extension does not alter queries on these models.

### 2.2 Category 2: Direct Tenant Models (`DIRECT_TENANT_MODELS`)
* **Definition**: Primary multi-tenant business entities that possess a direct `tenant_id` column.
* **List (78 Models)**:
  `Announcement`, `Employee`, `Attendance`, `LeaveRequest`, `PayrollRun`, `Payslip`, `Product`, `Sale`, `Invoice`, `ChartOfAccount`, `JournalEntry`, `Asset`, `OkrObjective`, `JobPosting`, `CustomForm`, etc.
* **Auto-Scoping Action**: The extension automatically injects `{ tenantId: context.tenantId }` into `where` clauses, and forces `data.tenantId = context.tenantId` on inserts.

### 2.3 Category 3: Child-Dependent Models (`CHILD_DEPENDENT_MODELS`)
* **Definition**: Child or join tables that belong to a tenant only through a parent model foreign key (no direct `tenant_id` column).
* **List (22 Models)**:
  `JournalItem` (child of `JournalEntry`), `SaleDetail` (child of `Sale`), `SalePayment` (child of `Sale`), `PurchaseDetail` (child of `Purchase`), `StockTransferDetail` (child of `StockTransfer`), `ProductWarehouse` (junction), `SalaryStructureItem`, `EmployeeSalaryItem`, `TaxDeclarationProof`, `OkrKeyResult`, `AssetAssignment`, etc.
* **Auto-Scoping Action**: For reads (`findMany`, `findFirst`, `count`), the extension injects the parent relation filter:
  `args.where = { ...(args.where || {}), [parentRelation]: { tenantId: context.tenantId } }`.

---

## 3. Query Hook Interception Matrix

Located in [server/src/extensions/tenant-isolation.extension.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/extensions/tenant-isolation.extension.ts):

| Prisma Operation | Interception Logic | Edge Case / Error Handling |
| :--- | :--- | :--- |
| **`findMany`** | Injects `args.where.tenantId = context.tenantId`. | If `args.where` is undefined, initializes it as `{ tenantId }`. |
| **`findFirst`** | Injects `args.where.tenantId = context.tenantId`. | Prevents cross-tenant entity inspection. |
| **`findUnique`** | Injects `args.where.tenantId = context.tenantId`. | Prisma 5 executes `WHERE id = ? AND tenant_id = ?`. Returns `null` if tenant mismatch occurs. |
| **`count`** | Injects `args.where.tenantId = context.tenantId`. | Scopes aggregations to the tenant's partition. |
| **`create`** | Overrides `(args.data).tenantId = context.tenantId`. | Prevents payload forgery (e.g. passing `tenantId: 'other'`). |
| **`createMany`** | Iterates over `args.data` array setting `item.tenantId = context.tenantId`. | Enforces bulk insert consistency. |
| **`update`** | Injects `args.where.tenantId = context.tenantId`. | Throws Prisma `P2025 (Record to update not found)` if record belongs to another tenant. |
| **`updateMany`**| Injects `args.where.tenantId = context.tenantId`. | Only updates rows matching the tenant. |
| **`delete`** | Injects `args.where.tenantId = context.tenantId`. | Throws Prisma `P2025 (Record to delete does not exist)` if record belongs to another tenant. |
| **`deleteMany`**| Injects `args.where.tenantId = context.tenantId`. | Prevents mass cross-tenant deletion. |
| **`upsert`** | Injects `tenantId` into both `args.where` and `args.create`. | Guarantees upserted record belongs to active tenant. |

---

## 4. Known Limitations & Technical Boundaries

1. **Raw SQL Bypasses Extensions**:
   * Prisma Client Extensions intercept model-level method calls. They **do not parse raw SQL strings** passed to `$queryRaw` or `$executeRaw`.
   * **Rule**: Raw SQL must never be used for business domain queries.
2. **Deeply Nested Writes**:
   * Deeply nested inline creations (e.g. `user.create({ data: { employee: { create: { ... } } } })`) require relation-level propagation.
3. **Interactive Transactions**:
   * Interactive `$transaction(async (tx) => { ... })` passes a transactional client `tx`. When `tx` is extended, it inherits all auto-scoping rules.
