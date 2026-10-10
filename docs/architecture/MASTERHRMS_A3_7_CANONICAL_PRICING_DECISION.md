# MASTERHRMS — Phase A3.7 Dynamic Canonical Pricing Policy Decision Record

**Document Identifier:** `MASTERHRMS-A3.7-PRICING-DECISION-20261009-V2`  
**Document Version:** 2.0.0  
**Effective Date:** October 9, 2026  
**Auditor / Governance Authority:** Product Owner & Google Antigravity Governance Audit Team  
**Decision Status:** **PROPOSAL ONLY — NOT APPROVED FOR PUBLICATION**  
**Production Publication Authority:** **STRICTLY WITHHELD (Requires Separate Formal Owner Authorization)**  

---

## 1. Executive Summary & Mandatory Business Decisions

This document establishes the official commercial pricing governance policy for MASTERHRMS following the formal acceptance of Phase A3.6.

### 1.1 Formal Decision Status
```
+-----------------------------------------------------------------------------------------+
|                                 PRICING DECISION STATUS                                 |
|                                                                                         |
|                      PROPOSAL ONLY — NOT APPROVED FOR PUBLICATION                       |
|                                                                                         |
|   The pricing figures specified herein represent initial proposed monthly prices for    |
|   configuration, architecture alignment, and stakeholder review. They must NOT become   |
|   permanent hardcoded values in application source code, and must NOT be published      |
|   to the production database without separate written Product Owner authorization.      |
+-----------------------------------------------------------------------------------------+
```

### 1.2 Initial Proposed Monthly Pricing Table

| Plan Tier | Product Slug | Proposed Monthly Price | Proposed Currency | Applicable Tax (GST) | Initial Status | Publication Authorization |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Starter** | `starter` | **₹199 / month** | INR | 18.00% | `PROPOSAL / DRAFT` | **NOT APPROVED** |
| **Growth** | `growth` | **₹499 / month** | INR | 18.00% | `PROPOSAL / DRAFT` | **NOT APPROVED** |
| **Sovereign** | `sovereign` | **₹1,000 / month** | INR | 18.00% | `PROPOSAL / DRAFT` | **NOT APPROVED** |

*Mandatory Boundary: These figures are non-binding proposals. They do not constitute approved canonical commercial values, and checkout in production strictly fails closed until authorized schedules are published.*

---

## 2. Dynamic Pricing Governance Principles

### 2.1 Zero Hardcoded Commercial Truth (OD-1)
- The proposed plan prices (₹199, ₹499, ₹1,000) **must never be hardcoded** as immutable constants in application source code or domain business logic.
- Commercial prices are runtime data entities managed through the database-backed `CommercialPriceSchedule` model and `DynamicPricingService`.
- No assumption shall be made that these proposed values will remain static over time.

### 2.2 Versioned Price Schedules & Lifecycle
Pricing is managed through distinct, immutable version records with rigorous state transitions:
```
           +-----------------------+
           |         DRAFT         |  (Created by authorized administrator)
           +-----------+-----------+
                       |
                       v
           +-----------------------+
           |   PENDING_APPROVAL    |  (Submitted for administrative review)
           +-----------+-----------+
                       |
                       v
           +-----------------------+
           |       PUBLISHED       |  (Approved & published by authorized authority)
           +-----------+-----------+
                       |
                       v
           +-----------------------+
           |       ARCHIVED        |  (Superseded by newer version or retired)
           +-----------------------+
```

1. **`DRAFT`:** Proposed pricing schedule created with plan/product slug, currency, monthly amount, optional annual amount, tax percentage, and `effectiveFrom` timestamp.
2. **`PENDING_APPROVAL`:** Frozen draft awaiting review. Ineligible for live catalog resolution.
3. **`PUBLISHED`:** Authoritatively approved schedule. The only state resolved by `DynamicPricingService.getActivePublishedSchedule`.
4. **`ARCHIVED`:** Historical schedule automatically bounded (`effectiveTo = now`) when a newer schedule takes effect, or manually archived.

### 2.3 Fail-Closed Production Behavior
- When `NODE_ENV === "production"`, `DynamicPricingService.resolveProductPricing` strictly enforces that an approved, active, published schedule exists for the requested timestamp.
- If no valid published schedule exists, the service returns `null`, and checkout / cart calculations throw a fail-closed `CONFIGURATION_ERROR`.
- Under no circumstances will the system silently fall back to unapproved development constants or environment variable defaults in production.

### 2.4 Code-Free Future Price Changes
Authorized administrators must be able to propose and enact future commercial adjustments entirely through the dynamic pricing API without modifying application code or redeploying software:
1. Administrator creates a new `DRAFT` schedule (e.g., proposing Starter at ₹249/month with future `effectiveFrom`).
2. The existing published schedule (₹199/month) remains active and unmodified in production.
3. The proposed price (₹249/month) remains inactive in `PENDING_APPROVAL` status.
4. Upon formal owner approval and publication, the new schedule version becomes active as of its `effectiveFrom` timestamp.
5. The prior schedule is automatically archived and bounded in a single transaction.

### 2.5 Existing Customer Grandfathering Protection
- **No Silent Price Hikes:** Publishing a new price schedule **never alters** the recurring price of existing active tenant subscriptions.
- Active subscriptions retain their contracted price per seat / billing interval for the duration of their active term, enforced via `DynamicPricingService.isSubscriptionGrandfathered(subscription)`.
- Repricing existing customers requires a separately authorized migration policy with contractual advance notice, customer consent/opt-out mechanisms, and complete audit logging.

### 2.6 Immutable Commercial Records & Workspace Scoping
- Every `CommerceOrder` and `BillingInvoice` created freezes a complete snapshot of:
  - Unit price, currency, and line item quantity.
  - Applicable tax rate (CGST/SGST/IGST) and tax amounts in minor currency units (paise).
  - Version number and ID of the resolved `CommercialPriceSchedule`.
- Historical orders and invoices are **never recalculated** using subsequent catalog price updates.
- Workspace / tenant boundary is authoritative: cross-workspace access and entitlement transfers are strictly denied.

---

## 3. Commercial Policy Decision Register (CP-01 through CP-04) — Formally Confirmed

The Product Owner has reviewed and formally confirmed the commercial policy choices as recorded below:

| Policy ID | Policy Domain | Confirmed Determination | Governance Status |
| :--- | :--- | :--- | :---: |
| **CP-01** | **Annual Billing Discount Model** | **Option B Confirmed:** Annual price equals 12 times the proposed monthly price with zero initial discount.<br>- Starter: ₹2,388/year<br>- Growth: ₹5,988/year<br>- Sovereign: ₹12,000/year<br>*(Illustrative proposals; unpublished until separate schedule publication)* | **CONFIRMED BY PRODUCT OWNER** |
| **CP-02** | **Sovereign Plan Employee Capacity & Overage** | **100 Employees Ceiling Confirmed:**<br>- Included capacity: 100 employees per tenant workspace.<br>- Overage billing: **Prohibited.**<br>- Workspaces exceeding 100 employees must use sales-assisted upgrade workflow. | **CONFIRMED BY PRODUCT OWNER** |
| **CP-03** | **Standalone Products & Add-Ons Coverage** | **Deferral Confirmed:** Standalone POS, CRM, Finance, Biometric Sync, and WhatsApp Alerts commercial price schedules are deferred from publication. Independently identifiable, workspace-bound entitlements and Option 3A standalone invoicing are preserved. | **CONFIRMED BY PRODUCT OWNER** |
| **CP-04** | **Existing Subscriber Repricing Policy** | **Perpetual Grandfathering Confirmed:** Existing subscribers retain their agreed price continuously for the life of their active subscription. New schedules never silently alter existing subscriptions. Order and invoice snapshots remain permanently immutable. | **CONFIRMED BY PRODUCT OWNER** |

---

## 4. Dynamic Pricing Architecture Review

The current codebase was forensically inspected to determine whether each required dynamic pricing capability is implemented in code versus requiring future work.

| Architecture Capability | Implementation File & Line Reference | Forensic Code Evidence & Status | Capability Verdict |
| :--- | :--- | :--- | :---: |
| **1. Code-Free Price Changes** | `server/src/routes/commerce.routes.ts` (lines 352–475) | Endpoints `POST /api/commerce/pricing/schedules`, `/submit`, `/publish`, `/archive` allow super admins to manage schedules via REST API without code deployments. | **VERIFIED IN CODE** |
| **2. Versioned Schedules & Effective Dates** | `server/prisma/schema.prisma` (lines 1265–1286), `server/src/services/dynamic-pricing.service.ts` (lines 78–115) | Model `CommercialPriceSchedule` enforces auto-incrementing integer `version`, `effective_from`, and `effective_to` timestamps. | **VERIFIED IN CODE** |
| **3. Draft, Approval, Publication & Archival** | `server/src/services/dynamic-pricing.service.ts` (lines 53–217) | Implemented in `createPriceSchedule`, `submitForApproval`, `approveAndPublish`, and `archiveSchedule`. | **VERIFIED IN CODE** |
| **4. Prevention of Overlapping Schedules** | `server/src/services/dynamic-pricing.service.ts` (lines 168–180) | Inside a database transaction, `approveAndPublish` automatically bounds older published schedules for the product (`effectiveTo = now`) and marks them `ARCHIVED`. | **VERIFIED IN CODE** |
| **5. Role-Based Auth & Audit Logging** | `server/src/routes/commerce.routes.ts` (lines 27–33, 355), `dynamic-pricing.service.ts` (lines 187–191) | Protected by `requireAuth` and `isUserSuperAdmin`. Schedules record `createdBy`, `approvedBy`, `publishedBy`, `approvedAt`, `publishedAt`. | **VERIFIED IN CODE** |
| **6. Immutable Order & Invoice Snapshots** | `server/src/services/commerce-order.service.ts` (lines 120–175), `commerce-fulfillment.service.ts` (lines 210–245) | Frozen line items, unit prices, tax amounts, and schedule IDs are captured in `CommerceOrder.items` and `BillingInvoice` records. | **VERIFIED IN CODE** |
| **7. Grandfathering Support** | `server/src/services/dynamic-pricing.service.ts` (lines 287–292) | `isSubscriptionGrandfathered()` ensures active subscriptions retain their agreed amounts. | **VERIFIED IN CODE** |
| **8. Automated Repricing Execution Engine** | N/A (CP-04 confirmed Perpetual Grandfathering) | Not required under confirmed Perpetual Grandfathering policy. | **POLICY SATISFIED** |
| **9. Fail-Closed Checkout Behavior** | `server/src/services/dynamic-pricing.service.ts` (lines 278–284), `cart-calculator.service.ts` (lines 120–135) | In production (`NODE_ENV === "production"`), unapproved pricing returns `null`, and cart calculation throws fail-closed `CONFIGURATION_ERROR`. | **VERIFIED IN CODE** |
| **10. Monthly & Annual Billing Fields** | `server/prisma/schema.prisma` (lines 1269–1270), `dynamic-pricing.service.ts` (lines 259–264) | `CommercialPriceSchedule` supports `amountMonthly` and nullable `amountAnnual`. `resolveProductPricing` maps both. | **VERIFIED IN CODE** |
| **11. Standalone Products & Add-Ons Dynamic Mapping** | `server/src/config/commerce-pricing.config.ts` (lines 230–260) | Schema supports any `productSlug`. Catalog fallback resolves in non-prod. Standalone pricing publication deferred per CP-03. | **ARCHITECTURE SUPPORTED / PUBLICATION DEFERRED** |
| **12. Workspace-Scoped Commercial Boundaries** | `server/src/services/commerce-order.service.ts` (lines 80–115), `commerce-fulfillment.service.ts` (lines 150–220) | Orders, invoices, subscriptions, and entitlements enforce strict `tenantId` boundaries. Cross-tenant access is rejected with `403` or `404`. | **VERIFIED IN CODE** |

---

## 5. Summary of Deliverables & Verification Status

- **Status of Proposed Prices:** Starter (₹199/mo, ₹2,388/yr), Growth (₹499/mo, ₹5,988/yr), Sovereign (₹1,000/mo, ₹12,000/yr) remain strictly `PROPOSAL ONLY — NOT APPROVED FOR PUBLICATION`.
- **Policy Determinations:** CP-01, CP-02, CP-03, and CP-04 are formally confirmed by the Product Owner.
- **Database Status:** Unmodified. Zero rows written to `commercial_price_schedules` on production.
- **Static Verification:** `cd server && npx tsc --noEmit` executed with **Exit Code 0** (clean, zero errors).
- **Next Step:** Proceed with authorized technical design specifications TR-01 (Razorpay Sandbox Spec) and TR-02 (Read-Only DB Audit). Production release remains NOT AUTHORIZED.
