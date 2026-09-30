# Phase C — Wave 3 — Step 3.3.1: Gap and Risk Report

## Executive Summary

Step 3.3.1 successfully resolved the data architecture gap (**GAP-1: Quantity Precision Regression**) and established the database foundation for **GAP-2: Immutable Stock Movement Ledger Table** in the local development database `master_hrms_dev`.

This report evaluates the current security posture, resolved gaps, remaining operational risks, and boundaries before Step 3.3.2 is authorized.

---

## 1. Resolved Gaps in Step 3.3.1

| Gap ID | Description | Resolution in Step 3.3.1 | Status |
| :--- | :--- | :--- | :--- |
| **GAP-1** | Quantity Precision Regression (`Int` vs `Decimal`) | Altered `product_warehouses.quantity`, `stock_transfer_details.quantity`, and `stock_adjustment_details.quantity` to `DECIMAL(15, 3)` in MySQL and Prisma. Verified exact 3-decimal-place operations. | **RESOLVED** |
| **GAP-2 (Part 1)** | Missing Stock Movement Ledger Model | Created `stock_movements` table with 13 columns, foreign keys (`tenants`, `products`, `warehouses`), indexes, and registered in `DIRECT_TENANT_MODELS`. | **FOUNDATION COMPLETE** |

---

## 2. Remaining Gaps and Active Risks (Governed by Next Substeps)

### RISK-1: Stock Ledger Remains Dormant (Not Yet Writing Rows)
* **Description**: Although the `stock_movements` table exists in the database and Prisma client, the application services and routes (`invoices.routes.ts`, `purchases.routes.ts`, `sales.routes.ts`, `transfers.routes.ts`, `adjustments.routes.ts`) do not yet write to `stock_movements`.
* **Impact**: Inventory modifications made before Step 3.3.2 will not have ledger audit rows.
* **Mitigation / Next Step**: Step 3.3.2 will implement the centralized `inventory-movement.service.ts` engine which mandates inserting a `StockMovement` row on every stock increment or decrement within the active transaction.

### RISK-2: Inconsistent Concurrency Control in Existing Routers (GAP-3)
* **Description**: `invoices.routes.ts` (lines 273–277) still executes raw `update({ quantity: { decrement: lineQty } })` without conditional non-negative guards. `purchases.routes.ts` still has negative quantity fallback on PO cancellation.
* **Impact**: Concurrent requests can drive stock below zero until routers are refactored.
* **Mitigation / Next Step**: Governed by Substep 3.3.3 (Router Hardening & Integration).

### RISK-3: Product Master Edit Dialog Quantity Overwrite Hazard (GAP-4)
* **Description**: `products.routes.ts` `PUT /:id` still accepts `quantity` from client requests and unconditionally overwrites `ProductWarehouse.quantity`.
* **Impact**: Submitting a product edit form while POS sales are occurring erases interim stock deductions.
* **Mitigation / Next Step**: Governed by Substep 3.3.3 (API) and Substep 3.3.4 (UI).

---

## 3. Multi-Tenant Risk Assessment

* **Classification Completeness**: `StockMovement` has been registered in `DIRECT_TENANT_MODELS`.
* **Isolation Middleware**: Tenant context middleware and Prisma Proxy Facade automatically inject `tenant_id: context.tenantId` for all `StockMovement` queries.
* **Residual Risk**: Direct raw SQL queries bypassing Prisma Proxy Facade could theoretically bypass tenant filtering if unscoped.
* **Mitigation**: Raw SQL is restricted by project policy and verified by test `Raw SQL Limitation Empirically Verified & Guardrail Validated`.

---

## 4. Verification of Safety Guarantees

* **Remote Database Isolation**: Verified. No connection or network packet was dispatched to `147.79.66.214`.
* **Schema Non-Destructiveness**: Verified. Zero tables were dropped, zero existing columns were removed, and Step 3.2 accounting tables remain completely unaffected.
* **Scope Boundary**: Verified. No application service, router, or frontend file was modified. Step 3.3.2 has not been started.
