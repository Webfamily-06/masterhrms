# 18. Add-on Routing and Implementation Playbook

Planning document. Goal: every add-on works like `/hr`, `/crm` and `/accounts` already do: its own prefix at `{workspace}.{BASE_DOMAIN}/{addon-slug}/*`, with API, functions, UI, realtime, settings, jobs, permissions and worklog tracking all connected. Inventory of all add-ons: `worklog_addon_inventory.md`. Catalog and engines: `12_Addon_Catalog_and_Engines.md`. UI rules: `16_UI_Implementation_Guide.md`.

---

## 1. Routing rule

```
https://{workspace}.{BASE_DOMAIN}/{slug}/*          frontend pages of that add-on or app
https://{workspace}.{BASE_DOMAIN}/api/{slug}/*      backend API of that add-on or app (versioned alias /api/v1/{slug}/*)
```

| Surface | Meaning | Frontend prefix | Example |
|---|---|---|---|
| **app** | Own layout, sidebar, dashboard | `/{slug}/*` | `/crm`, `/accounts`, `/pos`, `/inventory`, `/projects`, `/support`, `/it`, `/swot`, `/lms`, `/procurement` |
| **hr-module** | Page group inside an existing app, but entitlement-gated like an add-on | `/hr/{module}/*` | `/hr/recruitment`, `/hr/biometric` |
| **integration** | Connector add-on; uses the standard connector shell | `/{slug}/*` | `/zapier`, `/trello`, `/msg91`, `/quickbooks` |
| **setting** | No pages of its own; configured in Settings and shown on login/forms | none | Sign-in with Google, reCAPTCHA |

- Your `/hr` implementation is the **reference slice**: AD0 documents exactly how it does layout, guard, sidebar, API, realtime and permissions, and every other prefix copies that pattern.
- Existing apps keep their prefixes (`/hr`, `/me`, `/crm`, `/pos`, `/inventory`, `/projects`, `/support`, `/client`, `/tenant`, `/super`). Finance is `/accounts` or `/finance` (choose one, the other redirects; see Q-AD01).
- **Reserved prefixes** (cannot be used as add-on slugs): `hr, me, tenant, super, client, api, auth, admin, docs, addons, cart, checkout, login, signup, billing, settings, marketplace, status, public, uploads, assets, static, iclock, a, careers`. `/api` is reserved by the backend, so the Public API add-on uses `/public-api`.
- The registry **rejects** a manifest whose prefix collides with a reserved or existing prefix (startup and CI check).

---

## 2. What a manifest adds to the platform (one source, many effects)

| Manifest field | Effect |
|---|---|
| `slug`, `routePrefix`, `surface` | Frontend layout route, API mount path, launcher tile, marketplace listing |
| `entitlementKey` | Backend `requireEntitlement`, frontend `<Entitled>`, locked page |
| `provides.nav[]` | Sidebar of the add-on and entries in the Navigation Registry |
| `provides.permissions[]` | Permission catalog and default role grants (`{slug}.{resource}.{action}`) |
| `provides.settings[]` | Settings group `addon.{slug}` (Tenant Settings and inside the add-on); secrets flagged |
| `provides.jobs[]` | Entries in the scheduled-jobs registry (file 17 section 3) |
| `provides.events[]` | Realtime events and generated invalidation map lines |
| `provides.widgets[]` | Dashboard widgets (shown only if entitled) |
| `provides.models[]` | Prisma models (tenant-scoped, naming convention below) |
| `provides.i18n` | Translation namespace named after the slug |
| `hooks.install/uninstall/upgrade` | Seed roles, templates, settings defaults; data-retention rules |
| `marketplace` | Images, benefits, FAQ, docs, pricing (feeds `/addons/{slug}`) |

Conventions: Prisma models named `{Slug}{Entity}` or mapped table prefix `{slug}_`; events `{slug}.{entity}.{action}`; jobs `{slug}.{job}`; settings `addon.{slug}.{key}`; i18n namespace `{slug}`; docs page `/docs/addons/{slug}`.

---

## 3. Frontend and backend structure per add-on

```
Frontend
  src/routes/_authenticated/{slug}/route.tsx      layout: guard (auth -> entitlement -> permission), lazy chunk, sidebar from manifest
  src/routes/_authenticated/{slug}/*.tsx          thin route files
  src/features/{slug}/                            pages, components, hooks, api client, schemas, i18n namespace

Backend
  server/src/modules/{slug}/
     manifest.ts            manifest (data)
     routes.ts              mounted at /api/{slug} with requireEntitlement('{slug}')
     service.ts, schemas.ts business logic and validation (shared with client)
     events.ts, jobs.ts     outbox events and job handlers
     seed.ts                install hook seed (no mock data)
  prisma models in the shared schema with tenant_id
```

Locked behavior: a tenant without the entitlement opening `/{slug}` is redirected to the marketplace detail `/tenant/marketplace/{slug}` (or `/addons/{slug}` when logged out), with Start trial / Add to cart / Ask admin depending on role. API returns `403 ADDON_REQUIRED` or `PRODUCT_NOT_SUBSCRIBED`.

---

## 4. Engine page templates (what each add-on gets from its engine)

Each add-on in an engine reuses these pages and APIs; only configuration (fields, templates, adapters) differs.

| Engine | Standard pages under `/{slug}/*` | Standard API | Realtime and jobs |
|---|---|---|---|
| **E1 Strategy Studio** (SWOT, PESTEL, PEST, Porter, 7-S, Business Model, Business/Marketing Plan, Planning) | Overview (my documents), Document editor (canvas/matrix from template), Templates, Shared with me, Export | `/api/{slug}/documents` CRUD, `/templates`, `/documents/:id/export`, `/comments`, `/versions` | `{slug}.document.updated` (collaboration), export job |
| **E2 Learning** (LMS, Exam, Training) | Dashboard, Courses/Exams, Course builder, Question bank, My learning, Attempts and results, Certificates, Reports | `/courses`, `/lessons`, `/enrollments`, `/exams`, `/attempts`, `/certificates` | `enrollment.created`, `attempt.submitted`; reminder jobs |
| **E3 Talent** (Recruitment, Performance, Indicators, Job Search) | As defined in HR specs (pipeline, interviews, offers, reviews, goals); Job Search public board at `/careers` | HR spec endpoints | stage and review events |
| **E4 Time and Workforce** (Time Tracker, Timesheet, Team Workload, Rotas, Biometric) | Dashboard, Timer/entries, Approvals, Workload heatmap, Rosters, Devices (biometric), Reports | `/entries`, `/timers`, `/approvals`, `/rosters`, `/devices`, `/sync` | timer and sync events; sync/reconcile jobs |
| **E5 Accounting and Commercial docs** (Double Entry, Quotation, Recurring, Retainer, Contracts, Budget, Petty Cash, Procurement, Assets, Reports) | Dashboard, Documents list/detail with PDF, Ledger/Journal, Budgets, Approvals, Templates, Reports, Settings (numbering, tax) | `/documents`, `/journals`, `/budgets`, `/approvals`, `/reports` | `document.status_changed`; recurring and reminder jobs |
| **E6 Integration Hub** (all connectors) | **Overview** (status, last sync), **Connection** (auth, test, disconnect), **Mappings** (field/event mapping), **Logs** (runs, errors, retry), Settings | `/connect`, `/test`, `/disconnect`, `/mappings`, `/sync`, `/logs`, `/webhook` (inbound) | `integration.synced|failed`; sync jobs |
| **E7 Messaging Gateway** (SMS providers, Bulk SMS, Brevo) | Overview (balance, credits), Provider settings, Sender IDs and templates (DLT), Campaigns (bulk), Delivery logs | `/send`, `/campaigns`, `/templates`, `/logs`, `/balance`, `/webhook/dlr` | delivery events; campaign job |
| **E8 AI Service** (Assistant, Advisor, Document, Image) | Chat/Assistant, Insights, Document generator, Image studio, History, Credits and usage, Settings | `/chat`, `/insights`, `/generate`, `/history`, `/usage` | usage metering events; scheduled insight job |
| **E9 Identity and Security** (Social logins, captcha, 2FA, Backup) | Settings pages (no standalone app) except **Backup and Restore** `/backup-restore/*` (file 17 section 4) | Settings API, test endpoints | auth log events |
| **E10 Workflow and Operations** (Support, Activity Logs, Reminders, Alerts, Signature, Roadmap, Project Templates) | Per add-on lists/detail (tickets, logs viewer, reminders, alert rules, signature requests, roadmap board, templates) | CRUD per resource | SLA, reminder, alert jobs |
| **E11 Content and Storage** (Files, Documents, Knowledge, Video Hub, Drive/OneDrive/Dropbox/Box, Docs/Sheets) | Browser (folders/files), Shared links, Knowledge articles, Video library, Connections (for storage connectors), Search | `/files`, `/folders`, `/shares`, `/articles`, `/videos`, `/connections` | `file.uploaded`, sync jobs |
| **E12 Engagement and Mobility** (Notice Board, Suggestion Box, Notes, Public API, Warranty, Innovation, Portfolio) | Boards/lists, submissions with voting, Notes, API keys and docs, Warranty registry | CRUD per resource | vote and post events |

Adapter interfaces (so new providers are configuration plus a small adapter):
- **Messaging provider:** `send`, `status/webhook`, `balance`, `senderIds/templates`, `validateConfig`.
- **Connector:** `authorize/connect`, `test`, `triggers[]`, `actions[]`, `fieldMap`, `sync(direction, since)`, `webhookIn`, `disconnect`.
- **Storage connector:** `list`, `get`, `put`, `delete`, `share`, `quota`, `oauth`.
- **Social login provider:** `authorizeUrl`, `token`, `profile`, `scopes`, `discovery`.
- **AI provider:** `complete`, `embed`, `image`, `usage`.

---

## 5. The add-on vertical slice (checklist for every add-on)

An add-on is **DONE** only when all boxes are true:

1. Manifest valid; prefix and slug registered; collision check passes.
2. Entitlement works: buy/trial/grant/revoke changes menu, route, API and jobs in seconds; locked page correct.
3. Prisma models with `tenant_id`, indexes, soft delete, audit; migration tested.
4. API routes under `/api/{slug}` with permission, entitlement and validation; error codes `{code, params}`.
5. UI pages from the engine template with five states, responsive, accessible, i18n keys, no mock data.
6. Full CRUD (or documented read-only reason) on every resource, with realtime updates between two browsers.
7. Settings group `addon.{slug}` with secrets handling, Test action and status where external services exist.
8. Jobs registered in the registry with schedule, toggle and run history.
9. Events emitted through the outbox; invalidation map lines generated; notifications and email templates exist.
10. Install, upgrade and uninstall hooks tested (data retained N days on uninstall).
11. Marketplace content complete (images, benefits, FAQ, price) and the Support tab linked.
12. Tests: tenant isolation, permission, entitlement off, happy path, failure path, realtime; docs page generated from the manifest.
13. Worklog row updated with evidence (files, endpoints, test names).

---

## 6. Implementation phases (AD-track)

| Step | Name | Scope | Gate |
|---|---|---|---|
| **AD0** | Audit and reference extraction (read-only) | Document how `/hr`, `/crm`, `/accounts` and the four existing add-ons are wired (layout, guard, sidebar, API mount, realtime, permissions, settings, jobs); inventory current prefixes and collisions; check which of the 106 inventory items already exist, with evidence | Owner approves audit and confirms Q-AD01 to Q-AD04 |
| **AD1** | Manifest registry and routing | Manifest schema, loader, collision checks, generated nav/permissions/settings/jobs/events, launcher and locked pages, `/api/{slug}` mounting helper, add-on layout generator | New dummy-free sample add-on appears everywhere from its manifest only |
| **AD2** | Engines | Build engines in order E10 (tickets) and E6/E7 foundations, E9, E11, E12, E4, E5, E2, E8, E3 adapters, E1 | Each engine proven by 2 add-ons |
| **AD3** | Wave 1 add-ons | Per `worklog_addon_inventory.md` wave 1 | Per add-on DoD |
| **AD4** | Wave 2 add-ons | Wave 2 | Per add-on DoD |
| **AD5** | Wave 3 add-ons | Wave 3 and region-gated items | Per add-on DoD |

Cross-track ordering: AD0 can run now (read-only) alongside S0 (file 15). AD1 follows the A1b security items and precedes AD2. Platform flows in file 17 supply the engines for tickets (flow 5), backup (flow 4), jobs (flow 3) and i18n (flow 9), so they are built **before** the add-ons that depend on them.

---

## 7. Worklog protocol for add-ons

- Master list: `worklog_addon_inventory.md` (one row per add-on, status NS/AU/IP/DN). Copy it into the repo worklog as a new section.
- For each add-on in progress the agent keeps a **13-box checklist** (section 5) with evidence links in the session log.
- Every session entry lists: add-on IDs touched, boxes ticked, tests run (names and results), decisions, new questions.
- Status changes require evidence; DN requires all 13 boxes.
- Weekly roll-up by engine and wave (counts of NS/IP/DN).
- Naming collisions, slug changes and prefix changes are logged as decisions.

---

## 8. Open questions for you

| ID | Question |
|---|---|
| Q-AD01 | Finance prefix: `/accounts` (your wording) or `/finance` (agent's wording)? One is canonical, the other redirects |
| Q-AD02 | HR sub-modules (Recruitment, Training, Performance, Biometric, Rotas, Notice Board): keep under `/hr/...` as built, or give each its own top-level prefix such as `/recruitment`? Default in the inventory: keep under `/hr/...` |
| Q-AD03 | Integration add-ons: each gets its own `/{slug}/*` shell (default) or all live under `/integrations/{slug}`? |
| Q-AD04 | Confirm slug list in `worklog_addon_inventory.md`, especially merges (Outlook with Microsoft; Performance Indicator with Performance) and existing slugs |
| Q-AD05 | Do locked add-ons appear in the launcher and sidebar (greyed with upgrade) or stay hidden for non-admin roles? |
| Q-AD06 | Which languages must be supported first for translation of add-on UIs? |

---

## 9. Prompt for the agent (AD0)

> Start **AD0 (read-only)** from `18_Addon_Routing_and_Implementation_Playbook.md`. Do not change code. (1) Document the **reference slice** exactly as implemented for `/hr`, `/crm` and `/accounts`/finance: layout route, guard chain, sidebar source, API mount path, permissions, realtime events, settings, jobs, i18n, tests, with file evidence. (2) For each of the 106 rows in `worklog_addon_inventory.md`, report whether it exists today (routes, API, models, UI), its current prefix, any collision with reserved or existing prefixes, and gaps against the 13-box checklist; mark unverified items UNKNOWN. (3) List which add-ons already use `requireAddon`/`requireEntitlement` and which do not. (4) Propose the manifest schema and the registry design to generate nav, permissions, settings, jobs, events and routes. (5) Propose engine build order and estimates. (6) List answers needed for Q-AD01 to Q-AD06. Update the repo worklog; do not start AD1 until I approve.
