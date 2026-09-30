# Tenant / Vendor Admin Portal Flow & Forensic Architecture

## 1. Executive Summary & Architecture
The Tenant / Vendor Admin portal is the primary ERP & HRMS operating system for an organization. All queries and mutations are isolated by `tenant_id` enforced at the API layer, Prisma queries, and WebSocket rooms.

* **Route Prefix**: `/_authenticated/_app/*`
* **Login Route**: `/auth` (`src/routes/auth.tsx`)
* **Shell Layout**: `src/routes/_authenticated/_app.tsx`
* **Total Permitted Endpoints**: 420 Endpoints across 24 Modules
* **Tenant Isolation**: Mandatory `tenant_id` on all 85+ tenant-scoped database models.

---

## 2. Complete Module Master Matrix (24 Modules)

| # | Module | Route | Component File | Key Features & Handlers | Backend APIs | Models | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :-: |
| 1 | **Dashboard** | `/dashboard` | `src/routes/_authenticated/_app/dashboard.tsx` | Executive KPI cards, Live Attendance counter, Revenue charts, Quick Actions | `GET /api/dashboard/stats` | `Employee`, `Attendance`, `Sale`, `Invoice` | WORKING |
| 2 | **Employees** | `/employees` | `src/routes/_authenticated/_app/employees.tsx` | Directory, Multi-tab passport, Salary structure, Bank details, Documents | `GET /api/employees`, `POST /api/employees`, `PUT /api/employees/:id` | `Employee`, `Department`, `Designation`, `SalaryAssignment` | WORKING |
| 3 | **Attendance** | `/attendance` | `src/routes/_authenticated/_app/attendance.tsx` | Daily punch records, Geofence punch, Attendance calendar, Overtime calculation | `GET /api/attendance`, `POST /api/attendance/punch` | `Attendance`, `ShiftSchedule` | WORKING |
| 4 | **Shifts** | `/attendance-shifts` | `src/routes/_authenticated/_app/attendance-shifts.tsx` | Shift templates, Rotations, Rostering, Peer shift swap approvals | `GET /api/shifts`, `POST /api/shifts`, `POST /api/shifts/swap-approve` | `Shift`, `ShiftAssignment`, `ShiftSwapRequest` | WORKING |
| 5 | **Biometric IoT** | `/biometric-sync` | `src/routes/_authenticated/_app/biometric-sync.tsx` | ZKTeco UDP/TCP sync bridge, Real-time punch listener, Device ping | `GET /api/biometric/devices`, `POST /api/biometric/sync` | `BiometricDevice`, `Attendance` | WORKING |
| 6 | **Leaves** | `/leave` | `src/routes/_authenticated/_app/leave.tsx` | Quota tracking, Leave applications, Two-tier approvals, Leave balance ledger | `GET /api/leaves`, `POST /api/leaves/apply`, `PUT /api/leaves/:id/status` | `LeaveRequest`, `LeaveBalance`, `LeaveType` | WORKING |
| 7 | **Payroll Engine**| `/payroll` | `src/routes/_authenticated/_app/payroll.tsx` | Batch payroll run, Monthly CTC breakdown, Statutory deductions, Bank export | `GET /api/payroll/runs`, `POST /api/payroll/process`, `POST /api/payroll/finalize` | `PayrollRun`, `Payslip`, `JournalEntry` | WORKING |
| 8 | **Statutory Forms**| `/forms` | `src/routes/_authenticated/_app/forms.tsx` | 11 Indian statutory compliance tax forms (Form 16, 24Q, EPF, ESI, PT) | `GET /api/statutory/forms`, `POST /api/statutory/generate` | `StatutoryReport`, `Payslip` | WORKING |
| 9 | **Expenses** | `/expenses` | `src/routes/_authenticated/_app/expenses.tsx` | Receipt upload, Expense categories, Manager approval, General ledger posting | `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/:id/approve` | `Expense`, `JournalEntry` | WORKING |
| 10| **Assets** | `/assets` | `src/routes/_authenticated/_app/assets.tsx` | Hardware inventory, Custody assignment, Warranty tracking, Handover PDF | `GET /api/assets`, `POST /api/assets`, `POST /api/assets/:id/assign` | `Asset`, `AssetAssignment` | WORKING |
| 11| **OKR & Goals** | `/okr` | `src/routes/_authenticated/_app/okr.tsx` | Strategic objectives, Key results, Confidence check-ins, 360° reviews | `GET /api/okrs`, `POST /api/okrs`, `POST /api/okrs/:id/checkin` | `OkrObjective`, `OkrKeyResult`, `OkrCheckin` | WORKING |
| 12| **Recruitment** | `/recruitment` | `src/routes/_authenticated/_app/recruitment.tsx` | Job openings, Kanban candidate pipeline, Resume parser, Convert to Staff | `GET /api/jobs`, `POST /api/candidates`, `POST /api/candidates/:id/convert` | `JobOpening`, `Candidate`, `Employee` | WORKING |
| 13| **Training (LMS)**| `/training` | `src/routes/_authenticated/_app/training.tsx` | Course catalog, Employee enrollment, Progress tracking, Verified Certificate | `GET /api/courses`, `POST /api/courses/enroll`, `PUT /api/courses/:id/complete` | `Course`, `CourseEnrollment` | WORKING |
| 14| **Offboarding** | `/offboarding` | `src/routes/_authenticated/_app/offboarding.tsx` | Resignation workflow, 4-Department clearance (IT/Finance/HR/Admin), Relieving | `GET /api/offboarding`, `PUT /api/offboarding/:id/clearance` | `ExitRequest`, `ExitClearance` | WORKING |
| 15| **Helpdesk** | `/helpdesk` | `src/routes/_authenticated/_app/helpdesk.tsx` | Internal IT/HR support tickets, Priority SLAs, Department assignment | `GET /api/tickets`, `POST /api/tickets`, `POST /api/tickets/:id/reply` | `Ticket`, `TicketMessage` | WORKING |
| 16| **Documents** | `/documents` | `src/routes/_authenticated/_app/documents.tsx` | Digital signature canvas, Offer letters, Company policy repository | `GET /api/documents`, `POST /api/documents/upload`, `POST /api/documents/sign` | `Document`, `DigitalSignature` | WORKING |
| 17| **Announcements**| `/announcements` | `src/routes/_authenticated/_app/announcements.tsx` | Organization notices, Department broadcasts, Priority banners | `GET /api/announcements`, `POST /api/announcements` | `Announcement` | WORKING |
| 18| **CRM Pipeline** | `/crm` | `src/routes/_authenticated/_app/crm.tsx` | Visual deal stages Kanban (Lead to Won), Lead scoring, Contact directory | `GET /api/crm/deals`, `POST /api/crm/deals`, `PUT /api/crm/deals/:id/stage` | `Deal`, `Contact`, `Lead` | WORKING |
| 19| **Projects** | `/projects` | `src/routes/_authenticated/_app/projects.tsx` | Milestone Gantt, Tasks assignment, Timesheet logging, Billable tracking | `GET /api/projects`, `POST /api/tasks`, `POST /api/timesheets` | `Project`, `Task`, `Timesheet` | WORKING |
| 20| **Point of Sale**| `/pos` | `src/routes/_authenticated/_app/pos.tsx` | Barcode scanning, Cash/Card tender, QZ-Tray thermal 80mm printing, Dual display | `GET /api/pos/products`, `POST /api/pos/checkout` | `Sale`, `SaleItem`, `Product`, `WarehouseStock` | WORKING |
| 21| **Products Catalog**| `/products` | `src/routes/_authenticated/_app/products.tsx` | Items & Services, Multi-warehouse stock transfers, Stock adjustments | `GET /api/products`, `POST /api/products`, `POST /api/inventory/transfers` | `Product`, `ProductWarehouse`, `StockTransfer` | WORKING |
| 22| **Accounting** | `/accounting` | `src/routes/_authenticated/_app/accounting.tsx` | 5-Tier Chart of Accounts, Balanced journal entries (DR = CR), P&L, Balance Sheet | `GET /api/accounting/accounts`, `POST /api/accounting/journals` | `ChartOfAccount`, `JournalEntry`, `JournalItem` | WORKING |
| 23| **Invoicing & Bills**| `/invoices` | `src/routes/_authenticated/_app/invoices.tsx` | B2B GST tax invoices, Purchase bills, Automated journal entry creation | `GET /api/invoices`, `POST /api/invoices`, `POST /api/purchases` | `Invoice`, `PurchaseOrder`, `JournalEntry` | WORKING |
| 24| **Workflows & IoT**| `/workflows` | `src/routes/_authenticated/_app/workflows.tsx` | IF-THEN automation rules, Event listeners, WhatsApp alerts dispatcher | `GET /api/workflows`, `POST /api/workflows/rule` | `WorkflowRule`, `WebhookEvent` | WORKING |

---

## 3. Core Enterprise Business Logic Chains
1. **POS Sale -> General Ledger Posting**:
   When a sale is executed on `/pos`, the backend creates records in `Sale` and `SaleItem`, reduces stock in `ProductWarehouse`, broadcasts the receipt to the customer display via WebSockets, and invokes `LedgerPostingService` to create an atomic balanced entry in `JournalEntry` debiting Cash/Card and crediting Sales Revenue.
2. **Payroll Run -> Bank Snapshot & Accounting**:
   When payroll is finalized on `/payroll`, the backend creates an immutable snapshot in `PayrollRun`, generates individual `Payslip` records, locks attendance records for the month, and auto-posts the salary liability to the general ledger.
