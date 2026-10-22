# MASTERHRMS — Role-Based Access and Tenant Isolation Matrix

**Date:** October 22, 2026  
**Audience:** Platform Architects, Security Auditors, Compliance Teams  
**Target Environment:** MasterHRMS Shared Organization Applications

---

## 1. Overview and Security Principles

MasterHRMS enforces a zero-trust multi-tenant architecture across all shared organization applications. Tenant boundaries are enforced at:
1. **Network & Proxy Gate:** JWT token validation with required `tenantId` claim (except Super Admin).
2. **Middleware Scope:** `resolveTenantContext` extracts and pins `req.user.tenantId` for database queries.
3. **ORM Queries:** Prisma queries strictly include `{ tenantId: req.user.tenantId }` in all `findMany`, `findFirst`, `create`, `update`, and `delete` clauses.
4. **Storage Isolation:** Uploaded media assets are quarantined by tenant ID in `/uploads/media/tenant-{id}/`.

---

## 2. Role and Tenant Access Matrix

The following matrix documents access permissions across user personas for each of the 15 shared application routes and their underlying services:

| Application Route | Super Admin | Tenant Admin / HR Admin | Employee | Cross-Tenant User |
| :--- | :---: | :---: | :---: | :---: |
| `/apps/chat/chats` | Global / Audit | Full (Tenant Only) | Direct / Groups Only | **BLOCKED (403)** |
| `/apps/chat/chat-groups` | Global / Audit | Manage Channels | Join / Post | **BLOCKED (403)** |
| `/apps/chat/chat-contact` | Global Directory | Full Directory | Tenant Directory | **BLOCKED (403)** |
| `/apps/calendar` | Cross-Tenant View | Full CRUD | View & Personal Events | **BLOCKED (Filtered)** |
| `/apps/email` | System Mailings | Workspace Mail | Assigned Mail | **BLOCKED (No Access)** |
| `/apps/taskboard/projects-board` | Read All Projects | Full CRUD | Assigned Projects | **BLOCKED (403)** |
| `/apps/taskboard/kanban-board` | Manage Columns | Full CRUD | Move Assigned Cards | **BLOCKED (Isolated)** |
| `/apps/taskboard/pipeline` | Manage Stages | Full Pipeline | Read-Only Stages | **BLOCKED (Isolated)** |
| `/apps/file-manager/list-view` | Platform Assets | Tenant Assets / CRUD | Read & Upload | **BLOCKED (403/Empty)** |
| `/apps/file-manager/grid-view` | Platform Assets | Tenant Assets / CRUD | Read & Upload | **BLOCKED (403/Empty)** |
| `/apps/todo/task-list` | System Todos | Team Todos / CRUD | Personal Todos / CRUD | **BLOCKED (User Pin)** |
| `/apps/todo/gantt` | Enterprise Timeline| Project Timelines | Assigned Timelines | **BLOCKED (Isolated)** |
| `/apps/integrations/all-apps` | Manage Marketplace | View / Subscribe | Browse Only | **BLOCKED (Tenant Scoped)**|
| `/apps/integrations/integrations` | Configure Global | Connect / Disconnect | View Status | **BLOCKED (403)** |
| `/apps/integrations/integrations-detail`| Configure Gateway | Authorize API Keys | View Documentation | **BLOCKED (403)** |

---

## 3. Key Persona Definitions & Entitlements

### Persona 1: Super Admin (`super_admin`)
- **Scope:** Platform-wide oversight, global add-on marketplace curation, CMS configuration.
- **Tenant Context:** `tenantId = null`. When querying tenant data, must explicitly specify `?tenantId=...`.
- **Integrations:** Access to `/api/cms/addons` with ability to publish, modify pricing, and configure system webhooks.

### Persona 2: Tenant Admin / HR Admin (`tenant_admin`, `hr_admin`)
- **Scope:** Full operational control of the tenant organization workspace.
- **Tenant Context:** Bound to `tenantId`.
- **Entitlements:** Can create, edit, and delete calendar events, manage taskboards, upload media to the tenant library, subscribe to add-ons, and configure external connectors (e.g. Razorpay, Shopify, Google Workspace).

### Persona 3: Employee (`employee`)
- **Scope:** Self-service workspace collaboration.
- **Tenant Context:** Bound to employer's `tenantId`.
- **Entitlements:** Access to direct chat with colleagues, personal to-do tasks, viewing company calendar events, viewing assigned project tasks on Kanban boards, and browsing available organizational apps.

### Persona 4: Cross-Tenant User (Tenant B)
- **Scope:** Strictly confined to their own distinct `tenantId`.
- **Enforcement:** Attempted access to Tenant A's calendar events, chats, media files, or connectors is rejected with HTTP `403 Forbidden` or filtered to return empty result sets (`[]`).

---

## 4. Empirical Verification of Cross-Tenant Isolation

During automated Playwright testing (`scripts/test_organization_apps_integration.mjs`), empirical requests were executed to prove isolation:

1. **Calendar Events Isolation:**
   - **Test Action:** Tenant A created a high-priority strategy event via `POST /api/calendar/events`.
   - **Verification:** Tenant B queried `GET /api/calendar/events`.
   - **Result:** Event ID from Tenant A was completely absent from Tenant B's results (`NO (SECURE)`).

2. **Chat Policy Enforcement:**
   - **Test Action:** Tenant A and Tenant B queried `/api/chat/file-policy`.
   - **Result:** Authenticated tenant received HTTP `200 OK` with tenant upload quotas; unassociated cross-tenant token received HTTP `403 Forbidden`.

3. **Media Asset Quarantining:**
   - **Test Action:** Tenant B listed assets via `GET /api/v1/media`.
   - **Result:** Server returned strictly 0 records (`[]`), preventing any cross-tenant media asset leakage.
