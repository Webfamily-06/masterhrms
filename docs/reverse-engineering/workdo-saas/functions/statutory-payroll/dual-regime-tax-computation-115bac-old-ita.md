# Function Report: Dual-Regime Tax Computation (115BAC & Old ITA)

**Function ID:** FN-018  
**Canonical Name:** Dual-Regime Tax Computation (115BAC & Old ITA)  
**Module:** Statutory Payroll & Tax (`Calculation`)  
**Phase:** PHASE-1  
**Operational Status:** **WORKING**  
**Investigation Date:** November 19, 2026  

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Dual-Regime Tax Computation (115BAC & Old ITA) across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Dual-Regime Tax Computation (115BAC & Old ITA) within the Statutory Payroll & Tax domain.
- **Workflow Dependency:** Salary Structures, Attendance LOP, Employee Declarations.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/payroll` -> Click 'Run Payroll' -> Period Wizard.
- **Backend API Contract:**
  - **Endpoint:** `/api/payroll/calculate`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `payroll.calculate`
- **Authorized Roles:** `tenant_admin`, `finance_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/payroll)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Click 'Run Payroll' -> Period Wizard
    Front->>Router: POST /api/payroll/calculate (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`payroll.calculate`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (PayrollRun, Payslip)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on PayrollRun
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `PayrollRun`, `Payslip`, `TaxDeclaration`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Dual-Regime Tax Computation (115BAC & Old ITA)"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** payroll-engine.service.ts; verified in payroll_audit_suite.ts tests 1.1, 1.2, 1.3.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
