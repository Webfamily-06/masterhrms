# Function Report: Project Workspace with Budget & Milestones

**Function ID:** FN-042  
**Canonical Name:** Project Workspace with Budget & Milestones  
**Module:** Projects & Tasks (Kanban) (`Projects`)  
**Phase:** PHASE-1  
**Operational Status:** **COMPLETED & FULLY IMPLEMENTED**
**Investigation Date:** November 20, 2026 (Verified)

---

## 1. Requirement & Business Purpose
- **Original Requirement:** Enable seamless, compliant enterprise execution of Project Workspace with Budget & Milestones across multi-tenant workspace environments.
- **Business Purpose:** Delivers transactional capability for Project Workspace with Budget & Milestones within the Projects & Tasks (Kanban) domain.
- **Workflow Dependency:** Client Record, Project Manager.

---

## 2. Trigger & Execution Architecture
- **Trigger Type:** User Action / Scheduled Event.
- **Frontend Entry Point:** `/projects` -> Click '+ Create Project'.
- **Backend API Contract:**
  - **Endpoint:** `/api/projects`
  - **HTTP Method:** `POST`
  - **Tenant Scoped:** `true`
- **RBAC Permissions Required:** `projects.manage`
- **Authorized Roles:** `tenant_admin`, `project_manager`.

---

## 3. Execution Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authorized User (tenant_admin)
    participant Front as Frontend UI (/projects)
    participant Router as Express API Gateway
    participant MW as Middleware Chain (Host, Tenant, Auth, Entitlement)
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Outbox as Activity Log / Event Outbox

    User->>Front: Click '+ Create Project'
    Front->>Router: POST /api/projects (JSON Payload)
    Router->>MW: Evaluate Host Context & Resolve Tenant
    MW->>MW: Check Bearer JWT & AppRole (`projects.manage`)
    MW->>Service: Dispatch verified payload
    
    rect rgb(240, 248, 255)
        Note over Service,DB: Atomic Transaction Boundary
        Service->>DB: Query prerequisite records (Project, ProjectMilestone)
        Service->>DB: Execute Mutation (INSERT/UPDATE) on Project
        Service->>Outbox: Record ActivityLog & Audit Trail
    end
    
    Service-->>Router: Return Structured Response (RFC 7807 on error)
    Router-->>Front: HTTP 201 Created
    Front-->>User: Update UI / Close Drawer / Toast Notification
```

---

## 4. Database Models & Schema Interactions
- **Primary Database Models:** `Project`, `ProjectMilestone`
- **Tenant Isolation Policy:** All queries automatically enforce `tenantId` scoping via `tenantStorage` (`server/src/context/tenant-context.ts`).
- **Transaction Boundaries:** Wrapped in `prisma.$transaction()` to ensure full atomicity and rollback on partial failure.

---

## 5. Security, Idempotency & Error Handling
- **Idempotency:** Mutations utilize unique constraint checking and client-generated idempotency keys where applicable.
- **Rollback Behavior:** Complete transaction abort on database constraint violation or external service timeout.
- **Audit Logging:** Emits structured audit entry in `activity_logs` table capturing `user_id`, `action: "Project Workspace with Budget & Milestones"`, IP address, and timestamp.
- **Security Validation:** Parameterized queries, schema sanitization, and XSS defense.

---

## 6. Verification & Forensic Evidence
- **Forensic Evidence:** projects.routes.ts line 45; relational project model with deadlines and milestones.
- **UI Status:** **WORKING**
- **API Status:** **WORKING**
- **Database Status:** **WORKING**
- **Known Issues:** None observed.
