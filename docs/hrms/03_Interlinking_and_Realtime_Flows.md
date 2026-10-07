# 03. Interlinking and Realtime Flows (Hire to Retire)

Planning only. This file defines how pages in `/hr/*` and `/me/*` connect: triggers, database side effects, events, notifications, and deep links. IDs refer to `01_HR_Panel_Spec.md` and `02_Employee_Portal_Spec.md`. Event names follow `entity.action`; every event is written to the outbox in the same transaction as the data change.

---

## 1. The Employee 360 hub

```
                 Recruitment ──► Onboarding ──► EMPLOYEE ◄── Org masters (branch, dept, designation)
                                                  │
   Attendance ◄── Shifts/Policies                 ├──► Leave ◄── Leave types/policies/holidays
        │                                         ├──► Payroll (attendance + leave + salary + statutory) ──► Payslips
        └──────────────► LOP ──────────────────► │
   Performance ──► Promotion/Increment ──► Salary revision
   Training ──► Skills/Compliance            Lifecycle (awards, warnings, transfers, resignation, exit)
   Assets ◄──► Onboarding / Exit clearance    Documents/Contracts ◄──► Acknowledgements
   Meetings ──► Action items ──► Todo        Announcements ──► Notifications/Chat
```

Every state change that touches an employee appends an **EmployeeEvent** (JOINED, DETAILS_CHANGED, SHIFT_CHANGED, LEAVE_TAKEN, AWARDED, WARNED, PROMOTED, TRANSFERRED, RESIGNED, EXIT_STARTED, SEPARATED, REHIRED...). The timeline on `/hr/employees/:id` and `/me/profile` reads only this table.

---

## 2. Flows

### F1. Recruitment to Employee
| Step | Page | Trigger and effect | Event and notify |
|---|---|---|---|
| 1 | HR-REC-01 Job posting approved and published | Headcount/vacancy check; appears on Career site (HR-REC-09) and `/me` internal jobs (ME-REC-01) | `job.published` -> employees, career site cache |
| 2 | Candidate applies (career site / internal / referral / manual) | Candidate row, duplicate check, source stored; referral links referrer (ME-REC-05) | `candidate.created` -> recruiter |
| 3 | Pipeline moves (HR-REC-17) | Stage history written; assessment assigned (HR-REC-06) if job template says so | `candidate.stage_changed` |
| 4 | Interview scheduled (HR-REC-03) | Conflict check against interviewer calendars and Meeting Rooms (HR-COM-04); room booking and meeting created; calendar entries | `interview.scheduled` -> interviewers (appears in ME-REC-02 and calendar) |
| 5 | Feedback submitted (ME-REC-02 / HR) | Scorecard stored; recommendation aggregated; decision moves stage | `interview.feedback_submitted` -> recruiter |
| 6 | Offer created and approved (HR-REC-04) | CTC breakup from salary structure/components (HR-PAY-04); template letter generated (HR-DOC-05) | `offer.sent` -> candidate email |
| 7 | Offer accepted | Candidate Onboarding created from checklist (HR-REC-07/08); document requests by Document Types (HR-ORG-08) | `onboarding.created` -> HR, IT, admin task owners |
| 8 | Tasks and documents completed | Progress; verification of documents | `onboarding.progress` live |
| 9 | **Convert to Employee** (HR-REC-05 -> HR-WF-02) | Create Employee, User (invite), EmployeeEmployment, salary structure/EmployeeSalary, shift and attendance policy, leave policy and prorated balances, holiday calendar by branch/state, asset requests (HR-AST-05), welcome announcement, buddy, EmployeeEvent JOINED | `employee.created` -> manager, HR, payroll, assets |
| 10 | Joining day | New joiner logs in; sees ME-REC-03 My Onboarding | `employee.joined` |

### F2. Attendance, Leave, Holidays to Payroll
| Step | Page | Effect | Event |
|---|---|---|---|
| 1 | Employee checks in (ME-OV-01) | Validate against shift, policy, geo/IP; AttendanceRecord + punch; late/early computed | `attendance.checked_in` -> HR live board, manager |
| 2 | Day ends / cutoff job | Absent marked unless leave/holiday/week-off; half-day and late-mark rules applied | `attendance.finalized` |
| 3 | Missing or wrong punch | ME-ATT-03 regularization -> approval -> attendance record corrected (linked, reversible) | `regularization.approved` |
| 4 | Leave applied (ME-LV-01) | Dry-run validation; balance reserved as pending; approval chain | `leave.requested` -> approver |
| 5 | Leave approved | Balance ledger entry; attendance status Leave for each day; team calendar and handover notified; reversing on cancel | `leave.approved` -> employee, handover, team calendar |
| 6 | Holiday or policy changed (HR-ORG-05, HR-ATT-05, HR-LV-04) | Recalculation preview; recompute affected, unlocked months only | `holiday.changed`, `policy.published` |
| 7 | Month lock (HR-ATT-01) | Prevents edits; feeds payroll | `attendance.month_locked` -> payroll |
| 8 | Payroll run (HR-PAY-02) | Pulls payable days, LOP, overtime, approved reimbursements, loan EMIs, bonus/awards cash, arrears; calculates with the formula engine and state policies | `payroll.run_progress` |
| 9 | Approve and lock run | Payslips generated; outputs (paysheet, bank file, statutory data) | `payroll.run_locked` |
| 10 | Publish payslips (HR-PAY-01) | Visible in ME-PAY-01 | `payslip.published` -> each employee |

### F3. Employee changes (job, branch, salary)
- **Promotion** (HR-LC-02) approved: effective-dated EmployeeEmployment row; salary revision workflow (HR-PAY-03); letter (HR-DOC-05); designation/grade change updates org chart and role-based pickers; EmployeeEvent PROMOTED.
- **Transfer** (HR-LC-03): on effective date changes branch/department/manager/location; reassigns shift, attendance policy, leave policy, holiday calendar; **changes payroll work state** so PT/LWF/ESI/PF rules switch from the next payroll; moves open approvals to the new manager; EmployeeEvent TRANSFERRED.
- **Manager change** (HR-WF-03): open requests re-route to the new approver; team memberships update; chat team channels adjust.
- **Salary revision**: effective-dated; payroll uses the structure valid for each day (arrears computed if back-dated).

### F4. Performance to Compensation
1. Cycle launch (HR-PF-03) creates reviews and goal tasks for participants; notifications and calendar deadlines.
2. Goals set/approved (ME-PF-02 / HR-PF-02) -> progress check-ins.
3. Self review (ME-PF-01) -> manager review -> calibration -> release (HR-PF-01).
4. Ratings feed Promotion/Increment recommendations (HR-LC-02, HR-PAY-03) and training needs (HR-TR-01).
Events: `review_cycle.launched`, `review.phase_changed`, `review.released`.

### F5. Training
Program (HR-TR-03) rules auto-assign (new joiners, designation) -> EmployeeTraining (HR-TR-01) -> sessions (HR-TR-02, room via HR-COM-04) -> attendance -> completion + certificate -> compliance report; expiry/recertification reminders; skills added to profile. Events: `training.assigned`, `training.completed`.

### F6. Assets
Asset (HR-AST-02) allocated (from onboarding task, request ME-AST-03 or manual) -> employee acknowledges (ME-AST-02) -> status Allocated; depreciation job (HR-AST-03) runs monthly -> on exit, clearance (HR-LC-09) creates return tasks -> return with condition check -> available/maintenance. Events: `asset.allocated`, `asset.acknowledged`, `asset.returned`.

### F7. Documents, contracts, acknowledgements
Document published (HR-DOC-01) with "requires acknowledgement" -> acknowledgement campaign (HR-DOC-03) -> employees sign in ME-DOC-03 -> reminders -> escalate to managers. Contracts generated from templates (HR-DOC-04) -> e-sign (ME-DOC-02) -> expiry reminders. Letters generated from templates (HR-DOC-05) via Document Requests (ME-DOC-04 -> HR-DOC-08). Events: `document.published`, `acknowledgement.required`, `contract.sign_requested`.

### F8. Meetings, Todo, Chat, Calendar
Meeting created (HR-COM-01 / ME-COM-01) -> room booking conflict check -> invites -> calendar layers and notifications -> RSVP -> minutes -> action items (HR-COM-02) -> auto-create Todo for each assignee (ME-OV-03) -> reminders. Meeting can open a chat channel. Calendar layers read from all source modules.

### F9. Exit (Resignation/Termination to F&F)
1. Resignation submitted (ME-LC-05) -> approval (HR-LC-05) -> accepted LWD.
2. Exit Case (HR-LC-09): clearance by IT, Admin, Finance, HR, Manager; asset returns (F6); knowledge transfer tasks; exit interview.
3. Leave encashment and notice recovery computed (HR-LV-06); final payroll (HR-PAY-02, F&F).
4. Letters generated (relieving, experience).
5. At LWD: employee deactivated, access revoked, EmployeeEvent SEPARATED; rehire eligibility stored.
Termination (HR-LC-06) follows the same Exit Case with restricted visibility.

### F10. Warnings and Complaints
Complaint filed (ME-LC-08) -> investigator assigned (HR-LC-08) -> case notes (restricted) -> resolution action may create a Warning (HR-LC-04) or Transfer; employee gets warning in ME-LC-04 and may respond; repeated warnings can trigger a Termination review. Complainant sees status only. Anonymous complaints never expose identity to managers.

### F11. Announcements and Notifications
Announcement published (HR-ORG-06) with audience rules -> notification rows per recipient -> bell + email + banner -> read/ack tracking -> reminders to non-acknowledged. Same pipeline serves approvals, payslips, assets, etc. Chat announcement channels mirror major announcements.

### F12. Profile changes
Employee edits profile (ME-WF-05): instant fields saved; sensitive fields create a change request (workflow) -> HR reviews with old/new diff -> approve updates Employee (and Payroll bank/statutory data effective next run) -> EmployeeEvent DETAILS_CHANGED -> employee notified. Documents uploaded by employee go to verification (HR-WF-03 Documents tab).

### F13. Approvals everywhere
Any request submit -> workflow engine builds ApprovalRequest from the active definition (HR-ADM-03) -> assigns step approver (manager, HR, role) -> `approval.assigned` -> inbox (ME-MGR-02 / HR-OV-05) with badge -> action -> next step or final effect (side effects in the source module) -> `request.status_changed` to requester. SLA breach escalates; delegation applies when approver is on leave (Leave module integration).

### F14. Settings and master data propagation
Master data change (any P1 page) -> `lookup.changed(type)` -> all open forms refresh dropdowns; deactivated items remain on historical records. Tenant Settings change (HR-ADM-08) -> `settings.updated` -> branding, locale, formats update live in both portals (see System Settings plan).

---

## 3. Event bus catalogue (producers and consumers)

| Event | Producer | Consumers |
|---|---|---|
| `employee.created/updated/status_changed` | Employees, Onboarding | Attendance (assign shift), Leave (balances), Payroll (structure), Assets, Chat (team channel), Dashboards |
| `attendance.checked_in/out/updated/month_locked` | Attendance | HR live board, Manager team view, Payroll |
| `leave.requested/approved/rejected/cancelled/balance_changed` | Leave | Attendance, Calendar, Team calendar, Payroll (LOP), Approver inbox |
| `holiday.changed`, `policy.published`, `shift.roster_published` | Org/Attendance/Leave | Attendance recalculation, Calendars, Employees notified |
| `request.status_changed` | Workflow engine | Requester UI, notifications |
| `approval.assigned/decided/escalated` | Workflow engine | Approver inbox, badges |
| `job.published`, `candidate.stage_changed`, `interview.scheduled`, `offer.sent/accepted`, `onboarding.created` | Recruitment | Career site, Calendar, Meeting rooms, Documents, Employees module |
| `promotion.effective`, `transfer.effective`, `resignation.accepted`, `termination.executed` | Lifecycle | Employment records, Payroll, Attendance, Assets, Access/Session control |
| `review_cycle.launched`, `review.released`, `goal.status_changed` | Performance | Notifications, Compensation recommendations |
| `training.assigned/completed` | Training | Profile skills, Compliance report |
| `payroll.run_progress/locked`, `payslip.published` | Payroll | HR UI, Employees (payslips), Finance exports |
| `asset.allocated/acknowledged/returned` | Assets | Onboarding/Exit tasks, Employee 360 |
| `meeting.invited/changed/reminder`, `actionitem.assigned` | Meetings | Calendar, Todo, Notifications |
| `document.published`, `acknowledgement.required`, `contract.sign_requested` | Documents | Employees, Reminders |
| `announcement.published` | Announcements | All audience rooms, Notifications, Chat |
| `lookup.changed`, `settings.updated`, `permissions.changed`, `maintenance.scheduled` | Platform | All open clients |
| `media.changed`, `job.progress/completed` | Media, Import/Export | Pickers, job UIs |

---

## 4. Deep-link map (examples of cross-page navigation)

| From | To | Link rule |
|---|---|---|
| Any employee name | HR: `/hr/employees/:id`; Employee: directory card | `linkTo('employee', id, portal)` |
| Leave application | Employee 360 > Leave tab; Attendance record for each day | by ids |
| Attendance record (missing) | Regularization form prefilled with date | `/me/attendance/regularizations/new?date=` |
| Candidate | Job posting, interviews, offer, onboarding | candidate 360 tabs |
| Accepted offer | Candidate onboarding -> Employee wizard prefilled | `?fromOnboarding=:id` |
| Promotion/transfer | Employee 360 Job tab, Salary revision, Letter | by ids |
| Payslip | Payroll run, attendance month summary | by ids |
| Asset | Holder profile, allocation history, depreciation | by ids |
| Meeting | Room booking, action items, chat channel | by ids |
| Notification | Exact record in correct portal | `linkTo()` returned in event |
| Dashboard number | Filtered list (query-string state) | e.g. `/hr/leave/applications?status=PENDING&from=...` |

---

## 5. Cross-page consistency rules

1. Statuses use the shared vocabulary; module-specific substatuses live in a separate field.
2. Effective-dated data (employment, salary, policies) is never overwritten; new rows are added and queries pick the row valid on a date.
3. Deleting a master item with references is blocked; deactivate instead.
4. Anything that changes pay (attendance, leave, salary, awards cash, reimbursements, loans, transfers across states) must be visible in the payroll run comparison with its source link.
5. Locked periods (attendance month, payroll run) reject writes with a clear error and a "request unlock" action.
6. Reversals (cancel approved leave, revoke award, withdraw resignation) create compensating entries and events; they never silently edit history.
7. Every page must show where its data comes from and where it is used ("Used in" panel) for masters.
