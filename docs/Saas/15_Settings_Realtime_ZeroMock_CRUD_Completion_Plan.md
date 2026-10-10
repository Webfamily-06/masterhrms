# 15. Settings-Driven Realtime Platform, Zero-Mock Cleanup and CRUD Completion Plan

Context: your repo worklog shows A0 to A3.7 accepted and A4 (marketplace UIs) active. This plan adds a parallel **S-track** for four requirements you raised:

1. **All configuration comes from role-based Settings pages** (Super Admin platform settings and Tenant Admin tenant settings): payment gateways, OAuth/social login (client ids, secrets, callback URLs), SMTP, storage, realtime, SMS and more. Changes take effect in real time, with **no `.env` edit and no restart**.
2. **The UI side is specified and built for every function**: once a function runs (API plus DB), the result appears automatically in the UI, including dashboards.
3. **Remove all hardcoded, mock and dummy data** from the whole application.
4. **Every page has working CRUD** (backend, API and UI). If something is missing, add it end to end. Dashboards fully working and responsive; the file API works.

Note on the earlier documents: the page-by-page settings UI was specified in `MasterHRMS_System_Settings_Platform_Plan.md`, but it was never linked into files 10 to 13 or the worklog phases, so it was not scheduled. This plan connects them and adds the role matrix, the consumption wiring and the audits.

Interpretation to confirm: "fully responsible" on dashboards is read as **fully responsive** (mobile, tablet, desktop). Tell me if you meant something else.

Mode: S0 is a **read-only audit**. Implementation steps start only after you approve the S0 report.

---

## 1. Principles

1. **Database is the source of truth for configuration.** `.env` holds only bootstrap values (database URL, JWT secret, master encryption key, base domain). Everything an admin should be able to change lives in settings tables.
2. **Role-scoped:** Platform settings (Super Admin) and Tenant settings (Tenant Admin and delegated roles). Resolution: user > tenant > platform > registry default.
3. **Runtime consumers rebuild on change.** Mailer, OAuth strategies, payment clients, storage, realtime, SMS and AI clients are factories that read settings, not singletons created at boot.
4. **Vertical slice rule:** no function is "done" until DB model, API, permission, UI, realtime event and tests all exist. "No API without UI, no UI without API."
5. **No mock fallbacks in production code.** When data is missing, show an empty state; when an API fails, show an error state. Demo data exists only as flagged seed data in demo workspaces.
6. **Secrets are encrypted, masked in the UI, never in realtime events or logs.**

---

## 2. Role-based settings model

### 2.1 Who edits what

| Settings area | Super Admin (platform) | Tenant Admin | HR Admin | Finance | IT Admin | Employee |
|---|---|---|---|---|---|---|
| Platform branding, platform name, support email | Edit | n/a | n/a | n/a | n/a | n/a |
| Tenant branding (logo, colors, name) | View/override | Edit (if plan allows) | n/a | n/a | n/a | n/a |
| Locale, timezone, date/time, currency formats | Platform default | Edit tenant default | n/a | n/a | n/a | Own preference |
| Company profile, billing address, tax IDs, bank accounts | Platform company | Edit | n/a | Edit (finance fields) | n/a | n/a |
| Invoice settings (prefix, numbering, terms) | Platform invoices | Edit | n/a | Edit | n/a | n/a |
| **Payment gateways** (subscription billing) | **Edit** | View status | n/a | n/a | n/a | n/a |
| **Payment gateways** (client invoice collection) | n/a | Edit | n/a | Edit | n/a | n/a |
| **SMTP / email provider** | Edit platform default | Edit tenant SMTP (if plan) | n/a | n/a | Edit | n/a |
| **OAuth / social login** | **Edit provider apps (client id/secret, enable)** | Enable/disable, own app if plan allows | n/a | n/a | Edit | n/a |
| SMS and WhatsApp gateways | Edit platform default | Edit tenant | n/a | n/a | Edit | n/a |
| Storage (local/S3/Wasabi), file limits | Edit platform | Quotas view / tenant disk if plan | n/a | n/a | Edit | n/a |
| Realtime provider (Socket/Pusher) | Edit | View status | n/a | n/a | n/a | n/a |
| AI providers and keys, credits | Edit platform | Tenant keys if plan | n/a | n/a | Edit | n/a |
| Integrations (Google Workspace, Shopify, Woo, biometric) | Catalog and defaults | Connect and configure | n/a | n/a | Edit | n/a |
| Security (captcha, 2FA policy, session, IP bans) | Platform policy | Tenant policy within platform limits | n/a | n/a | Edit | Own 2FA |
| HR policies (attendance, leave, payroll rules) | n/a | Edit | Edit | n/a | n/a | View |
| Cookie, SEO, analytics | Platform site | Tenant public pages | n/a | n/a | n/a | n/a |
| Maintenance | Platform and per-tenant | n/a | n/a | n/a | n/a | n/a |
| Webhooks and API keys | Platform | Edit | n/a | n/a | Edit | n/a |

Permission keys: `settings.platform.<group>.{view,update,test}`, `settings.tenant.<group>.{view,update,test}`; a role sees a settings page only if it has `view`. Delegation of a group to IT Admin or Finance is by role permission, not code.

### 2.2 Storage rules
Typed settings registry (key, group, scope, type, default, validation, secret flag, permission, apply strategy, realtime topic); `Setting`, `SettingSecret` (AES-256-GCM), `SettingAudit`, `SettingVersion`; dedicated tables for structured data (`CompanyProfile`, `PaymentGateway`, `OAuthProvider`, `EmailProvider`, `StorageDisk`, `MediaFile`). Your server already mounts `settingsRouter`, `mediaRouter`, `appConfigRouter`, `companyProfileRouter` and `SettingsService.ensureDefaultSettings()`; S0 verifies how much of this exists and which groups still read `process.env`.

---

## 3. Settings groups: fields, runtime consumer, test, live effect

### 3.1 Payment gateways
| Item | Platform (Super Admin, subscriptions and marketplace) | Tenant (client invoices and POS) |
|---|---|---|
| Gateways | Razorpay now; Stripe, PayPal later | Razorpay, Stripe, PayPal, bank transfer, UPI link |
| Fields per gateway | Enabled, mode (sandbox/live), key id, key secret, webhook secret, **webhook URL (read-only, copy)**, currencies, supported methods, fee notes | Same, plus default for invoices |
| Live mode rule | Live stays **fail-closed** until you explicitly enable it (per your A3.6 governance) | Same |
| Runtime consumer | Payment client factory used by checkout, subscription renewal and webhook verifier | Same for invoice payment links |
| Test | "Test connection" (harmless API call), webhook ping, last-test status badge | Same |
| Live effect | Checkout payment options and the "Pay" buttons appear/disappear immediately; mode banner "Sandbox" visible to admins | Invoice pay options update |

### 3.2 OAuth / social login (the "social media page")
| Item | Detail |
|---|---|
| Providers | Google, Microsoft (including Outlook), LinkedIn now; Facebook, X, GitHub, Slack, Bitbucket later |
| Platform fields | Enabled, **client id**, **client secret**, scopes, allowed email domains, auto-create users, account-linking policy, **redirect/callback URL (generated, read-only, copy button)**, provider console link and setup steps |
| Tenant fields | Enabled for my workspace, allowed domains, optional own app (plan feature) |
| Runtime consumer | Strategies resolved per request from DB; central callback `https://auth.{BASE}/oauth/callback/{provider}` (A5) or the current tenant-local callback until then |
| Test | Validate URL formats, fetch provider discovery document, check credentials where possible, then "Try sign-in" popup; writes `OAuthLoginLog` |
| Status | Not configured, Configured, Test passed, Test failed; last successful login time |
| Live effect | Login page buttons appear only for providers that are enabled **and** test-passed; open login tabs update instantly when a provider is toggled |

### 3.3 SMTP / email
Fields: provider (SMTP, later SES/SendGrid/Mailgun), host, port, encryption, username, password (secret), from name/address, reply-to. Platform default plus tenant override (plan feature). Test email with step log (connect, TLS, auth, send); email log page (sent, failed, error). The transporter is rebuilt on save; the **previous-config fallback** is kept if the test fails when enabling. Live effect: next email uses the new config; status badge updates.

### 3.4 Other groups (same pattern)
| Group | Key fields | Consumer rebuilt on change | Test | Live UI effect |
|---|---|---|---|---|
| Branding and identity | App name, support email, logos (light, dark, favicon), accent color, login background | App config provider, emails, PDFs | n/a | Header, login, favicon, theme repaint in all open tabs |
| Locale and currency | Language, timezone, date/time format, calendar start, currency, symbol position, decimals, separators, Indian grouping | Shared formatters | Live sample panel | Every table, chart, PDF, payslip re-renders |
| Company profile and billing | Legal name, address, city, state, pincode, GSTIN, PAN, bank accounts, invoice prefix and terms | Invoice, quotation, payslip, ticket and email templates | Preview PDF | New documents use it; old invoices keep snapshot |
| SMS / WhatsApp | Provider, credentials, sender id/template ids (DLT), credits | Messaging gateway | Send test | Alerts and notifications use it |
| Storage and files | Disk (local/S3/Wasabi), bucket, keys, allowed types, max size, quotas | Storage disk resolver | Write/read/delete probe | Next upload uses it; quota bars update |
| Realtime | Provider, host/app id/key/secret, TLS | Socket publisher, client connection | Ping round-trip | Connection indicator, auto-reconnect |
| AI | Provider, key, model, credits, data policy | AI client factory | Sample call | AI features enable/disable |
| Integrations | Google Workspace, Shopify, WooCommerce, biometric devices (credentials, mapping) | Per-integration service | Connection test | Sync buttons and status |
| Security | Captcha keys, 2FA policy, session length, lockout, IP bans, password policy | Auth middleware | Test captcha | Applied at next login |
| Cookie, SEO, analytics | Banner texts, meta tags, GA id | Public config | Preview | Public pages update |
| Maintenance | Window, message, bypass roles | Gateway middleware | n/a | Banner and countdown in all tabs |
| Webhooks and API keys | Endpoints, events, signing secret, key scopes | Webhook dispatcher | Test delivery | Delivery log |

---

## 4. Runtime wiring: how a change reaches everything

```
Admin saves in Settings UI
 -> PUT /settings/{scope}/{group}  (permission, validation, encryption, audit, version++)
 -> DB transaction writes setting + OutboxEvent
 -> cache invalidated on all server instances
 -> runtime factory for that group rebuilt (mailer, OAuth, payments, storage, ...)
 -> event settings.updated {scope, tenantId, group, keys, version} (no secrets)
 -> every open client invalidates ['app-config'] and ['settings', group]
 -> UI re-renders (branding, formats, login buttons, payment options, banners, dashboard widgets)
```

Rules:
1. **Replace runtime `process.env` reads** for anything in section 3 with `SettingsService` access. On first boot, existing env values are **imported once** into the DB and shown in the UI as "imported from environment"; afterwards the DB wins.
2. Client reads configuration only through one `useAppConfig()` hook and typed `useSettings(group)` hooks; no component reads constants for names, currencies, colors or provider lists.
3. Formatting uses shared `formatDate`, `formatMoney`, `formatNumber` utilities driven by settings.
4. Public (pre-login) values come from `GET /public/app-config` (branding, enabled login providers, cookie banner, maintenance); never secrets.
5. Platform changes broadcast to `platform` and affected `tenant:{id}` rooms; tenant changes to `tenant:{id}` only.
6. Failure behavior: if a new config fails its test, it is saved as disabled/draft and the previous working config stays active.

---

## 5. Settings UI specification (Super Admin and Tenant Admin share components)

1. **Settings shell:** left navigation grouped (General, Branding, Communication, Authentication, Payments, Storage, Security, Integrations, System), search, breadcrumb with scope switcher (Platform or Tenant), role-filtered.
2. **Section-level save** with a sticky unsaved-changes bar; discard; leave-page warning.
3. **Status badges** per integration (Not configured, Active, Test failed, Sandbox, Live) and a **Health overview** page listing every integration, last test, last error.
4. **Secrets UX:** show "Saved" with a **Replace** action; never reveal values.
5. **Provider cards** (OAuth, payments): enable toggle, credential inputs, read-only callback/webhook URL with copy, setup steps link, Test button with inline result log, last-tested time.
6. **Live preview panels** (branding, locale, invoice, email template, cookie banner).
7. **Image uploader** with local preview, media library picker and usage link (fixes the earlier "no preview / not in Media Library" bug).
8. **Reusable pieces:** `SettingsSection`, `SecretField`, `ProviderCard`, `TestButton`, `StatusBadge`, `CopyField`, `ImageUploader`, `ColorPicker`.
9. **Audit and history** tab per group (who changed what, when, rollback for non-secret values).
10. **Responsive and accessible:** works on tablet and phone, keyboard navigation, dark mode.

Where it appears: Super Admin `/super/settings/*`; Tenant Admin `/tenant/settings/*`; HR and employee pages only read results (no settings UI), except their own preferences.

---

## 6. Dashboards: live data, realtime and responsive

Rules for every dashboard (Super Admin, Tenant, HR, Employee, CRM, POS, Finance, Inventory, Projects, Support, Client):
- Data from **aggregation endpoints** (one call per dashboard or per widget), tenant- and scope-aware, with entitlement per widget. No static numbers, no sample charts.
- Every widget has loading skeleton, empty state, error state with retry.
- Realtime counters for live items (attendance, approvals, tickets, orders, payments, stock alerts) through socket events; fallback refresh on focus.
- Filters (date range, branch, department) in the URL.
- **Responsive:** layouts for 360, 768, 1024 and 1280+ widths; no horizontal page scroll; tables scroll inside containers; charts resize; touch targets 44 px; cards reorder on mobile.
- Formatting through settings (currency, dates, numbers).
- Widgets and their APIs are declared in the manifest registry so locked products show an upgrade tile, not broken widgets.

Dashboard checklist (agent fills in S0): dashboard, widgets, API per widget, source tables, realtime event, mock/hardcoded values found, responsive status.

---

## 7. Zero-mock policy and cleanup

### 7.1 What counts
| Class | Examples | Action |
|---|---|---|
| **A: runtime mock in production UI/API** | Hardcoded arrays in components, fake chart series, static KPI numbers, fallback data when an API fails, `Math.random()` data | Replace with real API; remove fallback; add empty/error states |
| **B: demo/sample content** | Sample employees, demo invoices, "Acme" companies, placeholder images | Move to seed scripts flagged `isDemo`; only loaded for demo workspaces |
| **C: test fixtures** | Data inside test files | Keep, but only under test directories |
| **D: legitimate constants** | Enums, status vocabularies, permission keys | Keep as typed registries; **lists an admin may extend** (types, categories, sources) become master data |

### 7.2 Detection (S0)
Search the repo (client and server) for: `mock`, `dummy`, `fake`, `sample`, `placeholder`, `lorem`, `faker`, `demo`, `TODO`, `FIXME`, `hardcoded`, static JSON imports in routes/components, large inline arrays of objects, `Math.random`, literal currency symbols or `₹`/`$` outside formatters, literal company names or emails (`example.com`, `@localhost`, `hello@`, `WorkDo`, `Acme`), default keys/ids (`123456`, `your-app-key`, `mt1`), default bank details, fixed plan names/prices outside the catalog, hardcoded dropdown options, `localhost` URLs outside config, `process.env` reads for configurable values, default passwords, and demo credentials displayed outside demo workspaces.

### 7.3 Report format
| File | Line | Snippet (short) | Class (A/B/C/D) | Where used (page/API) | Replacement | Owner module |
|---|---|---|---|---|---|---|

### 7.4 Rules after cleanup
1. Production code contains no Class A or B items; a CI check (denylist grep plus a test that loads an **empty tenant** and asserts every page shows empty states, not sample data) fails the build.
2. Demo workspace creation is an explicit super-admin action that runs flagged seed scripts and shows a "Demo" banner.
3. Plan names, prices, add-on listings come from the catalog; HR option lists from master data; statutory values from versioned rules.
4. API failures never fall back to fake data.

---

## 8. CRUD completeness on every page

### 8.1 What "CRUD" means by page type
| Page type | Required operations | Notes |
|---|---|---|
| Master data (types, categories, sources, rooms) | Create, Read (list/detail), Update, Delete or deactivate (blocked when in use), import/export | Realtime `lookup.changed` |
| Transaction/record (invoices, orders, tickets, assets) | Create, Read, Update (state-aware), Cancel/void (not hard delete), export | Audit and history |
| Request/approval (leave, regularization, trips) | Create, Read, Update while pending, Withdraw, Approve/Reject | Workflow engine |
| Read-only view (payslips, policies for employees) | Read, download | Explicitly marked read-only with reason |
| Singleton settings | Read, Update, Reset, Test | Not CRUD list |
| Reports/dashboards | Read, filter, export | No CRUD |

Anything that is not full CRUD must be **marked with a reason** in the matrix (for example "payslip: read-only by design").

### 8.2 CRUD matrix (S0 output, one row per page)
| Page ID (worklog) | Route | List | Create | Detail | Update | Delete/cancel | Search/filter | Export | Backend route | API client | DB model | Permission | Realtime | Audit | Mock found | Gap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Use the existing worklog page IDs (HR-xxx, ME-xxx) and add product pages (CRM, POS, Finance, Inventory, Projects, Support, IT, Client, Super, Tenant).

### 8.3 Completion rule for a gap
For each missing operation add **all** of: Prisma model/field (if needed), service logic with validation and tenant scope, route with permission and entitlement, audit entry, outbox event, API client hook, UI (list, form, detail, confirm dialogs, empty/error states), notification if relevant, and tests (happy path, validation, permission, cross-tenant). A gap is not closed until the UI works end to end with live data.

---

## 9. File API essentials

| Capability | Requirement |
|---|---|
| Upload | Multipart upload with type allow-list, size limit, magic-byte check, random file names, tenant-prefixed path; returns media id, URL, dimensions |
| Library | Folders, tags, search, preview, rename, move, replace, delete (blocked if in use), usage references |
| Public vs private | Public (branding, public job images) served directly; **private (KYC, contracts, payslips, resumes, invoices) only through authenticated routes or signed expiring URLs**; fix any static serving of private files |
| Storage disks | Local, S3-compatible, Wasabi; switch from settings; test action; migration tool for existing files as a separate task |
| Consumers | Branding, profile photo, employee documents, onboarding documents, attachments in requests, resumes, invoices/payslip PDFs, chat attachments, asset images |
| UI | Shared uploader and picker used by every form; progress, preview, errors |
| Quotas | Per-tenant storage quota and usage bar; enforcement at upload |
| Tests | Upload, replace, delete-in-use blocked, cross-tenant access denied, signed URL expiry, disk switch |

---

## 10. Execution plan (S-track)

| Step | Name | Type | Scope | Gate |
|---|---|---|---|---|
| S0 | Audit | Read-only | (a) every `process.env` read and config consumer vs settings tables; (b) settings UI existence per group; (c) mock/hardcoded inventory (section 7); (d) CRUD matrix for all pages (section 8); (e) dashboard inventory (section 6); (f) file API gaps (section 9); (g) which payment and OAuth settings are read at runtime from DB vs env | Owner approves S0 report |
| S1 | Settings core | Implement | Registry, role scopes, secrets, audit, versioning, `settings.updated` realtime, `useAppConfig`/`useSettings`, public app-config, env import | Two-browser realtime test |
| S2 | Runtime factories | Implement | Mailer, OAuth, payment client, storage, realtime, SMS, AI rebuilt from settings; env fallback removed from runtime | Each factory passes change-without-restart test |
| S3 | Settings UI | Implement | Super Admin and Tenant settings shells, provider cards, test buttons, health page, uploader | Every group usable by the right role |
| S4 | App-wide consumption | Implement | Branding, formats, company profile, invoice settings, login buttons, payment options read from settings everywhere | Scenario tests (section 11) |
| S5 | Zero-mock cleanup | Implement | Remove Class A and B items module by module, dashboards on live APIs, empty/error states | CI denylist and empty-tenant test pass |
| S6 | CRUD completion | Implement | Close matrix gaps per module (backend, API, UI) | Matrix has no unexplained gaps |
| S7 | Verification and hardening | Test | Full regression, responsive pass, security review, performance | Owner acceptance |

Sequencing with your current phases: keep **A1b P0/P1 items** (add-on self-activation, deny-by-default entitlement map, socket tenant binding, private files, webhook raw body) first if not yet done; run **S0 now in parallel with A4** (it is read-only); do **S1 to S3 before A5 (custom domains/central OAuth)** and before enabling any live payment, because the checkout and OAuth work in A4/A5 must read gateway and provider configuration from settings, not env. S4 to S6 proceed module by module after S3.

---

## 11. End-to-end acceptance scenarios

1. Super Admin enters Razorpay sandbox keys, tests, enables: checkout shows Razorpay immediately; disabling it removes it in open checkout tabs; live mode remains blocked until explicitly allowed.
2. Super Admin enters Google client id and secret, copies the shown callback URL into the Google console, tests: the Google button appears on every tenant login page within seconds; removing the secret hides it.
3. Same for Microsoft and LinkedIn; failing tests keep the button hidden and show the exact failing step.
4. Super Admin changes platform SMTP: next verification email uses it; test email log shows result; wrong password leaves the old config active.
5. Tenant Admin sets tenant SMTP, sends test email, invites a user: invite arrives from the tenant's address.
6. Tenant Admin changes currency and date format: lists, dashboards, PDFs, payslips and invoices all change without reload.
7. Tenant Admin uploads a logo: preview appears, file lands in Media Library with usage link, header updates in all tabs.
8. Tenant Admin edits company address and GSTIN: next invoice shows them; old invoices unchanged.
9. IT Admin (not Tenant Admin) can edit SMTP/OAuth if granted; HR Admin cannot see those pages.
10. Employee sees no settings except personal preferences; direct URL gives 403.
11. Switching storage disk: next upload goes to the new disk; test button verifies write/read/delete.
12. Disabling an integration add-on hides its sync buttons and returns `ADDON_REQUIRED` from its APIs.
13. Maintenance window set by Super Admin: banner and countdown in all open tabs; admins bypass.
14. New empty tenant: every dashboard and list shows empty states; no sample numbers anywhere.
15. Demo workspace: seeded data visible with a Demo banner; absent in normal tenants.
16. A page with a missing delete/update (from the CRUD matrix) is completed and works end to end with realtime updates in a second browser.
17. Upload of a disallowed type or oversize file is rejected with a clear message; private file link from another tenant returns 403.
18. Dashboards usable on a 360 px phone with no horizontal page scroll.
19. Kill the socket: UI shows reconnecting, then refetches on reconnect.
20. Two server instances: a settings change takes effect on both within seconds.

---

## 12. Block to add to your repo worklog (S-track)

```
### S-track: Settings, Realtime, Zero-Mock, CRUD (added 2026-10-10)
Spec: saas-architecture/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md
| ID | Step | Status |
| S0 | Read-only audit (env reads, settings UI, mock inventory, CRUD matrix, dashboards, file API) | NS |
| S1 | Settings core + realtime + env import | NS |
| S2 | Runtime factories (mail, OAuth, payments, storage, realtime, SMS, AI) | NS |
| S3 | Settings UI (Super Admin + Tenant) | NS |
| S4 | App-wide consumption of settings | NS |
| S5 | Zero-mock cleanup + live dashboards | NS |
| S6 | CRUD completion (backend + API + UI) | NS |
| S7 | Verification and hardening | NS |
Proposed decisions (IDs continue after D-028): D-029 DB is source of truth for config, env bootstrap only; D-030 role-scoped settings with platform/tenant scopes; D-031 zero-mock production policy with flagged demo seeds; D-032 vertical-slice Definition of Done (DB+API+UI+realtime+tests).
Open questions: Q-S01 which roles besides Tenant Admin may edit SMTP/OAuth/payments? Q-S02 can tenants bring their own OAuth apps and SMTP (plan feature)? Q-S03 confirm "responsive" interpretation; Q-S04 should demo workspaces exist in production? Q-S05 which payment gateways besides Razorpay for platform billing and for tenant invoices?
```

---

## 13. Prompt to paste to the agent

> Start the **S-track S0 (read-only audit)** from `15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md`. Do not change code, schema or configuration. Deliver one report with: (1) every runtime `process.env` read that should be a setting (SMTP, OAuth client ids/secrets/callback URLs, Razorpay and other gateway keys, storage, realtime/Pusher, SMS/WhatsApp, AI keys, captcha, branding defaults) with file, line and the consumer; (2) for each settings group in section 3, whether a DB model, API, permission, UI page, test button, status badge and realtime event exist (Super Admin and Tenant Admin separately); (3) the mock/hardcoded inventory per section 7 with class A/B/C/D, location and replacement; (4) the CRUD matrix per section 8 for every page using worklog IDs plus product, super and tenant pages; (5) the dashboard inventory per section 6 including responsive status; (6) file API gaps per section 9, including anything private served statically; (7) a prioritized task list for S1 to S6 with estimates, plus risks. Every finding needs file/line or endpoint evidence; mark unverified items UNKNOWN. Do not start S1 until I approve. Keep A1b P0/P1 items and A4 as currently planned.
