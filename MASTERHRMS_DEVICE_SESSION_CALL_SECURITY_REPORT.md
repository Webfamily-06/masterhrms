# MASTERHRMS — DEVICE-LEVEL SESSION CALL SECURITY REPORT
## Multi-Device Ownership, Device-Specific Logout & Stale Push Remediation
**Date:** November 2, 2026  
**Module:** `server/src/services/push-subscription.store.ts` & `src/components/app-sidebar.tsx`  
**Security Standard:** Strict Per-Device Credential & Session Isolation  
**Evidence Directory:** `docs/Saas/screenshots/incoming-call-device-session/`  
**Status:** ✅ VERIFIED SECURE & ISOLATED

---

## 1. THREAT CONTEXT & SECURITY REQUIREMENTS

In an enterprise HRMS environment, employees routinely log in from multiple devices:
- Workstation desktop (Device 1).
- Personal or company smartphone (Device 2).

### Prior Vulnerabilities
1. **Shared Revocation:** Logging out from one device revoked all push subscriptions associated with the user ID, leaving other active devices unable to receive calls.
2. **Ghost Calls on Logged-Out Hardware:** When an employee signed out of a shared kiosk or public desktop, the service worker remained registered in the browser profile. A subsequent call alert would wake the browser and trigger call notifications to an unauthenticated party.

---

## 2. DEVICE-LEVEL SUBSCRIPTION DATA MODEL

The push subscription store (`server/src/services/push-subscription.store.ts`) was extended to attach device identifiers to every push endpoint:

```typescript
export interface StoredPushSubscription {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;              // Unique device identifier
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  platform: string;              // "desktop" | "mobile" | "pwa"
  sessionTokenId?: string;       // Bound auth session token
  status: "active" | "inactive" | "expired" | "revoked";
  createdAt: string;
  lastSeenAt?: string;
  revokedAt?: string;            // Timestamp of explicit device logout
}
```

---

## 3. LOGOUT ISOLATION PROTOCOL

### 3.1 Targeted Device Revocation (`revokeDeviceSubscription`)
When a user clicks "Log Out" on Device 1:
1. `src/components/app-sidebar.tsx` dispatches `POST /api/auth/logout` sending `{ deviceId, endpoint }`.
2. The server marks **only** Device 1's subscription record as `status: "revoked"`, recording `revokedAt: new Date().toISOString()`.
3. Device 2's subscription remains untouched with `status: "active"`.
4. When `getActiveSubscriptions(tenantId, userId)` runs for a new call:
   ```typescript
   return userSubs.filter((sub) => sub.status === "active" && !sub.revokedAt);
   ```
   Only Device 2 is returned. Push notifications are dispatched exclusively to Device 2.

### 3.2 Client-Side Token Cleanup
On Device 1, the client immediately wipes:
- `localStorage.removeItem("hrms_auth_token")`
- `localStorage.removeItem("auth_token")`
- `localStorage.removeItem("token")`
- `localStorage.removeItem("hrms_current_profile")`
- Dispatches `window.dispatchEvent(new CustomEvent("hrms:logout"))` to kill ringing audio and dismiss any visible call dialogs.

---

## 4. STALE NOTIFICATION DEFENSE

If an operating system displays a delayed push notification on Device 1 after logout:
1. In `public/sw.js`, clicking the notification launches the app with the call identifier.
2. In `src/context/incoming-call-context.tsx`, the `CALL_ACTION_NAVIGATE` handler checks for a valid local authentication token:
   ```typescript
   const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
   if (!token) {
     console.warn("[IncomingCallProvider] Stale notification clicked after logout; redirecting to login.");
     window.location.href = "/auth";
     return;
   }
   ```
3. The call overlay is blocked from rendering, the user is redirected to the `/auth` login screen, and no call data is leaked.

---

## 5. EMPIRICAL TEST EVIDENCE & SCREENSHOT RECORD

| Step | Artifact Filename | Verified Security Behavior |
|------|-------------------|----------------------------|
| 1 | `01-device1-and-device2-active-sessions.png` | Device 1 (desktop) and Device 2 (mobile) simultaneously registered for User B |
| 2 | `02-device1-logout-revocation.png` | User logs out on Device 1; Device 1 subscription marked revoked in store |
| 3 | `03-device2-call-delivered-active.png` | New call initiated by User A routes push exclusively to Device 2 |
| 4 | `04-stale-notification-post-logout-rejected.png` | Device 1 notification click intercepted; credentials absent; redirected to `/auth` |
| 5 | `05-concurrent-acceptance-409-conflict.png` | Concurrent acceptance attempt on secondary device receives HTTP 409 Conflict |

---

## 6. SECURITY CONCLUSION

MasterHRMS enforces strict per-device session isolation, preventing both collateral logout of active devices and unauthorized call access on decommissioned hardware.

