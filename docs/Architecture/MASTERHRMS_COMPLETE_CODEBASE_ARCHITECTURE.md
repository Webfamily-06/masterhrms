# MASTERHRMS — COMPLETE CODEBASE ARCHITECTURE SPECIFICATION
**Authoritative Forensic Architecture Reconstruction**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Date:** November 16, 2026  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. Executive System Topology

MASTERHRMS is a multi-tenant enterprise Workforce & Resource Planning (HRMS/ERP) platform structured as a dual-frontend, single-authoritative-backend monorepo.

```
                           +-----------------------------------------------+
                           |               Clients & Browsers              |
                           +-----------------------------------------------+
                                         |                   |
                     Port 5173 / Subdomain |                   | Port 3000 / Subdomain
                                         v                   v
            +---------------------------------+     +----------------------------------+
            |  Frontend A: TanStack Start     |     |  Frontend B: Next.js 15 App      |
            |  React 19 + Vinxi               |     |  Next.js 15.2.1 + React 19       |
            |  `src/`                         |     |  `CMS/src/`                      |
            +---------------------------------+     +----------------------------------+
                     \                                     /
                      \         HTTP API (Port 5000)      /
                       +---------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |  Backend: Express + Node.js (v24)     |
                     |  TypeScript Engine                    |
                     |  `server/src/index.ts`                |
                     +---------------------------------------+
                           /             |             \
                          /              |              \
                         v               v               v
             +---------------+   +---------------+   +-------------------+
             | Socket.IO /   |   | Prisma ORM    |   | Redis / Memory    |
             | Pusher /      |   | (v5.22.0)     |   | TTL Caches &      |
             | LiveKit SFU   |   | Multi-Tenant  |   | Rate Limiters     |
             +---------------+   +---------------+   +-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |  Database: Supabase PostgreSQL        |
                     |  Shared Schema + Tenant ID Isolation  |
                     |  192 Models | 83 System Settings Keys |
                     +---------------------------------------+
```

---

## 2. Frontend Layer Comparison & Audit

| Property | Frontend A (`src/`) | Frontend B (`CMS/src/`) |
| :--- | :--- | :--- |
| **Framework** | TanStack Start (Vinxi) | Next.js 15.2.1 (Turbopack / App Router) |
| **React Runtime** | React 19 (`^19.0.0`) | React 19 (`^19.0.0`) |
| **Routing Model** | File-based typed routes via `@tanstack/react-router` in `src/routes/` | App Router directory-based `page.tsx` in `CMS/src/app/` |
| **Root Layout** | `src/routes/__root.tsx` -> `src/routes/_authenticated.tsx` -> `src/routes/_authenticated/_app/route.tsx` (`AppShell`) | `CMS/src/app/layout.tsx` -> `CMS/src/app/(workspace)/layout.tsx` -> `DreamsSidebar` |
| **Client State / Cache** | `@tanstack/react-query` v5 (`QueryClientProvider`) | `@tanstack/react-query` v5 (`QueryClientProvider`) |
| **API Client** | `src/lib/api.ts` (Axios wrapper with bearer token from `localStorage.getItem("hrms_auth_token")`) | `CMS/src/lib/api.ts` (Axios wrapper with bearer token from `localStorage.getItem("hrms_auth_token")`) |
| **UI Component Library** | Tailwind CSS v4, Lucide React, Radix UI primitives | Tailwind CSS v4, Lucide React, Phosphor Icons, Radix UI |
| **Realtime Client** | `src/lib/socket.ts` (Socket.IO client with room subscriptions) | `CMS/src/lib/socket.ts` (Socket.IO client with room subscriptions) |
| **Turnstile Protection** | `src/components/security/turnstile-widget.tsx` | `CMS/src/components/security/turnstile-widget.tsx` |

### Key Frontend Findings
1. **Dual-Frontend Parity Goal**: `src/` serves as the high-speed TanStack Start client, while `CMS/src/` provides the comprehensive Next.js 15 App Router administration portal.
2. **Shared Session Storage**: Both frontends use the identical browser storage key (`hrms_auth_token`) and decode JWT payloads using the same contract (`extractRolesFromToken` in `auth-navigation.ts`).
3. **Tenant Context Binding**: Frontend API clients automatically attach `Authorization: Bearer <token>` and `x-tenant-id` (when impersonating or explicit) on all REST queries.

---

## 3. Backend Architecture (`server/src/`)

### 3.1 Entry Point & Middleware Pipeline
The server initializes in `server/src/index.ts` with a strictly ordered middleware pipeline:
1. **Security & Protocol**: `helmet()`, `cors({ origin: true, credentials: true })`, `express.json({ limit: "50mb" })`, `express.urlencoded({ extended: true })`.
2. **Workspace Host Resolution**: `workspaceHostMiddleware` (`server/src/middleware/workspace-host.middleware.ts`)
   - Normalizes `Host`, `X-Forwarded-Host`, `Origin`.
   - Extracts tenant slug or verified custom domain.
   - Binds `req.hostContext` and `req.resolvedTenant`.
   - Rejects illegal Super Admin access over tenant hosts with HTTP 404.
3. **Authentication**: `requireAuth` (`server/src/middleware/auth.ts`)
   - Extracts Bearer token or cookie.
   - Verifies JWT against `JWT_SECRET`.
   - Binds `req.user` (`userId`, `email`, `tenantId`, `roles`).
4. **Tenant Context & Isolation**: `resolveTenantContext` (`server/src/middleware/tenant-context.middleware.ts`)
   - Validates that `req.user.tenantId` matches `req.resolvedTenant.id` (blocks cross-tenant token tampering with HTTP 403 `HOST_TENANT_MISMATCH`).
   - Obtains Prisma client via `TenantConnectionManager.getInstance().getClientForTenant(tenantId)`.
   - Enforces IP allowlist / ban rules (`BannedIp`).
   - Runs downstream execution inside `AsyncLocalStorage` via `tenantStorage.run(context, next)`.
5. **Employee Profile Context**: `requireEmployee` (`server/src/middleware/employee-context.middleware.ts`)
   - Automatically auto-links or auto-provisions employee records for authenticated workspace users accessing self-service.
6. **Authorization & RBAC**: `requireRoles(...)` / `requirePermission(...)` (`server/src/middleware/rbac.middleware.ts`).

### 3.2 Service Factories & Integration Layer
- **`MailerFactory`** (`server/src/services/factories/mailer.factory.ts`): Creates tenant-isolated Nodemailer SMTP transporters, caching connection pools and invalidating on `email.*` setting updates.
- **`StorageFactory`** (`server/src/services/factories/storage.factory.ts`): Resolves local disk (`storage.local_path`) or Amazon S3 / Wasabi buckets (`storage.s3_bucket`, `storage.s3_region`, `storage.s3_access_key`, `storage.s3_secret_key`).
- **`SmsFactory`** (`server/src/services/factories/sms.factory.ts`): Twilio / MSG91 provider dispatch.
- **`OAuthFactory`** (`server/src/services/factories/oauth.factory.ts`): Google, GitHub, Microsoft SSO callback and CSRF verification.
- **`RealtimeFactory`** (`server/src/services/factories/realtime.factory.ts`): Socket.IO room broadcaster targeting `platform:admin` or `tenant:${tenantId}`.
- **`MeetingSFUService`** (`server/src/services/meeting-sfu.service.ts`): LiveKit SFU group call engine.
- **`PusherService`** (`server/src/services/pusher.service.ts`): Secondary cloud websocket fallback.

---

## 4. Database Layer & Prisma ORM

### 4.1 Specifications
- **Provider**: PostgreSQL (`postgresql` via Supabase Connection Pooler / Direct URL).
- **ORM**: Prisma Client v5.22.0.
- **Total Schema Models**: 192 models (`server/prisma/schema.prisma`).
- **Migration Count**: 26 migrations in `server/prisma/migrations/`.

### 4.2 Multi-Tenant Data Architecture
The platform enforces a hybrid tenancy model governed by `tenant-models.config.ts`:
1. **Direct Tenant Models (147 models)**: Contain a direct `tenantId` column (e.g. `Employee`, `Attendance`, `LeaveRequest`, `PayrollRun`, `JournalEntry`, `Sale`, `Purchase`, `Department`).
2. **Child Dependent Models (34 models)**: Scoped through parent relations (e.g. `SalaryStructureItem` -> `SalaryStructure`, `TaxDeclarationProof` -> `EmployeeTaxDeclaration`, `SaleDetail` -> `Sale`).
3. **Scoped Key-Value Models (2 models)**: `Setting` and `SettingAudit` contain `scope` (`PLATFORM` | `TENANT` | `USER`) and `scopeId` (`global` | `<tenantId>` | `<userId>`). Secrets stored in `SettingSecret` with AES-256-GCM.
4. **Global Platform Control Plane Models (12 models)**: `User`, `SubscriptionPlan`, `Coupon`, `Addon`, `CmsPage`, `Permission`, `TwoFactorOtp`, `SystemCronJob`, `LoginHistory`, `StateUTMaster`.
5. **Root Tenant Model**: `Tenant` (`id` is tenant identifier).
