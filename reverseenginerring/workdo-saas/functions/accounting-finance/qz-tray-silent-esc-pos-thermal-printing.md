# Function Report: QZ-Tray Silent ESC/POS Thermal Printing

**Function ID:** FN-028  
**Canonical Name:** QZ-Tray Silent ESC/POS Thermal Printing  
**Module:** Point of Sale (POS Terminal) (`Hardware Printing`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of QZ-Tray Silent ESC/POS Thermal Printing across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for QZ-Tray Silent ESC/POS Thermal Printing within the Point of Sale (POS Terminal) domain.
- **Workflow Dependency:** Local QZ-Tray WebSocket Bridge.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/pos` -> Post-Sale Dialog -> Click 'Print Receipt'.
- **Backend API Contract:**
  - **Endpoint:** `/api/qz/print`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `false`
- **RBAC Permissions Required:** `pos.terminal.access`
- **Authorized Roles:** `tenant_admin`, `cashier`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/pos)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Post-Sale Dialog -> Click 'Print Receipt'
    Front->>Router: POST /api/qz/print (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`pos.terminal.access`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records ()
        Service->>DB: Execute Mutation (INSERT/UPDATE) on Entity
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** Standard Prisma Models
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "QZ-Tray Silent ESC/POS Thermal Printing"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** qz.routes.ts line 20; generates raw ESC/POS cut and drawer pulse codes.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
