# MASTERHRMS — WORKSTREAM D SCHEDULER & RELIABILITY AUDIT
## Cron Integration, Idempotent Execution, and Manual Override Safeguards

> **Workstream**: D — Automated Scheduling & Reliability  
> **Target Subsystem**: Payroll Lifecycle Automation & Cron Integration  
> **Date**: November 3, 2026  
> **Status**: AUDITED & VERIFIED  

---

## 1. Automated Scheduling Architecture

The monthly payroll lifecycle supports both automated recurring execution and manual on-demand execution:

```
1st of Month (00:00 UTC) ──> Stage 1 Cron: createPeriod
25th of Month (18:00 UTC) ──> Stage 3 Cron: lockAttendance
26th of Month (02:00 UTC) ──> Stage 5–10 Cron: calculatePayroll & evaluatePreRunVariance
                                  │
                                  ▼
                         Stage 11: PREVIEW_READY
                                  │
                                  ▼
                        [STRICT HUMAN GATE]
                     HR Review ──> Finance Approval
```

---

## 2. Hard Governance Rule: Automatic Scheduling Stops at Preview

Under NO circumstances does any background scheduler, cron job, or worker automatically authorize or finalize payroll:

> [!IMPORTANT]
> **Strict Governance Invariant**: Automated background tasks are permitted to advance cycles up to **`PREVIEW_READY` ONLY**.  
> The transitions `PREVIEW_READY -> UNDER_REVIEW`, `UNDER_REVIEW -> APPROVED`, and `APPROVED -> FINALIZING` strictly require manual, authenticated human approval with separate roles.

---

## 3. Idempotency & Duplicate Run Defense

1. **Database Constraint**: `[tenantId, periodMonth, periodYear]` uniqueness ensures that multiple triggers of the period initialization job never create duplicate cycles.
2. **State Guard**: If a cron job triggers `calculatePayroll` on a cycle that is already in `UNDER_REVIEW`, `APPROVED`, `FINALIZING`, or `CLOSED`, the orchestrator immediately rejects the operation with HTTP `409 Conflict`.
3. **Transactional Isolation**: All multi-record mutations execute within Serializable transaction boundaries. If worker pods crash mid-calculation, intermediate records are cleanly rolled back.
