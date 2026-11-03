# MASTERHRMS — WORKSTREAM D PRE-RUN VARIANCE & ANOMALY ENGINE AUDIT
## 16 Automated Diagnostic Checks, Classification Matrix, and Remediation Protocols

> **Workstream**: D — Stage 11 Pre-Run Variance Gate  
> **Target Subsystem**: `PayrollOrchestratorService.evaluatePreRunVariance`  
> **Date**: November 3, 2026  
> **Status**: AUDITED & TESTED  

---

## 1. 16-Check Specification Matrix

The pre-run variance and anomaly engine automatically evaluates 16 mandatory audit checks prior to allowing HR review or Finance authorization:

| Check # | Code | Category | Severity | Description | Actionable Remediation |
|---|---|---|---|---|---|
| 1 | `NET_PAY_VARIANCE_20` | `COMPENSATION` | `WARNING` | Net pay varies by $> \pm 20\%$ vs previous month | Verify overtime or LOP swings |
| 2 | `NEGATIVE_NET_PAY` | `CALCULATION` | `BLOCKER` | Net pay $< 0$ | Adjust excessive voluntary deductions |
| 3 | `ZERO_PAYABLE_DAYS_ACTIVE` | `ATTENDANCE` | `BLOCKER` | Active employee with 0 payable days and gross $> 0$ | Set unpaid hold or correct attendance |
| 4 | `MISSING_BANK_ACCOUNT` | `MASTER_DATA` | `BLOCKER` | Employee missing bank account number | Add bank account in Employee Profile |
| 5 | `INVALID_BANK_IFSC` | `MASTER_DATA` | `BLOCKER` | Invalid IFSC code pattern | Update to 11-digit valid IFSC |
| 6 | `MISSING_PAN` | `MASTER_DATA` | `WARNING` | Missing Permanent Account Number (PAN) | Collect PAN; Section 206AA rate applies |
| 7 | `MISSING_UAN` | `STATUTORY` | `WARNING` | PF-eligible employee missing UAN | Record 12-digit UAN in statutory profile |
| 8 | `GROSS_LESS_MIN_WAGE` | `COMPENSATION` | `WARNING` | Basic wage below statutory minimum floor | Audit against Tamil Nadu MW schedule |
| 9 | `LOP_EXCEEDS_CALENDAR_DAYS` | `ATTENDANCE` | `BLOCKER` | LOP days exceed total month calendar days | Correct attendance proration records |
| 10 | `DUPLICATE_ABSENCE_DEDUCTION` | `ATTENDANCE` | `WARNING` | Payable days + LOP days exceed month days | Reconcile overlapping leave ledgers |
| 11 | `DEDUCTIONS_EXCEED_GROSS` | `CALCULATION` | `BLOCKER` | Total deductions exceed gross earnings | Cap voluntary advance recoveries |
| 12 | `ESI_CEILING_MISMATCH` | `STATUTORY` | `INFO` | Gross $> ₹21,000$ with ESI continuation | Contribution period continuation note |
| 13 | `PF_WAGE_CEILING_ANOMALY` | `STATUTORY` | `INFO` | PF deduction $> ₹1,800$ standard cap | Voluntary higher PF contribution verified |
| 14 | `UNAPPROVED_OVERTIME` | `ATTENDANCE` | `BLOCKER` | Negative overtime hours detected | Adjust overtime hours to non-negative |
| 15 | `MID_MONTH_PRORATION_DISCREPANCY` | `RECONCILIATION` | `WARNING` | Proration factor $< 1.0$ with full payable days | Recompute prorated calendar days |
| 16 | `INACTIVE_EMPLOYEE_IN_RUN` | `MASTER_DATA` | `BLOCKER` | Inactive employee with active payable days | Exclude employee or trigger FnF flow |

---

## 2. Severity Classification Rules

1. **`BLOCKER`**:
   - Critical compliance violations, negative financial distributions, or unroutable banking records.
   - Prevents progression to `PREVIEW_READY`.
   - Halts `submitForReview` unless an explicit administrative waiver is recorded in the audit log.
2. **`WARNING`**:
   - Financial variance jumps ($> 20\%$), missing non-blocking master identifiers (e.g. missing PAN triggering penal TDS).
   - Flagged for review; does not block submission.
3. **`INFO`**:
   - Statutory edge cases, such as mid-contribution period ESI coverage or voluntary higher PF contribution.
   - Preserved for transparency and statutory provenance.

---

## 3. Test Evidence

The test suite validates:
- `WS-D.5.1`: Full scorecard generation across all 16 checks.
- `WS-D.5.2`: Automated rejection of review submission when unapproved blockers are present.
- `WS-D.5.3`: Immutable cycle recalculation prevention returning `409 Conflict`.
