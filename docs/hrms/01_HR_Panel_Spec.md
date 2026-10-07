# 01. HR Panel Specification: `{workspace}/hr/*`

Planning only. Conventions, permissions, realtime and API rules are in `00_Architecture_and_Conventions.md`. "P1" = master-data blueprint, "P2" = request/approval blueprint. Permission keys: `hr.{module}.{resource}.{action}` (view, create, update, delete, export, import, approve, publish, lock, view_sensitive, configure). Items marked **(added)** are pages not in the sidebar you supplied but required for the flows to work.

Sidebar (Navigation Registry output for `/hr`):
1. Overview: Dashboard, Calendar, Todo (added), Chat, Approvals (added), Reports (added)
2. Workforce Management: Employees, Organization Structure (Branches, Departments, Designations, Holidays, Announcements, Award Types, Document Types), Attendance, Leave Management
3. Talent and Growth: Recruitment, Employee Lifecycle, Performance Management, Training and Development
4. Finance and Assets: Payroll Management, Asset Management
5. Communication and Content: Meetings, Documents and Contracts, Media Library
6. Administration (added): Access and Roles, Workflows, Custom Fields, Notification Templates, Audit Logs, Import/Export Center, Settings

---

## 1. Overview

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-OV-01** `/hr/dashboard` (`dashboard`) | Widgets (each has own permission): headcount by branch/department/type, new joiners, exits, attendance today (present, absent, late, on leave, not checked in), pending approvals by type, leaves today, birthdays/anniversaries, open positions and pipeline funnel, probation ending, contracts/documents expiring, payroll run status, assets due, trainings due, open complaints, latest announcements, upcoming meetings | Filters: branch, department, date; drill-down from every number to the filtered list; widgets configurable and ordered per user; export snapshot | Live attendance counters, approvals count, new joiner/exit tick; `dashboard.counters` pushed to `tenant` and `branch` rooms |
| **HR-OV-02** `/hr/calendar` (`calendar`) | Event: title, type, start/end, all-day, color, location, attendees, recurrence, reminders, linked entity | Layers toggle: holidays, leaves, meetings, interviews, trainings, birthdays/anniversaries, review deadlines, payroll dates, compliance due dates, personal events; create only personal/company events here, other layers link to source page; drag to reschedule where the source allows | `calendar.changed` refreshes visible layers; reminders via scheduler |
| **HR-OV-03** `/hr/todo` (`todo`) (added) | Title, description, assignee, creator, due date, priority, status (To do/In progress/Done), tags, checklist, reminder, recurrence, linked entity (employee, candidate, request), attachments, comments | List and kanban; assign to others (permission scope); convert action items from meetings; overdue highlighting; recurring tasks; bulk complete | Assignment notifies assignee; status change updates creator; counters on sidebar badge |
| **HR-OV-04** `/hr/chat` (`chat`) | Channel (DM, group, department, announcement-only), members, messages (text, attachments, mention, reaction, reply thread), read receipts, pinned, mute, search | Create channels by permission; auto channels per department/branch; moderation, retention settings; file share through Media Library; link a message to a record; presence | Fully realtime: typing, read, presence, unread badge counters per user; offline queue |
| **HR-OV-05** `/hr/approvals` (`approval`) (added) | Unified inbox: type, requester, summary, submittedAt, step, SLA, status | Filters by type/status/age; open item in drawer with full context; approve/reject (comment required on reject), bulk approve, delegate, reassign, escalate; history | `approval.assigned/decided` to approver and requester; sidebar badge |
| **HR-OV-06** `/hr/notifications` (`notification`) (added) | Notification: title, body, module, linkTo, readAt | Mark read/all, filter by module, preferences | Bell updates instantly |
| **HR-OV-07** `/hr/reports` (`report`) (added) | Report catalog by module, parameters, saved reports, schedules | Run, export Excel/PDF, schedule email, share with roles; headcount, attrition, attendance summary, leave liability, payroll register, recruitment funnel, training compliance, asset register | Long reports run as jobs with progress event |

---

## 2. Workforce Management

### 2.1 Employees

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-WF-01** `/hr/employees` (`employee`) | Columns: code, name, photo, designation, department, branch, manager, type, status, joining date, work state, phone, email; filters on all, saved views, card/table view | Create, import (Excel template with dry-run), bulk update (manager, department, shift, policy), export (permission-gated columns), activate/deactivate, ID card PDF, send invite, resend credentials | `employee.created/updated/status_changed` refresh lists; new-joiner counter |
| **HR-WF-02** `/hr/employees/new` | **Wizard steps.** 1 Personal: first/middle/last name, gender, DOB, marital status, blood group, nationality, photo. 2 Contact: official email, personal email, phones, current and permanent address (line1, line2, city, state, pincode, country), emergency contacts. 3 Job: employee code (sequence), joining date, employment type (full-time/part-time/contract/intern/consultant), status, branch, department, designation, grade, reporting manager, work location and **work state**, probation months, notice period days, shift, attendance policy, leave policy, holiday calendar, cost center. 4 Compensation: salary structure, CTC, effective date, PF/ESI applicability, tax regime. 5 Statutory and bank: UAN, PF no, ESIC no, PAN, Aadhaar (masked), bank name, account, IFSC. 6 Documents: by Document Type (mandatory flagged). 7 Access: role, portal access, invite email. 8 Onboarding: checklist, assets, buddy | Duplicate check (email, phone, PAN, Aadhaar); required docs gating; autosave draft; on create: creates User and invite, initial leave balances (prorated), shift and policy assignment, salary structure, onboarding checklist tasks, asset requests, welcome announcement, `EmployeeEvent: JOINED`; can be pre-filled from an accepted Offer / Candidate Onboarding | `employee.created` to HR rooms; invite email; manager notified; IT/asset teams notified by checklist tasks |
| **HR-WF-03** `/hr/employees/:id` (`employee`, sensitive via `view_sensitive`) | **Employee 360 tabs:** Overview, Job and history (effective-dated), Personal and family, Education and experience, Documents (verify/reject), Statutory and bank (masked), Salary and revisions, Attendance, Leave (balances and ledger), Assets, Lifecycle (awards, promotions, transfers, warnings, complaints, resignation/termination), Performance (reviews and goals), Training, Contracts and acknowledgements, Payslips, Timeline (all `EmployeeEvent`), Audit | Edit sections with approval where configured, change manager/department/branch (creates Transfer record when policy requires), deactivate/offboard, rehire, impersonate (audited), reset password, manage access, generate letters, download profile PDF | Presence on page; `employee.updated` refreshes tabs; field changes notify employee if they affect them |
| **HR-WF-04** `/hr/employees/import` (added) | Template, mapping, validation report, commit, error file | Dry-run, partial commit option, rollback of a batch within 24h | Job progress events |

### 2.2 Organization Structure (parent menu with submenus)

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-ORG-01** `/hr/organization/structure` (`org`) | Interactive org chart (reporting tree, department tree, branch view), vacancy nodes, headcount per node | Search, zoom, export PNG/PDF; drag to change reporting line (creates request/transfer per policy); click node opens employee 360 | `org.changed` redraws chart |
| **HR-ORG-02** `/hr/organization/branches` (`branch`, P1+) | Name, code, address (line1/2, city, **state**, pincode, country), phone, email, timezone, head, geo-fence (lat, long, radius), weekly-off pattern, holiday calendar, statutory registrations (PF code, ESIC code, PT registration, LWF, GSTIN), currency override | CRUD; deactivate only if no active employees; state drives payroll statutory rules; used in filters everywhere | `lookup.changed(branch)` |
| **HR-ORG-03** `/hr/organization/departments` (`department`, P1+) | Name, code, parent department, branch(es), head, cost center, description | Tree CRUD, move department, headcount view; deactivate blocked if employees/jobs reference | `lookup.changed(department)`; head change notifies |
| **HR-ORG-04** `/hr/organization/designations` (`designation`, P1+) | Name, code, grade/level, band, department(s), reports-to designation, job description file, salary band min/max | CRUD, reorder levels, usage count; link to jobs and promotions | `lookup.changed` |
| **HR-ORG-05** `/hr/organization/holidays` (`holiday`) | Name, date, type (Public/Optional/Restricted/Company), applicable branches/states/departments, description, year, optional quota per employee | CRUD, copy previous year, import state templates, calendar view; optional-holiday selection window; changes affect attendance and leave calculations (recalc preview before saving) | `holiday.changed` updates calendars and attendance views |
| **HR-ORG-06** `/hr/organization/announcements` (`announcement`) | Title, rich body, category, audience (all, branches, departments, designations, roles, specific employees), attachments, publishAt, expiresAt, pinned, priority, require acknowledge, channels (in-app, email, push), status (Draft, Scheduled, Published, Expired, Archived) | CRUD, preview as employee, schedule, duplicate, delivery stats (delivered, read, acknowledged per employee), reminders to non-acknowledged, comments toggle | Publish pushes to audience rooms; bell, email, banner; read/ack counters live |
| **HR-ORG-07** `/hr/organization/award-types` (`award_type`, P1+) | Name, description, icon, default gift/cash value, frequency | CRUD; used by Awards | `lookup.changed` |
| **HR-ORG-08** `/hr/organization/document-types` (`document_type`, P1+) | Name, applies to (Employee/Candidate/Both), mandatory, requires expiry date, validity months, verification required, allowed formats and max size, category | CRUD; drives document checklists in onboarding and expiry reminders | `lookup.changed` |

---

## 3. Attendance

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-ATT-01** `/hr/attendance/records` (`attendance`) | Employee, date, shift, check-in, check-out, source (Web/Mobile/Biometric/Manual/Import), IP, geo, device, selfie, worked hours, status (Present, Absent, Half-day, Leave, Holiday, Week-off, LOP, WFH, On-duty), late min, early-out min, OT min, remarks, regularization link | Day/month grid and table; manual add/edit with reason (audited); bulk import; recalculate; mark absent (cron at cutoff); **month lock** (`lock`) prevents edits; export; heatmap | Check-ins stream into live board; `attendance.updated` to employee; lock event |
| **HR-ATT-02** `/hr/attendance/timesheets` (`timesheet`) | Employee, period, entries (date, project, task, hours, billable, notes), total hours, status | Approve/reject (with comment), bulk approve, unlock for edit, compare with attendance hours, export | Submission notifies approver; decision notifies employee |
| **HR-ATT-03** `/hr/attendance/regularizations` (`regularization`, P2) | Employee, date, requested in/out, reason, attachment, current record, status, approver chain | Approve updates the attendance record (linked, reversible), reject with reason, limits per month enforced, bulk, HR can raise on behalf | `request.status_changed`; approver inbox |
| **HR-ATT-04** `/hr/attendance/shifts` (`shift`) | Name, code, start, end, break minutes, grace in/out, half-day hours, full-day hours, night-shift flag, weekly offs, color, active. Tabs: **Assignments** (employee/department/branch, effective from/to), **Rosters** (weekly/rotational grid, publish), **Swaps** (requests) | CRUD, conflict detection, bulk assign, roster publish notifies employees, swap approval | Roster publish and changes notify affected employees |
| **HR-ATT-05** `/hr/attendance/policies` (`attendance_policy`) | Name, applies to (branch/department/designation/type), working days, grace minutes, late-mark rule (for example 3 lates = half-day), half/full-day thresholds, OT rules (eligibility, multiplier, minimum, approval), geo-fence/IP/device/selfie rules, auto check-out time, regularization limit and window, LOP rules, comp-off rules, WFH rules, effective from (versioned) | CRUD with versioning; simulate on sample employee; assignment preview; publishing creates a new version, old months keep old version | `policy.published` notifies HR; employees see updated policy page |
| **HR-ATT-06** `/hr/attendance/live` (added) | Today board: checked-in, not yet, late, on leave, on break, location map, shift filter | Nudge reminder, mark manual, export | Live via check-in events |
| **HR-ATT-07** `/hr/attendance/overtime` (added, P2) | Employee, date, hours, reason, rate, status | Approve; feeds payroll earnings | Standard request events |
| **HR-ATT-08** `/hr/attendance/devices` (added) | Biometric/device registry (name, type, branch, serial, API key), geo-fences, IP allow-lists, sync log | Register, test, sync, map device user ids to employees | Device sync status |

---

## 4. Leave Management

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-LV-01** `/hr/leave/applications` (`leave_application`, P2) | Employee, leave type, from/to, half-day (first/second), days computed (excludes holidays/week-offs per policy), reason, attachment, contact during leave, handover to, status, approver chain, balance before/after | Approve/reject/cancel (even after approval, reverses balance), apply on behalf, edit dates with re-validation, bulk approve, calendar view, conflict view (team overlap), export | Notifies approver, employee, handover person; updates attendance (status Leave), balance counters, team calendar |
| **HR-LV-02** `/hr/leave/balances` (`leave_balance`) | Employee, type, year, opening, accrued, used, pending, adjusted, carried forward, encashed, available; ledger entries (date, reason, source) | Manual adjust (reason required, audited), bulk import, accrual run (preview then commit), year-end carry-forward and lapse, ledger view, export | `leave.balance_changed` to employee |
| **HR-LV-03** `/hr/leave/types` (`leave_type`, P1+) | Name, code, paid/unpaid, color, annual quota, accrual (none/monthly/yearly/pro-rata), carry-forward limit and expiry, encashable, document required after N days, gender restriction, min/max per request, half-day allowed, back-dated days allowed, probation applicability, sandwich rule (count holidays/week-offs between), comp-off flag | CRUD; delete blocked if used; change effective from a date | `lookup.changed` |
| **HR-LV-04** `/hr/leave/policies` (`leave_policy`) | Name, applies to, leave types with quotas, accrual schedule, probation rules, notice rule, blackout dates, max consecutive days, approval workflow, effective from (versioned) | CRUD with versioning, assign by rule, preview impact, employees on policy list | Notifies HR on publish |
| **HR-LV-05** `/hr/leave/calendar` (added) | Team/department/branch grid showing who is off, pending vs approved | Filters, coverage warnings (minimum staff) | Live updates |
| **HR-LV-06** `/hr/leave/encashment-compoff` (added, P2) | Encashment: employee, type, days, amount; Comp-off: worked-on date, proof, credit days, expiry | Approve, credit to balance, payroll link for encashment | Standard |

---

## 5. Talent and Growth: Recruitment

Pipeline rule: Job Posting -> Candidate -> Assessment -> Interviews (rounds) -> Offer -> Candidate Onboarding -> Employee.

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-REC-01** `/hr/recruitment/job-postings` (`job_posting`) | Title, code, department, designation, branch/location, category, type, openings, experience range, salary range (internal/visible), skills, description, responsibilities, requirements, qualifications, deadline, hiring manager, recruiters, hiring team, screening questions, interview round template, assessment template, publish channels (Career site, Internal, boards), status (Draft, Pending approval, Open, On hold, Closed, Filled) | CRUD, approval before publish (headcount check against budget/vacancy), publish/unpublish, duplicate, close with reason, share link, stats (views, applications, funnel) | Publish updates career site and internal jobs instantly; notifies recruiters; application counters live |
| **HR-REC-02** `/hr/recruitment/candidates` (`candidate`) | Name, email, phone, resume, photo, source, job(s) applied, current company, current/expected CTC, notice period, total/relevant experience, skills, education, location, stage, rating, tags, notes, consent, status (New, Screening, Assessment, Interview, Offer, Hired, Rejected, On hold, Withdrawn), duplicate flag | Add manually, import, resume parse, duplicate detection (email, phone), move stage with required reason, bulk email/reject, assign recruiter, merge duplicates, talent pool, blacklist; candidate 360 (stage history, assessments, interviews, offers, documents, emails, notes) | Stage change notifies recruiter/hiring manager; application from career site arrives live |
| **HR-REC-03** `/hr/recruitment/interviews` (`interview`) | Candidate, job, round, interview type, date, time, duration, mode (Onsite/Video/Phone), room or meeting link, interviewers (panel), status (Scheduled, Rescheduled, Completed, No-show, Cancelled), scorecard per interviewer, feedback, recommendation (Strong yes to Strong no), overall decision | Schedule with **conflict check** (interviewer calendar, room booking), invite emails and calendar files, reschedule, cancel, feedback reminders, lock feedback, compare candidates, decision moves candidate stage | Interviewer notified live; feedback submission notifies recruiter; room booking created in Meeting Rooms |
| **HR-REC-04** `/hr/recruitment/offers` (`offer`, P2) | Candidate, job, designation, department, branch, joining date, CTC breakup (from salary structure), template, expiry date, approvers, status (Draft, Pending approval, Approved, Sent, Accepted, Declined, Expired, Revoked), e-sign, negotiation history | Generate letter from template, approval workflow, send, resend, revise, revoke, accept record; **accepted offer triggers Candidate Onboarding** | Candidate email; approvers notified; status live |
| **HR-REC-05** `/hr/recruitment/candidate-onboarding` (`onboarding`) | Candidate, offer, joining date, checklist instance (tasks with owner, due, status), documents collected (by Document Type), background verification status, asset pre-allocation, buddy, IT accounts, status (Pending, In progress, Ready to join, Joined, Dropped) | Track tasks, collect documents through candidate link, verify, **Convert to Employee** (pre-fills employee wizard; creates user, balances, salary structure), drop with reason | Task owners notified; progress bar live; conversion emits `employee.created` |
| **HR-REC-06** `/hr/recruitment/assessments` (`assessment`) | Template: name, type (MCQ, coding, assignment, psychometric, custom), questions (type, marks, correct answers), duration, passing score, randomize; Assignment: candidate, link, expiry, attempts; Result: score, per-question, time taken, proctor flags | Build templates, assign to candidates, auto-grade MCQ, manual review for assignments, share result, reset attempt | Candidate completion notifies recruiter; result updates candidate stage |
| **HR-REC-07** `/hr/recruitment/onboarding-checklists` (`onboarding_checklist`, P1+) | Name, applies to (department/designation/type), items in sequence | CRUD, clone; instantiated at onboarding | `lookup.changed` |
| **HR-REC-08** `/hr/recruitment/check-items` (`check_item`, P1+) | Title, description, owner (HR/IT/Manager/Employee/Admin/Finance), due after joining (days, can be negative), document required, mandatory, auto-action (create asset request, create account) | CRUD | `lookup.changed` |
| **HR-REC-09** `/hr/recruitment/career-site` (`career_site`) (Career) | Enable, slug/custom domain, theme and banner, about text, jobs filters, application form fields, EEO text, privacy text, SEO, source tracking | Preview, publish; applications flow into Candidates | Instant publish |
| **HR-REC-10** `/hr/recruitment/job-categories` (P1) | Name, code, description | CRUD | `lookup.changed` |
| **HR-REC-11** `/hr/recruitment/job-types` (P1) | Name (Full-time, Contract, Intern...), code | CRUD | `lookup.changed` |
| **HR-REC-12** `/hr/recruitment/job-locations` (P1+) | Name, address, city, state, country, remote/hybrid flag, branch link | CRUD | `lookup.changed` |
| **HR-REC-13** `/hr/recruitment/candidate-sources` (P1+) | Name, type (Career site, Portal, Agency, Referral, Campus, Social), cost, agency contact | CRUD; used in source analytics | `lookup.changed` |
| **HR-REC-14** `/hr/recruitment/interview-types` (P1+) | Name, mode default, default duration | CRUD | `lookup.changed` |
| **HR-REC-15** `/hr/recruitment/interview-rounds` (P1+) | Name, sequence, interview type, default duration, interviewer pool, scorecard criteria and weights, pass criteria | CRUD, reorder; attach to job postings | `lookup.changed` |
| **HR-REC-16** `/hr/recruitment/offer-templates` (P1+) | Name, rich body with variables, CTC table layout, signature block, validity days, approval flow | CRUD, preview with sample data, versioning | `lookup.changed` |
| **HR-REC-17** `/hr/recruitment/pipeline` (added) | Kanban of candidates by stage per job | Drag to change stage (reason prompts), quick actions | Live card moves between users |
| **HR-REC-18** `/hr/recruitment/referrals` (added) | Referrer, candidate, job, status, bonus eligibility/amount | Track, mark bonus payable to payroll | Notifies referrer on stage changes |

---

## 6. Talent and Growth: Employee Lifecycle

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-LC-01** `/hr/lifecycle/awards` (`award`) | Employee, award type, title, date, gift/cash value, description, certificate (generated PDF), publish to announcements toggle, nominated by, status | CRUD; optional nomination workflow; generate certificate; counts on employee dashboard; payroll one-time earning if cash | Employee notified live; optional company-wide announcement |
| **HR-LC-02** `/hr/lifecycle/promotions` (`promotion`, P2) | Employee, current and new designation, grade, department, effective date, salary change (new CTC or %), reason, recommended by, approvals, letter | On approval at effective date: updates employment record (effective-dated), creates salary revision, appends timeline, generates promotion letter; scheduled effective date supported | Employee, manager, payroll notified |
| **HR-LC-03** `/hr/lifecycle/transfers` (`transfer`, P2) | Employee, from/to branch, department, manager, location/state, effective date, reason, approvals, relieving and joining managers' consent | On effective date: updates employment, reassigns shift/policies/holiday calendar, **changes payroll state rules**, moves leave balance rules, notifies both managers; transfer letter | Notifies employee and both managers |
| **HR-LC-04** `/hr/lifecycle/warnings` (`warning`) | Employee, type, severity (Verbal/Written/Final), subject, description, incident date, issued by, witnesses, attachments, acknowledgement required, employee response, valid until, status | Issue, acknowledge tracking, view response, revoke; sensitive visibility; link to complaint case; escalation to termination review | Employee notified; acknowledgement pushes back to HR |
| **HR-LC-05** `/hr/lifecycle/resignations` (`resignation`, P2) | Employee, notice date, requested LWD, policy LWD (computed from notice period), reason, status, manager decision, HR decision, accepted LWD, exit interview, clearance checklist, F&F link | Accept (with modified LWD), reject/retain with counter, withdraw handling, start Exit Case (HR-LC-09), exit interview scheduling, rehire eligibility | Manager, HR, IT/asset/finance clearance owners notified |
| **HR-LC-06** `/hr/lifecycle/terminations` (`termination`, P2, restricted) | Employee, type (Misconduct, Performance, Redundancy, End of contract, Absconding), notice date, termination date, reason, details, approvals, severance, rehire eligibility, legal notes | Approve, execute on date (deactivate user, revoke access), generate letter, start Exit Case | Restricted audience; employee notified at execution |
| **HR-LC-07** `/hr/lifecycle/trips` (`trip`, P2) | Employee, purpose, destination, from/to dates, mode, itinerary, advance requested, estimated cost, status; Expenses: category, amount, bills, date | Approve trip, issue advance (payroll/finance), settlement with bills, mark paid; links to reimbursements | Standard request events |
| **HR-LC-08** `/hr/lifecycle/complaints` (`complaint`, restricted) | Complainant (or anonymous flag), against employee, category, description, evidence, incident date, severity, assigned investigator, status (New, Under review, Investigating, Resolved, Closed), resolution, confidentiality, case notes | Assign, add case notes, request statements, resolve with action (link to warning, transfer), close; complainant status tracking (without exposing confidential data); anonymity preserved | Investigator notified; complainant sees status changes only |
| **HR-LC-09** `/hr/lifecycle/exits` (added) | Exit case: employee, source (resignation/termination/retirement/end of contract), LWD, clearance items by department (IT, Admin, Finance, HR, Manager) with owner and status, assets to return, knowledge transfer, exit interview, F&F amounts, documents (relieving, experience) | Track clearance, auto-create asset return tasks, trigger F&F in payroll, generate letters, finalize and **deactivate employee** at LWD | Task owners notified; employee sees progress in My Exit |
| **HR-LC-10** `/hr/lifecycle/probation` (added) | Employee, probation end, review, outcome (Confirm/Extend/Terminate) | Reminder before end, confirmation letter, update employment status | Manager reminded |

---

## 7. Talent and Growth: Performance Management

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-PF-01** `/hr/performance/reviews` (`review`) | Employee, cycle, reviewer(s), self-assessment (ratings per indicator, comments), manager assessment, overall rating, goals achievement, strengths, improvements, development plan, status (Not started, Self review, Manager review, Calibration, Released, Acknowledged) | Track completion, send reminders, calibrate (rating distribution), release in bulk, reopen, export; rating can feed promotion/increment recommendation | Phase deadlines notify; release notifies employees |
| **HR-PF-02** `/hr/performance/goals` (`goal`, P2) | Employee, goal type, title, description, KPI/metric, target, weight, start/due, progress %, status, parent goal (cascade), manager comments, check-ins | Approve goals, track progress, bulk assign company/department goals, lock after cycle phase | Manager approvals; progress updates live |
| **HR-PF-03** `/hr/performance/cycles` (`review_cycle`) | Name, type (Annual, Half-yearly, Quarterly, Probation), period, participants (rules), phases with dates (goal setting, self review, manager review, calibration, release), templates, rating scale, weights, status (Draft, Active, Closed) | Launch (creates reviews for participants), extend phases, close, clone previous | Launch notifies participants; phase reminders |
| **HR-PF-04** `/hr/performance/indicators` (`indicator`, P1+) | Name, category, description, weight, rating descriptors per level, applicable designations/departments | CRUD | `lookup.changed` |
| **HR-PF-05** `/hr/performance/goal-types` (P1+) | Name, measurement type (Numeric, Percentage, Milestone, Yes/No), description | CRUD | `lookup.changed` |
| **HR-PF-06** `/hr/performance/indicator-categories` (P1) | Name, description, weight default | CRUD | `lookup.changed` |

---

## 8. Talent and Growth: Training and Development

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-TR-01** `/hr/training/employee-trainings` (`employee_training`) | Employee, program/session, assigned/enrolled date, due date, status (Assigned, Enrolled, In progress, Completed, Failed, Cancelled), completion date, score, certificate, feedback, cost | Assign individually/bulk, approve enrollment requests, mark complete, upload certificate, reminders, compliance report | Employee notified; completion updates profile skills |
| **HR-TR-02** `/hr/training/sessions` (`training_session`) | Program, title, date/time, duration, mode, venue/room or link, trainer (internal/external), capacity, attendees, attendance marking, materials, feedback form | Schedule with room conflict check, enroll, mark attendance, collect feedback, cancel/reschedule | Invitees notified; calendar events |
| **HR-TR-03** `/hr/training/programs` (`training_program`) | Name, type, description, objectives, duration, cost, mandatory flag, applicable to, prerequisites, validity/recertification period, passing criteria, certificate template, materials | CRUD, publish, assign by rule (new joiners, designation) | Auto-assignment notifies |
| **HR-TR-04** `/hr/training/types` (P1) | Name, code | CRUD | `lookup.changed` |

---

## 9. Finance and Assets: Payroll Management

The calculation engine, statutory rules, formulas, export templates and one-click forms are specified in the **Payroll Module Brief** (already created). These pages are the HRMS screens on top of it.

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-PAY-01** `/hr/payroll/payslips` (`payslip`) | Employee, period, run, earnings and deductions lines, gross, net, employer contributions (restricted), YTD, status (Draft, Published), PDF | View, regenerate, publish/unpublish (individually or bulk), email, password option, download ZIP, hide net pay option | Publish pushes `payslip.published` to each employee |
| **HR-PAY-02** `/hr/payroll/runs` (`payroll_run`) | Period, scope (all/branch/department/state), status (Draft, Calculated, Reviewed, Approved, Locked, Paid), counts, totals, validation errors/warnings, comparison with last month | Create run, pull attendance/leave/LOP, calculate (background job), validate, review variances, approve (maker-checker), lock, generate outputs (paysheet Excel/PDF, bank file, statutory data), reopen with reason, post to accounts | Job progress live; status events to approvers |
| **HR-PAY-03** `/hr/payroll/employee-salaries` (`employee_salary`, sensitive) | Employee, structure, effective date, components (amount/formula), CTC, PF/ESI flags, tax regime, payment mode, bank; revision history | Assign/revise (workflow), bulk revise (percentage/amount), simulate payroll, export, revision letter | Employee sees revision after approval |
| **HR-PAY-04** `/hr/payroll/components` (`salary_component`) | Name, code, type (Earning, Deduction, Employer contribution, Reimbursement), calculation (fixed, % of component, formula), taxable, PF wage, ESI wage, proration, show on payslip, order, rounding, effective dates | CRUD with effective dating; formula tester; dependency check | `lookup.changed` |
| **HR-PAY-05** `/hr/payroll/setup` (added) | Statutory policy packs by state, formula library, export templates, pay periods, bank file formats | Per Payroll Brief | Rule-change alerts |
| **HR-PAY-06** `/hr/payroll/tax` (added) | Declaration windows, declarations, proofs, verification, regime changes, Form 12BB/16 | Verify proofs, lock declarations, generate Form 16 | Notifies employees of windows and verification |
| **HR-PAY-07** `/hr/payroll/reimbursements-loans` (added, P2) | Reimbursement: employee, category, amount, bills; Loan: amount, tenure, EMI, interest, schedule | Approve, schedule recovery in payroll, close | Standard |
| **HR-PAY-08** `/hr/payroll/forms` (added) | Form catalog (12B, 10I, 10IA, PF 11/13/19/31/10C, TN registers), missing-data report | One-click generate for employee set, bulk ZIP | Job progress |

---

## 10. Finance and Assets: Asset Management

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-AST-01** `/hr/assets/dashboard` (`asset`) | Totals by status/type/branch, value and book value, warranty expiring, maintenance due, unallocated, pending requests | Drill-down | Live counters |
| **HR-AST-02** `/hr/assets` (`asset`) | Name, asset tag (sequence), type, serial, brand/model, purchase date/cost/vendor/invoice, warranty end, branch/location, condition, status (Available, Allocated, In maintenance, Retired, Lost), current holder, attachments, QR/barcode | CRUD, bulk import, **allocate** (employee, date, acknowledgement required), **return** (condition check), transfer, retire/dispose, print labels, history | Employee notified to acknowledge; HR notified on acknowledgement; exit clearance link |
| **HR-AST-03** `/hr/assets/depreciation` (`depreciation`) | Asset, method (SLM/WDV), useful life, rate, salvage value, schedule, accumulated, book value, run period | Compute schedule, monthly run, export to accounts, override with reason | Run job events |
| **HR-AST-04** `/hr/assets/types` (`asset_type`, P1+) | Name, code, default depreciation method/life, requires acknowledgement, category | CRUD | `lookup.changed` |
| **HR-AST-05** `/hr/assets/requests-maintenance` (added, P2) | Requests: employee, type, reason, status; Maintenance: asset, issue, vendor, cost, status | Approve and allocate, schedule maintenance, close | Standard |

---

## 11. Communication and Content

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-COM-01** `/hr/meetings` (`meeting`) | Title, type, date, time, duration, room or link, organizer, attendees (employees, departments), agenda, description, recurrence, reminders, status, minutes, attachments, RSVP status per attendee, attendance | Schedule with **room and attendee conflict check**, invite, reschedule, cancel, record minutes, publish minutes, create action items | Invites and changes push to attendees; reminders by scheduler; RSVP updates live |
| **HR-COM-02** `/hr/meetings/action-items` (`action_item`) | Title, meeting, assignees, due date, priority, status (Open, In progress, Done, Blocked), comments | CRUD, link to todo, overdue reminders | Assignment notifies |
| **HR-COM-03** `/hr/meetings/types` (P1) | Name, default duration, color | CRUD | `lookup.changed` |
| **HR-COM-04** `/hr/meetings/rooms` (`meeting_room`, P1+) | Name, branch, capacity, amenities, availability hours, booking rules, active | CRUD, availability calendar | `room.booking_changed` |

---

## 12. Documents and Contracts

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-DOC-01** `/hr/documents` (`hr_document`) | Title, category, version, file, audience (all/department/branch/role), effective date, expiry, requires acknowledgement, status (Draft, Published, Archived) | Upload new version (history kept), publish, read tracking, create acknowledgement campaign | Publish notifies audience |
| **HR-DOC-02** `/hr/documents/contracts` (`employee_contract`) | Employee, contract type, template, start, end, probation, notice, terms/variables, salary reference, status (Draft, Sent, Signed, Active, Expiring, Expired, Terminated), signature trail, amendments | Generate from template, send for e-sign, renew, amend, terminate, expiry reminders | Employee sign request; reminders before expiry |
| **HR-DOC-03** `/hr/documents/acknowledgements` (`acknowledgement`) | Document, audience, due date, per-employee status (Pending, Acknowledged), timestamp, IP, reminders | Create campaign, remind, export proof, escalate to managers | Employee prompt; progress live |
| **HR-DOC-04** `/hr/documents/contract-templates` (P1+) | Name, contract type, rich body with variables, clauses, signature fields, versions | CRUD, preview, version | `lookup.changed` |
| **HR-DOC-05** `/hr/documents/document-templates` (P1+) | Name, letter type (Offer, Appointment, Confirmation, Promotion, Experience, Relieving, Salary certificate, Address proof, NOC), body with variables, header/footer, signatory | CRUD, preview, version | `lookup.changed` |
| **HR-DOC-06** `/hr/documents/contract-types` (P1) | Name, default duration, probation, notice | CRUD | `lookup.changed` |
| **HR-DOC-07** `/hr/documents/categories` (P1) | Name, parent, visibility | CRUD | `lookup.changed` |
| **HR-DOC-08** `/hr/documents/letters` (added) | Generated letters: employee, template, status, PDF, signed | Generate single/bulk, approve, send, handle employee **document requests** | Request and delivery events |

---

## 13. Media Library

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-MED-01** `/hr/media` (`media`) | Folder tree, files (name, type, size, dimensions, uploader, tags, usage links, visibility, created), quotas | Upload (drag-drop, multi), folders, rename, move, tag, share to roles, preview, replace, delete (blocked when in use unless forced), storage usage, bulk actions; picker component used by all forms | Upload progress, `media.changed` refreshes pickers |

---

## 14. Administration (added)

| ID / Route (perm) | Fields and data | Actions, rules, links | Realtime and notifications |
|---|---|---|---|
| **HR-ADM-01** `/hr/access/roles` (`role`) | Role name, description, permissions matrix by module/resource/action with **data scope** per permission, assigned users | Create/clone roles, system roles locked, effective permission viewer for a user, change log | Permission change forces session refresh (`permissions.changed`) |
| **HR-ADM-02** `/hr/access/users` (`user`) | User, employee link, roles, status, 2FA, last login, sessions | Invite, resend, disable, reset password, force logout, impersonate (audited), delegation | Session events |
| **HR-ADM-03** `/hr/workflows` (`workflow`) | Module/resource, conditions, steps (approver type, mode, SLA, escalation), delegation rules, active version | Design, simulate, publish version; running requests keep their version | `workflow.published` |
| **HR-ADM-04** `/hr/custom-fields` (`custom_field`) | Entity, label, key, type (text, number, date, select, multi, file), required, visibility, permission, order | CRUD; appear in forms, lists, exports | `schema.changed` |
| **HR-ADM-05** `/hr/notification-templates` (`notification_template`) | Event key, channel, subject, body with variables, enabled, language | Edit, preview, test send, reset default | None |
| **HR-ADM-06** `/hr/audit-logs` (`audit`, Auditor) | Time, actor, entity, action, before/after (masked), IP, device | Filter, export, sensitive-read log | Read-only |
| **HR-ADM-07** `/hr/import-export` (`import_export`) | Jobs list, templates, errors, files | Re-run, download error file | Job events |
| **HR-ADM-08** `/hr/settings` (`settings`) | Tenant settings groups (company profile, locale, invoice, SMTP, branding, security) | As per System Settings plan | `settings.updated` |
