# MASTERHRMS — PHASE A3.7 & A3.8 STATUS RECONCILIATION & RAZORPAY CONFIGURATION AUDIT REPORT

**Audit Date:** 2026-10-10  
**Environment:** Local Development & Authorized Staging (`http://localhost:4000`, `http://localhost:5173`)  
**Auditor Roles:** Principal Platform Security Architect, Multi-Tenant Database Reliability Engineer, Senior FinTech Integration Engineer  
**Classification:** Version-Controlled Security, Operational & Regulatory Audit (v1.2.0)  
**Governance Directive:** CRITICAL ARCHITECTURE LOCK — PRESERVE PAYMENT GATEWAY AND TENANT ADD-ON CONFIGURATION

---

## 1. Executive Summary & Phase Status Reconciliation

| Phase | Description | Reconciled Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **A3.7** | Razorpay Sandbox Payment Acceptance | **COMPLETE & VERIFIED (SANDBOX)** / **PROD GATED** | 18/18 tests passed in [`commerce-razorpay-sandbox.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/commerce-razorpay-sandbox.test.ts). Server-side order generation, HMAC signature verification (`crypto.timingSafeEqual`), webhook replay protection (`X-Idempotent-Replay`), transactional outbox fulfillment, and fail-closed sandbox controls empirically verified. Live credentials fail closed. |
| **A3.8** | Backend Hardening & Quota Enforcement | **COMPLETE & VERIFIED** | 9/9 tests passed in [`a3-8-backend-hardening.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/a3-8-backend-hardening.test.ts). Sovereign 100-employee limit, tenant quota isolation, terminated employee slot reclamation, deep health check observability (`/api/health`), and latency SLA verified. |
| **A8.W8** | Razorpay Platform Security Hardening | **COMPLETE & VERIFIED** | 7/7 tests passed in [`a8-production-hardening-and-resilience.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/a8-production-hardening-and-resilience.test.ts). Secret masking on GET, safe preservation on masked update, fail-closed live keys in sandbox, SettingAudit without secret leakage, constant-time HMAC verified. |
| **A8.W9** | Tenant Add-on Payment Isolation & Architecture Lock | **COMPLETE & VERIFIED** | 7/7 tests passed in [`a8-production-hardening-and-resilience.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/a8-production-hardening-and-resilience.test.ts). Strict 403 `ADDON_REQUIRED` on unentitled tenants, workspace-scoped isolation (`system-razorpay-gateway-${tenantId}`), secret masking, fail-closed live keys in sandbox, secret preservation, and Super Admin platform settings invariance. |

---

## 2. Source-of-Truth Investigation: Razorpay Configuration & Payment Lifecycle

This forensic investigation traces the complete lifecycle of Razorpay credentials starting from the Super Admin Payments settings interface (`http://localhost:5173/super/settings?tab=payments`).

### 2.1 Trace Answers to the 14 Required Forensic Inquiries

#### 1. Which React component renders the Razorpay configuration fields?
- **Component:** [`src/routes/_authenticated/_app/super/settings.tsx`](file:///Users/apple/Documents/hrms/src/routes/_authenticated/_app/super/settings.tsx).
- **Behavior:** The component renders the Super Admin settings dashboard. When the active tab is `tab=payments`, it renders the Payment Gateway Configuration form containing inputs for `razorpayKeyId`, `razorpayKeySecret` (password/masked field), `razorpayWebhookSecret` (password/masked field), and the `razorpayMode` toggle (`SANDBOX` vs `LIVE`).

#### 2. Which frontend API request loads the current configuration?
- **HTTP Request:** `GET /api/cms/pages/system-platform-settings`
- **Headers:** `Authorization: Bearer <super_admin_jwt>`
- **Response Headers:** `Cache-Control: private, no-cache, no-store, must-revalidate`

#### 3. Which backend endpoint handles that request?
- **Route Handler:** [`server/src/routes/cms.routes.ts`](file:///Users/apple/Documents/hrms/server/src/routes/cms.routes.ts#L80-L165).
- **Security Check:** Inspects user identity via `req.user` JWT payload (`isSuperAdmin = req.user?.role === "super_admin" || req.user?.role === "SUPER_ADMIN"`).

#### 4. Which backend service or persistence layer provides the values?
- **Persistence Layer:** Prisma PostgreSQL ORM querying the `CmsPage` table.
- **Lookup Query:** `rawPrisma.cmsPage.findUnique({ where: { slug: "system-platform-settings" } })`.
- **Data Structure:** The configuration dictionary is stored within the `content` JSON column of the `CmsPage` record.

#### 5. Which endpoint saves updates?
- **HTTP Request:** `PUT /api/cms/pages/system-platform-settings`
- **Authorization Enforcement:** Strictly requires `requireAuth` and `requireSuperAdmin`. Any non-super user or unauthenticated request receives HTTP 403 Forbidden or HTTP 401 Unauthorized.

#### 6. Where are the public/non-secret fields stored?
- Stored within the `content` JSON column in `CmsPage`.
- Public/unauthenticated callers to `GET /api/cms/pages/system-platform-settings` receive only whitelisted, non-secret metadata (e.g. `title`, `metaDescription`, `siteName`). All payment secrets, keys, and credentials are completely omitted from public responses.

#### 7. Where are the Razorpay Key ID and Key Secret stored?
- **Primary Source:** Database table `CmsPage` (`slug = 'system-platform-settings'`).
- **Server Process Fallback:** Node.js process environment variables (`process.env.RAZORPAY_KEY_ID`, `process.env.RAZORPAY_KEY_SECRET`, `process.env.RAZORPAY_WEBHOOK_SECRET`) used by `RazorpayGatewayService` and `CommerceOrderService`.

#### 8. Does the system use encrypted database fields, a dedicated secret manager, environment variables or another mechanism?
- The architecture uses a hybrid secure model:
  1. **Persistence:** Database storage in `CmsPage` with strict application-layer secret masking (`••••••••••••••••`) for all egress responses.
  2. **Audit Logging:** System writes immutable audit records to `SettingAudit` on rotation without logging plaintext secrets.
  3. **Runtime Fallback:** Server environment variables for background workers.

#### 9. How are secrets decrypted or injected when a payment operation runs?
- Secrets are consumed **strictly server-side**.
- When `POST /api/commerce/orders/:id/checkout` executes, `CommerceOrderService` resolves `keyId` and `keySecret` server-side, calls the Razorpay API, and returns *only* the public `keyId` and `gatewayOrderId` to the browser.
- The `keySecret` is **never transmitted to the client, browser session, localStorage, or telemetry**.

#### 10. Are credentials tenant-specific, platform-wide, or selected according to an explicitly designed provider configuration model?
- **Dual-Domain Architecture (Preserved & Locked):**
  1. **Platform SaaS Commercial Billing:** Platform-wide (`scope: PLATFORM`). Super Admin controls SaaS platform subscription billing and marketplace charges.
  2. **Tenant Business Operations Payment Add-on:** Tenant-specific (`scope: TENANT`). Entitled workspaces configure their own workspace credentials in `CmsPage` with slug `system-razorpay-gateway-${tenantId}`.

#### 11. How are test-mode and live-mode credentials separated?
- Governed by `razorpayMode: "SANDBOX" | "LIVE"`.
- **Fail-Closed Protection:** In sandbox mode, the backend strictly rejects any live credentials starting with `rzp_live_*` with `HTTP 400` (`LIVE_KEYS_PROHIBITED_IN_SANDBOX`).
- Live payment capture requires explicit environment elevation and PO sign-off.

#### 12. How do payment order creation, signature verification, webhook verification and payment status reconciliation obtain their configuration?
- **Order Creation:** `CommerceOrderService` creates orders using the resolved server-side credentials.
- **Signature Verification:** When the client posts `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`, the backend computes `crypto.createHmac("sha256", secret).update(body).digest("hex")` and validates it with `crypto.timingSafeEqual` (preventing timing attacks).
- **Webhook Verification:** Handled at `POST /api/commerce/webhooks/razorpay` validating `X-Razorpay-Signature` against `process.env.RAZORPAY_WEBHOOK_SECRET`.
- **Payment Reconciliation:** Valid webhooks atomically update the order to `PAID` and insert an event into `OutboxEvent`. Background workers sweep pending outbox events to activate subscriptions and create invoices.

#### 13. What audit records are produced when a Super Admin changes payment configuration?
- On credential update, a `SettingAudit` record is inserted with:
  - `userId`: ID of the authenticated Super Admin.
  - `action`: `"PLATFORM_SETTING_UPDATED"`
  - `scope`: `"PLATFORM"`
  - `category`: `"PAYMENTS"`
  - `changes`: JSON summary indicating which keys were rotated (`{ razorpayKeySecret: "[ROTATED]" }`), explicitly redacting the secret value.

#### 14. What happens when configuration is missing, invalid, disabled or only partially populated?
- Missing configuration fails closed: Order checkout returns `HTTP 500 / 502` with code `GATEWAY_UNCONFIGURED`.
- Incomplete updates that send masked strings (`••••••••••••••••`) or omit the secret field preserve the existing database secret without data loss.

---

## 3. Architecture Lock: Dual Payment Architecture & Tenant Add-on Isolation

In strict adherence to the **Critical Architecture Lock**, the existing Super Admin payment configuration and tenant-specific add-on configuration workflows are preserved without migration or replacement.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MASTERHRMS DUAL PAYMENT ARCHITECTURE (LOCKED & PRESERVED)                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. PLATFORM COMMERCIAL BILLING (Platform-Managed)                                      │
│    Entry Point:  http://localhost:5173/super/settings?tab=payments                     │
│    API Endpoint: GET/PUT /api/cms/pages/system-platform-settings                           │
│    Scope:        PLATFORM-WIDE (SaaS subscription billing & marketplace purchases)     │
│    Persistence:  cmsPage where slug = 'system-platform-settings'                          │
│    Security:     Write-only masked GET ('••••••••••••••••'), 403 on non-super users,   │
│                  400 on live keys in sandbox mode, SettingAudit on rotation            │
│    Consumer:     POST /api/commerce/orders/:id/checkout (CommerceOrderService)         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. TENANT BUSINESS OPERATIONS ADD-ON (Tenant-Managed)                                  │
│    Entry Point:  Workspace Settings / Payment Gateway Add-on (/portal, /sales)        │
│    API Endpoint: GET/POST /api/payments/razorpay/config                                │
│    Scope:        TENANT-SPECIFIC (Tenant's customer invoicing, POS, sales receipts)   │
│    Guards:       requireAuth, resolveTenantContext, requireEntitlement('razorpay-gw') │
│    Persistence:  cmsPage where slug = 'system-razorpay-gateway-${tenantId}'            │
│    Isolation:    Tenant A cannot read or mutate Tenant B's credentials                 │
│                  Unentitled tenants receive HTTP 403 ADDON_REQUIRED                    │
│    Consumer:     POST /api/payments/razorpay/create-order & /razorpay/verify           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Strict Payment-Request Resolution Protocol
For every payment request:
1. **Server-Side Tenant Context:** Authenticates caller via JWT and resolves authoritative workspace via `resolveTenantContext`. Client-supplied tenant identifiers are strictly ignored for configuration lookup.
2. **Entitlement Verification:** Enforces `requireEntitlement("razorpay-gateway")`. Unentitled workspaces are denied with HTTP 403 `ADDON_REQUIRED`.
3. **Configuration Scoping:** Resolves gateway configuration strictly using `system-razorpay-gateway-${tenantId}`.
4. **Idempotency & Cryptographic Verification:** Enforces timing-safe HMAC signature verification (`crypto.timingSafeEqual`).
5. **Data Ownership:** Payment reconciliation strictly verifies `where: { id: invoiceId, tenantId: user.tenantId }`. Cross-tenant record mutation is physically impossible.

---

## 4. Test Suite Execution & Empirical Results

### 4.1 Test Run Summary

| Test Suite | Purpose | Tests | Result | Duration |
| :--- | :--- | :---: | :---: | :---: |
| [`a8-production-hardening-and-resilience.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/a8-production-hardening-and-resilience.test.ts) | Phase A8 Hardening, Health SLAs, Recovery, Platform & Tenant Settings Isolation | 29 | **PASSED (29/29)** | 49.10s |
| [`commerce-razorpay-sandbox.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/commerce-razorpay-sandbox.test.ts) | Phase A3.7 Razorpay Sandbox Checkout, Webhooks & Outbox | 18 | **PASSED (18/18)** | 29.91s |
| [`a3-8-backend-hardening.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/a3-8-backend-hardening.test.ts) | Phase A3.8 Sovereign Limit, Tenant Isolation & Quotas | 9 | **PASSED (9/9)** | 33.18s |
| **Total Core Acceptance** | **All Verified Acceptance Criteria** | **56** | **PASSED (56/56)** | **112.19s** |
| [`a7-addon-waves-rollout.test.ts`](file:///Users/apple/Documents/hrms/server/src/tests/a7-addon-waves-rollout.test.ts) | Phase A7 Canonical Add-on Wave Provisioning & Lifecycle | 15 | **PASSED (15/15)** | 31.63s |
| **Grand Total** | **Full Platform Acceptance Baseline** | **71** | **PASSED (71/71)** | **143.82s** |

### 4.2 Browser / E2E Empirical Verification (Playwright Chromium)
- **Super Admin Payments Settings UI:** Navigated to `http://localhost:5173/super/settings?tab=payments` via Playwright Chromium.
- **Masked Secret Display:** Verified live DOM rendering of `keyId` (`rzp_test_PlatformA8Key`) and write-only masked `keySecret` (`••••••••••••••••`).
- **Safe Update Invariance:** Executed "Save Settings" form submission with masked secret. Confirmed toast confirmation (*"Settings saved! Realtime changes broadcast across all portals."*) and database secret preservation.
- **Route Shell Guard:** Non-admin tenant navigation to `/super/settings` is rejected and trapped by the error boundary with a safe redirection link.
- **Visual Artifacts:** Viewport screenshots saved at `.playwright-mcp/super-admin-payments-settings.png` and `.playwright-mcp/tenant-workspace-dashboard.png`.

---

## 5. Outstanding Blockers & Governance Boundaries

1. **Live Production Payment Activation Gated:** Live payments (`rzp_live_*`) are blocked from activation pending formal executive sign-off and PO authorization.
2. **Production DNS / Domain Cutover:** All testing conducted against local development and non-production staging environments (`http://localhost:4000`, `http://localhost:5173`).
3. **External Real Money Transactions Prohibited:** Real customer charges, refunds, or bank transfers are strictly prohibited.
4. **Architecture Preservation Certified:** No payment configuration migration, competing gateway tables, or global merging of tenant configurations occurred.

---

## 6. Authoritative Reconciliation Conclusion

- **Phase A3.7 Status:** **COMPLETE & VERIFIED (SANDBOX)**.
- **Phase A3.8 Status:** **COMPLETE & VERIFIED**.
- **Phase A8 Status:** **COMPLETE & VERIFIED (29/29 tests passing)**.
- **Architecture Lock Status:** **PRESERVED & FULLY ENFORCED**.
- **Next Governance Step:** Halt at the authorized production deployment gate.
