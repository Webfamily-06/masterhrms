# Phase C — Wave 3 — Step 3.3.5: Inventory Consistency Report
## Invariant Enforcement & Stock Movement Ledger Audit

**Document Version**: 1.0.0  
**Phase**: Phase C (Wave 3 — Step 3.3.5)  
**Execution Timestamp**: 2026-09-28T22:16:35+05:30  
**Database Target**: `127.0.0.1:3306/master_hrms_dev` (Strict Local Dev Isolation)  
**Status**: VERIFIED & LOCKED

---

### 1. Architectural Invariants

Across the entire Master ERP application, physical inventory is governed by four non-negotiable invariants:

```
[INVARIANT 1]: PHYSICAL STOCK IDENTITY
ProductWarehouse(product_id, warehouse_id).quantity ==
    SUM(StockMovement.quantity WHERE product_id = ? AND warehouse_id = ?)

[INVARIANT 2]: NON-NEGATIVE BALANCE UNDER CONCURRENCY
ProductWarehouse.quantity >= 0 AT ALL TIMES.
No race condition or simultaneous checkouts may drive quantity below zero.

[INVARIANT 3]: IMMUTABLE APPEND-ONLY AUDIT TRAIL
StockMovement rows are strictly INSERT-ONLY.
No API route or database trigger may execute UPDATE or DELETE on stock_movements.

[INVARIANT 4]: STRICT TENANT ISOLATION
All inventory ledger records, warehouse stock levels, and transfer transactions
are bounded by tenant_id and verify tenant ownership prior to balance alteration.
```

---

### 2. Elimination of Direct Stock Mutations

Prior to Step 3.3.5, background synchronization services directly mutated `ProductWarehouse.quantity`. Step 3.3.5 eliminated all direct mutations server-wide:

| Service / Route | File Location | Previous Operation | Remediated Operation |
| :--- | :--- | :--- | :--- |
| **AI OCR Save** | `server/src/routes/ai.routes.ts` | Direct `increaseStock` on PO creation | PO created with `status: "ordered"`; stock modified only upon Goods Receipt |
| **Shopify Sync** | `server/src/services/shopify-sync.service.ts` | Direct `upsert` of full quantity | Delta reconciliation via `increaseStock`/`decreaseStock` |
| **Shopify Order** | `server/src/services/shopify-sync.service.ts` | Direct `update` decrement | `InventoryMovementService.decreaseStock` with `STOCK_MOVEMENT_TYPES.POS_SALE` |
| **WooCommerce Sync** | `server/src/services/ecommerce-sync.service.ts` | Direct `update` / `create` | Delta synchronization via `increaseStock`/`decreaseStock` |
| **Shopify Ingest** | `server/src/services/ecommerce-sync.service.ts` | Direct `update` / `create` | Delta synchronization via `increaseStock`/`decreaseStock` |
| **WooCommerce Init**| `server/src/services/woocommerce-sync.service.ts` | Direct `create` with stock | `InventoryMovementService.increaseStock` with `OPENING_STOCK` |

Following this audit and remediation:
- **Zero** API endpoints expose direct mutations to `ProductWarehouse`.
- **Zero** background jobs directly write to `ProductWarehouse` without producing a corresponding `StockMovement` row.
- `ProductWarehouse.quantity` reflects the exact sum of all ledger movements.

---

### 3. Ledger Continuity & Balance Verification

In Step 3.3.5 testing (Category 7), balance continuity was verified using arbitrary precision arithmetic (`Decimal(15,3)`):
- Inbound movements record positive `quantity` delta:  
  $$\text{afterQuantity} = \text{beforeQuantity} + \text{quantity}$$
- Outbound movements record negative `quantity` delta:  
  $$\text{afterQuantity} = \text{beforeQuantity} + \text{quantity} \quad (\text{where } \text{quantity} < 0)$$
- Verified transitions:
  - `0.000 + 1.250 = 1.250`
  - `1.250 + 0.001 = 1.251`
  - `1.251 + (-0.001) = 1.250`
  - `1.250 + 0.750 = 2.000`
- Zero precision drift observed across repeated multi-step operations.

---

### 4. Overdraft Reversal & Negative Stock Prevention

When a purchase order is cancelled after physical receipt:
1. The system attempts to reverse received stock by deducting it from the receiving warehouse via `InventoryMovementService.decreaseStock`.
2. If goods from that PO have already been sold, transferred, or adjusted such that current warehouse stock is less than the cancellation quantity:
   - `InventoryMovementService` throws `InsufficientStockError(requested, available)`.
   - The route catches this exception and returns **HTTP 409 Conflict** with:
     ```json
     {
       "error": "Cannot cancel purchase order: received items have already been sold or depleted from warehouse. (Insufficient stock for product X in warehouse Y. Requested: 10, Available: 4)",
       "code": "INSUFFICIENT_STOCK"
     }
     ```
   - The database transaction rolls back completely. The purchase order remains in its current status and warehouse stock remains unchanged.

---

### 5. Append-Only Immutability Verification

A server-wide static and dynamic audit confirmed:
1. `prisma.stockMovement.update`, `updateMany`, `delete`, and `deleteMany` are **never called** in any production code path.
2. Every `StockMovement` record contains immutable timestamps, `tenant_id`, `product_id`, `warehouse_id`, `movement_type`, `reference_type`, `reference_id`, `quantity`, `before_quantity`, and `after_quantity`.
3. In test suite execution across 25 assertions, 13 distinct `StockMovement` rows were logged with 100% metadata compliance.
