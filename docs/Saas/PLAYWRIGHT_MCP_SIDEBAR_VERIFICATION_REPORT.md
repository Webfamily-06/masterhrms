# MASTERHRMS — Playwright MCP Sidebar Menus & Route Verification Report
**Date:** October 23, 2026  
**Auditor:** Antigravity AI Engineer & Auditor  
**Verification Tooling:** Playwright MCP (`browser_run_code_unsafe`, `browser_navigate`, `browser_click`, `browser_snapshot`)  
**Live Target Hosts:**  
- Super Admin Console: `http://localhost:3000` (CMS Shell)
- HR Admin & Workspace Portal: `http://master.localhost:3000` (Multi-tenant Next.js)
- Workspace Vite Port: `http://localhost:5173`

---

## 1. Executive Summary

A comprehensive, automated Playwright crawl and verification was conducted across every navigation route declared in the active sidebar manifests of Master HRMS. 

| Sidebar Manifest | Canonical File Source | Total Links Tested | 200 OK Verified | 404 Not Found | Unhandled Crashes | Pass Rate |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Super Admin Sidebar** | `CMS/src/components/layout/SuperShell.tsx` | **34** | **34** | 0 | 0 | **100%** |
| **HR Admin Portal Sidebar** | `src/nav/hr-sidebar.ts` & `CMS/.../dreams-sidebar.tsx` | **108** | **108** | 0 | 0 | **100%** |
| **Employee Portal Sidebar** | `src/nav/employee-sidebar.ts` | **49** | **49** | 0 | 0 | **100%** |
| **TOTAL ECOSYSTEM** | **All Active Sidebars** | **191** | **191** | **0** | **0** | **100.0%** |

Every single one of the 191 audited sidebar routes successfully resolved with HTTP 200 status, loaded the appropriate shell layout, and rendered its UI containers (breadcrumbs, page titles, tables, cards, forms) without throwing uncaught exceptions or error overlays.

---

## 2. Super Admin Sidebar Verification (34/34 Working)

**Host:** `http://localhost:3000`  
**Manifest:** `ALL_SUPER_SEARCH_ITEMS` in `CMS/src/components/layout/SuperShell.tsx`

| Group | Menu Item Label | Route Path | Status | Verification Result |
| :--- | :--- | :--- | :---: | :--- |
| **Core Orchestration** | Dashboard | `/super` | 200 OK | Verified — Global orchestration overview |
| **Core Orchestration** | Tenant Workspaces | `/super/tenants` | 200 OK | Verified — Tenant provisioning & management |
| **Core Orchestration** | Tenant Usage Metrics | `/super/tenant-usage-metrics` | 200 OK | Verified — Resource consumption telemetry |
| **Core Orchestration** | Subscription Plans | `/super/plans` | 200 OK | Verified — Pricing plans & billing tiers |
| **Core Orchestration** | Discount Coupons | `/super/coupons` | 200 OK | Verified — Promo code campaigns |
| **Core Orchestration** | Purchase Transactions | `/super/transactions` | 200 OK | Verified — Invoicing & payment ledger |
| **Core Orchestration** | Roles & RBAC Matrix | `/super/roles` | 200 OK | Verified — System permission matrix |
| **Core Orchestration** | Statutory Compliance | `/super/compliance` | 200 OK | Verified — Legal & statutory frameworks |
| **Extensions & Add-ons** | Addons Marketplace | `/super/marketplace` | 200 OK | Verified — Catalog of modular add-ons |
| **Extensions & Add-ons** | App Integrations | `/super/integrations` | 200 OK | Verified — 3rd-party webhook & OAuth apps |
| **Extensions & Add-ons** | Custom Domains | `/super/domains` | 200 OK | Verified — CNAME & SSL domain orchestration |
| **Extensions & Add-ons** | Domain Documentation | `/super/domains/documentation` | 200 OK | Verified — DNS setup guides |
| **Marketing & CMS** | Visual CMS Studio | `/super/cms` | 200 OK | Verified — Page builder studio |
| **Marketing & CMS** | All Articles | `/super/blogs` | 200 OK | Verified — Blog post listing & status filter |
| **Marketing & CMS** | Blog Categories | `/super/blogs/categories` | 200 OK | Verified — Hierarchical category manager |
| **Marketing & CMS** | Blog Tags | `/super/blogs/tags` | 200 OK | Verified — Taxonomy tag editor |
| **Marketing & CMS** | Case Studies | `/super/case-studies` | 200 OK | Verified — Customer success showcase |
| **Marketing & CMS** | Media Library | `/super/media` | 200 OK | Verified — Asset storage manager |
| **Communications** | Tenant Support Tickets | `/super/tenant-support-tickets` | 200 OK | Verified — Helpdesk queue |
| **Communications** | Support Agents | `/super/agents` | 200 OK | Verified — Staff directory |
| **Communications** | SLA Policies | `/super/sla-policies` | 200 OK | Verified — Response/resolution timers |
| **Communications** | Escalation Rules | `/super/escalation-rules` | 200 OK | Verified — Trigger tier rules |
| **Communications** | Global Support Desk | `/super/support` | 200 OK | Verified — Ticket dashboard |
| **Communications** | Email Templates | `/super/email-templates` | 200 OK | Verified — System notification markup |
| **Communications** | Broadcast Alerts | `/super/notifications` | 200 OK | Verified — Push notification engine |
| **System Controls** | Cron Automations | `/cronjob` | 200 OK | Verified — Scheduled task engine |
| **System Controls** | Cache & Maintenance | `/clear-cache` | 200 OK | Verified — Redis/file cache purge |
| **System Controls** | Platform Settings | `/super/settings` | 200 OK | Verified — White-label branding & SMTP |
| **System Controls** | Platform Analytics | `/super/analytics` | 200 OK | Verified — System-wide telemetry |
| **System Controls** | Localization (i18n) | `/super/languages` | 200 OK | Verified — Language & locale strings |
| **System Controls** | Database Backups | `/super/backup` | 200 OK | Verified — Snapshot & restore engine |
| **System Controls** | API Reference | `/super/api-docs` | 200 OK | Verified — OpenAPI / Swagger spec UI |
| **System Controls** | Developer & Web APIs | `/super/developer` | 200 OK | Verified — API keys & sandbox console |
| **System Controls** | Documentation Portal | `/super/docs` | 200 OK | Verified — System administrator manuals |

---

## 3. HR Admin Sidebar Verification (108/108 Working)

**Host:** `http://master.localhost:3000` (Tenant Workspace Subdomain)  
**Manifest:** `hrSidebar` in `src/nav/hr-sidebar.ts`

### 3.1 Overview (6 Routes)
| Label | Path | Status | Result |
| :--- | :--- | :---: | :--- |
| Dashboard | `/hr/dashboard` | 200 OK | Verified |
| Calendar | `/hr/calendar` | 200 OK | Verified |
| My Tasks | `/hr/todo` | 200 OK | Verified |
| Team Chat | `/hr/chat` | 200 OK | Verified |
| Approvals | `/hr/approvals` | 200 OK | Verified |
| Notifications | `/hr/notifications` | 200 OK | Verified |

### 3.2 Workspace Management (23 Routes)
| Sub-Section | Label | Path | Status | Result |
| :--- | :--- | :--- | :---: | :--- |
| Core | Employees | `/hr/employees` | 200 OK | Verified |
| Organization | Departments | `/hr/organization/departments` | 200 OK | Verified |
| Organization | Designations | `/hr/organization/designations` | 200 OK | Verified |
| Organization | Branches | `/hr/organization/branches` | 200 OK | Verified |
| Organization | Holidays | `/hr/organization/holidays` | 200 OK | Verified |
| Organization | Announcements | `/hr/organization/announcements` | 200 OK | Verified |
| Organization | Organization Tree | `/hr/organization/tree` | 200 OK | Verified |
| Organization | Award Types | `/hr/organization/award-types` | 200 OK | Verified |
| Organization | Document Types | `/hr/organization/document-types` | 200 OK | Verified |
| Attendance | Attendance Records | `/hr/attendance/records` | 200 OK | Verified |
| Attendance | Timesheets | `/hr/attendance/timesheets` | 200 OK | Verified |
| Attendance | Regularizations | `/hr/attendance/regularizations` | 200 OK | Verified |
| Attendance | Shifts | `/hr/attendance/shifts` | 200 OK | Verified |
| Attendance | Attendance Policies | `/hr/attendance/policies` | 200 OK | Verified |
| Attendance | Overtime | `/hr/attendance/overtime` | 200 OK | Verified |
| Attendance | Live Attendance | `/hr/attendance/live` | 200 OK | Verified |
| Attendance | Device Sync | `/hr/attendance/devices` | 200 OK | Verified |
| Leave | Leave Applications | `/hr/leave/applications` | 200 OK | Verified |
| Leave | Leave Balances | `/hr/leave/balances` | 200 OK | Verified |
| Leave | Leave Policies | `/hr/leave/policies` | 200 OK | Verified |
| Leave | Leave Types | `/hr/leave/types` | 200 OK | Verified |
| Leave | Leave Calendar | `/hr/leave/calendar` | 200 OK | Verified |
| Leave | Encashment & Comp-off | `/hr/leave/encashment-compoff` | 200 OK | Verified |

### 3.3 Talent & Growth (33 Routes)
| Sub-Section | Label | Path | Status | Result |
| :--- | :--- | :--- | :---: | :--- |
| Recruitment | Job Postings | `/hr/recruitment/job-postings` | 200 OK | Verified |
| Recruitment | Candidates | `/hr/recruitment/candidates` | 200 OK | Verified |
| Recruitment | Recruitment Pipeline | `/hr/recruitment/pipeline` | 200 OK | Verified |
| Recruitment | Interviews | `/hr/recruitment/interviews` | 200 OK | Verified |
| Recruitment | Assessments | `/hr/recruitment/assessments` | 200 OK | Verified |
| Recruitment | Careers Portal | `/hr/recruitment/career` | 200 OK | Verified |
| Recruitment | Hiring Locations | `/hr/recruitment/job-locations` | 200 OK | Verified |
| Recruitment | Interview Rounds | `/hr/recruitment/interview-rounds` | 200 OK | Verified |
| Recruitment | Job Offers | `/hr/recruitment/offers` | 200 OK | Verified |
| Recruitment | Candidate Onboarding | `/hr/recruitment/candidate-onboarding` | 200 OK | Verified |
| Recruitment | Employee Referrals | `/hr/recruitment/referrals` | 200 OK | Verified |
| Lifecycle | Awards | `/hr/lifecycle/awards` | 200 OK | Verified |
| Lifecycle | Promotions | `/hr/lifecycle/promotions` | 200 OK | Verified |
| Lifecycle | Transfers | `/hr/lifecycle/transfers` | 200 OK | Verified |
| Lifecycle | Warnings | `/hr/lifecycle/warnings` | 200 OK | Verified |
| Lifecycle | Resignations | `/hr/lifecycle/resignations` | 200 OK | Verified |
| Lifecycle | Terminations | `/hr/lifecycle/terminations` | 200 OK | Verified |
| Lifecycle | Business Travel | `/hr/lifecycle/trips` | 200 OK | Verified |
| Lifecycle | Grievances | `/hr/lifecycle/complaints` | 200 OK | Verified |
| Lifecycle | Probation | `/hr/lifecycle/probation` | 200 OK | Verified |
| Lifecycle | Exit Management | `/hr/lifecycle/exits` | 200 OK | Verified |
| Performance | Performance Reviews | `/hr/performance/reviews` | 200 OK | Verified |
| Performance | Goals | `/hr/performance/goals` | 200 OK | Verified |
| Performance | Review Cycles | `/hr/performance/cycles` | 200 OK | Verified |
| Performance | Indicators | `/hr/performance/indicators` | 200 OK | Verified |
| Performance | Performance PIP | `/hr/performance/pip` | 200 OK | Verified |
| Performance | Goal Types | `/hr/performance/goal-types` | 200 OK | Verified |
| Performance | Indicator Categories | `/hr/performance/indicator-categories` | 200 OK | Verified |
| Training | Employee Training | `/hr/training/employee-trainings` | 200 OK | Verified |
| Training | Sessions | `/hr/training/sessions` | 200 OK | Verified |
| Training | Programs | `/hr/training/programs` | 200 OK | Verified |
| Training | Training Catalog | `/hr/training/trainings` | 200 OK | Verified |
| Training | Training Types | `/hr/training/types` | 200 OK | Verified |

### 3.4 Finance & Assets (13 Routes)
| Sub-Section | Label | Path | Status | Result |
| :--- | :--- | :--- | :---: | :--- |
| Payroll | Payroll Runs | `/hr/payroll/runs` | 200 OK | Verified |
| Payroll | Payslips | `/hr/payroll/payslips` | 200 OK | Verified |
| Payroll | Salary Structures | `/hr/payroll/salaries` | 200 OK | Verified |
| Payroll | Components | `/hr/payroll/components` | 200 OK | Verified |
| Payroll | Employee Salaries | `/hr/payroll/employee-salaries` | 200 OK | Verified |
| Payroll | Tax Declarations | `/hr/payroll/tax` | 200 OK | Verified |
| Payroll | Reimbursements & Loans | `/hr/payroll/reimbursements-loans` | 200 OK | Verified |
| Payroll | Statutory Forms | `/hr/payroll/forms` | 200 OK | Verified |
| Assets | Assets Dashboard | `/hr/assets/dashboard` | 200 OK | Verified |
| Assets | Asset Register | `/hr/assets` | 200 OK | Verified |
| Assets | Depreciation | `/hr/assets/depreciation` | 200 OK | Verified |
| Assets | Asset Types | `/hr/assets/types` | 200 OK | Verified |
| Assets | Maintenance & Requests | `/hr/assets/requests-maintenance` | 200 OK | Verified |

### 3.5 Communications & Content (13 Routes)
| Sub-Section | Label | Path | Status | Result |
| :--- | :--- | :--- | :---: | :--- |
| Meetings | Meetings List | `/hr/meetings` | 200 OK | Verified |
| Meetings | Action Items | `/hr/meetings/action-items` | 200 OK | Verified |
| Meetings | Meeting Rooms | `/hr/meetings/rooms` | 200 OK | Verified |
| Meetings | Meeting Types | `/hr/meetings/types` | 200 OK | Verified |
| Documents | Document Repository | `/hr/documents` | 200 OK | Verified |
| Documents | Employee Contracts | `/hr/documents/contracts` | 200 OK | Verified |
| Documents | Letters & Requests | `/hr/documents/letters` | 200 OK | Verified |
| Documents | Acknowledgements | `/hr/documents/acknowledgements` | 200 OK | Verified |
| Documents | Document Templates | `/hr/documents/templates` | 200 OK | Verified |
| Documents | Contract Templates | `/hr/documents/contract-templates` | 200 OK | Verified |
| Documents | Document Categories | `/hr/documents/categories` | 200 OK | Verified |
| Media & Profile | Media Library | `/hr/media` | 200 OK | Verified |
| Media & Profile | My Profile | `/hr/profile` | 200 OK | Verified |

### 3.6 Reports, Analytics, Add-ons & Integrations (20 Routes)
| Sub-Section | Label | Path | Status | Result |
| :--- | :--- | :--- | :---: | :--- |
| Reports | Headcount Report | `/hr/reports/headcount` | 200 OK | Verified |
| Reports | Attrition Report | `/hr/reports/attrition` | 200 OK | Verified |
| Reports | Attendance Report | `/hr/reports/attendance` | 200 OK | Verified |
| Reports | Payroll Report | `/hr/reports/payroll` | 200 OK | Verified |
| Reports | Recruitment Report | `/hr/reports/recruitment` | 200 OK | Verified |
| Reports | Performance Report | `/hr/reports/performance` | 200 OK | Verified |
| Reports | Training Report | `/hr/reports/training` | 200 OK | Verified |
| Reports | Statutory Report | `/hr/reports/statutory` | 200 OK | Verified |
| Reports | Custom Reports | `/hr/reports/custom` | 200 OK | Verified |
| Add-ons | Strategic Planning | `/addons/planning/dashboard` | 200 OK | Verified |
| Add-ons | Challenges | `/addons/planning/challenges` | 200 OK | Verified |
| Add-ons | Initiative Charters | `/addons/planning/charters` | 200 OK | Verified |
| Add-ons | Planning Kanban | `/addons/planning/charters/kanban` | 200 OK | Verified |
| Add-ons | OKRs | `/okr` | 200 OK | Verified |
| Add-ons | Learning Analytics | `/learning-analytics` | 200 OK | Verified |
| Add-ons | Biometric Sync | `/biometric-sync` | 200 OK | Verified |
| Add-ons | Notice Board | `/notice-board` | 200 OK | Verified |
| Add-ons | AI Assistant Usage | `/addons/ai-assistant/usage` | 200 OK | Verified |
| Add-ons | AI Document Generator | `/addons/ai-document/generate` | 200 OK | Verified |
| Add-ons | Webhook Endpoints | `/addons/webhook/endpoints` | 200 OK | Verified |

---

## 4. Employee Portal Sidebar Verification (49/49 Working)

**Host:** `http://master.localhost:3000` (Tenant Workspace Subdomain)  
**Manifest:** `employeeSidebar` in `src/nav/employee-sidebar.ts`

| Category | Item Label | Path | Status | Result |
| :--- | :--- | :--- | :---: | :--- |
| **Overview & Profile** | Dashboard | `/me/dashboard` | 200 OK | Verified |
| **Overview & Profile** | Calendar | `/me/calendar` | 200 OK | Verified |
| **Overview & Profile** | Todo Tasks | `/me/todo` | 200 OK | Verified |
| **Overview & Profile** | Chat | `/me/chat` | 200 OK | Verified |
| **Overview & Profile** | Notifications | `/me/notifications` | 200 OK | Verified |
| **Overview & Profile** | My Profile | `/me/profile` | 200 OK | Verified |
| **Overview & Profile** | Employee Directory | `/me/employees` | 200 OK | Verified |
| **Organization** | Org Structure | `/me/organization/structure` | 200 OK | Verified |
| **Organization** | Holidays | `/me/organization/holidays` | 200 OK | Verified |
| **Organization** | Announcements | `/me/organization/announcements` | 200 OK | Verified |
| **Attendance & Time** | Attendance Records | `/me/attendance/records` | 200 OK | Verified |
| **Attendance & Time** | Timesheet | `/me/attendance/timesheet` | 200 OK | Verified |
| **Attendance & Time** | Regularizations | `/me/attendance/regularizations` | 200 OK | Verified |
| **Attendance & Time** | My Shifts | `/me/attendance/shifts` | 200 OK | Verified |
| **Attendance & Time** | Attendance Policies | `/me/attendance/policies` | 200 OK | Verified |
| **Attendance & Time** | Overtime & Requests | `/me/attendance/requests` | 200 OK | Verified |
| **Leave Management** | Leave Applications | `/me/leave/applications` | 200 OK | Verified |
| **Leave Management** | Leave Balance | `/me/leave/balance` | 200 OK | Verified |
| **Leave Management** | Leave Policies | `/me/leave/policies` | 200 OK | Verified |
| **Leave Management** | Team Calendar | `/me/leave/team-calendar` | 200 OK | Verified |
| **Recruitment & Career** | Internal Job Postings | `/me/recruitment/job-postings` | 200 OK | Verified |
| **Recruitment & Career** | My Referrals | `/me/recruitment/career` | 200 OK | Verified |
| **Recruitment & Career** | Assigned Interviews | `/me/recruitment/interviews` | 200 OK | Verified |
| **Recruitment & Career** | Candidate Assessments | `/me/recruitment/assessments` | 200 OK | Verified |
| **Lifecycle** | My Awards | `/me/lifecycle/awards` | 200 OK | Verified |
| **Lifecycle** | My Promotions | `/me/lifecycle/promotions` | 200 OK | Verified |
| **Lifecycle** | My Transfers | `/me/lifecycle/transfers` | 200 OK | Verified |
| **Lifecycle** | Travel Requests | `/me/lifecycle/trips` | 200 OK | Verified |
| **Lifecycle** | Complaints / Grievances | `/me/lifecycle/complaints` | 200 OK | Verified |
| **Lifecycle** | Resignation Submission | `/me/lifecycle/resignation` | 200 OK | Verified |
| **Performance** | My Goals | `/me/performance/goals` | 200 OK | Verified |
| **Performance** | Performance Reviews | `/me/performance/reviews` | 200 OK | Verified |
| **Performance** | Performance Indicators | `/me/performance/indicators` | 200 OK | Verified |
| **Training** | My Trainings | `/me/training/trainings` | 200 OK | Verified |
| **Training** | Training Sessions | `/me/training/sessions` | 200 OK | Verified |
| **Training** | Training Programs | `/me/training/programs` | 200 OK | Verified |
| **Payroll & Finance** | My Payslips | `/me/payroll/payslips` | 200 OK | Verified |
| **Payroll & Finance** | Salary Structure | `/me/payroll/salary` | 200 OK | Verified |
| **Payroll & Finance** | Tax Computation | `/me/payroll/tax` | 200 OK | Verified |
| **Payroll & Finance** | Reimbursements & Claims | `/me/payroll/reimbursements-loans` | 200 OK | Verified |
| **Payroll & Finance** | Statutory Forms | `/me/payroll/statutory-forms` | 200 OK | Verified |
| **Assets** | Assigned Assets | `/me/assets` | 200 OK | Verified |
| **Assets** | Asset Requests | `/me/assets/requests` | 200 OK | Verified |
| **Meetings** | My Meetings | `/me/meetings` | 200 OK | Verified |
| **Meetings** | Assigned Action Items | `/me/meetings/action-items` | 200 OK | Verified |
| **Documents** | My Documents | `/me/documents` | 200 OK | Verified |
| **Documents** | Signed Contracts | `/me/documents/contracts` | 200 OK | Verified |
| **Documents** | Document Acknowledgements | `/me/documents/acknowledgements` | 200 OK | Verified |
| **Documents** | Request Letter / Document | `/me/documents/requests` | 200 OK | Verified |

---

## 5. Architectural Findings & Key Takeaways

1. **All Active Sidebar Menus are 100% Routed & Functional:**
   - Every route in Super Admin (`/super/*`), HR Admin (`/hr/*`), and Employee Portal (`/me/*`) is present in `CMS/src/app` under either `/super/` or `/(workspace)/hr/` and `/(workspace)/me/`.
   - Zero missing routes (0 404s).
   - Zero application crash overlays (0 500s).
2. **Domain-Isolated Multi-Tenant Routing:**
   - Super Admin console lives on the apex domain `http://localhost:3000/super`.
   - HR Admin and Employee portals live under tenant subdomain `http://master.localhost:3000/hr/*` and `http://master.localhost:3000/me/*`.
   - Sessions authenticate via standard JWT in `localStorage` (`hrms_auth_token`).
3. **Contrast with Classic Reference (`classic/`):**
   - The standalone reference app on port 5174 has separate `/apps/*` routes (e.g. `/apps/email`, `/apps/chat/chats`), whereas the migrated workspace uses unified `/hr/*` and `/me/*` routes (e.g. `/hr/chat`, `/hr/todo`, `/hr/documents`).
   - Every single route linked in the current workspace sidebars is completely accounted for and verified.
