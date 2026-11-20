# Function Report: Offline Dexie.js Zero-Downtime Cart & Reconciliation

**Function ID:** FN-029  
**Canonical Name:** Offline Dexie.js Zero-Downtime Cart & Reconciliation  
**Module:** Point of Sale (POS Terminal) (`Offline Terminal`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Offline Dexie.js Zero-Downtime Cart & Reconciliation across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Offline Dexie.js Zero-Downtime Cart & Reconciliation within the Point of Sale (POS Terminal) domain.
- **Workflow Dependency:** Local IndexedDB Dexie Cache.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/pos` -> Operate in Network Disconnected State.
- **Backend API Contract:**
  - **Endpoint:** `/api/sales/sync-offline`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `pos.sales.create`
- **Authorized Roles:** `cashier`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (cashier)
    participant Front as Frontend UI (/pos)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Operate in Network Disconnected State
    Front->>Router: POST /api/sales/sync-offline (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`pos.sales.create`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (Sale, SaleDetail)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on Sale
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `Sale`, `SaleDetail`, `ProductWarehouse`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Offline Dexie.js Zero-Downtime Cart & Reconciliation"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** sales.routes.ts line 615; idempotent offline batch ingestion, warehouse inventory deduction, and auto-posting to general ledger.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
