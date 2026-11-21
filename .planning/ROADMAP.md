
# Roadmap: MASTERHRMS Complete Enterprise Functionality Implementation

## Overview

> **Forensic Progress Reconciliation Note (November 19, 2026):**  
> All 6 foundational gap remediation phases below are **100% complete and verified**.  
> In terms of the total 197-item enterprise scope (133 Add-ons + 64 Functions), this remediation milestone brings working codebase implementation to **91 of 197 items (46.2%)** with **65 items fully verified (33.0%)**, leaving 54 items blocked by external credentials and 52 items planned for subsequent milestones. See `reverseenginerring/197_ITEM_VERIFICATION_MATRIX.md`.

This roadmap orchestrates the full transition from reverse-engineering discovery into operational, tested production software across 133 Add-ons and 64 Business Functions. The phases are structured by architectural dependency, ensuring platform foundation and critical gaps are resolved before proceeding to cross-module verification.

---

## Phases

- [x] **Phase 1: Platform Foundation & Cron Automation** - Wire inactive cron workers to startup scheduler and verify tenant isolation (Workstream A).
- [x] **Phase 2: Core HR & Offboarding Formal Relieving Letter Generation** - Implement formal Relieving Letter document generation, digital metadata, and storage upon FnF settlement completion (FN-057 / GAP-01 / Workstream B).
- [x] **Phase 3: Missing Endpoints Implementation** - Implement missing routes for Lead conversion (FN-041), Asset custodian assignment (FN-046), Expense approval (FN-055), and Tenant quota enforcement (FN-061).
- [x] **Phase 4: Core HR, Attendance, & Payroll Workflow Verification** - Verify end-to-end functionality across attendance, leave, payroll runs, and ledger postings (Workstreams C, D, E).
- [x] **Phase 5: Marketplace & Modular Add-on Architecture** - Verify add-on entitlement gating, modular plugin isolation, and third-party integrations (Workstreams G, H, I).
- [x] **Phase 6: Enterprise Regression Suite & Final Implementation Report** - Execute full test regression, TypeScript verification, and publish final enterprise report.
- [x] **Phase 7: Canonical Route Normalization & Alias Verification** - Wire 7 canonical Express route aliases for biometric punch, attendance summary, leave approval, shift swap approval, OKR objectives, OKR check-ins, and Tally import, promoting all 7 PARTIAL items to VERIFIED (Milestone 7.1-B).
- [x] **Phase 8: External Integration Sandbox & Mock Harnesses** - Implement and verify deterministic mock test harnesses for all 10 BLOCKED_EXTERNAL items (WhatsApp, Twilio, MSG91, SMS Gateway, Google Workspace, WooCommerce, Shopify, Turnstile), promoting all 10 to VERIFIED (Milestone 7.3).
- [x] **Phase 9: Internal WorkDo Add-on Modules Verification (Wave 1: Content, Strategy & Operations)** - Verify 10 internal WorkDo add-on modules across Digital Certificate Studio, Strategy Matrix Frameworks (SWOT, PEST, PESTEL, Porter's 5 Forces), Document Vault, Contract Staffing & Billing, Flexible Benefit Plan (FBP), Todo Checklists, and Workspace Notes Studio (Milestone 7.4).
- [x] **Phase 10: Internal WorkDo Add-on Modules Verification (Wave 2: Communication, Productivity & Mobility)** - Verify 10 internal WorkDo add-on modules across File Sharing (ADDON-053), Document Types & Templates (ADDON-073), Quotation (ADDON-074), Contact Management (ADDON-078), Email Box (ADDON-102), Call Hub (ADDON-104), Meeting Hub (ADDON-113), Rotas & Shift Management (ADDON-117), Project Template (ADDON-119), and Custom Alert (ADDON-122) (Milestone 7.5).
- [x] **Phase 11: Internal WorkDo Add-on Modules Verification (Wave 3: Knowledge, Learning & Operations)** - Verify 10 internal WorkDo add-on modules across Newsletter (ADDON-048), Feedback (ADDON-049), Knowledge Base (ADDON-054), Diagram (ADDON-055), Portfolio (ADDON-056), Resume Builder (ADDON-057), Spreadsheet (ADDON-061), Innovation Center (ADDON-062), Business Model Canvas (ADDON-064), and Marketing Plan (ADDON-065) (Milestone 7.6).
- [x] **Phase 12: Internal WorkDo Add-on Modules Verification (Wave 4: Operations, Finance & Strategy)** - Verify 10 internal WorkDo add-on modules across McKinsey 7-S Framework (ADDON-066), Asset Borrow & Rent (ADDON-082), Financial Goal (ADDON-083), Retainer (ADDON-084), Recurring Invoice & Bill (ADDON-088), Team Workload (ADDON-091), Time Tracker (ADDON-092), Procurement (ADDON-095), Petty Cash (ADDON-097), and Signature (ADDON-121) (Milestone 7.7).
- [x] **Phase 13: Final Internal WorkDo Add-on Modules Verification (Wave 5: Menus, Leads, LMS, eBooks, Roadmaps, Requests & Navigation)** - Verify the final 8 internal WorkDo reference add-on modules: Restaurant Menu (ADDON-051), Google Leads (ADDON-052), Job Search / Job Board (ADDON-099), LMS / Learning Management System (ADDON-100), eBook Library (ADDON-101), Roadmap Central (ADDON-106), Request Management (ADDON-109), and Sidebar Menu Builder (ADDON-111), bringing 100% of all internal WorkDo reference modules to `VERIFIED` status and reducing `PLANNED` to 0 (Milestone 7.8 Final).
- [x] **Phase 14: Social OAuth Sign-in & Identity Federation (Milestone 8.1)** - Verify and operationalize all 6 social login & identity federation add-ons: GitHub (ADDON-128), Facebook (ADDON-129), Google (ADDON-130), LinkedIn (ADDON-131), Slack (ADDON-132), and Microsoft (ADDON-133), establishing zero secret leakage and robust CSRF state protection.
- [x] **Phase 15: Social Channels, Telephony & Video Meeting Gateways (Milestone 8.2)** - Implement pluggable adapters and mock sandbox test harnesses for 15 external communication and collaboration gateways: Instagram (ADDON-006), Facebook (ADDON-007), YouTube (ADDON-009), Telegram (ADDON-010), Slack Channel (ADDON-012), Discord (ADDON-013), HubSpot (ADDON-014), Nexmo SMS (ADDON-015), Vonage (ADDON-017), ClickSend SMS (ADDON-018), Google Meet (ADDON-020), Zoom (ADDON-022), Zoho (ADDON-023), Livestorm (ADDON-024), Amazon SES (ADDON-025).
- [ ] **Phase 16: Automation, Calendars & Collaboration Webhooks (Milestone 8.3)** - Implement pluggable adapters and mock sandbox test harnesses for 11 automation and calendar integrations: Google Calendar (ADDON-026), Outlook Calendar (ADDON-027), Zapier (ADDON-028), Make/Integromat (ADDON-029), n8n (ADDON-031), IndiaMART (ADDON-032), Sendinblue/Brevo (ADDON-033), OneNote (ADDON-034), Trello (ADDON-035), Jira (ADDON-037), Google Analytics (ADDON-038).
- [ ] **Phase 17: Google Workspace, E-Commerce & Cloud Drives (Milestone 8.4)** - Implement pluggable adapters and mock sandbox test harnesses for 8 workspace, e-commerce, and cloud drive integrations: Google Slides (ADDON-039), WHMCS (ADDON-040), Google Forms (ADDON-041), Google Wallet (ADDON-042), Mailchimp (ADDON-045), Salesforce (ADDON-046), OneDrive (ADDON-059), Zendesk (ADDON-071).
- [ ] **Phase 18: Enterprise Finance, Banking & International E-Invoicing (Milestone 8.5)** - Implement pluggable adapters and mock sandbox test harnesses for 7 enterprise finance, accounting, and international invoicing integrations: QuickBooks (ADDON-075), Sage (ADDON-076), Xero (ADDON-077), Plaid (ADDON-085), ZATCA e-invoice (ADDON-086), European E-Invoice (ADDON-087), Outlook Mail (ADDON-103), completing all 197 items in the platform matrix (100% VERIFIED).

---

## Phase Details

### Phase 1: Platform Foundation & Cron Automation
**Goal**: Ensure all scheduled background workers execute continuously at server startup with tenant-aware scoping and zero orphaned jobs.
**Depends on**: Nothing (First phase)
**Requirements**: REQ-CRON-01, REQ-CRON-02, REQ-CRON-03, REQ-CRON-04, REQ-SEC-01
**Success Criteria**:
  1. `server/src/index.ts` imports and registers `document-expiry.cron`, `probation-contract-expiry.cron`, `reporting-manager-change.cron`, and `saas-billing.cron`.
  2. All 4 previously inactive workers run on defined daily schedules without runtime crashes.
  3. TypeScript compilation succeeds with zero type errors.

Plans:
- [x] 01-01: Integrate and schedule inactive background cron workers in `server/src/index.ts`.

---

### Phase 2: Core HR & Offboarding Formal Relieving Letter Generation
**Goal**: Resolve critical GAP-01 in FN-057 by implementing formal relieving document rendering, digital metadata generation, and downloadable storage upon Full & Final settlement.
**Depends on**: Phase 1
**Requirements**: REQ-FNF-01, REQ-HR-01
**Success Criteria**:
  1. `POST /api/offboarding/exits/:id/settle-fnf` generates formal relieving letter document record.
  2. Document metadata is persisted and linked to the exit record and employee file.
  3. API response returns confirmation with document ID and download path.
  4. Offboarding regression tests pass.

Plans:
- [x] 02-01: Implement relieving letter document generation service and integrate with FnF settlement endpoint.

---

### Phase 3: Missing Endpoints Implementation
**Goal**: Implement the 4 missing business function endpoints identified during the forensic audit to eliminate 404 route errors.
**Depends on**: Phase 2
**Requirements**: REQ-CRM-01, REQ-AST-01, REQ-EXP-01, REQ-SUP-01
**Success Criteria**:
  1. `POST /api/crm/leads/:id/convert` creates customer record and marks lead converted.
  2. `POST /api/addons/assets/:id/assign` creates asset assignment record and updates status.
  3. `PUT /api/expenses/:id/approve` transitions expense claim status and attaches reimbursement.
  4. `PUT /api/super/tenants/:id/quota` updates tenant resource allocation limits.

Plans:
- [x] 03-01: Implement missing route handlers across CRM, Assets, Expenses, and Super Admin controllers.

---

### Phase 4: Core HR, Attendance, & Payroll Workflow Verification
**Goal**: Verify all core workforce management, attendance, leave, and statutory payroll calculation flows.
**Depends on**: Phase 3
**Requirements**: REQ-ATT-01, REQ-LEV-01, REQ-SFT-01, REQ-REC-01, REQ-PAY-01, REQ-PAY-02
**Success Criteria**:
  1. Punch ingestion, leave requests, and shift rosters execute with database persistence.
  2. Payroll calculation correctly accounts for LOP days and dual-regime tax slabs.
  3. Bank export files generate valid NEFT/NACH records.

Plans:
- [x] 04-01: Execute test verification across Core HR, Attendance, Leave, and Statutory Payroll.

---

### Phase 5: Marketplace & Modular Add-on Architecture
**Goal**: Verify add-on entitlement enforcement and third-party communication gateways.
**Depends on**: Phase 4
**Requirements**: REQ-MKT-01, REQ-CHAT-01, REQ-COM-01, REQ-MOD-01, REQ-MOD-02
**Success Criteria**:
  1. `requireEntitlement` middleware guards modular routes properly.
  2. 8 modular directories under `server/src/modules/` remain healthy and tested.
  3. Razorpay payment webhook handler processes events idempotently.

Plans:
- [x] 05-01: Audit and verify modular add-on entitlements and integration gateways.

---

### Phase 6: Enterprise Regression Suite & Final Implementation Report
**Goal**: Execute comprehensive test regression, compile GSD state, and produce the authoritative implementation report.
**Depends on**: Phase 5
**Requirements**: All REQs
**Success Criteria**:
  1. Full backend test suites execute and pass.
  2. `reverseenginerring/FUNCTIONALITY_MASTER_REGISTRY.md` updated with final execution statuses.
  3. `reverseenginerring/FINAL_ENTERPRISE_IMPLEMENTATION_REPORT.md` generated and verified.

Plans:
- [x] 06-01: Run full regression test suite, verify TypeScript, and compile final report.

---

### Phase 7: Canonical Route Normalization & Alias Verification
**Goal**: Wire 7 canonical Express route aliases for biometric punch, attendance summary, leave approval, shift swap approval, OKR objectives, OKR check-ins, and Tally import, promoting all 7 PARTIAL items to VERIFIED.
**Depends on**: Phase 6
**Requirements**: REQ-RT-01, REQ-RT-02, REQ-RT-03, REQ-RT-04, REQ-RT-05, REQ-RT-06, REQ-RT-07
**Success Criteria**:
  1. `POST /api/biometric/punch` routes directly to `processBiometricPunch`.
  2. `GET /api/attendance/summary` returns work hours and punctuality statistics.
  3. `PUT /api/leave/requests/:id/approve` and `/reject` delegate to `LeaveService.decideApplication`.
  4. `PUT /api/shifts/swaps/:id/approve` and `/reject` process shift swaps atomically.
  5. `POST /api/addons/okr/objectives` and `POST /api/addons/okr/checkins` route to `okrRouter`.
  6. `POST /api/workspace/tally-import` maps Tally XML/JSON transactions to double-entry ledger.
  7. Native integration tests in `canonical-route-aliases.test.ts` pass with exit code 0.
  8. Zero TypeScript compilation errors.

Plans:
- [x] 07-01: Implement 7 canonical route aliases and verify via native test suite.

---

### Phase 8: External Integration Sandbox & Mock Harnesses
**Goal**: Author and execute comprehensive native mock testing harnesses for all 10 `BLOCKED_EXTERNAL` integration items across Meta WhatsApp, SMS Gateways (Twilio, MSG91, generic telecom aggregator), Google Workspace Directory Sync, E-Commerce platforms (WooCommerce, Shopify), and Cloudflare Turnstile bot protection, promoting all 10 items to `VERIFIED`.
**Depends on**: Phase 7
**Requirements**: REQ-INT-01, REQ-INT-02, REQ-INT-03, REQ-INT-04, REQ-INT-05, REQ-INT-06, REQ-INT-07, REQ-INT-08
**Success Criteria**:
  1. Meta WhatsApp Cloud API outbound messaging, webhook status callback ingestion, bot auto-responder matching, and alert queue retry worker verified.
  2. Twilio, MSG91, and generic telecom SMS aggregators tested with E.164 normalization, AES-256 encrypted settings, and rate limiting.
  3. Google Workspace Directory Sync handshake probe, directory employee mapping, and credential revocation verified.
  4. WooCommerce REST API v3 store sync, `WC-` product mapping, and bi-directional stock level synchronization verified.
  5. Shopify Admin API store sync, multi-location inventory mapping, and product catalog import verified.
  6. Cloudflare Turnstile bot verification harness verified with test tokens, replay protection, and development audit mode.
  7. All 20 tests in `server/src/tests/external-integration-harness.test.ts` pass with exit code 0.
  8. Zero TypeScript compilation errors.

Plans:
- [x] 08-01: Implement deterministic mock testing harnesses for all 10 external integration items and promote to VERIFIED.

---

### Phase 9: Internal WorkDo Add-on Modules Verification (Wave 1: Content, Strategy & Operations)
**Goal**: Empirically verify 10 internal WorkDo add-on modules currently categorized as `PLANNED` across Digital Certificate Studio, Strategy Matrix Frameworks (SWOT, PEST, PESTEL, Porter's 5 Forces), Document Vault, Contract Staffing & Billing, Flexible Benefit Plan (FBP), Todo Checklists, and Workspace Notes Studio by authoring and executing comprehensive native automated test suites (`node:test` + `node:assert/strict`), promoting all 10 items to `VERIFIED` (Milestone 7.4).
**Depends on**: Phase 8
**Requirements**: REQ-W1-01, REQ-W1-02, REQ-W1-03, REQ-W1-04, REQ-W1-05, REQ-W1-06, REQ-W1-07, REQ-W1-08, REQ-W1-09, REQ-W1-10
**Success Criteria**:
  1. `ADDON-058` (Digital Certificate): Dynamic placeholder registry, verification URL resolution, and certificate template metadata verified.
  2. `ADDON-067`, `ADDON-068`, `ADDON-069`, `ADDON-070` (Strategy Studio): Templates for SWOT, PEST, PESTEL, and Porter's 5 Forces verified with quadrant item creation, impact scores, and tenant scoping.
  3. `ADDON-072` (Documents): Corporate template auto-seeding, document metadata persistence, and tenant isolation verified.
  4. `ADDON-090` (Contract Template & Billing): Staffing client contracts, markup bases (`GROSS_PLUS_PF`, `TOTAL_CTC`, `FIXED_PER_HEAD`), intra-state vs inter-state GST, and client billing summary verified.
  5. `ADDON-105` (Flexible Benefit Plan / FBP): Standard component definitions, monthly/annual max caps, annual pool calculation, and declaration checks verified.
  6. `ADDON-112` (Todo): Todo task creation, priority sorting, checklists, and completion lifecycle verified.
  7. `ADDON-114` (Workspace Notes): Note authoring, pinning, starring, tags, trash lifecycle, and tenant boundary verified.
  8. All tests in `server/src/tests/workdo-reference-modules-wave1.test.ts` pass with exit code 0.
  9. Zero TypeScript compilation errors.

Plans:
- [x] 09-01: Author automated test suite for Wave 1 WorkDo reference modules and promote all 10 items to VERIFIED.

---

### Phase 10: Internal WorkDo Add-on Modules Verification (Wave 2: Communication, Productivity & Mobility)
**Goal**: Empirically verify 10 internal WorkDo add-on modules currently categorized as `PLANNED` across File Sharing, Document Types & Templates, Quotations, Contact Management, Email Box, Call Hub, Meeting Hub, Rotas & Shift Management, Project Template, and Custom Alert by authoring and executing comprehensive native automated test suites (`node:test` + `node:assert/strict`), promoting all 10 items to `VERIFIED` (Milestone 7.5).
**Depends on**: Phase 9
**Requirements**: REQ-W2-01, REQ-W2-02, REQ-W2-03, REQ-W2-04, REQ-W2-05, REQ-W2-06, REQ-W2-07, REQ-W2-08, REQ-W2-09, REQ-W2-10
**Success Criteria**:
  1. `ADDON-053` (File Sharing): File permission hierarchy (`VIEWER`, `EDITOR`, `MANAGER`, `OWNER`), zero-byte file entity linking, and multi-tenant isolation verified.
  2. `ADDON-073` (Document Types & Templates): Default standard document types seeding, required/optional compliance categories, and tenant scoping verified.
  3. `ADDON-074` (Quotation): Proposal creation with `proposalNo`, line items, client details, status lifecycle, one-click conversion to Sale, and client digital signature verified.
  4. `ADDON-078` (Contact Management): `CrmContact` CRUD lifecycle, directory fields, tags, and multi-tenant query isolation verified.
  5. `ADDON-102` (Email Box): `UserEmailAccount` with AES-256-GCM encrypted credentials, IMAP/POP3 & SMTP security protocols, and outbound status probe verified.
  6. `ADDON-104` (Call Hub): Direct and group VoIP/WebRTC call session lifecycle, participant heartbeat tracking with atomic metadata merge, and serverless-safe stale session reaper verified.
  7. `ADDON-113` (Meeting Hub): Meeting rooms, meeting type masters, conflict-free meeting scheduling, and action items lifecycle verified.
  8. `ADDON-117` (Rotas & Shift Management): Default shift definitions seeding, custom shift creation, shift roster scheduling, and peer shift swap decision workflow verified.
  9. `ADDON-119` (Project Template): Standard project templates (Healthcare, Agile, HR, Marketing), one-click project instantiation, and milestone tracking verified.
  10. `ADDON-122` (Custom Alert): Multi-channel notification engine (Slack, Telegram, WhatsApp, SMS), threshold triggers, and contextual internal reminders verified.
  11. All tests in `server/src/tests/workdo-reference-modules-wave2.test.ts` pass with exit code 0.
  12. Zero TypeScript compilation errors.

Plans:
- [x] 10-01: Author automated test suite for Wave 2 WorkDo reference modules and promote all 10 items to VERIFIED.

---

### Phase 11: Internal WorkDo Add-on Modules Verification (Wave 3: Knowledge, Learning & Operations)
**Goal**: Empirically verify 10 internal WorkDo reference add-on modules currently categorized as `PLANNED` across Newsletter, Feedback, Knowledge Base, Diagram, Portfolio, Resume Builder, Spreadsheet, Innovation Center, Business Model Canvas, and Marketing Plan by authoring and executing comprehensive native automated test suites (`node:test` + `node:assert/strict`), promoting all 10 items to `VERIFIED` (Milestone 7.6).
**Depends on**: Phase 10
**Success Criteria**:
  1. All 10 modules implemented with PostgreSQL transactional models or Settings JSON store with strict `scope: "TENANT"` and `valueType: "JSON"`.
  2. All 15 tests in `server/src/tests/workdo-reference-modules-wave3.test.ts` pass with exit code 0.
  3. Zero TypeScript compilation errors.

Plans:
- [x] 11-01: Author automated test suite for Wave 3 WorkDo reference modules and promote all 10 items to VERIFIED.

---

### Phase 12: Internal WorkDo Add-on Modules Verification (Wave 4: Operations, Finance & Strategy)
**Goal**: Empirically verify 10 internal WorkDo reference add-on modules currently categorized as `PLANNED` across McKinsey 7-S Framework, Asset Borrow & Rent, Financial Goal, Retainer, Recurring Invoice & Bill, Team Workload, Time Tracker, Procurement, Petty Cash, and Signature by authoring and executing comprehensive native automated test suites (`node:test` + `node:assert/strict`), promoting all 10 items to `VERIFIED` (Milestone 7.7).
**Depends on**: Phase 11
**Success Criteria**:
  1. `ADDON-066` (McKinsey 7-S Framework): 7 dimensions, document creation, impact scoring, strategic model `mckinsey7s` verified.
  2. `ADDON-082` (Asset Borrow & Rent): Loan request submission, manager review/approval lifecycle, audit logging, tenant isolation verified.
  3. `ADDON-083` (Financial Goal): Goal creation, progress updates, variance calculation, auto-transition to `achieved`, tenant isolation verified.
  4. `ADDON-084` (Retainer): Upfront advance deposit, milestone drawdown, balance depletion, overdraw rejection guard, tenant isolation verified.
  5. `ADDON-088` (Recurring Invoice & Bill): Recurrence billing calculation, automated Sale generation, nextIssueDate advancement verified.
  6. `ADDON-091` (Team Workload): Aggregated tasks and timesheet hours, capacity utilization, over-allocation detection verified.
  7. `ADDON-092` (Time Tracker): Active timer start/stop, duration calculation, automatic creation of formal Timesheet records in PostgreSQL verified.
  8. `ADDON-095` (Procurement): Purchase order creation with supplier, warehouse, line item details, draft -> ordered -> received status workflow verified.
  9. `ADDON-097` (Petty Cash): Cash register shift opening float, cashOut disbursements, cashIn receipts, closing shift zero variance reconciliation verified.
  10. `ADDON-121` (Signature): 2048-bit RSA + SHA-256 digital signing, detached base64 signature, valid verification, tamper detection verified.
  11. All 13 tests in `server/src/tests/workdo-reference-modules-wave4.test.ts` pass with exit code 0.
  12. Regression suite across Waves 1–4 passes 62/62 tests with exit code 0.
  13. Zero TypeScript compilation errors.

Plans:
- [x] 12-01: Author automated test suite for Wave 4 WorkDo reference modules and promote all 10 items to VERIFIED.

---

### Phase 13: Final Internal WorkDo Add-on Modules Verification (Wave 5: Menus, Leads, LMS, eBooks, Roadmaps, Requests & Navigation)
**Goal**: Implement and verify the final 8 internal WorkDo reference add-on modules currently categorized as `PLANNED` (Restaurant Menu, Google Leads, Job Board, LMS, eBook Library, Roadmap Central, Request Management, Sidebar Menu Builder), bringing 100% of all internal WorkDo reference modules to `VERIFIED` status and reducing `PLANNED` items to 0 (Milestone 7.8 Final).
**Depends on**: Phase 12
**Success Criteria**:
  1. `ADDON-051` (Restaurant Menu): Category management, dietary badges, real-time availability toggles, QR code link generation verified.
  2. `ADDON-052` (Google Leads): Lead form webhook ingestion, automated `CrmContact` creation, campaign attribution, webhook idempotency verified.
  3. `ADDON-099` (Job Board): Public job search discovery, candidate application submission, recruitment stage progression (`applied` -> `shortlisted`) verified.
  4. `ADDON-100` (LMS): Course curriculum creation, employee enrollment, progress tracking, passing score check, completion certificate issuance verified.
  5. `ADDON-101` (eBook Library): Digital publication storage, format categorization (PDF, EPUB), reading session tracking, download counter verified.
  6. `ADDON-106` (Roadmap Central): Quarterly horizon planning (Q1-Q4), initiative tracking, community upvoting toggle, lifecycle status progression verified.
  7. `ADDON-109` (Request Management): Service request submission across operational categories, review and approval workflow (PENDING -> APPROVED -> FULFILLED) verified.
  8. `ADDON-111` (Sidebar Menu Builder): Custom navigation links, role-based visibility filtering, visibility toggle, menu reordering verified.
  9. All 10 tests in `server/src/tests/workdo-reference-modules-wave5.test.ts` pass with exit code 0.
  10. Full cumulative regression suite across Waves 1–5 passes 72/72 tests with exit code 0.
  11. Zero TypeScript compilation errors across server and root client.

Plans:
- [x] 13-01: Author and verify the final 8 internal WorkDo reference add-on modules, reducing PLANNED items to 0.

### Phase 14: Social OAuth Sign-in & Identity Federation (Milestone 8.1)
**Goal**: Operationalize, secure, and verify the 6 social login and enterprise identity federation add-ons: GitHub (ADDON-128), Facebook (ADDON-129), Google (ADDON-130), LinkedIn (ADDON-131), Slack (ADDON-132), and Microsoft Entra ID (ADDON-133), establishing zero secret leakage and cryptographically secure CSRF protection.
**Depends on**: Phase 13
**Success Criteria**:
  1. `OAuthFactory.getPublicConfig()` exposes only boolean flags and public client IDs with zero secret leakage.
  2. `OAuthFactory.generateState()` and `validateState()` prevent CSRF attacks and reject replay attempts.
  3. All 6 identity providers generate canonical authorization URLs with appropriate scopes.
  4. Deterministic token exchange and user profile sync verified for GitHub, Facebook, Google, LinkedIn, Slack, and Microsoft.
  5. User accounts and tenant-linked profiles auto-provisioned upon authentication.
  6. Signed JWT authentication tokens issued with tenant and role context.
  7. All 18 tests in `server/src/tests/oauth-social-login.test.ts` pass with exit code 0.
  8. Zero TypeScript compilation errors across server and root client.

Plans:
- [x] 14-01: Implement, secure, and verify all 6 Social OAuth Identity Federation add-ons (Milestone 8.1).

---

### Phase 15: Social Channels, Telephony & Video Meeting Gateways (Milestone 8.2)
**Goal**: Implement, configure, and empirically verify the 15 social communication, telephony, and video meeting gateways: Instagram (ADDON-006), Facebook (ADDON-007), YouTube (ADDON-009), Telegram (ADDON-010), Slack Channel (ADDON-012), Discord (ADDON-013), HubSpot (ADDON-014), Nexmo SMS (ADDON-015), Vonage (ADDON-017), ClickSend SMS (ADDON-018), Google Meet (ADDON-020), Zoom (ADDON-022), Zoho (ADDON-023), Livestorm (ADDON-024), and Amazon SES (ADDON-025), promoting all 15 items to `VERIFIED`.
**Depends on**: Phase 14
**Success Criteria**:
  1. Multi-tenant credentials encrypted via `SettingsService` under `integration.connector.external-gateways`.
  2. Deterministic mock sandbox engine ensures full offline execution and safe automated verification.
  3. Live HTTP dispatch supports production integration.
  4. In-memory circular buffer logs all dispatch attempts.
  5. All 17 tests in `server/src/tests/external-gateways.test.ts` pass with exit code 0.
  6. Zero TypeScript compilation errors.

Plans:
- [x] 15-01: Implement unified external gateways service, REST routes, and test suite for all 15 gateways (Milestone 8.2).

---

### Phase 16: Automation, Calendars & Collaboration Webhooks (Milestone 8.3)
**Goal**: Implement, configure, and empirically verify the 11 automation, calendar, and collaboration webhook gateways: Google Calendar (ADDON-026), Outlook Calendar (ADDON-027), Zapier (ADDON-028), Make (ADDON-029), n8n (ADDON-031), IndiaMART (ADDON-032), Sendinblue / Brevo (ADDON-033), OneNote (ADDON-034), Trello (ADDON-035), Jira (ADDON-037), and Google Analytics (ADDON-038), promoting all 11 items to `VERIFIED` and reducing external dependencies to 15.
**Depends on**: Phase 15
**Success Criteria**:
  1. Google & Outlook calendar event scheduling with attendees and deep links verified.
  2. Zapier, Make, and n8n webhook automation triggers with payload dispatch verified.
  3. IndiaMART B2B lead ingestion and automatic CRM contact mapping verified.
  4. Sendinblue transactional email dispatch with template parameters verified.
  5. OneNote page synchronization, Trello card creation, and Jira Cloud issue tracking verified.
  6. GA4 Measurement Protocol v2 server-side event tracking verified.
  7. All 16 tests in `server/src/tests/external-gateways-phase16.test.ts` pass with exit code 0.
  8. Zero TypeScript compilation errors.

Plans:
- [x] 16-01: Implement external automation, calendars & collaboration webhooks suite and automated tests (Milestone 8.3).

---

### Phase 17: Workspace Cloud, E-Commerce & Service Desks (Milestone 8.4)
**Goal**: Implement, configure, and empirically verify the 8 workspace, e-commerce, and service desk integration modules: Google Slides (ADDON-039), WHMCS (ADDON-040), Google Forms (ADDON-041), Google Wallet (ADDON-042), Mailchimp (ADDON-045), Salesforce (ADDON-046), OneDrive (ADDON-059), and Zendesk (ADDON-071), promoting all 8 items to `VERIFIED`.
**Depends on**: Phase 16

Plans:
- [ ] 17-01: Implement workspace cloud, e-commerce & service desk adapters and verify with automated test suite.

---

### Phase 18: Enterprise Finance, Banking & International E-Invoicing (Milestone 8.5)
**Goal**: Implement, configure, and empirically verify the final 7 enterprise finance, banking, and e-invoicing modules: QuickBooks (ADDON-075), Sage (ADDON-076), Xero (ADDON-077), Plaid (ADDON-085), ZATCA Saudi E-Invoice (ADDON-086), European E-Invoice (ADDON-087), and Outlook Mail (ADDON-103), promoting all 7 items to `VERIFIED` and achieving 100.0% completion across all 197 platform features.
**Depends on**: Phase 17

Plans:
- [ ] 18-01: Implement enterprise finance, banking & e-invoicing adapters and verify with automated test suite, achieving 100% GSD completion.


