# Function Report: ZKTeco Biometric Device Punch Ingestion

**Function ID:** FN-008  
**Canonical Name:** ZKTeco Biometric Device Punch Ingestion  
**Module:** Attendance & Biometrics (`Hardware IoT`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of ZKTeco Biometric Device Punch Ingestion across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for ZKTeco Biometric Device Punch Ingestion within the Attendance & Biometrics domain.
- **Workflow Dependency:** Device IP Connectivity (Port 4370).

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/biometric-sync` -> Background UDP / TCP Listener & Cron.
- **Backend API Contract:**
  - **Endpoint:** `/api/biometric/punch`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `biometric.sync.execute`
- **Authorized Roles:** `tenant_admin`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/biometric-sync)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Background UDP / TCP Listener & Cron
    Front->>Router: POST /api/biometric/punch (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`biometric.sync.execute`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (BiometricPunchLog, BiometricDevice)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on BiometricPunchLog
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `BiometricPunchLog`, `BiometricDevice`, `Attendance`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "ZKTeco Biometric Device Punch Ingestion"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** server/src/services/zk-protocol.ts; server/src/cron/biometric-sync.ts running every 30 mins.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
