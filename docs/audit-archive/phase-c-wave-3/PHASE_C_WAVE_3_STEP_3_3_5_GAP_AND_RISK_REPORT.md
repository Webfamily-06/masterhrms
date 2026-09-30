# Phase C — Wave 3 — Step 3.3.5: Gap and Risk Report
## Residual Risk Assessment & Operational Guidance

**Document Version**: 1.0.0  
**Phase**: Phase C (Wave 3 — Step 3.3.5)  
**Execution Timestamp**: 2026-09-28T22:16:50+05:30  
**Database Target**: `127.0.0.1:3306/master_hrms_dev` (Strict Local Dev Isolation)  
**Status**: COMPLETE & VERIFIED

---

### 1. Pre-Implementation vs Post-Implementation Audit Summary

| Risk / Gap Identified in Audit | Severity | Remediated in Step 3.3.5 | Post-Remediation Status |
| :--- | :---: | :---: | :--- |
| **AI OCR Premature Stock Increment** | **CRITICAL** | Yes (`ai.routes.ts`) | Resolved. Creates PO with `status: "ordered"`, stock remains 0. |
| **Direct Mutations in Shopify Sync** | **CRITICAL** | Yes (`shopify-sync.service.ts`) | Resolved. Uses delta calculation & `increaseStock`/`decreaseStock`. |
| **Direct Mutations in Ecommerce Sync** | **CRITICAL** | Yes (`ecommerce-sync.service.ts`) | Resolved. All updates route through stock engine. |
| **Direct Mutations in WooCommerce Init** | **HIGH** | Yes (`woocommerce-sync.service.ts`) | Resolved. Uses `increaseStock` with `OPENING_STOCK`. |
| **Cancelled PO State Mutation** | **HIGH** | Yes (`purchases.routes.ts`) | Resolved. Enforces terminal status; returns HTTP 400. |
| **Transfer Re-execution Post Terminal** | **HIGH** | Yes (`inventory-movement.service.ts`) | Resolved. Blocks transitions on `completed`/`rejected` transfers. |
| **Self-Transfer Creation** | **MEDIUM** | Yes (`inventory-movement.service.ts`) | Resolved. Rejects `fromWarehouseId === toWarehouseId` with HTTP 400. |
| **Overdraft on Received PO Cancellation** | **HIGH** | Yes (`purchases.routes.ts`) | Verified. Rejects with HTTP 409 Conflict if stock depleted. |

---

### 2. Residual Architecture Risks & Mitigations

#### 2.1. External Webhook Out-of-Order Delivery
- **Risk**: If Shopify or WooCommerce webhooks arrive out-of-order (e.g., an inventory update webhook arriving before a product creation webhook), the delta synchronization could be computed against stale baseline values.
- **Mitigation**: `InventoryMovementService` verifies product existence before applying deltas (`verifyTenantEntities`). If the product does not exist, the webhook handler defers execution or creates the product shell with zero stock before applying the opening balance.
- **Residual Severity**: **LOW**.

#### 2.2. MySQL Read-Committed vs Repeatable-Read Isolation
- **Risk**: Under standard MySQL `REPEATABLE READ`, non-locking reads can observe MVCC snapshots rather than the latest committed state.
- **Mitigation**: `InventoryMovementService.decreaseStock` utilizes atomic conditional updates (`WHERE quantity >= :validQty`) which acquire row-level write locks in InnoDB, ensuring that the check and decrement occur on the true current balance regardless of transaction snapshot age.
- **Residual Severity**: **NEGLIGIBLE**.

#### 2.3. Large Batch Adjustment Performance
- **Risk**: Reconciling physical inventory audits across tens of thousands of SKUs in a single warehouse adjustment could create large database transactions.
- **Mitigation**: Bulk operations in `transfers.routes.ts` and `adjustments.routes.ts` batch product lookups and utilize indexed queries on `(productId, warehouseId)`. For large-scale reconciliations, processing can be chunked into batches of 100 items per transaction.
- **Residual Severity**: **LOW**.

---

### 3. Operational Best Practices for Production Deployment

1. **Database Isolation**: Continue strictly enforcing the boundary between local development (`master_hrms_dev`) and remote production (`147.79.66.214`). Never execute test fixtures on the remote database.
2. **Double-Entry General Ledger Sync**: Verify that GL account auto-posting listeners maintain error isolation so that transient accounting posting failures do not roll back physical inventory updates when configured asynchronously.
3. **Hardware Barcode / POS Scanners**: Ensure client devices utilize the hardened 409 error parser (`formatInventoryError`) to surface real-time actionable notifications when physical stock limits are encountered at registers.
