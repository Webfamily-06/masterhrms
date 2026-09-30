# Phase C — Wave 3 — Step 3.3.3: Router Hardening & Centralized Stock Engine Integration Implementation Report

## Executive Summary

Phase C — Wave 3 — Step 3.3.3 focused on replacing legacy direct stock mutations across all backend routes and workflows with the centralized, atomic, and concurrency-hardened `InventoryMovementService` established in Step 3.3.2.

All core inventory-mutating workflows across Sales, Invoices/POS, Purchases, Products, Transfers, Adjustments, and AI procurement have been integrated. Legacy direct overwrites and manual increments/decrements of `ProductWarehouse.quantity` have been eliminated from all transactional business paths. Concurrency-safe atomic execution boundaries, paired movement ledger audit trails (`StockMovement`), fail-closed tenant validation, and high-precision `Decimal(15,3)` calculations are now active.

---

## 1. Scope of Integration

### 1.1 Integrated Routes and Modules

| Module / Route | File Path | Operations Integrated | Concurrency / Boundary Mechanism |
|---|---|---|---|
| **Products** | `server/src/routes/products.routes.ts` | `POST /` (Opening Stock)<br>`PUT /:id` (Stock Overwrite Protection)<br>`POST /stock/add`<br>`GET /:id/movements` (Audit Ledger API) | Opening stock and stock additions routed through `InventoryMovementService.increaseStock`. Client quantity overwrites in `PUT /:id` stripped out. |
| **Sales & POS** | `server/src/routes/sales.routes.ts` | `POST /` (POS Checkout / Sale Invoice)<br>`POST /sync-offline` (Offline Batch Sync) | Centralized `decreaseStock` in transaction. Service products bypassed. Concurrency-safe invoice numbering with entropy. 409 Conflict on overdraft. |
| **Invoices (POS)** | `server/src/routes/invoices.routes.ts` | `POST /pos/sales` (Direct POS Checkout) | Centralized `decreaseStock` in unified Prisma transaction with sale record and ledger auto-posting. |
| **Purchases & GRN** | `server/src/routes/purchases.routes.ts` | `POST /` (Immediate Receipt PO)<br>`PATCH /:id/status` (Goods Receipt / Void Reversal) | `increaseStock` on `"received"` transition. Idempotent guard prevents duplicate increments. Reversal (`"cancelled"`) triggers `decreaseStock` with overdraft guard. |
| **Stock Transfers** | `server/src/routes/transfers.routes.ts` | `POST /` (Transfer Creation)<br>`PATCH /:id/status` (`in_transit`, `completed`, `rejected`) | Multi-tier state machine. Rejects identical source/destination. Atomically deducts from source upon `in_transit` and increments destination upon `completed`. |
| **Stock Adjustments** | `server/src/routes/adjustments.routes.ts` | `POST /` (Stock Adjustments)<br>`POST /reconcile` (Physical Audit Count) | Full 3-decimal precision without integer rounding (`Math.floor` removed). `recordAdjustment` and `reconcilePhysicalStock` route deltas to `increaseStock` / `decreaseStock`. |
| **AI PO Generator** | `server/src/routes/ai.routes.ts` | `POST /generate-po` (Auto-generated PO) | Replaced raw `prisma.productWarehouse.upsert` with `InventoryMovementService.increaseStock`. |

---

## 2. Technical Decisions & Architectural Enhancements

### 2.1 Nested Model Decoupling for Tenant-Isolation Extension
The multi-tenant Prisma extension (`server/src/extensions/tenant-isolation.extension.ts`) intercepts queries and automatically injects `tenantId` into nested write payloads. However, child detail tables (`PurchaseDetail`, `StockTransferDetail`, `StockAdjustmentDetail`) belong to `CHILD_DEPENDENT_MODELS` and do not have a separate `tenant_id` column. Using nested `details: { create: [...] }` inside parent creation triggers Prisma validation errors (`Unknown argument tenantId`).
- **Solution**: Decoupled detail record creation in `purchases.routes.ts`, `transfers.routes.ts`, and `inventory-movement.service.ts` (`createTransfer`, `recordAdjustment`, `reconcilePhysicalStock`). Parents are created first, followed by detail items linked by foreign key (`purchaseId`, `transferId`, `adjustmentId`), returning the complete tree via `findUniqueOrThrow` with relations.

### 2.2 Shared Prisma Transaction Client Support
`InventoryMovementService` was enhanced to accept an optional transaction client parameter (`clientTx?: Prisma.TransactionClient`) across all its core methods (`increaseStock`, `decreaseStock`, `adjustStock`, `transferStock`). This ensures that outer business workflows (such as creating a `Sale`, writing `SaleDetails`, posting to general ledger, and decrementing stock) share a single database transaction boundary. A failure at any point rolls back stock decrements, journal entries, and sale records simultaneously.

### 2.3 Collision-Resistant Invoice & Receipt Sequencing
Under high-concurrency checkout races (e.g. 10 simultaneous POS terminals selling units of the same fast-moving item), sequential `sale.count()` operations can return identical sequence numbers, resulting in a database unique key constraint error (`sales_tenant_id_invoice_no_key`).
- **Enhancement**: Added 4-digit entropy to default receipt number generation when no explicit client receipt ID is supplied (`REC-YYYY-XXXX-RAND`), ensuring concurrent checkouts are governed purely by database row-level locks on stock balances rather than crashing on document sequence collisions.

### 2.4 Idempotency & Status Transition Hardening
- **Purchases**: `PATCH /api/purchases/:id/status` checks `currentStatus === newStatus` and returns early. Transition to `"received"` only triggers `increaseStock` if previous status was not already `"received"`. Transition to `"cancelled"` restores stock only if previous status was `"received"`.
- **Transfers**: Rejects same-warehouse transfers (`fromWarehouseId === toWarehouseId`) with HTTP 400 Bad Request. Multi-tier transitions ensure stock is deducted once upon departure and added once upon destination arrival.

---

## 3. Database Safety Confirmation

- **Target Database**: `127.0.0.1:3306/master_hrms_dev` (MySQL 9.5.0).
- **Remote Production Database**: `147.79.66.214` was **NOT** accessed, modified, or migrated.
- **Prisma Migrations**: No schema alterations, table drops, or resets were performed.
- **Environment**: Neither `.env` nor `server/.env` was modified.

---

## 4. Acceptance Criteria Verification

- [x] All stock-mutating workflows routed through `InventoryMovementService`.
- [x] Direct updates to `ProductWarehouse.quantity` removed from transactional routes.
- [x] Stock changes and `StockMovement` records share atomic transactions with financial records.
- [x] Multi-tenant isolation verified across all integrated endpoints.
- [x] Concurrency oversell protection verified via 10-client parallel checkout test.
- [x] Three-decimal precision (`Decimal(15,3)`) preserved without JavaScript floating-point corruption.
- [x] 20/20 router integration tests passing.
- [x] 85/85 regression tests passing (Step 3.3.2, 3.3.1, 3.2, 3.1).
- [x] Zero frontend files modified.
- [x] Step 3.3.4 (UI Hardening) has not been started.
