# MASTERHRMS — PUSH DEVICE REGISTRATION REPORT
**Phase 1 & Phase 2 Implementation & Verification**
**Standard: RFC 8291 / RFC 8292 Web Push Protocol**
**Date: 2026-11-05**

---

## 1. Executive Summary

This report documents the design, implementation, and empirical verification of multi-device push subscription registration and management across the MASTERHRMS platform. In accordance with strict enterprise requirements, subscriptions are isolated by tenant and user, with support for multi-device concurrent sessions (e.g. desktop and mobile), automatic device synchronization upon login/permission grant, and single-device revocation on logout.

---

## 2. Architecture & Data Model

### A. Subscription Schema
Push device registrations are handled via `PushSubscriptionStore` backed by `PushSubscriptionRecord`:
```typescript
interface PushSubscriptionRecord {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  platform: "Windows" | "macOS" | "Linux" | "Android" | "iOS" | "Unknown";
  userAgent?: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}
```

### B. Device Identity Generation & Deduplication
- **Device Fingerprint**: Generated from browser platform and user agent or stored in `localStorage.getItem("master_hrms_device_id")`.
- **Deduplication**: When a device resubscribes (e.g., renewed browser push token), existing registrations for the same `(tenantId, userId, deviceId)` are updated in place with `isActive: true` and the latest cryptographic keys (`p256dh`, `auth`), preventing stale duplicates.

---

## 3. Registration Lifecycle

### Flow Diagram
```
+-------------------------------------------------------------+
| Browser / Client                                            |
| 1. User grants Notification permission                      |
| 2. navigator.serviceWorker.register('/sw.js', {scope: '/'}) |
| 3. reg.pushManager.subscribe({ userVisibleOnly, VAPID })     |
| 4. POST /api/notifications/push/subscribe                   |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Backend / PushSubscriptionStore                             |
| 5. Authenticate JWT -> resolve tenantId & userId            |
| 6. Validate RFC 8291 subscription object                    |
| 7. Save / Update device record (tenant-isolated)             |
| 8. Return { success: true, deviceId, registeredCount }      |
+-------------------------------------------------------------+
```

---

## 4. Empirical Test Results

Empirical verification conducted via `scripts/verify_global_web_push_e2e.cjs` (Suite 2):

| Test Case | Description | Result | Details |
| :--- | :--- | :---: | :--- |
| **TC-REG-01** | Multi-Device Persistence | **PASS** | Registered Windows Chrome & Android Chrome for single user. Both active. |
| **TC-REG-02** | Cross-Tenant Scope Isolation | **PASS** | Query for Tenant B user from Tenant A scope returned strictly 0 records. |
| **TC-REG-03** | Single-Device Logout Revocation | **PASS** | Revoked Windows Chrome on logout; Android Chrome remained active. |
| **TC-REG-04** | Resubscription Key Update | **PASS** | Re-registering existing device ID updated token and keys without duplication. |

---

## 5. Client Auto-Sync Hook

In `src/context/incoming-call-context.tsx` and `CMS/src/context/incoming-call-context.tsx`:
```typescript
useEffect(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  const token = localStorage.getItem("hrms_auth_token");
  if (!token || Notification.permission !== "granted") return;

  // Auto-sync active device registration with backend
  navigator.serviceWorker.ready.then(async (reg) => {
    try {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const statusRes = await fetch("/api/notifications/push/status", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const statusData = await statusRes.json();
        if (statusData?.data?.vapidPublicKey) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(statusData.data.vapidPublicKey),
          });
        }
      }
      if (sub) {
        await fetch("/api/notifications/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub, platform: navigator.platform }),
        });
      }
    } catch (e) {
      console.warn("[PushSync] Device sync skipped:", e);
    }
  });
}, []);
```

---

## 6. Conclusion

Multi-device push registration is certified fully operational, supporting seamless background device tracking, strict tenant boundary enforcement, and independent lifecycle management.

