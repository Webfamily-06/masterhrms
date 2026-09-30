# Phase C — Wave 3 — Step 3.3.2: Gap & Risk Report
## Technical Analysis of Remaining Inventory Gaps, Architectural Boundaries, and Forward Risks

**Document Version:** 1.0.0  
**Date:** 2026-09-27  
**Scope Covered:** Step 3.3.2 (Centralized Atomic Stock Engine)  
**Upcoming Scope:** Step 3.3.3 (Router Hardening & Integration)  

---

## 1. Step 3.3.2 Gaps Identified & Addressed

| Area | Pre-Implementation Risk | Implemented Resolution | Verification |
| :--- | :--- | :--- | :--- |
| **Atomic Inventory Decrement** | Direct balance updates risk negative inventory under race conditions. | Implemented atomic conditional update `WHERE id = ? AND quantity >= ?`. | Confirmed under 10-client concurrent race test. |
| **Ledger Tracking** | No centralized logging of who, when, and why stock changed. | Append-only `StockMovement` creation on every increase, decrease, adjustment, and transfer. | Confirmed via automated assertions. |
| **Multi-Tenancy Leakage** | Services accepting product and warehouse IDs without checking tenant ownership. | Explicit cross-tenant validation checks in `InventoryMovementService` throwing `TenantIsolationError`. | Cross-tenant access rejected in test suite. |
| **Floating-Point Drift** | JavaScript float addition/subtraction produces rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). | All validations, deltas, and updates enforced using `Prisma.Decimal`. | Verified with fractional calculation tests. |

---

## 2. Outstanding Gaps & Forward Risks (For Step 3.3.3 and Beyond)

### Gap 1: Existing Route Handlers Still Contain Direct Stock Mutations (Step 3.3.3 Focus)
* **Risk:** The centralized engine is complete, tested, and operational. However, as mandated by the strict scope of Step 3.3.2, existing router endpoints (`invoices.routes.ts`, `purchases.routes.ts`, `sales.routes.ts`, `products.routes.ts`) have **NOT** yet been wired to call `InventoryMovementService`.
* **Impact:** Until Step 3.3.3 is executed, direct API calls to those routes will continue executing legacy update paths without creating `StockMovement` records or using the new concurrency guards.
* **Mitigation Plan:** Step 3.3.3 will systematically replace each raw `productWarehouse.update` across all 6 route files with `InventoryMovementService` calls.

### Gap 2: Idempotency by Reference ID
* **Current State:** The `StockMovement` table contains `referenceType` and `referenceId` indexed with `tenantId`. However, there is no unique database constraint on `(tenantId, referenceType, referenceId, movementType)` to prevent double processing at the database level if a caller replays the exact same request.
* **Risk:** If a network timeout occurs and a client retries a purchase order receipt without a transactional idempotency key, double receipt could occur unless checked by application logic.
* **Mitigation Plan:** In Step 3.3.3, callers should query existing movement records by `referenceType` and `referenceId` before applying mutations, or pass an idempotency token.

### Gap 3: Negative Stock Policy Flexibility
* **Current State:** The stock engine strictly enforces `quantity >= requestedQty`, completely forbidding negative inventory.
* **Risk:** Certain retail environments or legacy configurations allow temporary negative stock (e.g., selling goods before goods receipt has been entered into the ERP).
* **Evaluation:** In accordance with constitutional rules and ERP best practices, preventing negative inventory is the safest default. If a tenant-specific setting `allowNegativeStock` is required in the future, it can be parameterized in `DecreaseStockParams`.

### Gap 4: Frontend Decimal Inputs (Step 3.3.4 Focus)
* **Risk:** Frontend forms in `products.tsx`, `transfers.tsx`, and `adjustments.tsx` may still use `step="1"` or `parseInt()` in client validation.
* **Mitigation Plan:** This is scheduled for Step 3.3.4 (UI Hardening & Stock Movement Ledger).

---

## 3. Scope Compliance Statement

* No router files were modified.
* No frontend files were modified.
* No database migrations were added or modified.
* The local development database `master_hrms_dev` was the sole database target.
* Step 3.3.3 was **not** started.
