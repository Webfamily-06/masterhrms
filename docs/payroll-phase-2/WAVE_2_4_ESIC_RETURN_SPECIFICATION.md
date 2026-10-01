# WAVE 2.4 — ESIC MONTHLY RETURN SPECIFICATION
## Employees' State Insurance Corporation Monthly Contribution Return Standard (.xlsx & .csv)

---

## 1. Statutory Regulatory Context

Pursuant to Section 44 of the Employees' State Insurance Act, 1948 and Regulation 26 of the ESI (General) Regulations, 1950, every covered establishment must submit monthly contribution returns and remit contributions by the 15th of the following calendar month.

---

## 2. File Format Specification

The system generates both the official Microsoft Excel (`.xlsx`) Monthly Contribution Template and Comma-Separated Values (`.csv`).

### The 6 Canonical Portal Columns:
| Col # | Column Header | Data Type | Constraint | Description |
| :---: | :--- | :---: | :--- | :--- |
| **1** | IP Number | Numeric | 10 to 17 digits | Insurance Person (IP) Number issued by ESIC |
| **2** | IP Name | Text | As registered | Full Name of employee as per ESIC Pehchan card |
| **3** | No of Days for which wages paid/payable | Integer | 0 to 31 | Actual worked days plus paid leave in month |
| **4** | Total Monthly Wages | Decimal (0) | Positive | Gross remuneration excluding statutory bonus/OT |
| **5** | Reason Code for Zero Working Days | Text / Code | 01, 02, etc. | Required if Column 3 is 0 |
| **6** | Last Working Day | Date / Text | DD/MM/YYYY | Required if Reason Code is 02 (Left Service) |

---

## 3. Statutory Business Rules & Rates

### 3.1 Wage Ceiling & Eligibility
- **Statutory Wage Ceiling**: ₹21,000 per month (₹25,000 for employees with disabilities).
- If employee gross wage exceeds ₹21,000 in the first month of the contribution period, employee is exempt from ESIC.
- If employee gross wage is `<= ₹21,000`, ESIC deductions apply to the entire gross wage.

### 3.2 Contribution Rates
- **Employee Share**: `0.75%` of gross wages (rounded up to nearest rupee per portal calculation rules).
- **Employer Share**: `3.25%` of gross wages (rounded up to nearest rupee per portal calculation rules).
- **Total Statutory Remittance**: `4.00%` of covered wage bill.

### 3.3 Zero Working Days Exception Handling
If an employee has zero payable days (`payableDays === 0`):
- If employee status is `active`: Reason Code = `01` (On leave without pay / LOP).
- If employee status is `terminated`: Reason Code = `02` (Left Service / Relieved), and `lastWorkingDay` is populated.
