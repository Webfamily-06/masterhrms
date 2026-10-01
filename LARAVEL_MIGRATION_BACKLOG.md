# Laravel to React Migration Backlog

**Strategy:** Dependency-aware phased delivery tracking all modules from discovery to 100% verified production parity.

---

## Phase Execution Overview

| Wave | Domain Focus | Modules Included | Dependencies | Target Status |
|:---:|:---|:---|:---|:---:|
| **Wave 1** | **Foundations & Core Auth** | Multi-tenant auth, session, profiles, role-based access, global settings | Database, JWT, Prisma schema | **COMPLETE** |
| **Wave 2** | **Super Admin Platform** | Companies/tenants, plans, subscriptions, coupons, currencies, languages, CMS | Wave 1 | **COMPLETE** |
| **Wave 3** | **Organization & People** | Branches, departments, designations, employees directory, org chart | Wave 1, Wave 2 | **COMPLETE** |
| **Wave 4** | **Time & Attendance** | Shifts, clock-in/out, monthly matrix, regularizations, timesheets, leaves, balances | Wave 3 | **COMPLETE** |
| **Wave 5** | **Payroll & Compensation**| Salary components, structure assignments, payroll batch runs, payslips | Wave 3, Wave 4 | **COMPLETE** |
| **Wave 6** | **Recruitment (ATS)** | Job postings, candidate pipeline, interviews, offers, onboarding checklists | Wave 3 | **COMPLETE** |
| **Wave 7** | **Performance & Training**| OKRs, KPIs, 360 reviews, training programs, training sessions, assessments | Wave 3 | **COMPLETE** |
| **Wave 8** | **Collaboration & Tasks** | Calendar, meetings, action items, 6-column global Kanban board | Wave 3 | **COMPLETE** |
| **Wave 9** | **HR Movement & Documents**| Promotions, transfers, resignations, terminations, warnings, grievances, templates | Wave 3, Wave 4 | **COMPLETE** |
| **Wave 10**| **Security & Integrations**| IP restriction firewall, cache manager, cronjobs, webhooks, biometric sync | Wave 1 | **COMPLETE** |

---

## Granular Feature Backlog Items

### 1. Core Platform & Super Admin
- [x] **SB-01: Company/Tenant Directory**: `src/routes/_authenticated/_app/companies.tsx` + `/api/super/tenants`. Verified.
- [x] **SB-02: Subscription Plans**: `src/routes/_authenticated/_app/super/plans.tsx` + `/api/super/plans`. Verified.
- [x] **SB-03: Plan Orders & Approval**: `src/routes/_authenticated/_app/super/invoices.tsx` + `/api/super/plan-orders`. Verified.
- [x] **SB-04: Coupon Management**: `src/routes/_authenticated/_app/super/coupons.tsx` + `/api/super/coupons`. Verified.
- [x] **SB-05: Currencies & Exchange**: `src/routes/_authenticated/_app/currencies.tsx` + `/api/hrm-extensions/currencies`. Verified.
- [x] **SB-06: Languages & Translations**: `src/routes/_authenticated/_app/super/languages.tsx` + `/api/super/languages`. Verified.
- [x] **SB-07: CMS Landing Page Builder**: `src/routes/_authenticated/_app/super/cms.tsx` + `/api/cms/pages`. Verified.
- [x] **SB-08: System Audit Logs**: `src/routes/_authenticated/_app/super/audit-logs.tsx` + `/api/super/system-audit`. Verified.

### 2. HR Management & Employee Lifecycle
- [x] **HR-01: Employee Directory**: `src/routes/_authenticated/_app/employees.tsx` + `/api/employees`. Verified.
- [x] **HR-02: Organization Units**: Departments (`departments.tsx`), Designations (`designations.tsx`), Branches (`branches.tsx`). Verified.
- [x] **HR-03: Employee Promotions**: `src/routes/_authenticated/_app/promotions.tsx` + `/api/offboarding/promotions`. Verified.
- [x] **HR-04: Employee Transfers**: `src/routes/_authenticated/_app/transfers.tsx` + `/api/transfers`. Verified.
- [x] **HR-05: Resignations & Exits**: `src/routes/_authenticated/_app/resignation.tsx` + `/api/offboarding/resignations`. Verified.
- [x] **HR-06: Terminations**: `src/routes/_authenticated/_app/termination.tsx` + `/api/offboarding/terminations`. Verified.
- [x] **HR-07: Disciplinary Warnings**: `src/routes/_authenticated/_app/warnings.tsx` + `/api/warnings`. Verified.
- [x] **HR-08: Employee Complaints / Grievances**: `src/routes/_authenticated/_app/complaints.tsx` + `/api/helpdesk`. Verified.
- [x] **HR-09: Business Trips & Expenses**: `src/routes/_authenticated/_app/trips.tsx` + `/api/expenses/trips`. Verified.
- [x] **HR-10: Company Holidays**: `src/routes/_authenticated/_app/holidays.tsx` + `/api/hrm-extensions/holidays`. Verified.
- [x] **HR-11: Company Announcements**: `src/routes/_authenticated/_app/announcements.tsx` + `/api/announcements`. Verified.
- [x] **HR-12: Employee Awards**: `src/routes/_authenticated/_app/awards.tsx` + `/api/awards`. Verified.

### 3. Attendance, Shifts & Leave
- [x] **AT-01: Clock-In / Clock-Out**: `src/routes/_authenticated/_app/attendance.tsx` + `/api/attendance/clock-*`. Verified.
- [x] **AT-02: Monthly Attendance Grid**: `src/routes/_authenticated/_app/attendance-employee.tsx` + `/api/attendance/matrix`. Verified.
- [x] **AT-03: Shift Rostering & Swap Requests**: `src/routes/_authenticated/_app/shifts.tsx` + `/api/shifts`. Verified.
- [x] **AT-04: Attendance Regularization**: `src/routes/_authenticated/_app/attendance-regularization.tsx` + `/api/attendance/regularizations`. Verified.
- [x] **AT-05: Timesheet Entries**: `src/routes/_authenticated/_app/time-entries.tsx` + `/api/attendance/timesheets`. Verified.
- [x] **AT-06: Biometric ZKTeco Sync**: `src/routes/_authenticated/_app/biometric-sync.tsx` + `/api/biometric`. Verified.
- [x] **AT-07: Leave Applications & Balances**: `src/routes/_authenticated/_app/leave.tsx` + `/api/leave`. Verified.

### 4. Compensation & Payroll
- [x] **PY-01: Salary Components**: `src/routes/_authenticated/_app/payroll.tsx` (Components) + `/api/payroll/components`. Verified.
- [x] **PY-02: Employee Salary Structures**: `src/routes/_authenticated/_app/payroll.tsx` (Assignments) + `/api/payroll/structures`. Verified.
- [x] **PY-03: Monthly Payroll Runs**: `src/routes/_authenticated/_app/payroll.tsx` (Runs) + `/api/payroll/runs`. Verified.
- [x] **PY-04: Payslip PDF Downloads**: `src/routes/_authenticated/_app/payroll.tsx` (Payslips) + `/api/payroll/payslips`. Verified.
- [x] **PY-05: Provident Fund Administration**: `src/routes/_authenticated/_app/provident-fund.tsx` + `/api/hrm-extensions/provident-fund`. Verified.

### 5. Talent Acquisition (ATS) & OKRs
- [x] **RC-01: Job Postings & Career Portal**: `src/routes/_authenticated/_app/recruitment.tsx` + `/api/recruitment/postings`. Verified.
- [x] **RC-02: Candidate Pipeline & Scoring**: `src/routes/_authenticated/_app/recruitment.tsx` + `/api/recruitment/candidates`. Verified.
- [x] **RC-03: Interview Schedules & Feedback**: `src/routes/_authenticated/_app/recruitment.tsx` + `/api/recruitment/interviews`. Verified.
- [x] **RC-04: Job Offer Releases**: `src/routes/_authenticated/_app/recruitment.tsx` + `/api/recruitment/offers`. Verified.
- [x] **RC-05: Campus Hiring**: `src/routes/_authenticated/_app/campus-hiring.tsx` + `/api/recruitment/campus`. Verified.
- [x] **RC-06: Employee Referrals**: `src/routes/_authenticated/_app/referrals.tsx` + `/api/recruitment/referrals`. Verified.
- [x] **RC-07: AI Hiring Forecast**: `src/routes/_authenticated/_app/ai-hiring-forecast.tsx` + `/api/recruitment/forecast`. Verified.
- [x] **OK-01: OKRs & KPIs**: `src/routes/_authenticated/_app/okr.tsx` + `/api/okr`. Verified.
- [x] **TR-01: Training Programs & Sessions**: `src/routes/_authenticated/_app/training.tsx` + `/api/training`. Verified.

### 6. Projects, Kanban & Invoicing
- [x] **PR-01: Global Task Board (Kanban)**: `src/routes/_authenticated/_app/task-board.tsx` + `/api/projects/tasks`. 6 columns, drag/move, filter pills. Verified.
- [x] **IN-01: Recurring Invoices**: `src/routes/_authenticated/_app/recurring-invoices.tsx` + `/api/invoices/recurring`. Auto generator & cron. Verified.
- [x] **SY-01: Ban IP Firewall**: `src/routes/_authenticated/_app/ban-ip-address.tsx` + `/api/hrm-extensions/security/ban-ip`. Verified.
- [x] **SY-02: Clear Cache Utility**: `src/routes/_authenticated/_app/clear-cache.tsx` + `/api/hrm-extensions/system/cache`. Verified.
- [x] **SY-03: Cronjob Management**: `src/routes/_authenticated/_app/cronjob.tsx` + `/api/hrm-extensions/system/cronjobs`. Verified.

### 7. Custom Fields Engine & Growth Marketing (Wave 1 Verified)
- [x] **M08: Custom Fields Engine**: `src/routes/_authenticated/_app/custom-fields.tsx` + `/api/custom-fields`. Dynamic field configuration across Employees, Projects, Tasks, Invoices, Clients, Leads with type validation, default values, entity value upserting, and request-scoped multi-tenant isolation. Verified with 100% automated test pass.
- [x] **M10: Marketing Campaigns**: `src/routes/_authenticated/_app/campaigns.tsx` + `/api/campaigns`. Lifecycle management (Active, Completed, Archived), auto-generated campaign codes (`#CAM00XX`), budget/spent KPIs, audience targeting, offcanvas creation/edit drawer, CSV/Excel & PDF export. Verified with 100% automated test pass.

### 8. Super Admin & CMS Extensions (Wave 2 Verified)
- [x] **P01: Password Reset & Login History**: `src/routes/_authenticated/super/users.tsx` + `PUT /api/super/users/:id/reset-password`, `GET /api/super/users/login-history`. Super Admin password reset modal requiring minimum 8 characters and matching password confirmation with bcrypt hashing. Direct login history inspection drawer displaying avatar, full name, email, IP, browser, OS, and timestamp with per-user filtering and deletion. Verified with 100% automated test pass.
- [x] **P02: Database Backup & Restore**: `src/routes/_authenticated/super/backup.tsx` + `/api/super/backup/generate`, `/download`, `/snapshots`. Real mysqldump archive generation with temporary isolated options file and zlib gzip compression to `server/backups/`. Safe streaming download with path traversal protection, disk byte formatting, and safe file removal. Verified with 100% automated test pass.
- [x] **P03: Multilingual Phrase Editor**: `src/routes/_authenticated/super/languages.tsx` + `/api/super/languages`, `/api/super/languages/:code`. Super Admin language registry management, default locale seeding, instant phrase search, 30-item pagination, inline translation inputs, new language pack creation, and persistent storage in `CmsPage`. Verified with 100% automated test pass.
- [x] **P10: CMS FAQ Management Studio**: `src/routes/_authenticated/super/cms.tsx` (FAQs Tab) + `/api/cms/faqs`, `/reorder`. Dedicated FAQ management studio with question/answer editing, category tagging, active/hidden toggle, manual sequence reordering, and MySQL persistence. Verified with 100% automated test pass.
- [x] **P11: CMS Testimonials Management Studio**: `src/routes/_authenticated/super/cms.tsx` (Testimonials Tab) + `/api/cms/testimonials`, `/reorder`. Dedicated testimonial management studio with customer name, role, company, star rating (1-5), review quote, status toggle, manual sequence reordering, and MySQL persistence. Verified with 100% automated test pass.
