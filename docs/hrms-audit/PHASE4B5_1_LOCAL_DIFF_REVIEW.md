# MASTERHRMS — PHASE 4B.5.1
# LOCAL APPLICATION DIFF & WORKING TREE ISOLATION REVIEW

**Document Reference:** `docs/hrms-audit/PHASE4B5_1_LOCAL_DIFF_REVIEW.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal Release Engineer & Financial Systems Auditor  
**Repository:** `Webfamily-06/masterhrms`  
**Current Branch:** `main`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Status:** COMPLETE LINE-BY-LINE DIFF AUDIT  
*(Preservation Mandate: Zero commits, zero stashes, zero file resets — All working tree modifications preserved intact)*

---

## 1. Executive Summary

In adherence to Section 1 and Section 6 of the Phase 4B.5.1 instructions, an exhaustive audit of all modified, untracked, and build-artifact files was conducted across the repository.

### Key Governance Finding:
The working tree contains two distinct categories of modifications:
1. **Database Migration Work (In-Scope for Phase 4B):**
   - Repair of Migration 8 (`server/prisma/migrations/20261102000000_add_device_sessions/migration.sql`) from MySQL to PostgreSQL 17.
   - Authoring of Migration 10 (`server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`) for partial unique indexes.
2. **Unrelated Payroll Application Code (Out-of-Scope for Database Migration Commits):**
   - Enhancements to payroll routes, validation, invoice idempotency, ledger advisory locking, and crash recovery (originating from Phase 3B.1 / 3B.2).
   - Generated JavaScript artifacts in `server/dist/`.

**Mandate:** Unrelated payroll logic changes must **NOT** be bundled into database migration commits. They must be isolated into a dedicated application feature PR.

---

## 2. File-by-File Diff & Risk Assessment Matrix

| Modified File Path | Nature of Change | Why It Changed | Related to DB Phase? | Changes Calculations / Postings? | Test Coverage | Commit Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql` | Dialect conversion (MySQL -> PostgreSQL 17) | Committed GitHub version contains MySQL syntax (`utf8mb4`, backticks, `DATETIME(3)`) | **YES** | **NO** | Verified on isolated PostgreSQL engine; matches Prisma schema | **Commit in Database Migration PR** |
| `server/src/routes/payroll-cycles.routes.ts` | Route addition (`POST /:id/recover`) | Adds AUD-CONC-002 crash recovery endpoint | **NO** (App Logic) | **NO** (Recovery only) | Covered by `workstream-d-payroll-automation.test.ts` | **Isolate in Application PR** |
| `server/src/services/contract-invoice.service.ts` | Idempotent invoice return | Replaces thrown error on duplicate invoice with idempotent return | **NO** (App Logic) | **NO** (Preserves amounts) | Covered by `workstream-b-contract-billing.test.ts` (20/20 PASS) | **Isolate in Application PR** |
| `server/src/services/ledger-posting.service.ts` | Concurrency lock & deduplication | Adds `pg_advisory_xact_lock` and duplicate check in transaction | **NO** (App Logic) | **NO** (Guarantees single posting) | Covered by `distributed-payroll-concurrency.test.ts` | **Isolate in Application PR** |
| `server/src/services/payroll-orchestrator.service.ts` | State machine atomic claim & recovery | Replaced in-memory lock with DB atomic conditional claim (`APPROVED -> FINALIZING`); loan deduplication; `recoverPayrollCycle` | **NO** (App Logic) | **NO** (Prevents double deduction) | Covered by 116 passing tests in Workstreams A, B, C, D | **Isolate in Application PR** |
| `server/src/services/payroll-validation.service.ts` | Atomic concurrency lock | Replaced in-memory lock with `updateMany` conditional claim | **NO** (App Logic) | **NO** | Covered by `workstream-a-blocker-remediation.test.ts` (15/15 PASS) | **Isolate in Application PR** |
| `server/dist/...` | Transpiled JavaScript files | Result of previous `npm run build` | **NO** (Build Artifacts) | **NO** | N/A | **Do Not Commit / Add to .gitignore if uncommitted** |

---

## 3. Deep-Dive Line Inspection of Application Changes

### 1. `server/src/routes/payroll-cycles.routes.ts` (Lines 430–470):
```typescript
/**
 * POST /api/payroll/cycles/:id/recover
 * AUD-CONC-002 Crash Recovery: Safely recovers a payroll cycle stuck in FINALIZING state.
 * Roles: super_admin, tenant_admin, finance_director, finance_admin
 */
payrollCyclesRouter.post(
  "/:id/recover",
  requireRole("super_admin", "tenant_admin", "finance_director", "finance_admin"),
  async (req: AuthRequest, res: Response) => { ... }
);
```
- **Rationale:** Exposes the recovery method implemented in REM-01 so operators can trigger safe recovery of cycles orphaned by worker crashes.
- **Safety:** Strictly gated behind RBAC (`requireRole`). Requires explicit tenant context.

### 2. `server/src/services/contract-invoice.service.ts` (Lines 158–185):
```typescript
if (duplicate && !options?.forceRegenerate) {
  // AUD-CONC-002: Idempotent return of existing invoice
  ...
  createdInvoices.push({ id: duplicate.id, invoiceNo: duplicate.invoiceNo, ... });
  continue;
}
```
- **Rationale:** Prevents worker crashes during retry loops when invoices were already generated. Returns the existing invoice record without generating duplicates.

### 3. `server/src/services/ledger-posting.service.ts` (Lines 221–235):
```typescript
await prisma.$transaction(async (tx) => {
  // AUD-CONC-002: PostgreSQL transaction-level advisory lock serializes concurrent postings for the same run
  await (tx as any).$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('gl_payroll_${payrollRunId}'))`);

  const existingInTx = await tx.journalEntry.findFirst({
    where: { tenantId, reference: payrollRunId },
  });
  if (existingInTx) {
    console.log(`[LEDGER] Journal Entry for payroll ${payrollRunId} already exists. Skipping duplicate.`);
    return;
  }
```
- **Rationale:** Protects financial double-entry ledger against race conditions during simultaneous recovery and finalization requests. Pairs directly with Migration 10 partial unique index.

### 4. `server/src/services/payroll-orchestrator.service.ts` (Lines 1194–1240 & 1430–1730):
- **Atomic Claim Check:** Replaced the unsafe single-instance `activeRunLocks = new Set<string>()` with an atomic database query:
  ```typescript
  const claim = await db.payrollRun.updateMany({
    where: { id: runId, tenantId, approvalStatus: "APPROVED" },
    data: { approvalStatus: "FINALIZING", processedAt: new Date(), approvedBy: actor.email }
  });
  ```
  If `claim.count === 0`, execution fails fast with `409 Conflict`, completely preventing double finalization across serverless worker instances.
- **Recovery Method (`recoverPayrollCycle`):** Verifies General Ledger posting and snapshot existence before rolling forward to `CLOSED` or rolling back to `APPROVED`. Validates debit-credit balance before closure.

---

## 4. Untracked Files Inventory & Disposition

| Untracked Path | Origin & Description | Disposition |
| :--- | :--- | :--- |
| `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/` | Migration 10: PostgreSQL partial unique indexes for GL and loans | **Stage & commit alongside Migration 8 repair** |
| `server/src/tests/distributed-payroll-concurrency.test.ts` | Real PostgreSQL concurrency test for loan recovery and GL idempotency | **Retain in test suite; commit in App PR** |
| `scripts/isolated_integration_test.cjs` | Reusable PostgreSQL test runner | **Retain in scripts directory** |
| `scripts/verify_migrations_1_7.cjs` | Read-only catalog equivalence verifier (48 statements) | **Retain in scripts directory** |
| `docs/hrms-audit/...` | Complete Phase 4B/4B.5 audit specifications | **Retain in audit documentation branch** |

---

## 5. Separation Plan for Clean Repository State

To prevent polluting the database migration package with application logic, the following two-PR strategy is recommended:

```
[PR 1: Database Migration Reconciliation (Clean)]
  ├── server/prisma/migrations/20261102000000_add_device_sessions/migration.sql (PostgreSQL 17)
  ├── server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/ (Migration 10)
  └── docs/hrms-audit/PHASE4B5_* (Audit Reports & Baselines)

[PR 2: Payroll Concurrency & Crash Recovery (Application Logic)]
  ├── server/src/routes/payroll-cycles.routes.ts
  ├── server/src/services/contract-invoice.service.ts
  ├── server/src/services/ledger-posting.service.ts
  ├── server/src/services/payroll-orchestrator.service.ts
  ├── server/src/services/payroll-validation.service.ts
  └── server/src/tests/distributed-payroll-concurrency.test.ts
```

