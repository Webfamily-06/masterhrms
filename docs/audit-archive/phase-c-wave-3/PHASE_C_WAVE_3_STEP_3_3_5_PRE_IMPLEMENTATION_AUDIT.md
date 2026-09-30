# Phase C — Wave 3 — Step 3.3.5: Inventory Finalization, OCR Receipt Correction & Consistency Hardening Pre-Implementation Audit

## Objective & Scope
This audit establishes the actual, verified state of the inventory system prior to implementing Step 3.3.5. It forensically audits:
1. AI OCR purchase creation behavior (`POST /api/ai/ocr/save`) and physical goods receipt semantics
2. Every direct mutation to `ProductWarehouse.quantity` or `productWarehouse.update` across the entire codebase
3. Idempotency vulnerabilities across all stock-changing workflows (repeated receipts, POS replay, transfer completion, cancellation)
4. Transaction boundaries and atomicity guarantees across sales, purchases, transfers, adjustments, and background workers
5. Append-only integrity and immutability of the `StockMovement` ledger
6. Multi-tenant isolation enforcement
7. Comparison against the reference Laravel implementation (`main-file/app`)

**Audit Date**: 2026-09-27
**Auditor**: Automated Code Audit (Step 3.3.5 Pre-Implementation)

---

## 1. AI OCR Purchase Workflow — VERIFIED CURRENT STATE

### Current Implementation in `server/src/routes/ai.routes.ts` (lines 560–622)

**VERIFIED**: The OCR purchase workflow has **already been remediated** in a prior step. The current implementation:

```typescript
// Line 591-614: Purchase Order created with status "ordered" (NOT "received")
const purchase = await prisma.purchase.create({
  data: {
    tenantId,
    purchaseNo,
    supplierId: supplier.id,
    warehouseId: defaultWarehouse.id,
    status: "ordered",        // CORRECT: Pending physical goods receipt
    paymentStatus: "unpaid",
    total: totalVal,
    paidAmount: 0,
    notes: extracted.notes || `Scanned via AI OCR: ${fileName}`,
    details: { create: productLineDetails.map(...) },
  },
  include: { details: true, supplier: true, warehouse: true },
});

// NO InventoryMovementService.increaseStock call — CORRECT
// NO autoPostPurchaseToLedger call — CORRECT

return res.status(201).json({
  success: true,
  type: "purchase",
  id: purchase.id,
  referenceNo: purchase.purchaseNo,
  message: `Successfully created Purchase Order ${purchase.purchaseNo} (Pending physical goods receipt).`,
  data: purchase,
});
```

**Idempotency**: The endpoint already includes an idempotency check (lines 572–588):
```typescript
const existingPurchase = await prisma.purchase.findUnique({
  where: { tenantId_purchaseNo: { tenantId, purchaseNo } },
  include: { details: true, supplier: true, warehouse: true },
});
if (existingPurchase) {
  return res.status(200).json({ ..., isDuplicate: true, ... });
}
```

### Remaining OCR Issue: Transaction Boundary
The purchase creation and supplier creation are **not wrapped in a Prisma transaction**. While this is less critical now that stock is not increased, a crash mid-way could leave an orphaned supplier or partial purchase. This should be wrapped in `prisma.$transaction`.

### Laravel Reference Parity
In `main-file/app/Http/Controllers/PurchaseInvoiceController.php`, a purchase invoice is created with `status = 'draft'` (line 232). It requires an explicit post event (`PostPurchaseInvoice::dispatch`, line 388) to post and affect ledger/inventory. The target implementation's `status: "ordered"` is semantically equivalent to Laravel's `draft` — both represent a pending state before physical receipt. **PARITY CONFIRMED**.

---

## 2. Server-Wide Direct Stock Mutation Audit — VERIFIED CURRENT STATE

A comprehensive search across the complete backend codebase for direct mutations to `ProductWarehouse` identified:

| Location | Code Pattern | Status | Action Needed |
|---|---|---|---|
| `server/src/services/inventory-movement.service.ts:143` | `client.productWarehouse.upsert(...)` | **CENTRALIZED ENGINE** | None — this is the authoritative engine |
| `server/src/services/inventory-movement.service.ts:244` | `client.productWarehouse.updateMany(...)` | **CENTRALIZED ENGINE** | None — conditional atomic decrement |
| `server/src/services/woocommerce-sync.service.ts:447` | `prisma.productWarehouse.create({ ..., quantity: 0 })` | **BENIGN** | Creates 0-quantity placeholder when stock is 0 |
| `server/src/routes/products.routes.ts:191` | `tx.productWarehouse.create({ ..., quantity: 0 })` | **BENIGN** | Creates 0-quantity placeholder when initial stock is 0 |

**VERIFIED**: All sync services (`shopify-sync.service.ts`, `ecommerce-sync.service.ts`, `woocommerce-sync.service.ts`) have **already been routed through `InventoryMovementService`**. The pre-implementation audit's findings about direct mutations in these services are **OUTDATED** — those fixes were applied in a prior step.

### Previously Reported Direct Mutations — NOW FIXED:
- `shopify-sync.service.ts` — Now uses `InventoryMovementService.increaseStock/decreaseStock` (lines 435-456, 685-694)
- `ecommerce-sync.service.ts` — Now uses `InventoryMovementService.increaseStock/decreaseStock` (lines 416-436, 586-599)
- `woocommerce-sync.service.ts` — Now uses `InventoryMovementService.increaseStock` (lines 436-445)

---

## 3. Idempotency & Duplicate Prevention Audit — VERIFIED CURRENT STATE

| Workflow | Current Idempotency Guard | Status | Remaining Risk |
|---|---|---|---|
| **Purchase Receipt** (`PATCH /api/purchases/:id/status`) | `if (prevStatus === status) return` + `if (prevStatus === "cancelled") return 400` | **VERIFIED SAFE** | Terminal state guard prevents duplicate receipt and revival from cancelled |
| **Purchase Cancellation** (`PATCH /api/purchases/:id/status`) | Guarded by `prevStatus === "received"` + `prevStatus === "cancelled"` check | **VERIFIED SAFE** | Non-negative stock check enforced by engine (409 on overdraft) |
| **POS Checkout** (`POST /api/invoices/pos/sales`) | `@@unique([tenantId, invoiceNo])` on Sale table | **VULNERABLE** | Random entropy in invoiceNo means retries create duplicates. Need idempotent detection. |
| **Sales Invoicing** (`POST /api/sales`) | `@@unique([tenantId, invoiceNo])` on Sale table | **VULNERABLE** | Same as POS: retried invoice creates duplicate. Need idempotent detection. |
| **Offline Sales Sync** (`POST /api/sales/sync-offline`) | Idempotency check via `[OfflineID:${offlineId}]` in notes | **FRAGILE** | String matching in notes is not robust. Should use structured field. |
| **Stock Transfer** (`PATCH /api/transfers/:id/status`) | `if (currentStatus === newStatus) return` + terminal state guard | **VERIFIED SAFE** | `completed` and `rejected` are terminal — further transitions rejected |
| **Stock Adjustment** (`POST /api/adjustments`) | Transactional insertion | **SAFE** | UI pending state prevents double-click; backend validates |
| **OCR Purchase** (`POST /api/ai/ocr/save`) | `tenantId_purchaseNo` unique check | **VERIFIED SAFE** | Returns existing purchase on duplicate |

---

## 4. Transaction Boundaries & Atomicity Review — VERIFIED CURRENT STATE

| Workflow | Prisma Transaction Boundary | Status |
|---|---|---|
| **POS Checkout** (`invoices.routes.ts`) | `prisma.$transaction(async (tx) => { ... })` | **VERIFIED ATOMIC** |
| **Normal Sale** (`sales.routes.ts`) | `prisma.$transaction(async (tx) => { ... })` | **VERIFIED ATOMIC** |
| **Purchase Receipt/Cancel** (`purchases.routes.ts`) | `prisma.$transaction(async (tx) => { ... })` | **VERIFIED ATOMIC** |
| **Stock Transfer** (`inventory-movement.service.ts`) | `prisma.$transaction(async (tx) => { ... })` | **VERIFIED ATOMIC** |
| **Stock Adjustment** (`inventory-movement.service.ts`) | `prisma.$transaction(async (tx) => { ... })` | **VERIFIED ATOMIC** |
| **Product Opening Stock** (`products.routes.ts`) | `prisma.$transaction(async (tx) => { ... })` | **VERIFIED ATOMIC** |
| **AI OCR Save** (`ai.routes.ts`) | **NONE** | **NEEDS HARDENING** — wrap in transaction |

---

## 5. Ledger Immutability & Multi-Tenancy — VERIFIED CURRENT STATE

- **Append-Only Verification**: A global search confirms zero `update` or `delete` operations on `StockMovement` in application routes and services. Only test files have `deleteMany` for cleanup. `StockMovement` is strictly append-only. **VERIFIED**.
- **Tenant Isolation**: Every `StockMovement` query and mutation includes `tenantId`. `InventoryMovementService` verifies that product and warehouse belong to `tenantId` before executing any mutation. **VERIFIED**.
- **No `tenantId || "default"` fallbacks found** in stock-related code. **VERIFIED**.

---

## 6. Schema Observations

### StockMovement Model (Prisma)
```prisma
model StockMovement {
  id             String   @id @default(uuid()) @db.VarChar(36)
  tenantId       String   @map("tenant_id") @db.VarChar(36)
  productId      String   @map("product_id") @db.VarChar(36)
  warehouseId    String   @map("warehouse_id") @db.VarChar(36)
  movementType   String   @map("movement_type") @db.VarChar(50)
  quantity       Decimal  @db.Decimal(15, 3)
  beforeQuantity Decimal  @map("before_quantity") @db.Decimal(15, 3)
  afterQuantity  Decimal  @map("after_quantity") @db.Decimal(15, 3)
  referenceType  String?  @map("reference_type") @db.VarChar(50)
  referenceId    String?  @map("reference_id") @db.VarChar(36)
  notes          String?  @db.Text
  createdById    String?  @map("created_by_id") @db.VarChar(36)
  createdAt      DateTime @default(now()) @map("created_at")
  // ... relations and indexes
}
```

### Missing Database-Level Idempotency Constraint
The `StockMovement` table has **no unique constraint** on `(tenantId, referenceType, referenceId, movementType)`. This means duplicate movements can be created if the application-level guards are bypassed. However, adding such a constraint is risky because:
- Multiple line items in a single receipt share the same `referenceId`
- The same reference could theoretically have multiple movement types

**Recommendation**: Application-level guards (status transitions, unique invoiceNo checks) are the primary defense. A database-level constraint should be considered only after careful analysis of all reference patterns.

### SaleDetail.quantity and PurchaseDetail.quantity
Both are still `Int` in the schema, while `ProductWarehouse.quantity` is `Decimal(15,3)`. This means fractional quantities can be tracked in the stock engine but not in sale/purchase line items. This is a known limitation to document.

---

## 7. Implementation Action Plan for Step 3.3.5

1. **Harden AI OCR Purchase Workflow (`server/src/routes/ai.routes.ts`)**:
   - Wrap purchase creation in `prisma.$transaction`
   - Already correct: status "ordered", no premature stock increase
2. **Harden Idempotency for POS Sales**:
   - `invoices.routes.ts`: Add idempotent detection for existing `receiptNo`
   - `sales.routes.ts`: Add idempotent detection for existing `invoiceNo`
3. **Harden Offline Sales Sync Idempotency**:
   - `sales.routes.ts`: Replace fragile notes-based idempotency with structured check
4. **Develop Step 3.3.5 Test Suite (`server/src/tests/wave3-step3-3-5-inventory-finalization.test.ts`)**:
   - Cover all 22 required minimum assertions
5. **Run Full Regression Suite & Vite Production Build**
6. **Create All Required Documentation**
