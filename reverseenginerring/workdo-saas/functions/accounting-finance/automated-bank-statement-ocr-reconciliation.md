# Function Report: Automated Bank Statement OCR Reconciliation

**Function ID:** FN-039  
**Canonical Name:** Automated Bank Statement OCR Reconciliation  
**Module:** Double-Entry Accounting (`Reconciliation`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Automated Bank Statement OCR Reconciliation across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Automated Bank Statement OCR Reconciliation within the Double-Entry Accounting domain.
- **Workflow Dependency:** Bank Account ChartOfAccount.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/accounting` -> Bank Tab -> Click 'Upload Statement PDF/OFX'.
- **Backend API Contract:**
  - **Endpoint:** `/api/accounting/reconcile`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `accounting.reconciliation.manage`
- **Authorized Roles:** `tenant_admin`, `finance_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/accounting)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Bank Tab -> Click 'Upload Statement PDF/OFX'
    Front->>Router: POST /api/accounting/reconcile (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`accounting.reconciliation.manage`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (JournalEntry, JournalItem)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on JournalEntry
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `JournalEntry`, `JournalItem`, `ChartOfAccount`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Automated Bank Statement OCR Reconciliation"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** accounting.routes.ts line 1430; multi-tier fuzzy transaction matching against ledger items with automated balancing adjusting entries.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
