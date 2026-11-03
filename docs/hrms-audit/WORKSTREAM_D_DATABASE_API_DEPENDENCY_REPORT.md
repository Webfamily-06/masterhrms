# MASTERHRMS — WORKSTREAM D DATABASE & API DEPENDENCY REPORT
## Schema Compatibility, Prisma Query Scoping, and API Contract Alignment

> **Workstream**: D — Database & API Architecture  
> **Target Subsystem**: Prisma Models & REST API Contracts  
> **Date**: November 3, 2026  
> **Status**: AUDITED & COMPLIANT  

---

## 1. Schema Compatibility Matrix (Zero-Migration Guarantee)

Workstream D strictly adheres to the directive: **Zero DDL modifications and zero remote database migrations (`prisma db push` strictly forbidden)**. All required functionality is achieved using existing schema columns:

| Model / Table | Existing Database Columns Utilized | Workstream D Usage |
|---|---|---|
| `payroll_runs` | `id`, `tenantId`, `periodMonth`, `periodYear`, `totalAmount`, `totalNet`, `totalDeductions`, `employeeCount`, `approvalStatus`, `approvedBy`, `approvedAt`, `status`, `processedAt`, `createdAt`, `isPublished`, `publishedAt`, `publishedBy`, `varianceSummary`, `statutoryManifest` | Stores 16-stage state machine (`approvalStatus`), financial aggregates, variance scorecard (`varianceSummary`), and cryptographic manifest (`statutoryManifest`). |
| `payroll_snapshots` | `id`, `tenantId`, `payrollRunId`, `employeeId`, `periodMonth`, `periodYear`, `snapshotData`, `ctcAnnual`, `grossEarned`, `totalDeductions`, `netPay`, `lopDays`, `payableDays`, `isLocked`, `createdAt`, `statutoryManifest` | Frozen immutable employee payroll snapshots. |
| `payslips` | `id`, `tenantId`, `payrollRunId`, `employeeId`, `periodMonth`, `periodYear`, `grossSalary`, `deductions`, `netSalary`, `breakdown` | Operational payslips linked to run. |
| `attendance_month_locks` | `id`, `tenantId`, `year`, `month`, `isLocked`, `lockedAt`, `lockedById`, `notes` | Stage 3 attendance freeze record. |
| `employee_loans` | `id`, `tenantId`, `employeeId`, `outstandingBalance`, `monthlyEmi`, `status` | Stage 10 active loan deductions & balance update. |
| `loan_installments` | `id`, `loanId`, `tenantId`, `installmentNumber`, `periodMonth`, `periodYear`, `emiAmount`, `status` | Stage 13 loan recovery installment persistence. |
| `journal_entries` | `id`, `tenantId`, `entryNumber`, `entryDate`, `reference`, `referenceType`, `description`, `totalAmount`, `status` | Stage 13 General Ledger double-entry posting. |
| `journal_items` | `id`, `journalEntryId`, `accountId`, `type`, `debit`, `credit`, `notes` | Balanced ledger line items (5010, 1020, 2030). |

---

## 2. Safe Employee Query Scoping (`SAFE_EMPLOYEE_SELECT`)

Due to differences between local schema versions and remote Supabase PostgreSQL columns, direct queries like `db.employee.findMany()` fail if unmigrated columns (such as `father_or_spouse_name`) are requested.

Workstream D adopts `SAFE_EMPLOYEE_SELECT` across all employee master resolutions:
```typescript
import { SAFE_EMPLOYEE_SELECT } from "./statutory/builders/statutory-builder-common";

const employees = await db.employee.findMany({
  where: { tenantId, status: "active" },
  select: SAFE_EMPLOYEE_SELECT,
});
```

This guarantees that only verified, existing columns are selected, completely eliminating column mismatch crashes.

---

## 3. REST API Routes & Permission Hierarchy

All endpoints are mounted under `/api/payroll/cycles` and `/api/payroll-cycles`:

| HTTP Verb | Endpoint | Minimum Role | Lifecycle Purpose |
|---|---|---|---|
| `POST` | `/api/payroll/cycles` | `hr_manager` | Stage 1: Initialize Period |
| `GET` | `/api/payroll/cycles` | `hr_manager`, `finance_manager` | List Cycles for Tenant |
| `GET` | `/api/payroll/cycles/:id` | `hr_manager`, `finance_manager` | Get Cycle & 16-Stage Progress |
| `POST` | `/api/payroll/cycles/:id/lock-attendance` | `hr_manager` | Stages 3–4: Lock Attendance |
| `POST` | `/api/payroll/cycles/:id/calculate` | `hr_manager` | Stages 5–10: Batch Calculation |
| `GET` | `/api/payroll/cycles/:id/variance` | `hr_manager`, `finance_director` | Stage 11: Variance Gate Scorecard |
| `PATCH` | `/api/payroll/cycles/:id/submit-review` | `hr_manager` | Stage 12a: HR Submit for CFO Review |
| `PATCH` | `/api/payroll/cycles/:id/approve` | `finance_director` | Stage 12b: Finance Authorization |
| `PATCH` | `/api/payroll/cycles/:id/reject` | `finance_director`, `hr_manager` | Stage 12: Rejection to Draft |
| `POST` | `/api/payroll/cycles/:id/finalize` | `finance_director` | Stage 13: Finalize & Post Ledger |
| `GET` | `/api/payroll/cycles/:id/outputs` | `hr_manager`, `finance_director` | Manifest of Outputs (14–16) |
| `GET` | `/api/payroll/cycles/:id/bank-export` | `finance_director`, `finance_manager` | Stage 16: Bank Payment Advice |
