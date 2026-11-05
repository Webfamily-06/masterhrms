# MASTERHRMS — PUSH SERVICE WORKER REPORT
**Phase 4 & Phase 7 Implementation & Verification**
**Root-Scoped Service Worker: /sw.js**
**Date: 2026-11-05**

---

## 1. Executive Summary

This report documents the architecture, lifecycle, and verification of the MASTERHRMS Service Worker (`/sw.js`), which runs at root scope (`/`) to provide persistent background push handling, in-app suppression when tabs are active, OS notification display when tabs are hidden or closed, and intelligent role-aware routing upon notification click.

The service worker is maintained at 100% bit-for-bit SHA-256 parity between the TanStack workspace (`public/sw.js`) and CMS Next.js workspace (`CMS/public/sw.js`).

---

## 2. Service Worker Registration & Scope

- **File Path**: `/sw.js` (served with `Content-Type: application/javascript`)
- **Scope**: `/` (controls all routes across `/hr/*`, `/me/*`, `/tenant/*`, `/super/*`, `/chat`, and `/apps/*`)
- **Parity Hash**: `35DB48EAFDBB110BFADFE27C5398A1E14FE86870C5F42863D257F8088CFFD8B0` (Identical between `public/` and `CMS/public/`)

---

## 3. Background Push Event Flow

### Algorithm
```
onpush event received
       |
       v
Parse push data payload (JSON)
       |
       v
Query self.clients.matchAll({ type: 'window', includeUncontrolled: true })
       |
       +---> Forward message to open client tabs (for in-app badge/drawer sync)
       |
       v
Check if any client window is currently focused:
       |
       +--- YES (Tab is active and focused) ---> Tab Sonner toast handles alert;
       |                                         suppress OS notification or renotify.
       |
       +--- NO (Tab is hidden, minimized, on another site, or closed)
              |
              v
       self.registration.showNotification(title, {
         body: payload.body,
         icon: payload.icon || '/assets/img/logo-small.svg',
         badge: payload.badge || '/assets/img/logo-small.svg',
         tag: payload.tag || 'general-notification',
         renotify: true,
         data: payload.data || { actionUrl: payload.actionUrl },
         requireInteraction: payload.type === 'CALL'
       })
```

---

## 4. Notification Click & Role-Aware Routing

When the user clicks a notification in the Windows Action Center, macOS Notification Center, Linux Notification Daemon, or Android notification shade:

```javascript
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.actionUrl || data.url || data.linkTo || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 1. If a matching tab is already open, focus it and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && targetUrl !== "/") {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // 2. Otherwise open a new window at the target route
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

### Supported Role-Aware Route Targets:
- **HR Administrator**: `/hr/leave-requests`, `/hr/attendance`, `/hr/payroll`
- **Employee ESS**: `/me/leave`, `/me/attendance`, `/me/payslips`
- **Tenant Management**: `/tenant/billing`, `/tenant/settings`, `/tenant/users`
- **Super Administrator**: `/super/tenants`, `/super/subscriptions`, `/super/transactions`
- **Realtime Chat & Calling**: `/chat?threadId=...`, `/chat?callId=...`

---

## 5. Empirical Verification Results

Tested using Playwright Chromium with real Service Worker registration (`scripts/verify_global_web_push_e2e.cjs` Suite 4):

| Test Case | Description | Verification Criterion | Status |
| :--- | :--- | :--- | :---: |
| **SW-01** | Service Worker Registration | Scope resolves to `http://localhost:PORT/` | **PASS** |
| **SW-02** | Push Manager Support | `pushManager in registration` evaluates to `true` | **PASS** |
| **SW-03** | Background Notification Display | `showNotification` creates active notification entry | **PASS** |
| **SW-04** | Role-Aware Click Navigation | Notification click extracts and navigates to target route | **PASS** |
| **SW-05** | Hidden Tab Inactivity Detection | Tab hidden (`visibilityState === 'hidden'`) delivers OS notification | **PASS** |

---

## 6. Conclusion

The service worker provides production-grade background push listening, intelligent suppression for focused tabs, robust OS alert presentation for background tabs, and role-aware navigation.

