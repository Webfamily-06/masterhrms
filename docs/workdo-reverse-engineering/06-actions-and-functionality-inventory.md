# 06. Actions and Functionality Inventory: WorkDo vs MASTERHRMS

This document provides a forensic, cataloged inventory of interactive actions, controls, row-level commands, bulk operations, and modal triggers discovered across the WorkDo HRMS reference application (`https://dash-demo.workdo.io/`).

---

## 1. Action Taxonomy & Interaction Patterns

WorkDo utilizes Inertia.js with Tailwind CSS and Radix UI headless components. The interactive patterns fall into five distinct mechanical classes:

1. **Top Header / Global Actions**: Breadcrumb navigation, global search modal (`Cmd+K`), notification dropdown, workspace/tenant selector, profile/impersonation switcher.
2. **Page-Level Primary Triggers**: Located at the top right of each module view (e.g., `+ Create Employee`, `+ Add Attendance`, `Export`, `Import`, `Filter Toggle`, `View Mode Switcher [List / Grid / Calendar]`).
3. **Table Filter & Search Actions**: Debounced search input (`q`), dropdown filters (Branch, Department, Designation, Status, Date Range), `Clear Filters` reset button.
4. **Row-Level Contextual Actions**: Inline icon button cluster in the rightmost `Action` column:
   - **View / Inspect**: Eye icon (`ri-eye-line`) opening detail view or drawer.
   - **Edit / Update**: Pencil icon (`ri-edit-line`) opening full page or modal form.
   - **Delete**: Trash icon (`ri-delete-bin-line`) opening SweetAlert2 / Radix confirmation modal.
   - **Specialized Row Actions**: Reset Password key, Create User profile toggle, Download PDF payslip, Quick Approval checkmark.
5. **Bulk / Batch Operations**: Multi-select checkbox headers enabling batch delete, mass status updates, or bulk export.

---

## 2. Exhaustive Module Action Inventory

### 2.1 Super Admin Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Dashboard | `View All Orders` | Hyperlink Button | Navigates to `/orders` | Requires `manage-orders` permission |
| Dashboard | `Quick Plan Create` | Action Button | Opens Plan creation modal | Requires `create-plans` |
| Companies (`/companies`) | `+ Create Company` | Primary Button (`bg-primary`) | Opens modal / route to provision tenant | Email unique, workspace slug generated |
| Companies | `Login As Company` | Row Icon (`ri-login-box-line`) | Impersonates tenant admin without password | Sets `impersonate_user_id` session key |
| Companies | `Upgrade / Change Plan`| Row Icon (`ri-trophy-line`) | Opens modal to manually assign subscription | Modifies tenant quota records |
| Companies | `Toggle Status` | Switch Toggle | Activates / suspends tenant workspace | Immediate DB update, invalidates tenant tokens |
| Companies | `Reset Password` | Row Icon (`ri-key-line`) | Opens modal to input new company admin password | Enforces password complexity rules |
| Companies | `Delete Company` | Row Icon (`ri-delete-bin-line`) | Prompts destructive confirmation dialog | Cascades deletion of all tenant data |
| Plans (`/plans`) | `+ Create Plan` | Primary Button | Navigates to plan configuration form | Sets storage limit, employee limit, price |
| Plans | `Toggle Active` | Switch Toggle | Disables plan from public checkout | Existing subscriptions remain active |
| Referral Program | `Copy Referral Link` | Copy Icon Button | Copies referral URL to clipboard | Generates unique affiliate query param |
| System Settings | `Save Brand Settings` | Form Submit Button | Uploads dark/light logos, favicon, title | Validates image dimensions and file types |
| System Settings | `Test Email Connection`| Button | Sends test email via configured SMTP | Returns immediate success/error toast |

---

### 2.2 Company Admin & User Management Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Users (`/users`) | `+ Create User` | Primary Button | Opens modal to create company user | Requires name, email, role assignment |
| Users | `Assign Roles` | Multi-select Dropdown | Assigns Spatie role permissions | Tenant-scoped role enforcement |
| Users | `Login As User` | Row Icon (`ri-user-shared-line`)| Impersonates subordinate user | Logs impersonation trail |
| Users | `Toggle Active` | Switch Toggle | Disables user login access | Terminated sessions immediately cut |
| Roles (`/roles`) | `+ Create Role` | Primary Button | Opens permission matrix assignment modal | Prevents duplicate role names per tenant |
| Roles | `Select All Permissions`| Checkbox Header | Bulk selects all 483 permission toggles | Client-side reactive state update |
| Roles | `Delete Role` | Row Icon | Deletes role if no users are bound to it | Validates zero active assignments |

---

### 2.3 HRM: Employee Management Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Employee List (`/hrm/employees`)| `+ Create Employee` | Primary Button | Navigates to 4-step wizard `/hrm/employees/create` | Requires `create-employee` |
| Employee List | `Export CSV / Excel` | Action Button | Triggers `/hrm/employees/export` streaming download | Respects active search/filter queries |
| Employee List | `Import CSV` | Action Button | Opens file upload modal with template link | Validates headers against schema |
| Employee List | `Filter By Branch` | Select Dropdown | Reactive Inertia reload with `?branch_id=X` | Instant table reload without full refresh |
| Employee List | `Filter By Department`| Select Dropdown | Cascades based on selected Branch | Dynamically updates department options |
| Employee List (Row) | `View Profile` | Row Eye Icon | Navigates to `/hrm/employees/{id}` full profile | Scoped by tenant and permission |
| Employee List (Row) | `Edit Employee` | Row Pencil Icon | Navigates to `/hrm/employees/{id}/edit` wizard | Loads existing records into form fields |
| Employee List (Row) | `Delete Employee` | Row Trash Icon | Prompts SweetAlert confirmation modal | Soft deletes or cascades relations |
| Employee Create Wizard | `Save & Next` | Wizard Navigation | Validates current step before progressing | Client-side and server-side Zod/Inertia validation |
| Employee Profile | `Upload Profile Photo`| Avatar Click | Opens image cropper and uploads asset | Validates PNG/JPG <= 2MB |
| Employee Profile | `Download Document` | Row Download Icon | Streams stored statutory file | Verifies tenant file token |

---

### 2.4 HRM: Attendance Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Attendance List | `+ Add Attendance` | Primary Button | Opens modal to log manual attendance entry | Requires employee, date, clock in, clock out |
| Attendance List | `Bulk Attendance` | Top Button | Opens date-picker modal to mass-mark attendance | Generates present/absent for entire branch |
| Attendance List | `Export Attendance` | Action Button | Downloads attendance audit spreadsheet | Filters by month, year, and branch |
| Attendance List | `Month / Date Filter` | Date Picker Input | Reactive Inertia fetch with `?date=YYYY-MM` | Recalculates total present, late, absent counts |
| Attendance Row | `Edit Punch Time` | Row Pencil Icon | Opens modal to alter clock in / clock out times | Triggers automatic late/overtime recalculation |
| Attendance Row | `Delete Attendance` | Row Trash Icon | Deletes record with confirmation dialog | Recalculates monthly attendance totals |
| ESS Portal (Staff) | `Clock In` | Big Action Button | Captures timestamp and IP address | Disables button until clock-out |
| ESS Portal (Staff) | `Clock Out` | Big Action Button | Computes total work duration and overtime | Records final punch-out timestamp |

---

### 2.5 HRM: Leave Management Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Leave List | `+ Apply Leave` | Primary Button | Opens Leave Application modal | Validates against employee balance |
| Leave List | `View Mode Switcher` | Tab Toggle | Switches between `List View` and `Calendar View`| Calendar maps requests to fullcalendar.js |
| Leave Row (HR/Admin) | `Approve Leave` | Row Checkmark Icon | Updates status to `Approved`, subtracts balance | Sends notification email to employee |
| Leave Row (HR/Admin) | `Reject Leave` | Row Cross Icon | Opens modal requiring rejection reason | Updates status to `Rejected`, restores balance |
| Leave Row | `View Details` | Row Eye Icon | Opens slide-out drawer with reason and dates | Displays audit history |
| Leave Types (`/hrm/leave-types`)| `+ Create Leave Type` | Primary Button | Modal: Title, Days per year, Paid/Unpaid | Tenant-scoped configuration |

---

### 2.6 HRM: Payroll Engine Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Payroll List (`/hrm/payrolls`)| `Generate Payroll` | Primary Button | Opens modal: Month selector, Year selector | Prevents duplicate generation for same period |
| Payroll List | `Export Payroll Summary`| Top Button | Downloads CSV of all payslips for period | Aggregates Gross, Deductions, Net Pay |
| Payroll Row | `View Payslip` | Row Eye Icon | Navigates to `/hrm/payrolls/{id}` payslip view | Formatted printable invoice/payslip card |
| Payroll Row | `Download PDF Payslip`| Row Download Icon | Server generates DomPDF stream | Tenant logo and signature embedded |
| Payroll Row | `Mark as Paid` | Row Checkmark Icon | Sets payment status from `Unpaid` to `Paid` | Records payment timestamp and method |
| Payroll Detail | `Print Payslip` | Print Button | Triggers browser `window.print()` print CSS | Hides sidebar, nav, and action buttons |
| Set Salary (`/hrm/set-salary/{id}`)| `+ Add Allowance` | Accordion Button | Modal: Allowance option, Title, Type (Fixed/%) | Adds recurring allowance line item |
| Set Salary | `+ Add Commission` | Accordion Button | Modal: Title, Type, Amount | Adds recurring commission line item |
| Set Salary | `+ Add Loan` | Accordion Button | Modal: Title, Loan Amount, Monthly Deduction | Tracks remaining balance and deductions |
| Set Salary | `+ Add Saturation Deduction`| Accordion Button | Modal: Title, Type, Fixed/Percentage Amount | Statutory deduction line item |
| Set Salary | `+ Add Other Payment` | Accordion Button | Modal: Title, Amount | Ad-hoc one-time payment line item |
| Set Salary | `+ Add Overtime` | Accordion Button | Modal: Title, Number of Days, Hours, Rate | Computes custom overtime addition |

---

### 2.7 Recruitment (ATS) Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Job Postings | `+ Create Job` | Primary Button | Navigates to job posting creation form | Branches, categories, skills, description |
| Job Postings | `Copy Job Public Link`| Row Share Icon | Copies public application portal URL | Slug-based public application form |
| Job Postings | `Toggle Status` | Status Badge Dropdown | Changes state: Active, Inactive, Completed | Inactive jobs hide from public portal |
| Job Candidates | `+ Create Candidate` | Primary Button | Modal to upload CV and enter candidate info | Validates file format (PDF/DOCX) |
| Job Candidates | `Kanban / List Toggle`| View Switcher | Toggles between Table view and Drag-and-Drop | Stages: Applied, Screening, Interview, Offered |
| Job Candidates (Kanban)| `Drag Candidate Card` | Drag and Drop | Moves candidate to new stage and updates DB | Triggers stage-specific automated email |
| Job Candidate Row | `Schedule Interview` | Row Calendar Icon | Opens modal: Round, Date, Time, Interviewer | Syncs to calendar and sends invites |
| Job Candidate Row | `Generate Offer Letter`| Row File Icon | Generates offer letter from template | Pre-fills salary and joining date |
| Job Candidate Row | `Convert to Employee`| Row User Icon | Opens Employee Create wizard with prefilled data| Seamlessly ports candidate to employee table |

---

### 2.8 Training & Organizational Communications Actions

| Module / View | Action Label | Trigger Element | Behavior / Destination | Security / Validation |
|---|---|---|---|---|
| Training Sessions | `+ Create Training` | Primary Button | Modal: Branch, Trainer, Training Type, Cost | Validates start date <= end date |
| Training Row | `Update Status` | Row Edit Icon | Updates status: Pending, Started, Completed | Records employee completion scores |
| Awards (`/hrm/awards`) | `+ Create Award` | Primary Button | Modal: Employee, Award Type, Date, Gift, Icon | Publishes award to dashboard |
| Announcements (`/hrm/announcements`)| `+ Create Announcement`| Primary Button | Modal: Title, Branch, Department, Notice Date | Broadcasts notification to targeted users |
| Events (`/hrm/events`) | `+ Create Event` | Primary Button | Modal: Title, Start Date, End Date, Color | Syncs with HRM dashboard event calendar |
| Company Policy | `+ Upload Policy` | Primary Button | Modal: Title, Description, File Attachment | Available for all staff download |

---

## 3. Comparison Matrix: Action Support in MASTERHRMS

| Module / Action Category | WorkDo Support | MASTERHRMS Current Status | Gap Severity | Implementation Complexity |
|---|---|---|---|---|
| **Super Admin Tenant Provisioning** | Full modal + validation | Implemented (`/super/tenants`) | None | Completed |
| **Impersonation ("Login As")** | One-click button | Backend API exists, UI button missing | Low | Low (1 API call + cookie set) |
| **Employee Multi-Step Wizard** | 4-step wizard | Single tabbed form (`/employees/new`) | Medium | Medium (Refactor to step wizard) |
| **Employee CSV Import/Export** | Dedicated Excel/CSV streaming | Export partially done, Import missing | High | Medium (PapaParse + bulk Prisma insert) |
| **Attendance Manual Logging** | Modal with instant OT calculation | Modal exists, OT auto-calc missing | High | Medium (Formula engine hook) |
| **Attendance Bulk Marking** | Date + Branch mass punch modal | Missing | High | Low (Prisma `createMany` query) |
| **Leave Approval / Rejection Drawer**| Checkmark / Cross inline + modal | Inline dropdown exists | Low | Low (UI polish) |
| **Interactive Leave Calendar** | FullCalendar view toggle | List view only | Medium | Medium (FullCalendar / TanStack integration) |
| **Interactive Payslip Generation** | One-click modal with auto-rules | Backend calculation exists, UI modal basic | High | High (Incorporate OT & Leave deductions) |
| **Set Salary Breakdown (6 components)**| Individual tabs for Allowances, Loans | Basic salary only | Critical | High (Need sub-tables and forms) |
| **Recruitment ATS Drag & Drop Kanban**| Full Radix/DnD Kanban board | Missing in MASTERHRMS | Critical | High (New ATS module required) |
| **Candidate to Employee Conversion** | One-click conversion button | Missing | High | Medium (Pre-fill new employee form) |
| **Company Announcements Broadcast** | Targeted by Branch/Department | Missing | Medium | Medium (Notification table + modal) |
| **Printable / Downloadable Payslip** | Clean print CSS + PDF download | Basic HTML table | High | Medium (`@react-pdf` or clean `@media print`) |
