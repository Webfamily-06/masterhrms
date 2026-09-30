# PHASE B — END-TO-END WORKFLOW MAPPING SPECIFICATION

**Source Application:** WorkDo Enterprise SaaS ERP (Laravel 12 + Inertia.js + React)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 (`server/src/` & `src/routes/`)  
**Status:** Phase B Workflow Mapping Complete — Zero Code Modification Executed  

---

## 1. END-TO-END WORKFLOW PARITY SPECIFICATIONS

Below is the step-by-step trace of the 10 core business workflows mapped from the Laravel implementation to the target platform architecture:

---

### Workflow 1: Super Admin Tenant Impersonation & Plan Assignment
* **User Role & Permissions:** `super_admin`
* **Starting Screen:** Admin Hub (`/users/{id}/admin-hub` or `_authenticated/_app/users.tsx`)
* **User Actions & Entry Point:** Super admin clicks `Impersonate Tenant` button on a tenant row.
* **Validation & Business Rules:**
  - Verify super_admin token.
  - Store original super_admin identity in session/token state.
  - Target tenant status must NOT be `SUSPENDED` or `EXPIRED`.
* **Backend Processing:**
  - Laravel: `UserController@impersonate` -> sets session `impersonator_id`.
  - Target: `POST /api/super/tenants/:id/impersonate` -> generates scoped tenant token with `isImpersonated: true`.
* **Database Operations:** Reads `users`, `tenants`, `tenant_subscriptions`. Logs to `audit_activity_logs`.
* **Resulting UI State:** App reloads into active tenant context; red floating header banner displays `Currently Impersonating Tenant X — Click to Exit`.

---

### Workflow 2: Add-on Marketplace Upload & Entitlement Check
* **User Role & Permissions:** `super_admin` (Upload/Install), `tenant_admin` (Enable/Disable)
* **Starting Screen:** Add-on Marketplace (`/add-ons` or `_authenticated/_app/add-ons.tsx`)
* **User Actions:** Click `Upload Add-on` -> select zip file -> click `Install`. Tenant admin toggles `Enable Module`.
* **Validation & Business Rules:**
  - Zip package must contain valid `module.json` manifest.
  - Enabling add-on checks tenant subscription plan module entitlement. If not allowed by plan, prompts plan upgrade.
* **Backend Processing:**
  - Target: `POST /api/addons/install` (Extracts manifest, registers in `Addon` table) -> `POST /api/addons/:name/enable` (Upserts `TenantAddon`).
  - Middleware: `requireAddon(addonSlug)` verifies active row in `TenantAddon` before serving API requests.
* **Database Operations:** Writes to `addons`, `tenant_addons`.
* **Resulting UI State:** Module badge updates to `Active`; sidebar dynamically displays new module navigation node.

---

### Workflow 3: Employee Onboarding & Exit Clearance Workflow
* **User Role & Permissions:** `hr_admin`
* **Starting Screen:** Employees List (`/employees` or `_authenticated/_app/employees.tsx`)
* **User Actions:** Click `Add Employee` -> fill multi-tab form (Personal, Work, Salary, Bank/Statutory) -> click `Submit`.
* **Validation & Business Rules:**
  - `employee_code` & `email` must be unique within tenant.
  - Validate PAN (10 chars), Aadhaar (12 digits), IFSC code format.
* **Backend Processing:**
  - Target: `POST /api/employees` -> Prisma `$transaction` creates `Employee` row, creates associated `User` row if portal access enabled, assigns default `SalaryStructureAssignment`.
* **Database Operations:** Writes to `employees`, `users`, `user_roles`, `employee_salary_assignments`.
* **Resulting UI State:** New employee record appears in data table with status `Active`; welcome email queued.

---

### Workflow 4: Leave Application & Multi-Level Approval Workflow
* **User Role & Permissions:** `employee` (Apply), `manager` / `hr_admin` (Approve/Reject)
* **Starting Screen:** Leave Applications (`/leave` or `_authenticated/_app/leave.tsx`)
* **User Actions:** Employee clicks `Apply Leave` -> selects type, dates, reason -> submits. Manager clicks `Approve`.
* **Validation & Business Rules:**
  - Check employee's available leave balance for selected `LeaveType`.
  - Block application if requested days exceed balance or overlap existing leave.
* **Status Transitions:** `pending` -> `approved` / `rejected`.
* **Backend Processing:**
  - Target: `POST /api/leave` -> `POST /api/leave/:id/approve` -> updates `LeaveRequest` status and deducts leave balance.
* **Database Operations:** Reads `leave_types`, updates `leave_requests`, updates `leave_balances`.
* **Resulting UI State:** Status badge changes to `Approved` (green); manager dashboard metrics update.

---

### Workflow 5: Monthly Payroll Run & Payslip Generation
* **User Role & Permissions:** `hr_admin` / `payroll_officer`
* **Starting Screen:** Payroll Processing (`/payroll` or `_authenticated/_app/payroll.tsx`)
* **User Actions:** Select Month & Year -> click `Run Payroll` -> review summary table -> click `Finalize & Pay`.
* **Validation & Business Rules:**
  - Calculate working days, present days, approved paid leaves, unpaid leaves from `Attendance`.
  - Calculate Gross Salary = Basic + Allowances. Deduct Statutory Taxes (PF, ESI, PT, TDS).
  - Net Pay = Gross - Deductions.
* **Status Transitions:** `draft` -> `processing` -> `completed` -> `paid`.
* **Backend Processing:**
  - Target: `POST /api/payroll/process` -> Prisma `$transaction` iterates active employees, computes formula metrics, generates `PayrollRun` and `Payslip` rows.
* **Resulting UI State:** Payslips table populated; employees can view/download individual PDF payslips.

---

### Workflow 6: Double-Entry Accounting Journal Posting Workflow
* **User Role & Permissions:** `accountant`
* **Starting Screen:** Chart of Accounts & Journals (`/accounting` or `_authenticated/_app/accounting.tsx`)
* **User Actions:** Click `Create Journal Entry` -> add debit/credit lines -> click `Post Journal`.
* **Validation & Business Rules:**
  - **CRITICAL DOUBLE-ENTRY RULE:** Total Debit Amount MUST EXACTLY EQUAL Total Credit Amount (`Sum(Debits) === Sum(Credits)`).
  - Entry date cannot be in a closed accounting period.
* **Backend Processing:**
  - Target: `POST /api/accounting/journal-entries` -> validates balance -> creates `JournalEntry` and `JournalItem` records -> updates `ChartOfAccount` balances.
* **Database Operations:** Writes to `journal_entries`, `journal_items`, `chart_of_accounts`.
* **Resulting UI State:** Entry posted to ledger; trial balance and general ledger update in real time.

---

### Workflow 7: POS Barcode Checkout & Inventory Deduction Workflow
* **User Role & Permissions:** `cashier`
* **Starting Screen:** POS Terminal (`/pos` or `_authenticated/_app/pos.tsx`)
* **User Actions:** Scan product barcode / click item -> adjust quantity -> select customer & payment method -> click `Complete Sale`.
* **Validation & Business Rules:**
  - Check available product stock in selected `Warehouse`.
  - Cash register shift must be `OPEN`.
* **Backend Processing:**
  - Target: `POST /api/sales/pos` -> Prisma `$transaction` creates `Sale` record, inserts `SaleDetail` items, creates `SalePayment`, and decrements `ProductWarehouse` stock.
* **Resulting UI State:** Order receipt printed via thermal thermal popup/QZ-Tray; cart clears; register shift balance updates.

---

### Workflow 8: Sales Proposal to Invoice Conversion Workflow
* **User Role & Permissions:** `sales_manager`
* **Starting Screen:** CRM Proposals (`/crm/proposals` or `_authenticated/_app/crm/proposals.tsx`)
* **User Actions:** Select accepted proposal -> click `Convert to Sales Invoice`.
* **Validation & Business Rules:**
  - Proposal status must be `accepted`.
  - Proposal cannot be converted more than once (`is_converted = false`).
* **Backend Processing:**
  - Target: `POST /api/crm/proposals/:id/convert-to-invoice` -> copies proposal line items into new `Sale` invoice record -> marks proposal as `converted`.
* **Database Operations:** Reads `crm_proposals`, creates `sales`, `sale_details`, updates `crm_proposals`.
* **Resulting UI State:** New Sales Invoice created in `Draft` state; user redirected to Invoice details.

---

### Workflow 9: Taskly Project Kanban & Bug Tracking Workflow
* **User Role & Permissions:** `project_manager`, `developer`
* **Starting Screen:** Projects & Tasks (`/projects` or `_authenticated/_app/projects.tsx`)
* **User Actions:** Drag task card from `In Progress` column to `Review` column on Kanban board.
* **Validation & Business Rules:**
  - User must be assigned to project or possess `project_manager` role.
* **Backend Processing:**
  - Target: `PATCH /api/projects/tasks/:id/stage` -> updates `stageId` on `ProjectTask` -> creates `ActivityLog` entry.
* **Resulting UI State:** Task card drops into target column; activity feed records timestamped stage movement.

---

### Workflow 10: Helpdesk Support Ticketing & Reply Thread Workflow
* **User Role & Permissions:** `customer`, `support_agent`
* **Starting Screen:** Helpdesk (`/helpdesk` or `_authenticated/_app/helpdesk.tsx`)
* **User Actions:** Agent views open ticket -> types reply in rich text box -> attaches screenshot -> clicks `Submit Reply & Close Ticket`.
* **Validation & Business Rules:**
  - Non-empty reply content required.
* **Status Transitions:** `open` -> `in_progress` -> `closed`.
* **Backend Processing:**
  - Target: `POST /api/helpdesk/tickets/:id/replies` -> inserts `HelpdeskComment` -> updates `HelpdeskTicket` status to `closed` -> triggers email notification to customer.
* **Resulting UI State:** Ticket thread updates with agent reply badge; status pill updates to `Closed` (gray).
