# UI Migration Status Tracker
**Phase 0 → Phase 1 → Phase 2 → Phase 3**
**Last Updated:** 2026-09-30

**Status Codes:**
- `NOT_STARTED` — No work begun
- `AUDITED` — HTML source inspected, React route identified
- `UI_IN_PROGRESS` — React implementation underway
- `UI_READY_FOR_REVIEW` — Implementation done, pending visual comparison
- `UI_APPROVED` — Visual parity confirmed, API integration approved to begin
- `API_IN_PROGRESS` — Real backend data being connected
- `API_READY_FOR_REVIEW` — API integration done, pending functional review
- `TESTING` — Regression and integration tests running
- `COMPLETE` — UI approved, API integrated, tests passing
- `BLOCKED` — Dependency or gap preventing progress

---

## 🟢 COMPLETE Screens (Production-Ready)

| # | Screen | HTML Source | React Route | UI | API | Tests |
|---|--------|-------------|-------------|:--:|:---:|:-----:|
| 1 | Super Admin Dashboard | `ui-2/index.html` | `/super` | ✅ | ✅ | — |
| 2 | Subscription Plans | `ui-2/packages.html` | `/super/plans` | ✅ | ✅ | — |
| 3 | Custom Domains | `ui-2/domains.html` | `/super/domains` | ✅ | ✅ | — |
| 4 | Platform Analytics | `ui-2/analytics.html` | `/super/analytics` | ✅ | ✅ | — |
| 5 | Blog Management | `ui-2/blogs.html` | `/super/blogs` | ✅ | ✅ | — |
| 6 | Email Templates | `ui-2/email-template.html` | `/super/email-templates` | ✅ | ✅ | — |
| 7 | Roles & Permissions | `ui-2/roles-permissions.html` | `/super/roles` | ✅ | ✅ | — |
| 8 | Escalation Rules | `ui-2/escalation-rules.html` | `/super/escalation-rules` | ✅ | ✅ | — |
| 9 | Tenant Support Tickets | `ui-2/tenant-support-tickets.html` | `/super/tenant-support-tickets` | ✅ | ✅ | — |
| 10 | Tenant Usage Metrics | `ui-2/tenant-usage-metrics.html` | `/super/tenant-usage-metrics` | ✅ | ✅ | — |
| 11 | Support Agents | `ui-2/agents.html` | `/super/agents` | ✅ | ✅ | — |
| 12 | HR/Tenant Dashboard | `ui-2/dashboard.html` | `/dashboard` | ✅ | ✅ | — |
| 13 | Employee Directory | `ui-2/employees.html` | `/employees` | ✅ | ✅ | — |
| 14 | Employee Profile Passport | `ui-2/employee-details.html` | `/employee-details` | ✅ | ✅ | — |
| 15 | Employee Report | `ui-2/employee-report.html` | `/employee-report` | ✅ | ✅ | — |
| 16 | Departments | `ui-2/departments.html` | `/departments` | ✅ | ✅ | — |
| 17 | Designations | `ui-2/designations.html` | `/designations` | ✅ | ✅ | — |
| 18 | Notice Period Tracker | `ui-2/notice-period-tracker.html` | `/notice-period-tracker` | ✅ | ✅ | — |
| 19 | Offboarding (Resign/Terminate) | `ui-2/resignation.html` | `/offboarding` | ✅ | ✅ | — |
| 20 | Admin Attendance | `ui-2/attendance-admin.html` | `/attendance` | ✅ | ✅ | — |
| 21 | Attendance Report | `ui-2/attendance-report.html` | `/attendance-report` | ✅ | ✅ | — |
| 22 | Shift Swap Requests | `ui-2/shift-swap-requests.html` | `/shift-swap-requests` | ✅ | ✅ | — |
| 23 | Calendar | `ui-2/calendar.html` | `/calendar` | ✅ | ✅ | — |
| 24 | Timesheets | `ui-2/timesheets.html` | `/timesheets` | ✅ | ✅ | — |
| 25 | Leave Report | `ui-2/leave-report.html` | `/leave-report` | ✅ | ✅ | — |
| 26 | Holidays | `ui-2/holidays.html` | `/holidays` | ✅ | ✅ | — |
| 27 | Payroll Runs | `ui-2/payroll.html` | `/payroll` | ✅ | ✅ | — |
| 28 | Payslip Report | `ui-2/payslip-report.html` | `/payslip-report` | ✅ | ✅ | — |
| 29 | Payroll Dashboard | `ui-2/payroll-dashboard.html` | `/payroll-dashboard` | ✅ | ✅ | — |
| 30 | Expenses | `ui-2/expenses.html` | `/expenses` | ✅ | ✅ | — |
| 31 | Expenses Report | `ui-2/expenses-report.html` | `/expenses-report` | ✅ | ✅ | — |
| 32 | Performance Appraisals | `ui-2/performance-appraisal.html` | `/performance-appraisal` | ✅ | ✅ | — |
| 33 | KPI Indicators | `ui-2/performance-indicator.html` | `/performance-indicator` | ✅ | ✅ | — |
| 34 | Performance Reviews | `ui-2/performance-review.html` | `/performance-review` | ✅ | ✅ | — |
| 35 | OKR / Goal Tracking | `ui-2/goal-tracking.html` | `/okr` | ✅ | ✅ | — |
| 36 | Training Programs | `ui-2/training.html` | `/training` | ✅ | ✅ | — |
| 37 | Learning Analytics | `ui-2/learning-analytics.html` | `/learning-analytics` | ✅ | ✅ | — |
| 38 | Recruitment (ATS) | `ui-2/candidates.html` | `/recruitment` | ✅ | ✅ | — |
| 39 | Recruitment Dashboard | `ui-2/recruitment-dashboard.html` | `/recruitment-dashboard` | ✅ | ✅ | — |
| 40 | Asset Registry | `ui-2/assets.html` | `/assets` | ✅ | ✅ | — |
| 41 | Asset Dashboard | `ui-2/asset-dashboard.html` | `/asset-dashboard` | ✅ | ✅ | — |
| 42 | AI Attendance Insights | `ui-2/ai-attendance-insights.html` | `/ai-attendance-insights` | ✅ | ✅ | — |
| 43 | AI Payroll Forecast | `ui-2/ai-payroll-forecast.html` | `/ai-payroll-forecast` | ✅ | ✅ | — |
| 44 | AI Team Performance | `ui-2/ai-team-performance-insights.html` | `/ai-team-performance-insights` | ✅ | ✅ | — |
| 45 | AI Configuration | `ui-2/ai-configuration.html` | `/ai-configuration` | ✅ | ✅ | — |
| 46 | AI Settings | `ui-2/ai-settings.html` | `/ai-settings` | ✅ | ✅ | — |
| 47 | Finance Dashboard | `ui-2/finance-dashboard.html` | `/finance-dashboard` | ✅ | ✅ | — |
| 48 | Invoices List | `ui-2/invoices.html` | `/invoices` | ✅ | ✅ | — |
| 49 | Invoice Details | `ui-2/invoice-details.html` | `/invoice/$id` | ✅ | ✅ | — |
| 50 | Invoice Report | `ui-2/invoice-report.html` | `/invoice-report` | ✅ | ✅ | — |
| 51 | Estimates / Proposals | `ui-2/estimates.html` | `/proposals` | ✅ | ✅ | — |
| 52 | Payment Report | `ui-2/payment-report.html` | `/payment-report` | ✅ | ✅ | — |
| 53 | Accounting Suite | `ui-2/finance-dashboard.html` | `/accounting` | ✅ | ✅ | — |
| 54 | Subscription | `ui-2/subscription.html` | `/subscription` | ✅ | ✅ | — |
| 55 | CRM Dashboard | `ui/crm-dashboard.html` | `/crm-dashboard` | ✅ | ✅ | — |
| 56 | Deals Dashboard | `ui-2/deals-dashboard.html` | `/deals-dashboard` | ✅ | ✅ | — |
| 57 | Leads Dashboard | `ui-2/leads-dashboard.html` | `/leads-dashboard` | ✅ | ✅ | — |
| 58 | Contacts | `ui-2/contacts.html` | `/contacts` | ✅ | ✅ | — |
| 59 | CRM Pipeline | `ui-2/pipeline.html` | `/crm` | ✅ | ✅ | — |
| 60 | CRM Notes | `ui-2/notes.html` | `/notes` | ✅ | ✅ | — |
| 61 | POS Terminal | `ui/pos.html` | `/pos` | ✅ | ✅ | — |
| 62 | POS Dashboard | `ui/pos-dashboard.html` | `/pos-dashboard` | ✅ | ✅ | — |
| 63 | Products / Inventory | `ui/products.html` | `/products` | ✅ | ✅ | — |
| 64 | Inventory Dashboard | `ui/inventory-dashboard.html` | `/inventory-dashboard` | ✅ | ✅ | — |
| 65 | Purchases | `ui/purchases.html` | `/purchases` | ✅ | ✅ | — |
| 66 | Returns (Credit/Debit) | `ui/purchase-return.html` | `/returns` | ✅ | ✅ | — |
| 67 | Stock Adjustments | `ui/stock-adjustment.html` | `/adjustments` | ✅ | ✅ | — |
| 68 | Stock Transfers | `ui/stock-transfer.html` | `/transfers` | ✅ | ✅ | — |
| 69 | Suppliers | `ui/suppliers.html` | `/suppliers` | ✅ | ✅ | — |
| 70 | Projects | `ui-2/projects.html` | `/projects` | ✅ | ✅ | — |
| 71 | Project Details | `ui-2/project-details.html` | `/project/$id` | ✅ | ✅ | — |
| 72 | Project Report | `ui-2/project-report.html` | `/project-report` | ✅ | ✅ | — |
| 73 | My Tasks | `ui-2/tasks.html` | `/tasks` | ✅ | ✅ | — |
| 74 | Help Desk Tickets | `ui-2/tickets.html` | `/helpdesk` | ✅ | ✅ | — |
| 75 | Ticket Reports | `ui-2/ticket-reports.html` | `/ticket-reports` | ✅ | ✅ | — |
| 76 | Help Desk Dashboard | `ui-2/help-desk-dashboard.html` | `/help-desk-dashboard` | ✅ | ✅ | — |
| 77 | IT Admin Dashboard | `ui-2/it-admin-dashboard.html` | `/it-admin-dashboard` | ✅ | ✅ | — |
| 78 | Employee Dashboard (ESS) | `ui-2/employee-dashboard.html` | `/employee-dashboard` | ✅ | ✅ | — |
| 79 | Employee Attendance (ESS) | `ui-2/attendance-employee.html` | `/attendance-employee` | ✅ | ✅ | — |
| 80 | Client Dashboard | — | `/client-dashboard` | ✅ | ✅ | — |
| 81 | Client Invoice View | — | `/portal/invoices/$id` | ✅ | ✅ | — |
| 82 | Client Proposal View | — | `/portal/proposals/$id` | ✅ | ✅ | — |
| 83 | Login / Auth | `ui-2/login.html` | `/auth` | ✅ | ✅ | — |
| 84 | Custom Fields Engine | `ui-2/custom-fields.html` | `/custom-fields` | ✅ | ✅ | ✅ |
| 85 | Marketing Campaigns | `ui/campaigns.html` | `/campaigns` | ✅ | ✅ | ✅ |

---

## 🟡 PARTIAL Screens (Need Completion)

| # | Screen | HTML Source | React Route | Missing | Priority | Next Action |
|---|--------|-------------|-------------|---------|----------|-------------|
| P01 | Super Admin Users | `ui-2/users.html` | `/super/users` | Password reset modal, login history | Medium | Add modal + history link |
| P02 | Database Backup | `ui-2/backup.html` | `/super/backup` | Live mysqldump stream, MySQL restore | Low | Wire to backup API |
| P03 | Languages | `ui-2/languages.html` | `/super/languages` | Phrase key-value translation table | Low | Add phrase editor |
| P04 | SLA Policies | `ui-2/sla-policies.html` | `/super/sla-policies` | Full SLA breach timeline UI | Medium | Enhance breach history |
| P05 | Leave Requests | `ui-2/leaves.html` | `/leave` | Multi-level approval (Manager→HR) | High | Add 2nd approval tier UI |
| P06 | Shifts | `ui-2/schedule-timing.html` | `/shifts` | Shift swap calendar integration | Medium | Link to shift-swap-requests |
| P07 | Budgets | `ui-2/budgets.html` | `/accounting` (tab) | Dedicated budget management page | Medium | Extract to `/budget` route |
| P08 | Global Task Kanban | `ui-2/task-board.html` | `/task-board` | 6 Kanban columns, task CRUD, filter pills, multi-tenant | Done | Fully verified & live |
| P09 | Recurring Invoices | `ui/recurring-invoices.html` | `/recurring-invoices` | Complete | Done | Fully verified & live |
| P10 | CMS (Testimonials) | `ui-2/testimonials.html` | `/super/cms` (tab) | Dedicated testimonials management | Low | Add tab or page |
| P11 | CMS (FAQ) | `ui-2/faq.html` | `/super/cms` (tab) | Dedicated FAQ management | Low | Add tab or page |

---

## 🔴 MISSING Screens (Not Started)

| # | Screen | HTML Source | Priority | Recommended Route | Notes |
|---|--------|-------------|----------|-------------------|-------|
| M01 | Overtime Tracking | `ui-2/overtime.html` | **HIGH** | `/overtime` | Hourly OT calculations |
| M02 | Provident Fund | `ui-2/provident-fund.html` | **HIGH** | `/payroll-pf` | Indian statutory PF |
| M03 | Clients Directory | `ui-2/clients.html` | **HIGH** | `/clients` | CRM client management |
| M04 | Companies | `ui-2/companies.html` | **HIGH** | `/companies` | CRM company management |
| M05 | WFH Requests | `ui-2/work-from-home.html` | **MEDIUM** | `/wfh-requests` | Employee WFH workflow |
| M06 | Probation Management | `ui-2/probation-management.html` | **MEDIUM** | `/probation` | Probation period tracker |
| M07 | Promotion Records | `ui-2/promotion.html` | **MEDIUM** | `/promotions` | HR promotion history |
| M08 | Custom Fields | `ui-2/custom-fields.html` | **COMPLETE** | `/custom-fields` | Implemented & verified |
| M09 | Recurring Invoices | `ui/recurring-invoices.html` | **COMPLETE** | `/recurring-invoices` | Implemented & verified |
| M10 | Marketing Campaigns | `ui/campaigns.html` | **COMPLETE** | `/campaigns` | Implemented & verified |
| M11 | Campus Hiring | `ui-2/campus-hiring.html` | **LOW** | `/recruitment/campus` | Campus ATS |
| M12 | Recruitment Referrals | `ui-2/refferals.html` | **LOW** | `/recruitment/referrals` | Employee referrals |
| M13 | Certification Tracking | `ui-2/certification-tracking.html` | **LOW** | `/certifications` | Employee certs |
| M14 | Call History | `ui-2/call-history.html` | **LOW** | `/crm/calls` | CRM call log |
| M15 | Daily Report | `ui-2/daily-report.html` | **LOW** | `/crm/daily-report` | Sales daily report |
| M16 | Ticket Automation | `ui-2/ticket-automation.html` | **LOW** | `/helpdesk/automation` | Auto-routing rules |
| M17 | AI Hiring Forecast | `ui-2/ai-hiring-forecast.html` | **LOW** | `/ai-hiring-forecast` | ML hiring predictor |
| M18 | Cron Jobs | `ui-2/cronjob.html` | **LOW** | `/super/cronjobs` | Super admin crons |
| M19 | IP Ban Management | `ui-2/ban-ip-address.html` | **LOW** | `/super/security` | Access control |

---

## Recommended Migration Priority Order

Based on business impact and dependency analysis:

### Priority 1 — HIGH (Start First)
1. **Overtime Tracking** (`/overtime`) — Directly impacts payroll accuracy
2. **Provident Fund** (`/payroll-pf`) — Indian statutory compliance
3. **Clients Directory** (`/clients`) — Core CRM missing piece
4. **Companies** (`/companies`) — CRM hierarchy
5. **Multi-level Leave Approval** (enhance `/leave`) — Process gap

### Priority 2 — MEDIUM (Next Wave)
6. **WFH Requests** (`/wfh-requests`) — Employee self-service
7. **Probation Management** (`/probation`) — HR lifecycle
8. **Promotion Records** (`/promotions`) — HR lifecycle
9. **Global Task Board** (`/task-board`) — Cross-project Kanban
10. **Recurring Invoices** (`/recurring-invoices`) — Revenue management

### Priority 3 — LOW (Later)
11–19: Campus Hiring, Referrals, Certifications, Call History, CRM Daily Report, Ticket Automation, AI Hiring Forecast, Cron Jobs, IP Ban

---

*End of UI_MIGRATION_STATUS.md — Updated 2026-09-30*
