# MASTERHRMS — PHASE 3.1 IMPLEMENTATION REPORT
## Employee Self-Service Request Centre: Complete Implementation & Integration

**Date:** November 12, 2026  
**Author:** Principal Full-Stack Architect, Senior Backend Engineer & File Storage Security Engineer  
**Status:** Implementation Complete & Fully Verified  
**Final Verdict:** `PHASE 3.1 IMPLEMENTATION COMPLETE`

---

## 1. Executive Summary

Phase 3.1 delivers the comprehensive **Employee Self-Service Request Centre** in MASTERHRMS. 

Employees can now submit structured change requests to update their personal, address, emergency contact, banking, and tax/statutory identity details through self-service portals in both **TanStack Start** and **Next.js 15 CMS**. 

All submitted requests are subjected to strict server-side validation against field allowlists, snapshotted against current official records, and routed through a multi-state review and approval lifecycle (`DRAFT`, `SUBMITTED`, `PENDING`, `CORRECTION_REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`). Authoritative `Employee` master records remain unchanged until final approval, which is executed within an atomic database transaction featuring stale concurrency conflict detection.

### Core Objectives Achieved
1. **Compound Payload Handling**: Supported atomic composite updates across 5 categories (`personal`, `address`, `emergency_contact`, `banking`, `tax_identity`), replacing legacy single-field limitations.
2. **Zero-Migration Compliance**: Reused existing database tables (`employee_change_requests`, `employees`, `approval_requests`, `media_files`, `audit_logs`, `outbox_events`) with zero schema modifications and zero DDL migrations.
3. **Full Lifecycle State Machine**: Implemented Draft, Submission, Correction Requested with revision resubmission, Cancellation, and Final Approval/Rejection.
4. **Approval Workflow Integration**: Integrated seamlessly with `WorkflowService`, `WorkflowDefinition`, and `ApprovalRequest`.
5. **Central HR Review Queue**: Provided an enterprise review queue (`/hr/requests/profile-changes`) with side-by-side field diffs, document proof preview, and audit tracking.
6. **Field-Level Sensitive Data Protection**: Applied automated masking for bank accounts, PAN, and Aadhaar numbers, preventing unauthorized access in UI, API responses, and audit logs.
7. **Frontend Parity**: Delivered complete feature parity across both TanStack Start (`src/`) and Next.js 15 CMS (`CMS/`).

---

## 2. Files Modified & Created

### A. Backend Core Services & Routing (`server/`)
- **`server/src/services/employee-change-request.service.ts`** *(New)*
  - Category normalization and field allowlist definitions.
  - Server-side validators for dates, genders, phone numbers, PAN, and IFSC codes.
  - Snapshotting of original official employee records into `oldValueJson`.
  - State machine transitions (`DRAFT`, `SUBMITTED`, `PENDING`, `CORRECTION_REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`).
  - Stale concurrency conflict detection on final approval.
  - Atomic Prisma transaction updating authoritative `Employee` table.
  - Integration with `WorkflowService`, `NotificationService`, `OutboxService`, and `AuditService`.
  - Field-level sensitive data masking using `server/src/lib/field-security.ts`.
- **`server/src/routes/employee-self-service.routes.ts`** *(Modified)*
  - `POST /api/v1/me/profile/change-requests`: accepts compound payloads, attachments, drafts.
  - `GET /api/v1/me/profile/change-requests`: paginated list with category and status filters.
  - `GET /api/v1/me/profile/change-requests/:id`: single request detail with before/after diffs.
  - `PUT /api/v1/me/profile/change-requests/:id`: updates draft or responds to correction request.
  - `DELETE /api/v1/me/profile/change-requests/:id`: cancels eligible requests.
  - `POST /api/v1/me/team/profile-changes/:id/action`: enhanced to support `approve`, `reject`, and `request_correction` with segregation of duties.
- **`server/src/routes/hr-profile-changes.routes.ts`** *(New)*
  - `GET /api/v1/hr/requests/profile-changes/summary`: KPI metrics (total, pending, correction requested, approved, rejected).
  - `GET /api/v1/hr/requests/profile-changes`: tenant-wide list with search, department, category, and status filters.
  - `GET /api/v1/hr/requests/profile-changes/:id`: request detail with employee profile and unmasked sensitive view for authorized HR.
  - `POST /api/v1/hr/requests/profile-changes/:id/action`: HR review actions (`approve`, `reject`, `request_correction`).
- **`server/src/routes/platform-foundation.routes.ts`** *(Modified)*
  - Mounted `/hr/requests/profile-changes` and `/hr/profile-changes` for consolidated enterprise routing.
- **`server/src/index.ts`** *(Modified)*
  - Mounted `hrProfileChangesRouter` on `/api/v1/hr/requests/profile-changes`, `/api/hr/requests/profile-changes`, and short aliases.
- **`server/src/tests/employee-self-service-request-centre.test.ts`** *(New)*
  - 7 comprehensive automated test suites verifying all validations, lifecycle states, access controls, transactions, and security masking.

### B. Frontend Implementation (`src/` & `CMS/`)
- **`src/routes/_authenticated/me/profile.change-requests.tsx`** *(New - TanStack Start)*
  - Dedicated Employee Self-Service Request Centre at `/me/profile/change-requests`.
  - KPI StatCards, filter toolbar, interactive requests table.
  - Compound form dialogs for Personal, Address, Emergency Contact, Banking, and Tax/Statutory.
  - Side-by-side before/after diff modal with proof attachment view.
  - Draft saving, correction response, and cancellation flows.
- **`src/routes/_authenticated/hr/requests.profile-changes.tsx`** *(New - TanStack Start)*
  - Enterprise HR Review Queue at `/hr/requests/profile-changes`.
  - KPI StatCards, search by employee, category/department filters.
  - Review dialog featuring employee summary, stated reason, side-by-side comparison, proof media preview, and action buttons (`Approve`, `Request Correction`, `Reject`).
- **`src/routes/_authenticated/me/profile.tsx`** *(Modified - TanStack Start)*
  - Added direct navigation button linking to the Self-Service Request Centre from Employee Profile.
- **`src/nav/employee-sidebar.ts` & `src/nav/hr-sidebar.ts`** *(Modified - TanStack Start)*
  - Registered `/me/profile/change-requests` under `Overview & Profile`.
  - Registered `/hr/requests/profile-changes` under `Workspace Management -> Employees`.
- **`CMS/src/app/(workspace)/me/profile/change-requests/page.tsx`** *(New - Next.js 15 CMS)*
  - Next.js 15 CMS client page providing exact feature parity with the TanStack ESS Request Centre.
- **`CMS/src/app/(workspace)/hr/requests/profile-changes/page.tsx`** *(New - Next.js 15 CMS)*
  - Next.js 15 CMS client page providing exact feature parity with the TanStack HR Review Queue.
- **`CMS/src/nav/employee-sidebar.ts` & `CMS/src/nav/hr-sidebar.ts`** *(Modified - Next.js 15 CMS)*
  - Updated sidebar navigation manifests in CMS to expose both pages.

---

## 3. Database Impact & Zero-Migration Verification

A strict inspection of `server/prisma/schema.prisma` confirmed that all necessary tables, columns, and relations already exist in Supabase PostgreSQL:
- `model EmployeeChangeRequest`:
  - `fieldCategory` stores the normalized category (`personal`, `address`, `emergency_contact`, `banking`, `tax_identity`).
  - `fieldKey` stores the compound identifier (e.g. `compound_banking`).
  - `oldValueJson` stores the JSON snapshot of original employee values.
  - `newValueJson` stores the JSON payload containing requested changes, reason, and timestamp.
  - `proofMediaId` links to `MediaFile`.
  - `status @db.VarChar(20)` directly accommodates `DRAFT`, `SUBMITTED`, `PENDING`, `CORRECTION_REQUESTED`, `APPROVED`, `REJECTED`, and `CANCELLED`.
- `model Employee`:
  - All target columns (`firstName`, `lastName`, `dateOfBirth`, `gender`, `phone`, `maritalStatus`, `bloodGroup`, `fatherOrSpouseName`, `presentAddress`, `permanentAddress`, `addressLine1`, `addressLine2`, `city`, `district`, `state`, `postalCode`, `emergencyContactName`, `emergencyContactRelationship`, `emergencyContactPhone`, `bankName`, `bankAccount`, `bankIfsc`, `bankBranch`, `pan`, `aadhaar`, `uan`, `esiNumber`, `pfNumber`) exist as native columns.
- `model ApprovalRequest` & `WorkflowDefinition`:
  - Polymorphic relation via `entityType: "EmployeeChangeRequest"` and `entityId: changeRequest.id`.

**Total Migrations Required:** **0 (Zero)**  
**Total DDL Changes:** **0 (Zero)**

---

## 4. Verification & QA Summary

The automated test suite `server/src/tests/employee-self-service-request-centre.test.ts` executed with 100% pass rate:
1. **Suite 1: Compound Payload & Allowlist Validation** — Enforced category allowlists, rejected protected fields (`salary`, `role`, `status`), and validated date/PAN/IFSC formatting.
2. **Suite 2: Submitting Compound Banking Request with Old Snapshot** — Verified snapshot capture, confirmed master employee record remained unchanged prior to approval, and verified manager notification.
3. **Suite 3: Draft Lifecycle & Submission** — Verified saving as `DRAFT` and transitioning to `PENDING` upon `submitNow`.
4. **Suite 4: Correction Requested Loop** — Verified reviewer returning request with comments (`CORRECTION_REQUESTED`) and employee resubmission back to `PENDING`.
5. **Suite 5: Segregation of Duties & Access Control** — Blocked self-approval attempt, prevented unauthorized cross-employee cancellations, and enforced cross-tenant boundary isolation.
6. **Suite 6: Final Approval & Atomic Authoritative Profile Update** — Successfully updated official `Employee` record in atomic transaction, recorded audit log mutation, and emitted outbox event.
7. **Suite 7: Sensitive Data Masking Verification** — Confirmed bank accounts and statutory IDs are masked (`••••••••4321`) in standard responses and protected from plain audit logs.

