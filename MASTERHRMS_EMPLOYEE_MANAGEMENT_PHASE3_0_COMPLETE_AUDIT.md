# MASTERHRMS – EMPLOYEE MANAGEMENT PHASE 3.0
## Employee Experience & Workforce Lifecycle Automation – Complete Feature Gap Audit

**Date:** November 12, 2026  
**Auditor:** Principal Full-Stack Architect & Quality Assurance Lead  
**Audit Scope:** Phase 3.0 Pre-Implementation Gap Analysis (Audit-Only)  
**Target Areas:**
1. Phase 3.1: Employee Self-Service Request Centre
2. Phase 3.2: Document Expiry & Compliance Automation
3. Phase 3.3: Probation & Contract Automation
4. Phase 3.4: Organization Chart & Reporting Hierarchy
5. Phase 3.5: Employee Intelligence Dashboard

---

## 1. Executive Summary

Phase 2 established a solid enterprise foundation: 15-tab consolidated Employee 360 profile, unified document management, tenant-scoped unique employee codes and emails, and standard pagination/export tooling. 

This Phase 3.0 pre-implementation audit evaluated the entire codebase (TanStack Start, Next.js 15 CMS, Express backend, Prisma schema, and Supabase PostgreSQL) to determine the exact degree of feature completion across the five proposed Phase 3 areas.

### High-Level Status Summary

| Phase | Feature Module | Current Status | Codebase Reality |
| :--- | :--- | :--- | :--- |
| **Phase 3.1** | **Employee Self-Service Request Centre** | **Partial** | Backend has raw `EmployeeChangeRequest` model and basic single-field endpoints (`POST /api/v1/me/profile/change-requests`), but lacks compound payload handling (bank, address, emergency contact, tax), multi-state lifecycle (`DRAFT`, `CORRECTION_REQUESTED`), HR queue, and multi-step `WorkflowDefinition` integration. |
| **Phase 3.2** | **Document Expiry & Compliance Automation** | **Partial** | `CompanyDocument` and `DocumentType` models already feature `expiryDate`, `status`, and `isRequired`. However, there is no automated daily expiry scheduler, no 30/15/7-day notification triggers, and no Document Compliance Dashboard metrics. |
| **Phase 3.3** | **Probation & Contract Automation** | **Partial** | `ProbationRecord` and `EmployeeContract` models exist; `LifecycleService` already implements probation extension (capped at 180 days) and confirmation; UI pages exist in both TanStack and CMS (`/hr/lifecycle/probation`). What is missing: automated confirmation letter issuance (`GeneratedLetter`), manager pre-review workflow, contract renewal lifecycle, and advance reminder cron. |
| **Phase 3.4** | **Organization Chart & Reporting Hierarchy** | **Substantially Complete (90%)** | `OrganizationTreeService` already generates complete multi-level tree hierarchies with direct/total report counts; interactive canvas components (`interactive-org-tree.tsx`) exist in TanStack & CMS; deep circular reporting prevention is implemented via `validateReportingHierarchy`. Missing: explicit "Reporting Manager Change Request" lifecycle with audit history and effective dates. |
| **Phase 3.5** | **Employee Intelligence Dashboard** | **Partial** | Operational headcount and attendance metrics exist in `GET /api/dashboard/hrm` and `SmartDashboardService`. Missing: consolidated workforce intelligence aggregating probation horizons, contract expiries, document compliance percentages, profile health scoring, and department movement trends. |

---

## 2. Deep-Dive Findings by Feature Area

### 2.1. Phase 3.1 – Employee Self-Service Request Centre

#### What Already Works
- **Database Model**: `model EmployeeChangeRequest` exists in `server/prisma/schema.prisma` (mapped to `employee_change_requests`) with fields: `id`, `tenantId`, `employeeId`, `fieldCategory`, `fieldKey`, `oldValueJson`, `newValueJson`, `proofMediaId`, `status`, `reviewedBy`, `reviewedAt`, `reviewComments`, and `createdAt`.
- **ESS Submission**: `POST /api/v1/me/profile/change-requests` accepts change requests for `bank`, `personal`, `statutory`, and `address`, snapshots the old value from `Employee`, creates the change request record, and logs an audit mutation.
- **ESS Listing**: `GET /api/v1/me/profile/change-requests` returns the calling employee's change requests.
- **Manager Inline Action**: `POST /api/v1/me/team/profile-changes/:id/action` allows a manager or HR admin to `approve` or `reject`. When approved, it updates the `Employee` table for allowed fields (`pan`, `aadhaar`, `uan`, `esiNumber`, `pfNumber`, `bankName`, `bankAccount`, `bankIfsc`, `bankBranch`, addresses).
- **Physical Columns on Employee**: `Employee` already contains all individual target columns: `dateOfBirth`, `gender`, `pan`, `aadhaar`, `uan`, `bankName`, `bankAccount`, `bankIfsc`, `bankBranch`, `emergencyContactName`, `emergencyContactRelationship`, `emergencyContactPhone`, `presentAddress`, `permanentAddress`, `fatherOrSpouseName`.

#### What Is Missing / Deficiencies
- **Single-Field Limitation**: The current API only updates a single column (`fieldKey`) per request. Submitting an address requires 5 separate requests, or banking requires 4 separate requests. It must support composite objects (e.g., `fieldCategory: "banking"`, where `newValueJson` contains `{ bankName, bankAccount, bankIfsc, bankBranch }`).
- **Missing Lifecycle States**: Currently only `PENDING`, `APPROVED`, and `REJECTED` are handled. The prompt requires `DRAFT`, `SUBMITTED`, `PENDING`, `CORRECTION_REQUESTED`, `APPROVED`, `REJECTED`, and `CANCELLED`. Because `status` is `@db.VarChar(20)`, all these values fit without DDL changes.
- **Generic Workflow Engine Bypass**: Currently, `POST /me/team/profile-changes/:id/action` performs an ad-hoc 1-step check. It does not integrate with `WorkflowDefinition` / `ApprovalRequest` / `ApprovalAction` / `WorkflowService`.
- **No HR Admin Queue**: There is no dedicated HR endpoint or UI screen to view tenant-wide profile change requests with before/after comparisons, proof document viewing, and filtering.
- **Correction Requested Loop**: Reviewers cannot return a request for employee correction, and employees cannot edit and resubmit.
- **No Frontend Request Centre**: Neither TanStack nor CMS has a dedicated `/me/requests` or `/me/profile/requests` UI page.

---

### 2.2. Phase 3.2 – Document Expiry & Compliance Automation

#### What Already Works
- **Database Schema**: `CompanyDocument` includes `expiryDate DateTime? @db.Date`, `status @db.VarChar(50)`, `documentTypeId`, `verifiedBy`, `verifiedAt`, `requiresSignature`, and relations to `DocumentType` and `Employee`.
- **Document Types**: `DocumentType` table contains `isRequired Boolean`, `isActive Boolean`, `name`, and `code`.
- **Verification Workflows**: `POST /api/documents/:id/verify` and `POST /api/documents/:id/reject` are implemented with server-side RBAC (`hr:documents:verify`), mandatory rejection reasons, and audit logging.
- **File Manager Integration**: Documents are backed by `MediaFile` and can be versioned via `file_versions`.
- **ESS Document Request**: `POST /api/v1/me/documents/request` exists for letters and custom document requests.

#### What Is Missing / Deficiencies
- **No Automated Expiry Scheduler**: There is no background job scanning `CompanyDocument.expiryDate` to transition status to `expired` or trigger notifications.
- **No Configurable Reminder Thresholds**: Missing 30-day, 15-day, 7-day, day-of, and overdue reminder dispatches to employee, manager, and HR.
- **No Document Compliance Dashboard**: Missing aggregation calculating:
  - Expiring Soon (< 30 days)
  - Already Expired
  - Verification Pending
  - Required vs Submitted Compliance % per tenant and per department
- **No Seamless Document Renewal Lifecycle**: When an employee uploads a replacement document for an expiring or expired document, there is no linking to supersede the previous document while preserving audit and verification history.

---

### 2.3. Phase 3.3 – Probation & Contract Automation

#### What Already Works
- **Database Models**:
  - `ProbationRecord`: has `startDate`, `endDate`, `probationPeriodDays`, `status`, `performanceRating`, `remarks`, `extendedUntil`, `confirmedAt`.
  - `EmployeeContract`: has `startDate`, `endDate`, `salary`, `status`, `contractTypeId`.
  - `ContractType`: has `name`, `description`, `status`.
- **Service Logic in `LifecycleService`**:
  - `extendProbation`: verifies existing status, enforces maximum cumulative 180 days, updates `probationPeriodDays` and `extendedUntil`, records previous state in audit mutation.
  - `confirmProbation`: sets status to `confirmed`, records `performanceRating` and `remarks`, creates `employee_events` record, and issues in-app notification to employee.
- **Frontend Management Screens**: Both TanStack (`src/routes/_authenticated/hr/lifecycle/probation.tsx`) and CMS (`CMS/src/app/(workspace)/hr/lifecycle/probation/page.tsx`) already feature complete UI with stat cards, active/confirmed tables, Extend Dialog, and Confirm Dialog.
- **Contract Endpoints**: `hrDocumentsRouter` supports CRUD on `/contracts` and `/contract-types`.

#### What Is Missing / Deficiencies
- **No Automated Confirmation Letter**: When an employee is confirmed, a formal confirmation letter is not generated. The system already has `GeneratedLetter` and `DocumentTemplate` but does not trigger generation upon confirmation.
- **No Pre-Confirmation Manager Review**: HR currently confirms or extends directly without a structured manager evaluation step (performance, attendance, conduct remarks).
- **No Automated Contract Renewal Lifecycle**: Contracts expire without an automated renewal workflow, manager recommendation, or contract document replacement.
- **No Probation / Contract Expiry Reminders**: No automated advance cron alerts (e.g., 30d, 15d, 7d before probation or contract end).

---

### 2.4. Phase 3.4 – Organization Chart & Reporting Hierarchy

#### What Already Works
- **Service Layer (`OrganizationTreeService`)**:
  - `getEmployeeHierarchy`: recursively builds multi-level hierarchy trees, computes `directReportsCount` and `totalTeamSize` per node, supports search and department filtering while preserving ancestor navigation paths.
  - `getDepartmentHierarchy`: aggregates department trees, heads, active employee counts, and designations.
  - `getHierarchySummary`: returns total nodes, max tree depth, department counts, and root node identifiers.
  - `getEmployeeTreeDetail`: returns comprehensive slide-over drawer profile.
- **Hierarchy Validation (`validateReportingHierarchy`)**:
  - Blocks self-reporting (`employeeId === managerId`).
  - Blocks inactive/terminated employee manager assignment.
  - Blocks cross-tenant manager assignment.
  - Detects and rejects direct circular loops (A -> B -> A).
  - Detects and rejects deep transitive circular loops (A -> B -> C -> D -> A).
- **Frontend Canvas UI**: `interactive-org-tree.tsx` in both TanStack and CMS provides responsive tree canvas, SVG connectors, zoom/pan navigation, search highlight, and slide-over profile drawers.
- **Historical Transfer Model**: `EmployeeTransfer` already has `oldManagerId`, `newManagerId`, `effectiveDate`, `reason`, and `status`.

#### What Is Missing / Deficiencies
- **Reporting Manager Change Request Workflow**: There is no dedicated API/UI for an employee or manager to formally request a reporting manager change, route it to HR for approval, and apply it on an effective date while archiving manager history in `EmployeeTransfer`.

---

### 2.5. Phase 3.5 – Employee Intelligence Dashboard

#### What Already Works
- **HRM Hub Realtime Metrics**: `GET /api/dashboard/hrm` aggregates total workforce, active employees, headcount, new employees this month, today's attendance, on leave today, and pending leaves.
- **Executive Analytics**: `SmartDashboardService` provides tenant-scoped revenue and headcount aggregates.
- **Employee 360 Aggregations**: `EmployeeService.getEmployee360` consolidates all 15 operational facets.

#### What Is Missing / Deficiencies
- **Consolidated Workforce Intelligence**: Missing a dedicated endpoint (`/api/dashboard/employee-intelligence`) that computes:
  1. **Workforce Dynamics**: Active vs inactive vs probation headcount, new joiners vs exits by month.
  2. **Lifecycle Milestones**: Probations ending in 30/60 days, confirmations pending, contracts expiring in 30/60 days, contract renewals pending.
  3. **Document Compliance Metrics**: Expiring soon count, expired count, pending verification count, required document compliance % by department.
  4. **Employee Profile Health**: Profile completeness score (0–100%) based on missing emergency contacts, missing banking details, missing tax/identity, and missing required documents.
  5. **Demographic & Tenure Distribution**: Headcount breakdown by department, branch, employment type, and tenure brackets (<1 yr, 1-3 yrs, 3-5 yrs, 5+ yrs).

---

## 3. Architecture & Security Assessment

### 3.1. Database Schema Impact: Zero Migrations Required
The physical Supabase PostgreSQL schema already possesses all required models and columns:
- `employee_change_requests`: status is `@db.VarChar(20)`, values are stored in JSON strings (`old_value_json`, `newValueJson`), and proof is linked via `proof_media_id`.
- `company_documents`: has `expiry_date`, `status @db.VarChar(50)`, `document_type_id`, `verified_by`, `verified_at`.
- `document_types`: has `is_required`, `is_active`, `code`.
- `probation_records`: has `start_date`, `end_date`, `probation_period_days`, `status`, `extended_until`, `confirmed_at`.
- `employee_contracts`: has `start_date`, `end_date`, `salary`, `status`, `contract_type_id`.
- `employee_transfers`: has `old_manager_id`, `new_manager_id`, `effective_date`, `reason`, `status`.
- `workflow_definitions` & `approval_requests`: polymorphic `entityType` and `entityId` dynamically support `EmployeeChangeRequest`, `ProbationRecord`, `EmployeeContract`, and `EmployeeTransfer`.

**Conclusion:** Phase 3 can be implemented with **zero additive database migrations and zero DDL changes**.

### 3.2. Multi-Tenant Isolation & Security
1. **Tenant Filtering**: All queries must enforce `tenantId` matching via request context (`req.user.tenantId`).
2. **ESS Ownership**: Employees may only view and submit requests for their own `employeeId`.
3. **Sensitive Data Masking**: Banking details (account numbers) and tax IDs (PAN, Aadhaar) must be masked in list views and outbox events, visible in plaintext only to authorized HR personnel (`hrm.employees.sensitive:view`).
4. **Segregation of Duties**: An employee cannot approve their own change request or probation review.
5. **Audit Logging**: Every transition (`SUBMIT`, `CORRECTION_REQUESTED`, `APPROVE`, `REJECT`, `EXTEND`, `CONFIRM`, `RENEW`) must write to `audit_logs` and publish to `outbox_events`.

---

## 4. Reusable Services & Components Catalog

| System Capability | Existing Implementation | How Phase 3 Reuses It |
| :--- | :--- | :--- |
| **Approval Engine** | `WorkflowService` & `ApprovalRequest` | Direct integration for profile change approvals, probation confirmations, and manager changes. |
| **Outbox & Events** | `OutboxService.createOutboxEvent` | Publishing lifecycle notifications (`profile.change_requested`, `document.expired`, `probation.confirmed`). |
| **Realtime Notifications** | `NotificationService.createNotification` | In-app alerts, push notifications, and room broadcasting for requests and expiry warnings. |
| **Audit Logging** | `AuditService.logMutation` | Immutable recording of every request lifecycle action and before/after snapshot. |
| **Letter Generation** | `DocumentService.generateLetter` & `GeneratedLetter` | Issuing formal Confirmation Letters upon probation completion. |
| **File Management** | `FilesService` & `MediaFile` | Storing proof attachments for bank/PAN changes and renewed documents. |
| **Hierarchy Validator** | `validateReportingHierarchy` | Preventing circular dependencies during reporting manager change requests. |
| **Cron Scheduling** | Background timed schedulers in `server/src/cron/` | Daily automated document and probation expiry scans. |
| **UI Components** | Radix UI, `StatCard`, `PageHeader`, `StandardPagination` | Standardized tables, dialogs, badges, and dashboard widgets across TanStack and CMS. |

---

## 5. Audit Recommendations & Sub-Phase Order

Based on existing foundational assets and business priority:

1. **Phase 3.1: Employee Self-Service Request Centre** — Highest employee engagement impact; model and rudimentary endpoints exist; needs composite payload support, workflow engine integration, and HR review interface.
2. **Phase 3.2: Document Expiry & Compliance Automation** — High compliance and legal value; models exist; needs cron scheduler, reminder dispatch, and compliance dashboard.
3. **Phase 3.3: Probation & Contract Automation** — High lifecycle value; service methods and basic UI exist; needs confirmation letter generation, manager evaluation flow, and contract renewal wiring.
4. **Phase 3.4: Reporting Manager Change Workflow** — Low complexity because `OrganizationTreeService`, `validateReportingHierarchy`, and `interactive-org-tree.tsx` are already 90% built; only needs the formal change request & transfer history flow.
5. **Phase 3.5: Employee Intelligence Dashboard** — Best completed last as it consumes aggregated data produced by Phases 3.1 through 3.4.

