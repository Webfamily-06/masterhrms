# MASTERHRMS — TENANT WORKSPACE ROUTING FLOW SPECIFICATION
**Forensic Source Route Analysis & User Journey Trace**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. End-to-End User Login -> Tenant Workspace Journey

### Step 1: User Arrives at Login
- **URL**: `http://localhost:3000/login` (or `https://{tenant-slug}.masterhrms.com/login`)
- **Component**: `UnifiedAuthPage` (`CMS/src/components/auth/UnifiedAuthPage.tsx`, line 30)
- **Host Context**: The page inspects `window.location.hostname`. If accessed via `{tenant-slug}.masterhrms.com`, tenant branding (logo, colors, company name) is fetched via `useTenantBranding()`.

### Step 2: Form Submission & Security Challenge
- User provides Work Email and Password.
- If Turnstile is active, Cloudflare Turnstile token is generated via `TurnstileWidget`.
- Frontend calls `POST /api/auth/login` (`server/src/routes/auth.routes.ts`, line 62).

### Step 3: Server Authentication & Tenant Resolution
1. Backend verifies email in `prisma.user.findUnique({ where: { email } })`.
2. Validates bcrypt password hash via `bcrypt.compare(password, user.passwordHash)`.
3. Verifies user roles in `prisma.userRole.findMany({ where: { userId } })`.
4. Checks 2FA requirements (`user.twoFactorEnabled` or tenant enforcement):
   - If 2FA active: returns `{ requires2FA: true, mfaToken: "..." }`.
   - Browser redirects to `/verify-2fa`.
5. Checks Tenant Subscription status: if `SUSPENDED` or `EXPIRED`, blocks access.
6. Issues signed JWT containing `{ userId, email, tenantId, roles, isImpersonating }`.
7. Resolves canonical workspace URL via `getWorkspaceUrl(tenant.slug)`.
8. Returns:
   ```json
   {
     "token": "eyJhbGciOi...",
     "user": { "id": "...", "email": "...", "tenantId": "tenant-default-001" },
     "roles": ["hr_admin"],
     "workspaceUrl": "http://default.localhost:3000"
   }
   ```

### Step 4: Client Redirection Engine
In `UnifiedAuthPage.tsx` (lines 310–330):
1. **Subdomain Hopping**: On production multi-tenant domains, if the login was submitted on the root public domain (`masterhrms.com`) and the user belongs to a tenant, the browser is redirected to `${workspaceUrl}/auth?token=${token}`.
2. **Local Dev / Single-Origin**: On `localhost`, subdomain redirection is skipped to prevent Windows loopback DNS failures. The route resolves via `resolveDefaultRoute(roles, redirect)` in `auth-navigation.ts` (lines 60–68):
   - `super_admin` ➔ `/super`
   - `tenant_admin` / `admin` / `owner` ➔ `/tenant/dashboard`
   - `hr_admin` / `manager` ➔ `/hr/dashboard`
   - `employee` ➔ `/me/dashboard`
3. If an explicit redirect param was provided (e.g. `?redirect=/hr/leave/types`), it is validated via `isSafeRelativeUrl()` and used as the destination.

---

## 2. Tenant Workspace Route Tree & Manifest

In both **Frontend A (`src/routes/_authenticated/tenant/`)** and **Frontend B (`CMS/src/app/(workspace)/tenant/`)**, the Tenant Workspace provides an administrative suite scoped strictly to the authenticated tenant.

### Route 0: Tenant Workspace Root & Layout
- **TanStack File**: `src/routes/_authenticated/tenant.tsx`
- **Next.js CMS File**: `CMS/src/app/(workspace)/tenant/layout.tsx` (and `(workspace)/layout.tsx`)
- **Route URL**: `/tenant/*`
- **Parent Layout**: `_authenticated` (`src/routes/_authenticated/route.tsx`)
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })` (`src/lib/route-guards.ts`, lines 166–172).
- **Required Role**: `isTenantAdmin` (`tenant_admin`, `admin`, `owner`, `hr_admin`) or `super_admin`. Regular employees receive an immediate redirect to `/403`.
- **Components Rendered**: `AppShell` with `DreamsSidebar` / `AppSidebar` and tenant portal header.

---

### Complete Route-by-Route Forensic Inventory

#### 1. Tenant Dashboard
- **File**: `src/routes/_authenticated/tenant/dashboard.tsx` | `CMS/src/app/(workspace)/tenant/dashboard/page.tsx`
- **Route URL**: `/tenant/dashboard` (and `/tenant/` via index redirect)
- **Parent Layout**: `/tenant`
- **Access Guard**: Inherits `tenant.tsx` (`evaluateRouteAccess({ targetPortal: "tenant" })`)
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `TenantDashboardPage`, Stat widgets, metric trends, quick action hubs, workforce charts.
- **API Dependencies**: `GET /api/v1/workspace/metrics`, `GET /api/v1/dashboard/stats`
- **Database Dependencies**: `Tenant`, `Employee`, `Attendance`, `LeaveRequest`, `BillingInvoice`
- **Related Services**: `WorkspaceService`, `EmployeeService`
- **Status**: `Verified implementation`

#### 2. Tenant Settings (Unified Settings Hub)
- **File**: `src/routes/_authenticated/tenant/settings.tsx` | `CMS/src/app/(workspace)/tenant/settings/page.tsx`
- **Route URL**: `/tenant/settings?tab={tab}`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `TenantSettingsPage`, `SharedSettingsShell scope="TENANT"`, `SettingsNestedNav`, `LivePreviewDock`, `UnsavedChangesBar`
- **API Dependencies**:
  - `GET /api/v1/settings/TENANT/branding?tenantId={id}`
  - `GET /api/v1/settings/TENANT/locale?tenantId={id}`
  - `GET /api/v1/settings/TENANT/email?tenantId={id}`
  - `GET /api/v1/settings/TENANT/storage?tenantId={id}`
  - `GET /api/v1/settings/TENANT/security?tenantId={id}`
  - `GET /api/v1/settings/TENANT/payments?tenantId={id}`
  - `PUT /api/v1/settings/TENANT/:group?tenantId={id}`
  - `DELETE /api/v1/settings/TENANT/:group/:key?tenantId={id}`
  - `POST /api/v1/settings/TENANT/:group/test?tenantId={id}`
- **Database Dependencies**: `Setting`, `SettingSecret`, `SettingAudit`, `MediaFile`
- **Related Services**: `SettingsService`, `RuntimeLifecycleService`, `MailerFactory`, `StorageFactory`
- **Status**: `Verified implementation`

#### 3. Workspace Branding
- **File**: `src/routes/_authenticated/tenant/branding.tsx` | `CMS/src/app/(workspace)/tenant/branding/page.tsx`
- **Route URL**: `/tenant/branding`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `WorkspaceBrandingSettings`, `MediaImageUploader`, color pickers.
- **API Dependencies**: `GET /api/v1/settings/TENANT/branding`, `PUT /api/v1/company-profile`
- **Database Dependencies**: `Setting`, `Tenant`, `MediaFile`
- **Related Services**: `BrandingResolverService`, `SettingsService`
- **Status**: `Verified implementation`

#### 4. Company Profile
- **File**: `src/routes/_authenticated/tenant/company-profile.tsx` | `CMS/src/app/(workspace)/tenant/company-profile/page.tsx`
- **Route URL**: `/tenant/company-profile`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `CompanyProfileSettings`, registration numbers, legal entity, tax IDs (PAN/GST/EIN), address.
- **API Dependencies**: `GET /api/company-profile`, `PUT /api/company-profile`
- **Database Dependencies**: `Tenant`, `CompanyProfile`
- **Related Services**: `WorkspaceService`, `TenantService`
- **Status**: `Verified implementation`

#### 5. Custom Domain & Subdomain Management
- **File**: `src/routes/_authenticated/tenant/domain.tsx` | `CMS/src/app/(workspace)/tenant/domain/page.tsx`
- **Route URL**: `/tenant/domain`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `CustomDomainSettings`, DNS verification checklist, CNAME target generator, SSL status badges.
- **API Dependencies**:
  - `GET /api/tenant/domains`
  - `POST /api/tenant/domains/request`
  - `POST /api/tenant/domains/:id/verify-dns`
  - `PUT /api/tenant/domains/:id/primary`
  - `DELETE /api/tenant/domains/:id`
- **Database Dependencies**: `TenantDomain`, `Tenant`
- **Related Services**: `TenantDomainService`, `WorkspaceHostMiddleware`
- **Status**: `Verified implementation`

#### 6. Users & Members Management
- **File**: `src/routes/_authenticated/tenant/users.tsx` | `CMS/src/app/(workspace)/tenant/users/page.tsx`
- **Route URL**: `/tenant/users`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: User table, invite modal, role assignment drawer, deactivate modal.
- **API Dependencies**: `GET /api/users`, `POST /api/users/invite`, `PATCH /api/users/:id/role`, `DELETE /api/users/:id`
- **Database Dependencies**: `User`, `UserRole`, `Profile`, `Tenant`, `Employee`
- **Related Services**: `UserService`, `AuthService`
- **Status**: `Verified implementation`

#### 7. Roles & Permissions (Custom RBAC)
- **File**: `src/routes/_authenticated/tenant/roles.tsx` | `CMS/src/app/(workspace)/tenant/roles/page.tsx`
- **Route URL**: `/tenant/roles`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `WorkspaceRolesTable`, permission matrix editor, system vs custom role chips.
- **API Dependencies**: `GET /api/roles`, `POST /api/roles`, `PUT /api/roles/:id`, `DELETE /api/roles/:id`
- **Database Dependencies**: `WorkspaceRole`, `RolePermission`, `UserRoleAssignment`
- **Related Services**: `RbacService`
- **Status**: `Verified implementation`

#### 8. Modules & Feature Toggles
- **File**: `src/routes/_authenticated/tenant/modules.tsx` | `CMS/src/app/(workspace)/tenant/modules/page.tsx`
- **Route URL**: `/tenant/modules`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: Module card grid (HRM, Payroll, Recruitment, Attendance, Performance, Assets, POS, Invoicing).
- **API Dependencies**: Currently operates on local React state (`useState`), lacks direct backend persistence endpoint.
- **Database Dependencies**: `TenantAddon`, `TenantSubscription` (intended)
- **Related Services**: `SubscriptionService`
- **Status**: `Partial implementation` (UI functional; persistence to `TenantAddon` missing)

#### 9. Subscription & Billing
- **File**: `src/routes/_authenticated/tenant/subscription.tsx` & `billing.tsx` | `CMS/src/app/(workspace)/tenant/subscription/page.tsx`
- **Route URL**: `/tenant/subscription` and `/tenant/billing`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin
- **Components Rendered**: Current plan card, usage meters, invoice history, payment method, upgrade modal.
- **API Dependencies**: `GET /api/billing/subscription`, `GET /api/invoices`, `POST /api/billing/checkout`
- **Database Dependencies**: `TenantSubscription`, `SubscriptionPlan`, `BillingInvoice`
- **Related Services**: `BillingService`, `RazorpayService`
- **Status**: `Verified implementation`

#### 10. Audit Logs
- **File**: `src/routes/_authenticated/tenant/audit-logs.tsx` | `CMS/src/app/(workspace)/tenant/audit-logs/page.tsx`
- **Route URL**: `/tenant/audit-logs`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: Audit event table, actor search, action filter, IP and timestamp details.
- **API Dependencies**: `GET /api/audit-logs`
- **Database Dependencies**: `SettingAudit`, `LoginHistory`, `EmployeeActivityLog`
- **Related Services**: `AuditService`
- **Status**: `Verified implementation`

#### 11. Integrations, SMTP & API Keys
- **File**: `src/routes/_authenticated/tenant/integrations.tsx` | `CMS/src/app/(workspace)/tenant/integrations/page.tsx`
- **Route URL**: `/tenant/integrations`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin
- **Components Rendered**: Standalone SMTP card, REST API Key card.
- **API Dependencies**: Currently uses mock `useState` with hardcoded API key and toast-only `handleSave`. Real SMTP is managed via `/tenant/settings?tab=communication` (`SharedSettingsShell`).
- **Database Dependencies**: None in this standalone file.
- **Related Services**: `SettingsService` (in settings page)
- **Status**: `Mocked behavior` (Standalone page is a legacy stub; superseded by `/tenant/settings?tab=communication`)

#### 12. Data Management & Backups
- **File**: `src/routes/_authenticated/tenant/data.tsx` | `CMS/src/app/(workspace)/tenant/data/page.tsx`
- **Route URL**: `/tenant/data`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin
- **Components Rendered**: Export All Data card, automated snapshot status.
- **API Dependencies**: `handleExport` runs `setTimeout` mock toast; backend bulk backup endpoint not wired.
- **Database Dependencies**: None.
- **Related Services**: None.
- **Status**: `UI only` / `Mocked behavior`

#### 13. Tenant Support
- **File**: `src/routes/_authenticated/tenant/support.tsx` | `CMS/src/app/(workspace)/tenant/support/page.tsx`
- **Route URL**: `/tenant/support`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: Support ticket submission, priority picker, open tickets table.
- **API Dependencies**: `GET /api/support/tickets`, `POST /api/support/tickets`
- **Database Dependencies**: `PlatformSupportTicket`, `PlatformTicketMessage`
- **Related Services**: `SupportService`
- **Status**: `Verified implementation`

#### 14. Tenant Chat & Collaboration
- **Files**: `src/routes/_authenticated/tenant/chat.tsx`, `chat.calls.tsx`, `chat.contacts.tsx`, `chat.groups.tsx`
- **Route URL**: `/tenant/chat`, `/tenant/chat/calls`, `/tenant/chat/contacts`, `/tenant/chat/groups`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `UnifiedChatApp` (mounts identical full chat component as `/hr/chat`)
- **API Dependencies**: `GET /api/chat/conversations`, Socket.IO connection
- **Database Dependencies**: `Conversation`, `Message`, `Call`
- **Related Services**: `SocketService`, `MeetingSFUService`
- **Status**: `Verified implementation`

#### 15. Tenant Todo & Calendar
- **Files**: `src/routes/_authenticated/tenant/todo.tsx`, `todo.gantt.tsx`, `calendar.tsx`
- **Route URL**: `/tenant/todo`, `/tenant/todo/gantt`, `/tenant/calendar`
- **Parent Layout**: `/tenant`
- **Access Guard**: `evaluateRouteAccess({ targetPortal: "tenant" })`
- **Required Role**: Tenant Admin / HR Admin
- **Components Rendered**: `WorkspaceTodoPage`, `WorkspaceGanttPage`, `CalendarView`
- **API Dependencies**: `GET /api/todos`, `GET /api/calendar`
- **Database Dependencies**: `WorkspaceTodo`, `CalendarEvent`
- **Related Services**: `TodoService`, `CalendarService`
- **Status**: `Verified implementation`
