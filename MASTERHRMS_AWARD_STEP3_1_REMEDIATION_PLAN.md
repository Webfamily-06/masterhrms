# MASTERHRMS — STEP 3.1: AWARD APPROVAL SECURITY & GOVERNANCE REMEDIATION PLAN

## Executive Summary
This remediation plan details the targeted architectural and operational fixes for the confirmed `PARTIAL` and `DEFECT` findings documented in `MASTERHRMS_AWARD_STEP3_FINAL_GAP_AUDIT.md`. 
The remediation strictly adheres to the preservation guidelines:
- Zero database table drops, resets, or truncations.
- Additive schema modifications only (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Direct reuse of existing `WorkflowDefinition`, `WorkflowStep`, `ApprovalRequest`, and `ApprovalAction` models without duplicating workflow logic.
- Total parity between TanStack SPA (`src/`) and Next.js CMS (`CMS/`).
- Zero Git commits/pushes.

---

## 1. Audit Findings Reconfirmation Matrix

| Finding ID | Component | Current State / Defect | Target State (Remediated) |
| :--- | :--- | :--- | :--- |
| **GAP-SEC-01** | `AwardNominationService.approveNomination` | Uses broad `isHRAuthorized || isManagerOf` check regardless of workflow step. Stage 2 (Dept Head) and Stage 3 (HR Manager) can be approved by direct manager or any HR staff. | **Step-Specific Approver Authorization**: Query active `WorkflowStep` from `ApprovalRequest.workflow.steps` where `stepOrder === approvalRequest.currentStep`. Enforce exact role/manager/user match. Return HTTP 403 otherwise. |
| **GAP-SEC-02** | `ApprovalAction` History | No check against prior approver IDs in multi-step workflows. Same actor can approve Step 1 and Step 2 if actor has multiple roles. | **Segregation of Duties Enforcement**: Check `tx.approvalAction.findFirst({ where: { requestId, actorId, action: 'APPROVE' } })`. If found, reject with HTTP 400 Bad Request. |
| **GAP-SEC-03** | `approveNomination` Null Bypass | If `approvalRequestId` is null, nomination transitions directly to `APPROVED` and issues official award without workflow check. | **Workflow Enforcement Boundary**: If `awardType.requiresApproval` is true, require non-null `approvalRequestId` belonging to `tenantId`. If missing/corrupt, throw explicit error. |
| **GAP-DATA-01** | `award_types` Table & Prisma Schema | Missing `workflow_id` foreign key relation to `workflow_definitions`. | **Per-Award-Type Binding**: Add `workflow_id VARCHAR(36) REFERENCES workflow_definitions(id) ON DELETE SET NULL` to `award_types`. Update Prisma schema and client. |
| **GAP-DATA-02** | Master Data Blueprint Allowlist | `MASTER_DATA_ALLOWED_FIELDS.awardType` does not permit `requiresApproval`, `allowPeerNomination`, `allowSelfNomination`, `workflowId`. | **Allowlist Update**: Update `master-data.blueprint.ts` and `awards.routes.ts` to allow, validate, and persist governance fields. |
| **GAP-UI-01** | TanStack SPA Award Types Modal | Missing governance toggles (`requiresApproval`, `allowPeerNomination`, `allowSelfNomination`) and Workflow selector. | **Governance UI**: Add Form switches and a searchable dropdown for active `AWARD_NOMINATION` workflows. Show configuration badges in table. |
| **GAP-UI-02** | Next.js CMS Award Types Modal | Missing identical governance controls as TanStack SPA. | **100% CMS Parity**: Implement matching Form controls and table column badges in Next.js CMS. |

---

## 2. Database Migration Plan (Additive Only)

### 2.1 Schema Migration (`scripts/database/migrate_award_type_workflow_id.cjs`)
Execute direct additive SQL via Prisma `$executeRawUnsafe`:
```sql
ALTER TABLE award_types 
  ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(36) REFERENCES workflow_definitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_award_types_tenant_workflow 
  ON award_types(tenant_id, workflow_id);
```

### 2.2 Prisma Schema Update (`server/prisma/schema.prisma`)
Add `workflowId` and `workflow` relation to `model AwardType`:
```prisma
model AwardType {
  // ...
  workflowId          String?              @map("workflow_id") @db.VarChar(36)
  workflow            WorkflowDefinition?  @relation(fields: [workflowId], references: [id], onDelete: SetNull)
  // ...
}
```
Run `npx prisma generate` to update Prisma Client.

---

## 3. Backend Implementation Plan

### 3.1 Master Data Blueprint & Organization Route Allowlist
File: `server/src/blueprints/master-data.blueprint.ts`
- In `MASTER_DATA_ALLOWED_FIELDS.awardType`, add:
  `"requiresApproval"`, `"allowPeerNomination"`, `"allowSelfNomination"`, `"workflowId"`

File: `server/src/routes/awards.routes.ts`
- Ensure `POST /api/v1/awards/types` and `PUT /api/v1/awards/types/:id` accept and persist:
  - `requiresApproval` (boolean)
  - `allowPeerNomination` (boolean)
  - `allowSelfNomination` (boolean)
  - `workflowId` (string, nullable)

### 3.2 Award Nomination Service Hardening (`server/src/services/award-nomination.service.ts`)

#### A. In `submitNomination`:
- Fetch `awardType`.
- If `awardType.requiresApproval`:
  - Fetch target workflow: use `awardType.workflowId` if specified, or fallback to default active `AWARD_NOMINATION` workflow for the tenant.
  - Submit through `WorkflowService.submit({ workflowId, tenantId, entityType: 'AWARD_NOMINATION', entityId: nominationId, ... })`.
  - Validate that `approvalRequest` is successfully created and has valid steps.
  - Persist `approvalRequestId: approvalRequest.id`.

#### B. In `approveNomination`:
1. **Null ApprovalRequest Bypass Defense**:
   - Check `awardType.requiresApproval`.
   - If true and `!nomination.approvalRequestId`, throw `BadRequestException("Approval request record is missing or corrupted for this nomination. Cannot approve without workflow verification.")`.
2. **Segregation of Duties (Same-Actor Re-approval Check)**:
   - Query `ApprovalAction`:
     ```typescript
     const priorAction = await tx.approvalAction.findFirst({
       where: {
         requestId: nomination.approvalRequestId,
         actorId: actorUserId,
         action: 'APPROVE',
       },
     });
     if (priorAction) {
       throw new BadRequestException("Segregation of duties violation: You have already approved a step in this nomination workflow.");
     }
     ```
3. **Step-Specific Approver Authorization**:
   - Query `ApprovalRequest` with its `workflow` and `steps`.
   - Find active step where `stepOrder === approvalRequest.currentStep`.
   - Validate actor permissions against `step.approverType`:
     - `MANAGER`: actor must be the nominee's direct reporting manager (`nominee.managerId === actorEmployeeId` or equivalent user lookup).
     - `DEPARTMENT_HEAD`: actor must be the department head of the nominee (`nominee.department.headId === actorEmployeeId` or user possesses role `department_head` in that department).
     - `ROLE`: actor's roles array (`actorRoles`) MUST include `step.approverValue` (e.g. `hr_manager`, `hr_admin`, `executive`).
     - `USER`: `step.approverValue === actorUserId`.
     - `GROUP`: actor must be a member of `step.approverValue`.
   - If authorization fails: Throw `ForbiddenException("You are not authorized to approve this specific workflow step (" + step.approverType + ").")`.
4. **Out-of-Order Check & Advance**:
   - Call `WorkflowService.approveStep(...)` inside the transaction.
   - If workflow reaches terminal approval (`isComplete` / status `APPROVED`), transition nomination to `APPROVED` and call `issueOfficialAward`.

---

## 4. Frontend Implementation Plan (SPA & CMS Parity)

### 4.1 TanStack SPA (`src/routes/_authenticated/hr/organization/award-types.tsx`)
1. Add `useQuery` to fetch available workflows: `api.get('/v1/workflows/definitions?entityType=AWARD_NOMINATION')`.
2. Add modal Form fields:
   - Switch / Checkbox: `requiresApproval` ("Require Workflow Approval")
   - Select: `workflowId` ("Approval Workflow" - disabled if `requiresApproval` is false)
   - Switch / Checkbox: `allowPeerNomination` ("Allow Peer Nominations")
   - Switch / Checkbox: `allowSelfNomination` ("Allow Self Nominations")
3. Update table columns to display:
   - Badge for Approval Required / Auto-Approved.
   - Badge / label for associated Workflow Name.
   - Badges for Peer / Self nomination permissions.

### 4.2 Next.js CMS (`CMS/src/app/(workspace)/hr/organization/award-types/page.tsx`)
Implement identical changes to ensure complete feature and visual parity.

---

## 5. Verification & Testing Strategy

1. **Step-Specific Approver Enforcement Test**:
   - Create a 3-step workflow (Manager -> Dept Head -> HR Admin).
   - Submit nomination.
   - Verify Manager can approve Step 1.
   - Verify Dept Head cannot approve Step 1 (fails with 403).
   - After Step 1 is approved by Manager, verify Manager cannot approve Step 2 (fails with 400 or 403).
   - Verify Dept Head approves Step 2.
   - Verify HR Admin approves Step 3 -> Nomination transitions to APPROVED and official award is issued.
2. **Same-Actor Re-approval Prevention Test**:
   - If an actor has multiple roles (e.g., is both Manager and HR Admin), verify actor cannot approve Step 2 or 3 after having approved Step 1.
3. **Null Approval Bypass Defense Test**:
   - Attempt to call `approveNomination` on a nomination whose `awardType.requiresApproval` is true but `approvalRequestId` is null -> must be rejected with 400 Bad Request.
4. **Per-Award-Type Workflow Binding Test**:
   - Configure Award Type A with Workflow 1.
   - Configure Award Type B with Workflow 2.
   - Verify nomination for Award Type A initiates Workflow 1.
   - Verify nomination for Award Type B initiates Workflow 2.
5. **Regression Verification**:
   - Run all prior test suites (`test_award_lifecycle_suite.cjs`, `test_award_nomination_lifecycle.cjs`, etc.).
   - Verify zero regressions in existing awards or nominations.

