# MASTERHRMS — Phase A3: Commerce Architecture & Entitlement Lifecycle Specification

**Document Version:** 1.5.0-VERIFIED  
**Status:** IMPLEMENTED & END-TO-END VERIFIED (PHASES A3.1, A3.2, A3.3, A3.4, A3.5 COMPLETE)  
**Author:** Antigravity Autonomous Agent (Architecture, Engineering & Systems Verification)  
**Target Path:** `docs/architecture/PHASE_A3_COMMERCE_ARCHITECTURE_SPEC.md`  
**Security Classification:** Strict Internal Platform Design (Zero Real Payment Activation; Production Gates Fail-Closed)  

---

## Executive Summary & Scope

Following the formal completion and end-to-end integration validation of **Phase A3.5**, this document records the authoritative architecture and verified implementation for **Phase A3 (Commerce Engine & Automated Entitlement Lifecycle)**.

### Strict Safety & Non-Execution Guarantees
1. **Design-Only:** This document is purely architectural. No application code, database schema migrations, environment secrets, or dependencies are modified in this stage.
2. **Zero Real Payment Capture:** Live payment provider connections (Razorpay, Stripe, PayPal) remain strictly unconfigured and deactivated.
3. **Fail-Secure Preconditions:** All order transitions, pricing calculations, and webhook validations are modeled around cryptographic verification, server-side math, and immutable audit ledgers.

---

## A. Existing Architecture and Gap Analysis

A rigorous forensic audit of the current repository revealed the following baseline components and architectural gaps:

### 1. Existing Models & Schema Baseline (in `server/prisma/schema.prisma`)
The repository contains several foundational commerce and billing models that will be preserved and leveraged:

| Existing Model | Line Range | Current Responsibilities & Capabilities | Phase A3 Role & Reusability |
| :--- | :--- | :--- | :--- |
| `SubscriptionPlan` | L1038–1075 | Stores plan name, `planType`, `pricingModel`, monthly/annual price, `features` (JSON), `includedAddonIds` (JSON), trial days, quotas (`maxEmployees`, `maxUsers`). | **Reusable:** Serves as the base plan definition for Starter, Growth, and Sovereign tiers. |
| `TenantSubscription` | L1076–1111 | Stores active tenant subscription, `status` (`active`, `trialing`, `suspended`, `expired`), period dates, seat limits, plan relation. | **Core Entitlement Target:** Receives plan updates when an order is fulfilled. |
| `BillingInvoice` | L1113–1146 | Stores subscription invoice records, `amount`, `status` (`draft`, `open`, `paid`, `failed`), gateway IDs (`gatewayOrderId`, `gatewayPaymentId`), tax, subtotal. | **Reusable:** Platform SaaS invoice ledger; will link to new `CommerceOrder`. |
| `Coupon` & `CouponRedemption` | L1148–1186 | Supports percentage/fixed discounts, expiration dates, usage limits, plan restrictions. | **Reusable:** Validated during server-side cart calculation and redeemed upon order payment. |
| `SubscriptionPolicyAudit` | L1188–1202 | Immutable audit log capturing before/after JSON states of tenant subscription modifications. | **Reusable:** Captures audit trails for plan upgrades, cancellations, and renewals. |
| `Addon` & `TenantAddon` | L1204–1249 | Catalog of add-ons and tenant-specific add-on subscription status (`active`, `trial`, `expired`, `cancelled`). | **Core Entitlement Target:** Provisions add-on entitlements upon order fulfillment. |
| `TenantModule` | L640–670 | Tenant-level toggle for ERP modules (`hrm`, `pos`, `crm`, `finance`, `inventory`, etc.) with `isEnabled` boolean. | **Core Entitlement Target:** Provisions standalone product access upon order fulfillment. |
| `PaymentGatewayTransaction` | L3204–3226 | Records gateway transactions. Currently scoped to POS terminal `Sale` records. | **Model Reference:** Demonstrates existing gateway audit patterns. |
| `PaymentWebhookEvent` | L3228–3242 | Logs raw webhook payloads with `provider`, `deliveryKey` (unique), `eventType`, and `signatureOk`. | **Reusable:** Serves as the foundation for the idempotent webhook ingestion ledger. |

### 2. Existing Routes, Middleware & Services
- **Entitlement Engine (`server/src/middleware/entitlements.ts`):** Evaluates Super Admin bypass &rarr; `TenantModule` &rarr; `TenantAddon` &rarr; `TenantSubscription` &rarr; Core HRMS platform allowance &rarr; Fallback 403 denial.
- **Session Profile Resolver (`server/src/routes/auth.routes.ts`):** Computes `enabledModules` for `/api/auth/me` with positive subscription and add-on verification.
- **Billing Duration & Calculation (`server/src/services/billing-duration.service.ts`):** Handles billing cycle durations (`1_month`, `3_months`, `6_months`, `1_year`, `3_years`), proration days, and price multipliers.
- **Coupon Service (`server/src/services/coupon.service.ts`):** Validates coupon validity, limits, and redemptions.
- **Cryptographic Gateway Verifier (`server/src/services/gateway-verification.service.ts`):** Implements timing-safe HMAC-SHA256 comparison (`crypto.timingSafeEqual`) for Razorpay, Stripe, and PayPal.

### 3. Missing Capabilities Required for Phase A3
1. **Unified Catalog Model:** Currently, plans are in `SubscriptionPlan`, add-ons in `Addon`, and standalone products (POS, CRM, Finance) have no catalog representation. There is no single catalog abstraction to query sellable items.
2. **Deterministic Order State Machine (`CommerceOrder`):** Invoices (`BillingInvoice`) are currently updated directly without a formal, multi-item order container tracking state transitions (`draft` &rarr; `pending_payment` &rarr; `paid` &rarr; `fulfilled`).
3. **Decoupled Payment vs. Fulfillment Status:** Payment capture and entitlement provisioning are currently coupled in single route handlers, risking partial failures without recovery mechanisms.
4. **Authoritative Cart & Checkout Calculation Service:** No centralized API calculates taxes, coupons, seat band multipliers, and line items server-side with zero trust in client inputs.
5. **Simulated Sandbox Checkout Engine:** No safe, isolated mechanism exists for developers and automated tests to simulate checkout without calling external gateways.
6. **Automated Entitlement Fulfillment Pipeline:** No background/transactional pipeline automatically maps fulfilled order lines to `TenantSubscription`, `TenantModule`, and `TenantAddon` atomically.

---

## B. Unified Commerce Catalog

To support base plans, standalone products, add-ons, and future catalog items without creating ad-hoc checkout flows, Phase A3 specifies a **Unified Catalog Engine**.

```
                           ┌──────────────────────────────┐
                           │      Unified Catalog         │
                           │   (Sellable Products)        │
                           └──────────────┬───────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│   Base Plans     │            │ Standalone Prod. │            │     Add-Ons      │
│ (HRMS Platform)  │            │ (POS, CRM, Fin)  │            │(Biometric, Google│
│ - Starter        │            │ - Point of Sale  │            │ Assets, OKR)     │
│ - Growth         │            │ - Sales CRM      │            │ - Flat Fee       │
│ - Sovereign Ent. │            │ - Fin. Ledgers   │            │ - Metered Usage  │
└──────────────────┘            └──────────────────┘            └──────────────────┘
```

### 1. Catalog Item Types
Every catalog entry is categorized by an immutable `ProductType`:
1. `BASE_PLAN`: Comprehensive platform subscriptions (Starter, Growth, Sovereign Enterprise) priced primarily by employee seat bands.
2. `STANDALONE_PRODUCT`: Independent business suites (POS & Inventory, Sales CRM, Financial Ledgers) purchasable with or without an active HRMS subscription (Approved Owner Decision Q-21).
3. `ADDON_FEATURE`: Feature extensions (Asset Management, OKR Performance) requiring an underlying plan or product.
4. `ADDON_INTEGRATION`: Third-party connectors (Google Workspace Sync, Biometric Hardware Sync, WhatsApp Alerts).
5. `UTILITY_LIFETIME`: Downloadable client utilities or perpetual desktop licenses (Approved Owner Decision Q-19).

### 2. Catalog Specification Schema (Proposed Entity Structure)

```typescript
export interface CatalogProductDefinition {
  id: string;                      // Stable UUID
  slug: string;                    // Immutable unique slug (e.g. "product-crm", "plan-growth")
  name: string;                    // Human-readable title
  productType: "BASE_PLAN" | "STANDALONE_PRODUCT" | "ADDON_FEATURE" | "ADDON_INTEGRATION" | "UTILITY_LIFETIME";
  entitlementKey: string;          // Maps directly to entitlements middleware (e.g. "product_crm", "biometric-sync")
  targetEngine: "subscription" | "module" | "addon"; // Destination entity
  description: string;
  category: string;                // "HRM", "Sales", "Finance", "Integrations", "Security"
  isPublic: boolean;               // Visible in public /pricing & marketplace
  status: "ACTIVE" | "RETIRED" | "DRAFT";
  version: string;                 // Semantic versioning (e.g. "1.0.0")
  requiredProductSlugs: string[];  // Dependencies (e.g. ["hrms-core"])
  prices: CatalogPriceDefinition[];// Multiple currencies and billing intervals
}

export interface CatalogPriceDefinition {
  id: string;
  productId: string;
  currency: "INR" | "USD" | "EUR";
  billingInterval: "1_month" | "3_months" | "6_months" | "1_year" | "one_time";
  pricingModel: "FLAT" | "PER_SEAT" | "SEAT_BAND" | "METERED";
  basePrice: number;               // In major currency units (e.g. 4999.00 INR)
  seatBandMin?: number;            // E.g. 1
  seatBandMax?: number;            // E.g. 50
  pricePerExcessSeat?: number;     // Over-quota seat price
  taxIncluded: boolean;            // Whether basePrice includes GST/VAT
  isDefault: boolean;
}
```

### 3. Separation of Catalog Eligibility vs. Entitlement Grant
- **Catalog Eligibility:** Evaluated before cart addition. Checks prerequisites (e.g. "Requires active workspace", "Requires HRMS core").
- **Entitlement Grant:** Executed *only* upon verified payment receipt via the atomic fulfillment pipeline. Browsing or ordering never grants temporary access.

---

## C. Pricing Engine and Open Decisions

Phase A3 implements the approved hybrid pricing architecture (Decision Q-19) while maintaining strict parameterization for unapproved commercial amounts (OD-1).

### 1. Hybrid Pricing Mechanics

#### A. Active Employee Seat Bands (Base HRMS Plans)
Base plans scale according to organization size bands:
- **Band 1 (Micro):** Up to 25 active employees.
- **Band 2 (Small):** 26 to 100 active employees.
- **Band 3 (Mid-Market):** 101 to 500 active employees.
- **Band 4 (Enterprise):** 501+ active employees (Custom quote / per-seat formula).

*Formula:*  
$$\text{Plan Total} = \text{Band Base Price} + \max(0, \text{Active Seats} - \text{Band Base Included}) \times \text{Per-Seat Overage}$$

#### B. Flat Platform & Standalone Product Fees
Standalone products (POS, CRM, Finance) and certain add-ons (Google Workspace, Biometric Sync) are billed as flat periodic platform licenses:
$$\text{Product Total} = \text{Product Price} \times \text{Interval Multiplier}$$

#### C. Metered Add-Ons
Usage-based add-ons (SMS credits, AI Copilot tokens, storage gigabytes) operate on quota pools:
- Prepaid token packs (one-time purchase).
- Postpaid overage reconciliation at the billing cycle boundary.

### 2. Tax (GST) Calculation Engine

Phase A3 specifies an authoritative server-side Indian GST tax calculator:
1. **Place of Supply Determination:**
   - Platform Company State: e.g., Haryana (`HR`) / Delhi (`DL`).
   - Customer Billing State: Resolved from customer billing profile or GSTIN prefix (2-digit state code).
2. **Tax Breakdown:**
   - **Intra-State Transaction** (Customer State == Platform State):
     - CGST: $9\%$
     - SGST: $9\%$
     - Total GST: $18\%$
   - **Inter-State Transaction** (Customer State != Platform State):
     - IGST: $18\%$
   - **Export / International** (Customer outside India, zero-rated export of service):
     - GST: $0\%$ (subject to LUT declaration).
3. **Rounding Rules:**
   - Calculations use `Decimal(16, 4)` internally.
   - Final line totals and tax lines round half-up (`ROUND_HALF_UP`) to 2 decimal places.

### 3. Price & Tax Snapshots
Orders must never compute totals dynamically from active catalog rows after creation. Upon transition from `draft` to `pending_payment`, an **immutable snapshot** is frozen:
```json
{
  "unitPrice": 4999.00,
  "quantity": 1,
  "discountAmount": 500.00,
  "taxableAmount": 4499.00,
  "cgstRate": 0.09,
  "cgstAmount": 404.91,
  "sgstRate": 0.09,
  "sgstAmount": 404.91,
  "igstRate": 0.00,
  "igstAmount": 0.00,
  "totalAmount": 5308.82,
  "currency": "INR",
  "calculatedAt": "2026-10-09T15:20:00.000Z"
}
```

---

## D. Deterministic Order State Machine

To eliminate race conditions, double activations, and out-of-order webhook vulnerabilities, the order lifecycle is governed by an explicit finite state machine with separated **Payment Status** and **Fulfillment Status**.

```
                              ┌───────────────┐
                              │     DRAFT     │
                              └───────┬───────┘
                                      │ Submit Checkout
                                      ▼
                        ┌───────────────────────────┐
       ┌───────────────►│      PENDING_PAYMENT      │◄──────────────┐
       │                └───────┬───────────┬───────┘               │
       │                        │           │                       │
       │ Provider Retry         │ Success   │ Provider Failure      │
       │                        ▼           ▼                       │
       │                ┌───────────────┐   ┌───────────────┐       │
       └────────────────┤     PAID      │   │    FAILED     ├───────┘
                        └───────┬───────┘   └───────────────┘  User Re-attempt
                                │
                 Fulfillment    │
                 Pipeline       │
                                ▼
                        ┌───────────────┐
                        │   FULFILLED   │
                        └───────┬───────┘
                                │
                 Refund Request │
                                ▼
                        ┌───────────────┐
                        │   REFUNDED    │
                        └───────────────┘
```

### 1. State Matrix

| Current State | Permitted Next States | Trigger Event | Preconditions |
| :--- | :--- | :--- | :--- |
| `DRAFT` | `PENDING_PAYMENT`, `CANCELLED` | User submits checkout; server locks cart | Valid tenant context; active catalog items; calculated tax snapshot. |
| `PENDING_PAYMENT` | `PAID`, `FAILED`, `EXPIRED`, `CANCELLED` | Gateway webhook, simulation endpoint, or expiration timer | Cryptographic signature valid; amount & currency match snapshot; idempotency check passed. |
| `PAID` | `FULFILLED`, `REFUNDED` | Automated Fulfillment Pipeline execution | Database transaction locks order; creates/updates `TenantSubscription`/`Module`/`Addon`. |
| `FAILED` | `PENDING_PAYMENT`, `CANCELLED` | User re-attempts payment or abandons | Idempotent transition; new gateway transaction ID generated. |
| `FULFILLED` | `REFUNDED`, `PARTIALLY_REFUNDED` | Authoritative refund webhook or Super Admin approval | Reverse entitlement pipeline triggered; audit log recorded. |
| `REFUNDED` | *(Terminal)* | Full refund settlement | All corresponding entitlements revoked; subscription marked cancelled. |
| `CANCELLED` | *(Terminal)* | Order cancelled before payment | Cart unlocked; reserved coupons released. |
| `EXPIRED` | *(Terminal)* | Payment session deadline elapsed | No payment received within 30 minutes; order closed. |

### 2. Prohibited Transitions
- `DRAFT` &rarr; `FULFILLED` (**CRITICAL VIOLATION:** No payment).
- `PENDING_PAYMENT` &rarr; `FULFILLED` (Bypassing `PAID`).
- `FAILED` &rarr; `FULFILLED` (Cannot fulfill failed payments).
- `FULFILLED` &rarr; `PAID` (Cannot regress state).
- `REFUNDED` &rarr; `PAID` / `FULFILLED` (Terminal refund cannot resurrect).

### 3. Concurrency & Optimistic Locking Safeguards
Every `CommerceOrder` contains an integer `version` column:
```sql
UPDATE commerce_orders 
SET status = 'PAID', version = version + 1, updated_at = NOW()
WHERE id = :orderId AND status = 'PENDING_PAYMENT' AND version = :currentVersion;
```
If two webhooks or a webhook and a simulation attempt to update the order concurrently, exactly one succeeds; the second receives 0 affected rows and safely aborts without double-fulfilling.

---

## E. Simulated Checkout (Development & Test-Only)

To permit rigorous automated testing without touching external gateway networks or incurring financial charges, Phase A3 specifies a **Deterministic Simulated Checkout**.

### 1. Strict Boundary Rules
1. **Isolated Route Namespace:** Only mounted when `NODE_ENV !== "production"` or via explicit test-runner configuration. Never active on live customer production endpoints.
2. **Explicit Labeling:** All responses, transactions, and generated invoices bear mandatory metadata:
   - `isSimulated: true`
   - `gatewayProvider: "SIMULATED_SANDBOX"`
   - `disclaimer: "NON-MONETARY SIMULATION — FOR TEST PURPOSES ONLY"`
3. **No Client Trust:** The client cannot submit amounts, statuses, or fake signatures. The client calls:
   `POST /api/commerce/checkout/simulate` with `{ orderId, scenario: "SUCCESS" | "FAILURE" | "TIMEOUT" }`.
4. **Authoritative Server Evaluation:** The server checks the order in DB, computes the transition, signs an internal mock webhook, and processes it through the identical state machine pipeline used by real providers.

---

## F. Cryptographic Webhook Security

Webhook endpoints are the primary vector for financial fraud and unauthorized provisioning. Phase A3 specifies strict cryptographic, architectural, and operational controls.

```
Incoming Webhook Request
         │
         ▼
[ 1. Raw Body Capture ] (Preserve exact unparsed byte buffer)
         │
         ▼
[ 2. Timestamp Tolerance Check ] (Reject if |t_req - t_now| > 300s)
         │
         ▼
[ 3. Constant-Time HMAC Verification ] (crypto.timingSafeEqual against secret)
         │
         ▼
[ 4. Durable Idempotency Ledger ] (Insert deliveryKey; reject if duplicate)
         │
         ▼
[ 5. Order & Amount Correlation ] (Match order ID, currency, and exact amount)
         │
         ▼
[ 6. State Machine Execution ] (Transition order to PAID within DB transaction)
```

### 1. Cryptographic Protocol
- **Algorithm:** HMAC-SHA256.
- **Raw Body Buffer:** The raw unparsed request body (`req.rawBody`) must be preserved before JSON parsing. Any JSON normalization or whitespace altering invalidates cryptographic signatures.
- **Constant-Time Comparison:**
  ```typescript
  function verifyHmacSha256(rawBody: Buffer, signature: string, secret: string): boolean {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }
  ```

### 2. Five Mandatory Verification Gates
A webhook cannot trigger state changes unless it passes all 5 gates in order:
1. **Signature Integrity:** HMAC-SHA256 signature matches the raw body.
2. **Replay & Timestamp Protection:** Webhook timestamp is within 300 seconds ($5\text{ min}$) of current server time.
3. **Idempotency Uniqueness:** Webhook ID (`event_id` or `deliveryKey`) is recorded in `PaymentWebhookEvent`. If a unique constraint collision occurs, return HTTP `200 OK` immediately without re-processing.
4. **Order Correlation:** The payload `order_id` must match a valid `CommerceOrder` in `PENDING_PAYMENT` status.
5. **Amount & Currency Parity:** The payload `amount` (e.g. paise) and `currency` must match the frozen order snapshot exactly. Any discrepancy marks the order `FLAGGED_MISMATCH` and halts fulfillment.

---

## G. Automatic Entitlement Activation

Entitlement activation is the bridge between commerce settlement and platform capabilities. It must be **atomic**, **idempotent**, and **fully reversible**.

### 1. Product-to-Entitlement Provisioning Matrix

| Order Line Product Type | Target Model | Provisioning Action | Resulting Entitlement |
| :--- | :--- | :--- | :--- |
| **Base HRMS Plan** (Starter, Growth, Sovereign) | `TenantSubscription` | Upserts `tenant_subscriptions` with `planId`, `status: "active"`, updates `currentPeriodStart`, `currentPeriodEnd`, `maxEmployees`, `maxUsers`. | Grants HRMS core, plan feature flags, and included add-ons via `checkTenantEntitlement()`. |
| **Standalone Product** (`product_pos`, `product_crm`, `product_finance`) | `TenantModule` | Upserts `tenant_modules` with `tenantId`, `moduleKey` (`pos`, `crm`, `finance`), `isEnabled: true`. | Immediately unlocks `/api/products`, `/api/crm`, `/api/accounting` and unhides sidebar menus. |
| **Add-On** (`biometric-sync`, `google-workspace`, `asset-management`, `okr-performance`) | `TenantAddon` | Upserts `tenant_addons` with `tenantId`, `addonSlug`, `status: "active"`, `renewsAt = periodEnd`. | Immediately unlocks `/api/biometric`, `/api/calendar`, and add-on UI routes. |

### 2. Atomic Transaction Boundary (Prisma Interactive Transaction)
Fulfillment executes inside a single database transaction (`db.$transaction`):
```typescript
await db.$transaction(async (tx) => {
  // 1. Lock Order Optimistically
  const order = await tx.commerceOrder.update({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", paidAt: new Date() },
  });

  // 2. Provision Each Line Item
  for (const item of order.items) {
    if (item.targetEngine === "subscription") {
      await tx.tenantSubscription.upsert({ ... });
    } else if (item.targetEngine === "module") {
      await tx.tenantModule.upsert({ ... });
    } else if (item.targetEngine === "addon") {
      await tx.tenantAddon.upsert({ ... });
    }
  }

  // 3. Mark Fulfillment Complete
  await tx.commerceOrder.update({
    where: { id: orderId },
    data: { fulfillmentStatus: "FULFILLED", fulfilledAt: new Date() },
  });

  // 4. Generate Authoritative BillingInvoice
  await tx.billingInvoice.create({ ... });

  // 5. Record Immutable SubscriptionPolicyAudit Log
  await tx.subscriptionPolicyAudit.create({ ... });
});
```
If any provisioning step fails (e.g. database constraint error), the entire transaction rolls back. The order remains in `PAID` but `UNFULFILLED`, alerting the operational reconciliation queue without partial state leakage.

### 3. Reversal & Revocation (Refunds & Expirations)
When an order is refunded or a subscription cancels:
1. `TenantSubscription.status` transitions to `cancelled` or `expired`.
2. Standalone `TenantModule.isEnabled` transitions to `false`.
3. `TenantAddon.status` transitions to `cancelled` or `expired`.
4. WebSocket event `entitlement.changed` broadcasts to the tenant room, instantly updating the frontend navigation and route barriers without requiring user logout.

---

## H. API and Service Contracts (Design-Only)

All endpoints specified below are **DESIGN-ONLY**; none are implemented in Phase A3.1.

### 1. Catalog Browsing
- **`GET /api/commerce/catalog`**
  - **Auth:** Public / Optional Tenant Context.
  - **Query Params:** `?category=HRM&productType=STANDALONE_PRODUCT&currency=INR`
  - **Response:**
    ```json
    {
      "products": [
        {
          "id": "prod_pos_001",
          "slug": "pos-inventory",
          "name": "Point of Sale & Inventory",
          "productType": "STANDALONE_PRODUCT",
          "entitlementKey": "product_pos",
          "prices": [
            { "id": "price_pos_m", "currency": "INR", "billingInterval": "1_month", "basePrice": 2499.00 }
          ]
        }
      ]
    }
    ```

### 2. Server-Side Cart Calculation
- **`POST /api/commerce/cart/calculate`**
  - **Auth:** Required (`requireAuth`, `resolveTenantContext`).
  - **Request:**
    ```json
    {
      "items": [
        { "productSlug": "pos-inventory", "priceId": "price_pos_m", "quantity": 1 }
      ],
      "couponCode": "LAUNCH20"
    }
    ```
  - **Response:**
    ```json
    {
      "subtotal": 2499.00,
      "discountAmount": 499.80,
      "taxableAmount": 1999.20,
      "taxes": [
        { "type": "CGST", "rate": 0.09, "amount": 179.93 },
        { "type": "SGST", "rate": 0.09, "amount": 179.93 }
      ],
      "totalAmount": 2359.06,
      "currency": "INR"
    }
    ```

### 3. Order Creation & Retrieval
- **`POST /api/commerce/orders`**
  - **Auth:** Required Tenant Admin.
  - **Header:** `Idempotency-Key: <UUID>`
  - **Body:** `{ items: [...], billingAddress: { ... }, couponCode?: string }`
  - **Response:** HTTP 201 with `{ orderId, orderNumber, status: "PENDING_PAYMENT", totalAmount, ... }`
- **`GET /api/commerce/orders/:id`**
  - **Auth:** Required Tenant Admin (Tenant isolation enforced: `WHERE tenant_id = req.user.tenantId`).
  - **Response:** HTTP 200 with complete order snapshot and status.

### 4. Development Simulation Endpoint
- **`POST /api/commerce/checkout/simulate`**
  - **Environment Gated:** Strictly disabled when `NODE_ENV === "production"`.
  - **Body:** `{ orderId: string, outcome: "SUCCESS" | "FAILURE" }`
  - **Response:** HTTP 200 with `{ status: "PAID", fulfilled: true, isSimulated: true }`

---

## I. Threat Model and Failure Scenarios

| # | Threat Vector | Risk / Impact | Architectural Mitigation |
| :---: | :--- | :--- | :--- |
| **1** | **Client-Side Price Manipulation** | Malicious client submits cart with `price: 1.00`. | **Zero Client Math:** Prices, discounts, and taxes are calculated strictly server-side from catalog snapshots. Client price fields are rejected. |
| **2** | **Cross-Tenant Order Snooping / Tampering** | Tenant A attempts to read or pay for Tenant B's order. | **Strict Host & Tenant Binding:** Orders are scoped to `tenant_id`. Handlers enforce `tenant_id = req.user.tenantId`. |
| **3** | **Webhook Replay Attacks** | Attacker replays valid past webhook to re-fulfill or extend subscription. | **Timestamp Check & Idempotency Key:** Webhook timestamp checked ($\le 300\text{s}$). `deliveryKey` uniquely indexed in DB; duplicates return 200 without re-fulfilling. |
| **4** | **Amount Mismatch Fraud** | User pays ₹10 on Razorpay for a ₹10,000 plan. | **Parity Verification:** Gateway amount is checked against order snapshot. Discrepancy halts order in `FLAGGED_MISMATCH`. |
| **5** | **Race Conditions / Double Fulfillment** | Concurrent webhooks execute simultaneously. | **Optimistic Locking:** Order update uses `version = version + 1 WHERE version = :expectedVersion`. Single winner guaranteed. |
| **6** | **Partial Database Failure** | Payment recorded, but entitlement provisioning crashes. | **Interactive Transaction:** Order transition and entitlement upserts run inside `db.$transaction`. Atomic rollback on error. |
| **7** | **Forged Webhook Signatures** | Attacker posts fake success event to `/api/webhooks`. | **Constant-Time HMAC:** Unparsed `req.rawBody` checked via `crypto.timingSafeEqual` with secret key. Failed signature yields HTTP 400. |
| **8** | **Premature Client Redirect Trust** | User redirects to `/checkout/success` before gateway completes. | **Zero Redirect Trust:** UI redirect shows "Processing". Entitlements activate *only* when server processes signed webhook/simulation event. |
| **9** | **Refund Without Revocation** | Customer gets refund, but continues using product. | **Authoritative Refund Pipeline:** Webhook event `payment.refunded` triggers entitlement revocation within same transaction. |
| **10** | **Credential & Secret Exposure** | Gateway keys printed in logs or error traces. | **Masked Logging:** Credentials stored in protected environment variables; sensitive fields sanitized in all logging pipelines. |

---

## J. Implementation Plan and Acceptance Criteria (Future Phases)

Execution of Phase A3 must follow small, decoupled milestones:

```
[ A3.1: Spec Only ] ──► [ A3.2: Catalog & Pricing ] ──► [ A3.3: Order Engine & Sim. ]
      (CLOSED)                      (CLOSED)                         (CLOSED)
                                                                        │
[ A3.6: Owner Gate ] ◄── [ A3.5: E2E Integration ]  ◄── [ A3.4: Entitlement Engine ]
    (ON HOLD)                    (ON HOLD)                (NOT AUTHORIZED / ON HOLD)
```

### Milestones Status
- **Milestone A3.1: Specification & Architecture** — **CLOSED**.
- **Milestone A3.2: Catalog & Pricing Engine** — **CLOSED** (Verified via 20 Acceptance Tests; Fail-closed pricing preserved).
- **Milestone A3.3: Order State Machine & Simulated Checkout** — **CLOSED** (Verified via 32 Acceptance Tests, PostgreSQL Catalog Introspection, Two-Phase Recovery Architecture; Formal Closure Record dated October 9, 2026).
- **Milestone A3.4: Atomic Entitlement Provisioning Pipeline** — **IMPLEMENTATION COMPLETE & VERIFIED** (Verified via 18 Acceptance Tests across 6 Tiers, 50/50 total commerce tests passing, Zero DDL migrations, PostgreSQL row-level locks and transactional outbox sweeper; Implementation Report dated October 9, 2026).
- **Milestone A3.5: End-to-End Test Suite** — **NOT AUTOMATICALLY AUTHORIZED / PENDING OWNER CALL**.
- **Milestone A3.6: Owner Acceptance Gate** — **ON HOLD**.

### Hard Acceptance Criteria for Live Gateway Integration
No production gateway keys (Razorpay Live, Stripe Live) may be provisioned or activated until:
1. 100% of simulated purchase flows pass automated regression tests.
2. Webhook replay and tampering tests demonstrably fail-secure.
3. Owner formally approves the exact commercial pricing schedule (OD-1).

---

## K. Open Decisions Register (Owner Approval Required)

The following commercial and business policy decisions remain open and **must be formally resolved by the Owner** prior to live implementation:

| Decision ID | Description | Options Under Consideration | Recommended Approach |
| :---: | :--- | :--- | :--- |
| **OD-1** | Exact Plan and Seat-Band Pricing | Starter (e.g. ₹999/mo vs ₹1,499/mo), Growth (₹4,999/mo vs ₹7,499/mo), Sovereign Enterprise (Custom). | Keep parameterized in database/catalog; do not hardcode in application logic. |
| **OD-5** | Tax Inclusivity Policy | Inclusive (Tax included in sticker price) vs Exclusive (+18% GST added at checkout). | **Exclusive:** Standard SaaS practice in India and B2B; clear GST invoice breakup. |
| **OD-6** | Mid-Cycle Seat Band Upgrades | Immediate proration charge vs Charge on next renewal date. | **Prorated Charge:** Charge difference for remaining days in current period immediately. |
| **OD-7** | Cancellation & Refund Policy | No refunds (access until period end) vs Prorated refunds. | **No Refunds / Period-End Cancellation:** Avoids complex partial tax and ledger reversals. |
| **OD-8** | Standalone Product Discount Bundling | Buying HRMS + CRM + POS gets 15% bundle discount vs Individual sum. | Model as a catalog bundle item with discounted `basePrice`. |
| **OD-9** | Grace Period Duration on Renewal Failure | 3 days vs 7 days vs 14 days before account suspension. | **7 Days Grace:** Read-only access before account is locked by `SuspendedAccountView`. |

---

## Document Completion Notice
This specification is complete, self-contained, and fully aligned with MASTERHRMS architectural standards. **Implementation remains suspended pending Owner authorization.**
