# Phase C — Wave 3 — Step 3.3: UI and Workflow Parity

**Domain**: Product Catalog & Inventory Atomic Stock Management  
**Status**: READ-ONLY AUDIT  
**Date**: 2026-09-27T00:50:00+05:30  

---

## 1. UI Screen & Workflow Comparison

### 1.1 Product Catalog Screen (`/products`)

| Aspect | Laravel Monolith (`workdo/ProductService`) | React Target (`src/routes/_authenticated/_app/products.tsx`) | Parity Status & Analysis |
|---|---|---|---|
| **View Modes** | Standard server-rendered paginated table | Dual-view toggle: **Dense Compact ERP Table** and **Visual Grid Cards** | **SUPERIOR** in React. Visual cards display product image, category badge, sale/cost price, live stock badge, and quick action bar. |
| **Search & Filtering** | Simple text search and dropdown filters (page reload) | Instant debounced search (Name, SKU, Barcode), Category filter, Brand filter, Warehouse filter, Active status filter. | **SUPERIOR** in React. Query client cache eliminates full page reloads. |
| **Product Create / Edit Workflow** | Modal form in Blade/Inertia; requires manual page submit | Comprehensive tabbed dialog: Basic Info, Pricing & Taxes, Inventory Defaults, Media / Gallery, and AI Description Assistant. | **SUPERIOR** in React. Includes auto-SKU generator, live barcode SVG preview, and AI content assistant modal. |
| **Tax Configuration** | Multi-select checkboxes for tax IDs | Dropdown selector linked directly to workspace `TaxRate` entities. | **PARITY**. Real-time calculation of tax rate and selling price inclusive of tax. |
| **Unit Management** | Separate management screen under `/product-service/units` | Integrated as a dedicated tab inside the unified `/products` interface. | **SUPERIOR** in React. Eliminates navigation friction. |
| **Category Management** | Separate route under `/product-service/item-categories` | Integrated tab inside `/products` with color-picker palette. | **SUPERIOR** in React. Categories display consistent color badges across POS, invoices, and catalog. |
| **Barcode Generation & Printing** | Basic textual barcode number | In-browser SVG barcode generation ([lib/barcode.ts](file:///Users/apple/Documents/hrms/src/lib/barcode.ts)), print layout preview, and bulk printable sheets. | **SUPERIOR** in React. Ready for thermal retail label printing. |

---

### 1.2 Multi-Warehouse Transfer Screen (`/transfers`)

| Aspect | Laravel Monolith (`App\Http\Controllers\TransferController`) | React Target (`src/routes/_authenticated/_app/transfers.tsx`) | Parity Status & Analysis |
|---|---|---|---|
| **Workflow Paradigm** | Direct transfer upon submit (instantly decrements source and increments destination) | Multi-tier approval workflow with state machine: `pending` -> `approved` -> `in_transit` -> `completed` / `rejected`. | **SUPERIOR** in React. Accurately models real-world warehouse logistics where goods take time in transit. |
| **Stock Availability Check** | Server validation in `StoreTransferRequest` | Live pre-validation in modal: displays available stock at source warehouse, prevents selecting equal source/destination warehouses. | **SUPERIOR** in React. Prevents invalid submissions client-side. |
| **Warehouse Live Summary** | Static array in Inertia props | Live warehouse KPI cards: Total Units, Aggregate Inventory Valuation, Low-Stock Count. | **SUPERIOR** in React. Powered by `GET /api/transfers/warehouses/summary`. |
| **State Transition Actions** | Only delete or view in Laravel | Role-gated actions: Approve, Dispatch (`in_transit`), Receive (`completed`), or Reject. | **SUPERIOR** in React. Interlocks with atomic stock row locking. |

---

### 1.3 Stock Adjustments Screen (`/adjustments`)

| Aspect | Laravel Monolith | React Target (`src/routes/_authenticated/_app/adjustments.tsx`) | Parity Status & Analysis |
|---|---|---|---|
| **Stock Adjustments** | No dedicated module; performed via opening stock additions | Dedicated physical stock adjustment interface with dual modes: Manual Line Adjustment and **Physical Inventory Audit Reconciliation**. | **SUPERIOR** in React. Supports addition (surplus) and subtraction (shrinkage/damage). |
| **Physical Count Reconciliation** | Not available in Laravel | Modal dialog: Enter actual physical counts per product; system computes variance, updates stock, and posts adjustment entry. | **SUPERIOR** in React. Essential for periodic warehouse stocktaking. |
| **Ledger Integration Feedback** | None in Laravel | Real-time notification and double-entry General Ledger voucher link ([autoPostStockAdjustmentToLedger](file:///Users/apple/Documents/hrms/server/src/services/ledger-posting.service.ts#L463)). | **SUPERIOR** in React. Guarantees inventory valuation matches GL. |

---

### 1.4 Inventory Dashboard (`/inventory-dashboard`)

| Aspect | Laravel Monolith | React Target (`src/routes/_authenticated/_app/inventory-dashboard.tsx`) | Parity Status & Analysis |
|---|---|---|---|
| **Analytics & KPIs** | Flat metrics inside product list | Interactive charts (ApexCharts/Recharts), low-stock alert feed, warehouse utilization gauges. | **SUPERIOR** in React. High visual fidelity for warehouse managers. |
| **Real-Time Updates** | None (manual refresh) | WebSockets via `broadcastToTenant`: `inventory:stock_updated`, `stock:adjusted`. | **SUPERIOR** in React. Live stock indicators update without page refresh. |

---

## 2. Identified UI & Workflow Gaps

1. **Missing Stock Movement Audit Passport / Drawer**:
   - In both Laravel and React, clicking a product shows its current warehouse balance, but there is no "Stock Movement Passport" showing the complete chronologic history of stock in/out (PO receipts, POS sales, adjustments, transfers).
2. **Fractional Quantity Input Restriction**:
   - Number inputs on Transfer and Adjustment forms are currently constrained to integers or step 1 due to the backend `Int` schema typing.
3. **Product Form Stock Overwrite Danger**:
   - In `products.tsx`, editing a product displays an optional "Stock" input. If an admin saves the product edit dialog, it sends `quantity: targetQty` to `PUT /api/products/:id`, potentially wiping out interim stock sales.
   - **Recommended UX Refinement**: Make stock strictly read-only on the Product Edit modal; require stock changes to go through Adjustments or Transfers.
