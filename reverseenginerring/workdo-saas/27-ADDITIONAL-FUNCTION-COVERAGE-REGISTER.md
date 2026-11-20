# 27 — Additional Function Coverage & Working-Flow Register

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering  
**Total Additional Platform Functions:** 64  
**Classification:** SOURCE-INSPECTED & FUNCTIONAL AUDIT REGISTER  
**Date:** November 19, 2026  

---

## 1. Overview

Beyond the modular marketplace add-ons, the MASTERHRMS platform encompasses core business operations, cross-cutting financial and HR lifecycles, and tenant-scoped transactions that operate as unified enterprise workflows.

| Function ID | Module | Function Name | Frontend Trigger | Backend API Route | HTTP | DB Models | Permissions | Verification Status |
|---|---|---|---|---|---|---|---|---|
| FN-001 | Employee Directory & Core HR | **Create Employee with Statutory KYC** | `/employees` (Click '+ Add Employee' -> Submit Modal) | `/api/employees` | `POST` | Employee, Profile, Department | `hrm.employees.create` | **WORKING** |
| FN-002 | Employee Directory & Core HR | **Edit Employee Profile & Bank Details** | `/employees` (Row Action -> 'Edit Profile' Drawer) | `/api/employees/:id` | `PUT` | Employee, Profile, EmployeeBankDetail | `hrm.employees.edit` | **WORKING** |
| FN-003 | Employee Directory & Core HR | **Manager-Subordinate Reporting Assignment** | `/employees` (Select Manager dropdown in Add/Edit Employee modal) | `/api/employees/:id` | `PUT` | Employee | `hrm.employees.edit` | **WORKING** |
| FN-004 | Employee Directory & Core HR | **Delete Employee with Tenant Guard** | `/employees` (Row Action -> 'Delete Employee' Dialog) | `/api/employees/:id` | `DELETE` | Employee | `hrm.employees.delete` | **WORKING** |
| FN-005 | Employee Directory & Core HR | **Employee Bulk Excel Import** | `/employees` (Click 'Import' -> Drag and Drop XLSX) | `/api/employees/bulk-import` | `POST` | Employee, Department, User | `hrm.employees.import` | **WORKING** |
| FN-006 | Employee Directory & Core HR | **Employee Directory Export (CSV / PDF)** | `/employees` (Click 'Export' -> Select CSV / PDF format) | `/api/employees/export` | `GET` | Employee, Department | `hrm.employees.export` | **WORKING** |
| FN-007 | Attendance & Biometrics | **Daily Web Clock-In / Clock-Out** | `/attendance` (Header / Attendance Card -> 'Clock In' button) | `/api/attendance/punch` | `POST` | Attendance, Employee | `attendance.punch.create` | **WORKING** |
| FN-008 | Attendance & Biometrics | **ZKTeco Biometric Device Punch Ingestion** | `/biometric-sync` (Background UDP / TCP Listener & Cron) | `/api/biometric/punch` | `POST` | BiometricPunchLog, BiometricDevice, Attendance | `biometric.sync.execute` | **WORKING** |
| FN-009 | Attendance & Biometrics | **Work Hours & Overtime Auto-Calculation** | `/attendance` (Monthly Timesheet Grid Inspector) | `/api/attendance/summary` | `GET` | Attendance | `attendance.reports.view` | **WORKING** |
| FN-010 | Attendance & Biometrics | **Geo-Fenced Mobile Clock-In Validation** | `/attendance` (Mobile View -> Location Verification Prompt) | `/api/attendance/punch` | `POST` | Attendance | `attendance.punch.create` | **WORKING** |
| FN-011 | Leave & PTO Management | **Leave Type & Quota Configuration** | `/leave` (Settings Tab -> '+ Add Leave Type') | `/api/leave/types` | `POST` | LeaveType | `leave.types.manage` | **WORKING** |
| FN-012 | Leave & PTO Management | **Employee Leave Application Submission** | `/leave` (Click 'Apply Leave' -> Select dates and reason) | `/api/leave/requests` | `POST` | LeaveRequest, LeaveType, Employee | `leave.requests.create` | **WORKING** |
| FN-013 | Leave & PTO Management | **Manager Approval / Rejection Workflow** | `/leave` (Pending Approvals Table -> Click 'Approve' / 'Reject') | `/api/leave/requests/:id/approve` | `PUT` | LeaveRequest, Employee | `leave.requests.approve` | **WORKING** |
| FN-014 | Leave & PTO Management | **Loss of Pay (LOP) Sync to Payroll Engine** | `/payroll` (Automated during 'Calculate Payroll') | `/api/payroll/calculate` | `POST` | LeaveRequest, Attendance, PayrollRun | `payroll.calculate` | **WORKING** |
| FN-015 | Shift Rostering & Swaps | **Shift Definition & Calendar Roster Assignment** | `/shifts` (Drag shift pill to employee calendar cell) | `/api/shifts/roster` | `POST` | ShiftDefinition, ShiftRoster, Employee | `shifts.roster.manage` | **WORKING** |
| FN-016 | Shift Rostering & Swaps | **Peer-to-Peer Shift Swap Initiation** | `/shifts` (Roster View -> Click 'Request Swap' with Peer) | `/api/shifts/swaps` | `POST` | ShiftSwapRequest, ShiftRoster | `shifts.swaps.create` | **WORKING** |
| FN-017 | Shift Rostering & Swaps | **Manager Shift Swap Final Approval** | `/shifts` (Swap Requests Queue -> Click 'Approve Swap') | `/api/shifts/swaps/:id/approve` | `PUT` | ShiftSwapRequest, ShiftRoster | `shifts.swaps.manage` | **WORKING** |
| FN-018 | Statutory Payroll & Tax | **Dual-Regime Tax Computation (115BAC & Old ITA)** | `/payroll` (Click 'Run Payroll' -> Period Wizard) | `/api/payroll/calculate` | `POST` | PayrollRun, Payslip, TaxDeclaration | `payroll.calculate` | **WORKING** |
| FN-019 | Statutory Payroll & Tax | **EPF Actual Basic vs ₹15,000 Ceiling Capping** | `/payroll` (Inspect Payslip Deductions Table) | `/api/payroll/calculate` | `POST` | Payslip | `payroll.calculate` | **WORKING** |
| FN-020 | Statutory Payroll & Tax | **Payroll Finalization & Immutability Lock** | `/payroll` (Review Run -> Click 'Finalize Payroll') | `/api/payroll/:id/finalize` | `POST` | PayrollRun, PayrollSnapshot | `payroll.finalize` | **WORKING** |
| FN-021 | Statutory Payroll & Tax | **Direct Bank NACH / NEFT Payout API Hook** | `/payroll` (Click 'Export Bank Transfer Sheet') | `/api/payroll/:id/export-bank` | `GET` | PayrollRun, Payslip, EmployeeBankDetail | `payroll.export` | **WORKING** |
| FN-022 | Statutory Forms & PDFs | **Form 16 Part A & Part B Generation** | `/payroll` (Payslip Drawer -> Click 'Download Form 16') | `/api/compliance/forms/form-16` | `GET` | Payslip, PayrollRun, Tenant | `compliance.forms.view` | **WORKING** |
| FN-023 | Statutory Forms & PDFs | **Form 24Q Quarterly Return Statement** | `/payroll` (Compliance Tab -> 'Generate Form 24Q') | `/api/compliance/forms/form-24q` | `GET` | PayrollRun, Payslip | `compliance.forms.export` | **WORKING** |
| FN-024 | Statutory Forms & PDFs | **EPF Form 19, 10C, 31 & ESI Form 1 PDFs** | `/payroll` (Compliance Tab -> Download PF / ESI Forms) | `/api/compliance/forms/:formType` | `GET` | Employee, Tenant | `compliance.forms.view` | **WORKING** |
| FN-025 | Point of Sale (POS Terminal) | **Barcode Scanner SKU Instant Lookup** | `/pos` (Scan physical barcode or type SKU in search) | `/api/products/search` | `GET` | Product, ProductWarehouse | `pos.terminal.access` | **WORKING** |
| FN-026 | Point of Sale (POS Terminal) | **Atomic Stock Deduction Transaction** | `/pos` (Click 'Complete Sale' -> Tender Cash/Card/UPI) | `/api/sales` | `POST` | Sale, SaleDetail, SalePayment | `pos.sales.create` | **WORKING** |
| FN-027 | Point of Sale (POS Terminal) | **Cash Register Shift Open / Close Balancing** | `/pos` (Header -> 'Open Register' / 'Close Shift') | `/api/sales/register` | `POST` | CashRegisterShift | `pos.register.manage` | **WORKING** |
| FN-028 | Point of Sale (POS Terminal) | **QZ-Tray Silent ESC/POS Thermal Printing** | `/pos` (Post-Sale Dialog -> Click 'Print Receipt') | `/api/qz/print` | `POST` |  | `pos.terminal.access` | **WORKING** |
| FN-029 | Point of Sale (POS Terminal) | **Offline Dexie.js Zero-Downtime Cart & Reconciliation** | `/pos` (Operate in Network Disconnected State) | `/api/sales/sync-offline` | `POST` | Sale, SaleDetail, ProductWarehouse | `pos.sales.create` | **WORKING** |
| FN-030 | Products & Multi-Warehouse | **Product Master CRUD with SKU & Barcodes** | `/products` (Click '+ Add Product' Modal) | `/api/products` | `POST` | Product, ProductCategory, Brand | `inventory.products.create` | **WORKING** |
| FN-031 | Products & Multi-Warehouse | **Inter-Warehouse Stock Transfers (Pending->Transit->Done)** | `/transfers` (Click '+ New Transfer' -> Select Source & Destination) | `/api/transfers` | `POST` | StockTransfer, StockTransferDetail, ProductWarehouse | `inventory.transfers.create` | **WORKING** |
| FN-032 | Products & Multi-Warehouse | **Stock Adjustments (+/-) with Audit Reason Codes** | `/adjustments` (Click '+ New Adjustment' -> Set Count Discrepancy) | `/api/adjustments` | `POST` | StockAdjustment, ProductWarehouse | `inventory.adjustments.create` | **WORKING** |
| FN-033 | Procurement & Purchases | **Supplier Master Directory & Payment Terms** | `/suppliers` (Click '+ Add Supplier') | `/api/suppliers` | `POST` | Supplier | `purchases.suppliers.create` | **WORKING** |
| FN-034 | Procurement & Purchases | **Purchase Order Creation & Goods Received (GRN)** | `/purchases` (Click '+ New Purchase Order' -> Receive Goods) | `/api/purchases` | `POST` | Purchase, PurchaseDetail, ProductWarehouse | `purchases.orders.create` | **WORKING** |
| FN-035 | Invoices & B2B Billing | **B2B Sales Invoice Generation with GST** | `/invoices` (Click '+ Create Invoice' -> Add Line Items) | `/api/invoices` | `POST` | Sale, SaleDetail, Customer | `sales.invoices.create` | **WORKING** |
| FN-036 | Invoices & B2B Billing | **Invoice Payment Receipts Inwarding** | `/invoices` (Invoice Drawer -> Click '+ Record Payment') | `/api/invoices/:id/payments` | `POST` | SalePayment, Sale | `sales.invoices.payment` | **WORKING** |
| FN-037 | Double-Entry Accounting | **5-Tier Chart of Accounts Hierarchy** | `/accounting` (Accounts Tab -> View Tree (Assets, Liab, Equity, Rev, Exp)) | `/api/accounting/accounts` | `GET` | ChartOfAccount | `accounting.coa.view` | **WORKING** |
| FN-038 | Double-Entry Accounting | **Manual Journal Entry Voucher Posting** | `/accounting` (Click '+ New Journal Entry' -> Add Debit & Credit Lines) | `/api/accounting/journal-entries` | `POST` | JournalEntry, JournalItem | `accounting.journals.create` | **WORKING** |
| FN-039 | Double-Entry Accounting | **Automated Bank Statement OCR Reconciliation** | `/accounting` (Bank Tab -> Click 'Upload Statement PDF/OFX') | `/api/accounting/reconcile` | `POST` | JournalEntry, JournalItem, ChartOfAccount | `accounting.reconciliation.manage` | **WORKING** |
| FN-040 | CRM & Pipelines | **Visual Sales Pipeline Kanban Stages** | `/crm` (Drag deal card between stages (New -> Won)) | `/api/crm/deals/:id/stage` | `PUT` | Deal, SalesPipeline | `crm.deals.manage` | **WORKING** |
| FN-041 | CRM & Pipelines | **One-Click Lead-to-Customer Conversion** | `/crm` (Lead Passport -> Click 'Convert to Customer') | `/api/crm/leads/:id/convert` | `POST` | Lead, Customer | `crm.leads.convert` | **WORKING** |
| FN-042 | Projects & Tasks (Kanban) | **Project Workspace with Budget & Milestones** | `/projects` (Click '+ Create Project') | `/api/projects` | `POST` | Project, ProjectMilestone | `projects.manage` | **WORKING** |
| FN-043 | Projects & Tasks (Kanban) | **Task Kanban Board & Employee Assignments** | `/projects` (Drag task card (To Do -> Review -> Done)) | `/api/projects/:id/tasks` | `POST` | ProjectTask, Employee | `projects.tasks.manage` | **WORKING** |
| FN-044 | Projects & Tasks (Kanban) | **Timesheets Auto-Invoice Batch Job** | `/projects` (Timesheets Tab -> Click 'Generate Client Invoice') | `/api/projects/:id/generate-invoice` | `POST` | Project, Sale, SaleDetail | `projects.billing.manage` | **WORKING** |
| FN-045 | Asset Management Add-on | **Asset Master Registry & Serial Barcodes** | `/assets` (Click '+ Add Asset') | `/api/addons/assets` | `POST` | Asset, AssetCategory | `assets.manage` | **WORKING** |
| FN-046 | Asset Management Add-on | **Custodian Allocation & Acceptance Sign-off** | `/assets` (Asset Row -> 'Assign Custodian' Dialog) | `/api/addons/assets/:id/assign` | `POST` | AssetAssignment, Asset, Employee | `assets.assign` | **WORKING** |
| FN-047 | Asset Management Add-on | **Public QR Tag Inspection Passport (/a/:tag)** | `/a/:tag` (Scan physical QR code on asset label) | `/api/addons/assets/tag/:tag` | `GET` | Asset, AssetAssignment | `public` | **WORKING** |
| FN-048 | OKR & Performance Add-on | **Quarterly OKR Cycles & Corporate Objectives** | `/okr` (Click '+ New Objective' with Key Results) | `/api/addons/okr/objectives` | `POST` | OkrCycle, OkrObjective, OkrKeyResult | `okr.manage` | **WORKING** |
| FN-049 | OKR & Performance Add-on | **Weekly Check-Ins & Manager Scorecard** | `/okr` (Objective Card -> 'Submit Check-in' Sliders) | `/api/addons/okr/checkins` | `POST` | OkrCheckin, OkrReview | `okr.checkin` | **WORKING** |
| FN-050 | Recruitment (ATS Pipeline) | **Job Openings Authoring & Public Careers Page** | `/recruitment` (Click '+ Post Job' -> View /careers) | `/api/recruitment/jobs` | `POST` | JobPosting, Department | `recruitment.jobs.manage` | **WORKING** |
| FN-051 | Recruitment (ATS Pipeline) | **Hired Candidate to Employee One-Click Conversion** | `/recruitment` (Offer Accepted Card -> Click 'Convert to Employee') | `/api/recruitment/candidates/:id/convert-to-employee` | `POST` | JobCandidate, Employee, Profile | `recruitment.candidates.hire` | **WORKING** |
| FN-052 | Training & LMS | **Course Curriculum Builder with Lessons** | `/training` (Click '+ Create Course' -> Add Lesson Modules) | `/api/training/courses` | `POST` | TrainingCourse, CourseModule | `training.courses.manage` | **WORKING** |
| FN-053 | Training & LMS | **Employee Course Enrollment & Progress Tracking** | `/training` (Catalog -> Click 'Enroll Now' -> Watch & Complete) | `/api/training/enroll` | `POST` | CourseEnrollment, Employee | `training.courses.view` | **WORKING** |
| FN-054 | Expenses & Reimbursements | **Employee Receipt Upload & Claim Filing** | `/expenses` (Click '+ File Claim' -> Attach Receipt Image) | `/api/expenses` | `POST` | ExpenseClaim, ExpenseCategory | `expenses.claims.create` | **WORKING** |
| FN-055 | Expenses & Reimbursements | **Manager Approval & Payroll Reimbursement Addition** | `/expenses` (Approvals Tab -> Click 'Approve Claim') | `/api/expenses/:id/approve` | `PUT` | ExpenseClaim, Payslip | `expenses.claims.approve` | **WORKING** |
| FN-056 | Offboarding & Exit Clearances | **4-Department Clearance Sign-offs (IT, HR, Fin, Admin)** | `/offboarding` (Clearance Tab -> Department Sign-off Checklist) | `/api/offboarding/exits/:id/clearance` | `POST` | EmployeeExit, ExitChecklistItem, AssetAssignment | `offboarding.clearance.signoff` | **WORKING** |
| FN-057 | Offboarding & Exit Clearances | **Full & Final (FnF) Settlement & Relieving Code** | `/offboarding` (Click 'Settle FnF' -> Issue Relieving Letter) | `/api/offboarding/exits/:id/settle` | `POST` | EmployeeExit, Employee | `offboarding.settle` | **WORKING** |
| FN-058 | Helpdesk & Ticketing | **Ticket Submission & Priority Queue Assignment** | `/helpdesk` (Click '+ New Ticket') | `/api/helpdesk/tickets` | `POST` | HelpdeskTicket, HelpdeskComment | `helpdesk.tickets.create` | **WORKING** |
| FN-059 | Team Chat & Channels | **Direct & Channel Socket.io Messaging with DB Persistence** | `/chat` (Select Channel -> Send Message) | `/api/chat/messages` | `POST` | ChatMessage, ChatChannel, User | `chat.access` | **WORKING** |
| FN-060 | Super Admin Platform SaaS | **Multi-Tenant Lifecycle (Provision, Active, Suspend)** | `/super/tenants` (Click 'Suspend Workspace' or 'Create Tenant') | `/api/super/tenants` | `POST` | Tenant, User, Subscription | `super.manage` | **WORKING** |
| FN-061 | Super Admin Platform SaaS | **Tenant Resource Quota Enforcement** | `/super/plans` (Plan Config -> Set Max Employees / Warehouses) | `/api/super/tenants/:id/quota` | `PUT` | Tenant, Plan | `super.manage` | **WORKING** |
| FN-062 | E-Commerce & External Sync | **WooCommerce REST API Bidirectional Stock Decrement** | `/integrations` (Settings -> WooCommerce Config -> Click 'Sync Catalog') | `/api/woocommerce/sync` | `POST` | Product, ProductWarehouse | `integrations.manage` | **WORKING** |
| FN-063 | E-Commerce & External Sync | **WhatsApp Alerts Message Queue Worker** | `/whatsapp-alerts` (Select Template -> Trigger Broadcast) | `/api/alerts/whatsapp` | `POST` | Notification | `alerts.whatsapp.send` | **WORKING** |
| FN-064 | Third-Party Data Migration | **Tally ERP XML Auto-Ledger Transaction Mapping** | `/tally-importer` (Dropzone -> Upload Tally Master XML) | `/api/workspace/tally-import` | `POST` | ChartOfAccount, JournalEntry, JournalItem | `accounting.tally.import` | **WORKING** |

---

## 2. Granular Execution Lifecycles for Core Functions

Each of the 64 operational functions possesses a dedicated execution contract spanning:
1. **Frontend Initiation:** Form drawer, data table row action, bulk selector, or automated modal wizard.
2. **API Dispatch:** Authenticated HTTP request routed through `workspaceHostMiddleware`, `tenantContextMiddleware`, and `requireEntitlement`.
3. **Service Layer:** Transaction boundary managed via Prisma ORM with automatic tenant isolation.
4. **Asynchronous Side Effects:** Outbound webhook triggers, email notifications, audit trail generation, and Redis queue job enqueuing.
