# 02. Employee Portal Specification: `{workspace}/me/*`

Planning only. Shared rules are in `00_Architecture_and_Conventions.md`. All `/me` endpoints derive the employee from the session (`/api/v1/me/*`), never from client input. Manager pages use `/api/v1/team/*` with reporting-line scope. CRUD letters: **C** create request, **R** read, **U** edit while editable, **W** withdraw/cancel (state change, not hard delete), **A** acknowledge/respond.

Each `/me` page mirrors an `/hr` page (column "HR source") and uses the same domain service; the employee sees only their own records or shared company data.

---

## 1. Sidebar (generated from the Navigation Registry)

1. **Overview:** Dashboard, Calendar, Todo, Chat, Notifications
2. **Workspace Management:** Employee Directory, Organization Structure (Holidays, Announcements), Attendance (Records, Timesheet, Regularizations, Shift, Attendance Policies, Requests), Leave Management (Applications, Balance, Policies, Team Calendar)
3. **Talent and Growth:** Recruitment (Job Postings, Interviews*, Candidate Onboarding, Candidate Assessments*, Career), Employee Lifecycle (Awards, Promotions, Transfers, Warnings, Resignation, Terminations/My Exit, Trips, Complaints), Performance (Reviews, Goals, Review Cycles, Indicators), Training (My Trainings, Sessions, Programs)
4. **Finance and Assets:** Payroll (Payslips, My Salary, Tax and Investments, Reimbursements and Loans, PF/ESI and Forms), Assets (Dashboard, My Assets, Requests)
5. **Communication and Content:** Meetings (Meetings, Action Items), Documents and Contracts (HR Documents, My Contracts, Acknowledgements, Document Requests), Media Library (Shared Files, My Files)
6. **My Account:** My Profile, Helpdesk (added), Account and Security
7. **Manager only (appears when the user has direct reports or delegation):** My Team, Approvals

\* Shown only when the user is an assigned interviewer / has an assessment assigned (permission derived from assignment, not a role).

### 1.1 Decisions on the items in your sidebar (override any in `worklog.md`)

| Your item | Decision | Reason |
|---|---|---|
| Job Locations, Interview Rounds (employee menu) | **Removed from `/me`** | They are HR configuration masters (HR-REC-12, HR-REC-15). Recruiters use `/hr`. Employees see locations inside job postings |
| Depreciations, Asset Types (employee menu) | **Removed from `/me`** | Finance/HR only (HR-AST-03/04). Asset type appears only as a dropdown in "Request asset" |
| Terminations | **Merged into My Exit** | Not self-service; employees see only their own notice/exit status |
| Candidate Onboarding | **Reshaped as "My Onboarding"** (new joiners) | The candidate pipeline is HR-only; new joiner tasks are self-service |
| Candidate Assessments | **"My Assessments"** (assigned to me) | Only when an assessment is assigned to the user |
| Interviews | **Interviewer view only** | Visible if assigned as panel member |
| Career ("carrier") | **Internal Careers + Referrals** | Internal job board and referral tracker |
| Training Sessions | **Kept** (schedule, register, attendance) | Replaces "Training Sections" |
| Assets Dashboard | **Kept as "My Assets summary"** | Personal view only |
| Media Library | **Shared Files + My Files** | Employees must not manage the company library |
| Todo, Chat, My Profile | **Kept**, same modules as HR | Shared modules, different scope |

Users who need the removed pages receive HR permissions and use `/hr`.

---

## 2. Overview

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-OV-01** `/me/dashboard` | HR-OV-01 | **Check-in/out card** (status, working timer, shift, late/early flag, location/IP/geo result, selfie if required); counts: **Awards** (confirm: this year/all), **Warnings** (active), **Complaints** (only ones I filed); Recent announcements; Upcoming meetings; plus leave balances, pending requests, next holiday, birthdays/anniversaries, latest payslip (net hidden until click), team on leave today, my tasks due, trainings due, review deadline, pending acknowledgements, expiring documents, quick actions | Check-in and check-out: **server time only**, policy validation (geo, IP, device, shift window), multiple punches if allowed, "forgot to check out" prompt, link to regularization; each widget loads independently with its own permission/plan toggle | Check-in state and counters live; announcements and meeting invites push instantly; approvals result toast |
| **ME-OV-02** `/me/calendar` | HR-OV-02 | Layers: holidays, my leaves, shift, meetings, interviews (if panelist), trainings, review deadlines, birthdays/anniversaries, payroll dates, personal events | Only personal events C/U/W; other layers open source page; export to ICS | Layer refresh on events |
| **ME-OV-03** `/me/todo` | HR-OV-03 | Same fields as HR todo | Create for self; assign to others only if allowed (manager: team); mark done; recurring; link to action items | Assignment push, due reminders |
| **ME-OV-04** `/me/chat` | HR-OV-04 | Channels, DMs, messages | Start DM with anyone in directory visibility; join public channels; create groups if allowed; attachments via My Files | Fully realtime |
| **ME-OV-05** `/me/notifications` | HR-OV-06 | Notifications, preferences per module/channel, quiet hours | Mark read, filter, deep links | Bell realtime |

---

## 3. Workspace Management

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-WF-01** `/me/employees` (Directory) | HR-WF-01 | Name, photo, designation, department, branch, work email/phone, manager, location | R only; search/filter; org link; respects per-employee "hide from directory"; **no** sensitive fields | None |
| **ME-WF-02** `/me/organization/structure` | HR-ORG-01 | Org chart, my reporting line highlighted, team size | R, search | `org.changed` |
| **ME-WF-03** `/me/organization/holidays` | HR-ORG-05 | Holidays for my branch/state, optional holiday quota and selections | R; select optional holidays within window (C/W) | `holiday.changed` |
| **ME-WF-04** `/me/organization/announcements` | HR-ORG-06 | Title, body, attachments, pinned, expiry, ack required | R, mark read, **A** acknowledge, search | Publish push, banner |
| **ME-WF-05** `/me/profile` (My Profile) | HR-WF-03 | Tabs: Personal, Contact and addresses, Emergency contacts, Family/dependents/nominees, Education, Experience, Skills, Documents (upload by Document Type with verification status), Statutory and bank (masked, reveal re-auth), Job info (read-only), Timeline (own events) | **Instant edit:** photo, phones, personal email, emergency contact, skills. **Change request (HR approval):** legal name, DOB, address proof, bank, PAN, Aadhaar, nominee. Pending change shows old vs new; document expiry reminders | Approval result notification; verification status live |

---

## 4. Attendance

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-ATT-01** `/me/attendance/records` | HR-ATT-01 | Month calendar and table: date, shift, in/out, hours, status, late/early/OT, source; summary (present, absent, leave, holiday, week-off, LOP) | R; export; "Regularize" shortcut on missing/incorrect days; shows applied policy version | `attendance.updated` |
| **ME-ATT-02** `/me/attendance/timesheet` | HR-ATT-02 | Period, entries (date, project, task, hours, billable, notes), total, status | C/U (draft), submit, W (withdraw while pending), resubmit after reject; policy limits and attendance cross-check | Approver notified; decision push |
| **ME-ATT-03** `/me/attendance/regularizations` | HR-ATT-03 | Date, requested in/out, reason, attachment, status, approver | C/U (pending)/W; monthly limit and window enforced and displayed | Standard request events |
| **ME-ATT-04** `/me/attendance/shifts` | HR-ATT-04 | My shift, weekly roster, upcoming changes, swap requests | R; **C** swap request (needs peer consent + approval) | Roster publish push |
| **ME-ATT-05** `/me/attendance/policies` | HR-ATT-05 | Applicable policy: grace, late rules, half-day rules, OT, geo/IP rules, regularization limits | R only (own applicable policy and version) | `policy.published` notice |
| **ME-ATT-06** `/me/attendance/requests` (added) | HR-ATT-07 / WFH / on-duty / comp-off | Type (Overtime, WFH, On-duty, Comp-off), date(s), hours, reason, attachment | C/U/W by policy eligibility | Standard |

---

## 5. Leave Management

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-LV-01** `/me/leave/applications` | HR-LV-01 | Leave type, from/to, half-day, computed days (preview), reason, attachment, contact, handover to, status, approver chain, history | C with **dry-run validation** (balance, overlap, notice, blackout, sandwich, max consecutive, eligibility); U (pending); W (pending) and cancel approved (policy permitting); team overlap hint | Approver notified; status push; balance and calendar update |
| **ME-LV-02** `/me/leave/balance` | HR-LV-02 | Per type: opening, accrued, used, pending, available, carry-forward, expiry; ledger | R; encashment request (C) when eligible | `leave.balance_changed` |
| **ME-LV-03** `/me/leave/policies` | HR-LV-03/04 | My leave policy, types and rules | R | None |
| **ME-LV-04** `/me/leave/team-calendar` (added) | HR-LV-05 | Who is off (team/department), approved only, privacy respected | R | Live |

---

## 6. Talent and Growth

### 6.1 Recruitment

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-REC-01** `/me/recruitment/job-postings` | HR-REC-01 | Open internal jobs: title, department, location, type, experience, description, deadline | R; **C** internal application (eligibility: tenure, no active warning if policy), withdraw; **C** referral (candidate details, resume) | New job push; application status to employee |
| **ME-REC-02** `/me/recruitment/interviews` * | HR-REC-03 | My assigned interviews: candidate summary, round, time, link/room, scorecard | R; **C/U feedback** until HR locks; accept/decline slot; reschedule request | Schedule changes push; reminders |
| **ME-REC-03** `/me/recruitment/onboarding` | HR-REC-05 | New-joiner checklist (tasks, owner, due), document uploads, policy acknowledgements, forms (bank, statutory, emergency), welcome info, buddy, asset status | U (complete tasks, upload), A (sign/acknowledge); progress bar | Task assignment and completion live |
| **ME-REC-04** `/me/recruitment/assessments` * | HR-REC-06 | Assessments assigned to me (as internal candidate or evaluator): instructions, timer, questions | Take assessment (one attempt unless reset), autosave answers, submit; evaluators score | Assignment push; result notice |
| **ME-REC-05** `/me/recruitment/career` | HR-REC-09/18 | Internal careers page, my applications, my referrals and their status, referral bonus status | R; track | Referral stage changes notify |

### 6.2 Employee Lifecycle

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-LC-01** `/me/lifecycle/awards` | HR-LC-01 | My awards: type, title, date, gift, certificate | R; download certificate | Push on new award |
| **ME-LC-02** `/me/lifecycle/promotions` | HR-LC-02 | Career timeline: roles, grades, effective dates, letters | R; download letter | Push when released |
| **ME-LC-03** `/me/lifecycle/transfers` | HR-LC-03 | Transfer history; optional transfer request (preferred branch/department, reason) | R; C/W request if policy allows | Standard |
| **ME-LC-04** `/me/lifecycle/warnings` | HR-LC-04 | My warnings only: type, subject, description, date, status | R; **A** acknowledge receipt; **A** submit written response | Push on issue; acknowledgement to HR |
| **ME-LC-05** `/me/lifecycle/resignation` | HR-LC-05 | Notice date, requested LWD, policy LWD (computed preview), reason, status, decisions | C (one active), W until accepted; view decision; exit interview scheduling | Manager/HR notified; decision push |
| **ME-LC-06** `/me/lifecycle/exit` (Terminations / My Exit) | HR-LC-06/09 | Exit case: LWD, clearance checklist status, assets to return, F&F status, documents (relieving, experience) | R; U items assigned to me (return asset, handover); download letters when released | Clearance progress live |
| **ME-LC-07** `/me/lifecycle/trips` | HR-LC-07 | Purpose, destination, dates, mode, advance, estimate, status; settlement lines with bills | C/U (pending)/W; settlement submit | Standard |
| **ME-LC-08** `/me/lifecycle/complaints` | HR-LC-08 | **Complaints I filed**: category, description, evidence, date, anonymity option, status timeline | C, U (add information while open), W; confidentiality notice; complaints against me **never shown** | Status changes push without case details |

### 6.3 Performance

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-PF-01** `/me/performance/reviews` | HR-PF-01 | My reviews per cycle: indicator ratings, self-assessment, manager rating (after release), comments, development plan | U self-assessment (draft), submit; **A** acknowledge result; results hidden until released | Phase reminders; release push |
| **ME-PF-02** `/me/performance/goals` | HR-PF-02 | Goals: type, title, metric, target, weight, dates, progress, manager comments | C/U/W (until locked), progress updates and check-ins; manager approval | Approval and comment push |
| **ME-PF-03** `/me/performance/cycles` | HR-PF-03 | Active/past cycles, phase timeline, deadlines | R | Phase changes push |
| **ME-PF-04** `/me/performance/indicators` | HR-PF-04 | Indicators and rating descriptors | R | None |

### 6.4 Training

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-TR-01** `/me/training/trainings` | HR-TR-01 | Assigned/enrolled trainings: status, due date, score, certificate | R; U progress; upload certificate; submit feedback | Assignment push; reminders |
| **ME-TR-02** `/me/training/sessions` | HR-TR-02 | Upcoming sessions: date, venue/link, trainer, seats | Register/cancel (C/W), attendance view, feedback | Invites and changes push |
| **ME-TR-03** `/me/training/programs` | HR-TR-03 | Catalog: description, duration, prerequisites, mandatory flag | R; **C** enrollment request (approval if required) | Decision push |

---

## 7. Finance and Assets

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-PAY-01** `/me/payroll/payslips` | HR-PAY-01 | Published payslips: period, earnings, deductions, net, YTD | R; PDF (optional password), yearly ZIP, net pay hidden until clicked; **only published** | `payslip.published` push |
| **ME-PAY-02** `/me/payroll/salary` | HR-PAY-03 | Current structure, CTC breakup, revision history | R only; masked by default, reveal with re-auth (audited) | After approved revision |
| **ME-PAY-03** `/me/payroll/tax` (added) | HR-PAY-06 | Regime choice, investment declaration by section, proofs, tax projection, Form 12BB, Form 16 | C/U while window open, upload proofs, view verification; download Form 16 | Window open/close and verification push |
| **ME-PAY-04** `/me/payroll/reimbursements-loans` (added) | HR-PAY-07 | Expense claims (category, amount, bills, date); loan/advance request, EMI schedule, outstanding | C/U/W, track | Standard |
| **ME-PAY-05** `/me/payroll/statutory-forms` (added) | HR-PAY-08 | UAN, PF/ESI numbers, nominee; form catalog | Generate PF forms (11, 13, 19, 31, 10C) prefilled; request HR help; previous employer income (Form 12B data) entry | Job progress |
| **ME-AST-01** `/me/assets/dashboard` | HR-AST-01 | My assets summary, pending acknowledgements, open requests | R | Live |
| **ME-AST-02** `/me/assets` | HR-AST-02 | My assets: tag, type, serial, issue date, condition, status, acknowledgement | R; **A** acknowledge receipt; report issue/loss; **C** return request | Allocation push |
| **ME-AST-03** `/me/assets/requests` | HR-AST-05 | Request: asset type (dropdown from master), reason, justification | C/U/W | Standard |

---

## 8. Communication and Content

| ID / Route | HR source | Fields shown / entered | Actions and rules | Realtime and notifications |
|---|---|---|---|---|
| **ME-COM-01** `/me/meetings` | HR-COM-01 | Upcoming/past: title, time, room/link, agenda, attendees, minutes | R; RSVP (accept/decline/tentative, propose time); create meeting if permitted (room conflict check) | Invites/changes push, reminders |
| **ME-COM-02** `/me/meetings/action-items` | HR-COM-02 | Items assigned to me or created by me: due, priority, status, comments | U status, C self items, comment; link to Todo | Assignment push |
| **ME-DOC-01** `/me/documents` | HR-DOC-01 | Policy and document library for my audience: category, version, search | R, download, read tracking | Publish push |
| **ME-DOC-02** `/me/documents/contracts` | HR-DOC-02 | My contracts and amendments: status, dates, download | R; **A** e-sign/accept | Sign request, renewal reminder |
| **ME-DOC-03** `/me/documents/acknowledgements` | HR-DOC-03 | Pending/completed acknowledgements with due dates | **A** sign | Reminders |
| **ME-DOC-04** `/me/documents/requests` (added) | HR-DOC-08 | Letter type (experience, salary certificate, address proof, NOC), purpose, copies | C/W, download when issued | Status push |
| **ME-MED-01** `/me/media` | HR-MED-01 | Shared Files (company-shared, read-only) and My Files (own uploads) | Upload/rename/delete own files; type and size limits; no access to others' files | `media.changed` |

---

## 9. My Account and Manager pages (added)

| ID / Route | Fields and rules | Realtime |
|---|---|---|
| **ME-ACC-01** `/me/account` | Password, 2FA, active sessions (sign out others), login history, language/theme/date-time format, notification preferences, delegation (when on leave) | Session events |
| **ME-ACC-02** `/me/helpdesk` | Ticket: category (HR, IT, Admin, Payroll), priority, subject, description, attachments; thread, SLA, status; C, comment, close/reopen | Thread live |
| **ME-MGR-01** `/me/team` (manager) | Direct and indirect reports, today's attendance, leave calendar, pending items, review status, birthdays; open member's limited profile | Live attendance |
| **ME-MGR-02** `/me/approvals` (manager/approver) | Unified inbox: leave, regularization, timesheet, overtime, WFH, shift swap, goals, expense, trip, resignation, asset, training enrollment, profile change (when assigned); approve/reject (comment required on reject), bulk, delegate | `approval.assigned/decided`, sidebar badge |

---

## 10. Employee-portal rules (summary)

1. Own data only; other employees' salary, PAN, Aadhaar, bank, DOB year, or personal contact never returned.
2. Complaints: only those filed by me; warnings: only mine; anonymity preserved.
3. Edit means only while Pending/Draft; withdraw is a state change with history.
4. Every request shows approver, SLA, history, and `allowedActions`.
5. Policy-driven validation runs server-side with a dry-run endpoint so the form can warn before submit.
6. Check-in integrity: server time, policy checks, anti-spoof flags, audited overrides.
7. Plan/permission toggles hide whole modules (for example disable Trips) without code changes.
8. Mobile-first layouts for check-in, leave, payslips, approvals.
