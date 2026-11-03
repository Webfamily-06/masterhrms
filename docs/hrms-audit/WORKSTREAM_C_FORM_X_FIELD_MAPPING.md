# MASTERHRMS — WORKSTREAM C FIELD MAPPING
## Form X — Register of Leave & Social Security Benefits [Rule 16(1)]

**Document Reference**: `docs/hrms-audit/WORKSTREAM_C_FORM_X_FIELD_MAPPING.md`  
**Governing Statute**: Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948 — Rule 16(1)  
**Related Legislation**: Maternity Benefit Act, 1961 (amended 2017); Payment of Gratuity Act, 1972  
**Verified Column Count**: Exactly **21 Columns**  

---

### 1. Statutory Role & Architecture

Form X serves as the authoritative legal ledger for employee leave entitlements and statutory social security benefits. Under Section 25 of the Tamil Nadu Shops and Establishments Act, 1947, every person employed in any establishment is entitled after twelve months of continuous service to:
- **Earned Leave (EL / Privilege Leave)**: 12 days per annum (1.0 day accrued per month of service).
- **Sickness / Medical Leave (SL)**: 12 days per annum on medical certification.
- **Casual Leave (CL / Other Leave)**: 12 days per annum for unforeseen contingencies.

In addition, Form X governs compliance with:
- **Maternity Benefits** under Section 6 of the Maternity Benefit Act, 1961 (26 weeks paid leave, advance payment, medical bonus).
- **Gratuity Nominations** under Section 6 of the Payment of Gratuity Act, 1972 (Form F nomination verification and exit settlement tracking).

---

### 2. Comprehensive 21-Column Field Mapping Specification

| Col # | Statutory Header Name | MasterHRMS DB Source | Transformation & Logic | Validation & Compliance Rules |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Serial Number | Auto-increment index | `index + 1` | Sequential integer. |
| **2** | Name of the employee | `Employee.firstName + lastName` | Concatenate and trim. | Mandatory identity. |
| **3** | Employee Identification No. | `Employee.employeeCode` | Direct employee code string. | Unique employee reference. |
| **4** | Earned Leave: Opening Balance | `LeaveLedgerEntry` / Baseline | Opening balance at month start (e.g. 5.0 days). | Carried forward balance. |
| **5** | Earned Leave: Earned in Month | Statutory monthly accrual | 1.0 day accrued per completed month. | Section 25(1) accrual rate. |
| **6** | Earned Leave: Availed in Month | `LeaveRequest` (Type: `EARNED`) | Sum of approved EL taken in month. | Validated against approved requests. |
| **7** | Earned Leave: Balance at End | Computed ledger balance | `Opening + Earned - Availed`. | **Strict rule**: Balance must never be negative ($\ge 0$). |
| **8** | Medical Leave: Opening Balance | `LeaveLedgerEntry` / Baseline | Opening sick leave balance (e.g. 6.0 days). | Carried forward sick leave. |
| **9** | Medical Leave: Availed in Month | `LeaveRequest` (Type: `SICK`) | Sum of approved medical leave taken. | Supported by medical certificate if $>2$ days. |
| **10** | Medical Leave: Balance at End | Computed ledger balance | `Opening - Availed`. | Balance must never be negative ($\ge 0$). |
| **11** | Other Leave: Opening Balance | `LeaveLedgerEntry` / Baseline | Opening casual leave balance (e.g. 4.0 days). | Unavailed casual leave. |
| **12** | Other Leave: Availed in Month | `LeaveRequest` (Type: `CASUAL`) | Sum of approved casual leave taken. | Unforeseen contingency leave. |
| **13** | Other Leave: Balance at End | Computed ledger balance | `Opening - Availed`. | Balance must never be negative ($\ge 0$). |
| **14** | Maternity: Notice of Pregnancy Date | `Employee.maternityNominationDate` | Formatted `DD-MM-YYYY` or `On File` / `N/A`. | Section 6 notice date under Maternity Act. |
| **15** | Maternity: Advance Amount Paid | Payroll Maternity Line Item | Advance wages paid prior to delivery. | Statutory advance mandate. |
| **16** | Maternity: Subsequent Amount Paid | Payroll Maternity Line Item | Subsequent wages paid post-delivery proof. | Remaining statutory maternity wages. |
| **17** | Medical Bonus Amount Paid | Payroll Bonus Line Item | Statutory medical bonus (min ₹3,500). | Applicable where no free pre-natal medical care. |
| **18** | Maternity: Leave Wages Availed | `LeaveRequest` (Type: `MATERNITY`) | Days of paid leave availed in period. | Capped at 26 weeks entitlement. |
| **19** | Gratuity: Nomination Received | `Employee.uan / pfNumber / joinedAt` | Evaluates to `"Yes"` or `"No"`. | Mandatory Form F nomination on file. |
| **20** | Gratuity: Amount Paid on Exit | `PayrollSnapshot` (FNF Settlement) | Gratuity disbursed upon separation. | $[(15 \times \text{Basic} \times \text{Tenure}) / 26]$. |
| **21** | Remarks | Legal Attestation String | `"Maintained under Rule 16(1) TN Rules"` | Official compliance annotation. |

---

### 3. Ledger Integrity Rules
1. **Non-Negative Balances**: The builder asserts that closing leave balances cannot drop below zero. An automated diagnostic error is triggered if any employee's leave balance becomes negative.
2. **Gender Sensitivity**: Maternity benefit columns are evaluated sensitively; male employees default to `N/A`, while female employees report `"On File"` or specific notice dates.

