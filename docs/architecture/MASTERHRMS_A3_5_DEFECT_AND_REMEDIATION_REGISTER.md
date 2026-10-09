# MASTERHRMS — Phase A3.5 Defect & Remediation Register

**Project:** MASTERHRMS Multi-Tenant HRMS / ERP SaaS  
**Phase:** Phase A3.5 — End-to-End Testing & Integration Gate  
**Execution Date:** October 9, 2026  
**Scope:** In-Scope Defect Identification, Root Cause Analysis, Remediation & Regression Verification  

---

## 1. Summary of Defects Discovered and Remediated

| Defect ID | Severity | Component | Summary | Status | Regression Test |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **DEF-A35-01** | High | `commerce-fulfillment.service.ts` | Snapshot line item property mapping mismatch (`items` vs `lineItems`) | **RESOLVED** | `E2E-1.1`, `E2E-2.1`, `E2E-4.1` |
| **DEF-A35-02** | High | `commerce-fulfillment.service.ts` | Base plan seat calculation defaulted to 1 employee profile instead of plan tier capacity | **RESOLVED** | `E2E-1.1`, `E2E-4.1` |
| **DEF-A35-03** | Critical | `outbox.service.ts` | Generic background realtime dispatcher claimed & marked commerce payment outbox events as `PROCESSED` without fulfilling order | **RESOLVED** | `E2E-3.1`, `E2E-6.2` |
| **DEF-A35-04** | Low | `commerce-e2e-journey.test.ts` | Test assertion checked `addon.expiresAt` instead of schema property `addon.renewsAt` | **RESOLVED** | `E2E-3.1` |
| **DEF-A35-05** | Low | `commerce-e2e-journey.test.ts` | Test assertion evaluated `meData.user` instead of root `meData.profile` from `/api/auth/me` | **RESOLVED** | `E2E-1.1` |

---

## 2. Detailed Root Cause Analysis & Remediation Log

### DEF-A35-01: Line Item Shape Mismatch in Entitlement Fulfillment
- **Failure Symptom:** Fulfillment rejected valid orders with error `MALFORMED_PRICE_SNAPSHOT: Order price snapshot contains no valid items`.
- **Root Cause:** `CartCalculatorService.calculate()` writes calculated items to `snapshot.lineItems` (each containing `productSlug`), whereas `CommerceFulfillmentService.fulfillOrder()` was expecting `snapshot.items` (with `slug` or `productId`).
- **Files Modified:**
  - `server/src/services/commerce-fulfillment.service.ts` (lines 178, 196)
- **Remediation Details:**
  - Updated line item extraction to accept either `snapshot?.lineItems || snapshot?.items`.
  - Updated item key resolution to support `item.productSlug || item.productId || item.slug || item.id`.
- **Verification:** `E2E-1.1`, `E2E-2.1`, `E2E-4.1` passed cleanly.

---

### DEF-A35-02: Base Plan Seat Capacity Resolution
- **Failure Symptom:** `TenantSubscription.maxEmployees` was provisioned as `1` instead of `25` for Starter Cloud subscriptions.
- **Root Cause:** When an order is created without explicit seat band overrides, `CartCalculatorService` records `quantity: 1` and `seats: 1` (denoting 1 base subscription unit, within included plan capacity). The fulfillment engine assigned `includedSeats = item.seats || item.quantity || 25`. Because `item.seats` was 1, it took 1 rather than the plan's 25 included seats.
- **Files Modified:**
  - `server/src/services/commerce-fulfillment.service.ts` (lines 231-237)
- **Remediation Details:**
  - Updated seat resolution logic to:
    ```typescript
    let includedSeats = Math.max(item.includedSeats || 0, item.seats || 0);
    if (includedSeats <= 1) {
      if (catalogProduct.slug === "starter") includedSeats = 25;
      else if (catalogProduct.slug === "growth") includedSeats = 100;
      else if (catalogProduct.slug === "sovereign") includedSeats = 500;
      else includedSeats = 25;
    }
    ```
- **Verification:** Verified `sub.maxEmployees === 25` in `E2E-1.1` and `sub.maxEmployees === 100` in `E2E-4.1`.

---

### DEF-A35-03: Realtime Outbox Worker Hijacking Commerce Events
- **Failure Symptom:** Subsequent add-on purchases failed to extend renewal dates (`renewedRenewsAt === initialRenewsAt`), and retry exhaustion failed with `expected 'PROCESSED' to be 'FAILED'`.
- **Root Cause:** `OutboxService.startProcessor()` runs a 3-second polling interval in the running server process for WebSocket realtime event broadcasting (`processPendingEvents`). It queried all `status = 'PENDING'` events without filtering event types. When a `COMMERCE_ORDER_PAID` event was written, the realtime worker occasionally claimed it, broadcasted it, and immediately marked it `PROCESSED`. As a result, the commerce worker found 0 pending events and skipped fulfillment, leaving orders unfulfilled while marking events processed.
- **Files Modified:**
  - `server/src/services/outbox.service.ts` (line 110)
- **Remediation Details:**
  - Added filter `eventType: { notIn: ["COMMERCE_ORDER_PAID"] }` to `OutboxService.processPendingEvents()`.
  - Ensures commerce payment outbox events are exclusively processed by `CommerceFulfillmentService.processOutboxBatch()`.
- **Verification:** `E2E-3.1` (renewal extension) and `E2E-6.2` (retry exhaustion to FAILED status) passed cleanly.

---

### DEF-A35-04: Test Property Alignment (`renewsAt`)
- **Failure Symptom:** TypeError attempting to read `addon.expiresAt.getTime()`.
- **Root Cause:** The `TenantAddon` model in `schema.prisma` defines the renewal timestamp column as `renewsAt` (`DateTime? @map("renews_at")`), not `expiresAt`.
- **Files Modified:**
  - `server/src/tests/commerce-e2e-journey.test.ts` (lines 408, 440)
- **Remediation Details:** Updated test assertion to reference `addonInitial.renewsAt.getTime()`.
- **Verification:** Test passed without errors.

---

### DEF-A35-05: Session Endpoint Schema Alignment
- **Failure Symptom:** `AssertionError: expected undefined to be defined` on `meData.user`.
- **Root Cause:** `/api/auth/me` returns the user entity at the root level (`{ id, email, profile, roles, enabledModules }`), rather than nested under `{ user: ... }`.
- **Files Modified:**
  - `server/src/tests/commerce-e2e-journey.test.ts` (lines 296-297)
- **Remediation Details:** Updated assertions to check `meData.id` and `meData.profile.tenantId`.
- **Verification:** `E2E-1.1` passed cleanly.
