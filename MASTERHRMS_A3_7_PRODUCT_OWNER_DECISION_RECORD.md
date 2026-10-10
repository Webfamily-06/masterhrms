# MASTERHRMS — Phase A3.7 Product Owner Decision Record

**Document Identifier:** `MASTERHRMS-A3.7-OWNER-DECISION-RECORD-20261009-V1.1`  
**Document Version:** 1.1.0  
**Status:** **FORMALLY CONFIRMED BY PRODUCT OWNER**  
**Phase:** Phase A3.7 Commercial Pricing Governance & Production Readiness  
**Confirmation Date:** October 9, 2026  
**Auditor / Governance Authority:** Google Antigravity Governance Audit Team & Product Owner  
**Production Release Status:** **NOT AUTHORIZED**  
**Commercial Price Publication Status:** **NOT AUTHORIZED**  

---

## 1. Purpose & Authority Record

This document records the **formal confirmation** by the Product Owner of commercial policies **CP-01 through CP-04** and grants limited technical design authorization for **TR-01** (Razorpay Sandbox Specification) and **TR-02** (Read-Only Database Readiness Review).

> **CRITICAL BOUNDARY:** This document records policy determinations and limited technical design authorizations only. It does **NOT** authorize commercial price publication, does **NOT** authorize production database mutations or DDL execution, does **NOT** configure live payment credentials or activate live checkout, and does **NOT** authorize production release. Production release remains **STRICTLY NOT AUTHORIZED**.

---

## 2. Confirmed Product Owner Decision Matrix (CP-01 through CP-04)

### CP-01 — Annual Billing Model
**Confirmed Selection:** **Option B — Full 12-Month Standard Pricing**

| Plan Tier | Proposed Monthly Price | Confirmed Annual Price (12x Monthly) | Effective Annual Discount | Confirmation Status |
| :--- | :---: | :---: | :---: | :---: |
| **Starter** | ₹199 / month | **₹2,388 / year** | 0.00% (Standard 12x) | **CONFIRMED BY PRODUCT OWNER** |
| **Growth** | ₹499 / month | **₹5,988 / year** | 0.00% (Standard 12x) | **CONFIRMED BY PRODUCT OWNER** |
| **Sovereign** | ₹1,000 / month | **₹12,000 / year** | 0.00% (Standard 12x) | **CONFIRMED BY PRODUCT OWNER** |

**Governance Constraints:**
- Annual pricing strictly follows twelve times the proposed monthly rate with zero initial discount.
- All amounts remain illustrative, unpublished proposals; zero commercial schedules published to production.
- Commercial prices remain dynamically configurable through versioned `CommercialPriceSchedule` records.

---

### CP-02 — Sovereign Employee Capacity and Overage
**Confirmed Selection:** **Included Capacity: 100 Employees per Workspace | Overage Billing: Prohibited**

- **Included Capacity:** 100 employees per tenant workspace for the ₹1,000/month Sovereign tier.
- **Overage Policy:** **Prohibited.** Workspaces exceeding 100 employees must follow an approved custom upgrade or enterprise sales-assisted workflow.
- **Confirmation Status:** **CONFIRMED BY PRODUCT OWNER**

**Implementation Constraints:**
- Enforce the 100-employee ceiling at the workforce and subscription boundary.
- Prevent unauthorized seat limit bypass.
- Preserve accepted Phase A3.6 downgrade capacity guards (`409 DOWNGRADE_CAPACITY_EXCEEDED`).
- **Data Safety:** Never silently delete, truncate, or deactivate employee records when capacity is reached.
- Zero overage charges or fees shall be invented or assessed.

---

### CP-03 — Standalone Modules and Add-on Pricing
**Confirmed Selection:** **Defer Module and Add-On Price Schedules**

The following standalone products and workspace add-ons are deferred from commercial price publication at this time:
- Standalone ERP Modules: **POS (`pos`)**, **CRM (`crm`)**, **Finance (`finance`)**
- Workspace Add-Ons: **Biometric Sync (`biometric-sync`)**, **WhatsApp Alerts (`whatsapp-alerts`)**
- **Confirmation Status:** **CONFIRMED BY PRODUCT OWNER**

**Governance Constraints:**
- Do not create, seed, or publish commercial price schedules for these modules/add-ons as part of this decision.
- Preserve their independently identifiable, workspace-bound entitlements in `TenantModule` and `TenantAddon`.
- Preserve the accepted Option 3A standalone invoicing architecture (`BillingInvoice.subscriptionId = null`).
- Prepare separate pricing proposals only after subsequent explicit Product Owner direction.

---

### CP-04 — Existing Subscriber Repricing
**Confirmed Selection:** **Perpetual Grandfathering**

Existing subscribers retain their initial agreed contracted price for as long as their subscription remains continuously active, subject to documented contract terms.

- **Confirmation Status:** **CONFIRMED BY PRODUCT OWNER**

**Governance Constraints:**
- Publishing a new price schedule must **never** silently alter an existing tenant's subscription price.
- New prices apply only to new checkouts or voluntary plan changes according to published effective schedules.
- Historical order and invoice snapshots remain permanently immutable.
- Subscription cancellation, reactivation, plan transitions, and exceptions must follow explicitly codified rules.
- Any future modification to the grandfathering policy requires a separate formal decision and contractual customer notice review.

---

## 3. Limited Technical Authorizations (TR-01 & TR-02)

### TR-01 — Payment Gateway Integration Architecture
**Authorization Status:** **AUTHORIZED FOR TECHNICAL SPECIFICATION DESIGN ONLY**

**Authorized Scope:**
- Prepare a technical architecture specification for `CommerceOrder` checkout initiation (`POST /api/commerce/checkout/initiate`) and webhook verification (`POST /api/commerce/webhook`).
- Detail cryptographic HMAC SHA256 timing-safe signature verification, order amount/currency validation, idempotency key tracking, transactional consistency, and dead-letter handling.
- Gated strictly to sandbox/test credentials in non-production environments.
- Verify that order fulfillment (`fulfillOrder`) and entitlement activation occur only upon trusted payment confirmation (`order.status === "PAID"`).

**Strict Restrictions:**
- **No live Razorpay credentials or secrets.**
- **No live charges or real monetary transactions.**
- **No production webhook activation.**
- **No production checkout enablement.**
- **Sandbox implementation requires a separately documented scope approval.**

---

### TR-02 — Database Migration, Backup, and Rollback Readiness
**Authorization Status:** **AUTHORIZED FOR READ-ONLY AUDIT & PROCEDURE SPECIFICATION ONLY**

**Authorized Scope:**
- Forensically review migration history and the absence of `_prisma_migrations` in the database.
- Document PgBouncer transaction-pooling limitations (port 6543) and specify direct session connection (`DIRECT_URL`, port 5432) requirements for DDL operations.
- Audit migration ordering, lock safety (`SET lock_timeout = '5s'`), and rollback feasibility.
- Document proposed migration execution and automated rollback runner procedures.
- Detail `pg_dump` snapshot commands and restoration verification prerequisites.

**Strict Restrictions:**
- **Do not connect to the production VPS or production database.**
- **Do not execute migrations, DDL, or database alterations.**
- **Do not create, restore, or modify production backups.**
- **Do not execute rollback scripts.**
- **Do not alter database configuration or credentials.**

---

## 4. Summary Table of Confirmed Dispositions

| Item | Scope | Confirmed Disposition | Governance Status |
| :--- | :--- | :--- | :---: |
| **CP-01** | Annual Billing Model | Option B: Full 12-month standard pricing (Starter ₹2,388, Growth ₹5,988, Sovereign ₹12,000) | **CONFIRMED** |
| **CP-02** | Sovereign Capacity | Included limit: 100 employees; overage billing prohibited | **CONFIRMED** |
| **CP-03** | Standalone Modules & Add-Ons | Defer module/add-on pricing schedules; preserve standalone invoicing | **CONFIRMED** |
| **CP-04** | Existing Subscriber Repricing | Perpetual grandfathering at agreed rate; no silent repricing | **CONFIRMED** |
| **TR-01** | Payment Gateway Architecture | Authorized for technical sandbox specification design | **AUTHORIZED (DESIGN ONLY)** |
| **TR-02** | Database & Migration Readiness | Authorized for read-only audit and procedure documentation | **AUTHORIZED (AUDIT ONLY)** |

---

## 5. Stop Condition & Production Release Status

```
+-------------------------------------------------------------------------+
|                        FINAL GOVERNANCE STATUS                          |
|                                                                         |
|            POLICIES CP-01 TO CP-04 FORMALLY CONFIRMED BY OWNER          |
|            TECHNICAL DESIGN SCOPES TR-01 & TR-02 AUTHORIZED             |
|                                                                         |
|            PRODUCTION RELEASE STATUS: STRICTLY NOT AUTHORIZED           |
|            PRICING PUBLICATION STATUS: STRICTLY NOT AUTHORIZED          |
+-------------------------------------------------------------------------+
```
