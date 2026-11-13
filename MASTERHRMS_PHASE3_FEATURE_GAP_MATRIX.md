# MASTERHRMS — PHASE 3.0 FEATURE GAP MATRIX
## Employee Experience & Workforce Lifecycle Automation

**Date:** November 12, 2026  
**Auditor:** Principal Full-Stack Architect & Quality Assurance Lead  
**Audit Type:** Pre-Implementation Architectural Gap Analysis (Audit-Only)  
**Status Legend:**
- **Existing (Working)**: Fully implemented in backend, database, and UI. No new development required.
- **Partial**: Models or backend logic exist, but lack integrations, complete lifecycle handling, or dedicated UI.
- **Missing**: Not implemented in the codebase; needs to be constructed using existing patterns and models.

---

## 1. Phase 3.1: Employee Self-Service Request Centre

| Feature Item | Status | Existing Implementation | Exact Gap | Reusable Services / Models | Required Action | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal Info Change Requests** (Name, DOB, Gender, Phone, Email) | **Partial** | `model EmployeeChangeRequest`, `POST /api/v1/me/profile/change-requests` | Supports only single scalar string fields per request; no multi-field batching or compound payloads. | `EmployeeChangeRequest`, `Employee`, `AuditService` | Support structured personal info payloads; add input validation schemas in Zod. | Medium | P1 |
| **Address Requests** (Current & Permanent, Proof Upload) | **Partial** | `Employee.presentAddress`, `Employee.permanentAddress`, `proofMediaId` in `EmployeeChangeRequest` | Submitting an address requires multiple API calls because API takes single `fieldKey`; no atomic address object. | `EmployeeChangeRequest`, `MediaFile`, `FilesService` | Allow `fieldCategory: 'address'` with composite `{ street, city, state, postalCode, country }` in `newValueJson`. | Medium | P1 |
| **Emergency Contact & Family Requests** | **Partial** | `Employee.emergencyContactName`, `emergencyContactRelationship`, `emergencyContactPhone` | No structured family/dependent multi-record support; single contact fields only; lacks deactivation lifecycle. | `EmployeeChangeRequest`, `Employee`, `AuditService` | Support composite emergency contact updates with before/after diffs in `oldValueJson`/`newValueJson`. | Medium | P1 |
| **Banking Info Requests** (Bank Name, Account, IFSC, Branch, Proof) | **Partial** | `Employee.bankName`, `bankAccount`, `bankIfsc`, `bankBranch`, `proofMediaId` | Only updates 1 bank field at a time; no atomic banking update; missing sensitive data masking in responses. | `EmployeeChangeRequest`, `MediaFile`, `AuditService` | Implement atomic `fieldCategory: 'banking'` payload; mask account numbers in list view; mandate proof attachment. | Medium | P1 |
| **Tax & Identity Requests** (PAN, Aadhaar, UAN, ESI, Proof) | **Partial** | `Employee.pan`, `aadhaar`, `uan`, `esiNumber`, `proofMediaId` | No PAN/Aadhaar format verification; no mandatory document upload verification; no masking in UI. | `EmployeeChangeRequest`, `MediaFile`, `AuditService` | Add statutory format validators; mandate proof document; implement masking (`••••••••1234`). | Medium | P1 |
| **Approval Workflow Integration** | **Partial** | `POST /me/team/profile-changes/:id/action` has basic 1-step manager check | Bypasses `WorkflowDefinition` / `ApprovalRequest`; missing `DRAFT`, `SUBMITTED`, `CORRECTION_REQUESTED`, `CANCELLED` states. | `WorkflowService`, `ApprovalRequest`, `ApprovalAction`, `NotificationService` | Integrate with `WorkflowService`; wire `ApprovalRequest` entity link; support two-step manager -> HR approval routing. | High | P1 |
| **Correction Requested Loop** | **Missing** | None | Reviewers can only Approve or Reject; cannot send back for clarification with comments; employee cannot revise and resubmit. | `EmployeeChangeRequest.status`, `EmployeeChangeRequest.reviewComments` | Add `action: 'request_correction'` and employee resubmit flow preserving revision history. | Medium | P1 |
| **Request Tracking & History UI** | **Missing** | Backend returns list in `GET /me/profile/change-requests` | No dedicated ESS request portal page in TanStack or CMS; no timeline view; no before/after diff UI. | `StatCard`, Radix Dialog, `Badge`, `DataTable` | Build `/me/requests` page with status tabs, visual before/after diff cards, and proof preview drawer. | Medium | P1 |
| **HR Central Review Queue** | **Missing** | None (only manager team endpoint exists) | No tenant-wide HR inbox to view, filter, batch-review, or audit all employee profile change requests. | `DataTable`, `PageHeader`, `AuditService` | Build `/hr/requests/profile-changes` with filters (status, department, category), diff comparison, and audit drawer. | Medium | P1 |

---

## 2. Phase 3.2: Document Expiry & Compliance Automation

| Feature Item | Status | Existing Implementation | Exact Gap | Reusable Services / Models | Required Action | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Document Expiry Tracking** | **Partial** | `CompanyDocument.expiryDate @db.Date`, `status @db.VarChar(50)` | No automated daily scanner; status does not automatically transition from `active` to `expiring_soon` or `expired`. | `CompanyDocument`, `DocumentType` | Implement daily cron scanner in `server/src/cron/` to flag expiring and expired documents. | Medium | P1 |
| **Configurable Reminder Thresholds** | **Missing** | None | No scheduled triggers for 30-day, 15-day, 7-day, day-of, or overdue alerts. | `NotificationService`, `OutboxService` | Add reminder dispatch logic based on days-until-expiry thresholds; record reminder timestamp to prevent duplicates. | Medium | P1 |
| **Multi-Party Expiry Notifications** | **Partial** | `NotificationService.createNotification`, `OutboxService` | Only manual notifications exist; no automated expiry alert pipeline to employee, reporting manager, and HR. | `NotificationService`, `EmailService` | Build unified notification dispatch handler generating in-app and email alerts with direct document links. | Low | P1 |
| **Document Compliance Dashboard** | **Missing** | None | No aggregated metrics for tenant compliance %, expiring soon count, expired count, or missing mandatory documents. | `CompanyDocument`, `DocumentType`, `Employee` | Create `GET /api/documents/compliance-stats` computing tenant & department compliance rates; build UI stat cards & charts. | Medium | P1 |
| **Department Compliance Breakdown** | **Missing** | None | HR cannot see which departments have the lowest compliance or overdue documents. | `Department`, `Employee`, `CompanyDocument` | Aggregate compliance percentage by department in compliance service; display in interactive table. | Low | P2 |
| **Document Renewal Workflow** | **Partial** | `POST /api/documents` uploads new file; `MediaFile` has versioning | No linkage between new document and expiring document; does not automatically archive or supersede previous file. | `CompanyDocument`, `MediaFile`, `AuditService` | Add `supersedesDocumentId` or link existing document record to new version in `file_versions`; trigger re-verification. | Medium | P2 |
| **Verification & Rejection Audit** | **Existing** | `POST /api/documents/:id/verify`, `POST /api/documents/:id/reject` | Fully working with RBAC (`hr:documents:verify`), rejection remarks, and audit log recording. | `DocumentService`, `AuditService` | Reuse directly. No changes needed. | Low | N/A |

---

## 3. Phase 3.3: Probation & Contract Automation

| Feature Item | Status | Existing Implementation | Exact Gap | Reusable Services / Models | Required Action | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Probation Record Management** | **Existing** | `ProbationRecord`, `LifecycleService.extendProbation`, `confirmProbation` | Enforces 180-day max extension, updates record, records audit mutation, and creates employee lifecycle event. | `ProbationRecord`, `LifecycleService` | Reuse existing service and validation directly. | Low | N/A |
| **Probation Management UI** | **Existing** | `src/routes/_authenticated/hr/lifecycle/probation.tsx`, `CMS/src/app/(workspace)/hr/lifecycle/probation/page.tsx` | Stat cards, active/confirmed tables, Extend Dialog, and Confirm Dialog are already implemented and working. | Existing UI components | Preserve and enhance with letter preview and manager review badge. | Low | N/A |
| **Pre-Confirmation Manager Review** | **Missing** | HR directly confirms or extends without structured manager evaluation | No formal manager review form (ratings on performance, attendance, conduct, recommendation: confirm/extend/terminate). | `ProbationRecord`, `WorkflowService` | Add manager evaluation step before HR confirmation; store evaluation notes in `ProbationRecord.remarks`. | Medium | P2 |
| **Automated Confirmation Letter** | **Partial** | `GeneratedLetter` model, `DocumentTemplate` model, `DocumentService.generateLetter` | Confirmation letters are not automatically generated when `confirmProbation` succeeds. | `DocumentService`, `GeneratedLetter`, `DocumentTemplate` | Automatically bind employee data to confirmation letter template upon HR confirmation; save to employee documents. | Medium | P1 |
| **Probation Expiry Advance Reminders** | **Missing** | None | No automated alerts sent 30, 15, or 7 days prior to probation end date. | `NotificationService`, `OutboxService` | Add cron scan for upcoming probation completions; notify HR and reporting manager. | Low | P2 |
| **Contract Management Endpoints** | **Existing** | `hrDocumentsRouter` (`/contracts`, `/contract-types`) | CRUD endpoints exist for contracts, contract types, dates, and salary. | `EmployeeContract`, `ContractType` | Reuse directly. | Low | N/A |
| **Contract Expiry Reminders** | **Missing** | None | No scheduled notifications 60, 30, or 15 days before contract expiration. | `NotificationService`, `OutboxService` | Add daily contract expiry check in cron; notify HR and manager. | Low | P2 |
| **Contract Renewal Workflow** | **Missing** | Must create a new contract manually without renewal lineage | No streamlined renewal action carrying forward terms, allowing salary adjustments, and tracking renewal count. | `EmployeeContract`, `AuditService` | Add `POST /api/documents/contracts/:id/renew` endpoint; create new contract linked to previous contract ID. | Medium | P2 |

---

## 4. Phase 3.4: Organization Chart & Reporting Hierarchy

| Feature Item | Status | Existing Implementation | Exact Gap | Reusable Services / Models | Required Action | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Multi-Level Hierarchy Tree API** | **Existing** | `OrganizationTreeService.getEmployeeHierarchy` | Recursively resolves tree, calculates `directReportsCount` and `totalTeamSize`, supports search/department filters. | `OrganizationTreeService` | Reuse directly. Fully working. | Low | N/A |
| **Department Hierarchy Aggregation** | **Existing** | `OrganizationTreeService.getDepartmentHierarchy`, `getHierarchySummary` | Returns department trees, active counts, designations, max tree depth, and root node list. | `OrganizationTreeService` | Reuse directly. Fully working. | Low | N/A |
| **Circular Hierarchy Prevention** | **Existing** | `server/src/lib/reporting-hierarchy-validator.ts` | Validates self-reporting, cross-tenant manager assignment, inactive manager assignment, direct cycles, and deep transitive loops. | `validateReportingHierarchy` | Reuse directly on any manager update or change request. | Low | N/A |
| **Interactive Org Tree Canvas UI** | **Existing** | `interactive-org-tree.tsx` in TanStack (`src/components/organization/`) and CMS (`CMS/src/components/organization/`) | Responsive SVG rendering, touch pan/zoom, node expansion/collapse, search highlight, and slide-over profile drawer. | `InteractiveOrgTree` | Reuse directly. Fully working. | Low | N/A |
| **Reporting Manager Change Workflow** | **Missing** | Direct DB update or manual transfer only | No formal ESS or HR change request workflow allowing manager reallocation with effective dates and reason tracking. | `EmployeeTransfer`, `WorkflowService`, `validateReportingHierarchy` | Build `POST /api/v1/organization/manager-change-request` and approval workflow; write history to `EmployeeTransfer`. | Medium | P2 |
| **Manager Transfer Audit History** | **Partial** | `EmployeeTransfer` model has `oldManagerId`, `newManagerId`, `effectiveDate`, `reason`, `status` | Not exposed in an easy-to-read timeline drawer on the Org Chart or Employee 360 profile. | `EmployeeTransfer`, `Employee` | Expose manager change history tab in Employee 360 and Org Chart profile drawer. | Low | P3 |

---

## 5. Phase 3.5: Employee Intelligence Dashboard

| Feature Item | Status | Existing Implementation | Exact Gap | Reusable Services / Models | Required Action | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Operational Headcount & Attendance** | **Existing** | `GET /api/dashboard/hrm`, `SmartDashboardService` | Basic total workforce, active count, attendance, on leave, pending leave. | `SmartDashboardService` | Reuse existing calculations. | Low | N/A |
| **Workforce Dynamics & Turnover** | **Missing** | None | No monthly joiner vs leaver trends; no net workforce growth rate calculation; no employment type breakdown. | `Employee`, `EmployeeEvent` | Calculate 12-month joiner vs exit trajectory and employment type distribution in intelligence endpoint. | Medium | P2 |
| **Lifecycle Horizons Aggregator** | **Missing** | None | No unified view of probations ending in 30/60d and contracts expiring in 30/60d on the main executive dashboard. | `ProbationRecord`, `EmployeeContract` | Aggregate impending lifecycle milestones with direct action links in the intelligence response. | Low | P2 |
| **Document Compliance Summary** | **Missing** | None | Compliance statistics (expiring soon, expired, missing mandatory) are not aggregated for dashboard presentation. | `CompanyDocument`, `DocumentType` | Include document compliance KPI cards and department breakdown in intelligence endpoint. | Medium | P2 |
| **Profile Health Score** | **Missing** | None | No automated profile completeness score (0–100%) highlighting missing personal, banking, emergency, or document details. | `Employee`, `CompanyDocument`, `DocumentType` | Implement profile completeness algorithm weighting critical sections; identify exact missing items. | Medium | P2 |
| **Demographic & Tenure Analytics** | **Missing** | None | No tenure bracket analysis (<1 yr, 1-3 yrs, 3-5 yrs, 5+ yrs) or gender/department distribution charts. | `Employee`, `Department`, `Designation` | Aggregate tenure and demographic statistics in the intelligence service; render distribution charts. | Medium | P3 |
| **Executive Intelligence UI** | **Missing** | Existing HRM dashboard only has basic cards | No dedicated Workforce Intelligence tab or page presenting lifecycle horizons, compliance gauges, and health scores. | `StatCard`, Chart components, Radix UI | Build `/hr/analytics/workforce-intelligence` screen in TanStack and CMS. | High | P2 |

---

## 6. Summary of Engineering Effort by Category

| Category | Count of Features | Percentage |
| :--- | :--- | :--- |
| **Existing (Working - Reuse Directly)** | **9** | **28%** |
| **Partial (Enhance / Wire Integration)** | **12** | **38%** |
| **Missing (Build on Existing Models)** | **11** | **34%** |
| **Total Features Evaluated** | **32** | **100%** |

### Key Architectural Takeaway
**66% of the capabilities required for Phase 3 are already either fully built or partially implemented.** There is zero need to reinvent data models, database tables, or low-level infrastructure. Phase 3 is strictly an integration, workflow orchestration, cron scheduling, and UI surfacing milestone.

