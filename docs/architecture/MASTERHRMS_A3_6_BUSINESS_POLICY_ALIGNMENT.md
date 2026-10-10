# MASTERHRMS — Phase A3.6 Final Product Owner Business Policy & Architecture Alignment

**Document Version:** 1.0.0  
**Phase:** Phase A3.6 — Owner Acceptance & Governance Gate  
**Date:** October 9, 2026  
**Auditor:** Google Antigravity Systems & Governance Audit Agent  
**Execution Mode:** Architecture Review, Policy Alignment & Design Documentation Only (Zero Code, Schema, or Production Mutations)  

---

## 1. Executive Summary & Governance Mandate

This document establishes the comprehensive architectural review and policy alignment for the MASTERHRMS platform following the Product Owner's final business directives for Milestone A3.

### Core Alignment Directives:
1. **Workspace Is the Authoritative Tenant Boundary:** All subscriptions, modules, add-ons, billing records, and operational data must be strictly scoped to their owning workspace. Consolidated checkout must never blur or compromise workspace boundaries or the independent identity of add-ons.
2. **OD-1 (Dynamic Commercial Pricing):** Subscription and add-on pricing must not be permanently hardcoded static constants. The architecture must support administrator-configurable, versioned commercial pricing with effective dates, currency, and tax attribution. Price snapshots remain immutable per order and invoice.
3. **OD-3 (Standalone Workspace Add-ons with Consolidated Checkout & Renewal):** Add-ons must remain independent commercial products and identifiable entitlements belonging to specific workspaces. Customers can purchase and renew them in consolidated checkouts alongside base subscriptions without merging their underlying lifecycle identities.
4. **OD-10 (Renewal-Based Plan Changes with Super Admin Override):** Ordinary plan changes are scheduled to take effect at the next subscription renewal, preserving active plans and paid value until the cycle end. Properly authorized platform Super Admins may execute immediate, audited overrides under strict operational controls.

> [!IMPORTANT]
> **Strict Governance Boundary:**  
> This document is an **architectural impact analysis and policy design document only**. In accordance with Phase A3.6 constraints:
> - No application source code has been altered.
> - No database schema migrations have been generated or executed.
> - No database records have been mutated.
> - No live payment gateway credentials or live payment captures have been activated.
> - Formal acceptance of Phase A3.6 and production deployment remain strictly subject to explicit Product Owner sign-off.

---

## 2. Core Architecture Principle: Workspace as the Authoritative Tenant Boundary

### 2.1 Codebase Mapping: Tenant vs. Workspace Identity
In the MASTERHRMS codebase, the PostgreSQL model representing an organizational workspace is `model Tenant` ([`server/prisma/schema.prisma:80-160`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L80)):
- Each workspace possesses a unique immutable UUID (`tenant.id`), a slug (`tenant.slug`), organizational metadata, timezone, and currency.
- All SaaS entitlements and business entities maintain a mandatory `tenantId` foreign key referencing `Tenant.id`:
  - **Core Subscriptions:** `model TenantSubscription` ([`schema.prisma:1078`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L1078)) (`tenantId String @unique`)
  - **Standalone ERP Modules:** `model TenantModule` ([`schema.prisma:3561`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L3561)) (`@@unique([tenantId, moduleKey])`)
  - **Add-on Entitlements:** `model TenantAddon` ([`schema.prisma:1288`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L1288)) (`@@unique([tenantId, addonSlug])`)
  - **Commerce Orders:** `model CommerceOrder` ([`schema.prisma:1166`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L1166)) (`tenantId String @map("tenant_id")`)
  - **Billing Invoices:** `model BillingInvoice` ([`schema.prisma:1115`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L1115)) (`tenantId String @map("tenant_id")`)
  - **Audit Logs:** `model AuditLog` ([`schema.prisma:5238`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L5238)) (`tenantId String @map("tenant_id")`)
  - **Core Business Data:** `Employee`, `Attendance`, `LeaveRequest`, `Payslip`, `Asset`, `JobPosting`, `BiometricDevice` are all partitioned by `tenantId`.

### 2.2 Workspace Isolation Mechanisms
1. **Host-to-JWT Tenant Binding Enforcement:**
   - Implemented in [`server/src/middleware/auth.ts:30-45`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/middleware/auth.ts#L30):
   ```typescript
   if (tenantId && tenantId !== resolvedTenant.id) {
     return res.status(403).json({
       error: "Tenant host mismatch: Authenticated workspace does not match the requested host workspace.",
       code: "TENANT_HOST_MISMATCH"
     });
   }
   ```
   - Prevents cross-workspace privilege escalation: changing a workspace parameter in an API request fails immediately with 403 Forbidden.
2. **Entitlement Isolation & Module Gating:**
   - Implemented in [`server/src/middleware/entitlements.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/middleware/entitlements.ts):
   - Standalone modules (POS, CRM, Finance) query `TenantModule` using `[tenantId, moduleKey]`.
   - Add-on features query `TenantAddon` using `[tenantId, addonSlug]`.
   - An add-on enabled for Workspace A is physically and logically isolated from Workspace B.
3. **Super Admin vs. Workspace Admin Privileges:**
   - Workspace administrators possess roles scoped strictly to their `tenantId` (`UserRole.tenantId == tenantId`).
   - Platform `super_admin` accounts are separated. When a Super Admin accesses a workspace, line 63 of `auth.ts` writes a mandatory audit entry (`SUPER_ADMIN_WORKSPACE_ACCESS`) to `audit_logs` tracking the actor ID, email, IP, and target workspace.
4. **Commerce Anti-Enumeration:**
   - Order retrieval and simulated checkout ([`server/src/routes/commerce.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/commerce.routes.ts)) query orders by `[id, tenantId]`. Cross-tenant queries return a generic 404 without leaking order existence (`VM-13`, `E2E-5.2`).

---

## 3. OD-1 Decision Record: Dynamic Commercial Pricing Architecture

### 3.1 Proposed Policy Formulation
**DYNAMIC, VERSIONED, ADMINISTRATOR-CONFIGURABLE COMMERCIAL PRICING**

### 3.2 Evaluation of Current Implementation vs. Final Business Rules
- **Current State:**
  - `server/src/config/commerce-pricing.config.ts` stores fallback constants (Starter ₹199, Growth ₹499, Sovereign ₹1,499) with environment variable overrides. If in production with no approved price, it returns `null` (fail-closed).
  - Line items in `CartCalculatorService.calculate()` and `unified-catalog.service.ts` look up prices from memory config.
- **Product Owner Policy Realignment:**
  - The example prices (₹199, ₹499, ₹1,499) are **proposals only** and must never be treated as hardcoded static values.
  - Authorized administrators (`super_admin` / commercial billing managers) must be able to create, review, and publish new price schedules.
  - Price changes must be versioned with effective date ranges (`effective_from`, `effective_to`), currency (`INR`), applicable tax slabs (18% GST), and audit attribution (`created_by_user_id`).
  - **Immutable Price Snapshots:** The agreed price snapshot on each `CommerceOrder` and `BillingInvoice` remains frozen permanently. Changing a catalog price must never retroactively alter existing orders or issued invoices.
  - **Existing Subscriptions at Renewal:** Existing active subscriptions must not automatically experience unapproved price hikes. Subscriptions are grandfathered at their initial agreed price until an explicit renewal repricing policy and scheduled customer notification workflow are authorized by the Product Owner.
  - **Fail-Closed Production Checkout:** If an item lacks an active, approved commercial price schedule, production checkout strictly declines the transaction (`PRICE_CONFIGURATION_MISSING`).

### 3.3 Target Architecture Design (Proposed Phase A4 Scope)
To implement dynamic administrator-configurable pricing without compromising immutability:
```prisma
// Proposed Future Model (Design Phase Only — No Migration Executed)
model CommercialPriceSchedule {
  id             String    @id @default(uuid()) @db.VarChar(36)
  productSlug    String    @map("product_slug") @db.VarChar(100)
  currency       String    @default("INR") @db.VarChar(10)
  amountMonthly  Decimal   @map("amount_monthly") @db.Decimal(12, 2)
  amountAnnual   Decimal?  @map("amount_annual") @db.Decimal(12, 2)
  version        Int       @default(1)
  status         String    @default("DRAFT") @db.VarChar(20) // DRAFT, PUBLISHED, ARCHIVED
  effectiveFrom  DateTime  @map("effective_from")
  effectiveTo    DateTime? @map("effective_to")
  publishedBy    String    @map("published_by") @db.VarChar(36)
  publishedAt    DateTime? @map("published_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  @@index([productSlug, status, effectiveFrom])
  @@map("commercial_price_schedules")
}
```

---

## 4. OD-3 Decision Record: Standalone Workspace Add-ons with Consolidated Checkout & Renewal

### 4.1 Proposed Policy Formulation
**WORKSPACE-BOUND STANDALONE ADD-ONS WITH CONSOLIDATED CHECKOUT AND RENEWAL**

### 4.2 Business Rule Alignment
1. **Independent Entitlement Identity:**
   - Standalone ERP products (`pos`, `crm`, `finance`) and add-ons (`biometric-sync`, `google-workspace`) represent independent commercial products.
   - Each provisioned entitlement belongs to a specific workspace and is stored in `TenantModule` or `TenantAddon`.
   - Standalone add-ons do not require a base HRMS plan (`TenantSubscription`) to function.
2. **Consolidated Cart, Checkout & Settlement:**
   - A customer purchasing or renewing their workspace subscription can select eligible add-ons within the same transaction.
   - `CartCalculatorService` aggregates multiple products into a single order with itemized tax and pricing snapshots.
   - Payment settlement executes atomically via `CommerceOrderService`.
3. **Consolidated vs. Independent Provisioning:**
   - In `CommerceFulfillmentService.fulfillOrder`, a single PostgreSQL transaction (`tx`) updates:
     - `TenantSubscription` (for base plans)
     - `TenantModule` (for standalone ERP modules)
     - `TenantAddon` (for add-on services)
     - Order `fulfillmentStatus = 'FULFILLED'`
     - Outbox event `status = 'PROCESSED'`
   - Each target model retains its independent data identity, expiration, and renewal timestamps.

### 4.3 Architecture Evaluation: Option 3A vs. Option 3B for Invoicing

| Evaluation Criteria | Option 3A: Nullable `BillingInvoice.subscriptionId` | Option 3B: Dedicated `CommerceReceipt` / `DirectInvoice` Model |
| :--- | :--- | :--- |
| **Referential Integrity** | `subscriptionId` becomes optional (`String?`). Invoices for standalone purchases link to `tenantId` with `subscriptionId = null`. | Maintains `BillingInvoice.subscriptionId` as strictly non-null for subscriptions. Introduces a separate table for direct module/addon purchases. |
| **Tax & Invoice Sequencing** | Single unified invoice sequence (`INV-YYYY-XXXXX`) for all workspace revenue, compliant with standard GST statutory invoicing rules. | Requires either dual sequencing (`REC-XXXX` vs `INV-XXXX`) or a shared cross-table sequence generator to prevent sequence gaps. |
| **Workspace Scoping** | Invoices remain strictly scoped by `tenantId`. Standalone purchases queryable via existing billing APIs. | Queries must union `BillingInvoice` and `CommerceReceipt` to display complete workspace billing history. |
| **Migration Risk** | **Low:** Single non-breaking column alteration (`ALTER TABLE billing_invoices ALTER COLUMN subscription_id DROP NOT NULL`). | **Medium:** Creates a new table, new relations, new controllers, new services, and new frontend receipt viewers. |
| **Architectural Cohesion** | Unifies all financial transactions under the authoritative `BillingInvoice` domain. | Creates duplicate invoice structures (subtotal, taxes, GSTIN, discounts) across two tables. |

### 4.4 Architectural Recommendation: **Option 3A**
Option 3A is recommended from an architectural standpoint because GST compliance and financial reporting require a unified, chronological tax invoice sequence per tenant. Standalone purchases are genuine commercial sales requiring valid GST tax invoices, not informal receipts. Making `subscriptionId` nullable preserves the database model while supporting standalone, add-on, and mixed consolidated orders.

*Note: In accordance with audit boundaries, neither option is executed at this time; this remains a design recommendation for future implementation authorization.*

---

## 5. OD-10 Decision Record: Renewal-Based Plan Changes with Controlled Super Admin Override

### 5.1 Proposed Policy Formulation
**SCHEDULE NORMAL PLAN CHANGES FOR THE NEXT RENEWAL; ALLOW AUDITED SUPER ADMIN OVERRIDES UNDER EXPLICIT CONTROLS.**

### 5.2 Required Normal Plan-Change Behavior
1. **Deferred Execution Until Next Renewal:**
   - When a workspace administrator selects an upgrade or downgrade, the change does **not** immediately mutate `TenantSubscription.planId` or reset billing periods.
   - The active subscription, current period dates, active seat capacities, and enabled modules remain 100% active and untouched until `currentPeriodEnd`.
   - The system records a scheduled change request:
     - Target plan ID (`scheduledPlanId`)
     - Target seat count / parameters
     - Scheduled effective date (`scheduledEffectiveDate = currentPeriodEnd`)
     - Request timestamp and requesting user ID.
2. **Renewal Execution:**
   - At the end of the billing period, the automated renewal sweeper claims the scheduled change.
   - The invoice for the new billing cycle is generated based on the target plan's published price.
   - Upon successful payment settlement, the subscription transitions to the target plan atomically.
   - If payment fails, the subscription enters the approved grace period or past-due state; it does not silently activate an unpaid plan.
3. **Downgrade Capacity Validation:**
   - When a downgrade is requested (e.g. Sovereign 500 seats -> Growth 100 seats), the system checks active workspace usage (e.g. active employee count).
   - If active employee count exceeds target capacity (e.g. workspace has 140 active employees), the downgrade request is declined with `DOWNGRADE_CAPACITY_EXCEEDED` until the workspace administrator deactivates excess profiles.
4. **Elimination of Mid-Cycle Proration Ambiguity:**
   - Scheduling plan changes for the renewal date cleanly solves the commercial proration dilemma: **customers receive the full 100% paid value of their current cycle**, eliminating complex unspent credit math, refunds, or unfair value forfeiture.

### 5.3 Controlled Super Admin Override Protocol
Platform administrators occasionally require emergency or contract-based mid-cycle adjustments:
1. **Audited Override Controls:**
   - Only users with verified `super_admin` role can initiate an immediate override.
   - Must require an operational change ticket identifier and mandatory justification notes.
2. **Transactional State Audit:**
   - Immediate override persists an immutable record in `SubscriptionPolicyAudit`:
     - `actorUserId`: Super Admin ID
     - `before`: Previous plan, max seats, period dates, billing interval
     - `after`: Target plan, new limits, explicit billing cycle adjustment
     - `metadata`: Incident ticket ID, financial settlement notes.
3. **Financial Terms Specification:**
   - Super Admin must explicitly specify financial terms during an override:
     - Option A: Immediate charge generated via manual invoice.
     - Option B: Complimentary/goodwill administrative adjustment (zero monetary charge).
     - Option C: Contractual invoice billed out-of-band.

### 5.4 Clarification Regarding Historical Option 10C
Historical Option 10C described *immediate mid-cycle co-terminus proration*. The Product Owner's policy establishes **renewal-based scheduling** as the primary business model. Co-terminus billing is preserved only as an optional pricing calculation for immediate add-on attachments purchased mid-cycle (aligning add-on renewal dates with the workspace's main subscription renewal).

---

## 6. Workspace Isolation Audit: Comprehensive Review

| Architectural Layer | Isolation Mechanism | Verified Repository File | Audit Assessment |
| :--- | :--- | :--- | :--- |
| **Database Models** | Foreign Key Scoping to `Tenant.id` | [`schema.prisma:80-160, 1078, 1288, 3561`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma) | **SOLID:** All operational models maintain foreign key relations with `onDelete: Cascade` or `Restrict` to `tenants`. |
| **API Authentication** | Host-to-JWT Tenant Binding | [`server/src/middleware/auth.ts:34-45`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/middleware/auth.ts#L34) | **SOLID:** Non-super-admin tokens attempting to access foreign host workspaces receive 403 `TENANT_HOST_MISMATCH`. |
| **Session Reflection** | Request-scoped profile lookup | [`server/src/routes/auth.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/auth.routes.ts) | **SOLID:** `/api/auth/me` resolves tenant ID from verified JWT and queries enabled modules dynamically. |
| **Commerce Routes** | Anti-enumeration tenant scoping | [`server/src/routes/commerce.routes.ts:160-198`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/commerce.routes.ts#L160) | **SOLID:** Order queries strictly require matching `tenantId`; cross-tenant requests yield fail-closed 404 without metadata leakage. |
| **Fulfillment Engine** | Interactive row locking & tenant check | [`commerce-fulfillment.service.ts:138-143`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L138) | **SOLID:** `fulfillOrder` throws 404 if `order.tenant_id !== tenantId`. |
| **Outbox Worker** | PostgreSQL row lock & event isolation | [`commerce-fulfillment.service.ts:427-439`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts#L427)<br>[`outbox.service.ts:110`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/outbox.service.ts#L110) | **SOLID:** Worker uses `FOR UPDATE SKIP LOCKED`. Realtime worker excludes `COMMERCE_ORDER_PAID`. |
| **Background Cron Jobs** | Shared database context fallback | [`server/src/context/tenant-context.ts:39-41`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/context/tenant-context.ts#L39) | **OBSERVATION:** Background cron workers operate across all tenants via shared Prisma client; each query must explicitly filter `where: { tenantId }`. All existing batch queries adhere to this pattern. |

---

## 7. Architecture Impact Matrix (Proposed Implementation Scope)

| Component / Layer | File / Model Affected | Proposed Design Changes | Technical Risk | Prerequisites & Dependencies |
| :--- | :--- | :--- | :---: | :--- |
| **Dynamic Pricing** | New model `CommercialPriceSchedule`<br>[`commerce-pricing.config.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/config/commerce-pricing.config.ts) | Introduce dynamic database-backed price schedules with publishing workflow, versioning, and cache. | Low | Admin UI, role authorization for price publishing. |
| **Catalog Resolver** | [`unified-catalog.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/unified-catalog.service.ts) | Query active published price schedule with fallback to approved baseline. | Low | Database pricing model. |
| **Invoicing Model** | `model BillingInvoice` in [`schema.prisma`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma#L1115) | Adopt Option 3A (make `subscriptionId` nullable) to support standalone module tax invoices. | Low (Design Phase) | Owner authorization for future schema migration. |
| **Plan Change Scheduling** | `model TenantSubscription`<br>[`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts) | Add `scheduledPlanId`, `scheduledAt` to `TenantSubscription`. Defer mid-cycle customer plan switches to next renewal date. | Medium | Scheduled renewal cron processor. |
| **Super Admin Override** | [`commerce-fulfillment.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/commerce-fulfillment.service.ts)<br>[`commerce.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/commerce.routes.ts) | Dedicated `POST /api/commerce/admin/subscription/override` route with mandatory incident ticket ID and step-up authorization. | Low | `SUPER_ADMIN` RBAC and audit logging. |

---

## 8. Migration Impact Assessment (Design Document Only)

> [!NOTE]
> **No DDL Execution:** In accordance with audit boundaries, no migrations are applied. This assessment serves as a forward-looking design document.

### Required Schema Evolution for Proposed Policies:
1. **`BillingInvoice` Nullability (Option 3A):**
   - DDL: `ALTER TABLE billing_invoices ALTER COLUMN subscription_id DROP NOT NULL;`
   - Risk: Zero data loss. Fully backward compatible with all existing subscription invoices.
2. **`TenantSubscription` Scheduled Plan Fields:**
   - DDL: Add `scheduled_plan_id VARCHAR(100)` and `scheduled_at TIMESTAMP WITH TIME ZONE`.
   - Risk: Additive non-breaking nullable columns.
3. **`CommercialPriceSchedule` Table:**
   - DDL: New independent table. Zero impact on existing tables.

---

## 9. Comprehensive Regression Test Plan

Before implementing the proposed policies in a future authorized phase, the following regression test matrix must be executed:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    A3.6 POLICY ALIGNMENT REGRESSION TEST MATRIX                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 1. Workspace Boundary Tests (5 tests)                                           │
│    - Cross-workspace header tampering returns 403 TENANT_HOST_MISMATCH          │
│    - Add-on in Workspace A strictly inaccessible from Workspace B               │
│    - Super Admin access generates immutable SUPER_ADMIN_WORKSPACE_ACCESS audit  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 2. Dynamic Pricing & Snapshot Tests (4 tests)                                   │
│    - New order captures current published price snapshot                       │
│    - Modifying catalog price leaves existing order/invoice snapshots unchanged  │
│    - Missing approved price schedule in production fails closed                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 3. Consolidated Checkout & Independent Add-on Tests (5 tests)                   │
│    - Single checkout provisions Base Plan, Standalone ERP, and Addon in 1 tx    │
│    - Standalone product generates valid tax invoice with nullable subscriptionId│
│    - Standalone add-on renewal extends expiration independently                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 4. Renewal-Based Plan Changes & Super Admin Override Tests (6 tests)             │
│    - Plan change request schedules targetPlan for next renewal                  │
│    - Active plan and seat capacities remain unchanged until currentPeriodEnd    │
│    - Downgrade attempt exceeding active employee count is rejected              │
│    - Super Admin immediate override transitions plan and logs audit before/after│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Product Owner Decision Checklist & Release Gate Register

| Gate ID | Area | Proposed Final Direction | Current Code Status | Owner Decision Required | Production Release Impact |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **OD-1** | **Dynamic Commercial Pricing** | **DYNAMIC, VERSIONED, ADMINISTRATOR-CONFIGURABLE COMMERCIAL PRICING.** Authorize database price schedules, pricing workflows, and price snapshots. Example prices (₹199, ₹499, ₹1,499) treated as proposals only. | Config constants in code; fails closed in production. | **Action Required:** Formally approve the dynamic pricing policy and designate the initial commercial schedule. | **FAIL-CLOSED:** Production checkout remains disabled. |
| **OD-3** | **Standalone Add-ons & Invoicing** | **WORKSPACE-BOUND STANDALONE ADD-ONS WITH CONSOLIDATED CHECKOUT AND RENEWAL.** Adopt **Option 3A** (nullable `subscriptionId`) to issue formal tax invoices for standalone module purchases. | Standalone modules provision `TenantModule`; invoice generation deferred. | **Action Required:** Formally approve Option 3A architecture for future implementation. | **GATED:** Standalone invoicing deferred. |
| **OD-10** | **Subscription Upgrade & Plan Changes** | **SCHEDULE NORMAL PLAN CHANGES FOR THE NEXT RENEWAL; ALLOW AUDITED SUPER ADMIN OVERRIDES UNDER EXPLICIT CONTROLS.** Full paid value preserved; unspent credit math eliminated. | Immediate provisioning; downgrades fail closed. | **Action Required:** Formally approve renewal-based plan change policy and Super Admin override controls. | **GATED:** Live mid-cycle customer upgrades blocked. |

---

## 11. Staged Implementation Proposal (Forward-Looking Plan)

Upon Product Owner authorization, implementation should execute across three controlled stages:

### Stage 1: Commercial Data Models & Invoicing (Option 3A)
- Execute non-breaking schema update: make `BillingInvoice.subscriptionId` nullable.
- Introduce `CommercialPriceSchedule` model.
- Verify zero regression across existing 67 commerce tests.

### Stage 2: Pricing Administration & Catalog Resolution
- Implement price publishing workflow and administrator UI.
- Update `CartCalculatorService` and `UnifiedCatalogService` to resolve active published price schedules with frozen snapshot persistence.
- Enforce fail-closed validation for unconfigured production items.

### Stage 3: Renewal-Based Plan Change Engine & Super Admin Override
- Add `scheduledPlanId` to `TenantSubscription`.
- Update customer plan change API to schedule transitions for `currentPeriodEnd`.
- Integrate renewal sweeper to apply scheduled plan changes upon cycle renewal.
- Implement privileged `POST /api/commerce/admin/subscription/override` endpoint with step-up authentication and audit tracking.
- Expand E2E test suite to validate all renewal scheduling and override flows.

---

## 12. Prior Read-Only Baseline Confirmation

**RECORD OF PRIOR AUDIT STATE (PRE-IMPLEMENTATION):**
Initial Phase A3.6 audit established the read-only baseline with 67/67 passing tests before implementation authorization was granted.

---

## 13. Authorized Implementation & Verification Addendum (October 9, 2026)

Under explicit Product Owner authorization ("Phase A3.6 Final Owner Decision & Controlled Implementation Authorization"), Stages 0 through 3 were executed and verified against the isolated test database environment:

### 13.1 Schema & Migration Foundation (Stage 1)
- **Migration:** Forward migration script `server/scripts/apply_a3_6_governance_migration.cjs` executed against isolated test PostgreSQL instance (`aws-0-ap-south-1.pooler.supabase.com:6543/postgres`).
- **Option 3A (Invoicing):** Altered `billing_invoices.subscription_id` to `DROP NOT NULL` (`is_nullable: YES`). Preserves foreign key relation and referential integrity for existing and future subscription-linked invoices while enabling standalone module invoices.
- **OD-1 (Pricing):** Created `commercial_price_schedules` table with fields `(id, product_slug, version, currency, amount_monthly, amount_annual, tax_percentage, status, effective_from, effective_to, approved_by, approved_at, notes, created_by, created_at, updated_at)` and composite index on `(product_slug, status, effective_from)`.
- **OD-10 (Plan Changes):** Added scheduled plan change fields to `tenant_subscriptions`: `scheduled_plan_id`, `scheduled_at`, `scheduled_effective_date`, `scheduled_by_user_id`, `scheduled_seats`.
- **Prisma Sync:** Updated `server/prisma/schema.prisma` and generated Prisma Client v5.22.0.

### 13.2 Core Services & Routes Implementation (Stage 2)
- **`DynamicPricingService` (`server/src/services/dynamic-pricing.service.ts`):** Implemented lifecycle (`DRAFT` → `PENDING_APPROVAL` → `PUBLISHED` → `ARCHIVED`), active published price lookup with fallback for development, grandfathering check for existing active subscriptions, and fail-closed resolution in production mode.
- **`SubscriptionScheduleService` (`server/src/services/subscription-schedule.service.ts`):** Implemented renewal-based plan change scheduling (`currentPeriodEnd`), employee count capacity validation against target plan (`DOWNGRADE_CAPACITY_EXCEEDED`), customer cancellation of scheduled changes, renewal sweep applicator, and Super Admin immediate override with mandatory support ticket and written justification logged in `SubscriptionPolicyAudit`.
- **`CommerceFulfillmentService` (`server/src/services/commerce-fulfillment.service.ts`):** Updated to generate compliant `BillingInvoice` records with `subscriptionId = null` for standalone orders (Option 3A verified) and distinct line item snapshots.
- **`UnifiedCatalogService` & `CartCalculatorService`:** Updated to resolve active database-published prices dynamically from `DynamicPricingService`.
- **`commerceRouter` (`server/src/routes/commerce.routes.ts`):** Added endpoints for invoice retrieval (`/invoices/:id`), plan change scheduling (`/subscriptions/schedule-plan-change`), plan change cancellation (`/subscriptions/cancel-scheduled-plan-change`), Super Admin override (`/admin/subscription/override`), and price schedule lifecycle management (`/admin/pricing/schedules/*`).

### 13.3 Test Verification & Regression Evidence (Stage 3)
- **New Governance Suite:** Created `src/tests/commerce-governance-a3-6.test.ts` (21 tests across 4 validation tiers). **Result: 21/21 PASS (42.57s)**.
- **Consolidated Sequential Regression:** Executed all 5 commerce suites sequentially (`--fileParallelism=false`): **88/88 PASS (245.53s, exit code 0)**.
- **Static Typecheck:** `npx tsc --noEmit` exited code 0 cleanly with zero errors.
- **Production Build:** `npm run build` compiled cleanly in 7.00s with code 0.

### 13.4 Strict Production Boundaries Maintained
- **Zero production migrations executed.**
- **Zero production customer records altered.**
- **Zero live payment gateway credentials activated.**
- **Phase A3.6 ready for formal Product Owner acceptance.**
