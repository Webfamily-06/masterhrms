# Phase C — Wave 3 — Step 3.3: Module Dependency Map

**Domain**: Product Catalog & Inventory Atomic Stock Management  
**Status**: READ-ONLY AUDIT  
**Date**: 2026-09-27T00:50:00+05:30  

---

## 1. Upstream and Downstream Module Interconnections

```
                                  ┌───────────────────────────┐
                                  │      Tenant Context       │
                                  │ (AsyncLocalStorage / DB) │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
┌──────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     Purchasing Module    │─────▶│     PRODUCT CATALOG       │◀─────│       Sales & POS         │
│  (PO Receipt -> +Stock)  │      │ (Products, Category, Unit)│      │   (Checkout -> -Stock)    │
└──────────────────────────┘      └─────────────┬─────────────┘      └───────────────────────────┘
              │                                 │                                  │
              │                                 ▼                                  │
              │                   ┌───────────────────────────┐                    │
              └──────────────────▶│  MULTI-WAREHOUSE INVENTORY│◀───────────────────┘
                                  │  (ProductWarehouse, Wh)   │
                                  └─────────────┬─────────────┘
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       ▼                        ▼                        ▼
         ┌───────────────────────────┐┌──────────────────┐┌───────────────────────────┐
         │      Stock Transfers      ││ Stock Adjustments││     Double-Entry GL       │
         │ (In-Transit -> Completed) ││(Physical Reconcil)││ (Merchandise Asset 1040)  │
         └───────────────────────────┘└──────────────────┘└───────────────────────────┘
```

---

## 2. Detailed Dependency Matrix

| Interacting Module | Nature of Dependency | Upstream / Downstream | Shared Service / Code Interface | Failure Mode & Impact |
|---|---|---|---|---|
| **Purchasing ([purchases.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/purchases.routes.ts))** | Stock Increment on Receipt | Upstream to Inventory | `tx.productWarehouse.upsert({ update: { quantity: { increment } } })` | If warehouse is unselected, stock is not tracked. If PO is cancelled after sale, negative stock occurs. |
| **Sales & POS ([sales.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/sales.routes.ts))** | Stock Decrement on Checkout | Downstream from Inventory | `tx.productWarehouse.updateMany({ where: { quantity: { gte: lineQty } } })` | If stock insufficient, checkout transaction aborts atomically. Concurrency lock prevents overselling. |
| **Invoices ([invoices.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/invoices.routes.ts))** | Direct Stock Decrement | Downstream from Inventory | `tx.productWarehouse.update({ data: { quantity: { decrement } } })` | **High Risk**: Missing `gte` guard allows negative stock. |
| **Stock Transfers ([transfers.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/transfers.routes.ts))** | Inter-Warehouse Movement | Core Inventory Service | [InventoryMovementService.updateTransferStatus](file:///Users/apple/Documents/hrms/server/src/services/inventory-movement.service.ts#L89) | Rejections during `in_transit` cleanly restore stock to source warehouse. |
| **Stock Adjustments ([adjustments.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/adjustments.routes.ts))** | Inventory Discrepancy & Reconciliation | Core Inventory Service | [InventoryMovementService.recordAdjustment](file:///Users/apple/Documents/hrms/server/src/services/inventory-movement.service.ts#L248) | Subtraction enforces `gte` guard. Auto-posts to GL via [autoPostStockAdjustmentToLedger](file:///Users/apple/Documents/hrms/server/src/services/ledger-posting.service.ts#L463). |
| **Financial Accounting (Step 3.2)** | Inventory Valuation & Posting Guards | Downstream from Inventory | `assertOpenPeriodForPosting` in `ledger-posting.service.ts` | If fiscal period is closed, stock adjustment GL posting throws and aborts transaction. |
| **Real-Time WebSockets ([socket.ts](file:///Users/apple/Documents/hrms/server/src/socket.ts))** | Client Live Sync | Cross-Cutting | `broadcastToTenant("inventory:stock_updated")`, `broadcastToTenant("stock:adjusted")` | If WebSocket server unavailable, gracefully logs warning without aborting DB writes. |

---

## 3. Shared Database Entities & Foreign Key Tree

```
Tenants (id)
  ├── Warehouses (tenant_id)
  │     ├── ProductWarehouse (warehouse_id)
  │     ├── StockTransfer (from_warehouse_id, to_warehouse_id)
  │     └── StockAdjustment (warehouse_id)
  ├── ProductCategories (tenant_id)
  ├── Brands (tenant_id)
  ├── Units (tenant_id)
  ├── TaxRates (tenant_id)
  └── Products (tenant_id)
        ├── ProductWarehouse (product_id)
        ├── StockTransferDetail (product_id)
        ├── StockAdjustmentDetail (product_id)
        ├── PurchaseDetail (product_id)
        └── SaleDetail (product_id)
```

---

## 4. Concurrency Isolation Boundary

To maintain absolute atomic inventory integrity, any operation that touches `ProductWarehouse`:
1. **MUST** execute within an active interactive Prisma transaction (`prisma.$transaction`).
2. **MUST** enforce non-negative stock invariants via conditional decrement queries (`WHERE quantity >= :requested`).
3. **MUST** handle zero-count update errors by throwing descriptive concurrency conflict errors rather than proceeding blindly.
4. **MUST** record an immutable ledger movement record upon completion.
