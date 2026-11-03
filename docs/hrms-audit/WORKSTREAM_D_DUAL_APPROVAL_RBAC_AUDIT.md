# MASTERHRMS — WORKSTREAM D DUAL APPROVAL & RBAC AUDIT REPORT
## Two-Tier Governance, Role Separation, Anti-Collusion Protocol & Rejection Workflow

> **Workstream**: D — Stage 12 Governance  
> **Target Subsystem**: `PayrollOrchestratorService` Approval Architecture  
> **Date**: November 3, 2026  
> **Status**: AUDITED & TESTED  

---

## 1. Governance Architecture: Separation of Duties

The payroll approval lifecycle implements strict separation of duties between HR operations and Finance authorization:

```
┌────────────────────────┐         ┌────────────────────────┐
│  Tier 1: HR Manager    │         │  Tier 2: Finance CFO   │
│  - Reviews Attendance  │         │  - Reviews Cash Outflow│
│  - Verifies Prorations │ ──────> │  - Reviews Tax Totals  │ ──────> Final Authorization
│  - Submits Preview     │         │  - Authorizes Payout   │
└────────────────────────┘         └────────────────────────┘
            ▲                                   │
            │          Rejection Re-run         │
            └───────────────────────────────────┘
```

---

## 2. Anti-Collusion Rule Enforcement

In accordance with enterprise internal control and financial auditing standards (SOX 404 / Companies Act 2013), an individual user cannot both submit and approve the same payroll cycle:

```typescript
// server/src/services/payroll-orchestrator.service.ts
const summary = run.varianceSummary as any;
const submittedById = summary?.submittedById;
const submittedByEmail = summary?.submittedBy;

if (
  (submittedById && submittedById === actor.id) ||
  (submittedByEmail && submittedByEmail.toLowerCase() === actor.email.toLowerCase())
) {
  const err = new Error(
    "403 Forbidden: Submitter cannot approve their own payroll cycle. Strict separation of duties required between HR submitter and Finance approver."
  );
  (err as any).statusCode = 403;
  throw err;
}
```

### Empirical Test Evidence
Test `WS-D.6.2` in `workstream-d-payroll-automation.test.ts` executes an explicit simulation where the HR submitter attempts to approve their own cycle. The test confirms:
- The approval is rejected fail-closed.
- An HTTP `403 Forbidden` exception is thrown.
- The cycle remains in `UNDER_REVIEW` status.

---

## 3. Rejection & Remediation Workflow

When a Finance Director or CFO identifies a calculation or variance anomaly:
1. Reviewer triggers `PATCH /api/payroll/cycles/:id/reject`.
2. A non-empty `rejectionReason` is strictly enforced.
3. The cycle transitions from `UNDER_REVIEW` back to `DRAFT`.
4. Rejection actor ID, email, timestamp, and justification reason are persisted in `varianceSummary`.
5. The HR Manager can make attendance adjustments or fix master data and re-calculate.

### Empirical Test Evidence
Test `WS-D.6.3` validates this lifecycle, confirming that rejection resets the cycle state to `DRAFT` and allows re-calculation.
