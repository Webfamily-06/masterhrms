# UIABLE WAVE 3 — NAVIGATION & SHELL LAYOUTS READ-ONLY AUDIT REPORT
**Document Version:** 1.0.0  
**Phase:** Wave 3 — Stage A (Read-Only Pre-Migration Audit)  
**Status:** COMPLETE — HARD STOP GATE ACTIVE  
**Date:** October 6, 2026  
**Repository:** MASTERHRMS Multi-Tenant ERP & SaaS Platform  
**Target Components:**
1. `DreamsSidebar` (`src/components/dreams-sidebar.tsx`) — `BUSINESS_LOGIC_PROTECTED` / `CRITICAL`
2. `DashboardHeader` (`src/components/dashboard-header.tsx`) — `BUSINESS_LOGIC_PROTECTED` / `HIGH`
3. `SettingsNestedNav` (`src/components/settings/settings-nested-nav.tsx`) — `BUSINESS_LOGIC_PROTECTED` / `HIGH`
4. Shell Hosts:
   - `AppShell` (`src/routes/_authenticated/_app/route.tsx`) — Workspace / ERP Shell
   - `SuperShell` (`src/routes/_authenticated/super/route.tsx`) — Super Admin Control Plane Shell

---

## 1. EXECUTIVE SUMMARY & BASELINE CONTEXT

Wave 1 (Foundation UI System: Button, Badge, Card, Input, Table, Dialog, Tabs, Empty, EmptyState) and Wave 2 (Data Tables & Complex Displays: DataTable pagination, sorting, filters, bulk actions) are **LOCKED and VERIFIED**.

Wave 3 addresses the core application navigation, shell layouts, and nested configuration navigators. Because navigation and shell structures govern the user experience across all 10 application portals, 212 routes, and multiple user personas (Super Admin, Tenant Admin, Manager, HR Admin, Employee, Client), this audit was executed strictly under **Stage A Read-Only governance**.

### Primary Findings
1. **Shell Separation & Tenant Isolation:**
   - The application maintains two separate root layout shells:
     - `src/routes/_authenticated/_app/route.tsx` (`AppShell`): Governs all tenant workspace routes, ERP modules, POS, CRM, projects, and self-service portals. Consumes `DreamsSidebar` and renders the in-shell topbar header.
     - `src/routes/_authenticated/super/route.tsx` (`SuperShell`): Governs all root platform management routes (`/super/*`). Implements an internal `SuperSidebar` and dedicated platform header. It strictly rejects tenant hosts via `isTenantWorkspaceHost()` domain guards.
2. **DreamsSidebar Complexity:**
   - `DreamsSidebar` spans 1,827 lines of business logic. It handles **4 distinct user personas**: Super Admin (standalone), Client-Only, Employee-Only, and Tenant ERP User.
   - For Tenant ERP users, it enforces dynamic module permissions via `isModuleAllowed(moduleKey, profile)` across 9 core business domains (HRM, POS, Inventory, CRM, Finance, Projects, Support, Procurement, Analytics).
   - Desktop rail collapse (72px vs 250px), hover expansion (`expand-menu` body class), mobile drawer sliding (`opened` class with backdrop overlay), and active sub-route tree expansion are tightly integrated.
3. **DashboardHeader In-Page Composite:**
   - `src/components/dashboard-header.tsx` is an in-page dashboard header component featuring dynamic title/badge displays, breadcrumbs hierarchy, interactive calendar date-range popover (with quick presets: Today, Last 7/30/90 Days, This Month), data refresh triggers, and CSV/PDF export generators.
4. **SettingsNestedNav Accordion Architecture:**
   - `src/components/settings/settings-nested-nav.tsx` is consumed in exactly two primary configuration hubs: `src/routes/_authenticated/_app/settings.tsx` and `src/routes/_authenticated/super/settings.tsx`.
   - It features collapsible category groups (`Collapsible`), active tab identification, live search input filtering, active count badges, and an adaptive mobile drawer sheet (`< lg` breakpoints).
5. **UIAble Pattern Compatibility & Verdict:**
   - UIAble blocks (`block-dashboard-layout`, `block-navbar-1..3`, `sidebar-1..5`) introduce external dependencies (`@base-ui/react`, `next-themes`, generic static JSON navigation schemas) that are fundamentally incompatible with TanStack Router, the custom multi-tenant session context, and role-based module entitlements.
   - **Mandatory Decision:** Wholesale replacement is **STRICTLY FORBIDDEN**. Migration must follow an **Adapter / Token Enhancement Pattern**: preserve 100% of the existing JSX structure, event handlers, route links, permission checks, and state controllers while applying UIAble design tokens (borders, active pills, typography scales, hover transitions, elevation).

---

## 2. SHELL ARCHITECTURE MAP

The application runtime architecture consists of three main operational tiers:

```text
========================================================================================
APPLICATION ROOT (src/routes/__root.tsx)
  │
  ├── PUBLIC & AUTHENTICATION
  │   ├── /login, /register, /forgot-password, /two-factor
  │   ├── /super-login (Super Admin Entry)
  │   ├── /onboarding (Tenant Setup)
  │   ├── /pricing, /contact-us, /terms-conditions (Marketing)
  │   └── /portal/invoices/:id (Public B2B Invoice Gateway)
  │
  ├── AUTHENTICATED WRAPPER (src/routes/_authenticated/route.tsx)
  │   │ [Session Guard: useSession(), Profile Guard: useCurrentProfile()]
  │   │
  │   ├── 1. PLATFORM CONTROL PLANE
  │   │   └── src/routes/_authenticated/super/route.tsx (SuperShell)
  │   │       ├── Domain Guard: isTenantWorkspaceHost() -> 404
  │   │       ├── Platform Header (Quick Links, Command Palette ⌘K, ThemeToggle, Admin Profile)
  │   │       ├── SuperSidebar (Dedicated Platform Menu: 5 Groups, 23 Platform Routes)
  │   │       │   ├── Core Orchestration (/super, /tenants, /plans, /coupons, /transactions, /roles)
  │   │       │   ├── Extensions & Add-ons (/marketplace, /domains)
  │   │       │   ├── Marketing & CMS (/cms, /blogs, /case-studies, /media)
  │   │       │   ├── Communications (/tenant-support-tickets, /agents, /sla-policies, /notifications)
  │   │       │   └── System Controls (/cronjob, /clear-cache, /settings, /analytics, /backup)
  │   │       └── Outlet (Hosts 25+ /super/* sub-routes)
  │   │
  │   └── 2. TENANT WORKSPACE & ERP SUITE
  │       └── src/routes/_authenticated/_app/route.tsx (AppShell)
  │           ├── Impersonation Banner (Super Admin acting as tenant admin)
  │           ├── DreamsSidebar (src/components/dreams-sidebar.tsx)
  │           │   ├── Persona A: Super Admin Fallback Mode
  │           │   ├── Persona B: Client Portal Mode (/client-dashboard, /invoices, /projects, /helpdesk)
  │           │   ├── Persona C: Employee Portal Mode (/employee-dashboard, /attendance, /leave, /shifts, /payroll)
  │           │   └── Persona D: Tenant ERP & HRM Full Suite (9 Categories, 80+ Routes, Entitlement-gated)
  │           ├── AppShell Topbar Header (<header className="navbar-header">)
  │           │   ├── Mobile Hamburger (#mobile_btn)
  │           │   ├── Mobile Dynamic Brand Logo
  │           │   ├── Desktop Sidebar Rail Collapse Toggle (#toggle_btn2)
  │           │   ├── Active Workspace Dropdown Selector (Tenant Info & Logo)
  │           │   ├── POS Terminal Quick Access (/pos)
  │           │   ├── Dual Customer Display Launch Button (/customer-display)
  │           │   ├── Global Command Palette Trigger (⌘K)
  │           │   ├── Realtime Notification Drawer (<RealtimeNotificationDrawer />)
  │           │   ├── Team Chat Quick Link (/chat)
  │           │   ├── Full View Canvas Toggle (⌘B)
  │           │   ├── Native Fullscreen Toggle
  │           │   ├── Light/Dark Mode Switcher (<ThemeToggle />)
  │           │   └── User Profile Dropdown (Avatar, Role, Tenant, 2FA Status, Settings, Logout)
  │           ├── Main Content (<main className="content"><Outlet /></main>)
  │           │   └── DashboardHeader (src/components/dashboard-header.tsx) - In-page Subheader
  │           ├── Branded Workspace Footer
  │           └── Floating Global Overlays:
  │               ├── CommandDialog (Global Search across 6 module clusters)
  │               ├── SubscriptionWarningPopup & SubscriptionFooterBar
  │               └── AICopilotWidget (<AICopilotWidget />)
========================================================================================
```

---

## 3. CONSUMER INVENTORY & DEPENDENCY MATRIX

### A. DreamsSidebar (`src/components/dreams-sidebar.tsx`)
| Consumer File | Route / Portal | Role / Context | Notes |
|---|---|---|---|
| `src/routes/_authenticated/_app/route.tsx` | All Tenant Workspace & ERP Routes (120+ pages) | AppShell Navigation Rail | Passes `profile`, `collapsed`, `mobileOpen`, `fullView`, and state togglers. |

### B. DashboardHeader (`src/components/dashboard-header.tsx`)
| File Path | Role / Context | Status | Notes |
|---|---|---|---|
| `src/components/dashboard-header.tsx` | Reusable in-page subheader | Available Component | Provides Page Title, Badges, Breadcrumbs, Calendar Date Range Picker (presets: Today, 7d, 30d, This Month, 90d), Data Refresh callback, and CSV/PDF export. |
| Dashboard Pages (`/hrm-dashboard`, `/pos-dashboard`, etc.) | Direct consumers | Target for standard adoption | Currently some dashboard pages implement bespoke header blocks; standardizing with `DashboardHeader` provides uniform UX. |

### C. SettingsNestedNav (`src/components/settings/settings-nested-nav.tsx`)
| Consumer File | Route / Portal | Tab State Persistence | Notes |
|---|---|---|---|
| `src/routes/_authenticated/_app/settings.tsx` | Tenant ERP Workspace Settings | URL Search Params (`?tab=...`) | Renders 11 setting categories, 35+ tabs (Profile, Branding, GST, Media, SMTP, Notifications, Roles, Billing). |
| `src/routes/_authenticated/super/settings.tsx` | Super Admin Platform Settings | URL Search Params (`?tab=...`) | Renders 8 platform categories (General, Storage, Email, AI Engine, Authentication, Payment Gateways, Security). |

### D. Ancillary / Dead Navigation Components
| Component Path | Import Status | Usage Count | Classification | Recommendation |
|---|---|---|---|---|
| `src/components/app-sidebar.tsx` | Unimported | 0 | Dead / Legacy | **DO NOT DELETE** (Wave 3 Rule 23). Mark as deprecated in registry. |
| `src/components/ui/sidebar.tsx` | Imported only in `app-sidebar.tsx` | 0 active | Dead / Legacy | **DO NOT DELETE**. Mark as deprecated in registry. |

---

## 4. COMPONENT DEEP DIVE: DREAMSSIDEBAR

### File: `src/components/dreams-sidebar.tsx` (1,827 Lines)
- **Classification:** `BUSINESS_LOGIC_PROTECTED` / `CRITICAL`
- **Imports:**
  - `Link, useRouterState` from `@tanstack/react-router`
  - `ProfileWithRoles` from `@/lib/session`
  - `isModuleAllowed, isWorkspaceAdminUser` from `@/lib/permissions`
  - `useTenantBranding` from `@/lib/useTenantBranding`
  - `cn` from `@/lib/utils`

### Persona Resolution Logic
```typescript
const userRoles = profile?.roles || [];
const isSuperAdmin = userRoles.includes("super_admin");
const isAdminOrSuper = userRoles.some((r) =>
  ["admin", "super_admin", "tenant_admin", "hr_admin", "manager"].includes(r)
);
const isClientOnly = userRoles.includes("client") && !isAdminOrSuper;
const isEmployeeOnly = userRoles.includes("employee") && !isAdminOrSuper;
const homeRoute = isSuperAdmin ? "/super" : isClientOnly ? "/client-dashboard" : isEmployeeOnly ? "/employee-dashboard" : "/hrm-dashboard";
```

### Navigation Trees by Persona

#### 1. Platform Super Admin (when accessing standalone workspace)
- Platform Control Plane (`/super`)
- Centralized Automations (`/cronjob`)
- Clear Cache & Maintenance (`/clear-cache`)
- AI Engine Configuration (`/ai-configuration`)
- AI API Credentials (`/ai-settings`)
- System States Directory (`/system-states`)

#### 2. Client-Only Persona
- Client Dashboard (`/client-dashboard`)
- Deliverables & Billing: Invoices & Receipts (`/invoices`), Contracted Projects (`/projects`), Global Task Board (`/task-board`)
- Communications: Support Tickets (`/helpdesk`), Direct Messages (`/chat`)

#### 3. Employee-Only Persona
- Employee Dashboard (`/employee-dashboard`)
- Time & Attendance: Attendance & Punch (`/attendance`), Monthly Matrix (`/attendance-employee`), Leave Requests (`/leave`), Shifts (`/shifts`), Shift Swap (`/shift-swap-requests`), Overtime (`/overtime`), Work From Home (`/work-from-home`), Tasks Board (`/tasks`)
- Payroll & Claims: Payslips (`/payroll`), Expense Claims (`/expenses`)
- Work & Collaboration: Todo List (`/todo`), Training & Learning (`/training`), Company Forms (`/forms`), Documents (`/documents`), Announcements (`/announcements`), Helpdesk (`/helpdesk`), Chat (`/chat`)

#### 4. Tenant ERP Admin / Manager (Full Suite)
- **Main / Dashboards:** HRM Admin (`/hrm-dashboard`), Deals (`/deals-dashboard`), Leads (`/leads-dashboard`), Payroll (`/payroll-dashboard`), Recruitment (`/recruitment-dashboard`), Help Desk (`/help-desk-dashboard`), Assets (`/asset-dashboard`), IT Admin (`/it-admin-dashboard`), Learning Analytics (`/learning-analytics`), POS Dashboard (`/pos-dashboard`), Inventory (`/inventory-dashboard`), CRM (`/crm-dashboard`), Finance (`/finance-dashboard`), Projects (`/project-dashboard`), Procurement (`/procurement-dashboard`), Analytics (`/analytics`).
- **AI Center:** AI Attendance Insights, AI Payroll Forecast, AI Hiring Forecast, AI Team Performance, AI Settings, AI Copilot Hub.
- **Applications:** AI Intelligence Center, Team Chat, Call History, Calendar, Personal Notes, Todo Action List, Tasks, Kanban Board, Dual Customer Display (external), AI Document OCR, AI Copywriter.
- **POS & Inventory:** POS Terminal, Products & Stock, Stock Transfers, Stock Adjustments, Online Storefront Catalog.
- **Procurement:** Purchase Orders, Supplier Master Directory.
- **Sales & Billing:** Contacts CRM, CRM Companies, Sales Pipelines, Clients Directory, CRM Customers, Marketing Campaigns, Invoices, Recurring Invoices, B2B Client Invoice Portal, Proposals & Quotes, Ledgers & Accounting, Budgets, Tax Rates & GST, Currencies & FX, Expense Claims.
- **HRM Suite:** HRM Hub, Employee Directory.
- **Time & Attendance:** Attendance Punching, Leave & PTO, Shift Rostering, Shift Swaps, Overtime, Work From Home, Attendance Matrix, Daily Attendance Report, Biometric Hardware, Device Sync Agent.
- **Payroll:** Payroll Runs (`/payroll`).
- **Talent & Hiring:** Recruitment ATS, Campus Hiring, Employee Referrals, Training LMS, Certification Tracking.
- **Employee Services:** Helpdesk, Document Vault, Company News, Form Builder, Automations, OKR & Goals, Asset Management, Exit & Offboarding, Notice Period Tracker, Resignations, Terminations, Awards & Honors, Disciplinary Warnings, Promotions & Transfers, Probation Management, Provident Fund.
- **Extensions & Add-ons:** App Marketplace, WooCommerce Sync, Shopify Sync, Google Workspace, Tally Prime Sync, WhatsApp Alerts, Razorpay Gateway.
- **Settings & System:** Settings, Custom Domain, Custom Fields, Users & Roles, Plan & Subscription, Ban IP Address, System Cache, Cronjob Management, Documentation Portal, Developer API Console, Super Admin Console (conditional).

### State & Interaction Invariants
1. **Desktop Rail Collapse:**
   - Default width: 250px (`aside.sidebar`).
   - Collapsed mini rail: 72px (`isMini = collapsed && !isHovered`).
   - Hover expansion: When collapsed, hovering over the sidebar adds `.expand-menu` to `document.body` and sets `isHovered = true`. Mouse leave removes it.
   - Pinned toggle: Clicking `#toggle_btn` toggles `collapsed` and sets `ignoreHover = true` to prevent flicker.
2. **Mobile Drawer:**
   - Triggered by `#mobile_btn` in the header.
   - Adds `.opened` class to `aside.sidebar`.
   - Backdrop overlay on mobile: Clicking anywhere outside closes the drawer via `onCloseMobile()`.
   - Any link click on mobile automatically executes `onCloseMobile()`.
3. **Submenu Accordions:**
   - Managed via `openMenus` dictionary state (`dashboards`, `aiCenter`, `hrm`, `apps`, `inventory`, `sales`, `talent`, `operations`, `extensions`).
   - Auto-expands based on route prefix matching.
4. **Tenant Branding Integration:**
   - Consumes `useTenantBranding()`.
   - Renders `branding.activeLogo` (with dark/light variants and automatic fallback to `/logo.webp` / `/white-logo.webp`).
   - Mini rail displays `branding.faviconUrl` or `/favicon.webp`.

---

## 5. COMPONENT DEEP DIVE: DASHBOARDHEADER

### File: `src/components/dashboard-header.tsx` (250 Lines)
- **Classification:** `BUSINESS_LOGIC_PROTECTED` / `HIGH`
- **Imports:**
  - `Link` from `@tanstack/react-router`
  - Icons from `lucide-react`: `Calendar, ChevronDown, Download, FileSpreadsheet, FileText, RefreshCw, Home`
  - Popover primitives from `@/components/ui/popover`
  - DropdownMenu primitives from `@/components/ui/dropdown-menu`
  - Calendar component from `@/components/ui/calendar`
  - Date utilities from `date-fns`: `format, subDays, startOfMonth, endOfMonth`
  - Toast alerts from `sonner`

### Core Capabilities
1. **Heading & Status Badge:**
   - Displays page title (`<h1>`) with optional status pill badge (`bg-primary/10 text-primary`).
2. **Breadcrumb Hierarchy:**
   - Automatically prefixes `Home (/)` icon link.
   - Renders structured breadcrumbs array (`{ label, href }`) with active termination on current page.
3. **Date Range Filter & Quick Presets:**
   - Default range: Start of current month to current date.
   - Presets sidebar within popover:
     - `Today` (0 days)
     - `Last 7 Days` (7 days)
     - `Last 30 Days` (30 days)
     - `This Month` (startOfMonth to endOfMonth)
     - `Last 90 Days` (90 days)
   - Interactive calendar selection with auto-close upon range selection.
   - Triggers `onDateChange({ from, to })` callback and Sonner feedback toast.
4. **Data Refresh Action:**
   - Triggers `onRefresh()` callback with spinning animation state (`animate-spin`) and completion toast.
5. **Report Export Suite:**
   - **CSV / Excel:** Exports structured `exportData` rows or metric summary with timestamped filename (`${exportFilename}_YYYY-MM-DD.csv`).
   - **PDF:** Triggers browser print workflow (`window.print()`).

---

## 6. COMPONENT DEEP DIVE: SETTINGSNESTEDNAV

### File: `src/components/settings/settings-nested-nav.tsx` (501 Lines)
- **Classification:** `BUSINESS_LOGIC_PROTECTED` / `HIGH`
- **Imports:**
  - Radix Primitives: `Collapsible, CollapsibleContent, CollapsibleTrigger`
  - Sheet Primitives: `Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger`
  - UI Components: `Input, Badge, Button`
  - Icons: `Search, X, ChevronDown, ChevronRight, Menu` from `lucide-react`

### Core Capabilities
1. **Dual Responsive Form Factor:**
   - **Desktop (`>= lg`):** Sticky vertical sidebar (`w-72 xl:w-80`) with sticky positioning, header badge count, search input, scrollable nested category accordions, and active section footer.
   - **Mobile (`< lg`):** Compact sticky header showing active category/item icon, title, and badge, with a "Sub Menus" button launching a left-sliding `Sheet` drawer containing the complete searchable navigation list.
2. **Category & Submenu Architecture:**
   - Renders groups of `SettingsNavCategory` containing arrays of `SettingsNavItem`.
   - Supports category icons, item icons, descriptions, item count badges, and status pills.
3. **Realtime Search & Filter:**
   - Live query input filtering across category labels, item labels, item descriptions, and badge text.
   - Auto-expands matching categories when search query is active.
   - Clear button with reset action.
4. **Active Tab State Management:**
   - Controlled via `activeTab` and `onSelectTab(tabId)`.
   - Auto-expands the category containing the active tab on mount and tab changes.
   - Highlights active item with primary fill, high-contrast text, and chevron indicator.
5. **Section Breadcrumb Export:**
   - Exports companion component `SettingsSectionBreadcrumb` for standardized page headers above the active settings panel.

---

## 7. VISUAL LAYER VS BEHAVIORAL LAYER SEPARATION

To guarantee zero regression of business logic, permissions, and tenant isolation, the shell components are strictly bifurcated into two independent layers:

| Component | Behavioral Layer (STRICTLY LOCKED) | Visual Layer (MIGRATION TARGET) |
|---|---|---|
| **DreamsSidebar** | - Role inspection (`isSuperAdmin`, `isClientOnly`, `isEmployeeOnly`, `isAdminOrSuper`)<br>- Granular module checks (`isModuleAllowed`)<br>- Routing links (`to="/..."`) and TanStack active state<br>- Persona branches & access guards<br>- Tenant branding resolution (`useTenantBranding`)<br>- Mobile open/close state machine<br>- Desktop rail collapse state machine | - Border colors & divider opacity (`border-border-color`)<br>- Item padding, typography sizes, line heights<br>- Active item pill styling (background, text color, radius)<br>- Hover elevation, transitions, and cursor feedback<br>- Submenu indentation and chevron rotation<br>- Scrollbar styling (`data-simplebar` / `custom-scrollbar`) |
| **DashboardHeader** | - Date calculations (`date-fns` subDays, startOfMonth, endOfMonth)<br>- Preset range selection logic<br>- CSV generation and browser download trigger<br>- Print PDF dispatch (`window.print()`)<br>- Callback invocations (`onRefresh`, `onDateChange`)<br>- Route links (`Link to="..."`) | - Container card background, border, and elevation<br>- Popover container border, shadow, and layout<br>- Quick-range buttons styling and hover highlights<br>- Button variants and sizing (Button from Wave 1)<br>- Badge variant (Badge from Wave 1)<br>- Breadcrumbs typography and divider styling |
| **SettingsNestedNav** | - Tab selection callback (`onSelectTab`)<br>- Search filtering and memoization logic<br>- Category expansion state (`openCategories`)<br>- Mobile sheet open/close state<br>- URL query parameter synchronization (`?tab=...`) | - Card background, border, rounded radius (`rounded-2xl`)<br>- Search input styling (Input from Wave 1)<br>- Accordion trigger hover feedback and category typography<br>- Active item pill styling (primary background, shadow)<br>- Mobile trigger bar styling and Sheet content spacing<br>- Badge indicators (Badge from Wave 1) |
| **AppShell Topbar** | - Active tenant dropdown resolution<br>- User profile data and initials calculation<br>- 2FA security status detection<br>- Realtime notification drawer mount<br>- Fullscreen API invocations<br>- Impersonation exit API call<br>- Logout execution (`handleSignOut`) | - Topbar background blur, border, and elevation<br>- Workspace dropdown trigger card styling<br>- Quick action button styles (POS, Chat, ⌘K search bar)<br>- User avatar ring, status badges, and dropdown menu styling |

---

## 8. UIABLE COMPONENT & BLOCK COMPATIBILITY MATRIX

Evaluation of UIAble MCP catalog items against existing application requirements:

| Existing Feature | Current Implementation | UIAble Equivalent | Compatible? | Decision & Rationale |
|---|---|---|---|---|
| **Multi-Persona ERP Sidebar** | `DreamsSidebar` (1,827 lines, 4 personas, 9 modules) | `sidebar`, `sidebar-1..5` | **NO (Wholesale)**<br>**YES (Visual Tokens)** | **Reject wholesale replacement.** UIAble sidebars are static single-tenant blocks using Base UI and Next.js tokens. Adopt UIAble CSS classes, item spacing, and active pill styling within `DreamsSidebar`. |
| **Header Navbar** | AppShell Topbar (workspace selector, 2FA status, impersonation, fullscreen) | `block-navbar-1..3` | **NO (Wholesale)**<br>**YES (Visual Tokens)** | **Reject wholesale replacement.** UIAble navbar blocks lack multi-tenant workspace switching, 2FA badges, and POS triggers. Apply UIAble elevation, search input tokens, and profile dropdown styling to existing header. |
| **Date Filtering Subheader** | `DashboardHeader` (date-range presets, CSV/PDF export, breadcrumbs) | N/A (Composite) | **N/A** | **Retain existing component.** Upgrade inner buttons, badges, and popover borders to use Wave 1 foundation tokens. |
| **Nested Settings Accordion** | `SettingsNestedNav` (Collapsible, Sheet, Search filter) | N/A (Composite) | **N/A** | **Retain existing component.** Already aligns with modern Radix/shadcn design. Standardize token colors, active pill states, and input borders. |
| **Mobile Drawer Navigation** | Native CSS `.opened` drawer with body backdrop | `@uiable/sheet` / `@uiable/mobile-nav` | **Partial** | Keep current performant layout drawer mechanism; align mobile close buttons and typography with UIAble guidelines. |
| **Global Command Palette** | `CommandDialog` (⌘K across 6 module clusters) | `@uiable/component-search` | **Compatible** | Retain existing `cmdk` integration; polish styling using UIAble modal elevation tokens. |

---

## 9. RISK CLASSIFICATION & PROTECTION INVARIANTS

### Invariant 1: Multi-Tenant Isolation
- **Rule:** The shell must NEVER leak cross-tenant data, links, or controls.
- **Verification:** In `AppShell`, `profile.tenant?.name`, `branding`, and tenant-specific modules (`isModuleAllowed`) are scoped strictly to the authenticated tenant.
- **Risk:** High. Any refactor modifying context access could break multi-tenant isolation.

### Invariant 2: Super Admin Separation (`/super`)
- **Rule:** The Super Admin root console must remain completely separate from tenant workspace layouts.
- **Verification:** `SuperShell` enforces `isTenantWorkspaceHost()` domain blocking. `SuperSidebar` strictly handles platform orchestration. `DreamsSidebar` only renders platform links when `isSuperAdmin && !profile?.tenant_id`.
- **Risk:** Critical. Blending or unifying these two shells would create platform-level security vulnerabilities.

### Invariant 3: Zero Route / RBAC Changes
- **Rule:** No TanStack Router configuration, path definitions, or permission helpers (`isModuleAllowed`, `isWorkspaceAdminUser`) may be modified.
- **Verification:** Navigation items in `DreamsSidebar` and `SuperSidebar` map 1:1 with existing routes.
- **Risk:** Critical. Modifying routes breaks deep linking, bookmarks, and role guards.

### Invariant 4: Mobile Responsiveness Across Breakpoints
- **Breakpoints Tested:**
  - Desktop: 1440px, 1280px, 1024px
  - Tablet: 768px
  - Mobile: 375px
- **Verification:**
  - Desktop: Collapsible sidebar rail (250px -> 72px) with hover overlay.
  - Mobile: Hamburger toggle opens sliding off-canvas drawer with full touch scrolling and backdrop click-to-close. Content area must never produce horizontal overflow.

---

## 10. RECOMMENDED STAGE B MIGRATION STRATEGY

Because wholesale replacement is categorically rejected by this audit, **Stage B Implementation** must follow a 4-step surgical enhancement process:

```text
Step 1: Visual Token Alignment in DreamsSidebar
  ├── Refine item padding, borders, and typography hierarchy
  ├── Enhance active item pill with high-contrast subtle primary badge
  ├── Polish submenu toggle chevrons and hover transition curves
  └── Preserve 100% of RBAC, module guards, persona branches, and collapse handlers

Step 2: AppShell Topbar Visual Modernization
  ├── Upgrade workspace selector trigger to modern subtle border card
  ├── Enhance search input bar (⌘K) with UIAble token styling
  ├── Standardize user profile dropdown with Wave 1 Avatar, Badge, and Separator
  └── Polish mobile hamburger and mini-rail toggle buttons

Step 3: DashboardHeader Foundation Token Integration
  ├── Connect Wave 1 Button variants for Refresh and Export actions
  ├── Connect Wave 1 Badge for header status badges
  ├── Modernize date-range popover preset panel
  └── Verify breadcrumb link typography and spacing

Step 4: SettingsNestedNav Polish
  ├── Standardize search filter with Wave 1 Input
  ├── Refine category accordion headers and counter badges
  └── Polish mobile sheet drawer layout and backdrop blur
```

---

## 11. HARD STOP GATE & AUTHORIZATION STATUS

- **Stage A Read-Only Audit:** COMPLETED.
- **Source Code Alterations:** ZERO.
- **Package Modifications:** ZERO.
- **Route Modifications:** ZERO.
- **Current State:** HARD STOP ACTIVE. Awaiting explicit user review and authorization before Stage B implementation begins.
