# 20. Add-on Master Execution Prompt (Set 1, HRMS production launch)

> **ROUTE PRECEDENCE NOTICE (added with file 23):** the URLs written as `/addons/{slug}/*` in this file are superseded by `23_Addon_Placement_and_Order_Matrix.md`. Add-on pages now live inside the portals: HR/admin `/hr/addons/{slug}/...`, employee `/me/addons/{slug}/...`, tenant `/tenant/addons/{slug}/...`, public `/public/{slug}/...`. Use the per-add-on route tables and sidebar order in file 23 (paste its PLACEMENT OVERRIDE block with each add-on run). Fields, CRUD, realtime, expiry, zero-mock and test requirements in this file remain valid.


How to use: paste **Part A (the prompt)** to your Antigravity agent once. Then paste one add-on prompt per run from `21_Addon_Execution_Prompts_Set1.md` (Webhook, AI Assistant, AI Document, Planning, 7 strategy tools) and `22_Addon_Execution_Prompts_Set1_Part2.md` (Recruitment, Job Search, Training, Performance, Performance Indicator, Team Workload, Time Tracker, Procurement, LMS), in the order in section 14. Part B contains the explanations and the items I added to make the add-on flow stronger.

Source material: the 20 add-on guides you attached (Webhook, AI Assistant, AI Document, Planning, SWOT, PESTEL, Porter's Five Forces, McKinsey 7-S, Business Model, Business Plan, Marketing Plan, Recruitment, Job Search, Training, Performance, Performance Indicator, Procurement, Team Workload, Time Tracker, LMS). They are product guides from another vendor's software. Implement the **functionality, flows, fields and CRUD** they describe, but use our own UI design, our own wording (through i18n keys) and our branding. Do not copy vendor names, marketing text, screenshots or assets.

---

# PART A: THE PROMPT TO PASTE

```
ROLE
You are the implementation lead for MasterHRMS add-ons. This is an IMPLEMENTATION task (not planning). Stack: React + TypeScript + TanStack Router/Query, Express, Prisma, PostgreSQL (Supabase), Socket.io with outbox, Razorpay (SANDBOX ONLY, live payments stay fail-closed). Reuse the existing platform: host-based tenant resolution, requireEntitlement, TenantAddon, commerce engine (A3), settings service, Media Library, outbox events, audit log, notification service. Do not break existing HR pages, tests or the production HRMS flows. Do not touch CRM, POS, Inventory or Finance apps.

LAUNCH SCOPE
Production launches with HRMS only. Add a platform flag LAUNCH_SCOPE=hrms. When set: CRM, POS, Inventory, Finance(Accounts), Projects and other non-HRMS products are hidden from the sidebar, launcher (shown only as non-purchasable "Coming soon" tiles for the tenant admin, or hidden, per a Super Admin setting), marketplace listings and APIs (403 PRODUCT_NOT_LAUNCHED). Add-ons that depend on a non-launched product follow the dependency decisions in section 7 of the master doc. Nothing is deleted; it is only gated.

NON-NEGOTIABLE RULES
1. Route rule (see 23_Addon_Placement_and_Order_Matrix.md): add-on pages live INSIDE the portals: HR/admin {workspace}.{BASE_DOMAIN}/hr/addons/{slug}/*, employee /me/addons/{slug}/*, tenant /tenant/addons/{slug}/* (cross-cutting add-ons only), public /public/{slug}/*. APIs: admin /api/v1/addons/{slug}/*, self /api/v1/me/addons/{slug}/*, team /api/v1/team/addons/{slug}/*, public /api/v1/public/{slug}/* (keep existing /api/addons/{slug} mounts as aliases). Each page is placed in HR, ME, Tenant or Public exactly as the route tables in file 23 section 4 say. Slug is immutable; legacy slugs and old URLs redirect.
2. Sidebar rule: when an add-on is INSTALLED and ENTITLED it appears automatically in the HR, Employee or Tenant sidebar (per file 23 sections 4 and 5: heading and order) as Menu > Sub-menu > Nested menu. EVERY sub-menu and nested item is its OWN PAGE (own URL, own route file). NO TABS used as navigation. Tabs may only be used inside a page for presenting parts of one record (for example record detail sections). Menus come from the add-on manifest through the Navigation Registry. Nothing is hardcoded in the sidebar component.
3. Everything dynamic: no hardcoded add-on lists, categories, prices, statuses, stages, dropdown options, labels, languages, models, providers, images, URLs, currency symbols, invoice numbers or dummy values. Master data comes from tables (seeded by the add-on install hook with REAL defaults, never fake business data). Texts come from i18n keys. Formats come from settings utilities.
4. Zero mock: delete mock/dummy/sample data and fallback catalogs. On API failure show an error state, never fake data. Demo data exists only through a flagged demo seed for demo workspaces.
5. Vertical slice: for every page you build, deliver DB model + migration, service + validation, API (full CRUD plus actions), permission keys, entitlement guard, UI (list, create, edit, view, delete/confirm, empty/loading/error/forbidden/locked/expired states), realtime events, audit entries, notifications, webhook events, i18n keys, tests. If a CRUD operation is missing anywhere (backend, API or UI), add it.
6. Tenant isolation everywhere (tenant_id on every table, scoped queries, cross-tenant tests).
7. Files only through the Media Library/file API (private files via signed URLs).
8. Realtime: every create/update/delete/status change writes an outbox event and updates open screens in other browsers without reload (query invalidation map generated from the manifest). Kanban moves, comments, counters and dashboards update live.
9. Responsive from 360px to desktop, accessible (keyboard, labels, contrast), dark mode.
10. Report evidence (files, endpoints, tests) for every item; mark anything you could not verify as UNKNOWN.

ADD-ON RUNTIME (build or verify first; Phase R)
R1 Manifest registry: each add-on has a manifest (slug, name, category, version, requires[], routePrefix=/addons/{slug}, nav tree, permissions, settings groups, jobs, events (realtime + webhook), aiFields, widgets, models, install/uninstall/upgrade hooks, pricing refs). Registry validates and rejects collisions.
R2 Catalog as real data: Addon, AddonCategory, AddonPrice (monthly and yearly rows), AddonFeature, AddonMedia, AddonVersion tables with full CRUD for Super Admin (add-ons AND categories). Remove DEFAULT_SUPER_ADDONS, CATEGORY_IMAGES, CMS-page blobs (system-addons-catalog, tenant-*-purchased-addons-*, invoices ledger) from marketplace.tsx. Import once from the old blobs into tables with a report, then retire them. Block tenant writes to those CMS slugs.
R3 Entitlement from server only: purchase/trial/grant creates TenantAddon + subscription rows through the commerce engine; the browser never writes entitlement or invoices. Invoice numbers come from the server sequence.
R4 Install lifecycle: Install -> dependency check -> permissions/roles seeded -> master data seeded -> settings defaults -> sidebar entries live -> optional onboarding page. Uninstall -> hide menu, stop jobs/webhooks/public pages, keep data for the retention period (setting), allow export, reinstall restores.
R5 Expiry and renewal block (spec in section 6 of the master doc): EXPIRED add-on routes render a full-page Renewal Block (not a modal), APIs return 402 ADDON_EXPIRED, renewal unlocks instantly via realtime.
R6 Pricing: every add-on sells on MONTHLY and YEARLY plans from AddonPrice rows set by Super Admin (no hardcoded prices). Prices are owner inputs (section 13); if a price is missing the add-on cannot be published.
R7 Dependencies and cascade (section 7): enforce on install, on entitlement check and on expiry.
R8 Platform contracts every add-on must declare: realtime events, webhook events (feeds the Webhook add-on), aiFields (feeds AI Assistant), jobs (scheduler registry), notification and email template keys, i18n namespace, usage metrics, permissions.

PER-ADD-ON RUNS
After Phase R is accepted, I will paste one add-on prompt at a time (from 21_Addon_Execution_Prompts_Set1.md and 22_Addon_Execution_Prompts_Set1_Part2.md). For each run: (1) audit what already exists (for example /hr/recruitment, /hr/training, /hr/performance pages and APIs, existing slugs recruitment-ats, learning-lms, okr-performance); (2) reuse and MIGRATE existing pages to /addons/{slug}/* with redirects from old URLs, never duplicate; (3) implement missing pieces end to end; (4) remove hardcoded data; (5) run tests; (6) report.

REPORT FORMAT (every run)
Add-on, files changed, tables/migrations, endpoints (method+path), pages (route list matching the sidebar), realtime events, webhook events, jobs, settings keys, permissions, hardcoded/mock items removed (file+line before/after), tests added and results (names, pass/fail), regression suites run, open questions, rollback steps. Stop after each add-on and wait for approval.

SAFETY
No real payments, no secrets in logs or reports, no destructive data changes without a rollback note, no schema changes to existing tables without listing them first. Update the repo worklog (add-on inventory rows, decisions, session log) after every run.
```

---

# PART B: EXPLANATIONS AND ADDED FLOW

## 1. Why the current marketplace is not dynamic (from your `marketplace.tsx`)
- 16 add-ons are hardcoded in `DEFAULT_SUPER_ADDONS`; when the CMS blob is empty or the API fails the page **falls back to them**, so an empty catalog can never exist and deleted add-ons come back.
- Categories are derived from add-on strings, with hardcoded Unsplash images; there is no category entity, so no category CRUD.
- Purchases, installs and invoices are written **from the browser** into CMS-page JSON blobs. A tenant can activate a paid add-on without paying by calling the API; invoice numbers use `Math.random()`.
- `tenantId || "default"` lets users without a profile share one record.
- Launch links (`install_url`) are free text that do not match slugs or the new `/addons/{slug}` rule.
- Five items in that list (HRM suite, CRM pipeline, POS, product catalog, double-entry) are products, not add-ons.
Phase R (R2, R3) fixes all of this.

## 2. Route and sidebar design

| Item | Rule |
|---|---|
| Add-on pages | per file 23: `/hr/addons/{slug}/...`, `/me/addons/{slug}/...`, `/tenant/addons/{slug}/...`; one URL per sidebar item |
| Public pages of an add-on | `/public/{slug}/*` (careers `/careers` alias, vendor portal, LMS website); unauthenticated, rate limited, theming from add-on brand settings, entitlement checked |
| Add-on APIs | `/api/v1/addons/{slug}/...` |
| Marketplace (tenant) | `/tenant/marketplace` and `/tenant/marketplace/{slug}`; manage at `/tenant/addons` |
| Sidebar | Section "Add-ons" (or merged into the HR app group by manifest `app`); each installed add-on is a menu; its manifest nav gives sub-menus and nested menus; all are pages |
| States in sidebar | Active, **Expiring** (amber dot), **Expired** (lock icon; click opens the Renewal Block page), **Locked** (not purchased; admin sees "Add" chip linking to marketplace; non-admin hidden) |
| Existing HR pages | Recruitment, Training and Performance already exist under `/hr/...`. Migrate to `/addons/recruitment/*`, `/addons/training/*`, `/addons/performance/*`, keep redirects from old URLs, and remove their entries from the base HR sidebar so that **base HRMS does not expose paid add-on pages** (decision D-018 packaging to be confirmed by you) |

Sidebar integration details: menu tree from manifest with `labelKey`, `icon`, `route`, `permission`, `badgeSource`; active highlight from route match; collapsed rail shows icons with flyout; mobile drawer; menu entries appear/disappear live on `entitlement.changed` without reload.

## 3. Naming and slug mapping for this set

| Add-on (doc) | Canonical slug | Legacy slug to alias (if found in repo) |
|---|---|---|
| Webhook | `webhook` | |
| AI Assistant | `ai-assistant` | `ai-copilot-studio`, `ai-content-generator` (reconcile) |
| AI Document | `ai-document` | `ai-writer` |
| Planning | `planning` | |
| SWOT Analysis | `swot-analysis` | |
| PESTEL Analysis | `pestel-analysis` | |
| Porter's Five Forces | `porters-five-forces` | |
| McKinsey 7-S | `mckinsey-7s` | |
| Business Model | `business-model` | |
| Business Plan | `business-plan` | |
| Marketing Plan | `marketing-plan` | |
| Recruitment | `recruitment` | `recruitment-ats` |
| Job Search | `job-search` | |
| Training | `training` | |
| Performance | `performance` | `okr-performance` (reconcile: OKR/360 vs indicators-goals-reviews) |
| Performance Indicator (gamification) | `performance-indicator` | |
| Procurement | `procurement` | |
| Team Workload | `team-workload` | |
| Time Tracker | `time-tracker` | |
| LMS | `lms` | `learning-lms` |

Note: **Performance Indicator is a different add-on from Performance.** The guide describes gamification (teams, challenges, achievements, XP, levels, leaderboard); Performance covers indicators (KPIs), goals, review cycles and reviews. My earlier catalog note to merge them (file 12) is withdrawn: keep both.

## 4. Dependency map (from the guides)

```
HRMS core (base) ── Training ── (cost hook to Accounting if present)
                 ├─ Performance
                 ├─ Recruitment ── Job Search
                 └─ Team Workload (optional links to HRM holidays and Timesheet)
Planning ── SWOT, PESTEL, Porter, McKinsey 7-S, Business Model, Business Plan, Marketing Plan
Projects (not launched) ── Time Tracker, Performance Indicator (project field)
Items master ── Procurement
Webhook (event bridge) and AI Assistant (field hooks) work across whatever is installed
AI Document (templates, generate, history) + shared AI provider settings with AI Assistant
LMS (own public website + orders + coupons)
```

## 5. Pricing and billing rules for add-ons
- Each add-on has **monthly** and **yearly** price rows (currency, amount, tax category, trial days, active flag). Super Admin edits them in the Add-on Manager; tenants see them at the marketplace and renewal pages. No price literal exists in code.
- Yearly: follow your recorded policy (annual billed as agreed in the worklog: your repo says annual = 12 monthly payments; confirm if add-ons follow the same rule or a yearly discount with one payment). The agent must read the existing commerce engine rules and reuse them; if add-ons need a different rule, ask.
- Mixed cart (plan + several add-ons, different intervals) uses the A3 engine; GST invoice per order with server numbering.
- Upgrade monthly -> yearly: immediate with proration credit; downgrade yearly -> monthly at period end.
- Co-terming option (align add-on renewal date to plan) controlled by a Super Admin setting.
- Sandbox payments only until you enable live mode.

## 6. Expiry, intimation and renewal (full flow)

**States (per tenant per add-on):** `TRIAL`, `ACTIVE`, `EXPIRING` (within notice window), `GRACE` (optional, days from setting, default 0), `EXPIRED`, `SUSPENDED` (admin action), `CANCELLED` (at period end), `UNINSTALLED`.

**Intimation timeline (configurable, default):** T-14, T-7, T-3, T-1 days, on expiry day, +3 days, +7 days. Channels: in-app notification, top banner for tenant admins, email, optional broadcast. Messages say which add-on, date, what will be restricted, and have a **Renew** button. Reminder job runs from the scheduler registry; each reminder is idempotent and logged.

**When EXPIRED (block):**
1. **Every page under `/addons/{slug}/*`** renders the **Renewal Block page** (full page, not a modal): add-on name and icon, "Expired on {date}", what is restricted, how long data is kept ({retention} days), primary button **Renew** for tenant admins (opens renewal checkout: choose Monthly or Yearly, coupon, GST summary, pay), secondary **Export my data** (admin), and for non-admin users "Ask your admin to renew" with a **Notify admin** button that sends a realtime/email notice (rate limited). Sidebar entry remains visible with a lock badge so users can reach this page.
2. **APIs** under `/api/v1/addons/{slug}/*` return `402 ADDON_EXPIRED` with `{addonSlug, expiredAt, retentionUntil, renewUrl}`. Read-only export endpoints for admins are allowed during retention.
3. **Public pages** of the add-on (careers, vendor portal, LMS site) show a neutral "temporarily unavailable" page (no data, no details about the tenant's subscription).
4. **Background jobs, webhooks, AI calls and outgoing integrations** of that add-on pause. Incoming public submissions are rejected.
5. **Dependents lock too** (cascade): if Planning expires, SWOT/PESTEL/etc. lock with the reason "Requires Planning"; if Recruitment expires, Job Search locks.
6. Dashboards and widgets of that add-on disappear; global search excludes its records.
7. After retention ends, a purge job archives data after a final reminder (admin can extend retention by renewing).

**Renew flow:** Renewal page -> choose interval -> server creates order -> sandbox payment -> webhook verified -> `TenantAddon` updated -> `entitlement.changed` realtime -> the Renewal Block disappears and the add-on opens **without page reload**; invoice generated; audit entry. Partial period handling: renewing before expiry extends from the current end date; renewing after expiry starts today.

**Super Admin tools:** extend/grant/revoke with reason, view expiry calendar, expiring-soon list, force reminder, change grace/retention per add-on.

**Edge cases to implement and test:** renew in another tab; payment pending (manual bank transfer awaiting approval) keeps the block with "Payment under review"; cancel-at-period-end shows "Ends on"; downgrade; refund; clock/timezone (store UTC, compare per tenant timezone only for display); entitlement cache TTL under 60 seconds plus invalidation on change; offline desktop tracker token expiry.

## 7. Dependency and production-scope decisions (defaults the agent follows unless you change them)

| Topic | Default |
|---|---|
| **Time Tracker needs Projects** | Projects is not launched. Ship a minimal **Time Tracker Projects** (project, task, assignment) inside the Time Tracker add-on so it works in HRMS-only production; when the Projects product launches, switch to it (adapter). |
| **Performance Indicator project field** | Make the project link optional; hidden unless a projects provider exists |
| **Procurement needs an items master** | Include a minimal **Procurement Items** master (name, SKU, unit, price, tax) inside Procurement; later map to Inventory items |
| **Training cost to Accounting** | Record cost on the training; the accounting posting hook activates only when Accounting is installed |
| **Webhook event list** | Built from installed add-ons only (no events for modules that do not exist in production) |
| **AI Assistant field list** | Built from `aiFields` declared by installed add-ons only |
| **Time Tracker desktop app (Windows/Ubuntu)** | Backend API, device registration, token auth, download page and settings are in scope; the native app is a separate deliverable (confirm) |
| **Recruitment/Training/Performance already in base HR** | Moved behind add-on entitlement (confirm packaging D-018) |

## 8. Things missing in the guides that I added (to make the add-on flow stronger)
1. **Manifest-driven install wizard** with dependency check, seeding real master data, and rollback on failure.
2. **Dependency cascade** for expiry and uninstall (section 6 item 5).
3. **Retention and purge policy** per add-on, export-before-purge, restore on reinstall.
4. **Version upgrade hooks** (migrate data when an add-on version changes) and rollout flags.
5. **Add-on health page** for tenant admins: status, expiry date, usage, last error, jobs, webhook failures.
6. **Per-add-on permission sets** with default role grants (Admin, HR, Manager, Staff) and data scopes, replacing hard role checks.
7. **Usage metering** for AI (tokens/credits), screenshots (storage), public site traffic, with quotas and upgrade prompts.
8. **Security for public sites** (careers, vendor portal, LMS): captcha, rate limits, upload scanning/type limits, tracking-ID lookup protection (ID plus email, lockout), no tenant subscription details exposed.
9. **Privacy for monitoring features** (Time Tracker screenshots, gamification leaderboards): employee notice and consent text, tenant policy toggles, retention days, blur/exclude options, access logs of who viewed screenshots.
10. **Import/export (CSV/Excel)** on every list page; bulk actions where useful.
11. **Activity log and audit** per add-on viewable by admins.
12. **Webhook hardening:** signing secret, retries with backoff, delivery log, test button, payload preview, filters, per-event enable (the guide only lists module, method and URL).
13. **AI hardening:** provider and model lists fetched/validated (not hardcoded), key stored encrypted, usage log, content-safety guard, per-tenant on/off per module, timeouts, cost limits.
14. **Notification and email templates** for every add-on event (offer sent, interview scheduled, application received, training assigned, course purchased, RFx published, tracker started, etc.) using the template flow.
15. **i18n namespace per add-on** and language-aware public pages.
16. **Search integration** (global search and command palette include entitled add-on records only).
17. **Dashboards and widgets** per add-on declared in the manifest and shown only when entitled.
18. **Idempotency and concurrency** (409 on stale edits; double submit protection on payment and application forms).
19. **Accessibility and mobile** requirements for every add-on page, and print/PDF exports for reports (offers, plans, certificates).
20. **Analytics events** (installs, activations, renewals, churn reasons) feeding platform analytics.

## 9. Common data, API and UI standards for every add-on
- **Tables:** `id`, `tenant_id`, `created_at/by`, `updated_at/by`, `deleted_at`, `version`; names prefixed by slug family (for example `recruit_*`, `train_*`, `perf_*`, `gami_*`, `proc_*`, `lms_*`, `strat_*`, `tt_*`, `tw_*`, `ai_*`, `wh_*`).
- **API:** list (pagination, search, filters, sort), create, read, update (with `version`), delete (soft; blocked if referenced; returns usage counts), action endpoints for state changes, bulk, import/export, `allowedActions[]` on records.
- **UI:** list with search/filters/sort/pagination/view toggles where the guide specifies (list, grid, kanban, tree, calendar), create/edit as page or drawer (not tabs for navigation), view page with sections, confirm dialogs, toasts, empty states with primary action.
- **Realtime:** `{slug}.{entity}.{created|updated|deleted|status_changed}` plus specialised events (for example `recruitment.application.stage_changed`).
- **Masters:** every dropdown fed from tables ("System Setup" pages) seeded by install hooks with neutral real defaults only.

## 10. Hardcode removal protocol (applies to every add-on run)
1. Search the add-on's existing files for: `mock`, `dummy`, `sample`, `lorem`, static arrays of objects in components, literal statuses/stages/types, currency symbols, `Math.random`, placeholder emails/URLs, external image URLs, default company names, hardcoded provider/model/language lists, `process.env` reads for configurable values.
2. Classify: runtime mock (replace), demo content (move to flagged seed), constants (typed registry), admin-extendable lists (master data tables).
3. Replace with API/master data/settings; add empty and error states; add a test that loads an empty tenant and asserts no sample text.
4. List every removal in the report with file and line.

## 11. Acceptance tests (platform level, every add-on)
- Install -> menu appears live; uninstall -> disappears; reinstall restores data.
- Expire -> every page shows the Renewal Block, API returns 402, public pages unavailable, dependents lock; renew -> unlocks live.
- Direct API call without entitlement/payment cannot create entitlement.
- Cross-tenant access returns 404; permission matrix respected.
- Two-browser realtime on create/update/delete/status change.
- Empty-tenant test: no mock data visible anywhere.
- Monthly and yearly purchase both work in sandbox with correct GST invoice.
- Old URLs redirect to `/addons/{slug}/*`.
- i18n: no literal strings; language switch works on all add-on pages.

## 12. Production checklist for the HRMS-only launch
1. `LAUNCH_SCOPE=hrms` verified: no CRM/POS/Finance/Projects entry points (UI or API) reachable.
2. All 20 add-ons published with monthly and yearly prices, images from Media Library, categories from the category table.
3. Renewal Block, reminders and grace behavior tested with fake clocks.
4. Payment mode: sandbox or live per your decision (live stays fail-closed until you enable it).
5. Backups, jobs registry, monitoring and alerts verified; error tracking on.
6. Security: A1b items closed (add-on self-activation blocked, deny-by-default entitlement map, private file serving, webhook raw body).
7. Support flow ready (tenant to platform tickets) and status/maintenance banners working.
8. Legal pages, cookie consent, privacy notices for monitoring features.
9. Data retention and DPDP settings documented; demo workspace not exposed in production.
10. Rollback plan and a staged rollout (internal tenant, pilot tenants, general).

## 13. Owner inputs required before publishing (I did not invent any prices)

| Add-on | Monthly price | Yearly price | Currency | Trial days | Public site? |
|---|---|---|---|---|---|
| Webhook | | | | | no |
| AI Assistant | | | | | no |
| AI Document | | | | | no |
| Planning | | | | | no |
| SWOT Analysis | | | | | no |
| PESTEL Analysis | | | | | no |
| Porter's Five Forces | | | | | no |
| McKinsey 7-S | | | | | no |
| Business Model | | | | | no |
| Business Plan | | | | | no |
| Marketing Plan | | | | | no |
| Recruitment | | | | | yes (careers) |
| Job Search | | | | | no |
| Training | | | | | no |
| Performance | | | | | no |
| Performance Indicator | | | | | no |
| Procurement | | | | | yes (vendor portal) |
| Team Workload | | | | | no |
| Time Tracker | | | | | no (desktop app) |
| LMS | | | | | yes (LMS website) |

Also needed: grace days (default 0), retention days (default 30), reminder schedule, whether renewals auto-charge, GST rates per add-on, packaging confirmation (D-018), Time Tracker desktop app scope, AI key model (tenant keys vs platform credits), and the questions in section 7.

## 14. Execution order (dependency-safe)
1. **Phase R** (runtime, catalog CRUD, entitlement, expiry/renewal, sidebar, pricing) and acceptance.
2. **Webhook** (event bridge foundation).
3. **AI Assistant** and **AI Document** (shared provider settings, aiFields registry).
4. **Planning**, then **SWOT, PESTEL, Porter, McKinsey 7-S, Business Model, Business Plan, Marketing Plan** (shared strategy engine).
5. **Recruitment** (migrate existing HR pages), then **Job Search**.
6. **Training**, then **Performance**, then **Performance Indicator**.
7. **Team Workload**, then **Time Tracker**.
8. **Procurement**.
9. **LMS**.
After each add-on: report, approval, worklog update.
