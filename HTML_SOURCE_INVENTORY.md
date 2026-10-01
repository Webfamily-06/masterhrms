# HTML Source Inventory — Phase 0 Audit
**Audit Date:** 2026-09-30  
**Auditor:** Antigravity AI — Phase 0 Automated Discovery  
**Source Directories:**
- `ui/` — Dreams ERP/POS Template Suite (232 HTML files, older generation, Bootstrap-based)
- `ui-2/` — SmartHR Enterprise Template Suite (289 HTML files, newer generation, primary reference)
- `main-file/` — Laravel Inertia App (behavioral source of truth, not HTML templates)

> **`ui-2/` is the PRIMARY HTML source of truth for UI parity.**  
> `ui/` is a supplementary reference for ERP/POS-specific screens not present in `ui-2/`.  
> `main-file/` is the source of truth for business logic, validation, and API behavior — NOT visual design.

---

## 1. ui-2/ — SmartHR Template Suite (289 files)

### 1.1 Dashboards
| File | Module | Portal | Notes |
|------|--------|--------|-------|
| `index.html` | Super Admin Dashboard | Super Admin | Primary super admin overview |
| `dashboard.html` | HR/Tenant Dashboard | Tenant Admin | Main tenant ERP dashboard |
| `hr-dashboard.html` | HR Overview | Tenant Admin | HR-focused variant |
| `employee-dashboard.html` | Employee ESS Home | Employee | Self-service home |
| `attendance-dashboard.html` | Attendance Dashboard | Tenant Admin | Attendance analytics |
| `payroll-dashboard.html` | Payroll Dashboard | Tenant Admin | Payroll run overview |
| `asset-dashboard.html` | Asset Dashboard | Tenant Admin | Asset KPIs |
| `recruitment-dashboard.html` | Recruitment Dashboard | Tenant Admin | ATS pipeline |
| `deals-dashboard.html` | Deals Dashboard | CRM | CRM deals pipeline |
| `leads-dashboard.html` | Leads Dashboard | CRM | CRM leads pipeline |
| `finance-dashboard.html` | Finance Dashboard | Tenant Admin | Accounting overview |
| `help-desk-dashboard.html` | Help Desk Dashboard | Support | Ticket overview |
| `it-admin-dashboard.html` | IT Admin Dashboard | IT | IT operations |

### 1.2 HRM — Employee Management
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `employees.html` | Employee Directory (Table) | Tenant Admin | Has React route |
| `employees-grid.html` | Employee Directory (Grid) | Tenant Admin | Has React route (tab) |
| `employee-details.html` | Employee Profile Passport | Tenant Admin | Has React route |
| `employee-salary.html` | Employee Salary View | Employee | Integrated in employee-details |
| `employee-report.html` | Employee Report | Tenant Admin | Has React route |
| `departments.html` | Departments | Tenant Admin | Has React route |
| `designations.html` | Designations | Tenant Admin | Has React route |
| `probation-management.html` | Probation Tracker | Tenant Admin | ⚠️ MISSING React route |
| `resignation.html` | Resignation Management | Tenant Admin | Integrated in offboarding |
| `termination.html` | Termination Records | Tenant Admin | Integrated in offboarding |
| `promotion.html` | Promotion Records | Tenant Admin | ⚠️ MISSING React route |

### 1.3 HRM — Attendance & Time
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `attendance-admin.html` | Admin Attendance | Tenant Admin | Has React route |
| `attendance-employee.html` | Employee Attendance | Employee | Has React route |
| `attendance-report.html` | Attendance Report | Tenant Admin | Has React route |
| `shift-swap-requests.html` | Shift Swap Requests | Tenant Admin | Has React route |
| `overtime.html` | Overtime Tracking | Tenant Admin | ⚠️ MISSING React route |
| `schedule-timing.html` | Shift Schedule | Tenant Admin | Integrated in shifts |
| `work-from-home.html` | WFH Requests | Employee | ⚠️ MISSING React route |
| `notice-period-tracker.html` | Notice Period Tracker | Tenant Admin | Has React route |
| `timesheets.html` | Timesheets | Employee | Has React route |
| `calendar.html` | Calendar | All | Has React route |
| `holiday-calendar.html` | Holiday Calendar | All | Integrated in holidays |

### 1.4 HRM — Leave Management
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `leaves.html` | Leave Requests (Admin) | Tenant Admin | Has React route |
| `leaves-employee.html` | Leave (Employee) | Employee | Integrated in employee-dashboard |
| `leave-report.html` | Leave Report | Tenant Admin | Has React route |
| `leave-type.html` | Leave Types | Tenant Admin | Integrated in settings |
| `holidays.html` | Holidays | Tenant Admin | Has React route |

### 1.5 HRM — Payroll & Compensation
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `payroll.html` | Payroll Runs | Tenant Admin | Has React route |
| `payslip.html` | Payslip View | Employee | Integrated in payroll |
| `payslip-report.html` | Payslip Report | Tenant Admin | Has React route |
| `salary-settings.html` | Salary Settings | Tenant Admin | Integrated in settings |
| `provident-fund.html` | Provident Fund | Tenant Admin | ⚠️ MISSING React route |
| `expenses.html` | Expenses | Tenant Admin | Has React route |
| `expenses-report.html` | Expenses Report | Tenant Admin | Has React route |
| `budgets.html` | Budgets | Tenant Admin | Integrated in accounting |
| `budget-expenses.html` | Budget Expenses | Tenant Admin | Integrated in accounting |
| `budget-revenues.html` | Budget Revenues | Tenant Admin | Integrated in accounting |

### 1.6 HRM — Performance & Training
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `performance-appraisal.html` | Performance Appraisals | Tenant Admin | Has React route |
| `performance-indicator.html` | KPI Indicators | Tenant Admin | Has React route |
| `performance-review.html` | Performance Reviews | Manager | Has React route |
| `goal-tracking.html` | Goal Tracking (OKR) | Tenant Admin | Integrated in OKR |
| `goal-type.html` | Goal Types | Tenant Admin | Integrated in settings |
| `training.html` | Training Programs | Tenant Admin | Has React route |
| `trainers.html` | Trainers | Tenant Admin | Integrated in training |
| `training-type.html` | Training Types | Tenant Admin | Integrated in settings |
| `learning-analytics.html` | Learning Analytics | Tenant Admin | Has React route |
| `certification-tracking.html` | Certification Tracking | Employee | ⚠️ MISSING React route |

### 1.7 HRM — Recruitment
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `candidates.html` | Candidates (Table) | Tenant Admin | Has React route |
| `candidates-grid.html` | Candidates (Grid) | Tenant Admin | Integrated in recruitment |
| `job-list.html` | Job Listings | Tenant Admin | Has React route |
| `job-grid.html` | Job Listings (Grid) | Tenant Admin | Integrated in recruitment |
| `campus-hiring.html` | Campus Hiring | Tenant Admin | ⚠️ MISSING React route |
| `resume-parsing.html` | Resume Parsing | Tenant Admin | Partially in ai-ocr.tsx |
| `refferals.html` | Referrals | Tenant Admin | ⚠️ MISSING React route |

### 1.8 Assets
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `assets.html` | Asset Registry | Tenant Admin | Has React route |
| `asset-dashboard.html` | Asset Dashboard | Tenant Admin | Has React route |
| `asset-categories.html` | Asset Categories | Tenant Admin | Integrated in settings/assets |

### 1.9 Projects & Tasks
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `projects.html` | Projects (Table) | Tenant Admin | Has React route |
| `projects-grid.html` | Projects (Grid) | Tenant Admin | Integrated in projects |
| `project-details.html` | Project Details | Tenant Admin | Has React route (`/project/$id`) |
| `project-report.html` | Project Report | Tenant Admin | Has React route |
| `tasks.html` | My Tasks | Employee | Has React route |
| `task-board.html` | Task Board (Global Kanban) | Tenant Admin | ⚠️ PARTIAL — scoped to project only |
| `timesheets.html` | Timesheets | Employee | Has React route |

### 1.10 CRM
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `contacts.html` | Contacts (Table) | CRM | Has React route |
| `contacts-grid.html` | Contacts (Grid) | CRM | Integrated in contacts |
| `clients.html` | Clients (Table) | CRM | ⚠️ MISSING dedicated React route |
| `clients-grid.html` | Clients (Grid) | CRM | ⚠️ MISSING dedicated React route |
| `companies.html` | Companies | CRM | ⚠️ MISSING React route |
| `deals-grid.html` | Deals (Grid) | CRM | Integrated in crm.tsx |
| `pipeline.html` | CRM Pipeline Kanban | CRM | Integrated in crm.tsx |
| `notes.html` | CRM Notes | CRM | Has React route (`/notes.tsx`) |
| `call-history.html` | Call History | CRM | ⚠️ MISSING React route |
| `daily-report.html` | Daily Report | CRM | ⚠️ MISSING React route |

### 1.11 Invoicing & Finance
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `invoices.html` | Invoices List | Tenant Admin | Has React route |
| `invoice-details.html` | Invoice Details | Tenant Admin | Has React route (`/invoice/$id`) |
| `invoice-report.html` | Invoice Report | Tenant Admin | Has React route |
| `estimates.html` | Estimates/Quotes | Tenant Admin | Has React route (`/proposals`) |
| `payments.html` | Payments | Tenant Admin | Integrated in accounting |
| `payment-report.html` | Payment Report | Tenant Admin | Has React route |
| `finance-dashboard.html` | Finance Dashboard | Tenant Admin | Has React route |
| `taxes.html` | Taxes | Tenant Admin | Integrated in settings |
| `purchase-transaction.html` | Purchase Transactions | Tenant Admin | Integrated in purchases |
| `subscription.html` | Subscription | Tenant Admin | Has React route |

### 1.12 Support / Helpdesk
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `tickets.html` | Support Tickets | Support | Has React route (`/helpdesk`) |
| `ticket-details.html` | Ticket Details | Support | Modal in helpdesk |
| `ticket-reports.html` | Ticket Reports | Support | Has React route |
| `ticket-automation.html` | Ticket Automation | Support | ⚠️ MISSING React route |
| `sla-policies.html` | SLA Policies | Super Admin | Has React route (`/super/sla-policies`) |
| `escalation-rules.html` | Escalation Rules | Super Admin | Has React route |
| `tenant-support-tickets.html` | Tenant Support | Super Admin | Has React route |
| `tenant-usage-metrics.html` | Usage Metrics | Super Admin | Has React route |

### 1.13 AI Features
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `ai-attendance-insights.html` | AI Attendance Insights | Tenant Admin | Has React route |
| `ai-payroll-forecast.html` | AI Payroll Forecast | Tenant Admin | Has React route |
| `ai-team-performance-insights.html` | AI Team Performance | Tenant Admin | Has React route |
| `ai-configuration.html` | AI Configuration | Tenant Admin | Has React route |
| `ai-settings.html` | AI Settings | Tenant Admin | Has React route |
| `ai-hiring-forecast.html` | AI Hiring Forecast | Tenant Admin | ⚠️ MISSING React route |

### 1.14 Super Admin
| File | Module | Portal | Status |
|------|--------|--------|--------|
| `index.html` | Super Admin Dashboard | Super Admin | Has React route (`/super`) |
| `users.html` | Platform Users | Super Admin | Has React route |
| `packages.html` | Subscription Plans | Super Admin | Has React route |
| `domains.html` | Custom Domains | Super Admin | Has React route |
| `analytics.html` | Platform Analytics | Super Admin | Has React route |
| `backup.html` | Database Backups | Super Admin | Has React route |
| `blogs.html` | Blog Management | Super Admin | Has React route |
| `blog-categories.html` | Blog Categories | Super Admin | Integrated in blogs |
| `countries.html` | Countries | Super Admin | Integrated in settings |
| `currencies.html` | Currencies | Super Admin | Integrated in settings |
| `roles-permissions.html` | Roles & Permissions | Super Admin | Has React route |
| `email-template.html` | Email Templates | Super Admin | Has React route |
| `sla-policies.html` | SLA Policies | Super Admin | Has React route |
| `escalation-rules.html` | Escalation Rules | Super Admin | Has React route |
| `tenant-support-tickets.html` | Tenant Support Tickets | Super Admin | Has React route |
| `tenant-usage-metrics.html` | Tenant Usage Metrics | Super Admin | Has React route |
| `agents.html` | Support Agents | Super Admin | Has React route |
| `subscription.html` | Subscriptions | Super Admin | Integrated in plans |
| `payment-gateways.html` | Payment Gateways | Super Admin | Integrated in settings |
| `cronjob.html` | Cron Jobs | Super Admin | ⚠️ MISSING React route |
| `clear-cache.html` | Clear Cache | Super Admin | ⚠️ MISSING React route |
| `ban-ip-address.html` | Ban IP Address | Super Admin | ⚠️ MISSING React route |
| `custom-fields.html` | Custom Fields | Tenant Admin | ⚠️ MISSING React route |

---

## 2. ui/ — Dreams ERP/POS Template (232 files — Supplementary)

Key unique screens not in ui-2/:
| File | Module | Status |
|------|--------|--------|
| `pos.html` | POS Terminal | Has React route |
| `pos-dashboard.html` | POS Dashboard | Has React route |
| `pos-orders.html` | POS Orders | Integrated in pos-dashboard |
| `inventory.html` | Inventory | Has React route (`/products`) |
| `inventory-dashboard.html` | Inventory Dashboard | Has React route |
| `purchase-orders.html` | Purchase Orders | Has React route (`/purchases`) |
| `purchase-return.html` | Purchase Returns | Has React route (`/returns`) |
| `sales-orders.html` | Sales Orders | Integrated in invoices/sales |
| `cash-sales.html` | Cash Sales (POS) | Integrated in pos.tsx |
| `suppliers.html` | Suppliers | Has React route |
| `barcode-print.html` | Barcode Print | Has React route (in products) |
| `qr-code-print.html` | QR Code Print | Integrated in assets |
| `warehouse.html` | Warehouses | Integrated in settings |
| `stock-adjustment.html` | Stock Adjustments | Has React route |
| `stock-transfer.html` | Stock Transfers | Has React route |
| `categories.html` | Product Categories | Integrated in products |
| `brands.html` | Brands | Integrated in products |
| `units.html` | Units of Measure | Integrated in products |
| `asset-register.html` | Asset Register | Has React route (`/assets`) |
| `depreciation.html` | Asset Depreciation | Integrated in assets |
| `disposal.html` | Asset Disposal | Integrated in assets |
| `assignments.html` | Asset Assignments | Integrated in assets |
| `credit-notes.html` | Credit Notes | Has React route (`/returns`) |
| `recurring-invoices.html` | Recurring Invoices | ⚠️ PARTIAL — No dedicated route |
| `cashflow.html` | Cash Flow Statement | Integrated in accounting |
| `profit-loss.html` | P&L Statement | Integrated in accounting |
| `budgeting.html` | Budgeting | Integrated in accounting |
| `crm-dashboard.html` | CRM Dashboard | Has React route |
| `campaigns.html` | Marketing Campaigns | ⚠️ MISSING React route |

---

## 3. Summary of Missing / Partial HTML Screens

### MISSING — No React Route Exists
| HTML Source | Module | Priority |
|-------------|--------|----------|
| `ui-2/probation-management.html` | Probation Tracker | Medium |
| `ui-2/promotion.html` | Promotion Records | Medium |
| `ui-2/overtime.html` | Overtime Tracking | High |
| `ui-2/work-from-home.html` | WFH Requests | Medium |
| `ui-2/provident-fund.html` | Provident Fund | High |
| `ui-2/certification-tracking.html` | Certification Tracking | Low |
| `ui-2/campus-hiring.html` | Campus Hiring | Low |
| `ui-2/refferals.html` | Recruitment Referrals | Low |
| `ui-2/clients.html` | Client Directory | High |
| `ui-2/companies.html` | Company Management | High |
| `ui-2/call-history.html` | CRM Call History | Medium |
| `ui-2/daily-report.html` | CRM Daily Report | Low |
| `ui-2/ticket-automation.html` | Ticket Automation | Low |
| `ui-2/ai-hiring-forecast.html` | AI Hiring Forecast | Low |
| `ui-2/cronjob.html` | Cron Jobs | Low |
| `ui-2/ban-ip-address.html` | IP Ban Management | Low |
| `ui-2/custom-fields.html` | Custom Fields | Medium |
| `ui/campaigns.html` | Marketing Campaigns | Low |
| `ui/recurring-invoices.html` | Recurring Invoices | Medium |

### PARTIAL — React Route Exists but Incomplete
| HTML Source | React Route | Missing Elements |
|-------------|-------------|-----------------|
| `ui-2/task-board.html` | Project-scoped tasks | Global cross-project Kanban |
| `ui-2/leaves.html` | `/leave` | Multi-level approval UI |
| `ui-2/shifts.html` | `/shifts` | Shift swap integration |
| `ui-2/sla-policies.html` | `/super/sla-policies` | Full SLA timeline UI |
| `ui-2/backup.html` | `/super/backup` | Live MySQL restore workflow |
| `ui-2/languages.html` | `/super/languages` | Key-value phrase editor |

---

*End of HTML_SOURCE_INVENTORY.md — Phase 0*
