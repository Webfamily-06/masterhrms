# Function Report: Stock Adjustments (+/-) with Audit Reason Codes

**Function ID:** FN-032  
**Canonical Name:** Stock Adjustments (+/-) with Audit Reason Codes  
**Module:** Products & Multi-Warehouse (`Adjustments`)  
**Phase:** PHASE-1  
**Operational Status:** **WORKING**  
**Investigation Date:** November 19, 2026  

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Stock Adjustments (+/-) with Audit Reason Codes across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Stock Adjustments (+/-) with Audit Reason Codes within the Products & Multi-Warehouse domain.
- **Workflow Dependency:** Product Warehouse Record.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/adjustments` -> Click '+ New Adjustment' -> Set Count Discrepancy.
- **Backend API Contract:**
  - **Endpoint:** `/api/adjustments`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `inventory.adjustments.create`
- **Authorized Roles:** `tenant_admin`, `inventory_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/adjustments)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Click '+ New Adjustment' -> Set Count Discrepancy
    Front->>Router: POST /api/adjustments (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`inventory.adjustments.create`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (StockAdjustment, ProductWarehouse)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on StockAdjustment
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `StockAdjustment`, `ProductWarehouse`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Stock Adjustments (+/-) with Audit Reason Codes"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** adjustments.routes.ts line 35; logs Damaged, Expired, Theft, or Physical Count variance.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
