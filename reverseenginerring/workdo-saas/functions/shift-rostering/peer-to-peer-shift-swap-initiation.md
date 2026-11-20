# Function Report: Peer-to-Peer Shift Swap Initiation

**Function ID:** FN-016  
**Canonical Name:** Peer-to-Peer Shift Swap Initiation  
**Module:** Shift Rostering & Swaps (`Swaps`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Peer-to-Peer Shift Swap Initiation across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Peer-to-Peer Shift Swap Initiation within the Shift Rostering & Swaps domain.
- **Workflow Dependency:** Assigned Shifts for both employees.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/shifts` -> Roster View -> Click 'Request Swap' with Peer.
- **Backend API Contract:**
  - **Endpoint:** `/api/shifts/swaps`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `shifts.swaps.create`
- **Authorized Roles:** `employee`, `tenant_admin`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (employee)
    participant Front as Frontend UI (/shifts)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Roster View -> Click 'Request Swap' with Peer
    Front->>Router: POST /api/shifts/swaps (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`shifts.swaps.create`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (ShiftSwapRequest, ShiftRoster)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on ShiftSwapRequest
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `ShiftSwapRequest`, `ShiftRoster`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Peer-to-Peer Shift Swap Initiation"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** shifts.routes.ts line 115; verified in core_hr_lifecycle_audit_suite.ts test 4.2.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
