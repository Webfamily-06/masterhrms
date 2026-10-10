# MASTERHRMS — Phase A3.7 Production Readiness Audit Report
## Forensic, Evidence-Based Production Readiness Audit Following Formal Phase A3.6 Acceptance

**Document Identifier:** `MASTERHRMS-A3.7-AUDIT-20261009-V1`  
**Document Version:** 1.0.0  
**Audit Date:** October 9, 2026  
**Auditor:** Google Antigravity Systems & Governance Audit Team  
**Status:** **NOT READY FOR PRODUCTION RELEASE (RELEASE BLOCKED BY PRE-REQUISITE PRODUCTION GATES)**  
**Preceding Milestone:** Phase A3.6 Formal Product Owner Acceptance (Formally Accepted)  
**Audit Protocol:** Strictly Read-Only; Zero Production Connectivity; Zero Secrets Exposed; Zero Destructive Actions.

---

## Executive Summary

Following the formal Product Owner acceptance of Phase A3.6 (`docs/architecture/MASTERHRMS_A3_6_FORMAL_OWNER_ACCEPTANCE_RECORD.md`), this Phase A3.7 audit provides an independent, evidence-backed evaluation of the application codebase, database architecture, migration pipelines, security boundaries, and operational readiness for production deployment.

### Overall Readiness Verdict
> **OVERALL VERDICT: NOT READY FOR LIVE PRODUCTION RELEASE**  
> While the internal governance implementation of Phase A3.6 (OD-1 dynamic pricing, OD-3 standalone add-ons with Option 3A invoicing, and OD-10 renewal-scheduled plan changes) is **fully implemented and statically verified**, the system **CANNOT** be deployed to live production at this time due to **4 Critical Release Blockers**:
> 1. **No Live Gateway Integration for Phase A3 Commerce Orders:** The Phase A3 commerce checkout pipeline only implements non-monetary sandbox simulation (`POST /api/commerce/checkout/simulate`), which is strictly forbidden in production (`isCommerceSimulationProhibited()`). No live Razorpay/Stripe gateway adapter is hooked into `CommerceOrder`.
> 2. **Unapproved Canonical Commercial Pricing:** In production mode, `DynamicPricingService.resolveProductPricing` fails closed because no canonical pricing schedule has been approved and published in `commercial_price_schedules`. Starter (₹199), Growth (₹499), and Sovereign (₹1,000) remain unapproved proposed defaults.
> 3. **Database Migration Pipeline Drift:** The active database lacks the Prisma migration tracking table (`_prisma_migrations`). Phase A3.6 DDL changes reside in a standalone script (`server/scripts/apply_a3_6_governance_migration.cjs`), and the database is accessed via PgBouncer transaction pooling (port 6543) which breaks DDL advisory locking.
> 4. **Missing Verified Production Backup & Automated Rollback:** No empirical snapshot of the production database state or automated rollback script exists for Phase A3.6 DDL.

---

## 1. Repository & Architecture Assessment

### 1.1 Architecture Topology
- **Frontend Layer:**
  - Framework: TanStack Start (SSR + Client Routing) with React 19.
  - Bundler: Vite v8.3.1.
  - UI Design System: Tailwind CSS v4, Radix UI primitives, Lucide icons.
  - State Management: TanStack React Query v5.
- **Backend Application Layer:**
  - Runtime: Node.js (tested on v25.1.0) with Express.js and TypeScript.
  - ORM: Prisma ORM v5.22.0.
  - Architecture Pattern: Layered Domain Services with Event Outbox (`CommerceOutboxEvent`) and Worker Sweep.
- **Database & Persistence:**
  - Engine: PostgreSQL on Supabase (`aws-0-ap-south-1.pooler.supabase.com`).
  - Connection Mode: PgBouncer Transaction Pooling on port `6543`.
  - Tenancy Isolation: Hybrid Multi-Tenant with Tenant Middleware (`workspaceHostMiddleware`, `requireAuth`, JWT `tenantId`, and `x-tenant-id` header).

### 1.2 Configuration & Secrets Audit
- **Development Configuration:** `server/.env` is configured with `NODE_ENV=development`.
- **Secret Safety Review:**
  - Audited without printing or disclosing credentials.
  - `.env.example` provides comprehensive keys: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, etc.
- **Configuration Anomalies Discovered:**
  - **Missing Direct Connection (`DIRECT_URL`):** In `server/prisma/schema.prisma` (lines 1–5):
    ```prisma
    datasource db {
      provider  = "postgresql"
      url       = env("DATABASE_URL")
      directUrl = env("DIRECT_URL")
    }
    ```
    The `DATABASE_URL` targets port `6543` with `?pgbouncer=true`. If `DIRECT_URL` is omitted or points to port `6543`, standard Prisma migration commands (`prisma migrate deploy`) will fail due to PgBouncer transaction-mode connection pool limits on advisory locks.
  - **No Automated CI/CD Pipeline:** The repository contains no `.github/workflows/` or deployment automation. Deployments are currently manual shell procedures.

---

## 2. Phase A3.6 Governance Verification

Every governance requirement mandated by the Product Owner in Phase A3.6 was verified in code:

| Governance Requirement | Implementation File & Method | Verification Evidence & Forensic Findings | Status |
| :--- | :--- | :--- | :---: |
| **OD-1: Dynamic Versioned Pricing** | `server/src/services/dynamic-pricing.service.ts` (`createPriceSchedule`, `approvePriceSchedule`, `publishPriceSchedule`, `resolveProductPricing`) | Model `CommercialPriceSchedule` enforces versioning, effective dates, status (`DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `ARCHIVED`), and audit fields (`approved_by`, `published_by`). | **VERIFIED** |
| **OD-1: Fail-Closed Production Behavior** | `server/src/services/dynamic-pricing.service.ts` (lines 142–165) | In `NODE_ENV === "production"`, unapproved or missing price schedules immediately fail closed: returns `null`, cart calculation throws `CONFIGURATION_ERROR`. Hardcoded fallbacks are strictly blocked. | **VERIFIED** |
| **OD-1: Immutable Price Snapshots** | `server/src/services/commerce-order.service.ts` (`createOrder`), `server/src/services/commerce-fulfillment.service.ts` | Order lines freeze `unitPrice`, `currency`, and `taxRate`. Subsequent catalog price modifications do not alter existing orders or invoices. | **VERIFIED** |
| **OD-3: Standalone Add-ons (Option 3A)** | `server/src/services/commerce-fulfillment.service.ts` (lines 201–245), `schema.prisma` (`BillingInvoice.subscriptionId`) | `BillingInvoice.subscriptionId` is nullable. Standalone add-ons provision `TenantAddon` and generate invoices with `subscriptionId: null`. | **VERIFIED** |
| **OD-10: Renewal-Scheduled Plan Changes** | `server/src/services/subscription-schedule.service.ts` (`schedulePlanChange`, `cancelScheduledPlanChange`, `sweepAndApplyScheduledChanges`) | Persisted in `tenant_subscriptions` (`scheduled_plan_id`, `scheduled_at`, `scheduled_effective_date`). Active entitlements and limits persist unchanged until renewal date. | **VERIFIED** |
| **OD-10: Downgrade Capacity Guard** | `server/src/services/subscription-schedule.service.ts` (lines 85–115) | Active billable employee count is compared against target plan limits. If active employees exceed target capacity, the request is rejected with `409 DOWNGRADE_CAPACITY_EXCEEDED`. | **VERIFIED** |
| **OD-10: Super Admin Override with Audit** | `server/src/services/subscription-schedule.service.ts` (`immediateSuperAdminOverride`) | Immediate plan modification requires Super Admin role, ticket identifier (`ticketId`), and written reason (`reason`). Creates immutable record in `SubscriptionPolicyAudit`. | **VERIFIED** |
| **Payment-State Validation** | `server/src/services/commerce-fulfillment.service.ts` (lines 60–85) | `fulfillOrder` enforces that `order.status === "PAID"`. Unpaid orders in `PENDING_PAYMENT` or `FAILED` are rejected with `ORDER_NOT_PAID`. | **VERIFIED** |

---

## 3. Database & Migration Readiness Assessment

### 3.1 Migration History & Workflow Analysis
- **Standard Migration Workflow Status: DISCREPANCY DETECTED.**
  - Direct query of the connected database reveals that the standard Prisma tracking table `_prisma_migrations` **DOES NOT EXIST** (`42P01: relation "_prisma_migrations" does not exist`).
  - Analysis indicates that the database was previously initialized or updated via `prisma db push` or standalone SQL migration scripts rather than `prisma migrate deploy`.
- **A3.6 Schema Migration Mechanism:**
  - Phase A3.6 DDL updates are codified in `server/scripts/apply_a3_6_governance_migration.cjs`:
    1. `ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" DROP NOT NULL;`
    2. `ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "scheduled_plan_id" ...;`
    3. `CREATE TABLE IF NOT EXISTS "commercial_price_schedules" ...;`
- **Idempotency & Safety Analysis:**
  - Script utilizes `SET lock_timeout = '5s';` to protect against lock queuing in live environments.
  - Adding columns with `ADD COLUMN IF NOT EXISTS` is idempotent and metadata-only (zero table rewrite in PostgreSQL 11+).
  - Dropping `NOT NULL` on `billing_invoices.subscription_id` is safe and idempotent in PostgreSQL.
- **Rollback Feasibility & Risks:**
  - **No Automated Rollback Script:** There is no corresponding `revert_a3_6_governance_migration.cjs`.
  - **Data Inversion Risk:** Once standalone add-on invoices are created with `subscription_id = NULL`, executing a rollback (`ALTER TABLE billing_invoices ALTER COLUMN subscription_id SET NOT NULL;`) will cause a catastrophic query failure on non-null constraint violation unless orphaned rows are manually reconciled.

---

## 4. Security & Reliability Assessment

### 4.1 Authentication & Multi-Tenant Authorization
- **Tenant Context Enforcement:**
  - All commerce endpoints require authentication (`requireAuth`) and extract `tenantId` from authenticated JWT tokens.
  - Route handlers reject requests lacking tenant context (`403 Forbidden`).
  - Cross-tenant queries are blocked by strict tenant ID scoping on all Prisma queries.
- **Host Header Defense:**
  - `workspaceHostMiddleware` compares the HTTP `Host` header against the authenticated tenant's slug and custom domain records in the database, preventing cross-tenant request forgery.

### 4.2 Payment Gateway & Webhook Assessment
- **Legacy Billing Webhooks:**
  - Legacy endpoint `POST /api/billing/webhook` handles Razorpay events.
  - Webhook verification uses `crypto.timingSafeEqual` with HMAC SHA256.
  - Fails closed (`WEBHOOK_VERIFICATION_UNAVAILABLE`) if `RAZORPAY_WEBHOOK_SECRET` is unset.
  - Duplicate events are ignored via `BillingInvoice.gatewayEventId` idempotency tracking.
- **CRITICAL GAP — Phase A3 Commerce Routes:**
  - Phase A3 `CommerceOrder` routes (`server/src/routes/commerce.routes.ts`) **DO NOT HAVE** a live gateway webhook or live payment capture handler!
  - Checkout is only implemented via `/api/commerce/checkout/simulate`, which explicitly fails closed in production:
    ```typescript
    if (isCommerceSimulationProhibited()) {
      return res.status(403).json({
        code: "SIMULATION_PROHIBITED",
        error: "Simulated checkout is strictly disabled in production..."
      });
    }
    ```
  - **Impact:** In production, a customer cannot complete an order created via `POST /api/commerce/orders`. Live checkout is completely blocked until a live gateway adapter is implemented.

### 4.3 Transaction Boundaries & Outbox Reliability
- `CommerceOrderService.createOrder` and `CommerceOrderService.simulatePaymentSettlement` use `prisma.$transaction` for all atomic state transitions.
- Asynchronous fulfillment leverages the transactional outbox table `commerce_outbox_events`:
  - Workers use `FOR UPDATE SKIP LOCKED` to serialize concurrent sweeps across multiple server instances.
  - Retries are bounded to 5 attempts with exponential backoff before transitioning to `FAILED` with permanent dead-letter auditing.

### 4.4 Observability, Health Checks & Operational Runbooks
- **Shallow Health Check:** Endpoint `GET /api/health` returns `{ status: "ok", service: "Master HRMS MySQL API" }` (note outdated "MySQL" label despite PostgreSQL backend). It does NOT perform an active database query or monitor outbox lag.
- **Operational Runbook:** Runbook `MASTERHRMS_A3_4_DEPLOYMENT_AND_RECOVERY_RUNBOOK.md` provides clear procedures for emergency kill-switch (`COMMERCE_FULFILLMENT_ENABLED="false"`) and manual operator outbox recovery.

---

## 5. Test & Build Verification

All non-destructive static analysis and build verification checks were executed locally during this audit:

### 5.1 Static Typecheck Verification
- **Command:** `export PATH="/Users/apple/.nvm/versions/node/v25.1.0/bin:$PATH" && cd server && npx tsc --noEmit`
- **Exit Code:** `0`
- **Output:** Clean (0 errors, 0 warnings).
- **Evidence:** Confirms all A3.6 type signatures, services, routes, and models are fully consistent.

### 5.2 Frontend & SSR Production Build Verification
- **Command:** `export PATH="/Users/apple/.nvm/versions/node/v25.1.0/bin:$PATH" && npm run build`
- **Exit Code:** `0`
- **Duration:** 6.84 seconds.
- **Output Artifacts:** Clean generation of client bundle (`dist/client/`) and server SSR bundle (`dist/server/server.js`).

### 5.3 Automated Commerce & Governance Test Suite Baseline
As documented in `docs/architecture/MASTERHRMS_A3_6_TEST_VERIFICATION.md`, the 88-test regression suite stands verified:
- `commerce-catalog-pricing.test.ts` (Phase A3.2): 20 passed.
- `commerce-order-lifecycle.test.ts` (Phase A3.3): 12 passed.
- `commerce-entitlement-fulfillment.test.ts` (Phase A3.4): 22 passed.
- `commerce-e2e-journey.test.ts` (Phase A3.5): 13 passed.
- `commerce-governance-a3-6.test.ts` (Phase A3.6): 21 passed.
- **Total:** 88 / 88 tests passing (`Exit Code: 0`).

---

## 6. Audit Findings & Release Gate Summary

| Gate ID | Release Gate Requirement | Evaluation Findings | Gate Verdict |
| :--- | :--- | :--- | :---: |
| **RG-01** | A3.6 Governance & Business Alignment | OD-1, OD-3, and OD-10 implemented and tested | **PASS** |
| **RG-02** | Backend TypeScript Static Integrity | `tsc --noEmit` passes with exit code 0 | **PASS** |
| **RG-03** | Frontend & SSR Production Bundling | `npm run build` passes with exit code 0 | **PASS** |
| **RG-04** | Canonical Pricing Approval & Publication | Proposed prices unapproved; fail-closed in prod | **BLOCKED** |
| **RG-05** | Live Payment Gateway Adapter for Commerce | Only simulated checkout exists; no live adapter | **BLOCKED** |
| **RG-06** | Production Database Migration Strategy | `_prisma_migrations` missing; requires direct pooler port | **BLOCKED** |
| **RG-07** | Production Database Backup Verification | No verified backup snapshot artifact available | **NOT VERIFIED** |
| **RG-08** | Deep Observability & Health Checks | `/api/health` is shallow; no outbox monitoring | **FAIL** |
| **RG-09** | Production VPS Deployment Authorization | Formal Product Owner release approval pending | **BLOCKED** |

---

## 7. Conclusions & Recommended Next Actions

### 7.1 Confirmed Blockers
1. **Gate RG-04:** Canonical commercial pricing approval is required from the Product Owner. Without published price schedules, the live catalog fails closed.
2. **Gate RG-05:** Live checkout adapter (Razorpay/Stripe) must be implemented for `CommerceOrder` before real customers can transact.
3. **Gate RG-06:** Production migration execution plan must use `DIRECT_URL` (direct PostgreSQL port) and execute the standalone migration runner (`server/scripts/apply_a3_6_governance_migration.cjs`).
4. **Gate RG-07 & RG-09:** Formal Product Owner written authorization and verified production backup must precede any VPS deployment.

### 7.2 Decisions Requiring Product Owner Approval
1. **Decision on Proposed Prices:** Formally approve or adjust the proposed subscription tiers:
   - Starter: ₹199 / month (1–5 employees)
   - Growth: ₹499 / month (6–20 employees)
   - Sovereign: ₹1,000 / month (21–100 employees)
2. **Decision on Live Checkout Strategy:** Authorize implementation of live payment capture adapters for Phase A3 `CommerceOrder`.
3. **Decision on Migration Path:** Formally approve running `apply_a3_6_governance_migration.cjs` on the production database.

### 7.3 Next Action
Review companion governance documents:
1. `docs/architecture/MASTERHRMS_A3_7_RELEASE_GATE_REGISTER.md`
2. `docs/architecture/MASTERHRMS_A3_7_REMEDIATION_PLAN.md`
