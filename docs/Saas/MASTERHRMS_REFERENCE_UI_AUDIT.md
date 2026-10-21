# MASTERHRMS — Reference-Driven UI Audit

## Executive Summary

Following the full Vite-to-Next.js migration, a reference-driven UI alignment and layout audit was performed across MASTERHRMS. The audit evaluated three primary reference targets and their shared layout systems:

1. **Reference A — Blog Settings & Publication Editor:** Two-column editor structure, section headers, form controls, markdown rich-text toolbar, cover-image drop zone, and stacked sidebar configuration cards.
2. **Reference B — Integrations Cards Grid:** App cards grid, uniform card dimensions, soft pastel app icons, 2-line description clamp, category badges, footer controls ("Settings", "Details"), and enable/disable toggle switches.
3. **Reference C — Integration Settings Modal:** Centered dialog, blurred backdrop, credential inputs (Client ID, masked secret with eye toggle), environment selector, webhook URL with copy button, event triggers checkboxes, and diagnostic connection test.

---

## 1. Architectural Baseline & Root Cause Findings

| Area | Defect / Inconsistency Identified | Architectural Root Cause | Status |
| :--- | :--- | :--- | :--- |
| **Blog Settings Editor** | Modal was single-column, lacking two-column responsive split, missing rich-text formatting buttons, and sidebar cards were absent. | Editor in `blog-manager-studio.tsx` was implemented as a simple 1-column form dialog without multi-section card separation. | **RESOLVED** |
| **Integrations Marketplace** | Missing standard App Cards grid; tenant integrations page only exposed raw SMTP textboxes and a lone API key input. | Lack of shared enterprise integration card studio component. | **RESOLVED** |
| **Integration Settings Modal** | No dedicated settings modal existed for third-party integrations (Slack, Google Workspace, Zoom, QuickBooks, Stripe, etc.). | Settings modal was not yet constructed as a reusable dialog component. | **RESOLVED** |
| **Modal Stacking & Backdrop** | Radix UI dialogs (`z-50`) were positioned under legacy sidebar (`z-900`/`z-1000`) and topbar overlays. | Legacy styles in `master-hrms.css` had elevated z-indices on `.sidebar` causing modals to appear partially obscured. | **RESOLVED** (Updated `dialog.tsx` to `z-[9999]` and `z-[10000]`). |
| **Blog Insights Toolbar** | Search icon and input controls previously had inconsistent heights and alignment. | Standardized to unified `h-9` control heights and responsive flex wrap in previous turn. | **RESOLVED** |

---

## 2. Layout Families Evaluated

1. **Super Admin Console (`SuperShell`):**
   - Routes: `/super`, `/super/blogs`, `/super/integrations`, `/super/cms`, `/super/marketplace`.
   - Layout: Fixed left sidebar with collapsible mini-rail, sticky topbar with global search, breadcrumb navigation, and padded content container.
2. **Tenant Workspace (`WorkspaceShell`):**
   - Routes: `/tenant/integrations`, `/tenant/branding`, `/hr/dashboard`.
   - Layout: Multi-tier organizational sidebar, tenant brand switcher, top search and user profile dock.
3. **Public Marketing Shell (`MarketingShell`):**
   - Routes: `/`, `/pricing`, `/addons`, `/blog`, `/resources`.
   - Layout: Header navigation bar, dynamic breadcrumbs, responsive container gutters, and unified footer.
