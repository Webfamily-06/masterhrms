# MASTERHRMS — AUD-CONC-002 PHASE 3B.1
## Independent Audit Report: Crash Recovery Security & Financial Completeness

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_PHASE3B1_RECOVERY_SECURITY_REVIEW.md`  
**Audit Date:** 2026-11-04  
**Auditor:** Independent Principal PostgreSQL Engineer & Distributed Systems Security Reviewer  
**Target Codebase:** `server/src/routes/payroll-cycles.routes.ts` & `server/src/services/payroll-orchestrator.service.ts`  
**Audit Status:** **CONDITIONALLY ACCEPTED — RBAC SECURE, GL ROLLFORWARD COMPLETENESS GAP IDENTIFIED**

---

## 1. Scope & Objective

This audit examines the crash recovery mechanics implemented in `POST /api/payroll/cycles/:id/recover` and `PayrollOrchestratorService.recoverPayrollCycle`. It evaluates authentication, RBAC, tenant isolation, stale threshold enforcement, the `force` flag scope, and whether a payroll cycle can be prematurely closed if snapshots exist but General Ledger posting failed.

---

## 2. API Security & Access Controls

### 2.1. Route Definition & RBAC Guard
Located at `server/src/routes/payroll-cycles.routes.ts:430-475`:

```typescript
payrollCyclesRouter.post(
  "/:id/recover",
  requireRole("super_admin", "tenant_admin", "finance_director", "finance_admin"),
  async (req: AuthRequest, res: Response) => { ... }
);
```
- **Authentication:** Enforced by upstream JWT / session authentication middleware.
- **RBAC Matrix:** Strictly limited to executive finance and tenant administrators. HR managers, reviewers, and standard employees are rejected with HTTP 403 Forbidden.
- **Tenant Context:** Extracts `req.tenantId || req.user?.tenantId`. If missing, returns HTTP 400.

### 2.2. Tenant Boundary Isolation
Inside `recoverPayrollCycle`:
```typescript
const run = await db.payrollRun.findUnique({
  where: { id: runId },
  include: { snapshots: true },
});

if (!run || run.tenantId !== tenantId) {
  const err: any = new Error("Payroll run not found for the specified tenant.");
  err.statusCode = 404;
  throw err;
}
```
- **Finding:** Fully compliant. Mismatched tenant IDs produce an immediate HTTP 404, preventing cross-tenant recovery attacks.

---

## 3. Stale Threshold & Force Flag Analysis

### 3.1. Time Guard Evaluation
```typescript
const thresholdMinutes = options?.staleThresholdMinutes ?? 15;
const lastActiveTime = run.processedAt || run.createdAt;
const elapsedMinutes = (Date.now() - new Date(lastActiveTime).getTime()) / (60 * 1000);

if (elapsedMinutes < thresholdMinutes && !options?.force) {
  const remainingMinutes = Math.ceil(thresholdMinutes - elapsedMinutes);
  const err: any = new Error(
    `Payroll run is not yet considered stale. Elapsed time: ${elapsedMinutes.toFixed(1)} mins (Threshold: ${thresholdMinutes} mins). Wait ${remainingMinutes} more minute(s) or specify force: true.`
  );
  err.statusCode = 400;
  throw err;
}
```

### 3.2. Scope of `force` Flag
- **Auditor Verification:** The `force` flag **ONLY** bypasses the elapsed time check (`if (elapsedMinutes < thresholdMinutes && !options?.force)`).
- It **CANNOT** bypass:
  - Role-based authorization.
  - Tenant ID match.
  - State validation (`approvalStatus !== "FINALIZING"`).
  - Financial side-effect inspection (`hasCommittedFinancials`).
- **Verdict:** Safe and properly scoped.

---

## 4. Financial Completeness Gap in Rollforward Protocol

### 4.1. The Gap Identified
Let us inspect the rollforward decision logic in `PayrollOrchestratorService.recoverPayrollCycle`:

```typescript
// Inspect state of financial side-effects
const lockedSnapshots = await db.payrollSnapshot.count({
  where: { payrollRunId: runId, isLocked: true },
});

const glEntry = await db.journalEntry.findFirst({
  where: { tenantId, reference: runId },
});

const hasCommittedFinancials = lockedSnapshots > 0 || !!glEntry;

if (hasCommittedFinancials) {
  console.warn(`[PayrollRecovery] Cycle ${runId} has committed financials (lockedSnapshots=${lockedSnapshots}, glPosted=${!!glEntry}). Rolling forward to CLOSED.`);
  
  const outputManifest = await this.generatePostFinalizationOutputs(tenantId, runId, actor);

  const recoveredCycle = await db.payrollRun.update({
    where: { id: runId },
    data: {
      status: "completed",
      approvalStatus: "CLOSED",
      isPublished: true,
      publishedAt: run.publishedAt || new Date(),
      publishedBy: run.publishedBy || actor.email,
      statutoryManifest: { ... },
    },
  });

  return { success: true, actionTaken: "ROLLED_FORWARD_TO_CLOSED", ... };
}
```

### 4.2. Forensic Analysis of the Defect
Consider the following crash sequence during `finalizePayroll`:
1. Worker claims cycle (`approvalStatus: "FINALIZING"`).
2. Worker posts to GL (`autoPostPayrollToLedger`).
3. Worker crashes or network drops during snapshot creation or commit.
4. Or conversely: Worker commits snapshots in Phase 3, but `autoPostPayrollToLedger` previously failed or was interrupted.
5. In this state: `lockedSnapshots > 0` evaluates to `true`, but `glEntry` is `null`!
6. When `recoverPayrollCycle` is invoked, `hasCommittedFinancials` evaluates to `true`.
7. The rollforward block is entered. It calls `this.generatePostFinalizationOutputs(tenantId, runId, actor)`.
8. `generatePostFinalizationOutputs` generates statutory forms, client billing invoices, and bank disbursement metadata. **It does NOT post to the General Ledger.**
9. The cycle status is updated to `CLOSED` and `isPublished: true`.

### 4.3. Financial Impact
**The cycle is permanently closed, snapshots are locked, but the General Ledger has ZERO journal entries for this payroll run.**
Account 5010 (Salary Expense) and Account 1020 (Bank) are omitted from the platform's financial books.

---

## 5. Required Architectural Remediation

Before rolling forward to `CLOSED` in `recoverPayrollCycle`, the recovery method must explicitly check:
```typescript
if (!glEntry) {
  // Backfill missing General Ledger posting before closing
  await runWithTenantContext(tenantCtx, async () => {
    await autoPostPayrollToLedger({
      tenantId,
      payrollRunId: runId,
      period: periodStr,
      totalGross: Number(run.totalAmount || 0),
      totalNet: Number(run.totalNet || 0),
      totalDeductions: Number(run.totalDeductions || 0),
    });
  });
}
```

---

## 6. Audit Verdict

**CONDITIONALLY ACCEPTED.**
- The endpoint is robustly protected by authentication, RBAC, and tenant scoping.
- **Mandatory Remediation Required:** The GL backfill gap in the rollforward path must be remediated in a subsequent update to prevent the possibility of closing a cycle with missing double-entry records.

