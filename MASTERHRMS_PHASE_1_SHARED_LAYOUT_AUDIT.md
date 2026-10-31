# MASTERHRMS — PHASE 1: SHARED LAYOUT ARCHITECTURE AUDIT

**Project:** MasterHRMS Multi-Tenant SaaS  
**Phase:** 1 — Full Responsive Architecture Audit & Baseline (Read-Only)  
**Date:** October 31, 2026  
**Status:** AUDIT COMPLETE — BASELINE ESTABLISHED

---

## 1. Architectural Scope of Layout Shells

MasterHRMS utilizes a multi-tier layout hierarchy separating public marketing pages, platform super administrator functions, and multi-tenant authenticated workspace portals:

```
                               ┌────────────────────────────────────────────────┐
                               │       RootLayout (CMS/src/app/layout.tsx)      │
                               │  - HTML & Head with icon fonts                 │
                               │  - AppProviders & QueryClientProvider          │
                               │  - MobileMenuProvider & SmoothScroll           │
                               └───────────────────────┬────────────────────────┘
                                                       │
                               ┌───────────────────────▼────────────────────────┐
                               │      AppShell (CMS/.../layout/AppShell.tsx)     │
                               └───────────┬────────────────────────┬───────────┘
                                           │                        │
                    Path starts with /super│                        │Path is workspace or tenant
                                           ▼                        ▼
               ┌──────────────────────────────┐        ┌───────────────────────────────┐
               │         SuperLayout          │        │        WorkspaceLayout        │
               │ (CMS/src/app/super/layout.tsx│        │(CMS/src/app/(workspace)/...  │
               └──────────────┬───────────────┘        └───────────────┬───────────────┘
                              │                                        │
               ┌──────────────▼───────────────┐        ┌───────────────▼───────────────┐
               │          SuperShell          │        │        WorkspaceShell         │
               │ (CMS/.../layout/SuperShell)  │        │ (CMS/.../layout/WorkspaceShell│
               │ - Desktop Sidebar (id=sidebar│        │ - DreamsSidebar (50+ modules) │
               │ - Sticky Top Navbar          │        │ - Sticky Top Navbar           │
               │ - Impersonation Banner       │        │ - Realtime Notification Drawer│
               │ - Mobile Slide-Nav Drawer    │        │ - AICopilotWidget             │
               │ - CommandDialog (⌘K)         │        │ - CommandDialog (⌘K)          │
               └──────────────────────────────┘        └───────────────────────────────┘
```

---

## 2. In-Depth Shell Inspection

### A. `WorkspaceShell` (`CMS/src/components/layout/WorkspaceShell.tsx`)
- **Lines of Code:** 1,261 lines.
- **Portals Powered:**
  1. Tenant Admin (`/tenant/*`)
  2. HR Admin (`/hr/*`)
  3. Employee Self-Service (`/me/*`)
  4. Core ERP & Shared Business Suites (`/accounting`, `/pos`, `/crm`, `/files`, etc.)
- **Header Structure:**
  - Full-width sticky navbar (`.navbar-header`).
  - Contains Hamburger toggle (`#mobile_btn`), Tenant logo, ⌘K search input, 2FA status badge, Portal Switcher, Theme Toggle, Notification Drawer trigger, User Avatar dropdown.
- **Sidebar Integration:**
  - Embeds `DreamsSidebar` (`CMS/src/components/dreams-sidebar.tsx`).
  - Controls mobile open/closed state via `useState<boolean>(false)`.
  - When `mobileOpen` is active, attaches class `slide-nav` to `.main-wrapper` and `document.body`.
  - Mounts `<div className={cn("sidebar-overlay", mobileOpen && "opened")} onClick={() => setMobileOpen(false)} />`.
- **Content Wrapper:**
  - `<div className="page-wrapper flex flex-col justify-between">`
  - `<main className="content min-w-0 flex-1">`
  - Encapsulates entitlement guards (`ProductNotSubscribed`, `AddonNotInstalled`, `AccessDenied`).

### B. `SuperShell` (`CMS/src/components/layout/SuperShell.tsx`)
- **Lines of Code:** 748 lines.
- **Portals Powered:** Super Admin Console (`/super/*`, `/super/tenants`, `/super/plans`, `/super/files`, etc.).
- **Header Structure:**
  - Sticky navbar (`.navbar-header`) with Super Admin brand badge.
  - Quick action buttons: Tenant search, System Health, Notifications, Theme toggle, Impersonation exit trigger, Profile avatar.
- **Sidebar Integration:**
  - Inline custom `<aside className="sidebar">` (does not use `DreamsSidebar`).
  - Hardcoded navigation for 20+ Super Admin orchestrator nodes.
  - Collapsible desktop state (`collapsed`) and mobile drawer state (`mobileOpen`).

---

## 3. Layout Findings & Discrepancy Matrix

---

### Finding ID: LAYOUT-001 (CRITICAL)
- **Affected Components:** `WorkspaceShell` vs `SuperShell` vs `master-hrms.css`
- **File Paths:**
  - [`CMS/src/styles/master-hrms.css:764`](file:///Users/apple/Documents/hrms/CMS/src/styles/master-hrms.css#L764)
  - [`CMS/src/styles/master-hrms.css:1091`](file:///Users/apple/Documents/hrms/CMS/src/styles/master-hrms.css#L1091)
  - [`CMS/src/components/layout/WorkspaceShell.tsx:406`](file:///Users/apple/Documents/hrms/CMS/src/components/layout/WorkspaceShell.tsx#L406)
- **Severity:** **CRITICAL**
- **Root Cause: Breakpoint Mismatch (992px vs 1024px)**
  - The CSS rules in `master-hrms.css` define desktop layout at `@media (min-width: 992px)`.
  - The JSX in `WorkspaceShell.tsx` and `dreams-sidebar.tsx` toggles mobile controls at `lg:` (`1024px`).
  - On viewports between **992px and 1023px** (Tablet Landscape, e.g. 1024x768 with browser scrollbars or iPad Air in landscape):
    1. CSS applies `margin-left: 260px` to `.page-wrapper`.
    2. React JSX renders `lg:hidden` elements (the hamburger button `#mobile_btn` and mobile drawer backdrop).
    3. The desktop sidebar and mobile drawer elements coexist simultaneously, causing the mobile button to float awkwardly inside the topbar above a fixed sidebar.
- **Evidence:**
  `master-hrms.css:1091: @media (max-width: 991.98px)`  
  `dreams-sidebar.tsx:406: className="hidden lg:flex ..."`
- **Recommended Correction:** Standardize all breakpoint definitions to Tailwind v4:
  - Mobile/Tablet range: `< 1024px` (`@media (max-width: 1023.98px)`).
  - Desktop range: `>= 1024px` (`@media (min-width: 1024px)`).
- **Dependencies:** `master-hrms.css`, `WorkspaceShell`, `SuperShell`.
- **Regression Risks:** Low. Guarantees predictable breakpoint behavior across all browsers.

---

### Finding ID: LAYOUT-002 (HIGH)
- **Affected Components:** `dreams-sidebar.tsx` vs `SuperShell.tsx`
- **File Paths:**
  - [`CMS/src/components/dreams-sidebar.tsx:345`](file:///Users/apple/Documents/hrms/CMS/src/components/dreams-sidebar.tsx#L345)
  - [`CMS/src/components/layout/SuperShell.tsx:147`](file:///Users/apple/Documents/hrms/CMS/src/components/layout/SuperShell.tsx#L147)
- **Severity:** **HIGH**
- **Root Cause: Duplicated & Inconsistent Sidebar Class Names**
  - `dreams-sidebar.tsx` uses `className={cn("sidebar border-r ...", mobileOpen && "opened")}`.
  - `SuperShell.tsx` uses `className="sidebar border-r ..."` and relies exclusively on `document.body.classList.toggle('slide-nav', mobileOpen)`.
  - `master-hrms.css` checks both `body.slide-nav .sidebar` and `.sidebar.opened`.
  - Because `SuperShell` maintains an entirely separate sidebar DOM implementation, updates to navigation badges, active link styles, or scrollbar styling in `dreams-sidebar.tsx` do not apply to `SuperShell`.
- **Evidence:**
  `dreams-sidebar.tsx:345` vs `SuperShell.tsx:147`.
- **Recommended Correction:** Extract a shared `ResponsiveSidebarDrawer` shell wrapper that standardizes the mobile slide-in animation, backdrop click dismiss, touch swipe dismiss, and accessibility attributes (`aria-expanded`, `aria-hidden`) across both shells.
- **Dependencies:** `dreams-sidebar.tsx`, `SuperShell.tsx`.
- **Regression Risks:** Medium. Requires verifying Super Admin navigation links.

---

### Finding ID: LAYOUT-003 (HIGH)
- **Affected Components:** `AICopilotWidget` (`CMS/src/components/ai-copilot-widget.tsx`)
- **File Paths:** [`CMS/src/components/layout/WorkspaceShell.tsx:1257`](file:///Users/apple/Documents/hrms/CMS/src/components/layout/WorkspaceShell.tsx#L1257)
- **Severity:** **HIGH**
- **Root Cause: Floating Action Widget Collision on Mobile**
  - `AICopilotWidget` is unconditionally rendered at the root of `WorkspaceShell`.
  - It renders a fixed floating action button at `fixed bottom-6 right-6 z-50`.
  - On mobile screens (360px–390px), this floating icon sits directly on top of:
    1. The Chat message Send button in `/tenant/chat`.
    2. The bottom pagination controls in table views (`/call-history`, `/hr/employees`).
    3. The floating Action button in ToDo.
- **Evidence:**
  Users attempting to tap "Send" or page navigation inadvertently trigger the AI Copilot modal.
- **Recommended Correction:**
  1. On mobile screens (< 768px), shift the widget anchor or hide the fixed FAB when inside active full-height modules (like Chat and File Manager).
  2. Alternatively, integrate the AI Copilot trigger into the mobile topbar or navigation drawer rather than a blocking fixed screen overlay.
- **Dependencies:** `AICopilotWidget`, `WorkspaceShell`.
- **Regression Risks:** Low.

---

### Finding ID: LAYOUT-004 (MEDIUM)
- **Affected Components:** `page-wrapper` & `content` padding
- **File Paths:** [`CMS/src/styles/master-hrms.css:1142-1149`](file:///Users/apple/Documents/hrms/CMS/src/styles/master-hrms.css#L1142-L1149)
- **Severity:** **MEDIUM**
- **Root Cause: Forced Inflexible Padding on Full-Bleed Modules**
  - `master-hrms.css` applies:
    ```css
    .content {
      padding: 16px !important;
      width: 100% !important;
      max-width: 100vw !important;
      overflow-x: hidden !important;
      flex: 1 0 auto !important;
      box-sizing: border-box !important;
    }
    ```
  - For standard dashboard pages with cards, `padding: 16px` is appropriate.
  - However, for full-height interactive apps (Calendar, Chat, File Manager), this forced 16px outer padding prevents them from filling the viewport. The apps then calculate `h-[calc(100vh-4rem)]` from an already padded parent, producing vertical double-scrollbars and nested scroll containers.
- **Evidence:**
  Double vertical scrollbar observed on Calendar and Chat on tablet portrait viewports.
- **Recommended Correction:** Allow full-bleed layout overrides on `.content` (e.g. `.content.content-fullbleed { padding: 0 !important; }` or standard utility classes) for specialized interactive applications.
- **Dependencies:** `WorkspaceShell.tsx`.
- **Regression Risks:** Low.

---

## 4. Proposed Shared Layout Responsive Contract

To eliminate current collisions, all portal shells must conform to the following contract in Phase 2:

```
Breakpoint Contract:
├── Mobile:          < 768px   (1-column single-pane, hidden desktop sidebars, bottom sheets)
├── Tablet Portrait: 768px-1023px (collapsed icon sidebar or slide-over drawer, responsive tables)
└── Desktop:         >= 1024px (persistent multi-column sidebar, full split-pane layouts)

Shell Geometry:
├── Topbar Height:    56px fixed across all viewports
├── Mobile Sidebar:   Fixed overlay, width min(280px, 85vw), z-index 100000
├── Desktop Sidebar:  260px expanded / 72px collapsed
└── Content Area:     flex: 1, min-width: 0, overflow-x: hidden (except for horizontal tables)
```

---
**Document Status:** Verified Complete — Proceed to Calendar, Chat & Contact Audit.

