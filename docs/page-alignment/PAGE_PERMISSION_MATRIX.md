# ROLE AND PERMISSION MATRIX

**Project:** Dreams ERP / Master HRMS  
**Audit & Alignment Phase:** Phase 4 Deliverable  
**Timestamp:** 2026-10-01  
**Status:** COMPLETE & VERIFIED  

---

## 1. Permission Matrix Architecture

Permissions in Dreams ERP follow a strict hierarchical namespace pattern:
`{module}.{resource}.{action}`

### Scope Taxonomy
* **`platform`**: Platform-wide access across all tenants (Super Admin only).
* **`tenant`**: Tenant-wide access restricted to authenticated `tenantId`.
* **`department`**: Department-level visibility restricted to assigned department.
* **`direct_reports`**: Restricted to employees reporting to the authenticated manager (`managerId == currentEmployee.id`).
* **`self`**: Strictly restricted to records belonging to the authenticated employee (`employeeId == currentEmployee.id` or `userId == req.user.userId`).

---

## 2. Granular Role & Permission Access Matrix

| Permission Key | Page / Feature | Route | Allowed Roles | Data Scope | Backend API Enforcement | UI Enforcement |
|---|---|---|---|---|---|---|
| `super_admin.access` | Platform Command Center | `/super/*` (27 pages) | `super_admin` | `platform` | `requireSuperAdmin` | `SuperShell` guard |
| `admin.settings.manage` | Tenant Settings & Org Profile | `/settings` | `Workspace Admin`, `admin`, `super_admin` | `tenant` | `requireRole("admin")` | `usePermissions().can("admin.settings.manage")` |
| `admin.users.manage` | User Accounts & Role Matrix | `/users` | `Workspace Admin`, `admin`, `super_admin` | `tenant` | `requireRole("admin")` | Permission gated |
| `admin.custom_fields.manage` | Custom Field Builder | `/custom-fields` | `Workspace Admin`, `admin`, `super_admin` | `tenant` | `requireRole("admin")` | Permission gated |
| `admin.integrations.manage` | Third-Party Sync Connectors | `/integrations`, `/shopify`, `/tally-importer` | `Workspace Admin`, `admin`, `super_admin` | `tenant` | `requireRole("admin")` | Permission gated |
| `admin.security.manage` | IT Admin & Security Telemetry | `/it-admin-dashboard`, `/ban-ip-address` | `Workspace Admin`, `admin`, `super_admin` | `tenant` | `requireRole("admin")` | Permission gated |
| `admin.subscription.manage` | Subscription & Billing Plan | `/subscription`, `/marketplace` | `Workspace Admin`, `admin`, `super_admin` | `tenant` | `requireRole("admin")` | Permission gated |
| `hrm.dashboard.view` | HRM Overview Dashboard | `/dashboard`, `/hrm` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `requireAuth` + `resolveTenantContext` | Sidebar filtering |
| `hrm.employees.view` | Employee Master Directory | `/employees`, `/employee-details` | `hr_admin`, `manager`, `admin`, `Workspace Admin`, `super_admin` | `tenant` (HR) / `department` (Manager) | `GET /api/employees` | Role gated |
| `hrm.employees.create` | Add New Employee Record | `/employees` (Add Modal) | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `POST /api/employees` | Action button hidden |
| `hrm.employees.edit` | Modify Employee Profile | `/employees` (Edit Modal) | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `PUT /api/employees/:id` | Action button hidden |
| `hrm.employees.delete` | Terminate / Archive Employee | `/employees`, `/termination` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `DELETE /api/employees/:id` | Action button hidden |
| `hrm.attendance.manage` | Attendance Console & Biometrics | `/attendance`, `/biometric`, `/daily-report` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `/api/attendance/*`, `/api/biometric/*` | Role gated |
| `hrm.attendance.punch` | Biometric Punch & Clock In/Out | `/attendance` (Punch Widget) | `employee`, `manager`, `hr_admin`, `admin` | `self` (`req.user.employeeId`) | `POST /api/attendance/punch` | Self-service button |
| `hrm.leave.manage` | Organization Leave Configuration | `/leave`, `/leave-report` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `/api/leave/*` | Tab visibility |
| `hrm.leave.apply` | Apply For Personal Leave | `/leave` (Apply Modal) | `employee`, `manager`, `hr_admin`, `admin` | `self` (`req.user.employeeId`) | `POST /api/leave/apply` | Self-service modal |
| `hrm.leave.approve` | Approve / Reject Leave Claims | `/leave` (Approvals Queue) | `manager`, `hr_admin`, `admin`, `super_admin` | `direct_reports` (Manager) / `tenant` (HR) | `POST /api/leave/:id/approve` | Approver queue |
| `hrm.shifts.manage` | Create Shift Rosters & Swaps | `/shifts`, `/shift-swap-requests` | `hr_admin`, `manager`, `admin`, `super_admin` | `tenant` (HR) / `department` (Manager) | `/api/shifts/*` | Role gated |
| `hrm.recruitment.manage` | Job Requisitions & Candidates | `/recruitment`, `/job-posting`, `/campus-hiring` | `hr_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `/api/recruitment/*` | Role gated |
| `finance.dashboard.view` | Financial Executive Dashboard | `/finance-dashboard` | `finance_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `GET /api/dashboard/finance` | Role gated |
| `finance.payroll.view` | View Payroll Snapshots | `/payroll`, `/payroll-dashboard` | `payroll_manager`, `finance_admin`, `admin`, `super_admin` | `tenant` | `GET /api/payroll/runs` | Role gated |
| `finance.payroll.run` | Execute Monthly Payroll Run | `/payroll` (Run Wizard) | `payroll_manager`, `admin`, `super_admin` | `tenant` | `POST /api/payroll/execute` | Run button protected |
| `finance.disbursement.execute` | Authorize Bank Disbursement | `/payroll` (Disbursement Tab) | `payroll_manager`, `finance_admin`, `admin`, `super_admin` | `tenant` | `POST /api/payroll/bank-disbursement` | Protected action |
| `finance.statutory.file` | Generate EPF / ESIC Statutory Files | `/payroll` (Statutory Tab) | `payroll_manager`, `finance_admin`, `admin`, `super_admin` | `tenant` | `GET /api/payroll/statutory-returns` | Protected action |
| `finance.payslip.self` | Download Personal Pay Slip | `/payroll` (My Payslips View) | `employee` | `self` (`req.user.employeeId`) | `GET /api/payroll/payslips/my` | Scoped endpoint |
| `finance.invoices.manage` | Create & Issue B2B Invoices | `/invoices`, `/recurring-invoices` | `finance_admin`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `/api/invoices/*` | Role gated |
| `finance.expenses.submit` | Submit Expense Reimbursement | `/expenses` (Claim Form) | `employee`, `manager`, `hr_admin`, `admin` | `self` (`req.user.employeeId`) | `POST /api/expenses` | Self-service button |
| `finance.expenses.approve` | Approve Expense Claims | `/expenses` (Review Queue) | `manager`, `finance_admin`, `admin`, `super_admin` | `direct_reports` (Manager) / `tenant` (Finance) | `POST /api/expenses/:id/approve` | Protected queue |
| `crm.leads.manage` | Lead Ingestion & Pipeline | `/crm`, `/crm-dashboard`, `/pipeline`, `/leads-dashboard` | `sales_manager`, `sales_agent`, `admin`, `super_admin` | `tenant` | `/api/crm/*` | Module permission |
| `inventory.products.manage` | Product Catalog & Stock Adjustments | `/products`, `/transfers`, `/adjustments`, `/purchases` | `inventory_manager`, `procurement_officer`, `admin`, `super_admin` | `tenant` | `/api/inventory/*`, `/api/purchases/*` | Module permission |
| `project.tasks.manage` | Project Kanban & Milestones | `/projects`, `/tasks`, `/task-board` | `manager`, `employee`, `admin`, `Workspace Admin`, `super_admin` | `tenant` | `/api/projects/*` | Scoped to assigned projects |
| `client.portal.view` | B2B Client Deliverable Portal | `/client-dashboard`, `/portal/*` | `client`, `admin`, `super_admin` | `self` (`req.user.clientId`) | Scoped client APIs | Client portal shell |
| `employee.self_service.view` | Employee Home Dashboard | `/employee-dashboard` | `employee`, `manager`, `hr_admin`, `admin` | `self` (`req.user.employeeId`) | `GET /api/dashboard/employee` | Dedicated ESS shell |

---

## 3. Self-Service Isolation Verification

To prevent unauthorized cross-employee data exposure:
1. **Payslips:** The API endpoint `GET /api/payroll/payslips/my` extracts `employeeId` from the verified JWT profile (`req.user.employeeId`), ignoring any client-supplied ID parameters.
2. **Attendance:** Check-in/check-out mutations (`POST /api/attendance/punch`) strictly stamp the authenticated user's `employeeId`.
3. **Leave Requests:** Creating leaves (`POST /api/leave/apply`) forces `employeeId: req.user.employeeId`.
4. **Expense Claims:** Expense claims are tied to `req.user.employeeId` upon insertion.
