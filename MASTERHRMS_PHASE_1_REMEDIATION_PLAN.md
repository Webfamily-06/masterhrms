# MASTERHRMS — PHASE 1: RESPONSIVE REMEDIATION PLAN

**Project:** MasterHRMS Multi-Tenant SaaS  
**Phase:** 1 — Full Responsive Architecture Audit & Baseline (Read-Only)  
**Date:** October 31, 2026  
**Status:** AUDIT COMPLETE — REMEDIATION PLAN READY FOR APPROVAL

---

## 1. Executive Implementation Strategy

Phase 1 established that MasterHRMS possesses a rich, functional enterprise application layer, but suffers from **systemic responsive regressions** caused by:
1. Missing Next.js App Router viewport metadata.
2. Breakpoint collisions between legacy Bootstrap `992px` CSS media queries and Tailwind v4 `1024px` (`lg`) classes.
3. Desktop-biased split-pane layouts in Calendar, Chat, File Manager, and Gantt.
4. Data tables lacking mobile card fallbacks.
5. Modal dialogs that clip and obscure action buttons on small screens.

**Phase 2 must execute an ordered, dependency-aware remediation** following the sequence below. **Zero source code modifications were performed in Phase 1.**

---

## 2. Proposed Component Sizing & Responsive Contract

Before altering any code in Phase 2, all shared components must adopt this standardized sizing and responsive contract:

### A. Breakpoint Standardization
```css
/* All CSS media queries must strictly align with Tailwind v4 */
Mobile Phones:      < 640px         (Tailwind base: single-column, bottom sheets)
Mobile Large / Phablet: 640px - 767px (Tailwind sm: 2-column stats, compact cards)
Tablet Portrait:    768px - 1023px  (Tailwind md: 2-panel split, collapsible drawer)
Desktop / Landscape: >= 1024px      (Tailwind lg: persistent sidebar, 3-panel split)
Wide Desktop:       >= 1280px       (Tailwind xl: expanded data tables)
```

### B. Interactive Touch Target Contract
- Minimum touch target for any interactive button or anchor on mobile (< 768px): **`44px x 44px`** (or visual icon `size-8` with `p-2` tap target padding `min-h-[44px] min-w-[44px]`).
- Minimum font size for inputs on iOS/Safari: **`16px`** (`text-base sm:text-sm`) to prevent automatic browser zoom on focus.

### C. Standardized Component Sizing Specifications
| Component Primitive | Mobile (< 768px) Standard | Desktop (>= 768px) Standard | Proposed Variant Classes |
|---|---|---|---|
| **Buttons** | Height 40px (`h-10 px-4`), touch target 44px | Height 36px (`h-9 px-3.5`) or 32px (`h-8 px-3`) | `h-10 sm:h-9 text-sm` |
| **Inputs & Selects** | Height 42px (`h-10.5 px-3 text-base`) | Height 36px (`h-9 px-3 text-sm`) | `h-10.5 sm:h-9 text-base sm:text-sm` |
| **Stat Cards** | 1 column (`grid-cols-1`) on < 480px | 2 columns (`sm:grid-cols-2 lg:grid-cols-4`) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| **Data Tables** | Card-list fallback with quick-action tap targets | Standard table with sortable column headers | `hidden md:table` / `md:hidden` card list |
| **Modals / Dialogs** | Bottom Sheet / Drawer (`vaul`) with sticky footer | Centered Dialog (`@radix-ui/react-dialog`) | Hybrid `DrawerDialog` component |

---

## 3. Dependency-Aware Phase 2 Implementation Sequence

```
                                  REMEDIATION SEQUENCE
                                  
     WAVE 1: Foundational Layouts & Breakpoints (Zero Business Logic Risk)
     ├── Step 1.1: Add Viewport Export to CMS/src/app/layout.tsx
     ├── Step 1.2: Unify master-hrms.css media queries to 1024px (eliminate 992px collision)
     └── Step 1.3: Align DreamsSidebar and SuperShell responsive drawer contracts
                                           │
                                           ▼
     WAVE 2: Calendar & Interactive App Sizing
     ├── Step 2.1: Wrap UnifiedCalendarApp sidebar in responsive Sheet (< 1024px)
     ├── Step 2.2: Add Mobile Filter trigger and 2-tier stacked toolbar
     └── Step 2.3: Add mobile-friendly Agenda / List View default on phones
                                           │
                                           ▼
     WAVE 3: Chat & Communications Single-Panel Flow
     ├── Step 3.1: Default showInfo to false on mobile & tablet
     ├── Step 3.2: Enforce strict single-panel flow (List -> Chat -> Info Drawer)
     ├── Step 3.3: Provide visible Back button on conversation header
     └── Step 3.4: Fix inescapable Calls mode navigation on mobile
                                           │
                                           ▼
     WAVE 4: Tables, Gantt & Data Dense Views
     ├── Step 4.1: Call History responsive card-list fallback
     ├── Step 4.2: File Manager Details View column wrapping & mobile drawer trigger
     ├── Step 4.3: Gantt Timeline compact task column & 7-day scale on mobile
     └── Step 4.4: AICopilotWidget mobile docking (eliminate button occlusion)
                                           │
                                           ▼
     WAVE 5: Automated Verification & Browser QA
     ├── Step 5.1: Run Playwright multi-viewport suite (360px, 390px, 768px, 1024px, 1440px)
     ├── Step 5.2: Assert zero horizontal overflow (scrollWidth <= innerWidth)
     └── Step 5.3: Verify Vercel CMS build & typecheck
```

---

## 4. Work Breakdown by Component & File

### Wave 1: Foundation (Estimated Effort: Low | Regression Risk: Low)
- **`CMS/src/app/layout.tsx`**: Add Next.js 16 `export const viewport: Viewport`.
- **`CMS/src/styles/master-hrms.css`**: Replace `991.98px` and `992px` with `1023.98px` and `1024px`. Ensure `.sidebar` and `.navbar-header` transitions match Tailwind `lg`.
- **`CMS/src/components/layout/WorkspaceShell.tsx`**: Clean up hamburger toggle alignment.

### Wave 2: Calendar (Estimated Effort: Medium | Regression Risk: Low)
- **`CMS/src/components/calendar/unified-calendar-app.tsx`**:
  - Replace static `aside.w-64` with `hidden lg:flex lg:w-64` and mount mobile `<Sheet>` wrapper.
  - Add `<Button className="lg:hidden" onClick={() => setFilterOpen(true)}><Filter className="size-4" /></Button>`.
  - Refactor toolbar into 2 rows on `< 640px`.

### Wave 3: Chat & Contacts (Estimated Effort: Medium | Regression Risk: Medium)
- **`CMS/src/components/chat/unified-chat-app.tsx`**:
  - Set `showInfo` default state to `false`.
  - Make right info drawer an overlay sheet on screens `< 1024px`.
  - Add navigation mode pills to mobile Call logs header so user is never trapped.
  - Collapse secondary composer actions into expandable menu on mobile.

### Wave 4: Data Dense Modules (Estimated Effort: Medium | Regression Risk: Low)
- **`CMS/src/app/(workspace)/call-history/page.tsx`**: Add mobile card list `<div className="md:hidden space-y-2.5">` showing caller details, duration, and tap-to-call buttons.
- **`CMS/src/components/todo/unified-todo-app.tsx`**: Add 7-day scale and compact sticky task header for Gantt view on mobile.
- **`CMS/src/components/ui/stats-overview-grid.tsx`**: Change column 4 style to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- **`CMS/src/components/ai-copilot-widget.tsx`**: Shift position on mobile or hide in active chat mode to prevent covering "Send" button.

### Wave 5: Verification (Estimated Effort: Medium)
- Write and run `scripts/verify_responsive_multi_viewport_acceptance.cjs` testing:
  - 360x800, 390x844, 844x390, 768x1024, 1024x768, 1440x900.
  - Zero horizontal overflow check: `document.documentElement.scrollWidth <= window.innerWidth`.
  - Touch target check: `box.width >= 36 && box.height >= 36`.

---
**Document Status:** Verified Complete — Ready for Review & Approval.

