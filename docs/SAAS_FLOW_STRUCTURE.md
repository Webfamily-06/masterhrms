# SaaS workspace control flows

Updated: 2026-09-21. This document describes the current source changes, not a production certification.

## Platform and tenant boundaries

- Super Admin manages saved plans in `/super/plans` and assigns workspace subscriptions through `/super/tenants` → **Subscription & limits**.
- Tenant administrators see their assigned plan, expiry, and employee/user usage in `/subscription`. **Request Plan Change** creates a real platform support ticket; Super Admin reviews the request, assigns the plan, and resolves the ticket. This flow does not charge a payment or invent a paid invoice.
- Generic CMS mutations cannot change platform configuration or subscriptions as a tenant user. Public platform settings responses contain an allowlist of presentation fields, not SMTP/payment secrets. Public plan responses exclude orders and internal templates.
- Authentication reloads database roles and tenant membership. Pending MFA tokens are not accepted as completed sessions.

## Onboarding and switching

Registration or a new OAuth identity → unassigned account → `/onboarding` → transaction creates a tenant, profile membership, Workspace Admin role and assignment → fresh token → dashboard.

An account already assigned to a workspace cannot bootstrap another workspace. Reading `/auth/me` no longer silently adds unrelated identities to a shared workspace. Existing accounts require provisioned credentials; logging in with a known default password no longer creates an account.

Super Admin workspace switching refreshes the token, clears query caches, and reconnects realtime transport. The existing impersonation implementation still changes the administrator's active profile tenant; a dedicated impersonation audit and return-session flow remain future work.

## Subscription controls and enforcement

`PUT /api/super/tenants/:id/policy` validates plan assignment, status, expiry, billing cycle, and limits. The existing CMS subscription records remain the source of truth; no database migration or live data mutation was run during implementation. Policy saves create a separate change record with actor, tenant ID, before/after values, and timestamp in the existing configuration storage.

`GET /api/workspace/subscription` returns the current policy and measured usage.

- Blank capacity means unlimited; zero blocks additions.
- Employee capacity counts all employee records, including inactive employees.
- User capacity counts tenant profiles, excluding platform administrators.
- Plan selection copies plan defaults into editable workspace limits. Saved workspace overrides remain independent of later plan edits.
- Existing unassigned workspaces retain access and display **Unassigned**. Super Admin must explicitly configure their capacity; no invented plan is assigned.
- Lowering a limit does not delete records. Further additions stop until capacity becomes available or the limit increases.
- Employee creation, recruitment conversion, biometric user imports, and employee account provisioning check capacity in their write transaction while holding a tenant row lock.
- Suspension and expiry block authenticated tenant API access. Suspension disconnects existing workspace sockets. Socket room and sender identity come from authenticated membership, not client-supplied tenant/sender fields.

## Dashboard data

The overview uses database counts, unresolved platform support tickets, actual plan distribution, and six months of workspace creation timestamps. Subscription MRR is the sum of active assigned monthly prices (annual prices divided by twelve); ARR is that run-rate multiplied by twelve. These are subscription run-rates, not collected revenue or payment reconciliation.

Fake tenant counts, fixed plan percentages, sample financial fallbacks, and fabricated latency/pool utilization were removed from the overview. API failures show errors with retry controls.

## Additional tenant UI repairs

Purchase/supplier/transfer lists now read the actual Express response envelope instead of a nonexistent nested `data.data`. Warehouse/product selectors accept the existing array responses. Project/task saves and biometric device registration have real pending states instead of referencing an undefined mutation. The stock-adjustment dialog uses the proper open-state callback; missing portal and biometric imports are restored.

POS/storefront catalog failures no longer substitute demo products. Invoice lookup failures display an error rather than a fabricated invoice, and failed payment requests no longer produce a success toast or mark an invoice paid locally. Public invoice gateway verification still requires a dedicated backend audit.

## Verification and remaining work

Commands:

```text
npm --prefix server run build
npm run build
cd server
node --import tsx --test tests/workspace-policy.test.ts
```

Regression tests cover zero/unlimited limits, annual pricing, suspension/expiry, tenant-scoped capacity checks, cross-workspace account reset rejection, MFA token rejection, and revoked Super Admin roles. Database calls are stubbed in these tests: real MySQL concurrent requests and browser interaction still need staging verification.

Before release, verify with separate tenant accounts: onboarding, final available seat, concurrent imports, limit reduction, suspension of an already connected client, expiry, plan requests, and Super Admin switching.

Remaining work requiring separate module audits:

1. Verified payment capture/webhooks, renewal reconciliation, and transactional platform billing records; current plan changes use Super Admin approval.
2. Relational plan/subscription/audit models to replace legacy CMS configuration storage, with migration/backfill of existing records.
3. Storage, warehouse, branch, and per-module quotas; only employee/user capacity is covered here.
4. Platform-wide self-service signup/provisioning policy and administrator invitations for Super Admin-created empty workspaces.
5. Complete route-by-route RBAC and tenant isolation review, including public portals, media, exports, integrations, and hardware endpoints.
6. Remaining module dashboards, dead actions, public invoice payment verification, and frontend plan guards.
7. Remove/rotate the database credential previously embedded in server configuration; rotation requires deployment credential management.
