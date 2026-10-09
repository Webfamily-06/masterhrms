# MASTERHRMS — Phase A3.4 Test & Rollout Plan
## Automated Test Strategy, Isolation Protocols & Deployment Gates

**Document Version:** 1.0.0  
**Phase:** A3.4 — Atomic Entitlement Provisioning & Outbox Publisher  
**Status:** **PLANNING ONLY — EXECUTION ON HOLD**  
**Date:** October 9, 2026  

---

## 1. Test Suite Architecture

When implementation is authorized, Phase A3.4 verification must execute in a dedicated acceptance suite (`server/src/tests/commerce-entitlement-fulfillment.test.ts`) covering these 5 critical testing tiers:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           A3.4 ACCEPTANCE SUITE TIERS                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Unit & Catalog Mapping Tests (10 tests)                                 │
│   - Deterministic item-to-engine resolution (Base Plans, Modules, Addons)       │
│   - Period start and end date calculation (leap years, month-end clamping)      │
│   - Seat allocation and excess seat mapping                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Transaction Atomicity & Rollback Tests (6 tests)                        │
│   - Single-transaction rollback on mock downstream failure                      │
│   - Outbox event status consistency (PENDING -> PROCESSED on commit)            │
│   - AuditLog persistence within same transaction boundary                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Concurrency & Lock Serialization Tests (4 tests)                        │
│   - 2 concurrent workers attempting to claim the same eligible order            │
│   - Exactly 1 worker wins; second worker receives 0 rows affected               │
│   - Verification that entitlements are provisioned exactly once (0 duplicates)  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Security & Cross-Tenant Boundary Tests (4 tests)                        │
│   - Worker verifying that order.tenantId matches tenant database context        │
│   - Attempted cross-tenant fulfillment injection fails closed                   │
│   - Zero credential or gateway secret leakage in logs or audit records          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Tier 5: Crash & Failure Recovery Tests (4 tests)                                │
│   - Simulated worker process crash during CLAIMED lease                         │
│   - Lease expiration sweep resetting claimed order to UNFULFILLED               │
│   - Max retry backoff (5 attempts) triggering automated escalation alert        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Environment & Database Isolation Protocols

1. **Strict Non-Production Target:** All tests must run strictly against isolated local/test PostgreSQL instances (`DATABASE_URL` pointing to test schema). Running against any production connection string is **strictly prohibited**.
2. **Transaction Rollback Fixtures:** Tests creating temporary test tenants (`test-tenant-fulfillment-xxx`) must clean up all generated rows in `afterAll()` or run within isolated test transactions.
3. **Mock Gateway Signatures:** Live gateways (Stripe, Razorpay) are **never called**. All payment confirmations in tests are generated via cryptographic HMAC mock fixtures matching the gateway signing algorithm.

---

## 3. Rollout & Deployment Strategy

### Phase 1: Staging Canary Deployment
1. **Prerequisite Gates:**
   - 100% of Phase A3.2 (20 tests), Phase A3.3 (12 tests), and Phase A3.4 tests pass.
   - Zero TypeScript errors (`tsc --noEmit`).
   - Clean production bundle build (`npm run build`).
2. **Shadow Outbox Execution:**
   - Deploy outbox publisher in "Shadow Mode" where events are published and swept, but actual entitlement provisioning is simulated with dry-run logs.
   - Monitor for 24 hours to verify zero lease lockups or unexpected event retries.

### Phase 2: Staging Full Provisioning Verification
- Execute end-to-end simulated checkout flows on staging.
- Verify that `TenantSubscription`, `TenantModule`, and `TenantAddon` are activated immediately upon checkout completion.
- Verify that UI navigation bars, module gates, and add-on hooks reflect newly acquired entitlements in real time.

### Phase 3: Production Release Gate
- Release to production gated by Owner Decision sign-offs (`OD-1`, `OD-3`, `OD-11`, `OD-13`).
- Rollout executed with zero downtime via standard rolling container restarts.

---

## 4. Rollback & Forward-Fix Protocols

1. **No Destructive Table Drops:** Once production orders exist, `commerce_orders`, `outbox_events`, or entitlement records may **never be dropped**.
2. **Worker Kill-Switch:**
   - The fulfillment background worker can be disabled immediately via environment variable:
     ```env
     COMMERCE_FULFILLMENT_ENABLED="false"
     ```
   - When disabled, paid orders accumulate cleanly in `outbox_events` with status `PENDING`. No orders are lost, and no partial provisioning occurs.
3. **Forward-Fix Execution:** Any defect identified in production is resolved by forward-fixing the worker logic and restarting the worker, which then resumes processing pending outbox events sequentially.

---

## 5. Acceptance Criteria Go / No-Go Checklist

Before recommending Phase A3.4 for formal closure in the future, the following conditions must be met:

- [ ] **Test Coverage:** $\ge 28$ automated tests passing in the A3.4 fulfillment suite.
- [ ] **Zero Over-Provisioning:** Concurrent worker tests prove 0 duplicate entitlements under load.
- [ ] **Zero Lost Events:** Every `PAID` order generates an outbox event that reaches `PROCESSED`.
- [ ] **Multi-Tenant Boundary:** No cross-tenant reads or writes possible in background workers.
- [ ] **Performance SLA:** Average fulfillment latency $\le 500\text{ms}$ from payment event to active entitlement.
- [ ] **Audit Completeness:** 100% of fulfillment transitions record structured entries in `audit_logs`.

---

**STATUS:** All rollout plans and test suites remain **ON HOLD** pending separate owner implementation authorization.

---

## 6. Dated Reconciliation Note (October 9, 2026 — Phase A3.6 Governance Audit)

> [!NOTE]
> **Historical Planning Reconciliation:**  
> The $\ge 28$ test coverage criterion defined in Section 1 (Tiers 1–5 breakdown) and Section 5 of this planning document was an early pre-implementation planning estimate.
> 
> During authorized engineering execution in Phase A3.4 and Phase A3.5:
> 1. The dedicated fulfillment acceptance suite ([`commerce-entitlement-fulfillment.test.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-entitlement-fulfillment.test.ts)) was implemented with **22 comprehensive tests across 6 validation tiers**, achieving 100% test pass rate on PostgreSQL.
> 2. With the addition of Phase A3.2 (20 tests), Phase A3.3 (12 tests), and Phase A3.5 E2E journeys (13 tests including upgrade/downgrade safety and outbox failure recovery), the authoritative consolidated commerce test suite in the repository contains **67 tests**, all passing in 81.39s.
> 3. This historical planning document is preserved intact as historical evidence, with the authoritative implementation baseline established at 67 tests in [`MASTERHRMS_A3_6_TEST_VERIFICATION.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/architecture/MASTERHRMS_A3_6_TEST_VERIFICATION.md).

