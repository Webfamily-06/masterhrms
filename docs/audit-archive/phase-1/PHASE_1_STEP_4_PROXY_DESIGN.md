# PHASE 1 — STEP 4: DYNAMIC PRISMA PROXY FACADE DESIGN SPECIFICATION

**Target:** Enterprise Multi-Tenant ERP & HRMS SaaS Platform  
**Architecture Component:** Controlled Dynamic Prisma Proxy Facade (`server/src/facade/prisma-proxy.facade.ts`)  
**Engine:** Prisma 5.19.1 | Node.js `AsyncLocalStorage` (`node:async_hooks`) | MySQL / MariaDB 10.11  
**Status:** Approved, Implemented, & Empirically Verified  
**Date:** September 26, 2026  

---

## 1. EXECUTIVE OVERVIEW & ARCHITECTURAL OBJECTIVES

The Dynamic Prisma Proxy Facade acts as an intelligent, context-aware proxy layer sitting between application code (routers, services, background workers) and the underlying Prisma ORM client instances.

### Core Objectives:
1. **Transparent Access:** Allow existing application code to invoke `prisma.model.method()` without modifying every function signature across 64 application files.
2. **Dynamic Route Dispatch:** Automatically route queries to the verified tenant's database client (`context.db`), whether hosted on a shared database schema (`SHARED_SCHEMA`) or a dedicated isolated database instance (`SCHEMA_PER_TENANT` / `DEDICATED_DB`).
3. **Fail-Closed Isolation Enforcement:** If application code attempts to access a tenant-owned model (`Announcement`, `Employee`, `PayrollRun`, `Sale`, etc.) outside of an active `TenantContext`, the facade forcibly rejects the call by throwing a `TenantContextRequiredError` (HTTP 403).
4. **Global Model Unscoped Pass-Through:** Global platform models (`User`, `SubscriptionPlan`, `Addon`, `CmsPage`, `Permission`, `TwoFactorOtp`) are served directly via the shared base database client when invoked outside a tenant context.
5. **Autoscoping Preservation:** Retain Prisma `$extends` query extensions across interactive transactions (`$transaction`), nested writes, bulk operations, and background workers.

---

## 2. PROXY FACADE ARCHITECTURE & CONTROL FLOW

```
                            Application Query (e.g. prisma.announcement.findMany())
                                                   │
                                                   ▼
                                 ┌──────────────────────────────────┐
                                 │  Dynamic Prisma Proxy Facade     │
                                 │  (Proxy traps get(target, prop)) │
                                 └──────────────────────────────────┘
                                                   │
                                    Check getTenantContext() (ALS)
                                                   │
                        ┌──────────────────────────┴──────────────────────────┐
                        ▼                                                     ▼
              [Tenant Context Present]                               [No Context Present]
                        │                                                     │
      Inspect context.db (Pre-resolved)                             Inspect Model Classification
                        │                                                     │
        ┌───────────────┴───────────────┐                  ┌──────────────────┴──────────────────┐
        ▼                               ▼                  ▼                                     ▼
 [SHARED_SCHEMA Tenant]   [SCHEMA_PER_TENANT Tenant]  [Global Platform Model]               [Tenant-Owned Model]
 Shared DB Client +       Isolated DB Client +        Shared Base Client                     FAIL CLOSED!
 Autoscoping Extension    Autoscoping Extension       (User, Addon, etc.)                   Throw 403 TENANT_CONTEXT_REQUIRED
```

---

## 3. PROXY INTERCEPTION & CASE NORMALIZATION LOGIC

Prisma model delegates on client instances use camelCase / lowerFirst property names (e.g., `prisma.user`, `prisma.announcement`, `prisma.payrollRun`), whereas the AST schema model registry uses PascalCase (e.g., `User`, `Announcement`, `PayrollRun`).

The facade normalizes property names using `toPascalCase(propStr)` before cross-referencing model classification sets:

```ts
function toPascalCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### Property Evaluation Decision Table:

| Intercepted Property | Casing Normalized | Context State | Model Classification | Routing Destination | Action / Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `announcement` | `Announcement` | Active Context (`Alpha`) | Direct Tenant Model | `context.db` | Executed with `WHERE tenant_id = 'Alpha'` |
| `announcement` | `Announcement` | Active Context (`Gamma`) | Direct Tenant Model | `context.db` | Routed to `test_tenant_prototype` DB |
| `announcement` | `Announcement` | **No Context** | Direct Tenant Model | **NONE** | **FAIL CLOSED: Throws `TenantContextRequiredError` (403)** |
| `user` | `User` | **No Context** | Global Platform Model | Shared Base Client | Executed unscoped on shared master DB |
| `$transaction` | `$transaction` | Active Context | Special Method | `context.db.$transaction` | Preserves autoscoping & rollback boundaries |
| `$queryRaw` | `$queryRaw` | Active Context | Special Method | `context.db.$queryRaw` | Executed on tenant client with guardrail check |
| `__isDynamicProxyFacade` | N/A | Any | Diagnostic | Facade Metadata | Returns `true` |

---

## 4. PRISMA USAGE PATTERN COMPATIBILITY MATRIX

Before integrating the facade across pilot routes, an AST audit evaluated all Prisma access patterns in the application:

| Access Pattern Code Example | Proxy Compatibility | Status | Required Developer Pattern / Guardrail |
| :--- | :---: | :---: | :--- |
| `await prisma.announcement.findMany()` | **100% Compatible** | Approved | Standard property access inside route handlers; proxy dynamically resolves active tenant client. |
| `const { announcement } = prisma;` | **Incompatible at Top-Level** | Blocked | Destructuring at file module scope captures property delegate at startup (without context). Must destructure inside function scope or use `prisma.announcement`. |
| `const myModel = prisma.employee;` | **Incompatible at Top-Level** | Blocked | Variable assignment outside request closure locks client reference. Keep property access inside functions. |
| `await prisma.$transaction(async (tx) => { ... })` | **100% Compatible** | Approved | Transaction delegate inherits autoscoping extension and context from `context.db`. |
| `await prisma.$transaction([ p1, p2 ])` | **100% Compatible** | Approved | Promise array transactions execute through target client. |
| `await prisma.$queryRaw`SELECT * FROM users`` | **100% Compatible** | Approved | Global raw SQL executes on shared client. |
| `await prisma.$queryRaw`SELECT * FROM announcements`` | **Requires Guardrail** | Guardrail Enforced | Raw SQL bypasses `$extends` model hooks. Must enforce parameterization (`WHERE tenant_id = ?`). |
| `cronWorker: tenantStorage.run({ tenantId, db }, fn)` | **100% Compatible** | Approved | Background workers establish `AsyncLocalStorage` context prior to calling `prisma`. |

---

## 5. FAIL-CLOSED SECURITY SPECIFICATION

The facade strictly enforces the **Fail-Closed Principle**:

```ts
export class TenantContextRequiredError extends Error {
  public status = 403;
  public code = "TENANT_CONTEXT_REQUIRED";
  constructor(message: string) {
    super(message);
    this.name = "TenantContextRequiredError";
  }
}
```

If any route, background task, or service attempts to invoke a tenant model (`DIRECT_TENANT_MODELS`, `CHILD_DEPENDENT_MODELS`, or `ROOT_TENANT_MODEL`) without wrapping execution inside `resolveTenantContext` middleware or `tenantStorage.run()`, the proxy immediately intercepts the call and throws `TenantContextRequiredError`. Zero database queries are sent to MySQL, eliminating missing-context leakage.
