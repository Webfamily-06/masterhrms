# Phase 1 Tenant Isolation Design: Automatic Query Scoping & Defense-in-Depth

**Document Version**: 1.0.0  
**Status**: Completed & Validated Against Prisma 5.19.1  
**Date**: September 26, 2026  
**Auditor & Systems Architect**: Antigravity Deep Forensic Agent  

---

## 1. Objective and Problem Statement

In the current codebase, tenant isolation relies entirely on developer discipline: writing `where: { tenantId: req.user.tenantId }` manually in each of the 433 API endpoints. If a developer omits this filter in a single query (e.g. `prisma.invoice.findFirst({ where: { id } })`), an authenticated user from Tenant A could inspect or modify records belonging to Tenant B.

To achieve **bulletproof multi-tenant security**, Phase 1 introduces an **Automatic Prisma Client Isolation Extension (`$extends`)** combined with **Node.js `AsyncLocalStorage`** and a **multi-tier defense-in-depth architecture**.

---

## 2. Operation-by-Operation Prisma 5 Scoping Analysis

Prisma Client Extensions allow intercepting query operations. However, Prisma has strict runtime validation schemas for each operation. Blindly injecting `{ tenantId }` into all operations causes runtime crashes. Below is the precise behavior and required handling for every Prisma operation:

| Prisma Operation | Can Be Safely Auto-Scoped? | Technical Mechanism & Edge Case Handling |
| :--- | :---: | :--- |
| **`findMany`** | **YES (Native)** | Intercept `args.where`. Merge `args.where = { ...args.where, tenantId: context.tenantId }`. If `args.where` is empty, initialize it with `{ tenantId }`. |
| **`findFirst`** | **YES (Native)** | Intercept `args.where`. Merge `args.where = { ...args.where, tenantId: context.tenantId }`. |
| **`findUnique`** | **REQUIRES INTERCEPTION** | **CRITICAL PRISMA CONSTRAINT**: Prisma's runtime validator throws a schema error if `findUnique` receives fields that are NOT part of an `@id` or `@unique` constraint. If a model has `@id id String` and no composite `@@unique([id, tenantId])`, passing `{ where: { id, tenantId } }` throws an exception! <br/>**Solution**: The extension intercepts `findUnique` and transforms it into `findFirst({ where: { ...args.where, tenantId } })`. |
| **`create`** | **YES (Native)** | Intercept `args.data`. Inject `args.data.tenantId = context.tenantId`. If `args.data` is an array or object, enforce property. |
| **`createMany`** | **YES (Native)** | Intercept `args.data`. Loop through each item in `args.data` and set `item.tenantId = context.tenantId`. |
| **`update`** | **REQUIRES INTERCEPTION** | In Prisma, `update` requires a unique `where` clause. If the unique identifier is solely `id`, injecting `tenantId` directly can fail validation. <br/>**Solution**: Convert to `updateMany` internally, or ensure all tenant models define `@@unique([id, tenantId])`, or verify ownership via a pre-check `findFirst({ where: { id, tenantId } })`. |
| **`updateMany`** | **YES (Native)** | Intercept `args.where`. Merge `args.where = { ...args.where, tenantId: context.tenantId }`. |
| **`upsert`** | **REQUIRES INTERCEPTION** | `upsert` has `where`, `create`, and `update`. In `create`, inject `tenantId`. In `where`, Prisma requires a unique key. Must handle via compound unique or atomic transaction. |
| **`delete`** | **REQUIRES INTERCEPTION** | Same as `update`: Prisma's `delete` requires a unique identifier. Must be transformed into `deleteMany({ where: { id, tenantId } })` to ensure cross-tenant deletes cannot occur. |
| **`deleteMany`** | **YES (Native)** | Intercept `args.where`. Merge `args.where = { ...args.where, tenantId: context.tenantId }`. |
| **Nested Writes** | **REQUIRES RECURSIVE INJECTION** | If a query calls `prisma.employee.create({ data: { profile: { create: { ... } } } })`, nested creates must have `tenantId` propagated down into child nodes if the child model belongs to a tenant. |
| **Relation Queries** | **INHERITED** | When traversing relations (e.g. `prisma.tenant.findUnique({ include: { employees: true } })`), Prisma queries join tables. By enforcing tenant context at the root, relation joins are naturally constrained. |
| **Transactions (`$transaction`)** | **YES (Preserved)** | Interactive transactions `prisma.$transaction(async (tx) => { ... })` pass the transactional client `tx`. When `tx` is extended, all operations inside the transaction inherit the auto-scoping rules. |
| **Raw SQL (`$queryRaw`)** | **CANNOT AUTO-SCOPE** | Prisma Client Extensions **do not parse raw SQL strings**. `$queryRaw` bypasses model hooks. <br/>**Mitigation**: Raw SQL is strictly banned for business domain queries. (The codebase only uses 3 `$queryRaw` statements, exclusively for row locking in `super.routes.ts` and `auth.routes.ts`). |
| **Background Jobs** | **EXPLICIT CONTEXT** | Cron jobs and message queues have no HTTP request. Must use `tenantContext.run({ tenantId }, async () => { ... })` to wrap execution. |

---

## 3. Handling Child Models Without `tenantId`

A critical discovery from our schema forensic audit is that **31 models do not have a `tenantId` field**:
* **7 Global Platform Models**: `User`, `SubscriptionPlan`, `Addon`, `CmsPage`, `Permission`, `RolePermission`, `TwoFactorOtp`.
* **22 Tenant-Owned Child Models**:
  `JournalItem`, `SaleDetail`, `SalePayment`, `PurchaseDetail`, `StockTransferDetail`, `StockAdjustmentDetail`, `ProductWarehouse`, `SalaryStructureItem`, `EmployeeSalaryItem`, `TaxDeclarationProof`, `OkrKeyResult`, `OkrCheckin`, `OkrReview`, `AssetAssignment`, `AssetDisposalItem`, `AssetMaintenance`, `JobCandidateInterview`, `CourseModule`, `ExitChecklistItem`, `HelpdeskComment`, `FormField`, `FormResponseValue`.
* **2 Ambiguous/Support Models**: `PlatformTicketMessage`, `String?` (Enum artifact).

### The Danger of Naive Auto-Scoping:
If the extension naively applies `{ where: { tenantId } }` to `JournalItem.findMany()`, the query will fail with `Unknown argument tenantId in where clause`!

### The Model Classification Architecture:
The extension maintains an explicit model metadata dictionary:

```typescript
// Classification sets for Prisma Extension
export const GLOBAL_MODELS = new Set([
  "User", "SubscriptionPlan", "Addon", "CmsPage", "Permission", "RolePermission", "TwoFactorOtp"
]);

export const TENANT_SCOPED_MODELS = new Set([
  "Tenant", "Profile", "UserRole", "Employee", "Attendance", "LeaveRequest", "PayrollRun",
  "Payslip", "Product", "Sale", "Invoice", "ChartOfAccount", "JournalEntry", "Asset",
  "OkrObjective", "JobPosting", "Course", "HelpdeskTicket", "Announcement", "CustomForm", ...
]);

export const CHILD_DEPENDENT_MODELS = new Map<string, { parentRelation: string; parentModel: string }>([
  ["JournalItem", { parentRelation: "journalEntry", parentModel: "JournalEntry" }],
  ["SaleDetail", { parentRelation: "sale", parentModel: "Sale" }],
  ["SalePayment", { parentRelation: "sale", parentModel: "Sale" }],
  ["PurchaseDetail", { parentRelation: "purchase", parentModel: "Purchase" }],
  ["StockTransferDetail", { parentRelation: "stockTransfer", parentModel: "StockTransfer" }],
  ["ProductWarehouse", { parentRelation: "product", parentModel: "Product" }],
  ["SalaryStructureItem", { parentRelation: "salaryStructure", parentModel: "SalaryStructure" }],
  ["EmployeeSalaryItem", { parentRelation: "salaryAssignment", parentModel: "EmployeeSalaryAssignment" }],
  ["TaxDeclarationProof", { parentRelation: "declaration", parentModel: "EmployeeTaxDeclaration" }],
  ["OkrKeyResult", { parentRelation: "objective", parentModel: "OkrObjective" }],
  ["AssetAssignment", { parentRelation: "asset", parentModel: "Asset" }],
  ["ExitChecklistItem", { parentRelation: "exit", parentModel: "EmployeeExit" }],
  ["HelpdeskComment", { parentRelation: "ticket", parentModel: "HelpdeskTicket" }],
  ["FormField", { parentRelation: "customForm", parentModel: "CustomForm" }]
]);
```

### Scoping Rules:
1. **If model in `GLOBAL_MODELS`**: Skip tenant injection entirely.
2. **If model in `TENANT_SCOPED_MODELS`**: Inject `{ tenantId: context.tenantId }`.
3. **If model in `CHILD_DEPENDENT_MODELS`**:
   * On Reads (`findMany`, `findFirst`): Inject parent relation filter:
     `where: { ...where, [parentRelation]: { tenantId: context.tenantId } }`.
   * On Writes: Handled via parent relation connection or nested write.

---

## 4. Tenant Context Propagation via `AsyncLocalStorage`

To avoid modifying all 433 endpoint signatures, tenant context is passed through Node's native `AsyncLocalStorage` (`node:async_hooks`).

### Architecture:

```typescript
// server/src/context/tenant-context.ts
import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContextData {
  tenantId: string | null;
  userId?: string;
  isSuperAdmin?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export function getTenantContext(): TenantContextData | undefined {
  return tenantStorage.getStore();
}
```

### Express Middleware Integration:
```typescript
// In server/src/middleware/auth.ts
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // ... token verification ...
  const contextData: TenantContextData = {
    tenantId: tenantId ?? null,
    userId: account.id,
    isSuperAdmin: isSuper
  };

  tenantStorage.run(contextData, () => {
    next();
  });
}
```

---

## 5. Defense-in-Depth Security Strategy

Cross-tenant data safety must never rely on a single defensive layer. We enforce 4 independent barriers:

```
[Layer 1] API Gateway & HTTP Middleware
          -> Validates JWT signature, expiration, and tenant status (assertWorkspaceActive).
          -> Rejects request if user's tenantId does not match resource tenant context.

[Layer 2] AsyncLocalStorage & Context Boundary
          -> Stores immutable tenantId for the execution duration of the request.
          -> Prevents context pollution across concurrent asynchronous operations.

[Layer 3] Prisma Client Extension ($extends) Auto-Scoping
          -> Intercepts all queries at the ORM layer.
          -> Automatically injects WHERE tenant_id = context.tenantId on reads, updates, and deletes.
          -> Enforces tenant_id on all inserts.

[Layer 4] Database-Level Schema Constraints (MySQL)
          -> Compound unique constraints: @@unique([tenantId, accountCode]), @@unique([tenantId, sku]).
          -> Foreign key cascading: ON DELETE CASCADE bound to tenants(id).
```

If a developer accidentally writes `prisma.employee.findMany()` with no `where` clause, **Layer 3 automatically rewrites the query** to `WHERE tenant_id = 'xxx'`, guaranteeing zero cross-tenant leakage.
