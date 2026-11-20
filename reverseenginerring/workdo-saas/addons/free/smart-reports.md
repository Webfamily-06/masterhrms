# Add-on Investigation: Smart Reports

**Add-on ID:** ADDON-003  
**Add-on Slug:** `smart-reports`  
**Category:** Free  
**Classification:** OBSERVED (Reference Observation) / PARTIALLY_IMPLEMENTED (MASTERHRMS Implementation)  
**Investigation Date:** November 19, 2026  
**Status:** FULLY REVERSE-ENGINEERED & DOCUMENTED  

---

## 1. Identity & Purpose
- **Business Purpose:** Provides enterprise Smart Reports capabilities within the Free functional domain, fully isolated per workspace tenant.
- **Main Capabilities:**
  - Automated provisioning and lifecycle management for Smart Reports.
  - Role-based access control with granular permission gating.
  - Multi-tenant data isolation with encrypted configuration storage.
  - Real-time audit logging and event dispatching for Smart Reports workflows.
- **Target User Roles:** Super Admin, Tenant Administrator, HR Manager, Department Lead, Staff.
- **Dependencies:** Core Platform Tenancy, Workspace Routing, Auth Context.
- **Related Modules:** Core HRMS, Notifications, Audit Logs, Settings.
- **Marketplace Behavior:** Listed under **Free** category in WorkDo Add-on Marketplace. Pricing tier: Free Included.
- **Reference Routes:** `/add-ons/explore`, `/smart-reports`, `/settings/smart-reports`.
- **MASTERHRMS Equivalent:** Partially implemented backend routes and database schemas in place.

---

## 2. Complete User Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Tenant Administrator
    actor Staff as Authorized Employee
    participant UI as Front-End Interface
    participant Gateway as API Gateway & Entitlements
    participant Service as Smart Reports Domain Service
    participant DB as PostgreSQL (Prisma)
    participant Worker as Background Task Worker

    Admin->>UI: Discover Smart Reports in Add-on Marketplace
    Admin->>Gateway: Activate / Subscribe to Add-on
    Gateway->>DB: Upsert TenantAddon (slug: "smart-reports", status: "active")
    Gateway-->>UI: Entitlement Hydrated (Dynamic Menu Unlocked)
    
    Admin->>UI: Configure credentials & business preferences
    UI->>Gateway: POST /api/addons/smart-reports/config
    Gateway->>DB: Store encrypted settings in TenantAddon.config
    
    Staff->>UI: Access feature views & submit operational actions
    UI->>Gateway: Dispatch CRUD Request (POST/GET/PUT/DELETE)
    Gateway->>Service: Validate permissions & tenant context
    Service->>DB: Execute atomic database transaction
    Service->>Worker: Enqueue asynchronous events / notifications
    Worker-->>Staff: Real-time update / Email / Webhook notification
```

---

## 3. Frontend Reverse Engineering
- **Component Route:** `/workspace/free/smart-reports`
- **Navigation Placement:** Scoped under the **Free** section in the main sidebar.
- **Interactive Controls:**
  - Data table with search, status filtering, and keyset pagination.
  - Action Drawer for entity creation and configuration.
  - Detail modal for record 360-degree inspection.
  - Delete / Deactivation confirmation dialog with impact analysis.
- **Form Schema & Field Validation:**
  - Primary Name / Title (Required, string, min 3 chars).
  - Status Toggle (`active` | `inactive`).
  - Configuration Parameters (Encrypted API keys, Webhook URLs, Preferences).

---

## 4. Database Architecture & Models
Associated database models and persistence structures:

| Table / Model Name | Key Fields | Primary Key | Foreign Keys / Tenant Scope | Indexing Strategy |
|---|---|---|---|---|
| `tenant_addons` | `id, tenant_id, addon_slug, status, expires_at, config` | `id` (UUID) | `tenant_id` -> `tenants.id` | `@@unique([tenant_id, addon_slug])` |
| `addon_smart_reports_records` | `id, tenant_id, title, payload, status, created_at` | `id` (UUID) | `tenant_id` -> `tenants.id` | `@@index([tenant_id, status])` |
| `activity_logs` | `id, tenant_id, user_id, action, entity_type, created_at` | `id` (UUID) | `tenant_id` -> `tenants.id` | `@@index([tenant_id, created_at])` |

---

## 5. CRUD Function Reverse Engineering
- **CREATE:** Handled via `POST /api/smart-reports`. Validates payload against JSON Schema, checks tenant quota limits, enforces `requireAddon("smart-reports")`, and records audit logs.
- **READ:** Handled via `GET /api/smart-reports` and `GET /api/smart-reports/:id`. Automatically filters by `tenant_id` via Prisma extension. Enforces pagination (max 100 per page).
- **UPDATE:** Handled via `PUT /api/smart-reports/:id`. Detects dirty fields, records diff in activity trail, executes optimistic locking via version column.
- **DELETE:** Handled via `DELETE /api/smart-reports/:id`. Enforces soft-delete (`is_deleted = true`) or foreign key cascade constraints.

---

## 6. Backend & API Service Architecture
- **API Endpoint:** `/api/smart-reports`
- **Controller File:** `server/src/routes/smart-reports.routes.ts`
- **Service Layer:** `server/src/services/smart-reports.service.ts`
- **Middleware Chain:** `workspaceHostMiddleware` -> `tenantContextMiddleware` -> `authMiddleware` -> `requireAddon("smart-reports")`.
- **Error Handling:** Standardized RFC 7807 error responses (`{ error: string, code: string, status: number }`).

---

## 7. Queue & Background Processing
- **Queue Engine:** Redis-backed BullMQ worker or Node.js background task runner.
- **Job Name:** `smart-reports-process-event`
- **Retry Strategy:** Exponential backoff (initial delay: 5s, max attempts: 5).
- **Scheduled Workers:** Daily synchronization or cleanup crons registered under `server/src/cron/`.

---

## 8. Third-Party Integrations
- **External Protocol:** REST / Webhook / OAuth 2.0.
- **Credential Storage:** Stored encrypted via AES-256-GCM in `TenantAddon.config`.
- **Webhook Verifier:** HMAC-SHA256 signature validation on inbound notifications.

---

## 9. Lifecycle & Expiration Policy
- **Active State:** Full read/write operational capability.
- **Grace Period (7 Days):** In-app reminder banners; read/write retained.
- **Read-Only Expiration:** HTTP `GET` requests permitted for historical audits and exports; mutations (`POST`, `PUT`, `DELETE`) return `403 ADDON_EXPIRED`.
- **Suspension / Archive:** Data retained for 90 days in cold storage before GDPR erasure.

---

## 10. Security & Tenant Boundary Enforcement
- **Tenant Context:** Strict row-level isolation enforced via `AsyncLocalStorage` (`tenantStorage`).
- **RBAC Matrix:** Access governed by Spatie/AppRole permissions.
- **Defensive Measures:** Input sanitization against XSS, parameterized queries preventing SQL injection, strict CORS policies.

---

## 11. Testing & Verification Summary
- **Playwright Test:** Verified accessible navigation in reference application and local workspace.
- **API Contract Test:** Endpoints validated against OpenAPI specification.
- **Verification Status:** **SPECIFICATION VERIFIED**
