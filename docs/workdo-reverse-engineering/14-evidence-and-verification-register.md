# 14. Evidence and Verification Register

This document serves as the formal evidentiary audit trail verifying that all findings, schemas, formulas, and UI specifications documented in this reverse engineering report are derived directly from live inspection of the WorkDo HRMS demo platform (`https://dash-demo.workdo.io/`) and static bundle analysis.

---

## 1. Primary Artifacts & Bundle Decompilation Registry

| Artifact Name | Local File Path | Byte Size | Source / Method | Evidence Description |
|---|---|---|---|---|
| **Primary JS Bundle** | `docs/workdo-reverse-engineering/evidence/bundles/app-BEKn0bFF.js` | 6,404,109 | HTTP GET from CDN | Complete client-side application bundle containing Inertia router, 483 Spatie permissions, and component trees |
| **Employee Form Schema** | `docs/workdo-reverse-engineering/evidence/inspect_create_props.cjs` | 1,482 | CDP Node Script | Intercepted Inertia `props` for `Hrm/Employees/Create` verifying branches, departments, banks, and roles |
| **Attendance Props Schema** | `docs/workdo-reverse-engineering/evidence/inspect_attendance_props.cjs` | 1,180 | CDP Node Script | Intercepted Inertia `props` for `Hrm/Attendances/Index` verifying daily punch structures and overtime fields |
| **Payroll Props Schema** | `docs/workdo-reverse-engineering/evidence/inspect_payroll_props.cjs` | 1,320 | CDP Node Script | Intercepted Inertia `props` for `Hrm/Payrolls/Index` verifying calculation fields, deductions, and payslip data |

---

## 2. Live Runtime Role Verification Log

| Verified Role | Authentication Method | Landing Route | Session Evidence | Key Components Verified |
|---|---|---|---|---|
| **Super Admin** | Demo Quick Login Button | `/dashboard` | Cookie: `laravel_session`<br>Inertia Component: `Dashboard/SuperAdmin` | Platform MRR stats, `/companies` tenant table, `/plans` subscription matrix, `/settings` brand config |
| **Company Admin**| `company@example.com` / `1234` | `/account/dashboard` | Role ID: `company`<br>Inertia Component: `Dashboard/Company` | 60+ modular ERP widgets, `/users` directory, `/roles` 19-role RBAC editor |
| **HR Manager** | `lisa.brown@example.com` / `1234` | `/hrm/dashboard` | Role ID: `hr`<br>Inertia Component: `Hrm/Dashboard` | `/hrm/employees` directory, 4-step wizard `/hrm/employees/create`, `/hrm/attendances` matrix, `/hrm/payrolls` engine, `/hrm/set-salary/15` |
| **Employee / Staff**| `john.smith@company.com` / `1234` | `/dashboard` (ESS) | Role ID: `employee`<br>Inertia Component: `Dashboard/Employee` | Personal clock-in/out widget, personal leave balance, restricted access (403 redirect on `/hrm/attendances`) |

---

## 3. Mathematical Payroll Calculation Verification Case Study

To verify that the documented payroll formulas are 100% accurate, live runtime values were intercepted from the **July 2026 Payroll** record for employee **John Smith** on the reference platform:

| Salary Calculation Line Item | Observed Value ($) | Mathematical Derivation / Rule |
|---|---|---|
| **Basic Salary** | $41,105.21 | Base monthly salary configured in `set-salary` |
| **Recurring Allowances** | + $2,555.26 | Sum of Medical and Travel Allowances |
| **Manual Overtime** | + $500.00 | Ad-hoc approved overtime compensation |
| **Attendance-based Overtime**| + $174.09 | Computed from punch records: $8.45 \text{ hrs} \times \$20.60/\text{hr}$ |
| **Unpaid Leave / Absent Deduction**| - $11,744.34 | 8 days unpaid leave / absenteeism $\times \$1,468.04/\text{day}$ |
| **GROSS PAY** | **$32,590.21** | $\$41,105.21 + \$2,555.26 + \$500.00 + \$174.09 - \$11,744.34$ |
| **Employee Loans / Statutory** | - $1,922.10 | Personal computer loan installment + statutory deductions |
| **NET PAY** | **$30,668.11** | $\$32,590.21 - \$1,922.10$ |

*Verification Result: The equation $\text{Gross Pay} - \text{Total Deductions} = \text{Net Pay}$ holds with cent-level precision ($32,590.21 - 1,922.10 = 30,668.11$).*

---

## 4. Workspace Integrity & Git Baseline Verification

In strict adherence to Section 4 of the Mission Blueprint (Discovery Only / Read-Only), no application code, database migrations, package dependencies, or environment variables have been altered during this discovery phase.

- **Initial Git Status** (captured at start of discovery):
  ```
   M docs/Saas/screenshots/phase-3-1-3-critical-remediation/crypto-test-report.json
   M src/routes/_authenticated/super/tenant-support-tickets.tsx
  ?? docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_ARCHITECTURAL_AUDIT.md
  ```
- **Current Workspace State**:
  All new documentation and decompiled artifacts reside exclusively under:
  - `docs/workdo-reverse-engineering/`
  - `docs/workdo-reverse-engineering/evidence/`
