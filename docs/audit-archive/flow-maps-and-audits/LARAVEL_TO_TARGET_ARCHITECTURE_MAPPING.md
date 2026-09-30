# LARAVEL TO TARGET ARCHITECTURE SPECIFICATION & MAPPING

**Source Framework:** Laravel 12 + Inertia.js 2.0 (`main-file/`)  
**Target Platform:** React 18 + Node.js/Express + Prisma 5 (`server/` & `src/`)  
**Status:** Architectural Mapping Complete — Phase A  

---

## 1. LAYER-BY-LAYER ARCHITECTURAL MAP

| Architectural Layer | Laravel Source Implementation (`main-file/`) | Target Node.js + React Implementation (`/`) | Translation Strategy |
| :--- | :--- | :--- | :--- |
| **HTTP Routing (Frontend)** | Inertia.js Router (`routes/web.php` + `resources/js/Pages/`) | TanStack Router (`src/routes/_authenticated/`) | Convert Inertia JSX pages into TanStack file-based routes (`.tsx`). |
| **HTTP Routing (Backend)** | Laravel Controllers (`app/Http/Controllers/` & `packages/*`) | Express TypeScript Routers (`server/src/routes/*.routes.ts`) | Map Laravel controller methods (`index`, `store`, `update`, `destroy`) to Express route handlers. |
| **ORM / Data Access** | Eloquent Models (`app/Models/` & `packages/*/Models/`) | **Prisma 5.19.1 Client & Proxy Facade** (`server/src/prisma.ts`) | Map Eloquent query chains (`Model::where()->with()`) to Prisma queries (`prisma.model.findMany({ include })`). |
| **Multi-Tenancy** | Single Database (`workspace_id` column or tenant scope) | **Dynamic Prisma Proxy Facade** (`prisma-proxy.facade.ts`) | Route all queries through `getTenantDb()` and `prismaProxy` with `tenantStorage.run()`. |
| **Auth Middleware** | `auth`, `verified`, `PlanModuleCheck` | `requireAuth` & `resolveTenantContext` | `requireAuth` verifies JWT -> `resolveTenantContext` binds `tenantStorage.run()`. |
| **Addon Entitlements** | Spatie Module Check / `UserActiveModule` | `requireAddon(addonSlug)` Express Middleware | Middleware queries `TenantAddon` table; throws HTTP 403 `ADDON_ENTITLEMENT_REQUIRED` if inactive. |
| **RBAC Policies** | Spatie Laravel Permission (`hasPermissionTo`, `can`) | `requireRole` & `requirePermission` Express Middleware | Guard routes with backend permission verification against `WorkspaceRole` & `RolePermission`. |
| **File Storage** | Spatie MediaLibrary / AWS S3 (`MediaController.php`) | Multer + Local/S3 Storage Service (`server/src/services/file-storage.service.ts`) | Maintain S3 / local upload parity for company logos, receipts, attachments. |
| **Realtime Events** | Laravel Echo + Pusher (`pusher/pusher-php-server`) | Pusher Node.js SDK + WebSockets (`server/src/lib/pusher.ts`) | Replicate WebSocket channels (`presence-chat`, `tenant-notifications`). |
| **State Management** | Inertia `usePage().props` | TanStack Query (`useQuery`, `useMutation`) + React Context | Client state managed via TanStack Query caching and mutation invalidation. |

---

## 2. API ENDPOINT & CONTROLLER MAPPING SPECIFICATION

Below is the mapping for representative endpoints between Laravel controllers and Target Express routers:

```
[Laravel Web Route]                       [Target Express API Route]
GET  /dashboard                      ──>  GET  /api/dashboard
GET  /users                          ──>  GET  /api/super/tenants (SuperAdmin) or /api/employees
POST /users                          ──>  POST /api/super/tenants or /api/employees
POST /users/{id}/impersonate         ──>  POST /api/super/tenants/:id/impersonate
GET  /plans                          ──>  GET  /api/super/plans
POST /plans                          ──>  POST /api/super/plans
GET  /add-ons                        ──>  GET  /api/addons
POST /add-ons/install                ──>  POST /api/addons/install
POST /add-on/{name}/enable           ──>  POST /api/addons/:name/enable
GET  /settings                       ──>  GET  /api/settings
POST /settings/brand                 ──>  POST /api/settings/brand
GET  /sales-invoices                 ──>  GET  /api/sales/invoices
POST /sales-invoices                 ──>  POST /api/sales/invoices
POST /sales-invoices/{id}/post       ──>  POST /api/sales/invoices/:id/post
GET  /purchase-invoices              ──>  GET  /api/purchases/invoices
GET  /sales-proposals                ──>  GET  /api/crm/proposals
POST /sales-proposals/{id}/convert   ──>  POST /api/crm/proposals/:id/convert-to-invoice
GET  /helpdesk-tickets               ──>  GET  /api/helpdesk/tickets
POST /helpdesk-tickets/{id}/replies  ──>  POST /api/helpdesk/tickets/:id/replies
GET  /messenger/messages/{userId}    ──>  GET  /api/chat/messages/:userId
POST /messenger/send                 ──>  POST /api/chat/send
```

---

## 3. MIDDLEWARE PIPELINE COMPARISON

### Laravel Request Pipeline:
```
Incoming Request -> Global Middleware -> Route Group -> auth -> verified -> PlanModuleCheck -> Spatie Permission -> Controller
```

### Target Express Pipeline (Enforcing Dynamic Proxy Facade):
```
Incoming Request -> express.json() -> requireAuth -> resolveTenantContext -> requirePermission -> requireAddon -> Express Router -> Prisma Proxy Facade -> MySQL
```

Every migrated router module MUST inherit this exact pipeline, guaranteeing 100% tenant context isolation, RBAC validation, and add-on entitlement checks before accessing the database.
