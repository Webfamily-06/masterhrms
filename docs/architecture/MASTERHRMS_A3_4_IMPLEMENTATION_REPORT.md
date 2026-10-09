# MASTERHRMS — Phase A3.4 Implementation Report
## Atomic Entitlement Provisioning & Outbox Publisher

**Project:** MASTERHRMS Multi-Tenant SaaS HRMS / ERP  
**Phase:** Phase A3.4 — Atomic Entitlement Provisioning & Outbox Publisher  
**Execution Mode:** Authorized Engineering Implementation  
**Status:** IMPLEMENTATION COMPLETE & FORENSICALLY VERIFIED  
**Date:** October 9, 2026  
**Lead Architect & Systems Engineer:** Google Antigravity Engineering Agent  

---

## 1. Executive Summary

Phase A3.4 delivers the enterprise entitlement provisioning and transactional outbox infrastructure for MASTERHRMS. Following formal owner authorization, this implementation connects settled commerce orders from Phase A3.3 to authoritative tenant entitlements across core subscriptions, standalone ERP products, and modular add-ons.

All mutations are executed within atomic database transactions with row-level serialization (`FOR UPDATE`), ensuring zero partial provisioning, complete rollback on failure, multi-worker concurrency safety (`FOR UPDATE SKIP LOCKED`), and strict multi-tenant boundary isolation.

### Key Deliverables Completed:
1. **Canonical Catalog Registry & Exporter** (`unified-catalog.service.ts`):
   - Exported authoritative catalog definitions and lookup (`findCanonicalProduct`).
   - Zero trust in client-supplied product keys, pricing, or target engines.
2. **Order-to-Entitlement Fulfillment Service** (`commerce-fulfillment.service.ts`):
   - Multi-target engine resolution (`BASE_PLAN` -> `TenantSubscription`, `STANDALONE_PRODUCT` -> `TenantModule`, `ADDON_FEATURE`/`ADDON_INTEGRATION` -> `TenantAddon`).
   - UTC leap-year & month-end date calculations.
   - Idempotent execution (`alreadyFulfilled: true` on replays with zero duplicate mutations).
   - Downgrade protection & conflict policies.
3. **Atomic Outbox Event Generation** (`commerce-order.service.ts`):
   - `COMMERCE_ORDER_PAID` event persisted atomically within the Phase 1 settlement transaction.
4. **Multi-Worker Outbox Batch Sweeper** (`commerce-fulfillment.service.ts`):
   - Native PostgreSQL outbox claiming using `SELECT ... FOR UPDATE SKIP LOCKED`.
   - Bounded exponential retries (up to 5 attempts) with error tracking.
   - Permanent failure escalation and dead-letter state logging.
   - Fulfillment kill-switch (`COMMERCE_FULFILLMENT_ENABLED !== "false"`).
5. **Secure Operator Endpoint** (`commerce.routes.ts`):
   - `POST /api/commerce/outbox/sweep` restricted to `SUPER_ADMIN` operators.
6. **Acceptance Test Suite** (`commerce-entitlement-fulfillment.test.ts`):
   - 18 comprehensive tests across 6 validation tiers, 100% passing.
   - 32/32 existing regression tests (A3.2 pricing & A3.3 order lifecycle) 100% passing. Total 50/50 tests passing.

---

## 2. Architecture & Implementation Inventory

### A. Source Code Files Implemented or Modified

| File | Change Type | Responsibility |
| :--- | :--- | :--- |
| `server/src/services/unified-catalog.service.ts` | Modified | Exported `CanonicalProductTemplate`, `CANONICAL_CATALOG_REGISTRY`, and `findCanonicalProduct(slugOrId)` lookup helper. |
| `server/src/services/commerce-order.service.ts` | Modified | Integrated atomic `COMMERCE_ORDER_PAID` event generation in `simulatePaymentSettlement` Phase 1 transaction `tx`. |
| `server/src/services/commerce-fulfillment.service.ts` | Created | Complete canonical fulfillment engine, multi-target provisioning, row locking, idempotency guard, and outbox batch sweeper. |
| `server/src/routes/commerce.routes.ts` | Modified | Integrated `CommerceFulfillmentService` and added `POST /api/commerce/outbox/sweep` operator route. |
| `server/src/tests/commerce-entitlement-fulfillment.test.ts` | Created | Dedicated 6-tier acceptance test suite (18 tests covering catalog mapping, atomicity, concurrency, security, outbox recovery). |

---

## 3. Entitlement Engine Mapping Specifications

The fulfillment engine maps purchased items from `CommerceOrder.priceSnapshot.items` to database target models strictly via authoritative canonical catalog metadata:

### 1. Base Plans (`BASE_PLAN`)
- **Target Model:** `TenantSubscription` (Target Engine: `SUBSCRIPTION_ENGINE`)
- **Foreign Key:** `planId` references `SubscriptionPlan.id` (canonical slugs: `starter`, `growth`, `sovereign`, `custom-flex`).
- **Billing Interval:** Month (30 days / UTC calendar end) or Year (UTC anniversary clamping). Leap years (Feb 28/29) clamped safely in UTC.
- **Seat Mapping:** `seats` mapped to `maxEmployees`.
- **Downgrade Guard:** Compares `planTierRank` (`starter: 1`, `growth: 2`, `sovereign: 3`, `custom-flex: 4`). Rejecting unauthorized downgrades unless explicitly authorized.

### 2. Standalone ERP Products (`STANDALONE_PRODUCT`)
- **Target Model:** `TenantModule` (Target Engine: `MODULE_ENGINE`)
- **Supported Products:** `pos` (`product_pos`), `crm` (`product_crm`), `finance` (`product_finance`).
- **HRMS Independence:** Standalone modules provision with `isEnabled: true` regardless of whether the tenant possesses an HRMS base subscription.
- **Idempotency:** Unique constraint `[tenantId, moduleKey]` upserted safely without resetting configuration.

### 3. Add-Ons & Integrations (`ADDON_FEATURE`, `ADDON_INTEGRATION`)
- **Target Model:** `TenantAddon` (Target Engine: `ADDON_ENGINE`)
- **Supported Items:** Biometric Sync (`addon_biometric_sync`), Google Workspace Integration (`addon_google_workspace`), etc.
- **Renewal Extension Policy:** Repurchase of an existing active add-on extends `expiresAt` from the current expiration date (`currentExpiresAt + period`) rather than resetting from today.

---

## 4. Transaction Atomicity & Concurrency Model

### Row-Level Locking Protocol
```sql
SELECT id, tenant_id, status, fulfillment_status, price_snapshot, order_number, version
FROM commerce_orders
WHERE id = $1 AND tenant_id = $2
FOR UPDATE;
```
1. Row lock on `commerce_orders` serializes competing workers.
2. If `order.fulfillmentStatus === 'FULFILLED'`, the worker immediately returns `{ alreadyFulfilled: true }` without executing any mutations.
3. If `order.status !== 'PAID'`, the worker aborts with `ORDER_NOT_PAID`.
4. All entitlement writes (`TenantSubscription`, `TenantModule`, `TenantAddon`), order status update (`fulfillmentStatus: 'FULFILLED'`), outbox event update (`status: 'PROCESSED'`), and audit logging (`COMMERCE_FULFILLMENT_SUCCEEDED`) are executed within a single `db.$transaction`.
5. Any failure triggers a 100% database rollback.

### Multi-Worker Outbox Sweeper Protocol
```sql
SELECT id, event_id, tenant_id, payload, retry_count
FROM outbox_events
WHERE status = 'PENDING'
  AND event_type = 'COMMERCE_ORDER_PAID'
  AND retry_count < 5
ORDER BY occurred_at ASC
LIMIT $1
FOR UPDATE SKIP LOCKED;
```
- `FOR UPDATE SKIP LOCKED` guarantees zero collisions between parallel worker processes.
- Unclaimed events are processed independently.
- Exhausted retries (5 attempts) are transitioned to `FAILED` with audit logging for manual operator intervention.

---

## 5. Security & Multi-Tenant Boundary Verification

1. **Strict Tenant Scoping:** Every fulfillment invocation requires both `orderId` and `tenantId`. A mismatched `tenantId` yields a fail-closed 404 error without disclosing order existence.
2. **Untrusted Payload Defense:** All item metadata, target tables, and entitlement parameters are looked up from `findCanonicalProduct` in server memory. Client-injected items or modified snapshots are rejected.
3. **Operator Route Protection:** `POST /api/commerce/outbox/sweep` verifies authenticated user roles (`super_admin` / `SUPER_ADMIN`). Unauthorized attempts are rejected with HTTP 403 Forbidden.
4. **Data Privacy:** Sensitive card tokens, secrets, or gateway credentials are never logged or stored in audit payloads.

---

## 6. Migration & Database Integrity
- Zero DDL migrations required for A3.4.
- All target models (`commerce_orders`, `outbox_events`, `tenant_subscriptions`, `tenant_modules`, `tenant_addons`, `audit_logs`) were previously verified in database schema and migration history.
- Existing records and foreign key constraints preserved intact.

---

## 7. Dated Reconciliation Note (October 9, 2026 — Phase A3.6 Governance Audit)

> [!NOTE]
> **Historical Implementation Evidence Reconciliation:**  
> In Section 1 (Executive Summary, item 6) and Section 2 of this report, an initial draft count of "18 comprehensive tests" was documented.
> 
> As recorded in the subsequent [`MASTERHRMS_A3_4_TEST_EVIDENCE.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/architecture/MASTERHRMS_A3_4_TEST_EVIDENCE.md) and independently re-verified under Phase A3.6:
> 1. The completed [`commerce-entitlement-fulfillment.test.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-entitlement-fulfillment.test.ts) suite expanded to **22 comprehensive tests** (incorporating tests T1.6, T1.7 for upgrade audits, T5.5 for crash recovery, and T6.2 for add-on runtime reflection).
> 2. With the addition of Phase A3.5 E2E journeys, the active repository contains **67 total commerce tests** (20 A3.2 + 12 A3.3 + 22 A3.4 + 13 A3.5), all passing with 100% success against PostgreSQL.
> 3. This report is preserved as historical implementation evidence.

