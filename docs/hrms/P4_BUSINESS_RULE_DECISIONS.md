# MASTERHRMS — PHASE P4 BUSINESS RULE DECISION REGISTER
## Authoritative Statutory & Payroll Policy Decisions

**Date:** 2026-10-07  
**Phase:** P4 — Payroll Linkage & Finance  
**Review Status:** LOCKED & APPROVED BASELINE  

---

## 1. Statutory Rules Decision Register

| ID | Domain | Rule / Topic | Source Authority | Decision & Formula | Effective Date | Applicable Employees | Status | Approved By |
|---|---|---|---|---|---|---|---|---|
| **BR-PAY-01** | EPF (Provident Fund) | Employee Contribution | Employees' Provident Funds and Miscellaneous Provisions Act, 1952 | 12% of PF Qualifying Wage (Basic + DA), subject to statutory ceiling limit of ₹15,000/month unless voluntary higher contribution selected | 2025-04-01 | PF-eligible full-time & contract employees | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-02** | EPF (Employer Match) | Employer Contribution | EPF Act, 1952 | 12% of PF Wage: 8.33% to EPS (capped at ₹1,250/mo) + 3.67% to EPF + 0.5% EDLI + 0.5% Admin charges | 2025-04-01 | PF-eligible employees | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-03** | ESI | Wage Ceiling & Contribution | Employees' State Insurance Act, 1948 | Applicable if monthly gross wage ≤ ₹21,000 (₹25,000 for employees with disability). Employee: 0.75% of gross wage. Employer: 3.25% of gross wage | 2025-04-01 | All employees below wage ceiling | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-04** | Professional Tax (PT) | State PT Matrix | State Professional Tax Enactments (MH, KA, TN, TS, WB, GJ, DL) | Determined by Employee Work State. E.g., KA: ₹200/mo if gross > ₹15,000. MH: ₹200/mo (₹300 in Feb). TN: Half-yearly slab translated monthly. DL: ₹0 | 2025-04-01 | All employees based on branch/work state | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-05** | Gratuity | Accrual Provision | Payment of Gratuity Act, 1972 | 15 days' basic wage per year of completed service = `(Basic * 15 / 26) / 12` monthly company accrual cost | 2025-04-01 | Full-time employees | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-06** | Income Tax TDS | Standard Deduction & Tax Slabs | Income-tax Act, 2025 / Finance Act (FY 2025-26 & FY 2026-27) | New Regime (Default): Standard deduction ₹75,000. Slabs: 0-3L 0%, 3-7L 5%, 7-10L 10%, 10-12L 15%, 12-15L 20%, >15L 30%. Surcharge & 4% Health & Education Cess applied | 2025-04-01 | All salaried employees with taxable income | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-07** | Attendance & LOP Linkage | Proration Factor Calculation | P3 Attendance Month-Lock & Flow F2 Specification | `Proration = Payable Days / Total Month Days`. Payable Days = Total Month Days - LOP Days. Base Earnings prorated = `Component * Proration` | 2025-04-01 | All active salaried employees | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-08** | Overtime (OT) Integration | Hourly Rate & Inclusion | P3 Attendance OT Engine & Factories Act | OT Hours approved in P3 Attendance multiplied by `(Monthly CTC / (Working Days * 8)) * OT Multiplier`. Added as taxable earning line item `OVERTIME` | 2025-04-01 | Eligible non-exempt employees | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-09** | Reimbursements | Payroll Addition | Expense Management Spec | Approved claims marked `payroll_addition` for the matching period month added as non-taxable / taxable earning line item `EXPENSE_REIMBURSEMENT` | 2025-04-01 | All claiming employees | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-10** | Employee Loans | Monthly EMI Recovery | Loan Management Spec | Active loans deduct scheduled EMI for `periodYear-periodMonth` as pre-tax / post-tax deduction line item `LOAN_EMI`. Never over-recovers principal | 2025-04-01 | Employees with active approved loans | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-11** | Maker-Checker Approval | Payroll Run State Machine | Financial Controls & Audit Doctrine | Lifecycle: `DRAFT` -> `CALCULATED` -> `UNDER_REVIEW` -> `APPROVED` -> `PUBLISHED` -> `LOCKED`. Checker role required for `APPROVED`. Only `APPROVED` runs can be published | 2025-04-01 | Tenant-wide | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-12** | Payslip Security | Password Protection & Masking | Data Protection & ESS Privacy Doctrine | PDF password option defaults to `First 4 letters of name (UPPERCASE) + DDMM of DOB`. ESS salary page masks numbers by default | 2025-04-01 | All ESS portal users | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-13** | Variance Audit | Comparative Month Baseline | Audit & Compliance Standard | Run review compares Current Period against Previous Period (`periodMonth - 1`). Highlights Gross delta (>5%), Net delta (>5%), Headcount variance, and LOP spikes | 2025-04-01 | Tenant-wide | APPROVED | Lead Architect & Product Owner |
| **BR-PAY-14** | Rounding Rules | Net Salary & Component Rounding | Banking & Financial Rounding Standards | All calculated earning & deduction components rounded to nearest rupee (`roundOff: "nearest"`). Net pay rounded to nearest whole rupee | 2025-04-01 | All employees | APPROVED | Lead Architect & Product Owner |

---

## 2. Product Decisions on Edge Cases

1. **Unpunched Days Without Leave:**
   - If an employee has 0 punches recorded in P3 Attendance for a month, system treats attendance as standard full month unless unpaid leave is explicitly approved or manual LOP override is applied by HR in payroll run.
2. **Back-dated Salary Revision:**
   - When a salary revision is effective in a prior locked month, historical payslips are NOT mutated. Difference is calculated and credited as `ARREARS` in the current open payroll period.
3. **Mid-Month Joiners / Leavers:**
   - Prorated strictly by `(End Date - Joining Date + 1) / Total Days in Month` or payable days recorded in P3.
4. **Loan Closure on Final Installment:**
   - When final EMI is deducted, `outstandingBalance` becomes `0.00`, and `EmployeeLoan.status` automatically transitions to `completed`.
