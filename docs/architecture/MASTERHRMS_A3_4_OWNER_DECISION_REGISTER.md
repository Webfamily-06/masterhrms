# MASTERHRMS — Phase A3.4 & A3.5 Owner Decision Register
## Critical Commercial, Architectural & Deployment Gates

**Document Version:** 2.1.0  
**Phase:** A3.4 & A3.5 — End-to-End Testing & Regression Gate  
**Status:** **A3.5 E2E TESTING COMPLETE & VERIFIED — READY FOR A3.6 OWNER ACCEPTANCE**  
**Date:** October 9, 2026  

---

## 1. Overview & Purpose

This register defines the explicit decisions required from the **System Owner / Product Owner** for Phase A3.4/A3.5 engineering implementation, end-to-end testing, and subsequent production deployment.

---

## 2. Decision Register Matrix & Resolution Status

| Decision ID | Area | Engineering Resolution in Phases A3.4 & A3.5 | Production Deployment Gate Status |
| :---: | :--- | :--- | :--- |
| **OD-1** | Commercial Pricing Schedule | **Implemented Fail-Closed:** Pricing engine in `commerce-pricing.config.ts` returns `null` for commercial checkout in production unless explicitly approved. Development sandbox / non-production simulation prices are enabled for verification. Fully validated in `E2E-1.1`. | **GATE ACTIVE:** Live payment capture remains disabled until the owner formally signs off on production pricing schedules. |
| **OD-3** | Standalone Product Invoicing | **Isolated & Deferred:** Standalone ERP orders (POS, CRM, Finance) provision `TenantModule` entitlements directly. Because the owner has not selected Option 3A (nullable `subscriptionId`) or Option 3B (`CommerceReceipt`), standalone invoicing is deferred without creating dummy subscriptions. Fully validated in `E2E-2.1`. | **GATE ACTIVE:** Owner selection between Option 3A and 3B is required before issuing invoices for standalone product purchases. |
| **OD-10** | Entitlement Upgrade Policy | **Safeguarded & Validated:** Implemented hierarchical tier ranking (`starter: 1`, `growth: 2`, `sovereign: 3`, `custom-flex: 4`). Upgrades seamlessly replace lower tiers and record before/after states in `SubscriptionPolicyAudit`; accidental downgrades are fail-closed and strictly rejected (`DOWNGRADE_NOT_PERMITTED`). Fully validated in `T1.7` and `T4.3`. | **RESOLVED & VERIFIED:** Core upgrade provisioning implemented and validated in E2E suites. |
| **OD-11** | Outbox Infrastructure Grounding | **Resolved & Implemented:** Native PostgreSQL `outbox_events` is adopted with zero external broker dependencies. Concurrency is handled via `SELECT ... FOR UPDATE SKIP LOCKED` and transactional row locking. Separated from generic realtime WebSocket dispatcher. Fully validated in `E2E-6.1`, `E2E-6.2`, `E2E-6.3`. | **RESOLVED & VERIFIED:** Implemented in `CommerceFulfillmentService.processOutboxBatch` and verified in E2E journey suite. |
| **OD-12** | Entitlement Revocation SLA | **Preserved Existing Baseline:** No unapproved revocation policies were invented. Revocation remains scoped to explicit cancellation and expiration checks. | **PRESERVED:** Existing model intact. |
| **OD-13** | Schema Migration Authorization Gate | **Adopted Option 13B (Zero DDL):** No schema migrations were generated or applied. The implementation strictly utilizes verified existing PostgreSQL models (`commerce_orders`, `outbox_events`, `tenant_subscriptions`, `tenant_modules`, `tenant_addons`, `audit_logs`). | **RESOLVED:** Full backward compatibility preserved; zero migration risk. |

---

## 3. Production Release Checklist

Before Phase A3 can be enabled for live production traffic, the following owner actions are mandatory:

- [ ] **Commercial Schedule Approved (OD-1):** Sign off on live INR pricing schedule for core plans, seats, and add-ons.
- [ ] **Invoicing Model Selected (OD-3):** Authorize Option 3A (nullable `subscriptionId` migration) or Option 3B (separate receipt ledger).
- [ ] **Production Gateway Credentials Provided:** Configure live Razorpay / Stripe credentials (currently null / disabled).
- [ ] **Phase A3.6 Formal Sign-Off:** Execute Owner Acceptance Gate to formally close Milestone A3.

