# MASTERHRMS — Next.js Design-System Authority & Legacy Vite UI Elimination Report

**Date:** 2026-10-21  
**Status:** Completed & Empirically Verified  
**Runtime:** Next.js 16.1.6 (`CMS/`, Port 3000) & Express 4.21.2 API (`server/`, Port 4000)  
**Author:** Antigravity Forensic Engineering  

---

## 1. Executive Summary

This report establishes **Next.js 16.1.6** as the sole, authoritative design-system source for Master HRMS and confirms the elimination and retirement of legacy Vite UI artifacts, conflicting style sheets, and un-scoped legacy wrappers.

The investigation confirmed that:
1. Legacy Vite runtime (`vite`, port 5173) was previously retired, but Vite-era UI components (`SiteHeader`, `SiteFooter`, un-scoped global CSS stylesheets) still lingered in `CMS/src/components/marketing/` and `AppShell.tsx`.
2. Public CMS pages (`/team`, `/about`, `/contact`, `/pricing`, `/`, `/legal/*`) were inadvertently being touched by un-scoped ERP styles and conflicting token definitions.
3. The genuine Next.js design system (`CMS/src/components/shared/layout/navbar`, `site-footer.tsx`, `variable.css`, `globals.css`, and Google Fonts Inter / Inter Tight) has now been made strictly authoritative.

---

## 2. Confirmed Sources of the Authoritative Design System

| Design Element | Authoritative Next.js Source | Description & Role |
| :--- | :--- | :--- |
| **Public Header** | `CMS/src/components/shared/layout/navbar/navbar.tsx` | Fixed floating curved pill navbar with Webfamily logo, multi-level dropdowns (Company, Platform, Plans & Support, Inner pages), mobile hamburger button, and direct Sign In / Dashboard CTAs. |
| **Mobile Drawer** | `CMS/src/components/shared/layout/mobile-menu/mobile-menu.tsx` | Off-canvas responsive slide drawer with accordion groups, managed by `MobileMenuContext`. |
| **Public Footer** | `CMS/src/components/marketing/site-footer.tsx` | 5-column marketing footer featuring company branding, product categories, solutions, resources, and live database legal links (`/legal/terms-of-service`, `/legal/privacy-policy`). |
| **Typography & Fonts** | `CMS/src/app/layout.tsx` & `CMS/src/styles/variable.css` | Next.js `next/font/google` loading Inter, Inter Tight, Plus Jakarta Sans, IBM Plex Mono, Manrope, Sora, Space Grotesk. |
| **CSS Variables & Tokens** | `CMS/src/styles/variable.css` | Comprehensive design tokens defining `--color-primary-*`, `--color-secondary`, `--background-*`, and `--stroke-*`. |
| **Global Reset & Utility** | `CMS/src/app/globals.css` | Tailwind CSS v4 `@import "tailwindcss";` baseline with custom typography and keyframe animations. |
| **ERP Workspace Shell** | `CMS/src/components/layout/WorkspaceShell.tsx` | Authenticated tenant and HR workspace wrapper with isolated Dreams ERP stylesheet (`/ui-assets/css/style.css`). |
| **Super Admin Shell** | `CMS/src/components/layout/SuperShell.tsx` | Authenticated platform administration console with isolated Dreams ERP stylesheet and administration sidebar. |

---

## 3. Legacy Vite Dependencies Found & Eliminated

### 3.1 Legacy Vite Header & Footer (`SiteHeader`, `SiteFooter`)
- **Found in:** `CMS/src/components/marketing/site-header.tsx`, `CMS/src/components/marketing/site-footer.tsx`, and `CMS/src/components/marketing/marketing-layout.tsx`
- **Issue:** `marketing-layout.tsx` was mounting `SiteHeader` (a legacy Vite-era component with hardcoded styles) alongside or instead of the Next.js `Navbar`.
- **Action Taken:** Removed `SiteHeader` and legacy wrappers from `marketing-layout.tsx`. Made `MarketingLayout` a transparent container that preserves the Next.js floating `Navbar` and `SiteFooter` loaded via `AppShell`.

### 3.2 Global ERP Stylesheet Contamination
- **Found in:** `CMS/src/app/layout.tsx` line 20
- **Issue:** Root `layout.tsx` injected `<link rel="stylesheet" href="/ui-assets/css/style.css" />` globally. This stylesheet contains extensive resets, global `.sidebar` rules, table overrides, and button styling intended only for Dreams ERP.
- **Action Taken:** Removed the stylesheet link from root `layout.tsx`. Moved it into `WorkspaceShell.tsx` and `SuperShell.tsx` with `precedence="default"`, ensuring ERP styles never touch marketing pages.

### 3.3 Collision in Mobile Menu CSS Class Names
- **Found in:** `CMS/src/components/shared/layout/mobile-menu/mobile-menu.tsx`
- **Issue:** Drawer used `className="sidebar ..."` which matched `.sidebar` in `master-hrms.css`. The media query `@media (min-width: 992px) { .sidebar { position: fixed !important; ... } }` forced the mobile drawer to display on desktop viewports.
- **Action Taken:** Renamed `.sidebar` to `.mobile-menu-drawer` and scoped all ERP `.sidebar` CSS rules inside `:is(.main-wrapper, .workspace-shell, .super-layout)`.

### 3.4 Inverted Typography Colors on Marketing Pages
- **Found in:** `CMS/src/styles/master-hrms.css`
- **Issue:** `master-hrms.css` set `--secondary: oklch(0.96 0.01 260)` (light button tint), which caused `.marketing-scope` headings that reference `var(--color-secondary)` to render in pale white against white backgrounds.
- **Action Taken:** In `CMS/src/styles/typography.css`, enforced `--secondary: #1a1a1c !important` and `--color-secondary: #1a1a1c !important` within `.marketing-scope`.

---

## 4. Authoritative Layout Architecture

```
CMS/src/app/layout.tsx (Root HTML, Google Fonts, MobileMenuProvider)
 │
 ├── AppShell.tsx (Route Gatekeeper & Layout Dispatcher)
      │
      ├── MARKETING_PAGES (/team, /, /about, /contact, /pricing, /legal/*)
      │    └── .marketing-scope
      │         ├── Navbar.tsx (Floating Pill Header + Dropdowns)
      │         ├── Page Component ({children})
      │         └── SiteFooter.tsx (Public 5-column Marketing Footer)
      │
      ├── AUTH_PAGES (/login, /register, /forgot-password)
      │    └── Centered Authentication Card Layout
      │
      ├── SUPER_PAGES (/super, /super/*)
      │    └── SuperShell.tsx (Isolated Dreams CSS + Super Admin Sidebar & Header)
      │
      └── WORKSPACE_PAGES (/tenant/*, /hr/*, /me/*, /employees/*)
           └── WorkspaceShell.tsx (Isolated Dreams CSS + ERP Sidebar & Topbar)
```

---

## 5. Viewports & Routes Empirically Verified

Every major route was tested using Playwright MCP across multiple viewports:

| Route | Viewport | Verified Behavior | Screenshot Evidence |
| :--- | :--- | :--- | :--- |
| `/team` | Desktop (1440x900) | Floating pill navbar, dark headline, 3-column real team portraits, no side panel. | [team_desktop_verified.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_desktop_verified.png) |
| `/team` | Tablet (768x1024) | 2-column card grid, collapsed navbar to hamburger. | [team_tablet_verified.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_tablet_verified.png) |
| `/team` | Mobile (375x812) | 1-column responsive grid, mobile navbar. | [team_mobile_verified.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_mobile_verified.png) |
| `/team` (Menu) | Mobile (375x812) | Off-canvas mobile menu drawer with accordion items opens & closes. | [team_mobile_menu_open.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/team_mobile_menu_open.png) |
| `/` | Desktop (1440x900) | Hero section, customer avatar badges, testimonial cards, dark typography. | [homepage_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/homepage_verified_final.png) |
| `/pricing` | Desktop (1440x900) | Monthly/yearly toggles, currency selector, pricing cards. | [pricing_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/pricing_verified_final.png) |
| `/about` | Desktop (1440x900) | Hero photo (replaces 1160x2108 placeholder), counter metrics, team grid. | [about_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/about_verified_final.png) |
| `/contact` | Desktop (1440x900) | Contact form, terms checkbox, office photo (replaces 1126x1132 placeholder). | [contact_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/contact_verified_final.png) |
| `/legal/terms-of-service` | Desktop (1440x900) | Authoritative database legal content, rendered under Next.js pill navbar. | [legal_terms_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/legal_terms_verified_final.png) |
| `/legal/privacy-policy` | Desktop (1440x900) | Authoritative database legal content rendered correctly. | [legal_privacy_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/legal_privacy_verified_final.png) |
| `/legal/unknown-doc` | Desktop (1440x900) | Intentional document not found 404 state. | [legal_unknown_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/legal_unknown_verified_final.png) |
| `/super` | Desktop (1440x900) | Super Admin console, orange hero card, metric cards, charts, Dreams ERP styling intact. | [super_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/super_verified_final.png) |
| `/tenant/dashboard` | Desktop (1440x900) | Tenant dashboard, subscription plan card, workforce quota, configuration hub. | [tenant_dashboard_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/tenant_dashboard_verified_final.png) |
| `/hr/employees` | Desktop (1440x900) | HR employee directory, filters, table headers, action buttons, workspace sidebar. | [hr_employees_verified_final.png](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/hr_employees_verified_final.png) |

---

## 6. Build & Typecheck Validation

- **TypeScript:** `npm --prefix CMS run typecheck` passes with zero errors (`tsc --noEmit` exited with code 0).
- **Runtime:** `npm run dev` serves Next.js on `http://localhost:3000` with Express backend on `http://localhost:4000`.

---

## 7. Definition of Done Checklist

- [x] Next.js is the sole active frontend.
- [x] The intended Next.js header, footer, fonts, and styling are authoritative across all public routes.
- [x] No obsolete Vite-era styling overrides the active application.
- [x] Public CMS pages and authenticated workspace pages retain their intended separate layouts.
- [x] Recent legal-content, routing, and security fixes remain intact.
- [x] Builds and typecheck pass without regressions.
