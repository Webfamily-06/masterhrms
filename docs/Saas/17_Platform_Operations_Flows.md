# 17. Platform Operations Flows

Planning document. Each flow lists: purpose, roles, screens, rules, API, data, realtime, audit and acceptance tests. UI building blocks are in `16_UI_Implementation_Guide.md`. Conventions (permissions, realtime envelope, outbox, status vocabulary) are in `hrms-plan/00_Architecture_and_Conventions.md`. Your server already has `bannedIpRouter` (`/api/banned-ips`), `systemMaintenanceRouter` (`/api/system`), `platformSupportRouter` (`/api/support/platform`), `helpdeskRouter` (`/api/helpdesk`), `announcementsRouter`, super impersonation endpoints and an `AuditLog`; the first step of each flow is to **audit what exists and extend it**, not rebuild it.

Flows covered: 1 Impersonation, 2 Banned IP, 3 Scheduled jobs, 4 Backup and restore, 5 Support tickets, 6 Broadcasts, 7 Email templates and upgrades, 8 Platform analytics, 9 Localization (i18n).

---

## 1. Impersonation: Super Admin into a tenant subdomain

**Purpose:** let platform support see or act inside a tenant workspace safely, with consent policy, time limit, visible banner and full audit.

**Roles:** Super Admin (initiates), Tenant Admin (policy, visibility, can end session), Auditor (reads logs).

**Tenant policy** (`/tenant/settings/support-access`, default **Ask me first**): `Allow without approval` / `Require approval each time` / `Disabled`. Disabled blocks everything except documented break-glass (security incident) which needs two Super Admins and a reason.

**Flow**
1. Super Admin opens `/super/tenants/:id` and clicks **Impersonate**. Dialog asks: reason (required, min length), related ticket id (optional but recommended), target portal (Tenant, HR, Employee view-as user), mode **Read-only** (default) or **Act-as** (needs `super.impersonate.write` permission), duration (15, 30, 60 min; max configurable).
2. System checks tenant policy. If approval is required, a request is pushed to Tenant Admins (realtime and email) with reason, requester, duration; they Approve/Deny in `/tenant/settings/support-access`; pending requests expire in 15 minutes.
3. On approval, the server creates `ImpersonationSession` and mints a **short-lived, host-bound token** carrying `imp: {sessionId, actorId, mode}`; the browser is redirected to `https://{workspace}.{BASE}/auth/impersonate?code=<one-time>`; the tenant host exchanges the code (valid 60 s, single use) for the session. The host-to-token tenant binding built in A1 stays enforced.
4. The tenant UI shows the **red Impersonation banner** (who, mode, time left, Exit). Optional realtime notice to tenant admins: "Platform support is viewing your workspace" with an **End session** button.
5. Exit, expiry, tenant-admin termination or Super Admin logout ends the session; the token is revoked; Super Admin returns to `/super`.

**Safety rules:** read-only blocks all non-GET operations server-side (not only UI); never allowed: change passwords, 2FA, billing/payment methods, delete tenant, export secrets, view stored secrets (masked), create other impersonation sessions; sensitive-data fields masked unless the tenant policy grants "support may view PII"; one active session per Super Admin per tenant; session list visible to tenant admins.

**API:** `POST /super/tenants/:id/impersonation` (create or request), `POST /tenant/support-access/requests/:id/approve|deny`, `POST /auth/impersonate/exchange`, `POST /impersonation/:id/end`, `GET /super/impersonations` (active and history), `GET /tenant/support-access/sessions`, `GET/PUT /tenant/support-access/policy`.

**Data:** `ImpersonationSession` (tenantId, actorId, targetUserId?, portal, mode, reason, ticketId, status requested/approved/active/ended/expired/denied, startedAt, expiresAt, endedBy, endReason, ip, userAgent), `ImpersonationAction` (optional per-request summary: method, path, status), policy stored in tenant settings. Existing `AuditLog` actions (`SUPER_ADMIN_IMPERSONATION_STARTED/ENDED`, `SUPER_ADMIN_WORKSPACE_ACCESS`) remain; add `...REQUESTED/APPROVED/DENIED/EXPIRED`.

**Realtime events:** `impersonation.requested` (tenant admins), `impersonation.approved|denied` (requester), `impersonation.started|ended|expired` (tenant admins, super admin board).

**UI:** Super Admin "Active impersonations" live board; history filter by actor/tenant/date; tenant "Support access" page with policy, pending requests, active session with End button, history.

**Tests:** read-only token cannot POST; expired token rejected; wrong-host token rejected; denied request blocks; policy Disabled blocks; actions logged; banner shows; tenant admin can end session and the Super Admin screen updates within seconds.

---

## 2. Banned IP settings

**Purpose:** block abusive or unwanted IPs at platform level and per tenant; support tenant IP allow-lists; auto-ban brute force.

**Scopes and roles:** Platform bans (Super Admin) apply to every host; Tenant rules (Tenant Admin, IT Admin) apply to that workspace only. Super Admin can view all.

**Rule types:** `BLOCK` (single IP, CIDR, range), `ALLOW` (tenant allow-list mode: when any ALLOW rule exists and "Restrict to allow-list" is on, all others are denied), **auto-ban** from thresholds, optional country block (needs geo database), expiry (permanent or until date), reason, source (manual, auto, imported).

**Auto-ban rules (configurable):** N failed logins in M minutes -> temporary ban for D minutes; N invalid OTP; N 4xx bursts; N password-reset requests; escalating durations; whitelist overrides.

**Enforcement:** earliest practical point: platform bans before tenant resolution; tenant rules after tenant resolution and before authentication for login and API; also on the **Socket handshake** and public endpoints (signup, webhook receivers where applicable). Correct client IP only from the trusted proxy chain (configured trusted hops; ignore spoofable headers). Response `403 IP_BLOCKED` with a generic message and reference id (no rule details).

**Lockout protection:** warn when a rule would block the admin's own IP; platform has a break-glass allow-list in environment config for Super Admins; allow-list mode requires adding the current IP first.

**API:** `GET/POST/PUT/DELETE /super/ip-rules`, `GET/POST/PUT/DELETE /tenant/ip-rules`, `POST /ip-rules/check` (test an IP), `POST /ip-rules/import` (CSV), `GET /ip-rules/hits` (blocked attempts), `GET/PUT /ip-rules/auto-ban-settings`.

**Data:** `IpRule` (scope, tenantId?, type, value, cidr, reason, source, expiresAt, createdBy, hitCount, lastHitAt), `IpBlockEvent` (ip, ruleId, path, userAgent, at), auto-ban settings in registry. Cache with invalidation on change.

**Realtime:** rule changes apply instantly via cache invalidation; `ip_rule.changed` updates the UI; banned IP's active sessions and sockets are dropped; hit counters live.

**UI:** rule table (filters: scope, type, status, expiring), Add rule dialog with validation, "Check this IP" tool, hits chart and recent blocks, auto-ban settings form, import/export.

**Tests:** blocked IP gets 403 on API, login and socket; expiry works; allow-list mode; spoofed `X-Forwarded-For` ignored; self-lockout warning; two instances honor a new rule within seconds.

---

## 3. Scheduled jobs (cron) from a live registry

**Purpose:** a single place that lists, controls and monitors every background job, generated from code manifests and updated live, replacing scattered `setInterval/setTimeout` (biometric auto-sync every 30 minutes, nightly biometric reconciliation 02:00 IST, subscription expiry reminders 08:00 UTC, outbox processor every 3 seconds) and future add-on jobs.

**Registry:** each job declared in a manifest: `key`, `name`, `owner` (platform / tenant / add-on slug), `schedule` (cron or interval) with allowed range, `timezone`, `timeoutMs`, `retries`, `concurrency`, `tenantScoped`, `settingsToggle`, `description`. At boot the registry upserts `ScheduledJob` rows without overwriting admin-edited schedule/enabled values.

**Execution:** one scheduler (BullMQ with Redis, or DB-based with advisory locks if Redis is not available) so only one instance runs each job; tenant-scoped jobs fan out per entitled tenant in batches; each run writes `ScheduledJobRun`; failures retry with backoff, then dead-letter and alert.

**Screens**
- Super Admin `/super/system/jobs`: all jobs; columns: name, owner, schedule (human readable), enabled, last run (status, duration), next run, success rate, running now. Actions: enable/disable, edit schedule (validated, with next-5-runs preview), **Run now**, view run history, view logs, pause all (maintenance), retry failed.
- Tenant Admin `/tenant/settings/jobs`: only tenant-scoped, entitled jobs (recurring invoices, reminders, attendance cut-off, biometric sync, report schedules); enable/disable and choose from allowed schedule presets.

**API:** `GET /super/jobs`, `PUT /super/jobs/:key` (enabled, schedule), `POST /super/jobs/:key/run`, `GET /super/jobs/:key/runs`, `GET /tenant/jobs`, `PUT /tenant/jobs/:key`, `POST /tenant/jobs/:key/run`.

**Data:** `ScheduledJob`, `ScheduledJobRun` (status, startedAt, finishedAt, durationMs, processedCount, errorCode, errorMessage trimmed, triggeredBy cron/manual/retry, instanceId), `JobLock`.

**Realtime:** `job.started`, `job.progress`, `job.completed`, `job.failed` to `platform` room (and `tenant:{id}` for tenant jobs); list updates live; failure alert in-app and email to configured recipients.

**Safety:** schedule bounds per job; manual run rate limit; jobs read settings each tick; entitlement checked per tenant per run; idempotent job bodies.

**Tests:** two instances run a job once; disabling a job stops it within one tick; Run now respects lock; failed run retries then alerts; add-on uninstall removes its jobs; job list shows a newly deployed job without manual seeding.

---

## 4. Backup and restore: database and file module

**Two levels**
- **Platform backup (Super Admin):** disaster recovery of everything. Database: provider point-in-time recovery plus scheduled logical dumps to object storage; files: bucket versioning/replication or incremental sync. Restore is an operations procedure with a runbook and approval, not a self-service button.
- **Tenant backup/export (Tenant Admin, add-on `backup-restore` or included basic export):** one workspace's data and files, downloadable and restorable into the same workspace.

**Tenant backup content:** a bundle (`.zip`) with `manifest.json` (tenant id, schema version, app version, created at, model list and row counts, checksums), data files per model in dependency order (JSON lines or CSV; `tenant_id` rows only; no secrets, no other tenants), and the **files module** (media library files with metadata and usage references). Excluded: integration secrets and passwords (must be re-entered), active sessions, audit log optional.

**Flow: create**
1. Tenant Admin `/tenant/data/backups` (or `/backup-restore`) clicks **Create backup** (full or choose modules; include files toggle).
2. Job runs asynchronously (progress and realtime), writes artifact to the configured storage target (Settings), encrypts (AES-256), stores checksum; status Completed/Failed with reason.
3. Backup list shows size, modules, schema version, created by, expiry; **Download** (signed URL, audited), **Delete**.
4. **Schedules and retention** from policy: for example daily 7, weekly 4, monthly 12 (limited by plan); schedule runs through the job registry.

**Flow: restore (guarded)**
1. Choose a backup (uploaded or from list); the system validates the checksum, schema version compatibility and tenant match.
2. **Dry run** report: counts per model to insert/update/skip, conflicts (for example missing parents), files to restore, estimated time.
3. Choose mode: **Replace** (wipe selected modules then load) or **Merge** (upsert by external id; default safer option). Typed confirmation ("RESTORE {workspace}"). Super Admin approval required when the tenant policy or plan says so.
4. System enables **tenant maintenance mode**, takes an automatic **pre-restore backup**, runs restore in batches inside transactions with progress and the ability to abort before commit points, then verifies counts, clears caches, invalidates sessions, and lifts maintenance.
5. Result report downloadable; failures roll back to the pre-restore backup option.

**Files module:** files restored with new storage paths mapped back to records; checksum verified; missing/oversized files reported; quota enforced.

**Platform screen** `/super/system/backups`: platform policy, last successful run, storage target health, restore-test results (monthly automated restore into a scratch environment, report status), per-tenant backup status overview, manual run, retention settings.

**API:** `GET/POST /tenant/backups`, `GET /tenant/backups/:id`, `GET /tenant/backups/:id/download`, `DELETE /tenant/backups/:id`, `GET/PUT /tenant/backup-policy`, `POST /tenant/restores/dry-run`, `POST /tenant/restores`, `GET /tenant/restores/:id`, `POST /tenant/restores/:id/abort`; super: `/super/backups`, `/super/backup-policy`, `/super/restores`.

**Data:** `BackupPolicy`, `BackupJob`, `BackupArtifact` (storage key, size, checksum, encryption key version, schemaVersion, modules), `RestoreJob`, `RestoreReport`.

**Realtime:** `backup.progress|completed|failed`, `restore.progress|completed|failed`, maintenance banner for the tenant.

**Security:** encrypted at rest; download links short-lived and audited; restore permissions `tenant.backup.restore` (separate from create); rate limits; never restore across tenants; tests with large tenants and failure injection.

**Tests:** backup then restore round trip equals original counts; tampered file rejected; schema-version mismatch blocked with clear message; restore with missing file reported; concurrent write blocked by maintenance mode; retention deletes old artifacts; cross-tenant backup id returns 404.

---

## 5. Support ticket flows

Three connected flows share one ticket engine (E10).

| Flow | From -> To | Where | Existing router |
|---|---|---|---|
| **A. Employee helpdesk** | Employee -> Tenant HR / IT / Payroll / Admin teams | `/me/helpdesk` (create/track); agents work in `/support/*` (queues by category) | `helpdeskRouter` |
| **B. Tenant to platform** | Tenant Admin (or delegated role) -> Super Admin support | `/tenant/support`; platform agents in `/super/support` | `platformSupportRouter` |
| **C. Escalation** | Tenant agent escalates flow A ticket to platform | "Escalate to platform" action creates a linked flow B ticket | new |

**Ticket fields:** number (sequence), scope (TENANT or PLATFORM), tenantId, requester, category, subcategory, priority, status (New, Open, Pending customer, Pending internal, On hold, Resolved, Closed, Reopened), assignee, team/queue, subject, description (rich), attachments (Media Library), tags, linked entity (employee request, invoice, add-on, order), **parent ticket** (escalation), SLA policy, due dates, CSAT, source (portal, email, chat, API).

**Flow A rules:** categories map to queues by role (HR, IT Admin, Payroll, Facilities); routing rules (category, branch, keyword) assign to team or round-robin; SLA by priority with business hours calendar; employee sees public thread only; internal notes hidden; employee can reopen within N days; managers can see their team's tickets if allowed; confidential categories (harassment, payroll disputes) restricted to named roles.

**Flow B rules:** Tenant Admin raises a ticket with **auto-attached context** (tenant, plan, entitlements, add-on id if from marketplace Support tab, app version, browser, recent error request ids, current user); categories: Billing, Technical issue, Add-on support, Feature request, Security, Data/backup; SLA by plan; Super Admin queue with filters (plan, tenant, SLA breach), assignment, internal notes, canned replies, status changes; **Request impersonation** button creates an impersonation request referencing the ticket (flow 1); resolution notes; CSAT; knowledge-base link suggestions.

**Flow C rules:** escalation copies only what the agent selects (no employee personal data unless ticked); child ticket status mirrors back to the parent as an internal-visible update; employee sees "Escalated to platform support" without internal detail.

**Common features:** realtime thread and typing, email notifications and email-to-ticket replies (tenant address and platform address), canned replies and KB, merge/split, bulk actions, SLA timers and breach alerts, escalation rules, reports (volume, first response, resolution, backlog, CSAT), audit.

**API (shared pattern):** `GET/POST /tickets`, `GET/PATCH /tickets/:id`, `POST /tickets/:id/messages` (public or internal), `POST /tickets/:id/actions/{assign|status|merge|escalate|reopen|close}`, `GET /tickets/:id/history`, with scopes `/me/tickets` (employee), `/support/tickets` (tenant agents), `/tenant/platform-tickets` (tenant admin to platform), `/super/tickets` (platform). Visibility is enforced server-side per scope and role.

**Data:** `Ticket`, `TicketMessage` (visibility public/internal), `TicketAttachment`, `TicketEvent`, `SlaPolicy`, `TicketCategory`, `TicketQueue`, `CannedReply`, `TicketLink` (parent/child).

**Realtime:** `ticket.created|assigned|replied|status_changed|sla_breached` to requester, assignee, queue room, and the other scope for escalations.

**Tests:** employee cannot see internal notes or other employees' tickets; tenant agents cannot see platform tickets; platform agents cannot see tenant tickets of other tenants; escalation link visible both ways with correct redaction; SLA timer pauses on Pending customer; reply by email lands in the thread.

---

## 6. Broadcast flow

**Purpose:** send announcements to the right audience across channels, with scheduling, targeting and tracking. Two scopes: **Platform broadcasts** (Super Admin to tenants/users) and **Tenant broadcasts** (Tenant Admin/HR to employees; this unifies with HR Announcements).

**Compose:** title, rich body, attachments, **type/priority** (Info, Success, Warning, **Critical**), channels (in-app banner, bell notification, email, push, SMS/WhatsApp if credits), schedule (now, later, recurring), expiry, "require acknowledgement", language variants (translations), preview as recipient, test send to self.

**Audience targeting**
- Platform: all tenants, by plan, by add-on/product, by region/country, by tenant status (trial, active, past due), specific tenants, tenant admins only vs all users.
- Tenant: all employees, branch, department, designation, role, employment type, individuals, saved segments.

**Delivery:** queue with throttling and per-channel rate limits; per-recipient `BroadcastDelivery` (channel, status queued/sent/delivered/opened/acknowledged/failed/bounced); critical broadcasts show a persistent banner until acknowledged; opt-out respected for non-critical channels; quota and cost for SMS/WhatsApp; recall/expire stops further display.

**Screens:** `/super/broadcasts`, `/tenant/broadcasts` (and HR Announcements list), composer, audience picker with live recipient count, delivery stats (charts, per-recipient table, resend to non-acknowledged), user inbox/banner, templates.

**API:** `GET/POST /broadcasts`, `PUT /broadcasts/:id`, `POST /broadcasts/:id/actions/{schedule|send|cancel|recall|duplicate}`, `GET /broadcasts/:id/stats`, `GET /broadcasts/:id/deliveries`, `POST /broadcasts/audience/preview`, user side `GET /me/broadcasts`, `POST /me/broadcasts/:id/{read|acknowledge}`.

**Data:** `Broadcast`, `BroadcastAudience`, `BroadcastTranslation`, `BroadcastDelivery`, `BroadcastTemplate`.

**Realtime:** `broadcast.published` to audience rooms; banner appears instantly; `broadcast.recalled` removes it; stats update live for the sender.

**Tests:** audience preview count equals delivered count; critical banner persists until acknowledged; scheduled send at the right time zone; recipient outside audience never sees it; recall removes banner in open tabs; email and bell not duplicated.

---

## 7. Email templates and the upgrade flow

**Model:** system templates keyed by event (welcome, invite, verify email, password reset, OTP, login alert, invoice, payment receipt, payment failed, renewal reminder, trial ending, leave approved/rejected, payslip published, ticket reply, broadcast, backup completed, impersonation notice, etc.). Three layers: **platform default** (Super Admin) -> **tenant override** (Tenant Admin, branded) -> **language variant** of either. Layouts (header/footer with branding from settings) are separate and shared.

**Variables:** each event has a typed variable registry (for example `{{user.name}}`, `{{tenant.name}}`, `{{invoice.number}}`, `{{link}}`); saving fails if an unknown variable is used; required variables enforced.

**Editor:** rich/HTML editor with variable picker, desktop/mobile preview using **clearly labeled sample context** (never real customer data), plain-text auto version, test send to self, spam-risk checklist, sanitization of HTML, attachments rules (invoice PDF), unsubscribe footer where required.

**Versioning and publish:** every save creates a version; platform templates go Draft -> Review -> Published; rollback to any version; change log.

**Upgrade flow (platform releases a new default)**
1. Super Admin publishes `v{n+1}` of a default template with release notes and an impact summary (which tenants customized it).
2. **Tenants that never customized** receive the new default automatically (effective immediately).
3. **Tenants that customized** get an **Upgrade available** badge (`template.upgrade_available` event + notification): a diff view (their version, the old default, the new default) with options **Keep mine**, **Take new default**, **Merge** (three-way merge editor with conflicts highlighted). Critical or legal changes (for example required compliance text) can be marked **mandatory**: the mandatory block is auto-inserted and the tenant is notified.
4. Dismissal is remembered per version; reminders after N days; tenant history of decisions.

**Delivery log:** per email: template version, recipient (masked for non-admin), status (queued, sent, delivered, bounced, complaint), provider message id, error; resend; bounce suppression list.

**API:** `GET /super/email-templates`, `PUT /super/email-templates/:key` (draft), `POST /super/email-templates/:key/publish`, `GET /tenant/email-templates`, `PUT /tenant/email-templates/:key`, `POST /tenant/email-templates/:key/{reset|test|upgrade}`, `GET /tenant/email-templates/:key/diff`, `GET /email-logs`.

**Data:** `EmailTemplate` (key, scope, tenantId?), `EmailTemplateVersion`, `EmailTemplateVariant` (locale), `EmailLayout`, `EmailLog`, `TemplateUpgradeNotice`, `EmailSuppression`.

**Tests:** unknown variable rejected; tenant override used for that tenant only; upgrade notice only for customized templates; three-way merge result correct; mandatory block enforced; rollback restores prior output; test send uses the live mail config.

---

## 8. Platform analytics and its upgrade path

**Audience:** Super Admin (`/super/analytics/*`); tenant dashboards are separate.

**Metric families**
- **Revenue:** MRR, ARR, net new MRR, expansion, contraction, churned MRR, ARPU, LTV, refunds, failed payments and dunning recovery.
- **Customers:** signups, activations, trial-to-paid conversion, active tenants (7/30 days), churn (logo and revenue), cohort retention, plan distribution, seats used vs purchased.
- **Add-ons:** installs, trials, conversions, revenue per add-on, attach rate, uninstall reasons, rating trend.
- **Product usage:** feature usage by module, active users per tenant, API calls, storage, AI/SMS/WhatsApp credits, job failures.
- **Support:** ticket volume, first response, resolution time, SLA breaches, CSAT, top categories.
- **Health and ops:** tenant health score (usage, logins, support, payment status), API latency/error rate, queue depth, webhook failures.
- **Acquisition:** source/campaign, geography, signup funnel.

**Definitions page (glossary):** each metric has a written definition, formula, and version (for example "MRR = sum of normalized monthly value of active subscriptions; annual divided by 12; trials and one-time purchases excluded").

**Pipeline:** event tracking (`UsageEvent`, `BillingEvent`, `SupportEvent`) -> nightly and hourly **rollup jobs** into `AnalyticsDaily` (tenant, day, metric, value) and materialized views -> aggregation endpoints -> UI. Realtime counters for signups and payments through socket events. Only aggregates; no tenant business content.

**Screens:** Overview dashboard (KPI cards with deltas, trend charts, funnel), Revenue, Customers and Cohorts, Add-ons, Usage, Support, Tenant health table (sortable, drill to tenant page), Reports (schedule email, export CSV/PDF), Definitions.

**Upgrade path (versioned analytics):** metrics carry a `definitionVersion`; changing a definition triggers a **backfill job** and shows both old and new values during a transition window with a banner; new widgets ship behind feature flags; retention for raw events (for example 13 months) and rollups (indefinite); data quality checks (totals reconcile with billing tables); access control by permission `super.analytics.*`; privacy review for any new field.

**API:** `GET /super/analytics/overview?from&to&compare`, `/revenue`, `/customers`, `/cohorts`, `/addons`, `/usage`, `/support`, `/health`, `GET /super/analytics/definitions`, `POST /super/analytics/backfill`, `POST /super/analytics/reports` (schedule/export).

**Tests:** MRR equals the sum from subscription tables for a seeded dataset; changing a definition backfills and flags; dashboard shows empty state with no data (no mock); cohort numbers match a hand-computed sample; permission blocks tenant users.

---

## 9. Localization (i18n) across every page

**Goal:** the whole product (public site, auth pages, every portal and add-on, emails, PDFs, notifications) can switch language, and translations are managed through a workflow.

**Languages:** enabled by Super Admin from a language list (start: English plus the languages you choose, for example Tamil and Hindi; right-to-left such as Arabic is supported by design). Each language: code, name, native name, direction, date/number/currency locale, enabled flag, default flag, completeness %.

**Resolution order:** user preference -> tenant default -> browser language (if enabled) -> platform default (English). Logged-out visitors use cookie/browser.

**Language switcher:** in the topbar of every portal, on login/signup, on the public site; switching updates the profile and reloads translation bundles without a page reload; `<html lang dir>` updated.

**Frontend:** react-i18next (or equivalent) with ICU messages; namespaces per module/add-on; lazy loading with version hash; fallback chain (tenant override -> locale -> English); no literal strings (CI lint); formatters from settings; pseudo-locale for testing; missing-key reporting to the translation system in dev and (sampled) production.

**Backend:** API errors return `{code, params}` and the client translates; server-rendered artifacts (emails, PDFs, payslips, notifications, SMS) use the recipient's language with fallback; **master data translations** (leave types, designations, departments, categories) stored as translation maps on the record; user-generated content is not auto-translated.

**Translation management (Super Admin `/super/localization`)**
1. Language CRUD and completeness dashboard per namespace.
2. **Translation editor:** table of keys with source text, translation, status (Missing, Draft, Reviewed, Published), filters (namespace, status, search), context notes/screenshots, character limits, placeholders validated (every `{{variable}}` and ICU plural preserved).
3. **Machine suggestions** (through the AI add-on) require human review before publish.
4. **Import/export** JSON, CSV, XLIFF; bulk upload; diff on import.
5. **Workflow:** Draft -> Review (reviewer role) -> Publish; publishing creates a **version** and emits `locale.updated`; rollback to previous version.
6. **Key extraction:** codemod finds hard-coded strings across `src/` and creates keys with English source; deleted keys flagged unused.

**Tenant overrides (`/tenant/settings/localization`):** choose tenant default language and enabled languages (subset), override terminology for allowed keys (for example "Employee" -> "Associate"), per-tenant email/PDF wording through templates.

**Rollout plan:** foundation and shell first (switcher, common namespace, auth pages, errors), then module by module in the order: Employee portal, HR panel, Tenant, Super, product apps, add-ons; each module "done" when no literal strings remain and the pseudo-locale shows no untranslated text.

**API:** `GET /i18n/languages`, `GET /i18n/bundle/:locale/:namespace` (with ETag), `GET/PUT /super/i18n/keys`, `POST /super/i18n/import|export|publish|rollback`, `GET /super/i18n/coverage`, `GET/PUT /tenant/i18n/overrides`, `PUT /me/preferences/language`.

**Data:** `Language`, `TranslationKey` (namespace, key, source, notes), `TranslationValue` (language, text, status, version, reviewedBy), `TranslationVersion`, `TranslationOverride` (tenantId), plus `translations` JSON on master data tables.

**Realtime:** `locale.updated` refreshes bundles in open tabs; language enablement changes update switchers.

**Tests:** switching language changes every visible string on a sample page of each portal; missing key falls back to English and is reported; placeholder mismatch blocked on save; plural rules correct; tenant override wins; emails/PDFs use recipient language; RTL snapshot passes on key pages.

---

## 10. Cross-flow dependencies and build order

| Order | Flow | Why first |
|---|---|---|
| 1 | Scheduled jobs registry (3) | Backups, reminders, analytics rollups and template/broadcast schedules all run on it |
| 2 | Banned IP (2) and Impersonation (1) | Security controls that sit on the same auth path; reuse AuditLog |
| 3 | Support tickets (5) | Impersonation requests reference tickets; add-on Support tab uses it |
| 4 | Email templates (7) and Broadcasts (6) | Notifications for tickets, impersonation, backups and broadcasts depend on templates |
| 5 | Backup and restore (4) | Needs jobs, storage settings, maintenance mode, notifications |
| 6 | Localization (9) | Start the foundation early (switcher, namespaces, lint) and roll out module by module in parallel |
| 7 | Platform analytics (8) | Needs billing events, usage events, support events, jobs |

All flows follow the vertical-slice rule: model, API, permission, UI, realtime, audit, i18n keys, tests.
