# MASTERHRMS — Phase A3.6 Owner Acceptance & Governance Gate
## Comprehensive Technical Audit & Acceptance Evaluation

**Document Version:** 1.0.0  
**Phase:** Phase A3.6 — Owner Acceptance & Governance Gate  
**Predecessor Phases:** Phase A3.1 (Catalog Spec), Phase A3.2 (Pricing Engine), Phase A3.3 (Order Lifecycle), Phase A3.4 (Atomic Fulfillment), Phase A3.5 (E2E Integration & Regression Gate)  
**Execution Date:** October 9, 2026  
**Auditor:** Google Antigravity Systems & Governance Audit Agent  
**Authorization Mode:** Read-Only Technical Audit (Production Release, Live Payment Capture & Production Entitlements Strictly Blocked)  

---

## 1. Executive Summary & Audit Mandate

This document establishes the independent, forensic owner acceptance audit of Phase A3.5 and its architectural predecessors (A3.1 through A3.4) for the MASTERHRMS Multi-Tenant SaaS platform. 

The preceding Phase A3.5 report asserted complete technical readiness based on:
- 11/11 E2E tests passing.
- 12/12 A3.3 order lifecycle tests passing.
- 22/22 A3.4 fulfillment tests passing.
- 20/20 A3.2 catalog/pricing tests passing.
- Consolidated claimed total: 65/65 tests passing.
- Remediation of five in-scope defects (DEF-A35-01 through DEF-A35-05).
- Clean TypeScript compilation and production bundle build.

In accordance with Phase A3.6 governance protocols, these claims were treated not as self-authenticating facts, but as propositions to independently prove against active repository source code, live non-production PostgreSQL test execution, schema definitions, and cross-referenced documentation.

### Core Audit Verdict:
1. **Technical Soundness:** The core commerce order-to-entitlement state machine, transactional outbox engine, and multi-tenant isolation mechanisms are **forensically sound, atomic, and fully functional**.
2. **Empirical Test Verification:** All automated suites were re-executed against an isolated PostgreSQL instance (`aws-0-ap-south-1.pooler.supabase.com:6543/postgres`). With the inclusion of the two mandatory A3.5 forensic edge-case tests (`E2E-1.2` for subscription upgrades/downgrades and `E2E-6.4` for outbox retry exhaustion and tenant-safe recovery), the active suite contains **67 tests**, which passed with **100% success (67/67 passing in 81.39s, exit code 0)**.
3. **Static Analysis & Build:** TypeScript typecheck (`npx tsc --noEmit`) completed with **0 errors**, and production bundle compilation (`npm run build`) completed cleanly in **8.50s**.
4. **Discrepancy Identification:** Stale runbook documentation was discovered: `MASTERHRMS_A3_4_DEPLOYMENT_AND_RECOVERY_RUNBOOK.md` referenced non-existent columns (`locked_by`, `locked_at`) and historical planning documents listed conflicting test targets (28 vs 18 vs 22 vs 65 vs 67).
5. **Governance Boundaries:** Commercial decision gates (**OD-1 Pricing, OD-3 Invoicing, OD-10 Proration, OD-12 Revocation, OD-13 Schema Migrations**) remain **firmly closed and enforced**.

---

## 2. Audit Scope & Boundary Verification

The audit operated strictly within established safety constraints:
- **Zero Production Mutations:** No production data, environment variables, or live server processes were modified.
- **Fail-Closed Commercial Pricing:** `server/src/config/commerce-pricing.config.ts` returns `null` in production environments; live payment gateways remain unconfigured.
- **Zero Schema Migrations (OD-13):** No DDL migrations were generated, applied, or altered.
- **Isolated Target Database:** All testing was constrained to the development database target (`aws-0-ap-south-1.pooler.supabase.com:6543/postgres`).

---

## 3. Forensic Codebase Verification of Critical Behaviors

Each critical architectural behavior was traced to its exact source file, function implementation, and empirical test coverage:

| # | Architectural Capability | Implementation Source | Key Function / Mechanism | Test Identifier | Empirical Result |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | Canonical Catalog & Server-Authoritative Pricing | [`unified-catalog.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/unified-catalog.service.ts)<br>[`cart-calculator.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/cart-calculator.service.ts) | `findCanonicalProduct`<br>`CartCalculatorService.calculate` | `commerce-catalog-pricing.test.ts` (20 tests)<br>`E2E-1.1` | **VERIFIED:** Server calculates taxes and line totals; client pricing overrides rejected. |
| **2** | Order Idempotency & State Machine | [`commerce-order.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-order.service.ts) | `createOrder`<br>`simulatePaymentSettlement` | `VM-11`, `VM-12`<br>`commerce-order-lifecycle.test.ts` | **VERIFIED:** Idempotent replay yields `200 + X-Idempotent-Replay`; payload tampering returns 409 Conflict. |
| **3** | Atomic `COMMERCE_ORDER_PAID` Outbox Persistence | [`commerce-order.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-order.service.ts#L320-L360) | Persisted inside settlement `tx` ($transaction) | `VM-15`<br>`E2E-1.1` | **VERIFIED:** Event written to `outbox_events` within the identical database transaction that marks order `PAID`. |
| **4** | Outbox Event-Type Isolation | [`outbox.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/outbox.service.ts#L106-L114) | `eventType: { notIn: ["COMMERCE_ORDER_PAID"] }` | `E2E-3.1`<br>`E2E-6.2` | **VERIFIED:** Generic 3-second realtime WebSocket polling loop is strictly excluded from consuming commerce paid events. |
| **5** | Multi-Engine Entitlement Provisioning | [`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L210-L352) | `fulfillOrder`<br>(Target engines: `subscription`, `module`, `addon`) | `T1.1`, `T1.2`, `T1.3`<br>`E2E-1.1`, `E2E-2.1`, `E2E-3.1` | **VERIFIED:** Base plans provision `TenantSubscription`, standalone ERP modules provision `TenantModule`, add-ons provision `TenantAddon`. |
| **6** | Mixed Multi-Product Transaction Atomicity | [`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L125-L403) | `db.$transaction` wrapping all engine writes | `T2.1`, `T2.2`<br>`E2E-4.1` | **VERIFIED:** All entitlements, order `FULFILLED` state, and outbox `PROCESSED` state commit in a single database transaction. Partial failure triggers 100% rollback. |
| **7** | Add-on Renewal Extension Semantics | [`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L325-L330) | `targetRenewsAt = existingAddon.renewsAt + addedMs` | `T3.2`<br>`E2E-3.1` | **VERIFIED:** Subsequent purchase stacks onto active validity instead of resetting to `now() + 30`. |
| **8** | Dynamic Entitlement & Session Reflection | [`entitlements.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/middleware/entitlements.ts)<br>[`auth.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/auth.routes.ts) | `checkTenantEntitlement`<br>`/api/auth/me` handler | `T6.1`, `T6.2`<br>`E2E-1.1`, `E2E-2.1` | **VERIFIED:** Newly provisioned modules and add-ons are immediately reflected in PostgreSQL checks and in `/api/auth/me` payloads without server restarts. |
| **9** | Tenant Boundary & Anti-Enumeration | [`commerce-order.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-order.service.ts)<br>[`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L138-L141) | Strict tenant ID scoping and generic 404 responses | `VM-13`<br>`E2E-5.2` | **VERIFIED:** Cross-tenant reads and checkout attempts return 404 Not Found, revealing zero metadata about foreign orders. |
| **10** | Operator Sweep Authorization | [`commerce.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/commerce.routes.ts#L112-L115) | `requireRole("SUPER_ADMIN")` middleware | `E2E-5.3` | **VERIFIED:** Non-admin tenant users calling `/api/commerce/outbox/sweep` receive HTTP 403 Forbidden. |
| **11** | Concurrency, Retries & Dead-Letter Auditing | [`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L427-L495) | `FOR UPDATE SKIP LOCKED`<br>Bounded retry limit (5)<br>`COMMERCE_FULFILLMENT_FAILED_PERMANENT` | `T3.1`, `T5.3`, `T5.4`<br>`E2E-6.1`, `E2E-6.2` | **VERIFIED:** Competing workers serialize; transient errors increment retries; 5th failure transitions event to `FAILED` and logs permanent audit entry while preserving the `PAID` order. |
| **12** | Kill-Switch & Safe Recovery | [`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L107-L109) | `COMMERCE_FULFILLMENT_ENABLED !== "false"` | `T5.2`<br>`E2E-6.4` | **VERIFIED:** Kill-switch stops sweeps immediately returning `{ status: "DISABLED" }`; paid orders accumulate safely in `outbox_events` without loss or corruption. |

---

## 4. Forensic Investigation of the Five Remediated A3.5 Defects

The five defects identified and corrected during Phase A3.5 were forensically reviewed in active code and regression tests:

### 1. DEF-A35-01: Line Item Shape Compatibility in Entitlement Fulfillment
- **Code Location:** [`commerce-fulfillment.service.ts:178, 196`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L178)
- **Investigation:** `CartCalculatorService` outputs `lineItems` with `productSlug`, whereas earlier fulfillment code looked for `items` with `slug`. The service was updated to defensively inspect `snapshot?.lineItems || snapshot?.items` and `item.productSlug || item.productId || item.slug || item.id`.
- **Verdict:** **FIX VERIFIED.** Mixed and single orders successfully resolve canonical products across all suites.

### 2. DEF-A35-02: Base Plan Seat Capacity Defaults
- **Code Location:** [`commerce-fulfillment.service.ts:231-237`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L231-L237)
- **Investigation:** When base plan orders have `quantity: 1` and `seats: 1` (denoting 1 base license), the engine previously assigned 1 seat. The fix applies canonical tier capacities (`starter: 25`, `growth: 100`, `sovereign: 500`) when `includedSeats <= 1`.
- **Verdict:** **FIX VERIFIED.** `E2E-1.1` and `E2E-4.1` confirm `maxEmployees` is set to 25 and 100 respectively.

### 3. DEF-A35-03: Realtime Polling Worker Isolation (Event Hijacking Prevention)
- **Code Location:** [`outbox.service.ts:110`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/outbox.service.ts#L110)
- **Investigation:** 
  - `OutboxService.processPendingEvents()` executes on a continuous 3-second timer to dispatch domain events to Socket.IO rooms. Prior to DEF-A35-03, it queried all `status = 'PENDING'` records without filtering on `eventType`.
  - When `simulatePaymentSettlement` inserted a `COMMERCE_ORDER_PAID` event, the realtime worker could claim the event, broadcast it, and immediately execute:
    ```typescript
    await db.outboxEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() }
    });
    ```
  - This marked the event `PROCESSED` **without ever executing `CommerceFulfillmentService.fulfillOrder()`**!
  - As a result, `processOutboxBatch` would find zero pending events, leaving the order in `fulfillmentStatus: 'UNFULFILLED'` and the tenant with zero entitlements.
  - **Remediation Review:** Line 110 of `outbox.service.ts` explicitly specifies:
    ```typescript
    eventType: { notIn: ["COMMERCE_ORDER_PAID"] }
    ```
  - Furthermore, `CommerceFulfillmentService.processOutboxBatch()` exclusively queries `WHERE event_type = 'COMMERCE_ORDER_PAID' AND status = 'PENDING'`, and updates the outbox event to `PROCESSED` **only within the interactive transaction** (`tx`) that updates `CommerceOrder.fulfillmentStatus = 'FULFILLED'` and creates the entitlements.
- **Verdict:** **FIX VERIFIED & ARCHITECTURALLY SOUND.** Hijacking is impossible; event loss is eliminated.

### 4. DEF-A35-04: Test Property Alignment (`renewsAt`)
- **Code Location:** [`commerce-e2e-journey.test.ts:503, 536`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-e2e-journey.test.ts#L503)
- **Investigation:** Corrected test assertion to read `addon.renewsAt` matching `schema.prisma:5231` instead of non-existent `expiresAt`.
- **Verdict:** **FIX VERIFIED.**

### 5. DEF-A35-05: Session Payload Schema Alignment
- **Code Location:** [`commerce-e2e-journey.test.ts:35-36`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-e2e-journey.test.ts#L35-L36)
- **Investigation:** Aligned test assertions with actual `/api/auth/me` response shape (`meData.id` and `meData.profile.tenantId`).
- **Verdict:** **FIX VERIFIED.**

---

## 5. Audit of Outbox Recovery, Claim Semantics & Operational Safety

A critical objective of this audit was verifying whether the implemented claim/lease model matches documentation and provides robust crash recovery:

### Findings on Claim / Lease Architecture:
1. **Absence of Persisted Lease Columns:**
   - In `schema.prisma`, `model OutboxEvent` defines:
     `id, tenantId, eventId, eventType, entityType, entityId, actorId, payload, status, retryCount, error, occurredAt, processedAt, createdAt`.
   - **There are NO `locked_by` or `locked_at` columns.**
   - Consequently, the system does **not** persist a 5-minute lease in database columns.
2. **PostgreSQL Concurrency Coordination:**
   - Coordination between concurrent sweepers is implemented via:
     ```sql
     SELECT id, event_id, tenant_id, payload, retry_count
     FROM outbox_events
     WHERE status = 'PENDING'
       AND event_type = 'COMMERCE_ORDER_PAID'
       AND retry_count < 5
     ORDER BY occurred_at ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED;
     ```
   - When a sweeper claims an event, it executes `fulfillOrder`, which locks the target order row:
     ```sql
     SELECT * FROM commerce_orders WHERE id = $1 FOR UPDATE;
     ```
   - If another worker attempts to fulfill the same order simultaneously, it blocks on the row lock; when unblocked, the idempotency check detects `order.fulfillment_status === 'FULFILLED'` and returns `{ alreadyFulfilled: true }` without repeating mutations.
3. **Crash Recovery Semantics:**
   - If a worker process abruptly dies midway through `fulfillOrder`, PostgreSQL rolls back the interactive transaction.
   - The outbox event remains in `status = 'PENDING'` (or retains its previous retry state).
   - Because no uncommitted status change was persisted, the event is immediately available for the next sweeper execution to pick up and fulfill cleanly (`E2E-6.3` and `E2E-6.4` verify this behavior).
4. **Runbook Query Discrepancy (Finding DIS-03):**
   - In `docs/architecture/MASTERHRMS_A3_4_DEPLOYMENT_AND_RECOVERY_RUNBOOK.md` (lines 103-104), the suggested recovery query included:
     ```sql
     locked_by = NULL,
     locked_at = NULL
     ```
   - Executing this query against PostgreSQL fails with `column "locked_by" does not exist`.
   - The correct, verified recovery query (proven in `E2E-6.4`) is:
     ```sql
     UPDATE outbox_events
     SET status = 'PENDING',
         retry_count = 0,
         error = NULL
     WHERE id = '<EVENT_ID>'
       AND tenant_id = '<TENANT_ID>'
       AND status = 'FAILED';
     ```

### Complete Operational Recovery Procedure (Check 1 Governance Audit):
While the scoped `UPDATE` query correctly bounds recovery by event ID, tenant ID, and `FAILED` status, **a raw SQL UPDATE by itself is not an adequate enterprise operational procedure**. A safe operational recovery must guarantee:
1. **Operator Authorization:** Recovery cannot be an unauthenticated database superuser script. Only authorized platform operators (`SUPER_ADMIN` / change-ticket authenticated engineers) may initiate outbox event requeuing.
2. **Canonical Payload & Order State Verification:** Before resetting an event, the operator must verify that the underlying `CommerceOrder` exists, belongs to the same tenant, is in `status = 'PAID'`, and is `fulfillment_status = 'UNFULFILLED'`. (Note: The engine protects business integrity because `fulfillOrder` derives line items from the immutable `order.price_snapshot` in PostgreSQL, NOT from arbitrary fields in the outbox event payload).
3. **Audit Trail Persistence:** Manual recovery must record an immutable audit entry in `audit_logs` (`COMMERCE_OUTBOX_EVENT_MANUAL_RECOVERY`) linking the operator's user ID, timestamp, event ID, order ID, and incident ticket reason.
4. **Concurrency Protection During Recovery:** The requeue update must be executed within an interactive transaction with row locking (`SELECT ... FOR UPDATE`) so concurrent recovery attempts or background sweeps cannot race on the same row.
5. **Full Recommended Procedure:**
   ```sql
   BEGIN;
   -- 1. Verify and lock the failed outbox event
   SELECT id, status, retry_count, payload
   FROM outbox_events
   WHERE id = '<EVENT_ID>' AND tenant_id = '<TENANT_ID>' AND status = 'FAILED'
   FOR UPDATE;

   -- 2. Verify underlying order is paid and unfulfilled
   SELECT id, status, fulfillment_status
   FROM commerce_orders
   WHERE id = '<ORDER_ID>' AND tenant_id = '<TENANT_ID>';

   -- 3. Reset outbox event to PENDING
   UPDATE outbox_events
   SET status = 'PENDING', retry_count = 0, error = NULL
   WHERE id = '<EVENT_ID>' AND tenant_id = '<TENANT_ID>' AND status = 'FAILED';

   -- 4. Audit the manual recovery action
   INSERT INTO audit_logs (id, tenant_id, actor_id, action, entity_type, entity_id, metadata, created_at)
   VALUES (
     gen_random_uuid(), '<TENANT_ID>', '<OPERATOR_ID>',
     'COMMERCE_OUTBOX_EVENT_MANUAL_RECOVERY', 'OutboxEvent', '<EVENT_ID>',
     jsonb_build_object('orderId', '<ORDER_ID>', 'incidentTicket', '<INCIDENT_ID>'), NOW()
   );
   COMMIT;
   ```

---

## 6. Audit of Outstanding Decision Boundaries (OD Matrix)

| Gate ID | Area | Current Engineering Status | Owner Decision Required | Production Release Impact |
| :---: | :--- | :--- | :--- | :--- |
| **OD-1** | Commercial Pricing | Fail-closed in `commerce-pricing.config.ts`. Returns `null` in production. | Approve formal INR commercial pricing schedule. | **FAIL-CLOSED:** Production checkout will reject transactions until approved. Live payments blocked. |
| **OD-3** | Standalone Invoicing | Standalone products provision `TenantModule` without base plan. Invoicing deferred. | Select Option 3A (nullable `subscriptionId` schema migration) or Option 3B (separate `CommerceReceipt` ledger). | **BLOCKED:** Automated invoice generation for standalone products is disabled. |
| **OD-10** | Subscription Upgrade / Proration | **UNRESOLVED:** Technical upgrade provisions higher tier/seats and audits before/after. Downgrades fail closed (`DOWNGRADE_NOT_PERMITTED`). Commercial proration remains fail-closed. | **Explicit Owner Decision Required:** Authorize formal commercial proration policy (credit unspent time, charge full cycle, or period alignment). | **BLOCKING COMMERCIAL UPGRADE ACTIVATION:** Assertion `currentPeriodEnd >= initialPeriodEnd` does NOT prove preservation of previously paid value. Live mid-cycle upgrades remain blocked until authorized. |
| **OD-12** | Entitlement Revocation & Grace Period | Revocation remains deferred to future milestones. No unapproved grace-period logic exists. | Define formal revocation triggers, grace-period durations, and data retention SLA. | **DEFERRED:** Commercial grace-period policies remain outside Phase A3 scope. |
| **OD-13** | Database Schema Integrity | Zero DDL migrations applied in A3.4–A3.5. Existing verified tables utilized. | Confirm no schema migrations required for A3.6 closeout. | **VERIFIED:** Zero database migration risk. |

---

## 7. Historical Acceptance Evidence Reconciliation (Check 3 Audit)

The audit reviewed the authoritative acceptance plan against earlier draft reports:

1. **The $\ge 28$ Test Planning Criterion:**
   - In [`MASTERHRMS_A3_4_TEST_AND_ROLLOUT_PLAN.md:95`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/architecture/MASTERHRMS_A3_4_TEST_AND_ROLLOUT_PLAN.md#L95), an initial planning target of $\ge 28$ automated tests across 5 tiers was documented prior to implementation.
2. **The 18-Test Draft Reference:**
   - In early drafts of [`MASTERHRMS_A3_4_IMPLEMENTATION_REPORT.md:38`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/architecture/MASTERHRMS_A3_4_IMPLEMENTATION_REPORT.md#L38), a count of "18 comprehensive tests" was recorded before Tiers 1.6, 1.7, 5.5, and 6.2 were incorporated.
3. **The Actual Implemented A3.4 Suite (22 Tests):**
   - The authoritative test file [`commerce-entitlement-fulfillment.test.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-entitlement-fulfillment.test.ts) contains **22 comprehensive tests** covering Tiers 1 through 6, all passing with 100% success against PostgreSQL.
4. **Current Authoritative Baseline Across Active Repository (67 Tests):**
   - Adding the 13 Phase A3.5 E2E tests (including the two forensic edge-case gates `E2E-1.2` and `E2E-6.4`), 12 A3.3 tests, and 20 A3.2 tests yields **67 tests total**, all passing in 81.39s.
5. **Reconciliation Protocol:**
   - In accordance with governance constraints, historical documents (`MASTERHRMS_A3_4_TEST_AND_ROLLOUT_PLAN.md`, `MASTERHRMS_A3_4_IMPLEMENTATION_REPORT.md`, `MASTERHRMS_A3_4_DEPLOYMENT_AND_RECOVERY_RUNBOOK.md`) are **not unilaterally modified without explicit Owner authorization**.
   - A proposed formal reconciliation package has been prepared in `MASTERHRMS_A3_6_DISCREPANCY_REGISTER.md` for Owner sign-off.

---

## 8. Acceptance Recommendation

Based on empirical evidence from test suites, static analysis, build verification, and architectural inspection:

### Recommendation:
**A. ACCEPTANCE CANDIDATE — OWNER SIGN-OFF REQUIRED**

All applicable technical criteria for Phase A3.5 and its predecessors are independently verified. Historical documentation discrepancies and stale runbooks have been categorized with proposed reconciliations. Unresolved commercial business decisions (**OD-1, OD-3, and OD-10**) remain explicit, blocking release gates. Production deployment, live payment credentials, and production entitlement activation remain strictly blocked pending Owner commercial sign-off.
