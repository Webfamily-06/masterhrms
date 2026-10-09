# MASTERHRMS — Phase A3.6 Decision Gate Register
## Architectural, Commercial & Operational Boundary Governance

**Document Version:** 1.0.0  
**Phase:** Phase A3.6 — Owner Acceptance & Governance Gate  
**Date:** October 9, 2026  
**Auditor:** Google Antigravity Systems & Governance Audit Agent  
**Authorization Context:** Milestone A3 Formal Closeout Evaluation  

---

## 1. Overview & Purpose

This register documents the governance boundaries and unresolved business/commercial decisions across Phase A3. 

**Core Governance Principle:** A passing automated test suite verifies *technical correctness of code*, but does **not** constitute authorization of *unresolved business policies*. All commercial pricing schedules, invoicing models, and proration policies must remain explicitly gated until formal sign-off by the System Owner.

---

## 2. Decision Gate Matrix

| Decision ID | Decision Title | Category | Technical Status in Repo | Required Owner Action | Release Impact if Unapproved |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **OD-1** | Dynamic Commercial Pricing | Commercial | **POLICY DIRECTION: DYNAMIC, VERSIONED, ADMINISTRATOR-CONFIGURABLE COMMERCIAL PRICING.** Subscriptions and add-ons must not use permanently hardcoded prices. Existing example prices (Starter ₹199, Growth ₹499, Sovereign ₹1,499) are proposals only. In code, `commerce-pricing.config.ts` fails closed in production. | **Owner Approval Required:** Formally approve dynamic pricing policy and designate the initial commercial price schedule. | **BLOCKING:** Production checkout will reject transactions. Live payments remain disabled. |
| **OD-3** | Standalone Workspace Add-ons & Invoicing | Financial / Architecture | **POLICY DIRECTION: WORKSPACE-BOUND STANDALONE ADD-ONS WITH CONSOLIDATED CHECKOUT AND RENEWAL.** Add-ons remain independent products belonging to specific workspaces, but can be purchased/renewed together with base plans. Recommends **Option 3A** (make `BillingInvoice.subscriptionId` nullable). | **Owner Approval Required:** Formally select Option 3A architecture for future implementation. | **GATED:** Standalone module purchases cannot generate formal tax invoices until Option 3A migration is authorized. |
| **OD-10** | Renewal-Based Plan Changes & Super Admin Override | Billing / Lifecycle | **POLICY DIRECTION: SCHEDULE NORMAL PLAN CHANGES FOR THE NEXT RENEWAL; ALLOW AUDITED SUPER ADMIN OVERRIDES UNDER EXPLICIT CONTROLS.** Full paid value preserved; unspent credit math eliminated. Super Admin overrides strictly audited. Co-terminus billing preserved only as optional add-on alignment rule. | **Owner Approval Required:** Formally approve renewal-based plan change policy and Super Admin override controls. | **GATED:** Live mid-cycle customer plan switches remain blocked. |
| **OD-12** | Entitlement Revocation & Grace Period SLA | Operations / Legal | **DEFERRED:** Existing baseline preserved. Revocation logic is restricted to explicit administrative cancellation or end-of-period expiration. | Approve policy for non-payment grace periods (e.g. 7-day read-only mode) and data retention before purge. | **DEFERRED:** Commercial grace periods remain outside Phase A3 scope. |
| **OD-13** | Database Schema Migration Gate | Infrastructure | **VERIFIED (ZERO DDL):** No schema migrations were generated or applied during A3.4, A3.5, or A3.6. Existing verified PostgreSQL schema was preserved intact. | Formally confirm that Milestone A3 requires zero database schema migrations. | **NO IMPACT:** Zero migration risk or schema drift. |

---

## 3. Deep-Dive Gate Evaluations

### Gate OD-1: Dynamic Commercial Pricing Architecture
- **Aligned Direction:** **DYNAMIC, VERSIONED, ADMINISTRATOR-CONFIGURABLE COMMERCIAL PRICING.**
- **Repository Evidence:**
  - File: [`server/src/config/commerce-pricing.config.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/config/commerce-pricing.config.ts)
  - When environment is detected as production (`process.env.NODE_ENV === "production"`), the pricing resolver fails closed (`return null`) unless commercial authorization flags are present.
  - Razorpay and Stripe gateway keys remain set to placeholder/test values; live payment capture is intentionally disconnected.
- **Key Business Invariants:**
  - Pricing is not hardcoded; existing example prices (₹199, ₹499, ₹1,499) are non-binding proposals.
  - Published prices are versioned with effective dates and tax attribution. Price snapshots on orders and invoices remain immutable.
  - Existing subscriptions do not automatically face price hikes at renewal without approved repricing policy and customer notice.
- **Owner Action Required:** Formal written approval of the dynamic pricing policy and designation of the initial commercial price schedule.
- **Status:** **ACTIVE RELEASE GATE (BLOCKING PRODUCTION TRAFFIC).**

### Gate OD-3: Standalone Workspace Add-ons with Consolidated Checkout & Invoicing
- **Aligned Direction:** **WORKSPACE-BOUND STANDALONE ADD-ONS WITH CONSOLIDATED CHECKOUT AND RENEWAL.**
- **Repository Evidence:**
  - File: [`server/src/services/commerce-fulfillment.service.ts:292-311`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L292)
  - File: [`server/src/tests/commerce-e2e-journey.test.ts:470-496`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-e2e-journey.test.ts#L470)
  - Standalone products (POS, CRM, Finance) provision `TenantModule` records with `isEnabled: true`.
  - In `schema.prisma`, `BillingInvoice` has a foreign key constraint requiring `subscriptionId String @db.VarChar(36)`.
- **Architectural Comparison & Recommendation:**
  - **Option 3A (Recommended):** Make `BillingInvoice.subscriptionId` nullable (`String?`). Unifies tax invoice sequence (`INV-YYYY-XXXXX`), supports standalone module tax invoices, compliant with GST statutory requirements, minimal migration risk.
  - **Option 3B:** Introduce separate `CommerceReceipt` model. Fragments invoicing ledger, requires dual sequence management, complicates tax reporting.
- **Owner Action Required:** Formally approve Option 3A architecture for future implementation.
- **Status:** **ACTIVE RELEASE GATE (STANDALONE INVOICES DEFERRED).**

### Gate OD-10: Renewal-Based Plan Changes with Super Admin Override
- **Aligned Direction:** **SCHEDULE NORMAL PLAN CHANGES FOR THE NEXT RENEWAL; ALLOW AUDITED SUPER ADMIN OVERRIDES UNDER EXPLICIT CONTROLS.**
- **Repository Evidence:**
  - File: [`server/src/services/commerce-fulfillment.service.ts:213-286`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L213-L286)
  - File: [`server/src/tests/commerce-e2e-journey.test.ts:360-445`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/commerce-e2e-journey.test.ts#L360-L445)
- **Key Business Invariants:**
  - Ordinary plan changes take effect at the next subscription renewal (`currentPeriodEnd`), preserving active paid plan and full paid value without prorated credit forfeiture.
  - Downgrades validated against active seat and module usage before scheduling.
  - Super Admin immediate overrides require step-up authorization, incident ticket tracking, and immutable before/after logging in `SubscriptionPolicyAudit`.
  - Co-terminus billing preserved only as an optional rule for mid-cycle add-on attachments.
- **Owner Action Required:** Formally approve renewal-based plan change policy and Super Admin override controls.
- **Status:** **ACTIVE RELEASE GATE (COMMERCIAL UPGRADES GATED).**

### Gate OD-12: Entitlement Revocation & Grace Period SLA
- **Repository Evidence:**
  - Entitlement verification middleware ([`server/src/middleware/entitlements.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/middleware/entitlements.ts)) checks active subscriptions and unexpired add-ons (`renewsAt > now()`).
  - No speculative grace-period overrides or automated data purges have been implemented.
- **Owner Decision Required:** Future milestone approval of business rules regarding late payment grace periods (e.g., 3-day grace period before module lock).
- **Status:** **DEFERRED TO POST-A3 MILESTONES.**

### Gate OD-13: Database Schema Migration Policy
- **Repository Evidence:**
  - Git history and Prisma schema show zero migration generation (`prisma/migrations/`) during Phases A3.4 through A3.6.
  - All features utilize existing, verified tables (`commerce_orders`, `outbox_events`, `tenant_subscriptions`, `tenant_modules`, `tenant_addons`, `subscription_policy_audits`, `audit_logs`).
- **Owner Decision Required:** Acknowledge zero DDL execution for Milestone A3.
- **Status:** **SATISFIED & VERIFIED.**
