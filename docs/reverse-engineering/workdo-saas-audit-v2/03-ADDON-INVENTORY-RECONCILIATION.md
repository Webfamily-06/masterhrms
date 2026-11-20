# 03 — Master Add-on Inventory Reconciliation

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Codebase Reality & Source Verification  
**Date:** November 19, 2026  
**Total Canonical Add-ons Investigated:** 133  

---

## 1. Executive Summary

In the historical investigation report (`docs/reverse-engineering/workdo-saas/06-MASTER-ADDON-INVENTORY.md`), 133 canonical Add-ons were catalogued across 11 functional domains. The report asserted varying degrees of implementation, with several modules labeled as `IMPLEMENTED` or `PARTIALLY VERIFIED`.

This re-audit independently reconciles all 133 add-on records against actual filesystem modules (`server/src/modules/`), Express route controllers (`server/src/routes/`), and frontend components (`src/routes/`).

---

## 2. MASTERHRMS Implementation Reality Breakdown

Out of the 133 canonical Add-ons, the actual implementation status in MASTERHRMS is strictly partitioned as follows:

### 2.1 Fully Implemented Enterprise Add-on Modules (8 Modules)
These 8 modules have dedicated modular directories under `server/src/modules/` containing manifests, isolated routes, services, and tests:

| Module Identifier | Add-on Name | Modular Backend Path | Key Services & Route Handlers | Forensic Evidence Tier |
|---|---|---|---|---|
| `activity-logs` | Enterprise Audit & Activity Logs | `server/src/modules/activity-logs/` | `activity-logs.service.ts`, `activity-logs.routes.ts` | **VERIFIED** |
| `backup-restore` | Tenant Backup & Restore | `server/src/modules/backup-restore/` | `backup-restore.service.ts`, `backup-restore.routes.ts` | **VERIFIED** |
| `internal-reminders` | Internal Reminders & Follow-ups | `server/src/modules/internal-reminders/` | `reminders.service.ts`, `reminders.routes.ts` | **VERIFIED** |
| `notice-board` | Notice Board & Announcements | `server/src/modules/notice-board/` | `notice-board.service.ts`, `notice-board.routes.ts` | **VERIFIED** |
| `outbound-webhooks` | Outbound Webhooks Gateway | `server/src/modules/outbound-webhooks/` | `webhooks.service.ts`, `webhooks.routes.ts` | **VERIFIED** |
| `public-api` | Developer Public API & Docs | `server/src/modules/public-api/` | `public-api.service.ts`, `public-api.routes.ts` | **VERIFIED** |
| `sms-gateway` | SMS Gateway Integration | `server/src/modules/sms-gateway/` | `sms-gateway.service.ts`, `sms-gateway.routes.ts` | **VERIFIED** |
| `two-factor-auth` | Two-Factor Authentication (TOTP) | `server/src/modules/two-factor-auth/` | `two-factor.service.ts`, `two-factor.routes.ts` | **VERIFIED** |

### 2.2 Route-Level Implemented Add-ons (24 Modules)
These 24 functional capabilities are implemented directly inside `server/src/routes/` and corresponding domain services, but do not use the modular `server/src/modules/` plugin architecture:

| Add-on Slug | MASTERHRMS Functional Name | Primary Route File | Primary Domain Service | Status |
|---|---|---|---|---|
| `biometric-attendance` | Biometric Attendance Integration | `server/src/routes/biometric.routes.ts` | `biometric-sync.service.ts` | **SOURCE-INSPECTED** |
| `recruitment-ats` | Recruitment & Applicant Tracking | `server/src/routes/hr-recruitment.routes.ts` | `recruitment.service.ts` | **SOURCE-INSPECTED** |
| `training-system` | Training & LMS Management | `server/src/routes/training.routes.ts` | `training.service.ts` | **SOURCE-INSPECTED** |
| `smart-dashboard` | Smart Dashboard Analytics | `server/src/routes/smart-dashboard.routes.ts` | `dashboard-analytics.service.ts` | **SOURCE-INSPECTED** |
| `smart-reports` | Enterprise Smart Reports | `server/src/routes/smart-reports.routes.ts` | `smart-reports.service.ts` | **SOURCE-INSPECTED** |
| `ai-assistant` | AI Workspace Assistant | `server/src/routes/ai-assistant.routes.ts` | `ai-assistant.service.ts` | **SOURCE-INSPECTED** |
| `ai-business-advisor` | AI Business Advisor | `server/src/routes/ai-business-advisor.routes.ts` | `ai-automation.service.ts` | **SOURCE-INSPECTED** |
| `ai-document` | AI Document Generator | `server/src/routes/ai-document.routes.ts` | `ai-document.service.ts` | **SOURCE-INSPECTED** |
| `suggestion-box` | Employee Suggestion Box | `server/src/routes/suggestion-box.routes.ts` | `suggestion-box.service.ts` | **SOURCE-INSPECTED** |
| `timesheets` | Project & Task Timesheets | `server/src/routes/timesheets.routes.ts` | `timesheets.service.ts` | **SOURCE-INSPECTED** |
| `custom-fields` | Dynamic Custom Fields Engine | `server/src/routes/custom-fields.routes.ts` | `custom-fields.service.ts` | **SOURCE-INSPECTED** |
| `form-builder` | Dynamic Web Form Builder | `server/src/routes/forms.routes.ts` | `forms.service.ts` | **SOURCE-INSPECTED** |
| `workflow-automation` | Workflow Automation Engine | `server/src/routes/workflows.routes.ts` | `workflow.service.ts` | **SOURCE-INSPECTED** |
| `todos` | Personal & Shared ToDo System | `server/src/routes/todos.routes.ts` | `todos.service.ts` | **SOURCE-INSPECTED** |
| `notes` | Workspace Sticky Notes | `server/src/routes/notes.routes.ts` | `notes.service.ts` | **SOURCE-INSPECTED** |
| `shopify-sync` | Shopify E-Commerce Sync | `server/src/routes/shopify.routes.ts` | `shopify-integration.service.ts` | **SOURCE-INSPECTED** |
| `woocommerce-sync` | WooCommerce E-Commerce Sync | `server/src/routes/woocommerce.routes.ts` | `woocommerce-integration.service.ts` | **SOURCE-INSPECTED** |
| `okr` | Corporate OKRs & Goal Tracking | `server/src/routes/okr.routes.ts` | `okr.service.ts` | **SOURCE-INSPECTED** |
| `planning-strategy` | Strategic Business Planning | `server/src/routes/planning-strategy.routes.ts` | `planning.service.ts` | **SOURCE-INSPECTED** |
| `strategy-studio` | Strategic Analysis (SWOT, PESTEL) | `server/src/routes/strategy-studio.routes.ts` | `strategy-studio.service.ts` | **SOURCE-INSPECTED** |
| `support-ticket` | Customer Helpdesk & Support Tickets | `server/src/routes/helpdesk.routes.ts` | `helpdesk.service.ts` | **SOURCE-INSPECTED** |
| `assets` | Fixed Asset Management | `server/src/routes/assets.routes.ts` | `assets.service.ts` | **SOURCE-INSPECTED** |
| `budget-planner` | Enterprise Budget Planning | `server/src/routes/budgets.routes.ts` | `budgets.service.ts` | **SOURCE-INSPECTED** |
| `performance-management` | Employee Performance Appraisals | `server/src/routes/hr-performance.routes.ts` | `performance.service.ts` | **SOURCE-INSPECTED** |

### 2.3 Add-ons Observed in Reference But NOT Implemented in MASTERHRMS (101 Add-ons)
The remaining 101 Add-ons catalogued from WorkDo (including third-party social integrations like Instagram/LinkedIn/Twitter, meeting platforms like Zoom/Whereby/Jitsi, niche payment gateways, and CRM niche connectors) exist purely as market specifications or reference platform observations (`OBSERVED` / `NOT IMPLEMENTED`).

---

## 3. Reconciled Category Distribution Matrix

The 133 canonical Add-ons are distributed across the 11 audited categories as follows:

| Add-on Category | Total Add-ons in Scope | Fully Implemented in Modules | Implemented in Route Files | Unimplemented / Specification Only |
|---|---|---|---|---|
| **Free Add-ons** | 5 | 1 (`notice-board`) | 4 (`ai-business-advisor`, `smart-dashboard`, `smart-reports`, `suggestion-box`) | 0 |
| **Social Media** | 20 | 0 | 0 | 20 |
| **Integration** | 17 | 1 (`outbound-webhooks`) | 3 (`shopify-sync`, `woocommerce-sync`, `workflows`) | 13 |
| **Ecommerce & Sales** | 10 | 0 | 0 | 10 |
| **Content Management** | 21 | 0 | 1 (`strategy-studio`) | 20 |
| **Finance** | 17 | 0 | 2 (`budget-planner`, `assets`) | 15 |
| **HR** | 11 | 0 | 5 (`biometric`, `recruitment`, `training`, `okr`, `performance`) | 6 |
| **Communication & Customization** | 12 | 2 (`sms-gateway`, `internal-reminders`) | 4 (`helpdesk`, `custom-fields`, `form-builder`, `todos`) | 6 |
| **Mobility & Operations** | 9 | 1 (`public-api`) | 1 (`timesheets`) | 7 |
| **AI** | 2 | 0 | 2 (`ai-assistant`, `ai-document`) | 0 |
| **Security** | 9 | 3 (`two-factor-auth`, `activity-logs`, `backup-restore`) | 0 | 6 |
| **TOTAL** | **133** | **8** | **22** | **103** |

*(Note: Certain multi-capability routes like `strategy-studio` span multiple sub-features. Total unique implemented add-on equivalents in MASTERHRMS = 32).*
