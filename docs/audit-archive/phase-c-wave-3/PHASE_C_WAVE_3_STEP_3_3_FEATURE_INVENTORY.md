# Phase C — Wave 3 — Step 3.3: Feature Inventory

**Domain**: Product Catalog & Inventory Atomic Stock Management  
**Status**: READ-ONLY AUDIT  
**Date**: 2026-09-27T00:50:00+05:30  

---

## 1. Feature Parity Matrix

| Feature | Laravel Implementation | React Target Frontend | Node.js Backend API | Database Model | Parity Status | Missing Functionality & Risks |
|---|---|---|---|---|---|---|
| **Product Listing & Pagination** | `ProductServiceItemController@index` (Inertia + paginate 10) | `src/routes/_authenticated/_app/products.tsx` (Table & Grid views) | `GET /api/products` (Unified Pagination & Query Contract) | `Product`, `ProductWarehouse` | **SUPERIOR** | Target includes grid cards, barcode display, live stock aggregation, and category badges. |
| **Product Creation** | `ProductServiceItemController@store` (`StoreProductServiceItemRequest`) | `ProductsAndServicesPage` modal dialog with tabs | `POST /api/products` (Prisma transaction) | `Product`, `ProductWarehouse` | **PARITY** | Default warehouse auto-created if none exists; initial stock assigned to default warehouse. |
| **Product Editing** | `ProductServiceItemController@update` (`UpdateProductServiceItemRequest`) | Modal dialog pre-filled with active product | `PUT /api/products/:id` | `Product`, `ProductWarehouse` | **GAP** | **Lost Update Risk**: Direct `upsert` of `quantity` in `ProductWarehouse` overwrites concurrent sales/purchases without audit trail. |
| **Product Deactivation / Status** | `is_active` boolean flag | Badge toggle in table row & edit modal | `PUT /api/products/:id` (`isActive: boolean`) | `Product.isActive` | **PARITY** | Fully operational. Filterable via `GET /api/products?isActive=true`. |
| **Product Categories** | `ProductServiceCategory` (`CategoryController`) | Categories Tab in `products.tsx` | `GET/POST /api/products/categories` | `ProductCategory` | **PARITY** | Multi-tenant category with custom badge colors. |
| **Units of Measurement** | `ProductServiceUnit` (`UnitController`) | Units Tab in `products.tsx` | `GET/POST /api/products/units` | `Unit` | **PARITY** | Supports name, short name (e.g., Pcs, Kg, Ltr, Mtr). |
| **Product Brands** | Embedded in description or name in Laravel | Brands Tab in `products.tsx` | `GET /api/products/brands` | `Brand` | **SUPERIOR** | Target has dedicated `Brand` entity with image and description. |
| **Tax Configuration** | `ProductServiceTax` (`tax_ids` JSON array) | Tax dropdown in product modal; Taxes tab | `TaxRate` linked via `taxRateId` | `TaxRate` | **PARITY** | Direct relationship to statutory `TaxRate` with rate percentages. |
| **SKU & Barcode Handling** | Manual SKU string in `ProductServiceItem` | Auto-generator + Barcode preview modal + SVG render | `sku` (unique), `barcode`, `hsnSac` | `Product.sku`, `Product.barcode`, `Product.hsnSac` | **SUPERIOR** | Target includes barcode SVG generator ([lib/barcode.ts](file:///Users/apple/Documents/hrms/src/lib/barcode.ts)) and printable barcode labels. |
| **Product Images** | S3 / Local storage via `spatie/laravel-medialibrary` | Image upload modal, URL preview, fallback placeholder | `image` (URL/path), `additionalImages` (JSON) | `Product.image`, `Product.additionalImages` | **PARITY** | Stores primary image URL and additional gallery JSON array. |
| **Low-Stock Alerts** | Computed on dashboard via `quantity < 5` | Highlight badge in table; count in dashboard | Computed in `productsRouter.get` and `inventory-movement.service.ts` | `Product.lowStockThreshold` | **SUPERIOR** | Per-product customizable threshold with live dashboard alerts. |
| **Multi-Warehouse Management** | `Warehouse` model (`WarehouseController`) | Warehouse filter in Products, Transfers, Adjustments | `GET /api/products/warehouses`, `POST /api/products/warehouses` | `Warehouse` | **PARITY** | Supports warehouse name, location, city, phone, email, and `isDefault`. |
| **Warehouse-Wise Stock Balances** | `WarehouseStock` (`product_id`, `warehouse_id`, `quantity`) | Stock Tab in `products.tsx` (Per-warehouse breakdown) | `ProductWarehouse` (`productId`, `warehouseId`, `quantity`) | `ProductWarehouse` | **GAP** | **Quantity Precision Gap**: `ProductWarehouse.quantity` is `Int`, preventing decimal quantities (e.g. 2.5 kg). |
| **Opening Stock Assignment** | `ProductServiceItemController@stockStore` | Input field in Create Product dialog & Quick Stock Add modal | `POST /api/products/stock/add` | `ProductWarehouse` | **GAP** | `POST /api/products/stock/add` mutates stock directly without creating a `StockAdjustment` or General Ledger entry. |
| **Stock Transfers Between Warehouses** | `TransferController@store` (`Transfer` model) | `src/routes/_authenticated/_app/transfers.tsx` | `transfersRouter` + `InventoryMovementService.createTransfer` | `StockTransfer`, `StockTransferDetail` | **SUPERIOR** | Multi-tier approval workflow (`pending` -> `approved` -> `in_transit` -> `completed` / `rejected`) with atomic stock locking. |
| **Stock Adjustments (Addition/Loss)** | Handled via opening stock increment in Laravel | `src/routes/_authenticated/_app/adjustments.tsx` | `adjustmentsRouter` + `InventoryMovementService.recordAdjustment` | `StockAdjustment`, `StockAdjustmentDetail` | **SUPERIOR** | Target has dedicated module with double-entry General Ledger integration and valuation tracking. |
| **Physical Stock Audit Reconciliation** | Not supported in source Laravel | Audit reconciliation dialog in `adjustments.tsx` | `POST /api/adjustments` (`mode: reconcile`) | `StockAdjustment`, `ProductWarehouse` | **SUPERIOR** | Compares physical count vs system stock, computes variance, adjusts stock, and posts GL offset. |
| **Stock Movement History Ledger** | Missing in source Laravel | Not available in target UI | Missing in target backend | **No model** | **CRITICAL GAP** | No append-only immutable `StockMovement` table. Stock changes mutate `ProductWarehouse.quantity` directly. |
| **Inventory Valuation Reporting** | Basic stock quantity sum | Valuation KPIs in `inventory-dashboard.tsx` & `transfers.tsx` | `InventoryMovementService.getWarehouseStockSummary` | Aggregated from `ProductWarehouse` * `Product.purchasePrice` | **PARITY** | Valuation computed in real time. |
| **Tenant Isolation & Security** | `creator_id` / `created_by` tenant scoping | Tenant-scoped requests via `api` client | Strict `resolveTenantContext` middleware on all routers | `DIRECT_TENANT_MODELS` and `CHILD_DEPENDENT_MODELS` | **PARITY** | Verified in Step 3.1 & 3.2 suites. |

---

## 2. Granular Inventory Lifecycle Analysis

### Lifecycle Phase 1: Product Definition & Opening Stock
1. User creates product via `POST /api/products`.
2. Product record inserted into `products` table with tenant ownership.
3. Default warehouse resolved or created via `ensureDefaultWarehouse`.
4. Initial stock record created in `product_warehouses`.
5. **Defect**: No corresponding `StockMovement` or initial opening balance journal entry is written.

### Lifecycle Phase 2: Purchasing & Inbound Stock Receipt
1. Purchase Order created via `POST /api/purchases` with `status: "ordered" | "received"`.
2. When transitioning to `"received"`:
   - `ProductWarehouse.quantity` is incremented.
   - [autoPostPurchaseToLedger](file:///Users/apple/Documents/hrms/server/src/services/ledger-posting.service.ts#L359) posts: DEBIT Merchandise Inventory (1040), CREDIT Accounts Payable (2010).
3. **Defect**: If PO is subsequently cancelled from received status, [purchases.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/purchases.routes.ts#L336) decrements stock blindly, creating negative balances if stock was already sold.

### Lifecycle Phase 3: Internal Multi-Warehouse Transfers
1. Transfer requested via `POST /api/transfers` (`status: "pending"`). Source availability pre-checked.
2. State transition to `"in_transit"`:
   - Source warehouse stock atomically decremented via conditional query (`quantity: { gte: item.quantity }`).
3. State transition to `"completed"`:
   - Destination warehouse stock incremented.
4. State transition to `"rejected"` after `"in_transit"`:
   - Stock restored back to source warehouse.
5. **Evaluation**: High concurrency safety in [InventoryMovementService](file:///Users/apple/Documents/hrms/server/src/services/inventory-movement.service.ts#L131).

### Lifecycle Phase 4: Sales Outbound Stock Deduction
1. POS Checkout via `POST /api/sales`:
   - Checks product type; services bypass stock deduction.
   - Atomically decrements `ProductWarehouse` with row-lock condition (`quantity: { gte: lineQty }`).
   - If stock modified concurrently, throws concurrency conflict error.
   - Auto-posts to GL: DEBIT Cash/Bank (1010/1020), CREDIT Sales Revenue (4010).
2. Direct Invoice Checkout via `POST /api/invoices`:
   - Decrements `ProductWarehouse` **without** conditional check.
   - **Defect**: Can drive stock negative.

### Lifecycle Phase 5: Stock Adjustments & Physical Audit Reconciliations
1. User records discrepancy via `POST /api/adjustments`.
2. For subtraction: validates `available >= quantity` and decrements with `gte` guard.
3. For addition: increments `ProductWarehouse`.
4. Auto-posts to GL via [autoPostStockAdjustmentToLedger](file:///Users/apple/Documents/hrms/server/src/services/ledger-posting.service.ts#L463):
   - Addition: DEBIT Merchandise Inventory (1040), CREDIT Inventory Adjustment Gain (5020).
   - Subtraction: DEBIT Inventory Shrinkage & Loss (5020), CREDIT Merchandise Inventory (1040).
