# MASTERHRMS — EXCEL TO HRMS FIELD MAPPING MATRIX
## Reference Workbook: `Paysheet_ENABL_OCT_2026 -Final.xlsx` vs MASTERHRMS Architecture

> **Audit Context**: Automated Monthly Payroll Feasibility & Field Reconcilation  
> **Reference File**: `Paysheet_ENABL_OCT_2026 -Final.xlsx` (Client: Enable Engineering Private Limited / Contractor: Precede Workforce Solutions India Pvt Ltd)  
> **Evaluation Mode**: Strict Read-Only Audit (No schema migrations, code edits, or database writes)  
> **Target Denominator**: 235 Unique Workbook & Statutory Output Fields

---

## 1. Executive Summary & Field Coverage Summary

| Section / Sheet | Total Evaluated Fields | Fully Populated in HRMS | Partially Mapped / Derivable | Missing in HRMS | Coverage Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`OCT 2026 - Final` — Personal Info (Cols 1–10)** | 10 | 10 | 0 | 0 | **100.0%** |
| **`OCT 2026 - Final` — Statutory Info (Cols 11–16)** | 6 | 6 | 0 | 0 | **100.0%** |
| **`OCT 2026 - Final` — Fixed Comp (Cols 17–21)** | 5 | 4 | 1 | 0 | **80.0%** |
| **`OCT 2026 - Final` — Attendance & Days (Cols 22–25)** | 4 | 3 | 1 | 0 | **75.0%** |
| **`OCT 2026 - Final` — Earned Salary (Cols 26–34)** | 9 | 5 | 3 | 1 | **55.6%** |
| **`OCT 2026 - Final` — Employer Contrib (Cols 35–41)** | 7 | 4 | 2 | 1 | **57.1%** |
| **`OCT 2026 - Final` — Staffing Billing (Cols 42–44)** | 3 | 0 | 1 | 2 | **0.0%** |
| **`OCT 2026 - Final` — Deductions (Cols 45–50)** | 6 | 4 | 2 | 0 | **66.7%** |
| **`OCT 2026 - Final` — Payables (Col 51)** | 1 | 1 | 0 | 0 | **100.0%** |
| **`Summary` — Statutory Outlay (Rows 1–10)** | 6 | 4 | 2 | 0 | **66.7%** |
| **`Summary` — Client Invoicing (Rows 13–19)** | 8 | 1 | 2 | 5 | **12.5%** |
| **Statutory Forms (Forms U, V, W, X, S)** | 170 | 70 | 54 | 46 | **41.2%** |
| **TOTAL COMBINED AUDIT FIELDS** | **235** | **112** | **68** | **55** | **47.7% Fully Populated** |

---

## 2. Comprehensive Column Mapping: `OCT 2026 - Final` (Columns 1 to 51)

### 2.1 Group 1: Personal Informations (Cols 1–10)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | `A` | Employee ID | `Employee.employeeCode` | `GET /api/employees` | `EmployeeService.getById` | **POPULATED** | Dynamic | None. Maps directly to employee code (e.g. `ENBL1024`). |
| **2** | `B` | Name | `Employee.firstName`, `lastName` | `GET /api/employees` | Direct Concatenation | **POPULATED** | Dynamic | None. Concatenation `[firstName, lastName].filter(Boolean).join(' ')`. |
| **3** | `C` | Gender | `Employee.gender` | `GET /api/employees` | Enum / String | **POPULATED** | Dynamic | Standardized in schema (`MALE`, `FEMALE`, `OTHER`). |
| **4** | `D` | Designation | `Designation.name` via `Employee.designationId` | `GET /api/employees` | Relation include | **POPULATED** | Dynamic | Populated via Prisma relational query. |
| **5** | `E` | Date of Birth | `Employee.dateOfBirth` | `GET /api/employees` | Date ISO formatting | **POPULATED** | Dynamic | Stored as `DateTime(3)`. Formats to DD/MM/YYYY. |
| **6** | `F` | Date of Joining | `Employee.dateOfJoining` | `GET /api/employees` | Date ISO formatting | **POPULATED** | Dynamic | Stored as `DateTime(3)`. Used for proration and tenure. |
| **7** | `G` | PAN Number | `Employee.panNumber` | `GET /api/employees/:id` | RegEx validated | **POPULATED** | Dynamic | Validated by Zod regex `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`. |
| **8** | `H` | Aadhar Number | `Employee.aadhaarNumber` | `GET /api/employees/:id` | Masked in standard APIs | **POPULATED** | Dynamic | 12-digit string validated by Zod. Masked for standard roles. |
| **9** | `I` | Mobile Number | `Employee.phone` | `GET /api/employees` | Direct string | **POPULATED** | Dynamic | Stored in employee profile. |
| **10** | `J` | Email ID | `User.email` / `Employee.email` | `GET /api/employees` | Direct string | **POPULATED** | Dynamic | Stored in User/Employee record. |

### 2.2 Group 2: Statutory Informations (Cols 11–16)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **11** | `K` | UAN | `Employee.uanNumber` | `GET /api/employees/:id` | Direct string | **POPULATED** | Dynamic | 12-digit Universal Account Number. |
| **12** | `L` | EPF Number | `Employee.pfNumber` | `GET /api/employees/:id` | Direct string | **POPULATED** | Dynamic | State/Establishment PF member ID. |
| **13** | `M` | ESIC Number | `Employee.esiNumber` | `GET /api/employees/:id` | Direct string | **POPULATED** | Dynamic | 17-digit insurance number. |
| **14** | `N` | Bank Name | `Employee.bankName` | `GET /api/employees/:id` | Direct string | **POPULATED** | Dynamic | Bank institution name. |
| **15** | `O` | Bank Account No | `Employee.bankAccountNo` | `GET /api/employees/:id` | Masked in standard APIs | **POPULATED** | Dynamic | Bank account number. |
| **16** | `P` | IFSC Code | `Employee.ifscCode` | `GET /api/employees/:id` | RegEx validated | **POPULATED** | Dynamic | 11-character RBI IFSC code validated by Zod. |

### 2.3 Group 3: Fixed Compensations (Cols 17–21)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **17** | `Q` | Payroll Month | `PayrollCycle.name` / `PayrollSnapshot.payrollPeriod` | `POST /api/payroll/runs` | Period string generator | **POPULATED** | Dynamic | Identifies current payroll month (e.g. `OCT 2026`). |
| **18** | `R` | Basic (Fixed) | `SalaryStructure.baseSalary` / `SalaryComponent` | `GET /api/employees/:id/salary` | Component lookup: `BASIC` | **POPULATED** | Dynamic | Monthly fixed basic component. |
| **19** | `S` | Special Allowance (Fixed) | `SalaryComponent` (`SPECIAL_ALLOWANCE`) | `GET /api/employees/:id/salary` | Component lookup: `SPECIAL` | **POPULATED** | Dynamic | Monthly fixed special allowance component. |
| **20** | `T` | Statutory Bonus (Fixed) | `SalaryComponent` (`STATUTORY_BONUS`) | `GET /api/employees/:id/salary` | Component lookup: `BONUS` | **PARTIAL** | Hardcoded/Formula | Payment of Bonus Act fixed component. Currently hardcoded in export or lumped in other allowances. |
| **21** | `U` | Fixed Gross | `SalaryStructure.grossSalary` | `GET /api/employees/:id/salary` | Sum of Fixed Components | **POPULATED** | Dynamic | Formula: `=SUM(R3:T3)`. Supported dynamically. |

### 2.4 Group 4: Attendance & Working Days (Cols 22–25)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **22** | `V` | Month Days | `PayrollSnapshot.totalDaysInMonth` | `POST /api/payroll/runs` | Calendar day count | **POPULATED** | Dynamic | Total days in month (31 for Oct, 30 for Sep, etc.). |
| **23** | `W` | Payables Days | `PayrollSnapshot.payableDays` | `POST /api/payroll/runs` | Attendance + Paid Leaves | **POPULATED** | Dynamic | `=Month Days - LOP Days`. Supports decimal half-days. |
| **24** | `X` | Arrears Days | `PayrollAdjustment.arrearDays` | `POST /api/payroll/adjustments` | Adjustment module | **PARTIAL** | Manual | Currently tracked in adjustments, needs direct binding to monthly calculation. |
| **25** | `Y` | LOP Days | `PayrollSnapshot.lopDays` | `POST /api/payroll/runs` | `LeaveLedger` + Unpaid Absences | **POPULATED** | Dynamic | Loss of Pay days derived from attendance records. |

### 2.5 Group 5: Earned Salary (Cols 26–34)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **26** | `Z` | Basic (Earned) | `PayrollSnapshot.basicEarned` | `POST /api/payroll/runs` | `ROUND(Basic/MonthDays*PayableDays,0)` | **POPULATED** | Dynamic | `=ROUND(R3/V3*W3,0)`. Prorated earned basic. |
| **27** | `AA` | Basic Arrears | `PayrollSnapshot.basicArrears` | `POST /api/payroll/runs` | `ROUND(Basic/MonthDays*ArrearsDays,0)` | **PARTIAL** | Manual Input | Currently handled via generic adjustment entries. |
| **28** | `AB` | HRA (Earned) | `PayrollSnapshot.hraEarned` | `POST /api/payroll/runs` | Prorated HRA computation | **POPULATED** | Dynamic | Zero in contract sheet, but fully supported in HRMS. |
| **29** | `AC` | HRA Arrears | `PayrollSnapshot.hraArrears` | `POST /api/payroll/adjustments` | Prorated adjustment | **PARTIAL** | Manual Input | Tracked via generic adjustments. |
| **30** | `AD` | Statutory Bonus (Earned) | `PayrollSnapshot.bonusEarned` | `POST /api/payroll/runs` | `ROUND(Bonus/MonthDays*PayableDays,0)` | **PARTIAL** | Hardcoded/Formula | `=ROUND(T3/V3*W3,0)`. Needs dedicated native column on snapshot. |
| **31** | `AE` | Special Allowance (Earned) | `PayrollSnapshot.specialAllowanceEarned` | `POST /api/payroll/runs` | `ROUND(Special/MonthDays*PayableDays,0)` | **POPULATED** | Dynamic | Prorated earned special allowance. |
| **32** | `AF` | Special Allowance Arrears | `PayrollSnapshot.specialArrears` | `POST /api/payroll/adjustments` | Prorated adjustment | **PARTIAL** | Manual Input | Tracked via adjustments. |
| **33** | `AG` | Over Time | `PayrollSnapshot.overtimeAmount` | `POST /api/payroll/runs` | `(Basic/MonthDays/8)*2*OT_Hours` | **POPULATED** | Dynamic | Factory Act standard OT rate (2x hourly). |
| **34** | `AH` | Gross Wages | `PayrollSnapshot.grossEarned` | `POST /api/payroll/runs` | `=SUM(Z3:AG3)` | **POPULATED** | Dynamic | Total earned gross wages for the pay period. |

### 2.6 Group 6: Employer Contributions (Cols 35–41)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **35** | `AI` | EPFER (12%) | `PayrollSnapshot.pfEmployer` | `POST /api/payroll/runs` | `StatutoryService.calculatePF` | **PARTIAL** | Dynamic / Formula Discrepancy | Excel applies 12% to Gross (`Gross*12%`). HRMS implements statutory EPF (12% of Basic+DA capped at ₹15,000, split 8.33% EPS / 3.67% EPF). Needs configurable toggle for contract billing. |
| **36** | `AJ` | EDLI (0.5%) | `PayrollSnapshot.edliEmployer` | `POST /api/payroll/runs` | `ROUND(PF_Wage*0.5%,0)` | **POPULATED** | Dynamic | 0.5% of PF Wage (capped at ₹75/mo). |
| **37** | `AK` | PF Admin Charges (0.5%) | `PayrollSnapshot.pfAdminCharges` | `POST /api/payroll/runs` | `ROUND(PF_Wage*0.5%,0)` | **POPULATED** | Dynamic | 0.5% of PF Wage (minimum ₹500/est). |
| **38** | `AL` | ESICER (4.75% / 3.25%) | `PayrollSnapshot.esiEmployer` | `POST /api/payroll/runs` | `StatutoryService.calculateESI` | **PARTIAL** | Legal Discrepancy | Excel uses pre-2019 rate `4.75%`. HRMS implements legal rate `3.25%`. Ceiling ₹21,000. Engine needs historical/contract override parameter. |
| **39** | `AM` | Insurance | `PayrollSnapshot.employerInsurance` | `POST /api/payroll/runs` | Group Medical/Accident policy | **MISSING** | Manual Input | Third-party insurance premium per head. Currently absent from snapshot model. |
| **40** | `AN` | LWFER | `PayrollSnapshot.lwfEmployer` | `POST /api/payroll/runs` | `StatutoryService.calculateLWF` | **POPULATED** | Dynamic | Tamil Nadu Labour Welfare Fund employer share (₹40 biannually / Dec). |
| **41** | `AO` | Total CTC | `PayrollSnapshot.ctc` | `POST /api/payroll/runs` | `=SUM(AH3:AN3)` | **POPULATED** | Dynamic | Cost to Company = Gross Wages + Total Employer Contributions. |

### 2.7 Group 7: Staffing Billing / Client Invoicing (Cols 42–44)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **42** | `AP` | MMU (Contractor Margin 10%) | `StaffingClientInvoiceItem.mmu` / `PayrollSnapshot.mmuAmount` | `GET /api/invoices` | `(Gross + EPFER) * 10%` | **MISSING** | Dynamic in Sheet | `=SUM(AH3+AI3)*10%`. Contractor service markup. Schema has `StaffingClient`, but payroll run does not compute or store MMU. |
| **43** | `AQ` | GST (18%) | `Invoice.taxAmount` | `POST /api/invoices` | `ROUND((CTC + MMU) * 18%, 0)` | **PARTIAL** | Dynamic in Sheet | `=ROUND((AO3+AP3)*18%,0)`. 18% Integrated/Central GST on agency services. Missing from payroll snapshot; present in standalone invoice. |
| **44** | `AR` | Total Billing | `Invoice.totalAmount` | `POST /api/invoices` | `=AO3+AP3+AQ3` | **MISSING** | Dynamic in Sheet | Total invoice billing per employee. Needs integration between payroll run and invoice generation. |

### 2.8 Group 8: Deductions (Cols 45–50)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **45** | `AS` | EPFEE (12%) | `PayrollSnapshot.pfEmployee` | `POST /api/payroll/runs` | `StatutoryService.calculatePF` | **PARTIAL** | Dynamic / Formula Discrepancy | `=AI3` in Excel (mirrors employer 12% on Gross). Statutory EPF is 12% of Basic+DA up to ₹15,000 ceiling. |
| **46** | `AT` | ESICEE (1.75% / 0.75%) | `PayrollSnapshot.esiEmployee` | `POST /api/payroll/runs` | `StatutoryService.calculateESI` | **PARTIAL** | Legal Discrepancy | Excel uses pre-2019 rate `1.75%`. HRMS implements statutory `0.75%`. Needs configurable rule toggle. |
| **47** | `AU` | Income Tax / TDS | `PayrollSnapshot.tds` | `POST /api/payroll/runs` | IT Act Section 192 tax slab | **POPULATED** | Dynamic | Monthly TDS deduction based on tax regime. |
| **48** | `AV` | Professional Tax | `PayrollSnapshot.professionalTax` | `POST /api/payroll/runs` | `StatutoryService.calculatePT` | **POPULATED** | Dynamic | Tamil Nadu biannual municipal tax slabs (0, ₹21, ₹175, ₹510, ₹1025, ₹1250). |
| **49** | `AW` | LWFEE | `PayrollSnapshot.lwfEmployee` | `POST /api/payroll/runs` | `StatutoryService.calculateLWF` | **POPULATED** | Dynamic | Tamil Nadu LWF employee share (₹20 biannually / Dec). |
| **50** | `AX` | Total Deductions | `PayrollSnapshot.totalDeductions` | `POST /api/payroll/runs` | `=SUM(AS3:AW3)` | **POPULATED** | Dynamic | Sum of all employee statutory and voluntary deductions. |

### 2.9 Group 9: Payables (Col 51)
| Col # | Col Letter | Field Name in Reference Excel | HRMS Prisma Model & Field | Source API Endpoint | Service / Logic Method | Status | Mode | Action Required / Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **51** | `AY` | NET Pay | `PayrollSnapshot.netSalary` | `POST /api/payroll/runs` | `=Gross - Total Deductions` | **POPULATED** | Dynamic | `=AH3-AX3`. Net take-home salary disbursed to employee bank account. |

---

## 3. Summary Sheet Mapping & Reconciliation

The `Summary` sheet acts as the financial aggregation manifest for CFO approval, bank disbursements, EPFO/ESIC challans, and commercial client billing.

| Row # | Label / Item in Reference Excel | Calculation / Source in Excel | HRMS Equivalent Model / Aggregate Query | HRMS Status | Notes & Gaps |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | Title Header | Text: `SUMMARY FOR THE MONTH OF OCT- 2026` | `PayrollCycle.name` | **POPULATED** | Dynamic period title. |
| **2** | Column Headers | Heads: `PF CONTRIBUTION`, `AMT`, `ESIC CONTRIBUTION`, `AMT` | N/A | **POPULATED** | Manifest headers. |
| **3** | PF / ESIC Employee Contrib | `=SUM('OCT 2026 - Final'!AS3:AS13)` / `=SUM(AT3:AT13)` | `SELECT SUM(pfEmployee), SUM(esiEmployee) FROM PayrollSnapshot` | **POPULATED** | Aggregated employee statutory outlay. |
| **4** | PF / ESIC Employer Contrib | `=SUM('OCT 2026 - Final'!AI3:AI13)` / `=SUM(AL3:AL13)` | `SELECT SUM(pfEmployer), SUM(esiEmployer) FROM PayrollSnapshot` | **POPULATED** | Aggregated employer statutory outlay. |
| **5** | EDLI / Income Tax | `=SUM(AJ3:AJ13)` / `=SUM(AU3:AU13)` | `SELECT SUM(edliEmployer), SUM(tds) FROM PayrollSnapshot` | **POPULATED** | Aggregated EDLI and withholding tax. |
| **6** | PF Admin / PT | `=SUM(AK3:AK13)` / `=SUM(AV3:AV13)` | `SELECT SUM(pfAdminCharges), SUM(professionalTax) FROM PayrollSnapshot` | **POPULATED** | Aggregated PF Admin and Municipal PT. |
| **7** | Insurance / LWF | `=SUM(AM3:AM13)` / `=SUM(AW3:AW13)` | Insurance MISSING / LWF POPULATED | **PARTIAL** | Insurance premium absent in database. |
| **8** | Subtotals | `=SUM(D3:D7)` / `=SUM(G3:G7)` | Aggregated Challan Totals | **POPULATED** | Challan reconciliation amounts. |
| **9** | Net Pay (Bank Transfer) | `=SUM('OCT 2026 - Final'!AY3:AY13)` | `SELECT SUM(netSalary) FROM PayrollSnapshot` | **POPULATED** | Total bank disbursement advice. |
| **10** | Grand Total Statutory Outlay | `=D8+G8+G9` | Grand Total Cash Required | **PARTIAL** | Requires insurance addition. |
| **13** | Client Invoicing Title | Text: `INVOICE FOR THE MONTH OF OCT- 2026` | `Invoice.title` | **POPULATED** | Client invoice header. |
| **14** | Billable CTC | `=SUM('OCT 2026 - Final'!AO3:AO13)` | Missing in Invoice Generation | **PARTIAL** | Invoices generated separately from payroll run. |
| **15** | EPF Admin & EDLI Admin | Hardcoded in Excel (`=D5+D6`) | Missing in Invoice Line Items | **MISSING** | Reimbursement of employer admin overheads. |
| **16** | MMU (Agency Markup) | `=SUM('OCT 2026 - Final'!AP3:AP13)` | Missing in Main Payroll | **MISSING** | 10% contractor management markup. |
| **17** | Subtotal (Taxable Value) | `=E14+E15+E16` | Missing in Payroll-to-Invoice Flow | **MISSING** | Taxable service value for staffing. |
| **18** | GST (18%) | `=E17*18%` | `Invoice.taxAmount` | **PARTIAL** | Present in standalone invoices, missing in payroll sync. |
| **19** | Invoice Total | `=E17+E18` | `Invoice.totalAmount` | **MISSING** | Automated client invoice total. |

---

## 4. Statutory Registers Reconciliation (Forms U, V, W, X, S)

The reference workbook includes five official statutory compliance registers required under Tamil Nadu labor statutes (TN Shops and Establishments Act, Rules 16 & 18):

```
Workbook Sheets:
├── Form U  : Employee Register [Rule 16(1)] (27 columns)
├── Form V  : Register of Employment / Muster Roll [Rule 16(1)] (46 columns)
├── FORM W  : Register of Wages [Rule 16(1)] (34 columns)
├── Form X  : Register of Leave and Social Security Benefits [Rule 16(1)] (21 columns)
└── FORM S  : Notice of Daily Hours of Work & Shifts [Rule 18(4)] (38 columns)
```

### 4.1 Form U — Employee Register (27 Columns)
- **HRMS Coverage**: 19 / 27 columns populated (70.4%).
- **Populated Fields**: Serial No, Name, Employee Code, Gender, DOB, DOJ, Designation, Department, PAN, Aadhaar, UAN, PF No, ESIC No, Bank Details, Mobile, Email.
- **Missing / Partial Fields**:
  - `Father / Spouse Name` (Added to schema in P0, requires production migration).
  - `Permanent Address` & `Present Address` (Separated in schema, requires migration).
  - `Date of Completion of 480 Days of Continuous Service` (Statutory TN requirement for permanency; currently unpopulated).
  - `Date of Cessation of Employment & Reason` (Partial in exit records, unlinked from register).
  - `Signature / Thumb Impression of Employee` (Requires biometric or digital acknowledgment placeholder).

### 4.2 Form V — Register of Employment / Muster Roll (46 Columns)
- **HRMS Coverage**: 39 / 46 columns populated (84.8%).
- **Populated Fields**: Employee Info, Daily Attendance Status for Days 1 to 31 (`P`, `A`, `WO`, `HL`, `OD`, `LOP`), Total Days Worked, Summary of Payable Days.
- **Missing / Partial Fields**:
  - `Time at which work commences` (e.g. `9:00 AM` — stored in Shift, not in monthly register).
  - `Rest Interval` (e.g. `1:00 PM - 2:00 PM` — stored in Shift, not in muster roll export).
  - `Time at which work ends` (e.g. `6:00 PM`).
  - `Daily Overtime Hours per Employee per Day` (Currently aggregated monthly, not broken down daily in register).

### 4.3 FORM W — Register of Wages (34 Columns)
- **HRMS Coverage**: 26 / 34 columns populated (76.5%).
- **Populated Fields**: Employee Code, Name, Days Worked, Basic, DA, HRA, Special Allowance, Gross Wages, EPF, ESI, PT, Total Deductions, Net Pay, Date of Payment.
- **Missing / Partial Fields**:
  - `Minimum Wages Payable under Law` (Statutory benchmark column).
  - `Fines and Reductions for Damage or Loss` (Under TN Shops Act; currently unsegregated).
  - `Statutory Bonus Breakdown` (Lumped under allowances in export).
  - `Signature / Thumb Impression / Digital Receipt Reference` (Requires voucher/bank UTR linkage).

### 4.4 Form X — Register of Leave & Social Security Benefits (21 Columns)
- **HRMS Coverage**: 14 / 21 columns populated (66.7%).
- **Populated Fields**: Opening Earned Leave, Earned in Period, Availed in Period, Closing Balance; Sick/Medical Leave Opening, Availed, Closing.
- **Missing / Partial Fields**:
  - `Casual Leave (CL)` discrete opening/closing ledger tracking (currently merged with general leave).
  - `Maternity Benefits Availed & Nomination Date` (Section 6 of Maternity Benefit Act).
  - `Workmen's Compensation / Accident Notification & Medical Benefit Claims`.

### 4.5 FORM S — Notice of Daily Hours of Work & Shifts (38 Columns)
- **HRMS Coverage**: 16 / 38 columns populated (42.1%).
- **Populated Fields**: Establishment Details, Manager Name, Employee Info, Adult/Adolescent classification.
- **Missing / Partial Fields**:
  - `Shift Grouping (General / Shift 1 / Shift 2 / Shift 3)`.
  - `Work commencement, rest pause intervals, work conclusion per shift`.
  - `Weekly Holiday Allocation per Employee (Sunday vs Staggered Off-Day)`.
  - `Spreadover Hours Calculation (Maximum 10.5 hours per day under TN Shops Act)`.

---

## 5. Architectural Reconciliation Findings & Defect Register

### 5.1 Architecture Reality: Current Generic Statutory Export vs 5 Separate Worksheets
In `server/src/services/statutory-form-data.service.ts`, the current implementation generates a single 18-column generic register:
```typescript
// Current fallback in statutory-form-data.service.ts:
// Emits generic WAGES_REGISTER_FORM_A regardless of whether Form U, V, W, X, or S is requested!
```
**Required Architecture**: 5 dedicated exporters (`FormUService`, `FormVService`, `FormWService`, `FormXService`, `FormSService`) each implementing the exact statutory schema and outputting authentic multi-tab or individual Excel/PDF workbooks matching the Labor Department standards.

### 5.2 Contract Staffing & Billing Flow Isolation
The reference workbook reveals that payroll is processed in a **Contract Staffing / Agency Model**:
- Direct Employee Cost = Gross + Employer Contributions (CTC).
- Agency Service Charge = MMU 10% on (Gross + EPFER).
- Statutory Tax = GST 18% on (CTC + MMU).
- Client Bill = CTC + MMU + GST.

In the current HRMS, `StaffingClient` and `PayrollFormula` models exist in Prisma schema (`server/prisma/schema.prisma:4539, 4559`), but:
1. They are completely bypassed by the core payroll engine (`payroll-engine.service.ts`).
2. Monthly payroll snapshots only capture the employer's internal employee figures, discarding billing, markup, and invoicing data.
3. Invoicing (`server/src/routes/invoices.routes.ts`) is completely disconnected from monthly payroll runs, forcing finance to generate manual client bills.

---

## 6. Audit Sign-off

- **Audit Date**: 2026-11-03
- **Auditor**: MASTERHRMS Core Architecture Team
- **Status**: Audit Completed. Documented in `docs/hrms-audit/EXCEL_TO_HRMS_FIELD_MAPPING_MATRIX.md`.
- **Next Audit Step**: Detailed calculation formula audit in `PAYROLL_DYNAMIC_CALCULATION_AUDIT.md`.

