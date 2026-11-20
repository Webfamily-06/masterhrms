# 10 — Cron & Background Job Verification (Audit of Scheduled Workers)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Cron Source Verification & Startup Registration Inspection  
**Date:** November 19, 2026  
**Source Directory Inspected:** `server/src/cron/` & `server/src/index.ts`  
**Historical Claim:** 7 Background Cron Workers Running  
**Audit Reality:** 7 Cron Modules on Disk; 3 Actively Scheduled at Startup, 3 Manual Triggers, 1 Detached  

---

## 1. Executive Summary & Forensic Reconciliation

In historical reverse-engineering documentation (`docs/reverse-engineering/workdo-saas/30-COMPLETE-QUEUE-AND-BACKGROUND-JOBS-REGISTER.md`), MASTERHRMS was reported to operate **7 scheduled background cron workers**.

An empirical inspection of `server/src/cron/` and the application entry point (`server/src/index.ts`) confirms that while **7 cron worker files exist on disk**, their operational lifecycle is bifurcated:
- **3 cron workers are actively registered and scheduled at application startup** via `cron.schedule()` or `setInterval()` in `server/src/index.ts`.
- **1 additional inline background sweep** (Comp-Off Credit Expiry) is scheduled daily directly within `server/src/index.ts`.
- **3 cron workers exist as on-demand / manual execution modules**, wired to administrative trigger endpoints in `server/src/routes/hrm-extensions.routes.ts` and tested via Jest, but are NOT continuously scheduled in `index.ts`.
- **1 cron worker (`saas-billing.cron.ts`) is completely detached / orphaned** from server startup.

---

## 2. Granular Inventory of All 7 Cron Modules

| Module Filename | Function Name | Startup Schedule (`index.ts`) | On-Demand Trigger Endpoint | Multi-Tenant Scoping Loop | Operational Status |
|---|---|---|---|---|---|
| `biometric-sync.ts` | `runBiometricAutoSync()` | **Active:** Every 30 mins (`setInterval`) | N/A | Loops active tenants; synchronizes device logs | **VERIFIED (Active Runtime)** |
| `biometric-reconcile.cron.ts` | `runBiometricReconciliation()` | **Active:** Daily at 02:00 AM IST | N/A | Evaluates shift rules, punch pairs, and LOP summaries | **VERIFIED (Active Runtime)** |
| `subscription-reminder.cron.ts`| `runSubscriptionExpiryRemindersCron()` | **Active:** Daily at 08:00 UTC | `POST /api/hrm/cron/subscription-reminders` | Sweeps expiring subscriptions; sends email notifications | **VERIFIED (Active Runtime)** |
| `document-expiry.cron.ts` | `runDocumentExpiryCron()` | **None** (Not in `index.ts`) | `POST /api/hrm/cron/document-expiry` | Sweeps expiring employee documents; emits notifications | **SOURCE-INSPECTED (Manual/API)** |
| `probation-contract-expiry.cron.ts`| `runProbationContractExpiryCron()` | **None** (Not in `index.ts`) | `POST /api/hrm/cron/probation-expiry` | Checks probation milestones and contract renewals | **SOURCE-INSPECTED (Manual/API)** |
| `reporting-manager-change.cron.ts` | `runReportingManagerChangeScheduler()`| **None** (Not in `index.ts`) | `POST /api/hrm/cron/manager-changes` | Applies scheduled reporting hierarchy updates | **SOURCE-INSPECTED (Manual/API)** |
| `saas-billing.cron.ts` | `runExpireTrialsCron()`, `runRenewalsAndGraceCron()` | **None** (Not in `index.ts`) | **None** (Orphaned) | Evaluates trial expirations and grace period suspensions | **INACTIVE (Orphaned Module)** |
| *Inline `index.ts` Worker* | Comp-Off Credit Expiry Sweep | **Active:** Daily at 00:00 UTC | N/A | Expires unused compensatory leave credits | **VERIFIED (Active Runtime)** |

---

## 3. Execution Architecture & Idempotency Analysis

Inspection of the active cron workers reveals the following runtime characteristics:

### 3.1 Tenant Scoping & Fail-Closed Boundaries
All cron workers enforce tenant isolation by explicitly querying tenants (`prisma.tenant.findMany({ where: { status: "ACTIVE" } })`) and processing records inside tenant-scoped database queries (`where: { tenantId }`).

### 3.2 Idempotency & Re-entrancy Protection
- `biometric-reconcile.cron.ts`: Uses unique composite keys on attendance records (`@@unique([tenantId, employeeId, date])`) to prevent duplicate attendance generation on re-runs.
- `subscription-reminder.cron.ts`: Uses timestamp checks (`lastReminderSentAt`) to ensure tenants receive exactly one reminder at 14, 7, and 1-day intervals before expiration.
- `saas-billing.cron.ts`: Transitions status flags atomically (`status: "TRIAL" -> "EXPIRED"`) using conditional Prisma updates.

### 3.3 Error Handling & Process Resilience
All cron workers wrap execution blocks in `try / catch` statements and log structured telemetry via `console.error("❌ [CRON] ...")`. An error encountered in one tenant does not terminate the loop for subsequent tenants.

---

## 4. Remediation Recommendations for Operations

1. **Wire Inactive Crons to Scheduler:** `document-expiry.cron.ts`, `probation-contract-expiry.cron.ts`, and `reporting-manager-change.cron.ts` should be formally scheduled in `server/src/index.ts` using standard cron expressions (e.g. `0 1 * * *` for 01:00 AM daily sweeps).
2. **Re-attach SaaS Billing Worker:** `saas-billing.cron.ts` must be integrated into `server/src/index.ts` to ensure trial subscriptions expire automatically without requiring manual Super Admin intervention.
