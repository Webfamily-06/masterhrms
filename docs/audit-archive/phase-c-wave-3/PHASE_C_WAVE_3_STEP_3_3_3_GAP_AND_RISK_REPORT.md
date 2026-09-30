# Phase C — Wave 3 — Step 3.3.3: Gap and Risk Report

## Executive Summary

Phase C — Wave 3 — Step 3.3.3 successfully replaced direct stock mutations with the centralized atomic stock engine across all primary routes. However, as an enterprise ERP system, several structural constraints, schema limitations, and edge-case risks must be documented before proceeding to Step 3.3.4 (UI Hardening) and future inventory waves.

---

## 1. Schema Constraints & Idempotency Gaps

### 1.1 Lack of Unique Database Constraint on `(tenant_id, reference_type, reference_id, movement_type)`
- **Finding**: In Step 3.3.1, `StockMovement` was provisioned without a composite unique constraint on `(tenant_id, reference_type, reference_id, movement_type)` to avoid blocking legitimate multi-line receipts or adjustments sharing the same parent reference.
- **Current Mitigation**: Status transitions on parent records (e.g. `Purchase.status` transitioning `pending -> received`, or `StockTransfer.status` transitioning `in_transit -> completed`) act as state gates inside atomic transactions. If a purchase is already marked `"received"`, subsequent requests return early without executing `increaseStock`.
- **Remaining Risk**: If an external caller bypasses the status transition or issues duplicate simultaneous requests where the parent record is created concurrently with initial status `"received"`, the database itself does not block duplicate `StockMovement` rows. A future database migration should introduce an explicit `idempotency_key` or unique reference index for fine-grained line-level idempotency.

### 1.2 Offline Sales Batch Sync Collision Surface
- **Finding**: `POST /api/sales/sync-offline` accepts batches of offline POS transactions recorded while cashiers were disconnected from the internet.
- **Current Mitigation**: Checks whether a sale with the matching `receiptNo` already exists. If it exists, it skips processing.
- **Remaining Risk**: If offline terminals operate without clock synchronization and sell items that were already depleted by online terminals while offline, the sync endpoint will encounter `InsufficientStockError` (409 Conflict). A business decision is needed on whether to allow offline negative stock overdrafts with post-hoc reconciliation or to reject the offline sync and flag it for manager override.

---

## 2. Multi-Warehouse Valuations & FIFO/LIFO Tracking

### 2.1 Weighted Average Cost (WAC) vs FIFO Layers
- **Current Architecture**: The system tracks inventory valuation using a tenant-wide and warehouse-level Weighted Average Cost based on historical `PurchaseDetail` records.
- **Gap**: `StockMovement` does not currently maintain individual valuation cost layers (FIFO lot tracks). When an item is sold or transferred, the movement records quantity and standard unit price, but does not consume discrete purchase cost lots.
- **Recommendation for Future Waves**: Introduce lot/batch tracking or serial numbers in a dedicated inventory valuation wave.

---

## 3. Pre-Existing Build Errors vs Current Step

During `npm --prefix server run build`, 11 pre-existing TypeScript errors were identified in 5 unrelated files. None of these errors originated from the Step 3.3.3 changes:

| File | Errors | Reason / Origin |
|---|:---:|---|
| `server/src/routes/attendance.routes.ts` | 4 | Legacy attendance status enum mismatch (`on_leave` vs union type) and missing `totalHours` property in Prisma update payload |
| `server/src/routes/payroll.routes.ts` | 1 | `status` property missing in `PayslipUpdateManyMutationInput` |
| `server/src/routes/projects.routes.ts` | 2 | `unitPrice` property mismatch on `SaleDetailUncheckedCreateWithoutSaleInput` and `status` access on invoice |
| `server/src/routes/workspace.routes.ts` | 1 | Spread operator on potentially non-object type |
| `server/src/tests/prisma-proxy-facade.test.ts` | 3 | Prototype test payload missing required nested `tenant` relation |

**All 8 routes and services modified or created in Step 3.3.3 compile with ZERO TypeScript errors:**
- `server/src/services/inventory-movement.service.ts`: 0 errors
- `server/src/routes/products.routes.ts`: 0 errors
- `server/src/routes/sales.routes.ts`: 0 errors
- `server/src/routes/invoices.routes.ts`: 0 errors
- `server/src/routes/purchases.routes.ts`: 0 errors
- `server/src/routes/transfers.routes.ts`: 0 errors
- `server/src/routes/adjustments.routes.ts`: 0 errors
- `server/src/routes/ai.routes.ts`: 0 errors
- `server/src/routes/accounting.routes.ts`: 0 errors (resolved Decimal casting)
- `server/src/tests/wave3-step3-3-3-router-integration.test.ts`: 0 errors

---

## 4. Frontend UI Alignment Dependency for Step 3.3.4

- In Step 3.3.3, route validation now strictly enforces `Decimal(15,3)` precision and rejects negative stock overdrafts with HTTP 409 Conflict.
- Existing React frontend forms (e.g. POS cart, transfer modals, adjustment inputs) may still present error toasts as generic 500 errors if they do not parse the structured error payload `{ code: "INSUFFICIENT_STOCK", details: { ... } }`.
- Step 3.3.4 must update the frontend UI error handling to display friendly, actionable stock warning dialogs and stock passport views.
