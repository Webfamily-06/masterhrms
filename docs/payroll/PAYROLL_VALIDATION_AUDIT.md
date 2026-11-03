# MASTERHRMS — PAYROLL & STATUTORY VALIDATION AUDIT

**Date:** November 3, 2026  
**Target:** MasterHRMS Frontend, Backend APIs, Engine & Database Layers  
**Status:** VALIDATION SPECIFICATION COMPLETE

---

## 1. EMPLOYEE DEMOGRAPHIC & IDENTIFIER VALIDATION

| Field | Validation Rule | Pattern / Constraint | Layer Enforced | Masking / Security |
|---|---|---|:---:|:---:|
| **Employee ID** | Mandatory, unique per tenant, 1–50 alphanumeric chars. | `^[A-Za-z0-9_-]{1,50}$` | DB Unique Index, API Validator, UI Form | Plaintext in app; never logged with credentials. |
| **First & Last Name** | Mandatory first name (1–100 chars); trimmed. | `^[A-Za-z\s.'-]{1,100}$` | UI, API | Public identifier. |
| **Gender** | Controlled enum. | `Male`, `Female`, `Other` | UI Dropdown, API Enum | Stored standard enum. |
| **PAN Number** | 10-character standard Indian Income Tax PAN. | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` | UI Regex, API Validator | **Masked in logs:** `XXXXX1234X`. |
| **Aadhaar Number** | Exactly 12 numeric digits (Verhoeff checksum recommended). | `^[0-9]{12}$` | UI Regex, API Validator | **Masked in logs:** `XXXXXXXX1234`. |
| **UAN Number** | Exactly 12 numeric digits (EPFO issued). | `^[0-9]{12}$` | UI Regex, API Validator | Masked in public logs. |
| **EPF Account No** | Regional office code + establishment + extension + member ID. | `^[A-Z]{2}[A-Z]{3}[0-9]{7}[0-9]{3}[0-9]{7}$` or flexible alphanumeric | UI, API | Stored in DB. |
| **ESIC Number** | 17-digit numeric code or explicitly `'Not Eligible'`. | `^[0-9]{17}$` or `'Not Eligible'` | UI, API | Stored in DB. |
| **Bank Account No** | 9 to 18 alphanumeric characters. | `^[0-9A-Za-z]{9,18}$` | UI, API | **Masked:** `XXXXXX5606`. |
| **IFSC Code** | 11 characters: 4 letters, '0', 6 alphanumeric. | `^[A-Z]{4}0[A-Z0-9]{6}$` | UI Regex, API Validator | Public banking code. |
| **DOB vs DOJ** | Date of Birth must be $\ge 18$ years before Date of Joining. | `DOB + 18y <= DOJ` | API Business Validator, UI | Validated on employee creation. |
| **Exit Date** | Date of Exit / Relieving must be on or after Date of Joining. | `ExitDate >= DOJ` | API Validator, UI | Enforced in `EmployeeExit` service. |

---

## 2. PAYROLL & ATTENDANCE TRANSACTIONAL VALIDATIONS

| Rule / Field | Validation Constraint | Error Behavior | Layer |
|---|---|---|:---:|
| **Payroll Month / Year** | Month 1–12, Year 2020–2050. | Reject with `400 Bad Request` | API, UI |
| **Duplicate Payroll Run** | Exactly one `PayrollRun` per tenant, branch, month, year. | Fails closed with `409 Conflict: Payroll already processed for period.` | DB Unique Constraint, Service Check |
| **Month Days** | Must equal calendar days of selected month (`new Date(y, m, 0).getDate()`). | Auto-set based on calendar; rejects invalid counts. | Backend Service |
| **Payable Days** | $0 \le \text{PayableDays} \le \text{MonthDays}$. | Rejects negative or excess days. | API Validator |
| **LOP Days** | $\text{LOPDays} = \text{MonthDays} - \text{PayableDays}$. | Cross-verified: must equal unpaid absence days. | Backend Service |
| **Arrears Days** | $0 \le \text{ArrearsDays} \le 60$. | Rejects negative numbers. | API Validator |
| **Basic Salary** | Must be positive decimal $\ge 0$. | Rejects negative wage inputs. | API Validator |
| **Gross Reconciliation** | $\text{Gross} = \text{Basic} + \text{HRA} + \text{Bonus} + \text{Special} + \text{Arrears} + \text{OT}$. | Re-calculated server-side; ignores client gross. | Engine Service |
| **Deduction Reconcile** | $\text{TotalDeductions} = \text{EPF} + \text{ESIC} + \text{PT} + \text{TDS} + \text{LWF}$. | Verified before persisting payslip. | Engine Service |
| **Net Pay Reconciliation**| $\text{NetPay} = \text{Gross} - \text{TotalDeductions}$. | Net salary can never exceed Gross. | Engine Service |
| **Negative Net Pay** | If $\text{TotalDeductions} > \text{Gross}$, flags warning & caps deductions. | Prevents negative disbursement. | Engine Service |
| **Employer Cost Leakage**| Employer PF, EDLI, Admin, Employer ESIC must NOT be deducted from Net. | Strict audit rule: Employer costs added to CTC, never to deductions. | Engine Service |

---

## 3. STATUTORY REGISTER VALIDATIONS (FORMS U, V, W, X, S)

1. **Daily Attendance Status Codes (Form V):**
   - Must strictly belong to configured vocabulary: `P` (Present), `WO` (Weekly Off), `LOP` (Loss of Pay), `HL` (Half Day), `NH` (National Holiday), `FH` (Festival Holiday), `EL` (Earned Leave), `ML` (Medical Leave).
2. **Daily Working Hours (Form V & S):**
   - Shift duration must satisfy Factories Act / Shops & Establishments Act:
     - Normal hours $\le 8$ hours/day (or 9 hours/day).
     - Rest interval $\ge 30$ minutes (or 60 minutes) after 5 hours continuous work.
     - Total spread-over $\le 10.5$ hours.
3. **Leave Balance Reconciliation (Form X):**
   - $\text{Closing Balance} = \text{Opening Balance} + \text{Earned} - \text{Availed}$.
   - Negative leave balance disallowed unless advance leave policy is explicitly enabled for the tenant.
4. **480 Days Permanency Validation (Form U):**
   - `completion480DaysDate` must be verified against actual attendance ledger ($\ge 480$ worked days within 24 calendar months).

---

## 4. TENANT ISOLATION & AUDIT INTEGRITY

- Every query for employee profile, attendance, salary assignment, and payroll run is filtered strictly by `tenantId`.
- No cross-tenant access allowed on export endpoints (`/api/payroll/runs/:id/export/*`).
- All manual modifications to employee salary items or arrears generate an audit log record with user timestamp, IP, and previous vs new value.

