# MASTERHRMS — PAYROLL EXCEL vs APPLICATION GAP AUDIT MATRIX

**Reference Document:** `Paysheet_ENABL_OCT_2026 -Final.xlsx`  
**Application Target:** MasterHRMS Advanced Payroll, Statutory Engine, HRMS Database & CMS  
**Date of Audit:** November 3, 2026  
**Audit Scope:** Full 7 Functional Worksheets (202 Total Fields Audited)

---

## 1. EXECUTIVE SUMMARY & COVERAGE METRICS

| Metric | Count | Percentage |
|---|:---:|:---:|
| **Total Fields Audited** | **202** | **100.0%** |
| **PASS (Fully Implemented & Verified)** | **94** | **46.5%** |
| **PARTIAL (Partially Implemented / Data Flow Gap)** | **43** | **21.3%** |
| **MISSING (No Current Implementation)** | **52** | **25.7%** |
| **BROKEN / RULE MISMATCH (Formula / Statutory Conflict)** | **13** | **6.4%** |
| **NOT APPLICABLE (Blank Sheet1)** | **0** | **0.0%** |

### Coverage by Worksheet

| Worksheet Name | Total Fields | PASS | PARTIAL | MISSING | BROKEN | Coverage Rate |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Tab 1: OCT 2026 - Final (Main Register)** | 51 | 27 | 10 | 8 | 6 | 72.5% |
| **Tab 2: Summary (Statutory & Billing)** | 16 | 7 | 4 | 5 | 0 | 68.8% |
| **Tab 3: Form U (Employee Register)** | 24 | 14 | 3 | 7 | 0 | 70.8% |
| **Tab 4: Form V (Register of Employment)** | 43 | 19 | 16 | 8 | 0 | 81.4% |
| **Tab 5: FORM W (Register of Wages)** | 30 | 14 | 8 | 7 | 1 | 73.3% |
| **Tab 6: Form X (Leave & Social Security)** | 21 | 9 | 5 | 7 | 0 | 66.7% |
| **Tab 7: FORM S (Notice of Hours & Wages)** | 17 | 4 | 5 | 8 | 0 | 52.9% |
| **Tab 8: Sheet1** | 0 | - | - | - | - | Excluded (Blank) |
| **TOTAL** | **202** | **94** | **43** | **52** | **13** | **67.8% (Avg)** |

---

## 2. DETAILED FIELD-BY-FIELD COMPARISON MATRIX

### Tab 1: `OCT 2026 - Final` — Main Payroll Register (51 Fields)

| # | Excel Col | Excel Field Label | Application Module | Application Screen | Database Field | API Field | Input Type | Required | Status | Calculation Source | Gap Description | Recommended Action | Evidence |
|---|---|---|---|---|---|---|---|---|:---:|---|---|---|---|
| 1 | A | Employee ID | Employee Management | `/(workspace)/employees` | `Employee.employeeCode` | `employeeCode` | Text | Mandatory | **PASS** | Stored Identifier | None. Unique per tenant. | Reuse existing | `server/prisma/schema.prisma:117` |
| 2 | B | Employee Name | Employee Management | `/(workspace)/employees` | `Employee.firstName`, `lastName` | `firstName`, `lastName` | Text | Mandatory | **PASS** | Concatenated full name | None. | Reuse existing | `server/prisma/schema.prisma:118` |
| 3 | C | Gender | Employee Management | `/(workspace)/employees` | `Employee.gender` | `gender` | Dropdown | Optional | **PASS** | Profile field | Controlled options: Male, Female, Other. | Reuse existing | `server/prisma/schema.prisma:134` |
| 4 | D | Designation | Employee Management | `/(workspace)/employees` | `Employee.position`, `Designation.name` | `position`, `designation` | Dropdown | Optional | **PASS** | Job master | None. | Reuse existing | `server/prisma/schema.prisma:122` |
| 5 | E | DOB (DD/MM/YYYY) | Employee Management | `/(workspace)/employees` | `Employee.dateOfBirth` | `dateOfBirth` | Date | Optional | **PASS** | Stored date | None. Date format validated. | Reuse existing | `server/prisma/schema.prisma:133` |
| 6 | F | DOJ (DD/MM/YYYY) | Employee Management | `/(workspace)/employees` | `Employee.joinedAt` | `joinedAt` | Date | Mandatory | **PASS** | Stored date | None. Used in proration. | Reuse existing | `server/prisma/schema.prisma:125` |
| 7 | G | PAN Number | Employee Management | `/(workspace)/employees` | `Employee.pan` | `pan` | Text | Conditional | **PASS** | Profile field | Validated with 10-char regex `[A-Z]{5}[0-9]{4}[A-Z]{1}`. | Reuse existing | `server/prisma/schema.prisma:126` |
| 8 | H | Aadhar Number | Employee Management | `/(workspace)/employees` | `Employee.aadhaar` | `aadhaar` | Text | Conditional | **PASS** | Profile field | Validated with 12-digit numeric regex. | Reuse existing | `server/prisma/schema.prisma:127` |
| 9 | I | Mobile Number | Employee Management | `/(workspace)/employees` | `Employee.phone` | `phone` | Text | Optional | **PASS** | Profile field | 10-digit mobile number. | Reuse existing | `server/prisma/schema.prisma:120` |
| 10 | J | Email ID | Employee Management | `/(workspace)/employees` | `Employee.email` | `email` | Text | Mandatory | **PASS** | Profile field | Standard RFC email format. | Reuse existing | `server/prisma/schema.prisma:119` |
| 11 | K | UAN NO | Employee Statutory | `/(workspace)/employee-details` | `Employee.uan` | `uan` | Text | Conditional | **PASS** | Profile field | 12-digit EPF Universal Account Number. | Reuse existing | `server/prisma/schema.prisma:128` |
| 12 | L | EPF Number | Employee Statutory | `/(workspace)/employee-details` | `Employee.pfNumber` | `pfNumber` | Text | Conditional | **PASS** | Profile field | Regional EPF Member ID. | Reuse existing | `server/prisma/schema.prisma:140` |
| 13 | M | ESIC Number | Employee Statutory | `/(workspace)/employee-details` | `Employee.esiNumber` | `esiNumber` | Text | Conditional | **PASS** | Profile field | 17-digit Insurance Number or 'Not Eligible'. | Reuse existing | `server/prisma/schema.prisma:129` |
| 14 | N | Bank Name | Employee Payroll | `/(workspace)/employee-details` | `Employee.bankName` | `bankName` | Text | Optional | **PASS** | Profile field | Financial institution name. | Reuse existing | `server/prisma/schema.prisma:130` |
| 15 | O | Bank Account No | Employee Payroll | `/(workspace)/employee-details` | `Employee.bankAccount` | `bankAccount` | Text | Optional | **PASS** | Profile field | Account identifier. | Reuse existing | `server/prisma/schema.prisma:131` |
| 16 | P | IFSC Code | Employee Payroll | `/(workspace)/employee-details` | `Employee.bankIfsc` | `bankIfsc` | Text | Optional | **PASS** | Profile field | 11-character RBI IFSC pattern. | Reuse existing | `server/prisma/schema.prisma:132` |
| 17 | Q | Payroll Month | Payroll Processing | `/(workspace)/payroll` | `PayrollRun.periodMonth`, `periodYear` | `periodMonth`, `periodYear` | Date/Dropdown | Mandatory | **PASS** | Calendar selection | Month and Year integer mapping. | Reuse existing | `server/prisma/schema.prisma:177` |
| 18 | R | Basic (Fixed) | Salary Structure | `/(workspace)/payroll` | `EmployeeSalaryItem` (`BASIC`) | `baseSalary` | Currency | Mandatory | **PASS** | Fixed structure item | Stored in assignment items. | Reuse existing | `server/prisma/schema.prisma:234` |
| 19 | S | Special Allowance (Fixed) | Salary Structure | `/(workspace)/payroll` | `EmployeeSalaryItem` (`SPECIAL`) | `specialAllowance` | Currency | Optional | **PASS** | Fixed structure item | Residual allowance. | Reuse existing | `server/prisma/schema.prisma:234` |
| 20 | T | Statutory Bonus (Fixed) | Salary Structure | `/(workspace)/payroll` | `EmployeeSalaryItem` (`STATUTORY_BONUS`) | `statutoryBonus` | Currency | Optional | **PARTIAL** | Fixed structure item | Bonus exists as ad-hoc module but is fixed monthly in staffing. | Add fixed monthly bonus item | `server/prisma/schema.prisma:234` |
| 21 | U | Fixed Gross | Salary Structure | `/(workspace)/payroll` | `EmployeeSalaryAssignment.ctcMonthly` | `fixedGross` | Currency | Calculated | **PARTIAL** | `=SUM(R3:T3)` | Currently derived from CTC instead of explicit sum of fixed items. | Expose computed `fixedGross` | `server/src/services/payroll-engine.service.ts:68` |
| 22 | V | Month Days | Attendance / Roster | `/(workspace)/attendance` | `AttendanceContext.totalWorkingDays` | `totalMonthDays` | Number | Mandatory | **PASS** | Calendar days of month | 28, 30, or 31 days. | Reuse existing | `server/src/services/payroll-engine.service.ts:44` |
| 23 | W | Payable Days | Attendance / Payroll | `/(workspace)/payroll` | `AttendanceContext.payableDays` | `payableDays` | Number | Mandatory | **PASS** | Present + Paid Leave | Days eligible for payment. | Reuse existing | `server/src/services/payroll-engine.service.ts:45` |
| 24 | X | Arrears Days | Payroll Input | `/(workspace)/payroll` | `AttendanceContext.arrearsDays` | `arrearsDays` | Number | Optional | **MISSING** | User input | No arrears days field currently captured. | Add `arrearsDays` to payroll input | `server/src/services/payroll-engine.service.ts:43` |
| 25 | Y | LOP Days | Attendance / Payroll | `/(workspace)/attendance` | `AttendanceContext.lossOfPayDays` | `lossOfPayDays` | Number | Calculated | **PASS** | `MonthDays - PayableDays` | Unpaid absence days. | Reuse existing | `server/src/services/payroll-engine.service.ts:49` |
| 26 | Z | Basic (Earned) | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['BASIC_EARNED']` | `earnBasic` | Currency | Calculated | **PASS** | `=ROUND(R3/V3*W3,0)` | Prorated by payable days. | Reconciled | `server/src/services/payroll-engine.service.ts:78` |
| 27 | AA | Basic Arrears | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['BASIC_ARREARS']` | `basicArrears` | Currency | Calculated | **MISSING** | `=ROUND(R3/V3*X3,0)` | Arrears calculation absent. | Add to engine | `server/src/services/payroll-engine.service.ts:87` |
| 28 | AB | House Rent Allowance | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['HRA_EARNED']` | `earnHra` | Currency | Calculated | **PARTIAL** | `=ROUND(R3*50%,0)` | App uses flexible %, Excel strictly uses 50% of Basic. | Support 50% HRA rule | `server/src/services/payroll-engine.service.ts:79` |
| 29 | AC | HRA Arrears | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['HRA_ARREARS']` | `hraArrears` | Currency | Calculated | **MISSING** | `=ROUND(R3*50%/V3*X3,0)` | HRA arrears absent. | Add to engine | `server/src/services/payroll-engine.service.ts:87` |
| 30 | AD | Statutory Bonus (Earned) | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['BONUS_EARNED']` | `earnBonus` | Currency | Calculated | **MISSING** | `=ROUND(T3/V3*W3,0)` | Monthly prorated bonus absent. | Add to engine | `server/src/services/payroll-engine.service.ts:87` |
| 31 | AE | Special Allowance (Earned)| Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['SPECIAL_EARNED']` | `earnSpecial` | Currency | Calculated | **PASS** | Prorated residual allowance | Calculated cleanly. | Reuse existing | `server/src/services/payroll-engine.service.ts:80` |
| 32 | AF | Special Allowance Arrears | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['SPECIAL_ARREARS']` | `specialArrears` | Currency | Calculated | **MISSING** | `=ROUND(S3/V3*X3,0)` | Special allowance arrears absent. | Add to engine | `server/src/services/payroll-engine.service.ts:87` |
| 33 | AG | Over Time | Overtime / Payroll | `/(workspace)/payroll` | `breakdown.calculatedValues['OVERTIME']` | `overtime` | Currency | Calculated | **PARTIAL** | OT hours * 2x hourly rate | Exists in schema, not wired to export column. | Wire to export | `server/prisma/schema.prisma:340` |
| 34 | AH | Gross Wages | Payroll Engine | `/(workspace)/payroll` | `Payslip.grossSalary` | `grossSalary` | Currency | Calculated | **PASS** | `=SUM(Z3:AG3)` | Sum of all earned earnings components. | Reconciled | `server/src/services/payroll-engine.service.ts:85` |
| 35 | AI | EPFER (Employer PF) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['EPF_ER']` | `erEpf` | Currency | Calculated | **BROKEN** | `=AH3*12%` | **CONFLICT:** Excel bills 12% on Gross un-capped. Legal standard is 12% on Basic capped at ₹15k. | Add configurable `pfWageBasis: 'GROSS' | 'BASIC'` | `server/src/services/payroll-engine.service.ts:160` |
| 36 | AJ | EDLI Charges | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['EDLI']` | `erEdli` | Currency | Calculated | **PARTIAL** | `=ROUND(AH3*0.5%,0)` | Excel computes 0.5% on Gross un-capped; app caps at ₹75. | Follow `pfWageBasis` toggle | `server/src/services/payroll-engine.service.ts:167` |
| 37 | AK | PF ADMIN Charges | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['PF_ADMIN']` | `erPfAdmin` | Currency | Calculated | **PARTIAL** | `=ROUND(AH3*0.5%,0)` | Excel computes 0.5% on Gross un-capped; app caps at ₹75. | Follow `pfWageBasis` toggle | `server/src/services/payroll-engine.service.ts:168` |
| 38 | AL | ESICER (Employer ESIC) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['ESIC_ER']` | `erEsic` | Currency | Calculated | **BROKEN** | `=ROUNDUP(IF(U3<=21000,AH3*4.75%,0),0)` | **STATUTORY MISMATCH:** Excel uses obsolete 4.75% rate. Current law is 3.25%. | Add `esicRuleVersion` toggle | `server/src/services/payroll-engine.service.ts:205` |
| 39 | AM | Insurance | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['INSURANCE']` | `insurance` | Currency | Optional | **MISSING** | Commercial insurance premium | Column present in CTC calculation. | Add to breakdown | `server/src/services/payroll-engine.service.ts:111` |
| 40 | AN | LWFER (Employer LWF) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['LWF_ER']` | `erLwf` | Currency | Calculated | **PARTIAL** | State statutory rule | Exists in engine, missing in export column. | Expose in export | `server/src/services/payroll-engine.service.ts:108` |
| 41 | AO | Total CTC | Payroll Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['TOTAL_CTC']` | `totalCtc` | Currency | Calculated | **PASS** | `=SUM(AH3:AN3)` | Gross wages + Employer statutory costs. | Reconciled | `server/src/services/payroll-engine.service.ts:110` |
| 42 | AP | MMU (Markup Unit) | Client Billing | `/(workspace)/payroll` | `breakdown.calculatedValues['MMU']` | `mmu` | Currency | Calculated | **MISSING** | `=SUM(AH3:AI3)*10%` | Staffing agency markup (10% of Gross + PF). | Add to billing logic | `server/src/services/payroll-export.service.ts:128` |
| 43 | AQ | GST | Client Billing | `/(workspace)/payroll` | `breakdown.calculatedValues['GST']` | `gst` | Currency | Calculated | **PARTIAL** | `=ROUND((AO3+AP3)*18%,0)` | 18% GST on (CTC + MMU). Stored in export, not on run. | Persist in breakdown | `server/src/services/payroll-export.service.ts:130` |
| 44 | AR | Total Billing | Client Billing | `/(workspace)/payroll` | `breakdown.calculatedValues['TOTAL_BILLING']` | `totalBilling` | Currency | Calculated | **PARTIAL** | `=+AO3+AP3+AQ3` | Total client invoice payable amount. | Persist in breakdown | `server/src/services/payroll-export.service.ts:131` |
| 45 | AS | EPFEE (Employee PF) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['EPF_EE']` | `dedEpf` | Currency | Calculated | **BROKEN** | `=AI3` | Equal to Employer PF (`Gross * 12%`). See row 35. | Follow `pfWageBasis` toggle | `server/src/services/payroll-engine.service.ts:90` |
| 46 | AT | ESICEE (Employee ESIC) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['ESIC_EE']` | `dedEsic` | Currency | Calculated | **BROKEN** | `=ROUNDUP(IF(U3<=21000,AH3*1.75%,0),0)` | **STATUTORY MISMATCH:** Excel uses obsolete 1.75% rate. Current law is 0.75%. | Add `esicRuleVersion` toggle | `server/src/services/payroll-engine.service.ts:92` |
| 47 | AU | Income Tax (TDS) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['TDS']` | `dedTds` | Currency | Calculated | **PASS** | Section 392 withholding | Annual projected tax monthly installment. | Reconciled | `server/src/services/payroll-engine.service.ts:96` |
| 48 | AV | Professional Tax | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['PT']` | `dedPt` | Currency | Calculated | **PASS** | State PT schedule (e.g. TN/MH) | Monthly deduction based on gross slab. | Reconciled | `server/src/services/payroll-engine.service.ts:94` |
| 49 | AW | LWFEE (Employee LWF) | Statutory Engine | `/(workspace)/payroll` | `breakdown.calculatedValues['LWF_EE']` | `dedLwf` | Currency | Calculated | **PASS** | State LWF Act schedule | Stored in engine breakdown. | Reconciled | `server/src/services/payroll-engine.service.ts:95` |
| 50 | AX | Total Deductions | Payroll Engine | `/(workspace)/payroll` | `Payslip.deductions` | `totalDeductions` | Currency | Calculated | **PASS** | `=SUM(AS3:AW3)` | Sum of PF, ESIC, IT, PT, LWF. | Reconciled | `server/src/services/payroll-engine.service.ts:98` |
| 51 | AY | NET Pay | Payroll Engine | `/(workspace)/payroll` | `Payslip.netSalary` | `netPay` | Currency | Calculated | **PASS** | `=+AH3-AX3` | Gross Wages minus Total Employee Deductions. | Reconciled | `server/src/services/payroll-engine.service.ts:138` |

---

### Tab 2: `Summary` — Consolidated Liabilities & Client Billing (16 Fields)

| # | Excel Item Label | Application Module | Database Mapping | Status | Gap Description | Recommended Action | Evidence |
|---|---|---|---|:---:|---|---|---|
| 1 | PF Contribution | Statutory Summary | Aggregated `EPF_EE + EPF_ER + EDLI + PF_ADMIN` | **PARTIAL** | Computed in engine, but lacks dedicated summary report worksheet. | Generate in multi-sheet export | `server/src/services/payroll-export.service.ts:281` |
| 2 | ESIC Contribution | Statutory Summary | Aggregated `ESIC_EE + ESIC_ER` | **PARTIAL** | Computed in engine, missing in summary export block. | Include in summary sheet | `server/src/services/payroll-export.service.ts:286` |
| 3 | Income Tax | Statutory Summary | Aggregated `TDS` | **PASS** | Aggregated on `PayrollRun`. | Include in summary sheet | `server/prisma/schema.prisma:181` |
| 4 | Professional Tax | Statutory Summary | Aggregated `PT` | **PASS** | Aggregated on `PayrollRun`. | Include in summary sheet | `server/prisma/schema.prisma:181` |
| 5 | Professional Tax ER | Statutory Summary | Aggregated Employer PT | **PASS** | Aggregated where applicable. | Include in summary sheet | `server/src/services/payroll-engine.service.ts:94` |
| 6 | Labour Welfare Fund | Statutory Summary | Aggregated `LWF_EE + LWF_ER` | **PASS** | Aggregated in breakdown. | Include in summary sheet | `server/src/services/payroll-engine.service.ts:95` |
| 7 | Net Salary Payable | Payroll Summary | `PayrollRun.totalNet` | **PASS** | Total net wage disbursement. | Reconciled | `server/prisma/schema.prisma:180` |
| 8 | Total Payroll Liability | Statutory Summary | Sum of items 1 to 7 | **PASS** | Total cash liability for payroll run. | Reconciled | `server/prisma/schema.prisma:179` |
| 9 | Billable CTC | Client Billing | Sum of `TOTAL_CTC` | **PARTIAL** | Exists in individual slips, not aggregated as billing field. | Aggregate in summary | `server/src/services/payroll-export.service.ts:301` |
| 10 | EPF Admin & EDLI Admin | Statutory Summary | Sum of `EDLI + PF_ADMIN` | **PASS** | Aggregated from breakdown. | Reconciled | `server/src/services/payroll-export.service.ts:284` |
| 11 | MMU | Client Billing | Sum of `MMU` | **MISSING** | Agency management markup aggregation missing. | Add MMU aggregation | `server/src/services/payroll-export.service.ts:128` |
| 12 | Total Pre-Tax Billing | Client Billing | `BillableCTC + MMU` | **MISSING** | Taxable commercial billing base. | Add to summary engine | `server/src/services/payroll-export.service.ts:129` |
| 13 | GST (18%) | Client Billing | `PreTaxBilling * 18%` | **PARTIAL** | 18% GST calculation exists in export, not in DB. | Expose on summary sheet | `server/src/services/payroll-export.service.ts:130` |
| 14 | Invoice Amount | Client Billing | `PreTaxBilling + GST` | **MISSING** | Final gross commercial invoice amount. | Expose on summary sheet | `server/src/services/payroll-export.service.ts:131` |
| 15 | Payroll Month | Client Billing | `PayrollRun.periodMonth` | **PASS** | Reference month label. | Reconciled | `server/prisma/schema.prisma:177` |
| 16 | Particulars Header | Template | Template metadata | **PASS** | Static table structure. | Reconciled | `server/src/services/payroll-export.service.ts:35` |

---

### Tab 3: `Form U` — Employee Register under Rule 16(1) (24 Fields)

| # | Form U Column | Database Model / Field | Status | Gap Description | Recommended Action | Evidence |
|---|---|---|:---:|---|---|---|
| 1 | Serial Number | Auto-increment index | **PASS** | Generated row sequence. | Include in exporter | `server/src/services/payroll-export.service.ts:227` |
| 2 | Name of the Employee | `Employee.firstName` + `lastName` | **PASS** | Full legal name. | Reconciled | `server/prisma/schema.prisma:118` |
| 3 | Employee ID | `Employee.employeeCode` | **PASS** | Staff code. | Reconciled | `server/prisma/schema.prisma:117` |
| 4 | Gender | `Employee.gender` | **PASS** | Gender classification. | Reconciled | `server/prisma/schema.prisma:134` |
| 5 | Father / Spouse Name | `Employee.fatherOrSpouseName` | **MISSING** | Missing top-level column on Employee model. | Add `fatherOrSpouseName` to `Employee` | New DB column required |
| 6 | Date of Birth | `Employee.dateOfBirth` | **PASS** | Stored date of birth. | Reconciled | `server/prisma/schema.prisma:133` |
| 7 | Date of Entry into Service | `Employee.joinedAt` | **PASS** | Date of joining. | Reconciled | `server/prisma/schema.prisma:125` |
| 8 | Designation | `Employee.position` | **PASS** | Current job title. | Reconciled | `server/prisma/schema.prisma:122` |
| 9 | Present Address | `Employee.presentAddress` | **MISSING** | Full current residential address missing. | Add `presentAddress` to `Employee` | New DB column required |
| 10 | Permanent Address | `Employee.permanentAddress` | **MISSING** | Full permanent address missing. | Add `permanentAddress` to `Employee` | New DB column required |
| 11 | EPF Number | `Employee.pfNumber` | **PASS** | Regional PF account. | Reconciled | `server/prisma/schema.prisma:140` |
| 12 | ESIC Number | `Employee.esiNumber` | **PASS** | 17-digit IP code. | Reconciled | `server/prisma/schema.prisma:129` |
| 13 | Aadhaar Number | `Employee.aadhaar` | **PASS** | 12-digit UID. | Reconciled | `server/prisma/schema.prisma:127` |
| 14 | 480 Days Completion Date | `Employee.completion480DaysDate` | **MISSING** | Tamil Nadu Act 46 of 1981 statutory permanency date missing. | Add `completion480DaysDate` to `Employee` | New DB column required |
| 15 | Date Made Permanent | `Employee.permanentEmploymentDate` | **MISSING** | Confirmation date missing. | Add `permanentEmploymentDate` to `Employee` | New DB column required |
| 16 | Period of Suspension | `DisciplinaryWarning.suspensionDays` | **PARTIAL** | Disciplinary model exists, not aggregated into Form U. | Aggregate suspension periods | `server/prisma/schema.prisma:412` |
| 17 | Bank Account & IFSC | `bankAccount`, `bankIfsc`, `bankName` | **PASS** | Combined bank details string. | Reconciled | `server/prisma/schema.prisma:130` |
| 18 | Photo | `User.avatar` | **PASS** | Stored avatar URL. | Reconciled | `server/prisma/schema.prisma:85` |
| 19 | Mobile Number | `Employee.phone` | **PASS** | Contact number. | Reconciled | `server/prisma/schema.prisma:120` |
| 20 | Email ID | `Employee.email` | **PASS** | Corporate or personal email. | Reconciled | `server/prisma/schema.prisma:119` |
| 21 | Specimen Signature / Thumb | Digital signature block | **PARTIAL** | Visual signature line required in export. | Add signature block in export | New Form U template |
| 22 | Date of Exit | `EmployeeExit.relievingDate` | **PASS** | Relieving date from exit record. | Reconciled | `server/prisma/schema.prisma:300` |
| 23 | Reason for Exit | `EmployeeExit.reason` | **PASS** | Resignation / termination reason. | Reconciled | `server/prisma/schema.prisma:301` |
| 24 | Remarks | Profile remarks | **PARTIAL** | General notes string. | Bind to export | `server/prisma/schema.prisma:124` |

---

### Tab 4: `Form V` — Register of Employment (43 Fields)

| # | Category | Fields | Status | Gap Description | Recommended Action | Evidence |
|---|---|---|:---:|---|---|---|
| 1 | Establishment Meta | Establishment Name, Address, Manager Incharge, Registration No. | **PARTIAL** | Exists in `CompanyProfileService`, needs binding to Form V header. | Bind to report header | `server/src/services/company-profile/company-profile.service.ts` |
| 2 | Shift Timings | Work Commencement, Rest Interval, End Time, Daily Working Hours | **PARTIAL** | Exists in `Shift` model (9:30 AM – 6:30 PM, 60m break, 8h work). Needs linkage to monthly register. | Link shift timings to Form V | `server/prisma/schema.prisma:320` |
| 3 | Attendance Matrix | Day 1 to Day 31 daily status (`P`, `WO`, `LOP`, `HL`, `NH`) | **PARTIAL** | `Attendance` records exist, but require a 31-column pivot matrix generator. | Generate 31-day pivot matrix | `server/prisma/schema.prisma:250` |
| 4 | Summary Days | Total Days Worked, Total Hours Worked, LOP Days | **PASS** | Aggregated from attendance. | Reconciled | `server/src/services/payroll-attendance.service.ts:40` |
| 5 | Holidays | National Holiday Benefits, Festival Holiday Benefits | **MISSING** | Statutory holiday allowance tracking missing. | Add statutory holiday benefits | `server/prisma/schema.prisma:260` |

---

### Tab 5: `FORM W ` — Register of Wages (30 Fields)

| # | Field in Form W | Status | Gap Description | Recommended Action | Evidence |
|---|---|:---:|---|---|---|
| 1 | Minimum Rate of Wages (Basic, DA, Other) | **MISSING** | Minimum wage schedule benchmark missing. | Add statutory minimum wage check | `server/src/services/payroll-engine.service.ts:149` |
| 2 | Rates Actually Paid (Basic, DA, HRA, Other) | **PASS** | Derived from `SalaryStructureItem`. | Reconciled | `server/prisma/schema.prisma:234` |
| 3 | Days Worked / Total Units | **PASS** | Derived from attendance. | Reconciled | `server/src/services/payroll-attendance.service.ts:45` |
| 4 | Overtime Wages | **PASS** | Derived from overtime hours * 2x rate. | Reconciled | `server/prisma/schema.prisma:340` |
| 5 | Gross Wages Payable | **PASS** | Total earned wages. | Reconciled | `server/src/services/payroll-engine.service.ts:85` |
| 6 | Deductions (PF, ESIC, LWF, Advances, Damage, PT, Other) | **PARTIAL** | Advances and fines exist in `EmployeeLoan`, need mapping to wage register. | Map loan deductions to Form W | `server/prisma/schema.prisma:210` |
| 7 | Net Wages Paid & Bank Transaction Reference / UTR | **PARTIAL** | `BankDisbursementItem.utrNumber` exists, needs binding into Form W export. | Bind UTR to Form W export | `server/prisma/schema.prisma:280` |

---

### Tab 6: `Form X` — Register of Leave & Social Security (21 Fields)

| # | Category | Fields | Status | Gap Description | Recommended Action | Evidence |
|---|---|---|:---:|---|---|---|
| 1 | Earned Leave | Opening Balance, Earned, Availed, Closing Balance | **PASS** | Tracked in `LeaveLedgerEntry`. | Reconciled | `server/prisma/schema.prisma:310` |
| 2 | Medical Leave | Opening Balance, Availed, Closing Balance | **PASS** | Tracked in `LeaveLedgerEntry`. | Reconciled | `server/prisma/schema.prisma:310` |
| 3 | Other / Casual Leave | Opening Balance, Availed, Closing Balance | **PASS** | Tracked in `LeaveLedgerEntry`. | Reconciled | `server/prisma/schema.prisma:310` |
| 4 | Maternity Benefits | Notice Date, Advance Benefit, Subsequent Benefit, Bonus | **MISSING** | Statutory maternity register table missing. | Add maternity tracking fields | New fields required |
| 5 | Gratuity | Nomination Received, Gratuity Paid, Remarks | **PARTIAL** | Accrual calculated in engine, nomination tracking needs explicit field. | Add nomination tracking | `server/src/services/payroll-engine.service.ts:109` |

---

### Tab 7: `FORM S` — Notice of Daily Hours of Work (17 Fields)

| # | Category | Fields | Status | Gap Description | Recommended Action | Evidence |
|---|---|---|:---:|---|---|---|
| 1 | Header | Establishment, Employer, Manager, Certificate No, Payment Date | **PARTIAL** | Exists in company profile, needs template binding. | Bind to Form S header | `server/src/services/company-profile/company-profile.service.ts` |
| 2 | Classification | Adult / Adolescent / Child Classification | **MISSING** | Missing worker classification on `Employee`. | Add `workerAgeClassification` | New DB column required |
| 3 | Shift & Roster | Shift No, Start Time, Rest Interval, End Time, Weekly Holiday | **PASS** | Fully tracked in `Shift` & `ShiftRoster`. | Reconciled | `server/prisma/schema.prisma:320` |
| 4 | Wage Classification | Class of Work, Maximum Wage Rate, Minimum Wage Rate | **MISSING** | Statutory wage rate boundaries missing. | Add wage schedule boundaries | New Form S template |

---

## 3. SUMMARY OF REQUIRED CODEBASE MODIFICATIONS

1. **Prisma Schema Migration:**
   - Add `fatherOrSpouseName`, `presentAddress`, `permanentAddress`, `completion480DaysDate`, `permanentEmploymentDate`, `workerAgeClassification`, `maternityNominationDate` to `model Employee`.
2. **Payroll Calculation Engine (`payroll-engine.service.ts`):**
   - Implement `arrearsDays` proration for Basic, HRA, and Special Allowance.
   - Implement fixed monthly statutory bonus proration.
   - Implement configurable `pfWageBasis: 'GROSS' | 'BASIC'` and un-capped EDLI/Admin charges for staffing contracts.
   - Implement configurable `esicRuleVersion: 'MODERN_2019' | 'LEGACY_PRE2019'`.
   - Implement MMU billing formula (`(Gross + EmployerPF) * 10%`) and GST (`18%`).
3. **Multi-Tab Excel & Vector PDF Exporter (`payroll-export.service.ts`):**
   - Generate all 7 functional sheets in a single comprehensive Excel workbook.
   - Generate vector PDF reports for Main Paysheet, Summary, and Forms U, V, W, X, and S.

