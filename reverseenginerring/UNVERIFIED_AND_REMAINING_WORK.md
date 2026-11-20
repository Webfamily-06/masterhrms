# MASTERHRMS — UNVERIFIED AND REMAINING WORK REGISTER (MILESTONE 7.1-A RECONCILED)
## Actionable Technical Work Breakdown & Governance Catalog

**Document Identifier:** `EGM-REMAINING-WORK-M7.1A-2026-11-19`  
**Investigation Standard:** Empirical Codebase Reality & Dependency Governance  
**Reconciliation References:** `reverseenginerring/197_ITEM_VERIFICATION_MATRIX.md`, `reverseenginerring/FUNCTIONALITY_MASTER_REGISTRY.md`, and `reverseenginerring/MILESTONE_7_1_A_TEST_EVIDENCE_MATRIX.md`  
**Date:** November 19, 2026  
**Auditor Classification:** Lead Forensic Systems Auditor  

---

## 1. Executive Summary & Category Alignment

Following the successful execution of **Milestone 7.1-A (Test Runner Unification)** and **Milestone 7.1-B (Route Normalization)**, all 197 items stand categorized into five active mutually exclusive categories based on verifiable codebase facts:

- **`VERIFIED` (57 Items / 28.9%):** **15 Add-ons + 42 Functions** with passing native automated tests (`node:test` + `node:assert/strict`) exiting with `code 0`.
- **`IMPLEMENTED_UNVERIFIED` (30 Items / 15.2%):** **15 Add-ons + 15 Functions** where controllers, routes, and Prisma schemas exist, but dedicated automated unit test suites remain to be authored or migrated.
- **`PARTIAL` (0 Items / 0.0%):** **0 Functions** — Completely resolved and eliminated in Milestone 7.1-B!
- **`BLOCKED_EXTERNAL` (10 Items / 5.1%):** **8 Add-ons + 2 Functions** where working code/adapters exist, but live provider verification is blocked by missing external credentials.
- **`NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY` (47 Items / 23.9%):** **47 Add-ons** where integration source code does NOT yet exist.
- **`PLANNED` (53 Items / 26.9%):** **48 Add-ons + 5 Functions** representing internal unbuilt specifications and statutory generators.

---

## 2. Milestone 7.1-A Verification Achievements (21 Items Promoted to VERIFIED)

In Milestone 7.1-A, 10 targeted module areas were restored to zero third-party test dependencies, converting failing Vitest fixtures and authoring native suites for unverified modular packages. **21 items (12 Add-ons and 9 Business Functions)** were promoted from `IMPLEMENTED_UNVERIFIED` to `VERIFIED`:

### Promoted Add-ons (12 Items)
1. **`ADDON-004` (Suggestion Box):** Verified by `server/src/tests/addon-modules-verification.test.ts` (11 tests pass, 0 fail; category seeding, voting toggle, admin response).
2. **`ADDON-030` (Outbound Webhooks):** Verified by `server/src/tests/webhook-retry-worker.test.ts` (8 tests pass, 0 fail; exponential backoff, dead-letter queue, SSRF guard, HMAC rotation).
3. **`ADDON-047` (Sales Module):** Verified by `server/src/tests/sales-invoicing-modular.test.ts` (5 tests pass, 0 fail; intra/inter-state GST, line item persistence, session-bound auth).
4. **`ADDON-050` (Inventory):** Verified by `server/src/tests/inventory-warehouse-lifecycle.test.ts` (9 tests pass, 0 fail; purchase receipt, stock transfer, adjustments, negative stock guard).
5. **`ADDON-089` (Double Entry Accounting):** Verified by `server/src/tests/accounting-modular-isolation.test.ts` (10 tests pass, 0 fail; 5-tier COA, balanced debits/credits, ledger posting, tenant boundary).
6. **`ADDON-110` (Workflow Automation):** Verified by `server/src/tests/workflow-engine.test.ts` (4 tests pass, 0 fail; trigger evaluation, multi-step actions, execution logging).
7. **`ADDON-115` (Public Developer API):** Verified by `server/src/tests/modular-packages-core.test.ts` (key generation `mhr_live_`, SHA-256 storage hashing, scope check, revocation).
8. **`ADDON-118` (Activity Logs):** Verified by `server/src/tests/modular-packages-core.test.ts` (credential deep redaction, tenant isolation, RFC 4180 CSV export).
9. **`ADDON-120` (Internal Reminders):** Verified by `server/src/tests/modular-packages-core.test.ts` (contextual entity linking, duplicate prevention, tenant boundary).
10. **`ADDON-123` (AI Document Studio):** Verified by `server/src/tests/addon-modules-verification.test.ts` (prompt template seeding, placeholders, history archive metrics).
11. **`ADDON-125` (Tenant Backup & Restore):** Verified by `server/src/tests/modular-packages-core.test.ts` (backup bundle creation, SHA-256 checksum, dry-run check).
12. **`ADDON-126` (Two-Factor Authentication TOTP):** Verified by `server/src/tests/modular-packages-core.test.ts` (8 single-use codes, TOTP setup, speakeasy verification, lockout).

### Promoted Business Functions (9 Items)
1. **`FN-030` (Product Master CRUD with SKU & Barcodes):** Verified by `server/src/tests/inventory-warehouse-lifecycle.test.ts`.
2. **`FN-031` (Inter-Warehouse Stock Transfers):** Verified by `server/src/tests/inventory-warehouse-lifecycle.test.ts`.
3. **`FN-032` (Stock Adjustments (+/-) with Audit Reason Codes):** Verified by `server/src/tests/inventory-warehouse-lifecycle.test.ts`.
4. **`FN-033` (Supplier Master Directory & Payment Terms):** Verified by `server/src/tests/inventory-warehouse-lifecycle.test.ts`.
5. **`FN-034` (Purchase Order Creation & Goods Received GRN):** Verified by `server/src/tests/inventory-warehouse-lifecycle.test.ts`.
6. **`FN-035` (B2B Sales Invoice Generation with GST):** Verified by `server/src/tests/sales-invoicing-modular.test.ts`.
7. **`FN-036` (Invoice Payment Receipts Inwarding):** Verified by `server/src/tests/sales-invoicing-modular.test.ts`.
8. **`FN-037` (5-Tier Chart of Accounts Hierarchy):** Verified by `server/src/tests/accounting-modular-isolation.test.ts`.
9. **`FN-038` (Manual Journal Entry Voucher Posting):** Verified by `server/src/tests/accounting-modular-isolation.test.ts`.

### Test Execution Summary
- **Total Test Suites Executed:** 7 native suites
- **Total Tests Passed:** 63 / 63 (100% Pass Rate)
- **Total Test Failures:** 0
- **Process Exit Code:** 0
- **Runtime Dependencies:** Zero (`node:test` and `node:assert/strict` only)

---

## 3. Section A — Remaining Internal Engineering Work (Implementable Without External Credentials)

### A.1 Remaining Unverified Routes & Controllers (30 IMPLEMENTED_UNVERIFIED Items)
The following 30 items have working controllers, routes, or services in MASTERHRMS but lack dedicated passing automated test coverage:

#### Remaining Add-ons (15 Items):
1. **`ADDON-001` (AI Business Advisor):** `server/src/routes/ai-business-advisor.routes.ts`
2. **`ADDON-002` (Smart Dashboard Analytics):** `server/src/routes/smart-dashboard.routes.ts`
3. **`ADDON-003` (Smart Reports):** `server/src/routes/smart-reports.routes.ts`
4. **`ADDON-036` (Microsoft To Do):** `server/src/routes/todos.routes.ts`
5. **`ADDON-060` (Box):** `server/src/routes/suggestion-box.routes.ts`
6. **`ADDON-063` (Planning Strategy):** `server/src/routes/planning-strategy.routes.ts`
7. **`ADDON-079` (Budget Planner):** `server/src/routes/budgets.routes.ts`
8. **`ADDON-080` (Timesheet):** `server/src/routes/timesheets.routes.ts`
9. **`ADDON-094` (Recruitment / ATS):** `server/src/routes/recruitment.routes.ts`
10. **`ADDON-096` (Performance Management):** `server/src/routes/hr-performance.routes.ts`
11. **`ADDON-098` (Training Module / LMS):** `server/src/routes/training.routes.ts`
12. **`ADDON-107` (Custom Field):** `server/src/routes/custom-fields.routes.ts`
13. **`ADDON-108` (Form Builder):** `server/src/routes/forms.routes.ts`
14. **`ADDON-116` (Support Ticket / Helpdesk):** `server/src/routes/helpdesk.routes.ts`
15. **`ADDON-124` (AI Assistant):** `server/src/routes/ai-assistant.routes.ts`

#### Remaining Business Functions (15 Items):
1. **`FN-005` (Employee Bulk Excel Import):** `server/src/routes/employees.routes.ts`
2. **`FN-025` (POS Terminal Opening & Cash Drawer Float):** `server/src/routes/pos.routes.ts`
3. **`FN-026` (Barcode Scanner Ingestion & Quick Cart Addition):** `server/src/routes/pos.routes.ts`
4. **`FN-027` (Split Tender Payments: Cash, Card, UPI):** `server/src/routes/pos.routes.ts`
5. **`FN-028` (Thermal Receipt Auto-Printing Format ESC/POS):** `server/src/routes/pos.routes.ts`
6. **`FN-029` (Day-End Cash Drawer Reconciliation Z-Report):** `server/src/routes/pos.routes.ts`
7. **`FN-040` (Sales Pipeline Kanban Stages & Deal Value Sums):** `server/src/routes/crm.routes.ts`
8. **`FN-042` (Project Milestone & Task Gantt Dependency Tracker):** `server/src/routes/projects.routes.ts`
9. **`FN-043` (Timesheet Submission & Multi-Tier Billable Hours):** `server/src/routes/timesheets.routes.ts`
10. **`FN-044` (Fixed & T&M Milestone Invoicing Generation):** `server/src/routes/projects.routes.ts`
11. **`FN-050` (Job Opening Requisition & Career Portal Publishing):** `server/src/routes/recruitment.routes.ts`
12. **`FN-051` (Candidate Pipeline & Stage Transition Workflow):** `server/src/routes/recruitment.routes.ts`
13. **`FN-052` (Training Course Catalog & Curriculum Definition):** `server/src/routes/training.routes.ts`
14. **`FN-053` (Employee Training Enrollment & Certification Tracking):** `server/src/routes/training.routes.ts`
15. **`FN-058` (Multi-Channel Support Ticket Ingestion & SLA Clock):** `server/src/routes/helpdesk.routes.ts`

---

### A.2 Route Normalization & Canonical Aliasing (7 Functions Promoted to VERIFIED)
All 7 previously PARTIAL business functions were fully normalized and empirically verified in Milestone 7.1-B via `canonical-route-aliases.test.ts` (8/8 passed, 0 failed, exit code 0):
1. **`FN-008` (Biometric Punch Ingestion):** `POST /api/biometric/punch` alias implemented in `biometric.routes.ts` routing to `processBiometricPunch` with ACID punch logs.
2. **`FN-009` (Work Hours Auto-Calculation):** Standalone `GET /api/attendance/summary` implemented in `attendance.routes.ts` aggregating work hours, overtime, and punctuality with tenant isolation.
3. **`FN-013` (Leave Approval):** Explicit standalone routes `PUT /api/leave/requests/:id/approve` and `PUT /api/leave/requests/:id/reject` implemented in `leave.routes.ts` delegating to `LeaveService.decideApplication`.
4. **`FN-017` (Shift Swap Approval):** Explicit routes `PUT /api/shifts/swaps/:id/approve` and `PUT /api/shifts/swaps/:id/reject` implemented in `shifts.routes.ts` executing atomic roster swaps.
5. **`FN-048` (OKR Objectives):** Dual-mounted `/api/addons/okr/objectives` and `/api/okr/objectives` in `server/src/index.ts` and `okr.routes.ts`.
6. **`FN-049` (OKR Check-Ins):** Dual-mounted `/api/addons/okr/checkins` and `/api/okr/checkins` in `server/src/index.ts` and `okr.routes.ts`.
7. **`FN-064` (Tally Import):** `POST /api/workspace/tally-import` and `/api/accounting/tally/import` verified ingesting Tally XML/JSON transactions and creating double-entry ledger vouchers.

*Status: 7 of 7 Promoted to VERIFIED. Category PARTIAL is now 0 items (0.0%).*

---

### A.3 Statutory Tax & Compliance Document Generators (5 PLANNED Functions)
Five internal statutory functions require new service logic and vector rendering in `server/src/services/`:
1. **`FN-022` (Form 16 Part A & Part B PDF):** Build `server/src/services/form-16.service.ts` using `pdfkit` for annual employee tax certificates.
2. **`FN-023` (Form 24Q Quarterly Return):** Build `server/src/services/form-24q.service.ts` generating NSDL-compliant ASCII text/CSV returns.
3. **`FN-024` (EPFO Form 19/10C/31 & ESIC Form 1):** Build statutory retirement claim and health insurance PDF templates.
4. **`FN-039` (Bank Statement OCR Reconciliation):** Implement algorithmic CSV/Excel transaction pattern matcher against `JournalItem` and `SalePayment`.
5. **`FN-047` (Public QR Tag Asset Passport):** Register public unauthenticated endpoint `GET /api/addons/assets/tag/:tag` returning asset warranty and custodian status.

---

### A.4 Unbuilt Internal WorkDo Modules (48 PLANNED Add-ons)
48 internal reference modules catalogued from WorkDo have no codebase implementation in MASTERHRMS. These are scheduled across future enterprise milestones:
- Content & Strategy: Innovation Center, Business Model Canvas, McKinsey 7-S, PEST, PESTEL, Porter's Five Forces, Strategy Studio.
- Document Vault: Documents, Document Templates, Quotation, Resume Builder, Digital Certificate, File Sharing, Knowledge Base, Diagram, Portfolio.
- Operational & HR: Time Tracker, Rotas, Procurement, Petty Cash, LMS, eBook, Email Box, Call Hub, Business Process Mapping, Roadmap Central, Meeting Hub, Custom Alert, Signature.

---

## 4. Section B — External Integration Gateways

### B.1 Ready for Live Credentials (10 BLOCKED_EXTERNAL Items)
The following 10 items possess working backend code/adapters in the repository and only require sandbox or production provider credentials to be live-verified:

| Item ID | Integration Name | Existing Implementation Path | Target API Provider | Blocker Requirement |
|---|---|---|---|---|
| **ADDON-008** | WhatsApp | `server/src/routes/alerts.routes.ts`, `services/messaging-gateway.service.ts` | Meta WhatsApp Cloud API v19.0 | Permanent Meta System User Token, WABA ID, Phone ID |
| **ADDON-011** | Twilio | `server/src/services/messaging-gateway.service.ts` | Twilio Messaging API | Twilio Account SID, Auth Token, Outbound Number |
| **ADDON-016** | MSG91 | `server/src/services/messaging-gateway.service.ts` | MSG91 SMS API v5 | MSG91 Authkey, DLT Approved Sender ID |
| **ADDON-019** | Generic SMS Gateway | `server/src/modules/sms-gateway/`, `messaging-gateway.service.ts` | Telecom Aggregator HTTP | Aggregator HTTP URL, API Key, Secret |
| **ADDON-021** | Google Workspace | `server/src/services/integration-hub.service.ts` | Google Admin SDK | Service Account JSON with Domain-Wide Delegation |
| **ADDON-043** | WooCommerce | `server/src/routes/woocommerce.routes.ts`, `integration-hub.service.ts` | WooCommerce REST API v3 | Store URL, Consumer Key, Consumer Secret |
| **ADDON-044** | Shopify | `server/src/routes/shopify.routes.ts`, `integration-hub.service.ts` | Shopify Admin API (2024-01) | Store Domain, Admin API Access Token |
| **ADDON-127** | Google Captcha / Turnstile | `server/src/services/security/turnstile.service.ts` | Cloudflare / Google Turnstile | Live Site Key, Secret Key (13/13 dummy tests pass) |
| **FN-062** | WooCommerce Stock Sync | `server/src/routes/woocommerce.routes.ts` | WooCommerce REST API v3 | Store URL, Consumer Key, Consumer Secret |
| **FN-063** | WhatsApp Alert Queue Worker | `server/src/routes/alerts.routes.ts` | Meta WhatsApp Cloud API | Permanent Meta System User Token, Phone ID |

---

### B.2 Integration Adapters to Author (47 NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY Items)
The following 47 integrations do **NOT** have source code in MASTERHRMS. They do not require credentials immediately; their software adapters must be designed and implemented in subsequent milestone roadmaps:
- **Social Media:** Instagram (006), Facebook (007), YouTube (009), Telegram (010), Slack (012), Discord (013), HubSpot (014), Nexmo (015), Vonage (017), ClickSend (018), Google Meet (020), Zoom (022), Zoho (023), Livestorm (024), Amazon SES (025).
- **Productivity & Cloud:** Google Calendar (026), Outlook Calendar (027), Zapier (028), Make (029), n8n (031), IndiaMART (032), Brevo (033), OneNote (034), Trello (035), Jira (037), Google Analytics (038), Google Slides (039), WHMCS (040), Google Forms (041), Google Wallet (042), Mailchimp (045), Salesforce (046), OneDrive (059), Zendesk (071).
- **Accounting & Financial:** QuickBooks (075), Sage (076), Xero (077), Plaid (085), ZATCA (086), European E-Invoice (087).
- **SSO Authentication:** Outlook Mail (103), GitHub Sign-in (128), Facebook Sign-in (129), Google Sign-in (130), LinkedIn Sign-in (131), Slack Sign-in (132), Microsoft Sign-in (133).

---

## 5. Prioritized Execution Recommendations for Milestone 7.1-B and Beyond

1. **Milestone 7.1-B: Route Normalization (7 Aliases):**
   - Implement explicit Express alias routes for `FN-008`, `FN-009`, `FN-013`, `FN-017`, `FN-048`, `FN-049`, `FN-064` to achieve 100% canonical route compliance and promote them from `PARTIAL` to `VERIFIED`.
2. **Milestone 7.1-C: Secondary Test Runner Migration (Remaining 31 Vitest Test Files):**
   - Migrate remaining Vitest test files covering POS, CRM, Projects, Recruitment, and Helpdesk, promoting the remaining 30 `IMPLEMENTED_UNVERIFIED` items into `VERIFIED`.
3. **Milestone 7.2: Statutory Document Generation (5 Functions):**
   - Implement Form 16 Part A/B (`FN-022`), Form 24Q (`FN-023`), EPFO/ESIC PDFs (`FN-024`), Bank OCR pattern matcher (`FN-039`), and Public QR tag passport (`FN-047`).
4. **Milestone 7.3: External Integration Architecture & Sandbox Harness:**
   - Author mock credential test harnesses for the 10 `BLOCKED_EXTERNAL` items and begin scaffolding adapters for the 47 `NOT_IMPLEMENTED_EXTERNAL_DEPENDENCY` items.
