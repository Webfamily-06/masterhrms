# 13. A0 Audit Brief (read-only)

Phase A0 of `10_SaaS_Architecture_Master_Plan.md`. Mode: **COMPLETED & APPROVED.** Audit completed; findings and owner decisions (D-017 through D-020) recorded in `worklog.md`. Predecessor gates for A1, A2, A3, and A3.6 executed and formally accepted by Product Owner; Phase A3.7 Razorpay Sandbox payment integration verified (93/93 tests passing). Production deployment and live payment capture remain strictly gated/unauthorized.

Owner directives that shape A0 (2026-10-09):

| Topic | Directive |
|---|---|
| Mixed pricing | Inventory supported billing intervals and price calculation paths. Mark monthly/yearly, one-time, per-user and usage-based pricing separately |
| Hybrid HRMS | Build a capability inventory; propose which capabilities are core, optional add-ons or undecided. Do not enforce new packaging during A0 |
| Standalone CRM | Determine whether CRM routes, APIs and data can operate without an HRMS entitlement. Document dependencies instead of assuming independence is already implemented |
| Subdomains first | Prioritize `{workspace}.{BASE_DOMAIN}` and tenant-bound authentication. Document custom-domain support as a later phase; do not implement domain provisioning during A0 |

---

## 1. Rules for the auditor

1. **Read-only.** No edits, migrations, seeds, config changes, or "quick fixes".
2. **Evidence for every finding:** file path and line range, endpoint, Prisma model/field, or UI route. No evidence = status `UNKNOWN`, not a guess.
3. **Status vocabulary** (same as your docs page plus one): `WORKING`, `PARTIAL`, `MISSING`, `BROKEN`, `UNKNOWN`. Always state what was checked (code read, schema read, or behavior observed).
4. **Do not trust existing documentation.** `docs.tsx` claims (for example "100% core completion", fixed counts of routes/endpoints) are inputs to verify, not facts.
5. **Describe, do not decide.** Where a decision is needed, list options and consequences and add a question to the worklog.
6. Update `hrms-plan/worklog.md` (inventory statuses, decisions, session log) as you go.

---

## 2. A0 scope and non-goals

**In scope:** four focused audits (sections 3 to 6), plus the carry-over audits already defined: route and sidebar inventory (`hrms-plan/04` section 1 checks and worklog page inventories), `docs.tsx` reconciliation, and tenant-isolation review (`10` section 9).

**Out of scope (explicitly not in A0):**
- Enforcing any new packaging, plans, or add-on gating
- Changing prices, plans, coupons or billing behavior
- Implementing domain provisioning (DNS verification, certificates, `TenantDomain` flows) or custom-domain routing
- Changing routes, folders, sidebars, auth, or the schema
- Building marketplace, cart, checkout, or CMS pages

---

## 3. Audit 1: Mixed pricing inventory

Goal: know exactly which pricing models the system supports today, how each price is calculated, and where the gaps are, **one model at a time**.

### 3.1 Questions to answer
- Where are prices defined (plan tables, add-on tables, hardcoded constants, environment variables, Razorpay plans)?
- Which billing intervals exist in schema, API and UI: monthly, yearly, other?
- Is a one-time (perpetual/lifetime) charge supported anywhere?
- Is per-user/seat pricing supported (quota enforcement exists via `tenant-quota.service.ts`: is it billed or only limited)?
- Is usage-based pricing supported (metering, credits, overage, top-up)? What is metered today (employees, storage, API calls, WhatsApp/SMS, AI)?
- Can one order contain lines of different models (for example monthly plan + yearly add-on + one-time setup)? Is co-terming or proration implemented?
- How are coupons, taxes (GST CGST/SGST/IGST), rounding, and currency applied, and in what order?
- What happens at renewal, failure, upgrade, downgrade, cancellation, refund?
- How does a successful payment (Razorpay order/subscription/webhook) become an entitlement (`TenantAddon`, plan change)?

### 3.2 Report: one row per pricing model

| Model | In schema? | Selectable in UI? | Price calculation path (function/file) | Inputs and formula | Charged via (gateway object) | Renewal | Proration | Tax | Coupon | Invoice | Entitlement effect | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Monthly subscription | | | | | | | | | | | | | |
| Yearly subscription | | | | | | | | | | | | | |
| One-time purchase | | | | | | | | | | | | | |
| Per-user / per-seat | | | | | | | | | | | | | |
| Usage-based (credits, overage, metered) | | | | | | | | | | | | | |
| Trials | | | | | | | | | | | | | |
| Mixed order (multiple models in one cart/order) | | | | | | | | | | | | | |

Plus two supporting tables:

**Where prices live:** entity/constant, fields, who edits it (Super Admin UI or code), per-region/currency overrides.

**Quota and metering map:** resource (employees, branches, warehouses, users, storage, API calls, messages, AI), where counted, where enforced (`INSERT` block, middleware), whether it affects billing, reset period.

### 3.3 Output
Gap list per model, risk list (for example amounts computed client-side, webhook not idempotent, price changes affecting existing subscriptions), and a recommendation for the target price-calculation service (inputs, outputs, rounding, tax order). **Recommendation only.**

---

## 4. Audit 2: Hybrid HRMS capability inventory

Goal: a complete list of capabilities with current gating and a **proposal** for packaging. Nothing is enforced in A0.

### 4.1 Method
1. Enumerate capabilities from routes, sidebar items, API route files, Prisma models, and scheduled jobs (group by app: HR, Employee, Finance, CRM, Inventory, POS, Projects, Support, IT, Client, Platform).
2. For each, record current gating: none, role only, plan-based, `requireAddon('slug')`, `useAddon('slug')`; and which existing add-on slug (assets, okr, ai-studio, biometric-sync) applies.
3. Record dependencies: which other capabilities, jobs, reports, dashboards, payroll or compliance flows read its data.
4. Propose a category using the rules below.

### 4.2 Proposal rules (guidance, not enforcement)
| Proposed category | Typical signals |
|---|---|
| **CORE** | Other core flows break without it; holds master data or legal/compliance records (employee master, org structure, attendance, leave, payroll basics, announcements, documents, audit); required for tenant onboarding |
| **OPTIONAL ADD-ON** | Standalone feature, self-contained data, niche or industry-specific, third-party or usage cost, can be turned off without breaking core flows (for example biometric sync, OKR, AI, LMS, strategy tools) |
| **UNDECIDED** | Dependencies unclear, overlaps with another capability, or the commercial choice belongs to the owner |

### 4.3 Report: one row per capability

| Capability | App | Routes/pages | APIs | Prisma models | Current gating | Existing add-on slug | Depended on by | Depends on | Proposed category | Rationale | Risk if gated later | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Seed capabilities to include (non-exhaustive): Recruitment, Training/LMS, Performance and OKR, Performance Indicators, Biometric attendance (ZKTeco), Timesheet/Time tracker, Assets, Double-entry accounting, Notice board vs Announcements, Documents and contracts, Payroll and statutory forms, Expenses, Helpdesk, Offboarding, WhatsApp alerts, AI studio, POS, Inventory, Projects, CRM (see section 5).

### 4.4 Output
Capability table, a dependency graph (text or diagram), a list of **UNDECIDED** items with the exact question for the owner, and the effect on the add-on catalog (`12_Addon_Catalog_and_Engines.md` section 5). **No entitlement, plan, menu, or route changes.**

---

## 5. Audit 3: Standalone CRM feasibility

Goal: find out whether a tenant with CRM entitlement and **no HRMS entitlement** could work. Document real dependencies; do not assume independence.

### 5.1 Questions to answer
- **Routes and pages:** list every CRM page and what it renders.
- **APIs:** list CRM endpoints; for each, what auth, permission, role, and entitlement checks run; any `requireAddon` or plan check; any import of HR services.
- **Data model:** foreign keys or joins from CRM models to `Employee`, `Department`, `Branch`, `Designation`, `Shift`, `LeaveType` and other HR tables. Which are hard (non-null FK), soft (optional lookup), or display-only?
- **Identity:** can a CRM user exist without an Employee profile? Are sales owners/assignees `Employee` ids or `User` ids? How do roles work for CRM-only tenants?
- **Shared services:** which platform services CRM uses (notifications, tasks/todo, calendar, documents, tickets, invoices, products, customers/clients, email, WhatsApp) and whether each is available without HRMS.
- **Navigation and shell:** is CRM in the same sidebar/shell as HR? What happens to menu and dashboard when HRMS is not entitled?
- **Tenant creation and seed:** does workspace creation seed HR master data that CRM expects (departments, roles, branches)?
- **Reporting and dashboards:** CRM widgets/reports that read HR data.
- **Quotas and billing:** are plan quotas (employees) tied to CRM usage?

### 5.2 Report: dependency table

| CRM element (page/API/model) | Depends on | Type (hard FK / soft lookup / UI link / seed / service) | Breaks without HRMS? | Decoupling option (describe only) | Evidence |
|---|---|---|---|---|---|

### 5.3 Verdict per CRM page
`INDEPENDENT` (works as is), `SOFT-DEPENDENT` (works with degraded labels/links), `HARD-DEPENDENT` (fails or hides data), `UNKNOWN`. Summarize with counts and the top blockers. State clearly which statements are verified in code and which are assumptions.

### 5.4 Output
Dependency map, verdicts, minimum set of changes (described, not made) to allow CRM-only tenants, and open questions for the owner (for example whether sales reps must be Employees).

---

## 6. Audit 4: Subdomains first and tenant-bound authentication

Priority is `{workspace}.{BASE_DOMAIN}` with sessions bound to that tenant. Custom domains are **later (A5)**; A0 only records what exists and what a later phase would need.

### 6.1 Current-state questions
1. How is the tenant determined on each request today: `tenantSlug` in login body, token claim, header, path, host? List the exact code path.
2. What do login, token issue, and token verification do about the host? Is the token's tenant compared with the host tenant? Can one token be replayed on another workspace URL?
3. Middleware order: where does tenant resolution run relative to auth, rate limit, CORS, and the Socket.io handshake?
4. How does the frontend learn the workspace (hostname parse, config, user input at login)? What happens on an unknown subdomain, a suspended tenant, a cancelled tenant?
5. Cookies vs localStorage for tokens; cookie domain/host-only; token lifetime (docs state 7-day JWT); refresh and revocation.
6. CORS and CSRF configuration: allowed origins, wildcard handling.
7. Dev setup: `{workspace}.localhost`, hosts file, proxy, Vite `allowedHosts`; env `BASE_DOMAIN` usage.
8. Super Admin separation: separate host/prefix/token path? Can a super admin token be used on a tenant host and vice versa?
9. Workspace creation: slug validation, reserved names, uniqueness, what is seeded.
10. Realtime: does the socket handshake bind to tenant and reject mismatches? Are rooms tenant-scoped?
11. Emails and links: how workspace URLs are built in emails, invoices, notifications.

### 6.2 Report

| Check | Expected (target) | Current | Status | Evidence | Gap / note |
|---|---|---|---|---|---|
| Tenant from host (`{workspace}.{BASE_DOMAIN}`) | Resolved first in middleware | | | | |
| Token bound to host tenant | Mismatch rejected | | | | |
| Login without `tenantSlug` in body | Host provides tenant | | | | |
| Unknown / suspended / cancelled workspace behavior | Clear pages and codes | | | | |
| Host-only cookies, short access + refresh | | | | | |
| CORS wildcard for `*.{BASE_DOMAIN}` only | | | | | |
| Socket handshake tenant-bound | | | | | |
| Super Admin isolation | | | | | |
| Reserved slug list | | | | | |
| Local dev flow documented | | | | | |
| Links/emails use tenant host | | | | | |

### 6.3 Custom domains: document only
Record, without changing anything: any existing fields, tables, env vars, UI or docs that mention custom domains; and a list of what a later phase (A5) would need (domain table, DNS verification, certificate issuance, primary-domain redirects, central OAuth callback). **Do not implement domain provisioning, DNS checks, certificate logic, or new tables in A0.**

---

## 7. Carry-over audits (already defined, still part of A0)

| Audit | Reference |
|---|---|
| Route files, generated route tree, sidebar source, old `/pages`-style paths, link and permission-map usage | `hrms-plan/04` section 1 (10 checks) and section 7 step 1 mapping table |
| Page inventory statuses (HR 105 pages, `/me` 59 pages) | `hrms-plan/worklog.md` sections 2 and 3 |
| `docs.tsx` reconciliation: verify claims (completion, counts, add-on list, role/portal routes) against code | Section 8 below |
| Tenant isolation review (`WHERE tenant_id`, Prisma queries without it, super admin paths) | `10` section 9 |

---

## 8. `docs.tsx` reconciliation table

| Claim in docs page | Where in `docs.tsx` | Verified? | Actual | Evidence |
|---|---|---|---|---|
| "117 frontend routes", "44 route files, 421 endpoints" | Architecture stack | | | |
| "100% Core Completion: 0 missing functions" | Missing Functionality ledger | | | |
| Portal routes: `/super/*` + `/super-login`, `/auth`, `/employee-dashboard`, `/client-dashboard`, `/_authenticated/_app/*` | User Roles and Portal Architecture | | | |
| Add-ons available: assets, okr, ai-studio, biometric-sync | Subscription Plans and Add-on Engine | | | |
| `requireAddon('slug')`, `useAddon('slug')`, `TenantAddon` | Add-on Engine | | | |
| `tenant-quota.service.ts` blocks INSERT over quota | Tenant Quota Management | | | |
| Login `POST /api/auth/login` with email + password + `tenantSlug` | Authentication matrix | | | |
| JWT 7-day expiry, 2FA via `/verify-2fa` | Security Architecture | | | |

---

## 9. A0 deliverables and gate

Deliver as one report (markdown) plus updates to the worklog:

1. Pricing inventory (section 3) with gap list and calculation-service recommendation.
2. Capability inventory and packaging **proposal** (section 4); UNDECIDED items with questions.
3. CRM dependency table, verdicts and minimum decoupling changes (section 5).
4. Subdomain and tenant-bound auth report (section 6), with custom-domain facts recorded only.
5. Route/sidebar inventory results and updated page statuses.
6. `docs.tsx` reconciliation table.
7. Consolidated risk list, estimates for A1 and A2, and remaining owner questions (Q-22, Q-23, Q-24, Q-26, Q-27).

**Gate (owner approves):** every finding has evidence; no unverified claim is presented as fact; no code, schema, entitlement, or infrastructure change was made; A1 scope is confirmed as "subdomain resolution and tenant-bound authentication first".

---

## 10. Prompt to paste to the agent

> Run **A0 (read-only audit)** for our multi-tenant SaaS ERP using `13_A0_Audit_Brief.md`, `10_SaaS_Architecture_Master_Plan.md`, `12_Addon_Catalog_and_Engines.md` and `hrms-plan/worklog.md`. Do not change code, schema, entitlements, menus, packaging, or infrastructure. Do not implement domain provisioning. Deliver: (1) a **mixed pricing inventory**: for monthly, yearly, one-time, per-user and usage-based pricing separately, record schema, UI, price calculation path, payment, renewal, proration, tax, coupon, invoice and entitlement effect with status and evidence; (2) a **capability inventory** with current gating and a proposal of CORE / OPTIONAL ADD-ON / UNDECIDED, without enforcing any packaging; (3) a **standalone CRM dependency report**: whether CRM routes, APIs and data work without an HRMS entitlement, with a dependency table and per-page verdicts, documenting dependencies rather than assuming independence; (4) a **subdomain-first and tenant-bound authentication report** for `{workspace}.{BASE_DOMAIN}`, noting custom-domain facts only as a later phase; (5) the carry-over route/sidebar audit and the `docs.tsx` claims reconciliation. Every finding needs file/line, endpoint, model or route evidence; mark anything unverified as UNKNOWN. Update the worklog (statuses, decisions, session log) and finish with risks, estimates for A1 and A2, and the questions you need answered.
