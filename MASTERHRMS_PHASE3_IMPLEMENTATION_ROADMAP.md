# MASTERHRMS — PHASE 3.0 IMPLEMENTATION ROADMAP
## Employee Experience & Workforce Lifecycle Automation

**Date:** November 12, 2026  
**Author:** Principal Full-Stack Architect & Quality Assurance Lead  
**Document Purpose:** Detailed Implementation Blueprint & Sub-Phase Execution Roadmap

---

## 1. Roadmap Overview & Sequencing

Phase 3 introduces employee experience capabilities and lifecycle automation built upon the solid foundation established in Phase 2. 

The sub-phases are sequenced to maximize architectural reuse, maintain system stability, and deliver rapid incremental value:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 3 EXECUTION TIMELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────┐
  │  PHASE 3.1: Employee Self-Service Request Centre                      │
  │  • Composite change payloads (banking, address, emergency, tax)       │
  │  • Multi-state lifecycle (Draft -> Submitted -> Correction -> Appr)   │
  │  • HR central review inbox & ESS request portal UI                    │
  └───────────────────────────────────┬───────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────┐
  │  PHASE 3.2: Document Expiry & Compliance Automation                   │
  │  • Daily automated expiry background cron                             │
  │  • 30d/15d/7d multi-party notification triggers                       │
  │  • Document compliance dashboard & department stats                   │
  │  • Superseding document renewal flow                                  │
  └───────────────────────────────────┬───────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────┐
  │  PHASE 3.3: Probation & Contract Automation                           │
  │  • Manager evaluation & rating workflow                               │
  │  • Automated Confirmation Letter generation via DocumentTemplate      │
  │  • Contract renewal workflow & milestone notifications                │
  └───────────────────────────────────┬───────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────┐
  │  PHASE 3.4: Org Chart & Reporting Hierarchy Enhancements              │
  │  • Reporting manager reallocation request flow                        │
  │  • Integration with circular cycle validator                          │
  │  • Manager transfer history timeline in Employee 360                  │
  └───────────────────────────────────┬───────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────┐
  │  PHASE 3.5: Employee Intelligence Dashboard                           │
  │  • Unified workforce intelligence API endpoint                        │
  │  • Lifecycle horizon aggregations (probations & contracts)            │
  │  • Profile health score calculation (completeness rating)             │
  │  • Executive intelligence dashboard UI                                │
  └───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sub-Phase 3.1: Employee Self-Service Request Centre

### 2.1. Objectives & Scope
Allow employees to submit profile changes (personal info, address, emergency contact, banking, tax/identity) from their self-service portal, track request lifecycles, respond to correction requests, and route changes through manager and HR approval before updating the official `Employee` record.

### 2.2. Architectural Flow
```
[ Employee ]
     │ 1. Submits Change (Banking, Address, Tax, etc.) + Proof File
     ▼
[ Backend: POST /api/v1/me/profile/change-requests ]
     │ 2. Validates Zod schema & snapshots old values from Employee
     │ 3. Writes EmployeeChangeRequest (status: 'PENDING')
     │ 4. Dispatches Notification to Manager / HR
     ▼
[ Manager / HR Review Inbox: GET /api/v1/hr/profile-changes ]
     │ 5. Compares Old vs New values side-by-side & views proof file
     ├── Action A: Request Correction ──> Employee resubmits (status: 'CORRECTION_REQUESTED')
     ├── Action B: Reject ──────────────> Terminated with comments (status: 'REJECTED')
     └── Action C: Approve ─────────────> Atomic DB Transaction:
                                           • Updates official Employee table
                                           • Marks request 'APPROVED'
                                           • Logs immutable audit mutation
                                           • Sends confirmation alert to Employee
```

### 2.3. Concrete Task Checklist
- [ ] **Backend Services & Routes (`server/src/`)**:
  - [ ] Refactor `POST /api/v1/me/profile/change-requests` to accept compound object payloads (`banking`, `address`, `emergency_contact`, `tax_identity`).
  - [ ] Add `PUT /api/v1/me/profile/change-requests/:id` for employee edits on `DRAFT` or `CORRECTION_REQUESTED` items.
  - [ ] Add `DELETE /api/v1/me/profile/change-requests/:id` for request cancellation.
  - [ ] Add `GET /api/v1/hr/profile-changes` with filters (`status`, `fieldCategory`, `departmentId`, `dateRange`).
  - [ ] Add `POST /api/v1/hr/profile-changes/:id/action` supporting `approve`, `reject`, and `request_correction`.
  - [ ] Implement atomic update logic applying approved payloads to target `Employee` columns.
  - [ ] Mask sensitive banking and tax information for unauthorized viewers.
- [ ] **Frontend Implementation (`src/` & `CMS/`)**:
  - [ ] Create ESS portal page `/me/requests` (or `/me/profile/requests`) with category tabs, request submission dialogs, proof upload picker, and request history timeline.
  - [ ] Create HR Admin page `/hr/requests/profile-changes` with search, category filtering, before/after diff cards, and review action modal.
  - [ ] Add notification badge count to sidebar navigation for pending change requests.

### 2.4. Acceptance Criteria
1. Submitting a banking change with bank name, account number, IFSC, and proof file records a single atomic request in `employee_change_requests`.
2. Old values are accurately snapshotted; sensitive account numbers are masked in list view.
3. HR reviewer can click "Request Correction" with comments; request moves to `CORRECTION_REQUESTED`; employee receives an in-app alert.
4. Employee edits and resubmits; request returns to `PENDING`.
5. Upon approval, official `Employee` table is updated immediately, and change is reflected across all 15 Employee 360 tabs.
6. Multi-tenant isolation verified: Tenant A HR cannot see or act upon Tenant B change requests.

---

## 3. Sub-Phase 3.2: Document Expiry & Compliance Automation

### 3.1. Objectives & Scope
Automate the tracking of time-sensitive employee documents (passports, visas, certifications, driving licenses, contracts), dispatch automated expiry warnings at 30/15/7-day intervals, provide an executive compliance dashboard, and support superseding document renewal.

### 3.2. Concrete Task Checklist
- [ ] **Background Processing**:
  - [ ] Create `server/src/cron/document-expiry.cron.ts` running daily at `02:00 UTC`.
  - [ ] Query active/verified `CompanyDocument` records with `expiryDate`.
  - [ ] Automatically transition past-due documents from `active` to `expired`.
  - [ ] Send 30-day, 15-day, 7-day, and day-of notifications to employee, reporting manager, and HR.
  - [ ] Implement deduplication tracking so reminders are triggered only once per milestone.
- [ ] **Backend APIs**:
  - [ ] Create `GET /api/documents/compliance-stats` returning total required vs submitted, compliance %, expiring soon count, expired count, and breakdown by department.
  - [ ] Create `POST /api/documents/:id/renew` to upload a replacement document, mark predecessor as `superseded`, and queue new file for verification.
- [ ] **Frontend Implementation**:
  - [ ] Build Document Compliance Dashboard (`/hr/documents/compliance`) with KPI stat cards, compliance donut chart, and department breakdown table.
  - [ ] Add "Expiring Soon" and "Expired" filter badges to Employee 360 Documents tab (`EmployeeDocumentsTab.tsx`).
  - [ ] Add direct "Renew Document" button in employee portal document view.

### 3.3. Acceptance Criteria
1. Background cron accurately identifies documents expiring in <= 30 days and dispatches alerts.
2. Expired documents transition to `expired` status and display an amber/red badge.
3. Department compliance % correctly reflects `(verifiedRequiredDocs / totalRequiredDocs) * 100`.
4. Uploading a renewal supersedes the previous document while preserving audit history.

---

## 4. Sub-Phase 3.3: Probation & Contract Automation

### 4.1. Objectives & Scope
Enhance the existing probation management system (`ProbationRecord`, `LifecycleService`) by adding structured manager evaluation forms, automated generation of official Employment Confirmation Letters upon confirmation, contract renewal tracking, and milestone alerts.

### 4.2. Concrete Task Checklist
- [ ] **Backend Services**:
  - [ ] Create `server/src/cron/probation-contract-expiry.cron.ts` running daily at `02:30 UTC`.
  - [ ] Add `POST /api/v1/hr/lifecycle/probation/:id/manager-review` allowing managers to rate performance, attendance, and conduct with a recommendation.
  - [ ] Update `LifecycleService.confirmProbation` to trigger `DocumentService.generateLetter` when a confirmation letter template exists.
  - [ ] Add `POST /api/documents/contracts/:id/renew` for seamless contract extension with updated compensation and dates.
- [ ] **Frontend Implementation**:
  - [ ] Enhance `/hr/lifecycle/probation` in TanStack and CMS:
    - [ ] Add "Manager Evaluation" drawer showing manager ratings and comments.
    - [ ] Add "Preview Confirmation Letter" button in Confirm Dialog.
  - [ ] Add "Renew Contract" action modal to `/hr/documents/contracts`.

### 4.3. Acceptance Criteria
1. Manager can submit an evaluation review for an employee approaching probation end date.
2. Confirming an employee in HR generates a formal `GeneratedLetter` record with rendered template variables (Name, Employee ID, Confirmation Date, Title).
3. The generated letter is automatically accessible under the employee's Document Vault.
4. Contract renewal archives previous contract as `completed` and creates new active contract record.

---

## 5. Sub-Phase 3.4: Org Chart & Reporting Hierarchy Enhancements

### 5.1. Objectives & Scope
Leverage the existing 90% complete `OrganizationTreeService`, `validateReportingHierarchy`, and `interactive-org-tree.tsx` components to introduce a formal Reporting Manager Change Request workflow with effective dates, approval routing, and manager transfer history.

### 5.2. Concrete Task Checklist
- [ ] **Backend Services**:
  - [ ] Create `POST /api/v1/organization/manager-change-request` accepting `employeeId`, `newManagerId`, `effectiveDate`, and `reason`.
  - [ ] Validate new manager using `validateReportingHierarchy` to guarantee zero circular reporting loops before saving.
  - [ ] Save request in `EmployeeTransfer` with status `PENDING`.
  - [ ] Create approval handler updating `Employee.managerId` when effective date arrives and request is approved.
  - [ ] Add `GET /api/v1/organization/manager-transfers/:employeeId` returning manager reallocation history.
- [ ] **Frontend Implementation**:
  - [ ] Add "Change Reporting Manager" action button in Org Tree profile slide-over drawer (`interactive-org-tree.tsx`).
  - [ ] Display manager history timeline in Employee 360 "Employment" tab.

### 5.3. Acceptance Criteria
1. Submitting a manager change that would create a circular loop (A -> B -> A or A -> B -> C -> A) is rejected with clear error messages from `validateReportingHierarchy`.
2. Valid manager transfers create an `EmployeeTransfer` record and update the Org Tree upon approval.
3. Realtime tree updates without requiring full page reload.

---

## 6. Sub-Phase 3.5: Employee Intelligence Dashboard

### 6.1. Objectives & Scope
Provide HR leadership and executives with an aggregated workforce analytics view synthesizing headcount dynamics, lifecycle horizons, document compliance health, employee profile completeness scores, and demographic tenure breakdowns.

### 6.2. Concrete Task Checklist
- [ ] **Backend Services**:
  - [ ] Create `EmployeeIntelligenceService` in `server/src/services/employee-intelligence.service.ts`.
  - [ ] Implement `getEmployeeIntelligence(tenantId)` calculating:
    - Headcount dynamics & 12-month joiner vs leaver trends.
    - Upcoming milestones (probations ending in 30/60d, contracts expiring in 30/60d).
    - Tenant document compliance score.
    - Employee Profile Completeness score algorithm (weighted: Personal 25%, Emergency 20%, Banking 25%, Documents 30%).
    - Tenure bracket distribution (<1 yr, 1-3 yrs, 3-5 yrs, 5+ yrs).
  - [ ] Add `GET /api/dashboard/employee-intelligence` route with RBAC protection (`hrm.analytics:view`).
- [ ] **Frontend Implementation**:
  - [ ] Build `/hr/analytics/workforce-intelligence` in TanStack and CMS using `StatCard`, Chart components, and Radix UI.
  - [ ] Include quick-action links to pending change requests, expiring probations, and non-compliant documents.

### 6.3. Acceptance Criteria
1. Dashboard loads within < 500ms using efficient Prisma aggregations (`groupBy`, `count`, indexed filters).
2. Profile health score accurately identifies employees with missing bank accounts, emergency contacts, or mandatory documents.
3. Visual charts display clean responsive layouts matching the application design system.

---

## 7. Quality Assurance & Risk Management

### 7.1. Quality Assurance Verification Gates
1. **Zero Database DDL**: Confirm no Prisma schema changes or database migrations are run during Phase 3.
2. **Multi-Tenant Isolation**: Automated tests verify that Tenant A users cannot access Tenant B change requests, compliance stats, or tree nodes.
3. **Sensitive Data Protection**: Automated tests assert that banking account numbers and tax IDs are masked unless requesting user has `hrm.employees.sensitive:view`.
4. **Audit Trail Completeness**: Assert that every lifecycle change emits an `audit_logs` record with valid before/after diffs.
5. **No Visual Regression**: Run TanStack and CMS build checks (`tsc` & `vite build` / `next build`) to ensure zero type or bundling errors.

### 7.2. Risk Mitigation Matrix

| Potential Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Circular Manager Reporting** | High | Strictly enforce `validateReportingHierarchy` at both API submission and approval execution. |
| **Sensitive Bank / Tax Exposure** | Critical | Enforce field-level data masking in service serialization layer before sending JSON responses. |
| **Notification Flooding from Cron** | Medium | Implement notification deduplication table / flag checks; only trigger alerts once per milestone threshold (30d, 15d, 7d). |
| **Double Approval Race Conditions** | Medium | Use atomic Prisma transactions (`prisma.$transaction`) with optimistic concurrency checks on request status. |
| **High Query Load on Org Tree** | Low | Tree queries use indexed `tenantId`, `managerId`, and `status`; caching applied if team size exceeds 5,000. |

---

## 8. Implementation Readiness Verdict

The codebase audit is **100% complete**. All architectural gaps, existing reusable assets, and API routes have been identified. 

**Recommendation:** Proceed immediately with **Sub-Phase 3.1: Employee Self-Service Request Centre**.

