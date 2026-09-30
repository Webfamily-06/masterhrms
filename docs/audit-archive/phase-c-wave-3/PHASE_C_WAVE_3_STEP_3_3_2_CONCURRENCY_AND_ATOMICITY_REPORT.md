# Phase C — Wave 3 — Step 3.3.2: Concurrency & Atomicity Report
## Analysis of Concurrency Controls, Transaction Boundaries, and Race Condition Guards

**Document Version:** 1.0.0  
**Date:** 2026-09-27  
**Module:** `InventoryMovementService` (`server/src/services/inventory-movement.service.ts`)  

---

## 1. Concurrency Problem Statement

In an enterprise multi-tenant ERP with concurrent POS terminals, e-commerce storefronts, B2B sales invoices, and stock transfers:
1. **Overselling / Negative Inventory:** If two concurrent transactions read an available inventory balance of `5` and both deduct `4`, an unprotected "read-then-update" pattern causes a lost update: the final balance becomes `1` while `8` units were dispatched, or the balance drops to `-3`.
2. **Deadlocks and Locking Bottlenecks:** Naive row locking (`SELECT ... FOR UPDATE`) or table-level locks introduce high contention and deadlock vulnerabilities under high write volume across distributed transactions.
3. **Partial Transfer Corruption:** If stock is decremented from Warehouse A but the insertion in Warehouse B or ledger audit fails, physical goods vanish or are duplicated in software.

---

## 2. Implemented Concurrency & Atomicity Strategy

### A. Conditional Atomic Decrement Guard
Rather than locking the row or performing an unconstrained decrement, `decreaseStock` employs an atomic SQL conditional predicate:

```typescript
const updateResult = await client.productWarehouse.updateMany({
  where: {
    id: pw.id,
    quantity: {
      gte: validQty
    }
  },
  data: {
    quantity: {
      decrement: validQty
    }
  }
});

if (updateResult.count === 0) {
  // Either stock was insufficient, or another concurrent transaction deducted the stock first
  throw new InsufficientStockError(
    productId,
    warehouseId,
    validQty.toString(),
    pw.quantity.toString()
  );
}
```

#### Why This Works in MySQL InnoDB:
* In MySQL InnoDB, `UPDATE ... WHERE id = ? AND quantity >= ?` acquires an exclusive row lock at the exact instant the update evaluates.
* If a concurrent transaction already reduced `quantity` below `validQty`, MySQL evaluates the `WHERE` condition as false and updates `0` rows.
* The application inspects `updateResult.count`. If `0`, it triggers an immediate transaction abort and rolls back any prior steps.
* No stock can ever become negative.

### B. Full Transaction Enclosure
Every mutation method (`increaseStock`, `decreaseStock`, `adjustStock`, `transferStock`) wraps the entire workflow in `prisma.$transaction`:

1. Balance verification (scoped to tenant, product, warehouse).
2. Atomic balance update / conditional decrement.
3. Append-only `StockMovement` creation with snapshot of `beforeQuantity` and `afterQuantity`.
4. Outer transaction support (`tx?: Prisma.TransactionClient`):
   - When called from high-level composite workflows (such as Invoice creation, POS sales, or PO receipts), the caller supplies the existing `tx`.
   - The stock mutation and ledger entries participate in the exact same database transaction as the financial journal entries, order items, and invoice records.
   - If any downstream step fails (e.g. accounting period closed, payment failure), the stock decrement rolls back completely.

### C. Coordinated Two-Phase Transfer Atomicity
In `transferStock`:
1. Source warehouse is decremented with the conditional guard (`quantity >= qty`).
2. Destination warehouse is atomically incremented or created via upsert.
3. Both `TRANSFER_OUT` and `TRANSFER_IN` `StockMovement` records are created.
4. If either warehouse operation or ledger insert fails, the transaction rolls back, leaving both warehouses at their exact initial state.

---

## 3. Concurrency Stress Test Verification

The concurrency guard was tested under artificial contention in `server/src/tests/wave3-step3-3-2-atomic-stock-engine.test.ts` (TEST-2I):

* **Initial Warehouse Stock:** `10.000`
* **Concurrency:** 10 simulated parallel clients firing simultaneous `decreaseStock` requests of `2.000` units each via `Promise.allSettled`.
* **Theoretical Capacity:** Exactly 5 operations can succeed (`5 * 2.000 = 10.000`).
* **Test Outcome:**
  - Successful operations: **5**
  - Rejected operations: **5** (each cleanly thrown as `InsufficientStockError`)
  - Ending Warehouse Balance: **`0.000`**
  - Ledger Records Created: **5** (each with exact `beforeQuantity` and `afterQuantity` tracking: 10->8, 8->6, 6->4, 4->2, 2->0)
  - Zero oversells, zero deadlocks, zero negative balances.

---

## 4. Bounded Retries & Deadlock Resilience

* When deadlocks occur in high-traffic MySQL workloads, transactions should be retried up to a bounded maximum (e.g., 3 attempts) with exponential backoff and jitter.
* The stock engine is stateless and deterministic, making it safe to wrap inside retry handlers if needed at the API layer.
* Indefinite retries are strictly prohibited.
