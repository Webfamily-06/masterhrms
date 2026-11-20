# MASTERHRMS — FREE TRIAL PLAN & DEMO WORKSPACE DESIGN SPECIFICATION

## 1. Executive Summary

This architecture specification details the design, entitlement lifecycle, quota enforcement, and synthetic demo workspace isolation strategy for the **MASTERHRMS** SaaS platform.

Under the self-service SaaS customer journey, every newly provisioned organization receives an automated **14-day Free Trial Plan** with standard enterprise operational quotas, full modular access, and server-authoritative expiration checking. Synthetic demo workspaces operate in complete data and tenant isolation to prevent pollution of production and default tenant environments.

---

## 2. 14-Day Free Trial Architecture

### 2.1 Subscription State Model
The `TenantSubscription` entity maintains the authoritative state of the customer's subscription:
- **Table**: `tenant_subscriptions`
- **Initial Status**: `"trialing"`
- **Timestamps**:
  - `trialStartedAt`: Timestamp of tenant verification / activation (`NOW()`).
  - `trialEndsAt`: Exactly 14 days from activation (`NOW() + INTERVAL '14 days'`).
  - `expiresAt`: Mirrored to `trialEndsAt` to ensure unified expiration evaluation.

### 2.2 Default Free Trial Quotas & Limits
During the 14-day trial window, organizations are provisioned with standard resource caps configured to facilitate comprehensive evaluation without incurring platform infrastructure abuse:

| Resource Dimension | Free Trial Allocation | Production Sovereign Allocation |
|---|---|---|
| **Max Employees** | 25 Active Employees | Unlimited / Custom Tier |
| **Max Platform Users** | 5 Concurrent Administrators | Unlimited / Custom Tier |
| **Storage Capacity** | 10 GB Secure Cloud Storage | 100 GB – 1 TB |
| **Core Modules** | 100% Unlocked (HR, Payroll, Workspace, Compliance) | 100% Unlocked |
| **Premium Add-on Modules** | Standard Evaluation Access | Licensed per Subscription |

### 2.3 Server-Side Expiration Enforcement
Client-side timers or browser timestamps are strictly non-authoritative. Subscription status and operational authorization are enforced server-side:
```typescript
export function isSubscriptionActive(subscription: TenantSubscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === "active") return true;
  if (subscription.status === "trialing" || subscription.status === "trial") {
    const now = Date.now();
    const expiry = new Date(subscription.trialEndsAt || subscription.expiresAt).getTime();
    return expiry > now;
  }
  return false;
}
```
When a trial expires:
1. `GET /api/auth/me` updates the returned subscription state to `status: "expired"`.
2. Middleware (`requireAuth`, `assertWorkspaceActive`) intercepts mutating API requests with HTTP 402 (`code: "SUBSCRIPTION_EXPIRED"`).
3. The Tenant Portal transitions into read-only administrative mode with upgrade callouts to the Subscription & Billing portal (`/tenant/subscription-and-billing`).

---

## 3. Synthetic Demo Workspace Strategy

### 3.1 Purpose & Boundary Separation
The platform provides prospective enterprise buyers and evaluators with a fully populated **Demo Workspace** simulating a live 50-person enterprise environment.

To maintain strict security and isolation boundaries:
1. **Isolated Tenant Identity**: Demo workspaces possess a distinct UUID and dedicated slug (e.g., `demo-synthetic-...` or `demo`).
2. **Never Mutates Default Tenant**: The platform default tenant (`tenant-default-001`, `master`) is protected and remains untouched.
3. **Synthetic Persona Seeding**: Demo data consists strictly of synthetic, anonymized employee records, realistic shift assignments, sample payroll runs, and mock document templates.
4. **Isolated Device Sessions**: Users evaluating the demo workspace are issued tokens bound exclusively to the demo tenant ID, preventing cross-tenant leakage.

---

## 4. Test Verification Evidence

The test suite validates trial duration calculation, quota persistence, and server clock evaluation:

| Test ID | Assertion | Expected Result | Actual Result |
|---|---|---|---|
| `PLAN-001.1` | Status initialized to `"trialing"` | `"trialing"` | **"trialing" (PASSED)** |
| `PLAN-001.2` | Duration window | Exactly 14 days | **14 Days (PASSED)** |
| `PLAN-001.3` | Employee quota allocation | 25 | **25 (PASSED)** |
| `PLAN-001.4` | User administrative quota | 5 | **5 (PASSED)** |
| `PLAN-001.5` | Storage limit allocation | 10 GB | **10 GB (PASSED)** |
| `PLAN-002` | Server-authoritative expiration check | Expired status detected | **Expired (PASSED)** |
| `DEMO-001` | Demo workspace tenant isolation | Distinct from `tenant-default-001` | **Isolated (PASSED)** |
