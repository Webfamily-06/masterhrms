# Function Report: Tally ERP XML Auto-Ledger Transaction Mapping

**Function ID:** FN-064  
**Canonical Name:** Tally ERP XML Auto-Ledger Transaction Mapping  
**Module:** Third-Party Data Migration (`Tally`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Tally ERP XML Auto-Ledger Transaction Mapping across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Tally ERP XML Auto-Ledger Transaction Mapping within the Third-Party Data Migration domain.
- **Workflow Dependency:** Tally XML Schema.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/tally-importer` -> Dropzone -> Upload Tally Master XML.
- **Backend API Contract:**
  - **Endpoint:** `/api/workspace/tally-import`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `accounting.tally.import`
- **Authorized Roles:** `tenant_admin`, `finance_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/tally-importer)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Dropzone -> Upload Tally Master XML
    Front->>Router: POST /api/workspace/tally-import (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`accounting.tally.import`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (ChartOfAccount, JournalEntry)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on ChartOfAccount
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `ChartOfAccount`, `JournalEntry`, `JournalItem`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Tally ERP XML Auto-Ledger Transaction Mapping"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** workspace.routes.ts line 1020; automated Tally ledger-to-CoA categorization, balanced JournalEntry generation, and balance sync.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
