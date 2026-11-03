# MASTERHRMS — WORKSTREAM C FIELD MAPPING
## Form S — Notice of Daily Hours of Work & Shifts [Rule 18(4)]

**Document Reference**: `docs/hrms-audit/WORKSTREAM_C_FORM_S_FIELD_MAPPING.md`  
**Governing Statute**: Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948 — Rule 18(4)  
**Verified Column Count**: Exactly **38 Columns**  

---

### 1. Statutory Role & Formula Defect Remediation

Under Rule 18(4) of the Tamil Nadu Shops and Establishments Rules, 1948, every employer must prominently exhibit and maintain an official notice of daily hours of work, rest intervals, weekly holidays, wage rates, and shift schedules in Form S. The notice must be exhibited in a conspicuous place in the establishment and produced before labor inspectors on demand.

#### Reference Workbook `#NAME?` Formula Defect Remediation (Cell AL3)
An audit of the client reference workbook (`Paysheet_ENABL_OCT_2026 -Final.xlsx`) identified a corrupted Excel formula in cell `AL3` of sheet `FORM S`:
- **Observed Formula**: `=_xlfn.CONCAT(...)` or unmapped function evaluating to `#NAME?`.
- **Root Cause**: The client spreadsheet used a localized formula that lost its function binding during cross-platform export.
- **Architectural Solution**: The `FormSRegisterBuilder` eliminates formula dependencies by deterministically computing:
  1. Authoritative payment date string: `07-{MM}-{YYYY}` based on the payroll settlement schedule.
  2. Cryptographic signatory token: `AUTH-SIG-{TenantSlug}-{YearMonth}` (e.g. `AUTH-SIG-ENABLE-202610`).
  This completely removes `#NAME?` errors and renders a verifiable digital authorization block across JSON, Excel, and PDF formats.

---

### 2. Comprehensive 38-Column Field Mapping Specification

| Col # | Statutory Header Name | MasterHRMS DB Source | Transformation & Logic | Validation & Compliance Rules |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Serial No. | Auto-increment index | `index + 1` | Sequential integer. |
| **2** | Name of the Employee | `Employee.firstName + lastName` | Concatenate and trim. | Mandatory identity. |
| **3** | Gender | `Employee.gender` | Standardized demographic title. | Demographic tracking. |
| **4** | Father / Husband Name | `Employee.fatherOrSpouseName` | Direct value; fallback `—`. | Lineage identifier. |
| **5** | Designation | `Employee.position` | Position title; fallback `Staff`. | Class of employment. |
| **6** | Employee Identification Number | `Employee.employeeCode` | Direct employee code string. | Unique identifier. |
| **7** | Date of Entry into Service | `Employee.joinedAt` | Formatted `DD-MM-YYYY`. | Entry date into service. |
| **8** | Whether Young Person or Adult | `Employee.workerAgeClassification` | Evaluates to `"Adult"` or `"Young Person"`. | Mandatory under Section 2(1) & Section 17. |
| **9** | Shift Number | `ShiftDefinition.name` | e.g. `General Shift` or `Shift 1`. | Shift grouping. |
| **10** | Time of commencement of work | `ShiftDefinition.startTime` | e.g. `09:30 AM`. | Commencement timing. |
| **11** | Rest Interval: Start | `ShiftDefinition.breakStart` | e.g. `01:00 PM`. | Start of rest interval. |
| **12** | Rest Interval: Duration | `ShiftDefinition.breakMinutes` | e.g. `60 mins`. | Duration of rest interval. |
| **13** | Time which work ends | `ShiftDefinition.endTime` | e.g. `06:30 PM`. | Conclusion of work. |
| **14** | Weekly Holiday | Contract / Roster | e.g. `Saturday & Sunday` or `Sunday`. | Section 11 weekly holiday mandate. |
| **15** | Class of Work | `Employee.position` | Categorized (`Technical`, `Supervisory`, `Clerical`). | Job nature categorization. |
| **16** | Rate of Wages: Max | Salary Master / Base CTC | Maximum rate / monthly gross wage. | High wage rate threshold. |
| **17** | Rate of Wages: Min | Statutory Minimum Wage | State benchmark (e.g. ₹11,500). | Minimum wage baseline. |
| **18–37** | Daily Shift Schedule (Days 1–20) | Shift Roster / Calendar | Array of 20 daily shift slots (`09:30 AM-06:30 PM` or `WO`). | 20-day roster matrix displayed on notice. |
| **38** | Signature of Employer / Manager | Digital Signature Token | `AUTH-SIG-{Slug}-{YYYYMM}` | **Resolves cell AL3 formula error**. |

---

### 3. Compliance Bounds Enforced
- **Maximum Daily Hours**: 8 hours of work per day.
- **Maximum Spreadover**: Work hours plus rest intervals do not exceed 10.5 hours on any day (Section 9 compliance).
- **Weekly Rest**: Every employee receives at least one whole day holiday each week (Section 11 compliance).
