# worklog.md: MasterHRMS HR (`/hr/*`) and Employee (`/me/*`) Build Tracker

Project: MasterHRMS multi-tenant ERP/HRMS SaaS (React + TanStack, Express, Prisma, MySQL, Redis, Socket.IO)
Created: 2026-10-07
Mode: **PLANNING.** No code is written until a phase gate is approved by the product owner.
Spec files: `00_Architecture_and_Conventions.md`, `01_HR_Panel_Spec.md`, `02_Employee_Portal_Spec.md`, `03_Interlinking_and_Realtime_Flows.md`

---

## How to use this file (rules for the agent)

1. Read this file at the start of every session; append to the **Session Log** at the end of every session.
2. Update a page's status here **in the same session** you touch it. Never leave status stale.
3. Status values: `NS` not started, `AU` audit needed (unknown), `PT` partial, `IP` in progress, `RV` in review, `DN` done (meets the Definition of Done in file 00 section 11), `BL` blocked, `RW` needs rework.
4. Initial status of every page is **AU** because some pages already exist and the real state is unknown. The audit phase replaces AU with the true status.
5. Record decisions in the Decision Log and unanswered questions in Open Questions. Do not guess.
6. Do not start a phase until the previous phase gate is approved.

Column key for inventories: **UI** page exists and matches spec, **API** endpoints complete, **DB** schema/model, **Perm** permissions enforced server-side, **RT** realtime events emitted and consumed, **Flow** interlinks implemented, **Test** tests, **Notes**.

---

## 1. Phase plan and gates

| Phase | Name | Scope | Gate (exit criteria) | Status |
|---|---|---|---|---|
| P0 | Audit and design approval | Audit every page (file 00 section 12); confirm decisions; gap list; schema diff; estimates | Product owner approves gap list and plan | Not started |
| P1 | Platform foundation | Navigation Registry and both sidebars, route guards, portal switcher, roles/permissions/data scope, field-level security, `allowedActions`, workflow engine, realtime (outbox, rooms, catch-up), notification service, audit, media picker, shared list/form/detail engines, master-data blueprint, `linkTo()` | Two-browser realtime test; permission and tenant isolation tests pass | Not started |
| P2 | Organization and Employees | ORG masters, Employees (list, wizard, 360, import), Announcements, Holidays; ME directory, org, profile with change requests | Create employee end-to-end; profile change approval; announcement realtime | Not started |
| P3 | Attendance and Leave | Shifts, policies, records, regularizations, timesheets, live board, leave masters, applications, balances, calendars; ME equivalents; check-in/out | Check-in to leave to attendance-status flow; month lock | Not started |
| P4 | Payroll linkage and Finance | Salary components, employee salaries, payroll runs, payslips (publish), tax, reimbursements, loans, forms (per Payroll Brief); ME payroll pages | Run to publish to employee view; golden payroll tests | Not started |
| P5 | Recruitment | Masters, job postings, candidates, pipeline, assessments, interviews, offers, onboarding, career site, referrals; ME recruitment pages | Posting to hire to employee conversion | Not started |
| P6 | Lifecycle and Performance | Awards, promotions, transfers, warnings, resignations, terminations, trips, complaints, exits, probation; cycles, indicators, goals, reviews; ME pages | Promotion/transfer side effects; exit to F&F | Not started |
| P7 | Training, Assets, Meetings, Documents | Programs, sessions, trainings; assets, depreciation, requests; meetings, rooms, action items; documents, contracts, acknowledgements, letters, templates; Media Library | End-to-end flows F5 to F8 | Not started |
| P8 | Collaboration and polish | Dashboard widgets, Calendar layers, Todo, Chat, reports center, helpdesk, My Team and approvals polish, accessibility, performance, security review | Full regression, load test, security review sign-off | Not started |

---

## 2. Page inventory: HR panel (`/hr/*`)

Status columns start as `AU`. Fill UI/API/DB/Perm/RT/Flow/Test with `Y`, `N`, `P` (partial) after the audit.

### Overview (OV)
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-OV-01 | /hr/dashboard | Dashboard | P8 | AU | | | | | | | | |
| HR-OV-02 | /hr/calendar | Calendar | P8 | AU | | | | | | | | |
| HR-OV-03 | /hr/todo | Todo (added) | P8 | AU | | | | | | | | |
| HR-OV-04 | /hr/chat | Chat | P8 | AU | | | | | | | | |
| HR-OV-05 | /hr/approvals | Approvals inbox (added) | P1 | AU | | | | | | | | |
| HR-OV-06 | /hr/notifications | Notifications (added) | P1 | AU | | | | | | | | |
| HR-OV-07 | /hr/reports | Reports center (added) | P8 | AU | | | | | | | | |

### Workforce: Employees and Organization (WF, ORG)
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-WF-01 | /hr/employees | Employees list | P2 | AU | | | | | | | | |
| HR-WF-02 | /hr/employees/new | Employee wizard | P2 | AU | | | | | | | | |
| HR-WF-03 | /hr/employees/:id | Employee 360 | P2 | AU | | | | | | | | |
| HR-WF-04 | /hr/employees/import | Import (added) | P2 | AU | | | | | | | | |
| HR-ORG-01 | /hr/organization/structure | Org structure chart | P2 | AU | | | | | | | | |
| HR-ORG-02 | /hr/organization/branches | Branches | P2 | AU | | | | | | | | |
| HR-ORG-03 | /hr/organization/departments | Departments | P2 | AU | | | | | | | | |
| HR-ORG-04 | /hr/organization/designations | Designations | P2 | AU | | | | | | | | |
| HR-ORG-05 | /hr/organization/holidays | Holidays | P2 | AU | | | | | | | | |
| HR-ORG-06 | /hr/organization/announcements | Announcements | P2 | AU | | | | | | | | |
| HR-ORG-07 | /hr/organization/award-types | Award Types | P2 | AU | | | | | | | | |
| HR-ORG-08 | /hr/organization/document-types | Document Types | P2 | AU | | | | | | | | |

### Attendance (ATT) and Leave (LV)
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-ATT-01 | /hr/attendance/records | Attendance records | P3 | AU | | | | | | | | |
| HR-ATT-02 | /hr/attendance/timesheets | Timesheets | P3 | AU | | | | | | | | |
| HR-ATT-03 | /hr/attendance/regularizations | Regularizations | P3 | AU | | | | | | | | |
| HR-ATT-04 | /hr/attendance/shifts | Shifts (+assignments, rosters, swaps) | P3 | AU | | | | | | | | |
| HR-ATT-05 | /hr/attendance/policies | Attendance policies | P3 | AU | | | | | | | | |
| HR-ATT-06 | /hr/attendance/live | Live board (added) | P3 | AU | | | | | | | | |
| HR-ATT-07 | /hr/attendance/overtime | Overtime (added) | P3 | AU | | | | | | | | |
| HR-ATT-08 | /hr/attendance/devices | Devices and geo-fences (added) | P3 | AU | | | | | | | | |
| HR-LV-01 | /hr/leave/applications | Leave applications | P3 | AU | | | | | | | | |
| HR-LV-02 | /hr/leave/balances | Leave balances | P3 | AU | | | | | | | | |
| HR-LV-03 | /hr/leave/types | Leave types | P3 | AU | | | | | | | | |
| HR-LV-04 | /hr/leave/policies | Leave policies | P3 | AU | | | | | | | | |
| HR-LV-05 | /hr/leave/calendar | Leave calendar (added) | P3 | AU | | | | | | | | |
| HR-LV-06 | /hr/leave/encashment-compoff | Encashment and comp-off (added) | P3 | AU | | | | | | | | |

### Recruitment (REC)
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-REC-01 | /hr/recruitment/job-postings | Job postings | P5 | AU | | | | | | | | |
| HR-REC-02 | /hr/recruitment/candidates | Candidates | P5 | AU | | | | | | | | |
| HR-REC-03 | /hr/recruitment/interviews | Interviews | P5 | AU | | | | | | | | |
| HR-REC-04 | /hr/recruitment/offers | Offers | P5 | AU | | | | | | | | |
| HR-REC-05 | /hr/recruitment/candidate-onboarding | Candidate onboarding | P5 | AU | | | | | | | | |
| HR-REC-06 | /hr/recruitment/assessments | Candidate assessments | P5 | AU | | | | | | | | |
| HR-REC-07 | /hr/recruitment/onboarding-checklists | Onboarding checklists | P5 | AU | | | | | | | | |
| HR-REC-08 | /hr/recruitment/check-items | Check items | P5 | AU | | | | | | | | |
| HR-REC-09 | /hr/recruitment/career-site | Career site | P5 | AU | | | | | | | | |
| HR-REC-10 | /hr/recruitment/job-categories | Job categories | P5 | AU | | | | | | | | |
| HR-REC-11 | /hr/recruitment/job-types | Job types | P5 | AU | | | | | | | | |
| HR-REC-12 | /hr/recruitment/job-locations | Job locations | P5 | AU | | | | | | | | |
| HR-REC-13 | /hr/recruitment/candidate-sources | Candidate sources | P5 | AU | | | | | | | | |
| HR-REC-14 | /hr/recruitment/interview-types | Interview types | P5 | AU | | | | | | | | |
| HR-REC-15 | /hr/recruitment/interview-rounds | Interview rounds | P5 | AU | | | | | | | | |
| HR-REC-16 | /hr/recruitment/offer-templates | Offer templates | P5 | AU | | | | | | | | |
| HR-REC-17 | /hr/recruitment/pipeline | Pipeline board (added) | P5 | AU | | | | | | | | |
| HR-REC-18 | /hr/recruitment/referrals | Referrals (added) | P5 | AU | | | | | | | | |

### Lifecycle (LC) and Performance (PF)
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-LC-01 | /hr/lifecycle/awards | Awards | P6 | AU | | | | | | | | |
| HR-LC-02 | /hr/lifecycle/promotions | Promotions | P6 | AU | | | | | | | | |
| HR-LC-03 | /hr/lifecycle/transfers | Transfers | P6 | AU | | | | | | | | |
| HR-LC-04 | /hr/lifecycle/warnings | Warnings | P6 | AU | | | | | | | | |
| HR-LC-05 | /hr/lifecycle/resignations | Resignations | P6 | AU | | | | | | | | |
| HR-LC-06 | /hr/lifecycle/terminations | Terminations | P6 | AU | | | | | | | | |
| HR-LC-07 | /hr/lifecycle/trips | Trips | P6 | AU | | | | | | | | |
| HR-LC-08 | /hr/lifecycle/complaints | Complaints | P6 | AU | | | | | | | | |
| HR-LC-09 | /hr/lifecycle/exits | Exit management (added) | P6 | AU | | | | | | | | |
| HR-LC-10 | /hr/lifecycle/probation | Probation (added) | P6 | AU | | | | | | | | |
| HR-PF-01 | /hr/performance/reviews | Employee reviews | P6 | AU | | | | | | | | |
| HR-PF-02 | /hr/performance/goals | Employee goals | P6 | AU | | | | | | | | |
| HR-PF-03 | /hr/performance/cycles | Review cycles | P6 | AU | | | | | | | | |
| HR-PF-04 | /hr/performance/indicators | Indicators | P6 | AU | | | | | | | | |
| HR-PF-05 | /hr/performance/goal-types | Goal types | P6 | AU | | | | | | | | |
| HR-PF-06 | /hr/performance/indicator-categories | Indicator categories | P6 | AU | | | | | | | | |

### Training (TR), Payroll (PAY), Assets (AST)
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-TR-01 | /hr/training/employee-trainings | Employee trainings | P7 | AU | | | | | | | | |
| HR-TR-02 | /hr/training/sessions | Training sessions | P7 | AU | | | | | | | | |
| HR-TR-03 | /hr/training/programs | Training programs | P7 | AU | | | | | | | | |
| HR-TR-04 | /hr/training/types | Training types | P7 | AU | | | | | | | | |
| HR-PAY-01 | /hr/payroll/payslips | Payslips | P4 | AU | | | | | | | | |
| HR-PAY-02 | /hr/payroll/runs | Payroll runs | P4 | AU | | | | | | | | |
| HR-PAY-03 | /hr/payroll/employee-salaries | Employee salaries | P4 | AU | | | | | | | | |
| HR-PAY-04 | /hr/payroll/components | Salary components | P4 | AU | | | | | | | | |
| HR-PAY-05 | /hr/payroll/setup | Statutory, formulas, export templates (added) | P4 | AU | | | | | | | | |
| HR-PAY-06 | /hr/payroll/tax | Tax declarations (added) | P4 | AU | | | | | | | | |
| HR-PAY-07 | /hr/payroll/reimbursements-loans | Reimbursements and loans (added) | P4 | AU | | | | | | | | |
| HR-PAY-08 | /hr/payroll/forms | Forms center (added) | P4 | AU | | | | | | | | |
| HR-AST-01 | /hr/assets/dashboard | Asset dashboard | P7 | AU | | | | | | | | |
| HR-AST-02 | /hr/assets | Assets | P7 | AU | | | | | | | | |
| HR-AST-03 | /hr/assets/depreciation | Depreciation | P7 | AU | | | | | | | | |
| HR-AST-04 | /hr/assets/types | Asset types | P7 | AU | | | | | | | | |
| HR-AST-05 | /hr/assets/requests-maintenance | Requests and maintenance (added) | P7 | AU | | | | | | | | |

### Communication, Documents, Media, Administration
| ID | Route | Page | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-COM-01 | /hr/meetings | Meetings | P7 | AU | | | | | | | | |
| HR-COM-02 | /hr/meetings/action-items | Action items | P7 | AU | | | | | | | | |
| HR-COM-03 | /hr/meetings/types | Meeting types | P7 | AU | | | | | | | | |
| HR-COM-04 | /hr/meetings/rooms | Meeting rooms | P7 | AU | | | | | | | | |
| HR-DOC-01 | /hr/documents | HR documents | P7 | AU | | | | | | | | |
| HR-DOC-02 | /hr/documents/contracts | Employee contracts | P7 | AU | | | | | | | | |
| HR-DOC-03 | /hr/documents/acknowledgements | Acknowledgements | P7 | AU | | | | | | | | |
| HR-DOC-04 | /hr/documents/contract-templates | Contract templates | P7 | AU | | | | | | | | |
| HR-DOC-05 | /hr/documents/document-templates | Document templates | P7 | AU | | | | | | | | |
| HR-DOC-06 | /hr/documents/contract-types | Contract types | P7 | AU | | | | | | | | |
| HR-DOC-07 | /hr/documents/categories | Document categories | P7 | AU | | | | | | | | |
| HR-DOC-08 | /hr/documents/letters | Letters center (added) | P7 | AU | | | | | | | | |
| HR-MED-01 | /hr/media | Media Library | P1 | AU | | | | | | | | |
| HR-ADM-01 | /hr/access/roles | Roles and permissions (added) | P1 | AU | | | | | | | | |
| HR-ADM-02 | /hr/access/users | Users and access (added) | P1 | AU | | | | | | | | |
| HR-ADM-03 | /hr/workflows | Approval workflows (added) | P1 | AU | | | | | | | | |
| HR-ADM-04 | /hr/custom-fields | Custom fields (added) | P2 | AU | | | | | | | | |
| HR-ADM-05 | /hr/notification-templates | Notification templates (added) | P1 | AU | | | | | | | | |
| HR-ADM-06 | /hr/audit-logs | Audit logs (added) | P1 | AU | | | | | | | | |
| HR-ADM-07 | /hr/import-export | Import/Export center (added) | P2 | AU | | | | | | | | |
| HR-ADM-08 | /hr/settings | Tenant settings (per System Settings plan) | P1 | AU | | | | | | | | |

---

## 3. Page inventory: Employee portal (`/me/*`)

| ID | Route | Page | HR source | Phase | Status | UI | API | DB | Perm | RT | Flow | Test | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ME-OV-01 | /me/dashboard | Dashboard (check-in/out) | HR-OV-01 | P3 | AU | | | | | | | | |
| ME-OV-02 | /me/calendar | Calendar | HR-OV-02 | P8 | AU | | | | | | | | |
| ME-OV-03 | /me/todo | Todo | HR-OV-03 | P8 | AU | | | | | | | | |
| ME-OV-04 | /me/chat | Chat | HR-OV-04 | P8 | AU | | | | | | | | |
| ME-OV-05 | /me/notifications | Notifications | HR-OV-06 | P1 | AU | | | | | | | | |
| ME-WF-01 | /me/employees | Directory | HR-WF-01 | P2 | AU | | | | | | | | |
| ME-WF-02 | /me/organization/structure | Organization structure | HR-ORG-01 | P2 | AU | | | | | | | | |
| ME-WF-03 | /me/organization/holidays | Holidays | HR-ORG-05 | P2 | AU | | | | | | | | |
| ME-WF-04 | /me/organization/announcements | Announcements | HR-ORG-06 | P2 | AU | | | | | | | | |
| ME-WF-05 | /me/profile | My Profile | HR-WF-03 | P2 | AU | | | | | | | | |
| ME-ATT-01 | /me/attendance/records | Attendance records | HR-ATT-01 | P3 | AU | | | | | | | | |
| ME-ATT-02 | /me/attendance/timesheet | Timesheet | HR-ATT-02 | P3 | AU | | | | | | | | |
| ME-ATT-03 | /me/attendance/regularizations | Regularizations | HR-ATT-03 | P3 | AU | | | | | | | | |
| ME-ATT-04 | /me/attendance/shifts | Shift | HR-ATT-04 | P3 | AU | | | | | | | | |
| ME-ATT-05 | /me/attendance/policies | Attendance policies | HR-ATT-05 | P3 | AU | | | | | | | | |
| ME-ATT-06 | /me/attendance/requests | Overtime/WFH/On-duty/Comp-off (added) | HR-ATT-07 | P3 | AU | | | | | | | | |
| ME-LV-01 | /me/leave/applications | Leave applications | HR-LV-01 | P3 | AU | | | | | | | | |
| ME-LV-02 | /me/leave/balance | Leave balance | HR-LV-02 | P3 | AU | | | | | | | | |
| ME-LV-03 | /me/leave/policies | Leave policies | HR-LV-03/04 | P3 | AU | | | | | | | | |
| ME-LV-04 | /me/leave/team-calendar | Team calendar (added) | HR-LV-05 | P3 | AU | | | | | | | | |
| ME-REC-01 | /me/recruitment/job-postings | Job postings (internal) | HR-REC-01 | P5 | AU | | | | | | | | |
| ME-REC-02 | /me/recruitment/interviews | Interviews (interviewer) | HR-REC-03 | P5 | AU | | | | | | | | |
| ME-REC-03 | /me/recruitment/onboarding | My onboarding | HR-REC-05 | P5 | AU | | | | | | | | |
| ME-REC-04 | /me/recruitment/assessments | My assessments | HR-REC-06 | P5 | AU | | | | | | | | |
| ME-REC-05 | /me/recruitment/career | Career and referrals | HR-REC-09/18 | P5 | AU | | | | | | | | |
| ME-LC-01 | /me/lifecycle/awards | Awards | HR-LC-01 | P6 | AU | | | | | | | | |
| ME-LC-02 | /me/lifecycle/promotions | Promotions and career timeline | HR-LC-02 | P6 | AU | | | | | | | | |
| ME-LC-03 | /me/lifecycle/transfers | Transfers | HR-LC-03 | P6 | AU | | | | | | | | |
| ME-LC-04 | /me/lifecycle/warnings | Warnings | HR-LC-04 | P6 | AU | | | | | | | | |
| ME-LC-05 | /me/lifecycle/resignation | Resignation | HR-LC-05 | P6 | AU | | | | | | | | |
| ME-LC-06 | /me/lifecycle/exit | My exit | HR-LC-06/09 | P6 | AU | | | | | | | | |
| ME-LC-07 | /me/lifecycle/trips | Trips | HR-LC-07 | P6 | AU | | | | | | | | |
| ME-LC-08 | /me/lifecycle/complaints | Complaints | HR-LC-08 | P6 | AU | | | | | | | | |
| ME-PF-01 | /me/performance/reviews | Reviews | HR-PF-01 | P6 | AU | | | | | | | | |
| ME-PF-02 | /me/performance/goals | Goals | HR-PF-02 | P6 | AU | | | | | | | | |
| ME-PF-03 | /me/performance/cycles | Review cycles | HR-PF-03 | P6 | AU | | | | | | | | |
| ME-PF-04 | /me/performance/indicators | Indicators | HR-PF-04 | P6 | AU | | | | | | | | |
| ME-TR-01 | /me/training/trainings | My trainings | HR-TR-01 | P7 | AU | | | | | | | | |
| ME-TR-02 | /me/training/sessions | Training sessions | HR-TR-02 | P7 | AU | | | | | | | | |
| ME-TR-03 | /me/training/programs | Training programs | HR-TR-03 | P7 | AU | | | | | | | | |
| ME-PAY-01 | /me/payroll/payslips | Payslips | HR-PAY-01 | P4 | AU | | | | | | | | |
| ME-PAY-02 | /me/payroll/salary | My salary | HR-PAY-03 | P4 | AU | | | | | | | | |
| ME-PAY-03 | /me/payroll/tax | Tax and investments (added) | HR-PAY-06 | P4 | AU | | | | | | | | |
| ME-PAY-04 | /me/payroll/reimbursements-loans | Reimbursements and loans (added) | HR-PAY-07 | P4 | AU | | | | | | | | |
| ME-PAY-05 | /me/payroll/statutory-forms | PF/ESI and forms (added) | HR-PAY-08 | P4 | AU | | | | | | | | |
| ME-AST-01 | /me/assets/dashboard | Assets dashboard | HR-AST-01 | P7 | AU | | | | | | | | |
| ME-AST-02 | /me/assets | My assets | HR-AST-02 | P7 | AU | | | | | | | | |
| ME-AST-03 | /me/assets/requests | Asset requests | HR-AST-05 | P7 | AU | | | | | | | | |
| ME-COM-01 | /me/meetings | Meetings | HR-COM-01 | P7 | AU | | | | | | | | |
| ME-COM-02 | /me/meetings/action-items | Action items | HR-COM-02 | P7 | AU | | | | | | | | |
| ME-DOC-01 | /me/documents | HR documents | HR-DOC-01 | P7 | AU | | | | | | | | |
| ME-DOC-02 | /me/documents/contracts | My contracts | HR-DOC-02 | P7 | AU | | | | | | | | |
| ME-DOC-03 | /me/documents/acknowledgements | Acknowledgements | HR-DOC-03 | P7 | AU | | | | | | | | |
| ME-DOC-04 | /me/documents/requests | Document requests (added) | HR-DOC-08 | P7 | AU | | | | | | | | |
| ME-MED-01 | /me/media | Shared files and My files | HR-MED-01 | P1 | AU | | | | | | | | |
| ME-ACC-01 | /me/account | Account and security (added) | n/a | P1 | AU | | | | | | | | |
| ME-ACC-02 | /me/helpdesk | Helpdesk (added) | support tickets | P8 | AU | | | | | | | | |
| ME-MGR-01 | /me/team | My Team (added) | n/a | P8 | AU | | | | | | | | |
| ME-MGR-02 | /me/approvals | Approvals (added) | HR-OV-05 | P1 | AU | | | | | | | | |

---

## 4. Platform foundation tasks (Phase P1 checklist)

| ID | Task | Status | Notes |
|---|---|---|---|
| FND-01 | Navigation Registry (menu data for `/hr` and `/me`), sidebar render, badges | NS | Replaces hardcoded menus |
| FND-02 | Route guard chain (auth, tenant, plan, permission, scope, record state), 401/403/404 behavior, portal switcher, default landing | NS | |
| FND-03 | Permission catalog seeded from specs; roles; data scopes; `scopeFilter()`; field-level security; `allowedActions` | NS | |
| FND-04 | Workflow engine (definitions, steps, SLA, escalation, delegation, versioning) and `/hr/workflows` UI | NS | |
| FND-05 | Realtime: rooms, outbox worker, event envelope, catch-up endpoint, client invalidation, presence, edit-lock, 409 merge dialog | NS | Redis adapter |
| FND-06 | Notification service: templates, channels, preferences, bell, digests | NS | |
| FND-07 | Audit log + sensitive read log + history/comments endpoints | NS | |
| FND-08 | Media Library integration and reusable uploader/picker | NS | Links to System Settings plan |
| FND-09 | Shared engines: list, form, detail, master-data blueprint, request/approval blueprint | NS | |
| FND-10 | `linkTo()` deep-link resolver and global search/command palette | NS | |
| FND-11 | Scheduler (jobs registry, `ScheduledJobRun`, jobs UI) | NS | |
| FND-12 | Import/Export job framework with dry-run and progress events | NS | |
| FND-13 | Custom fields, saved views | NS | |
| FND-14 | Test harness: tenant isolation, permission matrix, two-browser realtime test | NS | |

---

## 5. Audit procedure (Phase P0 checklist)

For each inventory row: (1) route and menu, (2) UI vs spec fields/actions/states, (3) API endpoints and scoping, (4) Prisma model and indexes, (5) permissions enforced server-side, (6) workflow integration, (7) realtime emit/consume, (8) interlink side effects (file 03), (9) tests. Then set Status to `NS / PT / DN / RW` and fill the columns and Notes.

Deliver at the end of P0:
- [ ] Completed inventory tables (sections 2 and 3)
- [ ] Gap list per module (missing pages, endpoints, tables, events)
- [ ] Hardcoded values and per-module ad-hoc statuses to migrate
- [ ] Prisma schema diff (table form)
- [ ] Estimates per phase
- [ ] Risk list
- [ ] Answers to Open Questions

---

## 6. Decision Log

| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-001 | 2026-10-07 | HR pages live under `/hr/*`; employee pages under `/me/*`; both are one SPA and one API, differing in scope | Product owner direction | Confirmed |
| D-002 | 2026-10-07 | Menus are generated from a Navigation Registry (no hardcoded sidebars) | Plan/permission-driven menus | Proposed |
| D-003 | 2026-10-07 | Job Locations, Interview Rounds, Depreciations, Asset Types removed from `/me` (HR masters); Terminations merged into My Exit; Candidate Onboarding reshaped to My Onboarding; Media Library becomes Shared Files + My Files | Employees should not manage HR masters; privacy | Proposed (owner may override) |
| D-004 | 2026-10-07 | Employee complaints list shows only complaints the employee filed; complaints against them never shown | Confidentiality | Proposed |
| D-005 | 2026-10-07 | Realtime events carry ids and minimal summary; clients refetch through authorized APIs; outbox pattern for delivery | Security and reliability | Proposed |
| D-006 | 2026-10-07 | Approvals use one shared workflow engine; module-specific status fields are not allowed | Consistency | Proposed |
| D-007 | 2026-10-07 | Withdraw/cancel are state transitions; no hard deletes for transactional records; masters deactivate when in use | Audit and integrity | Proposed |
| D-008 | 2026-10-07 | Employee API integration starts only after the HR portal pages and APIs are complete and cross-verified | Product owner direction | Confirmed |
| D-009 | 2026-10-07 | Employment, salary, policy data are effective-dated, never overwritten | Payroll accuracy and history | Proposed |
| D-010 | 2026-10-07 | Payroll calculation, statutory rules, formula engine and forms follow the Payroll Module Brief; HRMS pages are screens on top | Single source | Confirmed |

---

## 7. Open Questions (owner to answer; agent must not assume)

| ID | Question | Affects | Answer |
|---|---|---|---|
| Q-01 | Which existing pages are already built? (agent will verify by audit, owner can pre-list) | P0 | |
| Q-02 | Confirm decision D-003 (items removed or reshaped in `/me`) or list items to keep | Employee sidebar | |
| Q-03 | Dashboard counts: Awards this year or all time? Warnings active or all? | ME-OV-01 | |
| Q-04 | Meaning of "Career": internal careers, career path, or public careers page? | REC-09, ME-REC-05 | |
| Q-05 | Approval chain defaults per module (manager only, manager + HR, custom)? | Workflow | |
| Q-06 | Check-in methods needed: web, mobile app/PWA, geo-fence, IP, biometric, selfie? | ATT | |
| Q-07 | Which profile fields are instant vs HR-approved? | ME-WF-05 | |
| Q-08 | Can employees create meetings and assign tasks to others? | COM, Todo | |
| Q-09 | Chat scope: tenant-wide DMs, department channels, external users? Retention? | Chat | |
| Q-10 | E-sign: built-in, or integrate a provider? | Contracts, Offers | |
| Q-11 | Job board integrations needed (LinkedIn, Naukri, Indeed)? | REC | |
| Q-12 | Biometric/device vendors to support? | ATT-08 | |
| Q-13 | Multi-country/currency employees, or India only for now? | Payroll, locale | |
| Q-14 | Languages for employee portal (English, Tamil, Hindi)? | i18n | |
| Q-15 | Realtime provider: self-hosted Socket.IO + Redis or hosted (Pusher/Ably)? | FND-05 | |
| Q-16 | Data retention rules for candidates, complaints, audit logs? | Compliance | |
| Q-17 | Plan tiers: which modules/features are gated by subscription plan? | Registry | |
| Q-18 | Is the HR panel white-labelled per tenant (logo/colors) in both portals? | Settings | |

---

## 8. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-01 | Existing pages use ad-hoc statuses and hardcoded dropdowns | Audit and migration tasks; shared engines |
| R-02 | Data leakage across tenants or employees | Tenant/scope tests on every endpoint, `scopeFilter()` single point |
| R-03 | Realtime event storms (imports, payroll) | Coalesced bulk events, throttling, job-progress events |
| R-04 | Payroll errors from unlocked or changing inputs | Month lock, locked runs, effective-dating, run comparison |
| R-05 | Scope creep from added pages | Phase gates; added pages tagged "(added)" and can be deferred |
| R-06 | Sensitive data exposure in notifications, logs, realtime | Minimal payloads, masking, audit of reveals |
| R-07 | Complexity of workflow engine | Build once in P1, reuse everywhere; versioned definitions |

---

## 9. Session Log (append newest at the bottom)

| Date | Session | Work done | Next |
|---|---|---|---|
| 2026-10-07 | Planning S1 | Created file set 00 to 03 and this worklog; page inventory seeded with 105 HR and 59 `/me` pages (all `AU`); phases P0 to P8 defined; decisions D-001 to D-010 recorded; 18 open questions raised | Owner answers Open Questions; agent starts P0 audit (read-only) and fills inventory |

### Session entry template
```
Date: 
Session: 
Pages touched (IDs):
Status changes:
Decisions (new IDs):
Blockers / questions (new IDs):
Tests run / results:
Next steps:
```

---

## 10. Change Log

| Date | Change | By |
|---|---|---|
| 2026-10-07 | Initial worklog created with inventories, phases, decisions, questions, risks | Planning session |
