# MASTERHRMS — WORKSTREAM C FIELD MAPPING
## Form V — Register of Employment / Muster Roll [Rule 16(1)]

**Document Reference**: `docs/hrms-audit/WORKSTREAM_C_FORM_V_FIELD_MAPPING.md`  
**Governing Statute**: Tamil Nadu Shops and Establishments Act, 1947 & Rules, 1948 — Rule 16(1)  
**Verified Column Count**: Exactly **46 Columns**  

---

### 1. Statutory Role & Architecture

Form V serves as the official legal muster roll and register of daily employment. Under Rule 16(1), the register must record the daily hours of work, commencement and cessation timings, intervals for rest, and exact daily presence/absence status for each calendar day of the month (Days 1 to 31).

The automated `FormVRegisterBuilder` retrieves daily biometric attendance logs, shift definitions, and frozen payroll attendance records to construct the complete 31-day punch array and calculate total days worked and overtime hours.

---

### 2. Comprehensive 46-Column Field Mapping Specification

| Col # | Statutory Header Name | MasterHRMS DB Source | Transformation & Logic | Validation & Compliance Rules |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Serial Number | Auto-increment index | `index + 1` | Sequential integer. |
| **2** | Name of the person employed | `Employee.firstName + lastName` | Concatenate and trim. | Mandatory identity field. |
| **3** | Gender | `Employee.gender` | Standardized demographic title. | Demographic tracking. |
| **4** | Time at which work commences | `ShiftDefinition.startTime` | e.g. `09:30 AM` | Shift schedule start time. |
| **5** | Rest Interval | `ShiftDefinition.breakMinutes` | e.g. `60 mins (01:00 PM - 02:00 PM)` | Mandatory rest interval under Section 9. |
| **6** | Time at which work ends | `ShiftDefinition.endTime` | e.g. `06:30 PM` | Shift schedule conclusion time. |
| **7** | Day 1 | `Attendance` (Day 1) | Attendance status code (`P`, `A`, `WO`, `HD`, etc.) | Validated against statutory status codes. |
| **8** | Day 2 | `Attendance` (Day 2) | Attendance status code | Validated against statutory status codes. |
| **...** | **...** | **...** | **...** | **...** |
| **36** | Day 30 | `Attendance` (Day 30) | Attendance status code | Validated against statutory status codes. |
| **37** | Day 31 | `Attendance` (Day 31) | Attendance status code or `N/A` (in <31 day months). | Handled safely for 28/29/30 day months. |
| **38** | Total Number of Days Worked | Aggregate attendance count | Sum of `P` + `HL` + `WO` + `OD` + (0.5 * `HD`). | Reconciles against `PayrollSnapshot.payableDays`. |
| **39** | Normal Working Hours | Legal standard | 8 hours per normal shift. | Daily maximum under Section 7. |
| **40** | Overtime Hours during Month | `Attendance.overtimeMinutes` | Sum of monthly overtime hours / 60. | Reconciles against payroll overtime wages. |
| **41** | Extent of Overtime during Month | Aggregated overtime | Formatted as `{hours} hrs`. | Maximum overtime compliance check (54 hrs/quarter). |
| **42** | Date of Compensatory Holiday | `Attendance` (Comp-Off) | Date granted or `N/A`. | Required when weekly holiday worked. |
| **43** | Number of Compensatory Holidays Due | Leave ledger / Comp-off | Count of unredeemed comp-off days. | Statutory compensatory entitlement. |
| **44** | Compensatory Holidays Availed | Leave ledger / Comp-off | Count of availed comp-off days. | Tracked in leave ledger. |
| **45** | Date of Notice of Shift Change | `RosterShiftChange.noticeDate` | Date posted on notice board; fallback `—`. | Advance notice under Section 18. |
| **46** | Employer Signature / Seal | Authorized Digital Seal | `SEAL-{RegistrationNumber}-EST` | Digital signatory stamp block. |

---

### 3. Attendance Status Codes Dictionary

| Code | Statutory Meaning | Working Day Weight | Pay Impact |
| :---: | :--- | :---: | :--- |
| **P** | Present | 1.0 | Full day payable. |
| **A** | Absent (Unauthorized) | 0.0 | Loss of Pay (LOP). |
| **HD** | Half Day | 0.5 | 0.5 day payable; 0.5 day LOP. |
| **WO** | Weekly Off (Sunday / Rota Off) | 1.0 | Paid weekly off under Section 11. |
| **HL** | Declared / Statutory Holiday | 1.0 | Paid national / festival holiday. |
| **OD** | On Duty / Client Deputation | 1.0 | Full day payable. |
| **LOP** | Approved Leave Without Pay | 0.0 | Loss of Pay. |
| **N/A** | Calendar day does not exist | 0.0 | Non-existent calendar day (e.g. Day 31 in Feb, Apr, Jun, Sep, Nov). |
