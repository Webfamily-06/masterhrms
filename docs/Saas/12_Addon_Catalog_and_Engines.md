# 12. Add-on Catalog, Shared Engines and Build Waves

Status: **CATALOG & COMMERCE FULFILLMENT FOUNDATION FORMALLY ACCEPTED (PHASE A3 & A3.6); A3.7 RAZORPAY SANDBOX VERIFIED (93/93 TESTS PASSING).** The unified add-on catalog, dynamic pricing engine, transactional entitlement fulfillment, standalone add-on billing (Option 3A), Sovereign capacity enforcement (100 employee cap, no overages per CP-02), and Razorpay sandbox payments are implemented and verified. Context: `10_SaaS_Architecture_Master_Plan.md`; commerce spec: `docs/architecture/PHASE_A3_COMMERCE_ARCHITECTURE_SPEC.md` and `docs/architecture/MASTERHRMS_A3_7_RAZORPAY_SANDBOX_SPEC.md`.

---

## 1. Add-on manifest (every add-on and module has one)

| Field | Meaning |
|---|---|
| `slug`, `name`, `category`, `type` | Identity; type = module / integration / ai / security / content / finance / ops |
| `engine` | Which shared engine it runs on (section 3) |
| `version`, `requires[]`, `conflicts[]`, `minPlatformVersion` | Compatibility |
| `entitlementKey` | Single key used by backend `requireEntitlement`, frontend `useEntitlement`, navigation registry |
| `pricing` | Reference to catalog price rows (period, trial, seats, usage) |
| `provides.nav[]` | Sidebar entries (app, heading, label, path, permission) |
| `provides.permissions[]` | Permission keys and default role grants |
| `provides.settings[]` | Settings groups and fields (secrets flagged) shown in Tenant Settings |
| `provides.jobs[]` | Scheduled jobs and their settings toggle |
| `provides.events[]` | Realtime and webhook events emitted/consumed |
| `provides.widgets[]` | Dashboard widgets |
| `provides.models[]` | DB models/tables used (all with `tenant_id`) |
| `hooks.install` / `hooks.uninstall` / `hooks.upgrade` | Seed data, default roles, templates; retention rules |
| `regions[]`, `compliance[]` | For region-gated add-ons (EU e-invoice, ZATCA) |
| `marketplace` | Images, gallery, benefits, FAQ, docs links (feeds the storefront) |

The registry reads manifests to **derive** the marketplace listing, sidebar, permission catalog, settings screens, scheduler and usage metering. No add-on is wired by hand in six places.

### Add-on Definition of Done
1. Manifest complete and validated; entitlement key enforced on every endpoint and page.
2. Install, uninstall (data retained N days) and upgrade hooks tested.
3. Nav items and permissions appear/disappear live on purchase/removal.
4. Settings screen with Test button where an external service is involved; secrets encrypted.
5. Realtime events and notifications wired; audit entries written.
6. Marketplace content ready (images, benefits, FAQ, pricing, docs).
7. Tests: tenant isolation, entitlement off returns 403, happy path, failure path.
8. Usage metering if the add-on consumes credits.

---

## 2. Category map (your lists, normalized)

| Your list | Normalized category | Count |
|---|---|---|
| HRMS SaaS add-ons | **HRMS and Business Tools** (split: HR modules, Strategy tools, Learning) | 20 |
| Integration SaaS add-ons | **Integrations** | 29 |
| AI add-on | **AI** | 4 |
| SaaS settings page and security add-ons | **Security and Authentication** | 11 |
| Operations | **Operations** | 8 |
| Mobility | **Mobility and Communication** | 5 |
| Content management | **Content and Storage** | 14 |
| Finance | **Finance** | 20 |

---

## 3. The 12 engines

| # | Engine | What it provides once | Add-ons that sit on it |
|---|---|---|---|
| E1 | **Strategy Studio** | Template/canvas/document builder: sections, matrices (2x2, 4-box, 5-force, 7-S), rich text, tables, collaborative edit, comments, versions, export PDF/PPT, link to Google Slides, AI assist hook | PESTEL, Porter's Five Forces, PEST, McKinsey 7-S, SWOT, Business Model (canvas), Business Plan, Marketing Plan, Planning |
| E2 | **Learning and Assessment** | Courses, lessons, quizzes/exams, question bank, attempts, grading, certificates, learning paths, progress | LMS, Exam, Training (links to HR trainings) |
| E3 | **Talent** | Job posts, public job board, applications, scorecards, performance cycles, indicators | Recruitment, Job Search, Performance, Performance Indicator |
| E4 | **Time and Workforce** | Time entries, timers, rosters, workload heatmaps, device ingestion (biometric) | Time Tracker, Timesheet, Team Workload, Rotas, Bio-metric Attendance |
| E5 | **Accounting and Commercial Documents** | Double-entry ledger, documents with numbering/tax, templates, e-signature hooks, recurring schedules | Double Entry, Quotation, Recurring Invoice/Bill, Retainer, Contracts, Contract Templates, Petty Cash, Budget Planner, Financial Goal, Smart Reports, Smart Dashboard, Procurement, Asset Borrow and Rent, Assets |
| E6 | **Integration Hub** (connector framework) | Connections (OAuth/API key), field mapping, triggers and actions, sync jobs, retries, logs, webhook in/out, health | All "Integrations" except SMS providers: Webhook, Zapier, n8n, Make, Pabbly, Google Analytics, Trello, Asana, Jira, OneNote, Microsoft To Do, Google Slides, Diagram, WHMCS, Indiamart, HubSpot Support, Pipedrive, Google Wallet, Plaid, QuickBooks, Xero, Sage, ZATCA, E-invoice (EU) |
| E7 | **Messaging Gateway** | One send API (SMS, bulk SMS, templates, DLT/sender-id for India, delivery reports, credits, opt-out) with **provider adapters** | SMS, Bulk SMS, MSG91, Fast2SMS, Vonage, Plivo, Telesign, Africa's Talking, ClickSend, Zita SMS, Sendinblue (email/SMS) |
| E8 | **AI Service** | Provider abstraction, prompt templates, credits and usage metering, per-tenant data policy, guardrails, history, citation of tenant data (RAG) | AI Business Advisor, AI Document, AI Assistant, AI Image |
| E9 | **Identity and Security** | OAuth/OIDC social login (central callback), 2FA, captcha, session policy, backup and restore jobs | Google reCAPTCHA, Google Authentication, Sign-in with Google/Microsoft(Outlook)/Facebook/LinkedIn/Twitter(X)/GitHub/Slack/Bitbucket, Backup and Restore |
| E10 | **Workflow and Operations** | Tickets with SLA, activity logs, reminders, alerts, signatures, roadmap boards, templates | Support Ticket, Activity Logs, Reminder, Custom Alert, Signature, Roadmap Central, Project Template, Rotas (shared with E4) |
| E11 | **Content and Storage** | Folder/file model, sharing links, versions, preview, search, **storage connectors** (Drive/OneDrive/Dropbox/Box), Office docs connectors, knowledge pages, video library | File Sharing, Documents, Document Template, Internal Knowledge, Spreadsheet, Video Hub, Innovation Center, Portfolio, Google Drive, OneDrive, Dropbox, Box, Google Docs, Google Sheet |
| E12 | **Engagement and Mobility** | Notices, suggestions with voting, notes, public API keys and docs, warranty registry | Notice Board, Suggestion Box, API, Notes, Warranty |

---

## 4. Full add-on catalog (with engine, notes, wave)

Wave: **1** = foundation/revenue, **2** = growth, **3** = long tail. "Decide" = needs your decision (section 5).

### 4.1 HRMS and Business Tools (20)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | PESTEL Analysis | E1 | Template of 6 factor boxes | 3 |
| 2 | Porter's Five Forces | E1 | 5-force diagram with ratings | 3 |
| 3 | PEST Analysis | E1 | Subset of PESTEL; share template | 3 |
| 4 | Performance Indicator | E3 | Part of Performance; Decide (merge with #19) | 1 |
| 5 | McKinsey 7-S Model | E1 | 7 node model with alignment score | 3 |
| 6 | SWOT Analysis | E1 | 4-box, link items to actions | 3 |
| 7 | Business Model | E1 | Canvas | 3 |
| 8 | Exam | E2 | Question bank, timed attempts | 2 |
| 9 | Job Search | E3 | Public job board and applicant portal (needs career site) | 3 |
| 10 | Business Plan | E1 | Long-form doc template | 3 |
| 11 | Marketing Plan | E1 | Long-form doc template | 3 |
| 12 | Planning | E1 | Decide: strategic or project planning | 3 |
| 13 | Procurement | E5 | Requisition, PO, vendor, approval; better under Inventory/Finance; Decide | 2 |
| 14 | Team Workload | E4 | Capacity vs assigned heatmap | 2 |
| 15 | Time Tracker | E4 | Timers, timesheets, project billing | 1 |
| 16 | Bio-matric Attendance | E4 | You already have `biometric-sync` (ZKTeco); keep one slug | 1 |
| 17 | Training | E2 | Core HR page exists; Decide core vs add-on | 1 |
| 18 | LMS | E2 | Courses, quizzes, certificates | 2 |
| 19 | Performance | E3 | Core HR page exists; Decide | 1 |
| 20 | Recruitment | E3 | Core HR pages exist; Decide | 1 |

### 4.2 Integrations (29)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | Webhook | E6 | Outbound webhooks with signing and retries; also needed by Zapier/n8n/Make/Pabbly | 1 |
| 2 | SMS | E7 | Generic gateway settings; provider selected per tenant | 1 |
| 3 | Zapier | E6 | Triggers/actions via API and webhooks | 2 |
| 4 | n8n | E6 | Webhook + API key node | 2 |
| 5 | Pabbly Connect | E6 | Webhook based | 2 |
| 6 | Google Analytics | E6 | Measurement ID on public/portal pages with cookie consent | 2 |
| 7 | Diagram | E6/E1 | Decide: what service (for example diagrams.net embed)? | 3 |
| 8 | WHMCS | E6 | Hosting billing sync; Decide need | 3 |
| 9 | Bulk SMS | E7 | Campaign sends with lists | 2 |
| 10 | Google Slides | E6 | Export decks from reports/strategy tools | 3 |
| 11 | Make | E6 | Webhook based | 2 |
| 12 | Indiamart | E6 | Lead pull into CRM (India) | 2 |
| 13 | Trello | E6 | Tasks/boards sync | 2 |
| 14 | ClickSend | E7 | Provider adapter | 3 |
| 15 | Asana Project | E6 | Tasks sync | 2 |
| 16 | Google Wallet | E6 | Decide use case (passes/ID cards/loyalty) | 3 |
| 17 | Jira | E6 | Issues sync | 2 |
| 18 | OneNote | E6 | Notes export/sync | 3 |
| 19 | Vonage SMS | E7 | Adapter | 3 |
| 20 | Sendinblue | E7/E6 | Now named Brevo; email and SMS adapter | 2 |
| 21 | MSG91 | E7 | Adapter (India, DLT) | 1 |
| 22 | Plivo SMS | E7 | Adapter | 3 |
| 23 | HubSpot Support | E6 | Tickets/contacts sync | 2 |
| 24 | Pipedrive | E6 | Deals/contacts sync | 2 |
| 25 | Fast2SMS | E7 | Adapter (India) | 1 |
| 26 | Microsoft To Do | E6 | Todo sync | 2 |
| 27 | Zita SMS | E7 | Adapter; Decide/confirm provider | 3 |
| 28 | Telesign SMS | E7 | Adapter | 3 |
| 29 | Africa's Talking | E7 | Adapter | 3 |

### 4.3 AI (4)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | AI Business Advisor | E8 | Scheduled insights over tenant data (retention setting from System Settings plan) | 2 |
| 2 | AI Document | E8 | Generate and summarize documents/letters/policies | 2 |
| 3 | AI Assistant | E8 | In-app chat with permission-aware tools | 1 |
| 4 | AI Image | E8 | Image generation with credits and content policy | 3 |

### 4.4 Security and Authentication (11 in your list)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | Google Captcha | E9 | reCAPTCHA on login/signup/forms | 1 |
| 2 | Google Authentication | E9 | Decide: authenticator-app 2FA (TOTP) or Google login | 1 |
| 3 | Backup and Restore | E9 | Tenant-scoped export/restore, schedules, retention | 1 |
| 4 | Sign-in with Google | E9 | Central callback | 1 |
| 5 | Sign-in with Outlook | E9 | Same Microsoft identity platform as #8; merge | 1 |
| 6 | Sign-in with Facebook | E9 | | 3 |
| 7 | Sign-in with LinkedIn | E9 | | 1 |
| 8 | Sign-in with Microsoft | E9 | Merge with Outlook | 1 |
| 9 | Sign-in with Twitter (X) | E9 | | 3 |
| 10 | Sign-in with GitHub | E9 | | 3 |
| 11 | Sign-in with Slack | E9 | | 3 |
| 12 | Sign-in with Bitbucket | E9 | | 3 |

### 4.5 Operations (8)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | Support Ticket | E10 | Also powers client portal and the add-on Support tab | 1 |
| 2 | Activity Logs | E10 | Tenant-visible audit view | 1 |
| 3 | Rotas | E4/E10 | Shift rosters; overlaps HR shifts and rosters; Decide | 2 |
| 4 | Project Template | E10 | Reusable project/task templates | 3 |
| 5 | Reminder ("Remainder") | E10 | Personal/system reminders, scheduler | 1 |
| 6 | Signature | E10 | E-sign for contracts, offers, acknowledgements | 2 |
| 7 | Roadmap Central | E10 | Public/internal product roadmap boards, votes | 3 |
| 8 | Custom Alert | E10 | Rule-based alerts to email/SMS/in-app | 3 |

### 4.6 Mobility and Communication (5)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | Notice Board | E12 | Overlaps HR Announcements; Decide (merge) | 1 |
| 2 | Suggestion Box | E12 | Anonymous option, voting | 3 |
| 3 | API | E12 | Public API keys, scopes, rate limits, docs (your `/docs` portal fits here) | 1 |
| 4 | Notes | E12 | Personal and shared notes | 1 |
| 5 | Warranty | E12 | Warranty registry for assets/products | 3 |

### 4.7 Content and Storage (14)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | File Sharing | E11 | Share links with expiry/password | 1 |
| 2 | Documents | E11 | Document library with versions | 1 |
| 3 | Internal Knowledge | E11 | Knowledge base articles with permissions | 2 |
| 4 | Google Drive | E11 | Storage connector | 2 |
| 5 | Spreadsheet | E11 | Native sheets or connector; Decide scope | 3 |
| 6 | Video Hub | E11 | Upload/embed videos, access control | 2 |
| 7 | Document Template | E11 | Templates with variables; overlaps HR templates | 2 |
| 8 | Innovation Center | E11/E12 | Idea submissions and evaluation | 3 |
| 9 | OneDrive | E11 | Connector | 2 |
| 10 | Google Sheet | E11 | Connector | 3 |
| 11 | Portfolio | E11 | Public/private showcase pages | 3 |
| 12 | Dropbox | E11 | Connector | 2 |
| 13 | Box | E11 | Connector | 2 |
| 14 | Google Docs | E11 | Connector | 3 |

### 4.8 Finance (20)
| # | Add-on | Engine | Notes | Wave |
|---|---|---|---|---|
| 1 | Smart Reports | E5 | Report builder over finance/HR/CRM data | 2 |
| 2 | Smart Dashboard | E5 | Drag-and-drop dashboards | 2 |
| 3 | Double Entry | E5 | You already have accounting; Decide core vs add-on | 1 |
| 4 | Contracts | E5/E10 | Lifecycle, e-sign, renewals; overlaps HR contracts; Decide | 2 |
| 5 | Assets | E5 | You already have `assets`; keep slug | 1 |
| 6 | Timesheet | E4 | Same as HR timesheet; Decide | 1 |
| 7 | Recurring Invoice/Bill | E5 | Scheduler-driven | 1 |
| 8 | Financial Goal | E5 | Targets vs actuals | 3 |
| 9 | E-Invoice (European) | E6 | Region: EU (Peppol/UBL formats) | 3 |
| 10 | Retainer | E5 | Prepaid hours/amount drawdown | 3 |
| 11 | Quotation | E5 | Convert to invoice/sales order | 1 |
| 12 | Contract Templates | E5 | Overlaps HR contract templates; share engine | 2 |
| 13 | Budget Planner | E5 | Budgets by dept/project | 2 |
| 14 | ZATCA | E6 | Region: Saudi Arabia e-invoicing | 3 |
| 15 | Plaid | E6 | Bank feeds (region limited) | 3 |
| 16 | QuickBooks | E6 | Accounting sync | 2 |
| 17 | Petty Cash Management | E5 | Imprest, vouchers | 2 |
| 18 | Xero | E6 | Accounting sync | 2 |
| 19 | Sage | E6 | Accounting sync | 3 |
| 20 | Asset Borrow and Rent | E5 | Lending/renting assets with billing | 3 |

---

## 5. Decisions needed (overlaps, naming, scope)

1. **Core vs add-on:** Recruitment, Training, Performance (+Indicator), Biometric, Timesheet, Assets, Double Entry, Notice Board already exist as core pages in the HRMS/ERP plan. Choose for each: stay in the base plan, or become paid add-ons (then core menu entries are gated by entitlement).
2. **Merge:** Performance Indicator into Performance; Sign-in with Outlook into Sign-in with Microsoft; Time Tracker with Timesheet (one time engine, two views); Rotas with HR Shifts and Rosters; Notice Board with HR Announcements; Contract Templates and Document Template with HR templates.
3. **Re-categorize:** Procurement moves to Finance or Inventory; PESTEL/PEST/Porter/7-S/SWOT/Business Model/Business Plan/Marketing Plan/Planning become a **Business Tools (Strategy Studio)** category instead of "HRMS"; Exam and LMS become **Learning**.
4. **Clarify:** "Google Authentication" (authenticator 2FA or Google login), "Planning" (strategy vs project), "Diagram" (which service), "Google Wallet" (use case), "WHMCS" (need), "Zita SMS" (provider), "Spreadsheet" (native or connector).
5. **Region gating:** ZATCA (Saudi) and E-Invoice (EU) only visible/purchasable for supported countries.
6. **Naming fixes in the catalog:** Reminder (not "Remainder"), Warranty, Bio-metric, Sendinblue is now called Brevo, Twitter is now X.
7. **Overall count:** after merges the catalog is about 95 add-ons built on 12 engines.

### 5.1 Confirmed Product Owner Packaging & Capacity Decisions (Phase A3.6 & A3.7)
- **OD-3 (Accepted):** Standalone workspace-bound add-ons supported without requiring a base plan. Option 3A standalone billing implemented (`BillingInvoice.subscriptionId = null`).
- **CP-02 (Confirmed):** Sovereign tier capacity confirmed at 100 employees per tenant workspace. Overage billing is strictly prohibited.
- **CP-03 (Confirmed):** Standalone pricing schedules for POS, CRM, Finance, Biometric Sync, and WhatsApp Alerts deferred; Option 3A architecture preserved.
- **CP-04 (Confirmed):** Grandfathering confirmed — active subscriptions preserve existing agreed rates perpetually.

---

## 6. Build waves

| Wave | Goal | Contents | Prerequisites |
|---|---|---|---|
| **W1: Foundation and trust** | Make the platform safe and sellable | E9 (Captcha, 2FA, Google/Microsoft/LinkedIn login, Backup and Restore), E10 (Support Ticket, Activity Logs, Reminder), E12 (API, Notes, Notice Board), E7 with MSG91 and Fast2SMS, E6 Webhook, E11 Documents and File Sharing, Time Tracker, Recruitment/Performance/Training/Biometric as add-ons (if decided), Double Entry, Quotation, Recurring Invoice, AI Assistant | Platform core (A1 to A4 in file 10) |
| **W2: Growth and integrations** | Connect to the tools customers already use | E6 connectors (Zapier, n8n, Make, Pabbly, Trello, Asana, Jira, To Do, HubSpot, Pipedrive, Indiamart, QuickBooks, Xero, Google Analytics), E11 storage connectors (Drive, OneDrive, Dropbox, Box), more SMS adapters, E2 LMS and Exam, Procurement, Contracts + Signature, Team Workload, Smart Reports/Dashboard, Budget Planner, Petty Cash, Knowledge, Video Hub, AI Document and Business Advisor | W1 engines stable |
| **W3: Long tail and region** | Differentiation | E1 Strategy Studio with all 9 tools, remaining social logins, Roadmap Central, Innovation Center, Portfolio, Warranty, Suggestion Box, Custom Alert, Asset Borrow and Rent, Retainer, Financial Goal, ZATCA, E-Invoice EU, Plaid, WHMCS, Sage, Google Wallet, AI Image, remaining SMS adapters, Job Search | Demand and region priorities |

For each wave the agent delivers: engine first, then add-ons as manifests/adapters; two add-ons proven on an engine before the rest.

---

## 7. Engine acceptance tests (examples)

- **E6 Integration Hub:** connect a provider (OAuth or API key), test connection, map fields, run a sync, see logs and retries, disconnect cleanly (webhooks and jobs removed).
- **E7 Messaging Gateway:** send via two providers through the same API; delivery report arrives; credit deduction; opt-out respected; failure fallback.
- **E9 Social login:** login through central callback on a tenant subdomain and on a custom domain; account linking by verified email only; disabled when entitlement ends.
- **E1 Strategy Studio:** create a SWOT from template, collaborate, export PDF, convert items to tasks; same editor loads PESTEL with different template.
- **E8 AI Service:** usage metered per tenant, credit exhaustion blocked with upgrade prompt, tenant data never sent to another tenant.
- **Entitlement switch:** buying or revoking any add-on changes sidebar, routes, API access and jobs within seconds, without redeploy.
