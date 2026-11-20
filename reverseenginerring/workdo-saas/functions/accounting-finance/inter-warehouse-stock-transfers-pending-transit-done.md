# Function Report: Inter-Warehouse Stock Transfers (Pending->Transit->Done)

**Function ID:** FN-031  
**Canonical Name:** Inter-Warehouse Stock Transfers (Pending->Transit->Done)  
**Module:** Products & Multi-Warehouse (`Transfers`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Inter-Warehouse Stock Transfers (Pending->Transit->Done) across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Inter-Warehouse Stock Transfers (Pending->Transit->Done) within the Products & Multi-Warehouse domain.
- **Workflow Dependency:** Source Warehouse Stock Available.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/transfers` -> Click '+ New Transfer' -> Select Source & Destination.
- **Backend API Contract:**
  - **Endpoint:** `/api/transfers`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `inventory.transfers.create`
- **Authorized Roles:** `tenant_admin`, `inventory_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/transfers)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Click '+ New Transfer' -> Select Source & Destination
    Front->>Router: POST /api/transfers (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`inventory.transfers.create`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (StockTransfer, StockTransferDetail)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on StockTransfer
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `StockTransfer`, `StockTransferDetail`, `ProductWarehouse`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Inter-Warehouse Stock Transfers (Pending->Transit->Done)"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** transfers.routes.ts line 45; multi-status workflow with atomic warehouse quantities.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
