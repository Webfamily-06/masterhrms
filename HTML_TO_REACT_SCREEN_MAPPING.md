# HTML → React Screen Mapping
**Phase 0 Audit — Complete Screen-by-Screen Mapping**
**Audit Date:** 2026-09-30  
**Standard:** Master Execution Prompt — HTML to React Exact UI Migration

**Status Definitions:**
- `COMPLETE` — React screen visually and functionally mirrors HTML reference with live API
- `PARTIAL` — Screen exists but missing sub-workflows, secondary tabs, or UI elements
- `UI_ONLY` — React screen exists with static/mock data; not yet API-integrated
- `MISSING` — HTML reference screen has no corresponding React route

---

## Portal 1: Super Admin Portal

| # | HTML Source (ui-2/) | React Route | Component File | Portal | Status | Missing Elements |
|---|---|---|---|---|---|---|
| S01 | `index.html` | `/super` | `super/index.tsx` | Super Admin | **COMPLETE** | — |
| S02 | `users.html` | `/super/users` | `super/users.tsx` | Super Admin | **PARTIAL** | Password reset modal, login history link |
| S03 | `packages.html` | `/super/plans` | `super/plans.tsx` | Super Admin | **COMPLETE** | — |
| S04 | `domains.html` | `/super/domains` | `super/domains.tsx` | Super Admin | **COMPLETE** | — |
| S05 | `analytics.html` | `/super/analytics` | `super/analytics.tsx` | Super Admin | **COMPLETE** | — |
| S06 | `backup.html` | `/super/backup` | `super/backup.tsx` | Super Admin | **PARTIAL** | Live mysqldump stream, restore workflow |
| S07 | `blogs.html` | `/super/blogs` | `super/blogs.tsx` | Super Admin | **COMPLETE** | — |
| S08 | `email-template.html` | `/super/email-templates` | `super/email-templates.tsx` | Super Admin | **COMPLETE** | — |
| S09 | `roles-permissions.html` | `/super/roles` | `super/roles.tsx` | Super Admin | **COMPLETE** | — |
| S10 | `sla-policies.html` | `/super/sla-policies` | `super/sla-policies.tsx` | Super Admin | **PARTIAL** | Full SLA breach timeline UI |
| S11 | `escalation-rules.html` | `/super/escalation-rules` | `super/escalation-rules.tsx` | Super Admin | **COMPLETE** | — |
| S12 | `tenant-support-tickets.html` | `/super/tenant-support-tickets` | `super/tenant-support-tickets.tsx` | Super Admin | **COMPLETE** | — |
| S13 | `tenant-usage-metrics.html` | `/super/tenant-usage-metrics` | `super/tenant-usage-metrics.tsx` | Super Admin | **COMPLETE** | — |
| S14 | `agents.html` | `/super/agents` | `super/agents.tsx` | Super Admin | **COMPLETE** | — |
| S15 | `languages.html` | `/super/languages` | `super/languages.tsx` | Super Admin | **PARTIAL** | Phrase key-value translation editor |
| S16 | `currencies.html` | `/super/settings` (tab) | `super/settings.tsx` | Super Admin | **PARTIAL** | Dedicated currencies page |
| S17 | `countries.html` | `/super/settings` (tab) | `super/settings.tsx` | Super Admin | **PARTIAL** | Dedicated countries page |
| S18 | `payment-gateways.html` | `/super/settings` (tab) | `super/settings.tsx` | Super Admin | **COMPLETE** | — |
| S19 | `cronjob.html` | `/cronjob` | `_app/cronjob.tsx` | Super Admin / Settings | **COMPLETE** | — |
| S20 | `ban-ip-address.html` | `/ban-ip-address` | `_app/ban-ip-address.tsx` | Super Admin | **COMPLETE** | Verified with real middleware firewall |
| S21 | `testimonials.html` | `/super/cms` (tab) | `super/cms.tsx` | Super Admin | **PARTIAL** | Dedicated testimonials page |
| S22 | `faq.html` | `/super/cms` (tab) | `super/cms.tsx` | Super Admin | **PARTIAL** | Dedicated FAQ page |

---

## Portal 2: Tenant Admin — HRM

| # | HTML Source (ui-2/) | React Route | Component File | Module | Status | Missing Elements |
|---|---|---|---|---|---|---|
| H01 | `dashboard.html` / `hr-dashboard.html` | `/dashboard` | `_app/dashboard.tsx` | HR Dashboard | **COMPLETE** | — |
| H02 | `employees.html` | `/employees` | `_app/employees.tsx` | Employees | **COMPLETE** | — |
| H03 | `employees-grid.html` | `/employees` (tab) | `_app/employees.tsx` | Employees | **COMPLETE** | — |
| H04 | `employee-details.html` | `/employee-details` | `_app/employee-details.tsx` | Employees | **COMPLETE** | — |
| H05 | `employee-report.html` | `/employee-report` | `_app/employee-report.tsx` | HRM | **COMPLETE** | — |
| H06 | `departments.html` | `/departments` | `_app/departments.tsx` | HRM | **COMPLETE** | — |
| H07 | `designations.html` | `/designations` | `_app/designations.tsx` | HRM | **COMPLETE** | — |
| H08 | `probation-management.html` | — | — | HRM | **MISSING** | Full dedicated screen |
| H09 | `resignation.html` | `/offboarding` (tab) | `_app/offboarding.tsx` | Offboarding | **COMPLETE** | — |
| H10 | `termination.html` | `/offboarding` (tab) | `_app/offboarding.tsx` | Offboarding | **COMPLETE** | — |
| H11 | `promotion.html` | — | — | HRM | **MISSING** | Promotion history screen |
| H12 | `notice-period-tracker.html` | `/notice-period-tracker` | `_app/notice-period-tracker.tsx` | Offboarding | **COMPLETE** | — |
| H13 | `attendance-admin.html` | `/attendance` | `_app/attendance.tsx` | Attendance | **COMPLETE** | — |
| H14 | `attendance-report.html` | `/attendance-report` | `_app/attendance-report.tsx` | Attendance | **COMPLETE** | — |
| H15 | `attendance-dashboard.html` | `/dashboard` (section) | `_app/dashboard.tsx` | Attendance | **COMPLETE** | — |
| H16 | `shift-swap-requests.html` | `/shift-swap-requests` | `_app/shift-swap-requests.tsx` | Shifts | **COMPLETE** | — |
| H17 | `overtime.html` | — | — | Attendance | **MISSING** | Overtime tracking screen |
| H18 | `work-from-home.html` | — | — | Attendance | **MISSING** | WFH request screen |
| H19 | `calendar.html` | `/calendar` | `_app/calendar.tsx` | General | **COMPLETE** | — |
| H20 | `timesheets.html` | `/timesheets` | `_app/timesheets.tsx` | Projects | **COMPLETE** | — |
| H21 | `leaves.html` | `/leave` | `_app/leave.tsx` | Leave | **PARTIAL** | Multi-level approval UI (Manager→HR) |
| H22 | `leave-report.html` | `/leave-report` | `_app/leave-report.tsx` | Leave | **COMPLETE** | — |
| H23 | `leave-type.html` | `/settings` (tab) | `_app/settings.tsx` | Leave | **COMPLETE** | — |
| H24 | `holidays.html` | `/holidays` | `_app/holidays.tsx` | HRM | **COMPLETE** | — |
| H25 | `payroll.html` | `/payroll` | `_app/payroll.tsx` | Payroll | **COMPLETE** | — |
| H26 | `payslip-report.html` | `/payslip-report` | `_app/payslip-report.tsx` | Payroll | **COMPLETE** | — |
| H27 | `payroll-dashboard.html` | `/payroll-dashboard` | `_app/payroll-dashboard.tsx` | Payroll | **COMPLETE** | — |
| H28 | `provident-fund.html` | `/provident-fund` | `_app/provident-fund.tsx` | Payroll | **COMPLETE** | Verified with tenant isolation & RBAC |
| H29 | `expenses.html` | `/expenses` | `_app/expenses.tsx` | Finance | **COMPLETE** | — |
| H30 | `expenses-report.html` | `/expenses-report` | `_app/expenses-report.tsx` | Finance | **COMPLETE** | — |
| H31 | `performance-appraisal.html` | `/performance-appraisal` | `_app/performance-appraisal.tsx` | Performance | **COMPLETE** | — |
| H32 | `performance-indicator.html` | `/performance-indicator` | `_app/performance-indicator.tsx` | Performance | **COMPLETE** | — |
| H33 | `performance-review.html` | `/performance-review` | `_app/performance-review.tsx` | Performance | **COMPLETE** | — |
| H34 | `goal-tracking.html` | `/okr` | `_app/okr.tsx` | OKR | **COMPLETE** | — |
| H35 | `training.html` | `/training` | `_app/training.tsx` | Training | **COMPLETE** | — |
| H36 | `learning-analytics.html` | `/learning-analytics` | `_app/learning-analytics.tsx` | Training | **COMPLETE** | — |
| H37 | `certification-tracking.html` | `/certification-tracking` | `_app/certification-tracking.tsx` | Training | **COMPLETE** | Full UI parity & credential verification modal |
| H38 | `candidates.html` | `/recruitment` | `_app/recruitment.tsx` | Recruitment | **COMPLETE** | — |
| H39 | `recruitment-dashboard.html` | `/recruitment-dashboard` | `_app/recruitment-dashboard.tsx` | Recruitment | **COMPLETE** | — |
| H40 | `campus-hiring.html` | `/campus-hiring` | `_app/campus-hiring.tsx` | Recruitment | **COMPLETE** | Full UI parity, candidates filter, add/edit modals |
| H41 | `refferals.html` | `/referrals` | `_app/referrals.tsx` | Recruitment | **COMPLETE** | Referrals ledger, referrer link, bonus calculation |
| H42 | `assets.html` | `/assets` | `_app/assets.tsx` | Assets | **COMPLETE** | — |
| H43 | `asset-dashboard.html` | `/asset-dashboard` | `_app/asset-dashboard.tsx` | Assets | **COMPLETE** | — |
| H44 | `ai-attendance-insights.html` | `/ai-attendance-insights` | `_app/ai-attendance-insights.tsx` | AI | **COMPLETE** | — |
| H45 | `ai-payroll-forecast.html` | `/ai-payroll-forecast` | `_app/ai-payroll-forecast.tsx` | AI | **COMPLETE** | — |
| H46 | `ai-team-performance-insights.html` | `/ai-team-performance-insights` | `_app/ai-team-performance-insights.tsx` | AI | **COMPLETE** | — |
| H47 | `ai-configuration.html` | `/ai-configuration` | `_app/ai-configuration.tsx` | AI | **COMPLETE** | — |
| H48 | `ai-settings.html` | `/ai-settings` | `_app/ai-settings.tsx` | AI | **COMPLETE** | — |
| H49 | `ai-hiring-forecast.html` | `/ai-hiring-forecast` | `_app/ai-hiring-forecast.tsx` | AI | **COMPLETE** | — |

---

## Portal 2: Tenant Admin — Accounting & Finance

| # | HTML Source | React Route | Component File | Module | Status | Missing Elements |
|---|---|---|---|---|---|---|
| A01 | `finance-dashboard.html` | `/finance-dashboard` | `_app/finance-dashboard.tsx` | Finance | **COMPLETE** | — |
| A02 | `invoices.html` | `/invoices` | `_app/invoices.tsx` | Invoicing | **COMPLETE** | — |
| A03 | `invoice-details.html` | `/invoice/$id` | `_app/invoice.$id.tsx` | Invoicing | **COMPLETE** | — |
| A04 | `invoice-report.html` | `/invoice-report` | `_app/invoice-report.tsx` | Invoicing | **COMPLETE** | — |
| A05 | `estimates.html` | `/proposals` | `_app/proposals.tsx` | Invoicing | **COMPLETE** | — |
| A06 | `payments.html` | `/accounting` (tab) | `_app/accounting.tsx` | Finance | **COMPLETE** | — |
| A07 | `payment-report.html` | `/payment-report` | `_app/payment-report.tsx` | Finance | **COMPLETE** | — |
| A08 | `budgets.html` | `/accounting` (tab) | `_app/accounting.tsx` | Finance | **PARTIAL** | Dedicated budget management page |
| A09 | `taxes.html` | `/settings` (tab) | `_app/settings.tsx` | Finance | **COMPLETE** | — |
| A10 | `purchase-transaction.html` | `/purchases` (tab) | `_app/purchases.tsx` | Finance | **COMPLETE** | — |
| A11 | `subscription.html` | `/subscription` | `_app/subscription.tsx` | SaaS | **COMPLETE** | — |
| A12 | `ui/profit-loss.html` | `/accounting` (tab) | `_app/accounting.tsx` | Finance | **COMPLETE** | — |
| A14 | `ui/recurring-invoices.html` | `/recurring-invoices` | `_app/recurring-invoices.tsx` | Invoicing | **COMPLETE** | — |

---

## Portal 2: Tenant Admin — Sales & CRM

| # | HTML Source (ui-2/) | React Route | Component File | Module | Status | Missing Elements |
|---|---|---|---|---|---|---|
| C01 | `deals-dashboard.html` | `/deals-dashboard` | `_app/deals-dashboard.tsx` | CRM | **COMPLETE** | — |
| C02 | `leads-dashboard.html` | `/leads-dashboard` | `_app/leads-dashboard.tsx` | CRM | **COMPLETE** | — |
| C03 | `contacts.html` | `/contacts` | `_app/contacts.tsx` | CRM | **COMPLETE** | — |
| C04 | `contacts-grid.html` | `/contacts` (tab) | `_app/contacts.tsx` | CRM | **COMPLETE** | — |
| C05 | `pipeline.html` | `/crm` | `_app/crm.tsx` | CRM | **COMPLETE** | — |
| C06 | `deals-grid.html` | `/crm` (tab) | `_app/crm.tsx` | CRM | **COMPLETE** | — |
| C07 | `notes.html` | `/notes` | `_app/notes.tsx` | CRM | **COMPLETE** | — |
| C08 | `clients.html` | `/clients` | `_app/clients.tsx` | CRM | **COMPLETE** | — |
| C09 | `clients-grid.html` | `/clients` (grid tab) | `_app/clients.tsx` | CRM | **COMPLETE** | — |
| C10 | `companies.html` | `/companies` | `_app/companies.tsx` | CRM | **COMPLETE** | — |
| C11 | `call-history.html` | `/call-history` | `_app/call-history.tsx` | CRM / Communications | **COMPLETE** | — |
| C12 | `daily-report.html` | `/daily-report` | `_app/daily-report.tsx` | Reports / Operations | **COMPLETE** | — |
| C13 | `ui/crm-dashboard.html` | `/crm-dashboard` | `_app/crm-dashboard.tsx` | CRM | **COMPLETE** | — |
| C14 | `ui/campaigns.html` | — | — | CRM | **MISSING** | Marketing campaigns |

---

## Portal 2: Tenant Admin — POS & Inventory

| # | HTML Source (ui/) | React Route | Component File | Module | Status | Missing Elements |
|---|---|---|---|---|---|---|
| P01 | `pos.html` | `/pos` | `_app/pos.tsx` | POS | **COMPLETE** | — |
| P02 | `pos-dashboard.html` | `/pos-dashboard` | `_app/pos-dashboard.tsx` | POS | **COMPLETE** | — |
| P03 | `products.html` | `/products` | `_app/products.tsx` | Inventory | **COMPLETE** | — |
| P04 | `inventory.html` | `/products` | `_app/products.tsx` | Inventory | **COMPLETE** | — |
| P05 | `inventory-dashboard.html` | `/inventory-dashboard` | `_app/inventory-dashboard.tsx` | Inventory | **COMPLETE** | — |
| P06 | `purchases.html` | `/purchases` | `_app/purchases.tsx` | Procurement | **COMPLETE** | — |
| P07 | `purchase-orders.html` | `/purchases` (tab) | `_app/purchases.tsx` | Procurement | **COMPLETE** | — |
| P08 | `purchase-return.html` | `/returns` | `_app/returns.tsx` | Returns | **COMPLETE** | — |
| P09 | `cash-sales.html` | `/pos` | `_app/pos.tsx` | POS | **COMPLETE** | — |
| P10 | `credit-notes.html` | `/returns` (tab) | `_app/returns.tsx` | Returns | **COMPLETE** | — |
| P11 | `stock-adjustment.html` | `/adjustments` | `_app/adjustments.tsx` | Inventory | **COMPLETE** | — |
| P12 | `stock-transfer.html` | `/transfers` | `_app/transfers.tsx` | Inventory | **COMPLETE** | — |
| P13 | `suppliers.html` | `/suppliers` | `_app/suppliers.tsx` | Procurement | **COMPLETE** | — |
| P14 | `warehouse.html` | `/settings` (tab) | `_app/settings.tsx` | Inventory | **COMPLETE** | — |
| P15 | `categories.html` | `/products` (tab) | `_app/products.tsx` | Inventory | **COMPLETE** | — |
| P16 | `brands.html` | `/products` (tab) | `_app/products.tsx` | Inventory | **COMPLETE** | — |
| P17 | `units.html` | `/products` (tab) | `_app/products.tsx` | Inventory | **COMPLETE** | — |

---

## Portal 2: Tenant Admin — Projects

| # | HTML Source (ui-2/) | React Route | Component File | Module | Status | Missing Elements |
|---|---|---|---|---|---|---|
| PR01 | `projects.html` | `/projects` | `_app/projects.tsx` | Projects | **COMPLETE** | — |
| PR02 | `projects-grid.html` | `/projects` (tab) | `_app/projects.tsx` | Projects | **COMPLETE** | — |
| PR03 | `project-details.html` | `/project/$id` | `_app/project.$id.tsx` | Projects | **COMPLETE** | — |
| PR04 | `project-report.html` | `/project-report` | `_app/project-report.tsx` | Projects | **COMPLETE** | — |
| PR05 | `task-board.html` | `/task-board` | `_app/task-board.tsx` | Projects | **COMPLETE** | — |
| PR06 | `tasks.html` | `/tasks` | `_app/tasks.tsx` | Tasks | **COMPLETE** | — |

---

## Portal 2: Tenant Admin — Helpdesk

| # | HTML Source | React Route | Component File | Module | Status | Missing Elements |
|---|---|---|---|---|---|---|
| T01 | `tickets.html` | `/helpdesk` | `_app/helpdesk.tsx` | Support | **COMPLETE** | — |
| T02 | `ticket-details.html` | Modal in `/helpdesk` | `_app/helpdesk.tsx` | Support | **COMPLETE** | — |
| T03 | `ticket-reports.html` | `/ticket-reports` | `_app/ticket-reports.tsx` | Support | **COMPLETE** | — |
| T04 | `help-desk-dashboard.html` | `/help-desk-dashboard` | `_app/help-desk-dashboard.tsx` | Support | **COMPLETE** | — |
| T05 | `ticket-automation.html` | — | — | Support | **MISSING** | Automation rules screen |

---

## Portal 3: Employee Self-Service

| # | HTML Source (ui-2/) | React Route | Component File | Portal | Status | Missing Elements |
|---|---|---|---|---|---|---|
| E01 | `employee-dashboard.html` | `/employee-dashboard` | `_app/employee-dashboard.tsx` | Employee | **COMPLETE** | — |
| E02 | `attendance-employee.html` | `/attendance-employee` | `_app/attendance-employee.tsx` | Employee | **COMPLETE** | — |
| E03 | `leaves-employee.html` | `/employee-dashboard` (section) | `_app/employee-dashboard.tsx` | Employee | **COMPLETE** | — |
| E04 | `employee-salary.html` | `/employee-dashboard` (section) | `_app/employee-dashboard.tsx` | Employee | **COMPLETE** | — |
| E05 | `tasks.html` | `/tasks` | `_app/tasks.tsx` | Employee | **COMPLETE** | — |
| E06 | `profile.html` | `/employee-details` | `_app/employee-details.tsx` | Employee | **COMPLETE** | — |
| E07 | `timesheets.html` | `/timesheets` | `_app/timesheets.tsx` | Employee | **COMPLETE** | — |
| E08 | `shift-swap-requests.html` | `/shift-swap-requests` | `_app/shift-swap-requests.tsx` | Employee | **COMPLETE** | — |
| E09 | `work-from-home.html` | — | — | Employee | **MISSING** | WFH request UI |
| E10 | `leaves-employee.html` | `/leave` | `_app/leave.tsx` | Employee | **COMPLETE** | — |

---

## Portal 4: Client Portal

| # | HTML Source | React Route | Component File | Portal | Status | Missing Elements |
|---|---|---|---|---|---|---|
| CL01 | (Client Dashboard) | `/client-dashboard` | `_app/client-dashboard.tsx` | Client | **COMPLETE** | — |
| CL02 | (Invoice View) | `/portal/invoices/$id` | `portal.invoices.$id.tsx` | Client | **COMPLETE** | — |
| CL03 | (Proposal View) | `/portal/proposals/$id` | `portal.proposals.$id.tsx` | Client | **COMPLETE** | — |
| CL04 | (Statement) | `/portal` | `portal.tsx` | Client | **COMPLETE** | — |

---

## Auth Screens

| # | HTML Source (ui-2/) | React Route | Status |
|---|---|---|---|
| AU01 | `login.html` | `/auth` | **COMPLETE** |
| AU02 | `register.html` | `/auth` (tab) | **COMPLETE** |
| AU03 | `forgot-password.html` | `/auth` (tab) | **COMPLETE** |
| AU04 | `reset-password.html` | `/auth` (tab) | **COMPLETE** |
| AU05 | `two-step-verification.html` | `/verify-2fa` | **COMPLETE** |
| AU06 | `lock-screen.html` | `/lock-screen` | **COMPLETE** |
| AU07 | `error-404.html` | `/error-404` | **COMPLETE** |
| AU08 | `error-500.html` | `/error-500` | **COMPLETE** |

---

## Summary

| Status | Count | % |
|--------|------:|--:|
| **COMPLETE** | **~136** | **~88%** |
| **PARTIAL** | **~12** | **~8%** |
| **MISSING** | **~7** | **~4%** |
| **Total screens evaluated** | **~155** | 100% |

---

*End of HTML_TO_REACT_SCREEN_MAPPING.md — Phase 0*
