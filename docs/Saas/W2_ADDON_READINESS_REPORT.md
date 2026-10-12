# MASTERHRMS — WAVE 2 ADD-ON READINESS REPORT
## W2: Growth & Integrations

**Document ID:** DOC-SAAS-W2-RDY-001
**Status:** READINESS REVIEW — AWAITING PRODUCT OWNER AUTHORIZATION
**Review Date:** 2026-10-12
**Environment:** Localhost Development Only
**Authority:** `docs/Saas/10_SaaS_Architecture_Master_Plan.md`, `docs/Saas/12_Addon_Catalog_and_Engines.md`, `docs/Saas/18_Addon_Routing_and_Implementation_Playbook.md`, `docs/Saas/worklog_addon_inventory.md`

---

## SECTION 1 — W1 EXIT-GATE VERIFICATION

### 1.1 Fresh Independent Test Run Results (This Session — 2026-10-12)

All tests rerun independently; results are NOT copied from the previous session report.

#### W1 Add-on Suite
```
Command:  npx vitest run w1-slice --reporter=verbose
Dir:      server/
Result:   8 passed (8) — Tests 56 passed (56) — Duration 10.35s — Exit Code 0
```
**VERDICT: PASS 56/56**

#### S-Track Predecessor Regression Suite
```
Command:  npx vitest run s1- s2- s3- s4- s5- s6- s7- --reporter=verbose
Dir:      server/
Result:   7 passed (7) — Tests 116 passed (116) — Duration 83.25s — Exit Code 0
```
**VERDICT: PASS 116/116 (zero regressions)**

### 1.2 W1 Slice-by-Slice Security Findings

#### Slice 7 — Outbound Webhooks

| Finding | Severity | Detail |
|---|---|---|
| W1-WH-01 (Open) | MEDIUM | SSRF hostname validated at registration time only (URL parser). No DNS resolution at dispatch time. DNS rebinding attack: a hostname pointing to a public IP at registration time can have its DNS TTL expire and resolve to a private IP before dispatch — bypassing the blocklist. |
| W1-WH-02 (Open) | MEDIUM | HTTP redirects: the mock transport (used in tests) does not follow redirects. The production dispatch path using real `fetch` would follow 30x redirects to private IPs, bypassing the SSRF check. `redirect: 'manual'` or `redirect: 'error'` is not set. |

**SSRF Controls Verified by Code Inspection:**
- Loopback: `localhost`, `127.0.0.1`, `::1`, `*.localhost`, `*.local` — BLOCKED
- Cloud metadata: `169.254.169.254`, `metadata.google.internal`, `instance-data` — BLOCKED
- RFC 1918: `10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `0.*` — BLOCKED
- Scheme enforcement: only `http:` / `https:` — ENFORCED
- HMAC-SHA256 with `crypto.timingSafeEqual` — VERIFIED
- Replay window (300 second tolerance) — VERIFIED

#### Slice 2 — Backup & Restore

| Finding | Severity | Detail |
|---|---|---|
| W1-BK-01 (Open) | LOW | Transactional rollback on mid-restore failure not verified with fault injection. Service design uses a transaction boundary but no test confirms partial-restore rollback. |

#### Slice 1 — Two-Factor Auth

| Finding | Severity | Detail |
|---|---|---|
| W1-2FA-01 (Info) | INFO | Browser-level TOTP challenge login flow not empirically verified in this session (unit tests use service mocks). Full end-to-end browser test recommended before production cutover. |

### 1.3 W1 Exit-Gate Verdict

| Criterion | Result |
|---|---|
| W1 automated suite 56/56 | PASS |
| S-Track regression 116/116 | PASS |
| Backend `tsc --noEmit` | PASS (0 errors — confirmed previous session; rerun in progress) |
| Frontend `npm run build` | PASS (0 errors — confirmed previous session) |
| Zero live external transport | COMPLIANT |
| Strict tenant isolation | COMPLIANT |
| Secret masking / write-only | COMPLIANT |
| Localhost boundaries | COMPLIANT |
| Open findings | 2 MEDIUM, 1 LOW, 1 INFO (non-blocking for W1 close; remediation recommended before W2 cutover) |

**W1 GATE: PASS WITH FINDINGS**

---

## SECTION 2 — WAVE 2 MODULE INVENTORY

**Authoritative Source:** `docs/Saas/12_Addon_Catalog_and_Engines.md` §6 and `docs/Saas/worklog_addon_inventory.md`

### 2.1 W2 Canonical Scope (from spec §6)

> **W2: Growth & Integrations** — E6 connectors (Zapier, n8n, Make, Pabbly, Trello, Asana, Jira, To Do, HubSpot, Pipedrive, Indiamart, QuickBooks, Xero, Google Analytics), E11 storage connectors (Drive, OneDrive, Dropbox, Box), more SMS adapters, E2 LMS and Exam, Procurement, Contracts + Signature, Team Workload, Smart Reports/Dashboard, Budget Planner, Petty Cash, Knowledge, Video Hub, AI Document and Business Advisor

### 2.2 Complete W2 Module Table

| Cat ID | Add-on | Slug | Engine | Surface | Route Prefix | Inventory | Decision Pending |
|---|---|---|---|---|---|---|---|
| AD-008 | Exam | `exam` | E2 | hr-module | `/hr/exam/*` | NS | None |
| AD-018 | LMS | `learning-lms` | E2 | app | `/learning-lms/*` | NS | None |
| AD-014 | Team Workload | `team-workload` | E4 | app | `/team-workload/*` | NS | None |
| AD-062 | Rotas | `rotas` | E4/E10 | hr-module | `/hr/rotas/*` | NS | Q-W2-02: merge with HR Shifts? |
| AD-013 | Procurement | `procurement` | E5 | app | `/procurement/*` | NS | Merge/recategorize to Finance |
| AD-065 | Signature | `signature` | E10 | app | `/signature/*` | NS | None |
| AD-087 | Smart Reports | `smart-reports` | E5 | app | `/smart-reports/*` | NS | None |
| AD-088 | Smart Dashboard | `smart-dashboard` | E5 | app | `/smart-dashboard/*` | NS | None |
| AD-090 | Contracts | `contracts` | E5/E10 | app | `/contracts/*` | NS | Q-W2-03: overlap with HR contracts |
| AD-098 | Contract Templates | `contract-templates` | E5 | app | `/contract-templates/*` | NS | Q-W2-04: overlap with HR |
| AD-099 | Budget Planner | `budget-planner` | E5 | app | `/budget-planner/*` | NS | None |
| AD-103 | Petty Cash Management | `petty-cash-management` | E5 | app | `/petty-cash-management/*` | NS | None |
| AD-023 | Zapier | `zapier` | E6 | integration | `/zapier/*` | NS | None |
| AD-024 | n8n | `n8n` | E6 | integration | `/n8n/*` | NS | None |
| AD-025 | Pabbly Connect | `pabbly-connect` | E6 | integration | `/pabbly-connect/*` | NS | None |
| AD-026 | Google Analytics | `google-analytics` | E6 | integration | `/google-analytics/*` | NS | None |
| AD-031 | Make | `make` | E6 | integration | `/make/*` | NS | None |
| AD-032 | Indiamart | `indiamart` | E6 | integration | `/indiamart/*` | NS | None |
| AD-033 | Trello | `trello` | E6 | integration | `/trello/*` | NS | None |
| AD-035 | Asana Project | `asana` | E6 | integration | `/asana/*` | NS | None |
| AD-037 | Jira | `jira` | E6 | integration | `/jira/*` | NS | None |
| AD-040 | Sendinblue (Brevo) | `brevo` | E7/E6 | integration | `/brevo/*` | NS | Slug must be `brevo` not `sendinblue` |
| AD-043 | HubSpot Support | `hubspot-support` | E6 | integration | `/hubspot-support/*` | NS | None |
| AD-044 | Pipedrive | `pipedrive` | E6 | integration | `/pipedrive/*` | NS | None |
| AD-046 | Microsoft To Do | `microsoft-todo` | E6 | integration | `/microsoft-todo/*` | NS | None |
| AD-102 | QuickBooks | `quickbooks` | E6 | integration | `/quickbooks/*` | NS | None |
| AD-104 | Xero | `xero` | E6 | integration | `/xero/*` | NS | None |
| AD-029 | Bulk SMS | `bulk-sms` | E7 | integration | `/bulk-sms/*` | NS | Depends on sms-gateway (W1 DN) |
| AD-050 | AI Business Advisor | `ai-business-advisor` | E8 | app | `/ai-business-advisor/*` | NS | AI API key required |
| AD-051 | AI Document | `ai-document` | E8 | app | `/ai-document/*` | NS | AI API key required |
| AD-073 | File Sharing | `file-sharing` | E11 | app | `/file-sharing/*` | NS | Wave conflict: §4.7=W1, inventory=W2 |
| AD-074 | Documents | `documents` | E11 | app | `/documents/*` | NS | Wave conflict: §4.7=W1, inventory=W2 |
| AD-075 | Internal Knowledge | `knowledge-base` | E11 | app | `/knowledge-base/*` | NS | None |
| AD-076 | Google Drive | `google-drive` | E11 | app | `/google-drive/*` | NS | OAuth app registration needed |
| AD-078 | Video Hub | `video-hub` | E11 | app | `/video-hub/*` | NS | None |
| AD-079 | Document Template | `document-template` | E11 | app | `/document-template/*` | NS | Q-W2-04: overlap HR doc templates |
| AD-081 | OneDrive | `onedrive` | E11 | app | `/onedrive/*` | NS | OAuth app registration needed |
| AD-084 | Dropbox | `dropbox` | E11 | app | `/dropbox/*` | NS | OAuth app registration needed |
| AD-085 | Box | `box` | E11 | app | `/box/*` | NS | OAuth app registration needed |

**Total W2: 39 modules**

---

## SECTION 3 — DEPENDENCY AND IMPLEMENTATION ORDER

### 3.1 Engine Foundation Status

| Engine | W1 Modules | W2 Depends | Foundation Status |
|---|---|---|---|
| E2 Learning | None | Exam, LMS | Scaffolded (A6). No W1 proof-of-use. |
| E4 Time & Workforce | None | Team Workload, Rotas | Scaffolded (A6). Biometric existing. |
| E5 Accounting | None | 8 modules | Scaffolded (A6). Double Entry existing. |
| E6 Integration Hub | Outbound Webhooks (W1 PASS) | 14 connectors | **PROVEN — W1 exit gate PASS is direct evidence** |
| E7 Messaging | SMS Gateway (W1 PASS) | Bulk SMS, Brevo | **PROVEN — W1 exit gate PASS** |
| E8 AI Service | None | AI Document, AI Advisor | Scaffolded (A6). External API key blocked. |
| E11 Content & Storage | None | 9 modules | Scaffolded (A6). OAuth connectors externally blocked. |

### 3.2 Recommended Implementation Groups

**Group A — E6 Connectors (14 modules, NO external blockers)**
E6 engine proven stable. All use the standard Integration Hub connector shell.
Order: Zapier → n8n → Make → Pabbly Connect → Trello → Asana → Jira → Microsoft To Do → HubSpot Support → Pipedrive → Indiamart → Google Analytics → QuickBooks → Xero

**Group B — E7 Extensions (2 modules, E7 proven stable)**
Bulk SMS → Brevo

**Group C — E11 Non-OAuth (5 modules, no external blockers)**
File Sharing → Documents → Document Template → Internal Knowledge → Video Hub

**Group D — E5 Finance & Operations (8 modules)**
Budget Planner → Petty Cash → Smart Reports → Smart Dashboard → Signature → Procurement → Contracts → Contract Templates

**Group E — E2 Learning (2 modules)**
LMS → Exam

**Group F — E4 Workforce (2 modules, Rotas pending decision)**
Team Workload → Rotas (pending Q-W2-02)

**Group G — E11 OAuth Storage Connectors (4 modules, externally blocked)**
Google Drive → OneDrive → Dropbox → Box (BLOCKED until OAuth apps registered)

**Group H — E8 AI (2 modules, externally blocked)**
AI Document → AI Business Advisor (BLOCKED until AI API key provided)

---

## SECTION 4 — PER-MODULE SECURITY & TENANT-ISOLATION ACCEPTANCE CRITERIA

### E6 Integration Hub Connectors (applies to all 14 connector add-ons)

1. Tenant A's OAuth tokens/API keys cannot be seen or used by Tenant B.
2. OAuth state parameter is cryptographically random and bound to `tenantId`; forged state returns 400.
3. Provider credentials encrypted AES-256-GCM at rest via `encryptSecret()`.
4. Connection test endpoint performs no writes or billable operations.
5. Disconnect: revoke OAuth tokens, remove jobs, purge delivery logs.
6. Sync logs strictly tenant-scoped.
7. Inbound webhook URL path includes `tenantId`; route validates binding.
8. Sync jobs rate-limited per tenant.
9. `requireEntitlement(slug)` on all routes; 403 `ADDON_REQUIRED` when not entitled.

### E7 Bulk SMS & Brevo

1. Campaign dispatch sandboxed until production credentials configured.
2. Opt-out list enforced per campaign; blocked numbers not sent.
3. DLT Sender ID / template validated before India sends.
4. Credit deductions atomic; no double-deduct on retry.
5. Delivery report webhook validated with provider HMAC where supported.
6. Strict tenant isolation on campaigns, templates, opt-out lists.

### E11 OAuth Storage Connectors

1. OAuth tokens AES-256-GCM encrypted per-tenant.
2. File operations scoped to consented folders only; no provider root access.
3. Shared links use random unguessable tokens with configurable expiry.
4. Token refresh errors fail-closed; stale token is not silently reused.
5. Provider quota errors surface to tenant admin.

### E11 Internal (File Sharing, Documents, Knowledge, Video Hub)

1. Files stored in tenant-partitioned paths; directory traversal rejected.
2. Shared link tokens are random and tenant-bound.
3. Version history visible only within same tenant.
4. Soft delete with retention period; no immediate content destruction.

### E8 AI Service

1. Tenant data never batched with another tenant's data in the same AI call.
2. Credit metering deducted atomically; exhaustion returns 402 with upgrade prompt.
3. AI provider API keys never exposed to client-side bundles.
4. Content policy guardrails enforced; output sanitized before persistence.

### E5 Finance & Operations

1. All documents carry `tenantId`; cross-tenant access returns 403.
2. Signature add-on: signing URL is a one-time token; expired tokens rejected.
3. Procurement PO approvals use existing Workflow Engine only.
4. Budget/petty cash amounts use high-precision decimal; no floating point.
5. Smart Reports: filter expressions validated server-side; no raw SQL from client.

### E2 Learning

1. Course enrollment scoped per-tenant; no cross-tenant enrollment.
2. Exam timer enforced server-side, not client-side only.
3. Question bank selection server-generated; client cannot specify question IDs.
4. Certificates are server-signed or HMAC-verified.

### E4 Workforce

1. Workload data filtered to `tenantId` + requesting user's `dataScope`.
2. Roster entries linked to Employee records within same tenant.
3. Rotas entitlement guard applies regardless of surface decision.

---

## SECTION 5 — REGRESSION TEST & BUILD GATES

### 5.1 Prerequisite Gates (Must Pass Before W2 Implementation Begins)

| Suite | Command | Threshold | Status |
|---|---|---|---|
| W1 Add-on Suite | `npx vitest run w1-slice` | 56/56 | PASS (this session) |
| S-Track Predecessors | `npx vitest run s1- s2- s3- s4- s5- s6- s7-` | 116/116 | PASS (this session) |
| Backend TypeScript | `npx tsc --noEmit` (server/) | 0 errors | Rerun in progress (0 errors in previous session) |
| Frontend Build | `npm run build` (root) | Exit 0 | PASS (previous session) |

### 5.2 New Test Requirements per W2 Slice

Each slice must include `server/src/tests/w2-slice{N}-{slug}.test.ts` covering:
- Manifest validation and catalog ID
- Entitlement guard: 403 when not entitled
- Happy path CRUD or connect/sync/disconnect
- Cross-tenant IDOR rejection
- Credential masking
- Engine-specific acceptance from §4

### 5.3 W2 Completion Build Gates

| Gate | Command | Criteria |
|---|---|---|
| All W2 tests | `npx vitest run w2-slice` | 100% pass |
| W1+W2 regression | `npx vitest run w1-slice w2-slice` | Zero regressions |
| S-Track regression | `npx vitest run s1- s2- s3- s4- s5- s6- s7-` | 116/116 |
| Backend TypeScript | `npx tsc --noEmit` | 0 errors |
| Frontend build | `npm run build` | Exit 0 |

---

## SECTION 6 — OPEN QUESTIONS FOR PRODUCT OWNER

| ID | Question | Affects | Priority |
|---|---|---|---|
| Q-W2-01 | `File Sharing` (AD-073) and `Documents` (AD-074) are Wave 1 in catalog §4.7 but Wave 2 in inventory. Confirm final wave. | Implementation order | Low |
| Q-W2-02 | Confirm `Rotas` (AD-062): keep as hr-module under `/hr/rotas/*` or top-level prefix? Overlap with HR Shifts must be resolved. | Architecture | Medium |
| Q-W2-03 | `Contracts` (AD-090): standalone `/contracts/*` add-on or extend existing HR contracts? | Architecture | Medium |
| Q-W2-04 | `Document Template` (AD-079) vs existing HR document templates: shared engine or separate manifests? | Architecture | Medium |
| Q-W2-05 | OAuth connector apps (Google Drive, OneDrive, Dropbox, Box): client IDs/secrets available or need registration? | Unblocking Group G | High |
| Q-W2-06 | AI add-ons (E8): which AI provider and model? API key available? | Unblocking Group H | High |
| Q-W2-07 | Should W1-WH-01 (DNS rebinding SSRF) and W1-WH-02 (redirect guard) be remediated before W2 Group A begins or deferred? | Security posture | Recommended BEFORE W2 |
| Q-W2-08 | Which 5–8 W2 modules are highest business priority? (Agent recommends Group A E6 connectors first) | Sprint planning | Medium |
| Q-W2-09 | Confirm Finance prefix: `/accounts` or `/finance`? (Q-AD01 still open) | E5 add-on routing | Medium |

---

## SECTION 7 — SUMMARY STATUS TABLE

| Module | ID | Engine | Readiness |
|---|---|---|---|
| Zapier | AD-023 | E6 | READY |
| n8n | AD-024 | E6 | READY |
| Pabbly Connect | AD-025 | E6 | READY |
| Google Analytics | AD-026 | E6 | READY |
| Make | AD-031 | E6 | READY |
| Indiamart | AD-032 | E6 | READY |
| Trello | AD-033 | E6 | READY |
| Asana Project | AD-035 | E6 | READY |
| Jira | AD-037 | E6 | READY |
| HubSpot Support | AD-043 | E6 | READY |
| Pipedrive | AD-044 | E6 | READY |
| Microsoft To Do | AD-046 | E6 | READY |
| QuickBooks | AD-102 | E6 | READY |
| Xero | AD-104 | E6 | READY |
| Bulk SMS | AD-029 | E7 | READY |
| Brevo (Sendinblue) | AD-040 | E7/E6 | READY |
| Team Workload | AD-014 | E4 | READY |
| Signature | AD-065 | E10 | READY |
| Smart Reports | AD-087 | E5 | READY |
| Smart Dashboard | AD-088 | E5 | READY |
| Budget Planner | AD-099 | E5 | READY |
| Petty Cash Management | AD-103 | E5 | READY |
| File Sharing | AD-073 | E11 | READY (wave confirm Q-W2-01) |
| Documents | AD-074 | E11 | READY (wave confirm Q-W2-01) |
| Internal Knowledge | AD-075 | E11 | READY |
| Video Hub | AD-078 | E11 | READY |
| LMS | AD-018 | E2 | READY |
| Exam | AD-008 | E2 | READY |
| Rotas | AD-062 | E4/E10 | PENDING DECISION (Q-W2-02) |
| Procurement | AD-013 | E5 | PENDING DECISION (merge) |
| Contracts | AD-090 | E5/E10 | PENDING DECISION (Q-W2-03) |
| Contract Templates | AD-098 | E5 | PENDING DECISION (Q-W2-04) |
| Document Template | AD-079 | E11 | PENDING DECISION (Q-W2-04) |
| Google Drive | AD-076 | E11 | EXTERNALLY BLOCKED (OAuth) |
| OneDrive | AD-081 | E11 | EXTERNALLY BLOCKED (OAuth) |
| Dropbox | AD-084 | E11 | EXTERNALLY BLOCKED (OAuth) |
| Box | AD-085 | E11 | EXTERNALLY BLOCKED (OAuth) |
| AI Business Advisor | AD-050 | E8 | EXTERNALLY BLOCKED (AI key) |
| AI Document | AD-051 | E8 | EXTERNALLY BLOCKED (AI key) |

**READY: 28/39 | PENDING DECISION: 5/39 | EXTERNALLY BLOCKED: 6/39**

---

## SECTION 8 — RECOMMENDATION

### W1 EXIT GATE: PASS WITH FINDINGS
56/56 W1 tests and 116/116 S-Track regression tests independently verified this session.
Two open medium-severity SSRF findings on Outbound Webhooks (W1-WH-01 DNS rebinding, W1-WH-02 redirect guard) are not blocking W1 close but are strongly recommended for remediation before any W2 E6 connector is deployed to a non-localhost environment.

### W2 AUTHORIZATION: CONDITIONAL READY

**Recommend authorizing Group A (14 E6 connectors) + Group B (2 E7 extensions) + Group C (5 E11 non-OAuth) immediately upon Product Owner sign-off.**

This covers 21 of 39 modules with no external blockers and engines proven stable by W1.

**Hold pending:**
- Architecture decisions on Rotas, Contracts, Procurement, Contract/Document Templates (5 modules — awaiting Q-W2-02 through Q-W2-04).
- OAuth app registrations for Google Drive, OneDrive, Dropbox, Box (4 modules).
- AI provider API key for AI Document, AI Business Advisor (2 modules).

**Strongly recommended before W2 Group A begins:**
- Remediate W1-WH-01: add DNS resolution at dispatch time in `outbound-webhooks.service.ts`.
- Remediate W1-WH-02: set `redirect: 'manual'` / `redirect: 'error'` in production fetch dispatch.

---

## SECTION 9 — HARD STOP

This document is a READINESS REVIEW ONLY. No Wave 2 code has been written or modified.
Awaiting explicit Product Owner authorization before starting W2 implementation.
All W2 work must remain on localhost with no VPS deployment, no live OAuth callbacks to production apps, no real AI API usage beyond sandbox keys, no destructive database migrations, and no live payment or SMS transactions.

---

*Document ID: DOC-SAAS-W2-RDY-001 | Generated: 2026-10-12 | MASTERHRMS Agent*
