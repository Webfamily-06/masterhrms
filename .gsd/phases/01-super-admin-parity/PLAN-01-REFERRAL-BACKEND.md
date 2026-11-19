---
phase: 1
plan: 1
wave: 1
gap_closure: true
source: docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md
---

# Plan 1.1: Referral Backend Engine & APIs

## Objective
Implement the backend service and REST API endpoints for the Super-Admin Referral & Affiliate Program, closing Vector 4 and Vector 5 gaps from the WorkDo audit. This allows the platform owner to configure commission percentages, view referred tenant conversions, review payout requests, and approve or reject payouts with an immutable audit trail.

## Context
- `docs/audit/WORKDO_VS_MASTERHRMS_SUPER_ADMIN_DEEP_FORENSIC_AUDIT.md` (Vector 4 & 5)
- `server/src/routes/super.routes.ts`
- `server/src/services/settings/settings.service.ts`

## Tasks

<task type="auto">
  <name>Create Referral Program Service</name>
  <files>
    server/src/services/referral.service.ts
  </files>
  <action>
    Create a robust referral service that handles:
    1. `getReferralSettings()`: Reads platform referral rules (enabled, commissionPercent, minimumPayout, currency, guidelines).
    2. `updateReferralSettings()`: Persists settings using Prisma Setting model with scope SYSTEM.
    3. `getReferralOverview()`: Gathers key statistics (Total Commissions Earned, Total Paid Out, Pending Payouts, Total Referred Tenants), lists all referred tenants, and lists payout requests.
    4. `approvePayoutRequest(id, notes)`: Approves payout, logs approval timestamp, and marks status as approved.
    5. `rejectPayoutRequest(id, reason)`: Rejects payout request with rejection reason.
  </action>
  <verify>
    npm --prefix server run typecheck or npx --prefix server tsc --noEmit
  </verify>
  <done>
    Service compiles cleanly with 0 TypeScript errors.
  </done>
</task>

<task type="auto">
  <name>Register Super-Admin Referral Endpoints</name>
  <files>
    server/src/routes/super.routes.ts
  </files>
  <action>
    Add the required endpoints under `superRouter` with `requireAuth` and `requireSuperAdmin`:
    - `GET /api/super/referral` — returns overview stats, settings, referred tenants, and payout requests.
    - `PUT /api/super/referral/settings` — updates commission rules and payout minimum.
    - `POST /api/super/referral/payout-requests/:id/approve` — approves payout.
    - `POST /api/super/referral/payout-requests/:id/reject` — rejects payout.
    - `POST /api/super/plans/:id/duplicate` — duplicates a subscription plan with "(Copy)".
    - `POST /api/super/plans/:id/make-default` — marks plan as default.
  </action>
  <verify>
    npm --prefix server run typecheck or npx --prefix server tsc --noEmit
  </verify>
  <done>
    All 6 endpoints return appropriate HTTP status codes (200, 201, 400, 404, 500) and typecheck passes with 0 errors.
  </done>
</task>
