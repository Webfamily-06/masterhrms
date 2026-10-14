# MASTERHRMS Add-on Reference, UI & Workflow Reconciliation Matrix

## 1. Executive Summary & Authoritative Count Reconciliation

This document establishes the single source of truth for all add-ons, modules, and extensions in MASTERHRMS. It reconciles reference specifications (`docs/Addon/`), historical worklogs (`docs/Saas/worklog_addon_inventory.md`), PostgreSQL production records (`Addon` table), runtime catalog entries (`CANONICAL_CATALOG_REGISTRY`), client navigation configurations (`MASTER_ADDON_REGISTRY`), and route security rules (`ROUTE_ENTITLEMENT_MAP`).

### 1.1 Mandatory 6-Source Count Reconciliation Table

| Source / Layer | Authoritative Count | Reconciliation Status | Notes |
| :--- | :---: | :---: | :--- |
| **Reference Specifications (`docs/Addon/`)** | **26** | 100% Extracted & Mapped | 26 Word `.docx` documents extracted to XML in `docs/Addon/extracted/`. 25 of 26 implemented in production code; 1 (`job-search`) deferred to Wave 3. |
| **Historical Worklog (`worklog_addon_inventory.md`)** | **109** | 100% Reconciled (AD-001..AD-109) | Includes 54 active canonical add-ons, 4 base subscription plans, 3 standalone platform suites, 3 planned Wave 3 specs, 28 legacy/deprecated aliases, and 17 core/internal sub-features. |
| **PostgreSQL `Addon` Database Table** | **55** | 100% Synchronized | 54 unique canonical add-on products active in marketplace + 1 draft duplicate alias (`google-workspace-integration`, status: `draft`, safely excluded from active catalog). |
| **Unified Catalog (`CANONICAL_CATALOG_REGISTRY`)** | **58** | 100% Validated & Priced | 4 BASE_PLAN (`starter`, `professional`, `enterprise`, `ultimate`) + 3 STANDALONE_PRODUCT (`crm-suite`, `pos-system`, `finance-accounting`) + 51 ADDON. All active DB addons merged dynamically. Zero unpriced items. |
| **Master Navigation (`MASTER_ADDON_REGISTRY`)** | **43** | 100% Active & Validated | Comprehensive client-side registry for all add-ons with dedicated UI routes, modal surfaces, or extension nodes. Pass validation with 0 errors. |
| **Route Security (`ROUTE_ENTITLEMENT_MAP`)** | **45** | 100% Gated & Enforced | 45 discrete route patterns guarded by entitlement checks. Core platform paths (`/overview`, `/settings`, `/employees`, `/payroll`) bypass add-on gating for fail-safe operation. |

---

## 2. 10-State Lifecycle Classification Framework

To eliminate ambiguity between missing features and intentionally hidden/deferred modules, MASTERHRMS defines 10 discrete lifecycle states:

| Lifecycle State | Visibility in Marketplace | Visibility in Sidebar | Allowed Marketplace Action | Description |
| :--- | :---: | :---: | :---: | :--- |
| `implemented_entitled` | Yes | Yes (Active) | `open` | Add-on is fully implemented, active for the tenant (by plan or purchase), and unlocked in navigation. |
| `implemented_uninstalled` | Yes | No (Hidden) | `install` (if free/included) or `purchase` (if paid) | Add-on is fully implemented but not activated by the current tenant. Discovered exclusively via Marketplace. |
| `implemented_disabled` | Yes | No (Hidden) | `enable` | Tenant owns the add-on, but administrative toggle has explicitly suspended it. |
| `in_progress_available` | Yes | No (Hidden) | `install` / `purchase` | Features in active beta testing; available in marketplace under beta flag, not active until explicitly installed. |
| `in_progress_restricted` | Yes (Badge: Coming Soon) | No (Hidden) | Disabled / Read-only | Work-in-progress modules visible to platform admins only. |
| `planned_available` | Yes (Catalog-only) | No (Hidden) | `preorder` / Info | Planned add-ons cataloged for roadmapping. |
| `planned_restricted` | Hidden | Hidden | None | Planned future modules not yet advertised to tenants. |
| `deferred_standalone` | Marketplace filter / Standalone | Hidden from HRMS | Launch Portal | Complete external systems (CRM, POS, Enterprise Finance) requiring separate tenant provisioning. |
| `reference_spec_only` | Hidden | Hidden | None | Functional specifications in `docs/Addon/` awaiting Wave 3 implementation (e.g. `job-search`). |
| `alias_redirect` | Hidden (Normalized to canonical) | Hidden (Normalized) | Redirects to canonical | Legacy slugs or alternate naming mapped in `ADDON_ALIASES`. Never rendered as duplicate cards. |

---

## 3. Reference Documentation Mapping (26 `docs/Addon/` Specs)

All 26 functional specifications found in `docs/Addon/` are accounted for below with their runtime slug, target routes, navigation integration, and implementation status:

| # | Spec Document Name | Canonical Slug | Target Route | Navigation Type & Group | Status |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | `AI Assistant - Addon.docx` | `ai-assistant` | `/ai` | Extension (`Apps & Extensions`) | `implemented_entitled` / `implemented_uninstalled` |
| 2 | `AI Business Advisor - addon.docx` | `ai-business-advisor` | `/advisor` | Extension (`Apps & Extensions`) | `implemented_entitled` / `implemented_uninstalled` |
| 3 | `Business Model Addon.docx` | `business-model` | `/strategy/business-model` | Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 4 | `Business Plan addon.docx` | `business-plan` | `/strategy/business-plan` | Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 5 | `Job Search -Addon.docx` | `job-search` | `/recruitment/jobs` (Spec) | Reference Spec Only | `reference_spec_only` (Wave 3) |
| 6 | `Marketing Plan Addon.docx` | `marketing-plan` | `/strategy/marketing-plan` | Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 7 | `McKinsey 7-addon.docx` | `mckinsey-7s` | `/strategy/mckinsey-7s` | Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 8 | `PESTEL Analysis Model Addon.docx` | `pestel` | `/strategy/pestel` | Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 9 | `Performance Indicator Addon.docx` | `performance-indicator` | `/performance/kpi` | Integrated (`Performance`) | `implemented_entitled` / `implemented_uninstalled` |
| 10 | `Planning Addon.docx` | `budget-planner` | `/budgets` | Integrated (`Finance & Budgets`) | `implemented_entitled` / `implemented_uninstalled` |
| 11 | `Porter's Five Force addon.docx` | `porters-five-forces`| `/strategy/porters-five-forces`| Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 12 | `Procurement Addon.docx` | `procurement` | `/procurement` | Standalone Module | `implemented_entitled` / `implemented_uninstalled` |
| 13 | `Recruitment Management addon.docx` | `recruitment-ats` | `/recruitment` | Standalone Module | `implemented_entitled` / `implemented_uninstalled` |
| 14 | `SWOT Analysis Addon.docx` | `swot` | `/strategy/swot` | Integrated (`Strategic Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 15 | `Smart Dashboard Analytics.docx`| `smart-dashboard` | `/dashboard/smart` | Integrated (`Analytics`) | `implemented_entitled` / `implemented_uninstalled` |
| 16 | `Team Workload Addon.docx` | `team-workload` | `/timesheets` | Integrated (`Time & Attendance`) | `implemented_entitled` / `implemented_uninstalled` |
| 17 | `The AI Document Addon.docx` | `ai-document` | `/ai-writer` | Extension (`Apps & Extensions`) | `implemented_entitled` / `implemented_uninstalled` |
| 18 | `The Notice Board Add.docx` | `notice-board` | `/communication/announcements` | Integrated (`Communication`) | `implemented_entitled` / `implemented_uninstalled` |
| 19 | `The Smart Reports Add.docx` | `smart-reports` | `/reports/smart` | Integrated (`Analytics`) | `implemented_entitled` / `implemented_uninstalled` |
| 20 | `The Suggestion Box Add.docx` | `suggestion-box` | `/forms` | Extension (`Apps & Extensions`) | `implemented_entitled` / `implemented_uninstalled` |
| 21 | `The Webhook Addon.docx` | `outbound-webhooks` | `/settings/webhooks` | Settings Integration | `implemented_entitled` / `implemented_uninstalled` |
| 22 | `Time Tracker Addon.docx` | `time-tracker` | `/timesheets` | Integrated (`Time & Attendance`) | `implemented_entitled` / `implemented_uninstalled` |
| 23 | `Training-addons.docx` | `training` | `/training` | Integrated (`HR Management`) | `implemented_entitled` / `implemented_uninstalled` |
| 24 | `lms.docx` | `learning-lms` | `/lms` | Standalone Module | `implemented_entitled` / `implemented_uninstalled` |
| 25 | `performance-addon.docx` | `performance-management` | `/performance` | Standalone Module | `implemented_entitled` / `implemented_uninstalled` |
| 26 | `the Custom Field Add-On.docx` | `custom-fields` | `/custom-fields` | Extension (`Settings & Apps`) | `implemented_entitled` / `implemented_uninstalled` |

---

## 4. Master Add-on Inventory & Pricing Reconciliation (54 Active Addons)

| Slug | Canonical Name | Category | Monthly Price | Annual Price | Mode | Launch Route |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `ai-assistant` | AI Copilot Assistant | AI | $19.00 | $190.00 | extension | `/ai` |
| `ai-business-advisor` | AI Business Advisor | AI | $49.00 | $490.00 | extension | `/advisor` |
| `ai-document` | AI Document Writer | AI | $15.00 | $150.00 | extension | `/ai-writer` |
| `backup-restore` | Automated Backup & Restore | System | $9.00 | $90.00 | settings | `/settings/backups` |
| `biometric-sync` | Biometric Device Integration | HRM | $19.00 | $190.00 | extension | `/integrations/biometric` |
| `budget-planner` | Budget & Expense Planner | Finance | $19.00 | $190.00 | integrated | `/budgets` |
| `business-model` | Business Model Canvas | Strategy | $15.00 | $150.00 | integrated | `/strategy/business-model` |
| `business-plan` | Strategic Business Planner | Strategy | $19.00 | $190.00 | integrated | `/strategy/business-plan` |
| `contracts` | Digital Contracts & Signatures | Legal | $15.00 | $150.00 | extension | `/hr/documents/contracts` |
| `custom-fields` | Custom Fields Builder | Operations | $9.00 | $90.00 | extension | `/custom-fields` |
| `documents` | Enterprise Document Cloud | Productivity| $12.00 | $120.00 | extension | `/documents` |
| `einvoice-eu` | EU Peppol E-Invoicing | Compliance | $29.00 | $290.00 | extension | `/invoices` |
| `financial-goal` | Financial Goals & Forecasts | Finance | $15.00 | $150.00 | integrated | `/budgets` |
| `google-workspace` | Google Workspace Connector | Integration | $12.00 | $120.00 | extension | `/integrations/google` |
| `internal-reminders` | Automated Reminders Engine | Operations | $5.00 | $50.00 | settings | `/settings` |
| `learning-lms` | Learning Management System | HRM | $29.00 | $290.00 | standalone | `/lms` |
| `marketing-plan` | Marketing Strategy Engine | Strategy | $19.00 | $190.00 | integrated | `/strategy/marketing-plan` |
| `mckinsey-7s` | McKinsey 7S Framework Studio | Strategy | $15.00 | $150.00 | integrated | `/strategy/mckinsey-7s` |
| `microsoft-365` | Microsoft 365 Integration | Integration | $15.00 | $150.00 | extension | `/integrations/microsoft` |
| `notice-board` | Digital Notice Board & News | Communication| $0.00 | $0.00 | integrated | `/communication/announcements` |
| `outbound-webhooks` | Outbound Event Webhooks | Developer | $9.00 | $90.00 | settings | `/settings/webhooks` |
| `payroll-india` | India Payroll & Statutory Compliance| Compliance| $29.00 | $290.00 | integrated | `/payroll` |
| `performance-indicator` | KPI & Goal Metrics Studio | HRM | $19.00 | $190.00 | integrated | `/performance/kpi` |
| `performance-management` | Employee Performance Reviews | HRM | $25.00 | $250.00 | standalone | `/performance` |
| `pest` | PEST Analysis Engine | Strategy | $12.00 | $120.00 | integrated | `/strategy/pestel` |
| `pestel` | PESTEL Analysis Engine | Strategy | $15.00 | $150.00 | integrated | `/strategy/pestel` |
| `plaid` | Plaid Bank Account Linker | Finance | $19.00 | $190.00 | extension | `/accounting` |
| `porters-five-forces` | Porter's Five Forces Analyzer | Strategy | $15.00 | $150.00 | integrated | `/strategy/porters-five-forces` |
| `procurement` | Procurement & Vendor Management | Operations | $35.00 | $350.00 | standalone | `/procurement` |
| `public-api` | Enterprise Public REST API | Developer | $29.00 | $290.00 | settings | `/settings/api-keys` |
| `quickbooks` | QuickBooks Accounting Bridge | Integration | $25.00 | $250.00 | extension | `/integrations` |
| `razorpay-gateway` | Razorpay Payments Gateway | Finance | $0.00 | $0.00 | extension | `/settings` |
| `recruitment-ats` | Applicant Tracking System (ATS) | HRM | $29.00 | $290.00 | standalone | `/recruitment` |
| `shopify-sync` | Shopify E-Commerce Connector | Integration | $19.00 | $190.00 | extension | `/integrations/shopify` |
| `slack-integration` | Slack Notifications & Commands | Integration | $9.00 | $90.00 | extension | `/integrations/slack` |
| `smart-dashboard` | Smart Executive Dashboard | Analytics | $25.00 | $250.00 | integrated | `/dashboard/smart` |
| `smart-reports` | Smart Reports & Export Engine | Analytics | $19.00 | $190.00 | integrated | `/reports/smart` |
| `sms-gateway` | SMS Notifications Gateway | Communication| $9.00 | $90.00 | settings | `/settings` |
| `strategy-studio` | Strategy Studio Suite | Strategy | $39.00 | $390.00 | standalone | `/strategy` |
| `suggestion-box` | Employee Voice & Suggestion Box | Communication| $9.00 | $90.00 | extension | `/forms` |
| `support` | Help Desk & Support Tickets | Operations | $15.00 | $150.00 | extension | `/support` |
| `swot` | SWOT Analysis Studio | Strategy | $15.00 | $150.00 | integrated | `/strategy/swot` |
| `tally-importer` | Tally ERP Data Importer | Integration | $19.00 | $190.00 | extension | `/integrations/tally` |
| `team-workload` | Team Workload & Allocation | HRM | $15.00 | $150.00 | integrated | `/timesheets` |
| `time-tracker` | Project Time Tracker & Kiosk | HRM | $12.00 | $120.00 | integrated | `/timesheets` |
| `training` | Employee Training Programs | HRM | $15.00 | $150.00 | integrated | `/training` |
| `two-factor-auth` | Two-Factor Authentication (2FA) | Security | $0.00 | $0.00 | settings | `/settings/security` |
| `whatsapp-alerts` | WhatsApp Business Notifications | Communication| $15.00 | $150.00 | extension | `/integrations/whatsapp` |
| `woocommerce-sync` | WooCommerce Sync Bridge | Integration | $19.00 | $190.00 | extension | `/integrations/woocommerce` |
| `xero` | Xero Cloud Accounting Sync | Integration | $25.00 | $250.00 | extension | `/integrations` |
| `zatca` | ZATCA Phase 2 E-Invoicing | Compliance | $29.00 | $290.00 | extension | `/invoices` |
| `zoom-meetings` | Zoom Video Conferencing | Integration | $9.00 | $90.00 | extension | `/integrations/zoom` |
| `leave-tracker` | Advanced Leave & Absence Rules | HRM | $12.00 | $120.00 | integrated | `/leave` |
| `attendance-geo` | Geofenced Mobile Attendance | HRM | $15.00 | $150.00 | integrated | `/attendance` |

---

## 5. Security & Isolation Guarantees

1. **No Accidental Tenant Entitlement**: Merely querying the catalog or loading the marketplace never creates `TenantAddon` records. Free add-ons require explicit tenant action (`POST /api/addons/:slug/install`). Paid add-ons require authenticated checkout (`POST /api/commerce/checkout`).
2. **Fail-Closed Entitlement Checks**: Uninstalled or disabled add-ons are completely omitted from sidebar navigation (`resolveExtensionItems`, `resolveStandaloneModules`, `resolveIntegratedAddons`). Direct URL traversal to unentitled routes triggers automatic redirect or access denial via `checkEntitlementByKey()`.
3. **Multi-Tenant State Isolation**: Add-on installation state is scoped strictly to `tenantId`. Switching tenants immediately invalidates cached navigation state.
4. **Public Privacy Protection**: Public non-tenant catalog requests receive product metadata with `eligibility: undefined`, eliminating tenant state leakage across public network boundaries.
