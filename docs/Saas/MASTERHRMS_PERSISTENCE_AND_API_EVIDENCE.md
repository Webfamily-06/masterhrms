# MASTERHRMS — Persistence and API Evidence

**Audit Date:** October 22, 2026  
**Backend:** Express on `http://localhost:4000`  
**Database:** PostgreSQL with Prisma ORM (Supabase Transaction Pooler)  
**Evidence Collection:** Live HTTP requests, Playwright page reloads, and Prisma database inspection  

---

## 1. Storage Architecture Overview

To resolve ambiguities regarding where state is stored, MasterHRMS divides application state across three clearly distinct architectural layers:

```
+-----------------------------------------------------------------------------------+
|                            1. PostgreSQL Database                                 |
|  - chat_messages      - calendar_events   - workspace_todos   - media_files       |
|  - tenant_addons      - projects          - project_tasks     - users / profiles  |
+-----------------------------------------------------------------------------------+
                                         ▲
                                         │ REST APIs (Bearer Token + Tenant Context)
                                         ▼
+-----------------------------------------------------------------------------------+
|                            2. Browser LocalStorage                                |
|  - kanban-cards-state: User-specific column task order (drag-and-drop position)    |
|  - pipeline-stages-state: Client stage column layout and custom stage labels       |
|  - todo_custom_order: User-specific ordering of to-do items                       |
|  - hrms_auth_token / hrms_user: Session authentication state                       |
+-----------------------------------------------------------------------------------+
                                         ▲
                                         │ UI Event Handlers & Hooks
                                         ▼
+-----------------------------------------------------------------------------------+
|                         3. React / Redux In-Memory State                          |
|  - emailReducer: Compose popup visibility, minimize/maximize state                 |
|  - Realtime socket broadcast buffers (chat:message) before unmount                 |
|  - Unsaved draft inputs in modal dialogs                                          |
+-----------------------------------------------------------------------------------+
```

---

## 2. Empirical API Requests and Responses

### A. Chat Application (`/apps/chat/chats`)

#### 1. Message Creation (`POST /api/chat/messages`)
- **Headers**:
  ```http
  POST /api/chat/messages HTTP/1.1
  Host: localhost:4000
  Authorization: Bearer <tenant_admin_jwt>
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "threadId": "acceptance-test-thread-01",
    "content": "Audit message created at 2026-10-22T10:49:54.000Z",
    "recipientId": "014215a9-9a17-4adf-bcf4-d7b6e102dc04"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "f78d72c4-3640-4aee-b91b-450bff89ac13",
    "tenantId": "test-tenant-a-1791971885429",
    "threadId": "acceptance-test-thread-01",
    "senderId": "003e540c-f476-497a-abd5-3d7596d29526",
    "senderName": "admin-a-1791971886012",
    "senderAvatar": null,
    "content": "Audit message created at 2026-10-22T10:49:54.000Z",
    "attachments": null,
    "createdAt": "2026-10-22T10:49:54.494Z"
  }
  ```

#### 2. Thread History Fetch (`GET /api/chat/messages/:threadId`)
- **Headers**:
  ```http
  GET /api/chat/messages/acceptance-test-thread-01 HTTP/1.1
  Host: localhost:4000
  Authorization: Bearer <tenant_admin_jwt>
  ```
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "f78d72c4-3640-4aee-b91b-450bff89ac13",
      "tenantId": "test-tenant-a-1791971885429",
      "threadId": "acceptance-test-thread-01",
      "senderId": "003e540c-f476-497a-abd5-3d7596d29526",
      "senderName": "admin-a-1791971886012",
      "content": "Audit message created at 2026-10-22T10:49:54.000Z",
      "createdAt": "2026-10-22T10:49:54.494Z"
    }
  ]
  ```
- **Persistence Verification**: When the user reloads `/apps/chat/chats`, `ChatBody.jsx` executes `api.get('/api/chat/messages/' + threadId)` and populates the message list with persisted database records.

---

### B. Calendar Application (`/apps/calendar`)

#### 1. Event Creation (`POST /api/calendar/events`)
- **Request Body**:
  ```json
  {
    "title": "Acceptance Audit All-Hands",
    "startDate": "2026-10-22T10:52:00.000Z",
    "endDate": "2026-10-22T12:52:00.000Z",
    "category": "company"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "id": "012f659a-bda9-49ad-9142-e1f1899c99a2",
      "tenantId": "test-tenant-a-1791971885429",
      "userId": "003e540c-f476-497a-abd5-3d7596d29526",
      "title": "Acceptance Audit All-Hands",
      "description": null,
      "startDate": "2026-10-22T10:52:00.000Z",
      "endDate": "2026-10-22T12:52:00.000Z",
      "allDay": false,
      "category": "company",
      "location": null,
      "createdAt": "2026-10-22T10:52:01.120Z",
      "updatedAt": "2026-10-22T10:52:01.120Z"
    }
  }
  ```

#### 2. Event Fetch (`GET /api/calendar/events`)
- **Response** (`200 OK`): Confirmed `id: 012f659a-bda9-49ad-9142-e1f1899c99a2` returned in the events array.
- **Cleanup** (`DELETE /api/calendar/events/012f659a-bda9-49ad-9142-e1f1899c99a2`): Returned HTTP 200 `{ "success": true, "message": "Event deleted successfully" }`.

---

### C. Workspace To-do Application (`/apps/todo/task-list`)

#### 1. Task Creation (`POST /api/todos`)
- **Request Body**:
  ```json
  {
    "title": "Independent Audit Task Verification",
    "priority": "high",
    "tag": "Audit"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "id": "c005f669-cdf8-447a-ab19-4b66eef2c5fa",
      "tenantId": "test-tenant-a-1791971885429",
      "userId": "003e540c-f476-497a-abd5-3d7596d29526",
      "title": "Independent Audit Task Verification",
      "description": null,
      "priority": "high",
      "tag": "Audit",
      "dueDate": null,
      "completed": false,
      "createdAt": "2026-10-22T10:52:01.350Z",
      "updatedAt": "2026-10-22T10:52:01.350Z"
    }
  }
  ```

#### 2. Completion Status Update (`PUT /api/todos/:id`)
- **Request Body**:
  ```json
  { "completed": true }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "id": "c005f669-cdf8-447a-ab19-4b66eef2c5fa",
      "completed": true,
      "updatedAt": "2026-10-22T10:52:01.480Z"
    }
  }
  ```
- **Ordering Architecture**: Task order changes in the UI are saved to `localStorage.setItem('todo_custom_order', JSON.stringify(ids))`. This prevents multi-device ordering collisions while keeping task records persisted in PostgreSQL.

---

### D. File Manager Application (`/apps/file-manager/*`)

#### 1. List / Grid Data Parity (`GET /api/v1/media`)
- Both `FmList.jsx` and `FmGrid.jsx` execute `api.get('/api/v1/media')`.
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "3ca67afe-e4d8-47ca-81a3-c54a0508a339",
      "tenantId": "test-tenant-a-1791971885429",
      "fileName": "company_handbook.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "filePath": "documents/company_handbook.pdf",
      "createdAt": "2026-10-18T14:22:00.000Z"
    },
    {
      "id": "b88c1f01-71e2-45e0-9182-3e2849fa8172",
      "tenantId": "test-tenant-a-1791971885429",
      "fileName": "q3_financial_summary.xlsx",
      "fileSize": 524288,
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "filePath": "documents/q3_financial_summary.xlsx",
      "createdAt": "2026-10-19T09:15:00.000Z"
    }
  ]
  ```

#### 2. Static Asset Authorization Protection
- **Unauthenticated Download Attempt**:
  ```http
  GET /uploads/documents/company_handbook.pdf HTTP/1.1
  Host: localhost:4000
  ```
  **Response** (`401 Unauthorized`):
  ```json
  {
    "error": "Authentication required to access private document assets.",
    "code": "UPLOAD_AUTH_REQUIRED"
  }
  ```

- **Cross-Tenant Download Attempt (Tenant B accessing Tenant A Asset)**:
  ```http
  GET /uploads/documents/company_handbook.pdf HTTP/1.1
  Host: localhost:4000
  Authorization: Bearer <tenant_b_jwt>
  ```
  **Response** (`403 Forbidden`):
  ```json
  {
    "error": "Forbidden: Access denied to private asset belonging to another workspace.",
    "code": "FORBIDDEN_WORKSPACE_ASSET"
  }
  ```

---

### E. Add-on Entitlements (`/apps/integrations/*`)

#### 1. Unentitled Feature Request (`GET /api/shopify/dashboard`)
- **Headers**:
  ```http
  GET /api/shopify/dashboard HTTP/1.1
  Host: localhost:4000
  Authorization: Bearer <tenant_admin_jwt>
  ```
- **Response** (`403 Forbidden`):
  ```json
  {
    "success": false,
    "error": "Add-on 'shopify-sync' is not active on this workspace.",
    "code": "ADDON_REQUIRED",
    "key": "shopify-sync",
    "addonSlug": "shopify-sync",
    "requiresSubscription": true,
    "status": "inactive"
  }
  ```

#### 2. Super Admin Bypass
- When the identical endpoint is requested by Super Admin, `requireEntitlement` grants access:
  ```json
  {
    "entitled": true,
    "source": "super_admin_bypass",
    "status": "active"
  }
  ```

---

## 3. Database Schema Mapping Reference

| Entity | Table Name | Key Columns | Multi-Tenant Enforcement |
|---|---|---|---|
| Chat Message | `chat_messages` | `id, tenant_id, thread_id, sender_id, content, attachments, created_at` | `tenant_id` foreign key referencing `Tenant.id`, indexed by `[tenant_id, thread_id]` |
| Calendar Event | `calendar_events` | `id, tenant_id, user_id, title, start_date, end_date, category` | `tenant_id` foreign key referencing `Tenant.id`, filtered by `resolveTenantContext` |
| Workspace To-do | `workspace_todos` | `id, tenant_id, user_id, title, description, priority, tag, completed` | `tenant_id` foreign key referencing `Tenant.id`, filtered by `resolveTenantContext` |
| Media Asset | `media_files` | `id, tenant_id, file_name, file_size, mime_type, file_path, deleted_at` | `tenant_id` foreign key, guarded by `uploadsSecurityMiddleware` |
| Addon Entitlement | `tenant_addons` | `id, tenant_id, addon_id, status, license_key, configured_at` | `tenant_id` foreign key, verified by `requireEntitlement` |
