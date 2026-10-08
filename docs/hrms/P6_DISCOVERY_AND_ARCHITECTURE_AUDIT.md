# MASTERHRMS — PHASE P6 LIFECYCLE & PERFORMANCE
## Pre-Implementation Discovery, Codebase Audit & Architecture Reconciliation Report

**Date:** October 7, 2026  
**Status:** AUDIT COMPLETE — BUSINESS RULES LOCKED — PROCEED TO IMPLEMENTATION  
**Author:** Antigravity Full-Stack Architect  

---

### 1. Executive Summary & Objective

Phase P6 establishes the complete **Employee Lifecycle & Performance Management** domain for MasterHRMS.
It transitions employees from post-onboarding (P5) through every material organizational milestone, status progression, career movement, disciplinary event, grievance resolution, offboarding, and structured performance evaluation.

The system connects:
- **P2 Organization & Employees:** Core profile, departments, designations, branches, managers, and employee status.
- **P3 Attendance & Leave:** Shift rules, state holiday calendars, leave policies, and month-lock validations.
- **P4 Payroll & Finance:** CTC revisions, component updates, effective-dated salary assignments, and F&F clearances.
- **P5 Recruitment & Onboarding:** Seamless transition from candidate onboarding completion (`createEmployeeAtomic`) into the employee lifecycle starting with `JOINED` / `PROBATION`.

---

### 2. Full Route Audit & Disposition Matrix

Reconciliation of all 18 canonical HR panel routes (`HR-LC-01` through `HR-LC-10`, `HR-PF-01` through `HR-PF-06`), 12 Employee Self-Service routes (`ME-LC-01` through `ME-LC-08`, `ME-PF-01` through `ME-PF-04`), and Command Center dashboards:

| Route ID | Route Path | Current Status | Disposition | Audit Finding & Implementation Plan |
|---|---|---|---|---|
| **HR-LC-00** | `/hr/lifecycle` | NS | **NEW IMPLEMENTATION** | Lifecycle Command Center & Overview: active probations, pending confirmations, upcoming exits, active transfers, warnings, and live employee lifecycle timeline. |
| **HR-LC-01** | `/hr/lifecycle/awards` | PT | **REFACTOR & EXTEND** | Legacy `/awards` exists with basic CRUD; rebuild in canonical `/hr/lifecycle/awards` with award types, cash/gift values, certificate generation, announcement publishing toggle, and employee notifications. |
| **HR-LC-02** | `/hr/lifecycle/promotions` | PT | **REFACTOR & EXTEND** | Legacy `/promotions` creates unlinked rows; rebuild in canonical `/hr/lifecycle/promotions` with effective dating, designation/department updates, manager updates, P4 salary revision linkage, timeline event generation, and letter generation. |
| **HR-LC-03** | `/hr/lifecycle/transfers` | PT (Misaligned) | **REFACTOR & EXTEND** | Legacy `/transfers` was inventory `StockTransfer`; implement dedicated HR Employee Transfer engine: branch, department, state, and reporting manager movement with relieving/joining manager consent and payroll rule recalculation. |
| **HR-LC-04** | `/hr/lifecycle/warnings` | PT | **REFACTOR & EXTEND** | Legacy `/warnings` exists; rebuild with severity levels (`minor`, `moderate`, `major`, `critical`), incident date, witness logging, employee acknowledgement tracking, and written response records. |
| **HR-LC-05** | `/hr/lifecycle/resignations` | PT | **REFACTOR & EXTEND** | Legacy `/resignation` exists; rebuild in canonical `/hr/lifecycle/resignations` with policy LWD vs requested LWD, counter-offer tracking, withdrawal handling, and 1-click Exit Case creation (`HR-LC-09`). |
| **HR-LC-06** | `/hr/lifecycle/terminations` | PT | **REFACTOR & EXTEND** | Legacy `/termination` exists; rebuild with strict RBAC authorization, termination categories (`misconduct`, `performance`, `redundancy`, `contract_end`, `absconding`), severance details, rehire eligibility toggle, and scheduled user deactivation. |
| **HR-LC-07** | `/hr/lifecycle/trips` | NS | **NEW IMPLEMENTATION** | Business travel request and expense settlement console: travel dates, destination, mode, itinerary, cash advance request, bill attachments, and expense claim linkage. |
| **HR-LC-08** | `/hr/lifecycle/complaints` | NS | **NEW IMPLEMENTATION** | Confidential grievance and workplace complaint management: anonymous complainant option, investigator assignment, case notes, status progression, and strict visibility controls (complaints against an employee are never visible to that employee). |
| **HR-LC-09** | `/hr/lifecycle/exits` | PT | **REFACTOR & EXTEND** | Legacy `/offboarding` has basic checklist; rebuild in canonical `/hr/lifecycle/exits` with multi-department clearance (IT, Finance, HR, Admin, Manager), asset return verification, relieving/experience letter generation, and LWD employee deactivation. |
| **HR-LC-10** | `/hr/lifecycle/probation` | PT | **REFACTOR & EXTEND** | Legacy `/probation` has basic dates; rebuild with probation tracking, automated 15-day / 30-day alerts, evaluation review, extension workflow, confirmation approval, status transition to `CONFIRMED`, and confirmation letter generation. |
| **HR-PF-00** | `/hr/performance` | NS | **NEW IMPLEMENTATION** | Performance Management Command Center: cycle completion rate, bell curve rating distribution, goal progress metrics, high/low performer matrices, and PIP tracker. |
| **HR-PF-01** | `/hr/performance/reviews` | PT | **REFACTOR & EXTEND** | Legacy `/performance-review` exists; rebuild in canonical `/hr/performance/reviews` with multi-step review stages (self-assessment, manager assessment, calibration), indicator scorecards, overall ratings, strengths/improvements, and bulk release. |
| **HR-PF-02** | `/hr/performance/goals` | PT | **REFACTOR & EXTEND** | Legacy `/okr` exists; rebuild in canonical `/hr/performance/goals` with goal types, weights, targets, milestones, progress %, cascade/parent goals, check-ins, and phase locking. |
| **HR-PF-03** | `/hr/performance/cycles` | PT | **REFACTOR & EXTEND** | Review cycle management: annual, semi-annual, quarterly, probation cycles with phased milestones (goal-setting, self-review, manager-review, calibration, release) and status controls (`draft`, `active`, `closed`). |
| **HR-PF-04** | `/hr/performance/indicators` | PT | **REFACTOR & EXTEND** | Competency and performance indicator library: categories, weights, 5-level rubric descriptors, department/designation applicability. |
| **HR-PF-05** | `/hr/performance/goal-types` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Goal Types (`numeric`, `percentage`, `currency`, `milestone`, `boolean`) with unit labels and measurement rules. |
| **HR-PF-06** | `/hr/performance/indicator-categories` | NS | **NEW IMPLEMENTATION** | Master Data Blueprint for Indicator Categories (`technical`, `behavioral`, `leadership`, `core_values`) with default weights. |
| **ME-LC-01** | `/me/lifecycle/awards` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: My Awards display, honors, cash/gift details, and digital certificate download. |
| **ME-LC-02** | `/me/lifecycle/promotions` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Career timeline, historic designations, promotion milestones, and promotion letters. |
| **ME-LC-03** | `/me/lifecycle/transfers` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Transfer history, active relocation requests, preferred branch/department request form. |
| **ME-LC-04** | `/me/lifecycle/warnings` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Warnings issued to logged-in user, digital acknowledgement button, and formal written response submission. |
| **ME-LC-05** | `/me/lifecycle/resignation` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Resignation submission, dynamic policy LWD preview, reason input, withdrawal request, and exit interview details. |
| **ME-LC-06** | `/me/lifecycle/exit` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: My Exit tracker, clearance task progress (IT assets, handover, finance dues), relieving letter, and experience letter downloads. |
| **ME-LC-07** | `/me/lifecycle/trips` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Business travel requests, itinerary details, cash advance tracking, and expense settlement bill uploads. |
| **ME-LC-08** | `/me/lifecycle/complaints` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Confidential grievance filing (optional anonymous flag), evidence upload, status timeline tracking, and zero exposure of complaints filed against the employee. |
| **ME-PF-01** | `/me/performance/reviews` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Self-assessment submission, competency ratings, manager review feedback (once released), and review acknowledgement. |
| **ME-PF-02** | `/me/performance/goals` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: My Goals, progress sliders, check-in updates, blocker reporting, and manager comments. |
| **ME-PF-03** | `/me/performance/cycles` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Active review cycles, phase countdowns, milestone deadlines, and historical review archives. |
| **ME-PF-04** | `/me/performance/indicators` | NS | **NEW IMPLEMENTATION** | Employee Self-Service: Competency framework, behavioral expectations, and rubric descriptors by role. |

---

### 3. Database Schema Audit & Model Extensions

The existing database already contains initial schema models for `AwardType`, `Award`, `PromotionRecord`, `ProbationRecord`, `EmployeeTransfer`, `WarningType`, `DisciplinaryWarning`, `EmployeeExit`, `ExitChecklistItem`, `OkrCycle`, `OkrObjective`, `OkrKeyResult`, `OkrCheckin`, and `OkrReview`.

To deliver complete, authoritative P6 enterprise lifecycle & performance management without breaking any existing models or tests:

1. **`EmployeeEvent` (Append-Only Event Store):**
   - Stores every authoritative lifecycle transition: `id`, `tenantId`, `employeeId`, `eventType`, `effectiveDate`, `previousStateJson`, `newStateJson`, `changedFields`, `actorId`, `source`, `reason`, `referenceId`, `auditMetadataJson`, `createdAt`.
   - Never updated or deleted; forms the immutable audit trail for the employee 360 timeline.

2. **`EmployeeTrip` & `TripExpenseItem` (Business Travel):**
   - `EmployeeTrip`: `id`, `tenantId`, `employeeId`, `tripCode`, `purpose`, `destination`, `fromDate`, `toDate`, `travelMode`, `itineraryJson`, `advanceAmount`, `estimatedCost`, `status`, `approvedBy`, `approvedAt`, `settlementStatus`, `createdAt`, `updatedAt`.
   - `TripExpenseItem`: `id`, `tenantId`, `tripId`, `category`, `amount`, `receiptUrl`, `receiptDate`, `description`, `isApproved`.

3. **`EmployeeComplaint` & `ComplaintCaseNote` (Grievances):**
   - `EmployeeComplaint`: `id`, `tenantId`, `ticketCode`, `complainantId` (nullable if anonymous), `isAnonymous`, `accusedEmployeeId` (nullable), `category`, `severity`, `incidentDate`, `description`, `evidenceUrl`, `assignedInvestigatorId`, `status` (`new`, `under_review`, `investigating`, `resolved`, `closed`), `resolutionNotes`, `resolvedAt`, `createdAt`, `updatedAt`.
   - `ComplaintCaseNote`: `id`, `tenantId`, `complaintId`, `authorId`, `noteText`, `isConfidential`, `createdAt`.

4. **Performance Masters & Rubrics:**
   - `GoalTypeMaster`: `id`, `tenantId`, `name`, `code`, `measurementType` (`numeric`, `percentage`, `currency`, `milestone`, `boolean`), `unit`, `description`, `isActive`.
   - `IndicatorCategory`: `id`, `tenantId`, `name`, `code`, `description`, `defaultWeight`, `isActive`.
   - `PerformanceIndicator`: `id`, `tenantId`, `categoryId`, `name`, `code`, `description`, `weight`, `level1Desc`, `level2Desc`, `level3Desc`, `level4Desc`, `level5Desc`, `applicableDepartmentId`, `applicableDesignationId`, `isActive`.
   - `ReviewIndicatorRating`: `id`, `tenantId`, `reviewId`, `indicatorId`, `selfRating`, `selfComments`, `managerRating`, `managerComments`.
   - `PerformanceImprovementPlan` (PIP): `id`, `tenantId`, `employeeId`, `supervisorId`, `reason`, `startDate`, `endDate`, `checkpointsJson`, `expectedOutcomes`, `status` (`active`, `extended`, `successful`, `failed`), `finalRemarks`, `createdAt`, `updatedAt`.

5. **Tenant Scoping Alignment:**
   - All newly registered models will be categorized into `DIRECT_TENANT_MODELS` and `CHILD_DEPENDENT_MODELS` in `server/src/config/tenant-models.config.ts` to uphold the fail-closed multi-tenant architectural contract.

---

### 4. Integration Verification & Backward Compatibility

- **P2 Employee Service:** Lifecycle status changes directly update `employee.status`, `employee.position`, `employee.departmentId`, `employee.designationId`, and `employee.managerId` within atomic database transactions that simultaneously write an immutable `EmployeeEvent` and audit log.
- **P3 Attendance & Leave:** Transfers safely re-point employees to new branches with their corresponding regional holiday calendars, while past locked attendance periods remain strictly untouched.
- **P4 Payroll Engine:** Promotions with compensation revisions invoke P4's salary assignment services without modifying historical locked payroll runs or issued payslips.
- **P5 Recruitment Engine:** New joiners created via `createEmployeeAtomic` initialize with a `JOINED` lifecycle event, setting up a seamless handoff to P6.
