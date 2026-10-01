# FRONTEND-BACKEND API MAPPING
## Comprehensive Route-to-Endpoint Integration Matrix

---

## 1. Overview

This matrix maps every functional frontend page and operational feature to its corresponding backend API endpoint, HTTP method, and underlying database model.

---

## 2. API Mapping Table

| Frontend Route | Feature Description | Backend API Endpoint | HTTP Method | Database Model(s) | Status |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `/employees` | Employee Directory List & Search | `/api/employees` | `GET` | `Employee`, `Department` | **Connected** |
| `/employees` | Create New Employee Master | `/api/employees` | `POST` | `Employee`, `Profile` | **Connected** |
| `/employees` | Update Employee Record | `/api/employees/:id` | `PUT` | `Employee` | **Connected** |
| `/employees` | Soft/Hard Delete Employee | `/api/employees/:id` | `DELETE` | `Employee` | **Connected** |
| `/attendance` | Daily Attendance Table & Summary | `/api/attendance` | `GET` | `Attendance` | **Connected** |
| `/attendance` | Web Clock-In / Clock-Out | `/api/attendance/clock` | `POST` | `Attendance` | **Connected** |
| `/biometric` | Biometric Device Management | `/api/biometric/devices` | `GET`, `POST` | `BiometricDevice` | **Connected** |
| `/biometric` | Device PIN to Employee Mappings | `/api/biometric/pin-mappings` | `GET`, `POST`, `DELETE` | `BiometricEmployeeMapping` | **Connected** |
| `/leave` | Leave Requests & Balances | `/api/leave/requests` | `GET`, `POST` | `LeaveRequest`, `LeaveType` | **Connected** |
| `/leave` | Leave Status Approval/Rejection | `/api/leave/requests/:id` | `PATCH` | `LeaveRequest` | **Connected** |
| `/payroll` | Payroll Runs List & Execution | `/api/payroll/runs` | `GET`, `POST` | `PayrollRun`, `Payslip` | **Connected** |
| `/payroll` | Bank Payout Batch Management | `/api/payroll/disbursement/batches` | `GET`, `POST` | `BankDisbursementBatch` | **Connected** |
| `/payroll` | Payout File Generation & Sign | `/api/payroll/disbursement/batches/:id/generate` | `POST` | `BankDisbursementBatch` | **Connected** |
| `/payroll` | Statutory EPF ECR Generation | `/api/payroll/statutory/ecr/generate` | `POST` | `StatutoryReturnFiling` | **Connected** |
| `/payroll` | Statutory ESIC Return Generation | `/api/payroll/statutory/esic/generate` | `POST` | `StatutoryReturnFiling` | **Connected** |
| `/expenses` | Expense Claims & Reimbursements | `/api/expenses/claims` | `GET`, `POST` | `ExpenseClaim` | **Connected** |
| `/expenses` | Two-Tier Spend Approval | `/api/expenses/claims/:id/approve` | `POST` | `ExpenseClaim` | **Connected** |
| `/invoices` | Sales Invoice Management | `/api/invoices` | `GET`, `POST` | `Sale`, `SaleDetail` | **Connected** |
| `/pos` | Retail Point of Sale Terminal | `/api/sales` | `POST` | `Sale`, `SalePayment` | **Connected** |
| `/products` | Product Inventory Master | `/api/products` | `GET`, `POST`, `PUT` | `Product`, `Warehouse` | **Connected** |
| `/purchases` | Purchase Orders & Inbound Stock | `/api/purchases` | `GET`, `POST` | `Purchase`, `Supplier` | **Connected** |
| `/pipeline` | CRM Sales Leads & Pipeline | `/api/crm/leads` | `GET`, `POST`, `PUT` | `CrmLead` | **Connected** |
| `/projects` | Project Master List & Tracking | `/api/projects` | `GET`, `POST` | `Project`, `ProjectTask` | **Connected** |
| `/helpdesk` | Customer & Employee Tickets | `/api/helpdesk/tickets` | `GET`, `POST` | `HelpdeskTicket` | **Connected** |
| `/assets` | Corporate Hardware Assets | `/api/assets` | `GET`, `POST` | `Asset`, `AssetCategory` | **Connected** |
| `/recruitment` | Job Postings & Applications | `/api/recruitment/jobs` | `GET`, `POST` | `JobPosting`, `JobCandidate` | **Connected** |
| **`/todo`** | **Action Items & Todos** | **`/api/todos`** | `GET`, `POST`, `PUT`, `DELETE` | `WorkspaceTodo` | **TO IMPLEMENT** |
| **`/notes`** | **Workspace Notes & Docs** | **`/api/notes`** | `GET`, `POST`, `PUT`, `DELETE` | `WorkspaceNote` | **TO IMPLEMENT** |
| **`/calendar`** | **Company Calendar & Events** | **`/api/calendar/events`** | `GET`, `POST`, `PUT`, `DELETE` | `CalendarEvent` | **TO IMPLEMENT** |
| **`/crm-dashboard`** | **Live CRM Metrics & Leads** | **`/api/dashboard/sales-crm`** | `GET` | `Customer`, `Sale`, `CrmLead` | **TO CONNECT** |
| **`/project-dashboard`** | **Live Project & Task Stats** | **`/api/dashboard/projects`** | `GET` | `Project`, `ProjectTask` | **TO CONNECT** |
| **`/procurement-dashboard`** | **Live Purchasing & Supplier Stats** | **`/api/dashboard/procurement`** | `GET` | `Purchase`, `Supplier` | **TO CONNECT** |
| **`/support-dashboard`** | **Live Helpdesk Ticket Stats** | **`/api/dashboard/support`** | `GET` | `HelpdeskTicket` | **TO CONNECT** |
| **`/it-admin-dashboard`** | **Live IT Infrastructure Stats** | **`/api/dashboard/it-admin`** | `GET` | `Asset`, `BiometricDevice` | **TO CONNECT** |
| **`/recruitment-dashboard`** | **Live Hiring Pipeline Stats** | **`/api/dashboard/recruitment`** | `GET` | `JobPosting`, `JobCandidate` | **TO CONNECT** |
| **`/ai-attendance-insights`** | **Real Attendance Trend Series** | **`/api/dashboard/ai-attendance`** | `GET` | `Attendance` | **TO CONNECT** |
| **`/ai-payroll-forecast`** | **Historical & Projected Payroll** | **`/api/dashboard/ai-payroll`** | `GET` | `PayrollRun`, `Payslip` | **TO CONNECT** |
