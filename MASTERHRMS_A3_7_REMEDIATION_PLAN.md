# MASTERHRMS — Phase A3.7 Production Readiness Remediation Plan
## Prioritized Remediation Roadmap Ordered by Risk, Dependency & Operational Impact

**Document Identifier:** `MASTERHRMS-A3.7-REMEDIATION-20261009-V2`  
**Document Version:** 2.0.0  
**Date:** October 9, 2026  
**Auditor:** Google Antigravity Systems & Governance Audit Team  
**Evaluation Mode:** Read-Only Audit & Proposed Governance Plan Only  
**Overall Readiness:** **NOT READY FOR PRODUCTION RELEASE**  

---

## 1. Remediation Ordering Matrix

The following remediations are strictly ordered by technical dependency and business risk. No downstream remediation step should be executed until its prerequisite dependencies are verified.

```
+-------------------------------------------------------------------------------------------------+
|                                 REMEDIATION DEPENDENCY GRAPH                                    |
|                                                                                                 |
|   [Phase 1: Canonical Pricing] -----> [Phase 2: Live Payment Adapter]                           |
|       (CP-01 - CP-04 Decisions)                        |                                        |
|                 |                                      |                                        |
|                 v                                      v                                        |
|   [Phase 3: DB Migration & Backup] --> [Phase 4: Deep Observability]                            |
|                                                        |                                        |
|                                                        v                                        |
|                                      [Phase 5: Production Release]                              |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Remediation Actions

### Remediation Phase 1: Commercial Policy Confirmation & Pricing Governance (Status: POLICIES CONFIRMED | PUBLICATION PENDING)
- **Release Gate:** `RG-04` (Canonical Pricing)
- **Current Status:** **POLICIES CP-01 THROUGH CP-04 FORMALLY CONFIRMED BY PRODUCT OWNER.**
  - **CP-01:** Option B confirmed (Starter ₹2,388/yr, Growth ₹5,988/yr, Sovereign ₹12,000/yr).
  - **CP-02:** 100-employee limit confirmed; overage prohibited.
  - **CP-03:** Standalone modules/add-ons pricing deferred; Option 3A architecture preserved.
  - **CP-04:** Perpetual grandfathering confirmed.
- **Pending Action:** Price schedules remain unpublished in production. Formal authorization to execute the seed script (`server/scripts/seed_canonical_pricing.cjs`) on the production database is withheld until release cutover.

---

### Remediation Phase 2: Live Payment Gateway Adapter for Commerce Orders (Risk: Critical | Dependency: None)
- **Release Gate:** `RG-05` (Payment Gateway Integration)
- **Problem Statement:** The Phase A3 commerce checkout routes (`server/src/routes/commerce.routes.ts`) only expose `POST /api/commerce/checkout/simulate`. Live simulation is blocked in production (`SIMULATION_PROHIBITED`). Real customers attempting to purchase plans, add-ons, or standalone ERP products via `POST /api/commerce/orders` have no live payment mechanism (Razorpay/Stripe checkout session or webhook) connected to `CommerceOrder`.
- **Target Files:**
  - `server/src/routes/commerce.routes.ts` (lines 252–315)
  - `server/src/services/commerce-order.service.ts`
  - `server/src/services/gateway-verification.service.ts`
- **Required Remediation Steps:**
  1. Implement `POST /api/commerce/checkout/initiate`:
     - Creates live gateway order (Razorpay Order / Stripe PaymentIntent) matching the frozen order snapshot currency and total amount in paise/cents.
     - Saves gateway order ID to `CommerceOrder.metadata`.
  2. Implement `POST /api/commerce/webhook`:
     - Verifies HMAC SHA256 timing-safe cryptographic signature using `RAZORPAY_WEBHOOK_SECRET` / `STRIPE_WEBHOOK_SECRET`.
     - Validates exact amount and currency match against frozen `CommerceOrder` snapshot.
     - Transitions `CommerceOrder` to `PAID` state idempotently.
     - Enqueues `ORDER_PAID_FULFILLMENT_REQUESTED` event in `commerce_outbox_events`.
  3. Write comprehensive non-destructive test suite verifying live payment state transitions, signature validation, amount mismatch rejections, and idempotent webhook replays.

---

### Remediation Phase 3: Production Database Migration & Backup Verification (Risk: High | Dependency: Phase 1)
- **Release Gate:** `RG-06` (Database Migration) & `RG-07` (Backup Verification)
- **Problem Statement:** The target database lacks the standard Prisma migration table `_prisma_migrations` (`42P01`). Executing `prisma migrate deploy` in production will fail or attempt destructive baselining. Furthermore, the database pooler connection on port 6543 uses PgBouncer transaction pooling, which breaks DDL advisory locks. Finally, no automated rollback script exists.
- **Target Files:**
  - `server/scripts/apply_a3_6_governance_migration.cjs`
  - `server/scripts/revert_a3_6_governance_migration.cjs` (new rollback script)
  - `server/.env` / `.env.production` (`DIRECT_URL` configuration)
- **Required Remediation Steps:**
  1. **Configure Direct Connection:** Ensure `DIRECT_URL` is configured in production environment targeting the direct session port (port 5432) rather than the transaction pooler (port 6543).
  2. **Create Automated Rollback Script:** Author `server/scripts/revert_a3_6_governance_migration.cjs` with safe guardrails to cleanly rollback A3.6 columns/tables if aborted before data entry.
  3. **Mandate Pre-Deployment Snapshot:** Before applying any DDL to production, execute a full PostgreSQL dump:
     ```bash
     pg_dump -Fc --no-acl --no-owner -d "$DIRECT_URL" -f "production_pre_a3_7_backup_$(date +%Y%m%d%H%M%S).dump"
     ```
  4. **Execute Standalone Migration Runner:** Execute `node server/scripts/apply_a3_6_governance_migration.cjs` using `DIRECT_URL`.

---

### Remediation Phase 4: Observability, Deep Health Check & Alerting (Risk: Medium | Dependency: None)
- **Release Gate:** `RG-08` (Deep Observability)
- **Problem Statement:** `GET /api/health` returns hardcoded `{ status: "ok", service: "Master HRMS MySQL API" }` without database connectivity verification or outbox worker monitoring. If the database connection pool is exhausted or outbox events are failing, monitoring systems will report false health.
- **Target Files:**
  - `server/src/index.ts` (lines 35–45)
  - `server/src/services/commerce-fulfillment.service.ts`
- **Required Remediation Steps:**
  1. Enhance `GET /api/health`:
     - Execute active database ping: `SELECT 1;`
     - Query `commerce_outbox_events` for stuck events (`status = 'PENDING'` and `created_at < NOW() - INTERVAL '15 minutes'`) or dead letters (`status = 'FAILED'`).
     - Update service identifier to accurately state "Master HRMS PostgreSQL API".
     - Return HTTP 503 if database ping fails or dead letters exceed critical threshold.
  2. Implement an automated background cron or log metric alerting operators when outbox retry attempts exceed 3.

---

### Remediation Phase 5: Production Deployment & Live Activation Authorization (Risk: Critical | Dependency: Phases 1–4)
- **Release Gate:** `RG-09` (Production Deployment Authorization)
- **Problem Statement:** Live commercial operations and production VPS modifications cannot proceed without explicit Product Owner sign-off.
- **Required Remediation Steps:**
  1. Submit the completed and verified Remediations 1–4 to the Product Owner with empirical verification logs.
  2. Obtain written Product Owner release sign-off for deployment to VPS `147.79.66.214`.
  3. Execute controlled deployment following `MASTERHRMS_A3_4_DEPLOYMENT_AND_RECOVERY_RUNBOOK.md`.

---

## 3. Executive Conclusions

### 3.1 Overall Readiness Status
```
+-------------------------------------------------------------------------+
|                       OVERALL READINESS STATUS                          |
|                                                                         |
|                STATUS: NOT READY FOR PRODUCTION RELEASE                 |
|                                                                         |
|  Summary: Phase A3.6 governance implementation is verified, but live    |
|  commercial launch is blocked by 4 prerequisite production gates.       |
+-------------------------------------------------------------------------+
```

### 3.2 Confirmed Blockers
1. **Unapproved Canonical Pricing (Gate RG-04):** Production catalog fails closed without approved price schedules and CP-01–CP-04 decisions.
2. **Missing Live Gateway Adapter (Gate RG-05):** Phase A3 `CommerceOrder` has no live Razorpay/Stripe checkout adapter.
3. **Database Migration Strategy & Pooler Safety (Gate RG-06):** Database lacks `_prisma_migrations`; DDL must be applied via standalone runner over direct port 5432.
4. **Pre-Deployment Backup & Rollback Verification (Gate RG-07):** No empirical backup snapshot exists for the target database.

### 3.3 Decisions Requiring Product Owner Approval
1. **Commercial Policy Decisions CP-01 through CP-04:** Resolve annual discounts, Sovereign capacity, module coverage, and repricing rules.
2. **Payment Gateway Architecture:** Authorize development of live payment adapter for `CommerceOrder`.
3. **Migration Strategy Approval:** Authorize running standalone migration runner `apply_a3_6_governance_migration.cjs` on production PostgreSQL.
4. **Production Deployment Sign-Off:** Authorize production cutover once all gates pass.

### 3.4 Recommended Next Action
Await Product Owner review and formal decision on CP-01 through CP-04 before initiating Phase A3.7 remediation implementation.
