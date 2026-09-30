# Phase C — Wave 3 — Step 3.3.5: Idempotency and Concurrency Report
## Terminal State Machines, Replay Immunity & Atomic Race Safety

**Document Version**: 1.0.0  
**Phase**: Phase C (Wave 3 — Step 3.3.5)  
**Execution Timestamp**: 2026-09-28T22:16:40+05:30  
**Database Target**: `127.0.0.1:3306/master_hrms_dev` (Strict Local Dev Isolation)  
**Status**: VERIFIED & LOCKED

---

### 1. Overview & Threat Vectors

In enterprise ERP environments, network retries, double-clicks, offline synchronization queues, and high-frequency POS terminals present significant concurrency and replay risks:
- **Duplicate Checkout**: Multiple HTTP requests for the same POS receipt could deduct inventory multiple times.
- **Duplicate Goods Receipt**: Retried status updates on purchase orders could increment physical stock multiple times.
- **Resurrection of Cancelled Documents**: Un-cancelling a cancelled purchase order could introduce phantom stock or violate ledger finality.
- **Stock Depletion Race**: Multiple POS terminals simultaneously checking out the last available units could cause negative stock balances.

Step 3.3.5 resolved every one of these threat vectors.

---

### 2. Idempotency Mechanisms & Endpoints

#### 2.1. AI OCR Invoice Save (`POST /api/ai/ocr/save`)
- **Key Strategy**: `[tenantId, purchaseNo]` unique lookup before insertion.
- **Behavior on Duplicate**:
  - Detects existing record in `prisma.purchase`.
  - Returns HTTP 200 with `{ isDuplicate: true, id: existing.id, referenceNo: existing.purchaseNo, message: "Purchase Order already exists (idempotent)." }`.
  - Performs zero database inserts and zero stock mutations.

#### 2.2. Purchase Order Goods Receipt (`PATCH /api/purchases/:id/status`)
- **Key Strategy**: Current status comparison:
  ```typescript
  if (prevStatus === status) {
    return res.json({ data: existing, message: "Status unchanged" });
  }
  ```
- **Behavior on Duplicate**:
  - If a client resubmits `status: "received"` on an already-received purchase order, the server detects `prevStatus === status`.
  - Returns HTTP 200 with `"Status unchanged"`.
  - Performs zero stock movements or increments.

#### 2.3. POS & Sales Checkout (`POST /api/sales` and `POST /api/invoices/pos/sales`)
- **Key Strategy**: Idempotency key evaluation (`receiptNo` / `invoiceNo`).
- **Behavior on Duplicate**:
  - Queries `prisma.sale.findFirst({ where: { tenantId, invoiceNo: idempotencyKey } })`.
  - If found, returns existing sale with `{ isDuplicate: true, ... }`.
  - Stock is not decremented a second time.

---

### 3. Terminal State Machine Hardening

#### 3.1. Purchase Order State Machine
```
   [ordered] ──────(Goods Receipt)──────► [received]
       │                                     │
  (Cancellation)                       (Cancellation with Stock Check)
       │                                     │
       ▼                                     ▼
  [cancelled] (TERMINAL) ◄───────────────────┘
```
- **Terminal Invariant**: Once `status === "cancelled"`, no subsequent transition to `"ordered"` or `"received"` is allowed.
- Attempted transitions on a cancelled purchase order return **HTTP 400 Bad Request**:
  `"Cannot change status of an already-cancelled purchase order"`.

#### 3.2. Stock Transfer State Machine
```
   [pending] ────► [in_transit] ────► [completed] (TERMINAL)
       │                 │
       └─────────────────┴──────────► [rejected]  (TERMINAL)
```
- **Terminal Invariant**: Once `status === "completed"` or `status === "rejected"`, the transfer cannot be reopened, re-dispatched, or altered.
- Re-transition attempts fail with **HTTP 400 Bad Request**:
  `"Cannot change status of an already-completed stock transfer"` or `"Cannot change status of an already-rejected stock transfer"`.

---

### 4. Concurrency & Race Condition Defense

Under concurrent load, simple read-then-write updates fail due to check-then-act races. Step 3.3.5 ensures atomic safety using conditional SQL decrements:

```sql
-- Executed inside InventoryMovementService.decreaseStock
UPDATE product_warehouses
SET quantity = quantity - :validQty
WHERE product_id = :productId
  AND warehouse_id = :warehouseId
  AND quantity >= :validQty;
```

- If `updateMany.count === 0`, it indicates that another concurrent transaction depleted the available stock.
- The service throws `StockConcurrencyError(productId, warehouseId)`.
- The route catches this error and returns **HTTP 409 Conflict**.
- In Step 3.3.3 concurrent checkout tests (10 simultaneous clients competing for limited stock), exactly 6 succeeded and 4 received 409 conflicts, with warehouse balance remaining exactly 0.000 (zero oversell).

---

### 5. Summary of Test Validation

| Verification Scenario | Status | Result |
| :--- | :---: | :--- |
| Duplicate OCR Purchase Save | **PASSED** | Returned HTTP 200, `isDuplicate: true`, no duplicate PO |
| Repeated Goods Receipt | **PASSED** | Returned HTTP 200, `"Status unchanged"`, stock unchanged at 10.000 |
| Duplicate POS Checkout | **PASSED** | Returned HTTP 200, `isDuplicate: true`, stock remained 8.000 |
| Duplicate Invoice POS Checkout | **PASSED** | Returned HTTP 200, `isDuplicate: true`, stock remained 7.000 |
| Re-transition of Completed Transfer | **PASSED** | Rejected with HTTP 400 (`already-completed`) |
| Rejection of Completed Transfer | **PASSED** | Rejected with HTTP 400 (`already-completed`) |
| Completion of Rejected Transfer | **PASSED** | Rejected with HTTP 400 (`already-rejected`) |
| Modification of Cancelled PO | **PASSED** | Rejected with HTTP 400 (`already-cancelled`) |
