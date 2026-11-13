# MASTERHRMS — PHASE 3.1 SECURITY & RBAC REPORT
## Multi-Tenant Security, Access Control, Sensitive Data Masking & Audit Governance

**Date:** November 12, 2026  
**Auditor:** File Storage Security Engineer, Senior Backend Engineer & Security Architect  
**Evaluation Scope:** Employee Self-Service Request Centre Security & Authorization Architecture

---

## 1. Multi-Tenant Isolation Architecture

Every query, mutation, and background dispatch in Phase 3.1 is strictly scoped by `tenantId`.

```
                    Incoming HTTP Request
                              │
               [ resolveTenantContext Middleware ]
                              │
               Validates JWT & Header Context
               Extracts verified req.user.tenantId
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
 [ Employee Portal Routes ]            [ HR Queue Routes ]
  where: { tenantId, employeeId }       where: { tenantId }
```

### Security Guarantees:
1. **Tenant Bound Queries**: All Prisma read/update calls enforce `where: { id, tenantId }`. No request can access or alter records across tenant boundaries.
2. **Context Tampering Prevention**: The `tenantId` is sourced exclusively from the authenticated session context (`req.user.tenantId`). Any `tenantId` supplied in request bodies is rejected or ignored.
3. **Cross-Tenant Verification Test**: Verified in automated test suite (Test 5c): querying a change request using an alternate tenant ID yields an immediate `404 Not Found`.

---

## 2. Employee Ownership & Access Control

Employees interact with change requests through dedicated self-service endpoints (`/api/v1/me/profile/change-requests`).

### Authorization Rules:
- **Record Ownership**: An employee can view, edit, or cancel only their own change requests (`employeeId: req.employee.id`).
- **Identity Spoofing Prevention**: The `employeeId` is determined server-side from the authenticated employee context (`req.employee.id`). Client bodies cannot supply arbitrary `employeeId` values.
- **Cross-Employee Cancellation Attack**: Attempting to cancel another employee's request fails with `Change request not found or not authorized to cancel` (Automated Test 5b).
- **Draft & Resubmission Access**: Only the creating employee can update a `DRAFT` or respond to a `CORRECTION_REQUESTED` item.

---

## 3. Segregation of Duties & Review Authorization

A critical principle of enterprise governance is that an employee must never be permitted to approve their own submissions.

### Security Gates:
1. **Self-Approval Prohibition**: In `EmployeeChangeRequestService.processReviewDecision`, the system enforces:
   ```ts
   if (input.reviewerEmployeeId && input.reviewerEmployeeId === changeReq.employeeId) {
     throw new Error("Segregation of duties violation: You cannot approve or review your own change request.");
   }
   ```
   Verified in automated test suite (Test 5a).
2. **Manager Scope Enforcement**: A manager can review only requests belonging to their direct subordinates (`changeReq.employee.managerId === req.employee.id`), unless holding tenant-wide HR admin privileges.
3. **HR Role-Based Access Control**:
   - Access to `/api/v1/hr/requests/profile-changes` requires `hrm.employees.view` or `hr_admin` / `super_admin` role.
   - Review actions (`approve`, `reject`, `request_correction`) require `hrm.employees.edit` or `hr_admin` / `super_admin`.

---

## 4. Sensitive Information Protection & Masking

Banking information and statutory tax identifiers are classified as **Tier 1 Sensitive PII** and governed by strict masking protocols.

### Field-Level Masking Rules:

| Sensitive Attribute | Default Masking Format | Unmasked Authorization Required |
| :--- | :--- | :--- |
| **Bank Account Number** | `••••••••4321` (Last 4 visible) | Explicit `hrm.sensitive.view` or `hr:employee:sensitive:read` or `super_admin` |
| **Permanent Account Number (PAN)** | `••••••1234F` (Last 5 visible) | Explicit `hrm.sensitive.view` or `super_admin` |
| **Aadhaar Number** | `•••• •••• 9012` (Last 4 visible) | Explicit `hrm.sensitive.view` or `super_admin` |
| **Universal Account Number (UAN)** | `••••••••0400` (Last 4 visible) | Explicit `hrm.sensitive.view` or `super_admin` |

### Prevention of Plaintext Leakage:
1. **API Responses**: Standard responses from `listEmployeeRequests`, `getRequestDetails`, and `listHrRequests` mask sensitive attributes before serialization.
2. **Audit Logs**: When `AuditService.logMutation` records before/after state snapshots, sensitive values are scrubbed via `maskSensitiveObject()`. Complete plaintext bank accounts are never written to `audit_logs`.
3. **Outbox Events**: Outbox payloads record only field names and metadata (`updatedFields: ['bankName', 'bankAccount']`), never plaintext credentials.

---

## 5. Stale Concurrency Conflict Detection & Atomic Integrity

To prevent lost updates and race conditions:
1. **Snapshotting**: Upon submission, the exact state of affected fields is snapshotted into `oldValueJson`.
2. **Pre-Approval Verification**: Inside the approval transaction, the current `Employee` record is reloaded. If another administrative process modified the fields between request submission and approval, a concurrency conflict is logged.
3. **Atomic Execution**: Updating the `Employee` record, transitioning the `EmployeeChangeRequest` status to `APPROVED`, recording the audit mutation, and emitting the outbox event occur inside a single atomic `prisma.$transaction`. Partial updates are physically impossible.

---

## 6. Audit Trail & Document Proof Security

1. **Immutable Audit Entries**:
   - `PROFILE_CHANGE_REQUEST_DRAFT`
   - `PROFILE_CHANGE_REQUEST_SUBMIT`
   - `PROFILE_CHANGE_REQUEST_CORRECTION_REQUESTED`
   - `PROFILE_CHANGE_REQUEST_RESUBMIT`
   - `PROFILE_CHANGE_REQUEST_CANCEL`
   - `PROFILE_CHANGE_REQUEST_REJECTED`
   - `PROFILE_CHANGE_REQUEST_APPROVED`
2. **Supporting Document Protection**:
   - Proof documents uploaded to `MediaFile` remain linked to the tenant and employee.
   - Attachments cannot be accessed across tenants.
   - Rejecting or cancelling a change request preserves the attached document for regulatory and audit compliance.

