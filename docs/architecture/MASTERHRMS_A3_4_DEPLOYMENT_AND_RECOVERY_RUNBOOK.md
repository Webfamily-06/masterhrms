# MASTERHRMS — Phase A3.4 Deployment & Recovery Runbook
## Entitlement Fulfillment & Outbox Publisher Operations

**Project:** MASTERHRMS Multi-Tenant SaaS HRMS / ERP  
**Service:** Commerce Fulfillment Engine & Outbox Sweeper  
**Target Environments:** Staging / Production  
**Document Version:** 1.0  
**Effective Date:** October 9, 2026  

---

## 1. Architecture Overview

Phase A3.4 operates on a decoupled, asynchronous fulfillment model:
1. **Settlement Stage:** When a commerce order transitions to `PAID`, an outbox event with `event_type = 'COMMERCE_ORDER_PAID'` is written into `outbox_events` within the same transaction.
2. **Fulfillment Stage:** An outbox sweeper or operator trigger claims events via `SELECT ... FOR UPDATE SKIP LOCKED` and invokes `CommerceFulfillmentService.fulfillOrder`.
3. **Provisioning Stage:** Entitlements (`TenantSubscription`, `TenantModule`, `TenantAddon`) are upserted, `CommerceOrder.fulfillmentStatus` is updated to `FULFILLED`, and `outbox_events.status` is updated to `PROCESSED` in a single atomic transaction.

---

## 2. Operational Environment Variables & Kill-Switch

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `COMMERCE_FULFILLMENT_ENABLED` | boolean | `"true"` | Global Kill-Switch. Set to `"false"` to immediately suspend all fulfillment sweeps without terminating ongoing transactions. |
| `COMMERCE_OUTBOX_BATCH_SIZE` | number | `10` | Maximum number of outbox events claimed per sweep batch. |
| `COMMERCE_MAX_RETRIES` | number | `5` | Maximum number of retries before marking an outbox event as `FAILED`. |

### Activating the Kill-Switch
To stop all automated and manual entitlement provisioning in an emergency:
```bash
# In server environment (.env or container environment variables)
COMMERCE_FULFILLMENT_ENABLED="false"
```
When set to `"false"`, `processOutboxBatch` and `fulfillOrder` return immediately with `{ status: "DISABLED" }`. Orders remain safely queued in `PAID` / `UNFULFILLED` state and outbox events remain `PENDING`. No data corruption or partial state occurs.

---

## 3. Worker Execution & Operator Commands

### Manual Batch Sweep via API (Super Admin)
Platform operators can trigger a sweep batch on demand:
```bash
curl -X POST https://api.yourdomain.com/api/commerce/outbox/sweep \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20, "workerId": "CLI_OPERATOR_01"}'
```
Response:
```json
{
  "success": true,
  "processed": 15,
  "errors": 0,
  "status": "ACTIVE"
}
```

### Direct Node.js Maintenance Script
To run a batch sweep via command line or cron runner:
```typescript
import { CommerceFulfillmentService } from "./src/services/commerce-fulfillment.service";

async function run() {
  const result = await CommerceFulfillmentService.processOutboxBatch({
    batchSize: 50,
    workerId: "CRON_WORKER_01",
  });
  console.log("Sweep completed:", result);
}
run();
```

---

## 4. Troubleshooting & Dead-Letter Event Recovery

### Identifying Failed Events
Query `outbox_events` for stuck or failed fulfillment events:
```sql
SELECT id, event_id, tenant_id, retry_count, error, occurred_at
FROM outbox_events
WHERE event_type = 'COMMERCE_ORDER_PAID'
  AND status = 'FAILED';
```

### Root Causes & Solutions:
1. **`UNKNOWN_CATALOG_PRODUCT`:**
   - Cause: The order contains an item slug not present in `CANONICAL_CATALOG_REGISTRY`.
   - Resolution: Update `server/src/services/unified-catalog.service.ts` to register the new product, deploy, and reset the event status to `PENDING`.
2. **`DOWNGRADE_NOT_PERMITTED`:**
   - Cause: Customer purchased a lower tier than their current active plan without administrative downgrade override.
   - Resolution: Operator reviews customer account. If customer approved downgrade, use admin portal to cancel existing subscription or execute manual adjustment.
3. **Database Timeout / Transient Connection Error:**
   - Cause: PostgreSQL connection saturation or locks.
   - Resolution: Sweeper retries automatically with exponential backoff up to 5 times. If retries exceeded, event transitions to `FAILED` status.

### Complete Outbox Recovery Operational Procedure (Audited & Authorized)

> [!IMPORTANT]
> **Privileged Application Authorization vs. Direct SQL Edits:**  
> SQL row locking is **not** a substitute for application authorization. Direct database modification bypasses application-level RBAC, input validation, and audit tracking. Always prefer an audited, authenticated operator endpoint (`POST /api/commerce/outbox/sweep`) or privileged maintenance workflow over manual database edits. Never execute ad-hoc recovery queries against production without an approved incident ticket and authenticated operator identity.

#### Recovery Preconditions (Must ALL be verified before execution):
1. **Target Event Exists in `FAILED` Status:** The outbox event must currently have `status = 'FAILED'`. Events in `PENDING` or `PROCESSED` must never be reset.
2. **Linked Order Belongs to Same Tenant:** The order referenced in the event must match `tenant_id`.
3. **Linked Order is `PAID` and `UNFULFILLED`:** The order must be in `status = 'PAID'` and `fulfillment_status = 'UNFULFILLED'`. If the order was canceled, refunded, or already fulfilled, the event must **not** be requeued.
4. **Canonical Payload Integrity:** The payload must contain a valid `orderId`. (The engine enforces canonical item resolution by looking up `commerce_orders.price_snapshot` in PostgreSQL).
5. **Authenticated Operator & Change Ticket:** The recovery must be attributed to an authenticated `SUPER_ADMIN` operator with an active incident ticket ID.

#### Transactional Row-Locked Recovery Script:
```sql
BEGIN;

-- 1. Acquire exclusive row lock on the failed outbox event (prevents concurrent race conditions)
SELECT id, tenant_id, status, retry_count, payload
FROM outbox_events
WHERE id = '<EVENT_ID>'
  AND tenant_id = '<TENANT_ID>'
  AND status = 'FAILED'
FOR UPDATE;

-- 2. Verify linked order is in PAID and UNFULFILLED state
SELECT id, tenant_id, status, fulfillment_status, order_number
FROM commerce_orders
WHERE id = '<ORDER_ID>'
  AND tenant_id = '<TENANT_ID>'
  AND status = 'PAID'
  AND fulfillment_status = 'UNFULFILLED';

-- 3. Reset outbox event to PENDING (preserving canonical payload intact)
UPDATE outbox_events
SET status = 'PENDING',
    retry_count = 0,
    error = NULL
WHERE id = '<EVENT_ID>'
  AND tenant_id = '<TENANT_ID>'
  AND status = 'FAILED';

-- 4. Persist mandatory audit record in audit_logs
INSERT INTO audit_logs (
  id,
  tenant_id,
  actor_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at
) VALUES (
  gen_random_uuid(),
  '<TENANT_ID>',
  '<OPERATOR_USER_ID>',
  'COMMERCE_OUTBOX_EVENT_MANUAL_RECOVERY',
  'OutboxEvent',
  '<EVENT_ID>',
  jsonb_build_object(
    'orderId', '<ORDER_ID>',
    'incidentTicket', '<INCIDENT_TICKET_ID>',
    'reason', 'Authorized manual requeue following root cause remediation',
    'recoveredAt', NOW()
  ),
  NOW()
);

COMMIT;
```

#### Post-Recovery Sweep Execution:
After committing the transaction, trigger the fulfillment sweeper via the authenticated operator endpoint:
```bash
curl -X POST https://api.yourdomain.com/api/commerce/outbox/sweep \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "workerId": "OPERATOR_CLI_RECOVERY"}'
```

Verify that:
1. `outbox_events.status` transitioned to `PROCESSED`.
2. `commerce_orders.fulfillment_status` transitioned to `FULFILLED`.
3. Entitlements (`TenantSubscription`, `TenantModule`, `TenantAddon`) are active.
4. Subsequent replays return `{ alreadyFulfilled: true }` with zero duplicate mutations.

---

## 5. Deployment Checklist & Release Gates

- [x] All 22 Tier 1-6 acceptance tests pass on PostgreSQL (`commerce-entitlement-fulfillment.test.ts`).
- [x] All 32 Phase A3.2 and A3.3 regression tests pass.
- [x] Consolidated 67/67 tests passing across active repository commerce suites.
- [x] TypeScript compiler passes with 0 errors (`tsc --noEmit`).
- [x] Frontend and backend production bundle builds complete cleanly.
- [x] Kill-switch tested and verified.
- [x] Row-level locking verified with concurrent worker test.
- [x] Staging release gate verified.
- [ ] **OD-1 Gate:** Production pricing schedule requires formal owner approval. Live payments blocked.
- [ ] **OD-3 Gate:** Standalone ERP invoicing model (Option 3A vs 3B) requires formal owner selection.
- [ ] **OD-10 Gate:** Subscription upgrade proration policy requires formal owner determination. Live mid-cycle upgrades blocked.

---

## 6. Document Revision & Reconciliation History

- **Version 1.0.0 (October 9, 2026):** Initial implementation runbook.
- **Version 1.1.0 Amendment (October 9, 2026 — Authorized under A3.6 Governance):**
  - Removed obsolete column updates (`locked_by = NULL`, `locked_at = NULL`) which do not exist in the verified PostgreSQL `outbox_events` schema.
  - Documented complete outbox recovery operational procedure with transactional preconditions, row locking (`FOR UPDATE`), order state validation, authenticated operator attribution, and mandatory audit log insertion.
  - Reconciled test coverage to the authoritative 22-test A3.4 suite and 67-test consolidated milestone baseline.
  - Retained OD-1, OD-3, and OD-10 as active blocking release gates.

