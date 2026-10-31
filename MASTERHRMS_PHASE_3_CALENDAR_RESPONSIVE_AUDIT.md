# MASTERHRMS — PHASE 3: CALENDAR RESPONSIVE AUDIT

- Repository: `Webfamily-06/masterhrms`
- Branch: `fix/phase-3-calendar-responsive`
- Base: `fix/phase-2-wave-1-responsive-foundation`
- Scope: Calendar responsive UX only
- Audit mode: Read-only source inspection
- Status: Source audit complete; browser/device acceptance pending

## 1. Route and Component Inventory

The following Next.js routes delegate to the shared `UnifiedCalendarApp`:
- `/hr/calendar` — `mode="hr"`, title "Company Calendar"
- `/calendar` — `mode="canonical"`, title "Workspace Calendar"
- `/me/calendar` — `mode="hr"`, title "My Schedules & Calendar"

The component is `CMS/src/components/calendar/unified-calendar-app.tsx`. The calendar feature is shared, so responsive changes must be implemented in the shared component and regression-tested through each route/role. The separate `/apps/calendar` and tenant calendar routes should also be included in route discovery before acceptance.

## 2. Source-Verified Findings

### CAL-RWD-01 — Fixed 256px sidebar
- Evidence: component line 1284 currently renders `<aside className="w-64 ... shrink-0">`.
- Impact: sidebar retains 16rem width at narrow viewports and competes with the calendar canvas.
- Proposed correction: desktop-only sidebar; mobile/tablet filter access through a Sheet/Drawer, preserving all existing filter state and actions.
- Priority: P0 / Critical.

### CAL-RWD-02 — Single-row fixed-height toolbar
- Evidence: around lines 1502–1550, toolbar uses `h-14 px-6 ... justify-between`, with Today/navigation controls, month title, and four view buttons in separate inline groups.
- Impact: toolbar has a high minimum intrinsic width and no deliberate narrow-screen layout.
- Proposed correction: responsive two-row toolbar on small screens; keep desktop layout visually unchanged. Ensure title/navigation and view switcher remain reachable.
- Priority: P1 / High.

### CAL-RWD-03 — Seven-column month and week grids at every viewport
- Evidence: month and week sections around lines 1640–1855 use `grid-cols-7`; month cells use `min-h-[105px]`, week columns use `min-h-[400px]`.
- Impact: phone-width cells become narrow, event labels truncate, and multi-event days become difficult to scan/tap.
- Proposed correction: choose a mobile-first agenda/list presentation or a deliberate compact calendar strategy; preserve Month/Week/Day/List functionality and date navigation. Do not silently remove event information.
- Priority: P1 / High.

### CAL-RWD-04 — Dialog-based event workflows need mobile keyboard/viewport validation
- Evidence: event details/create/edit flows use the shared Dialog primitives; current inspected source includes dense attendee, reminder, share and action sections.
- Impact: small viewport height and virtual keyboard may obscure content or footer actions.
- Proposed correction: audit all create/edit/details/conflict/audit dialogs at 360x800 and 390x844; use bounded scrollable content and accessible sticky footer actions where required. Do not replace Dialog with Drawer without confirming focus, scroll-lock, and keyboard behavior.
- Priority: P1 / High pending browser reproduction.

## 3. Guardrails

- No API, database, Prisma schema, event model, recurrence, reminder, notification, Pusher, sharing, RSVP, permissions, or tenant-isolation changes in this responsive phase.
- Do not change event filtering/sorting/date calculations or mutation semantics.
- Preserve desktop behavior at 1280px and 1440px.
- Do not remove or hide functionality on mobile; move it into an accessible responsive control.
- Maintain keyboard access, visible focus, accessible names, and minimum 44x44px touch targets for primary interactive controls.
- No migrations, seeds, or writes against the shared production Supabase database.

## 4. Verification Plan

Required viewport matrix:
- 360x800, 390x844, 430x932 (mobile)
- 768x1024, 1023x768 (tablet/breakpoint)
- 1024x768, 1280x800, 1440x900 (desktop)

Required route coverage:
- `/hr/calendar`
- `/tenant/calendar`
- `/me/calendar`
- `/calendar`
- `/apps/calendar`

Required interaction checks:
- Open/close mobile filter drawer; backdrop and Escape dismissal.
- Navigate month/week/day; switch Month/Week/Day/List.
- Search and category filters.
- Open event details; create/edit/cancel flows without submitting mutations during visual-only runs.
- Verify no horizontal document overflow, clipped controls, inaccessible dialogs, or obscured sticky actions.
- Confirm desktop screenshots and behavior remain stable.

## 5. Evidence and Limitations

This audit confirms the listed class structures and route delegation by source inspection. It does not claim that a live browser reproduced every defect, nor does it claim Playwright passes. Browser baseline captures, runtime interaction tests, and the complete route/role matrix remain required before implementation acceptance.

## 6. Acceptance Criteria

1. No horizontal page overflow at any required viewport.
2. Mobile users can access filters, calendar navigation, all four view modes, search, and event actions.
3. Event details and forms remain scrollable with footer actions reachable when the virtual keyboard is open.
4. All five routes render correctly with their expected role/tenant context.
5. No API payload, mutation, permission, recurrence, reminder, sharing, RSVP, or tenant-scope regression.
6. Desktop behavior at 1280px and 1440px remains unchanged apart from approved responsive refinements.
7. Playwright results and before/after screenshots are committed in this feature branch.
