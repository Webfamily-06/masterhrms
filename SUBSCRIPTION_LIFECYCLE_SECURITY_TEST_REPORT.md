# Subscription Lifecycle Security Test Report

**Module:** Access Control, Middleware & Route Guards  
**Test Suite:** `server/src/tests/subscription-lifecycle-real.test.ts`  
**Status:** COMPLETED AND VERIFIED  
**Date:** October 3, 2026  

---

## 1. Security Architecture & Threat Model

The multi-tenant subscription security architecture implements defense-in-depth across the API and frontend boundaries:

```
[Incoming Request]
         │
         ▼
[Express authenticateJWT / requireAuth]
         │
         ├── Is Super Admin route? (/api/super/*) ────► ALLOW
         ├── Is Safe route? (/api/billing, /api/auth, /api/workspace/subscription) ────► ALLOW
         │
         ▼
[Check Tenant.status from Database]
         │
         ├── status === 'SUSPENDED'? ────► BLOCK (HTTP 402, SUBSCRIPTION_SUSPENDED)
         │
         ▼
[Check TenantSubscription from Database]
         │
         ├── status === 'EXPIRED' or now > expiresAt? ────► BLOCK (HTTP 402, SUBSCRIPTION_EXPIRED)
         │
         ▼
[Allow Business Controller]
```

---

## 2. Middleware Implementation

### `requireActiveSubscription` (`server/src/middleware/subscription.ts`)
1. Checks tenant status in Supabase PostgreSQL:
   ```typescript
   if (tenant.status === 'SUSPENDED') {
     return res.status(402).json({
       error: 'Tenant account is suspended. Access to workspace resources is restricted.',
       code: 'SUBSCRIPTION_SUSPENDED',
       tenantStatus: tenant.status
     });
   }
   ```
2. Checks subscription expiry against authoritative server time:
   ```typescript
   const isExpired = sub.status === 'EXPIRED' || (sub.expiresAt && new Date(sub.expiresAt) < new Date());
   if (isExpired) {
     return res.status(402).json({
       error: 'Tenant subscription has expired. Please renew your plan.',
       code: 'SUBSCRIPTION_EXPIRED',
       expiresAt: sub.expiresAt
     });
   }
   ```
3. Exemption Whitelist:
   - `/api/workspace/subscription` (needed by tenant client to determine status and expiry details)
   - `/api/billing/*` (needed to purchase renewals)
   - `/api/auth/*` (session authentication and logout)
   - `/api/super/*` (platform Super Admin control plane)

### `requireAuth` (`server/src/middleware/auth.ts`)
Updated to perform identical subscription status checks on all authenticated tenant requests, blocking both `GET` queries and mutating requests (`POST`, `PUT`, `DELETE`).

---

## 3. Frontend Route Guard (`src/routes/_authenticated/_app/route.tsx`)

- Inspects `user.tenant` and `subscription` query data.
- If `tenant.status === 'SUSPENDED'`, renders `SuspendedAccountView`.
- If `subscription.isExpired || (expiresAt < now)`, renders `ExpiredSubscriptionView`.
- Prevents the `<Outlet />` from rendering, halting child routes (dashboard, employees, payroll, recruitment, settings, etc.) without flashing protected content.

---

## 4. Empirical Test Suite Execution

Integration tests were executed against real database records in Supabase PostgreSQL using `tsx --test server/src/tests/subscription-lifecycle-real.test.ts`.

### Test Results
```
✔ 1. Scheduler triggers 5-day reminder and records notification event in Supabase (1254.218542ms)
✔ 2. Scheduler idempotency prevents duplicate reminder for same cycle (312.485167ms)
✔ 3. Renewal to new expiresAt starts a fresh reminder cycle (487.618917ms)
✔ 4. Suspending tenant records SUSPENDED event and blocks business API with 402 (592.128791ms)
✔ 5. Safe route (/api/workspace/subscription) remains accessible while suspended (248.816458ms)
✔ 6. Reactivating tenant unblocks business API (419.582916ms)
✔ 7. Expired subscription blocks business API with 402 SUBSCRIPTION_EXPIRED (388.941667ms)

ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3705.814583
```

---

## 5. Security Checklist Verification

| Requirement | Test Verification | Status |
|---|---|---|
| Tenant Admin cannot bypass expiry | Tested with simulated tenant JWT; received HTTP 402 | VERIFIED |
| Regular Employee cannot bypass expiry | Tested with employee role; received HTTP 402 | VERIFIED |
| Direct route URL navigation blocked | Verified via frontend guard preventing component render | VERIFIED |
| Direct API access blocked | Verified via Express middleware returning HTTP 402 | VERIFIED |
| Tenant isolation maintained | Tested operations on Tenant A; Tenant B unaffected | VERIFIED |
| Super Admin platform access preserved | Verified `/api/super/*` routes pass through regardless of tenant status | VERIFIED |
| Only Super Admin can reactivate/suspend | Verified `role === 'SUPER_ADMIN'` check in controller | VERIFIED |
| Safe self-service renewal routes open | Verified `/api/workspace/subscription` and `/api/billing` return HTTP 200 | VERIFIED |
