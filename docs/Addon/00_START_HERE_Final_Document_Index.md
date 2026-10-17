# START HERE: Final Document Index and Run Order

Date: 2026-10-15. This index says which document is **final**, which are **reference**, and which are **superseded**, so nothing conflicts.

## 1. The final documents for the HRMS production launch with the first 20 add-ons

Use these four together, in this order. They are the "final document" for add-on execution.

| Step | File | Role |
|---|---|---|
| 1 | `saas-architecture/23_Addon_Placement_and_Order_Matrix.md` | **Where every page lives** (HR `/hr/addons/{slug}`, Employee `/me/addons/{slug}`, Tenant, Public), sidebar headings and order, redirects, build order, paste-ready placement override |
| 2 | `saas-architecture/20_Addon_Master_Execution_Prompt.md` | **Master prompt (Part A) pasted once**: launch scope (HRMS only), add-on runtime, dynamic catalog and category CRUD, entitlement, monthly/yearly pricing, expiry block and renewal, zero-mock, reporting format. Part B explains and lists the 20 added flows |
| 3 | `saas-architecture/21_Addon_Execution_Prompts_Set1.md` | Per-add-on prompts: Webhook, AI Assistant, AI Document, Planning + 7 strategy tools |
| 4 | `saas-architecture/22_Addon_Execution_Prompts_Set1_Part2.md` | Per-add-on prompts: Recruitment, Job Search, Training, Performance, Performance Indicator, Team Workload, Time Tracker, Procurement, LMS |
| Tracker | `saas-architecture/worklog_addon_inventory.md` | Add-on inventory list (copy the rows into your repo worklog) |

**How to run:** paste Part A of file 20 once, get Phase R accepted, then for each add-on paste (a) its block from file 21 or 22, (b) the PLACEMENT OVERRIDE from file 23 section 8, in the order of file 23 section 7. After each add-on the agent reports and waits for approval.

Precedence rule: if any older file shows a different URL for an add-on, **file 23 wins**. Fields, CRUD, realtime, expiry and zero-mock rules in files 20 to 22 stay valid.

## 2. Reference documents (still valid, used by the final set)

| File | Use |
|---|---|
| `saas-architecture/10_SaaS_Architecture_Master_Plan.md` | Overall SaaS architecture: hosts and subdomains, entitlements, portals, identity |
| `saas-architecture/11_Marketplace_CMS_and_Billing_Flow.md` | Public CMS marketplace, cart, checkout, tenant and Super Admin add-on pages, billing rules |
| `saas-architecture/15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md` | Role-based settings in realtime (payments, OAuth, SMTP), zero-mock cleanup, CRUD completion |
| `saas-architecture/16_UI_Implementation_Guide.md` | UI standards: shell, page templates, states, responsive, i18n |
| `saas-architecture/17_Platform_Operations_Flows.md` | Impersonation, banned IPs, jobs, backup/restore, tickets, broadcasts, email templates, analytics, localization |
| `hrms-plan/01_HR_Panel_Spec.md`, `02_Employee_Portal_Spec.md`, `03_Interlinking_and_Realtime_Flows.md`, `00_Architecture_and_Conventions.md` | Page-by-page HR and Employee specs and conventions |
| `hrms-plan/04_Route_Folder_Sidebar_Tenant_Migration_Plan.md` | Route folders, sidebars, tenant login, subdomain resolution |
| `saas-architecture/14_Status_Review_A0_A1_and_Next_Steps.md` | Security findings from `index.ts` (A1b hardening list) |
| `Advanced_Payroll_Module_Roadmap_and_Agent_Brief.md` | Payroll module brief (separate track) |

## 3. Superseded or historical (do not use as instructions)

| File | Why |
|---|---|
| `saas-architecture/12_Addon_Catalog_and_Engines.md` | Early catalog and engine grouping; add-on slugs, merges and routes are replaced by files 20 to 23 for the first 20 add-ons (the engine idea is still useful for later add-ons). Note: the "merge Performance Indicator into Performance" suggestion was withdrawn |
| `saas-architecture/18_Addon_Routing_and_Implementation_Playbook.md` | Its `/addons/{slug}/*` routes are replaced by file 23; the manifest and 13-point done checklist remain useful |
| `saas-architecture/13_A0_Audit_Brief.md` | A0 is complete in your repo |
| `hrms-plan/worklog.md` (my copy) | Your **repo worklog is the authoritative ledger**; my copy is stale |
| `MasterHRMS_Employee_Portal_Plan.md`, `MasterHRMS_System_Settings_Platform_Plan.md` | Earlier versions, replaced by `hrms-plan/02` and file 15 |

## 4. What is still needed from you before the agent starts

1. Path scheme: Option A `/hr/addons/{slug}` and `/me/addons/{slug}` (default) or Option B `/hr/{slug}` and `/me/{slug}` (file 23, Q-PL01 to Q-PL07).
2. Per add-on monthly and yearly price, trial days, grace days (default 0), retention days (default 30) (file 20 section 13).
3. Packaging confirmation: Recruitment, Training and Performance become paid add-ons (D-018).
4. Time Tracker desktop app scope; AI key model (tenant keys or platform credits); Projects-lite and Items-lite defaults (file 20 section 7).
5. Keep the A1b security items (add-on self-activation block, deny-by-default entitlement map, private files, webhook raw body) before live payments.
