# MASTERHRMS — ROLE-BASED SETTINGS ACCESS & OVERLAP MATRIX
**Forensic Analysis of Platform vs Tenant vs HR vs Employee Permissions**  
**Repository:** `Webfamily-06/masterhrms`  
**Primary Branch:** `main`  
**Auditor Mode:** Read-Only Source-Verified Analysis  

---

## 1. Role Definitions & Hierarchy

MASTERHRMS models roles across two complementary layers:
1. **System Enum Roles (`AppRole` in `server/prisma/schema.prisma`)**:
   - `super_admin`: Global SaaS platform operator. Unrestricted control plane access across all tenants.
   - `hr_admin`: Enterprise workspace administrator. Manages organizational policies, employee master records, payroll, attendance, and tenant settings.
   - `manager`: Line manager / Department supervisor. Approves leave, attendance regularizations, and performance reviews.
   - `employee`: Standard workforce user. Operates strictly in Self-Service (ESS) mode (`/me/*`).
2. **Tenant Custom RBAC (`WorkspaceRole` & `RolePermission`)**:
   - Tenants can define custom granular roles (e.g. "Payroll Officer", "Recruitment Lead") mapped to permission strings (`hr.leave.write`, `payroll.process`).

---

## 2. Complete Role-to-Settings-Route & API Matrix

| Portal / Setting Area | Route URL | `super_admin` | Tenant Admin (`hr_admin` / Owner) | HR Admin | Line Manager | Employee | Source File Guard |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Super Admin Settings** | `/super/settings` | **FULL (RW)** | BLOCKED (403/404) | BLOCKED (403/404) | BLOCKED (403/404) | BLOCKED (403/404) | `workspace-host.middleware.ts` & `super.tsx` |
| **Platform Scope Settings API** | `PUT /api/v1/settings/PLATFORM/*` | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | BLOCKED (403) | `settings.routes.ts` (`resolveScopeAndId`) |
| **Tenant Settings Hub** | `/tenant/settings` | **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `tenant.tsx` (`evaluateRouteAccess`) |
| **HR Settings Quick Hub** | `/hr/settings` | **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `hr.tsx` (`evaluateRouteAccess`) |
| **Workspace Branding** | `/tenant/branding` or `/settings/branding`| **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `route-guards.ts` |
| **Company Profile** | `/tenant/company-profile` | **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `route-guards.ts` |
| **Custom Domain Config**| `/tenant/domain` | **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `tenant-domain.routes.ts` |
| **User & Role Access** | `/tenant/users`, `/tenant/roles` | **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `rbac.middleware.ts` |
| **Tenant Scope Settings API**| `PUT /api/v1/settings/TENANT/*` | **FULL (RW)** | **FULL (RW)** | **FULL (RW)** | BLOCKED (403) | BLOCKED (403) | `settings.routes.ts` |
| **Employee Self-Service Profile**| `/me/profile` | Read/Write Self | Read/Write Self | Read/Write Self | Read/Write Self | **Read/Write Self** | `employee-context.middleware.ts` |
| **Personal Account Security** | `/me/account` | Read/Write Self | Read/Write Self | Read/Write Self | Read/Write Self | **Read/Write Self** | `auth.routes.ts` |
| **2FA Verification / Setup** | `/two-factor-auth` | Read/Write Self | Read/Write Self | Read/Write Self | Read/Write Self | **Read/Write Self** | `twoFactorOtps` |
| **Dedicated Employee Settings** | `/me/settings` | **DOES NOT EXIST** | **DOES NOT EXIST**| **DOES NOT EXIST**| **DOES NOT EXIST**| **DOES NOT EXIST** | Verified: No route in either frontend |

---

## 3. Specific Forensic Findings

### A. Organization-Level vs Operational Policies vs Personal Preferences
1. **Organization-Level (Tenant Scope)**:
   - Corporate Branding (Logos, accent color, favicon, footer text).
   - Custom Domains and CNAME targets.
   - SMTP Mail Server credentials.
   - Object Storage bucket credentials (AWS S3 / Wasabi).
   - Payment Gateways (Razorpay, Stripe keys).
   - IP Firewall & Security Lockout policies.
2. **Operational Policies (Domain-Specific Tables)**:
   - Leave Types & Quotas (`LeaveType`, `LeavePolicy` tables).
   - Salary Structures & Deductions (`SalaryStructure`, `SalaryComponent` tables).
   - Shift Rosters & Work-week timings (`ShiftDefinition` table).
   - Statutory Slabs (PF, ESI, TDS via `StatutoryRule` table).
3. **Personal Settings (User Scope)**:
   - Personal TOTP 2FA secret and backup codes (`User` table).
   - Personal Email Accounts (`UserEmailAccount` table for incoming IMAP/POP3 & personal outgoing SMTP).
   - Theme toggle (Light/Dark mode stored in browser `localStorage` and HTML classes).

### B. Can Employee-Only Users Access HR or Tenant Settings?
- **Frontend Protection**: In `src/lib/route-guards.ts` (lines 166–200):
  - Accessing `/tenant/*`: `evaluateRouteAccess({ targetPortal: "tenant" })` checks `auth.isTenantAdmin`. If false, instantly redirects to `/403`.
  - Accessing `/hr/*`: `evaluateRouteAccess({ targetPortal: "hr" })` checks for HR roles (`hr_admin`, `manager`) or HR permissions. If false, redirects to `/403`.
- **Backend Protection**: In `server/src/routes/settings.routes.ts` (line 15):
  - `resolveScopeAndId` requires `super_admin` for `PLATFORM` scope.
  - Requires `hr_admin` or `super_admin` role for `TENANT` scope.
  - Non-admin attempts to mutate or read settings return HTTP 403 `Forbidden`.

### C. Does `/me/settings` Exist?
- **Source Verification**: Exhaustive search across `src/routes/_authenticated/me/` and `CMS/src/app/(workspace)/me/` confirms **NO `/me/settings` route exists**.
- Personal settings (profile, phone, avatar, password change, 2FA) are accessible under `/me/profile` and `/me/account`.

### D. System SMTP vs Personal Email Accounts
- **System-Wide SMTP**: Stored in `prisma.setting` (`email.*` keys) and encrypted in `prisma.settingSecret`. Used globally by `MailerFactory` to send automated notifications, payslips, and invites.
- **Personal Email Accounts**: Stored in `prisma.userEmailAccount` (`user_email_accounts` table). Managed under `/email-accounts` (or `/me/email-accounts`) with individual IMAP/POP3 credentials, allowing employees to connect their personal work mailboxes. There is zero collision between the two systems.
