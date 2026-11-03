# MASTERHRMS — UI/UX & DESIGN SYSTEM GAP REGISTER

**Document Target:** Centralized Catalog of All Identified UI/UX, Design Token, Responsive & Component Gaps  
**Date of Audit:** November 3, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering Team  
**Audit Scope:** Full Application Frontend Layer  
**Status:** COMPLETE GAP REGISTER

---

## 1. REGISTER SUMMARY & SEVERITY METRICS

| Total UI Gaps Cataloged | Critical (P0) | High (P1) | Medium (P2) | Low (P3) |
|---|---|---|---|---|
| **15 Gaps** | **3** | **5** | **5** | **2** |

---

## 2. CENTRALIZED UI/UX GAP CATALOG

---

### GAP-UI-001: Dialog Viewport Overflow on Mobile & Small Screens
- **Severity:** Critical (P0)
- **Category:** Overlay / Popups & Modals
- **Affected Files:**
  - Base Component: [`src/components/ui/dialog.tsx:34-45`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dialog.tsx#L34-L45)
  - 223 consumer route files across `src/routes/_authenticated/_app/**/*.tsx` (e.g., `employees/index.tsx`, `leaves/index.tsx`, `payroll/index.tsx`, `attendance/index.tsx`).
- **Source Evidence:**
  ```tsx
  // src/components/ui/dialog.tsx
  <DialogPrimitive.Content
    ref={ref}
    className={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ... sm:rounded-lg",
      className
    )}
    {...props}
  >
  ```
- **Problem Description:**
  Base `DialogContent` lacks `max-h-[85vh]` and `overflow-y-auto`. Multi-field forms inside dialogs expand beyond screen boundaries. Vertically centered positioning pins the middle of the modal to the viewport, causing the top header to clip off the top and the action buttons (Submit / Cancel) to clip off the bottom on viewports with height < 750px or when mobile virtual keyboards appear.
- **User Impact:**
  Mobile users cannot submit or cancel modal forms; the screen is blocked and users must reload the application.
- **Acceptance Criteria:**
  - Base `DialogContent` enforces `flex flex-col max-h-[90vh] w-[calc(100vw-2rem)] overflow-hidden`.
  - Body area wrapped in `overflow-y-auto`.
  - Action footer pinned to bottom with `sticky bottom-0 bg-background border-t`.

---

### GAP-UI-002: Double Padding Defect in 98 Page Roots
- **Severity:** Critical (P0)
- **Category:** Responsive Layout / Grid
- **Affected Files:**
  - Container: [`src/styles.css:122-132`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css#L122-L132)
  - 98 route pages in `src/routes/_authenticated/_app/` (e.g., `employees/index.tsx`, `leaves/index.tsx`, `payroll/index.tsx`).
- **Source Evidence:**
  ```css
  /* src/styles.css */
  .content { padding: 24px !important; }
  @media (max-width: 1023.98px) { .content { padding: 16px !important; } }
  ```
  ```tsx
  /* In 98 page files */
  export default function RouteComponent() {
    return <div className="p-6 space-y-6">...</div>
  }
  ```
- **Problem Description:**
  `.content` applies 16px/24px padding via `!important`. The inner page root also specifies `p-6` (24px) or `p-4` (16px), creating 40px–48px of double margin. On 320px screens, usable width is reduced to 240px.
- **User Impact:**
  Narrow screens experience extreme horizontal squishing, leading to broken data cards, clipped buttons, and awkward text wrapping.
- **Acceptance Criteria:**
  - Remove redundant `p-6`/`p-4` wrappers from all 98 route root elements.
  - Rely exclusively on `.content` container padding for layout margins.

---

### GAP-UI-003: Proliferation of Hardcoded Hex Color Values
- **Severity:** High (P1)
- **Category:** Design Tokens / Theming
- **Affected Files:**
  - 552 occurrences across `src/routes/` and `src/components/` (e.g., `src/routes/_authenticated/_app/meetings.tsx`, `src/routes/_authenticated/_app/leaves/leave-types.tsx`, `src/components/profile/print-template.tsx`).
- **Source Evidence:**
  Direct use of raw hex strings: `#6366f1`, `#3B82F6`, `#111827`, `#EF4444`, `#10B981` instead of Tailwind semantic color tokens (`bg-primary`, `text-destructive`, `border-border`).
- **Problem Description:**
  Components hardcode hex values inline or via custom style tags, bypassing the OKLCH design token engine defined in `src/styles.css`.
- **User Impact:**
  In Dark Mode, components with hardcoded hex colors produce illegible low-contrast text (e.g., dark text on dark surfaces) or jarring un-themed white boxes.
- **Acceptance Criteria:**
  - Replace all 552 hardcoded hex values with semantic Tailwind theme utilities (`bg-card`, `text-foreground`, `bg-primary`, `border-border`).

---

### GAP-UI-004: File Manager System Font Stack Inline Override
- **Severity:** High (P1)
- **Category:** Typography & Root Font System
- **Affected Files:**
  - [`src/components/apps/file-manager/file-manager.tsx:28`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/apps/file-manager/file-manager.tsx#L28)
  - 53 instances across file-manager subcomponents.
- **Source Evidence:**
  ```tsx
  const SYSTEM_FONT_STACK = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ...
  <div style={{ fontFamily: SYSTEM_FONT_STACK }}>
  ```
- **Problem Description:**
  File Manager defines its own font stack constant and injects it via inline styles, completely bypassing the root `"Public Sans"` brand typography.
- **User Impact:**
  Visual dissonance; the File Manager module renders with completely different typography compared to the rest of the application.
- **Acceptance Criteria:**
  - Delete `SYSTEM_FONT_STACK` and all inline `style={{ fontFamily }}` declarations.
  - Inherit root typography from `src/styles.css`.

---

### GAP-UI-005: Component Border Radius Mismatch
- **Severity:** Medium (P2)
- **Category:** Shared Form Components
- **Affected Files:**
  - Input: [`src/components/ui/input.tsx:18`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/input.tsx#L18) (`rounded-lg`)
  - Select: [`src/components/ui/select.tsx:43`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/select.tsx#L43) (`rounded-md`)
- **Source Evidence:**
  - `Input`: `className="... rounded-lg border border-input ..."` (8px radius)
  - `SelectTrigger`: `className="... rounded-md border border-input ..."` (6px radius)
- **Problem Description:**
  When Input and Select components appear side by side in form grids or filter bars, their corner radii differ by 2px.
- **User Impact:**
  Subtle visual sloppiness and asymmetric alignment across adjacent form controls.
- **Acceptance Criteria:**
  - Standardize both `Input` and `SelectTrigger` to use `rounded-md` (or `--radius-md` token).

---

### GAP-UI-006: `SelectTrigger` Font Size Disparity (iOS Safari Auto-Zoom)
- **Severity:** High (P1)
- **Category:** Shared Form Components / Mobile Usability
- **Affected Files:**
  - Select: [`src/components/ui/select.tsx:43`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/select.tsx#L43)
  - Input: [`src/components/ui/input.tsx:18`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/input.tsx#L18)
- **Source Evidence:**
  - `Input`: `text-base md:text-sm` (16px on mobile, 14px on desktop).
  - `SelectTrigger`: `text-sm` (fixed 14px across all viewports).
- **Problem Description:**
  iOS Safari forces an automatic page zoom whenever a form input with font size < 16px is focused. `Input` avoids this via `text-base md:text-sm`, but `SelectTrigger` remains at `text-sm`.
- **User Impact:**
  Tapping a select dropdown on an iPhone causes the browser viewport to zoom in awkwardly, displacing navigation and headers until manually pinched out.
- **Acceptance Criteria:**
  - Update `SelectTrigger` className to `text-base md:text-sm`.

---

### GAP-UI-007: Inadequate Touch Target Sizing (WCAG 2.1 2.5.5)
- **Severity:** Medium (P2)
- **Category:** Accessibility & Mobile Usability
- **Affected Files:**
  - [`src/components/ui/dropdown-menu.tsx:75`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dropdown-menu.tsx#L75)
  - [`src/components/ui/data-table.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/data-table.tsx)
- **Source Evidence:**
  - `DropdownMenuItem`: `py-1.5 px-2 text-sm` (~32px total item height).
  - Pagination Buttons: `h-8 w-8` (32px × 32px touch target).
- **Problem Description:**
  Interactive touch targets on mobile viewports fall below the mandatory 44px × 44px WCAG touch target specification.
- **User Impact:**
  High rate of accidental touches on adjacent table actions on touchscreen devices.
- **Acceptance Criteria:**
  - Increase mobile padding on `DropdownMenuItem` to `py-2.5 px-3 md:py-1.5 md:px-2`.
  - Enlarge pagination icon buttons to minimum `h-10 w-10` on mobile.

---

### GAP-UI-008: High-Density Data Tables Lacking Sticky Columns on Mobile
- **Severity:** High (P1)
- **Category:** Data Tables & Responsive Flow
- **Affected Files:**
  - [`src/components/ui/table.tsx:8`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/table.tsx#L8)
  - Employee, Attendance, and Payroll table components.
- **Source Evidence:**
  `table.tsx` provides simple `overflow-x-auto` wrapper without sticky pin utilities for header columns or primary key columns.
- **Problem Description:**
  On mobile devices (320px–430px), tables with 8–12 columns require wide horizontal scrolling. The employee name column and action buttons scroll completely out of view.
- **User Impact:**
  Users scrolling horizontally lose context of which row they are inspecting, leading to errors in approvals and payroll edits.
- **Acceptance Criteria:**
  - Implement sticky column support (`sticky left-0 bg-card z-10` for Identifier, `sticky right-0 bg-card z-10` for Actions).

---

### GAP-UI-009: ApexCharts Dark Mode Theme Desynchronization
- **Severity:** Medium (P2)
- **Category:** Visual Theming / Charts
- **Affected Files:**
  - `src/components/dashboard/*.tsx`
  - Analytics and attendance chart widgets.
- **Source Evidence:**
  ApexCharts configuration objects pass static color palettes (`colors: ['#7367F0', '#28C76F']`) and lack dynamic listeners for `theme.mode` updates when switching `.dark`.
- **Problem Description:**
  Switching the application between light and dark themes does not trigger ApexCharts re-render with updated axis label colors and background grids.
- **User Impact:**
  Chart labels become invisible dark-gray on dark backgrounds in dark mode.
- **Acceptance Criteria:**
  - Integrate theme observer hook with ApexCharts `chart.theme.mode` property.

---

### GAP-UI-010: Parallel Sidebar Codebases (`DreamsSidebar` vs `PortalSidebar`)
- **Severity:** High (P1)
- **Category:** Navigation Architecture
- **Affected Files:**
  - Active Shell: [`src/components/dreams-sidebar.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/dreams-sidebar.tsx) (2,508 lines)
  - Disconnected: [`src/components/navigation/portal-sidebar.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/navigation/portal-sidebar.tsx)
  - Shell Route: [`src/routes/_authenticated/_app/route.tsx:162`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/route.tsx#L162)
- **Problem Description:**
  The application shell imports and renders the monolithic 2,508-line `DreamsSidebar` containing legacy ERP links, while the modern typed `PortalSidebar` remains unused.
- **User Impact:**
  HR users see dead or irrelevant ERP links; maintainability is degraded.
- **Acceptance Criteria:**
  - Migrate application shell to `PortalSidebar` powered by `hr-sidebar.ts` and `employee-sidebar.ts`.
  - Deprecate and archive `DreamsSidebar`.

---

### GAP-UI-011: Breakpoint Threshold Conflict (768px vs 1024px)
- **Severity:** High (P1)
- **Category:** Responsive Architecture
- **Affected Files:**
  - [`src/hooks/use-mobile.tsx:5`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/hooks/use-mobile.tsx#L5) (`MOBILE_BREAKPOINT = 768`)
  - [`src/styles.css:101`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css#L101) (`@media (max-width: 1023.98px)`)
- **Problem Description:**
  JavaScript evaluates mobile at 768px (`md`), while CSS enforces mobile layout up to 1024px (`lg`). On screens between 768px and 1023px (portrait tablets), JS renders desktop UI while CSS hides desktop navigation.
- **User Impact:**
  Tablet users experience UI glitching where table controls and page headers assume desktop mode while the sidebar is hidden.
- **Acceptance Criteria:**
  - Harmonize breakpoint threshold to a single unified standard across CSS and JS.

---

### GAP-UI-012: Fragmented Z-Index Stacking Architecture
- **Severity:** Medium (P2)
- **Category:** Overlay / Popups & Modals
- **Affected Files:**
  - [`src/styles.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css)
  - [`src/components/ui/dialog.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dialog.tsx)
- **Problem Description:**
  Incoherent z-index assignments: dialogs use `z-50`, topbars use `z-900`, desktop sidebar uses `z-1000`, slide-nav overlay uses `z-99990`, mobile drawer uses `z-100000`.
- **User Impact:**
  Potential overlay collisions where drawers mask modals or tooltips clip behind dialog headers.
- **Acceptance Criteria:**
  - Establish a strict 6-tier z-index design token scale in `src/styles.css`.

---

### GAP-UI-013: Inconsistent Button Loading States Across Forms
- **Severity:** Medium (P2)
- **Category:** Shared Form Components
- **Affected Files:**
  - Various form submission buttons across `src/routes/`.
- **Source Evidence:**
  Some buttons show `Loader2` spinner and disable (`disabled={isSubmitting}`), while others retain standard clickable state during async API mutations.
- **Problem Description:**
  Lack of consistent loading indicators on submit buttons.
- **User Impact:**
  Users submit forms multiple times on slow mobile network connections, triggering duplicate records or race conditions.
- **Acceptance Criteria:**
  - Standardize all form action buttons to show loading spinner and enter disabled state during mutations.

---

### GAP-UI-014: Inconsistent Empty State Illustrations & Copy
- **Severity:** Low (P3)
- **Category:** Layout & Visual Polish
- **Affected Files:**
  - Leave list, Asset inventory, Performance reviews, Document vault.
- **Problem Description:**
  Empty states vary wildly: some show Lucide icons with explanatory copy and action buttons; others display plain text "No records found" or an empty table body.
- **User Impact:**
  Inconsistent user guidance when onboarding new modules.
- **Acceptance Criteria:**
  - Implement and enforce a shared `<EmptyState />` component across all modules.

---

### GAP-UI-015: Textarea Missing Character Counters & Resize Constraints
- **Severity:** Low (P3)
- **Category:** Shared Form Components
- **Affected Files:**
  - [`src/components/ui/textarea.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/textarea.tsx)
  - Form routes (Leave Reason, Exit Feedback, Performance Review Notes).
- **Source Evidence:**
  `Textarea` component allows free resizing and does not enforce character counters.
- **Problem Description:**
  Users can drag textarea handles to break modal layout bounds, and lack feedback on backend column length constraints (e.g., `VARCHAR(500)`).
- **User Impact:**
  Accidental modal layout distortion and API truncation errors upon submission.
- **Acceptance Criteria:**
  - Apply `resize-y min-h-[80px]` and optional character counter badge to form textareas.

