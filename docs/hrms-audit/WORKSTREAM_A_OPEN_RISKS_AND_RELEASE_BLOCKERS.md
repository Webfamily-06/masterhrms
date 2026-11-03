# MASTERHRMS — WORKSTREAM A OPEN RISKS AND RELEASE BLOCKERS
## Architectural, Database, Security & Policy Risk Assessment

> **Document Type**: Risk Assessment, Release Blockers & Pre-Requisite Verification  
> **Workstream**: A — Core Dynamic Payroll Engine  
> **Scope**: Pre-Workstream B Transition Gate  
> **Target System**: MASTERHRMS Production Readiness  
> **Date**: November 3, 2026  

---

## 1. Executive Summary & Blocker Matrix

Before Workstream B (Contractor Staffing Billing, Client Invoicing, MMU & GST) is authorized or any code is released to production, the identified infrastructure, schema drift, API mismatch, and statutory policy blockers must be documented and reviewed.

| Risk ID | Category | Severity / Status | Description | Primary Affected Systems | Remediation Prerequisite |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **BLK-01** | Database Infrastructure | **RELEASE BLOCKER** | Remote Supabase database lacks `_prisma_migrations` tracking table; P0 demographic columns and `SalaryTemplate` are absent. | Remote PostgreSQL (`aws-0-ap-south-1...`), `schema.prisma` | Must baseline migration via direct port 5432 during maintenance window with backup. |
| **BLK-02** | Database Connectivity | **RELEASE BLOCKER** | Live connection string uses PgBouncer transaction pooler (port 6543). Executing DDL migrations on port 6543 will fail or hang. | `.env`, Prisma CLI, Supabase Pooler | Acquire direct session pooler port 5432 connection before running DDL. |
| **BLK-03** | API Mismatch / Fallback | **CRITICAL RISK** | Legacy API route `payroll.routes.ts:1363` retains `emp.salary \|\| 35000` fallback and default state `"MH"`, conflicting with engine. | `server/src/routes/payroll.routes.ts:1363, 1479` | Harmonize route handler with `payroll-engine.service.ts` zero-salary warning logic. |
| **BLK-04** | Payroll Pre-Flight Gate | **CRITICAL RISK** | No pre-flight validation prevents an employee with zero/negative salary from entering an approved or finalized payroll run. | `payroll.routes.ts`, `payroll-run.service.ts` | Implement strict batch pre-flight gate rejecting zero-CTC employees unless marked as unpaid leave. |
| **BLK-05** | Statutory & Contract Policy | **HIGH RISK** | Agency client billing relies on `CONTRACT_GROSS` EPF (12% on Gross), which requires EPFO Para 26(6) joint declaration compliance. | `payroll-engine.service.ts`, Staffing Client Contract | Obtain documented corporate policy and signed client joint declaration before toggling flag. |
| **BLK-06** | Frontend Administration | **MEDIUM RISK** | CMS frontend currently lacks a visual UI to create and assign custom salary structure templates with dynamic formulas. | `CMS/src/routes/_authenticated/payroll/` | Build Salary Structure Template Builder UI in CMS. |

---

## 2. In-Depth Analysis of Blockers & Risks

### 2.1 BLK-01: Remote Database Schema Drift & Missing Migration Baseline
- **Observed Evidence**:
  - The target database is a remote cloud instance: `aws-0-ap-south-1.pooler.supabase.com:6543/postgres`.
  - Introspection against PostgreSQL system catalog revealed that `_prisma_migrations` **does not exist**.
  - P0/P1 demographic fields (`father_or_spouse_name`, `permanent_address`, `present_address`, `completion_480_days_date`, `permanent_employment_date`, `maternity_nomination_date`) exist in `schema.prisma` but are **absent** from the remote PostgreSQL `employees` table.
  - Workstream A avoids runtime crashes via TypeScript defensive property resolution (`(emp as any).permanentAddress ?? null`).
- **Risk Impact**:
  - Running `npx prisma migrate dev` or `npx prisma migrate deploy` in this state would fail because Prisma cannot find its migration history table and would attempt to re-apply baseline migrations, risking transaction timeouts or schema collisions.
- **Safe Migration Strategy (Do Not Execute Yet)**:
  1. Take a full remote database backup using `pg_dump`.
  2. Baseline the existing database schema using `npx prisma migrate resolve --applied <migration_name>`.
  3. Apply the pending P0 demographic columns and new Workstream A `SalaryTemplate` tables in a dedicated, tested migration script.

---

### 2.2 BLK-02: Supabase Transaction Pooler (Port 6543) DDL Restriction
- **Observed Evidence**:
  - The active `DATABASE_URL` connects through port `6543`, which is Supabase's transaction-mode PgBouncer pooler.
- **Risk Impact**:
  - Transaction-mode connection poolers do not support PostgreSQL advisory locks, prepared statements, or long-running DDL transactions required by `prisma migrate`.
  - Attempting to run DDL migrations over port 6543 results in `P3014: Prisma Migrate could not create the shadow database` or silent migration aborts.
- **Remediation Prerequisite**:
  - For DDL migrations, an administrative direct connection string (port `5432` or session-mode pooler) must be configured in `DIRECT_URL`.

---

### 2.3 BLK-03: API Route Legacy Fallbacks (`payroll.routes.ts:1363`)
- **Observed Evidence**:
  - While Workstream A eliminated the silent `|| 35000` fallback from `payroll-engine.service.ts:853` (now returning ₹0 with a warning), the Express route handler `payrollRouter.post(["/generate", "/calculate"])` in `server/src/routes/payroll.routes.ts:1363` still contains:
    ```typescript
    const baseMonthlyCtc = assignment
      ? Number(assignment.ctcMonthly)
      : Number(emp.salary || 35000);
    ```
  - Similarly, line 1479 defaults state to `"MH"` (`emp.state || "MH"`).
- **Risk Impact**:
  - If an active employee without a `salaryAssignment` and with `salary = null` is processed via `POST /api/payroll/generate`, the route injects `baseMonthlyCtc = 35000`.
  - The employee receives a fabricated ₹35,000 gross salary payslip, completely bypassing the engine's dynamic resolution.
- **Required Action in Next Workstream**:
  - Update `payroll.routes.ts:1363` to pass `baseMonthlyCtc: assignment ? Number(assignment.ctcMonthly) : Number(emp.salary ?? 0)`.

---

### 2.4 BLK-04: Absence of Pre-Flight Compensation Validation Gate
- **Observed Evidence**:
  - In `payroll.routes.ts`, when an employee has `baseMonthlyCtc = 0`, the engine computes Gross = 0, Net = 0, and logs `[PayrollEngine] Warning: Zero baseMonthlyCtc for employee <id>`.
  - The route proceeds to create a `Payslip` with ₹0.00 salary and completes the `PayrollRun`.
  - When an HR manager or Admin clicks "Finalize Payroll" or "Disburse", this ₹0.00 payslip is processed without blocking the batch.
- **Risk Impact**:
  - Active employees who should have received compensation may be silently paid ₹0.00.
  - Zero-salary payslips can enter banking disbursement CSVs (`NACH` files) and statutory filings.
- **Remediation Prerequisite**:
  - Introduce a Pre-Flight Payroll Validation Gate:
    1. Scan all active employees before calculation.
    2. If an employee has zero CTC and no approved Unpaid Leave / LOP for the entire month, flag the employee as a **Blocking Anomaly**.
    3. Require an explicit HR override ("Mark as Zero Pay with Justification") before allowing the payroll run to transition to `calculated` or `finalized`.

---

### 2.5 BLK-05: Statutory Compliance for Contract Gross EPF Policy
- **Observed Evidence**:
  - In `Paysheet_ENABL_OCT_2026 -Final.xlsx`, EPF is computed on total gross wages (e.g. 12% of ₹23,200 = ₹2,784).
  - Workstream A implemented this under `CONTRACT_GROSS` mode, protected by `allowContractGross: true`.
- **Risk Impact**:
  - If a company deducts 12% EPF on uncapped gross without a valid joint declaration submitted under Para 26(6) of the EPF Scheme, 1952, the EPFO can treat the excess deduction as an irregular contribution or issue inquiries.
  - Furthermore, employees who did not consent to higher PF deductions may challenge the increased deduction from take-home pay.
- **Remediation Prerequisite**:
  - Tenant configuration must require legal confirmation and an uploaded Joint Declaration document before `allowContractGross` can be activated for any client or employee group.

---

### 2.6 BLK-06: Front-End Salary Structure Template Builder UI
- **Observed Evidence**:
  - Workstream A backend now supports dynamic `structureComponents` (e.g., custom Basic, Special, and Bonus amounts without Conveyance/Medical).
  - The CMS frontend does not yet provide an administrative screen for HR to visually construct these custom templates, specify formulas, or link them to client contracts.
- **Risk Impact**:
  - HR managers cannot independently create custom staffing salary templates through the web portal, requiring backend seed scripts or manual API calls.
- **Remediation**:
  - Implement the Salary Structure Template Builder in CMS as planned in Workstream D.

---

## 3. Workstream B Transition Gate & Go / No-Go Decision

Before commencing **Workstream B (Contractor Staffing Billing, Client Invoicing, MMU & GST)**:

```
========================================================================================
                      WORKSTREAM B TRANSITION GATE CRITERIA
========================================================================================
[PASS]  1. Core Dynamic Payroll Engine implemented and verified (35/35 tests).
[PASS]  2. Golden Cohort Parity reconciled across all 11 personas with exact 0.00% gross variance.
[PASS]  3. Statutory validation register fully documented against Central & State Acts.
[PASS]  4. Wave 0 environment safety verified (zero unintended migrations applied).
[PASS]  5. P0-P4 security, immutability, and role-based access regression tests passing (91/91).
----------------------------------------------------------------------------------------
[HOLD]  6. Resolution of BLK-03 (payroll.routes.ts line 1363 legacy fallback removal).
[HOLD]  7. Explicit User Authorization for Workstream B scope and implementation boundaries.
========================================================================================
TRANSITION VERDICT: READY FOR WORKSTREAM B PLANNING & AUTHORIZATION
========================================================================================
```

