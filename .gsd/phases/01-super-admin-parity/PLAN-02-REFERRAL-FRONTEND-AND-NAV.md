---
phase: 1
plan: 2
wave: 2
gap_closure: true
source: docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md
---

# Plan 1.2: Referral Frontend Hub & Navigation Integration

## Objective
Create the dedicated `/super/referral` route and UI screen in MasterHRMS, and link it in the Super-Admin sidebar and Command Palette, closing Vector 1 and Vector 2 gaps from the WorkDo audit.

## Context
- `docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md` (Vector 1 & 2)
- `src/routes/_authenticated/super/route.tsx`
- `src/routes/_authenticated/super/referral.tsx`

## Tasks

<task type="auto">
  <name>Build Super-Admin Referral Hub Screen</name>
  <files>
    src/routes/_authenticated/super/referral.tsx
  </files>
  <action>
    Create the `/super/referral` route using TanStack Router with:
    1. Metric KPI Cards: Total Commission Earned, Total Paid Out, Pending Requests, Total Referred Tenants.
    2. Tabbed Interface:
       - Tab 1: Payout Requests Queue (with status badges, payout method, amount, and Approve/Reject dialog actions).
       - Tab 2: Referred Tenants Directory (Referrer company, Referred company, plan purchased, commission generated, conversion date).
       - Tab 3: Commission & Payout Configuration (Enabled toggle, Commission percentage input, Minimum payout threshold input, Guidelines textarea, Save button).
    3. Proper error handling, toast notifications with Sonner, and optimistic query invalidation.
  </action>
  <verify>
    npm run build or npx tsc --noEmit
  </verify>
  <done>
    Route file compiles without errors and renders all components cleanly.
  </done>
</task>

<task type="auto">
  <name>Integrate Referral Program in Super-Admin Navigation</name>
  <files>
    src/routes/_authenticated/super/route.tsx
  </files>
  <action>
    Add the Referral Program item to `ALL_SUPER_SEARCH_ITEMS` in `src/routes/_authenticated/super/route.tsx` under group "Core Orchestration":
    `{ to: "/super/referral", label: "Referral Program", iconClass: "ph-users-three", group: "Core Orchestration" }`
    Ensure it highlights correctly when on `/super/referral` and appears in the CommandDialog search.
  </action>
  <verify>
    npm run build or npx tsc --noEmit
  </verify>
  <done>
    Sidebar and search dialog cleanly include "Referral Program".
  </done>
</task>
