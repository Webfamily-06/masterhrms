# Phase C — Wave 3 — Step 3.3.4: UI and API Parity Report

## Executive Summary
This document provides a comprehensive mapping and parity analysis between the React frontend modules and the backend API contracts hardened under Wave 3 Step 3.3.3.

---

## 1. Route-by-Route UI & API Parity Matrix

| Frontend Route & View | Backend Endpoint | Request Payload / Params | Response Schema Expected | UI State & Error Handling Hardening |
|---|---|---|---|---|
| **Products List / Passport**<br>`src/routes/.../products.tsx` | `GET /api/products/:id/movements` | Query: `limit=50` | `{ data: StockMovement[], total: number }` | - Renders `ProductStockMovementLedger` tab.<br>- Type badges (`OPENING_BALANCE`, `PURCHASE_RECEIPT`, `SALE`, `POS_SALE`, `TRANSFER_OUT`, `TRANSFER_IN`, `STOCK_ADJUSTMENT`, `PURCHASE_RETURN`).<br>- Shows +/- quantity and `afterQuantity` ending balance.<br>- Handles loading, empty, and retry states. |
| **Product Opening Stock**<br>`src/routes/.../products.tsx` | `POST /api/products` | Body: `{ name, sku, ..., warehouseStocks: [{ warehouseId, quantity }] }` | `{ data: Product, message: string }` | - Supports decimal initial quantity (`step="0.001"`).<br>- Explicit UI copy clarifies opening stock semantics. |
| **Product Inward / Add Stock**<br>`src/routes/.../products.tsx` | `POST /api/products/:id/stock` | Body: `{ warehouseId, quantity, notes }` | `{ data: ProductWarehouse, message: string }` | - Parses quantity with `parseFloat`.<br>- Uses `formatInventoryError` on error.<br>- Invalidates `product-movements`, `products`, `warehouses`. |
| **Warehouse Transfers**<br>`src/routes/.../transfers.tsx` | `POST /api/transfers` | Body: `{ fromWarehouseId, toWarehouseId, items: [{ productId, quantity }] }` | `{ data: StockTransfer, message: string }` | - Replaced `parseInt` with `parseFloat`.<br>- Formats 409 Conflict using `formatInventoryError`.<br>- Invalidates `stock-transfers`, `product-movements`. |
| **Transfer Status Machine**<br>`src/routes/.../transfers.tsx` | `PATCH /api/transfers/:id/status` | Body: `{ status: "in_transit" \| "completed" \| "rejected" }` | `{ data: StockTransfer, message: string }` | - UI displays permitted transitions according to backend state machine.<br>- Invalidates source and destination warehouse stocks. |
| **Stock Adjustments**<br>`src/routes/.../adjustments.tsx` | `POST /api/adjustments` | Body: `{ warehouseId, type: "addition" \| "subtraction", reason, details: [{ productId, quantity }] }` | `{ data: StockAdjustment, message: string }` | - Accepts fractional quantities.<br>- Displays real-time on-hand balance.<br>- Disallows submission of 0 quantity.<br>- Surfaces 409 Conflict when subtraction exceeds available stock. |
| **Point of Sale (POS)**<br>`src/routes/.../pos.tsx` | `POST /api/invoices/pos/sales` | Body: `PosSale` object with items array | `{ data: Invoice, message: string }` | - `handleCheckout` awaits `persistSales.mutateAsync`.<br>- If 409 Conflict occurs, cart and customer information remain intact.<br>- Disables Pay button during pending mutation.<br>- Offline auto-sync only clears successfully submitted sales. |
| **Purchase Orders**<br>`src/routes/.../purchases.tsx` | `POST /api/purchases` | Body: `{ supplierId, warehouseId, status, items: [{ productId, quantity, cost, taxRate }] }` | `{ data: Purchase, message: string }` | - Supports decimal line item quantities.<br>- Validates positive items before submit. |
| **PO Status / Cancellation**<br>`src/routes/.../purchases.tsx` | `PATCH /api/purchases/:id/status` | Body: `{ status: "received" \| "cancelled" }` | `{ data: Purchase, message: string }` | - Added "Receive" and "Cancel PO" actions.<br>- On cancel of received PO, catches 409 Conflict if stock was already depleted and shows clear feedback. |
| **Sales Invoices**<br>`src/routes/.../invoices.tsx` | `POST /api/invoices` | Body: `InvoiceRecord` with lines array | `{ data: Invoice, message: string }` | - Supported decimal line quantities.<br>- Awaits `persistMut.mutateAsync` to preserve builder state on failure. |

---

## 2. TanStack Query Cache Invalidation Matrix

Following any stock mutation, the following query keys are now systematically invalidated across the application:

```typescript
// Standard Stock Mutation Invalidation Bundle:
queryClient.invalidateQueries({ queryKey: ["products"] });
queryClient.invalidateQueries({ queryKey: ["products-list"] });
queryClient.invalidateQueries({ queryKey: ["warehouses"] });
queryClient.invalidateQueries({ queryKey: ["catalog-items-v2"] });
queryClient.invalidateQueries({ queryKey: ["product-movements"] });
queryClient.invalidateQueries({ queryKey: ["dashboard-inventory-products"] });
queryClient.invalidateQueries({ queryKey: ["dashboard-inventory-metrics"] });
```

---

## 3. Parity Verification Confirmation
- **Decimal Quantities**: UI input fields (`step="0.001"`), state handlers (`parseFloat`), and table renderers (`toFixed(3)`) are now 100% aligned with the database's `Decimal(15,3)` precision.
- **Error Responses**: All HTTP 409 errors (containing `{ code: "INSUFFICIENT_STOCK", details: { requested, available } }`) are extracted and rendered as clear notifications.
- **Workflow Transitions**: The UI exclusively offers status transitions (`ordered` -> `received` -> `cancelled`, `draft` -> `in_transit` -> `completed` / `rejected`) that are valid in the backend.
