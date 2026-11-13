# MASTERHRMS — PHASE 3.0 DATABASE & API IMPACT ASSESSMENT
## Employee Experience & Workforce Lifecycle Automation

**Date:** November 12, 2026  
**Auditor:** Principal Full-Stack Architect & Quality Assurance Lead  
**Assessment Scope:** Database Schema, API Routing, Background Tasks, and Security Architecture (Audit-Only)

---

## 1. Executive Database Summary: Zero Schema Migrations Required

A comprehensive audit of the database schema (`server/prisma/schema.prisma`) and the physical Supabase PostgreSQL instance confirms that **Phase 3 can be fully implemented with ZERO database migrations, ZERO table creations, and ZERO column modifications.**

All necessary tables, columns, indexes, and polymorphic workflow references already exist in production.

### Existing Model Analysis & Reuse Plan

| Model Name | Physical Table | Key Columns Utilized in Phase 3 | Phase 3 Functionality Powered | Migration Needed? |
| :--- | :--- | :--- | :--- | :--- |
| `EmployeeChangeRequest` | `employee_change_requests` | `id`, `tenantId`, `employeeId`, `fieldCategory`, `fieldKey`, `oldValueJson`, `newValueJson`, `proofMediaId`, `status @db.VarChar(20)`, `reviewedBy`, `reviewedAt`, `reviewComments` | Powers the entire ESS Request Centre (Phase 3.1). Because `status` is a varchar and values are JSON strings, composite objects (banking, address, emergency, tax) and new states (`DRAFT`, `SUBMITTED`, `CORRECTION_REQUESTED`, `CANCELLED`) are stored without DDL changes. | **None (0)** |
| `Employee` | `employees` | `dateOfBirth`, `gender`, `pan`, `aadhaar`, `uan`, `esiNumber`, `pfNumber`, `bankName`, `bankAccount`, `bankIfsc`, `bankBranch`, `emergencyContactName`, `emergencyContactRelationship`, `emergencyContactPhone`, `presentAddress`, `permanentAddress`, `managerId` | Official target employee records updated automatically upon approval of profile change requests or manager transfers. | **None (0)** |
| `CompanyDocument` | `company_documents` | `id`, `tenantId`, `employeeId`, `documentTypeId`, `expiryDate @db.Date`, `status @db.VarChar(50)`, `verifiedBy`, `verifiedAt`, `fileId`, `requiresSignature` | Powers Document Expiry & Compliance Automation (Phase 3.2). Varchar status supports `active`, `expiring_soon`, `expired`, and `superseded`. | **None (0)** |
| `DocumentType` | `document_types` | `id`, `tenantId`, `name`, `code`, `isRequired`, `isActive` | Used to calculate mandatory document compliance percentages per department and tenant. | **None (0)** |
| `ProbationRecord` | `probation_records` | `id`, `tenantId`, `employeeId`, `startDate`, `endDate`, `probationPeriodDays`, `status`, `performanceRating`, `remarks`, `extendedUntil`, `confirmedAt` | Powers Probation Management (Phase 3.3). Tracks extensions, confirmation milestones, and manager review notes in `remarks`. | **None (0)** |
| `EmployeeContract` | `employee_contracts` | `id`, `tenantId`, `employeeId`, `contractTypeId`, `startDate`, `endDate`, `salary`, `status` | Powers Contract Automation & Expiry Tracking (Phase 3.3). | **None (0)** |
| `ContractType` | `contract_types` | `id`, `tenantId`, `name`, `description`, `status` | Categorizes fixed-term, consultant, intern, and executive contracts. | **None (0)** |
| `EmployeeTransfer` | `employee_transfers` | `id`, `tenantId`, `employeeId`, `oldManagerId`, `newManagerId`, `effectiveDate`, `reason`, `status` | Archives historical and pending reporting manager reallocations for Org Chart (Phase 3.4). | **None (0)** |
| `WorkflowDefinition` & `ApprovalRequest` | `workflow_definitions`, `approval_requests`, `approval_actions` | `entityType @db.VarChar(50)`, `entityId @db.VarChar(50)`, `currentStepIndex`, `status`, `action`, `actorId`, `comments` | Generic polymorphic approval engine directly links to `EmployeeChangeRequest`, `ProbationRecord`, and `EmployeeTransfer` without schema alterations. | **None (0)** |
| `GeneratedLetter` & `DocumentTemplate` | `generated_letters`, `document_templates` | `id`, `tenantId`, `employeeId`, `templateId`, `letterType`, `title`, `contentHtml`, `issuedById`, `issuedAt` | Powers automated generation of formal Employment Confirmation Letters upon successful probation completion. | **None (0)** |
| `MediaFile` & `FileVersion` | `media_files`, `file_versions` | `id`, `tenantId`, `fileName`, `fileSize`, `mimeType`, `storagePath`, `version` | Stores proof documents for bank/PAN change requests and renewed compliance documents. | **None (0)** |

---

## 2. API Route & Endpoint Impact Analysis

### 2.1. Existing Endpoints to Preserve Without Breaking Changes

The following endpoints are currently functional in `server/src/routes/` and will be preserved:
1. `GET /api/v1/me/profile/change-requests` — Retrieves authenticated employee's change requests.
2. `POST /api/v1/me/team/profile-changes/:id/action` — Manager approval/rejection endpoint.
3. `GET /api/v1/me/organization/structure` & `tree` — Hierarchy tree resolution.
4. `PUT /api/v1/hr/lifecycle/probation/:id/extend` — Extends probation period.
5. `PUT /api/v1/hr/lifecycle/probation/:id/confirm` — Confirms employee probation.
6. `POST /api/documents/:id/verify` & `reject` — Document verification workflow.
7. `GET /api/dashboard/hrm` — HRM operational metrics.

### 2.2. New & Enhanced Endpoints Required

```
Phase 3 API Endpoints Architecture:

[ Employee Portal (ESS) ]
       │
       ├── POST /api/v1/me/profile/change-requests (Enhanced: Compound payloads)
       ├── PUT  /api/v1/me/profile/change-requests/:id (New: Draft & Correction edits)
       ├── DELETE /api/v1/me/profile/change-requests/:id (New: Cancellation)
       └── POST /api/v1/organization/manager-change-request (New: Manager reallocation)

[ HR Admin & Management ]
       │
       ├── GET  /api/v1/hr/profile-changes (New: Tenant-wide central review queue)
       ├── POST /api/v1/hr/profile-changes/:id/action (New: Multi-action review with correction loop)
       ├── GET  /api/documents/compliance-stats (New: Realtime compliance & department breakdown)
       ├── POST /api/documents/:id/renew (New: Superseding document upload)
       ├── POST /api/v1/hr/lifecycle/probation/:id/manager-review (New: Manager rating & evaluation)
       ├── POST /api/documents/contracts/:id/renew (New: Contract renewal workflow)
       └── GET  /api/dashboard/employee-intelligence (New: Aggregated workforce intelligence)
```

#### Detailed Endpoint Specifications:

#### A. Phase 3.1: Employee Self-Service Request Centre
1. **`POST /api/v1/me/profile/change-requests` (Enhanced)**
   - **Method:** `POST`
   - **Auth:** Authenticated employee (`hrm.self_service:access`)
   - **Payload:**
     ```json
     {
       "fieldCategory": "banking", // "personal" | "address" | "emergency_contact" | "banking" | "tax_identity"
       "fieldKey": "bank_details", // Composite key or specific field
       "newValue": {
         "bankName": "HDFC Bank",
         "bankAccount": "50100234567890",
         "bankIfsc": "HDFC0001234",
         "bankBranch": "Indiranagar, Bangalore"
       },
       "proofMediaId": "med_abc123",
       "reason": "Changed salary account to new branch"
     }
     ```
   - **Logic:** Validates payload with Zod; captures snapshot of current fields from `Employee` into `oldValueJson`; writes record to `EmployeeChangeRequest` with status `PENDING`; logs audit mutation; dispatches notification to reporting manager / HR.

2. **`PUT /api/v1/me/profile/change-requests/:id` (New)**
   - **Method:** `PUT`
   - **Auth:** Authenticated employee (Owner only)
   - **Logic:** Permits updating payload if current status is `DRAFT` or `CORRECTION_REQUESTED`. Transitions status back to `PENDING` upon resubmission.

3. **`DELETE /api/v1/me/profile/change-requests/:id` (New)**
   - **Method:** `DELETE`
   - **Auth:** Authenticated employee (Owner only)
   - **Logic:** Transitions status to `CANCELLED` if currently `DRAFT` or `PENDING`.

4. **`GET /api/v1/hr/profile-changes` (New)**
   - **Method:** `GET`
   - **Auth:** HR Admin (`hrm.employees.requests:manage`)
   - **Query Params:** `status`, `fieldCategory`, `departmentId`, `page`, `pageSize`, `search`
   - **Response:** Paginated change requests with joined employee names, department, old vs new values, proof document URL, and current workflow step.

5. **`POST /api/v1/hr/profile-changes/:id/action` (New)**
   - **Method:** `POST`
   - **Auth:** HR Admin or Authorized Approver
   - **Payload:** `{ "action": "approve" | "reject" | "request_correction", "reviewComments": "..." }`
   - **Logic:**
     - `approve`: Atomically updates target fields on `Employee`, marks request `APPROVED`, updates `reviewedBy` and `reviewedAt`, logs audit event, notifies employee.
     - `reject`: Marks request `REJECTED`, requires comments, notifies employee.
     - `request_correction`: Marks request `CORRECTION_REQUESTED`, sends comments to employee.

#### B. Phase 3.2: Document Expiry & Compliance Automation
1. **`GET /api/documents/compliance-stats` (New)**
   - **Method:** `GET`
   - **Auth:** HR Admin (`hr:documents:read`)
   - **Response:**
     ```json
     {
       "summary": {
         "totalRequiredDocuments": 1250,
         "totalSubmitted": 1180,
         "verifiedCount": 1120,
         "expiringSoon30Days": 42,
         "alreadyExpired": 18,
         "compliancePercentage": 89.6
       },
       "byDepartment": [
         { "departmentId": "dep_1", "departmentName": "Engineering", "headcount": 120, "compliancePercentage": 94.2, "expiringSoon": 8, "expired": 2 },
         { "departmentId": "dep_2", "departmentName": "Sales", "headcount": 65, "compliancePercentage": 78.5, "expiringSoon": 14, "expired": 9 }
       ]
     }
     ```

2. **`POST /api/documents/:id/renew` (New)**
   - **Method:** `POST`
   - **Auth:** HR Admin or Document Owner
   - **Payload:** `{ "fileId": "med_newfile", "expiryDate": "2028-12-31", "documentNumber": "..." }`
   - **Logic:** Creates new document record linked to `DocumentType`; sets old document status to `superseded`; marks new document status to `pending_verification`; triggers notification.

#### C. Phase 3.3: Probation & Contract Automation
1. **`POST /api/v1/hr/lifecycle/probation/:id/manager-review` (New)**
   - **Method:** `POST`
   - **Auth:** Reporting Manager or HR
   - **Payload:** `{ "performanceRating": 4, "conductRating": 5, "attendanceRating": 4, "recommendation": "confirm" | "extend" | "terminate", "remarks": "..." }`
   - **Logic:** Saves review metrics into `ProbationRecord.remarks` (structured JSON string); updates workflow status for HR final signoff.

2. **`PUT /api/v1/hr/lifecycle/probation/:id/confirm` (Enhanced Integration)**
   - **Enhancement:** Upon successful confirmation in `LifecycleService.confirmProbation`, check if an active "Employment Confirmation" template exists in `DocumentTemplate`. If found, invoke `DocumentService.generateLetter` to issue an official `GeneratedLetter`, link it to the employee's document vault, and attach it to the confirmation notification.

3. **`POST /api/documents/contracts/:id/renew` (New)**
   - **Method:** `POST`
   - **Auth:** HR Admin (`hrm.contracts:manage`)
   - **Payload:** `{ "newStartDate": "2027-01-01", "newEndDate": "2028-01-01", "salary": 950000, "fileId": "med_contract_doc" }`
   - **Logic:** Closes existing contract as `completed`; creates new `EmployeeContract` with incremented term; logs audit mutation.

#### D. Phase 3.4: Organization Chart & Reporting Hierarchy
1. **`POST /api/v1/organization/manager-change-request` (New)**
   - **Method:** `POST`
   - **Auth:** HR Admin or Department Head
   - **Payload:** `{ "employeeId": "emp_1", "newManagerId": "emp_2", "effectiveDate": "2026-12-01", "reason": "Department restructuring" }`
   - **Validation:** Runs `validateReportingHierarchy(employeeId, newManagerId)` to enforce zero circular loops and valid tenant membership.
   - **Logic:** Creates record in `EmployeeTransfer`; routes through `ApprovalRequest`; upon approval and effective date, updates `Employee.managerId`.

#### E. Phase 3.5: Employee Intelligence Dashboard
1. **`GET /api/dashboard/employee-intelligence` (New)**
   - **Method:** `GET`
   - **Auth:** HR Executive / Admin (`hrm.analytics:view`)
   - **Logic:** Aggregates workforce trends (12-month joiners/leavers), lifecycle horizon counts (probation ending <= 30d/60d, contracts expiring <= 30d/60d), document compliance score, and employee profile completeness health score.

---

## 3. Background Processing & Schedulers

Two lightweight, idempotent cron schedulers will be registered in `server/src/cron/`:

### 3.1. Document Expiry Scanner (`document-expiry.cron.ts`)
- **Schedule:** Daily at `02:00 UTC` (`0 2 * * *`)
- **Operations:**
  1. Queries all `CompanyDocument` records where `tenantId = active`, `status IN ('active', 'verified')`, and `expiryDate IS NOT NULL`.
  2. For documents where `expiryDate < CURRENT_DATE`:
     - Updates status to `expired`.
     - Dispatches `document.expired` event via `OutboxService`.
     - Sends urgent notification to employee and HR.
  3. For documents expiring within exactly 30, 15, or 7 days:
     - Dispatches `document.expiring_soon` notification to employee with direct upload renewal link.
  4. Deduplication: Flags notifications to ensure an employee is notified only once per milestone threshold.

### 3.2. Lifecycle Milestones Scanner (`probation-contract-expiry.cron.ts`)
- **Schedule:** Daily at `02:30 UTC` (`30 2 * * *`)
- **Operations:**
  1. Identifies `ProbationRecord` records where `status = 'active'` and `(extendedUntil OR endDate) - CURRENT_DATE IN (30, 15, 7)`.
     - Alerts HR Admin and Reporting Manager to submit probation review.
  2. Identifies `EmployeeContract` records where `status = 'active'` and `endDate - CURRENT_DATE IN (60, 30, 15)`.
     - Alerts HR Admin and Department Head with contract renewal call-to-action.

---

## 4. Multi-Tenant Security, RBAC & Data Protection

### 4.1. Strict Tenant Scoping
- Every database query and update explicitly binds `tenantId: req.user.tenantId`.
- No request may view or mutate records belonging to another tenant.

### 4.2. Sensitive Data Protection & Masking
- **Bank Account Numbers**: Only the last 4 digits are rendered in standard API responses (`••••••••5678`). Full account number is only displayed to authorized HR personnel holding the explicit `hrm.employees.sensitive:view` permission.
- **PAN / Aadhaar / SSN**: Masked in list responses and notification text (`ABCDE••••F`).
- **Audit Logging**: Any unmasked view or export of sensitive financial/tax data logs a security audit event in `audit_logs`.

### 4.3. Segregation of Duties
- An employee is strictly prohibited from approving their own profile change request, probation confirmation, or manager reallocation (`req.user.employeeId !== changeRequest.employeeId`).

### 4.4. Full Mutation Audit Trail
- All state transitions (`SUBMIT`, `REQUEST_CORRECTION`, `APPROVE`, `REJECT`, `EXTEND_PROBATION`, `CONFIRM_PROBATION`, `RENEW_CONTRACT`, `TRANSFER_MANAGER`) call `AuditService.logMutation` with `before` and `after` snapshots, IP address, and actor user ID.

