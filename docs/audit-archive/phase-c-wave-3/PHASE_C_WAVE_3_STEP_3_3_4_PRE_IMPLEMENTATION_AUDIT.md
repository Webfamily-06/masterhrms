# Phase C — Wave 3 — Step 3.3.4: Inventory UI Hardening & Workflow Parity Pre-Implementation Audit

## Objective & Scope
The objective of Step 3.3.4 is to align the React frontend (TanStack Router + TanStack Query + TailwindCSS + Radix UI) with the centralized atomic stock engine (`InventoryMovementService`) and hardened backend routes completed in Steps 3.3.1, 3.3.2, and 3.3.3.

This pre-implementation audit forensically inspects existing UI screens, API clients, TanStack Query hooks, types, error handlers, and decimal input behaviors to establish the exact implementation plan.

---

## 1. Inventory Frontend Screen Inventory

| Screen / Component | File Location | Key Inventory Functions | Audit Findings & Gaps |
|---|---|---|---|
| **Products & Services Catalog** | `src/routes/_authenticated/_app/products.tsx` | - Multi-step item creator<br>- Product Passport modal (`viewingItem`)<br>- Add Stock modal (`addStockItem`)<br>- Inter-warehouse transfer modal | - `parseInt(e.target.value)` truncates decimal quantities.<br>- No `step="0.001"` on inputs.<br>- Product Passport lacks a **Stock Movement Ledger** tab.<br>- `handleAddStockSubmit` swallows backend errors in a catch block and shows success even on 400/409.<br>- Edit modal does not clearly indicate that stock cannot be directly overwritten. |
| **Stock Transfers** | `src/routes/_authenticated/_app/transfers.tsx` | - Transfer list with multi-tier status badges<br>- Create Transfer modal<br>- Workflow actions: Approve, Reject, Dispatch, Receive | - `parseInt(e.target.value)` truncates decimal transfer quantities.<br>- Error handling references `err.response?.data?.error` (Axios pattern) while `api` throws `ApiError`.<br>- Insufficient stock (HTTP 409) is not parsed into actionable product/warehouse warnings. |
| **Physical Stock Adjustments** | `src/routes/_authenticated/_app/adjustments.tsx` | - Audit entry list<br>- Record Adjustment modal<br>- Adjustment Audit Passport modal | - `parseInt(e.target.value)` truncates decimal adjustment quantities.<br>- Lacks step attribute on quantity inputs.<br>- Needs structured 409 error feedback on negative resulting balances. |
| **Point of Sale (POS)** | `src/routes/_authenticated/_app/pos.tsx` | - Cart & barcode scanner<br>- Checkout modal<br>- Offline sales queue & auto-sync | - Checkout immediately displays success and clears cart before `persistSales.mutate` server response, resulting in cart loss on 409 Conflict.<br>- Offline auto-sync loops through queue; if one sale fails, it leaves previous successful sales in localStorage queue, risking repeated replays.<br>- Cart quantity increment/decrement is integer-only. |
| **Purchases & Procurement** | `src/routes/_authenticated/_app/purchases.tsx` | - Purchase orders list<br>- PO creator & supplier selection<br>- "Receive" status transition | - Lacks "Cancel PO" action to trigger inventory reversal and test the 409 overdraft guard.<br>- Error handlers reference `err.response?.data?.error` (Axios pattern).<br>- Decimal quantities truncated in line items. |
| **Inventory Dashboard** | `src/routes/_authenticated/_app/inventory-dashboard.tsx` | - KPI cards (Total Units, Total Valuation)<br>- Warehouse allocation breakdown<br>- Low-stock alerts list | - Decimal stock displays properly as number, but lacks formatted 3-decimal precision in detailed breakdowns. |

---

## 2. API Clients, Errors, & Contracts Audit

### 2.1 `src/lib/api.ts` Client Architecture
```typescript
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
```
- **Finding**: When the backend responds with HTTP 409 Conflict, it returns:
  ```json
  {
    "error": "Insufficient stock for product [...] in warehouse [...]. Requested: 20, Available: 6",
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "productId": "...",
      "warehouseId": "...",
      "requested": "20",
      "available": "6"
    }
  }
  ```
- **Defect**: `ApiError` currently discards `code` and `details`.
- **Hardening Plan**: Extend `ApiError` to accept `code?: string` and `details?: any`. In `apiRequest`, pass `data.code` and `data.details` into `new ApiError(...)`.

### 2.2 Endpoint Contract Verification
1. `GET /api/products/:id/movements`:
   - Returns `{ data: movements, total }` or `{ data: movements, pagination: { ... } }`.
   - Each movement includes: `id`, `movementType`, `quantity`, `beforeQuantity`, `afterQuantity`, `referenceType`, `referenceId`, `notes`, `createdAt`, `warehouse: { name, location }`.
   - **Plan**: Implement a rich `StockMovementLedger` tab inside `products.tsx` Product Passport modal.
2. `POST /api/invoices/pos/sales`:
   - Returns `{ data: sale, message: "Sale recorded" }` or `HTTP 409 Conflict`.
   - **Plan**: Ensure POS checkout only clears cart and prints receipt on confirmed HTTP 201 response.
3. `PATCH /api/purchases/:id/status`:
   - Supports `status: "received"` and `status: "cancelled"`.
   - **Plan**: Add "Cancel PO" button with confirmation alert in `purchases.tsx`.

---

## 3. Decimal Precision & Validation Gaps

| Area | Current Code | Defect | Required Hardening |
|---|---|---|---|
| `products.tsx` Initial Stock | `onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) \|\| 0 })}` | Truncates decimal values (e.g. `1.25` becomes `1`) | Use `parseFloat(e.target.value) \|\| 0`, `type="number" step="0.001" min="0"` |
| `products.tsx` Add Stock | `onChange={(e) => setAddStockQty(parseInt(e.target.value) \|\| 0)}` | Truncates decimal values; `min="1"` | Use `parseFloat(e.target.value) \|\| 0`, `type="number" step="0.001" min="0.001"` |
| `transfers.tsx` Line Items | `onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) \|\| 1)}` | Truncates decimal values; `min="1"` | Use `parseFloat(e.target.value) \|\| 0`, `type="number" step="0.001" min="0.001"` |
| `adjustments.tsx` Line Items | `onChange={(e) => handleUpdateItem(idx, "quantity", parseInt(e.target.value) \|\| 1)}` | Truncates decimal values; `min="1"` | Use `parseFloat(e.target.value) \|\| 0`, `type="number" step="0.001" min="0.001"` |
| `purchases.tsx` Line Items | `quantity: parseInt(e.target.value) \|\| 1` | Truncates decimal order quantities | Use `parseFloat(e.target.value) \|\| 0`, `step="0.001"` |

---

## 4. Query Invalidation Matrix

Following any stock-mutating mutation, the following TanStack Query keys must be systematically invalidated:
- Products: `["catalog-items-v2", tenantId]`, `["pos-products-catalog", tenantId]`, `["products"]`, `["dashboard-inventory-products"]`
- Stock Movements: `["product-movements", productId]`
- Transfers: `["stock-transfers"]`, `["transfers-warehouse-summary"]`, `["products-for-transfer"]`
- Adjustments: `["adjustments"]`, `["products-list"]`, `["warehouses"]`
- Purchases: `["purchases-list"]`, `["dashboard-inventory-metrics"]`
- POS: `["pos-sales", tenantId]`, `["dashboard-inventory-metrics"]`

---

## 5. Execution Strategy

1. **Step A — API Client Hardening (`src/lib/api.ts`)**:
   - Add `code` and `details` to `ApiError`.
   - Provide a shared utility function `formatInventoryError(err: unknown): string` to extract friendly messages for `INSUFFICIENT_STOCK`.
2. **Step B — Products Module Hardening (`src/routes/_authenticated/_app/products.tsx`)**:
   - Add `step="0.001"` and `parseFloat` to initial stock and add-stock inputs.
   - Fix `handleAddStockSubmit` error handling.
   - Add "Stock Movement Ledger" tab inside Product Passport (`viewingItem` Dialog).
3. **Step C — Stock Transfers Hardening (`src/routes/_authenticated/_app/transfers.tsx`)**:
   - Support decimal quantities (`step="0.001"`, `parseFloat`).
   - Standardize error handling for `ApiError` and 409 Conflict.
4. **Step D — Stock Adjustments Hardening (`src/routes/_authenticated/_app/adjustments.tsx`)**:
   - Support decimal quantities (`step="0.001"`, `parseFloat`).
   - Display on-hand stock and provide clear 409 feedback.
5. **Step E — Point of Sale (POS) Hardening (`src/routes/_authenticated/_app/pos.tsx`)**:
   - Use async mutation awaiting for checkout; preserve cart on 409 Conflict.
   - Avoid infinite offline retry loops.
6. **Step F — Purchases Hardening (`src/routes/_authenticated/_app/purchases.tsx`)**:
   - Add "Cancel PO" action with confirmation.
   - Handle 409 Conflict when cancelling depleted purchase orders.
7. **Step G — Validation & Testing**:
   - Run frontend TypeScript checks and Vite production build.
   - Run backend regression suites.
   - Create required reports.
