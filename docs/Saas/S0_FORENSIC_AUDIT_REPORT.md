# MASTERHRMS — STEP S0: SETTINGS-DRIVEN RUNTIME, ZERO-MOCK & CRUD FORENSIC AUDIT REPORT

**Document ID:** `DOC-SAAS-S0-001`  
**Version:** `1.0.0`  
**Execution Context:** Localhost Forensic Read-Only Audit (No Code Modified)  
**Author:** Principal Software Architect, Senior Full-Stack Engineer, DevSecOps Lead  
**Governing Spec:** `docs/Saas/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md`  
**Date:** 2026-10-11  

---

## 1. Executive Summary & Audit Mission

Per the approved roadmap sequencing, external staging infrastructure activities (VPS, DNS, TLS, remote Nginx) have been formally classified as **`DEFERRED — SERVER REQUIRED`** to avoid blocking development. Localhost development resumes on the **S-Track (Settings-Driven Realtime Platform, Zero-Mock Cleanup, and CRUD Completion)**.

This report fulfills **Step S0: Forensic Read-Only Audit**. It identifies every runtime `process.env` read that should be a database-backed setting, catalogs mock/hardcoded data fallbacks across the codebase, audits the dashboard inventory, uncovers critical file API security gaps, and provides the complete prioritized task roadmap for Steps S1 through S6.

---

## 2. Runtime `process.env` Reads vs. Database Settings Audit

### 2.1 The Architectural Rule
Bootstrap values belong in `.env` (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `BASE_DOMAIN`). All operational configurations (payment gateways, OAuth client credentials, SMTP credentials, Pusher/Socket, SMS gateways, storage adapters, AI keys, reCAPTCHA, and branding) must be read dynamically from role-scoped database settings (`Setting`, `SettingSecret`, and `system-platform-settings`), with updates taking effect in real time without server restarts.

### 2.2 Forensic Inventory of Runtime `process.env` Reads

| Consumer / Service | File & Line | `process.env` Keys Read | Audit Finding & Gap | Target Setting Group |
| :--- | :--- | :--- | :--- | :--- |
| **Email Dispatch Engine** | `server/src/lib/email.ts:39-46` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ENCRYPTION`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` | **CRITICAL GAP:** Nodemailer creates static transport from `process.env` with fallback to `dev-mock-*`. Does not read from `EmailProvider` or `Setting` table. | `email` (Platform & Tenant) |
| **Platform Gateway Verification** | `server/src/services/gateway-verification.service.ts:27-28, 147-149, 295` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `STRIPE_SECRET_KEY` | Reads from `process.env` as fallback when testing gateways instead of strictly querying decrypted database secrets. | `payment` (Platform scope) |
| **Razorpay Sandbox Engine** | `server/src/services/razorpay-sandbox.service.ts:73, 90, 98` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Reads environment variables directly when initializing checkout orders if not explicitly passed from `system-platform-settings`. | `payment` (Platform scope) |
| **Alert & Notification Dispatch** | `server/src/services/alert-notification.service.ts:22, 30` | `SLACK_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN` | Hardcoded `process.env` reads for third-party alerts; no UI in Tenant or Super Admin settings. | `messaging` / `integration` |
| **Storage Encryption Engine** | `server/src/services/storage/local-encrypted-storage.service.ts:22-35` | `STORAGE_ENCRYPTION_KEY`, `STORAGE_ENCRYPTION_KEY_RING` | Reads static key ring from env; cannot rotate storage keys via UI. | `storage` (Platform scope) |
| **Digital Signature Engine** | `server/src/services/digital-signature.service.ts:60-109` | `BANK_SIGNING_PRIVATE_KEY`, `BANK_SIGNING_CERT`, `BANK_SIGNING_PUBLIC_KEY` | Reads static signing keys from env instead of database keystore. | `finance` / `security` |
| **Branding Fallback Resolver** | `server/src/services/branding/branding-resolver.service.ts:159` | `APP_URL` | Fallback URL string uses env instead of dynamic root resolution. | `branding` (Platform scope) |
| **Settings Crypto Key Derivation** | `server/src/services/settings/settings.service.ts:17-18` | `ENCRYPTION_KEY`, `JWT_SECRET` | Acceptable bootstrap secret, but falls back to hardcoded string if missing. | Bootstrap only |

---

## 3. Settings Groups Implementation Matrix (Super Admin vs. Tenant Admin)

| Settings Group | DB Model / Store | API Route Mounted | Perm Guard | Super Admin UI (`/super/settings`) | Tenant Admin UI (`/tenant/settings`) | Realtime Sync | Test Action | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Branding & Logos** | `Setting`, `MediaFile` | `/api/settings`, `/api/branding` | Yes | Yes (Tab: Identity) | Yes (`/tenant/branding`) | `settings.updated` | No | **PARTIAL** |
| **Company Profile** | `CompanyProfile` | `/api/company-profile` | Yes | Yes (Tab: Addresses) | Yes (`/tenant/company-profile`) | No | No | **COMPLETE** |
| **Locale & Timezone** | `Setting` (key: `locale.*`) | `/api/settings` | Yes | Yes (Tab: Currency) | **MOCK UI ONLY** (`useState`) | `settings.updated` | No | **CRITICAL GAP** |
| **Platform Payments** | `CmsPage` (`system-platform-settings`) | `/api/cms/pages/*`, `/api/payments` | Super Only | Yes (Tab: Payments) | N/A | No | Yes | **COMPLETE** |
| **Tenant Invoicing Payments** | `Setting` (`system-razorpay-gateway-*`) | `/api/payments/razorpay/config` | Tenant Entitled | N/A | No dedicated card (in Marketplace) | No | Yes | **PARTIAL** |
| **SMTP / Email** | None (reads `process.env`) | `/api/super/settings/test-email` | Super Only | Yes (Tab: SMTP) | No UI | No | Yes | **CRITICAL GAP** |
| **OAuth / Social Login** | None (reads `process.env`) | `/api/auth/oauth/*` | Public / Super | Yes (Tab: OAuth) | No UI | No | No | **CRITICAL GAP** |
| **Pusher / Realtime** | None (reads `process.env`) | No dedicated CRUD | Super Only | Yes (Tab: Pusher) | No UI | No | No | **PARTIAL** |
| **Storage Disks & Quotas** | None | `/api/media` | No disk CRUD | No UI | Quota bar only | No | No | **GAP** |
| **AI Providers & Credits** | `Setting` | `/api/ai/config` | Yes | In Addons list | No UI | No | Yes | **PARTIAL** |
| **System Maintenance** | `SystemMaintenance` | `/api/system/maintenance` | Super Only | Yes (Tab: System) | No UI | Polled | No | **COMPLETE** |
| **reCAPTCHA / Security** | None | `/api/system/recaptcha` | Super Only | Yes (Tab: System) | In tenant settings (dummy switch) | No | No | **PARTIAL** |

---

## 4. Mock & Hardcoded Data Inventory

Following Section 7 of the S-Track Plan, mock data is classified into 4 strict categories:

### 4.1 Class A: Silent Mock Fallbacks in Backend Services
- **`server/src/routes/integration.routes.ts:260`**:
  `const secret = (config.config as any)?.secretKey || (config.config as any)?.consumerSecret || "mock-secret";`
  *Risk:* Silently authenticates integrations with `"mock-secret"` when credentials are empty.
- **`server/src/lib/email.ts:795`**:
  Returns `{ success: true, messageId: "dev-mock-..." }` when SMTP configuration is invalid or unconfigured, giving false-positive delivery confirmations.
- **`server/src/services/ai-automation.service.ts:7-174`**:
  Hardcoded `"mock-sandbox"` fallback extracts pre-canned OCR text without calling real OCR models.
- **`server/src/services/messaging-gateway.service.ts:7-224`**:
  Hardcoded `"mock-sandbox"` fallback silently simulates SMS delivery without calling Fast2SMS, MSG91, or Meta WhatsApp APIs.
- **`server/src/routes/tenant-domain.routes.ts:234`**:
  `process.env.MOCK_DNS_VERIFY === "true"` auto-approves custom domains without real DNS resolver lookups.

### 4.2 Class B: Dummy Fallback Values in UI Components
- **`src/routes/_authenticated/_app/employee-dashboard.tsx:430-467`**:
  Hardcoded sample strings when employee profile data is null:
  - `"Alex Morgan"` (name)
  - `"Senior Full Stack Engineer"` (designation)
  - `"Engineering Team"` (department)
  - `"#EMP-0001"` (employee code)
  - `"employee@masterhrms.com"` (email)
  - `"15 Jan 2024"` (joining date)
- **`src/routes/_authenticated/tenant/settings.tsx:26-37`**:
  `handleSave` only triggers `toast.success()` without persisting to any API.
- **`src/routes/_authenticated/hr/documents/index.tsx:48, 83`**:
  Hardcoded file URLs pointing to `"/mock/docs/company-policy.pdf"`.
- **`src/routes/_authenticated/super/settings.tsx:250-340`**:
  Hardcoded strings in `DEFAULT_SETTINGS`:
  - `recaptchaSiteKey: "6Ld_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`
  - `pusherKey: "psh_key_998877"`
  - `paypalClientId: "AQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`
  - `razorpayKeyId: "rzp_test_99XXXXXXXX"`
  - `smtpLogs: [{ id: "log-1", recipient: "test.admin@company.com" }]`
  - `bankTransferDetails: "Bank: HDFC Bank..."`

### 4.3 Class C: Dev/Test Simulation Flags (Approved for Test Harnesses Only)
- Vitest mock transports in `server/src/services/razorpay-sandbox.service.ts` (`mockTransport`).
- Test headers in `server/src/routes/super.routes.ts:4449` (`x-test-mock-dns`).

### 4.4 Class D: Legitimate Seed Data (Approved)
- `server/prisma/seed-dynamic-data.ts`: Default Super Admin user, platform plan configurations, initial leave types.

---

## 5. Dashboard Inventory across Portals

| Portal / Route | Primary Data API | Widgets Present | Realtime Topic | Mock / Hardcoded Data Found | Mobile Responsive (<400px) |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Super Admin** (`/super`) | `GET /api/super/dashboard` | MRR, Active Tenants, System Health, New Signups | `tenant.created` | Real database metrics | **YES** |
| **HR Command Center** (`/hr/dashboard`) | `GET /api/dashboard/stats` | Headcount, Attendance Board, Leave Requests, Payroll Run | `attendance.punched` | Real database metrics | **YES** |
| **Employee Self-Service** (`/me/dashboard` / `/employee-dashboard`) | `GET /api/v1/me/dashboard` | Clock-in Widget, Leave Quotas, Upcoming Shifts, Payslip Preview | `attendance.punched` | **YES (Class B fallbacks: Alex Morgan, #EMP-0001)** | **YES** |
| **Tenant Admin** (`/tenant/dashboard`) | `GET /api/tenant/overview` | Active Users, Plan Limits, Storage Quota, Installed Modules | `entitlement.changed`| Real database metrics | **YES** |
| **CRM Pipeline** (`/crm/dashboard`) | `GET /api/crm/overview` | Lead Funnel, Deal Stages, Won Revenue | None | Partial (Recharts live) | **YES** |
| **POS Terminal** (`/pos`) | `GET /api/pos/register` | Register Status, Active Cart, Cash Drawer | Socket broadcast | Real database metrics | **YES** |
| **Client Portal** (`/client-dashboard`) | `GET /api/dashboard/client` | Active Projects, Invoices Due, Open Tickets | None | Real database metrics | **YES** |

---

## 6. Critical Security Gap: File API & Static Uploads

### 6.1 Unauthenticated Static Upload Exposure
Inspection of `server/src/index.ts` lines 175-183 revealed:
```typescript
app.use(
  "/uploads",
  express.static(getUploadsRoot(), {
    maxAge: "7d",
    etag: true,
    lastModified: true,
    fallthrough: false,
  })
);
app.use(workspaceHostMiddleware); // Host resolution early in the pipeline
```

### 6.2 Security Vulnerabilities
1. **Bypasses Workspace Host Isolation:** `/uploads` is mounted **before** `workspaceHostMiddleware`. Incoming requests never undergo tenant host validation.
2. **Zero Authentication or Access Control:** Files stored in `getUploadsRoot()` are served publicly to any client possessing the filename or path.
3. **Private Document Exposure:** If tenant contracts, employee KYC documents, resumes, or payslips are stored under `/uploads`, they can be accessed without a login token.

### 6.3 Required Architecture Fix
- Split file storage into **Public** (`/uploads/public/` for logos, favicons, branding) and **Private** (`/uploads/private/` for employee documents, payslips, invoices).
- Route all private files through an authenticated controller:
  `GET /api/media/private/:id` with tenant scoping, permission checks, and expiring signed download URLs.

---

## 7. Prioritized S-Track Roadmap & Estimates

Based on the forensic audit evidence, the execution sequence for the remaining S-Track steps is defined as follows:

| Step ID | Name | Focus & Scope | Estimated Effort | Gate / Success Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **S0** | **Forensic Read-Only Audit** | Catalog all env reads, mock data, dashboard gaps, and file API flaws. | **COMPLETED** | Operator review & approval of `S0_FORENSIC_AUDIT_REPORT.md` |
| **S1** | **Settings Core & Realtime Engine** | Expand `settings-registry.ts` with email, oauth, storage, and security groups. Add dynamic AES-256-GCM secret rotation and `settings.updated` Socket.io broadcast. | 1 Session | Realtime update propagates across 2 browser sessions without server restart. |
| **S2** | **Runtime Consumer Factories** | Refactor Nodemailer (`email.ts`), OAuth strategies, storage manager, and SMS dispatch to read dynamically from DB settings instead of `process.env`. | 1 Session | Changing SMTP or OAuth credentials in UI instantly affects next request. |
| **S3** | **Settings UI Unification** | Connect `/tenant/settings` to real API endpoints (remove mock `useState`). Add provider test buttons (Send Test Email, Test SMS, Verify OAuth). | 1 Session | Every settings card saves to DB and displays live verified badges. |
| **S4** | **Private File Storage Hardening** | Restrict `/uploads` to public assets only. Mount authenticated private document streaming at `/api/media/private/:id` with tenant ownership checks. | 1 Session | Cross-tenant private file download returns HTTP 403 Forbidden. |
| **S5** | **Zero-Mock Cleanup** | Remove Class A and Class B mock data in `employee-dashboard.tsx`, `integration.routes.ts`, and `hr/documents/index.tsx`. Implement clean empty/error states. | 1 Session | Zero hardcoded employee strings; clean empty states for brand new tenants. |
| **S6** | **Full CRUD & Regression Gate** | Complete missing CRUD operations in non-HRMS modules (CRM, Finance, Inventory). Verify 82+ automated acceptance tests and frontend production bundle. | 1 Session | 100% acceptance tests green; zero TypeScript errors. |

---

## 8. Summary & Next Step

Step S0 is formally **COMPLETE**. Localhost development has been cleanly decoupled from external staging infrastructure. 

**Next Action:** Proceed to **Step S1 (Settings Core & Realtime Engine)** upon operator authorization.
