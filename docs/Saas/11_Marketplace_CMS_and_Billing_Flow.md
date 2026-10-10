# 11. Marketplace, CMS, Cart, Checkout and Billing Flow

Mode: **PHASE A3 COMMERCE BACKEND & A3.6 GOVERNANCE FORMALLY ACCEPTED; A3.7 RAZORPAY SANDBOX VERIFIED (93/93 TESTS PASSING); PHASE A4 MARKETPLACE UIS IN PROGRESS.** Context and platform rules are in `10_SaaS_Architecture_Master_Plan.md`; commerce architecture: `docs/architecture/PHASE_A3_COMMERCE_ARCHITECTURE_SPEC.md`, `docs/architecture/MASTERHRMS_A3_6_BUSINESS_POLICY_ALIGNMENT.md`, and `docs/architecture/MASTERHRMS_A3_7_RAZORPAY_SANDBOX_SPEC.md`.

The **same marketplace components** serve three surfaces. Build them once and pass a `context` (`public`, `tenant`, `super`).

| Surface | Host and URL | Who | Difference |
|---|---|---|---|
| Public CMS storefront | `{BASE}/addons`, `/addons/:slug`, `/cart`, `/checkout` | Visitors, prospects | No tenant yet; guest cart; checkout can create the workspace |
| Tenant marketplace | `{workspace}/tenant/marketplace`, `/tenant/marketplace/:slug`, `/tenant/cart`, `/tenant/checkout`, `/tenant/addons` | Tenant Admin | Knows the tenant: shows Installed/Trial/Included, skips signup, prefilled billing |
| Super Admin Add-on Manager | `admin.{BASE}/addons` (or `/super/addons`) | Platform staff | Create and manage the catalog, pricing, moderation, grants |

URL rule: detail pages use an immutable **slug** (`/addons/biometric-attendance`), not the display name. Old slugs and name variants redirect (301) through a slug-history table.

---

## 1. Public add-on listing: `/addons`

**Layout**
- Header: search box (name, tagline, keywords), sort (Popular, Newest, Price low to high, Price high to low, Rating), view toggle **Grid / List** (remembered).
- Left filter panel (drawer on mobile): **Category** (all 8 groups from file 12 with counts), Product (HRMS, CRM, Finance, Platform), Price (Free, Paid, price range), Pricing type (Subscription, One-time, Usage), Region (India, EU, Middle East, Global), Rating, "Works with my plan" (logged-in only).
- Category tabs on top for quick switch: HRMS, Integrations, AI, Security and Settings, Operations, Mobility, Content Management, Finance.
- URL query state: `?q=&category=&view=&sort=&price=&page=` so filters are linkable and SEO-friendly.

**Card (grid) / row (list) fields:** add-on image/icon, name, one-line tagline, category chip, rating and review count, price ("From Rs X/month" or "Free" or "Included in your plan"), badges (New, Popular, Coming soon, Beta, Installed for logged-in tenant), **More details** button (opens detail). Optional quick **Add to cart** in list view.

**Empty/edge states:** no results (clear filters), loading skeletons, "Coming soon" items non-purchasable with "Notify me" capture.

**SEO/performance:** server-render or pre-render listing and detail pages (the storefront must be indexable); sitemap generated from published add-ons; structured data (Product and AggregateRating); Open Graph images; lazy-loaded images; canonical URLs.

---

## 2. Add-on detail page: `/addons/:slug`

**Top section**
- Left: main image with gallery thumbnails.
- Right: name, category, short description, rating and installs, version and last updated, **price** (period selector Monthly / Yearly / One-time per catalog; seat counter for per-user pricing), **Add to Cart**, secondary **Start free trial** (if enabled), **Buy now**, Wishlist (optional). "Requires: HRMS Core" chips with links; incompatible/conflict warnings; "Already installed" state for tenants.
- Add to Cart result dialog: **1. Continue Browsing** | **2. Check Out**.

**Tabs (4)**
1. **Item Details:** detailed usage and benefits (rich text sections with icons), key features list, who it is for, screenshots **Gallery** (lightbox), requirements and dependencies, supported regions and compliance, integrations used, changelog/version history, FAQ.
2. **Review:** rating summary and histogram, sort/filter, review list (stars, title, text, author company, date, "Verified purchase" badge), write a review (only tenants that own/used the add-on; one review per tenant; editable for 30 days), helpful votes, moderation status; replies from the vendor.
3. **Comments:** public Q&A threads (login required to post), threaded replies by other users and staff, report abuse, moderation.
4. **Support:** support policy (response time, channels, included support period), documentation link, video links, **Create Support Ticket** (login required; opens a ticket with `addonId` in the platform support module), contact options, known issues.

**Below the tabs:** **Discover More** (same-category related add-ons, 4 to 8 cards), bundles that include this add-on ("Save 20% with HR Complete Pack"), recently viewed.

---

## 3. Cart: add, view, coupon

| Element | Rules |
|---|---|
| Cart identity | **Guest cart** keyed by a cookie token (stored server-side with expiry); on login/signup it **merges** into the tenant cart. Tenant cart belongs to the tenant (shared by tenant admins) |
| Items | Add-ons, plans, bundles; each line: item, period, seats/quantity, unit price, line total; duplicates merge; already owned add-ons cannot be added again (show "Installed"); dependency check adds a **required** line (for example "Requires HRMS Core") with a prompt |
| Cart page `/cart` (public) and `/tenant/cart` | Item list with change period/seats/remove, **Apply Coupon** field with inline result, **Cart Totals** (subtotal, discount, tax estimate, total, billing period summary, next renewal date), **Proceed to Checkout**, Continue browsing |
| Coupons | Types: percent, fixed, free trial extension, first-order only, specific add-ons/categories/plans, minimum amount, validity dates, usage limit total and per tenant, stackable or exclusive. Errors are specific: expired, not applicable, limit reached, minimum not met |
| Totals | Computed by the **server** on every change (never trust client math); response includes line items, discount breakdown, tax lines, rounding, currency |
| Persistence | Cart saved, abandoned-cart reminder email (optional, with consent) |

---

## 4. Checkout: `/checkout` (public) and `/tenant/checkout` (inside a workspace)

Steps (one page with sections or a stepper):

1. **Account and workspace**
   - Logged-in tenant admin: skipped.
   - Public/guest: choose **Sign in to my workspace** (redirect to workspace login, return to checkout) or **Create new workspace** (company, owner name, email, phone, password, workspace slug with live availability check). The workspace is created in `PENDING_PAYMENT` or `TRIAL` state depending on rules.
2. **Billing details** (Checkout page): company/legal name, contact name, email, phone, **billing address** (line 1, line 2, city, state, pincode, country), GSTIN/VAT number, PAN (optional), PO number, invoice email recipients. Prefilled from the Company Profile (System Settings plan); saved back optionally. Tax is computed from country/state (GST: CGST+SGST vs IGST by place of supply; VAT or reverse charge by region).
3. **Order summary** (items, coupon, taxes, total, billing cycle, renewal terms with consent checkbox, T&C and refund policy link).
4. **Payment:** Razorpay sandbox (`rzp_test_*` credentials only; live mode fail-closed guarded) via `POST /api/commerce/checkout/initiate`. Validates authenticated tenant context, order ownership, server-authoritative amount, and currency (`INR`). Rejects any client-supplied amount. UPI, cards, and netbanking supported in sandbox; bank transfer/offline with manual approval (order stays `PENDING_PAYMENT` until Super Admin marks paid).
5. **Result:** `/checkout/success` (order number, invoice download, "Go to my workspace", installed add-ons list, next-step guides) or failure/retry page with preserved cart.

Security and integrity: Server-side order creation and gateway initiation (`POST /api/commerce/checkout/initiate`), client amounts strictly ignored, payments forensically settled via cryptographic webhook (`POST /api/commerce/webhook`) with timing-safe HMAC SHA-256 verification (`crypto.timingSafeEqual`), duplicate webhook idempotency headers (`X-Idempotent-Replay`), transactional outbox enqueue (`COMMERCE_ORDER_PAID`), reconciliation worker recovery for missed webhooks, zero card credentials stored. Live Razorpay keys (`rzp_live_*`) are blocked by fail-closed production gates until formal release authorization.

---

## 5. State machines

**Order:** `CART -> PENDING (created) -> AWAITING_PAYMENT -> PAID -> FULFILLED` ; side states `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED (partial/full)`.
**Payment:** `CREATED -> AUTHORIZED -> CAPTURED` ; `FAILED`, `REFUND_PENDING`, `REFUNDED`.
**Subscription (per tenant per item):** `TRIAL -> ACTIVE -> PAST_DUE -> GRACE -> SUSPENDED -> CANCELLED/EXPIRED`; `PAUSED` optional; `CANCEL_AT_PERIOD_END` flag.
**Entitlement:** derived from subscription items (`ACTIVE`, `READ_ONLY` during grace, `REVOKED`).
**Add-on install:** `QUEUED -> INSTALLING -> INSTALLED` ; `FAILED` (with retry and log), `UNINSTALLING -> UNINSTALLED (data retained N days)`.
**Coupon redemption:** `RESERVED (at order) -> REDEEMED (on payment) | RELEASED (on failure/expiry)`.

**Fulfillment (on `PAID`, idempotent):**
1. Create/extend subscription items and `TenantEntitlement` rows.
2. Run add-on install hooks (seed roles/permissions, menu entries, settings defaults, templates, jobs) from the manifest.
3. Create invoice (sequence, GST breakup, PDF), send email with invoice.
4. Emit `entitlement.changed` and `addon.installed` realtime events -> tenant menus refresh instantly.
5. Audit log; revenue events to analytics.

---

## 6. Billing rules

| Topic | Rule |
|---|---|
| Periods | Monthly, yearly (discount), one-time/lifetime, usage-based (credits for SMS/AI), per-user/seat |
| Co-terming | Optional: align all add-ons to the plan renewal date with prorated charges |
| Upgrade/downgrade | Immediate upgrade with proration credit; downgrade at period end; seat increases prorated; seat decreases next period |
| Renewals | Auto-renew with reminders at T-14, T-7, T-1 days; manual renewal for offline payers |
| Failed payment (dunning) | Retries on day 1, 3, 5, 7; email and in-app banner; `PAST_DUE` -> `GRACE` (7 days, read-only for paid features) -> `SUSPENDED` |
| Cancellation | Cancel at period end by default; immediate cancel with no refund unless refund policy applies; data retention window then archive |
| Refunds | Rules per policy (for example within 7 days for first purchase); partial refunds; credit notes; coupon handling |
| Taxes | GST India (CGST/SGST/IGST), VAT for EU, configurable tax rates by region; tax-inclusive or exclusive display per region; GSTIN validation |
| Invoicing | Sequential numbering per financial year, credit notes, downloadable PDF, auto email, tenant billing history, Super Admin ledger |
| Currency | Base currency plus display currencies with fixed or daily rates; charge in one currency per order |
| Free/Included add-ons | `source = PLAN` or `GRANT`; no payment; still installed through the same lifecycle |
| Trials | Per add-on trial days, one trial per tenant per add-on, converts automatically or expires with a reminder |

---

## 7. Tenant Admin pages

### 7.1 `/tenant/marketplace` and `/tenant/marketplace/:slug`
Same listing and detail components with tenant context: badges **Installed**, **Included in your plan**, **Trial (X days left)**, **Upgrade needed**; buttons change to **Install** (free/included), **Start trial**, **Add to cart** (paid), **Manage** (installed). No signup step at checkout; billing prefilled.

### 7.2 `/tenant/addons` (My Add-ons)
Tabs: **Installed**, **Trials**, **Available updates**, **History**.
Columns: add-on, category, version, status (Active, Trial, Grace, Suspended, Expired), source (Plan, Purchase, Grant), seats/usage, price and period, next renewal, actions: **Open** (go to its pages), **Settings**, **Enable/Disable** (when not tied to billing), **Update** (new version), **Change seats/period**, **Cancel at period end**, **Renew now**, **View invoice**, **Uninstall**. Usage panels for metered add-ons (SMS credits, AI credits, storage, API calls) with top-up buttons.

### 7.3 Related tenant pages
`/tenant/subscription` (plan, entitlements, quotas, upgrade), `/tenant/billing` (orders, invoices, payment methods, billing address, tax IDs, auto-renew), `/tenant/apps` (module toggles), notifications for renewals and failures.

---

## 8. Super Admin: Add-on Manager

### 8.1 Pages
| Route | Content |
|---|---|
| `/addons` (list) | Table with filters (category, status, product, pricing type), counts of installs, MRR per add-on, bulk publish/unpublish, drag order for featured |
| `/addons/new`, `/addons/:id/edit` | Tabbed editor (below) |
| `/addons/categories` | Category CRUD (name, slug, icon, order, SEO) |
| `/addons/bundles` | Bundles: included add-ons, bundle price, validity |
| `/addons/coupons` | Coupons CRUD and redemption reports |
| `/addons/orders`, `/payments`, `/subscriptions`, `/invoices`, `/refunds` | Commerce operations |
| `/addons/reviews`, `/addons/comments` | Moderation queues (approve, hide, reply, ban) |
| `/addons/support` | Add-on support threads (links to ticket module) |
| `/addons/analytics` | Installs, trials to paid conversion, churn per add-on, revenue, ratings |

### 8.2 Add-on editor tabs and fields
1. **General:** name, **slug** (immutable after publish, history kept), category, product, type (Module / Integration / AI / Security / Content / Finance...), tagline, status (Draft, Published, Coming soon, Beta, Deprecated), visibility (Public, Hidden, Plan-only, Invite-only), featured flag, tags/keywords.
2. **Media:** icon, cover image, gallery (images/video), alt texts, OG image.
3. **Content:** long description (rich), usage and benefits sections, key features, FAQ, documentation links.
4. **Pricing:** price rows per period (monthly, yearly, one-time, per user, usage tiers), currency, trial days, free flag, included-in-plan list, regional price overrides, tax category.
5. **Requirements:** requires (products/add-ons), conflicts, minimum plan, supported regions, minimum platform version.
6. **Technical:** manifest reference, entitlement key, permissions provided, nav entries, settings groups, jobs, webhook events, quotas, install and uninstall hooks, data-retention days.
7. **Versions:** version list (semver), changelog, release date, rollout (all/percentage/specific tenants), rollback.
8. **Community:** reviews/comments allowed, support policy text, support SLA.
9. **SEO:** meta title, description, canonical, schema fields.
10. **Tenant operations:** per-tenant grants, trials, revokes, overrides with reason (audited).

---

## 9. APIs (draft)

| Area | Endpoints |
|---|---|
| Public catalog | `GET /public/addons?category&q&sort&page`, `GET /public/addons/:slug`, `GET /public/addons/:slug/reviews`, `GET /public/addons/:slug/comments`, `GET /public/addons/:slug/related`, `GET /public/categories`, `GET /public/bundles` |
| Community | `POST /addons/:slug/reviews`, `POST /addons/:slug/comments`, `POST /addons/:slug/support-ticket` (auth) |
| Cart | `GET/POST /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:id`, `POST /cart/coupon`, `DELETE /cart/coupon`, `POST /cart/merge` |
| Checkout | `POST /checkout/workspace` (guest create), `POST /checkout/billing`, `POST /checkout/orders`, `POST /checkout/orders/:id/pay`, `GET /checkout/orders/:id` |
| Payments | `POST /payments/razorpay/webhook` (and other gateways), reconcile job, `POST /orders/:id/mark-paid` (super admin, offline) |
| Tenant | `GET /tenant/addons`, `POST /tenant/addons/:id/install|uninstall|enable|disable|update`, `POST /tenant/addons/:id/trial`, `PATCH /tenant/subscriptions/:id`, `GET /tenant/entitlements`, `GET /tenant/invoices` |
| Super admin | `CRUD /super/addons`, `/super/categories`, `/super/bundles`, `/super/coupons`, `/super/orders`, `/super/subscriptions`, `/super/reviews`, `/super/comments`, `POST /super/tenants/:id/addons/grant|revoke` |
| Entitlements | `GET /me/entitlements` (frontend bootstrap), realtime `entitlement.changed` |

Existing endpoints (`GET /api/addons`, `POST /api/addons/:id/subscribe`, `GET /api/addons/my`, Razorpay webhook) are kept as aliases during migration.

---

## 10. Realtime events

`cart.updated` (multi-tab), `order.status_changed`, `payment.captured`, `entitlement.changed`, `addon.installed`, `addon.update_available`, `subscription.past_due`, `subscription.renewed`, `review.published`, `comment.replied`, `domain.verified`. The tenant UI listens to `entitlement.changed` to update sidebar, launcher tiles and locked/unlocked states instantly.

---

## 11. Acceptance tests

1. Visitor opens `/addons`, switches grid/list, filters by category, opens a detail page by slug; old slug redirects.
2. Add to cart shows Continue Browsing / Check Out; cart totals match server; coupon valid and invalid cases.
3. Guest checkout creates workspace, takes payment, activates entitlements; the workspace menu shows the add-on immediately.
4. Existing tenant buys inside `/tenant/marketplace`: no signup step, billing prefilled, invoice with correct GST breakup.
5. Payment webhook delivered twice: only one entitlement activation and invoice.
6. Payment failure keeps cart and shows retry; reconciliation job fixes a missed webhook.
7. Renewal failure moves the add-on to grace then suspended; menu shows locked state with "Renew".
8. Super Admin grants a free trial to a tenant; it expires on time and the tenant is notified.
9. Review allowed only for verified tenants; comment moderation hides content everywhere.
10. Unpublishing an add-on removes it from the storefront but existing tenants keep it.

### 11.1 Verified Test Automation Baseline
- **Phase A3 Core Commerce Suite:** 67/67 tests passing (`commerce-catalog-pricing.test.ts` 20/20, `commerce-order-lifecycle.test.ts` 12/12, `commerce-entitlement-fulfillment.test.ts` 22/22, `commerce-e2e-journey.test.ts` 13/13).
- **Phase A3.6 Commercial Governance Suite:** 21/21 tests passing (`commerce-governance-a3-6.test.ts`).
- **Phase A3.7 Razorpay Sandbox Payment Suite:** 18/18 tests passing (`commerce-razorpay-sandbox.test.ts`).
- **Total Commerce Regression Baseline:** 93/93 unit/integration tests passing (and 106 total with full E2E acceptance suite), zero regressions.
- **TypeScript Compilation:** `npx tsc --noEmit` verified with 0 errors.
