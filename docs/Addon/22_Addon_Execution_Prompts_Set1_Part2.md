# 22. Add-on Execution Prompts, Set 1 (Part 2: Recruitment, Job Search, Training, Performance, Performance Indicator, Team Workload, Time Tracker, Procurement, LMS)

> **ROUTE PRECEDENCE NOTICE (added with file 23):** the URLs written as `/addons/{slug}/*` in this file are superseded by `23_Addon_Placement_and_Order_Matrix.md`. Add-on pages now live inside the portals: HR/admin `/hr/addons/{slug}/...`, employee `/me/addons/{slug}/...`, tenant `/tenant/addons/{slug}/...`, public `/public/{slug}/...`. Use the per-add-on route tables and sidebar order in file 23 (paste its PLACEMENT OVERRIDE block with each add-on run). Fields, CRUD, realtime, expiry, zero-mock and test requirements in this file remain valid.


Use exactly like Part 1 (`21_Addon_Execution_Prompts_Set1.md`): paste `20_Addon_Master_Execution_Prompt.md` Part A once, then one block per run in the order given in file 20 section 14. Same conventions apply: pages at `/addons/{slug}/*` (one page per sidebar item, views as separate routes, no tabs for navigation), API at `/api/v1/addons/{slug}/*`, public pages at `/public/{slug}/*`, all lists from tables, i18n keys, outbox realtime, expiry Renewal Block, zero mock data, standard CRUD.

For field-level detail the agent must also read the matching attached guide (named in each block) and implement every field and flow it describes that is not already listed here.

---

## BLOCK 12: RECRUITMENT

```text
ADD-ON RUN: Recruitment
slug: recruitment | pages: /addons/recruitment/* | API: /api/v1/addons/recruitment/* | public: /public/recruitment/* (alias /careers) | depends on: HRMS core | guide: Recruitment_Management_addon.docx | detailed page specs: hrms-plan/01_HR_Panel_Spec.md section 5 (HR-REC-01..18) and hrms-plan/02_Employee_Portal_Spec.md section 6.1
EXISTING WORK: the repo already has recruitment pages/APIs (HR recruitment pages, /api/recruitment, /api/addons/recruitment, publicJobsRouter, slug recruitment-ats). AUDIT FIRST, then MIGRATE pages to /addons/recruitment/* with redirects from the old /hr/recruitment/* URLs, gate them by entitlement, remove them from the base HR sidebar, and complete missing CRUD/realtime. Do not duplicate tables.

SIDEBAR (every item is a page)
Recruitment
  Dashboard                 /addons/recruitment/dashboard   (open jobs, candidates by stage funnel, interviews calendar, offers pending, source mix)
  Job Postings              /addons/recruitment/job-postings        (+ /new, /:id, /:id/edit)
  Pipeline Board            /addons/recruitment/pipeline            (kanban by stage, filter by job)
  Candidates                /addons/recruitment/candidates          (+ /new, /:id, /:id/edit)
  Interviews                /addons/recruitment/interviews          (+ /new, /:id, calendar route /interviews/calendar)
  Offers                    /addons/recruitment/offers              (+ /new, /:id, /:id/edit)
  Candidate Onboarding      /addons/recruitment/candidate-onboarding (+ /:id, convert to employee)
  Candidate Assessments     /addons/recruitment/assessments         (+ templates, assign, results)
  Referrals                 /addons/recruitment/referrals
  Career Site               /addons/recruitment/career-site         (public careers page settings)
  System Setup (nested, each its own page)
     Job Categories /setup/job-categories | Job Types /setup/job-types | Job Locations /setup/job-locations | Candidate Sources /setup/candidate-sources | Interview Types /setup/interview-types | Interview Rounds /setup/interview-rounds | Offer Templates /setup/offer-templates | Onboarding Checklists /setup/onboarding-checklists | Check Items /setup/check-items | Custom Questions /setup/custom-questions | Job Stages /setup/job-stages
Staff pages (permission-driven, same sidebar group): My Interviews /my-interviews (interviewer feedback), My Onboarding /my-onboarding, My Referrals /my-referrals, My Assessments /my-assessments.

DB (rec_* tables, tenant_id)
job_posting, job_category, job_type, job_location, job_stage, custom_question, candidate, candidate_application, candidate_stage_history, candidate_source, interview, interview_panel, interview_feedback, interview_type, interview_round, offer, offer_template, offer_negotiation, onboarding, onboarding_task, onboarding_checklist, check_item, assessment_template, assessment_question, assessment_attempt, referral, career_site_setting. Use existing tables when they exist; add missing columns by migration.
Key fields: job_posting(code, title, category, type, location(s), department, designation, openings, experience min/max, salary min/max, skills, description, requirements, benefits, deadline, hiring manager, recruiters, custom questions, status draft|pending_approval|open|on_hold|closed|filled, publish flags); candidate(name, email, phone, resume, photo, source, current company/CTC, expected CTC, notice period, skills, experience, education, location, stage, rating, tags, notes, status, tracking id); interview(candidate, job, round, type, date, time, duration, mode, room/link, panel, status, scorecards, recommendation); offer(candidate, job, designation, department, branch, joining date, CTC breakup from salary components, template, expiry, status draft|pending_approval|approved|sent|accepted|declined|expired|revoked); onboarding(candidate, joining date, checklist tasks, documents by document type, status); assessment (type, questions, duration, passing score, attempts).

API (CRUD for every table above) plus actions: POST /candidates/:id/stage (reason required for reject), /candidates/bulk (email, reject, assign recruiter), /candidates/merge, /candidates/import, /interviews/:id/{reschedule|cancel|feedback|lock}, /interviews/conflicts (interviewer and room check), /offers/:id/{submit|approve|send|revoke|accept|decline}, /onboarding/:id/convert (creates Employee, user invite, balances, salary structure, checklist, assets), /job-postings/:id/{publish|unpublish|close|duplicate}, /career-site (GET/PUT), public: GET /public/recruitment/jobs, GET /public/recruitment/jobs/:slug, POST /public/recruitment/jobs/:slug/apply (captcha, rate limit, file type/size limits, custom questions), GET /public/recruitment/track (tracking id + email, lockout after failures).

UI: list pages with search, filters, sort, pagination, export; create/edit pages; candidate 360 view (one page with sections: profile, applications, stage history, assessments, interviews, offers, documents, notes, emails); kanban with drag + reason prompts; interview scheduling page with conflict warnings and calendar route; offer builder page with CTC table and letter preview (PDF); onboarding page with task owners, document collection link, convert button; career-site settings page with live preview; public careers pages themed from settings (listing with filters, job detail, apply form, tracking page, thank-you page).

REALTIME: recruitment.job.published|closed, recruitment.application.created, recruitment.candidate.stage_changed, recruitment.interview.scheduled|rescheduled|feedback_submitted, recruitment.offer.status_changed, recruitment.onboarding.progress|converted. Pipeline cards move live.
WEBHOOK EVENTS: New Job Posting, New Candidate/Application, Interview Schedule, Convert To Employee (as in the guide) plus offer.sent, offer.accepted.
AI FIELDS: job description, requirements, benefits, offer letter body, rejection email, interview questions.
NOTIFICATIONS/EMAIL TEMPLATES: application received, interview invite/reschedule, feedback reminder, offer sent/accepted, onboarding task assigned.
JOBS: recruitment.deadline-closer, recruitment.feedback-reminders, recruitment.offer-expiry.
SETTINGS: addon.recruitment.* (default stages, auto-reply emails, resume parsing toggle, duplicate rules, careers domain slug).
PERMISSIONS: recruitment.<resource>.view|create|update|delete|export|approve|publish; interviewer access derived from assignment.
PUBLIC EXPIRY: when expired/uninstalled the careers pages show a neutral unavailable page and application POST is rejected.
REMOVE HARDCODED: stage/status/type arrays, sample jobs/candidates, hardcoded career-page text, placeholder logos.
TESTS: job to hire flow end to end; duplicate candidate detection; conflict detection; offer approval; convert to employee creates all linked records; public apply with captcha and limits; tracking lockout; kanban drag realtime; cross-tenant isolation; migration redirects from /hr/recruitment/*; expired add-on block page and 402 API.
```

---

## BLOCK 13: JOB SEARCH

```text
ADD-ON RUN: Job Search
slug: job-search | pages: /addons/job-search/* | API: /api/v1/addons/job-search/* | depends on: recruitment (hard: install blocked without it; locks when Recruitment expires) | guide: Job_Search_-Addon.docx

PURPOSE
Internal job board for staff plus admin visibility of jobs and applications. All job data comes from Recruitment; this add-on adds the job seeker profile, browse/apply flow for staff and an applications view that feeds the Recruitment candidate pipeline.

SIDEBAR (role-aware, all pages)
Job Search
  Admin/HR:
    Jobs                    /addons/job-search/jobs                 (list; filters Job type, Location, Department, Status; Apply/Reset)
       Job detail           /addons/job-search/jobs/:id
    Job Applications        /addons/job-search/applications         (list)
       Grid view            /addons/job-search/applications/grid
       Application detail   /addons/job-search/applications/:id
  Staff:
    Browse Jobs             /addons/job-search/browse
       Job detail           /addons/job-search/browse/:id
       Apply                /addons/job-search/browse/:id/apply
    My Applications         /addons/job-search/my-applications      (+ /grid, /:id)
    Job Seeker Profile      /addons/job-search/profile

DB
js_seeker_profile(user_id, name, email, phone, gender, location (address, city, state, country, pincode), resume_media_id, skills, experience, education, expected_salary, notice_period, links, consent)
js_application_link(application_id -> rec candidate_application, source='job_search', applicant_user_id, tracking_id)
All jobs, stages and candidates are Recruitment tables (no copies).

API
GET /jobs (filters job_type, location, department, status; search; pagination), GET /jobs/:id, GET /browse (open jobs visible to staff), GET /browse/:id, POST /browse/:id/apply (prefill from profile; editable; custom questions; resume), GET/PUT /profile, GET /applications (admin: filter by job and status), GET /applications/:id, GET /my-applications, POST /my-applications/:id/withdraw.
Rules: only open jobs inside the deadline can be applied to; one application per staff per job; applying creates the Recruitment candidate application (source = Job Search) so HR sees it in the pipeline; staff can only see their own applications; stage/status shown to staff are mapped to a staff-safe label (no internal notes/ratings).

UI
Jobs list columns: Code, Title, Type, Location, Department, Salary Range (permission aware), Status, Deadline, Actions (View). Job detail page: Job Details, Status, Description, Requirements, Benefits, Required skills, apply button (staff). Apply page: prefilled form from profile, custom questions, resume upload, consent, submit, confirmation with tracking ID. Applications list: Tracking ID, Name, Email, Job, Source, Stage/Status, Applied date; list and grid routes; detail page. Profile page: all seeker fields with resume upload and completeness meter.
REALTIME: js.application.created, js.application.status_changed (staff sees updates live), recruitment job events refresh lists.
WEBHOOK EVENTS: job_search.application.created.
NOTIFICATIONS: application received (staff), status changes, new job matching profile (optional setting).
PERMISSIONS: job-search.jobs.view, job-search.applications.view, job-search.browse (staff), job-search.profile.update.
REMOVE HARDCODED: filter option arrays (from Recruitment masters), sample jobs.
TESTS: dependency lock when Recruitment expires; apply flow creates pipeline application; duplicate application blocked; staff isolation; closed/past-deadline job cannot be applied; realtime status update.
```

---

## BLOCK 14: TRAINING

```text
ADD-ON RUN: Training
slug: training | pages: /addons/training/* | API: /api/v1/addons/training/* | depends on: HRMS core (employees, branches, departments); optional cost posting to Accounting when installed | guide: Training-addons.docx
EXISTING WORK: repo has /api/training and HR training pages (programs, sessions, employee trainings). AUDIT, then migrate to /addons/training/* with redirects, gate by entitlement, remove from base HR sidebar, reconcile the data model (keep a superset: Training List = scheduled training; add participants table), and complete missing CRUD.

SIDEBAR
Training
  Dashboard           /addons/training/dashboard          (added: upcoming, ongoing, completion rate, cost, feedback average)
  Training Types      /addons/training/types              (+ /new, /:id/edit)
  Trainers            /addons/training/trainers           (+ /new, /:id, /:id/edit)
  Training List       /addons/training/trainings          (+ /new, /:id, /:id/edit; calendar route /trainings/calendar)
     Participants     /addons/training/trainings/:id/participants
     Tasks            /addons/training/trainings/:id/tasks (+ /new, /:taskId/edit)
     Task Feedbacks   /addons/training/trainings/:id/tasks/:taskId/feedbacks
  Reports             /addons/training/reports            (added: cost, attendance, completion)
  Staff: My Trainings /addons/training/my-trainings (+ /:id, my tasks, give feedback)

DB (train_* tables)
type(name, description, branch_id, department_id, is_active)
trainer(name, contact, email, experience_years, expertise, qualification, branch_id, department_id, internal/external, is_active)
training(title, type_id, trainer_id, start_date, end_date, start_time, end_time, max_participants, location, cost, description, status scheduled|ongoing|completed|cancelled, branch_id, department_id)
participant(training_id, employee_id, status enrolled|attended|completed|absent|dropped, score, certificate_media_id, enrolled_at)
task(training_id, title, assigned_employee_id, due_date, status pending|in_progress|completed, description)
task_feedback(task_id, user_id, rating 1..5, comments, created_at)

API: standard CRUD for type, trainer, training, task, feedback; participants add/remove/bulk and mark attendance/complete/upload certificate; POST /trainings/:id/status; GET /trainings/calendar; reports endpoints; staff endpoints under /my-trainings. Rules: max participants enforced; cancelled/completed trainings are read-only except feedback; deleting a type/trainer in use is blocked with usage counts; end >= start; cost uses tenant currency; optional hook posts expense when Accounting add-on exists.
UI: list pages with search, filters (type, trainer, status, branch, department, date), create/edit pages; training detail page with sections and links to Participants, Tasks (own pages); task list per training with assignee/due/status; feedback page in grid (user name, date, rating stars, comment) with create form; staff pages for own trainings, task completion and feedback; calendar route.
REALTIME: training.training.created|updated|status_changed, training.participant.enrolled|completed, training.task.created|completed, training.feedback.created.
WEBHOOK EVENTS: New Training, New Trainer.
AI FIELDS: training description, task description, feedback summary.
NOTIFICATIONS: enrolled/assigned, schedule change, reminder 1 day before, task due.
JOBS: training.reminders.
PERMISSIONS: training.<resource>.view|create|update|delete|export; staff self-service permissions.
REMOVE HARDCODED: status arrays, branch/department lists, sample trainings.
TESTS: capacity limit; status transitions; task feedback rating range; staff isolation; migration redirects from old URLs; calendar; expired add-on block; cost posting hook only when Accounting installed.
```

---

## BLOCK 15: PERFORMANCE

```text
ADD-ON RUN: Performance
slug: performance | pages: /addons/performance/* | API: /api/v1/addons/performance/* | depends on: HRMS core | guide: performance-addon.docx
EXISTING WORK: repo has HR performance pages (reviews, goals, cycles, indicators, goal types, indicator categories) and a separate OKR/360 add-on (slug okr-performance). AUDIT; migrate the guide's set to /addons/performance/* with redirects and entitlement gating; keep OKR as its own add-on and report overlaps; do not duplicate tables.

SIDEBAR
Performance
  Dashboard             /addons/performance/dashboard   (added: cycle progress, average ratings, goals status)
  Performance Indicators /addons/performance/indicators (+ /new, /:id/edit)
  Employee Goals        /addons/performance/goals       (+ /new, /:id, /:id/edit, progress update)
  Review Cycles         /addons/performance/cycles      (+ /new, /:id/edit)
  Employee Reviews      /addons/performance/reviews     (+ /new, /:id, /:id/conduct)
  System Setup
     Indicator Categories /addons/performance/setup/indicator-categories
     Goal Types           /addons/performance/setup/goal-types
  Staff: My Goals /my-goals, My Reviews /my-reviews, Team Reviews /team-reviews (managers)

DB (perf_* tables)
indicator_category(name, description, is_active); goal_type(name, description, is_active)
indicator(name, category_id, unit, target_value, description, is_active)
goal(employee_id, title, description, goal_type_id, start_date, end_date, target, current_progress, status not_started|in_progress|completed|overdue|cancelled, approved_by)
goal_progress(goal_id, value, note, recorded_at)
review_cycle(name, frequency monthly|quarterly|semi_annual|annual, description, status active|inactive, start_date, end_date)
review(employee_id, reviewer_id, cycle_id, review_date, overall_rating, comments, status scheduled|in_progress|completed|cancelled)
review_rating(review_id, indicator_id, rating 1..5, comment)

API: standard CRUD for categories, goal types, indicators, goals (+ POST /goals/:id/progress), cycles, reviews; GET /reviews/:id/conduct, PUT /reviews/:id/conduct (ratings per indicator + overall rating + comments), POST /reviews/:id/submit, POST /reviews/bulk (create for a cycle for selected employees). Rules: delete of category/type/indicator in use is blocked; reviewer cannot be the employee; completed reviews are locked (reopen needs permission); progress percent computed from target and current; overdue status set by job; employees see only released reviews; managers see their team via reporting line.
UI: list pages with search, filters, sort, pagination; goals list columns Title, Employee, Goal Type, Target, Progress (bar), Start, End, Status; reviews list columns Employee, Reviewer, Cycle, Review Date, Rating, Status; conduct review page showing employee/reviewer/cycle, a rating control (stars) per indicator, overall rating (computed suggestion editable), comments, save draft/submit; staff pages for own goals (update progress) and own reviews; dashboards with charts.
REALTIME: performance.goal.created|updated|progress, performance.cycle.created, performance.review.assigned|submitted|completed.
WEBHOOK EVENTS: performance.review.completed, performance.goal.created.
AI FIELDS: goal description, review comments.
NOTIFICATIONS: review assigned, review due, goal overdue, review released.
JOBS: performance.goal-overdue, performance.review-reminders.
PERMISSIONS: performance.<resource>.view|create|update|delete|export|conduct; team scope for managers.
REMOVE HARDCODED: frequency/status arrays (enums are typed), rating scale limits from settings, sample indicators.
TESTS: conduct flow math; lock after submit; team scope; goal progress; cycle bulk creation; migration redirects; expired block; cross-tenant isolation.
```

---

## BLOCK 16: PERFORMANCE INDICATOR (GAMIFICATION)

```text
ADD-ON RUN: Performance Indicator (gamification)
slug: performance-indicator | pages: /addons/performance-indicator/* | API: /api/v1/addons/performance-indicator/* | depends on: HRMS core; project link is OPTIONAL (hidden unless a projects provider exists) | guide: Performance_Indicator_Addon.docx
NOTE: this is NOT the same as the Performance add-on. It is points, XP, levels, teams, challenges, achievements and leaderboards. Do not merge them.

SIDEBAR (role-based; each item a page)
Performance Indicator
  Dashboard (admin)        /addons/performance-indicator/dashboard            (8 summary cards, top 5 teams by points, top 5 members by XP, calendar of active challenges with month/week/day)
  Team Leader Dashboard    /addons/performance-indicator/dashboard/team-leader
  My Dashboard             /addons/performance-indicator/dashboard/me
  (landing redirects by role; all three are separate pages)
  Challenges               /addons/performance-indicator/challenges       (+ /new, /:id, /:id/edit, /:id/scores = assign scores page)
  Achievements             /addons/performance-indicator/achievements     (+ /new, /:id, /:id/edit)
  Global Leaderboard       /addons/performance-indicator/leaderboard      (teams and individuals, period filters)
  Teams                    /addons/performance-indicator/teams            (+ /new, /:id = team details, /:id/edit)
  Team Tasks               /addons/performance-indicator/team-tasks       (+ /new, /:id/edit)
  Progress Management      /addons/performance-indicator/progress
  System Setup
     Criterias /setup/criterias | Levels /setup/levels | Categories /setup/categories | Reward Types /setup/reward-types | Additional Settings /setup/settings (points-to-XP conversion rules and XP distribution defaults)

DB (gami_* tables)
criteria(name, is_active); level(name, difficulty easy|medium|hard, xp_individual, points_team, description, is_active); category(name, is_active); reward_type(name, applies_to individual|team|both, is_active)
challenge(name, is_active, start_at, end_at, status upcoming|in_progress|on_hold|completed|cancelled, assignee_type individual|team, level_id, project_id NULL, description)
challenge_score(challenge_id, subject_type user|team, subject_id, criteria_id, score, scored_by, scored_at)
achievement(name, is_active, reward_type_id, category_id, assignee_type, unlock_rule, status locked|unlocked, winner_type, winner_id, unlocked_at)
team(name, leader_id, badge, is_active, image_media_id, description, total_points, level_id) + team_member(team_id, user_id)
team_task(name, status upcoming|in_progress|on_hold|completed, team_id, challenge_id, member_id, due_date, xp, points)
xp_ledger(user_id, team_id, source_type, source_id, xp, points, created_at) (append-only; totals derived)
setting(points_to_xp_ratio, distribution_mode, overdue_penalty_rules, ...) in the settings registry group addon.performance-indicator

API: standard CRUD for every master and entity; POST /challenges/:id/scores (assign scores); POST /challenges/:id/complete; POST /teams/:id/xp-distribution (leader sets distribution per member); POST /team-tasks/:id/complete; GET /leaderboard?scope=team|member&period=; GET /dashboard/{admin|team-leader|me}; GET /progress.
Rules per guide: team points convert to XP using the configured conversion; team leader sets XP distribution to members; overdue challenge variation applies the configured rule; task completion by members adds XP/points through ledger entries (never edit totals directly); individual challenge participation adds XP; achievements unlock automatically when rules are met and levels advance when XP thresholds are reached; leaderboard derived from the ledger. IMPLEMENT THE GUIDE'S "Example Workflow" Steps 1 to 8 AS AUTOMATED ACCEPTANCE TESTS with the same numbers.
Privacy: show leaderboard to members only if the tenant setting allows; hide individual names option; employees can always see their own progress.
UI: dashboards (admin, team leader, member) with charts and calendar; list/detail/create pages as above with search, filters, status chips; assign-scores page with per-criteria inputs; team details page (members, points, level, tasks, badge); progress management page; leaderboard with period filter and rank movement.
REALTIME: gami.challenge.*, gami.score.assigned, gami.xp.awarded, gami.achievement.unlocked, gami.level.up, gami.leaderboard.changed (leaderboard and dashboards update live; level-up toast to the member).
WEBHOOK EVENTS: gami.achievement.unlocked, gami.challenge.completed.
NOTIFICATIONS: challenge assigned, score assigned, achievement unlocked, level up, task overdue.
JOBS: gami.overdue-challenges, gami.leaderboard-snapshot.
PERMISSIONS: performance-indicator.<resource>.view|create|update|delete|score|distribute; role-based dashboards (admin, team leader, member).
REMOVE HARDCODED: difficulty/status arrays (typed enums only), levels, reward lists, sample teams.
TESTS: guide example workflow; ledger integrity; leaderboard math; role-based dashboard routing; achievement unlock; overdue rule; cross-tenant isolation; expired block.
```

---

## BLOCK 17: TEAM WORKLOAD

```text
ADD-ON RUN: Team Workload
slug: team-workload | pages: /addons/team-workload/* | API: /api/v1/addons/team-workload/* | depends on: HRMS core (employees, holidays); optional Timesheet/Time Tracker integration | guide: Team_Workload_Addon.docx

SIDEBAR
Team Workload
  Overview
     Workload              /addons/team-workload/workload      (grid: employees x days, E = estimated, S = spent, red when S > E, totals)
     Report                /addons/team-workload/report        (donut, weekly line, bar charts; employee filter)
  Staff Shifting           /addons/team-workload/staff-shifting (+ /new, /:id/edit)
  Planned Hours            /addons/team-workload/planned-hours  (ADDED: estimated-time entries so the grid works without a Projects product)
  Holidays                 /addons/team-workload/holidays       (read-only from HR Holidays when HRMS holidays exist; editable only in standalone mode)
  Workload Timesheet       /addons/team-workload/timesheets     (+ /new, /:id/edit; used only when no Timesheet/Time Tracker source is active)

DB (tw_* tables)
staff_setting(employee_id, hours_mon..hours_sun, holiday_allocation, weekly_capacity (computed), effective_from)
planned_hours(employee_id, date, hours, minutes, source, note)
timesheet(employee_id, date, hours, minutes, notes)  [fallback source]
holiday(occasion, start_date, end_date) [standalone mode only]
Estimated source priority: Time Tracker/Project task estimates (if installed) -> planned_hours. Spent source priority: Timesheet module -> Time Tracker sessions -> tw_timesheet.

API: standard CRUD for staff settings, planned hours, timesheets, holidays (standalone); GET /workload?from&to&employee&department (E and S per day, capacity, utilization, overload flags), GET /report?from&to&employee (donut: total/available/spent; weekly line capacity vs utilization; bar estimated vs actual per employee), export CSV/PDF.
Rules: holidays reduce capacity; weekly capacity derived from staff settings; spent > estimated flagged; one timesheet entry per user per day per source (or additive per setting); managers see their team scope; dates use tenant timezone.
UI: workload grid with week navigation, filters (employee, department), color rules, totals row/column, click cell to add/edit planned/spent entries; report page with three charts that react to the employee filter; staff shifting list with daily hours; holidays list with date filters; timesheet list; empty/error/loading/locked/expired states; mobile layout collapses days into a day selector.
REALTIME: tw.planned.updated, tw.timesheet.updated, tw.staff_setting.updated, source events (leave/holiday/time tracker) update the grid live.
WEBHOOK EVENTS: team_workload.overload.detected (optional).
NOTIFICATIONS: overload alert to manager (setting).
PERMISSIONS: team-workload.workload.view, .staff-setting.manage, .planned.manage, .timesheet.manage, team scope enforced.
REMOVE HARDCODED: weekday arrays (use locale), colors (theme tokens), sample employees.
TESTS: capacity math with holidays and leave; red highlight rule; employee filter updates report; source priority; team scope; realtime grid update; expired block.
```

---

## BLOCK 18: TIME TRACKER

```text
ADD-ON RUN: Time Tracker
slug: time-tracker | pages: /addons/time-tracker/* | API: /api/v1/addons/time-tracker/* | desktop-app API: /api/v1/addons/time-tracker/app/* | depends on: a projects provider. Projects is NOT launched, so ship the minimal "Time Tracker Projects" (project, task, assignment) inside this add-on and switch to the Projects product later through an adapter | guide: Time_Tracker_Addon.docx
SCOPE: server, API, web pages, device registration and token auth are in scope. The native Windows/Ubuntu desktop application is a separate deliverable: define its API contract and provide a download/setup page; do not build the native app in this run.

SIDEBAR
Time Tracker
  Dashboard           /addons/time-tracker/dashboard       (added: today/week hours, active sessions live)
  Projects            /addons/time-tracker/projects        (+ /new, /:id, /:id/edit; assign users)
  Tasks               /addons/time-tracker/tasks           (+ /new, /:id/edit)
  Time Tracker        /addons/time-tracker/sessions        (records list)
     Screenshots      /addons/time-tracker/sessions/:id/screenshots
  Reports             /addons/time-tracker/reports         (added: by user, project, task; export)
  Devices and App     /addons/time-tracker/devices         (registered desktop apps, app download and setup instructions page replacing setup.txt)
  System Settings     /addons/time-tracker/settings        (App Site URL, Tracking Interval in minutes, privacy and retention)
  Staff: My Time /my-time (own sessions, screenshots, totals)

DB (tt_* tables)
project(name, description, status, start/end), project_member(project_id, user_id), task(project_id, title, assignee_id, estimate_hours, status)
session(user_id, project_id, task_id, name/description, started_at, ended_at, total_seconds (derived), source web|app, device_id, status running|stopped)
screenshot(session_id, media_id, captured_at, blurred bool, deleted_at)
device(user_id, device_name, os, app_version, token_hash, last_seen_at, revoked_at)
view_log(screenshot_id or session_id, viewed_by, viewed_at)
Settings group addon.time-tracker: app_site_url, tracking_interval_minutes, retention_days, require_consent, blur_option, allow_manager_view.

APP API (token auth, device-bound, revocable): POST /app/login (email/password or one-time code from Devices page -> device token), GET /app/tasks (assigned projects/tasks), POST /app/sessions (start with description), POST /app/sessions/:id/heartbeat, POST /app/sessions/:id/screenshots (multipart, type/size limits, interval enforcement), POST /app/sessions/:id/stop, GET /app/config (interval, privacy text), POST /app/logout.
WEB API: standard CRUD for projects, tasks, sessions (list/view/delete), GET /sessions/:id/screenshots (signed URLs), devices (list/revoke), settings, reports.
Rules: user can track only assigned tasks; screenshots only at the configured interval and only while a session runs; total time computed from start/end; deleting a session removes its screenshots (soft delete, purge after retention) and writes an audit entry; screenshot access limited to the owner and permitted managers; every view is logged; retention job purges old screenshots; consent notice shown in the app and acknowledged before tracking starts.
UI: sessions list columns Name, Project, Task, Start, End, Total Time, Actions (View Screenshots, Delete) with filters (user, project, task, date); screenshots page as a gallery with time stamps and lightbox; projects/tasks CRUD pages; settings page; devices page with revoke; reports with charts; live "currently tracking" panel.
REALTIME: tt.session.started|stopped, tt.screenshot.added (live gallery for permitted viewers), tt.device.revoked.
WEBHOOK EVENTS: New Tracker (session started), tt.session.stopped.
NOTIFICATIONS: device registered, long idle session, retention purge notice.
JOBS: tt.stale-session-closer, tt.screenshot-retention-purge.
PERMISSIONS: time-tracker.project.*, .task.*, .session.view|delete, .screenshot.view (own vs team), .settings.update, .device.manage.
PRIVACY/LEGAL: employee notice + consent, tenant policy toggles, blur option, retention days, access logs; explicit in the report that screenshot monitoring may be regulated.
REMOVE HARDCODED: app URL, interval defaults (settings registry), sample sessions/screenshots.
TESTS: start/stop via app API with a test client; interval enforcement; unauthorized task blocked; screenshot access scopes; retention purge; token revocation; realtime gallery; expired block (app API returns 402 and the app shows renewal message); cross-tenant isolation.
```

---

## BLOCK 19: PROCUREMENT

```text
ADD-ON RUN: Procurement
slug: procurement | pages: /addons/procurement/* | API: /api/v1/addons/procurement/* | public vendor portal: /public/procurement/* | depends on: HRMS core (users, departments). Items come from a minimal "Procurement Items" master shipped inside this add-on (Inventory is not launched); adapter to Inventory items later | guide: Procurement_Addon.docx

SIDEBAR (all pages)
Procurement
  Dashboard                 /addons/procurement/dashboard   (metrics, interview calendar month/week/day, funnel RFx -> applications -> interviews -> vendor onboarding, urgent tasks, Copy Portal Link, View Portal)
  Staff Dashboard           /addons/procurement/dashboard/staff
  RFx                       /addons/procurement/rfx (+ /new, /:id, /:id/edit)
  RFx Applicants            /addons/procurement/applicants (+ /new, /:id, /:id/edit)
  RFx Applications          /addons/procurement/applications (+ /new, /:id; grid route /applications/grid; kanban by stage /applications/kanban)
  Archived Applications     /addons/procurement/applications/archived
  Interview Schedules       /addons/procurement/interviews (+ /new, /:id, calendar route /interviews/calendar)
  Vendor Onboardings        /addons/procurement/onboardings (+ /new, /:id)
  RFx Vendors               /addons/procurement/vendors (+ /:id)
  Items                     /addons/procurement/items (+ /new, /:id/edit)   [ADDED master]
  System Setup
     RFx Categories /setup/categories | RFx Stages /setup/stages | Budget Types /setup/budget-types | RFx Locations /setup/locations | RFx Contract Types /setup/contract-types | Custom Questions /setup/custom-questions | Brand Settings /setup/brand | About the Organization /setup/about | Need Help? /setup/help | Proposal Tips /setup/proposal-tips | What Happens Next /setup/what-happens-next | FAQ /setup/faq

DB (proc_* tables)
rfx(code, title, start_date, end_date, status active|inactive, category_id, location_id, contract_type_id, rfx_type, featured, billing_type item|rfx, description, terms, custom_question ids, created_by); rfx_item(rfx_id, item_id, qty, unit_price/estimate, tax)
applicant(name, email, phone, dob, gender, country, city, state, profile_doc_media_id, proposal_doc_media_id)
application(rfx_id, applicant_id or inline applicant data, application_type new|applicant, tracking_id, stage_id, rating, answers (custom questions), archived_at, source public|admin)
interview(application_id, date, time, duration, mode, panel, status scheduled|completed|cancelled, notes)
onboarding(application_id, joining_date, days_of_week, budget, budget_type_id, budget_duration, status, notes)
vendor(user_id, vendor_code, company_name, contact_person, email, phone, tax_number, address, created_from_onboarding_id)
item(name, sku, unit, price, tax_rate, is_active)
setup masters: category, stage, budget_type, location, contract_type, custom_question(+options), brand_setting, about_org, help_section, proposal_tip, next_step, faq.

API: standard CRUD for all tables; actions: POST /rfx/:id/{publish|close|feature}, /applications/:id/{stage|rate|archive|unarchive|convert-to-onboarding}, /onboardings/:id/convert-to-vendor, /interviews/:id/{reschedule|cancel|complete}, GET /dashboard, GET /dashboard/staff, public: GET /public/procurement/rfx (filters), GET /public/procurement/rfx/:code, POST /public/procurement/rfx/:code/apply (captcha, rate limit, file limits, custom questions, returns tracking id), GET /public/procurement/track (tracking id + email with lockout), GET /public/procurement/content (brand, about, help sections).
Rules: RFx code auto-generated from tenant sequence; items fetched from Items master; application stages come from RFx Stages; archived applications excluded from the main list; convert flows are idempotent and audited; vendor creation links a portal user when enabled; public site shows only active, in-date RFx; expired add-on shows the unavailable page and rejects applications.
UI: dashboards (metrics, charts, calendar, funnel, urgent tasks); RFx create page with Purchase Details section (Billing Type: Item or RFx with repeater from Items); applications list with Tracking ID, Profile, Name, Email, RFx Title, Rating, Application Type, Archive/Unarchive; kanban by stage; interview scheduling page + calendar; onboarding create page (application, joining date, days of week, budget, budget type, duration); vendors list (User, Vendor Code, Company Name, Contact Person, Email, Tax Number); setup pages as simple CRUD; public vendor portal pages (home with featured RFx, RFx list with filters, RFx detail, apply form, tracking page, about, help/tips/next steps/FAQ) themed from Brand Settings with welcome card settings.
REALTIME: proc.rfx.published|closed, proc.application.created|stage_changed|archived, proc.interview.scheduled, proc.onboarding.created, proc.vendor.created; dashboards and kanban update live.
WEBHOOK EVENTS: proc.rfx.created, proc.application.created, proc.vendor.created.
AI FIELDS: RFx description/terms, custom question text, interview notes.
NOTIFICATIONS/EMAIL TEMPLATES: application received (applicant), stage change, interview invite, onboarding welcome, RFx closing soon.
JOBS: proc.rfx-closer (close past end date), proc.interview-reminders.
PERMISSIONS: procurement.<resource>.view|create|update|delete|export|archive|convert; staff dashboard permission.
REMOVE HARDCODED: category/stage/type arrays, sample RFx/vendors, portal text (from setup tables with i18n defaults), placeholder logos.
TESTS: RFx to vendor flow; public apply with captcha and limits; tracking lockout; archive/unarchive; item repeater totals; stage kanban realtime; portal unavailable when expired; cross-tenant isolation; no sample data in empty tenant.
```

---

## BLOCK 20: LMS

```text
ADD-ON RUN: LMS
slug: lms | pages: /addons/lms/* | API: /api/v1/addons/lms/* | public website: /public/lms/* | depends on: HRMS core (users, media); payments use tenant payment gateway settings (sandbox until live is enabled) | guide: lms.docx
EXISTING WORK: repo has training/LMS-like code (course, lesson, enrollment, certificate in training routes; slug learning-lms). AUDIT; reuse and migrate; do not duplicate.

SIDEBAR (every item is a page)
LMS
  Dashboard               /addons/lms/dashboard   (welcome card with Copy Link to public site, summary cards, 7-day enrollment trends, today's activity, top courses)
  Theme Setup (nested pages)
     Brand Setting            /addons/lms/theme/brand
     Color & Typography       /addons/lms/theme/colors-typography
     Homepage Sections        /addons/lms/theme/home/hero | /stats | /featured-courses | /offer-banner | /categories | /testimonials | /newsletter
     About Page Settings      /addons/lms/theme/about
     Blog Page Settings       /addons/lms/theme/blog
     Course Pages Settings    /addons/lms/theme/course-pages
     Authentication Pages     /addons/lms/theme/auth-pages
     Contact & Support Pages  /addons/lms/theme/contact-support
     E-commerce Pages         /addons/lms/theme/ecommerce
  Categories              /addons/lms/categories (+ /new, /:id/edit)
  Manage Courses          /addons/lms/courses (+ /new, /:id, /:id/edit, /:id/content = course builder, /:id/students)
  Manage Students         /addons/lms/students (+ /new, /:id, /:id/edit)
  Manage Orders           /addons/lms/orders (+ /new, /:id, /:id/edit)
  Website Orders          /addons/lms/website-orders (+ /:id; bank-transfer verification action)
  Custom Pages            /addons/lms/pages (+ /new, /:id/edit)
  Manage Blogs            /addons/lms/blogs (+ /new, /:id/edit; blog categories /blogs/categories)
  Manage Subscribers      /addons/lms/subscribers
  Manage Contacts         /addons/lms/contacts (+ /:id reply/status)
  Manage Testimonials     /addons/lms/testimonials (+ /new, /:id/edit)
  Manage Wishlists        /addons/lms/wishlists
  Manage Carts            /addons/lms/carts
  Manage Coupons          /addons/lms/coupons (+ /new, /:id usage stats, /:id/edit)
  Certificates            /addons/lms/certificates (ADDED: templates and issued list)
  Reports                 /addons/lms/reports (ADDED: enrollments, revenue, completion)
  Staff/Student (internal learners): My Learning /addons/lms/my-learning (+ /:courseId player, /certificates)

DB (lms_* tables)
category, course(name, description, requirements, category_id, level, language, duration, price, sale_price, thumbnail, status draft|published|archived, instructor_id), course_section, lesson(section_id, type video|text|file|quiz, content, duration, order, preview), quiz/quiz_question/quiz_attempt, student(name, email, password_hash, phone, avatar, status, linked user optional), enrollment(student_id, course_id, progress, completed_at, certificate_id), lesson_progress, order(number, student_id, date, subtotal, discount, tax, total, payment_status, payment_method, source admin|website), order_item, coupon(name, code, type percentage|flat, value, usage_limit, used_count, start/expiry, status) + coupon_usage, cart/cart_item, wishlist, blog(+category), custom_page(title, slug, content, show_in_header), subscriber, contact_message, testimonial, certificate_template/certificate, theme_setting (JSON per section, validated by schema), invoice link to tenant invoice sequence.

API: standard CRUD for every table; course builder endpoints (sections/lessons reorder, quiz CRUD); enrollments (enroll, progress, complete -> certificate PDF); orders (create manual order with course repeater and discount; server totals/tax/GST; mark paid; bank-transfer verification action; refund/void with enrollment revoke); coupons validate (server-side, limits, dates, applicability); theme settings GET/PUT per section; public: GET /public/lms/home, /courses (filters), /courses/:slug, POST /public/lms/auth/register|login (student auth separate from staff auth, rate limited), cart/wishlist endpoints, POST /public/lms/checkout (creates order, payment via tenant gateway or bank transfer), GET /public/lms/pages/:slug, blogs, POST /public/lms/contact, POST /public/lms/newsletter.
Rules: order paid => enrollment created idempotently; coupon applied server-side only; student data isolated per tenant; certificates issued when completion rules met; deleting courses with enrollments archives instead; public site reads theme settings and content only from the database; expired add-on => public website unavailable, student player blocked (read-only access to completed certificates per setting), orders blocked.
UI: all admin pages as list + create/edit pages with search, filters (category, status, level, price range, date, payment), course builder page (sections, lessons, quizzes with drag reorder), course detail page (structure, enrollments, revenue), order forms with repeater and live totals, theme pages with live preview, public website pages (home, course list, course detail, cart, checkout, student login/register, student dashboard, learning player, certificates, blog list/detail, custom pages, contact), student player with progress tracking.
REALTIME: lms.course.published, lms.enrollment.created|completed, lms.order.created|paid|failed, lms.coupon.used, lms.blog.published, dashboard trends live; student progress updates live for admins.
WEBHOOK EVENTS: New Course, New Course Order, New Custom Page, New Blog (as in the guide) plus lms.enrollment.completed.
AI FIELDS: course description, lesson content, blog post, testimonial summary, page content.
NOTIFICATIONS/EMAIL TEMPLATES: order confirmation + invoice, enrollment welcome, certificate issued, contact reply, newsletter confirmation.
JOBS: lms.cart-abandonment (optional), lms.coupon-expiry, lms.certificate-generator.
SETTINGS: addon.lms.* (payment methods enabled, currency, tax inclusion, certificate rules, public slug, SEO).
PERMISSIONS: lms.<resource>.view|create|update|delete|export|publish; student permissions are separate and scoped.
REMOVE HARDCODED: hero/stats/banner texts, category lists, sample courses/blogs/testimonials, colors/fonts (theme settings), payment method lists (from gateway settings), placeholder images.
TESTS: course creation to purchase to enrollment to certificate end to end (sandbox payment); coupon rules; bank transfer verification; student isolation; theme change appears on public site live; website orders list; public rate limits; expired add-on blocks public site and APIs; cross-tenant isolation; no sample data in empty tenant.
```

---

After Part 2: run `20_Addon_Master_Execution_Prompt.md` section 11 (platform acceptance tests) and section 12 (production checklist), then update the repo worklog with the add-on inventory rows (`worklog_addon_inventory.md`) marked DN with evidence.
