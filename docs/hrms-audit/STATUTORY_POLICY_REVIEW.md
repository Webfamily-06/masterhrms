# MASTERHRMS — STATUTORY & POLICY COMPLIANCE REVIEW

**Jurisdiction:** Central Government of India & State Government of Tamil Nadu  
**Target Architecture:** MasterHRMS Statutory Engine, Payroll, Lifecycle & Records  
**Date of Verification:** November 3, 2026  
**Status:** STATUTORY AUDIT COMPLETE (Authoritative Government Sources Grounded)

---

## 1. APPLICABLE STATUTORY LEGISLATION MATRIX

| # | Statute / Enactment | Regulatory Authority | Jurisdiction | Application Modules Impacted | Compliance Status in Code |
|---|---|---|:---:|---|:---:|
| 1 | **Employees' Provident Funds and Miscellaneous Provisions Act, 1952** | Ministry of Labour & Employment / EPFO | Central | Payroll, Statutory Returns, Employee Master | **PARTIAL** |
| 2 | **Employees' State Insurance Act, 1948** | Ministry of Labour & Employment / ESIC | Central | Payroll, Statutory Returns, Employee Master | **PARTIAL** |
| 3 | **Tamil Nadu Municipal Laws (Professional Tax Rules)** | Tamil Nadu Municipal Administration / GCC | State (TN) | Payroll Engine, Statutory Slabs | **BROKEN / DEFECT** |
| 4 | **Tamil Nadu Labour Welfare Fund Act, 1972** | Tamil Nadu Labour Welfare Board | State (TN) | Payroll Engine, Annual Returns | **OUTDATED RATES** |
| 5 | **Tamil Nadu Shops and Establishments Act, 1947 & Rules** | Department of Labour, Tamil Nadu | State (TN) | Attendance, Overtime, Leave, Registers (Form U/V/W/X/S) | **PARTIAL** |
| 6 | **Tamil Nadu Industrial Establishments (National and Festival Holidays) Act, 1958** | Department of Labour, Tamil Nadu | State (TN) | Shift & Holiday Management | **PASS** |
| 7 | **Tamil Nadu Industrial Establishments (Conferment of Permanent Status to Workmen) Act, 1981** | Department of Labour, Tamil Nadu | State (TN) | Employee Lifecycle & Master | **PARTIAL** |
| 8 | **Payment of Gratuity Act, 1972** | Ministry of Labour & Employment | Central | Full & Final Settlement (F&F) | **PARTIAL** |
| 9 | **Payment of Bonus Act, 1965** | Ministry of Labour & Employment | Central | Payroll Wage Structures & Arrears | **VERIFIED** |
| 10 | **Maternity Benefit Act, 1961 (Amended 2017)** | Ministry of Labour & Employment | Central | Leave Management, Employee Master | **PARTIAL** |
| 11 | **Income-tax Act, 1961 / Finance Acts** | Central Board of Direct Taxes (CBDT) | Central | TDS Calculator, Tax Declarations | **PASS** |
| 12 | **Digital Personal Data Protection (DPDP) Act, 2023** | Ministry of Electronics & IT (MeitY) | Central | File Security, PII Masking, Data Retention | **PARTIAL** |

---

## 2. DETAILED STATUTORY RULES & APPLICATION CONFLICT ANALYSIS

### 2.1. Tamil Nadu Professional Tax (PT)
- **Authoritative Basis:** Tamil Nadu Municipal Laws (Amendment) Act / G.O. Ms. No. 45 & Greater Chennai Corporation Notification.
- **Statutory Provisions:**
  - Professional Tax in Tamil Nadu is an annual tax assessed and collected on a **half-yearly basis** (1st Half: April–September; 2nd Half: October–March).
  - Current statutory half-yearly slabs:
    - **Up to ₹21,000:** Nil
    - **₹21,001 to ₹30,000:** ₹135 half-yearly (₹22.50 / month)
    - **₹30,001 to ₹45,000:** ₹315 half-yearly (₹52.50 / month)
    - **₹45,001 to ₹60,000:** ₹690 half-yearly (₹115.00 / month)
    - **₹60,001 to ₹75,000:** ₹1,025 half-yearly (₹170.83 / month)
    - **₹75,001 and above:** ₹1,250 half-yearly (₹208.33 / month)
- **Application Conflict (`server/src/services/payroll-engine.service.ts:315-325` & `statutory-rules.seed.ts:91-96`):**
  1. The application code uses outdated slab numbers: ₹100, ₹235, ₹510, ₹760, and ₹1,095.
  2. **Catastrophic Mathematical Error:** The code divides ONLY the top slab by 6 (`1095 / 6 = 182.5`), while returning the FULL un-divided half-yearly tax amounts for the lower slabs:
     ```typescript
     if (monthlyEarnedGross <= 60000) return 510; // DEDUCTING ₹510 EVERY MONTH!
     if (monthlyEarnedGross <= 75000) return 760; // DEDUCTING ₹760 EVERY MONTH!
     return 1095 / 6; // Deducting only ₹182.50/month for high earners!
     ```
  3. **Consequence:** An employee earning ₹55,000 is deducted ₹510/month (totaling ₹3,060 half-yearly, exceeding the statutory maximum ceiling), while an executive earning ₹1,00,000 is deducted only ₹182.5/month.
- **Required Action:** Immediately correct the monthly proration in `payroll-engine.service.ts` and update the seed pack in `statutory-rules.seed.ts` to reflect modern gazetted municipal slabs divided by 6.

---

### 2.2. Tamil Nadu Labour Welfare Fund (LWF)
- **Authoritative Basis:** Tamil Nadu Labour Welfare Fund Act, 1972 / G.O. (Ms) No. 177, Labour Welfare and Skill Development Department.
- **Statutory Provisions:**
  - Contributions are deducted once per year from the salary for the month of **December**.
  - Statutory contribution ratio is 1:2 (Employee : Employer).
  - **Amended Rates:**
    - Employee Contribution: **₹20.00**
    - Employer Contribution: **₹40.00**
    - Total Annual Contribution: **₹60.00**
  - Remittance due date: On or before **31st January** of the succeeding year.
- **Application Conflict (`server/src/seeds/statutory-rules.seed.ts:228-242`):**
  - The application seed configures old historical rates: `employeeContribution: 10`, `employerContribution: 20` (total ₹30).
- **Required Action:** Update `statutory-rules.seed.ts` configuration to `employeeContribution: 20` and `employerContribution: 40`.

---

### 2.3. Employees' Provident Fund (EPF & MP Act, 1952)
- **Authoritative Basis:** EPFO Notification G.S.R. 609(E) / Section 6 of EPF & MP Act, 1952.
- **Statutory Provisions:**
  - Statutory wage ceiling: **₹15,000 per month**.
  - Employee Contribution: 12% of PF Wages (Basic + DA + Retaining Allowance, excluding HRA, Overtime, Commission).
  - Employer Contribution:
    - **EPS (Pension):** 8.33% of PF wages (capped at **₹1,250 per month** under statutory ceiling).
    - **EPF (Difference):** 3.67% of PF wages (plus any excess over ₹1,250 if capped).
    - **EDLI (Insurance):** 0.50% of PF wages (capped at **₹75 per month**).
    - **Admin Charges:** 0.50% of total PF wages (minimum **₹500 per establishment/month**).
- **Application Compliance Status:**
  - **PASS:** `server/src/services/statutory-rule-registry.service.ts` and `payroll-engine.service.ts` correctly implement the ₹15,000 ceiling, EPS ₹1,250 cap, and EDLI ₹75 cap.
  - **VERIFIED:** `server/src/services/statutory-return.service.ts:generateEpfEcr` correctly exports the 11-column official EPFO ECR v2.0 text file delimited by `#~#`.
  - **GAP:** When a candidate is converted to an employee in `recruitment.service.ts`, their UAN and existing PF number are not mapped from onboarding tasks, resulting in null values in the monthly ECR export.

---

### 2.4. Employees' State Insurance (ESI Act, 1948)
- **Authoritative Basis:** Ministry of Labour & Employment Gazette Notification G.S.R. 423(E) effective July 1, 2019.
- **Statutory Provisions:**
  - Statutory wage threshold: **₹21,000 per month** (Gross earned wages excluding annual bonus).
  - Contribution Rates:
    - Employee Contribution: **0.75%** of gross wages.
    - Employer Contribution: **3.25%** of gross wages.
    - Total: **4.00%**.
  - **Wage Exemption:** Employees earning an average daily wage up to ₹176 are exempt from employee contribution (employer pays 3.25%).
- **Application Compliance Status:**
  - **PASS:** `payroll-engine.service.ts` applies the 0.75% / 3.25% rates and respects the ₹21,000 ceiling.
  - **GAP:** If an employee's salary increases above ₹21,000 mid-contribution period (April–Sept or Oct–March), statutory rules require they remain covered until the end of that contribution period. The application disables ESI immediately in the month salary crosses ₹21,000.

---

### 2.5. Tamil Nadu Industrial Establishments (Conferment of Permanent Status to Workmen) Act, 1981
- **Authoritative Basis:** Section 3 of Tamil Nadu Act 46 of 1981.
- **Statutory Provisions:**
  - Every workman who is in continuous service for a period of **480 days in a period of 24 calendar months** in an industrial establishment shall be made permanent.
- **Application Compliance Status:**
  - **PASS:** The Prisma `Employee` model explicitly contains `completion480DaysDate` and `permanentEmploymentDate` columns (`server/prisma/schema.prisma:349-350`).
  - **GAP:** The attendance and lifecycle engines contain no automated daily counter or background job that tracks the 480-day continuous service threshold or notifies HR when an employee reaches permanency eligibility.

---

### 2.6. Tamil Nadu Shops and Establishments Act, 1947 — Statutory Registers
- **Authoritative Basis:** Tamil Nadu Shops and Establishments Rules, 1948.
- **Statutory Form Specifications:**
  - **Form U (Rule 11-A):** Register of Employees (maintenance of demographic, appointment, wages, address).
  - **Form V (Rule 11-B):** Register of Employment (daily hours of work, rest intervals, overtime, total hours).
  - **Form W (Rule 11-C):** Register of Wages (basic, allowances, deductions, net paid, date of payment, signature).
  - **Form X (Rule 11-D):** Register of Leave & Social Security (earned leave, sick leave, casual leave).
  - **Form S (Rule 11):** Notice of Hours of Work and Rest Intervals.
- **Application Compliance Status:**
  - **VERIFIED:** Statutory form generation service exists in `server/src/services/statutory-form-data.service.ts` and `docs/payroll/PAYROLL_EXCEL_APPLICATION_GAP_AUDIT.md`.
  - **GAP:** Form V daily overtime hours are not populated automatically from `OvertimeRequest` approvals; operators must manually enter overtime in payroll sheets.

---

### 2.7. Payment of Gratuity Act, 1972
- **Authoritative Basis:** Section 4 of Payment of Gratuity Act, 1972.
- **Statutory Provisions:**
  - Vesting requirement: **5 years of continuous service** (waived in case of death or total disablement).
  - Calculation Formula:
    $$\text{Gratuity} = \frac{15 \times \text{Last Drawn Basic Salary} \times \text{Completed Years of Service}}{26}$$
  - Completed years: Service $> 6$ months in the final year is rounded up to 1 full year.
  - Statutory Tax-Free Ceiling: **₹20,00,000** (Twenty Lakhs).
- **Application Compliance Status:**
  - **PARTIAL:** Gratuity formula is documented in `docs/payroll/PAYROLL_FORMULA_RECONCILIATION.md:14`. However, `EmployeeExit` lacks an automated gratuity calculation service during offboarding finalization.

---

### 2.8. Maternity Benefit Act, 1961 (Amended 2017)
- **Authoritative Basis:** Maternity Benefit (Amendment) Act, 2017.
- **Statutory Provisions:**
  - Paid maternity leave: **26 weeks** (up to 8 weeks preceding delivery) for women having less than 2 surviving children; 12 weeks for women with 2 or more children.
  - Minimum eligibility: Must have worked for at least **80 days** in the 12 months preceding expected delivery.
  - Crèche facility: Mandatory for establishments employing **50 or more employees**.
- **Application Compliance Status:**
  - **PARTIAL:** `Employee.maternityNominationDate` exists in `schema.prisma:352`.
  - **GAP:** `LeaveType` does not automatically configure the 26-week (182-day) statutory paid entitlement with the 80-day pre-requisite service verification.

---

## 3. SUMMARY OF UNRESOLVED APPLICABILITY QUESTIONS

The following items are flagged for business-policy confirmation:
1. **Contract Staffing vs Core Establishment Coverage:** In staffing arrangements, whether Professional Tax and ESIC returns should be filed under the master tenant establishment code or the client company's local branch code (`StaffingClient.id`).
2. **Tamil Nadu S&E 8-Day Festival Holiday Agreement:** Whether the tenant has gazetted its specific 4 festival holidays under the TN Festival Holidays Act 1958 or adopts local government gazette notifications dynamically.
3. **Gratuity Trust Fund vs Direct Balance Sheet Provision:** Whether the tenant maintains an approved Gratuity Trust Fund (LIC / private insurer) or disburses gratuity directly from operational cash flows during Full & Final settlements.

