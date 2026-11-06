# MASTERHRMS — STEP 3 PRE-IMPLEMENTATION ARCHITECTURE & DATABASE AUDIT
**Module:** Employee Award Nomination & Configurable Approval Workflow  
**Date:** November 6, 2026  
**Auditor:** Antigravity AI Engineering Pair  
**Status:** COMPLETE & AUTHORITATIVE

---

## 1. Executive Summary & Purpose

This audit serves as the mandatory pre-implementation foundation for **Step 3: Employee Award Nomination & Configurable Approval Workflow** in MASTERHRMS.

The system is a mature, production-grade multi-tenant SaaS application. Prior to introducing any database modifications or API endpoints for award nominations, this audit exhaustively inspects:
- Git working tree and uncommitted changes from Steps 1 & 2.
- Prisma schema vs. physical Supabase PostgreSQL columns and tables.
- Existing shared approval models, services, and queue interfaces.
- Existing reporting manager hierarchy (`employees.manager_id`).
- Existing notification, outbox, and audit infrastructure.
- File upload and secure attachment capabilities.
- RBAC, permission matrices, and tenant isolation boundaries.

---

## 2. Git Working Tree & Step 1/2 Preservation Check

An inspection of `git status` and `git diff --stat origin/main` confirms:
1. **Current Branch:** `main` (synchronized with `origin/main`).
2. **Step 1 & 2 Completed Deliverables Intact:**
   - `/hr/organization/award-types` in TanStack SPA and Next.js CMS with custom badge uploads, active/inactive lifecycles, and dependency-guarded deletions.
   - `/hr/awards` role-separated tenant-wide award management with grid/table views, filtering, direct granting, inline editing, revocation, and certificate preview.
   - `/me/awards` authenticated employee self-service recognition portal (read-only, session-derived).
   - `/awards` role-aware gateway redirecting HR &rarr; `/hr/awards` and Employees &rarr; `/me/awards`.
   - `/hr/employees/:employeeId` Employee 360 profile with awards section.
   - Server endpoints under `awards.routes.ts` with strict tenant scoping and `isHRAwardAuthorized` role verification.
   - Physical PostgreSQL table `award_types` and `employee_awards` columns and data.
3. **Commitment:** All uncommitted changes will be preserved without regression.

---

## 3. Database & Schema Physical Audit

A direct query of `information_schema.tables` and `information_schema.columns` in Supabase PostgreSQL revealed the following physical state:

### A. Existing Approval & Workflow Physical Tables
| Physical Table Name | Status in PostgreSQL | Key Columns & Notes |
| :--- | :--- | :--- |
| `workflow_definitions` | **EXISTS** | `id`, `tenant_id`, `module`, `entity_type`, `name`, `description`, `version`, `is_active`, `conditions_json`, `created_at`, `updated_at` |
| `workflow_steps` | **EXISTS** | `id`, `workflow_id`, `step_order`, `name`, `approver_type`, `approver_value`, `approval_mode`, `sla_hours`, `escalate_to`, `can_skip`, timestamps |
| `approval_requests` | **EXISTS** | `id`, `tenant_id`, `workflow_id`, `entity_type`, `entity_id`, `requester_id`, `current_step`, `status`, `payload_json`, `submitted_at`, `completed_at` |
| `approval_actions` | **EXISTS** | `id`, `tenant_id`, `request_id`, `step_number`, `actor_id`, `action`, `comment`, `metadata_json`, `acted_at`, `created_at` |
| `approval_delegations` | **EXISTS** | `id`, `tenant_id`, `manager_id`, `delegate_id`, `workflow_type`, `start_date`, `end_date`, `status` |
| `notifications` | **EXISTS** | `id`, `tenant_id`, `user_id`, `title`, `body`, `module`, `channel`, `link_to`, `read_at`, `metadata_json`, `created_at` |

### B. Existing Award Physical Tables
| Physical Table Name | Status in PostgreSQL | Key Columns & Notes |
| :--- | :--- | :--- |
| `award_types` | **EXISTS** | `id`, `tenant_id`, `name`, `icon`, `description`, `status`, `image_url`, `image_storage_path`, `created_by`, `updated_by` |
| `employee_awards` | **EXISTS** | `id`, `tenant_id`, `employee_id`, `award_type_id`, `award_date`, `gift_item`, `gift_amount`, `certificate_url`, `certificate_no`, `description`, `presented_by`, `status` |

### C. Missing Physical Tables for Nomination
| Candidate Entity | Physical Status | Action Required |
| :--- | :--- | :--- |
| `award_nominations` | **DOES NOT EXIST** | Must be created via safe additive migration to store nomination business attributes (nominator, nominee, award type, reason, achievement, attachments, approval status, link to issued award). |
| `award_recognition_policies` | **DOES NOT EXIST** | Can be represented cleanly as configurable policy columns on `award_types` or a dedicated lightweight configuration table. |

### D. Employee Reporting Hierarchy
- `employees.manager_id` **EXISTS** physically in PostgreSQL as `character varying(36)`.
- Self-referencing foreign key `Employee.manager` &rarr; `Employee.subordinates` exists in Prisma schema.
- Allows direct server-side verification: `manager.id === nominee.managerId`.

---

## 4. Existing Shared Approval Engine Analysis

The Express backend already contains a shared workflow engine:
- **Service:** `server/src/services/workflow.service.ts` (`WorkflowService`)
  - `WorkflowService.submit({ tenantId, entityType, entityId, requesterId, payloadSnapshot })`: Locates or creates `WorkflowDefinition`, creates `ApprovalRequest`, logs audit via `AuditService`, creates outbox event via `OutboxService`.
  - `WorkflowService.approveStep({ tenantId, requestId, actorId, comment })`: Validates current step, records `ApprovalAction`, updates `ApprovalRequest` (`PENDING` next step or `APPROVED` if final step), emits audit and outbox events.
  - `WorkflowService.rejectStep({ tenantId, requestId, actorId, comment })`: Sets `ApprovalRequest` to `REJECTED`, records `ApprovalAction`, emits audit and outbox events.
  - `WorkflowService.withdrawRequest({ tenantId, requestId, actorId, comment })`: Sets status to `WITHDRAWN`.
  - `WorkflowService.delegateStep({ tenantId, requestId, actorId, delegateToUserId, comment })`: Delegates approval.

- **Existing Approval Routes:**
  - `server/src/routes/platform-foundation.routes.ts`:
    - `GET /api/v1/hr/approvals`: Tenant-wide queue for HR.
    - `GET /api/v1/me/approvals`: ESS queue (my submitted + awaiting my action).
    - `POST /api/v1/shared/approvals/:id/approve`
    - `POST /api/v1/shared/approvals/:id/reject`
    - `POST /api/v1/shared/approvals/:id/withdraw`
    - `POST /api/v1/shared/approvals/:id/delegate`

- **Existing Frontend Approval Queues:**
  - TanStack SPA: `src/routes/_authenticated/hr/approvals.tsx` & `src/routes/_authenticated/me/approvals.tsx`
  - Next.js CMS: `CMS/src/app/(workspace)/hr/approvals/page.tsx` & `CMS/src/app/(workspace)/me/approvals/page.tsx`

---

## 5. Notification & Audit Infrastructure Analysis

1. **In-App & Realtime Push:**
   - `NotificationService.createNotification(...)` in `server/src/services/notification.service.ts`:
     - Inserts into PostgreSQL `notifications` table.
     - Emits Socket.io event via `getIO()`.
     - Pushes via `PusherService` and `VapidService` Web Push.
     - Implements idempotency key guards to avoid duplicate alerts.
2. **Asynchronous Outbox Events:**
   - `OutboxService.createOutboxEvent(...)` in `server/src/services/outbox.service.ts` writes events to `outbox_events` and processes them in a background worker every 3 seconds.
3. **Audit Logging:**
   - `AuditService.logMutation(...)` in `server/src/services/audit.service.ts` writes append-only records to `audit_logs` with `tenantId`, `actorId`, `entityType`, `entityId`, `beforeJson`, `afterJson`.

---

## 6. Architecture & Implementation Plan

### Step 1: Database Additive Migration
Create physical table `award_nominations`:
```sql
CREATE TABLE IF NOT EXISTS award_nominations (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  nomination_number VARCHAR(36) NOT NULL,
  employee_id VARCHAR(36) NOT NULL,
  award_type_id VARCHAR(36) NOT NULL,
  nominated_by_user_id VARCHAR(36) NOT NULL,
  nominated_by_employee_id VARCHAR(36),
  nomination_source VARCHAR(30) NOT NULL DEFAULT 'HR',
  reason TEXT NOT NULL,
  achievement_description TEXT,
  supporting_doc_url VARCHAR(500),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  current_step INTEGER NOT NULL DEFAULT 1,
  approval_request_id VARCHAR(36),
  issued_award_id VARCHAR(36),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Foreign keys and indexes
CREATE INDEX IF NOT EXISTS idx_award_nominations_tenant_status ON award_nominations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_award_nominations_tenant_employee ON award_nominations(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_award_nominations_nominator ON award_nominations(tenant_id, nominated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_award_nominations_req_id ON award_nominations(tenant_id, approval_request_id);

-- Add optional nomination_id to employee_awards
ALTER TABLE employee_awards ADD COLUMN IF NOT EXISTS nomination_id VARCHAR(36);
```

### Step 2: Nomination API Endpoints (`awards.routes.ts`)
1. `POST /api/awards/nominations`:
   - Validates nominator eligibility (HR, Manager, Peer, Self if allowed).
   - Validates reporting hierarchy if `nomination_source === 'MANAGER'`.
   - Prevents self-nomination unless enabled.
   - Prevents cross-tenant access and duplicate active nominations for the same employee + award type.
   - Creates `AwardNomination` and binds to `WorkflowService.submit({ entityType: 'AWARD_NOMINATION' })`.
   - Triggers `NotificationService` and `AuditService`.
2. `GET /api/awards/nominations`:
   - HR view: lists tenant-wide nominations with status, department, and nominee filters.
   - ESS view (`/api/me/awards/nominations` or `GET /api/awards/nominations?myOnly=true`): lists nominations submitted by or involving the caller.
3. `POST /api/awards/nominations/:id/approve`:
   - Validates current approver (Manager, Department Head, HR).
   - Enforces segregation of duties (nominator cannot approve unless authorized override).
   - Advances workflow via `WorkflowService.approveStep`.
   - If final approval: atomically issues official award into `employee_awards` with certificate number and links `issued_award_id`.
4. `POST /api/awards/nominations/:id/reject`:
   - Rejects nomination with reason via `WorkflowService.rejectStep`.
5. `POST /api/awards/nominations/:id/issue`:
   - Idempotent final official award issuance for approved nominations.

### Step 3: Frontend Integration
1. **`/hr/awards`**: Add "Nominations" tab alongside "Official Awards". Includes nomination table, filter toolbar, "Nominate Employee" dialog, approval/rejection actions for HR, and conversion to official award.
2. **`/me/awards`**: Add "My Nominations" tab allowing employees to submit peer/manager nominations, view their submitted nominations, and see status/feedback where permitted.
3. **`/hr/approvals` & `/me/approvals`**: Seamlessly render pending `AWARD_NOMINATION` requests in the central workplace queue.
4. **`/hr/employees/:employeeId`**: Only approved and issued awards appear in the Employee 360 profile; pending nominations do not pollute official records.

---

## 7. Audit Sign-off

- [x] Git working tree clean & Step 1/2 changes preserved.
- [x] Database physically verified in Supabase PostgreSQL.
- [x] Existing workflow and approval models identified and reused.
- [x] Physical schema additive plan validated.
- [x] Parity requirements between TanStack SPA and Next.js CMS established.
- [x] Ready to proceed to Phase 1 implementation.
