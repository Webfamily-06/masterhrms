---
phase: 1
plan: 3
wave: 2
gap_closure: true
source: docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md
---

# Plan 1.3: Super-Admin UI Controls Polish

## Objective
Polish high-frequency action controls across Tenants, Coupons, and Plans to achieve 100% parity with WorkDo's ergonomic shortcuts (Vector 3 and Vector 6).

## Context
- `docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md` (Vector 3 & 6)
- `src/routes/_authenticated/super/tenants.tsx`
- `src/routes/_authenticated/super/coupons.tsx`
- `src/routes/_authenticated/super/plans.tsx`

## Tasks

<task type="auto">
  <name>Add Direct Row Status Switch in Tenants Table</name>
  <files>
    src/routes/_authenticated/super/tenants.tsx
  </files>
  <action>
    Add a direct 1-click status switch/button right next to or inside the status column in `tenants.tsx`:
    - Allows Super-Admin to instantly activate or suspend a company without having to open the 3-dots dropdown menu.
    - Displays loading state during mutation and dispatches clear toast notification.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Status column has direct interactive toggle with optimistic feedback.
  </done>
</task>

<task type="auto">
  <name>Add Auto-Generate Code in Coupons Modal</name>
  <files>
    src/routes/_authenticated/super/coupons.tsx
  </files>
  <action>
    Add a "Generate Code" button next to the Coupon Code text input in the Create Coupon dialog.
    - When clicked, generates an uppercase alphanumeric code formatted like `SAVE-XXXX` or `PROMO-XXXX` and sets it in the input.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    1-click random code generation works and populates the field.
  </done>
</task>

<task type="auto">
  <name>Add Duplicate Plan and Trial Days Support in Plans Screen</name>
  <files>
    src/routes/_authenticated/super/plans.tsx
  </files>
  <action>
    1. In `plans.tsx`, add a "Duplicate" action button for each plan card/row that calls `POST /api/super/plans/:id/duplicate` (or opens the dialog prefilled as a duplicate).
    2. Ensure `trialDays` input is exposed and editable when `isTrial` toggle is enabled in the plan modal.
  </action>
  <verify>
    npx tsc --noEmit
  </verify>
  <done>
    Duplicate plan action and trial days input work seamlessly.
  </done>
</task>
