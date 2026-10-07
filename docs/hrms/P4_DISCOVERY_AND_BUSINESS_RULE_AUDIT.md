# MASTERHRMS — PHASE P4 DISCOVERY & BUSINESS RULE AUDIT
## Payroll & Finance Subsystem Audit

**Date:** 2026-10-07  
**Phase:** P4 — Payroll Linkage & Finance  
**Status:** Audit & Discovery Complete  
**Authoritative Sources:**
- `00_Architecture_and_Conventions.md`
- `01_HR_Panel_Spec.md` (Section 9: Finance and Assets: Payroll Management)
- `02_Employee_Portal_Spec.md` (Section 7: Finance and Assets)
- `03_Interlinking_and_Realtime_Flows.md` (Flow F2: Attendance, Leave, Holidays to Payroll; Flow F3)
- `worklog.md`
- `server/prisma/schema.prisma`
- Existing P3 Attendance & Leave Engine

---

## 1. Existing Implementation Baseline

| ID | Canonical Route | Current File(s) | Existing UI | Existing API | Existing DB Model | Existing Service | Existing Permissions | Realtime / Outbox | Current Status |
|---|---|---|---|---|---|---|---|---|---|
| **HR-PAY-01** | `/hr/payroll/payslips` | `_app/payroll.tsx` (Tab "payslips"), `_app/employee-payslips.tsx` | Partial table & drawer in monolith tab | `/api/v1/payroll/payslips`, `/api/v1/payroll/payslips/:id` | `Payslip`, `PayrollRun` | `invoice-pdf.service.ts` | `finance.payroll.manage`, `hr.payroll.payslip.view` | Needs `payslip.published` event | PT (Needs dedicated canonical `/hr/payroll/payslips` page with bulk publish, password PDF & period filters) |
| **HR-PAY-02** | `/hr/payroll/runs` | `_app/payroll.tsx` (Tab "runs") | Monolithic runs table & calculation modal | `/api/v1/payroll/runs`, `/api/v1/payroll/generate`, `/api/v1/payroll/runs/:id/status` | `PayrollRun`, `PayrollSnapshot` | `payroll-batch.service.ts`, `PayrollEngine`, `PayrollAttendanceService` | `finance.payroll.manage`, `payroll.run.approve` | Needs `payroll.run_progress`, `payroll.run_locked` events | PT (Needs dedicated canonical `/hr/payroll/runs` page with variance audit against prior month & maker-checker approval) |
| **HR-PAY-03** | `/hr/payroll/employee-salaries` | `_app/payroll.tsx` (Tab "employee_salary") | Salary assignment table & assign modal | `/api/v1/payroll/employees`, `/api/v1/payroll/salary-assignments`, `/api/v1/payroll/simulate-ctc` | `EmployeeSalaryAssignment`, `EmployeeSalaryItem` | `PayrollEngine` | `finance.payroll.manage`, `view_sensitive` | `salary.revised` | PT (Needs dedicated canonical `/hr/payroll/employee-salaries` page with revision history, effective dates & CTC simulator) |
| **HR-PAY-04** | `/hr/payroll/components` | `_app/payroll.tsx` (Tabs "structures", "components") | Component & structure lists with edit dialogs | `/api/v1/payroll/salary-components`, `/api/v1/payroll/salary-structures` | `SalaryComponent`, `SalaryStructure`, `SalaryStructureItem` | `formula-engine/` (DAG, lexer, parser, evaluator) | `finance.payroll.manage` | `lookup.changed(salary_component)` | PT (Needs dedicated canonical `/hr/payroll/components` page with formula tester & DAG dependency ordering) |
| **HR-PAY-05** | `/hr/payroll/setup` | `_app/payroll.tsx` (Tabs "disbursement", "statutory_returns") | Bank disbursement & export forms | `/api/v1/payroll/statutory-rules`, `/api/v1/payroll/:id/export-bank`, `/api/v1/payroll/:id/disburse-bank` | `StatutoryRule`, `BankDisbursementBatch` | `bank-payout.service.ts`, `compliance-rules.service.ts` | `finance.payroll.manage` | `rule.changed` | PT (Needs dedicated canonical `/hr/payroll/setup` page consolidating pay periods, bank formats & statutory packs) |
| **HR-PAY-06** | `/hr/payroll/tax` | `_app/payroll.tsx` (Tab "tax_declarations") | Declarations table & proof review dialog | `/api/v1/payroll/tax-declarations`, `.../proofs`, `.../status`, `/api/v1/payroll/tax-declarations/compare` | `EmployeeTaxDeclaration`, `TaxDeclarationProof` | `tds-calculator.service.ts`, `TdsCalculatorService` | `finance.payroll.manage` | `tax.declaration_verified` | PT (Needs dedicated canonical `/hr/payroll/tax` page with regime comparison, Form 16 generator & window locks) |
| **HR-PAY-07** | `/hr/payroll/reimbursements-loans` | `_app/expenses.tsx` (HR claims view) | Expense claims review table | `/api/v1/expenses`, `/api/v1/expenses/:id/approve` | `ExpenseClaim`, `ExpenseCategory` (Loans missing from schema) | `reimbursement-approval.service.ts` | `finance.payroll.manage`, `expense.approve` | `reimbursement.approved` | PT (Needs dedicated canonical `/hr/payroll/reimbursements-loans` page with expense claims approval AND full Employee Loan management) |
| **HR-PAY-08** | `/hr/payroll/forms` | `_app/forms.tsx`, `_app/payroll.tsx` (Tab "statutory_forms") | Generic forms catalog & Form 16 / 138 exports | `/api/v1/payroll/statutory-forms/form16/:employeeId`, `.../form138`, `/api/v1/forms` | `GenericFormTemplate`, `StatutoryReturnFiling` | `statutory-form-data.service.ts`, `statutory-return.service.ts` | `finance.payroll.manage` | `form.generated` | PT (Needs dedicated canonical `/hr/payroll/forms` page with Form 12B/12BB/16, PF Forms 11/19/31 & bulk ZIP export) |
| **ME-PAY-01** | `/me/payroll/payslips` | `_app/employee-payslips.tsx` (Legacy route `/employee-payslips`) | Personal payslip list with basic view modal | `/api/v1/employee-self-service/payslips` | `Payslip`, `PayrollSnapshot` | `PayrollEngine` | `employee` (self-scoped via `req.user.userId`) | `payslip.published` | PT (Needs dedicated canonical `/me/payroll/payslips` with net pay masking toggle, year selector & password-protected PDF) |
| **ME-PAY-02** | `/me/payroll/salary` | None (Direct profile salary view in `/me/profile`) | Basic salary tab in profile | `/api/v1/payroll/salary-assignments?employeeId=...` | `EmployeeSalaryAssignment`, `EmployeeSalaryItem` | `PayrollEngine` | `employee` (self-scoped, masked by default) | None | NS (Needs dedicated canonical `/me/payroll/salary` with masked CTC breakdown, component cards & revision history) |
| **ME-PAY-03** | `/me/payroll/tax` | None (Embedded within ESS tax declaration APIs) | Declarations form in settings | `/api/v1/employee-self-service/tax-declaration`, `/api/v1/employee-self-service/form16` | `EmployeeTaxDeclaration`, `TaxDeclarationProof` | `TdsCalculatorService` | `employee` (self-scoped) | None | PT (Needs dedicated canonical `/me/payroll/tax` with regime switch, 80C/80D/HRA proofs upload & Form 16 download) |
| **ME-PAY-04** | `/me/payroll/reimbursements-loans` | `_app/expenses.tsx` (Personal claims tab) | Personal expense claim submission | `/api/v1/expenses/claims`, `/api/v1/expenses/claims/my` | `ExpenseClaim`, `ExpenseCategory` (Loans missing) | `reimbursement-approval.service.ts` | `employee` (self-scoped) | None | PT (Needs dedicated canonical `/me/payroll/reimbursements-loans` with expense submission AND loan EMI tracker) |
| **ME-PAY-05** | `/me/payroll/statutory-forms` | None | None | `/api/v1/payroll/statutory-forms/form16/:employeeId` | `GenericFormTemplate` | `statutory-form-data.service.ts` | `employee` (self-scoped) | None | NS (Needs dedicated canonical `/me/payroll/statutory-forms` with PF Form 11/19 pre-fills & statutory downloads) |

---

## 2. Gap Matrix

| ID | Requirement | Existing | Gap | Risk | Proposed Change |
|---|---|---|---|---|---|
| **GAP-01** | Canonical Routing Hierarchy | Monolithic tabbed page `/payroll` and flat `/employee-payslips` | Missing 8 dedicated canonical `/hr/payroll/*` and 5 `/me/payroll/*` routes | Confusion between HR management and Employee Self Service; bloated monolith | Implement all 13 canonical pages under `src/routes/_authenticated/hr/payroll/` and `src/routes/_authenticated/me/payroll/`; preserve `/payroll` and `/employee-payslips` as compatibility aliases |
| **GAP-02** | Employee Loans Domain Model | `ExpenseClaim` exists for reimbursements, but no model exists for Loans | Missing `EmployeeLoan` and `LoanInstallment` tables in Prisma | Cannot track loan principals, interest, EMIs, or payroll deductions | Add `EmployeeLoan` and `LoanInstallment` models to `schema.prisma`, register in `DIRECT_TENANT_MODELS`, and wire into calculation engine |
| **GAP-03** | P3 Month-Lock & Input Linkage | P3 implements `AttendanceMonthLock` and `isMonthLocked` / `assertMonthUnlocked` | `PayrollAttendanceService` currently reads punches and leaves directly without checking if period attendance is locked | Payroll might run on fluctuating, unlocked attendance data | In `PayrollAttendanceService` and `PayrollEngine`, check P3's `AttendanceMonthLock` to ensure attendance is finalized/locked before locking or finalizing a payroll run |
| **GAP-04** | Previous Period Variance Engine | `PayrollRun` has totals, but no previous-period variance analysis | Run listing lacks automated delta auditing (Gross variance, Net variance, Headcount delta, LOP changes) | HR cannot spot payroll anomalies before approving | Build variance computation comparing current run snapshots with `periodYear` / `periodMonth - 1` run snapshots |
| **GAP-05** | Maker-Checker Approval Workflow | Run has `approvalStatus: String` | Run approval lacks multi-step validation checks and audit logging | Unauthorized user could mark payroll as paid or calculated | Enforce strict status lifecycle (`draft` -> `calculated` -> `under_review` -> `approved` -> `locked` -> `published`) with role check & Outbox audit |
| **GAP-06** | Payslip Password Protection & Publishing | `Payslip` has no `isPublished` or `passwordHash` fields | Employees can see draft payslips immediately, and PDF has no password protection | Financial confidentiality breach | Add `isPublished: Boolean`, `publishedAt: DateTime?`, `isPasswordProtected: Boolean` to `Payslip`; filter `/me/payroll/payslips` strictly to `isPublished: true` |
| **GAP-07** | Reimbursement Payroll Inclusion | `ExpenseClaim` has `reimbursementMethod: "payroll_addition"` | Calculation engine did not automatically pull approved expense claims into monthly earnings | Approved employee expenses must be manually added to salary | Query `ExpenseClaim` where `status: "finance_approved"`, `reimbursementMethod: "payroll_addition"`, and `payrollMonth: YYYY-MM` into run calculation |
| **GAP-08** | Formula Engine Tester & DAG UI | Backend has full DAG formula engine (`evaluator.ts`, `parser.ts`, `lexer.ts`) | UI has basic formula string input without live syntax validation or circular dependency testing | Formula syntax errors only discovered during monthly payroll calculation | Build interactive Formula Tester dialog in `/hr/payroll/components` using the formula engine test endpoint |
| **GAP-09** | Employee Self Service Salary Masking | Profile displays raw numbers | ESS salary page must mask sensitive figures by default | Screen shoulder surfing / privacy leakage | ME-PAY-02 defaults to `₹ ••••••` with explicit "Reveal Salary" toggle button and re-authentication |
| **GAP-10** | Statutory Forms Bulk Generation | Single employee Form 16 endpoint | Missing bulk PDF/ZIP generation and standardized PF Form 11 prefill | High manual overhead during statutory filing season | Provide batch Form 16 generator and PF Form 11 generator in `/hr/payroll/forms` |

---

## 3. Database Impact & Architecture

### Models to Reuse:
- `PayrollRun`: Contains `periodMonth`, `periodYear`, `totalAmount`, `totalNet`, `totalDeductions`, `employeeCount`, `approvalStatus`, `status`.
- `Payslip`: Contains `periodMonth`, `periodYear`, `grossSalary`, `deductions`, `netSalary`, `breakdown` (JSON).
- `SalaryComponent`: Contains `name`, `code`, `type`, `calculationType`, `formulaString`, `defaultValue`, `isTaxable`, `isStatutory`, `includeInPf`, `includeInEsi`.
- `SalaryStructure` & `SalaryStructureItem`: Structure definition with component references.
- `EmployeeSalaryAssignment` & `EmployeeSalaryItem`: Employee assignments with `ctcAnnual`, `ctcMonthly`, `effectiveFrom`, `effectiveTo`, `isCurrent`, `taxRegime`.
- `StatutoryRule`: Config JSON for EPF, ESI, PT, Gratuity, LWF by state.
- `EmployeeTaxDeclaration` & `TaxDeclarationProof`: Section 80C, 80D, 80G, HRA, Landlord details, and attached proofs.
- `PayrollSnapshot`: Frozen per-employee snapshot JSON for exact historical reproducibility.
- `ExpenseClaim` & `ExpenseCategory`: Approved expense reimbursements.
- `GenericFormTemplate`: Dynamic templates for statutory forms.

### Models Requiring Extension:
- `Payslip`:
  - Add `isPublished Boolean @default(false) @map("is_published")`
  - Add `publishedAt DateTime? @map("published_at")`
  - Add `isPasswordProtected Boolean @default(false) @map("is_password_protected")`
  - Add `pdfUrl String? @map("pdf_url") @db.VarChar(500)`
- `PayrollRun`:
  - Add `isPublished Boolean @default(false) @map("is_published")`
  - Add `publishedAt DateTime? @map("published_at")`
  - Add `publishedBy String? @map("published_by") @db.VarChar(150)`
  - Add `varianceSummary Json? @map("variance_summary")`

### New Models Required:
- `EmployeeLoan`:
  - `id`: UUID (PK)
  - `tenantId`: String (FK to Tenant)
  - `employeeId`: String (FK to Employee)
  - `loanType`: String (e.g., "personal", "emergency", "education", "salary_advance")
  - `principal`: Decimal (12, 2)
  - `interestRate`: Decimal (5, 2) @default(0.00)
  - `tenureMonths`: Int
  - `monthlyEmi`: Decimal (12, 2)
  - `disbursedAmount`: Decimal (12, 2)
  - `outstandingBalance`: Decimal (12, 2)
  - `status`: String @default("pending") (pending, approved, active, completed, rejected)
  - `disbursementDate`: DateTime?
  - `deductionStartMonth`: String (e.g., "2026-10")
  - `reason`: String?
  - `approverId`: String?
  - `approvedAt`: DateTime?
  - `createdAt`: DateTime @default(now())
  - `updatedAt`: DateTime @updatedAt
- `LoanInstallment`:
  - `id`: UUID (PK)
  - `loanId`: String (FK to EmployeeLoan)
  - `tenantId`: String (FK to Tenant)
  - `installmentNumber`: Int
  - `periodMonth`: Int
  - `periodYear`: Int
  - `emiAmount`: Decimal (12, 2)
  - `principalComponent`: Decimal (12, 2)
  - `interestComponent`: Decimal (12, 2)
  - `status`: String @default("pending") (pending, deducted, waived)
  - `payrollRunId`: String?
  - `deductedAt`: DateTime?

### Tenant Classification:
- `EmployeeLoan` -> `DIRECT_TENANT_MODELS`
- `LoanInstallment` -> `DIRECT_TENANT_MODELS`

---

## 4. API Impact & Route Contract

### HR Endpoints (`/api/v1/hr/payroll/*`):
- `GET /api/v1/hr/payroll/runs` — List runs with pagination & status filters
- `POST /api/v1/hr/payroll/runs` — Initialize run for period (month, year)
- `POST /api/v1/hr/payroll/runs/:id/calculate` — Execute deterministic batch calculation
- `GET /api/v1/hr/payroll/runs/:id/variance` — Calculate variance against previous comparable month
- `POST /api/v1/hr/payroll/runs/:id/review` — Transition run to `under_review`
- `POST /api/v1/hr/payroll/runs/:id/approve` — Maker-checker approval
- `POST /api/v1/hr/payroll/runs/:id/publish` — Publish payslips and freeze run
- `GET /api/v1/hr/payroll/payslips` — List all generated payslips across period
- `POST /api/v1/hr/payroll/payslips/bulk-publish` — Bulk publish payslips
- `GET /api/v1/hr/payroll/employee-salaries` — List employee salary assignments
- `POST /api/v1/hr/payroll/employee-salaries/assign` — Create / revise employee salary structure
- `GET /api/v1/hr/payroll/components` — List all components & structures
- `POST /api/v1/hr/payroll/components` — Create / update component
- `POST /api/v1/hr/payroll/components/test-formula` — Evaluate formula expression with DAG
- `GET /api/v1/hr/payroll/setup` — Get payroll configuration, statutory packs & banking rules
- `POST /api/v1/hr/payroll/setup` — Save statutory policy packs & configurations
- `GET /api/v1/hr/payroll/tax/declarations` — List employee tax declarations for FY
- `PATCH /api/v1/hr/payroll/tax/proofs/:id` — Verify / reject submitted tax proof
- `GET /api/v1/hr/payroll/reimbursements` — List approved expense claims ready for payroll
- `GET /api/v1/hr/payroll/loans` — List employee loans & installments
- `POST /api/v1/hr/payroll/loans` — Create / approve employee loan with schedule
- `GET /api/v1/hr/payroll/forms/form16` — Batch Form 16 generation & download

### Employee Endpoints (`/api/v1/me/payroll/*`):
- `GET /api/v1/me/payroll/payslips` — List published payslips for authenticated employee
- `GET /api/v1/me/payroll/payslips/:id` — View payslip breakdown & download PDF
- `GET /api/v1/me/payroll/salary` — Get current salary breakdown & revision timeline (masked)
- `GET /api/v1/me/payroll/tax` — Get current FY declaration, investment proofs & regime choice
- `POST /api/v1/me/payroll/tax/declare` — Save / update investment declaration
- `POST /api/v1/me/payroll/tax/proofs` — Upload Section 80C/80D proof documents
- `GET /api/v1/me/payroll/reimbursements-loans` — Personal expense claims & active loan EMI schedule
- `POST /api/v1/me/payroll/loans/request` — Submit loan or salary advance request
- `GET /api/v1/me/payroll/statutory-forms` — Prefilled PF Form 11, Form 12BB & Form 16 downloads

---

## 5. UI Impact & UIAble Composite Layout

Each page strictly utilizes existing UIAble components: `PageHeader`, `StatCard`, `StatsOverviewGrid`, `FilterToolbar`, `ConfirmationDialog`, `DataTable`, `Badge`, `Button`, `Dialog`, `Tabs`, `Input`, `Select`.

### 13 Canonical Routes to Implement:
1. `src/routes/_authenticated/hr/payroll/payslips.tsx`
2. `src/routes/_authenticated/hr/payroll/runs.tsx`
3. `src/routes/_authenticated/hr/payroll/employee-salaries.tsx`
4. `src/routes/_authenticated/hr/payroll/components.tsx`
5. `src/routes/_authenticated/hr/payroll/setup.tsx`
6. `src/routes/_authenticated/hr/payroll/tax.tsx`
7. `src/routes/_authenticated/hr/payroll/reimbursements-loans.tsx`
8. `src/routes/_authenticated/hr/payroll/forms.tsx`
9. `src/routes/_authenticated/me/payroll/payslips.tsx`
10. `src/routes/_authenticated/me/payroll/salary.tsx`
11. `src/routes/_authenticated/me/payroll/tax.tsx`
12. `src/routes/_authenticated/me/payroll/reimbursements-loans.tsx`
13. `src/routes/_authenticated/me/payroll/statutory-forms.tsx`

---

## 6. Audit Conclusion & Gate Readiness
Discovery confirms:
1. Solid base in existing `PayrollEngine`, `formula-engine/`, and `PayrollAttendanceService`.
2. Clean integration point with P3 Attendance month-lock engine.
3. Identified missing models: `EmployeeLoan` and `LoanInstallment`, plus publish flags on `Payslip` and `PayrollRun`.
4. Clear separation between HR administrative portal and Employee Self-Service.
5. All 13 canonical routes identified with zero regressions on existing legacy pages.
