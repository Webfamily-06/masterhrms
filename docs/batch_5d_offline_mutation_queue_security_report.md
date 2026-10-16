# MasterHRMS — Batch 5D: Offline Mutation Queue Security and Tenant Isolation Audit & Remediation Report

**Date:** October 16, 2026  
**Auditor / Engineer:** Software Architecture & Application Security Review  
**Branch:** `main`  
**Scope:** `src/lib/web-apis/network-status.ts`, `src/lib/web-apis/types.ts`, `src/lib/api.ts`, `src/components/system-states/offline-banner.tsx`, `src/tests/offline-mutation-queue-security.test.ts`  
**Batch Status:** **COMPLETED** (Development & Automated Verification Phase)  
**Production Release Status:** **STRICTLY BLOCKED** (Production release gate remains blocked until end-to-end statutory compliance audits are complete)

---

## 1. Executive Summary

During Batch 5C (Controlled PWA Service Worker Implementation), the offline mutation queue `hrms_offline_action_queue` was audited and identified as **not production-safe**. The legacy implementation stored arbitrary unpartitioned mutations in browser `localStorage` and unconditionally executed raw, unauthenticated `fetch` calls upon reconnecting to the network, without tenant isolation, user boundary enforcement, session validity checks, or idempotency keys.

In **Batch 5D**, we executed a focused security audit and architectural remediation:
1. **Tenant & User Partitioning:** Eliminated the global unpartitioned storage key. Partitioned storage keys under `hrms_offline_queue_${tenantId}_${userId}`.
2. **Deterministic Session & Logout Lifecycle:** Implemented explicit quarantining of pending actions upon logout or session change (`hrms_offline_quarantine_${tenantId}_${userId}`) and added proactive event notifications (`hrms:offline-queue-session-invalidated`, `hrms:offline-queue-auth-error`).
3. **Mandatory Server-Side Authentication & Authorization at Replay:** Bound Bearer tokens, tenant identity, user identity, and deterministic `X-Idempotency-Key` headers to every replayed request. Replay immediately halts on HTTP 401 Unauthorized, and quarantines items on HTTP 403 Forbidden / Tenant Host Mismatch.
4. **Strict Mutation Allowlist & Sensitive Data Exclusion:** Prohibited all payroll, statutory, salary, disbursement, banking, authentication, credential, and administrative mutations from being buffered offline. Added recursive payload scanning for sensitive attributes.
5. **Empirical Verification:** Created 15 focused automated test scenarios in `src/tests/offline-mutation-queue-security.test.ts` (**15/15 passed**), verified all 10 frontend test suites (**127/127 passed**), confirmed root TypeScript (`tsc --noEmit` exit code 0), confirmed server TypeScript (`tsc --noEmit` exit code 0), and confirmed production build (`npm run build` exit code 0).

---

## 2. Before-State Audit & Vulnerability Findings

### Affected Legacy Code Paths
- `src/lib/web-apis/network-status.ts`:
  - `OfflineQueueManager.getQueue()`
  - `OfflineQueueManager.enqueue()`
  - `OfflineQueueManager.dequeue()`
  - `OfflineQueueManager.clear()`
  - `OfflineQueueManager.replayQueue()`
  - `useOfflineQueue()`
- `src/lib/api.ts`:
  - `clearToken()`: Logout omitted offline queue state invalidation.
- Storage: Browser `localStorage` under `hrms_offline_action_queue`.

### Before-State Findings Table

| Vulnerability ID | Description | Root Cause | Impact | Severity |
| :--- | :--- | :--- | :--- | :---: |
| **VULN-5D-01** | **Cross-Tenant Mutation Replay** | Single global storage key `hrms_offline_action_queue` without tenant ID tagging. | Mutations queued by User A (Tenant 1) execute against Tenant 2 if User B logs into the same browser before network reconnection. | **CRITICAL** |
| **VULN-5D-02** | **Cross-User Privilege Escalation** | No user identity or role tagging in queued items. | An employee's queued draft could be executed under an administrator's high-privilege session upon browser reconnect. | **CRITICAL** |
| **VULN-5D-03** | **Unauthenticated / Ambient Replay** | `replayQueue()` called raw `fetch(item.endpoint)` with only `{"Content-Type": "application/json"}` and no Bearer token. | Server rejected requests or ambient cookies were abused without validating active session validity. | **HIGH** |
| **VULN-5D-04** | **Unrestricted Endpoint Enqueueing** | `enqueue()` accepted any URL without restriction. | Financial, statutory, payroll, salary, or auth endpoints could be buffered into unencrypted browser storage. | **HIGH** |
| **VULN-5D-05** | **Sensitive Payload Storage Exposure** | `payload` was stored unencrypted in `localStorage`. | Potential leakage of sensitive PII, bank accounts, or credentials via XSS or physical device access. | **HIGH** |
| **VULN-5D-06** | **Missing Idempotency Controls** | Replayed requests did not transmit `X-Idempotency-Key`. | Network drops during replay could trigger duplicate creation of business records. | **MEDIUM** |
| **VULN-5D-07** | **Infinite Error Loops** | `attempts += 1` on all errors without discriminating 400/401/403. | Permanent client validation or auth errors retried endlessly on every online event. | **MEDIUM** |
| **VULN-5D-08** | **Session Logout Blindness** | `clearToken()` in `src/lib/api.ts` only cleared auth tokens. | Orphaned queue items persisted in the browser across logout and account switches. | **CRITICAL** |

---

## 3. Exact Files Modified

1. **`src/lib/web-apis/types.ts`**:
   - Expanded `QueuedOfflineAction<T>` interface to include:
     - `maxAttempts?: number`
     - `status: "pending" | "syncing" | "failed" | "quarantined"`
     - `tenantId: string`
     - `userId: string`
     - `idempotencyKey: string`
     - `lastError?: string`
     - `errorStatus?: number`

2. **`src/lib/web-apis/network-status.ts`**:
   - Implemented tenant- and user-partitioned storage keys: `hrms_offline_queue_${tenantId}_${userId}`.
   - Implemented quarantine storage partition: `hrms_offline_quarantine_${tenantId}_${userId}`.
   - Added `isActionPermitted(endpoint, payload)` enforcing strict allowlist and sensitive payload exclusion.
   - Added automatic legacy queue purging (`hrms_offline_action_queue`).
   - Hardened `OfflineQueueManager.enqueue()`: enforces authentication context, checks endpoint eligibility, generates deterministic UUID idempotency keys.
   - Hardened `OfflineQueueManager.replayQueue()`:
     - Verifies active session at replay time.
     - Validates tenant/user match per item (Invariant 3).
     - Injects `Authorization: Bearer <token>`, `X-Idempotency-Key`, `X-Offline-Queued-At`, `X-Offline-Attempt`.
     - Handles 401 Unauthorized: halts replay immediately, marks item failed, dispatches `hrms:offline-queue-auth-error`.
     - Handles 403 Forbidden / TENANT_HOST_MISMATCH: quarantines item, dispatches auth error.
     - Handles 400/409/422 permanent client errors: quarantines item, dispatches `hrms:offline-queue-permanent-error`.
     - Handles 5xx / network errors: increments attempts, quarantines after 3 attempts.
   - Added `OfflineQueueManager.handleLogout()` and `handleSessionChange()`.
   - Enhanced `useOfflineQueue()` to expose `quarantined`, `quarantinedCount`, and `clearQuarantine()`.

3. **`src/lib/api.ts`**:
   - Updated `clearToken()` to dispatch `hrms:auth-logout` with tenant and user context prior to token removal, allowing deterministic queue quarantine.

4. **`src/components/system-states/offline-banner.tsx`**:
   - Added listeners for `hrms:offline-queue-auth-error`, `hrms:offline-queue-session-invalidated`, and `hrms:offline-queue-permanent-error` to deliver clear toast alerts to users.

5. **`src/tests/offline-mutation-queue-security.test.ts`**:
   - Created comprehensive automated test suite covering all 15 required security scenarios.

---

## 4. Security Invariants Verification Matrix

| # | Security Invariant | Implementation Mechanism | Verification Result |
| :-: | :--- | :--- | :---: |
| **1** | Every replayed mutation must be authenticated and authorized by the server at replay time. | Injects `Authorization: Bearer <activeToken>` from `getActiveSession()` on every fetch call; checks server HTTP status. | **PASS** |
| **2** | Tenant identity must come from trusted server-side authentication, not client-controlled metadata. | Replay requires active server JWT token; server `requireAuth` extracts `tenantId` from verified token and enforces host matching. | **PASS** |
| **3** | A mutation created by one user/tenant must never execute under another user/tenant. | Partitioned storage key `hrms_offline_queue_${tenantId}_${userId}` plus runtime assertion: `item.tenantId === session.tenantId && item.userId === session.userId`. | **PASS** |
| **4** | Logout, account switching, and tenant switching must trigger deterministic queue handling. | `clearToken()` triggers `OfflineQueueManager.handleLogout()`, archiving active items to quarantine archive and resetting queue count. | **PASS** |
| **5** | Expired sessions, revoked permissions, disabled accounts, and inaccessible tenants must not permit replay. | Server returns 401 or 403. Replay halts on 401 and quarantines on 403; no silent execution permitted. | **PASS** |
| **6** | A failed or unauthorized mutation must not be silently treated as successful. | Returns accurate `{ synced, failed }` metrics; dispatches error events; failed items retained in quarantine with error reason. | **PASS** |
| **7** | Retries must not produce duplicate business operations where idempotency can be enforced. | `X-Idempotency-Key` attached to every replay; identical key preserved across all retries. | **PASS** |
| **8** | Queue storage must not be treated as a secure vault. Credentials and sensitive payloads excluded. | Deny-first regex for payroll, statutory, salary, banking, auth; recursive scan rejects payloads with passwords, tokens, salaries, cards, or tax IDs. | **PASS** |
| **9** | If an action cannot be replayed safely, disable offline queuing for that action. | Whitelist policy restricts queuing to low-risk operational mutations (`/api/attendance/clock-in`, notes, tasks, telemetry). Others throw immediately. | **PASS** |
| **10** | Do not silently discard pending actions. Provide explicit, understandable user-facing outcome. | Actions moved to quarantine partitions (`hrms_offline_quarantine_${tenantId}_${userId}`) with user-facing toast alerts and quarantine inspection API. | **PASS** |

---

## 5. Queue Behavior During Session Transitions

```
[User A Offline Action]
         │
         ▼
[isActionPermitted() Check] ──(Disallowed: Payroll / Statutory / Auth)──► Throws Error
         │ (Permitted: Attendance / Task)
         ▼
[Partition Storage: hrms_offline_queue_${tenantA}_${userA}]
         │
         ├──► [Online Event Occurs] ──► [Verify session === tenantA/userA] ──► [Fetch + Bearer + Idempotency] ──► [Success: Dequeue]
         │                                                                 └──► [401/403/409: Quarantine & Alert]
         │
         └──► [User A Logs Out (clearToken)]
                     │
                     ▼
             [handleLogout()]
                     │
                     ├──► Items moved to [hrms_offline_quarantine_${tenantA}_${userA}]
                     ├──► Active queue [hrms_offline_queue_${tenantA}_${userA}] cleared
                     └──► Event: hrms:offline-queue-session-invalidated
                                 │
                                 ▼
                     [User B Logs In (Tenant B / User B)]
                     Active Queue: hrms_offline_queue_${tenantB}_${userB} (0 items)
                     User A's items are 100% inaccessible and cannot execute.
```

---

## 6. Sensitive Data Handling and Allowlist Policy

### Permitted Allowlist (Low-risk Operational Mutations)
- `^/api/attendance/(clock-in|clock-out|punch)` (Employee attendance buffering)
- `^/api/notes(/.*)?$` (Draft notes)
- `^/api/tasks(/.*)?$` (Task completion check-offs)
- `^/api/feedback(/.*)?$` (Operational feedback)
- `^/api/telemetry(/.*)?$` (Client telemetry)

### Prohibited Sensitive Denylist (Strictly Blocked)
- `/payroll/*`, `/payslip/*` (Payroll calculations, pay runs, payslip generation)
- `/statutory/*`, `/tax/*` (EPF, ESI, TDS, Form 16, Form 24Q, statutory compliance)
- `/salary/*`, `/salaries/*` (Salary structures, disbursements, increments)
- `/disbursement/*`, `/banking/*`, `/payments/*`, `/checkout/*`, `/billing/*` (Financial transactions)
- `/auth/*`, `/login`, `/register`, `/password/*`, `/token/*`, `/2fa/*`, `/mfa/*` (Credentials)
- `/users/*`, `/roles/*`, `/permissions/*` (Privilege management)
- `/settings/*`, `/security/*`, `/audit-log/*` (System configuration)
- `/leaves/(approve|reject)` (Statutory leave ledger impact)

### Prohibited Payload Attributes
Any JSON payload containing keys matching: `password`, `token`, `secret`, `creditcard`, `cvv`, `bankaccount`, `accountnumber`, `pan`, `pannumber`, `aadhaar`, `aadhaarnumber`, `ssn`, `salary`, `amount`, `bonus`.

---

## 7. Test Matrix & Empirical Results

### Focused Offline Queue Security Suite (`src/tests/offline-mutation-queue-security.test.ts`)

| Test # | Test Scenario | Expected Outcome | Actual Result |
| :---: | :--- | :--- | :---: |
| **1** | Queue creation and safe persistence | Partitioned storage key, generated idempotency key, pending status | **PASS** |
| **2** | Replay with original valid session | Transmits Bearer token, idempotency key, dequeues on 200 OK | **PASS** |
| **3** | Logout followed by another user login | Quarantines actions on logout; Bob's session sees 0 items | **PASS** |
| **4** | Tenant A queue followed by Tenant B login | Tenant B cannot see or execute Tenant A's queued actions | **PASS** |
| **5** | Tenant switching before network recovery | Preserves Tenant A actions; Tenant B replay executes nothing | **PASS** |
| **6** | Expired / revoked session (401) | Halts replay sequence immediately; dispatches auth error | **PASS** |
| **7** | Revoked permissions (403) | Quarantines item with reason; dispatches auth error | **PASS** |
| **8** | Server-side TENANT_HOST_MISMATCH error | Quarantines item with workspace mismatch error | **PASS** |
| **9** | Segregation of 401 vs 403 responses | 401 retains item for login; 403 quarantines invalid item | **PASS** |
| **10** | Network timeout and transient retry | Increments attempts; quarantines only after 3 failed attempts | **PASS** |
| **11** | Duplicate replay and idempotency | Transmits stable `X-Idempotency-Key` across all retries | **PASS** |
| **12** | Permanent validation errors (400/409/422) | Quarantines permanent errors; dispatches error event | **PASS** |
| **13** | Queue cleanup and recovery | Clears active queue; supports quarantine inspection and cleanup | **PASS** |
| **14** | Sensitive payload & endpoint exclusion | Rejects payroll, statutory, salary, auth, and sensitive payloads | **PASS** |
| **15** | Unauthenticated queuing rejection | Throws error when attempting to queue offline without session | **PASS** |

**Summary: 15 / 15 tests passed (100%) in 9ms.**

---

### Verification Commands & Results

| Verification Gate | Command | Exit Code | Result | Details |
| :--- | :--- | :---: | :---: | :--- |
| **Root TypeScript Check** | `npx tsc --noEmit` | **0** | **PASS** | Zero type errors across frontend application. |
| **Server TypeScript Check** | `cd server && npx tsc --noEmit` | **0** | **PASS** | Zero type errors across backend application. |
| **Offline Security Suite** | `npx vitest run src/tests/offline-mutation-queue-security.test.ts` | **0** | **PASS** | 15 / 15 tests passed. |
| **Full Frontend Vitest Suite** | `npx vitest run src/tests/*.test.ts` | **0** | **PASS** | 10 / 10 suites passed (**127 / 127 tests passed**). |
| **Production Build** | `npm run build` | **0** | **PASS** | Built in 16.64s; client & SSR bundles generated cleanly. |

---

## 8. Remaining Limitations & Blockers

1. **Browser In-Memory Storage in Private/Incognito Tabs:** If browser storage is disabled or blocked in strict private browsing modes, mutations are held in memory and will not survive tab termination.
2. **Clock-In Time Drift:** While attendance punches record client timestamp at capture (`X-Offline-Queued-At`), backend attendance services must evaluate allowable grace windows for offline shift check-ins against tenant attendance policies.
3. **No Direct Background Sync API:** Web Background Sync API is currently not implemented (to avoid service worker complexity and background permission issues). Synchronization relies on foreground `online` event or explicit retry in `OfflineBanner`.

---

## 9. Requirement Status Table

| Requirement | Scope | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Stage 1: Implementation Audit** | Inspect queue, lifecycle, session, auth, sw.js | **COMPLETED** | Documented in Section 2 with vulnerability table. |
| **Stage 2: Security Invariants** | Invariants 1–10 established | **COMPLETED** | Formally defined and verified in Section 4. |
| **Stage 3: Remediation** | Partitioning, allowlist, auth headers, logout quarantine | **COMPLETED** | Implemented across `network-status.ts`, `types.ts`, `api.ts`. |
| **Stage 4: Automated Tests** | 15 security scenarios | **COMPLETED** | Verified in `offline-mutation-queue-security.test.ts`. |
| **Stage 5: Verification** | TypeScript, build, Vitest regression suite | **COMPLETED** | 100% pass across all verification gates. |
| **Stage 6: Completion Report** | Documentation of audit and findings | **COMPLETED** | Saved to `docs/batch_5d_offline_mutation_queue_security_report.md`. |

---

## 10. Release Recommendation

**Recommendation for Batch 5D:** **ACCEPT REMEDIATION INTO DEVELOPMENT TRUNK**.

The critical security risks associated with the offline mutation queue (`hrms_offline_action_queue` unpartitioned storage, cross-tenant replay, privilege escalation, and sensitive payroll buffer exposure) have been eliminated.

**Production Deployment Gate:** **STRICTLY BLOCKED**. Production release remains blocked pending completion of all scheduled MasterHRMS audit milestones and final release sign-off.
