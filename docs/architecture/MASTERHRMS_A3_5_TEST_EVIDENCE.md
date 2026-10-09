# MASTERHRMS — Phase A3.5 Test Evidence Report

**Project:** MASTERHRMS Multi-Tenant HRMS / ERP SaaS  
**Phase:** Phase A3.5 — End-to-End Testing, Integration Validation & Regression Gate  
**Execution Date:** October 9, 2026  
**Test Runner:** Vitest v5.0.3 (Sequential Mode: `--fileParallelism=false`)  
**Target Environment:** Isolated PostgreSQL (Development / Test Instance)  

---

## 1. Master Test Suite Execution Summary

| Test Suite File | Phase / Focus | Tests Executed | Passed | Failed | Skipped | Duration | Exit Code |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `src/tests/commerce-e2e-journey.test.ts` | **A3.5 End-to-End Acceptance & Forensic Gates** | **13** | **13** | **0** | **0** | 38.09s | 0 |
| `src/tests/commerce-order-lifecycle.test.ts` | **A3.3 Order State Machine Regression** | **12** | **12** | **0** | **0** | 19.18s | 0 |
| `src/tests/commerce-entitlement-fulfillment.test.ts` | **A3.4 Entitlement Provisioning Regression** | **22** | **22** | **0** | **0** | 16.49s | 0 |
| `src/tests/commerce-catalog-pricing.test.ts` | **A3.2 Catalog & Pricing Regression** | **20** | **20** | **0** | **0** | 5.11s | 0 |
| **Consolidated Total** | **All Authorized Commerce Suites** | **67** | **67** | **0** | **0** | **80.20s** | **0** |

---

## 2. Phase A3.5 Detailed Test Journey Evidence

### Journey 1: Base Plan Full Purchase-to-Access Lifecycle
- **`E2E-1.1`: Complete flow: Catalog $\to$ Cart $\to$ Order $\to$ Settle $\to$ Sweep $\to$ Subscription Active $\to$ `/api/auth/me`**
  - **Status:** **PASS** (5,062ms)
  - **Evidence:**
    1. Fetches public catalog: verifies active base plan `starter` exists with pricing metadata.
    2. Executes POST `/api/commerce/cart/calculate`: server returns subtotal ₹199.00, GST ₹35.82, total ₹234.82.
    3. Executes POST `/api/commerce/orders`: creates immutable order record in `PENDING_PAYMENT` state with frozen price snapshot.
    4. Executes POST `/api/commerce/checkout/simulate`: transitions order to `PAID`, atomically creates `COMMERCE_ORDER_PAID` outbox event in `PENDING` state.
    5. Executes POST `/api/commerce/outbox/sweep`: background worker claims event via `FOR UPDATE SKIP LOCKED`, transitions order to `FULFILLED` and event to `PROCESSED`.
    6. Verifies `TenantSubscription` in database: `planId = 'starter'`, `status = 'active'`, `maxEmployees = 25`.
    7. Authenticates as tenant user to GET `/api/auth/me`: verifies user profile, tenant ID, and `enabledModules` containing `'hrm'`.
- **`E2E-1.2`: Forensic Gate 1: Subscription upgrade (Starter -> Growth) verifies period dates, paidAt, immutable SubscriptionPolicyAudit, rejects downgrade, and preserves fail-closed proration policy**
  - **Status:** **PASS** (4,995ms)
  - **Evidence:**
    1. Reads existing active `starter` subscription (`planId: 'starter'`, `maxEmployees: 25`, period dates).
    2. Tenant A orders and settles higher-tier `growth` plan. Sweeper provisions upgrade.
    3. Verifies `TenantSubscription` updated to `planId = 'growth'`, `maxEmployees = 100`, `status = 'active'`, and `currentPeriodEnd >= initialPeriodEnd`.
    4. Verifies immutable `SubscriptionPolicyAudit` record created with `before` (`starter`, 25 seats) and `after` (`growth`, 100 seats).
    5. Tests downgrade prevention: tenant attempts to order `starter` while on `growth`. Payment settles, but fulfillment declines with `DOWNGRADE_NOT_PERMITTED`. Verifies `TenantSubscription` remains untouched on `growth` (100 seats).
    6. Confirms fail-closed proration policy: full standard tier price charged without unapproved proration guessing (OD-10 preserved).

### Journey 2: Standalone ERP Products Independence
- **`E2E-2.1`: Sells and provisions POS and CRM to a tenant with zero base plan, enabling them in `/api/auth/me`**
  - **Status:** **PASS** (4,675ms)
  - **Evidence:**
    1. Confirms tenant begins with zero `TenantSubscription` records (`null`).
    2. Orders standalone `pos` and `crm` products via POST `/api/commerce/orders`.
    3. Settles simulated payment and executes outbox sweep.
    4. Database confirms `TenantModule` created for `product_pos` and `product_crm` with `isEnabled = true`.
    5. Re-verifies `TenantSubscription` remains `null` (strict standalone independence preserved).
    6. Authenticates to GET `/api/auth/me`: confirms `enabledModules` contains `'pos'` and `'crm'`, but excludes unpurchased `'finance'`.

### Journey 3: Add-on Entitlement & Renewal Extension
- **`E2E-3.1`: Provisions add-on and subsequent repurchase extends renewal period instead of resetting**
  - **Status:** **PASS** (4,844ms)
  - **Evidence:**
    1. Tenant purchases `biometric-sync` add-on. Payment and sweep provision `TenantAddon` with `renewsAt = T1` (30 days from purchase).
    2. Tenant repurchases `biometric-sync` add-on before expiration. Payment and sweep process renewal.
    3. Database verifies `TenantAddon` was updated to `renewsAt = T2` where $T2 > T1$ ($T2 = T1 + 30\text{ days}$), proving that repurchase stacks extension onto current validity rather than resetting to `now() + 30`.

### Journey 4: Mixed Multi-Product Atomic Transactions
- **`E2E-4.1`: Mixed order provisions Base Plan, Standalone ERP, and Addon in a single commit**
  - **Status:** **PASS** (4,191ms)
  - **Evidence:**
    1. Tenant orders mixed cart containing `growth` base plan + `finance` module + `asset-management` addon.
    2. Payment settled and sweep processed.
    3. Confirms single database commit successfully provisioned `TenantSubscription` (`growth`, 100 seats), `TenantModule` (`product_finance`), and `TenantAddon` (`asset-management`).

### Journey 5: Security Boundaries & Negative Access Control
- **`E2E-5.1`: Unauthenticated requests to commerce endpoints are strictly rejected (401)** — **PASS** (3ms)
- **`E2E-5.2`: Cross-tenant order settlement strictly returns 404 without leaking order existence** — **PASS** (1,005ms)
  - Attempts to settle Tenant A's order using Tenant B's JWT token. Server responds with 404 Not Found, matching non-existent order behavior (zero cross-tenant enumeration).
- **`E2E-5.3`: Operator sweep route strictly rejects non-admin users with 403 Forbidden** — **PASS** (219ms)
  - Standard tenant user token calling `/api/commerce/outbox/sweep` receives 403 Forbidden (`UNAUTHORIZED_OPERATOR`).
- **`E2E-5.4`: Unpaid orders in PENDING_PAYMENT state strictly decline entitlement fulfillment** — **PASS** (876ms)
  - Attempting to invoke `CommerceFulfillmentService.fulfillOrder` on an order before payment throws `CommerceFulfillmentError("ORDER_NOT_PAID")`.

### Journey 6: Concurrency, Crash Recovery & Dead-Letter Safety
- **`E2E-6.1`: Concurrent workers competing for same paid order serialize cleanly (exactly 1 provisions)** — **PASS** (1,904ms)
  - Two parallel fulfillment calls triggered on the same paid order via `Promise.all`. Exactly one worker provisions; the second detects `alreadyFulfilled: true` and makes zero redundant mutations.
- **`E2E-6.2`: Outbox retry exhaustion (5 attempts) marks event FAILED, logs audit failure, and preserves PAID order** — **PASS** (964ms)
  - Injects outbox event with `retryCount = 4` targeting non-existent order. Sweep attempts processing, increments retry to 5, marks event `status = 'FAILED'`, and writes `COMMERCE_FULFILLMENT_FAILED_PERMANENT` audit entry.
- **`E2E-6.3`: Stale/crashed worker event is reclaimed and fulfilled cleanly by subsequent sweep** — **PASS** (2,346ms)
  - Injects outbox event with `status = 'PROCESSING'` and stale lease expired 10 minutes ago. Next sweep reclaims the orphaned claim and fulfills the order cleanly.
- **`E2E-6.4`: Forensic Gate 2: Outbox retry exhaustion, transient failure safety, and operator runbook recovery without duplicate entitlements** — **PASS** (4,110ms)
  - **Evidence:**
    1. Creates order for `google-workspace` add-on; simulates payment to transition order to `PAID`.
    2. Simulates transient failure: verifies outbox event records error, retryCount increments, and order remains safely in `PAID` / `UNFULFILLED` state without corruption.
    3. Triggers 5th retry exhaustion: event transitions to `status = 'FAILED'`, `retryCount = 5`, and immutable `COMMERCE_FULFILLMENT_FAILED_PERMANENT` audit entry is recorded while preserving the `PAID` order.
    4. Simulates tenant-safe Runbook operator recovery SQL (`UPDATE outbox_events SET status = 'PENDING', retry_count = 0, error = NULL WHERE id = $1 AND tenant_id = $2 AND status = 'FAILED'`).
    5. Sweeper triggers and fulfills recovered event: order becomes `FULFILLED`, outbox event becomes `PROCESSED`, and `TenantAddon` is created with valid renewal date.
    6. Verifies operator recovery idempotency: subsequent execution returns `alreadyFulfilled: true`, never repeats add-on renewal extension twice (`renewsAt` remains unchanged), and leaves order in `PAID` / `FULFILLED` state.

---

## 3. Static Analysis & Build Verification Evidence

- **Server TypeScript Compilation (`npx tsc --noEmit`):**
  - Command: `npx tsc --noEmit`
  - Working Directory: `server`
  - Exit Code: `0`
  - Diagnostics: `0 errors, 0 warnings`
- **Application Production Build (`npm run build`):**
  - Command: `npm run build`
  - Working Directory: Root (`hrms`)
  - Exit Code: `0`
  - Output: All TanStack Router routes and Vite client/server bundles compiled cleanly in 8.43s.
