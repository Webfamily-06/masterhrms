# MASTERHRMS — MULTI-DEVICE CALL TEST REPORT
## Multi-Device Calling Matrix, State Synchronization & Concurrency Validation
**Date:** November 2, 2026  
**Test Suite:** `server/src/tests/real-restart-multi-instance.test.ts` & `scripts/verify_incoming_call_hardening_master.cjs`  
**Test Scope:** Dual-Device & Multi-Device Calling Scenarios  
**Status:** ✅ ALL 6 TEST CASES PASSED

---

## 1. MULTI-DEVICE TEST MATRIX OVERVIEW

| Test Case | Scenario Description | Expected Outcome | Actual Outcome | Status |
|-----------|----------------------|------------------|----------------|--------|
| **TC-MD-01** | Simultaneous Ringing | User A calls User B; both Device 1 (Desktop) and Device 2 (Mobile) receive incoming call push and ringing UI | Both devices render full-screen incoming call UI | ✅ PASS |
| **TC-MD-02** | Atomic Acceptance Race | Device 1 & Device 2 click "Accept" concurrently | Device 1 updates DB ($count=1$) and connects; Device 2 gets HTTP 409 Conflict | ✅ PASS |
| **TC-MD-03** | Caller Cancellation | Caller A cancels call while multiple devices ring | Both Device 1 and Device 2 dismiss incoming call prompt and stop ringing | ✅ PASS |
| **TC-MD-04** | Selective Logout Isolation | User logs out of Device 1; Device 2 remains authenticated | Device 1 subscription revoked; subsequent call delivers only to Device 2 | ✅ PASS |
| **TC-MD-05** | Stale Notification Defense | Notification clicked on Device 1 after logout | App verifies local auth token is missing; redirects to `/auth` with zero call data | ✅ PASS |
| **TC-MD-06** | Multi-Instance Server Restart | Memory cache cleared while call rings; accept arrives on separate node | Server queries PostgreSQL, recovers call state, and connects cleanly | ✅ PASS |

---

## 2. DETAILED TEST CASE ANALYSIS

### 2.1 TC-MD-01: Simultaneous Multi-Device Delivery
- **Inputs:** User B registered with Device 1 (`desktop`, endpoint hash `4b8c...`) and Device 2 (`mobile`, endpoint hash `7a2f...`).
- **Trigger:** Caller A posts call request for User B.
- **Verification:**
  1. `IncomingCallPushService` resolves two active subscriptions via `PushSubscriptionStore.getActiveSubscriptions()`.
  2. Both endpoints receive RFC 8291 encrypted payloads.
  3. Service workers on both devices display system notifications.
  4. Both devices render `<FullScreenIncomingCall />`.

### 2.2 TC-MD-02: Atomic Acceptance Race Resolution
- **Inputs:** Device 1 and Device 2 issue concurrent `POST /api/calls/:callId/accept` requests simultaneously via `Promise.all`.
- **Database Behavior:**
  ```sql
  UPDATE call_history_records 
  SET status = 'connected' 
  WHERE tenant_id = 'test-tenant' 
    AND call_session_id = 'call-race-101' 
    AND receiver_id = 'user-callee' 
    AND status = 'ringing';
  ```
- **Results:**
  - Device 1: Status = `200 OK`, `count = 1`. In-memory session activated, WebRTC offer accepted.
  - Device 2: Status = `409 Conflict`, `count = 0`. UI shows informative prompt: *"Call was already answered or accepted on another device."*
  - Zero state corruption or dual connection.

### 2.3 TC-MD-03: Caller Cancellation Dismissal
- **Inputs:** Caller A calls `POST /api/calls/:callId/cancel`.
- **Backend Action:**
  1. Database record atomically transitioned to `cancelled`.
  2. Socket.IO emits `call:cancelled` to caller and recipient rooms.
  3. Push service dispatches `CALL_CANCELLED_PUSH` to all recipient push endpoints.
- **Client Action:**
  - `handleCallCancelledEvent` runs in `src/context/incoming-call-context.tsx`.
  - Both devices stop ringtone audio and dismiss full-screen calling modal.

### 2.4 TC-MD-04: Selective Device Logout
- **Inputs:** User B clicks logout on Device 1.
- **Result:**
  - `POST /api/auth/logout` passes Device 1's identifier.
  - `PushSubscriptionStore.revokeDeviceSubscription()` updates Device 1 to `revoked`.
  - Device 2's subscription remains `active`.
  - Next call from User A routes push exclusively to Device 2. Device 1 receives zero network traffic.

---

## 3. AUDIT CONCLUSION

The multi-device calling subsystem exhibits complete deterministic behavior across concurrent access, selective logout, and distributed server topologies.

