# Function Report: Hired Candidate to Employee One-Click Conversion

**Function ID:** FN-051  
**Canonical Name:** Hired Candidate to Employee One-Click Conversion  
**Module:** Recruitment (ATS Pipeline) (`Conversion`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Hired Candidate to Employee One-Click Conversion across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Hired Candidate to Employee One-Click Conversion within the Recruitment (ATS Pipeline) domain.
- **Workflow Dependency:** Candidate Accepted Offer.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/recruitment` -> Offer Accepted Card -> Click 'Convert to Employee'.
- **Backend API Contract:**
  - **Endpoint:** `/api/recruitment/candidates/:id/convert-to-employee`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `recruitment.candidates.hire`
- **Authorized Roles:** `tenant_admin`, `hr_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/recruitment)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Offer Accepted Card -> Click 'Convert to Employee'
    Front->>Router: POST /api/recruitment/candidates/:id/convert-to-employee (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`recruitment.candidates.hire`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (JobCandidate, Employee)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on JobCandidate
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `JobCandidate`, `Employee`, `Profile`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Hired Candidate to Employee One-Click Conversion"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** recruitment.routes.ts line 195; creates Employee record and links candidate history.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
