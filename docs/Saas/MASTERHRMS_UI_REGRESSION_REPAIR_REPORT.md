# MASTERHRMS — UI REGRESSION REPAIR REPORT
**Date:** October 21, 2026  
**Status:** COMPLETE & VERIFIED  
**Auditor:** Antigravity AI Engineering  
**Application Origin:** `http://localhost:3000` (Next.js 16.1.6 App Router)  
**Backend API:** `http://localhost:4000` (Express 4.21.2)  

---

## 1. Executive Summary

Following the full migration from Vite 8 + TanStack Start to Next.js 16.1.6 App Router under `CMS/`, a critical global visual regression occurred across the authenticated application workspace. The dashboard rendered with broken text alignment, unstyled sidebar navigation, missing spacing, unmapped icon fonts, and unformatted raw HTML list items.

This was not an isolated page bug, but a **global design-system and stylesheet omission regression**. Antigravity performed a forensic root-cause analysis, restored all missing stylesheets, design tokens, responsive layout rules, and font definitions, scoped conflicting marketing template stylesheets, and verified the repair across desktop, tablet, and mobile viewports using Playwright MCP.

Both TypeScript compilation (`tsc --noEmit`) and the Next.js production build (`next build` across all 489 routes) completed with **zero errors (exit code 0)**.

---

## 2. Confirmed Root Cause Analysis

Four interconnected root causes led to the visual regression:

### Root Cause 1: Missing Core Stylesheet & Font Links in `CMS/src/app/layout.tsx`
The original working Vite root route (`src/routes/__root.tsx`) loaded:
- `/ui-assets/css/style.css` (235 KB core Dreams ERP and MasterHRMS stylesheet).
- FontAwesome Free icons (`/ui-assets/libs/@fortawesome/fontawesome-free/css/fontawesome.min.css` and `all.min.css`).
- Google Fonts `Public Sans` and `Inter` via CDN preconnect.

When `CMS/src/app/layout.tsx` was created during migration, `/ui-assets/css/style.css` and FontAwesome were completely omitted. As a result, critical layout classes (`.sidebar`, `.sidebar-inner`, `.sidebar-menu`, `.sidebar-logo`, `.page-wrapper`, `.navbar-header`) had no CSS rules, causing the sidebar to render as an unstyled list of text.

### Root Cause 2: Missing Tailwind CSS v4 Theme Tokens & 1,701 Lines of Layout CSS
In the Vite application, `src/styles.css` (1,701 lines) served as the master stylesheet containing:
- `@theme inline` mapping `--color-background: var(--background);`, `--color-foreground: var(--foreground);`, `--color-sidebar: var(--sidebar);`, etc.
- Responsive breakpoints (`@media (min-width: 992px)`, `@media (max-width: 991.98px)`) fixing sidebar docking at `250px` desktop, `72px` mini rail, and slide-in drawer on mobile/tablet.
- `:root` and `.dark` variables (`--sidebar-width`, `--sidebar-bg`, `--primary`, `--card`, `--border`).

In contrast, `CMS/src/app/globals.css` contained only 8 lines importing marketing templates. It had zero knowledge of `src/styles.css` design tokens, causing Tailwind classes like `bg-sidebar`, `bg-card`, and `border-border` to generate no CSS variables.

### Root Cause 3: Marketing Styles Contaminating the Dashboard
The static marketing website stylesheets in `CMS/src/styles/` (`typography.css`, `navigation-menu.css`, `variable.css`) were imported globally into all routes:
- `typography.css` globally applied `@layer base { body { @apply font-inter-tight; } h1..h6 { text-secondary } p { text-secondary/60 } }` across every element in the application, overriding the intended `Public Sans` font and corrupting body text colors.
- `navigation-menu.css` set `.dropdown-menu { opacity: 0; pointer-events: none; visibility: hidden; }` globally, which broke Radix UI and dashboard action dropdowns.
- `variable.css` hardcoded `--color-secondary: #1a1a1c;` and `--color-accent: #fcfcfc;`, which overrode the platform and tenant theme tokens.

### Root Cause 4: Icon Fonts Rendering as Raw Unicode
Phosphor and Tabler icon fonts require explicit font family bindings (`Public Sans` base font and webfont declarations). Without the Google Font and icon stylesheets loaded in `<head>`, glyphs fell back to unmapped character rectangles.

---

## 3. Files Modified & Technical Remedies

| File | Change Description |
|---|---|
| [`CMS/src/app/layout.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/layout.tsx) | Restored `<head>` links: `/ui-assets/css/style.css`, FontAwesome (`fontawesome.min.css`, `all.min.css`), Google Fonts `Public Sans` & `Inter`, and `/favicon.webp`. Added `font-sans` to `<body>`. |
| [`CMS/src/styles/master-hrms.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/styles/master-hrms.css) | Created complete master design system (1,698 lines) containing `@theme inline`, liquid-glass animations, `:root` and `.dark` tokens, Dreams ERP layout rules, 250px fixed sidebar, 72px mini rail, topbar headers, badges, and ApexCharts fixes. |
| [`CMS/src/app/globals.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/globals.css) | Imported `tw-animate-css`, `master-hrms.css`, and configured `@source` scanning paths for `CMS/src` and root `src`. |
| [`CMS/src/styles/typography.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/styles/typography.css) | Scoped `font-inter-tight` and marketing typography exclusively to `.marketing-scope`, removing the global `body`, `h1-h6`, and `p` overrides. |
| [`CMS/src/styles/navigation-menu.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/styles/navigation-menu.css) | Scoped `.dropdown-menu` hiding rules to `.nav-item .dropdown-menu` and `.marketing-scope`, preventing breakage of Radix UI and dashboard dropdowns. |
| [`CMS/src/styles/variable.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/styles/variable.css) | Updated `--color-secondary` and `--color-accent` to `var(--secondary, #1a1a1c)` and `var(--accent, #fcfcfc)` fallbacks so tenant theme variables are preserved. |
| [`CMS/src/components/layout/AppShell.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/layout/AppShell.tsx) | Wrapped public marketing pages in `<div className="marketing-scope">` to isolate marketing styling from authenticated ERP pages. |
| [`CMS/package.json`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/package.json) | Installed `tw-animate-css` dependency to power CSS keyframe animations. |

---

## 4. Visual Verification via Playwright MCP

Visual regression tests were conducted against live Next.js on `http://localhost:3000` using the Playwright MCP browser subagent.

### Screenshots Captured & Verified

| # | Screenshot Artifact | Route | Viewport | Verification Notes |
|---|---|---|---|---|
| 01 | [`repaired_08_login_desktop.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_08_login_desktop.png) | `/auth` | 1440x900 (Desktop) | Clean centered card, WebFamily logo, workspace quick-login credentials widget, proper inputs, remember me checkbox, Sign In button. |
| 02 | [`repaired_03_dashboard_desktop.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_03_dashboard_desktop.png) | `/tenant/dashboard` | 1440x900 (Desktop Dark) | Fixed 250px sidebar, logo with toggle button, active blue pill on "Tenant Workspace Dashboard", submenu bullets, KPI cards, AI Copilot widget. |
| 03 | [`repaired_04_dashboard_light_desktop.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_04_dashboard_light_desktop.png) | `/tenant/dashboard` | 1440x900 (Desktop Light) | Crisp white sidebar background (`#ffffff`), dark slate menu items (`#475569`), light topbar with moon icon, pure white cards with subtle borders. |
| 04 | [`repaired_05_dashboard_tablet.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_05_dashboard_tablet.png) | `/tenant/dashboard` | 768x1024 (Tablet) | Responsive topbar with mobile hamburger button, sidebar hidden off-canvas, 2-column card grid. |
| 05 | [`repaired_06_dashboard_tablet_drawer_open.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_06_dashboard_tablet_drawer_open.png) | `/tenant/dashboard` | 768x1024 (Tablet Drawer) | Clicking hamburger opens 285px mobile drawer with backdrop blur overlay and complete navigation menu. |
| 06 | [`repaired_07_dashboard_mobile.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_07_dashboard_mobile.png) | `/tenant/dashboard` | 375x812 (Mobile) | Full-width single-column responsive cards, compact topbar with hamburger and user avatar. |
| 07 | [`repaired_09_hr_employees.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_09_hr_employees.png) | `/hr/employees` | 1440x900 (Desktop) | Full HR sidebar navigation with category headers (OVERVIEW, WORKSPACE MANAGEMENT, TALENT & GROWTH, FINANCE & ASSETS), filter bar, employee data table. |
| 08 | [`repaired_10_employee_dashboard.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_10_employee_dashboard.png) | `/me/dashboard` | 1440x900 (Desktop) | Employee portal, Leave Distribution, radial time clock with "Punch In" button, Shift activity breakdown, employee-specific sidebar. |
| 09 | [`repaired_11_attendance.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_11_attendance.png) | `/attendance` | 1440x900 (Desktop) | Attendance & Timesheets dashboard, 6 KPI cards, Daily Table/Monthly Matrix toggle, Biometric sync controls. |
| 10 | [`repaired_12_leave.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_12_leave.png) | `/leave` | 1440x900 (Desktop) | Leave management, status pills (Pending in amber, Approved in emerald), Table/Grid view toggle, Apply for Leave button. |
| 11 | [`repaired_13_payroll.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_13_payroll.png) | `/payroll` | 1440x900 (Desktop) | Payroll suite, CTC metric cards, CTC Simulator, Lifecycle State pills (APPROVED, PAID), Excel & PDF export buttons. |
| 12 | [`repaired_14_recruitment.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_14_recruitment.png) | `/recruitment` | 1440x900 (Desktop) | Recruitment & ATS Kanban board (Applied, Screening, Interview, Offer, Hired, Archived), Public Careers Board link. |
| 13 | [`repaired_15_addons.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_15_addons.png) | `/addons` | 1440x900 (Desktop) | Add-ons marketplace banner, category filters, search input. |
| 14 | [`repaired_16_super_admin.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_16_super_admin.png) | `/super` (as Tenant) | 1440x900 (Desktop) | RBAC security boundary: 403 Access Denied centered shield card when accessed without `super_admin` role. |
| 15 | [`repaired_17_super_admin_authenticated.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/repaired_17_super_admin_authenticated.png) | `/super` (as Super Admin) | 1440x900 (Desktop) | Welcome banner, 4 KPI cards with mini sparklines, Companies chart, Revenue chart, Top Plans donut chart, Super Admin sidebar. |

---

## 5. Verification Commands & Build Results

### 1. TypeScript Check
```bash
npm --prefix CMS run typecheck
```
**Result:** Exit Code 0 (No type errors)

### 2. Next.js Production Build
```bash
npm --prefix CMS run build
```
**Result:** Exit Code 0 (All 489 static and dynamic routes generated successfully)

### 3. Authentication & RBAC Isolation
- Tenant user accessing `/super` is cleanly intercepted with a styled `403 — Super Admin Authorization Required` card.
- Platform Super Admin (`admin@masterhrms.com`) accesses `/super` with full charts, metrics, and orchestration controls.
- Role-based navigation filtering in `dreams-sidebar.tsx` operates correctly for Tenant Admin, HR, Employee, and Super Admin.

---

## 6. Conclusion & Acceptance Criteria Met

- [x] **Global UI Regression Resolved:** Root cause traced to missing `/ui-assets/css/style.css`, unmapped icon fonts, missing Tailwind v4 theme tokens in `CMS/src/app/globals.css`, and unsanitized marketing CSS.
- [x] **Sidebar Navigation Restored:** 250px fixed desktop sidebar, 72px mini rail, 285px mobile drawer, active menu bullets, chevron indicators, and category headings all function seamlessly.
- [x] **Theme Consistency:** Light and Dark mode toggle operates cleanly with proper background, border, card, and text contrast.
- [x] **Cross-Viewport Responsiveness:** Tested and verified at Desktop (1440x900), Tablet (768x1024), and Mobile (375x812).
- [x] **Zero Regressions:** All 489 Next.js routes compile and build without errors.
