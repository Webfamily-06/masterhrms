# MASTERHRMS — AUD-CONC-002 PHASE 3B CRASH RECOVERY REVIEW
## Stale Run Detection, State Repair & Rollforward/Rollback Protocol

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_PHASE3B_CRASH_RECOVERY_REVIEW.md`  
**Execution Date:** 2026-11-04  
**Author:** Production Reliability Auditor & Backend Architect  
**Status:** **AUDITED & VERIFIED**

---

## 1. Context & Vulnerability Addressed

In serverless execution environments (such as Vercel), function execution is subject to hard execution limits (e.g. 10s–60s timeouts) and process termination (OOM, container recycling). If a worker process was terminated while in `approvalStatus: "FINALIZING"`, the payroll run would previously be left permanently locked in an intermediate state, unable to be calculated, approved, or finalized.

Phase 3B resolves this with a deterministic crash recovery subsystem.

---

## 2. Recovery Mechanics: `POST /api/payroll/cycles/:id/recover`

### 2.1. API Contract
- **HTTP Method:** `POST`
- **Route:** `/api/payroll/cycles/:id/recover`
- **Authorization:** `requireRole("super_admin", "tenant_admin", "finance_director", "finance_admin")`
- **Request Body:**
  ```json
  {
    "staleThresholdMinutes": 15,
    "force": false
  }
  ```

### 2.2. Safety Rules & Guardrails
1. **Target State Validation:** The cycle MUST be in `approvalStatus: "FINALIZING"`. Attempts to recover cycles in `DRAFT`, `APPROVED`, or `CLOSED` return HTTP 400.
2. **Stale Threshold Guard:**
   - Evaluates: `elapsedMinutes = (now - run.processedAt) / 60000`.
   - If `elapsedMinutes < 15` and `force !== true`:
     Rejects with HTTP 400 informing the caller that the worker may still be actively running.
3. **Financial Side-Effect Inspection:**
   - Queries `db.payrollSnapshot.count({ where: { payrollRunId: id, isLocked: true } })`.
   - Queries `db.journalEntry.findFirst({ where: { tenantId, reference: id } })`.

---

## 3. Decision Matrix: Rollforward vs. Rollback

| Inspection Finding | Classification | Action Taken | Target State | Description |
|:---|:---|:---|:---:|:---|
| Locked snapshots > 0 OR Journal Entry posted | **Committed Financials** | **Rollforward** | `CLOSED` | Financial transactions were already committed to the database. The recovery engine completes Stages 14–16 outputs, sets `isPublished: true`, and marks the run `CLOSED`. |
| Locked snapshots === 0 AND No Journal Entry | **Uncommitted State** | **Rollback** | `APPROVED` | No financial side-effects were committed before failure. The recovery engine resets state to `APPROVED`, allowing the Finance Director to safely retry finalization. |

---

## 4. Audit Trail & Provenance

Every crash recovery execution writes an immutable recovery record into `payroll_runs.statutory_manifest` (if rolled forward) or `variance_summary` (if rolled back):

```json
{
  "recoveredBy": "finance.director@company.com",
  "recoveredAt": "2026-11-04T10:35:42.128Z",
  "recoveryAction": "ROLLED_BACK_TO_APPROVED",
  "recoveryReason": "Crash recovery after 30.0 minutes stuck in FINALIZING without financial side-effects",
  "elapsedMinutes": 30.0,
  "lockedSnapshots": 0,
  "glPosted": false
}
```

This guarantees complete traceability and eliminates "silent state modifications".

