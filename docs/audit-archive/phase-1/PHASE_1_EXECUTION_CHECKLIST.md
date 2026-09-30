# Phase 1 Execution Checklist: Step-by-Step Task Breakdown & Rollback Plan

**Document Version**: 1.0.0  
**Status**: Ready for Application Owner Sign-Off  
**Date**: September 26, 2026  
**Auditor & Systems Architect**: Antigravity Deep Forensic Agent  

---

## Task Sequence Overview

To guarantee zero downtime and zero regression, Phase 1 is decomposed into **eight modular, sequentially dependent tasks**. Each task is independently verifiable and possesses its own explicit rollback procedure.

```
[Task 1.1] Context Provider (AsyncLocalStorage)
    │
    ▼
[Task 1.2] Prisma Extension Prototype (Auto-Scoping Engine)
    │
    ▼
[Task 1.3] Prisma Facade Proxy Integration (server/src/prisma.ts)
    │
    ▼
[Task 1.4] Non-HTTP Callers Context Adapter (Cron, Sockets, Webhooks)
    │
    ▼
[Task 1.5] Schema Additions for Tenancy Configuration (Tenant model)
    │
    ▼
[Task 1.6] Dynamic Connection Pool Manager (LRU Cache & Pool Limits)
    │
    ▼
[Task 1.7] Multi-Tenant Schema Migration Runner Script
    │
    ▼
[Task 1.8] End-to-End Regression & Cross-Tenant Security Audit
```

---

## Detailed Task Specifications

### Task 1.1: Context Provider (`AsyncLocalStorage`)
* **Objective**: Create a thread-safe asynchronous context store to pass `tenantId`, `userId`, and `roles` across all asynchronous calls without modifying controller method signatures.
* **Prerequisites**: Node.js `node:async_hooks` (native in Node.js 20).
* **Exact Files Likely to Change**:
  * Create: `server/src/context/tenant-context.ts`
  * Modify: `server/src/middleware/auth.ts` (wrap `next()` call in `tenantStorage.run()`)
* **Database Changes**: None.
* **API Changes**: None.
* **Risks**: Memory leak if `AsyncLocalStorage` retains large objects (Mitigation: store only primitive IDs).
* **Test Cases**: Unit test validating that `getTenantContext()` returns correct `tenantId` inside route handlers and `undefined` outside.
* **Rollback Plan**: Revert changes in `server/src/middleware/auth.ts`.
* **Acceptance Criteria**: All existing authentication tests pass; context is accessible inside downstream controllers.

---

### Task 1.2: Prisma Extension Prototype (Auto-Scoping Engine)
* **Objective**: Implement a Prisma 5 `$extends` query extension that automatically injects `where: { tenantId }` on reads/updates/deletes and injects `tenantId` into inserts.
* **Prerequisites**: Task 1.1 completed.
* **Exact Files Likely to Change**:
  * Create: `server/src/extensions/tenant-isolation.extension.ts`
  * Create: `server/src/config/tenant-models.config.ts` (Model classification dictionary: Global vs Tenant-Scoped vs Child models).
* **Database Changes**: None.
* **API Changes**: None.
* **Risks**: Runtime crash on `findUnique` if composite key is missing; runtime crash on child models without `tenantId`.
* **Test Cases**:
  * Interception of `findMany`, `findFirst`, `findUnique` (converted to `findFirst`), `create`, `updateMany`, `deleteMany`.
  * Verify child models (`JournalItem`, `SaleDetail`) are filtered via parent relations.
* **Rollback Plan**: Delete extension file.
* **Acceptance Criteria**: Extension passes unit tests covering all 14 Prisma query operations with zero schema validation errors.

---

### Task 1.3: Prisma Facade Proxy Integration (`server/src/prisma.ts`)
* **Objective**: Replace the raw Prisma singleton in `server/src/prisma.ts` with a JavaScript `Proxy` that dynamically routes queries to the auto-scoped client.
* **Prerequisites**: Task 1.2 completed.
* **Exact Files Likely to Change**:
  * Modify: `server/src/prisma.ts`
* **Database Changes**: None.
* **API Changes**: None.
* **Risks**: Circular dependency or proxy overhead (Mitigation: benchmark proxy property access; overhead is < 0.1ms).
* **Test Cases**: Run the entire existing backend test suite (`npm run test` or runtime verification suite).
* **Rollback Plan**: Restore previous `server/src/prisma.ts` from git history.
* **Acceptance Criteria**: 100% of the 64 files importing `prisma` continue to execute without any modification.

---

### Task 1.4: Non-HTTP Context Adapters (Cron, Sockets, Webhooks)
* **Objective**: Wrap non-HTTP database callers in explicit `tenantStorage.run` scopes so background jobs and WebSocket handlers receive proper tenant scoping.
* **Prerequisites**: Task 1.3 completed.
* **Exact Files Likely to Change**:
  * Modify: `server/src/cron/biometric-sync.ts`
  * Modify: `server/src/socket.ts`
  * Modify: `server/src/routes/payments.routes.ts` (Webhook receiver)
* **Database Changes**: None.
* **API Changes**: None.
* **Risks**: Unhandled background error if tenant context is missing.
* **Test Cases**: Trigger biometric sync manually; send real-time chat message via WebSocket; verify database records are created with correct `tenantId`.
* **Rollback Plan**: Revert modifications in the 3 specified files.
* **Acceptance Criteria**: Biometric sync and WebSocket chat persist records with verified tenant ownership.

---

### Task 1.5: Schema Additions for Tenancy Configuration
* **Objective**: Add additive, non-breaking fields to `model Tenant` and create `model TenantMigrationHistory` in `schema.prisma`.
* **Prerequisites**: Tasks 1.1 - 1.4 completed.
* **Exact Files Likely to Change**:
  * Modify: `server/prisma/schema.prisma`
* **Database Changes**:
  * `ALTER TABLE tenants ADD COLUMN tenancy_strategy ENUM(...) DEFAULT 'SHARED_SCHEMA'`;
  * `ALTER TABLE tenants ADD COLUMN database_status ENUM(...) DEFAULT 'ACTIVE'`;
  * `ALTER TABLE tenants ADD COLUMN database_host VARCHAR(255) NULL`;
  * `CREATE TABLE tenant_migration_history (...)`;
* **API Changes**: None.
* **Risks**: Lock on `tenants` table during `ALTER TABLE` (Mitigation: table contains minimal rows; migration takes < 1 second).
* **Test Cases**: Run `prisma migrate dev --name add_tenancy_management_fields`.
* **Rollback Plan**: Run down-migration dropping the added columns and table.
* **Acceptance Criteria**: All existing tenants remain in `SHARED_SCHEMA` and `ACTIVE` status.

---

### Task 1.6: Dynamic Connection Pool Manager (`TenantConnectionManager`)
* **Objective**: Implement the LRU Connection Pool Manager capable of caching, limiting, and evicting `PrismaClient` instances for isolated tenant databases.
* **Prerequisites**: Task 1.5 completed.
* **Exact Files Likely to Change**:
  * Create: `server/src/services/tenant-connection-manager.service.ts`
  * Modify: `server/src/prisma.ts` (hook proxy to manager for isolated tenants)
* **Database Changes**: None.
* **API Changes**: None.
* **Risks**: Connection pool leak if disconnected clients are not garbage collected.
* **Test Cases**:
  * Request for `SHARED_SCHEMA` tenant -> routes to shared pool.
  * Request for `SCHEMA_PER_TENANT` tenant -> routes to isolated pool.
  * Idle eviction test: verify idle pool disconnects after timeout.
* **Rollback Plan**: Set proxy to always return `sharedExtendedPrisma`.
* **Acceptance Criteria**: Zero connection leaks under concurrent test traffic.

---

### Task 1.7: Multi-Tenant Schema Migration Runner
* **Objective**: Create a Node.js CLI script capable of orchestrating Prisma migrations across all active tenant databases with status tracking.
* **Prerequisites**: Task 1.5 & 1.6 completed.
* **Exact Files Likely to Change**:
  * Create: `server/src/scripts/tenant-migration-runner.ts`
  * Modify: `server/package.json` (add `"migrate:tenants": "tsx src/scripts/tenant-migration-runner.ts"`)
* **Database Changes**: Inserts audit rows into `tenant_migration_history`.
* **API Changes**: None.
* **Risks**: Script interruption mid-migration (Mitigation: status flags and per-tenant isolation).
* **Test Cases**: Run migration script against a test isolated tenant database; verify version is updated in `tenants` and logged in `tenant_migration_history`.
* **Rollback Plan**: Remove CLI script and package.json entry.
* **Acceptance Criteria**: Migration runner runs idempotently and records execution time and status per database.

---

### Task 1.8: End-to-End Regression & Security Audit
* **Objective**: Execute the complete verification test suite across all 24 modules to guarantee zero regressions and 100% cross-tenant isolation.
* **Prerequisites**: Tasks 1.1 - 1.7 completed.
* **Exact Files Likely to Change**:
  * Create: `server/src/tests/multi-tenant-isolation.test.ts`
* **Database Changes**: None.
* **API Changes**: None.
* **Risks**: None (Read/Write test assertions).
* **Test Cases**: Run all 7 test suites defined in `PHASE_1_TESTING_AND_ACCEPTANCE.md`.
* **Rollback Plan**: N/A.
* **Acceptance Criteria**: All 7 suites pass with 100% compliance.
