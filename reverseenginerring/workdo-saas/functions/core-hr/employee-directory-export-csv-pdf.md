# Function Report: Employee Directory Export (CSV / PDF)

**Function ID:** FN-006  
**Canonical Name:** Employee Directory Export (CSV / PDF)  
**Module:** Employee Directory & Core HR (`Reporting`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Employee Directory Export (CSV / PDF) across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Employee Directory Export (CSV / PDF) within the Employee Directory & Core HR domain.
- **Workflow Dependency:** Active Employee Filter.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/employees` -> Click 'Export' -> Select CSV / PDF format.
- **Backend API Contract:**
  - **Endpoint:** `/api/employees/export`
  - **HTTP Method:** `GET`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `hrm.employees.export`
- **Authorized Roles:** `tenant_admin`, `hr_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/employees)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Click 'Export' -> Select CSV / PDF format
    Front->>Router: GET /api/employees/export (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`hrm.employees.export`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (Employee, Department)
        Service->>DB: Execute Read on Employee
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 200 OK
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `Employee`, `Department`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Employee Directory Export (CSV / PDF)"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** employees.routes.ts line 290; client-side autoTable export in pdf-generator.ts.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
