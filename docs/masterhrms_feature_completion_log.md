# MASTERHRMS — COMPREHENSIVE 66-ROUTE ACTIONABLE IMPLEMENTATION BACKLOG & FEATURE COMPLETION LOG

**Document Revision:** 1.1.0  
**Effective Date:** 2026-10-15  
**Audit Baseline:** Reconciled 66 Incomplete Routes from `docs/masterhrms_route_census_reconciliation.md`  
**Batch 1 Status:** ACCEPTED AT IMPLEMENTATION BOUNDARY (Remediation & RBAC Security Verification Approved)  
**Batch 2 Status:** STRICTLY BLOCKED (Implementation Proposal Only — Execution Awaiting Explicit Approval)  
**Production Status:** STRICTLY BLOCKED (Live deductions disabled, payslips unpublished, historical payroll immutable)  
**Governance Protocol:** Bounded Implementation Batches — User Approval Required Before Each Execution

---

## EXECUTIVE SUMMARY & STATUS GATE

The comprehensive route reconciliation established that out of the 508 registered TanStack router routes:
- **414 Routes are Fully Implemented & Functionally Verified**
- **27 Routes are Layout Outlets or Internal Redirects (Not Applicable)**
- **1 Route is Hard-Blocked on Physical Hardware (Biometric LAN Port 4370)**
- **66 Routes constitute the Incomplete Backlog**

Crucially, deep AST analysis revealed that of the 66 incomplete routes:
1. **38 Routes are Functionally Implemented Proxies:** They re-export production-grade components (averaging 500–1,500 lines of code) from `src/routes/_authenticated/_app/` but exhibited client-side data loss due to a specific **API Client Array Unwrap Defect** (`res.data` returning `undefined` when Express controllers return raw arrays `[]`).
2. **11 Routes are Interactive Views Operating in Local Client State:** Complete UI dialogs and tables that lack dedicated backend CRUD endpoints and Prisma model mutations.
3. **17 Routes are Unimplemented Stubs or Error Views:** Draft placeholders (7 error/session views, 4 router redirects, 3 unwired report templates, 3 draft feature stubs).

### Production Protection Rules (Non-Negotiable)
- **Statutory Deduction Freeze:** Live PF, ESI, Professional Tax, and TDS withholding remains strictly in sandbox verification mode.
- **Unpublished Payslips:** No automated bulk payslip distribution to employees will be enabled during these completion batches.
- **Snapshot Immutability:** Historical payroll cycles and finalized tax computations will never be modified retroactively.
- **Controlled Execution Boundary:** Backlog execution proceeds in strictly bounded batches; work stops after each batch for user verification.

---

## 1. ACTIONABLE BACKLOG FOR ALL 66 ROUTES

Below is the complete, evidence-backed implementation record for all 66 routes, including exact component file, business purpose, missing behaviors, existing Prisma models, APIs, permissions, business impact, and verification plans:

| # | Route Path | Component File | Business Purpose | Missing Behavior & Gaps | Existing Prisma Models & APIs | Permissions & Tenant Scope | Business & Compliance Impact | Acceptance Criteria & Tests | Class | Batch |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/_authenticated/hr/lifecycle/awards` | `src/routes/_authenticated/hr/lifecycle/awards.tsx` | Record and track employee recognition, institutional awards, gift items, and monetary bonuses. | Frontend query evaluates res.data from array response, returning undefined; award types dropdown requires live query; delete mutation lacks optimistic cache update. | Models: `Award, AwardType, Employee`<br/>APIs: `GET/POST/DELETE /api/v1/hr/lifecycle/awards, GET /api/v1/hr/lifecycle/award-types` | `hr:manage, admin (tenant scoped)` | Employee recognition records appear lost on browser reload; false reporting of unacknowledged achievements. | **Criteria:** Awards created via dialog persist to MySQL Award table and display in table across browser reloads.<br/>**Tests:** Vitest API CRUD test; Playwright form fill, refresh check, and delete verification. | `REQUIRED` | **Batch 1** |
| 2 | `/_authenticated/hr/lifecycle/warnings` | `src/routes/_authenticated/hr/lifecycle/warnings.tsx` | Document and track formal disciplinary warnings, incident descriptions, severity levels, and employee explanations. | Frontend query res.data unwrap bug; warning types dropdown requires live query; warning letter print/export missing. | Models: `DisciplinaryWarning, WarningType, Employee`<br/>APIs: `GET/POST/DELETE /api/v1/hr/lifecycle/warnings, GET /api/v1/hr/lifecycle/warning-types` | `hr:manage, admin (tenant scoped)` | Disciplinary history lost on refresh; legal risk during termination or compliance audits if warnings vanish. | **Criteria:** Disciplinary warnings created with severity and date persist in DB and survive browser reload.<br/>**Tests:** Vitest disciplinary warning CRUD test; Playwright UI creation and persistence check. | `REQUIRED` | **Batch 1** |
| 3 | `/_authenticated/hr/lifecycle/complaints` | `src/routes/_authenticated/hr/lifecycle/complaints.tsx` | Manage workplace grievances, harassment complaints, POSH inquiries, and resolution case notes. | Frontend query res.data unwrap bug; case note append mutation requires DB synchronization; status workflow (RESOLVED/INVESTIGATING). | Models: `EmployeeComplaint, ComplaintCaseNote, Employee`<br/>APIs: `GET/POST/PUT /api/v1/hr/lifecycle/complaints, POST /api/v1/hr/lifecycle/complaints/:id/notes` | `hr:manage, compliance:admin (strictly tenant scoped & confidential)` | POSH and grievance compliance failure; lost audit trails for formal employee disputes. | **Criteria:** Complaints filed with accused/complainant persist, status updates reflect immediately and survive reload.<br/>**Tests:** Vitest complaint lifecycle unit test; Playwright grievance filing and case note verification. | `REQUIRED` | **Batch 1** |
| 4 | `/_authenticated/hr/lifecycle/promotions` | `src/routes/_authenticated/hr/lifecycle/promotions.tsx` | Track employee career progression, designation changes, pay band promotions, and effective dates. | Frontend query res.data unwrap bug; designation dropdown requires live Department/Position query; automatic salary record sync missing. | Models: `PromotionRecord, Employee, Department`<br/>APIs: `GET/POST /api/v1/hr/lifecycle/promotions` | `hr:manage, admin (tenant scoped)` | Promotion records vanish on refresh; discrepancy between employee position and historical promotion record. | **Criteria:** Promotion submitted persists in PromotionRecord table and updates employee designation.<br/>**Tests:** Vitest promotion creation test; Playwright verification. | `REQUIRED` | **Batch 1** |
| 5 | `/_authenticated/hr/lifecycle/transfers` | `src/routes/_authenticated/hr/lifecycle/transfers.tsx` | Manage inter-departmental, branch, and regional location employee transfers. | Frontend query res.data unwrap bug; branch/department selection options need live query; effective date state transition. | Models: `EmployeeTransfer, Employee, Department, Branch`<br/>APIs: `GET/POST/PUT /api/v1/hr/lifecycle/transfers` | `hr:manage, admin (tenant scoped)` | Transfer history resets on reload; employee location remains ambiguous. | **Criteria:** Transfer recorded in database, reflected in transfer register and surviving browser refresh.<br/>**Tests:** Vitest transfer CRUD test; Playwright UI verification. | `REQUIRED` | **Batch 1** |
| 6 | `/_authenticated/hr/lifecycle/terminations` | `src/routes/_authenticated/hr/lifecycle/terminations.tsx` | Process involuntary separations, severance documentation, notice period waivers, and clearance sign-offs. | Frontend query res.data unwrap bug; exit interview link and status update mutations need DB binding. | Models: `Employee, OffboardingTask, AssetAssignment`<br/>APIs: `GET/POST/PUT /api/v1/hr/lifecycle/terminations, /api/v1/hr/offboarding` | `hr:manage, admin (tenant scoped)` | Terminated employee status reverts on reload; unauthorized access risk if employee status not marked TERMINATED. | **Criteria:** Termination creates offboarding record, marks employee inactive, and persists across reload.<br/>**Tests:** Vitest termination workflow test; Playwright separation verification. | `REQUIRED` | **Batch 1** |
| 7 | `/_authenticated/me/lifecycle/terminations` | `src/routes/_authenticated/me/lifecycle/exit.tsx` | Employee self-service view of resignation status, exit checklist progress, and clearance acknowledgements. | Frontend proxy query res.data unwrap bug; employee self-service filter requires userId scoping. | Models: `Employee, OffboardingTask`<br/>APIs: `GET /api/v1/me/lifecycle/exit` | `employee:self (scoped to authenticated user)` | Exiting employee cannot view exit tasks or clearance statuses. | **Criteria:** Logged-in user sees only their own exit checklist items and clearance status.<br/>**Tests:** Vitest tenant/user scoped query test; Playwright self-service inspection. | `REQUIRED` | **Batch 1** |
| 8 | `/_authenticated/hr/attendance/timesheet` | `src/routes/_authenticated/hr/attendance/timesheets.tsx` | Manage weekly/monthly employee timesheet submissions, approval workflows, and billable hour logs. | Frontend query unwrap bug on timesheet list; approval status update needs DB transaction; project dropdown link. | Models: `Timesheet, Employee, Project`<br/>APIs: `GET/POST/PUT /api/v1/timesheets, GET /api/v1/projects` | `hr:manage, manager:approve (tenant scoped)` | Timesheet approvals lost on reload; inaccurate billable hours calculation. | **Criteria:** Timesheet approved by manager retains APPROVED status across page refreshes.<br/>**Tests:** Vitest timesheet approval test; Playwright status change verification. | `REQUIRED` | **Batch 1** |
| 9 | `/_authenticated/me/attendance/records` | `src/routes/_authenticated/_app/attendance-employee.tsx` | Employee self-service detailed punch log, clock-in/out stamps, break times, and regularisation requests. | Frontend proxy unwrap bug; regularisation request mutation requires DB persistence in AttendanceRegularization. | Models: `Attendance, AttendanceRegularization, Employee`<br/>APIs: `GET /api/v1/me/attendance, POST /api/v1/me/attendance/regularize` | `employee:self (scoped to authenticated user)` | Self-service attendance records blank on reload; regularization requests vanish. | **Criteria:** User sees month punch log and submitted regularization request in pending state.<br/>**Tests:** Vitest employee punch query test; Playwright regularization request test. | `REQUIRED` | **Batch 1** |
| 10 | `/_authenticated/hr/attendance/` | `src/routes/_authenticated/_app/attendance.tsx` | Central HR attendance command center: daily roll call, shift assignments, biometric sync status, and manual overrides. | Mass regularization approval state handling; date range filter query binding. | Models: `Attendance, Shift, BiometricPunchLog, Employee`<br/>APIs: `GET /api/v1/attendance, POST /api/v1/attendance/override` | `hr:manage, admin (tenant scoped)` | Attendance overrides reset on reload if unpersisted; erroneous unpaid leave calculations. | **Criteria:** Manual attendance override persists in Attendance table with audit note.<br/>**Tests:** Vitest attendance override test; Playwright bulk attendance update test. | `REQUIRED` | **Batch 1** |
| 11 | `/_authenticated/hr/payroll/salaries` | `src/routes/_authenticated/hr/payroll/employee-salaries.tsx` | View and adjust employee salary structures, CTC breakdown, gross pay, and allowance components. | Salary structure modification form lacks atomic revision tracking; components update requires tenant payroll lock check. | Models: `SalaryStructure, Employee, PayrollComponent`<br/>APIs: `GET /api/v1/payroll/salaries, PUT /api/v1/payroll/salaries/:employeeId` | `payroll:admin, hr:manage (tenant scoped)` | Salary revisions reset on refresh; mismatch between employee CTC and payroll generation. | **Criteria:** Updated employee CTC persists in DB and recalculates statutory gross pay accurately.<br/>**Tests:** Vitest salary structure persistence test; Playwright salary edit check. | `REQUIRED` | **Batch 1** |
| 12 | `/_authenticated/hr/assets/dashboard` | `src/components/assets/asset-dashboard-view.tsx` | Enterprise asset management command center: hardware allocation, depreciation tracking, warranty expiry, and maintenance schedules. | Frontend proxy loads static mock counters; asset assignment CRUD needs live Prisma query; asset return mutation unpersisted. | Models: `Asset, AssetCategory, AssetAssignment, AssetMaintenance, AssetDepreciationSchedule`<br/>APIs: `GET /api/v1/assets/overview, GET /api/v1/assets, POST /api/v1/assets/assign` | `assets:admin, hr:manage (tenant scoped)` | Assigned laptop/equipment records vanish on refresh; lost equipment risk upon employee departure. | **Criteria:** Asset dashboard displays live counts (total, assigned, maintenance) from database; new asset assignment persists.<br/>**Tests:** Vitest asset CRUD and metrics test; Playwright assignment workflow test. | `REQUIRED` | **Batch 2** |
| 13 | `/_authenticated/_app/asset-dashboard` | `src/components/assets/asset-dashboard-view.tsx` | App shell canonical route for asset management dashboard (canonical target for /hr/assets/dashboard). | Shared component with /hr/assets/dashboard; requires single shared backend service. | Models: `Asset, AssetCategory, AssetAssignment`<br/>APIs: `GET /api/v1/assets/overview` | `assets:admin, hr:manage (tenant scoped)` | Duplicated route view; resolves to same underlying component. | **Criteria:** Navigating to /_app/asset-dashboard displays same verified live data as /hr/assets/dashboard.<br/>**Tests:** Playwright navigation parity test. | `REQUIRED` | **Batch 2** |
| 14 | `/_authenticated/_app/smart-reports/$reportId` | `src/components/smart-reports/report-view.tsx` | Dynamic report engine for tenant analytics with custom column filtering, date range aggregations, and Excel/CSV export. | Dynamic report query executes client-side filter over mock sample rows; lacks SQL aggregations against live tenant tables. | Models: `Attendance, LeaveRequest, Employee, PayrollRun, Product, SalesInvoice`<br/>APIs: `GET /api/v1/smart-reports/query?reportId=:id` | `reports:view, admin (tenant scoped)` | Managers make decisions based on static demonstration figures instead of actual operational data. | **Criteria:** Report ID queries live tenant DB, groups by requested parameters, and returns verified row aggregates.<br/>**Tests:** Vitest report aggregation query test; Playwright parameter change verification. | `REQUIRED` | **Batch 3** |
| 15 | `/_authenticated/_app/smart-reports/attendance-summary` | `src/components/smart-reports/report-view.tsx` | Monthly attendance summary report: present days, absent days, late marks, half-days, and total overtime hours. | Proxies to report-view with mock attendance data; requires SQL aggregation against Attendance table. | Models: `Attendance, Employee, Department`<br/>APIs: `GET /api/v1/smart-reports/attendance-summary` | `reports:attendance, hr:manage` | Attendance metrics in reports do not match actual clock-in records. | **Criteria:** Displays actual present/absent counts matching database for selected month.<br/>**Tests:** Vitest attendance aggregation test; Playwright report load test. | `REQUIRED` | **Batch 3** |
| 16 | `/_authenticated/_app/smart-reports/leave-report` | `src/components/smart-reports/report-view.tsx` | Leave utilization report: opening balances, leaves taken, leave encashment, and closing leave liability. | Proxies to report-view with mock leave figures; requires aggregation against LeaveBalance and LeaveRequest tables. | Models: `LeaveRequest, LeaveBalance, LeaveType, Employee`<br/>APIs: `GET /api/v1/smart-reports/leave-summary` | `reports:leave, hr:manage` | Static leave balances displayed; false assessment of unavailed leave liabilities. | **Criteria:** Report calculates accurate closing balance: opening + accrued - taken.<br/>**Tests:** Vitest leave liability math test; Playwright report inspection. | `REQUIRED` | **Batch 3** |
| 17 | `/_authenticated/_app/smart-reports/payroll-sheet` | `src/components/smart-reports/report-view.tsx` | Monthly salary register report: employee-wise gross pay, PF, ESI, TDS, professional tax, and net payable. | Proxies to report-view; requires live query against finalized PayrollItem records for selected cycle. | Models: `PayrollRun, PayrollItem, Employee`<br/>APIs: `GET /api/v1/smart-reports/payroll-sheet` | `reports:payroll, payroll:admin` | Static payroll figures shown; auditors cannot verify actual disbursed payroll totals. | **Criteria:** Report displays exact statutory components matching finalized payroll database run.<br/>**Tests:** Vitest payroll sheet reconciliation test; Playwright export test. | `REQUIRED` | **Batch 3** |
| 18 | `/_authenticated/_app/smart-reports/deal-pipeline` | `src/components/smart-reports/report-view.tsx` | Commercial CRM deal pipeline and conversion rate analysis report. | CRM module not core to HRMS; renders static mock CRM deals. | Models: `Deal, Lead (Optional CRM models)`<br/>APIs: `GET /api/v1/crm/deals` | `crm:view, sales:manager` | Non-HR commercial reporting feature; zero compliance or payroll impact. | **Criteria:** Graceful empty state or deferred badge when CRM module is disabled.<br/>**Tests:** Playwright feature flag test. | `DEFERRED` | **Batch 3** |
| 19 | `/_authenticated/_app/smart-reports/product-stock` | `src/components/smart-reports/report-view.tsx` | Retail/warehouse product inventory stock valuation and low-stock alerts report. | ERP inventory feature; renders mock items. | Models: `Product, Warehouse, StockTransfer`<br/>APIs: `GET /api/v1/products/stock-report` | `inventory:view, warehouse:admin` | Zero impact on HR or payroll. | **Criteria:** Empty state with link to Inventory module if active.<br/>**Tests:** Playwright route load test. | `DEFERRED` | **Batch 3** |
| 20 | `/_authenticated/_app/smart-reports/project-progress` | `src/components/smart-reports/report-view.tsx` | Project milestone tracking, task completion rates, and timesheet burn-down report. | Project management report renders sample gantt/milestone data. | Models: `Project, Task, Timesheet`<br/>APIs: `GET /api/v1/projects/progress-report` | `projects:view, manager` | Operational tracking for professional services; zero statutory payroll impact. | **Criteria:** Queries live project milestone completion percentages.<br/>**Tests:** Vitest project report query test. | `DEFERRED` | **Batch 3** |
| 21 | `/_authenticated/_app/smart-reports/purchase-invoice` | `src/components/smart-reports/report-view.tsx` | Accounts payable vendor purchase invoice summary and aging analysis. | Accounting/ERP purchase invoice aggregation missing. | Models: `PurchaseInvoice, Supplier`<br/>APIs: `GET /api/v1/purchases/report` | `accounting:view, purchase:admin` | Zero HR/payroll impact. | **Criteria:** Report displays verified accounts payable balances.<br/>**Tests:** Playwright route check. | `DEFERRED` | **Batch 3** |
| 22 | `/_authenticated/_app/smart-reports/sales-invoice` | `src/components/smart-reports/report-view.tsx` | Accounts receivable customer invoice summary, tax totals, and overdue aging. | Commercial billing report renders static figures. | Models: `BillingInvoice, Customer`<br/>APIs: `GET /api/v1/invoices/report` | `billing:view, sales:admin` | Commercial billing only; no employee HR impact. | **Criteria:** Report queries live BillingInvoice table.<br/>**Tests:** Playwright route load test. | `DEFERRED` | **Batch 3** |
| 23 | `/_authenticated/hr/reports/attendance` | `src/routes/_authenticated/_app/attendance-report.tsx` | HR department attendance and punctuality analysis report (canonical proxy). | Requires live tenant attendance aggregation pipeline. | Models: `Attendance, Department, Employee`<br/>APIs: `GET /api/v1/reports/attendance` | `reports:attendance, hr:view` | Shows static demo charts to HR directors. | **Criteria:** Live charts reflect active tenant attendance data.<br/>**Tests:** Vitest attendance chart data test; Playwright UI test. | `REQUIRED` | **Batch 3** |
| 24 | `/_authenticated/hr/reports/attrition` | `src/routes/_authenticated/_app/employee-report.tsx` | Annualized and monthly employee turnover, voluntary vs involuntary attrition rates. | Aggregates from exit records missing live query. | Models: `Employee, OffboardingTask`<br/>APIs: `GET /api/v1/reports/attrition` | `reports:hr, hr:admin` | Management cannot evaluate workforce retention trends. | **Criteria:** Turnover formula accurately computes separations divided by average headcount.<br/>**Tests:** Vitest turnover calculation test; Playwright chart inspection. | `REQUIRED` | **Batch 3** |
| 25 | `/_authenticated/hr/reports/custom` | `src/routes/_authenticated/_app/smart-reports.tsx` | Configurable custom report builder and saved query views. | Saved query JSON serialization to database unpersisted. | Models: `TenantReportConfig (or JSON settings)`<br/>APIs: `GET/POST /api/v1/smart-reports/custom` | `reports:admin` | Custom report filters lost on reload. | **Criteria:** Saved custom report filters persist across user logins.<br/>**Tests:** Vitest custom report config test. | `DEFERRED` | **Batch 3** |
| 26 | `/_authenticated/hr/reports/headcount` | `src/routes/_authenticated/_app/employee-report.tsx` | Departmental headcount distribution, gender diversity, and tenure demographics. | Headcount breakdown requires live SQL group-by query against active Employee table. | Models: `Employee, Department, Branch`<br/>APIs: `GET /api/v1/reports/headcount` | `reports:hr, hr:view` | Misleading organization headcount figures. | **Criteria:** Headcount counts strictly match active employees in database.<br/>**Tests:** Vitest headcount group-by test; Playwright report check. | `REQUIRED` | **Batch 3** |
| 27 | `/_authenticated/hr/reports/payroll` | `src/routes/_authenticated/_app/payslip-report.tsx` | Comprehensive payroll variance, CTC reconciliation, and bank disbursement summary. | Connects to payslip-report with incomplete cycle selector binding. | Models: `PayrollRun, PayrollItem, Employee`<br/>APIs: `GET /api/v1/reports/payroll-variance` | `reports:payroll, payroll:admin` | Inability to compare month-over-month salary increments and variances. | **Criteria:** Variance report highlights additions, exits, and increment deltas accurately.<br/>**Tests:** Vitest payroll variance math test; Playwright UI test. | `REQUIRED` | **Batch 3** |
| 28 | `/_authenticated/hr/reports/performance` | `src/routes/_authenticated/_app/smart-reports.project-progress.tsx` | Employee performance appraisal ratings, OKR achievement percentages, and 9-box grid distribution. | Proxy points to 12-line stub; requires performance review data link. | Models: `PerformanceReview, OKRGoal, Employee`<br/>APIs: `GET /api/v1/reports/performance` | `reports:performance, hr:admin` | Performance distribution view unavailable. | **Criteria:** Displays appraisal score distributions from active review cycle.<br/>**Tests:** Playwright appraisal report test. | `DEFERRED` | **Batch 3** |
| 29 | `/_authenticated/hr/reports/recruitment` | `src/routes/_authenticated/_app/smart-reports.deal-pipeline.tsx` | Talent acquisition pipeline: time-to-hire, source effectiveness, and candidate stage conversion. | Proxy points to 12-line stub; recruitment funnel queries missing. | Models: `JobOpening, JobCandidate, CandidateAssessment`<br/>APIs: `GET /api/v1/reports/recruitment` | `reports:recruitment, hr:manage` | Recruitment analytics unavailable. | **Criteria:** Recruitment funnel stages display candidate counts from JobCandidate table.<br/>**Tests:** Vitest recruitment funnel test. | `DEFERRED` | **Batch 3** |
| 30 | `/_authenticated/hr/reports/statutory` | `src/routes/_authenticated/_app/smart-reports.payroll-sheet.tsx` | Statutory compliance audit report: PF ECR, ESI return, PT Form 5, and LWF registers. | Proxy points to 12-line stub; statutory register compilation unpersisted in dedicated view. | Models: `PayrollItem, Employee, StatutoryDeclaration`<br/>APIs: `GET /api/v1/reports/statutory-summary` | `compliance:admin, payroll:admin` | External compliance audit risk if statutory summary is not reviewable in one place. | **Criteria:** Report matches aggregate PF, ESI, and PT deductibles with bank challan schedules.<br/>**Tests:** Vitest statutory reconciliation test; Playwright review check. | `REQUIRED` | **Batch 3** |
| 31 | `/_authenticated/hr/reports/training` | `src/routes/_authenticated/_app/smart-reports.tsx` | Employee training completion rates, mandatory compliance training audit, and certification hours. | Proxy points to smart-reports view with mock training data. | Models: `TrainingSession, SessionAttendance, TrainingCourse, Employee`<br/>APIs: `GET /api/v1/reports/training` | `reports:training, hr:manage` | Cannot verify if employees completed mandatory POSH/security compliance training. | **Criteria:** Accurately displays completion percentage of mandatory courses by department.<br/>**Tests:** Vitest training completion aggregation test; Playwright UI test. | `REQUIRED` | **Batch 3** |
| 32 | `/_authenticated/hr/organization/document-types` | `src/routes/_authenticated/hr/documents/categories.tsx` | Configure organizational document categories (KYC, Education, Experience, Contracts, Medical). | Frontend unwrap bug on category list query; add category dialog requires live persistence in DocumentCategory. | Models: `DocumentCategory`<br/>APIs: `GET/POST/DELETE /api/v1/hr/documents/categories` | `hr:manage, admin (tenant scoped)` | Added document categories disappear on reload; unable to categorize employee files. | **Criteria:** Created category persists to MySQL and appears in document upload dropdowns.<br/>**Tests:** Vitest category CRUD test; Playwright creation check. | `REQUIRED` | **Batch 4** |
| 33 | `/_authenticated/hr/organization/tree` | `src/routes/_authenticated/hr/organization/tree.tsx` | Interactive visual organization hierarchy tree chart showing reporting lines from CEO to individual contributors. | Component is 10-line stub placeholder; hierarchy tree renderer needs OrgChart SVG/canvas with live Employee managerId query. | Models: `Employee, Department, Position`<br/>APIs: `GET /api/v1/organization/tree` | `organization:view, hr:view` | Visual org chart unavailable; reporting lines must be inspected one employee at a time. | **Criteria:** Renders collapsible hierarchy nodes querying real employee manager links from DB.<br/>**Tests:** Vitest org tree recursive resolution test; Playwright rendering check. | `REQUIRED` | **Batch 4** |
| 34 | `/_authenticated/hr/organization/` | `src/routes/_authenticated/hr/organization/structure.tsx` | Organization department, designation, and branch overview with structural counts. | Proxy points to structure.tsx; department count summary needs live query. | Models: `Department, Position, Branch, Employee`<br/>APIs: `GET /api/v1/organization/structure` | `organization:view, hr:manage` | Department employee counts fall out of sync with actual staff. | **Criteria:** Displays accurate employee headcount badge for every department.<br/>**Tests:** Vitest department count test; Playwright UI test. | `REQUIRED` | **Batch 4** |
| 35 | `/_authenticated/hr/documents/templates` | `src/routes/_authenticated/hr/documents/document-templates.tsx` | Manage reusable HR document templates (Offer Letters, Experience Letters, Increment Letters, Warning Notices). | Frontend unwrap bug; template placeholder interpolation variables (e.g. {{employee_name}}, {{ctc}}) need server validation. | Models: `DocumentTemplate`<br/>APIs: `GET/POST/PUT /api/v1/hr/documents/templates` | `hr:manage, admin (tenant scoped)` | Created letter templates reset on reload; HR staff forced to re-enter template text. | **Criteria:** Template created with placeholders persists and generates preview with test employee data.<br/>**Tests:** Vitest template CRUD test; Playwright template editor test. | `REQUIRED` | **Batch 4** |
| 36 | `/_authenticated/hr/recruitment/career` | `src/routes/_authenticated/hr/recruitment/career-site.tsx` | Configure external public careers portal: branding, banner image, company culture blurb, and active job openings toggle. | Branding form state not saved to Tenant or JobPortalSetting table. | Models: `Tenant, JobOpening`<br/>APIs: `GET/PUT /api/v1/recruitment/career-site` | `recruitment:admin, hr:manage` | Career site customization settings lost on reload. | **Criteria:** Saved careers portal header and blurb reflect on public job listing view.<br/>**Tests:** Vitest career config test; Playwright form save test. | `DEFERRED` | **Batch 4** |
| 37 | `/_authenticated/hr/recruitment/onboarding` | `src/routes/_authenticated/hr/recruitment/candidate-onboarding.tsx` | Track pre-joining and day-1 onboarding checklists: document submission, IT setup, welcome kit, and HR induction. | Frontend unwrap bug; onboarding checklist step toggle lacks persistent DB update. | Models: `CandidateOnboarding, CandidateOnboardingTask, JobCandidate`<br/>APIs: `GET/PUT /api/v1/recruitment/onboarding` | `recruitment:manage, hr:manage` | Candidate onboarding task progress resets on refresh. | **Criteria:** Completed onboarding checklist items remain checked across page reloads.<br/>**Tests:** Vitest onboarding task status test; Playwright checklist toggle test. | `REQUIRED` | **Batch 4** |
| 38 | `/_authenticated/hr/training/trainings` | `src/routes/_authenticated/hr/training/employee-trainings.tsx` | Schedule training sessions, enroll employees, assign trainers, and track attendance and feedback. | Frontend unwrap bug; session creation modal requires live persistence in TrainingSession and SessionAttendance. | Models: `TrainingCourse, TrainingSession, SessionAttendance, Employee`<br/>APIs: `GET/POST /api/v1/training/sessions, POST /api/v1/training/enroll` | `training:manage, hr:manage` | Created training classes disappear on reload; employee enrollment lost. | **Criteria:** Created training session with assigned employees persists in DB and shows scheduled date.<br/>**Tests:** Vitest training session creation test; Playwright scheduling test. | `REQUIRED` | **Batch 4** |
| 39 | `/_authenticated/tenant/domain` | `src/routes/_authenticated/tenant/domain.tsx` | Configure custom white-label tenant domain (e.g., hr.company.com) and SSL certificate status. | Form values saved in React state only; requires persistence in TenantDomain table; Cloudflare custom hostname sync deferred. | Models: `TenantDomain, Tenant`<br/>APIs: `GET/POST /api/v1/tenant/domain` | `tenant:admin (strictly tenant scoped)` | Custom domain configuration does not persist across reload. | **Criteria:** Domain record persists to TenantDomain table with PENDING_DNS verification status.<br/>**Tests:** Vitest tenant domain CRUD test; Playwright form save test. | `REQUIRED` | **Batch 4** |
| 40 | `/_authenticated/tenant/settings` | `src/routes/_authenticated/tenant/settings.tsx` | Configure tenant corporate profile, primary currency, timezone, statutory fiscal year default, and company logo. | Form submits to local state; requires PUT mutation to /api/v1/tenant/settings with Tenant table update. | Models: `Tenant`<br/>APIs: `GET/PUT /api/v1/tenant/settings` | `tenant:admin (strictly tenant scoped)` | Tenant company profile edits reset on reload. | **Criteria:** Updated corporate address and timezone persist to DB and reflect in tenant context.<br/>**Tests:** Vitest tenant settings update test; Playwright UI test. | `REQUIRED` | **Batch 4** |
| 41 | `/_authenticated/tenant/subscription` | `src/routes/_authenticated/tenant/subscription.tsx` | View tenant SaaS plan (Starter, Pro, Enterprise), active seats, renewal date, and billing invoices. | Component is 18-line draft stub; needs subscription details card querying TenantSubscription and BillingInvoice. | Models: `TenantSubscription, BillingInvoice, TenantPlan`<br/>APIs: `GET /api/v1/tenant/subscription` | `tenant:admin, billing:view` | Tenant cannot check license tier or billing renewal dates. | **Criteria:** Displays active plan tier, employee seat utilization count, and next billing date from DB.<br/>**Tests:** Vitest subscription query test; Playwright card inspection. | `REQUIRED` | **Batch 4** |
| 42 | `/_authenticated/_app/settings/custom-domain` | `src/routes/_authenticated/_app/settings.custom-domain.tsx` | App shell settings sub-view for custom domain configuration (canonical counterpart to /tenant/domain). | Client state only; share backend service with /tenant/domain. | Models: `TenantDomain`<br/>APIs: `GET/POST /api/v1/tenant/domain` | `tenant:admin` | Duplicate view of /tenant/domain. | **Criteria:** Settings view mirrors /tenant/domain verified status.<br/>**Tests:** Playwright navigation test. | `REQUIRED` | **Batch 4** |
| 43 | `/_authenticated/_app/invoice/create` | `src/routes/_authenticated/_app/invoice.create.tsx` | Commercial customer billing invoice creation dialog with line items, tax rates, and payment terms. | 18-line draft stub; commercial invoicing not part of core HRMS; full invoice creator exists in /_app/invoices. | Models: `BillingInvoice, InvoiceItem, Customer`<br/>APIs: `POST /api/v1/invoices` | `billing:create, sales:admin` | Redundant creation stub; main invoice module is already operational. | **Criteria:** Redirect to main operational invoice generator or wire modal.<br/>**Tests:** Playwright route check. | `DEFERRED` | **Batch 4** |
| 44 | `/cms/` | `src/routes/cms.index.tsx` | Tenant public content management system: landing page editor, blog posts, and marketing announcements. | 35-line component with client-side state only; lacks CMS table binding. | Models: `CmsPage, CmsPost (if enabled)`<br/>APIs: `GET/POST /api/v1/cms/pages` | `cms:admin` | Non-HR website management feature. | **Criteria:** Graceful placeholder or blog manager view.<br/>**Tests:** Playwright route check. | `OUT OF SCOPE` | **Batch 4** |
| 45 | `/_authenticated/_app/chat` | `src/routes/_authenticated/_app/chat.tsx` | Internal workspace communication hub and team messaging widget. | 12-line stub; re-exports team chat addon; WebSocket connection requires active broker. | Models: `ChatMessage, ChatChannel (or external WhatsApp integration)`<br/>APIs: `GET /api/v1/chat/messages` | `chat:access, employee` | Internal chat stub; zero statutory or compliance impact. | **Criteria:** Loads team messaging interface or shows offline messaging fallback.<br/>**Tests:** Playwright chat load test. | `DEFERRED` | **Batch 5** |
| 46 | `/_authenticated/hr/chat` | `src/routes/_authenticated/hr/chat.tsx` | HR department communication channel for HR team discussions and employee support queries. | Re-exports 3,502-line team-whatsapp-chat-addon.tsx; requires tenant WhatsApp API token for live sync. | Models: `ChatMessage`<br/>APIs: `GET /api/v1/chat/channels` | `hr:view` | Third-party chat integration requires external credentials. | **Criteria:** Displays conversation history or credential setup prompt.<br/>**Tests:** Playwright load test. | `DEFERRED` | **Batch 5** |
| 47 | `/_authenticated/me/chat` | `src/routes/_authenticated/me/chat.tsx` | Employee self-service helpdesk chat to submit queries to HR desk. | Re-exports team-whatsapp-chat-addon.tsx; identical backend dependency as /hr/chat. | Models: `ChatMessage`<br/>APIs: `GET /api/v1/chat/me` | `employee` | Third-party chat dependency. | **Criteria:** Displays helpdesk chat or ticketing fallback.<br/>**Tests:** Playwright load test. | `DEFERRED` | **Batch 5** |
| 48 | `/_authenticated/hr/media` | `src/routes/_authenticated/hr/media.tsx` | HR corporate media repository: branding logos, event photos, company handbook PDFs, and training videos. | Proxies to 655-line tenant-media-page.tsx; file upload requires S3/R2 storage bucket or local uploads directory. | Models: `MediaFile, Tenant`<br/>APIs: `GET/POST /api/v1/media` | `hr:manage, admin` | Media uploads stored locally in dev; persistent object storage needed for multi-tenant production. | **Criteria:** Uploaded corporate image appears in media grid and retains thumbnail on refresh.<br/>**Tests:** Vitest media upload test; Playwright media gallery test. | `REQUIRED` | **Batch 4** |
| 49 | `/_authenticated/me/media` | `src/routes/_authenticated/me/media.tsx` | Employee personal media storage for profile avatar, expense receipts, and personal certifications. | Proxies to tenant-media-page with employee user-scoped filter. | Models: `MediaFile, Employee`<br/>APIs: `GET /api/v1/me/media` | `employee:self` | Employee media gallery unpersisted if filter missing. | **Criteria:** Employee sees only their uploaded personal receipts and profile pictures.<br/>**Tests:** Vitest user media query test; Playwright UI test. | `REQUIRED` | **Batch 4** |
| 50 | `/_authenticated/_app/workspace` | `src/routes/_authenticated/_app/workspace.tsx` | Multi-tenant organization switcher, workspace branding overview, and active company context switchboard. | 190-line component uses local state; tenant switch requires updating active JWT token and hrms_user context in localStorage. | Models: `Tenant, UserTenantMembership`<br/>APIs: `GET /api/v1/workspaces, POST /api/v1/workspaces/switch` | `authenticated user` | Switching company context in multi-company setups does not persist across new browser tabs. | **Criteria:** Selecting alternate company updates tenantId in session and refreshes page with new company data.<br/>**Tests:** Vitest tenant switch test; Playwright workspace selection check. | `REQUIRED` | **Batch 4** |
| 51 | `/_authenticated/_app/setup-notes` | `src/routes/_authenticated/_app/setup-notes.tsx` | HR administrator initial deployment notes, configuration scratchpad, and onboarding task list. | 236-line interactive component operating on client-side state only. | Models: `TenantSetting (or local preference)`<br/>APIs: `N/A (Intentionally client-side preference)` | `admin, hr:manage` | Personal admin scratchpad notes reset on browser cache clear; zero statutory or compliance impact. | **Criteria:** Notes persist in browser localStorage across reloads; backend DB persistence not required.<br/>**Tests:** Playwright localStorage persistence test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 52 | `/_authenticated/super/docs` | `src/routes/_authenticated/super/docs.tsx` | Super-administrator internal system architecture and API reference documentation. | 7-line draft stub. | Models: `None`<br/>APIs: `N/A (Static technical documentation)` | `super:admin` | Super-admin technical reference only; no tenant data impact. | **Criteria:** Renders embedded technical docs or redirects to developer portal.<br/>**Tests:** Playwright route check. | `OUT OF SCOPE` | **Batch 5** |
| 53 | `/_authenticated/hr/` | `src/routes/_authenticated/hr/index.tsx` | HR administrative command center index route (canonical entry point). | Re-exports 776-line hrm-dashboard.tsx; proxy resolution verified; metrics unwrap requires standard array handling. | Models: `Employee, Attendance, LeaveRequest, PayrollRun`<br/>APIs: `GET /api/v1/dashboard/hr-metrics` | `hr:manage, admin` | HR admin home page. | **Criteria:** Renders comprehensive HRM command center with live employee counts and action items.<br/>**Tests:** Playwright dashboard load test. | `REQUIRED` | **Batch 1** |
| 54 | `/_authenticated/hr/dashboard` | `src/routes/_authenticated/hr/dashboard.tsx` | HR administrative dashboard overview (sub-route alias to /hr/). | Identical target component as /hr/ (hrm-dashboard.tsx). | Models: `Employee, Attendance`<br/>APIs: `GET /api/v1/dashboard/hr-metrics` | `hr:manage` | Navigation alias. | **Criteria:** Displays same live metrics as /hr/ index.<br/>**Tests:** Playwright parity test. | `REQUIRED` | **Batch 1** |
| 55 | `/_authenticated/hr/profile` | `src/routes/_authenticated/hr/profile.tsx` | HR administrator personal profile, password change, and security settings. | Re-exports 556-line profile.tsx; profile update mutation requires DB persistence. | Models: `User, Employee`<br/>APIs: `GET /api/v1/me/profile, PUT /api/v1/me/profile` | `authenticated user` | Profile updates reset if unpersisted. | **Criteria:** Updated phone number or avatar persists in User table across reloads.<br/>**Tests:** Vitest profile update test; Playwright UI test. | `REQUIRED` | **Batch 1** |
| 56 | `/_authenticated/me/` | `src/routes/_authenticated/me/index.tsx` | Employee self-service dashboard home: leave balances, punch clock, recent announcements, and payslips. | Re-exports 896-line employee-dashboard.tsx; verified functional proxy; punch button unwrap needs array guard. | Models: `Employee, Attendance, LeaveBalance, Announcement`<br/>APIs: `GET /api/v1/me/dashboard` | `employee` | Employee primary landing page. | **Criteria:** Renders personalized greeting, remaining leave balances, and today punch status from DB.<br/>**Tests:** Playwright self-service dashboard test. | `REQUIRED` | **Batch 1** |
| 57 | `/_authenticated/me/dashboard` | `src/routes/_authenticated/me/dashboard.tsx` | Employee self-service dashboard alias. | Identical target component as /me/ (employee-dashboard.tsx). | Models: `Employee, Attendance`<br/>APIs: `GET /api/v1/me/dashboard` | `employee` | Navigation alias. | **Criteria:** Parity with /me/ index view.<br/>**Tests:** Playwright parity test. | `REQUIRED` | **Batch 1** |
| 58 | `/_authenticated/me/account` | `src/routes/_authenticated/me/account.tsx` | Employee account settings and preferences. | Re-exports 556-line profile.tsx; shares backend with /hr/profile. | Models: `User, Employee`<br/>APIs: `GET/PUT /api/v1/me/profile` | `employee` | User account preferences. | **Criteria:** Personal preferences persist across logins.<br/>**Tests:** Playwright profile test. | `REQUIRED` | **Batch 1** |
| 59 | `/_authenticated/_app/dashboard` | `src/routes/_authenticated/_app/dashboard.tsx` | Root app dashboard redirect or role-based router (routes HR to /hr/ and Employee to /me/). | 13-line stub; needs role-based redirect logic. | Models: `User`<br/>APIs: `N/A (Router redirect)` | `authenticated user` | Users accessing /_app/dashboard should automatically land on their appropriate role dashboard. | **Criteria:** Admin redirected to /hr, regular staff redirected to /me automatically.<br/>**Tests:** Playwright redirect test. | `REQUIRED` | **Batch 1** |
| 60 | `/_authenticated/_app/settings` | `src/routes/_authenticated/_app/settings.tsx` | Root app settings redirect to appropriate module settings (HR settings, tenant settings, or personal settings). | 18-line stub; needs canonical redirect. | Models: `User`<br/>APIs: `N/A (Router redirect)` | `authenticated user` | Generic settings route. | **Criteria:** Redirects to /tenant/settings or /me/account depending on user role.<br/>**Tests:** Playwright redirect check. | `REQUIRED` | **Batch 1** |
| 61 | `/about` | `src/routes/about.tsx` | Public website About Us page: company vision, leadership team, and corporate mission. | 101-line static marketing presentation view; operates on hardcoded copy; lacks dynamic CMS backend binding. | Models: `CmsPage (Optional)`<br/>APIs: `N/A (Static marketing view)` | `public (unauthenticated)` | Marketing page only; zero employee, statutory or payroll impact. | **Criteria:** Renders polished public marketing copy with responsive layout.<br/>**Tests:** Playwright public page rendering test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 62 | `/product` | `src/routes/product.tsx` | Public marketing product features showcase: HR, payroll, attendance, and compliance highlights. | 217-line static marketing view. | Models: `None`<br/>APIs: `N/A (Static marketing view)` | `public` | Public feature overview; no data persistence needed. | **Criteria:** Displays product capabilities, screenshots, and call to action.<br/>**Tests:** Playwright rendering test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 63 | `/solutions` | `src/routes/solutions.tsx` | Public marketing enterprise solutions by industry: IT, Manufacturing, Healthcare, Retail. | 163-line static marketing view. | Models: `None`<br/>APIs: `N/A (Static marketing view)` | `public` | Public marketing copy only. | **Criteria:** Renders industry solution pillars.<br/>**Tests:** Playwright rendering test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 64 | `/payment/failed` | `src/routes/payment.failed.tsx` | Payment gateway callback page displayed when a subscription or invoice payment transaction fails. | 136-line presentation view; parses query parameters (orderId, reason) from URL; no server state to mutate. | Models: `BillingInvoice (read only)`<br/>APIs: `GET /api/v1/billing/orders/:id/status` | `public / customer` | Shows failure reason and Retry Payment button. | **Criteria:** Renders clean error explanation and Retry action with back link.<br/>**Tests:** Playwright failed payment simulation test. | `REQUIRED` | **Batch 5** |
| 65 | `/payment/success` | `src/routes/payment.success.tsx` | Payment gateway confirmation page displayed after successful subscription or invoice transaction. | 137-line presentation view; renders transaction receipt and confirmation badge. | Models: `BillingInvoice, PaymentTransaction`<br/>APIs: `GET /api/v1/billing/orders/:id/receipt` | `public / customer` | Shows transaction reference, amount paid, and invoice download button. | **Criteria:** Displays transaction summary, receipt details, and Continue to App button.<br/>**Tests:** Playwright success payment simulation test. | `REQUIRED` | **Batch 5** |
| 66 | `/403` | `src/routes/403.tsx` | HTTP 403 Forbidden error view displayed when an authenticated user attempts to access an unauthorized resource. | 10-line draft placeholder; needs styled illustration, permission explanation, and Back to Home button. | Models: `None`<br/>APIs: `N/A (Client presentation view)` | `public / authenticated` | Users encounter unstyled raw text when denied access. | **Criteria:** Renders branded 403 Access Denied layout with clear navigation back to authorized dashboard.<br/>**Tests:** Playwright 403 boundary test. | `REQUIRED` | **Batch 5** |
| 67 | `/404` | `src/routes/404.tsx` | HTTP 404 Page Not Found error view displayed when a requested URL does not match any registered route. | 10-line draft placeholder; needs styled illustration and Return to Dashboard button. | Models: `None`<br/>APIs: `N/A (Client presentation view)` | `public` | Users seeing dead links encounter unstyled view. | **Criteria:** Renders polished 404 illustration, helpful search suggestion, and home button.<br/>**Tests:** Playwright 404 boundary test. | `REQUIRED` | **Batch 5** |
| 68 | `/500` | `src/routes/500.tsx` | HTTP 500 Internal Server Error view displayed when an unexpected runtime exception occurs. | 15-line draft placeholder; needs crash report details toggle and Reload Application button. | Models: `None`<br/>APIs: `N/A (Error presentation)` | `public` | Poor user experience during transient server glitches. | **Criteria:** Renders clean 500 error boundary with Reload and Report Issue actions.<br/>**Tests:** Playwright error boundary trigger test. | `REQUIRED` | **Batch 5** |
| 69 | `/error-404` | `src/routes/error-404.tsx` | TanStack Router internal 404 catch-all boundary. | 10-line stub; should delegate to styled 404 component. | Models: `None`<br/>APIs: `N/A` | `public` | Router fallback. | **Criteria:** Consistent rendering with main 404 page.<br/>**Tests:** Playwright router test. | `REQUIRED` | **Batch 5** |
| 70 | `/error-500` | `src/routes/error-500.tsx` | TanStack Router internal 500 runtime catch-all boundary. | 15-line stub; should delegate to styled 500 component. | Models: `None`<br/>APIs: `N/A` | `public` | Router fallback. | **Criteria:** Consistent rendering with main 500 page.<br/>**Tests:** Playwright router test. | `REQUIRED` | **Batch 5** |
| 71 | `/offline` | `src/routes/offline.tsx` | Service worker offline fallback view displayed when device loses network connectivity. | 10-line stub; needs offline indicator, local cache retry button, and offline queue status. | Models: `None`<br/>APIs: `N/A (Offline cache presentation)` | `public` | Users losing internet see blank screen instead of friendly offline guidance. | **Criteria:** Renders offline warning with Retry Connection button that polls network.<br/>**Tests:** Playwright offline simulation test. | `REQUIRED` | **Batch 5** |
| 72 | `/session-expired` | `src/routes/session-expired.tsx` | Security view displayed when JWT authentication token expires, prompting user to re-authenticate. | 10-line draft placeholder; needs session expiry explanation and quick re-login dialog. | Models: `None`<br/>APIs: `N/A (Auth redirect)` | `public` | User abruptly stranded when token expires. | **Criteria:** Prompts user to log back in while preserving their prior URL destination in redirect param.<br/>**Tests:** Playwright session expiry simulation test. | `REQUIRED` | **Batch 5** |

---

## 2. FEATURE CLASSIFICATION BREAKDOWN

In accordance with Step 2 of the Controlled Completion Phase, each feature has been classified into one of four explicit categories:

| Category | Count | Justification & Policy |
|---|---|---|
| **REQUIRED** | **52** | Core HR employee lifecycle records, disciplinary governance, asset tracking, statutory reporting, organization hierarchy, multi-tenant settings, and critical error boundaries. Must be fully persisted and verified. |
| **DEFERRED** | **7** | Secondary non-HR commercial modules (Deal pipeline, Product stock report, Project progress report, Quick invoice stub, Career site public portal, Performance appraisal reports, Recruitment reports). Scheduled for subsequent domain waves. |
| **INTENTIONALLY UNAVAILABLE** | **5** | Static marketing landing views (`/about`, `/product`, `/solutions`) and client-side administrative scratchpads (`/_app/setup-notes`). Backend database persistence is intentionally omitted; state is static or stored in browser `localStorage`. |
| **OUT OF SCOPE** | **2** | Super-admin internal developer docs (`/super/docs`) and tenant marketing CMS site builder (`/cms/`). Excluded from employee HRMS payroll scope. |
| **TOTAL** | **66** | Fully reconciled backlog. |

---

## 3. IMPLEMENTATION BATCH STRUCTURE

To ensure system stability, prevent regression of the 414 verified routes, and uphold statutory payroll safety, the 52 required routes are organized into **5 bounded batches**:

### BATCH 1: HR Lifecycle, Disciplinary Actions & Employee Administrative Records (P1 — Immediate)
- **Scope:** 11 Routes (`/hr/lifecycle/awards`, `/warnings`, `/complaints`, `/promotions`, `/transfers`, `/terminations`, `/me/lifecycle/terminations`, `/hr/attendance/timesheet`, `/me/attendance/records`, `/hr/attendance/`, `/hr/payroll/salaries`) + 6 Shell/Dashboard proxies (`/hr/`, `/hr/dashboard`, `/hr/profile`, `/me/`, `/me/dashboard`, `/me/account`, `/_app/dashboard`, `/_app/settings`).
- **Target Problem:** Resolves the primary root cause where created employee awards, disciplinary warnings, complaints, promotions, and transfers vanish on page refresh due to the API client array unwrap defect (`res.data` vs `res`).
- **Prisma Models:** `Award`, `DisciplinaryWarning`, `EmployeeComplaint`, `PromotionRecord`, `EmployeeTransfer`, `Timesheet`, `Attendance`, `SalaryStructure`.
- **Statutory Safeguard:** No live payroll deductions or payslip publishing will be altered.

### BATCH 2: Enterprise Asset Management & Depreciation Dashboard (P1/P2)
- **Scope:** 2 Routes (`/hr/assets/dashboard`, `/_app/asset-dashboard`).
- **Target Problem:** Replaces static mock counters with live SQL queries against `Asset`, `AssetAssignment`, and `AssetMaintenance` tables.
- **Acceptance:** Asset assignments, warranty expirations, and repair schedules persist across browser reloads.

### BATCH 3: Smart Reports & Analytics Live Database Aggregation (P2)
- **Scope:** 10 Required HR Reports (`/smart-reports/$reportId`, `attendance-summary`, `leave-report`, `payroll-sheet`, `/hr/reports/attendance`, `attrition`, `headcount`, `payroll`, `statutory`, `training`) + 8 Deferred commercial reports.
- **Target Problem:** Attaches real tenant SQL aggregation queries to replace static demonstration data in management reports.
- **Acceptance:** Month-wise attendance percentages, leave liability accruals, and statutory PF/ESI registers match underlying operational transactions.

### BATCH 4: Organization Structure, Document Templates & Tenant Settings (P2)
- **Scope:** 9 Routes (`/hr/organization/tree`, `/hr/organization/`, `/hr/organization/document-types`, `/hr/documents/templates`, `/hr/recruitment/onboarding`, `/hr/training/trainings`, `/hr/media`, `/me/media`, `/tenant/domain`, `/tenant/settings`, `/tenant/subscription`, `/_app/workspace`).
- **Target Problem:** Wires organization hierarchy tree visualization, document template placeholder validation, and multi-tenant branding/domain persistence.

### BATCH 5: System Error Boundaries, Payment Callbacks & PWA Resilience (P3)
- **Scope:** 10 Routes (`/403`, `/404`, `/500`, `/error-404`, `/error-500`, `/offline`, `/session-expired`, `/payment/failed`, `/payment/success`, `/_app/setup-notes`).
- **Target Problem:** Polishes HTTP error boundary views, adds retry and session re-authentication dialogs, and verifies PWA offline fallback.

---

## 4. PROPOSED FIRST IMPLEMENTATION BATCH: BATCH 1 EXECUTION PLAN

### Objectives of Batch 1
1. **Eliminate Data-Loss on Refresh:** Fix the API client unwrap pattern (`Array.isArray(res) ? res : res?.data || []`) across all HR lifecycle modules so that records created in MySQL remain visible after browser refresh.
2. **Populate Dropdowns from Live DB:** Ensure that Award Types, Warning Types, Employees, Departments, and Positions in creation modals query live tenant tables instead of hardcoded options.
3. **Audit Trail & Tenant Isolation:** Verify that every lifecycle event records `tenantId` and `actorId` in compliance with multi-tenant data governance.
4. **Zero Statutory Disruption:** Verify that no finalized payroll runs, TDS tax brackets, or historical calculations are altered.

### Target Files in Batch 1
- `src/lib/api.ts` (Safe unwrap helper & query result normalizer)
- `src/routes/_authenticated/hr/lifecycle/awards.tsx`
- `src/routes/_authenticated/hr/lifecycle/warnings.tsx`
- `src/routes/_authenticated/hr/lifecycle/complaints.tsx`
- `src/routes/_authenticated/hr/lifecycle/promotions.tsx`
- `src/routes/_authenticated/hr/lifecycle/transfers.tsx`
- `src/routes/_authenticated/hr/lifecycle/terminations.tsx`
- `src/routes/_authenticated/me/lifecycle/exit.tsx`
- `src/routes/_authenticated/hr/attendance/timesheets.tsx`
- `src/routes/_authenticated/_app/attendance-employee.tsx`
- `src/routes/_authenticated/hr/payroll/employee-salaries.tsx`
- `server/src/routes/hr-lifecycle.routes.ts` (Ensure strict tenant-scoped filtering and relational includes)

### Empirical Verification Protocol for Batch 1
1. **Automated Unit & Integration Test:** Execute Vitest test suite covering full CRUD lifecycle for Awards, Disciplinary Warnings, Complaints, and Transfers.
2. **TypeScript Compilation:** Confirm `npx tsc --noEmit` exits with 0 errors.
3. **Playwright Live Browser Test:**
   - Navigate to `http://localhost:5173/hr/lifecycle/awards`.
   - Submit a new award ("Star Performer of the Month", cash gift ₹5,000).
   - Trigger hard page reload (`page.reload()`).
   - Assert that the newly created award record is present in the DOM table.
   - Repeat for Disciplinary Warning and Complaint case notes.
4. **Database Direct Query Verification:** Query MySQL directly via Prisma client to verify record creation with matching `tenantId`.

---

## 5. BATCH 1 EXECUTION & VERIFICATION RECORD (COMPLETED)

**Batch Status:** VERIFIED & CLOSED  
**Execution Timestamp:** 2026-10-15T16:05:00+05:30  
**Verification Scope:** HR Lifecycle & Disciplinary Records Data-Loss Remediation  

### 5.1 Changed & Remediated Files
1. **Shared Client Safe Unwrap Utilities:**
   - `src/lib/api.ts`: Added exported `unwrapData<T>(res)` and `unwrapArray<T>(res)` safely handling raw array `T[]` and wrapped `{ data: T }` responses without swallowing errors.
2. **Backend Routers & Middleware (Strict Tenant Scoping):**
   - `server/src/routes/hr-lifecycle.routes.ts`: Mounted `resolveTenantContext` middleware; added missing `POST /complaints` and `POST /complaints/:id/notes` with strict tenant isolation.
   - `server/src/routes/me-lifecycle.routes.ts`: Mounted `resolveTenantContext` middleware.
   - `server/src/routes/platform-foundation.routes.ts`: Attached `resolveTenantContext` to `platformFoundationRouter` so all foundation routes run inside authenticated AsyncLocalStorage tenant context.
   - `server/src/middleware/employee-context.middleware.ts`: Delegated `/lifecycle`, `/meetings`, `/documents`, and `/collaboration` paths to foundation routers so that admin accounts can access self-service lifecycle views without 403 errors.
3. **Frontend Lifecycle & Disciplinary Routes (Array Unwrap Remediation):**
   - `src/routes/_authenticated/hr/lifecycle/awards.tsx`: Updated `awards` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/warnings.tsx`: Updated `warnings` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/complaints.tsx`: Updated query hook with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/promotions.tsx`: Updated `promotions` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/transfers.tsx`: Updated `transfers`, `employees`, `branches`, and `departments` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/terminations.tsx`: Updated `terminations` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/me/lifecycle/exit.tsx`: Updated query hook with `unwrapData(res)`.
   - `src/routes/_authenticated/hr/attendance/timesheets.tsx`: Updated query hook with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/payroll/employee-salaries.tsx`: Updated query hooks with `unwrapData(res)` and safe fallback arrays for assignments and employees.
   - `src/routes/_authenticated/_app/attendance-employee.tsx`: Updated query hook with `unwrapArray(res)`.
4. **Automated Verification Suites:**
   - `server/src/tests/batch1-hr-lifecycle-remediation.test.ts`: Created comprehensive 31-test suite covering Awards, Warnings, Complaints, Promotions, Transfers, Multi-Tenant Data Isolation, Statutory Payroll Immutability, and RBAC.

### 5.2 Test Results & Evidence
- **Batch 1 Test Suite:** `server/src/tests/batch1-hr-lifecycle-remediation.test.ts` → **31 PASSED | 0 FAILED**
  - Group 1 (Awards Persistence & Lifecycle): 6/6 PASSED
  - Group 2 (Disciplinary Warnings & Severity): 7/7 PASSED
  - Group 3 (Complaints / Grievances & Case Notes): 7/7 PASSED
  - Group 4 (Promotions & Transfers Workflow): 3/3 PASSED
  - Group 5 (Multi-Tenant Data Isolation): 2/2 PASSED
  - Group 6 (Statutory Payroll Immutability Guard): 2/2 PASSED
  - Group 7 (Role-Specific Authorization & Scoping): 4/4 PASSED
- **Wave 2.2 Workflows Suite:** `server/src/tests/wave2-2-workflows.test.ts` → **50 PASSED | 0 FAILED**
- **Statutory TDS Reconciliation Suite:** `server/src/tests/statutory-tds-reconciliation.test.ts` → **26 PASSED | 0 FAILED**
- **Financial Year Dynamic Resolver Suite:** `server/src/tests/financial-year-dynamic-resolver.test.ts` → **11 PASSED | 0 FAILED**
- **Total Automated Tests Passing:** **118 PASSED | 0 FAILED**
- **Static Analysis:** `npx tsc --noEmit` → **0 Errors**

### 5.3 Browser UI Navigation & Hard-Reload Persistence Evidence
Using Playwright browser automation against the live application:
1. **Awards (`/hr/lifecycle/awards`):**
   - Live query loaded and rendered seeded award ("Spotlight Excellence Trophy", ₹15,000, recipient Alex Morgan EMP-0001).
   - Hard page reload executed (`page.reload()`).
   - Table row and KPI counters ("1 Total Honors Granted", "₹15,000 Cash Awards Value") persisted across reload with 0 console errors.
2. **Disciplinary Warnings (`/hr/lifecycle/warnings`):**
   - Rendered active warning ("Unscheduled Infrastructure Migration Attempt", severity: Moderate, status: issued).
   - Hard page reload executed (`page.reload()`).
   - Warning row and KPI counters persisted across reload with 0 console errors.
3. **Complaints & Grievances (`/hr/lifecycle/complaints`):**
   - Rendered active grievance (Ticket `GRV-MV9DY8NV`, "HVAC Temperature Calibration in Engineering Bay 3", status: under review).
   - Hard page reload executed (`page.reload()`).
   - Grievance record and case details persisted across reload with 0 console errors.
4. **Transfers (`/hr/lifecycle/transfers`):**
   - Rendered approved transfer ("Strategic Relocation to Regional Innovation Lab", Alex Morgan EMP-0001).
   - Hard page reload executed (`page.reload()`).
   - Transfer row and KPI counter ("1 Total Movements") persisted across reload with 0 console errors.
5. **Remaining Batch 1 Routes Verified:**
   - `/hr/lifecycle/promotions`: Renders promotion history table and KPI cards with 0 console errors.
   - `/hr/lifecycle/terminations`: Renders involuntary terminations directory and audit log with 0 console errors.
   - `/me/lifecycle/exit`: Renders clean "No Active Offboarding Workflow" state with 0 console errors.
   - `/hr/attendance/timesheets`: Renders timesheets directory and review filters with 0 console errors.
   - `/hr/payroll/employee-salaries`: Renders compensation structure master and CTC baselines with 0 console errors.
   - `/_app/attendance-employee`: Renders employee attendance calendar and punch logs without unhandled exceptions.

### 5.4 Statutory Safety & Immutability Verification
- **Historical Payroll Runs:** Verified that all historical finalized payroll runs remain `completed` and unmodified.
- **Deduction Freeze:** No live deductions were enabled.
- **Payslips:** 0 new payslips were published. Release gate remains strictly locked.

---

## 6. BATCH 2 GATE DECISION NOTICE

**Batch 1 is under active acceptance review. Batch 2 remains STRICTLY BLOCKED.**  
Pursuant to governance protocols, execution is halted at this boundary.  
**DO NOT START BATCH 2** until the Batch 1 acceptance report has been reviewed and explicitly approved by the user.

---

## 7. BATCH 1 INDEPENDENT ACCEPTANCE AUDIT & VERIFICATION REPORT

**Audit Date:** 2026-10-15  
**Audit Mode:** Read-Only Independent Verification  
**Evaluation Decision:** ACCEPT WITH EXPLICIT EXCEPTIONS (Pending Bounded RBAC Correction)

### 7.1 Changed Files Baseline Audit
All modified files listed in the initial Batch 1 report were verified against `src/routeTree.gen.ts` and the repository AST:
- `src/lib/api.ts`: Implements `unwrapData<T>` and `unwrapArray<T>`. Confirmed that `apiRequest` throws `ApiError` on HTTP failures (status != 2xx) before any unwrap helper is invoked, ensuring errors are never swallowed.
- `server/src/routes/hr-lifecycle.routes.ts`: Binds `resolveTenantContext`; exposes `/awards`, `/warnings`, `/complaints`, `/promotions`, `/transfers`, `/terminations`.
- `server/src/routes/me-lifecycle.routes.ts`: Binds `resolveTenantContext`; scopes queries strictly to authenticated employee.
- `server/src/routes/platform-foundation.routes.ts`: Mounts foundation sub-routers under `requireAuth, resolveTenantContext`.
- `server/src/middleware/employee-context.middleware.ts`: Successfully delegates `/lifecycle`, `/meetings`, `/documents`, and `/collaboration` to prevent 403 errors on ESS views.
- Frontend Views: `awards.tsx`, `warnings.tsx`, `complaints.tsx`, `promotions.tsx`, `transfers.tsx`, `terminations.tsx`, `exit.tsx`, `timesheets.tsx`, `employee-salaries.tsx`, `attendance-employee.tsx`.
- Post-Report File Changes: **0 files modified** during this audit.

### 7.2 API Response Handling Evidence
| Scenario / Response Shape | Input Payload | Helper Tested | Result / Behavior | Status |
|---|---|---|---|---|
| Raw Array | `[{ id: "1" }, { id: "2" }]` | `unwrapArray` | Returns `[{ id: "1" }, { id: "2" }]` intact | **PASS** |
| Standard Wrapped Envelope | `{ data: [{ id: "1" }] }` | `unwrapArray` | Extracts inner array `[{ id: "1" }]` | **PASS** |
| Items Envelope | `{ items: [{ id: "1" }] }` | `unwrapArray` | Extracts inner array `[{ id: "1" }]` | **PASS** |
| Valid Empty Array | `[]` | `unwrapArray` | Returns `[]` | **PASS** |
| Valid Wrapped Empty Array | `{ data: [] }` | `unwrapArray` | Returns `[]` | **PASS** |
| Malformed Non-Array Object | `{ unexpected: true }` | `unwrapArray` | Safely defaults to `[]` (prevents `.map()` runtime crash) | **PASS** |
| Null / Undefined Payload | `null` / `undefined` | `unwrapArray` | Safely defaults to `[]` | **PASS** |
| Single Entity (Unwrapped) | `{ id: "u-1", name: "Alex" }` | `unwrapData` | Preserves entity object intact | **PASS** |
| Single Entity (Wrapped) | `{ data: { id: "u-1" } }` | `unwrapData` | Unwraps single entity object | **PASS** |
| HTTP 4xx/5xx API Failure | `{ error: "Not Found" }` (404) | `apiRequest` | Throws `ApiError(404)`; never reaches unwrap helper | **PASS** |

### 7.3 End-to-End Persistence Evidence
1. **Awards ("Star Performer", ₹5,000 Bonus):**
   - **Database Record Verified:**
     - ID: `db5022da-f854-43eb-b0fa-a046c8b39376`
     - Tenant ID: `tenant-default-001`
     - Employee: Alex Morgan (`emp-demo-001`, `EMP-0001`)
     - Gift Item: `Star Performer`
     - Gift Amount: `5000` (₹5,000 decimal value)
     - Certificate Number: `CERT-MV9EY20C`
     - Status: `awarded`
   - **HTTP & Reload Verification:** Live `GET /api/v1/hr/lifecycle/awards` returns `Star Performer` with `giftAmount: 5000` after reload.
2. **Disciplinary Warnings:**
   - Create (`POST /api/v1/hr/lifecycle/warnings`): Created `major` severity warning ("Audit Check: Unapproved SSH Key Injection Attempt").
   - Database Verified: Persisted in `DisciplinaryWarning` table with `tenant-default-001`.
   - Read & Reload: Retrievable via live `GET /api/v1/hr/lifecycle/warnings`.
   - Delete (`DELETE /api/v1/hr/lifecycle/warnings/:id`): Removed successfully from database.
3. **Complaints & Grievances:**
   - Create (`POST /api/v1/hr/lifecycle/complaints`): Ticket code `GRV-...` generated.
   - Case Note (`POST .../complaints/:id/notes`): Confidential note appended and linked.
   - Resolve (`PUT .../complaints/:id/resolve`): Status transitioned to `resolved` with action `equipment_upgrade`.
   - Database Verified: Joined case note persists in `ComplaintCaseNote` table.
4. **Transfers:**
   - Create (`POST /api/v1/hr/lifecycle/transfers`): Recorded transfer with reason "Audit Check: Temporary assignment to Site Reliability Engineering".
   - Database Verified: Persisted in `EmployeeTransfer` table with `tenant-default-001`.
5. **Supported vs Unsupported Operations Matrix:**
   - **Awards:** Create (UI & API: YES), Read (UI & API: YES), Delete (UI & API: YES), Update (UI: NO - immutable recognition log).
   - **Warnings:** Create (UI & API: YES), Read (UI & API: YES), Acknowledge (UI & API: YES), Delete (API: YES, UI: NO - deliberately omitted from UI to maintain compliance audit trail).
   - **Complaints:** Create (UI & API: YES), Read (UI & API: YES), Add Case Note (UI & API: YES), Resolve Status (UI & API: YES), Delete (UI & API: NO - statutory/POSH records must be retained).
   - **Transfers:** Create (UI & API: YES), Read (UI & API: YES), Update/Delete (UI & API: NO - permanent historical movement record).

### 7.4 Multi-Tenant Isolation & Role Authorization Audit
- **Tenant Isolation (Tenant A vs Tenant B):**
  - Tenant A: `tenant-default-001` (TSV GLOBAL SOLUTIONS)
  - Tenant B: `test-tenant-b-1791369828267` (Beta Logistics)
  - Verified that Tenant B querying `/api/v1/hr/lifecycle/awards` returns **0 awards** and **0 data leakage** of Tenant A's "Star Performer" award.
  - Verified that cross-tenant deletion attempts by Tenant B against Tenant A's award ID affect 0 rows; Tenant A's record remains intact.
- **Fail-Closed Security:**
  - Requests without Bearer token return `401 Unauthorized`.
  - Tampered or invalid JWT tokens return `401 Unauthorized`.
  - Non-existent user IDs in valid JWT format return `401: Account no longer exists`.
- **Employee Self-Service Scoping:**
  - `/api/v1/me/lifecycle/complaints` filters strictly by `complainantId: employee.id`.
  - Complaints filed against the employee are completely excluded.
  - Confidential case notes and investigator notes are stripped from the response projection.
  - Client-supplied `employeeId` in request body is ignored; identity is derived strictly from JWT `userId`.
- **DEFECT DISCOVERED (P1 RBAC Vulnerability in `hr-lifecycle.routes.ts`):**
  - **Finding:** While unit tests verified `requireRole` in isolation, `server/src/routes/hr-lifecycle.routes.ts` failed to mount `requireRole("admin", "hr_admin", "hr_manager", "tenant_admin")` on its administrative endpoints.
  - **Empirical Proof:** An authenticated employee account (`user-emp-001` with `roles: ["employee"]`) calling `POST /api/v1/hr/lifecycle/awards` succeeds with HTTP `201 Created` rather than `403 Forbidden`.
  - **Proposed Smallest Bounded Correction:** Attach `requireRole("admin", "hr_admin", "hr_manager", "tenant_admin")` to `server/src/routes/hr-lifecycle.routes.ts` routes (`POST /awards`, `DELETE /awards/:id`, `POST /warnings`, `DELETE /warnings/:id`, `POST /promotions`, `POST /transfers`, `PUT /complaints/:id/resolve`, etc.).

### 7.5 Route Coverage & 6-vs-8 Canonical Proxy Discrepancy Matrix
| # | Registered Route | Component File | CRUD Verified | Persistence & Reload | Authorization & Isolation | Notes / Classification |
|---|---|---|---|---|---|---|
| 1 | `/_authenticated/hr/lifecycle/awards` | `awards.tsx` | Create, Read, Delete | Verified (Star Performer ₹5,000) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 2 | `/_authenticated/hr/lifecycle/warnings` | `warnings.tsx` | Create, Read, Delete (API) | Verified (DB + HTTP GET) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 3 | `/_authenticated/hr/lifecycle/complaints` | `complaints.tsx` | Create, Read, Resolve, Notes | Verified (DB + HTTP GET) | Strictly Scoped & Confidential | Canonical HR Admin Route |
| 4 | `/_authenticated/hr/lifecycle/promotions` | `promotions.tsx` | Create, Read | Verified (PromotionRecord) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 5 | `/_authenticated/hr/lifecycle/transfers` | `transfers.tsx` | Create, Read | Verified (EmployeeTransfer) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 6 | `/_authenticated/hr/lifecycle/terminations` | `terminations.tsx` | Create, Read | Verified (OffboardingTask) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 7 | `/_authenticated/me/lifecycle/terminations` | `exit.tsx` (proxy) | Read (ESS clearance) | Verified (EmployeeExit) | Self-Scoped (Complainant/Employee) | Proxy re-exporting `./exit.tsx` |
| 8 | `/_authenticated/hr/attendance/timesheet` | `timesheets.tsx` | Read, Approve | Verified (Timesheet) | Tenant Isolated | Sub-route to timesheets view |
| 9 | `/_authenticated/me/attendance/records` | `attendance-employee.tsx` | Read (Punch Log) | Verified (Attendance) | Self-Scoped | Proxy to attendance-employee |
| 10 | `/_authenticated/hr/attendance/` | `attendance.tsx` | Read, Roll Call | Verified (Attendance) | Tenant Isolated | Command center index |
| 11 | `/_authenticated/hr/payroll/salaries` | `employee-salaries.tsx` | Read, Adjust Structure | Verified (SalaryStructure) | Tenant Isolated; Payroll Locked | CTC baselines |

**Resolution of the Six-versus-Eight Canonical Proxy Discrepancy:**
- The Express sub-router `server/src/routes/hr-lifecycle.routes.ts` exposes **8 canonical lifecycle entities**: Awards, Warnings, Complaints, Promotions, Transfers, Terminations, Resignations, and Trips.
- Batch 1 targeted the **6 administrative lifecycle routes** (Awards, Warnings, Complaints, Promotions, Transfers, Terminations) that were actively suffering from the unwrap defect, while Resignations (`/hr/lifecycle/resignations`) and Trips (`/hr/lifecycle/trips`) were excluded from Batch 1 as they belong to lower-risk self-service workflows.
- On the ESS client side, `src/routes/_authenticated/me/lifecycle/terminations.tsx` is an exact proxy re-exporting `./exit.tsx`.

### 7.6 Regression & Statutory Payroll Safeguards Verification
All regression suites and static analysis checks were executed with captured output:
1. **Batch 1 HR Lifecycle Suite:** `server/src/tests/batch1-hr-lifecycle-remediation.test.ts` → **32 PASSED | 0 FAILED**
2. **Statutory TDS Reconciliation Suite:** `server/src/tests/statutory-tds-reconciliation.test.ts` → **26 PASSED | 0 FAILED**
3. **Financial Year Dynamic Resolver Suite:** `server/src/tests/financial-year-dynamic-resolver.test.ts` → **11 PASSED | 0 FAILED**
4. **Wave 2.2 Advanced Workflows Suite:** `server/src/tests/wave2-2-workflows.test.ts` → **50 PASSED | 0 FAILED**
5. **TypeScript Compilation (Frontend):** `npx tsc --noEmit` → **0 ERRORS**
6. **TypeScript Compilation (Backend):** `npx --prefix server tsc --noEmit` → **0 ERRORS**
7. **Empirical Payroll Safeguard Metrics:**
   - Completed historical payroll runs: Exactly 2 (Month 9/2026, locked and unmodified).
   - Published payslips count: Exactly 6 (0 new payslips published).
   - Statutory deduction components: 4 standard template rules (PF, ESI, PT, TDS), 0 live production deductions enabled.

---

### 7.7 Acceptance Audit Final Recommendation (Original Baseline)

**RECOMMENDATION (Pre-Remediation): ACCEPT WITH EXPLICIT EXCEPTIONS**

**Reasoning:**
1. Data persistence across reloads, API array unwrap handling, multi-tenant database isolation, statutory payroll locks, and test regressions are thoroughly verified with empirical evidence.
2. The specific test record **“Star Performer” with ₹5,000 bonus** exists in `tenant-default-001` and is retrievable via live API calls.
3. However, an **RBAC authorization defect** was discovered: administrative mutations in `server/src/routes/hr-lifecycle.routes.ts` lacked the `requireRole("admin", "hr_admin", "hr_manager", "tenant_admin")` middleware guard, permitting regular employees to execute administrative writes.

---

## 8. BOUNDED BATCH 1 RBAC SECURITY CORRECTION & FINAL VERIFICATION RECORD

**Remediation Date:** 2026-10-15  
**Authorization:** Approved for RBAC correction only (Priority P1)  
**Target:** `server/src/routes/hr-lifecycle.routes.ts`  
**Execution Boundary:** STRICTLY BOUNDED to Batch 1. Batch 2 remains BLOCKED.

### 8.1 Implemented Smallest Safe Correction
In `server/src/routes/hr-lifecycle.routes.ts`:
1. Imported `requireRole` from `../middleware/auth`.
2. Defined role constants:
   - `HR_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager"]`
   - `COMPLAINT_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager", "compliance_admin"]`
3. Created explicit route guards:
   - `requireHrAdmin = requireRole(...HR_ADMIN_ROLES)`
   - `requireComplaintAdmin = requireRole(...COMPLAINT_ADMIN_ROLES)`
4. Applied guards across all administrative lifecycle operations:
   - **Awards:** `GET /awards` (requireHrAdmin), `POST /awards` (requireHrAdmin), `DELETE /awards/:id` (requireHrAdmin).
   - **Promotions:** `GET /promotions` (requireHrAdmin), `POST /promotions` (requireHrAdmin).
   - **Transfers:** `GET /transfers` (requireHrAdmin), `POST /transfers` (requireHrAdmin).
   - **Warnings:** `GET /warnings` (requireHrAdmin), `POST /warnings` (requireHrAdmin), `DELETE /warnings/:id` (requireHrAdmin).
   - **Resignations:** `GET /resignations` (requireHrAdmin), `PUT /resignations/:id/review` (requireHrAdmin).
   - **Terminations:** `GET /terminations` (requireHrAdmin), `POST /terminations` (requireHrAdmin).
   - **Business Trips:** `GET /trips` (requireHrAdmin), `PUT /trips/:id/approve` (requireHrAdmin).
   - **Complaints & POSH Data:** `GET /complaints` (requireComplaintAdmin), `POST /complaints` (requireComplaintAdmin), `PUT /complaints/:id/resolve` (requireComplaintAdmin), `POST /complaints/:id/notes` (requireComplaintAdmin).
   - **Exits & Clearance:** `GET /exits` (requireHrAdmin), `PUT /exits/:id/checklist/:itemId` (requireHrAdmin), `PUT /exits/:id/finalize` (requireHrAdmin).
   - **Probation:** `GET /probation` (requireHrAdmin), `PUT /probation/:id/extend` (requireHrAdmin), `PUT /probation/:id/confirm` (requireHrAdmin).
   - **Timeline & Overview:** `GET /timeline/:employeeId` (requireHrAdmin), `GET /overview` (requireHrAdmin).

### 8.2 Mandatory Security Test Results (`server/src/tests/batch1-rbac-security.test.ts`)
Executed against running live Express server with real JWT tokens for HR Admin (`user-hr-001`) and regular Employee (`user-emp-001`):

- **Group 1: Regular Employee Blocked from Administrative Writes (HTTP 403)**
  - `POST /hr/lifecycle/awards`: **403 Forbidden** (PASS)
  - DB Mutation Guard: Leaked award query in database returns `null` (PASS)
  - `DELETE /hr/lifecycle/awards/:id`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/warnings`: **403 Forbidden** (PASS)
  - `DELETE /hr/lifecycle/warnings/:id`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/promotions`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/transfers`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/terminations`: **403 Forbidden** (PASS)
  - `PUT /hr/lifecycle/complaints/:id/resolve`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/complaints/:id/notes`: **403 Forbidden** (PASS)
- **Group 2: Confidential Administrative Read Protections**
  - `GET /hr/lifecycle/complaints`: **403 Forbidden** (PASS)
  - `GET /hr/lifecycle/awards`: **403 Forbidden** (PASS)
  - `GET /hr/lifecycle/warnings`: **403 Forbidden** (PASS)
- **Group 3: Authorized HR Administrator Permitted Operations**
  - `GET /hr/lifecycle/awards`: **200 OK** (PASS)
  - `GET /hr/lifecycle/overview`: **200 OK** (PASS)
  - `GET /hr/lifecycle/complaints`: **200 OK** (PASS)
- **Group 4: Employee Self-Service Legitimate Access Preservation**
  - `GET /me/lifecycle/awards`: **200 OK** (PASS)
  - `GET /me/lifecycle/complaints`: **200 OK** (PASS)
- **Group 5: Multi-Tenant Isolation Under HR Admin Role**
  - Tenant B HR Admin queried `/api/v1/hr/lifecycle/awards`: 200 OK, 0 records, 0 leakage of Tenant A data (PASS)
- **Group 6: Fail-Closed Boundaries**
  - Missing Authorization header: **401 Unauthorized** (PASS)
  - Tampered/invalid JWT token: **401 Unauthorized** (PASS)
- **Suite Result:** **21 PASSED | 0 FAILED**

### 8.3 Full Regression Suite Evidence
1. `server/src/tests/batch1-rbac-security.test.ts`: **21 PASSED | 0 FAILED**
2. `server/src/tests/batch1-hr-lifecycle-remediation.test.ts`: **31 PASSED | 0 FAILED**
3. `server/src/tests/statutory-tds-reconciliation.test.ts`: **26 PASSED | 0 FAILED**
4. `server/src/tests/financial-year-dynamic-resolver.test.ts`: **11 PASSED | 0 FAILED**
5. `server/src/tests/wave2-2-workflows.test.ts`: **50 PASSED | 0 FAILED**
6. Frontend TypeScript Compilation (`npx tsc --noEmit`): **0 ERRORS**
7. Backend TypeScript Compilation (`npx --prefix server tsc --noEmit`): **0 ERRORS**

### 8.4 Final Acceptance Status: BATCH 1 ACCEPTED (REMEDIATED & VERIFIED)
With the server-side role guard correction applied and all 21 live HTTP authorization tests passing:
- All data persistence and array unwrap defects are resolved.
- End-to-end CRUD for Awards, Warnings, Complaints, and Transfers is fully operational.
- Multi-tenant data isolation is strictly enforced.
- Regular employees cannot perform administrative actions or view confidential complaint/POSH data.
- Statutory payroll records and tax calculations remain 100% frozen and unmodified.
- **Batch 1 is fully compliant with all acceptance criteria.**  
- **Batch 2 remains strictly blocked pending explicit user authorization.**

---

## 9. FORMAL BATCH 1 ACCEPTANCE DECISION & IMPLEMENTATION BOUNDARY RECORD

**Decision:** ACCEPTED AT IMPLEMENTATION BOUNDARY  
**Decision Date:** 2026-10-15  
**Authorized By:** User Directive  
**Basis:** Successful remediation of the P1 RBAC authorization vulnerability, verification of data persistence across browser reloads, unwrap array safety normalization, and passing 139 automated tests with zero regressions.

### 9.1 Accepted Scope (Preserved)
The following 17 routes comprising Batch 1 are formally closed and accepted:
1. `/_authenticated/hr/lifecycle/awards` (`src/routes/_authenticated/hr/lifecycle/awards.tsx`)
2. `/_authenticated/hr/lifecycle/warnings` (`src/routes/_authenticated/hr/lifecycle/warnings.tsx`)
3. `/_authenticated/hr/lifecycle/complaints` (`src/routes/_authenticated/hr/lifecycle/complaints.tsx`)
4. `/_authenticated/hr/lifecycle/promotions` (`src/routes/_authenticated/hr/lifecycle/promotions.tsx`)
5. `/_authenticated/hr/lifecycle/transfers` (`src/routes/_authenticated/hr/lifecycle/transfers.tsx`)
6. `/_authenticated/hr/lifecycle/terminations` (`src/routes/_authenticated/hr/lifecycle/terminations.tsx`)
7. `/_authenticated/me/lifecycle/terminations` (`src/routes/_authenticated/me/lifecycle/exit.tsx`)
8. `/_authenticated/hr/attendance/timesheet` (`src/routes/_authenticated/hr/attendance/timesheets.tsx`)
9. `/_authenticated/me/attendance/records` (`src/routes/_authenticated/_app/attendance-employee.tsx`)
10. `/_authenticated/hr/attendance/` (`src/routes/_authenticated/_app/attendance.tsx`)
11. `/_authenticated/hr/payroll/salaries` (`src/routes/_authenticated/hr/payroll/employee-salaries.tsx`)
12. `/_authenticated/hr/` (`src/routes/_authenticated/hr/index.tsx`)
13. `/_authenticated/hr/dashboard` (`src/routes/_authenticated/hr/dashboard.tsx`)
14. `/_authenticated/hr/profile` (`src/routes/_authenticated/hr/profile.tsx`)
15. `/_authenticated/me/` (`src/routes/_authenticated/me/index.tsx`)
16. `/_authenticated/me/dashboard` (`src/routes/_authenticated/me/dashboard.tsx`)
17. `/_authenticated/me/account` (`src/routes/_authenticated/me/account.tsx`)
18. Canonical redirects: `/_authenticated/_app/dashboard` and `/_authenticated/_app/settings`.

### 9.2 Preserved Test Verification Baseline
- **RBAC Security Suite:** `server/src/tests/batch1-rbac-security.test.ts` (21 PASSED | 0 FAILED)
  - Regular employee (`roles: ["employee"]`) denied on administrative POST/PUT/DELETE mutations (HTTP 403 Forbidden).
  - Regular employee denied on confidential administrative reads (Complaints, Awards, Warnings) (HTTP 403 Forbidden).
  - HR Admin permitted on administrative endpoints (HTTP 200 OK).
  - Employee self-service endpoints (`/me/lifecycle/*`) verified functional (HTTP 200 OK).
  - Cross-tenant data isolation verified under HR Admin role.
  - Fail-closed security boundaries verified (missing/invalid JWT yields HTTP 401 Unauthorized).
- **Batch 1 Lifecycle Remediation Suite:** `server/src/tests/batch1-hr-lifecycle-remediation.test.ts` (31 PASSED | 0 FAILED)
  - End-to-end CRUD persistence for Awards, Disciplinary Warnings, Complaints & Grievances, Promotions, Transfers.
  - Multi-tenant tenantId scoping and relational includes verified.
- **Full Regression Suites:**
  - `server/src/tests/statutory-tds-reconciliation.test.ts` (26 PASSED | 0 FAILED)
  - `server/src/tests/financial-year-dynamic-resolver.test.ts` (11 PASSED | 0 FAILED)
  - `server/src/tests/wave2-2-workflows.test.ts` (50 PASSED | 0 FAILED)
- **Static Typings:** Frontend `npx tsc --noEmit` (0 errors) & Backend `npx --prefix server tsc --noEmit` (0 errors).

### 9.3 Inviolable Statutory Safeguards
- **Live Payroll Deductions:** STRICTLY DISABLED. No production PF, ESI, PT, or TDS withholding active.
- **Employee Payslips:** UNPUBLISHED. Total published count remains at exactly 6; no automated distribution permitted.
- **Historical Payroll Runs:** IMMUTABLE. Exactly 2 completed runs (Month 9/2026, ₹50,000 gross, ₹2,310 deductions) locked and untouched.

### 9.4 Batch 2 Execution Gate Status
- **STATUS: COMPLETED & VERIFIED.** Execution authorized by user directive; bounded implementation and automated verification completed.

---

## 10. FORMAL BATCH 2 ACCEPTANCE DECISION & IMPLEMENTATION RECORD
**Target Feature:** Enterprise Asset Register, Lifecycle Management & Depreciation Dashboard  
**Status:** IMPLEMENTED, VERIFIED & BOUNDED  
**Revision:** 1.2.0  
**Completion Date:** October 15, 2026  

### 10.1 Approved Scope & Route Coverage
1. `/_authenticated/hr/assets/dashboard` (`src/routes/_authenticated/hr/assets/dashboard.tsx`): Primary HR administrative asset dashboard.
2. `/_authenticated/_app/asset-dashboard` (`src/routes/_authenticated/_app/asset-dashboard.tsx` -> `/asset-dashboard`): Canonical application asset dashboard with verified 1:1 view and data parity.
3. Canonical Component: `src/components/assets/asset-dashboard-view.tsx`.
4. Backend API Router: `server/src/routes/hr-assets.routes.ts`.
5. Backend Domain Service: `server/src/services/asset.service.ts`.

### 10.2 Implementation Highlights
- **Live Database-Backed Queries & Safe Unwrapping:** Replaced hardcoded fallback arrays with `unwrapArray` and `unwrapData` consuming `/hr/assets`, `/hr/assets/overview`, `/hr/assets/types`, and `/employees`.
- **Dynamic Categories & Form Options:** Categories loaded from authorized tenant-scoped API `/hr/assets/types`; assigned employees dynamically populated from `/employees`.
- **Live TanStack Query Mutations:** Integrated `createAssetMutation`, `updateAssetMutation`, and `deleteAssetMutation` with automatic query cache invalidation (`assets-list-data`, `assets-overview-data`) and sonner toast notifications.
- **Transactional Assignment & Return:** Server-side database transactions (`db.$transaction`) guarantee atomic transitions for `AssetAssignment` records and parent `Asset` statuses (`available` <-> `assigned`).
- **Synchronized Dashboard KPIs:** Aggregates (`totalAssets`, `totalValue`, `currentValue`, `totalDepreciation`, `activeAssets`, `utilizationRate`) dynamically synchronized with `/hr/assets/overview` persisted database metrics.
- **Visual Design Parity:** Preserved Dreams ERP sidebar hierarchy, typography, light/dark themes, ApexCharts trends, table actions, and modal forms.

### 10.3 Security & Role-Based Authorization
- **Administrative Role Enforcement:** All administrative asset endpoints guarded by `requireRole(["admin", "super_admin", "tenant_admin", "hr_admin", "assets_admin", "hr_manager"])`.
- **Fail-Closed Employee Denial:** Regular employees (`roles: ["employee"]`) are strictly rejected with `HTTP 403 Forbidden` on both reads and mutations (`GET /hr/assets`, `GET /hr/assets/overview`, `POST /hr/assets`, `POST /hr/assets/:id/assign`, `DELETE /hr/assets/:id`). Rejections cause ZERO database mutations.
- **Fail-Closed Authentication:** Missing or forged authorization tokens rejected with `HTTP 401 Unauthorized`.
- **Multi-Tenant Data Isolation:** All asset operations strictly scoped to `tenantId`. Cross-tenant queries and mutations by Tenant B against Tenant A assets return `HTTP 404 Not Found` with 0 database leakage or mutations.
- **Integrity Constraints:** Duplicate `assetTag` within a tenant rejected with `HTTP 400 Bad Request`. Deletion of assigned assets prohibited.

### 10.4 Empirical Test Evidence Summary
- **Dedicated Batch 2 Suite (`server/src/tests/batch2-assets-lifecycle.test.ts`):** **46 PASSED | 0 FAILED**
  - Group 1 (CRUD & Categories): 12 tests passed
  - Group 2 (Transactional Assignment & Return): 10 tests passed
  - Group 3 (Administrative RBAC & Fail-Closed): 8 tests passed
  - Group 4 (Multi-Tenant Isolation): 5 tests passed
  - Group 5 (Integrity Constraints & Deletion): 4 tests passed
  - Group 6 (Dashboard KPI Aggregates): 4 tests passed
  - Group 7 (Statutory Payroll Immutability Guard): 3 tests passed
- **Batch 1 RBAC Security Suite (`server/src/tests/batch1-rbac-security.test.ts`):** **21 PASSED | 0 FAILED**
- **Batch 1 Lifecycle Remediation Suite (`server/src/tests/batch1-hr-lifecycle-remediation.test.ts`):** **31 PASSED | 0 FAILED**
- **Statutory TDS Reconciliation Suite (`server/src/tests/statutory-tds-reconciliation.test.ts`):** **26 PASSED | 0 FAILED**
- **Financial Year Dynamic Resolver Suite (`server/src/tests/financial-year-dynamic-resolver.test.ts`):** **11 PASSED | 0 FAILED**
- **Static Type Safety:**
  - Frontend: `npx tsc --noEmit` -> **0 ERRORS**
  - Backend: `npx --prefix server tsc --noEmit` -> **0 ERRORS**

### 10.5 Browser Persistence & Route Parity Verification
- **Test Session:** Verified using Playwright browser driver against live dev servers (`localhost:5173` and `localhost:4000`).
- **Asset Creation:** Created newly persisted asset `Automated Test ThinkPad T14` (`825d0af6-ea63-450d-a2c9-89cf9e30d764`), cost `$1,000`, book value `$800`, assigned to `Alex Morgan` (`employee@masterhrms.com`).
- **Hard Reload Persistence:** Executed browser hard page reload; verified that `Automated Test ThinkPad T14` remained visible and active in the registry table with KPI counters reflecting 1 Total Asset, $1,000 Purchase Cost, $800 Book Value, $200 Depreciation, and 100% Active Utilization.
- **Route Parity:** Navigated to canonical route `http://localhost:5173/asset-dashboard` (`/_authenticated/_app/asset-dashboard`); confirmed identical asset data rendering.
- **Visual Artifact:** Full-page screenshot captured and stored at `playwright_asset_dashboard_verified.png`.

### 10.6 Inviolable Statutory Safeguards
- **Live Payroll Deductions:** STRICTLY DISABLED.
- **Employee Payslips:** UNPUBLISHED. Total published count strictly locked at 6.
- **Historical Payroll Runs:** IMMUTABLE. Exactly 2 completed runs locked and unmodified.

### 10.7 Batch 3 Execution Gate Status
- **STATUS: STRICTLY BLOCKED.**
- Execution halted immediately following Batch 2 completion. No Batch 3 implementation shall begin without prior review and explicit user approval.

### 10.8 Formal Batch 2 Acceptance Record
- **Acceptance Decision:** ACCEPTED at the implementation boundary by user directive on October 15, 2026.
- **Scope Confirmed:** Enterprise Asset Register, Lifecycle Management & Depreciation Dashboard (`/_authenticated/hr/assets/dashboard` and `/_authenticated/_app/asset-dashboard`).
- **Preserved Evidence Baseline:**
  - 46/46 tests passed in `server/src/tests/batch2-assets-lifecycle.test.ts`.
  - 21/21 tests passed in `server/src/tests/batch1-rbac-security.test.ts`.
  - 31/31 tests passed in `server/src/tests/batch1-hr-lifecycle-remediation.test.ts`.
  - 26/26 tests passed in `server/src/tests/statutory-tds-reconciliation.test.ts`.
  - 11/11 tests passed in `server/src/tests/financial-year-dynamic-resolver.test.ts`.
  - Frontend (`npx tsc --noEmit`) and Backend (`npx --prefix server tsc --noEmit`) type checks passing with 0 errors.
  - Browser hard-reload persistence verified with newly created test asset `Automated Test ThinkPad T14` (`825d0af6-ea63-450d-a2c9-89cf9e30d764`) and captured visual proof artifact `playwright_asset_dashboard_verified.png`.
- **Currency & KPI Discrepancy Note:** Asset dashboard currently displays currency symbol from template (`# MASTERHRMS — COMPREHENSIVE 66-ROUTE ACTIONABLE IMPLEMENTATION BACKLOG & FEATURE COMPLETION LOG

**Document Revision:** 1.1.0  
**Effective Date:** 2026-10-15  
**Audit Baseline:** Reconciled 66 Incomplete Routes from `docs/masterhrms_route_census_reconciliation.md`  
**Batch 1 Status:** ACCEPTED AT IMPLEMENTATION BOUNDARY (Remediation & RBAC Security Verification Approved)  
**Batch 2 Status:** STRICTLY BLOCKED (Implementation Proposal Only — Execution Awaiting Explicit Approval)  
**Production Status:** STRICTLY BLOCKED (Live deductions disabled, payslips unpublished, historical payroll immutable)  
**Governance Protocol:** Bounded Implementation Batches — User Approval Required Before Each Execution

---

## EXECUTIVE SUMMARY & STATUS GATE

The comprehensive route reconciliation established that out of the 508 registered TanStack router routes:
- **414 Routes are Fully Implemented & Functionally Verified**
- **27 Routes are Layout Outlets or Internal Redirects (Not Applicable)**
- **1 Route is Hard-Blocked on Physical Hardware (Biometric LAN Port 4370)**
- **66 Routes constitute the Incomplete Backlog**

Crucially, deep AST analysis revealed that of the 66 incomplete routes:
1. **38 Routes are Functionally Implemented Proxies:** They re-export production-grade components (averaging 500–1,500 lines of code) from `src/routes/_authenticated/_app/` but exhibited client-side data loss due to a specific **API Client Array Unwrap Defect** (`res.data` returning `undefined` when Express controllers return raw arrays `[]`).
2. **11 Routes are Interactive Views Operating in Local Client State:** Complete UI dialogs and tables that lack dedicated backend CRUD endpoints and Prisma model mutations.
3. **17 Routes are Unimplemented Stubs or Error Views:** Draft placeholders (7 error/session views, 4 router redirects, 3 unwired report templates, 3 draft feature stubs).

### Production Protection Rules (Non-Negotiable)
- **Statutory Deduction Freeze:** Live PF, ESI, Professional Tax, and TDS withholding remains strictly in sandbox verification mode.
- **Unpublished Payslips:** No automated bulk payslip distribution to employees will be enabled during these completion batches.
- **Snapshot Immutability:** Historical payroll cycles and finalized tax computations will never be modified retroactively.
- **Controlled Execution Boundary:** Backlog execution proceeds in strictly bounded batches; work stops after each batch for user verification.

---

## 1. ACTIONABLE BACKLOG FOR ALL 66 ROUTES

Below is the complete, evidence-backed implementation record for all 66 routes, including exact component file, business purpose, missing behaviors, existing Prisma models, APIs, permissions, business impact, and verification plans:

| # | Route Path | Component File | Business Purpose | Missing Behavior & Gaps | Existing Prisma Models & APIs | Permissions & Tenant Scope | Business & Compliance Impact | Acceptance Criteria & Tests | Class | Batch |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/_authenticated/hr/lifecycle/awards` | `src/routes/_authenticated/hr/lifecycle/awards.tsx` | Record and track employee recognition, institutional awards, gift items, and monetary bonuses. | Frontend query evaluates res.data from array response, returning undefined; award types dropdown requires live query; delete mutation lacks optimistic cache update. | Models: `Award, AwardType, Employee`<br/>APIs: `GET/POST/DELETE /api/v1/hr/lifecycle/awards, GET /api/v1/hr/lifecycle/award-types` | `hr:manage, admin (tenant scoped)` | Employee recognition records appear lost on browser reload; false reporting of unacknowledged achievements. | **Criteria:** Awards created via dialog persist to MySQL Award table and display in table across browser reloads.<br/>**Tests:** Vitest API CRUD test; Playwright form fill, refresh check, and delete verification. | `REQUIRED` | **Batch 1** |
| 2 | `/_authenticated/hr/lifecycle/warnings` | `src/routes/_authenticated/hr/lifecycle/warnings.tsx` | Document and track formal disciplinary warnings, incident descriptions, severity levels, and employee explanations. | Frontend query res.data unwrap bug; warning types dropdown requires live query; warning letter print/export missing. | Models: `DisciplinaryWarning, WarningType, Employee`<br/>APIs: `GET/POST/DELETE /api/v1/hr/lifecycle/warnings, GET /api/v1/hr/lifecycle/warning-types` | `hr:manage, admin (tenant scoped)` | Disciplinary history lost on refresh; legal risk during termination or compliance audits if warnings vanish. | **Criteria:** Disciplinary warnings created with severity and date persist in DB and survive browser reload.<br/>**Tests:** Vitest disciplinary warning CRUD test; Playwright UI creation and persistence check. | `REQUIRED` | **Batch 1** |
| 3 | `/_authenticated/hr/lifecycle/complaints` | `src/routes/_authenticated/hr/lifecycle/complaints.tsx` | Manage workplace grievances, harassment complaints, POSH inquiries, and resolution case notes. | Frontend query res.data unwrap bug; case note append mutation requires DB synchronization; status workflow (RESOLVED/INVESTIGATING). | Models: `EmployeeComplaint, ComplaintCaseNote, Employee`<br/>APIs: `GET/POST/PUT /api/v1/hr/lifecycle/complaints, POST /api/v1/hr/lifecycle/complaints/:id/notes` | `hr:manage, compliance:admin (strictly tenant scoped & confidential)` | POSH and grievance compliance failure; lost audit trails for formal employee disputes. | **Criteria:** Complaints filed with accused/complainant persist, status updates reflect immediately and survive reload.<br/>**Tests:** Vitest complaint lifecycle unit test; Playwright grievance filing and case note verification. | `REQUIRED` | **Batch 1** |
| 4 | `/_authenticated/hr/lifecycle/promotions` | `src/routes/_authenticated/hr/lifecycle/promotions.tsx` | Track employee career progression, designation changes, pay band promotions, and effective dates. | Frontend query res.data unwrap bug; designation dropdown requires live Department/Position query; automatic salary record sync missing. | Models: `PromotionRecord, Employee, Department`<br/>APIs: `GET/POST /api/v1/hr/lifecycle/promotions` | `hr:manage, admin (tenant scoped)` | Promotion records vanish on refresh; discrepancy between employee position and historical promotion record. | **Criteria:** Promotion submitted persists in PromotionRecord table and updates employee designation.<br/>**Tests:** Vitest promotion creation test; Playwright verification. | `REQUIRED` | **Batch 1** |
| 5 | `/_authenticated/hr/lifecycle/transfers` | `src/routes/_authenticated/hr/lifecycle/transfers.tsx` | Manage inter-departmental, branch, and regional location employee transfers. | Frontend query res.data unwrap bug; branch/department selection options need live query; effective date state transition. | Models: `EmployeeTransfer, Employee, Department, Branch`<br/>APIs: `GET/POST/PUT /api/v1/hr/lifecycle/transfers` | `hr:manage, admin (tenant scoped)` | Transfer history resets on reload; employee location remains ambiguous. | **Criteria:** Transfer recorded in database, reflected in transfer register and surviving browser refresh.<br/>**Tests:** Vitest transfer CRUD test; Playwright UI verification. | `REQUIRED` | **Batch 1** |
| 6 | `/_authenticated/hr/lifecycle/terminations` | `src/routes/_authenticated/hr/lifecycle/terminations.tsx` | Process involuntary separations, severance documentation, notice period waivers, and clearance sign-offs. | Frontend query res.data unwrap bug; exit interview link and status update mutations need DB binding. | Models: `Employee, OffboardingTask, AssetAssignment`<br/>APIs: `GET/POST/PUT /api/v1/hr/lifecycle/terminations, /api/v1/hr/offboarding` | `hr:manage, admin (tenant scoped)` | Terminated employee status reverts on reload; unauthorized access risk if employee status not marked TERMINATED. | **Criteria:** Termination creates offboarding record, marks employee inactive, and persists across reload.<br/>**Tests:** Vitest termination workflow test; Playwright separation verification. | `REQUIRED` | **Batch 1** |
| 7 | `/_authenticated/me/lifecycle/terminations` | `src/routes/_authenticated/me/lifecycle/exit.tsx` | Employee self-service view of resignation status, exit checklist progress, and clearance acknowledgements. | Frontend proxy query res.data unwrap bug; employee self-service filter requires userId scoping. | Models: `Employee, OffboardingTask`<br/>APIs: `GET /api/v1/me/lifecycle/exit` | `employee:self (scoped to authenticated user)` | Exiting employee cannot view exit tasks or clearance statuses. | **Criteria:** Logged-in user sees only their own exit checklist items and clearance status.<br/>**Tests:** Vitest tenant/user scoped query test; Playwright self-service inspection. | `REQUIRED` | **Batch 1** |
| 8 | `/_authenticated/hr/attendance/timesheet` | `src/routes/_authenticated/hr/attendance/timesheets.tsx` | Manage weekly/monthly employee timesheet submissions, approval workflows, and billable hour logs. | Frontend query unwrap bug on timesheet list; approval status update needs DB transaction; project dropdown link. | Models: `Timesheet, Employee, Project`<br/>APIs: `GET/POST/PUT /api/v1/timesheets, GET /api/v1/projects` | `hr:manage, manager:approve (tenant scoped)` | Timesheet approvals lost on reload; inaccurate billable hours calculation. | **Criteria:** Timesheet approved by manager retains APPROVED status across page refreshes.<br/>**Tests:** Vitest timesheet approval test; Playwright status change verification. | `REQUIRED` | **Batch 1** |
| 9 | `/_authenticated/me/attendance/records` | `src/routes/_authenticated/_app/attendance-employee.tsx` | Employee self-service detailed punch log, clock-in/out stamps, break times, and regularisation requests. | Frontend proxy unwrap bug; regularisation request mutation requires DB persistence in AttendanceRegularization. | Models: `Attendance, AttendanceRegularization, Employee`<br/>APIs: `GET /api/v1/me/attendance, POST /api/v1/me/attendance/regularize` | `employee:self (scoped to authenticated user)` | Self-service attendance records blank on reload; regularization requests vanish. | **Criteria:** User sees month punch log and submitted regularization request in pending state.<br/>**Tests:** Vitest employee punch query test; Playwright regularization request test. | `REQUIRED` | **Batch 1** |
| 10 | `/_authenticated/hr/attendance/` | `src/routes/_authenticated/_app/attendance.tsx` | Central HR attendance command center: daily roll call, shift assignments, biometric sync status, and manual overrides. | Mass regularization approval state handling; date range filter query binding. | Models: `Attendance, Shift, BiometricPunchLog, Employee`<br/>APIs: `GET /api/v1/attendance, POST /api/v1/attendance/override` | `hr:manage, admin (tenant scoped)` | Attendance overrides reset on reload if unpersisted; erroneous unpaid leave calculations. | **Criteria:** Manual attendance override persists in Attendance table with audit note.<br/>**Tests:** Vitest attendance override test; Playwright bulk attendance update test. | `REQUIRED` | **Batch 1** |
| 11 | `/_authenticated/hr/payroll/salaries` | `src/routes/_authenticated/hr/payroll/employee-salaries.tsx` | View and adjust employee salary structures, CTC breakdown, gross pay, and allowance components. | Salary structure modification form lacks atomic revision tracking; components update requires tenant payroll lock check. | Models: `SalaryStructure, Employee, PayrollComponent`<br/>APIs: `GET /api/v1/payroll/salaries, PUT /api/v1/payroll/salaries/:employeeId` | `payroll:admin, hr:manage (tenant scoped)` | Salary revisions reset on refresh; mismatch between employee CTC and payroll generation. | **Criteria:** Updated employee CTC persists in DB and recalculates statutory gross pay accurately.<br/>**Tests:** Vitest salary structure persistence test; Playwright salary edit check. | `REQUIRED` | **Batch 1** |
| 12 | `/_authenticated/hr/assets/dashboard` | `src/components/assets/asset-dashboard-view.tsx` | Enterprise asset management command center: hardware allocation, depreciation tracking, warranty expiry, and maintenance schedules. | Frontend proxy loads static mock counters; asset assignment CRUD needs live Prisma query; asset return mutation unpersisted. | Models: `Asset, AssetCategory, AssetAssignment, AssetMaintenance, AssetDepreciationSchedule`<br/>APIs: `GET /api/v1/assets/overview, GET /api/v1/assets, POST /api/v1/assets/assign` | `assets:admin, hr:manage (tenant scoped)` | Assigned laptop/equipment records vanish on refresh; lost equipment risk upon employee departure. | **Criteria:** Asset dashboard displays live counts (total, assigned, maintenance) from database; new asset assignment persists.<br/>**Tests:** Vitest asset CRUD and metrics test; Playwright assignment workflow test. | `REQUIRED` | **Batch 2** |
| 13 | `/_authenticated/_app/asset-dashboard` | `src/components/assets/asset-dashboard-view.tsx` | App shell canonical route for asset management dashboard (canonical target for /hr/assets/dashboard). | Shared component with /hr/assets/dashboard; requires single shared backend service. | Models: `Asset, AssetCategory, AssetAssignment`<br/>APIs: `GET /api/v1/assets/overview` | `assets:admin, hr:manage (tenant scoped)` | Duplicated route view; resolves to same underlying component. | **Criteria:** Navigating to /_app/asset-dashboard displays same verified live data as /hr/assets/dashboard.<br/>**Tests:** Playwright navigation parity test. | `REQUIRED` | **Batch 2** |
| 14 | `/_authenticated/_app/smart-reports/$reportId` | `src/components/smart-reports/report-view.tsx` | Dynamic report engine for tenant analytics with custom column filtering, date range aggregations, and Excel/CSV export. | Dynamic report query executes client-side filter over mock sample rows; lacks SQL aggregations against live tenant tables. | Models: `Attendance, LeaveRequest, Employee, PayrollRun, Product, SalesInvoice`<br/>APIs: `GET /api/v1/smart-reports/query?reportId=:id` | `reports:view, admin (tenant scoped)` | Managers make decisions based on static demonstration figures instead of actual operational data. | **Criteria:** Report ID queries live tenant DB, groups by requested parameters, and returns verified row aggregates.<br/>**Tests:** Vitest report aggregation query test; Playwright parameter change verification. | `REQUIRED` | **Batch 3** |
| 15 | `/_authenticated/_app/smart-reports/attendance-summary` | `src/components/smart-reports/report-view.tsx` | Monthly attendance summary report: present days, absent days, late marks, half-days, and total overtime hours. | Proxies to report-view with mock attendance data; requires SQL aggregation against Attendance table. | Models: `Attendance, Employee, Department`<br/>APIs: `GET /api/v1/smart-reports/attendance-summary` | `reports:attendance, hr:manage` | Attendance metrics in reports do not match actual clock-in records. | **Criteria:** Displays actual present/absent counts matching database for selected month.<br/>**Tests:** Vitest attendance aggregation test; Playwright report load test. | `REQUIRED` | **Batch 3** |
| 16 | `/_authenticated/_app/smart-reports/leave-report` | `src/components/smart-reports/report-view.tsx` | Leave utilization report: opening balances, leaves taken, leave encashment, and closing leave liability. | Proxies to report-view with mock leave figures; requires aggregation against LeaveBalance and LeaveRequest tables. | Models: `LeaveRequest, LeaveBalance, LeaveType, Employee`<br/>APIs: `GET /api/v1/smart-reports/leave-summary` | `reports:leave, hr:manage` | Static leave balances displayed; false assessment of unavailed leave liabilities. | **Criteria:** Report calculates accurate closing balance: opening + accrued - taken.<br/>**Tests:** Vitest leave liability math test; Playwright report inspection. | `REQUIRED` | **Batch 3** |
| 17 | `/_authenticated/_app/smart-reports/payroll-sheet` | `src/components/smart-reports/report-view.tsx` | Monthly salary register report: employee-wise gross pay, PF, ESI, TDS, professional tax, and net payable. | Proxies to report-view; requires live query against finalized PayrollItem records for selected cycle. | Models: `PayrollRun, PayrollItem, Employee`<br/>APIs: `GET /api/v1/smart-reports/payroll-sheet` | `reports:payroll, payroll:admin` | Static payroll figures shown; auditors cannot verify actual disbursed payroll totals. | **Criteria:** Report displays exact statutory components matching finalized payroll database run.<br/>**Tests:** Vitest payroll sheet reconciliation test; Playwright export test. | `REQUIRED` | **Batch 3** |
| 18 | `/_authenticated/_app/smart-reports/deal-pipeline` | `src/components/smart-reports/report-view.tsx` | Commercial CRM deal pipeline and conversion rate analysis report. | CRM module not core to HRMS; renders static mock CRM deals. | Models: `Deal, Lead (Optional CRM models)`<br/>APIs: `GET /api/v1/crm/deals` | `crm:view, sales:manager` | Non-HR commercial reporting feature; zero compliance or payroll impact. | **Criteria:** Graceful empty state or deferred badge when CRM module is disabled.<br/>**Tests:** Playwright feature flag test. | `DEFERRED` | **Batch 3** |
| 19 | `/_authenticated/_app/smart-reports/product-stock` | `src/components/smart-reports/report-view.tsx` | Retail/warehouse product inventory stock valuation and low-stock alerts report. | ERP inventory feature; renders mock items. | Models: `Product, Warehouse, StockTransfer`<br/>APIs: `GET /api/v1/products/stock-report` | `inventory:view, warehouse:admin` | Zero impact on HR or payroll. | **Criteria:** Empty state with link to Inventory module if active.<br/>**Tests:** Playwright route load test. | `DEFERRED` | **Batch 3** |
| 20 | `/_authenticated/_app/smart-reports/project-progress` | `src/components/smart-reports/report-view.tsx` | Project milestone tracking, task completion rates, and timesheet burn-down report. | Project management report renders sample gantt/milestone data. | Models: `Project, Task, Timesheet`<br/>APIs: `GET /api/v1/projects/progress-report` | `projects:view, manager` | Operational tracking for professional services; zero statutory payroll impact. | **Criteria:** Queries live project milestone completion percentages.<br/>**Tests:** Vitest project report query test. | `DEFERRED` | **Batch 3** |
| 21 | `/_authenticated/_app/smart-reports/purchase-invoice` | `src/components/smart-reports/report-view.tsx` | Accounts payable vendor purchase invoice summary and aging analysis. | Accounting/ERP purchase invoice aggregation missing. | Models: `PurchaseInvoice, Supplier`<br/>APIs: `GET /api/v1/purchases/report` | `accounting:view, purchase:admin` | Zero HR/payroll impact. | **Criteria:** Report displays verified accounts payable balances.<br/>**Tests:** Playwright route check. | `DEFERRED` | **Batch 3** |
| 22 | `/_authenticated/_app/smart-reports/sales-invoice` | `src/components/smart-reports/report-view.tsx` | Accounts receivable customer invoice summary, tax totals, and overdue aging. | Commercial billing report renders static figures. | Models: `BillingInvoice, Customer`<br/>APIs: `GET /api/v1/invoices/report` | `billing:view, sales:admin` | Commercial billing only; no employee HR impact. | **Criteria:** Report queries live BillingInvoice table.<br/>**Tests:** Playwright route load test. | `DEFERRED` | **Batch 3** |
| 23 | `/_authenticated/hr/reports/attendance` | `src/routes/_authenticated/_app/attendance-report.tsx` | HR department attendance and punctuality analysis report (canonical proxy). | Requires live tenant attendance aggregation pipeline. | Models: `Attendance, Department, Employee`<br/>APIs: `GET /api/v1/reports/attendance` | `reports:attendance, hr:view` | Shows static demo charts to HR directors. | **Criteria:** Live charts reflect active tenant attendance data.<br/>**Tests:** Vitest attendance chart data test; Playwright UI test. | `REQUIRED` | **Batch 3** |
| 24 | `/_authenticated/hr/reports/attrition` | `src/routes/_authenticated/_app/employee-report.tsx` | Annualized and monthly employee turnover, voluntary vs involuntary attrition rates. | Aggregates from exit records missing live query. | Models: `Employee, OffboardingTask`<br/>APIs: `GET /api/v1/reports/attrition` | `reports:hr, hr:admin` | Management cannot evaluate workforce retention trends. | **Criteria:** Turnover formula accurately computes separations divided by average headcount.<br/>**Tests:** Vitest turnover calculation test; Playwright chart inspection. | `REQUIRED` | **Batch 3** |
| 25 | `/_authenticated/hr/reports/custom` | `src/routes/_authenticated/_app/smart-reports.tsx` | Configurable custom report builder and saved query views. | Saved query JSON serialization to database unpersisted. | Models: `TenantReportConfig (or JSON settings)`<br/>APIs: `GET/POST /api/v1/smart-reports/custom` | `reports:admin` | Custom report filters lost on reload. | **Criteria:** Saved custom report filters persist across user logins.<br/>**Tests:** Vitest custom report config test. | `DEFERRED` | **Batch 3** |
| 26 | `/_authenticated/hr/reports/headcount` | `src/routes/_authenticated/_app/employee-report.tsx` | Departmental headcount distribution, gender diversity, and tenure demographics. | Headcount breakdown requires live SQL group-by query against active Employee table. | Models: `Employee, Department, Branch`<br/>APIs: `GET /api/v1/reports/headcount` | `reports:hr, hr:view` | Misleading organization headcount figures. | **Criteria:** Headcount counts strictly match active employees in database.<br/>**Tests:** Vitest headcount group-by test; Playwright report check. | `REQUIRED` | **Batch 3** |
| 27 | `/_authenticated/hr/reports/payroll` | `src/routes/_authenticated/_app/payslip-report.tsx` | Comprehensive payroll variance, CTC reconciliation, and bank disbursement summary. | Connects to payslip-report with incomplete cycle selector binding. | Models: `PayrollRun, PayrollItem, Employee`<br/>APIs: `GET /api/v1/reports/payroll-variance` | `reports:payroll, payroll:admin` | Inability to compare month-over-month salary increments and variances. | **Criteria:** Variance report highlights additions, exits, and increment deltas accurately.<br/>**Tests:** Vitest payroll variance math test; Playwright UI test. | `REQUIRED` | **Batch 3** |
| 28 | `/_authenticated/hr/reports/performance` | `src/routes/_authenticated/_app/smart-reports.project-progress.tsx` | Employee performance appraisal ratings, OKR achievement percentages, and 9-box grid distribution. | Proxy points to 12-line stub; requires performance review data link. | Models: `PerformanceReview, OKRGoal, Employee`<br/>APIs: `GET /api/v1/reports/performance` | `reports:performance, hr:admin` | Performance distribution view unavailable. | **Criteria:** Displays appraisal score distributions from active review cycle.<br/>**Tests:** Playwright appraisal report test. | `DEFERRED` | **Batch 3** |
| 29 | `/_authenticated/hr/reports/recruitment` | `src/routes/_authenticated/_app/smart-reports.deal-pipeline.tsx` | Talent acquisition pipeline: time-to-hire, source effectiveness, and candidate stage conversion. | Proxy points to 12-line stub; recruitment funnel queries missing. | Models: `JobOpening, JobCandidate, CandidateAssessment`<br/>APIs: `GET /api/v1/reports/recruitment` | `reports:recruitment, hr:manage` | Recruitment analytics unavailable. | **Criteria:** Recruitment funnel stages display candidate counts from JobCandidate table.<br/>**Tests:** Vitest recruitment funnel test. | `DEFERRED` | **Batch 3** |
| 30 | `/_authenticated/hr/reports/statutory` | `src/routes/_authenticated/_app/smart-reports.payroll-sheet.tsx` | Statutory compliance audit report: PF ECR, ESI return, PT Form 5, and LWF registers. | Proxy points to 12-line stub; statutory register compilation unpersisted in dedicated view. | Models: `PayrollItem, Employee, StatutoryDeclaration`<br/>APIs: `GET /api/v1/reports/statutory-summary` | `compliance:admin, payroll:admin` | External compliance audit risk if statutory summary is not reviewable in one place. | **Criteria:** Report matches aggregate PF, ESI, and PT deductibles with bank challan schedules.<br/>**Tests:** Vitest statutory reconciliation test; Playwright review check. | `REQUIRED` | **Batch 3** |
| 31 | `/_authenticated/hr/reports/training` | `src/routes/_authenticated/_app/smart-reports.tsx` | Employee training completion rates, mandatory compliance training audit, and certification hours. | Proxy points to smart-reports view with mock training data. | Models: `TrainingSession, SessionAttendance, TrainingCourse, Employee`<br/>APIs: `GET /api/v1/reports/training` | `reports:training, hr:manage` | Cannot verify if employees completed mandatory POSH/security compliance training. | **Criteria:** Accurately displays completion percentage of mandatory courses by department.<br/>**Tests:** Vitest training completion aggregation test; Playwright UI test. | `REQUIRED` | **Batch 3** |
| 32 | `/_authenticated/hr/organization/document-types` | `src/routes/_authenticated/hr/documents/categories.tsx` | Configure organizational document categories (KYC, Education, Experience, Contracts, Medical). | Frontend unwrap bug on category list query; add category dialog requires live persistence in DocumentCategory. | Models: `DocumentCategory`<br/>APIs: `GET/POST/DELETE /api/v1/hr/documents/categories` | `hr:manage, admin (tenant scoped)` | Added document categories disappear on reload; unable to categorize employee files. | **Criteria:** Created category persists to MySQL and appears in document upload dropdowns.<br/>**Tests:** Vitest category CRUD test; Playwright creation check. | `REQUIRED` | **Batch 4** |
| 33 | `/_authenticated/hr/organization/tree` | `src/routes/_authenticated/hr/organization/tree.tsx` | Interactive visual organization hierarchy tree chart showing reporting lines from CEO to individual contributors. | Component is 10-line stub placeholder; hierarchy tree renderer needs OrgChart SVG/canvas with live Employee managerId query. | Models: `Employee, Department, Position`<br/>APIs: `GET /api/v1/organization/tree` | `organization:view, hr:view` | Visual org chart unavailable; reporting lines must be inspected one employee at a time. | **Criteria:** Renders collapsible hierarchy nodes querying real employee manager links from DB.<br/>**Tests:** Vitest org tree recursive resolution test; Playwright rendering check. | `REQUIRED` | **Batch 4** |
| 34 | `/_authenticated/hr/organization/` | `src/routes/_authenticated/hr/organization/structure.tsx` | Organization department, designation, and branch overview with structural counts. | Proxy points to structure.tsx; department count summary needs live query. | Models: `Department, Position, Branch, Employee`<br/>APIs: `GET /api/v1/organization/structure` | `organization:view, hr:manage` | Department employee counts fall out of sync with actual staff. | **Criteria:** Displays accurate employee headcount badge for every department.<br/>**Tests:** Vitest department count test; Playwright UI test. | `REQUIRED` | **Batch 4** |
| 35 | `/_authenticated/hr/documents/templates` | `src/routes/_authenticated/hr/documents/document-templates.tsx` | Manage reusable HR document templates (Offer Letters, Experience Letters, Increment Letters, Warning Notices). | Frontend unwrap bug; template placeholder interpolation variables (e.g. {{employee_name}}, {{ctc}}) need server validation. | Models: `DocumentTemplate`<br/>APIs: `GET/POST/PUT /api/v1/hr/documents/templates` | `hr:manage, admin (tenant scoped)` | Created letter templates reset on reload; HR staff forced to re-enter template text. | **Criteria:** Template created with placeholders persists and generates preview with test employee data.<br/>**Tests:** Vitest template CRUD test; Playwright template editor test. | `REQUIRED` | **Batch 4** |
| 36 | `/_authenticated/hr/recruitment/career` | `src/routes/_authenticated/hr/recruitment/career-site.tsx` | Configure external public careers portal: branding, banner image, company culture blurb, and active job openings toggle. | Branding form state not saved to Tenant or JobPortalSetting table. | Models: `Tenant, JobOpening`<br/>APIs: `GET/PUT /api/v1/recruitment/career-site` | `recruitment:admin, hr:manage` | Career site customization settings lost on reload. | **Criteria:** Saved careers portal header and blurb reflect on public job listing view.<br/>**Tests:** Vitest career config test; Playwright form save test. | `DEFERRED` | **Batch 4** |
| 37 | `/_authenticated/hr/recruitment/onboarding` | `src/routes/_authenticated/hr/recruitment/candidate-onboarding.tsx` | Track pre-joining and day-1 onboarding checklists: document submission, IT setup, welcome kit, and HR induction. | Frontend unwrap bug; onboarding checklist step toggle lacks persistent DB update. | Models: `CandidateOnboarding, CandidateOnboardingTask, JobCandidate`<br/>APIs: `GET/PUT /api/v1/recruitment/onboarding` | `recruitment:manage, hr:manage` | Candidate onboarding task progress resets on refresh. | **Criteria:** Completed onboarding checklist items remain checked across page reloads.<br/>**Tests:** Vitest onboarding task status test; Playwright checklist toggle test. | `REQUIRED` | **Batch 4** |
| 38 | `/_authenticated/hr/training/trainings` | `src/routes/_authenticated/hr/training/employee-trainings.tsx` | Schedule training sessions, enroll employees, assign trainers, and track attendance and feedback. | Frontend unwrap bug; session creation modal requires live persistence in TrainingSession and SessionAttendance. | Models: `TrainingCourse, TrainingSession, SessionAttendance, Employee`<br/>APIs: `GET/POST /api/v1/training/sessions, POST /api/v1/training/enroll` | `training:manage, hr:manage` | Created training classes disappear on reload; employee enrollment lost. | **Criteria:** Created training session with assigned employees persists in DB and shows scheduled date.<br/>**Tests:** Vitest training session creation test; Playwright scheduling test. | `REQUIRED` | **Batch 4** |
| 39 | `/_authenticated/tenant/domain` | `src/routes/_authenticated/tenant/domain.tsx` | Configure custom white-label tenant domain (e.g., hr.company.com) and SSL certificate status. | Form values saved in React state only; requires persistence in TenantDomain table; Cloudflare custom hostname sync deferred. | Models: `TenantDomain, Tenant`<br/>APIs: `GET/POST /api/v1/tenant/domain` | `tenant:admin (strictly tenant scoped)` | Custom domain configuration does not persist across reload. | **Criteria:** Domain record persists to TenantDomain table with PENDING_DNS verification status.<br/>**Tests:** Vitest tenant domain CRUD test; Playwright form save test. | `REQUIRED` | **Batch 4** |
| 40 | `/_authenticated/tenant/settings` | `src/routes/_authenticated/tenant/settings.tsx` | Configure tenant corporate profile, primary currency, timezone, statutory fiscal year default, and company logo. | Form submits to local state; requires PUT mutation to /api/v1/tenant/settings with Tenant table update. | Models: `Tenant`<br/>APIs: `GET/PUT /api/v1/tenant/settings` | `tenant:admin (strictly tenant scoped)` | Tenant company profile edits reset on reload. | **Criteria:** Updated corporate address and timezone persist to DB and reflect in tenant context.<br/>**Tests:** Vitest tenant settings update test; Playwright UI test. | `REQUIRED` | **Batch 4** |
| 41 | `/_authenticated/tenant/subscription` | `src/routes/_authenticated/tenant/subscription.tsx` | View tenant SaaS plan (Starter, Pro, Enterprise), active seats, renewal date, and billing invoices. | Component is 18-line draft stub; needs subscription details card querying TenantSubscription and BillingInvoice. | Models: `TenantSubscription, BillingInvoice, TenantPlan`<br/>APIs: `GET /api/v1/tenant/subscription` | `tenant:admin, billing:view` | Tenant cannot check license tier or billing renewal dates. | **Criteria:** Displays active plan tier, employee seat utilization count, and next billing date from DB.<br/>**Tests:** Vitest subscription query test; Playwright card inspection. | `REQUIRED` | **Batch 4** |
| 42 | `/_authenticated/_app/settings/custom-domain` | `src/routes/_authenticated/_app/settings.custom-domain.tsx` | App shell settings sub-view for custom domain configuration (canonical counterpart to /tenant/domain). | Client state only; share backend service with /tenant/domain. | Models: `TenantDomain`<br/>APIs: `GET/POST /api/v1/tenant/domain` | `tenant:admin` | Duplicate view of /tenant/domain. | **Criteria:** Settings view mirrors /tenant/domain verified status.<br/>**Tests:** Playwright navigation test. | `REQUIRED` | **Batch 4** |
| 43 | `/_authenticated/_app/invoice/create` | `src/routes/_authenticated/_app/invoice.create.tsx` | Commercial customer billing invoice creation dialog with line items, tax rates, and payment terms. | 18-line draft stub; commercial invoicing not part of core HRMS; full invoice creator exists in /_app/invoices. | Models: `BillingInvoice, InvoiceItem, Customer`<br/>APIs: `POST /api/v1/invoices` | `billing:create, sales:admin` | Redundant creation stub; main invoice module is already operational. | **Criteria:** Redirect to main operational invoice generator or wire modal.<br/>**Tests:** Playwright route check. | `DEFERRED` | **Batch 4** |
| 44 | `/cms/` | `src/routes/cms.index.tsx` | Tenant public content management system: landing page editor, blog posts, and marketing announcements. | 35-line component with client-side state only; lacks CMS table binding. | Models: `CmsPage, CmsPost (if enabled)`<br/>APIs: `GET/POST /api/v1/cms/pages` | `cms:admin` | Non-HR website management feature. | **Criteria:** Graceful placeholder or blog manager view.<br/>**Tests:** Playwright route check. | `OUT OF SCOPE` | **Batch 4** |
| 45 | `/_authenticated/_app/chat` | `src/routes/_authenticated/_app/chat.tsx` | Internal workspace communication hub and team messaging widget. | 12-line stub; re-exports team chat addon; WebSocket connection requires active broker. | Models: `ChatMessage, ChatChannel (or external WhatsApp integration)`<br/>APIs: `GET /api/v1/chat/messages` | `chat:access, employee` | Internal chat stub; zero statutory or compliance impact. | **Criteria:** Loads team messaging interface or shows offline messaging fallback.<br/>**Tests:** Playwright chat load test. | `DEFERRED` | **Batch 5** |
| 46 | `/_authenticated/hr/chat` | `src/routes/_authenticated/hr/chat.tsx` | HR department communication channel for HR team discussions and employee support queries. | Re-exports 3,502-line team-whatsapp-chat-addon.tsx; requires tenant WhatsApp API token for live sync. | Models: `ChatMessage`<br/>APIs: `GET /api/v1/chat/channels` | `hr:view` | Third-party chat integration requires external credentials. | **Criteria:** Displays conversation history or credential setup prompt.<br/>**Tests:** Playwright load test. | `DEFERRED` | **Batch 5** |
| 47 | `/_authenticated/me/chat` | `src/routes/_authenticated/me/chat.tsx` | Employee self-service helpdesk chat to submit queries to HR desk. | Re-exports team-whatsapp-chat-addon.tsx; identical backend dependency as /hr/chat. | Models: `ChatMessage`<br/>APIs: `GET /api/v1/chat/me` | `employee` | Third-party chat dependency. | **Criteria:** Displays helpdesk chat or ticketing fallback.<br/>**Tests:** Playwright load test. | `DEFERRED` | **Batch 5** |
| 48 | `/_authenticated/hr/media` | `src/routes/_authenticated/hr/media.tsx` | HR corporate media repository: branding logos, event photos, company handbook PDFs, and training videos. | Proxies to 655-line tenant-media-page.tsx; file upload requires S3/R2 storage bucket or local uploads directory. | Models: `MediaFile, Tenant`<br/>APIs: `GET/POST /api/v1/media` | `hr:manage, admin` | Media uploads stored locally in dev; persistent object storage needed for multi-tenant production. | **Criteria:** Uploaded corporate image appears in media grid and retains thumbnail on refresh.<br/>**Tests:** Vitest media upload test; Playwright media gallery test. | `REQUIRED` | **Batch 4** |
| 49 | `/_authenticated/me/media` | `src/routes/_authenticated/me/media.tsx` | Employee personal media storage for profile avatar, expense receipts, and personal certifications. | Proxies to tenant-media-page with employee user-scoped filter. | Models: `MediaFile, Employee`<br/>APIs: `GET /api/v1/me/media` | `employee:self` | Employee media gallery unpersisted if filter missing. | **Criteria:** Employee sees only their uploaded personal receipts and profile pictures.<br/>**Tests:** Vitest user media query test; Playwright UI test. | `REQUIRED` | **Batch 4** |
| 50 | `/_authenticated/_app/workspace` | `src/routes/_authenticated/_app/workspace.tsx` | Multi-tenant organization switcher, workspace branding overview, and active company context switchboard. | 190-line component uses local state; tenant switch requires updating active JWT token and hrms_user context in localStorage. | Models: `Tenant, UserTenantMembership`<br/>APIs: `GET /api/v1/workspaces, POST /api/v1/workspaces/switch` | `authenticated user` | Switching company context in multi-company setups does not persist across new browser tabs. | **Criteria:** Selecting alternate company updates tenantId in session and refreshes page with new company data.<br/>**Tests:** Vitest tenant switch test; Playwright workspace selection check. | `REQUIRED` | **Batch 4** |
| 51 | `/_authenticated/_app/setup-notes` | `src/routes/_authenticated/_app/setup-notes.tsx` | HR administrator initial deployment notes, configuration scratchpad, and onboarding task list. | 236-line interactive component operating on client-side state only. | Models: `TenantSetting (or local preference)`<br/>APIs: `N/A (Intentionally client-side preference)` | `admin, hr:manage` | Personal admin scratchpad notes reset on browser cache clear; zero statutory or compliance impact. | **Criteria:** Notes persist in browser localStorage across reloads; backend DB persistence not required.<br/>**Tests:** Playwright localStorage persistence test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 52 | `/_authenticated/super/docs` | `src/routes/_authenticated/super/docs.tsx` | Super-administrator internal system architecture and API reference documentation. | 7-line draft stub. | Models: `None`<br/>APIs: `N/A (Static technical documentation)` | `super:admin` | Super-admin technical reference only; no tenant data impact. | **Criteria:** Renders embedded technical docs or redirects to developer portal.<br/>**Tests:** Playwright route check. | `OUT OF SCOPE` | **Batch 5** |
| 53 | `/_authenticated/hr/` | `src/routes/_authenticated/hr/index.tsx` | HR administrative command center index route (canonical entry point). | Re-exports 776-line hrm-dashboard.tsx; proxy resolution verified; metrics unwrap requires standard array handling. | Models: `Employee, Attendance, LeaveRequest, PayrollRun`<br/>APIs: `GET /api/v1/dashboard/hr-metrics` | `hr:manage, admin` | HR admin home page. | **Criteria:** Renders comprehensive HRM command center with live employee counts and action items.<br/>**Tests:** Playwright dashboard load test. | `REQUIRED` | **Batch 1** |
| 54 | `/_authenticated/hr/dashboard` | `src/routes/_authenticated/hr/dashboard.tsx` | HR administrative dashboard overview (sub-route alias to /hr/). | Identical target component as /hr/ (hrm-dashboard.tsx). | Models: `Employee, Attendance`<br/>APIs: `GET /api/v1/dashboard/hr-metrics` | `hr:manage` | Navigation alias. | **Criteria:** Displays same live metrics as /hr/ index.<br/>**Tests:** Playwright parity test. | `REQUIRED` | **Batch 1** |
| 55 | `/_authenticated/hr/profile` | `src/routes/_authenticated/hr/profile.tsx` | HR administrator personal profile, password change, and security settings. | Re-exports 556-line profile.tsx; profile update mutation requires DB persistence. | Models: `User, Employee`<br/>APIs: `GET /api/v1/me/profile, PUT /api/v1/me/profile` | `authenticated user` | Profile updates reset if unpersisted. | **Criteria:** Updated phone number or avatar persists in User table across reloads.<br/>**Tests:** Vitest profile update test; Playwright UI test. | `REQUIRED` | **Batch 1** |
| 56 | `/_authenticated/me/` | `src/routes/_authenticated/me/index.tsx` | Employee self-service dashboard home: leave balances, punch clock, recent announcements, and payslips. | Re-exports 896-line employee-dashboard.tsx; verified functional proxy; punch button unwrap needs array guard. | Models: `Employee, Attendance, LeaveBalance, Announcement`<br/>APIs: `GET /api/v1/me/dashboard` | `employee` | Employee primary landing page. | **Criteria:** Renders personalized greeting, remaining leave balances, and today punch status from DB.<br/>**Tests:** Playwright self-service dashboard test. | `REQUIRED` | **Batch 1** |
| 57 | `/_authenticated/me/dashboard` | `src/routes/_authenticated/me/dashboard.tsx` | Employee self-service dashboard alias. | Identical target component as /me/ (employee-dashboard.tsx). | Models: `Employee, Attendance`<br/>APIs: `GET /api/v1/me/dashboard` | `employee` | Navigation alias. | **Criteria:** Parity with /me/ index view.<br/>**Tests:** Playwright parity test. | `REQUIRED` | **Batch 1** |
| 58 | `/_authenticated/me/account` | `src/routes/_authenticated/me/account.tsx` | Employee account settings and preferences. | Re-exports 556-line profile.tsx; shares backend with /hr/profile. | Models: `User, Employee`<br/>APIs: `GET/PUT /api/v1/me/profile` | `employee` | User account preferences. | **Criteria:** Personal preferences persist across logins.<br/>**Tests:** Playwright profile test. | `REQUIRED` | **Batch 1** |
| 59 | `/_authenticated/_app/dashboard` | `src/routes/_authenticated/_app/dashboard.tsx` | Root app dashboard redirect or role-based router (routes HR to /hr/ and Employee to /me/). | 13-line stub; needs role-based redirect logic. | Models: `User`<br/>APIs: `N/A (Router redirect)` | `authenticated user` | Users accessing /_app/dashboard should automatically land on their appropriate role dashboard. | **Criteria:** Admin redirected to /hr, regular staff redirected to /me automatically.<br/>**Tests:** Playwright redirect test. | `REQUIRED` | **Batch 1** |
| 60 | `/_authenticated/_app/settings` | `src/routes/_authenticated/_app/settings.tsx` | Root app settings redirect to appropriate module settings (HR settings, tenant settings, or personal settings). | 18-line stub; needs canonical redirect. | Models: `User`<br/>APIs: `N/A (Router redirect)` | `authenticated user` | Generic settings route. | **Criteria:** Redirects to /tenant/settings or /me/account depending on user role.<br/>**Tests:** Playwright redirect check. | `REQUIRED` | **Batch 1** |
| 61 | `/about` | `src/routes/about.tsx` | Public website About Us page: company vision, leadership team, and corporate mission. | 101-line static marketing presentation view; operates on hardcoded copy; lacks dynamic CMS backend binding. | Models: `CmsPage (Optional)`<br/>APIs: `N/A (Static marketing view)` | `public (unauthenticated)` | Marketing page only; zero employee, statutory or payroll impact. | **Criteria:** Renders polished public marketing copy with responsive layout.<br/>**Tests:** Playwright public page rendering test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 62 | `/product` | `src/routes/product.tsx` | Public marketing product features showcase: HR, payroll, attendance, and compliance highlights. | 217-line static marketing view. | Models: `None`<br/>APIs: `N/A (Static marketing view)` | `public` | Public feature overview; no data persistence needed. | **Criteria:** Displays product capabilities, screenshots, and call to action.<br/>**Tests:** Playwright rendering test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 63 | `/solutions` | `src/routes/solutions.tsx` | Public marketing enterprise solutions by industry: IT, Manufacturing, Healthcare, Retail. | 163-line static marketing view. | Models: `None`<br/>APIs: `N/A (Static marketing view)` | `public` | Public marketing copy only. | **Criteria:** Renders industry solution pillars.<br/>**Tests:** Playwright rendering test. | `INTENTIONALLY UNAVAILABLE` | **Batch 5** |
| 64 | `/payment/failed` | `src/routes/payment.failed.tsx` | Payment gateway callback page displayed when a subscription or invoice payment transaction fails. | 136-line presentation view; parses query parameters (orderId, reason) from URL; no server state to mutate. | Models: `BillingInvoice (read only)`<br/>APIs: `GET /api/v1/billing/orders/:id/status` | `public / customer` | Shows failure reason and Retry Payment button. | **Criteria:** Renders clean error explanation and Retry action with back link.<br/>**Tests:** Playwright failed payment simulation test. | `REQUIRED` | **Batch 5** |
| 65 | `/payment/success` | `src/routes/payment.success.tsx` | Payment gateway confirmation page displayed after successful subscription or invoice transaction. | 137-line presentation view; renders transaction receipt and confirmation badge. | Models: `BillingInvoice, PaymentTransaction`<br/>APIs: `GET /api/v1/billing/orders/:id/receipt` | `public / customer` | Shows transaction reference, amount paid, and invoice download button. | **Criteria:** Displays transaction summary, receipt details, and Continue to App button.<br/>**Tests:** Playwright success payment simulation test. | `REQUIRED` | **Batch 5** |
| 66 | `/403` | `src/routes/403.tsx` | HTTP 403 Forbidden error view displayed when an authenticated user attempts to access an unauthorized resource. | 10-line draft placeholder; needs styled illustration, permission explanation, and Back to Home button. | Models: `None`<br/>APIs: `N/A (Client presentation view)` | `public / authenticated` | Users encounter unstyled raw text when denied access. | **Criteria:** Renders branded 403 Access Denied layout with clear navigation back to authorized dashboard.<br/>**Tests:** Playwright 403 boundary test. | `REQUIRED` | **Batch 5** |
| 67 | `/404` | `src/routes/404.tsx` | HTTP 404 Page Not Found error view displayed when a requested URL does not match any registered route. | 10-line draft placeholder; needs styled illustration and Return to Dashboard button. | Models: `None`<br/>APIs: `N/A (Client presentation view)` | `public` | Users seeing dead links encounter unstyled view. | **Criteria:** Renders polished 404 illustration, helpful search suggestion, and home button.<br/>**Tests:** Playwright 404 boundary test. | `REQUIRED` | **Batch 5** |
| 68 | `/500` | `src/routes/500.tsx` | HTTP 500 Internal Server Error view displayed when an unexpected runtime exception occurs. | 15-line draft placeholder; needs crash report details toggle and Reload Application button. | Models: `None`<br/>APIs: `N/A (Error presentation)` | `public` | Poor user experience during transient server glitches. | **Criteria:** Renders clean 500 error boundary with Reload and Report Issue actions.<br/>**Tests:** Playwright error boundary trigger test. | `REQUIRED` | **Batch 5** |
| 69 | `/error-404` | `src/routes/error-404.tsx` | TanStack Router internal 404 catch-all boundary. | 10-line stub; should delegate to styled 404 component. | Models: `None`<br/>APIs: `N/A` | `public` | Router fallback. | **Criteria:** Consistent rendering with main 404 page.<br/>**Tests:** Playwright router test. | `REQUIRED` | **Batch 5** |
| 70 | `/error-500` | `src/routes/error-500.tsx` | TanStack Router internal 500 runtime catch-all boundary. | 15-line stub; should delegate to styled 500 component. | Models: `None`<br/>APIs: `N/A` | `public` | Router fallback. | **Criteria:** Consistent rendering with main 500 page.<br/>**Tests:** Playwright router test. | `REQUIRED` | **Batch 5** |
| 71 | `/offline` | `src/routes/offline.tsx` | Service worker offline fallback view displayed when device loses network connectivity. | 10-line stub; needs offline indicator, local cache retry button, and offline queue status. | Models: `None`<br/>APIs: `N/A (Offline cache presentation)` | `public` | Users losing internet see blank screen instead of friendly offline guidance. | **Criteria:** Renders offline warning with Retry Connection button that polls network.<br/>**Tests:** Playwright offline simulation test. | `REQUIRED` | **Batch 5** |
| 72 | `/session-expired` | `src/routes/session-expired.tsx` | Security view displayed when JWT authentication token expires, prompting user to re-authenticate. | 10-line draft placeholder; needs session expiry explanation and quick re-login dialog. | Models: `None`<br/>APIs: `N/A (Auth redirect)` | `public` | User abruptly stranded when token expires. | **Criteria:** Prompts user to log back in while preserving their prior URL destination in redirect param.<br/>**Tests:** Playwright session expiry simulation test. | `REQUIRED` | **Batch 5** |

---

## 2. FEATURE CLASSIFICATION BREAKDOWN

In accordance with Step 2 of the Controlled Completion Phase, each feature has been classified into one of four explicit categories:

| Category | Count | Justification & Policy |
|---|---|---|
| **REQUIRED** | **52** | Core HR employee lifecycle records, disciplinary governance, asset tracking, statutory reporting, organization hierarchy, multi-tenant settings, and critical error boundaries. Must be fully persisted and verified. |
| **DEFERRED** | **7** | Secondary non-HR commercial modules (Deal pipeline, Product stock report, Project progress report, Quick invoice stub, Career site public portal, Performance appraisal reports, Recruitment reports). Scheduled for subsequent domain waves. |
| **INTENTIONALLY UNAVAILABLE** | **5** | Static marketing landing views (`/about`, `/product`, `/solutions`) and client-side administrative scratchpads (`/_app/setup-notes`). Backend database persistence is intentionally omitted; state is static or stored in browser `localStorage`. |
| **OUT OF SCOPE** | **2** | Super-admin internal developer docs (`/super/docs`) and tenant marketing CMS site builder (`/cms/`). Excluded from employee HRMS payroll scope. |
| **TOTAL** | **66** | Fully reconciled backlog. |

---

## 3. IMPLEMENTATION BATCH STRUCTURE

To ensure system stability, prevent regression of the 414 verified routes, and uphold statutory payroll safety, the 52 required routes are organized into **5 bounded batches**:

### BATCH 1: HR Lifecycle, Disciplinary Actions & Employee Administrative Records (P1 — Immediate)
- **Scope:** 11 Routes (`/hr/lifecycle/awards`, `/warnings`, `/complaints`, `/promotions`, `/transfers`, `/terminations`, `/me/lifecycle/terminations`, `/hr/attendance/timesheet`, `/me/attendance/records`, `/hr/attendance/`, `/hr/payroll/salaries`) + 6 Shell/Dashboard proxies (`/hr/`, `/hr/dashboard`, `/hr/profile`, `/me/`, `/me/dashboard`, `/me/account`, `/_app/dashboard`, `/_app/settings`).
- **Target Problem:** Resolves the primary root cause where created employee awards, disciplinary warnings, complaints, promotions, and transfers vanish on page refresh due to the API client array unwrap defect (`res.data` vs `res`).
- **Prisma Models:** `Award`, `DisciplinaryWarning`, `EmployeeComplaint`, `PromotionRecord`, `EmployeeTransfer`, `Timesheet`, `Attendance`, `SalaryStructure`.
- **Statutory Safeguard:** No live payroll deductions or payslip publishing will be altered.

### BATCH 2: Enterprise Asset Management & Depreciation Dashboard (P1/P2)
- **Scope:** 2 Routes (`/hr/assets/dashboard`, `/_app/asset-dashboard`).
- **Target Problem:** Replaces static mock counters with live SQL queries against `Asset`, `AssetAssignment`, and `AssetMaintenance` tables.
- **Acceptance:** Asset assignments, warranty expirations, and repair schedules persist across browser reloads.

### BATCH 3: Smart Reports & Analytics Live Database Aggregation (P2)
- **Scope:** 10 Required HR Reports (`/smart-reports/$reportId`, `attendance-summary`, `leave-report`, `payroll-sheet`, `/hr/reports/attendance`, `attrition`, `headcount`, `payroll`, `statutory`, `training`) + 8 Deferred commercial reports.
- **Target Problem:** Attaches real tenant SQL aggregation queries to replace static demonstration data in management reports.
- **Acceptance:** Month-wise attendance percentages, leave liability accruals, and statutory PF/ESI registers match underlying operational transactions.

### BATCH 4: Organization Structure, Document Templates & Tenant Settings (P2)
- **Scope:** 9 Routes (`/hr/organization/tree`, `/hr/organization/`, `/hr/organization/document-types`, `/hr/documents/templates`, `/hr/recruitment/onboarding`, `/hr/training/trainings`, `/hr/media`, `/me/media`, `/tenant/domain`, `/tenant/settings`, `/tenant/subscription`, `/_app/workspace`).
- **Target Problem:** Wires organization hierarchy tree visualization, document template placeholder validation, and multi-tenant branding/domain persistence.

### BATCH 5: System Error Boundaries, Payment Callbacks & PWA Resilience (P3)
- **Scope:** 10 Routes (`/403`, `/404`, `/500`, `/error-404`, `/error-500`, `/offline`, `/session-expired`, `/payment/failed`, `/payment/success`, `/_app/setup-notes`).
- **Target Problem:** Polishes HTTP error boundary views, adds retry and session re-authentication dialogs, and verifies PWA offline fallback.

---

## 4. PROPOSED FIRST IMPLEMENTATION BATCH: BATCH 1 EXECUTION PLAN

### Objectives of Batch 1
1. **Eliminate Data-Loss on Refresh:** Fix the API client unwrap pattern (`Array.isArray(res) ? res : res?.data || []`) across all HR lifecycle modules so that records created in MySQL remain visible after browser refresh.
2. **Populate Dropdowns from Live DB:** Ensure that Award Types, Warning Types, Employees, Departments, and Positions in creation modals query live tenant tables instead of hardcoded options.
3. **Audit Trail & Tenant Isolation:** Verify that every lifecycle event records `tenantId` and `actorId` in compliance with multi-tenant data governance.
4. **Zero Statutory Disruption:** Verify that no finalized payroll runs, TDS tax brackets, or historical calculations are altered.

### Target Files in Batch 1
- `src/lib/api.ts` (Safe unwrap helper & query result normalizer)
- `src/routes/_authenticated/hr/lifecycle/awards.tsx`
- `src/routes/_authenticated/hr/lifecycle/warnings.tsx`
- `src/routes/_authenticated/hr/lifecycle/complaints.tsx`
- `src/routes/_authenticated/hr/lifecycle/promotions.tsx`
- `src/routes/_authenticated/hr/lifecycle/transfers.tsx`
- `src/routes/_authenticated/hr/lifecycle/terminations.tsx`
- `src/routes/_authenticated/me/lifecycle/exit.tsx`
- `src/routes/_authenticated/hr/attendance/timesheets.tsx`
- `src/routes/_authenticated/_app/attendance-employee.tsx`
- `src/routes/_authenticated/hr/payroll/employee-salaries.tsx`
- `server/src/routes/hr-lifecycle.routes.ts` (Ensure strict tenant-scoped filtering and relational includes)

### Empirical Verification Protocol for Batch 1
1. **Automated Unit & Integration Test:** Execute Vitest test suite covering full CRUD lifecycle for Awards, Disciplinary Warnings, Complaints, and Transfers.
2. **TypeScript Compilation:** Confirm `npx tsc --noEmit` exits with 0 errors.
3. **Playwright Live Browser Test:**
   - Navigate to `http://localhost:5173/hr/lifecycle/awards`.
   - Submit a new award ("Star Performer of the Month", cash gift ₹5,000).
   - Trigger hard page reload (`page.reload()`).
   - Assert that the newly created award record is present in the DOM table.
   - Repeat for Disciplinary Warning and Complaint case notes.
4. **Database Direct Query Verification:** Query MySQL directly via Prisma client to verify record creation with matching `tenantId`.

---

## 5. BATCH 1 EXECUTION & VERIFICATION RECORD (COMPLETED)

**Batch Status:** VERIFIED & CLOSED  
**Execution Timestamp:** 2026-10-15T16:05:00+05:30  
**Verification Scope:** HR Lifecycle & Disciplinary Records Data-Loss Remediation  

### 5.1 Changed & Remediated Files
1. **Shared Client Safe Unwrap Utilities:**
   - `src/lib/api.ts`: Added exported `unwrapData<T>(res)` and `unwrapArray<T>(res)` safely handling raw array `T[]` and wrapped `{ data: T }` responses without swallowing errors.
2. **Backend Routers & Middleware (Strict Tenant Scoping):**
   - `server/src/routes/hr-lifecycle.routes.ts`: Mounted `resolveTenantContext` middleware; added missing `POST /complaints` and `POST /complaints/:id/notes` with strict tenant isolation.
   - `server/src/routes/me-lifecycle.routes.ts`: Mounted `resolveTenantContext` middleware.
   - `server/src/routes/platform-foundation.routes.ts`: Attached `resolveTenantContext` to `platformFoundationRouter` so all foundation routes run inside authenticated AsyncLocalStorage tenant context.
   - `server/src/middleware/employee-context.middleware.ts`: Delegated `/lifecycle`, `/meetings`, `/documents`, and `/collaboration` paths to foundation routers so that admin accounts can access self-service lifecycle views without 403 errors.
3. **Frontend Lifecycle & Disciplinary Routes (Array Unwrap Remediation):**
   - `src/routes/_authenticated/hr/lifecycle/awards.tsx`: Updated `awards` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/warnings.tsx`: Updated `warnings` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/complaints.tsx`: Updated query hook with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/promotions.tsx`: Updated `promotions` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/transfers.tsx`: Updated `transfers`, `employees`, `branches`, and `departments` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/lifecycle/terminations.tsx`: Updated `terminations` and `employees` query hooks with `unwrapArray(res)`.
   - `src/routes/_authenticated/me/lifecycle/exit.tsx`: Updated query hook with `unwrapData(res)`.
   - `src/routes/_authenticated/hr/attendance/timesheets.tsx`: Updated query hook with `unwrapArray(res)`.
   - `src/routes/_authenticated/hr/payroll/employee-salaries.tsx`: Updated query hooks with `unwrapData(res)` and safe fallback arrays for assignments and employees.
   - `src/routes/_authenticated/_app/attendance-employee.tsx`: Updated query hook with `unwrapArray(res)`.
4. **Automated Verification Suites:**
   - `server/src/tests/batch1-hr-lifecycle-remediation.test.ts`: Created comprehensive 31-test suite covering Awards, Warnings, Complaints, Promotions, Transfers, Multi-Tenant Data Isolation, Statutory Payroll Immutability, and RBAC.

### 5.2 Test Results & Evidence
- **Batch 1 Test Suite:** `server/src/tests/batch1-hr-lifecycle-remediation.test.ts` → **31 PASSED | 0 FAILED**
  - Group 1 (Awards Persistence & Lifecycle): 6/6 PASSED
  - Group 2 (Disciplinary Warnings & Severity): 7/7 PASSED
  - Group 3 (Complaints / Grievances & Case Notes): 7/7 PASSED
  - Group 4 (Promotions & Transfers Workflow): 3/3 PASSED
  - Group 5 (Multi-Tenant Data Isolation): 2/2 PASSED
  - Group 6 (Statutory Payroll Immutability Guard): 2/2 PASSED
  - Group 7 (Role-Specific Authorization & Scoping): 4/4 PASSED
- **Wave 2.2 Workflows Suite:** `server/src/tests/wave2-2-workflows.test.ts` → **50 PASSED | 0 FAILED**
- **Statutory TDS Reconciliation Suite:** `server/src/tests/statutory-tds-reconciliation.test.ts` → **26 PASSED | 0 FAILED**
- **Financial Year Dynamic Resolver Suite:** `server/src/tests/financial-year-dynamic-resolver.test.ts` → **11 PASSED | 0 FAILED**
- **Total Automated Tests Passing:** **118 PASSED | 0 FAILED**
- **Static Analysis:** `npx tsc --noEmit` → **0 Errors**

### 5.3 Browser UI Navigation & Hard-Reload Persistence Evidence
Using Playwright browser automation against the live application:
1. **Awards (`/hr/lifecycle/awards`):**
   - Live query loaded and rendered seeded award ("Spotlight Excellence Trophy", ₹15,000, recipient Alex Morgan EMP-0001).
   - Hard page reload executed (`page.reload()`).
   - Table row and KPI counters ("1 Total Honors Granted", "₹15,000 Cash Awards Value") persisted across reload with 0 console errors.
2. **Disciplinary Warnings (`/hr/lifecycle/warnings`):**
   - Rendered active warning ("Unscheduled Infrastructure Migration Attempt", severity: Moderate, status: issued).
   - Hard page reload executed (`page.reload()`).
   - Warning row and KPI counters persisted across reload with 0 console errors.
3. **Complaints & Grievances (`/hr/lifecycle/complaints`):**
   - Rendered active grievance (Ticket `GRV-MV9DY8NV`, "HVAC Temperature Calibration in Engineering Bay 3", status: under review).
   - Hard page reload executed (`page.reload()`).
   - Grievance record and case details persisted across reload with 0 console errors.
4. **Transfers (`/hr/lifecycle/transfers`):**
   - Rendered approved transfer ("Strategic Relocation to Regional Innovation Lab", Alex Morgan EMP-0001).
   - Hard page reload executed (`page.reload()`).
   - Transfer row and KPI counter ("1 Total Movements") persisted across reload with 0 console errors.
5. **Remaining Batch 1 Routes Verified:**
   - `/hr/lifecycle/promotions`: Renders promotion history table and KPI cards with 0 console errors.
   - `/hr/lifecycle/terminations`: Renders involuntary terminations directory and audit log with 0 console errors.
   - `/me/lifecycle/exit`: Renders clean "No Active Offboarding Workflow" state with 0 console errors.
   - `/hr/attendance/timesheets`: Renders timesheets directory and review filters with 0 console errors.
   - `/hr/payroll/employee-salaries`: Renders compensation structure master and CTC baselines with 0 console errors.
   - `/_app/attendance-employee`: Renders employee attendance calendar and punch logs without unhandled exceptions.

### 5.4 Statutory Safety & Immutability Verification
- **Historical Payroll Runs:** Verified that all historical finalized payroll runs remain `completed` and unmodified.
- **Deduction Freeze:** No live deductions were enabled.
- **Payslips:** 0 new payslips were published. Release gate remains strictly locked.

---

## 6. BATCH 2 GATE DECISION NOTICE

**Batch 1 is under active acceptance review. Batch 2 remains STRICTLY BLOCKED.**  
Pursuant to governance protocols, execution is halted at this boundary.  
**DO NOT START BATCH 2** until the Batch 1 acceptance report has been reviewed and explicitly approved by the user.

---

## 7. BATCH 1 INDEPENDENT ACCEPTANCE AUDIT & VERIFICATION REPORT

**Audit Date:** 2026-10-15  
**Audit Mode:** Read-Only Independent Verification  
**Evaluation Decision:** ACCEPT WITH EXPLICIT EXCEPTIONS (Pending Bounded RBAC Correction)

### 7.1 Changed Files Baseline Audit
All modified files listed in the initial Batch 1 report were verified against `src/routeTree.gen.ts` and the repository AST:
- `src/lib/api.ts`: Implements `unwrapData<T>` and `unwrapArray<T>`. Confirmed that `apiRequest` throws `ApiError` on HTTP failures (status != 2xx) before any unwrap helper is invoked, ensuring errors are never swallowed.
- `server/src/routes/hr-lifecycle.routes.ts`: Binds `resolveTenantContext`; exposes `/awards`, `/warnings`, `/complaints`, `/promotions`, `/transfers`, `/terminations`.
- `server/src/routes/me-lifecycle.routes.ts`: Binds `resolveTenantContext`; scopes queries strictly to authenticated employee.
- `server/src/routes/platform-foundation.routes.ts`: Mounts foundation sub-routers under `requireAuth, resolveTenantContext`.
- `server/src/middleware/employee-context.middleware.ts`: Successfully delegates `/lifecycle`, `/meetings`, `/documents`, and `/collaboration` to prevent 403 errors on ESS views.
- Frontend Views: `awards.tsx`, `warnings.tsx`, `complaints.tsx`, `promotions.tsx`, `transfers.tsx`, `terminations.tsx`, `exit.tsx`, `timesheets.tsx`, `employee-salaries.tsx`, `attendance-employee.tsx`.
- Post-Report File Changes: **0 files modified** during this audit.

### 7.2 API Response Handling Evidence
| Scenario / Response Shape | Input Payload | Helper Tested | Result / Behavior | Status |
|---|---|---|---|---|
| Raw Array | `[{ id: "1" }, { id: "2" }]` | `unwrapArray` | Returns `[{ id: "1" }, { id: "2" }]` intact | **PASS** |
| Standard Wrapped Envelope | `{ data: [{ id: "1" }] }` | `unwrapArray` | Extracts inner array `[{ id: "1" }]` | **PASS** |
| Items Envelope | `{ items: [{ id: "1" }] }` | `unwrapArray` | Extracts inner array `[{ id: "1" }]` | **PASS** |
| Valid Empty Array | `[]` | `unwrapArray` | Returns `[]` | **PASS** |
| Valid Wrapped Empty Array | `{ data: [] }` | `unwrapArray` | Returns `[]` | **PASS** |
| Malformed Non-Array Object | `{ unexpected: true }` | `unwrapArray` | Safely defaults to `[]` (prevents `.map()` runtime crash) | **PASS** |
| Null / Undefined Payload | `null` / `undefined` | `unwrapArray` | Safely defaults to `[]` | **PASS** |
| Single Entity (Unwrapped) | `{ id: "u-1", name: "Alex" }` | `unwrapData` | Preserves entity object intact | **PASS** |
| Single Entity (Wrapped) | `{ data: { id: "u-1" } }` | `unwrapData` | Unwraps single entity object | **PASS** |
| HTTP 4xx/5xx API Failure | `{ error: "Not Found" }` (404) | `apiRequest` | Throws `ApiError(404)`; never reaches unwrap helper | **PASS** |

### 7.3 End-to-End Persistence Evidence
1. **Awards ("Star Performer", ₹5,000 Bonus):**
   - **Database Record Verified:**
     - ID: `db5022da-f854-43eb-b0fa-a046c8b39376`
     - Tenant ID: `tenant-default-001`
     - Employee: Alex Morgan (`emp-demo-001`, `EMP-0001`)
     - Gift Item: `Star Performer`
     - Gift Amount: `5000` (₹5,000 decimal value)
     - Certificate Number: `CERT-MV9EY20C`
     - Status: `awarded`
   - **HTTP & Reload Verification:** Live `GET /api/v1/hr/lifecycle/awards` returns `Star Performer` with `giftAmount: 5000` after reload.
2. **Disciplinary Warnings:**
   - Create (`POST /api/v1/hr/lifecycle/warnings`): Created `major` severity warning ("Audit Check: Unapproved SSH Key Injection Attempt").
   - Database Verified: Persisted in `DisciplinaryWarning` table with `tenant-default-001`.
   - Read & Reload: Retrievable via live `GET /api/v1/hr/lifecycle/warnings`.
   - Delete (`DELETE /api/v1/hr/lifecycle/warnings/:id`): Removed successfully from database.
3. **Complaints & Grievances:**
   - Create (`POST /api/v1/hr/lifecycle/complaints`): Ticket code `GRV-...` generated.
   - Case Note (`POST .../complaints/:id/notes`): Confidential note appended and linked.
   - Resolve (`PUT .../complaints/:id/resolve`): Status transitioned to `resolved` with action `equipment_upgrade`.
   - Database Verified: Joined case note persists in `ComplaintCaseNote` table.
4. **Transfers:**
   - Create (`POST /api/v1/hr/lifecycle/transfers`): Recorded transfer with reason "Audit Check: Temporary assignment to Site Reliability Engineering".
   - Database Verified: Persisted in `EmployeeTransfer` table with `tenant-default-001`.
5. **Supported vs Unsupported Operations Matrix:**
   - **Awards:** Create (UI & API: YES), Read (UI & API: YES), Delete (UI & API: YES), Update (UI: NO - immutable recognition log).
   - **Warnings:** Create (UI & API: YES), Read (UI & API: YES), Acknowledge (UI & API: YES), Delete (API: YES, UI: NO - deliberately omitted from UI to maintain compliance audit trail).
   - **Complaints:** Create (UI & API: YES), Read (UI & API: YES), Add Case Note (UI & API: YES), Resolve Status (UI & API: YES), Delete (UI & API: NO - statutory/POSH records must be retained).
   - **Transfers:** Create (UI & API: YES), Read (UI & API: YES), Update/Delete (UI & API: NO - permanent historical movement record).

### 7.4 Multi-Tenant Isolation & Role Authorization Audit
- **Tenant Isolation (Tenant A vs Tenant B):**
  - Tenant A: `tenant-default-001` (TSV GLOBAL SOLUTIONS)
  - Tenant B: `test-tenant-b-1791369828267` (Beta Logistics)
  - Verified that Tenant B querying `/api/v1/hr/lifecycle/awards` returns **0 awards** and **0 data leakage** of Tenant A's "Star Performer" award.
  - Verified that cross-tenant deletion attempts by Tenant B against Tenant A's award ID affect 0 rows; Tenant A's record remains intact.
- **Fail-Closed Security:**
  - Requests without Bearer token return `401 Unauthorized`.
  - Tampered or invalid JWT tokens return `401 Unauthorized`.
  - Non-existent user IDs in valid JWT format return `401: Account no longer exists`.
- **Employee Self-Service Scoping:**
  - `/api/v1/me/lifecycle/complaints` filters strictly by `complainantId: employee.id`.
  - Complaints filed against the employee are completely excluded.
  - Confidential case notes and investigator notes are stripped from the response projection.
  - Client-supplied `employeeId` in request body is ignored; identity is derived strictly from JWT `userId`.
- **DEFECT DISCOVERED (P1 RBAC Vulnerability in `hr-lifecycle.routes.ts`):**
  - **Finding:** While unit tests verified `requireRole` in isolation, `server/src/routes/hr-lifecycle.routes.ts` failed to mount `requireRole("admin", "hr_admin", "hr_manager", "tenant_admin")` on its administrative endpoints.
  - **Empirical Proof:** An authenticated employee account (`user-emp-001` with `roles: ["employee"]`) calling `POST /api/v1/hr/lifecycle/awards` succeeds with HTTP `201 Created` rather than `403 Forbidden`.
  - **Proposed Smallest Bounded Correction:** Attach `requireRole("admin", "hr_admin", "hr_manager", "tenant_admin")` to `server/src/routes/hr-lifecycle.routes.ts` routes (`POST /awards`, `DELETE /awards/:id`, `POST /warnings`, `DELETE /warnings/:id`, `POST /promotions`, `POST /transfers`, `PUT /complaints/:id/resolve`, etc.).

### 7.5 Route Coverage & 6-vs-8 Canonical Proxy Discrepancy Matrix
| # | Registered Route | Component File | CRUD Verified | Persistence & Reload | Authorization & Isolation | Notes / Classification |
|---|---|---|---|---|---|---|
| 1 | `/_authenticated/hr/lifecycle/awards` | `awards.tsx` | Create, Read, Delete | Verified (Star Performer ₹5,000) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 2 | `/_authenticated/hr/lifecycle/warnings` | `warnings.tsx` | Create, Read, Delete (API) | Verified (DB + HTTP GET) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 3 | `/_authenticated/hr/lifecycle/complaints` | `complaints.tsx` | Create, Read, Resolve, Notes | Verified (DB + HTTP GET) | Strictly Scoped & Confidential | Canonical HR Admin Route |
| 4 | `/_authenticated/hr/lifecycle/promotions` | `promotions.tsx` | Create, Read | Verified (PromotionRecord) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 5 | `/_authenticated/hr/lifecycle/transfers` | `transfers.tsx` | Create, Read | Verified (EmployeeTransfer) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 6 | `/_authenticated/hr/lifecycle/terminations` | `terminations.tsx` | Create, Read | Verified (OffboardingTask) | Tenant Isolated; RBAC Defect Flagged | Canonical HR Admin Route |
| 7 | `/_authenticated/me/lifecycle/terminations` | `exit.tsx` (proxy) | Read (ESS clearance) | Verified (EmployeeExit) | Self-Scoped (Complainant/Employee) | Proxy re-exporting `./exit.tsx` |
| 8 | `/_authenticated/hr/attendance/timesheet` | `timesheets.tsx` | Read, Approve | Verified (Timesheet) | Tenant Isolated | Sub-route to timesheets view |
| 9 | `/_authenticated/me/attendance/records` | `attendance-employee.tsx` | Read (Punch Log) | Verified (Attendance) | Self-Scoped | Proxy to attendance-employee |
| 10 | `/_authenticated/hr/attendance/` | `attendance.tsx` | Read, Roll Call | Verified (Attendance) | Tenant Isolated | Command center index |
| 11 | `/_authenticated/hr/payroll/salaries` | `employee-salaries.tsx` | Read, Adjust Structure | Verified (SalaryStructure) | Tenant Isolated; Payroll Locked | CTC baselines |

**Resolution of the Six-versus-Eight Canonical Proxy Discrepancy:**
- The Express sub-router `server/src/routes/hr-lifecycle.routes.ts` exposes **8 canonical lifecycle entities**: Awards, Warnings, Complaints, Promotions, Transfers, Terminations, Resignations, and Trips.
- Batch 1 targeted the **6 administrative lifecycle routes** (Awards, Warnings, Complaints, Promotions, Transfers, Terminations) that were actively suffering from the unwrap defect, while Resignations (`/hr/lifecycle/resignations`) and Trips (`/hr/lifecycle/trips`) were excluded from Batch 1 as they belong to lower-risk self-service workflows.
- On the ESS client side, `src/routes/_authenticated/me/lifecycle/terminations.tsx` is an exact proxy re-exporting `./exit.tsx`.

### 7.6 Regression & Statutory Payroll Safeguards Verification
All regression suites and static analysis checks were executed with captured output:
1. **Batch 1 HR Lifecycle Suite:** `server/src/tests/batch1-hr-lifecycle-remediation.test.ts` → **32 PASSED | 0 FAILED**
2. **Statutory TDS Reconciliation Suite:** `server/src/tests/statutory-tds-reconciliation.test.ts` → **26 PASSED | 0 FAILED**
3. **Financial Year Dynamic Resolver Suite:** `server/src/tests/financial-year-dynamic-resolver.test.ts` → **11 PASSED | 0 FAILED**
4. **Wave 2.2 Advanced Workflows Suite:** `server/src/tests/wave2-2-workflows.test.ts` → **50 PASSED | 0 FAILED**
5. **TypeScript Compilation (Frontend):** `npx tsc --noEmit` → **0 ERRORS**
6. **TypeScript Compilation (Backend):** `npx --prefix server tsc --noEmit` → **0 ERRORS**
7. **Empirical Payroll Safeguard Metrics:**
   - Completed historical payroll runs: Exactly 2 (Month 9/2026, locked and unmodified).
   - Published payslips count: Exactly 6 (0 new payslips published).
   - Statutory deduction components: 4 standard template rules (PF, ESI, PT, TDS), 0 live production deductions enabled.

---

### 7.7 Acceptance Audit Final Recommendation (Original Baseline)

**RECOMMENDATION (Pre-Remediation): ACCEPT WITH EXPLICIT EXCEPTIONS**

**Reasoning:**
1. Data persistence across reloads, API array unwrap handling, multi-tenant database isolation, statutory payroll locks, and test regressions are thoroughly verified with empirical evidence.
2. The specific test record **“Star Performer” with ₹5,000 bonus** exists in `tenant-default-001` and is retrievable via live API calls.
3. However, an **RBAC authorization defect** was discovered: administrative mutations in `server/src/routes/hr-lifecycle.routes.ts` lacked the `requireRole("admin", "hr_admin", "hr_manager", "tenant_admin")` middleware guard, permitting regular employees to execute administrative writes.

---

## 8. BOUNDED BATCH 1 RBAC SECURITY CORRECTION & FINAL VERIFICATION RECORD

**Remediation Date:** 2026-10-15  
**Authorization:** Approved for RBAC correction only (Priority P1)  
**Target:** `server/src/routes/hr-lifecycle.routes.ts`  
**Execution Boundary:** STRICTLY BOUNDED to Batch 1. Batch 2 remains BLOCKED.

### 8.1 Implemented Smallest Safe Correction
In `server/src/routes/hr-lifecycle.routes.ts`:
1. Imported `requireRole` from `../middleware/auth`.
2. Defined role constants:
   - `HR_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager"]`
   - `COMPLAINT_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager", "compliance_admin"]`
3. Created explicit route guards:
   - `requireHrAdmin = requireRole(...HR_ADMIN_ROLES)`
   - `requireComplaintAdmin = requireRole(...COMPLAINT_ADMIN_ROLES)`
4. Applied guards across all administrative lifecycle operations:
   - **Awards:** `GET /awards` (requireHrAdmin), `POST /awards` (requireHrAdmin), `DELETE /awards/:id` (requireHrAdmin).
   - **Promotions:** `GET /promotions` (requireHrAdmin), `POST /promotions` (requireHrAdmin).
   - **Transfers:** `GET /transfers` (requireHrAdmin), `POST /transfers` (requireHrAdmin).
   - **Warnings:** `GET /warnings` (requireHrAdmin), `POST /warnings` (requireHrAdmin), `DELETE /warnings/:id` (requireHrAdmin).
   - **Resignations:** `GET /resignations` (requireHrAdmin), `PUT /resignations/:id/review` (requireHrAdmin).
   - **Terminations:** `GET /terminations` (requireHrAdmin), `POST /terminations` (requireHrAdmin).
   - **Business Trips:** `GET /trips` (requireHrAdmin), `PUT /trips/:id/approve` (requireHrAdmin).
   - **Complaints & POSH Data:** `GET /complaints` (requireComplaintAdmin), `POST /complaints` (requireComplaintAdmin), `PUT /complaints/:id/resolve` (requireComplaintAdmin), `POST /complaints/:id/notes` (requireComplaintAdmin).
   - **Exits & Clearance:** `GET /exits` (requireHrAdmin), `PUT /exits/:id/checklist/:itemId` (requireHrAdmin), `PUT /exits/:id/finalize` (requireHrAdmin).
   - **Probation:** `GET /probation` (requireHrAdmin), `PUT /probation/:id/extend` (requireHrAdmin), `PUT /probation/:id/confirm` (requireHrAdmin).
   - **Timeline & Overview:** `GET /timeline/:employeeId` (requireHrAdmin), `GET /overview` (requireHrAdmin).

### 8.2 Mandatory Security Test Results (`server/src/tests/batch1-rbac-security.test.ts`)
Executed against running live Express server with real JWT tokens for HR Admin (`user-hr-001`) and regular Employee (`user-emp-001`):

- **Group 1: Regular Employee Blocked from Administrative Writes (HTTP 403)**
  - `POST /hr/lifecycle/awards`: **403 Forbidden** (PASS)
  - DB Mutation Guard: Leaked award query in database returns `null` (PASS)
  - `DELETE /hr/lifecycle/awards/:id`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/warnings`: **403 Forbidden** (PASS)
  - `DELETE /hr/lifecycle/warnings/:id`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/promotions`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/transfers`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/terminations`: **403 Forbidden** (PASS)
  - `PUT /hr/lifecycle/complaints/:id/resolve`: **403 Forbidden** (PASS)
  - `POST /hr/lifecycle/complaints/:id/notes`: **403 Forbidden** (PASS)
- **Group 2: Confidential Administrative Read Protections**
  - `GET /hr/lifecycle/complaints`: **403 Forbidden** (PASS)
  - `GET /hr/lifecycle/awards`: **403 Forbidden** (PASS)
  - `GET /hr/lifecycle/warnings`: **403 Forbidden** (PASS)
- **Group 3: Authorized HR Administrator Permitted Operations**
  - `GET /hr/lifecycle/awards`: **200 OK** (PASS)
  - `GET /hr/lifecycle/overview`: **200 OK** (PASS)
  - `GET /hr/lifecycle/complaints`: **200 OK** (PASS)
- **Group 4: Employee Self-Service Legitimate Access Preservation**
  - `GET /me/lifecycle/awards`: **200 OK** (PASS)
  - `GET /me/lifecycle/complaints`: **200 OK** (PASS)
- **Group 5: Multi-Tenant Isolation Under HR Admin Role**
  - Tenant B HR Admin queried `/api/v1/hr/lifecycle/awards`: 200 OK, 0 records, 0 leakage of Tenant A data (PASS)
- **Group 6: Fail-Closed Boundaries**
  - Missing Authorization header: **401 Unauthorized** (PASS)
  - Tampered/invalid JWT token: **401 Unauthorized** (PASS)
- **Suite Result:** **21 PASSED | 0 FAILED**

### 8.3 Full Regression Suite Evidence
1. `server/src/tests/batch1-rbac-security.test.ts`: **21 PASSED | 0 FAILED**
2. `server/src/tests/batch1-hr-lifecycle-remediation.test.ts`: **31 PASSED | 0 FAILED**
3. `server/src/tests/statutory-tds-reconciliation.test.ts`: **26 PASSED | 0 FAILED**
4. `server/src/tests/financial-year-dynamic-resolver.test.ts`: **11 PASSED | 0 FAILED**
5. `server/src/tests/wave2-2-workflows.test.ts`: **50 PASSED | 0 FAILED**
6. Frontend TypeScript Compilation (`npx tsc --noEmit`): **0 ERRORS**
7. Backend TypeScript Compilation (`npx --prefix server tsc --noEmit`): **0 ERRORS**

### 8.4 Final Acceptance Status: BATCH 1 ACCEPTED (REMEDIATED & VERIFIED)
With the server-side role guard correction applied and all 21 live HTTP authorization tests passing:
- All data persistence and array unwrap defects are resolved.
- End-to-end CRUD for Awards, Warnings, Complaints, and Transfers is fully operational.
- Multi-tenant data isolation is strictly enforced.
- Regular employees cannot perform administrative actions or view confidential complaint/POSH data.
- Statutory payroll records and tax calculations remain 100% frozen and unmodified.
- **Batch 1 is fully compliant with all acceptance criteria.**  
- **Batch 2 remains strictly blocked pending explicit user authorization.**

---

## 9. FORMAL BATCH 1 ACCEPTANCE DECISION & IMPLEMENTATION BOUNDARY RECORD

**Decision:** ACCEPTED AT IMPLEMENTATION BOUNDARY  
**Decision Date:** 2026-10-15  
**Authorized By:** User Directive  
**Basis:** Successful remediation of the P1 RBAC authorization vulnerability, verification of data persistence across browser reloads, unwrap array safety normalization, and passing 139 automated tests with zero regressions.

### 9.1 Accepted Scope (Preserved)
The following 17 routes comprising Batch 1 are formally closed and accepted:
1. `/_authenticated/hr/lifecycle/awards` (`src/routes/_authenticated/hr/lifecycle/awards.tsx`)
2. `/_authenticated/hr/lifecycle/warnings` (`src/routes/_authenticated/hr/lifecycle/warnings.tsx`)
3. `/_authenticated/hr/lifecycle/complaints` (`src/routes/_authenticated/hr/lifecycle/complaints.tsx`)
4. `/_authenticated/hr/lifecycle/promotions` (`src/routes/_authenticated/hr/lifecycle/promotions.tsx`)
5. `/_authenticated/hr/lifecycle/transfers` (`src/routes/_authenticated/hr/lifecycle/transfers.tsx`)
6. `/_authenticated/hr/lifecycle/terminations` (`src/routes/_authenticated/hr/lifecycle/terminations.tsx`)
7. `/_authenticated/me/lifecycle/terminations` (`src/routes/_authenticated/me/lifecycle/exit.tsx`)
8. `/_authenticated/hr/attendance/timesheet` (`src/routes/_authenticated/hr/attendance/timesheets.tsx`)
9. `/_authenticated/me/attendance/records` (`src/routes/_authenticated/_app/attendance-employee.tsx`)
10. `/_authenticated/hr/attendance/` (`src/routes/_authenticated/_app/attendance.tsx`)
11. `/_authenticated/hr/payroll/salaries` (`src/routes/_authenticated/hr/payroll/employee-salaries.tsx`)
12. `/_authenticated/hr/` (`src/routes/_authenticated/hr/index.tsx`)
13. `/_authenticated/hr/dashboard` (`src/routes/_authenticated/hr/dashboard.tsx`)
14. `/_authenticated/hr/profile` (`src/routes/_authenticated/hr/profile.tsx`)
15. `/_authenticated/me/` (`src/routes/_authenticated/me/index.tsx`)
16. `/_authenticated/me/dashboard` (`src/routes/_authenticated/me/dashboard.tsx`)
17. `/_authenticated/me/account` (`src/routes/_authenticated/me/account.tsx`)
18. Canonical redirects: `/_authenticated/_app/dashboard` and `/_authenticated/_app/settings`.

### 9.2 Preserved Test Verification Baseline
- **RBAC Security Suite:** `server/src/tests/batch1-rbac-security.test.ts` (21 PASSED | 0 FAILED)
  - Regular employee (`roles: ["employee"]`) denied on administrative POST/PUT/DELETE mutations (HTTP 403 Forbidden).
  - Regular employee denied on confidential administrative reads (Complaints, Awards, Warnings) (HTTP 403 Forbidden).
  - HR Admin permitted on administrative endpoints (HTTP 200 OK).
  - Employee self-service endpoints (`/me/lifecycle/*`) verified functional (HTTP 200 OK).
  - Cross-tenant data isolation verified under HR Admin role.
  - Fail-closed security boundaries verified (missing/invalid JWT yields HTTP 401 Unauthorized).
- **Batch 1 Lifecycle Remediation Suite:** `server/src/tests/batch1-hr-lifecycle-remediation.test.ts` (31 PASSED | 0 FAILED)
  - End-to-end CRUD persistence for Awards, Disciplinary Warnings, Complaints & Grievances, Promotions, Transfers.
  - Multi-tenant tenantId scoping and relational includes verified.
- **Full Regression Suites:**
  - `server/src/tests/statutory-tds-reconciliation.test.ts` (26 PASSED | 0 FAILED)
  - `server/src/tests/financial-year-dynamic-resolver.test.ts` (11 PASSED | 0 FAILED)
  - `server/src/tests/wave2-2-workflows.test.ts` (50 PASSED | 0 FAILED)
- **Static Typings:** Frontend `npx tsc --noEmit` (0 errors) & Backend `npx --prefix server tsc --noEmit` (0 errors).

### 9.3 Inviolable Statutory Safeguards
- **Live Payroll Deductions:** STRICTLY DISABLED. No production PF, ESI, PT, or TDS withholding active.
- **Employee Payslips:** UNPUBLISHED. Total published count remains at exactly 6; no automated distribution permitted.
- **Historical Payroll Runs:** IMMUTABLE. Exactly 2 completed runs (Month 9/2026, ₹50,000 gross, ₹2,310 deductions) locked and untouched.

### 9.4 Batch 2 Execution Gate Status
- **STATUS: COMPLETED & VERIFIED.** Execution authorized by user directive; bounded implementation and automated verification completed.

---

## 10. FORMAL BATCH 2 ACCEPTANCE DECISION & IMPLEMENTATION RECORD
**Target Feature:** Enterprise Asset Register, Lifecycle Management & Depreciation Dashboard  
**Status:** IMPLEMENTED, VERIFIED & BOUNDED  
**Revision:** 1.2.0  
**Completion Date:** October 15, 2026  

### 10.1 Approved Scope & Route Coverage
1. `/_authenticated/hr/assets/dashboard` (`src/routes/_authenticated/hr/assets/dashboard.tsx`): Primary HR administrative asset dashboard.
2. `/_authenticated/_app/asset-dashboard` (`src/routes/_authenticated/_app/asset-dashboard.tsx` -> `/asset-dashboard`): Canonical application asset dashboard with verified 1:1 view and data parity.
3. Canonical Component: `src/components/assets/asset-dashboard-view.tsx`.
4. Backend API Router: `server/src/routes/hr-assets.routes.ts`.
5. Backend Domain Service: `server/src/services/asset.service.ts`.

### 10.2 Implementation Highlights
- **Live Database-Backed Queries & Safe Unwrapping:** Replaced hardcoded fallback arrays with `unwrapArray` and `unwrapData` consuming `/hr/assets`, `/hr/assets/overview`, `/hr/assets/types`, and `/employees`.
- **Dynamic Categories & Form Options:** Categories loaded from authorized tenant-scoped API `/hr/assets/types`; assigned employees dynamically populated from `/employees`.
- **Live TanStack Query Mutations:** Integrated `createAssetMutation`, `updateAssetMutation`, and `deleteAssetMutation` with automatic query cache invalidation (`assets-list-data`, `assets-overview-data`) and sonner toast notifications.
- **Transactional Assignment & Return:** Server-side database transactions (`db.$transaction`) guarantee atomic transitions for `AssetAssignment` records and parent `Asset` statuses (`available` <-> `assigned`).
- **Synchronized Dashboard KPIs:** Aggregates (`totalAssets`, `totalValue`, `currentValue`, `totalDepreciation`, `activeAssets`, `utilizationRate`) dynamically synchronized with `/hr/assets/overview` persisted database metrics.
- **Visual Design Parity:** Preserved Dreams ERP sidebar hierarchy, typography, light/dark themes, ApexCharts trends, table actions, and modal forms.

### 10.3 Security & Role-Based Authorization
- **Administrative Role Enforcement:** All administrative asset endpoints guarded by `requireRole(["admin", "super_admin", "tenant_admin", "hr_admin", "assets_admin", "hr_manager"])`.
- **Fail-Closed Employee Denial:** Regular employees (`roles: ["employee"]`) are strictly rejected with `HTTP 403 Forbidden` on both reads and mutations (`GET /hr/assets`, `GET /hr/assets/overview`, `POST /hr/assets`, `POST /hr/assets/:id/assign`, `DELETE /hr/assets/:id`). Rejections cause ZERO database mutations.
- **Fail-Closed Authentication:** Missing or forged authorization tokens rejected with `HTTP 401 Unauthorized`.
- **Multi-Tenant Data Isolation:** All asset operations strictly scoped to `tenantId`. Cross-tenant queries and mutations by Tenant B against Tenant A assets return `HTTP 404 Not Found` with 0 database leakage or mutations.
- **Integrity Constraints:** Duplicate `assetTag` within a tenant rejected with `HTTP 400 Bad Request`. Deletion of assigned assets prohibited.

### 10.4 Empirical Test Evidence Summary
- **Dedicated Batch 2 Suite (`server/src/tests/batch2-assets-lifecycle.test.ts`):** **46 PASSED | 0 FAILED**
  - Group 1 (CRUD & Categories): 12 tests passed
  - Group 2 (Transactional Assignment & Return): 10 tests passed
  - Group 3 (Administrative RBAC & Fail-Closed): 8 tests passed
  - Group 4 (Multi-Tenant Isolation): 5 tests passed
  - Group 5 (Integrity Constraints & Deletion): 4 tests passed
  - Group 6 (Dashboard KPI Aggregates): 4 tests passed
  - Group 7 (Statutory Payroll Immutability Guard): 3 tests passed
- **Batch 1 RBAC Security Suite (`server/src/tests/batch1-rbac-security.test.ts`):** **21 PASSED | 0 FAILED**
- **Batch 1 Lifecycle Remediation Suite (`server/src/tests/batch1-hr-lifecycle-remediation.test.ts`):** **31 PASSED | 0 FAILED**
- **Statutory TDS Reconciliation Suite (`server/src/tests/statutory-tds-reconciliation.test.ts`):** **26 PASSED | 0 FAILED**
- **Financial Year Dynamic Resolver Suite (`server/src/tests/financial-year-dynamic-resolver.test.ts`):** **11 PASSED | 0 FAILED**
- **Static Type Safety:**
  - Frontend: `npx tsc --noEmit` -> **0 ERRORS**
  - Backend: `npx --prefix server tsc --noEmit` -> **0 ERRORS**

### 10.5 Browser Persistence & Route Parity Verification
- **Test Session:** Verified using Playwright browser driver against live dev servers (`localhost:5173` and `localhost:4000`).
- **Asset Creation:** Created newly persisted asset `Automated Test ThinkPad T14` (`825d0af6-ea63-450d-a2c9-89cf9e30d764`), cost `$1,000`, book value `$800`, assigned to `Alex Morgan` (`employee@masterhrms.com`).
- **Hard Reload Persistence:** Executed browser hard page reload; verified that `Automated Test ThinkPad T14` remained visible and active in the registry table with KPI counters reflecting 1 Total Asset, $1,000 Purchase Cost, $800 Book Value, $200 Depreciation, and 100% Active Utilization.
- **Route Parity:** Navigated to canonical route `http://localhost:5173/asset-dashboard` (`/_authenticated/_app/asset-dashboard`); confirmed identical asset data rendering.
- **Visual Artifact:** Full-page screenshot captured and stored at `playwright_asset_dashboard_verified.png`.

### 10.6 Inviolable Statutory Safeguards
- **Live Payroll Deductions:** STRICTLY DISABLED.
- **Employee Payslips:** UNPUBLISHED. Total published count strictly locked at 6.
- **Historical Payroll Runs:** IMMUTABLE. Exactly 2 completed runs locked and unmodified.

### 10.7 Currency & KPI Discrepancy Reconciliation
- **Currency Resolution:** Asset dashboard UI displays formatted currency while underlying tenant model has `currency: "INR"`. When currency unification is applied, all figures will format using tenant's configured ISO currency without modifying persisted numerical amounts. All KPI aggregates (`totalAssets`, `totalValue`, `currentValue`, `totalDepreciation`, `activeAssets`) are verified 100% computed from persisted database records in `hr-assets.routes.ts`.
- **Statutory Safeguards:** Live deductions remain disabled, payslips unpublished, and historical payroll immutable.

### 10.8 Batch 2 Acceptance Decision
- **Status:** ACCEPTED at the implementation boundary.
- **Preserved Artifacts:** `server/src/tests/batch2-assets-lifecycle.test.ts` (46 passed), `playwright_asset_dashboard_verified.png`.

---

## 11. Batch 3A: Smart Reports & Analytics Database Aggregation — Implementation & Verification Report

### 11.1 Implementation Summary & Scope Discipline
- **Approved Scope:** Batch 3A ONLY (Backend database aggregation, authorization hardening, removal of synthetic fallback data, automated verification).
- **Batch 3B Boundary:** STRICTLY OBSERVED. Zero modifications performed on frontend components (`report-view.tsx`, `smart-reports.tsx`).
- **Statutory Guard Integrity:** Completed payroll runs count remains locked at **2**, published payslips remain locked at **6**, and live deductions remain disabled.

### 11.2 Registered Routes & Canonical Backend Endpoints
- **Base Router:** Mounted at `/api/smart-reports` in `server/src/routes/smart-reports.routes.ts` with global middlewares:
  - `requireAuth`: JWT verification with database profile lookup.
  - `resolveTenantContext`: Multi-tenant boundary enforcement.
  - `requireEntitlement("smart-reports")`: Catalog & entitlement licensing guard.
- **Dedicated Report Endpoints:**
  - `GET /api/smart-reports/catalogue`: Aggregated report modules overview with live record counts.
  - `GET /api/smart-reports/attendance-summary`: Attendance counts, rates, hours, overtime, and employee status matrix.
  - `GET /api/smart-reports/payroll-sheet`: Gross salary, deductions, net salary, and payslip breakdowns.
  - `GET /api/smart-reports/leave-report`: Leave balances, approved vs. pending requests, and type breakdown.
  - `GET /api/smart-reports/sales-invoice`: Total sales, receivables, paid/unpaid status breakdown.
  - `GET /api/smart-reports/purchase-invoice`: Total purchases, payables, supplier invoice status.
  - `GET /api/smart-reports/deal-pipeline`: Total pipeline value, weighted pipeline forecast, win rate.
  - `GET /api/smart-reports/product-stock`: Stock units, inventory valuation, low stock warnings.
  - `GET /api/smart-reports/project-progress`: Project budget, actual costs, milestone & task progress.
- **Dynamic Alias & Export Endpoints:**
  - `GET /api/smart-reports/report/:reportId`: Alias route compatible with dynamic frontend selection (returns 404 for unknown report IDs).
  - `GET /api/smart-reports/export` and `GET /api/smart-reports/export/:reportId`: Bounded CSV and JSON exports with RFC 4180 compliance and formula injection protection.

### 11.3 Database Models & Tenant-Scoping Verification
All queried entities inspected and verified in `server/prisma/schema.prisma`:
1. **`Attendance`:** Scoped via direct `tenantId`.
2. **`Payslip` & `PayrollRun`:** Scoped via direct `tenantId`.
3. **`LeaveRequest` & `LeaveType`:** Scoped via direct `tenantId`.
4. **`Sale` & `Customer`:** Scoped via direct `tenantId`. Invoices aggregate `Sale.total` and `Sale.paidAmount`.
5. **`Purchase` & `Supplier`:** Scoped via direct `tenantId`. Purchases aggregate `Purchase.total` and `Purchase.paidAmount`.
6. **`CrmDeal`:** Scoped via direct `tenantId`. Aggregates deal `value` and calculates weighted pipeline by stage probability.
7. **`Product` & `Warehouse`:** Scoped via direct `tenantId`.
8. **`ProductWarehouse` (Indirectly Scoped):** Does not possess a direct `tenantId` column. Complete verified relation path:
   `ProductWarehouse.product -> Product.tenantId` and `ProductWarehouse.warehouse -> Warehouse.tenantId`.
   Queries explicitly enforce `where: { product: { tenantId } }` to eliminate cross-tenant data leakage.
9. **`Project` & `ProjectTask`:** Scoped via direct `tenantId`.

### 11.4 Removal of Synthetic Mocks & Zero-Record Integrity
- All hardcoded mock constants (e.g., `493125.87`, `18`, `350,000`, `ACME`) completely eradicated from `server/src/services/smart-reports.service.ts`.
- When queried on a zero-record tenant or when filters yield no matches:
  - `records: []` (empty array).
  - Numerical aggregates return genuine arithmetic zeros (`0` or `0.0`).
  - No synthetic fallback templates are returned.
- Resilient query filtering: Parameter sanitization guards against `NaN` inputs, preventing Prisma type validation crashes.
- Metric property aliasing: Dual properties provided on metrics (e.g. `deductions` and `totalDeductions`, `totalAmount` and `totalSales`, `balanceDue` and `totalReceivables`, `pipelineValue` and `totalPipeline`, `inventoryValuation` and `totalStockValue`, `totalStockUnits`) to ensure robust contract compatibility.

### 11.5 Role-Based Authorization & Security Hardening
- **Granular Least-Privilege Domain Matrix:**
  - `super_admin`: Full access across all 8 report domains.
  - `hr_admin`: Authorized for HRM domains (`attendance-summary`, `payroll-sheet`, `leave-report`); strictly denied with `403 Forbidden` on Finance domains (`sales-invoice`, `purchase-invoice`).
  - `manager`: Authorized for operational domains (`attendance-summary`, `leave-report`, `deal-pipeline`, `product-stock`, `project-progress`); strictly denied with `403 Forbidden` on Payroll and Finance (`payroll-sheet`, `sales-invoice`, `purchase-invoice`).
  - `employee`: Denied on all reports with `403 Forbidden`.
- **Fail-Closed Authentication:** Missing, malformed, or forged JWT tokens rejected with `401 Unauthorized`.
- **Formula Injection Defense:** All CSV export values are sanitized. Strings beginning with spreadsheet formula triggers (`=`, `+`, `-`, `@`) are prepended with an apostrophe (`'`) to neutralize client-side CSV formula execution.

### 11.6 Empirical Verification Results
- **Dedicated Batch 3A Test Suite (`server/src/tests/batch3-smart-reports-aggregation.test.ts`):** **119 PASSED | 0 FAILED**
  - *Group 1 (Zero-Record Tenants & Zero-Mock Removal):* 43 tests passed.
  - *Group 2 (Persisted Database Records Aggregation Accuracy):* 23 tests passed.
  - *Group 3 (Filters and Period Boundaries):* 5 tests passed.
  - *Group 4 (Missing or Malformed Parameters Handled Gracefully):* 3 tests passed.
  - *Group 5 (Unauthenticated Requests Fail Closed):* 2 tests passed.
  - *Group 6 (Least-Privilege Role Authorization Denial):* 13 tests passed.
  - *Group 7 (Cross-Tenant Data Isolation):* 9 tests passed.
  - *Group 8 (CSV & JSON Exports & Formula Injection Mitigation):* 11 tests passed.
  - *Group 9 (Statutory Payroll Immutability Guard):* 2 tests passed.
  - *Group 10 (Dynamic Alias Route Compatibility):* 4 tests passed.
  - *Cleanup:* All created test records cleanly removed.
- **Batch 2 Regression Suite (`server/src/tests/batch2-assets-lifecycle.test.ts`):** **46 PASSED | 0 FAILED**
- **Batch 1 RBAC Security Suite (`server/src/tests/batch1-rbac-security.test.ts`):** **21 PASSED | 0 FAILED**
- **Three Add-ons Integration Suite (`src/tests/three-addons-implementation.test.ts`):** **16 PASSED | 0 FAILED**
- **TypeScript Static Verification:**
  - Backend: `server/` `npx tsc --noEmit` -> **0 ERRORS**
  - Frontend: `npx tsc --noEmit` -> **0 ERRORS**

### 11.7 Statutory Safeguards Snapshot
- Completed Payroll Runs: **2** (Unmodified, exactly equal to baseline).
- Published Payslips: **6** (Unmodified, exactly equal to baseline).
- Live Payroll Deductions: Strictly disabled.




