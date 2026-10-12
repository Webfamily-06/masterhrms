# MASTERHRMS — WAVE 2 IMPLEMENTATION SEQUENCE & ACCEPTANCE PLAN

**Document ID:** `DOC-SAAS-W2-PLAN-001`  
**Milestone:** Wave 2 Pre-Implementation Gate & Execution Roadmap  
**Reference Readiness Report:** `docs/Saas/W2_ADDON_READINESS_REPORT.md` (`DOC-SAAS-W2-RDY-001`)  
**Reference W1 Freeze:** `docs/Saas/W1_PRODUCT_OWNER_REVIEW_AND_FREEZE_REPORT.md` (`DOC-SAAS-W1-FREEZE-001`)  
**Platform Standard:** `docs/Saas/ADDON_PLATFORM_UX_INSTALLATION_AND_PRICING_STANDARD.md` (`DOC-SAAS-STD-ADDON-001`)  
**Catalog Authority:** `docs/Saas/12_Addon_Catalog_and_Engines.md` & `docs/Saas/18_Addon_Routing_and_Implementation_Playbook.md`  
**Date:** 2026-10-12  
**Status:** **AUTHORITATIVE PLANNING BASELINE (PRE-IMPLEMENTATION GATE)**  
**Constraint:** Planning and verification only. No Wave 2 implementation may commence until Product Owner explicitly authorizes execution.

---

## 1. Executive Summary & Strategy

Following the formal baseline freeze of Wave 1 (`DOC-SAAS-W1-FREEZE-001`), this document defines the dependency-aware implementation sequence, architectural blueprints, and strict acceptance criteria for **Wave 2 Add-ons**.

Wave 2 focuses on **Growth, Integrations, and Content Collaboration**. Out of the 39 candidate modules inventoried in `worklog_addon_inventory.md`, this plan details the execution sequence for the **21 initial authorized modules**, while isolating and tracking all pending decisions and externally blocked modules.

### Scope Segmentation Summary

```
Total Wave 2 Candidate Modules: 39
├── Authorized Initial Wave 2 Scope: 21 Modules
│   ├── Group A (14 Modules): E6 Integration & Connector Engine (iPaaS, Project Management, CRM, Analytics, Accounting)
│   ├── Group B (2 Modules):  E7 Messaging Engine Extensions (Bulk SMS, Brevo Transactional Email/SMS)
│   └── Group C (5 Modules):  E11 Content, Document & Knowledge Engine (File Sharing, Documents, Templates, KB, Video Hub)
├── Pending Product Owner Decisions: 5 Modules (Rotas, Procurement, Contracts, Contract Templates, Document Template HR vs General)
├── Externally Blocked (OAuth / App Approvals): 6 Modules (Google Drive, OneDrive, Dropbox, Box, AI Document, AI Advisor)
└── Scheduled Subsequent Phases: 7 Modules (LMS, Exam, Team Workload, Signature, Smart Reports, Smart Dashboard, Budget/Petty Cash)
```

---

## 2. Reconciled Inventory of the Authorized 21 Modules

Every authorized module is mapped to its authoritative catalog definition in `12_Addon_Catalog_and_Engines.md` and route standard in `18_Addon_Routing_and_Implementation_Playbook.md`.

### 2.1 Group A: 14 E6 Connectors (Integration Shells)

All Group A modules leverage the canonical **E6 Integration Engine** using the standardized 4-tab Connector Shell (`/engine-shell/integration`):
1. **Overview:** Connection status, description, sync direction, active scopes.
2. **Connection Settings:** Provider credentials (API keys, Webhook URLs, client IDs), AES-256-GCM encrypted, masked (`••••••••••••••••`), with an inline `Test Connection` probe.
3. **Event Mappings / Triggers:** Inbound/outbound event trigger selections (e.g. `employee.created`, `leave.approved`, `invoice.paid`).
4. **Delivery & Audit Logs:** Tenant-scoped event dispatch history, HTTP status, execution latency, retry controls.

| Catalog ID | Add-on Name | Slug | Route Prefix | Surface | Engine | Default Tier / Pricing | Purpose & Scope |
|---|---|---|---|---|---|---|---|
| **AD-023** | Zapier | `zapier` | `/zapier/*` | integration | E6 | Free / Included | Webhook triggers & action dispatch to Zapier Zaps |
| **AD-024** | n8n | `n8n` | `/n8n/*` | integration | E6 | Free / Included | Self-hosted & cloud workflow automation integration |
| **AD-031** | Make | `make` | `/make/*` | integration | E6 | Free / Included | Make.com (Integromat) scenario webhook bindings |
| **AD-025** | Pabbly Connect | `pabbly-connect` | `/pabbly-connect/*` | integration | E6 | Free / Included | Indian SaaS automation platform webhook dispatcher |
| **AD-033** | Trello | `trello` | `/trello/*` | integration | E6 | Pro / Paid | Card creation on task/project/ticket lifecycle events |
| **AD-035** | Asana | `asana` | `/asana/*` | integration | E6 | Pro / Paid | Project task sync & milestone updates |
| **AD-037** | Jira | `jira` | `/jira/*` | integration | E6 | Pro / Paid | Issue tracking sync for engineering and IT helpdesk |
| **AD-046** | Microsoft To Do | `microsoft-todo` | `/microsoft-todo/*` | integration | E6 | Pro / Paid | Personal task sync from reminders & approvals |
| **AD-043** | HubSpot Support | `hubspot-support` | `/hubspot-support/*` | integration | E6 | Pro / Paid | CRM contact, ticket, and timeline sync |
| **AD-044** | Pipedrive | `pipedrive` | `/pipedrive/*` | integration | E6 | Pro / Paid | Deal, organization, and person synchronization |
| **AD-032** | IndiaMART | `indiamart` | `/indiamart/*` | integration | E6 | Pro / Paid | Inbound lead webhook ingestion from IndiaMART marketplace |
| **AD-026** | Google Analytics | `google-analytics` | `/google-analytics/*` | integration | E6 | Free / Included | Measurement ID & server-side event tracking |
| **AD-077** | QuickBooks | `quickbooks` | `/quickbooks/*` | integration | E6 | Pro / Paid | Accounting sync: invoices, customers, and payments |
| **AD-078** | Xero | `xero` | `/xero/*` | integration | E6 | Pro / Paid | Cloud ledger sync: invoices, bills, and tax rates |

### 2.2 Group B: 2 E7 Messaging Extensions

Group B modules extend the canonical **E7 Outbound Messaging Engine** established in Wave 1 (`sms-gateway`).

| Catalog ID | Add-on Name | Slug | Route Prefix | Surface | Engine | Default Tier / Pricing | Purpose & Scope |
|---|---|---|---|---|---|---|---|
| **AD-029** | Bulk SMS | `bulk-sms` | `/bulk-sms/*` | integration | E7 | Pro / Usage | Broadcast SMS campaigns, department alerts, CSV recipient lists, DLT template binding |
| **AD-040** | Brevo | `brevo` | `/brevo/*` | integration | E7/E6 | Pro / Paid | Brevo (Sendinblue) transactional email & SMS provider integration with delivery webhooks |

### 2.3 Group C: 5 E11 Content & Knowledge Modules

Group C modules leverage the canonical **E11 Document & Storage Engine**, utilizing `StorageFactory`, `LocalEncryptedStorage`, and `uploadsSecurityMiddleware` for strict tenant file isolation.

| Catalog ID | Add-on Name | Slug | Route Prefix | Surface | Engine | Default Tier / Pricing | Purpose & Scope |
|---|---|---|---|---|---|---|---|
| **AD-073** | File Sharing | `file-sharing` | `/file-sharing/*` | app | E11 | Pro / Paid | Tenant file repository, expiring secure links, password-protected shares |
| **AD-074** | Documents | `documents` | `/documents/*` | app | E11 | Free / Included | Organization document library, categorization, role-based download permissions |
| **AD-079** | Document Template | `document-template` | `/document-template/*` | app | E11 | Pro / Paid | Standard business document templates, merge tags, variable interpolation |
| **AD-075** | Internal Knowledge | `knowledge-base` | `/knowledge-base/*` | app | E11 | Pro / Paid | Internal wiki, searchable documentation, department FAQs, versioned articles |
| **AD-087** | Video Hub | `video-hub` | `/video-hub/*` | app | E11 | Pro / Paid | Training and internal video repository, secure streaming, watch progress tracking |

---

## 3. Status of Non-Wave 2 Modules (Isolated & Tracked)

To prevent scope creep and maintain strict boundary controls, the remaining 18 modules are explicitly categorized:

### 3.1 Pending Product Owner Decisions (5 Modules)

| Catalog ID | Slug | Conflict / Decision Required | Action Taken |
|---|---|---|---|
| **AD-062** | `rotas` | Overlaps with Core Shift Management / Scheduling in HRMS. Needs decision: standalone add-on or core feature? | **HOLD** pending PO decision. |
| **AD-013** | `procurement` | Overlaps with Inventory/Purchase Orders in ERP track. | **HOLD** pending PO decision. |
| **AD-090** | `contracts` | Overlaps with Employee Contracts in HR vs Client Contracts in CRM. | **HOLD** pending PO decision. |
| **AD-098** | `contract-templates` | Sub-capability of `contracts` vs `document-template`. | **HOLD** pending PO decision. |
| **AD-079** | `document-template` | Reconcile HR employee letter templates vs general business document templates. | General business templates assigned to Group C; HR letter templates remain in HR core. |

### 3.2 Externally Blocked Modules (6 Modules)

| Catalog ID | Slug | External Dependency / Blocker | Reason |
|---|---|---|---|
| **AD-076** | `google-drive` | Google Cloud Console OAuth App verification & client credentials. | External cloud credentials required. |
| **AD-081** | `onedrive` | Microsoft Azure Entra ID App registration & tenant approval. | External cloud credentials required. |
| **AD-084** | `dropbox` | Dropbox App Console app secret & production redirect URI. | External cloud credentials required. |
| **AD-085** | `box` | Box Developer Console enterprise JWT or OAuth credentials. | External cloud credentials required. |
| **AD-051** | `ai-document` | Paid LLM API keys (OpenAI / Anthropic / Gemini). | External cloud credentials required. |
| **AD-050** | `ai-business-advisor` | Paid LLM API keys & enterprise fine-tuning quota. | External cloud credentials required. |

### 3.3 Deferred to Subsequent Waves (7 Modules)

| Catalog ID | Slug | Scheduled Wave | Rationale |
|---|---|---|---|
| **AD-008** | `exam` | Wave 2.5 / LMS Track | Requires LMS prerequisite engine. |
| **AD-018** | `learning-lms` | Wave 2.5 / LMS Track | Comprehensive multi-course learning management system. |
| **AD-014** | `team-workload` | Wave 2.5 / PM Track | Dependent on project & task time logging baselines. |
| **AD-065** | `signature` | Wave 3 / E-Sign Track | Requires PKI digital certificate integration or third-party e-sign API. |
| **AD-087** | `smart-reports` | Wave 3 / BI Track | Advanced BI charting engine. |
| **AD-088** | `smart-dashboard` | Wave 3 / BI Track | Advanced BI visualization widgets. |
| **AD-099** | `budget-planner` | Wave 3 / Finance Track | Advanced double-entry financial planning. |
| **AD-103** | `petty-cash-management` | Wave 3 / Finance Track | Cash-box reconciliation workflows. |

---

## 4. Architectural Rules & Standards for Wave 2

All 21 Wave 2 add-ons must strictly implement the rules established in `DOC-SAAS-STD-ADDON-001`:

### 4.1 Authoritative Platform Standards

1. **Shared Commerce & Lifecycle Engine:**
   - No custom payment forms, independent checkout endpoints, or bespoke gateway integrations per add-on.
   - All commercial purchases flow through `POST /api/commerce/checkout` and Razorpay Platform Gateway (`system-platform-settings`, PLATFORM scope).
   - Free add-ons install immediately via `POST /api/addons/:slug/install` with zero payment redirection and zero invoice creation.
   - Paid add-ons require server-side verified order completion before entitlement activation (`EntitlementService.grantEntitlement`).
2. **Dual Gateway Separation:**
   - Platform commercial billing uses `system-platform-settings`.
   - Business accounting/invoicing uses tenant-scoped `system-razorpay-gateway-${tenantId}`. Under no circumstances may an add-on read or mutate the platform gateway.
3. **Secret Storage & Redaction:**
   - Provider API keys, client secrets, and webhooks must be encrypted at rest using AES-256-GCM.
   - On GET APIs, all secrets return strictly masked (`••••••••••••••••`).
   - On partial updates, existing secrets must be preserved if the field contains empty string or the mask value.
4. **No Faked External Connections ("Zero Mock" Rule):**
   - If an integration requires an external API key, OAuth token, or webhook endpoint that is unconfigured, the UI **must display an accurate `Setup Required` state**.
   - Under no circumstances may an integration show `Connected` or return fake success responses when real credentials are absent.
   - Test probes (`POST /:slug/test-connection`) must return explicit diagnostic messages indicating whether sandbox doubles or live endpoints were contacted.
5. **Fail-Closed Tenant Isolation:**
   - Every database query must filter on `tenantId`.
   - All routes must execute `requireEntitlement(slug)` and `requireTenant`.
   - Cross-tenant requests must return HTTP 404 (or 403 Forbidden).

---

## 5. Dependency-Aware Implementation Sequence

To minimize risk and maximize code reuse, the 21 modules will be implemented in **6 discrete batches**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Batch 1: Shared Connector Engine Infrastructure (E6 Engine Foundations)│
│ Core: Connector Registry, Secret Vault, Dispatched Event Bus, Logs     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴───────────────────────────┐
       ▼                                                        ▼
┌──────────────────────────────────────────┐ ┌──────────────────────────────────────────┐
│ Batch 2: Group A — iPaaS Automation      │ │ Batch 3: Group A — Project & Issue Sync  │
│ • Zapier, n8n, Make, Pabbly Connect      │ │ • Trello, Asana, Jira, Microsoft To Do   │
└──────────────────┬───────────────────────┘ └──────────────────┬───────────────────────┘
                   │                                            │
       ┌───────────┴────────────────────────────────────────────┴───────┐
       ▼                                                                ▼
┌──────────────────────────────────────────┐ ┌──────────────────────────────────────────┐
│ Batch 4: Group A — CRM, Leads & Ledger   │ │ Batch 5: Group B — Messaging Extensions  │
│ • HubSpot, Pipedrive, IndiaMART,         │ │ • Bulk SMS (CSV/Campaigns),              │
│   Google Analytics, QuickBooks, Xero     │ │   Brevo (Sendinblue Email/SMS)           │
└──────────────────┬───────────────────────┘ └──────────────────┬───────────────────────┘
                   │                                            │
                   └────────────────────┬───────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Batch 6: Group C — Content, Documents & Knowledge Base (E11 Engine)    │
│ • Documents, File Sharing, Document Template, Knowledge Base, Video Hub│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Detailed Batch Specifications & Acceptance Criteria

### Batch 1: Shared Connector Engine Infrastructure
*Prerequisite for Group A (E6)*

- **Scope:**
  - Create `server/src/modules/integration-connectors/`:
    - `connector-registry.ts`: Authoritative connector metadata, credential schemas, supported events.
    - `connector-credentials.service.ts`: Tenant-scoped AES-256-GCM encryption, secret masking (`••••••••••••••••`), and rotation.
    - `connector-dispatcher.service.ts`: Outbound payload formatting, HMAC signing, retry scheduling with exponential backoff.
    - `connector-logs.service.ts`: Dispatched execution logs, HTTP responses, latency tracking.
  - Create reusable frontend shell `src/components/addons/connector-shell/`:
    - 4-tab layout: Overview, Connection Settings, Event Triggers, Execution Logs.
    - Standard status header: Active, Disabled, Setup Required.
- **Acceptance Criteria:**
  - [ ] 0 plaintext secrets in database or API responses.
  - [ ] Partial update preserves existing secrets without re-encryption of masked string.
  - [ ] Cross-tenant credential access strictly returns 404.

---

### Batch 2: Group A — iPaaS Automation Connectors
*Modules: `zapier`, `n8n`, `make`, `pabbly-connect` (4 Modules)*

- **Specific Behavior:**
  - Inbound webhook URLs generated per tenant: `https://api.masterhrms.com/api/integrations/:connector/webhook/:tenantId/:webhookKey`
  - Webhook secret verification (HMAC or Bearer token).
  - Outbound event dispatch for core tenant events (`employee.created`, `leave.approved`, `attendance.clocked_in`).
- **Acceptance Criteria:**
  - [ ] Unconfigured connector displays `Setup Required` badge.
  - [ ] Valid webhook URL generation with unique, cryptographically random tenant webhook keys.
  - [ ] Cross-tenant webhook dispatch blocked with 404/403.
  - [ ] Test dispatch event delivers safely to mock transport without external network leakage.

---

### Batch 3: Group A — Project & Task Management Connectors
*Modules: `trello`, `asana`, `jira`, `microsoft-todo` (4 Modules)*

- **Specific Behavior:**
  - Target project/board/list configuration mapping.
  - Event triggers: HR Onboarding task assigned, Support Ticket created, Goal milestone reached.
  - Outbound payload formatters tailored to provider specs (Trello Cards, Asana Tasks, Jira Issues, MS To Do Tasks).
- **Acceptance Criteria:**
  - [ ] Form validations for required provider keys (e.g. Jira Host URL, Atlassian Email, API Token).
  - [ ] Test connection probe verifies reachability or returns detailed setup instructions.
  - [ ] Failure states gracefully logged in Execution Logs without halting tenant application execution.

---

### Batch 4: Group A — CRM, Lead Ingestion & Accounting Connectors
*Modules: `hubspot-support`, `pipedrive`, `indiamart`, `google-analytics`, `quickbooks`, `xero` (6 Modules)*

- **Specific Behavior:**
  - `indiamart`: Inbound CRM lead ingestion from IndiaMART Push API / CRM API, parsing company, contact, requirement.
  - `hubspot-support` & `pipedrive`: Bi-directional customer & deal syncing from CRM modules.
  - `google-analytics`: Measurement ID configuration (`G-XXXXXXXXXX`), injecting gtag tracking script for customer-facing portals.
  - `quickbooks` & `xero`: Outbound invoice sync (`invoice.created`, `invoice.paid`), customer tax mapping.
- **Acceptance Criteria:**
  - [ ] IndiaMART webhook endpoint validates provider key and idempotently creates CRM leads.
  - [ ] Accounting sync skips draft invoices and only triggers on approved/finalized records.
  - [ ] Google Analytics Measurement ID strictly validated against regex `^G-[A-Z0-9]+$`.

---

### Batch 5: Group B — Outbound Messaging Extensions
*Modules: `bulk-sms`, `brevo` (2 Modules)*

- **Specific Behavior:**
  - `bulk-sms`:
    - Extends `SMSFactory` from Wave 1.
    - Recipient list upload (CSV / Excel) with phone number normalization (E.164 / +91 10-digit).
    - DLT Template ID and Entity ID binding for Indian regulatory compliance.
    - Campaign scheduling and dry-run preview.
    - Strict sandbox mode on localhost: logs mock dispatches without consuming real SMS balance.
  - `brevo`:
    - Brevo API v3 client (`x-sib-api-key`).
    - Transactional email and SMS dispatch mapping.
    - Inbound delivery webhook (`delivered`, `bounced`, `spam`).
- **Acceptance Criteria:**
  - [ ] DLT registration details validated before bulk campaign dispatch.
  - [ ] CSV upload validates phone number formats and displays rejection summary for malformed rows.
  - [ ] Localhost dispatch runs through offline mock adapter with 0 external network requests.
  - [ ] Brevo API key write-only masked and safely tested via mock probe.

---

### Batch 6: Group C — Content, Documents & Knowledge Base
*Modules: `file-sharing`, `documents`, `document-template`, `knowledge-base`, `video-hub` (5 Modules)*

- **Specific Behavior:**
  - `documents`: Organization document catalog, folder hierarchy, MIME type validation, download access logs.
  - `file-sharing`: Secure external link generation with expiration date, password protection (bcrypt), and download count limits.
  - `document-template`: Template WYSIWYG editor, merge tag library (`{{employee.name}}`, `{{company.name}}`, `{{date}}`), PDF preview generation.
  - `knowledge-base`: Category tree, markdown article editor, full-text search, role-based visibility (All Employees vs Managers vs HR).
  - `video-hub`: Video file upload / embed URL support (YouTube/Vimeo/Self-hosted MP4), category taxonomy, employee progress tracking (`watchedPercent`).
- **Storage & Security Foundation:**
  - All files stored via `StorageFactory.getDriver()`.
  - All file access routes routed through `uploadsSecurityMiddleware` with JWT and tenant validation.
- **Acceptance Criteria:**
  - [ ] Direct file downloads by unauthenticated or cross-tenant users return 401 / 403.
  - [ ] Shared file links enforce expiration timestamp and password verification before stream.
  - [ ] Document templates correctly interpolate merge tags without XSS vulnerabilities.
  - [ ] Knowledge base search isolates articles to current tenant workspace.

---

## 7. Quality Gates & Regression Verification Standard

Before any batch in Wave 2 is marked complete, it must satisfy the following automated and empirical gates:

1. **Automated Unit & Integration Test Suites:**
   - Dedicated test suite per batch (`server/src/tests/w2-batch*-*.test.ts`).
   - 100% pass rate with zero flaky tests.
2. **Predecessor Regression Verification:**
   - All 8 Wave 1 test suites must remain 100% green (56/56 passing).
   - Platform installation suite (`w1-addon-install-platform.test.ts`) must pass (12/12 passing).
   - Entitlement navigation suite (`google-workspace-tally-entitlement.test.ts`) must pass (10/10 passing).
   - Core commerce suite (`a4-1-marketplace-commerce-integration.test.ts`) must pass (8/8 passing).
3. **Static Analysis & Type Integrity:**
   - Server TypeScript check: `cd server && npx tsc --noEmit` → Exit code 0 (0 errors).
   - Frontend Production Build: `npm run build` → Exit code 0 (clean bundle).
4. **Browser & UI Verification:**
   - Every module verified in real browser at `http://localhost:5173/marketplace` and its respective route prefix.
   - 4-column desktop card layout verified.
   - Tooltips, status badges, and lifecycle transitions verified.
   - Zero console errors, zero unhandled promise rejections.
5. **Security & Sandbox Isolation:**
   - 0 live external webhooks, SMS, or API calls dispatched during automated tests.
   - All external endpoints guarded by mock adapters and offline test doubles.

---

## 8. Governance & Stop Condition

This document constitutes the authorized pre-implementation architecture and sequencing plan for Wave 2.

> [!IMPORTANT]
> **GOVERNANCE STOP CONDITION**  
> In accordance with the Project Owner mandate:
> - **NO CODE IMPLEMENTATION OF WAVE 2 MODULES MAY BEGIN IN THIS SESSION.**
> - Wave 2 development will commence only after the Product Owner formally reviews and approves this implementation sequence in a subsequent instruction.
