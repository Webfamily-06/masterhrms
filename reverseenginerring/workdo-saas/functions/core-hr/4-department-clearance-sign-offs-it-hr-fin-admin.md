# Function Report: 4-Department Clearance Sign-offs (IT, HR, Fin, Admin)

**Function ID:** FN-056  
**Canonical Name:** 4-Department Clearance Sign-offs (IT, HR, Fin, Admin)  
**Module:** Offboarding & Exit Clearances (`Clearance Matrix`)  
**Phase:** PHASE-1  
**Operational Status:** **WORKING**  
**Investigation Date:** November 19, 2026  

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of 4-Department Clearance Sign-offs (IT, HR, Fin, Admin) across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for 4-Department Clearance Sign-offs (IT, HR, Fin, Admin) within the Offboarding & Exit Clearances domain.
- **Workflow Dependency:** Registered Resignation / Termination.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/offboarding` -> Clearance Tab -> Department Sign-off Checklist.
- **Backend API Contract:**
  - **Endpoint:** `/api/offboarding/exits/:id/clearance`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `offboarding.clearance.signoff`
- **Authorized Roles:** `tenant_admin`, `hr_manager`, `it_admin`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/offboarding)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Clearance Tab -> Department Sign-off Checklist
    Front->>Router: POST /api/offboarding/exits/:id/clearance (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`offboarding.clearance.signoff`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (EmployeeExit, ExitChecklistItem)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on EmployeeExit
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `EmployeeExit`, `ExitChecklistItem`, `AssetAssignment`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "4-Department Clearance Sign-offs (IT, HR, Fin, Admin)"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** offboarding.routes.ts line 90; verified in core_hr_lifecycle_audit_suite.ts test 5.1.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
