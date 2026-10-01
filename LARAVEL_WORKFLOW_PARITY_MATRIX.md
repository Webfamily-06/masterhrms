# Laravel to React & Node.js Workflow Parity Matrix

**Document Scope:** Complete user journeys, lifecycle state machines, approvals, notifications, and scheduled background tasks across Super Admin, HR Admin, and Employee Portals.

---

## 1. Multi-Tenant SaaS Lifecycle Workflow

```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin as Platform Super Admin
    actor Company as Tenant HR Admin
    participant Frontend as React Web App
    participant Backend as Node.js Express API
    participant DB as MySQL (Prisma ORM)

    SuperAdmin->>Frontend: Creates New Subscription Plan
    Frontend->>Backend: POST /api/super/plans
    Backend->>DB: INSERT into SubscriptionPlan
    DB-->>Frontend: Plan Active

    Company->>Frontend: Registers New Company
    Frontend->>Backend: POST /api/auth/register
    Backend->>DB: Transaction: Create Tenant + User + TenantSubscription
    DB-->>Frontend: Auth Tokens + Initial Plan Activated
```

- **State Transitions:**
  - `Company`: `pending` $\rightarrow$ `active` $\rightarrow$ `suspended` (via Super Admin toggle).
  - `Plan Order`: `pending` $\rightarrow$ `approved` (activates plan) or `rejected`.
  - `Coupon`: `active` $\rightarrow$ `expired` (tracked by redemptions & date).

---

## 2. Employee Onboarding & Movement Lifecycle Workflow

```mermaid
stateDiagram-v2
    [*] --> CandidateApplied
    CandidateApplied --> InterviewScheduled: HR Screens Resume
    InterviewScheduled --> OfferReleased: Panel Approves
    OfferReleased --> OnboardingInitiated: Candidate Accepts
    OnboardingInitiated --> ActiveEmployee: Documents & Asset Verified
    ActiveEmployee --> Promoted: Promotion Recorded
    ActiveEmployee --> Transferred: Branch/Dept Relocation
    ActiveEmployee --> Resigned: Resignation Submitted
    ActiveEmployee --> Terminated: Disciplinary Action
    Resigned --> Exited: Notice Period Served
    Terminated --> Exited: Exit Interview & Clearance
    Exited --> [*]
```

- **Data Integrity Safeguards:**
  - Promotion automatically logs historical designation and updates `Employee.designationId`.
  - Resignation enforces minimum notice days and tracks manager exit clearance.
  - Termination immediately deactivates the user login credentials in `User` table.

---

## 3. Daily Attendance & Leave Approval Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Employee as Staff Member
    actor Manager as HR Admin / Manager
    participant App as React App
    participant API as Express API
    participant DB as MySQL DB

    Employee->>App: Clock In (Web / Biometric)
    App->>API: POST /api/attendance/clock-in
    API->>DB: Record attendance (timestamp, IP, GPS)

    Employee->>App: Submits Leave Application (Annual/Casual)
    App->>API: POST /api/leave/requests
    API->>DB: Check balance quota; Insert LeaveRequest (status=pending)
    API-->>Manager: Notification Triggered

    Manager->>App: Review & Approve Leave
    App->>API: PATCH /api/leave/requests/:id/status (status=approved)
    API->>DB: Deduct days from EmployeeLeaveBalance; Mark Attendance as Leave
    DB-->>Employee: Status Updated to Approved
```

- **Regularization Workflow:**
  - If punch is missed, employee submits `POST /api/attendance/regularizations`.
  - HR Admin approves $\rightarrow$ attendance record clock times updated seamlessly.

---

## 4. Payroll Generation & Payslip Distribution Workflow

```mermaid
sequenceDiagram
    autonumber
    actor HR as HR Admin
    actor Staff as Employee
    participant API as Express Payroll Engine
    participant DB as MySQL DB

    HR->>API: POST /api/payroll/runs (Month, Year)
    API->>DB: Query all active employees + attendance count + LOP deductions
    API->>DB: Calculate Basic + Allowances - Deductions (Tax, PF)
    API->>DB: Store immutable PayrollSnapshot & Payslip records
    HR->>API: POST /api/payroll/runs/:id/lock (Finalize Payroll)
    API->>DB: Lock payroll run, prevent edits
    Staff->>API: GET /api/payroll/payslips/:id/pdf
    API-->>Staff: Return formatted payslip
```

- **Recurring Invoices Workflow:**
  - Daily cron scans active recurring invoices.
  - Automatic invoice generation with idempotency checks to prevent duplicate runs.

---

## 5. Custom Fields Engine & Entity Extensibility Workflow (Wave 1)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Workspace Admin
    actor User as Staff User
    participant App as React UI
    participant API as Express Custom Fields Engine
    participant DB as MySQL DB

    Admin->>App: Creates dynamic field (Module: Employees, Type: Select, Options)
    App->>API: POST /api/custom-fields
    API->>DB: Stores CustomField definition scoped to tenant_id
    User->>App: Opens Employee profile / Project creation
    App->>API: GET /api/custom-fields?module=Employees
    API->>DB: Retrieves dynamic fields for module
    User->>App: Submits field values for entity
    App->>API: POST /api/custom-fields/values/:entityId
    API->>DB: Upserts CustomFieldValue records (custom_field_id, entity_id, value)
```

---

## 6. Marketing Campaigns Lifecycle & Budget Workflow (Wave 1)

```mermaid
stateDiagram-v2
    [*] --> Active: Campaign Created (Auto #CAM00XX)
    Active --> Completed: Period Completed / Objectives Met
    Active --> Archived: Campaign Retired / Budget Expended
    Completed --> Archived: Campaign Archived
    Archived --> Active: Unarchived by Marketing Team
    Archived --> [*]: Campaign Deleted
```

---

## 7. Super Admin & Platform Extensions Workflow (Wave 2)

```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin as Platform Super Admin
    participant Frontend as React Admin Panel
    participant Backend as Node.js API
    participant Storage as Backup & CMS Engine
    participant DB as MySQL DB

    SuperAdmin->>Frontend: Triggers Database Backup
    Frontend->>Backend: POST /api/super/backup/generate
    Backend->>DB: Spawns isolated mysqldump / Prisma schema stream
    Backend->>Storage: Compresses stream with zlib gzip to server/backups/
    Storage-->>Backend: Archive created (e.g. master_hrms_backup_*.sql.gz)
    Backend-->>Frontend: Returns snapshot metadata & formatted byte size

    SuperAdmin->>Frontend: Resets User Password
    Frontend->>Backend: PUT /api/super/users/:id/reset-password
    Backend->>DB: Updates User.passwordHash with bcrypt (10 rounds)
    DB-->>Frontend: Password reset confirmation

    SuperAdmin->>Frontend: Edits CMS FAQs & Testimonials
    Frontend->>Backend: POST/PUT /api/cms/faqs & /api/cms/testimonials
    Backend->>DB: Upserts structured JSON inside CmsPage model
    DB-->>Frontend: Instant live update on public & admin pages
```

---

## 8. Workflow Verification Status
All core workflows, including Wave 1 Custom Fields Engine and Marketing Campaigns, as well as Wave 2 Super Admin Password Reset, Login History, Database Backup, Multilingual Phrase Editor, and CMS FAQs/Testimonials Studios, have been mapped, verified against real database operations, and equipped with automated regression test suites.
