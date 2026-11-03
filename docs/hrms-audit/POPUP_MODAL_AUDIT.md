# MASTERHRMS — POPUP, MODAL & OVERLAY SYSTEM AUDIT

**Document Target:** Dialogs, Sheets, Confirmation Popups, Dropdowns & Z-Index Stacking Hierarchy  
**Date of Audit:** November 3, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering Team  
**Audit Scope:** Full Application Overlay Components (`src/components/ui/dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, and 223 Modal Usages across `src/routes/*`)  
**Status:** COMPLETE OVERLAY AUDIT

---

## 1. OVERLAY ARCHITECTURAL FOUNDATION

MasterHRMS builds its overlay and modal system upon **Radix UI Primitives** (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`), wrapped with Sneat Pro / shadcn design tokens:

- **Modal Dialogs:** [`src/components/ui/dialog.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dialog.tsx)
- **Slide-Over Drawers (Sheets):** [`src/components/ui/sheet.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/sheet.tsx)
- **Action Dropdowns:** [`src/components/ui/dropdown-menu.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dropdown-menu.tsx)
- **Total Modal Usages Identified:** **223 dialog instances** across `src/routes/` (employee forms, leave applications, payroll recalculations, shift assignments, asset claims, etc.).

---

## 2. CRITICAL POPUP DEFECTS & FINDINGS

### 2.1. The Critical Viewport Overflow Defect (`GAP-UI-001`)
- **Severity:** P0 / Critical Usability Blocker
- **Code Inspection Evidence:**
  In [`src/components/ui/dialog.tsx:34-45`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/ui/dialog.tsx#L34-L45):
  ```tsx
  <DialogPrimitive.Content
    ref={ref}
    className={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ... sm:rounded-lg",
      className
    )}
    {...props}
  >
  ```
- **The Defect:**
  1. The base `DialogContent` definition **does not enforce** `max-h-[85vh]` or `overflow-y-auto`.
  2. Across 223 route pages, developers declare modal dialogs with arbitrary widths like `<DialogContent className="max-w-md">` or `<DialogContent className="sm:max-w-xl">`, omitting vertical overflow constraints.
  3. Because the modal is pinned via `top-[50%]` and `translate-y-[-50%]`, modals taller than the browser viewport expand symmetrically off-screen above the top edge and below the bottom edge.
- **Real-World Impact on Mobile & Tablets:**
  - On mobile devices (320px – 430px viewport heights ranging from 568px to 844px, and especially when the on-screen virtual keyboard is open with visible height < 400px):
    - Complex forms (e.g., *Add Employee*, *Add Shift Roster*, *Create Salary Structure*, *Submit Claim*) have 6 to 12 form fields.
    - The Dialog Header and Close button are clipped above the viewport ceiling.
    - The **Save / Submit** and **Cancel** buttons are clipped completely beneath the viewport floor.
    - Users cannot scroll the modal canvas because `overflow-y-auto` is missing on the container. Users are trapped with no way to submit or cancel the form without reloading the browser.

---

### 2.2. Error Message Expansion Pushing Actions Off-Screen
- **Finding:**
  When client-side validation triggers inside modals, inline validation errors (e.g., `<p className="text-destructive text-sm">Required field</p>`) dynamically add 24px–32px per invalid field.
- **Consequence:**
  A form that was marginally fitting on screen immediately overflows upon failed submission, pushing the Submit button out of view just when the user needs to correct the error and retry.

---

### 2.3. Z-Index Stacking Hierarchy Conflicts (`GAP-UI-012`)

The application's layer stacking shows multiple uncoordinated z-index allocations:

| Layer / Component | File / Location | Z-Index | Evaluation & Stacking Hazard |
|---|---|---|---|
| **Radix Tooltips / Popovers** | `src/components/ui/tooltip.tsx` | `z-50` | Same level as Dialog; tooltips inside dialogs can clip beneath modal body. |
| **Dialog Backdrop & Content** | `src/components/ui/dialog.tsx:18,36` | `z-50` | Standard base overlay layer. |
| **Sticky Page Header / Topbar** | `src/components/page-header.tsx` | `z-40` / `z-900` | Inconsistent between component classes and CSS overrides. |
| **System Banners & Notifications** | Global Alert system | `z-950` | Sits above page header. |
| **Desktop Sidebar** | `src/styles.css:94` | `z-1000` | Sits above page content; when mini-rail hover opens, flyout is `z-1000`. |
| **Mobile Drawer Backdrop** | `src/styles.css:115` | `z-99990` | Extremely elevated z-index. |
| **Mobile Slide-Nav Drawer** | `src/styles.css:105` | `z-100000` | Highest layer in application. |

- **Conflict Hazard:**
  If a modal dialog (`z-50`) is triggered while the mobile navigation drawer (`z-100000`) is in an open or transitioning state, the modal dialog renders **behind** the mobile drawer and its backdrop, leaving the application in an unclickable deadlocked state.

---

### 2.4. Overlay Keyboard Accessibility & Focus Trapping

- **Radix Primitive Compliance:**
  - **Focus Trapping:** Verified compliant. Radix Dialog automatically traps Tab/Shift+Tab focus within the dialog bounds.
  - **Escape Key Handling:** Verified compliant. Pressing `Escape` dispatches close events.
  - **Backdrop Blur & Dimming:** `bg-black/80` dimming backdrop correctly blocks interaction with background page elements.
  - **Close Button Touch Target:** The close icon (`X`) is positioned `absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100`. The click target is roughly `28px × 28px`, which is too small for reliable mobile thumb dismissal.

---

## 3. MODAL AUDIT MATRIX ACROSS MODULES

| Modal Purpose / Module | Route Location | Field Count | Max Width Specified | Scroll Container Present? | Mobile Usability Rating |
|---|---|---|---|---|---|
| **Add New Employee** | `src/routes/_authenticated/_app/employees/` | 14 fields | `max-w-2xl` | ❌ None | **FAILS (Severe Overflow)** |
| **Apply Leave** | `src/routes/_authenticated/_app/leaves/` | 6 fields | `max-w-md` | ❌ None | **FAILS on Mobile Keyboard** |
| **Add Shift Schedule** | `src/routes/_authenticated/_app/attendance/` | 8 fields | `max-w-lg` | ❌ None | **FAILS (Buttons clipped)** |
| **Salary Revision Modal** | `src/routes/_authenticated/_app/payroll/` | 11 fields | `max-w-xl` | ❌ None | **FAILS (Severe Overflow)** |
| **Add Asset Assignment** | `src/routes/_authenticated/_app/assets/` | 7 fields | `max-w-md` | ❌ None | **FAILS on small screens** |
| **Delete Confirmation** | Multiple routes (`AlertDialog`) | 0 (Message only) | `max-w-sm` | N/A (Fits) | **PASS** |
| **Department Create** | `src/routes/_authenticated/_app/organization/`| 3 fields | `max-w-md` | N/A (Short) | **PASS** |

---

## 4. REMEDIATION SPECIFICATION

To remediate all 223 modal dialog instances globally with a single architectural fix:

1. **Update `src/components/ui/dialog.tsx` Base Definition:**
   Modify `DialogContent` to enforce responsive maximum dimensions, flex layout, and internal scrolling:
   ```tsx
   // Recommended architectural definition
   <DialogPrimitive.Content
     ref={ref}
     className={cn(
       "fixed left-[50%] top-[50%] z-50 flex flex-col w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 sm:rounded-lg overflow-hidden",
       className
     )}
     {...props}
   >
     {children}
   </DialogPrimitive.Content>
   ```
2. **Introduce Scrollable Body & Fixed Action Footer:**
   - Add `DialogBody` (`flex-1 overflow-y-auto px-6 py-4`) to ensure form inputs scroll smoothly.
   - Add `DialogFooter` with `sticky bottom-0 bg-background/95 backdrop-blur px-6 py-4 border-t` to guarantee that **Submit** and **Cancel** buttons remain permanently visible and clickable regardless of viewport height.
3. **Enlarge Modal Close Button Target:**
   Increase the touch target of the `X` button to `44px × 44px` with `p-2` on mobile screens.
4. **Normalize Z-Index Scale:**
   Map all overlay z-indices to a strict Tailwind scale: Modals (`z-50`), Drawers (`z-50`), Tooltips/Popovers (`z-60`), Notifications (`z-70`).

