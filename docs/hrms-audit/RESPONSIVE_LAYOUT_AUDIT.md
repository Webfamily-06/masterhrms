# MASTERHRMS — RESPONSIVE LAYOUT & BREAKPOINT AUDIT

**Document Target:** Responsive Viewports, Grid Stacking, Tables, Touch Targets & Viewport Edge Constraints  
**Date of Audit:** November 3, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering Team  
**Audit Scope:** Full Application Responsive Behavior across Mobile, Tablet, and Desktop Breakpoints  
**Status:** COMPLETE RESPONSIVE AUDIT

---

## 1. BREAKPOINT ARCHITECTURE & SPECIFICATION

MasterHRMS specifies responsive behaviors through Tailwind CSS v4 breakpoints, custom media queries in [`src/styles.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css), and JavaScript viewport detection in [`src/hooks/use-mobile.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/hooks/use-mobile.tsx).

### 1.1. Breakpoint Grid Matrix

| Breakpoint Tier | Pixel Width Target | Typical Physical Devices | Architectural Handling in MasterHRMS | Observed Compliance Status |
|---|---|---|---|---|
| **Ultra-Narrow Mobile** | **320px** | iPhone SE (1st gen), Galaxy Fold outer screen | Single-column form flow; extreme horizontal margin squish due to double-padding bug (`GAP-UI-002`). | **CRITICAL DEFECT** (Horizontal squishing to 240px usable width) |
| **Standard Mobile** | **375px** | iPhone SE (2nd/3rd gen), iPhone 12/13 Mini | Forms stack vertically; page header wraps buttons; table cards require scrolling. | **PARTIAL** (Action buttons wrap unevenly) |
| **Modern Flagship Mobile** | **390px** | iPhone 14, 15, 16 Pro | Standard single-column view; header search input collapses or truncates. | **SATISFACTORY** |
| **Large Phablet Mobile** | **430px** | iPhone 14/15/16 Pro Max, Pixel 8 Pro | Ample space for single-column cards; modals comfortably display full text. | **SATISFACTORY** |
| **Small Tablet / Portrait** | **768px (`md`)** | iPad Mini, iPad (Portrait), Android tablets | JavaScript hook triggers `isMobile = false` while CSS keeps mobile drawer active up to `1023.98px` (`GAP-UI-011`). | **CRITICAL ARCHITECTURAL CONFLICT** |
| **Large Tablet / Landscape**| **1024px (`lg`)** | iPad Pro 11", iPad Air Landscape | Sidebar switches from drawer overlay to desktop sticky column (`.sidebar`). | **SATISFACTORY** |
| **Standard Desktop** | **1280px (`xl`)** | 13"–14" Laptops (MacBook Air, ThinkPad) | Primary design target; sidebar rail (72px) or full (250px) + full content canvas. | **OPTIMAL** |
| **Widescreen Desktop** | **1440px (`2xl`)** | 15"–16" Laptops, 24" 1080p Desktop Displays | Standard comfortable spacing; tables display 8–10 columns comfortably. | **OPTIMAL** |
| **Ultra-Wide Desktop** | **1920px+** | 27"–32" 4K Monitors, Multi-monitor setups | Full canvas width expansion without max-width capping; wide table rows stretch. | **SATISFACTORY** (Requires inner max-width capping on forms) |

---

## 2. SYSTEMIC RESPONSIVE DEFECTS & FINDINGS

### 2.1. The Double-Padding Defect (`GAP-UI-002`)

- **Root Cause Evidence:**
  In [`src/styles.css:122-132`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css#L122-L132), the application shell automatically enforces outer padding on the `.content` container:
  ```css
  .content {
    padding: 24px !important;
  }
  @media (max-width: 1023.98px) {
    .content {
      padding: 16px !important;
    }
  }
  ```
  However, in **98 route page files** across `src/routes/` (e.g., `src/routes/_authenticated/_app/employees/index.tsx`, `src/routes/_authenticated/_app/leaves/index.tsx`, `src/routes/_authenticated/_app/payroll/index.tsx`), the page root element is authored as:
  ```tsx
  <div className="p-6 space-y-6"> ... </div>
  // or
  <div className="p-4 space-y-4"> ... </div>
  ```
- **Responsive Impact:**
  - On Desktop (> 1024px): Padding compounds to `24px + 24px = 48px` on all four edges.
  - On Mobile (< 1024px): Padding compounds to `16px + 24px = 40px` horizontal margin on both sides (total 80px horizontal inset).
  - On a 320px viewport (iPhone SE 1st gen), `320px - 80px = 240px` usable width. Form inputs, metric cards, and filter bars are severely squished, causing button text truncation and overflow.

---

### 2.2. Breakpoint Threshold Conflict (`GAP-UI-011`)

- **Code Evidence:**
  1. [`src/hooks/use-mobile.tsx:5`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/hooks/use-mobile.tsx#L5):
     ```typescript
     const MOBILE_BREAKPOINT = 768; // Uses Tailwind 'md'
     ```
  2. [`src/styles.css:101`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css#L101):
     ```css
     @media (max-width: 1023.98px) {
       .sidebar {
         display: none;
       }
       .main-wrapper.slide-nav .sidebar {
         display: block;
         position: fixed;
         z-index: 100000;
         width: 275px;
       }
     }
     ```
- **Conflict Behavior (768px – 1023px):**
  On tablets in portrait mode (768px – 1023px, such as standard iPads and Android 10" tablets):
  - JavaScript components relying on `useIsMobile()` evaluate to `false` (assuming desktop presentation, rendering multi-column desktop tables or complex tabbed layouts).
  - The CSS navigation layer treats the device as mobile (< 1024px), hiding the desktop sidebar and requiring the slide-nav mobile drawer.
  - This mismatch causes headers and table action bars to render desktop layouts while the viewport container is constrained by mobile shell logic.

---

### 2.3. Data Table Overflow & Missing Sticky Columns (`GAP-UI-008`)

- **Code Evidence:**
  [`src/components/ui/table.tsx:8-16`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/table.tsx#L8-L16) provides an outer wrapper:
  ```tsx
  <div className="relative w-full overflow-x-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
  ```
- **Responsive Inspection on Breakpoints (320px – 768px):**
  - High-density operational tables (e.g., Employee Directory with 9 columns, Payroll Processing with 11 columns, Attendance Logs with 8 columns) expand to `1100px – 1400px` minimum table width.
  - While horizontal scroll is enabled via `overflow-x-auto`, there is **no sticky freeze** on the Employee Name/ID column (left) or the Action Dropdown/Button column (right).
  - On mobile devices, users must swipe horizontally past 7 data columns to reach the Edit/Delete actions, completely losing visual context of which employee row they are operating on.

---

### 2.4. Form Stacking & Grid Reflow Across Modules

- **Audit Sample: Employee Onboarding & Create Forms**
  - Forms use responsive Tailwind grids:
    `className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"`
  - **320px – 430px:** Reflows cleanly to `grid-cols-1`. Input fields span 100% width.
  - **768px:** Renders `grid-cols-2` or `grid-cols-4`. However, inside dialog popups, 768px screens cause fields in 4-column layouts to shrink to < 140px width, causing select placeholder text clipping (e.g., "Select Employ...").
  - **Date Picker Inputs:** Input elements with type `date` or custom calendar triggers lack `min-w-0`, causing calendar icon clipping when placed in 3-column rows on tablet breakpoints.

---

### 2.5. Touch Target Sizing (WCAG 2.1 Success Criterion 2.5.5)

- **Audit Findings:**
  1. **Table Action Dropdowns:**
     [`src/components/ui/dropdown-menu.tsx:75`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dropdown-menu.tsx#L75) defines menu items as:
     `py-1.5 px-2 text-sm` (~32px total rendered height).
     - **Violation:** WCAG 2.1 requires minimum `44px × 44px` touch target size for mobile pointer interactions. Users on mobile touchscreens frequently trigger accidental adjacent row clicks.
  2. **Table Pagination Controls:**
     Previous/Next icon buttons and page number buttons render at `h-8 w-8` (32px × 32px), failing touch target specifications on mobile viewports (< 768px).

---

## 3. RESPONSIVE MATRIX SUMMARY

| Screen Width | Viewport Category | Page Header Reflow | Form Grid Reflow | Data Tables | Modals & Dialogs | Touch Target Compliance |
|---|---|---|---|---|---|---|
| **320px** | Ultra-Narrow | Wraps into 3 rows | Clean single-column; squished by 80px double padding | Scrollable, no sticky columns | Overflows viewport vertically | Non-compliant (32px targets) |
| **375px** | Standard Mobile | Wraps into 2 rows | Clean single-column | Scrollable, no sticky columns | Overflows viewport vertically | Non-compliant (32px targets) |
| **390px** | Flagship Mobile | Wraps cleanly | Clean single-column | Scrollable, no sticky columns | Overflows viewport vertically | Non-compliant (32px targets) |
| **430px** | Large Phablet | Clean 2-row layout | Clean single-column | Scrollable, no sticky columns | Marginally fits short forms | Non-compliant (32px targets) |
| **768px** | Small Tablet | 1-row with search | 2-column flow | Scrollable | Fits with internal scroll | Boundary target (~36px) |
| **1024px** | Large Tablet | 1-row layout | 2 to 3-column flow | Full view / minimal scroll | Fits comfortably | Compliant on pointer |
| **1280px** | Laptop | Optimal 1-row | 3 to 4-column flow | Fully visible | Optimal | Compliant (mouse/pointer) |
| **1440px** | Desktop | Optimal 1-row | 4-column flow | Fully visible | Optimal | Compliant (mouse/pointer) |
| **1920px** | Ultra-Wide | Stretched layout | 4-column flow | Over-extended row width | Optimal | Compliant (mouse/pointer) |

---

## 4. REMEDIATION RECOMMENDATIONS

1. **Eliminate Double-Padding:** Remove redundant `p-6` and `p-4` wrappers from the 98 route pages; let the authoritative `.content` container in `src/styles.css` manage page margins.
2. **Harmonize Mobile Breakpoint:** Align `src/hooks/use-mobile.tsx` with CSS media queries by standardizing `MOBILE_BREAKPOINT = 1024` (or migrating CSS media queries to `768px`).
3. **Implement Sticky Table Columns:** Apply `sticky left-0 bg-card z-10` to identity columns and `sticky right-0 bg-card z-10` to action dropdown columns for small viewports.
4. **Touch Target Enlargement:** Add mobile-specific padding overrides (`py-2.5 px-3 md:py-1.5 md:px-2`) on `DropdownMenuItem` and table pagination controls.

