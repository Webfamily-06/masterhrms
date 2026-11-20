# 03 — COMPLETE PAGE INVENTORY: WORKDO DASH SAAS

**Reference Application**: WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Auditor**: Principal Enterprise Solutions Architect & Reverse Engineering Specialist  
**Methodology**: Direct navigation, DOM structure analysis, and Inertia component inspection  
**Verification Level**: **VERIFIED**

---

## 1. Inventory Summary

Across all explored roles, **120+ distinct navigable routes** were verified. Below is the forensic inventory of the core workforce and operational screens, cataloged with structural layout and interaction characteristics.

---

## 2. Page-by-Page Forensic Catalog

### 1. Manage Employees (`/hrm/employees`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`
- **Breadcrumb**: `Dashboard > HRM > Employees`
- **Header Actions**:
  - `Toggle Sidebar` button
  - Language selector (`English 🇬🇧`)
  - User profile menu (`Company / company` or `Lisa Brown / hr`)
  - Plus (`+`) button (Create Employee -> navigates to `/hrm/employees/create`)
  - View Switcher: List View (`lucide-list`) vs Grid Card View (`lucide-grid3x3`)
  - Search Input: text search across name, code, department
  - Page Size Dropdown: `10 per page`, `25`, `50`, `100`
  - Filter Drawer Button: opens collapsible filters for Branch, Department, Designation, Employment Type, Gender
- **Main Layout**:
  - **List View**: Dense data table with 9 columns (`Employee Id`, `Avtar`, `Name`, `Branch`, `Department`, `Designation`, `Employment Type`, `Date Of Joining`, `Actions`).
  - **Grid Card View**: Responsive cards displaying photo avatar, Employee Code chip, Branch, Department, Designation, DOB, Date of Joining, and action icons (View Profile, Edit, Delete).
- **Pagination**: Numbered links (`Previous`, `1`, `2`, `Next`) showing `Showing X to Y of Z results`.
- **Empty State**: Centered illustration with "No Employees Found. Click Create to add your first employee."

---

### 2. Employee Details Profile (`/hrm/employees/:id`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`, `staff` (own profile)
- **Breadcrumb**: `Dashboard > HRM > Employees > [Employee Name]`
- **Header Actions**: `Back` button, quick actions drawer.
- **Top Summary Card**: Avatar, Employee Code, Full Name, Work Email, Branch, Department, Designation, Employment Type badge.
- **Tabbed Interface (5 Tabs)**:
  1. `Employee Details`:
     - Section A: `EMPLOYMENT DETAILS` (Employee ID, Employment Type, Date of Joining, DOB, Gender, Shift, Hours/Day, Days/Week, Rate/Hour).
     - Section B: `CONTACT INFORMATION` (Address Line 1 & 2, City, State, Country, Postal Code, Emergency Contact Name, Relationship, Phone).
     - Section C: `EMPLOYEE HISTORY` (Mini-tabs: Awards, Warnings, Transfers, Promotions, Complaints).
     - Section D: `THIS MONTH METRICS` (Working Days, Present, Absent, Late Arrivals, Overtime Hours).
  2. `Banking Information`:
     - Bank Name, Account Holder Name, Account Number, Bank Identifier Code (BIC/IFSC), Bank Branch, Tax Payer ID.
  3. `Payslip`:
     - Historical payslip table (`Month`, `Net Salary`, `Basic Salary`, `Total Earnings`, `Total Deductions`, `Status`, `Action` with PDF Download).
  4. `Attendance`:
     - Monthly attendance breakdown with day-by-day status dots.
  5. `Documents`:
     - Uploaded statutory documents list with download links.

---

### 3. Create Employee Wizard (`/hrm/employees/create`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`
- **Breadcrumb**: `Dashboard > HRM > Employees > Create`
- **Header Actions**: `Back` button, `Cancel` button.
- **Form Layout**: 3-Step Wizard Navigation:
  - **Step 1: Basic Info**:
    - `Employee Id` (auto-generated placeholder e.g. `EMP20260016`).
    - `Date Of Birth*` (date picker).
    - `Gender*` (radio buttons: Male, Female, Other).
    - `Biometric Employee Id` (text input).
    - `User*` (dependent select with inline `+ Create user` modal trigger).
    - `Shift*` (select with inline `+ Create shift` modal trigger).
    - `Date Of Joining*` (date picker).
    - `Employment Type*` (select: Full Time, Part Time, Contract, Temporary).
    - `Branch*` (select with inline `+ Create branch` modal trigger).
    - `Department*` (dependent select filtered by chosen Branch).
    - `Designation*` (dependent select filtered by chosen Department).
  - **Step 2: Contact & Banking**:
    - Address Line 1*, Address Line 2, City*, State*, Country*, Postal Code*.
    - Emergency Contact: Name*, Relationship*, Phone Number*.
    - Banking: Bank Name*, Account Holder Name*, Account Number*, Bank Identifier Code*, Bank Branch*, Tax Payer Id.
  - **Step 3: Hours & Docs**:
    - Basic Salary*, Hours Per Day*, Days Per Week*, Rate Per Hour* (dynamic auto-calculation).
    - Document Type* & Document File* upload dropzone.
- **Controls**: `Previous` button, `Next` button, `Submit` button.

---

### 4. Manage Attendances (`/hrm/attendances`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`
- **Breadcrumb**: `Dashboard > HRM > Attendances`
- **Header Actions**: Search employee, Month selector (e.g. November), Year selector (e.g. 2026), Export CSV button.
- **Layout**: Matrix / Heatmap Grid:
  - **Legend Status Badges**: `Present` (green), `Absent` (red), `½ Half Day` (yellow), `On Leave` (blue), `Holiday` (purple), `Day Off` (gray), `○ Future` (hollow circle), `Pending` (amber), `Late` (orange), `Early` (cyan), `Overtime` (violet).
  - **Grid Table**:
    - First Column: Employee Name, Avatar, Designation.
    - Columns 2 to 32: Days 1 to 31 with Day of Week header (`1 SUN`, `2 MON` ...).
    - Last Column: Total Hours calculated vs Schedule (`0.0 / 112.0`).

---

### 5. Leave Applications (`/hrm/leave-applications`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`, `staff` (own applications)
- **Breadcrumb**: `Dashboard > HRM > Leave Applications`
- **Header Actions**:
  - `+ Apply Leave` button (opens application modal)
  - View Toggle: Calendar View (`fc-calendar`) vs List View (`/hrm/leave-applications/list-view`)
  - Filter Drawer: Date range, Leave Type, Status (Pending, Approved, Rejected)
- **List View Table**:
  - Columns: `Employee`, `Leave Type`, `Start Date`, `End Date`, `Days`, `Applied On`, `Is Paid`, `Status`, `Actions`.
- **Action Triggers on Pending Rows**:
  - `lucide-play` (purple): Opens `Update Leave Status` modal with `Comment` textarea, `Approve` button (green), `Reject` button (red).
  - `lucide-eye` (green): View application justification details.
  - `lucide-square-pen` (blue): Edit date range/reason.
  - `lucide-trash2` (red): Delete record.

---

### 6. Manage Payrolls (`/hrm/payrolls`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`
- **Breadcrumb**: `Dashboard > HRM > Payrolls`
- **Header Actions**: `+ Create Payroll` button, Filter drawer, Month/Year selector.
- **Table Columns**:
  - `Title`, `Payroll Frequency`, `Pay Period Start`, `Pay Period End`, `Pay Date`, `Total Net Pay`, `Employee Count`, `Status`, `Payment Status`, `Actions`.
- **Status Badges**: `Draft` (gray), `Processing` (blue), `Completed` (emerald).
- **Payment Status Badges**: `Unpaid` (rose), `Partially Paid` (amber), `Paid` (green).
- **Row Action Triggers**:
  - `lucide-play` (purple): Run / Re-calculate payroll batch.
  - `lucide-pen-tool` (purple): Process payment / mark batch paid.
  - `lucide-eye` (green): Navigates to `/hrm/payrolls/:id` (Payroll Detail).
  - `lucide-trash2` (red): Delete draft payroll.

---

### 7. Payroll Details & Payslip Matrix (`/hrm/payrolls/:id`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`
- **Breadcrumb**: `Dashboard > HRM > Payrolls > [Batch Title]`
- **Stat Header Cards**:
  - `Employees Count` (e.g. 15)
  - `Gross Pay` (e.g. $770,950.50)
  - `Total Deductions` (e.g. $24,600.54)
  - `Total Net Pay` (e.g. $655,206.39)
- **Payslip Master Table**:
  - Columns: `Employee`, `Basic Salary`, `Allowances`, `Manual OT`, `Attendance OT`, `Deductions`, `Loans`, `Gross Pay`, `Net Pay`, `Status`, `Actions`.
- **Row Action Triggers**:
  - `lucide-check` (purple): Pay individual employee payslip.
  - `lucide-download` (orange): Download formatted PDF payslip.
  - `lucide-eye` (green): Opens detailed mathematical breakdown modal.

---

### 8. Set Salary & Compensation Structure (`/hrm/set-salary`)
- **Parent Module**: HRM
- **Accessible Roles**: `company`, `hr`
- **Breadcrumb**: `Dashboard > HRM > Set Salary`
- **Master Table**: `Employee ID`, `Employee Name`, `Branch`, `Department`, `Designation`, `Basic Salary`, `Actions`.
- **Individual Structure Screen (`/hrm/set-salary/:id`)**:
  - Sub-Table 1: `Allowances` (`Allowance Type`, `Type: Fixed/Percentage`, `Amount`, `Actions`).
  - Sub-Table 2: `Deductions` (`Deduction Type`, `Type: Fixed/Percentage`, `Amount`, `Actions`).
  - Sub-Table 3: `Loans` (`Type`, `Amount`, `Start Date`, `End Date`, `Actions`).
  - Sub-Table 4: `Overtimes` (`Title`, `Days`, `Hours`, `Rate`, `Status: Active/Expired`, `Actions`).

---

### 9. Recruitment ATS — Job Postings & Candidates (`/recruitment/*`)
- **Parent Module**: Recruitment
- **Sub-Routes**:
  - `/recruitment/job-postings`: Table of published openings with application counts and expiration dates.
  - `/recruitment/candidates`: Candidate tracking with Kanban pipeline (`New`, `Screening`, `Interview`, `Hired`, `Rejected`).
  - `/recruitment/interviews`: Interview scheduling with calendar integration and evaluator assignment.
  - `/recruitment/offers`: Formal offer generation, approval chain, and 1-click conversion to active Employee.

---

### 10. System Setup Master Hub (`/hrm/branches`)
- **Parent Module**: HRM
- **17 Sub-Settings Tabs**:
  `Branches`, `Departments`, `Designations`, `Document Types`, `Award Types`, `Termination Types`, `Warning Types`, `Complaint Types`, `Holiday Types`, `Document Categories`, `Announcement Categories`, `Event Types`, `Allowance Types`, `Deduction Types`, `Loan Types`, `Working Days`, `Ip Restricts`.
- Each tab features a 2-column table (`Name` / `Action`) with an inline modal for creating and updating records.
