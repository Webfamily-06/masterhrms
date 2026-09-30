# Enterprise Business Workflow Forensic Mapping

This document maps the 16 core business workflows verified directly from the application source code.

---

## 1. Master Workflow Catalog

| ID | Workflow Name | Triggering Actor | Starting Page | API Sequence | Database Changes | Verification Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| **WF-01** | Tenant Provisioning | Super Admin | `/super/tenants` | `POST /api/super/tenants` | `Tenant`, `User`, `Subscription`, `ChartOfAccount` | IMPLEMENTED |
| **WF-02** | One-Click Impersonation | Super Admin | `/super/tenants` | `POST /api/super/impersonate/:id` | `AuditLog` | IMPLEMENTED |
| **WF-03** | Employee Onboarding | HR Manager | `/employees` | `POST /api/employees`, `POST /api/auth/register` | `Employee`, `User`, `SalaryAssignment`, `LeaveBalance` | IMPLEMENTED |
| **WF-04** | Biometric Punch Ingest | ZKTeco Device | Hardware Push | `POST /api/biometric/sync` | `Attendance`, `BiometricLog` | IMPLEMENTED |
| **WF-05** | Geofence Web Clock-in | Employee | `/employee-dashboard`| `POST /api/attendance/punch` | `Attendance` | IMPLEMENTED |
| **WF-06** | Two-Tier Leave Approval | HR / Manager | `/leave` | `POST /api/leaves/apply`, `PUT /api/leaves/:id/status`| `LeaveRequest`, `LeaveBalance` | IMPLEMENTED |
| **WF-07** | Batch Payroll Run | HR / Finance | `/payroll` | `POST /api/payroll/process`, `POST /api/payroll/finalize` | `PayrollRun`, `Payslip`, `JournalEntry` | IMPLEMENTED |
| **WF-08** | Statutory Tax PDF Export | Finance Manager | `/forms` | `GET /api/statutory/forms` | `StatutoryReport` (jsPDF generator) | IMPLEMENTED |
| **WF-09** | POS Checkout & Sale | Cashier | `/pos` | `POST /api/pos/checkout` | `Sale`, `SaleItem`, `ProductWarehouse`, `JournalEntry` | IMPLEMENTED |
| **WF-10** | Stock Transfer Between WH| Warehouse Mgr | `/products` | `POST /api/inventory/transfers` | `StockTransfer`, `ProductWarehouse` | IMPLEMENTED |
| **WF-11** | Double-Entry Journal Post | Accountant | `/accounting` | `POST /api/accounting/journals` | `JournalEntry`, `JournalItem` | IMPLEMENTED |
| **WF-12** | B2B Invoice to Payment | Finance Manager | `/invoices` | `POST /api/invoices`, `POST /api/payments/verify`| `Invoice`, `Payment`, `JournalEntry` | IMPLEMENTED |
| **WF-13** | Recruitment Conversion | Recruiter | `/recruitment` | `POST /api/candidates/:id/convert` | `Candidate` (status: HIRED), `Employee` (NEW) | IMPLEMENTED |
| **WF-14** | 4-Department Exit Clear | HR / Dept Heads| `/offboarding` | `PUT /api/offboarding/:id/clearance` | `ExitRequest`, `AssetAssignment`, `Employee` | IMPLEMENTED |
| **WF-15** | OKR Confidence Check-in | Employee / Lead | `/okr` | `POST /api/okrs/:id/checkin` | `OkrCheckin`, `OkrKeyResult` | IMPLEMENTED |
| **WF-16** | Platform Addon Request | Tenant Admin | `/support` | `POST /api/support/tickets`, `POST /api/support/platform/tickets/:id/action` | `PlatformSupportTicket`, `TenantAddon` | IMPLEMENTED |

---

## 2. Detailed Step-by-Step Execution Traces

### WF-07: Batch Payroll Run & General Ledger Posting
1. **Initiation**: Finance Manager visits `/payroll`, selects Pay Period (e.g. "2026-08") and clicks "Compute Payroll Draft".
2. **Draft Calculation**: Frontend calls `POST /api/payroll/process`. Backend queries `Employee` for all active personnel, fetches `SalaryAssignment` (Basic, HRA, DA, Allowances), queries `Attendance` for days present vs absent, and calculates gross salary, statutory PF (12%), ESI (0.75%), TDS, and professional tax.
3. **Draft Review**: Results render in table with line-item review and dispute flags.
4. **Finalization Lock**: Manager clicks "Finalize & Lock Payroll". Frontend calls `POST /api/payroll/finalize`. Backend:
   * Generates immutable `PayrollRun` record and individual `Payslip` records with serial numbers.
   * Locks attendance records for the month against future punch edits.
   * Calls `LedgerPostingService` to create an atomic balanced journal voucher in `JournalEntry` debiting Salary Expense and crediting Salary Payable & Statutory Liabilities.
   * Dispatches real-time notification to employees that monthly payslips are available for download.
