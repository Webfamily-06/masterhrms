# MASTERHRMS — CMS Design Preservation & Next.js Layout Repair Report

**Date:** 2026-10-21  
**Status:** Completed & Empirically Verified  
**Runtime:** Next.js 16.1.6 (Port 3000) & Express 4.21.2 API (Port 4000)  
**Author:** Antigravity Forensic Engineering  

---

## 1. Executive Summary

This investigation and remediation addressed critical UI defects on the public CMS website (`/team`, `/about`, `/contact`, `/pricing`, `/`, and `/legal/*`) following the Next.js migration:
1. **Left-Side Workspace Panel Collision:** An unexpected left-side menu panel was displaying on desktop marketing pages (`/team`).
2. **Typography & Color Alteration:** Headings and text across marketing pages were bleached and nearly unreadable due to conflicting ERP theme variable values.
3. **Placeholder Dimension Graphics:** Team members and marketing cards were rendering grey boxes displaying dimensions (`818x790`, `784x784`, `1160x2108`, `1126x1132`) instead of genuine portraits and assets.
4. **Layout Leakage & Vite Remnants:** The ERP Dreams global stylesheet (`/ui-assets/css/style.css`) and legacy Vite header/footer wrappers were polluting public marketing routes.

All issues have been resolved with targeted, surgical fixes. Next.js is now the sole authoritative design system, with public marketing pages faithfully reflecting the original Nexsas CMS design, and authenticated ERP workspaces operating cleanly in strict isolation.

---

## 2. Confirmed Root Causes

### 2.1 Unexpected Left-Side Menu Panel on `/team`
- **Location:** `CMS/src/components/shared/layout/mobile-menu/mobile-menu.tsx`
- **Root Cause:** The component assigned `className="sidebar ..."` to the mobile drawer. In `CMS/src/styles/master-hrms.css`, the ERP workspace styles defined `.sidebar` with:
  ```css
  @media (min-width: 992px) {
    .sidebar {
      position: fixed !important;
      left: 0 !important;
      width: 260px !important;
      display: flex !important;
      visibility: visible !important;
      z-index: 1001 !important;
    }
  }
  ```
  Consequently, on any desktop viewport ($\ge 992\text{px}$), the mobile menu drawer was forced open as a fixed left panel spanning 260px width, colliding with the public pill navbar and content.
- **Resolution:** 
  1. Renamed `.sidebar` on the drawer to `.mobile-menu-drawer`.
  2. Scoped all `.sidebar`, `.navbar-header`, `.page-wrapper`, and `.impersonation-top-banner` CSS rules in `CMS/src/styles/master-hrms.css` strictly inside `:is(.main-wrapper, .workspace-shell, .super-layout)`.

### 2.2 Altered Typography, Bleached Headings & Colors
- **Location:** `CMS/src/styles/typography.css` & `CMS/src/styles/master-hrms.css`
- **Root Cause:** 
  - `master-hrms.css` defined `--secondary: oklch(0.96 0.01 260)` for ERP button surfaces.
  - In `typography.css`, headings `h1`-`h6` were styled with `color: var(--color-secondary)`. Because `--color-secondary` inherited the light grey `oklch(0.96...)`, all headings on white backgrounds became nearly invisible.
- **Resolution:**
  - In `CMS/src/styles/typography.css`, established strict `.marketing-scope` overrides:
    ```css
    .marketing-scope {
      --secondary: #1a1a1c !important;
      --color-secondary: #1a1a1c !important;
    }
    .marketing-scope h1,
    .marketing-scope h2,
    .marketing-scope h3,
    .marketing-scope h4,
    .marketing-scope h5,
    .marketing-scope h6 {
      color: #1a1a1c !important;
    }
    .marketing-scope p {
      color: #52525b;
    }
    ```

### 2.3 Placeholder Dimension Graphics (`818x790`, `1160x2108`, `1126x1132`)
- **Location:** `CMS/src/data/team/*.md`, `CMS/src/components/about/hero.tsx`, `CMS/src/components/contact/contact-us.tsx`
- **Root Cause:** 
  - Team member Markdown files referenced `/images/team/member-*.jpg` which were placeholder graphics displaying dimension strings.
  - Hero and contact sections referenced `ns-img-29.jpg` (`1160x2108`) and `opai-img-21.png` (`1126x1132`).
- **Resolution:**
  - Updated all 9 team member data files (`CMS/src/data/team/*.md`) and `CMS/src/components/about/team.tsx` to reference authentic high-resolution portrait assets (`/assets/avatar-01.jpg` through `/assets/avatar-09.jpg`).
  - Synced avatars over placeholder paths in `CMS/public/images/`.
  - Replaced `ns-img-29.jpg` with high-resolution photo asset `CMS/public/assets/card-01.jpg`.
  - Replaced `opai-img-21.png` with modern workplace asset `CMS/public/assets/card-04.jpg`.

### 2.4 ERP Stylesheet Leakage
- **Location:** `CMS/src/app/layout.tsx`
- **Root Cause:** Root `layout.tsx` previously had `<link rel="stylesheet" href="/ui-assets/css/style.css" />` injected into `<head>`, allowing Dreams ERP global resets and font styles to bleed into public marketing pages.
- **Resolution:**
  - Removed the link from root `layout.tsx`.
  - Injected `<link rel="stylesheet" href="/ui-assets/css/style.css" precedence="default" />` exclusively within `WorkspaceShell.tsx` and `SuperShell.tsx`.

---

## 3. Files Modified

| File | Purpose / Change Summary |
| :--- | :--- |
| `CMS/src/components/shared/layout/mobile-menu/mobile-menu.tsx` | Renamed class `sidebar` to `mobile-menu-drawer`, set `z-[9999]`. |
| `CMS/src/styles/master-hrms.css` | Scoped `.sidebar`, `.navbar-header`, `.page-wrapper` to `:is(.main-wrapper, .workspace-shell, .super-layout)`. |
| `CMS/src/styles/typography.css` | Forced dark charcoal (`#1a1a1c`) headings and slate (`#52525b`) body text within `.marketing-scope`. |
| `CMS/src/app/layout.tsx` | Removed global `/ui-assets/css/style.css` stylesheet injection. |
| `CMS/src/components/layout/WorkspaceShell.tsx` | Scoped `/ui-assets/css/style.css` to authenticated tenant/workspace routes. |
| `CMS/src/components/layout/SuperShell.tsx` | Scoped `/ui-assets/css/style.css` to authenticated super-admin routes. |
| `CMS/src/components/layout/AppShell.tsx` | Added `/legal`, `/product`, `/solutions`, `/resources`, `/cms`, `/p` to `MARKETING_PAGES`. |
| `CMS/src/components/marketing/marketing-layout.tsx` | Removed legacy Vite `SiteHeader`/`SiteFooter` dependencies; padded `PageHero` to clear pill navbar. |
| `CMS/src/data/team/*.md` (9 files) | Restored real portrait asset paths `/assets/avatar-01.jpg`..`09.jpg`. |
| `CMS/src/components/about/team.tsx` | Restored real portrait asset paths. |
| `CMS/public/images/ns-img-29.jpg` | Replaced `1160x2108` placeholder with high-resolution photo. |
| `CMS/public/images/opai-img-21.png` | Replaced `1126x1132` placeholder with high-resolution office image. |

---

## 4. Empirical Verification & Evidence

All public marketing and authenticated routes were verified using Playwright MCP on the live Next.js application at `http://localhost:3000`.

### 4.1 `/team` Page (Desktop, Tablet, Mobile)
- **Desktop (1440x900):** Floating pill navbar, dark charcoal "The minds behind Nexsas" headline, 3-column grid of genuine team portraits. No left-side panel.  
  - Screenshot: [team_desktop_verified.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_desktop_verified.png)
- **Tablet (768x1024):** 2-column layout, pill navbar collapses to logo and hamburger toggle.  
  - Screenshot: [team_tablet_verified.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_tablet_verified.png)
- **Mobile (375x812):** 1-column layout, responsive card padding, glassmorphic labels.  
  - Screenshot: [team_mobile_verified.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_mobile_verified.png)
- **Mobile Drawer:** Clean sliding drawer with Webfamily logo, close button, and collapsible accordion menu.  
  - Screenshot: [team_mobile_menu_open.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_mobile_menu_open.png)

### 4.2 `/` (Homepage)
- Clean pill navbar, real customer testimonials and portrait avatars, dark charcoal typography.
- Screenshot: [homepage_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/homepage_verified_final.png)

### 4.3 `/pricing` Page
- Dynamic monthly/yearly pricing toggles, currency selection, feature breakdown cards.
- Screenshot: [pricing_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/pricing_verified_final.png)

### 4.4 `/about` Page
- Real landscape photo replaces `1160x2108` placeholder, counter animations, dark typography.
- Screenshot: [about_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/about_verified_final.png)

### 4.5 `/contact` Page
- Form fields, terms checkbox, office image replaces `1126x1132` placeholder.
- Screenshot: [contact_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/contact_verified_final.png)

### 4.6 `/legal/terms-of-service` & `/legal/privacy-policy`
- Authoritative legal text loaded from database, rendered under Next.js pill navbar and footer.
- Unknown slugs correctly return 404 state.
- Screenshots:
  - [legal_terms_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/legal_terms_verified_final.png)
  - [legal_privacy_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/legal_privacy_verified_final.png)
  - [legal_unknown_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/legal_unknown_verified_final.png)

### 4.7 Authenticated Workspaces
- **Super Admin (`/super`):** Full sidebar, orange "Welcome Back, Alex" hero, metric cards, charts.  
  - Screenshot: [super_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/super_verified_final.png)
- **Tenant Dashboard (`/tenant/dashboard`):** Tier card, workforce count, storage usage, configuration hub.  
  - Screenshot: [tenant_dashboard_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/tenant_dashboard_verified_final.png)
- **HR Employees (`/hr/employees`):** Sidebar navigation, search/filter bar, import/add employee actions.  
  - Screenshot: [hr_employees_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/hr_employees_verified_final.png)

---

## 5. Build & Typecheck Validation

- **TypeScript:** `npm --prefix CMS run typecheck` passes with 0 errors (`tsc --noEmit` exited with code 0).
- **Console Errors:** 0 errors across marketing routes.

---

## 6. Acceptance Sign-Off

All requirements of the CMS Design Preservation task have been satisfied:
- [x] `/team` renders original public CMS layout without unexpected left panel.
- [x] Floating pill navbar, dark charcoal typography, and spacing restored.
- [x] Real team portraits replace all `818x790` placeholder graphics.
- [x] All other public marketing pages (`/`, `/about`, `/contact`, `/pricing`, `/legal/*`) preserved.
- [x] Authenticated ERP workspace and Super Admin layouts verified and isolated.
- [x] Next.js is the sole active frontend.
