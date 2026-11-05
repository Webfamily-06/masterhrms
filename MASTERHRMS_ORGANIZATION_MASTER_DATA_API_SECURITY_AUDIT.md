# MASTERHRMS — ORGANIZATION MASTER DATA API & SECURITY AUDIT
**Endpoints:** `/api/hr/organization/departments`, `/api/hr/organization/designations`, `/api/hr/organization/branches`
**Date: 2026-11-05**

---

## 1. Executive Summary

This report analyzes the security architecture, authentication requirements, role-based access control (RBAC), tenant isolation mechanisms, and input validation across the master data API endpoints powering the HR Organization modules.

---

## 2. API Endpoints Inventory

All organization master data routes are mounted under `/api/hr/organization/*` via `organizationRouter` and `createMasterDataRouter`.

| Method | Endpoint | Description | Security & Middleware | Current Status |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/hr/organization/departments` | List departments with pagination & search | `requireAuth`, `resolveTenantContext` | Functional (Missing relation include & status filter) |
| `GET` | `/api/hr/organization/departments/:id` | Get single department | `requireAuth`, `resolveTenantContext` | Functional |
| `POST` | `/api/hr/organization/departments` | Create department with uniqueness check | `requireAuth`, `resolveTenantContext` | Functional |
| `PUT` | `/api/hr/organization/departments/:id` | Update department details | `requireAuth`, `resolveTenantContext` | Missing duplicate validation on update |
| `DELETE` | `/api/hr/organization/departments/:id` | Delete department | `requireAuth`, `resolveTenantContext` | Throws raw P2003 on foreign key reference |
| `GET` | `/api/hr/organization/designations` | List designations with pagination & search | `requireAuth`, `resolveTenantContext` | Functional (Missing relation include & status filter) |
| `POST` | `/api/hr/organization/designations` | Create designation | `requireAuth`, `resolveTenantContext` | Functional |
| `PUT` | `/api/hr/organization/designations/:id` | Update designation | `requireAuth`, `resolveTenantContext` | Missing duplicate validation on update |
| `DELETE` | `/api/hr/organization/designations/:id` | Delete designation | `requireAuth`, `resolveTenantContext` | Throws raw P2003 on foreign key reference |
| `GET` | `/api/hr/organization/branches` | List branches with pagination & search | `requireAuth`, `resolveTenantContext` | Functional |
| `POST` | `/api/hr/organization/branches` | Create branch | `requireAuth`, `resolveTenantContext` | Functional |
| `PUT` | `/api/hr/organization/branches/:id` | Update branch | `requireAuth`, `resolveTenantContext` | Missing duplicate validation on update |
| `DELETE` | `/api/hr/organization/branches/:id` | Delete branch | `requireAuth`, `resolveTenantContext` | Throws raw P2003 on foreign key reference |

---

## 3. Tenant Isolation & Security Boundary Evaluation

1. **Authentication Gate**:
   - Every route executes `requireAuth`. Requests without a valid Bearer JWT receive `401 Unauthorized`.
2. **Authoritative Server Tenant ID**:
   - `req.user.tenantId` is decoded from the signed JWT session.
   - Any client payload attempting to inject `tenantId` in `req.body` is discarded (`delete payload.tenantId;`).
   - Every database query specifies `where: { tenantId }`.
3. **Cross-Tenant Attack Surface**:
   - Attempting to read, edit, or delete an ID from another tenant returns `404 Not Found` (strict tenancy mask).
4. **Audit Trail**:
   - Every create, update, and delete operation logs to `AuditService.logMutation` and emits a transactional event to `OutboxService`.

---

## 4. Identified Gaps & Architectural Recommendations

1. **Relation Inclusion in Master Lists**:
   - `departments` currently does not include `branch { select: { id, name, code } }`.
   - `designations` currently does not include `department { select: { id, name } }`.
   - *Fix*: Extend `MasterBlueprintConfig` to support `include`, enriching list payloads without separate N+1 queries.
2. **Server-Side Status Filtering & Tenant Summary Counts**:
   - `GET /` currently ignores `req.query.status`.
   - `GET /` does not return tenant-wide counts (`counts: { total, active, inactive }`).
   - *Fix*: Support `?status=active|inactive|all` in `where` clause and return `counts` metadata.
3. **Update Duplicate Prevention**:
   - `PUT /:id` must validate `uniqueFields` against existing records `NOT: { id }` within the tenant to prevent accidental name collisions.
4. **Safe Archive & Deletion Dependency Protection**:
   - `DELETE /:id` must check for existing references in `employees`, `departments`, and `designations` before attempting hard delete. If referenced, return `409 Conflict` with a helpful message recommending deactivation.
   - Add `POST /bulk-archive` for confirmation-driven multi-row status updates.

