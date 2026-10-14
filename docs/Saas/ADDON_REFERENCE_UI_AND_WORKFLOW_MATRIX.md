# MASTERHRMS — Authoritative Add-on Reference, UI & Workflow Matrix

This document provides the definitive repository-wide inventory reconciliation and reference matrix for add-ons, modules, and navigation in MASTERHRMS. It reconciles the 26 reference specifications in `docs/Addon/`, the 109 catalog items in `docs/Saas/worklog_addon_inventory.md`, database records, server commerce registries, and client navigation trees.

---

## 1. Authoritative 6-Source Count Reconciliation Table

| Source | Count | Description / Scope | Reconciled Status |
| :--- | :---: | :--- | :--- |
| **1. `docs/Addon/` Reference Specs** | **26** | Functional specifications extracted from Word XML documents | 26/26 Extracted & Mapped (25 implemented in code, 1 planned Wave 3) |
| **2. `docs/Saas/worklog_addon_inventory.md`** | **109** | Broad catalog worklog (AD-001 through AD-109) spanning core modules, plugins, standalone suites, and extensions | 109 accounted for across Core HRMS, Add-ons, and Standalone Enterprise ERP suites |
| **3. Database `Addon` Table** | **55** | Rows in PostgreSQL `Addon` table | 54 active canonical products + 1 draft duplicate alias (`google-workspace-integration` marked `is_active: false`) |
| **4. `CANONICAL_CATALOG_REGISTRY`** | **58** | Server-side commerce and catalog registry (`server/src/services/unified-catalog.service.ts`) | 4 `BASE_PLAN` (starter, professional, enterprise, ultimate), 3 `STANDALONE_PRODUCT` (crm, pos, finance), 51 `ADDON` |
| **5. `MASTER_ADDON_REGISTRY`** | **43** | Client-side add-on navigation registry (`src/lib/addon-navigation.ts`) | 43 canonical add-ons with registered navigation routes, rendering modes, and icons |
| **6. `ROUTE_ENTITLEMENT_MAP`** | **45** | Route guard entitlement mappings (`src/lib/navigation-resolver.ts`) | 45 protected routes gating add-on UI against tenant entitlement and activation status |

---

## 2. Document-to-Code Mapping: All 26 Reference Specifications (`docs/Addon/`)

| # | Spec Document (`docs/Addon/`) | Add-on Key / Product ID | Client UI Route | Server Controller / Service | Primary DB Models | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `AI Business Advisor - addon.docx` | `ai-business-advisor` | `/ai-business-advisor` | `server/src/modules/ai-business-advisor/` | `AiBusinessInsight`, `AiAdvisorLog` | Implemented |
| **2** | `AI Document - addon.docx` | `ai-document` | `/ai-writer` | `server/src/routes/ai-writer.routes.ts` | `AiDocument`, `DocumentTemplate` | Implemented |
| **3** | `AI Assistant - addon.docx` | `ai-assistant` | `/ai` | `server/src/routes/ai.routes.ts` | `AiChatMessage`, `AiSession` | Implemented |
| **4** | `Backup & Restore - addon.docx` | `backup-restore` | `/system/backup` | `server/src/modules/backup-restore/` | `BackupManifest`, `AuditLog` | Implemented |
| **5** | `Biometric Time Clock - addon.docx`| `biometric-clock` | `/biometric` | `server/src/routes/biometric.routes.ts` | `BiometricDevice`, `BiometricPunch` | Implemented |
| **6** | `Business Model - addon.docx` | `business-model` | `/strategy-studio/business-model` | `server/src/modules/strategy-studio/` | `StrategyCanvas`, `StrategyNode` | Implemented |
| **7** | `Business Plan - addon.docx` | `business-plan` | `/strategy-studio/business-plan` | `server/src/modules/strategy-studio/` | `BusinessPlan`, `PlanMilestone` | Implemented |
| **8** | `Custom Fields - addon.docx` | `custom-fields` | `/custom-fields` | `server/src/routes/custom-fields.routes.ts` | `CustomFieldDefinition`, `CustomFieldValue` | Implemented |
| **9** | `Digital Signature - addon.docx` | `digital-signature` | `/signature` | `server/src/modules/signature/` | `SignatureRequest`, `SignatureEnvelope`| Implemented |
| **10** | `E-Invoice EU - addon.docx` | `einvoice-eu` | `/invoices` | `server/src/services/einvoicing.service.ts` | `Invoice`, `TaxRate` | Implemented |
| **11** | `Internal Reminders - addon.docx`| `internal-reminders` | `/reminders` | `server/src/routes/reminders.routes.ts` | `InternalReminder`, `ScheduledJob` | Implemented |
| **12** | `Job Search - addon.docx` | `job-search` | Spec Only (Wave 3) | Planned for public career portal Wave 3 | `JobListing`, `JobApplication` | Spec Only (Wave 3) |
| **13** | `Learning LMS - addon.docx` | `learning-lms` | `/learning` | `server/src/routes/lms.routes.ts` | `LmsCourse`, `LmsEnrollment` | Implemented |
| **14** | `Marketing Plan - addon.docx` | `marketing-plan` | `/strategy-studio/marketing-plan` | `server/src/modules/strategy-studio/` | `MarketingCampaign`, `MarketingBudget`| Implemented |
| **15** | `McKinsey 7S - addon.docx` | `mckinsey-7s` | `/strategy-studio/mckinsey-7s` | `server/src/modules/strategy-studio/` | `StrategyAssessment`, `SevenSScore` | Implemented |
| **16** | `Multi-Currency - addon.docx` | `multi-currency` | `/multi-currency` | `server/src/routes/currency.routes.ts` | `Currency`, `ExchangeRate` | Implemented |
| **17** | `PEST Analysis - addon.docx` | `pest` | `/strategy-studio/pest` | `server/src/modules/strategy-studio/` | `PestMatrix`, `PestItem` | Implemented |
| **18** | `PESTEL Analysis - addon.docx` | `pestel` | `/strategy-studio/pestel` | `server/src/modules/strategy-studio/` | `PestelMatrix`, `PestelItem` | Implemented |
| **19** | `Porter's Five Forces - addon.docx`| `porters-five-forces`| `/strategy-studio/porters-five-forces`| `server/src/modules/strategy-studio/`| `PortersAnalysis`, `PortersFactor` | Implemented |
| **20** | `QR Attendance - addon.docx` | `qr-attendance` | `/qr-attendance` | `server/src/routes/attendance.routes.ts` | `QrCodeBadge`, `AttendanceRecord` | Implemented |
| **21** | `Recruitment ATS - addon.docx` | `recruitment-ats` | `/recruitment` | `server/src/routes/ats.routes.ts` | `JobPosting`, `CandidateApplication`| Implemented |
| **22** | `Smart Dashboard - addon.docx` | `smart-dashboard` | `/smart-dashboard` | `server/src/modules/smart-dashboard/` | `DashboardWidget`, `WidgetLayout` | Implemented |
| **23** | `Smart Reports - addon.docx` | `smart-reports` | `/reports/builder` | `server/src/modules/smart-reports/` | `ReportTemplate`, `ReportExecution` | Implemented |
| **24** | `Strategy Studio - addon.docx` | `strategy-studio` | `/strategy-studio` | `server/src/modules/strategy-studio/` | `StrategyFramework`, `StrategyProject` | Implemented |
| **25** | `SWOT Analysis - addon.docx` | `swot` | `/strategy-studio/swot` | `server/src/modules/strategy-studio/` | `SwotMatrix`, `SwotQuadrantItem` | Implemented |
| **26** | `ZATCA E-Invoicing - addon.docx` | `zatca` | `/invoices` | `server/src/services/zatca.service.ts` | `ZatcaCompliance`, `Invoice` | Implemented |

---

## 3. Ten-State Lifecycle Classification Matrix

MASTERHRMS strictly enforces a 10-state lifecycle classification model ensuring no uninstalled or disabled modules leak into active sidebar navigation or produce incorrect marketplace actions.

| # | Lifecycle State | Allowed Marketplace Action | Appears in Sidebar? | Gating / Access Control | Example Add-on |
| :-: | :--- | :--- | :---: | :--- | :--- |
| **1** | **Free (Entitled, Enabled, Active)** | `Open` | Yes | Unrestricted tenant access | `smart-reports`, `two-factor-auth` |
| **2** | **Free (Installed, Disabled)** | `Enable` | No | Tenant disabled add-on in settings; route responds with 403 / inactive banner | `internal-reminders` (disabled) |
| **3** | **Paid (Subscribed, Active)** | `Open` | Yes | Valid Stripe/Razorpay subscription active; full navigation item visible | `recruitment-ats` (subscribed) |
| **4** | **Paid (Subscribed, Disabled)** | `Enable` | No | Subscription active but tenant toggled off; hidden from menu until re-enabled | `time-tracker` (disabled) |
| **5** | **Available (Free to Install)** | `Install` | No | Free tier add-on, discoverable in Marketplace; 1-click provisioning | `backup-restore`, `suggestion-box` |
| **6** | **Available (Paid, Requires Purchase)** | `Purchase` | No | Paid add-on requiring monthly/annual checkout; redirect to checkout flow | `learning-lms`, `contracts` |
| **7** | **Plan Included (Active via Base Plan)** | `Open` | Yes | Automatically granted and activated by tenant's base tier (e.g. Enterprise) | `biometric-clock` on Enterprise plan |
| **8** | **Plan Included (Disabled by Admin)** | `Enable` | No | Included in base plan but tenant turned feature toggle off | `multi-currency` on Enterprise plan |
| **9** | **Incompatible / Prerequisite Unmet** | `Incompatible` | No | Cannot be installed until required parent add-on or minimum plan is active | Add-ons requiring Enterprise base plan |
| **10** | **Deprecated / Hidden / Draft Alias** | None (Hidden) | No | Non-canonical aliases, drafts, or legacy references; filtered out of UI | `google-workspace-integration` (alias) |

---

## 4. Architectural Rules & Reconciliation Guarantees

### A. Marketplace Deduplication & Completeness
- Every approved canonical add-on appears **exactly once** in the Marketplace UI.
- All 54 active add-ons display valid monthly and yearly pricing or are explicitly marked `Free`.
- Public visitors querying the catalog do NOT receive tenant eligibility leaks (`eligibility: undefined`).
- Authenticated tenants receive accurate status (`isInstalled`, `isEntitled`, `allowedAction`).

### B. Fail-Closed Sidebar Navigation & Core Route Protection
- Uninstalled or disabled add-ons are strictly filtered out of the sidebar via `resolveSidebarNavigation()`.
- Navigation items never render dead links or placeholders.
- **Core Platform Routes Protection**: Routes belonging to `core`, `overview`, `settings`, `platform`, `core_platform`, `hrm`, and `hrms` remain fully accessible to all authenticated tenants regardless of add-on installation states. Core HR operations (Employees, Payroll, Departments, Leaves) can never be accidentally locked out by add-on configuration.

### C. Enterprise Module Partitioning
- Standalone enterprise suites (CRM, POS, Finance ERP) are partitioned as `STANDALONE_PRODUCT` or deferred modules.
- Standard HRMS tenant users are never exposed to incomplete standalone sub-apps.
- Integrations (e.g. QuickBooks, Xero, Plaid, ZATCA) map cleanly to their corresponding accounting/invoice host workflows.
