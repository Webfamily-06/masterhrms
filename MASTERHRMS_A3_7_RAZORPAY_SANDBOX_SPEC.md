# MASTERHRMS — Phase A3.7 Razorpay Sandbox Architecture Specification

**Document Identifier:** `MASTERHRMS-A3.7-RAZORPAY-SPEC-20261009-V1`  
**Document Version:** 1.0.0  
**Phase:** Phase A3.7 Technical Readiness — TR-01 Architecture Specification  
**Date:** October 9, 2026  
**Auditor / System Architect:** Google Antigravity Systems & Governance Architecture Team  
**Authorization Status:** **AUTHORIZED FOR TECHNICAL SPECIFICATION DESIGN ONLY**  
**Production Activation Status:** **STRICTLY PROHIBITED (Zero Live Credentials / Zero Live Charges)**  

---

## 1. Executive Summary & Governance Scope

Under Product Owner authorization **TR-01**, this specification establishes the technical architecture, security controls, cryptographic signature verification, idempotency contracts, and fulfillment handoffs for integrating **Razorpay Sandbox Payment Capture** into the Phase A3 `CommerceOrder` lifecycle.

### Mandatory Operational Boundaries
1. **Design Only:** This document provides the engineering contract. Non-production sandbox code implementation requires a separately scheduled scope approval.
2. **Sandbox Isolation:** All endpoints, mock harnesses, and configuration parameters are strictly bounded to test mode (`rzp_test_*`).
3. **Zero Production Risk:**
   - **No live Razorpay credentials or secrets in code or repository.**
   - **No live customer charges or real monetary transactions.**
   - **No production webhook endpoint exposure.**
   - **No live commercial entitlement activation.**

---

## 2. End-to-End Payment Flow Architecture

The commerce checkout pipeline connects the server-authoritative cart calculation, frozen order snapshotting, sandbox gateway order creation, timing-safe webhook capture, and transactional outbox fulfillment.

```
+---------------------------------------------------------------------------------------------------+
|                            COMMERCE ORDER RAZORPAY SANDBOX FLOW                                   |
|                                                                                                   |
|  [Client]                                                                                         |
|     |                                                                                             |
|     | 1. POST /api/commerce/cart/calculate                                                        |
|     +--------------------------------------------------------> [CartCalculatorService]            |
|     | <------------------------------------------------------- Server-authoritative calculation   |
|     |                                                                                             |
|     | 2. POST /api/commerce/orders (Payload + Idempotency-Key)                                    |
|     +--------------------------------------------------------> [CommerceOrderService]             |
|     | <------------------------------------------------------- Order created (status: PENDING)    |
|     |                                                                                             |
|     | 3. POST /api/commerce/checkout/initiate (orderId)                                           |
|     +--------------------------------------------------------> [CommerceCheckoutController]      |
|     |                                                             |                               |
|     |                                                             | Calls Razorpay Orders API     |
|     |                                                             v                               |
|     | <------------------------------------------------------- Razorpay Order ID (order_XXXXX)    |
|     |                                                                                             |
|     | 4. Client opens Razorpay Checkout Modal (Sandbox Card/UPI)                                  |
|     |                                                                                             |
|     | 5. Razorpay Server dispatches asynchronous webhook                                          |
|     v                                                             v                               |
|  [Razorpay Sandbox Gateway] ---------------------------------> [POST /api/commerce/webhook]       |
|                                                                   |                               |
|                                                                   | A. Timing-safe HMAC verify    |
|                                                                   | B. Amount & Currency match    |
|                                                                   | C. Idempotent state to PAID   |
|                                                                   | D. Insert Outbox Event        |
|                                                                   v                               |
|                                                                [CommerceOutboxWorker]             |
|                                                                   |                               |
|                                                                   | E. Async fulfillOrder()       |
|                                                                   | F. Option 3A BillingInvoice   |
|                                                                   | G. Provision Entitlements     |
|                                                                   v                               |
|                                                                [Active Tenant Entitlements]       |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Endpoint Contracts

### 3.1 Endpoint 1: Checkout Initiation (`POST /api/commerce/checkout/initiate`)

#### Request Contract
- **HTTP Method:** `POST`
- **Route:** `/api/commerce/checkout/initiate`
- **Authentication:** `requireAuth` (JWT bearer token validating tenant context).
- **Headers:**
  - `Content-Type: application/json`
  - `x-tenant-id: <tenant_uuid>` (must match JWT tenant claims)
- **Request Body:**
  ```json
  {
    "orderId": "ord_a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  }
  ```

#### Server-Authoritative Processing Logic
1. **Tenant Isolation Check:** Query `CommerceOrder` where `id = orderId` AND `tenantId = authReq.user.tenantId`. If not found, reject with `404 Not Found`.
2. **Order State Check:** Verify `order.status === "PENDING_PAYMENT"`. If `order.status === "PAID"`, reject with `409 ALREADY_PAID`. If `EXPIRED` or `CANCELLED`, reject with `400 ORDER_NOT_PAYABLE`.
3. **Amount Computation in Minor Units:**
   - Razorpay expects amounts in paise (integers).
   - Convert `order.totalAmount` to paise: `amountInPaise = Math.round(Number(order.totalAmount) * 100)`.
4. **Gateway Order Creation:**
   - Call Razorpay API: `razorpay.orders.create({ amount: amountInPaise, currency: order.currency, receipt: order.orderNumber, notes: { orderId: order.id, tenantId: order.tenantId } })`.
5. **Metadata Update:**
   - Store `gatewayOrderId: rzpOrder.id` and `gatewayProvider: "RAZORPAY_SANDBOX"` into `CommerceOrder.metadata`.
6. **Response Body:**
   ```json
   {
     "success": true,
     "orderId": "ord_a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
     "gatewayOrderId": "order_EKmF92Y1Z0abcD",
     "amount": 23482,
     "currency": "INR",
     "keyId": "rzp_test_XXXXXXXXXXXXXX",
     "orderNumber": "ORD-20261009-0012",
     "customer": {
       "name": "Acme Admin",
       "email": "admin@acme.example.com"
     }
   }
   ```

---

### 3.2 Endpoint 2: Cryptographic Webhook Handler (`POST /api/commerce/webhook`)

#### Webhook Ingestion Contract
- **HTTP Method:** `POST`
- **Route:** `/api/commerce/webhook`
- **Middleware:** `express.raw({ type: 'application/json' })` to preserve pristine raw request buffer.
- **Headers Verified:**
  - `x-razorpay-signature`: Cryptographic HMAC SHA256 hex digest.

#### Cryptographic Signature Verification Algorithm
```typescript
import crypto from "crypto";

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret || !rawBody) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
```

#### Fail-Closed Security Rules
- If `process.env.RAZORPAY_WEBHOOK_SECRET` is unset or empty, the handler strictly rejects all incoming webhooks with HTTP 500 (`code: "WEBHOOK_VERIFICATION_UNAVAILABLE"`).
- If the signature header is missing or does not match `crypto.timingSafeEqual`, the request is rejected immediately with HTTP 400 (`code: "INVALID_SIGNATURE"`). Zero database mutations are performed.

---

## 4. Webhook Event Processing & Idempotency Controls

### 4.1 Event Dispatch Logic
The webhook handler listens specifically for:
- `payment.captured`
- `order.paid`

### 4.2 Forensic Validation Checks
Upon validating the cryptographic signature, the handler performs four mandatory checks:
1. **Order Resolution:** Extract `payload.payment.entity.notes.orderId` (or lookup via `gatewayOrderId`). Query `CommerceOrder` by primary key.
2. **Currency Validation:** Verify `payload.payment.entity.currency.toUpperCase() === order.currency.toUpperCase()`. If mismatched, flag security alert and abort.
3. **Amount Validation:**
   - `expectedPaise = Math.round(Number(order.totalAmount) * 100)`
   - `receivedPaise = Number(payload.payment.entity.amount)`
   - If `expectedPaise !== receivedPaise`, reject settlement with `AMOUNT_MISMATCH_DETECTED`. Mark order `FAILED` with forensic audit details.
4. **Idempotent Replay Handling:**
   - If `order.status === "PAID"`:
     - Check `order.metadata.gatewayPaymentId === payload.payment.entity.id`.
     - Return HTTP 200 with header `X-Idempotent-Replay: true`. Zero duplicate fulfillment events are enqueued.

### 4.3 Database Transaction & Outbox Event Insertion
Inside a single database transaction (`prisma.$transaction`):
```typescript
await tx.commerceOrder.update({
  where: { id: order.id },
  data: {
    status: "PAID",
    paidAt: new Date(payload.payment.entity.created_at * 1000),
    metadata: {
      ...((order.metadata as any) || {}),
      gatewayProvider: "RAZORPAY_SANDBOX",
      gatewayOrderId: payload.payment.entity.order_id,
      gatewayPaymentId: payload.payment.entity.id,
      gatewayMethod: payload.payment.entity.method,
      gatewayEventId: eventId,
    },
  },
});

await tx.commerceOutboxEvent.create({
  data: {
    topic: "ORDER_PAID_FULFILLMENT_REQUESTED",
    aggregateType: "COMMERCE_ORDER",
    aggregateId: order.id,
    payload: {
      orderId: order.id,
      tenantId: order.tenantId,
      gatewayPaymentId: payload.payment.entity.id,
      amountPaise: receivedPaise,
    },
    status: "PENDING",
  },
});
```

---

## 5. Fulfillment & Provisioning Handoff

Once the outbox event is committed, the asynchronous `CommerceOutboxWorker` sweeps the event using `FOR UPDATE SKIP LOCKED` and delegates fulfillment to `CommerceFulfillmentService.fulfillOrder`:

1. **Base Plan Provisioning (Starter / Growth / Sovereign):**
   - Creates or updates `TenantSubscription`.
   - Sets `planId = item.productId`.
   - Enforces **CP-02 Sovereign limit: 100 employees** ceiling (overage prohibited).
   - Enforces **CP-01 Annual duration:** `1_year` (ends in 365 days) or `1_month` (ends in 30 days).
2. **Standalone ERP Module Provisioning (POS / CRM / Finance):**
   - Provisions `TenantModule` entitlement records bound to `tenantId`.
   - Preserves modular feature flags without requiring a base HRMS plan.
3. **Workspace Add-On Provisioning (Biometric Sync / WhatsApp):**
   - Provisions `TenantAddon` entitlement records.
   - Stacks renewal periods on repurchases.
4. **Option 3A Consolidated Invoicing:**
   - Generates `BillingInvoice` with `subscriptionId = (hasBasePlan ? subscription.id : null)`.
   - Freezes immutable line items, taxes, currency, and payment reference.

---

## 6. Sandbox Test Matrix & Failure Scenarios

| Test Case ID | Test Scenario | Input / Trigger | Expected Outcome | Forensic Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **SBX-01** | **Happy Path Sandbox Payment** | Valid test UPI payment on `PENDING_PAYMENT` order | Order transitions to `PAID`; outbox event enqueued; entitlements active | Assert `order.status === 'PAID'` and `TenantSubscription.status === 'active'`. |
| **SBX-02** | **Duplicate Webhook Replay** | Same webhook payload retransmitted 3 times | HTTP 200 with `X-Idempotent-Replay: true`; zero duplicate outbox events | Count of `commerce_outbox_events` remains exactly 1. |
| **SBX-03** | **Tampered Cryptographic Signature** | Inverted byte in `x-razorpay-signature` | HTTP 400 `INVALID_SIGNATURE`; transaction rejected | Assert order remains `PENDING_PAYMENT`; zero DB writes. |
| **SBX-04** | **Amount Discrepancy Attack** | Gateway reports ₹100 paise for ₹2,388 order | Webhook rejected; order marked `FAILED` with mismatch audit | Assert `order.status === 'FAILED'` and error code `AMOUNT_MISMATCH`. |
| **SBX-05** | **Currency Mismatch Attack** | Gateway reports `USD` for `INR` order | Webhook rejected with `CURRENCY_MISMATCH` | Zero state mutation; order remains `PENDING_PAYMENT`. |
| **SBX-06** | **Missing Webhook Secret** | `RAZORPAY_WEBHOOK_SECRET` unset in environment | HTTP 500 `WEBHOOK_VERIFICATION_UNAVAILABLE` | Fails closed; error logged. |
| **SBX-07** | **Worker Interruption Recovery** | Kill worker mid-fulfillment transaction | Event picked up on next sweep; no partial provisioning | Complete rollback or successful subsequent completion. |

---

## 7. Operational Readiness & Safety Summary

```
+-------------------------------------------------------------------------+
|                  RAZORPAY SANDBOX SPECIFICATION STATUS                  |
|                                                                         |
|                STATUS: ARCHITECTURE SPECIFICATION COMPLETE              |
|                                                                         |
|  Notice: Gated strictly to sandbox design. Zero live credentials,       |
|  zero live charges, and zero production webhook deployments.            |
+-------------------------------------------------------------------------+
```
