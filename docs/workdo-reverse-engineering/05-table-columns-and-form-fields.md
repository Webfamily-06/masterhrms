# 05 — TABLE COLUMNS & FORM FIELDS SPECIFICATION: WORKDO DASH SAAS

**Reference Application**: WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Auditor**: Principal Enterprise Solutions Architect & Reverse Engineering Specialist  
**Evidence Source**: Live DOM Inspections & Inertia Props Payloads (`Hrm/Employees/*`, `Hrm/Payrolls/*`, etc.)  
**Verification Level**: **VERIFIED**

---

## 1. Complete Table Column Specifications

### Table 1: Employees (`/hrm/employees?view=list`)
| Column Order | Column Header | Data Type | Example Value | Sortable | Filterable | Actions / Display Format |
|---|---|---|---|---|---|---|
| 1 | `Employee Id` | String | `EMP20260001` | Yes | Yes (Text) | Blue clickable chip (`text-blue-600 hover:underline`) |
| 2 | `Avtar` | Image URL | `boys1.png` | No | No | 40x40 rounded-lg thumbnail image |
| 3 | `Name` | String | `John Smith` | Yes | Yes (Search)| Bold text, links to profile view |
| 4 | `Branch` | String (FK) | `Main Office` | Yes | Yes (Select)| Plain text |
| 5 | `Department` | String (FK) | `Customer Service` | Yes | Yes (Select)| Plain text |
| 6 | `Designation` | String (FK) | `Senior Administrator`| Yes | Yes (Select)| Plain text |
| 7 | `Employment Type`| Enum | `Part Time` | Yes | Yes (Select)| Badge: `Full Time` (green), `Part Time` (blue), `Contract` (orange) |
| 8 | `Date Of Joining`| Date (ISO) | `2025-06-20` | Yes | Yes (Range) | `YYYY-MM-DD` |
| 9 | `Actions` | Component | — | No | No | Action Group: View (`text-green-600`), Edit (`text-blue-600`), Delete (`text-destructive`) |

---

### Table 2: Attendances Monthly Matrix (`/hrm/attendances`)
| Column Order | Column Header | Data Type | Example Value | Display Format / Behavior |
|---|---|---|---|---|
| 1 | `Employee` | Object | `John Smith` (Senior Administrator) | Two-line cell: Avatar + Name on top, Designation underneath |
| 2..32 | `[Day] [DOW]` (e.g. `1 SUN`, `2 MON`) | Enum / Status | `Present`, `Absent`, `○ Future` | Dot badge or symbol: `Present` (green), `Absent` (red), `½` (yellow), `○` (empty circle) |
| 33 | `Total` | Numeric (Hours)| `0.0 / 112.0` | `ActualHours / ScheduledHours` with progress ratio |

---

### Table 3: Leave Applications (`/hrm/leave-applications/list-view`)
| Column Order | Column Header | Data Type | Example Value | Sortable | Actions / Display Format |
|---|---|---|---|---|---|
| 1 | `Employee` | String | `John Smith` | Yes | Plain text with employee link |
| 2 | `Leave Type` | String (FK) | `Annual Leave` | Yes | Text indicator (`Paid` / `Unpaid` sub-label) |
| 3 | `Start Date` | Date | `2026-09-02` | Yes | `YYYY-MM-DD` |
| 4 | `End Date` | Date | `2026-09-02` | Yes | `YYYY-MM-DD` |
| 5 | `Days` | Integer | `1` | Yes | Numeric pill badge |
| 6 | `Applied On` | Date | `2026-09-09` | Yes | `YYYY-MM-DD` |
| 7 | `Is Paid` | Boolean | `Paid` | Yes | Status pill: `Paid` (emerald), `Unpaid` (rose) |
| 8 | `Status` | Enum | `Approved` | Yes | Pill badge: `Approved` (green), `Pending` (amber), `Rejected` (red) |
| 9 | `Actions` | Component | — | No | Pending rows: Status Action (`lucide-play`), View (`lucide-eye`), Edit, Delete |

---

### Table 4: Manage Payrolls (`/hrm/payrolls`)
| Column Order | Column Header | Data Type | Example Value | Sortable | Actions / Display Format |
|---|---|---|---|---|---|
| 1 | `Title` | String | `July 2026 Payroll` | Yes | Bold text with calendar icon |
| 2 | `Payroll Frequency`| Enum | `Monthly` | Yes | Badge: `Monthly`, `Weekly`, `Bi-Weekly` |
| 3 | `Pay Period Start` | Date | `2026-07-01` | Yes | `YYYY-MM-DD` |
| 4 | `Pay Period End` | Date | `2026-07-31` | Yes | `YYYY-MM-DD` |
| 5 | `Pay Date` | Date | `2026-09-02` | Yes | `YYYY-MM-DD` |
| 6 | `Total Net Pay` | Currency | `655,206.39$` | Yes | Bold formatted currency |
| 7 | `Employee Count` | Integer | `15` | Yes | Numeric chip |
| 8 | `Status` | Enum | `Completed` | Yes | Badge: `Draft` (gray), `Processing` (blue), `Completed` (emerald) |
| 9 | `Payment Status` | Enum | `Unpaid` | Yes | Badge: `Unpaid` (rose), `Partially Paid` (amber), `Paid` (green) |
| 10 | `Actions` | Component | — | No | Pay Batch (`lucide-pen-tool`), Re-calculate (`lucide-play`), View (`lucide-eye`), Delete |

---

### Table 5: Payroll Employee Detail / Payslips (`/hrm/payrolls/:id`)
| Column Order | Column Header | Data Type | Example Value | Format / Note |
|---|---|---|---|---|
| 1 | `Employee` | Object | `John Smith (john.smith@company.com)` | Name + subtext work email |
| 2 | `Basic Salary` | Currency | `41,105.21$` | Formatted basic pay |
| 3 | `Allowances` | Currency | `2,555.26$` | Sum of HRA, Medical, Education allowances |
| 4 | `Manual OT` | Currency | `500.00$` | Overtime logged manually by manager |
| 5 | `Attendance OT`| Currency | `174.09$` | Overtime computed from biometric punches |
| 6 | `Deductions` | Currency | `100.00$` | Fixed & statutory deductions |
| 7 | `Loans` | Currency | `1,822.10$` | Loan monthly installment deductions |
| 8 | `Gross Pay` | Currency | `32,590.21$` | `(Basic + Allowances + OT) - Leave Deductions` |
| 9 | `Net Pay` | Currency | `30,668.11$` | `Gross Pay - Total Deductions` |
| 10 | `Status` | Enum | `Unpaid` | `Unpaid` (rose) / `Paid` (green) |
| 11 | `Actions` | Component | — | Mark Paid (`lucide-check`), Download PDF (`lucide-download`), Breakdown (`lucide-eye`), Delete |

---

## 2. Complete Form Field Specifications

### Form 1: Create Employee Wizard (`/hrm/employees/create`)

#### Step 1: Basic Info
| Field Key | Label | Input Type | Required | Default / Placeholder | Options / Dependent Rules | Validation Rules |
|---|---|---|---|---|---|---|
| `employee_id` | Employee Id | Text | Optional | `EMP20260016` | Auto-generated by backend counter | Unique alphanumeric, max 20 chars |
| `date_of_birth` | Date Of Birth* | Date Picker | Required | Empty | Calendar selector | Must be past date, age >= 18 |
| `gender` | Gender | Radio Group | Optional | `Male` | `Male`, `Female`, `Other` | String in enum |
| `biometric_emp_id`| Biometric Employee Id| Text | Optional | `Enter biometric employee id`| For biometric punch device sync | Alphanumeric, max 30 chars |
| `user_id` | User* | Select | Required | `Select User` | List of unlinked company user accounts (`users`) + `+ Create user` modal | Must reference valid `User.id` |
| `shift` | Shift* | Select | Required | `Select Shift` | List of shifts (`Morning`, `Evening`, `Night`) + `+ Create shift` modal | Must reference valid `Shift.id` |
| `date_of_joining`| Date Of Joining*| Date Picker | Required | Current Date | Calendar selector | Valid date |
| `employment_type`| Employment Type*| Select | Required | `Full Time` | `Full Time`, `Part Time`, `Contract`, `Temporary` | String in enum |
| `branch_id` | Branch* | Select | Required | `Select Branch` | List of active branches (`branches`) + `+ Create branch` modal | Must reference valid `Branch.id` |
| `department_id` | Department* | Dependent Select| Required| `Select Branch first` | Filtered: only departments where `d.branch_id === selectedBranch` | Must reference valid `Department.id` |
| `designation_id`| Designation* | Dependent Select| Required| `Select Department first`| Filtered: only designations where `des.department_id === selectedDept` | Must reference valid `Designation.id` |

#### Step 2: Contact & Banking
| Field Key | Label | Input Type | Required | Default / Placeholder | Validation Rules |
|---|---|---|---|---|---|
| `address_line_1` | Address Line 1* | Text | Required | `Street address, building` | Required, max 255 chars |
| `address_line_2` | Address Line 2 | Text | Optional | `Apartment, suite, unit` | Optional, max 255 chars |
| `city` | City* | Text | Required | `Enter city` | Required, string |
| `state` | State* | Text | Required | `Enter state` | Required, string |
| `country` | Country* | Text | Required | `Enter country` | Required, string |
| `postal_code` | Postal Code* | Text | Required | `Enter postal code` | Required, alphanumeric, max 20 chars |
| `emergency_contact_name` | Name* | Text | Required | `Emergency contact full name`| Required, string |
| `emergency_contact_relationship`| Relationship* | Text | Required | `e.g. Spouse, Parent, Friend`| Required, string |
| `emergency_contact_number`| Phone Number* | Tel | Required | `+1234567890` | E.164 phone format |
| `bank_name` | Bank Name* | Text | Required | `e.g. Chase Bank, HDFC` | Required, string |
| `account_holder_name` | Account Holder Name*| Text | Required | `Full name as in bank passbook`| Required, string |
| `account_number` | Account Number* | Text | Required | `Bank account number` | Required, numeric/alphanumeric, min 8 |
| `bank_identifier_code`| Bank Identifier Code*| Text | Required | `BIC / SWIFT / IFSC` | Required, alphanumeric, 8-11 chars |
| `bank_branch` | Bank Branch* | Text | Required | `Branch name / location` | Required, string |
| `tax_payer_id` | Tax Payer Id | Text | Optional | `SSN / PAN / TIN` | Optional, alphanumeric |

#### Step 3: Hours & Docs
| Field Key | Label | Input Type | Required | Default / Calculation | Validation Rules |
|---|---|---|---|---|---|
| `basic_salary` | Basic Salary* | Numeric (Currency)| Required | `0.00` | Greater than 0 |
| `hours_per_day` | Hours Per Day* | Numeric (Float) | Required | `8.00` | Range 1.00 to 24.00 |
| `days_per_week` | Days Per Week* | Numeric (Float) | Required | `5.00` | Range 1.00 to 7.00 |
| `rate_per_hour` | Rate Per Hour* | Numeric (Float) | Required | Auto: `basic_salary / (hours_per_day * days_per_week * 4)` | Greater than 0 |
| `document_type_id`| Document Type* | Select | Required | `Select document type` | References `DocumentType.id` |
| `document_file` | Document File* | File Dropzone | Required | None | PDF, PNG, JPG, max 5MB |
