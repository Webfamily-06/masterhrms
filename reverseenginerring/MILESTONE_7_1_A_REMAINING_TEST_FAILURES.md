# MASTERHRMS — MILESTONE 7.1-A
# REMAINING TEST FAILURES & UNMIGRATED TEST SUITE INVENTORY

**Audit Timestamp:** 2026-11-19T23:48:00+05:30  
**Scope Context:** Out-of-scope for Milestone 7.1-A (Authorized Scope restricted to 10 module targets)  

---

## 1. REMAINING VITEST IMPORTING TEST SUITES (31 FILES)

The following 31 test files in `server/src/tests/` still import from `"vitest"`. They cannot currently be executed via `npx tsx` without Vitest installed and will be targeted in subsequent test runner unification milestones (e.g. Milestone 7.1-B):

| # | File Path | Functional Domain | Primary Entities Tested |
|---|---|---|---|
| 1 | `server/src/tests/addon-billing-lifecycle-navigation.test.ts` | SaaS Billing & Add-on Lifecycle | Tenant subscriptions, add-on purchasing |
| 2 | `server/src/tests/addon-inventory-reconciliation.test.ts` | Add-on Catalog Marketplace | 133 Add-on Catalog integrity |
| 3 | `server/src/tests/addon-marketplace-crud.test.ts` | Marketplace Management | Add-on install/uninstall flows |
| 4 | `server/src/tests/application-wide-addon-activation.test.ts` | Global Add-on Activation | Activation hooks across workspaces |
| 5 | `server/src/tests/canonical-media-gallery-architecture.test.ts` | Media Gallery | Image uploads, CDN thumbnails |
| 6 | `server/src/tests/cms-tenant-host-isolation.test.ts` | CMS Suite | Domain isolation, CMS articles |
| 7 | `server/src/tests/employee-self-service-portal.test.ts` | ESS Portal | Employee profile & self-service |
| 8 | `server/src/tests/employee-system-id.test.ts` | Employee ID Engine | Auto-increment employee codes |
| 9 | `server/src/tests/four-addons-final-acceptance.test.ts` | Acceptance Verification | Zoom, Slack, Twilio, Telegram |
| 10 | `server/src/tests/google-workspace-tally-entitlement.test.ts` | Third-party Integrations | Google Workspace, Tally entitlements |
| 11 | `server/src/tests/hr-employee-360-backend.test.ts` | HR Management | 360 employee record aggregation |
| 12 | `server/src/tests/hr-employee-actions-backend.test.ts` | HR Employee Actions | Resignations, terminations, leaves |
| 13 | `server/src/tests/hr-employee-directory-backend.test.ts` | HR Directory | Employee filtering & pagination |
| 14 | `server/src/tests/hr-employee-edit-backend.test.ts` | HR Modifications | Profile updates, bank details |
| 15 | `server/src/tests/notification.test.ts` | In-app Notifications | Push, in-app alerts |
| 16 | `server/src/tests/outbox-realtime.test.ts` | Outbox & Realtime | Outbox event delivery |
| 17 | `server/src/tests/part22-global-white-label-branding.test.ts` | White-labeling | Custom themes, logos, domain |
| 18 | `server/src/tests/phase5-p4-consolidation.test.ts` | P4 Features | System health, maintenance mode |
| 19 | `server/src/tests/security-scope-field.test.ts` | Security & RBAC | Field-level permissions |
| 20 | `server/src/tests/security-uploads-isolation.test.ts` | Storage Security | Path traversal, tenant upload sandbox |
| 21 | `server/src/tests/server-side-idempotency.test.ts` | API Reliability | Idempotency key headers |
| 22 | `server/src/tests/settings-database-persistence-audit.test.ts` | Settings Persistence | MySQL key-value persistence |
| 23 | `server/src/tests/settings-phase1-2-multitenant.test.ts` | Multi-Tenant Settings | Tenant settings inheritance |
| 24 | `server/src/tests/settings-phase1.test.ts` | Core Settings | System configurations |
| 25 | `server/src/tests/settings-restart-persistence.test.ts` | Settings Cache | In-memory cache invalidation |
| 26 | `server/src/tests/super-admin-authorization-guard.test.ts` | Super Admin Security | Platform root permission checks |
| 27 | `server/src/tests/tenant-branding-logo-lifecycle.test.ts` | Tenant Branding | Logo upload and retrieval |
| 28 | `server/src/tests/tenant-proxy-fail-closed.test.ts` | Multi-Tenant Proxy | Fail-closed tenancy isolation |
| 29 | `server/src/tests/tier2-design-system.test.ts` | Frontend/UI Tokens | Design system token adherence |
| 30 | `server/src/tests/turnstile-verification.test.ts` | Bot Verification | Cloudflare Turnstile verification |
| 31 | `server/src/tests/workspace-branding-matrix.test.ts` | Workspace Branding | CSS variable overrides |

---

## 2. NATIVE TEST SUITE DEFECT: `purchase-transactions-ui-consistency.test.ts`

- **File**: `server/src/tests/purchase-transactions-ui-consistency.test.ts`
- **Test Framework**: Native Node (`node:test`, `node:assert`)
- **Failing Test Case**: Section 6: `Super Admin - Download transaction PDF receipt` (Line 499)
- **Symptom**:
  ```
  AssertionError [ERR_ASSERTION]: PDF download endpoint must return 200 (401 !== 200)
      at /Users/apple/Documents/hrms/server/src/tests/purchase-transactions-ui-consistency.test.ts:499:12
  ```
- **Root Cause Analysis**:
  The request to download the Super Admin billing transaction PDF at line 499 is missing a valid `Authorization: Bearer <superAdminToken>` header with an authoritative `DeviceSession` payload. The route `/api/super-admin/billing/transactions/:id/pdf` requires active Super Admin session authentication.
- **Recommended Remediation in Milestone 7.1-B**:
  Update test setup in `purchase-transactions-ui-consistency.test.ts` to generate and attach a valid `superToken` with an active `DeviceSession` record, mirroring the session setup implemented in `sales-invoicing-modular.test.ts`.

---

## 3. RECOMMENDED ROADMAP FOR SUBSEQUENT MILESTONES

1. **Milestone 7.1-B: HR & Core System Test Runner Unification**:
   - Migrate Suites 11–14 (`hr-employee-*`)
   - Migrate Suites 22–25 (`settings-*`)
   - Fix line 499 in `purchase-transactions-ui-consistency.test.ts`
2. **Milestone 7.1-C: Security & Infrastructure Test Runner Unification**:
   - Migrate Suites 19–21 (`security-*`, `server-side-idempotency`)
   - Migrate Suites 26, 28 (`super-admin-authorization-guard`, `tenant-proxy-fail-closed`)
3. **Milestone 7.1-D: Integrations & Branding Test Runner Unification**:
   - Migrate Suites 9, 10 (`four-addons-*`, `google-workspace-tally-*`)
   - Migrate Suites 17, 27, 31 (`branding-*`)
