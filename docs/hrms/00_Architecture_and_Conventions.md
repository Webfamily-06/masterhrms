# 00. Architecture and Conventions (HR `/hr/*` + Employee `/me/*`)

Mode: **PLANNING ONLY.** No code is generated or run from these documents. Files in this pack:

| File | Content |
|---|---|
| `00_Architecture_and_Conventions.md` | Routing, permissions, realtime, API, workflow engine, shared data model, Definition of Done |
| `01_HR_Panel_Spec.md` | Every `/hr/*` page: fields, actions, permissions, realtime |
| `02_Employee_Portal_Spec.md` | Every `/me/*` page: fields, actions, permissions, realtime |
| `03_Interlinking_and_Realtime_Flows.md` | Cross-module flows (hire to retire), event bus, deep links |
| `worklog.md` | Living tracker: page inventory, audit status, phases, decisions, session log |

Stack: React (TanStack Router and Query), Express, Prisma, MySQL, Redis, Socket.IO (or the realtime provider chosen in System Settings), multi-tenant by subdomain `{workspace}.{BASE_DOMAIN}`.

---

## 1. Rules for the agent

1. **Audit first.** Some pages already exist and many do not. Before any build, the agent audits every page in the worklog inventory and records its real status (section 12). Never assume a page is complete.
2. **Plan, then wait for approval** at each phase gate.
3. **The server is the authority.** UI hiding is convenience; every endpoint enforces tenant, permission, data scope, and state rules.
4. **One implementation of each business rule**, shared by `/hr` and `/me` endpoints (same service layer; different scoping and allowed actions).
5. **No hardcoded lists.** Types, categories, statuses, policies, and menus come from master data or registries.
6. **Everything is realtime-aware, audited, tenant-scoped, soft-deleted, and versioned.**
7. Anything unclear: ask using the "Open questions" list in `worklog.md`; do not guess.

---

## 2. URL and routing design

| Prefix | Audience | Scope | Examples |
|---|---|---|---|
| `{workspace}/hr/*` | HR, admins, finance, recruiters, auditors | Organization-wide (limited by data scope) | `/hr/employees`, `/hr/leave/applications` |
| `{workspace}/me/*` | Every logged-in employee (and managers for team pages) | Self, plus own team for manager pages | `/me/dashboard`, `/me/leave/applications` |
| `{workspace}/sa/*` (existing) | Super Admin (platform) | Platform | System Settings |
| `{workspace}/client/*` (existing) | Client portal | Client | Invoices |

Conventions:
- kebab-case, plural resource names, nested by module: `/hr/{module}/{resource}`, detail `/:id`, create `/new`, edit `/:id/edit`.
- Query-string state for lists (`?page&q&status&from&to&branch&sort&view`) so every filtered list is linkable and refresh-safe.
- **Guard chain** on every route: authenticated -> tenant resolved from subdomain -> module enabled for plan -> permission -> data scope -> record state. Failure behavior: 401 login, 403 page with "Go to My Portal" for `/hr` denials, 404 for records outside scope (never reveal existence).
- **Portal switcher** in the header for users who have both `/hr` and `/me` access. Default landing: HR roles -> `/hr/dashboard`; everyone else -> `/me/dashboard`.
- **Navigation Registry:** one data structure defines every menu item (`id`, `portal`, `group heading`, `label`, `icon`, `route`, `moduleKey`, `permission`, `planFeature`, `badgeSource`, `order`). Both sidebars are rendered from it, filtered by plan, permission, and role. Menus are never hardcoded. Badge counts (pending approvals, unread chat) come from realtime counters.
- **Deep link resolver:** one function `linkTo(entityType, id, portal)` returns the correct URL (`employee` -> `/hr/employees/:id` in HR, `/me/profile` for self). Notifications, timelines, and emails use it so links always land in the right portal.
- **Route parity rule:** each `/me/*` page that mirrors an HR page uses the same module key and the same domain service; only scope and actions differ (see page specs).

---

## 3. Roles, permissions, and data scope

### 3.1 Default roles (tenant-editable)
Tenant Admin, HR Admin, HR Manager, Recruiter, Payroll Officer, Finance, Asset Manager, Trainer/L&D, Manager (derived from reporting line, not assigned), Interviewer (derived from assignment), Employee, Auditor (read-only), custom roles.

### 3.2 Permission key format
`{portal}.{module}.{resource}.{action}`, for example `hr.leave.application.approve`, `me.leave.application.create`.

Standard actions: `view`, `create`, `update`, `delete`, `export`, `import`, `approve`, `reject`, `assign`, `publish`, `lock`, `configure`, `view_sensitive`, `impersonate`, `manage` (all).

Employee self permissions (`me.*`) are granted by default to every employee but can be switched off per module/plan (for example disable Trips).

### 3.3 Data scope (applied inside every query by one `scopeFilter()` function)
`SELF`, `TEAM_DIRECT`, `TEAM_ALL` (reporting hierarchy), `DEPARTMENT`, `BRANCH`, `ALL`. A role grants a scope per permission, for example Manager has `hr`-like team views through `/me/team/*` with `TEAM_ALL`; HR Executive may have `BRANCH`; HR Admin `ALL`.

### 3.4 Field-level security
Sensitive fields (salary, CTC, bank, PAN, Aadhaar, passport, DOB year, medical, disciplinary details, complaint identity) require `view_sensitive`. Without it the API omits or masks them. "Reveal" actions re-check session freshness and write an audit row.

### 3.5 Record-level actions
Every record response includes `allowedActions[]` computed server-side (for example `["edit","withdraw"]`) combining permission, scope, and state. The UI only renders what the server allows.

### 3.6 Default grant matrix (summary)

| Module | Employee (self) | Manager | HR Exec/Manager | HR Admin / Tenant Admin | Specialist |
|---|---|---|---|---|---|
| Employees | view own, request profile change | view team (non-sensitive) | CRUD within scope | full + sensitive | n/a |
| Org masters | view | view | CRUD | full | n/a |
| Attendance | own records, requests | approve team | edit, lock, policies | full | n/a |
| Leave | own CRUD requests | approve team | all + adjust balances | full + policies | n/a |
| Recruitment | internal jobs, referrals, interviews (if assigned) | hiring manager role per job | Recruiter: full pipeline | full + masters | Recruiter, Interviewer |
| Lifecycle | read own awards/warnings, request resign/transfer/trip, file complaint | recommend, approve | full | full | n/a |
| Performance | own reviews/goals | review team | cycles, calibrate | full | n/a |
| Training | own, enroll | nominate team | programs, sessions | full | Trainer |
| Payroll | own payslips/salary | none | view | publish, lock | Payroll Officer |
| Assets | own, request | none | allocate | full + depreciation | Asset Manager |
| Meetings | own | create | create | full | n/a |
| Documents | own, acknowledge | none | publish | full + templates | n/a |
| Media | My Files | team shared | folders | full | n/a |
| Access/Workflows/Audit | none | none | none | full | Auditor (read) |

---

## 4. Realtime architecture

### 4.1 Transport and rooms
Socket.IO with Redis adapter (or provider from System Settings). Auth by the same session. Rooms joined automatically on connect:
`tenant:{id}`, `user:{id}`, `role:{tenant}:{roleId}`, `dept:{id}`, `branch:{id}`, `team:{managerId}`, plus on demand `record:{entity}:{id}` (open detail page) and `list:{entity}:{filterHash}` (optional).

### 4.2 Event envelope
`{ eventId, tenantId, type, entity, entityId, action, actorId, version, occurredAt, audience:[rooms], summary, linkTo, data(minimal, no sensitive fields) }`.
Events carry **ids and minimal summary**, never sensitive payloads. Clients refetch through the authorized API.

### 4.3 Reliable delivery (outbox pattern)
1. The request transaction writes the data row and an `OutboxEvent` row together.
2. A worker publishes outbox rows to Redis/Socket (at-least-once), marks them sent, and retries on failure.
3. Clients dedupe by `eventId` and keep `lastEventId`; on reconnect they call `GET /shared/events?since=` to catch up; if the gap is large, they simply refetch active queries.
4. Fallback when the socket is down: refetch on window focus plus 60 s polling for critical widgets (check-in state, approvals count).

### 4.4 Client behavior
- Event -> invalidate matching TanStack Query keys (`[entity]`, `[entity, id]`, `dashboard`, `counters`).
- Lists show a "N new updates, refresh" chip when the user is mid-scroll or filtering; otherwise auto-merge.
- **Optimistic updates** for safe actions (mark read, toggle todo); server confirmation reconciles.
- **Concurrency:** every update sends `version`; mismatch returns 409 with the latest data and a merge/overwrite dialog.
- **Presence and edit locks:** detail/edit pages join `record:{entity}:{id}`; show who else is viewing; soft lock warning when two people edit (hard lock only for payroll run and policy publish).
- **Toasts and notification bell** driven by `user:{id}` events; **badge counters** (approvals, chat unread, tasks due) are pushed counters, not polled.
- Typing/read receipts and presence for chat only.
- Throttle: bursts (for example bulk import) are coalesced into one `bulk.completed` event.

### 4.5 What must be realtime (minimum)
Attendance check-in/out counters, approvals assigned and decided, leave/attendance request status, announcements, chat, todo assignment, meeting invites and reminders, payslip published, interview schedule changes, asset allocation, review/goal status, settings changes, maintenance banner, import/export job progress, payroll run progress.

---

## 5. API conventions

- Base: `/api/v1/hr/*` (organization scope), `/api/v1/me/*` (self), `/api/v1/team/*` (manager), `/api/v1/shared/*` (lookups, notifications, media, search, events). Same service layer behind all.
- **Lists:** `GET` with `page,pageSize` (or `cursor` for large sets), `q`, `sort`, filters, `fields`, `include`. Response `{ data, page, pageSize, total, facets? }`.
- **Create** `POST`, **read** `GET /:id`, **update** `PUT/PATCH /:id` (with `version`), **soft delete** `DELETE /:id` (blocked with `409 IN_USE` plus usage counts for master data).
- **State changes as actions**, not field edits: `POST /:id/actions/{submit|approve|reject|withdraw|cancel|publish|lock|assign|...}` with body `{comment, ...}`.
- **Bulk:** `POST /bulk/{action}` with ids or filter; async jobs return `jobId`; `GET /shared/jobs/:id` with progress; completion via realtime event.
- **Import/Export:** template download, upload, dry-run validation report, commit; exports as Excel/PDF/CSV through the export template engine.
- **Lookups:** `GET /shared/lookups/{type}` cached and invalidated by `lookup.changed` events.
- **Idempotency:** `Idempotency-Key` on every create/action.
- **Errors:** `{ code, message, fieldErrors:[{field,code,message}], requestId }`; validation schemas shared by frontend and backend.
- **Money/dates:** decimal strings with currency; ISO dates; tenant timezone and formats from System Settings utilities.
- **Files:** upload through Media Library; resources store `mediaId`; downloads via short-lived signed URLs.
- **Audit and history:** every resource has `GET /:id/history` (audit + status timeline) and `GET /:id/comments`.

---

## 6. Approval workflow engine (shared by all request-type pages)

Entities: `WorkflowDefinition` (module, resource, conditions, steps, version, active), `WorkflowStep` (order, approverType: REPORTING_MANAGER / MANAGERS_MANAGER / DEPARTMENT_HEAD / ROLE / USER / HR_OWNER, mode: ANY / ALL, SLA hours, escalateTo, canSkip), `ApprovalRequest` (entity, entityId, requester, currentStep, status), `ApprovalAction` (actor, action, comment, at), `Delegation` (from, to, dates).

Behaviors: conditions (for example leave > 3 days adds HR step; amount thresholds), auto-approve rules, SLA reminders and escalation, delegation when approver is on leave, re-submit after rejection, withdraw, cancel after approval (reverses effects), parallel steps, comments required on reject, notifications at each step, full audit.

Status vocabulary (use everywhere): `DRAFT, PENDING, IN_REVIEW, APPROVED, REJECTED, WITHDRAWN, CANCELLED, EXPIRED, COMPLETED`.

Default workflows (configurable at `/hr/access/workflows`): leave, attendance regularization, timesheet, overtime/comp-off/WFH, shift swap, profile change, transfer, promotion, resignation, termination, trip, expense, loan, asset request, offer, job posting publish, goal approval, training enrollment, document request, salary revision, payroll run approval.

---

## 7. Shared data model (summary)

Common columns on every table: `id`, `tenantId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `version`. All indexes start with `tenantId`.

| Group | Tables |
|---|---|
| Identity and access | Tenant, User, Session, Role, Permission, RolePermission(scope), UserRole, Delegation, ImpersonationLog |
| People hub | **Employee** (core profile), EmployeeEmployment (effective-dated: branch, department, designation, manager, type, grade, location/state), EmployeeContact, EmployeeAddress, EmployeeBank, EmployeeStatutory (UAN, PF, ESI, PAN, Aadhaar), EmployeeFamily, EmployeeEducation, EmployeeExperience, EmployeeSkill, EmployeeDocument, **EmployeeEvent** (append-only timeline of every lifecycle change) |
| Org masters | Branch, Department, Designation, Holiday (+HolidayLocation), Announcement (+Audience, +Read, +Ack), AwardType, DocumentType |
| Attendance | AttendanceRecord (+Punch), Timesheet (+Entry), Regularization, Shift, ShiftAssignment, Roster, AttendancePolicy (versioned), OvertimeRequest, AttendanceDevice, GeoFence, MonthLock |
| Leave | LeaveType, LeavePolicy (+Rule), LeaveBalance, LeaveLedger, LeaveApplication, Encashment, CompOff |
| Recruitment | JobPosting, Candidate (+Application, +Stage history), Interview (+Panel, +Feedback), Offer, CandidateOnboarding (+Task), Assessment (+Question, +Attempt), OnboardingChecklist (+CheckItem), CareerSite, JobCategory, JobType, JobLocation, CandidateSource, InterviewType, InterviewRound, OfferTemplate, Referral |
| Lifecycle | Award, Promotion, Transfer, Warning, Resignation, Termination, Trip (+Expense), Complaint (+CaseNote), ExitCase (+Clearance), Probation |
| Performance | ReviewCycle, Review (+IndicatorRating), Goal (+Progress), Indicator, IndicatorCategory, GoalType |
| Training | TrainingProgram, TrainingSession (+Attendance), EmployeeTraining, TrainingType |
| Payroll | SalaryComponent, SalaryStructure, EmployeeSalary (+Revision), PayrollRun, Payslip (+Line), StatutoryPolicy, Formula, ExportTemplate, FormTemplate, TaxDeclaration, Reimbursement, Loan (see Payroll brief) |
| Assets | Asset, AssetType, AssetAllocation, AssetRequest, AssetMaintenance, DepreciationSchedule, AssetAudit |
| Communication | Meeting (+Attendee), ActionItem, MeetingType, MeetingRoom (+Booking), Todo, ChatChannel, ChatMember, ChatMessage, ChatReceipt |
| Documents | HrDocument (+Version), EmployeeContract, Acknowledgement (+Assignment), ContractTemplate, DocumentTemplate, ContractType, DocumentCategory, GeneratedLetter, SignatureRequest |
| Platform | ApprovalRequest, ApprovalAction, WorkflowDefinition, Notification, NotificationTemplate, OutboxEvent, AuditLog, MediaFile, MediaUsage, Comment, Attachment, NumberSequence, CustomField(+Value), SavedView, ImportJob, ExportJob, ScheduledJobRun |

**Employee is the hub.** Every module references `employeeId`; every change that affects an employee also appends an `EmployeeEvent` so the Employee 360 timeline (`/hr/employees/:id`, `/me/profile`) is always complete.

---

## 8. Cross-cutting features (build once, reuse everywhere)

- **List engine:** server-side table with saved views, column chooser, filters, bulk select, export, empty/error/loading states.
- **Form engine:** schema-driven fields, custom fields, draft autosave, attachment uploader, rich text, inline validation, dirty-state guard.
- **Detail engine:** header, status chip, `allowedActions`, tabs, timeline (history + comments), related records panel.
- **Master-data blueprint (P1):** fields `name, code (unique per tenant), description, isActive, sortOrder`; actions CRUD, activate/deactivate, reorder, import/export; delete blocked when referenced (shows usage count, offer deactivate); `lookup.changed` realtime refresh of every open form dropdown. All "Types", "Categories", "Sources", "Rooms" use this blueprint unless the page spec adds fields.
- **Request/approval blueprint (P2):** fields common to requests: `requestNo (sequence), requester, status, submittedAt, currentApprover, comments, attachments`; actions submit, edit while pending, withdraw, approve, reject, cancel; timeline; notifications.
- **Notifications:** in-app, email, push; templates per event with variables; per-user preferences; digest option; quiet hours; deep link by `linkTo()`.
- **Search:** global command palette (people, pages, records the user may access).
- **Documents:** PDF generation service for payslips, letters, forms, reports; Excel export service.
- **Scheduler:** accruals, reminders, birthdays, probation ends, contract expiry, document expiry, SLA escalations, announcement publish/expire, training reminders, depreciation, payroll cutoffs, cleanup. Each job reads its settings from the DB each tick and writes `ScheduledJobRun`.
- **Reports and analytics:** standard reports per module plus scheduled email reports.
- **Audit:** before/after for every write; sensitive reads logged.
- **Localization and formatting:** from System Settings only.

---

## 9. Page spec format used in files 01 and 02

Each page row gives: **ID, route (permission resource)**, **fields**, **actions, rules and links**, **realtime and notifications**. Permission keys follow `hr.{module}.{resource}.{action}` or `me.{...}` by convention; only special permissions are written out. "P1" and "P2" refer to the blueprints in section 8.

---

## 10. Security checklist (global)

Tenant isolation tests on every endpoint; permission and scope tests; sensitive-field masking; rate limits (login, check-in, uploads, chat); upload hardening; signed URLs; CSRF; audit for exports and sensitive reveals; idempotency; PII retention rules (DPDP); no sensitive data in realtime payloads, logs, or URLs.

---

## 11. Definition of Done (per page)

A page is DONE only when all are true:
1. **Route and menu:** registered in Navigation Registry with correct permission and plan feature.
2. **UI:** list, create, edit, detail, empty, loading, error states; responsive; accessible; uses shared engines.
3. **Fields and validation** match the spec; shared schema on both sides.
4. **API:** all endpoints exist, tenant-scoped, permission and data-scope enforced, `allowedActions` returned.
5. **DB:** Prisma model, indexes, soft delete, version, audit.
6. **Workflow:** approval config wired where applicable; status transitions enforced.
7. **Realtime:** events emitted via outbox; UI reacts; counters update.
8. **Notifications:** templates exist and deep links work.
9. **Interlinks:** side effects on other modules implemented per `03_Interlinking_and_Realtime_Flows.md`.
10. **Tests:** unit (rules), API (permission, scope, tenant), UI smoke, realtime two-browser test.
11. **Docs and worklog updated.**

---

## 12. Audit procedure for pages that already exist

For each worklog inventory row, the agent inspects (read-only) and records:

| Check | Pass criteria |
|---|---|
| Route and menu | Route works, correct prefix, in registry |
| UI completeness | All spec fields, actions, states present |
| API | Endpoints exist for all actions; tenant and scope enforced |
| Data | Prisma model matches spec; no hardcoded lists |
| Permissions | Server-side keys enforced; UI hides correctly |
| Workflow | Uses engine, not ad-hoc status fields |
| Realtime | Events emitted and consumed |
| Links | Interlink side effects present |
| Quality | Tests, error states, performance |

Result per page: `NOT STARTED`, `PARTIAL (list gaps)`, `COMPLETE`, `NEEDS REWORK (reason)`. The agent then proposes the gap-closing task list per module.
