# Phase C — Wave 3 — Step 3.3: Gap and Risk Report

## Executive Summary

This document details the functional, architectural, concurrency, and multi-tenant gaps and risks identified during the pre-implementation audit of the **Product & Inventory Atomic Stock** module in the current React + Node.js + Prisma ERP application against the reference Laravel implementation (`main-file/packages/workdo/ProductService/` and `main-file/app/`).

---

## 1. Identified Architecture & Data Gaps

### GAP-1: Quantity Precision Regression (`Int` vs `Decimal`)
* **Current State**:
  * In `prisma/schema.prisma`, `ProductWarehouse.quantity` is defined as `Int @default(0)`.
  * `StockTransferDetail.quantity` and `StockAdjustmentDetail.quantity` are also defined as `Int @default(1)`.
* **Laravel Reference**:
  * In Laravel (`packages/workdo/ProductService/src/Database/Migrations/create_warehouse_stocks_table.php`), `quantity` is `decimal(15, 2) default 0.00`.
* **Root Cause & Impact**:
  * Any product measured in fractional or continuous units (e.g., kilograms, liters, meters, square feet, hours, tons) cannot be represented accurately.
  * Attempting to transfer or adjust `1.5` units causes database schema type errors or integer rounding/truncation, leading to inventory calculation drift.
* **Severity**: **CRITICAL**

---

### GAP-2: Absence of an Immutable Stock Movement Ledger Table
* **Current State**:
  * The ERP target currently maintains inventory solely as a mutable counter: `ProductWarehouse.quantity`.
  * When a purchase is received, an invoice is issued, or a stock adjustment occurs, `quantity` is incremented or decremented in place.
  * No append-only ledger record is persisted to capture:
    * Timestamp
    * Transaction type (`PURCHASE_RECEIPT`, `SALES_INVOICE`, `POS_SALE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_OUT`, `TRANSFER_IN`)
    * Reference document ID (`invoice_id`, `purchase_id`, `adjustment_id`, `transfer_id`)
    * Quantity delta (`+` or `-`)
    * Stock before / Stock after
    * Unit cost at the time of movement
    * Actor / User ID
* **Impact**:
  * Impossible to perform historical inventory audits, investigate stock discrepancies, calculate weighted average cost (WAC/FIFO), or reconstruct inventory valuation for past accounting periods.
  * Inventory-to-General-Ledger reconciliation cannot be verified with transactional proof.
* **Severity**: **HIGH**

---

### GAP-3: Inconsistent Concurrency Control & Negative Stock Hazards
* **Current State**:
  * Some endpoints implement optimistic concurrency checks, while others bypass them entirely:
    * **Protected (Good)**: `sales.routes.ts` (POS checkout) and `inventory-movement.service.ts` use atomic conditional updates (`where: { product_id, warehouse_id, quantity: { gte: lineQty } }`) to abort checkout if stock is insufficient.
    * **Unprotected (Hazard)**: `invoices.routes.ts` (lines 273–277) executes:
      ```typescript
      await tx.productWarehouse.update({
        where: { id: pw.id },
        data: { quantity: { decrement: lineQty } }
      });
      ```
      This has **no conditional check** (`gte: lineQty`). If two concurrent invoices or checkout sessions sell the remaining 3 items simultaneously, both decrement, driving warehouse stock into negative values.
    * **Unprotected (Hazard)**: `purchases.routes.ts` (lines 321–339) on purchase order cancellation decrements stock with fallback:
      ```typescript
      create: { quantity: -it.quantity }
      ```
      If goods received were already sold to customers, cancelling the PO drives stock into negative numbers.
* **Severity**: **CRITICAL**

---

### GAP-4: Direct Stock Overwrite Hazard on Product Update API
* **Current State**:
  * In `products.routes.ts` (lines 223–237, `PUT /:id`), if the client sends a `quantity` field:
    ```typescript
    await tx.productWarehouse.update({
      where: { id: targetPw.id },
      data: { quantity: targetQty }
    });
    ```
  * In `products.routes.ts` (lines 593–613, `POST /stock/add`), stock is directly incremented without recording a `StockAdjustment` or General Ledger journal entry.
* **Impact**:
  * If a user opens the "Edit Product" dialog showing quantity `50`, and in the meantime 5 items are sold at the POS counter, submitting the edit dialog blindly resets quantity back to `50`, erasing the 5-item stock deduction without trace (Lost Update).
  * Direct stock increments bypass financial accounting controls (no debit to Inventory Asset, no credit to Opening Balance Equity or Cost of Goods Sold).
* **Severity**: **HIGH**

---

### GAP-5: Two-Phase Transfer Atomicity Failure Mode
* **Current State**:
  * `transfers.routes.ts` updates stock immediately in a single step when status is set to `COMPLETED`.
  * If transfer status is `IN_TRANSIT`, stock has not been deducted from the source warehouse, or if deducted, there is no "in-transit" virtual warehouse account. If physical items leave the warehouse, they can still be sold at POS from the source warehouse until someone clicks `COMPLETED`.
* **Impact**:
  * Physical inventory mismatch during transport. Potential double-selling of goods already dispatched.
* **Severity**: **MEDIUM**

---

### GAP-6: Product Variants and Attributes Missing
* **Current State**:
  * The current schema models products as simple standalone items (`Product`).
  * No `product_variants`, `attributes`, or `attribute_values` tables exist.
* **Laravel Reference**:
  * Laravel ProductService supports product types, attributes, and variation add-ons.
* **Impact**:
  * Standard ERP products requiring size/color/batch tracking must currently be represented as distinct individual products with distinct SKUs.
* **Severity**: **LOW** (Targeted for a subsequent Wave; out of scope for atomic stock in Step 3.3).

---

## 2. Concurrency & Race Condition Analysis

| Scenario | Code Path | Mechanism | Risk | Probability | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Simultaneous POS Checkout** | `sales.routes.ts` | Conditional `updateMany({ quantity: { gte: qty } })` | Handled properly; one succeeds, one receives 409 conflict | Low | Low |
| **Simultaneous Invoice Creation** | `invoices.routes.ts` (L273) | Raw `update({ quantity: { decrement: qty } })` | **Race condition**: Quantity drops below zero | Medium | **High** |
| **Simultaneous PO Cancellation & Sale** | `purchases.routes.ts` (L321) | Raw `decrement` with negative fallback create | **Race condition**: Stock becomes negative if goods were sold | Low | **High** |
| **Product Master Data Edit during Sales** | `products.routes.ts` (L223) | Blind overwrite `quantity: targetQty` | **Lost update**: Interim sales deductions completely erased | Medium | **High** |
| **Simultaneous Transfer & POS Sale** | `transfers.routes.ts` | Conditional check present on transfer dispatch | Controlled via service, but needs uniform isolation level | Low | Medium |

---

## 3. Multi-Tenant Isolation Risks

1. **Child-Dependent Models**:
   * `ProductWarehouse`, `StockTransferDetail`, and `StockAdjustmentDetail` do not store `tenant_id` directly; they inherit tenant context from their parent models (`Product`, `StockTransfer`, `StockAdjustment`).
   * *Risk*: Any query querying `ProductWarehouse` directly without joining `product.tenant_id` or verifying warehouse tenant ownership could cause cross-tenant data leakage or corruption.
   * *Mitigation*: Ensure all queries either traverse the parent relation or verify `warehouse.tenant_id`.
2. **New Stock Movement Table**:
   * The new proposed `StockMovement` ledger table **MUST** include an explicit `tenant_id` column and be added to `DIRECT_TENANT_MODELS` in `server/src/middleware/tenant-context.ts`.

---

## 4. Summary Matrix of Gaps & Mitigations

| Gap ID | Description | Severity | Target Phase C Step | Proposed Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-1** | Int quantity precision | **Critical** | Step 3.3 (Substep 3.3.1) | Migrate `quantity` on `ProductWarehouse`, `StockTransferDetail`, and `StockAdjustmentDetail` to `Decimal(15, 3)`. |
| **GAP-2** | Missing Stock Movement ledger | **High** | Step 3.3 (Substep 3.3.1 & 3.3.2) | Create `StockMovement` table with `tenant_id`, `product_id`, `warehouse_id`, `type`, `quantity`, `balance_after`, and references. |
| **GAP-3** | Inconsistent concurrency guards | **Critical** | Step 3.3 (Substep 3.3.2 & 3.3.3) | Route all stock deductions across `invoices.routes.ts`, `purchases.routes.ts`, `sales.routes.ts` through `inventory-movement.service.ts` with strict non-negative conditional guards. |
| **GAP-4** | Product update stock overwrite | **High** | Step 3.3 (Substep 3.3.3 & 3.3.4) | Remove direct `quantity` mutation from `PUT /products/:id`. Make warehouse stock modifications strictly accessible only via Stock Adjustments or Stock Movements. |
| **GAP-5** | Two-phase transfer status guard | **Medium** | Step 3.3 (Substep 3.3.3) | Validate status transitions and ensure stock deduction occurs exactly once upon dispatch. |
| **GAP-6** | Product variants / attributes | **Low** | Wave 4+ | Postpone to later wave; retain single-SKU architecture for Step 3.3. |
