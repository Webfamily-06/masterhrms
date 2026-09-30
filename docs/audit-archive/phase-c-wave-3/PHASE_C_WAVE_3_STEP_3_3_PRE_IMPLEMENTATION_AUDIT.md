# Phase C — Wave 3 — Step 3.3: Pre-Implementation Audit (READ-ONLY)

**Domain**: Product Catalog & Inventory Atomic Stock Management  
**Audit Date**: 2026-09-27T00:50:00+05:30  
**Status**: READ-ONLY AUDIT COMPLETE — ZERO CODE OR SCHEMA MODIFIED  
**Source of Truth**: Laravel Monolith (`main-file/`)  
**Target Architecture**: React 18 + TypeScript + Vite + Express + Prisma 5.19.1 + MySQL 9.5.0 (`master_hrms_dev`)  

---

## 1. Executive Summary

This pre-implementation audit conducts a deep technical and operational analysis of the Product and Inventory domains across both the source Laravel application and the target React/Node.js architecture.

The audit evaluates:
1. **Product Master Data Management**: Product lifecycle (create, edit, delete, activate/deactivate), categories, brands, units of measurement, tax configurations, SKU/barcode generation, pricing, images, and descriptions.
2. **Multi-Warehouse Inventory Architecture**: Warehouses, warehouse-specific balances, opening stock, stock receipts, and stock issues.
3. **Atomic Stock Movements & Concurrency**: Multi-warehouse transfers (`StockTransfer`), physical stock adjustments (`StockAdjustment`), and physical inventory reconciliations.
4. **End-to-End Stock Tracing**: Tracing stock from purchase receipts ([purchases.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/purchases.routes.ts)) to sales deductions ([sales.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/sales.routes.ts) and [invoices.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/invoices.routes.ts)).
5. **Concurrency & Race Condition Vulnerabilities**: Identification of critical gaps where negative stock, lost updates, or overselling can occur under concurrent load.
6. **Multi-Tenant Scoping & Database Integrity**: Verification of `DIRECT_TENANT_MODELS` and `CHILD_DEPENDENT_MODELS` in the Dynamic Prisma Proxy Facade.

---

## 2. Source vs Target Architecture Overview

```
========================================================================================
SOURCE (LARAVEL MONOLITH)                TARGET (REACT + NODE.JS + PRISMA)
========================================================================================
Packages/Modules:                        Services & Routers:
• workdo/ProductService                  • server/src/routes/products.routes.ts
• app/Models/Warehouse                   • server/src/routes/transfers.routes.ts
• app/Models/Transfer                    • server/src/routes/adjustments.routes.ts
• app/Http/Controllers/TransferController • server/src/services/inventory-movement.service.ts
• workdo/ProductService/Listeners/*      • server/src/services/ledger-posting.service.ts

Database Entities:                       Prisma Models (MySQL):
• product_service_items                  • Product (`products`)
• product_service_categories             • ProductCategory (`product_categories`)
• product_service_units                  • Unit (`units`)
• product_service_taxes                  • TaxRate (`tax_rates`)
• warehouses                             • Brand (`brands`)
• warehouse_stocks (decimal 15,2)        • Warehouse (`warehouses`)
• transfers (decimal 15,2)               • ProductWarehouse (`product_warehouses`) [Int qty]
                                         • StockTransfer (`stock_transfers`)
                                         • StockTransferDetail (`stock_transfer_details`)
                                         • StockAdjustment (`stock_adjustments`)
                                         • StockAdjustmentDetail (`stock_adjustment_details`)
========================================================================================
```

---

## 3. Core Findings & High-Level Comparison

### 3.1 Product Master Data
* **Laravel**: Defines products under `ProductServiceItem`. Supports `name`, `sku`, `type` (product/service), `sale_price`, `purchase_price`, `unit` (foreign key to `ProductServiceUnit`), `category_id`, `tax_ids` (JSON array of tax IDs), and `images` (JSON array).
* **Target Node/React**: Model [Product](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma) in `schema.prisma`. Extends Laravel with `barcode`, `hsnSac` (statutory GST/tax classification), `Brand` relation, `lowStockThreshold`, and rich HTML descriptions.
* **Status**: Highly compatible. Target has superior typing and indexing (`@@unique([tenantId, sku])`).

### 3.2 Warehouse & Stock Representation
* **Laravel**: `warehouse_stocks` table stores `product_id`, `warehouse_id`, and `quantity` as `decimal(15, 2)`.
* **Target Node/React**: [ProductWarehouse](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma) (`product_warehouses`) stores `productId`, `warehouseId`, and `quantity` as `Int @default(0)`.
* **Critical Finding**: Storing `quantity` as `Int` is a regression from Laravel's `decimal(15, 2)`. It prevents fractional stock tracking (e.g., 2.5 kg, 1.75 meters, 0.5 liters) commonly required in ERP merchandise and materials.

### 3.3 Stock Movement Ledger Audit
* **Laravel**: Lacks an immutable stock movement ledger. Updates occur by mutating `WarehouseStock` directly (`$stock->increment(...)` or `$stock->decrement(...)`).
* **Target Node/React**: Features [InventoryMovementService](file:///Users/apple/Documents/hrms/server/src/services/inventory-movement.service.ts) which coordinates transfers and adjustments, but still lacks an append-only `stock_movements` / `inventory_movements` ledger table.

### 3.4 Concurrency Control & Race Conditions
* **Laravel**: No row-level locking or conditional checks. If two concurrent web requests decrement stock, race conditions produce lost updates.
* **Target Node/React**:
  - [sales.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/sales.routes.ts#L243) and [inventory-movement.service.ts](file:///Users/apple/Documents/hrms/server/src/services/inventory-movement.service.ts#L131) use conditional updates:
    ```typescript
    await tx.productWarehouse.updateMany({
      where: { id: pw.id, quantity: { gte: lineQty } },
      data: { quantity: { decrement: lineQty } },
    });
    ```
  - **Vulnerabilities**: [invoices.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/invoices.routes.ts#L274) does not use conditional updates, permitting negative stock. [products.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/products.routes.ts#L226) PUT directly overwrites stock quantity, causing lost updates.

---

## 4. Pre-Implementation Audit Checklist

- [x] Target database strictly checked: `127.0.0.1:3306/master_hrms_dev`. Zero interaction with remote DB.
- [x] Laravel source code inspected across `main-file/packages/workdo/ProductService` and `main-file/app`.
- [x] Target Node.js routers, services, and Prisma models audited.
- [x] Concurrency and race conditions analyzed across all stock modification paths.
- [x] Gaps, risks, and implementation roadmap structured into dedicated artifacts.
- [x] Zero application code, schema, migrations, or database records modified.
