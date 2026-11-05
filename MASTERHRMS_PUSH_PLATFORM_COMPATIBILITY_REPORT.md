# MASTERHRMS — PUSH PLATFORM COMPATIBILITY REPORT
**Phase 5 Implementation & Verification**
**Operating System & Browser Compatibility Matrix**
**Date: 2026-11-05**

---

## 1. Executive Summary

This report establishes the platform compatibility profile for MASTERHRMS Web Push notifications across desktop and mobile operating systems and modern web browsers. Web Push relies on the W3C Push API and RFC 8291 / RFC 8292 standards.

---

## 2. Operating System & Browser Support Matrix

| Operating System | Browser | Push Transport | Native OS Notification Center | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Windows 10/11** | Google Chrome | FCM / Web Push | Windows Action Center / Toast | **Certified (Full)** |
| **Windows 10/11** | Microsoft Edge | Windows Push (WNS) / FCM | Windows Action Center / Toast | **Certified (Full)** |
| **Windows 10/11** | Mozilla Firefox | Mozilla Autopush | Windows Action Center / Toast | **Certified (Full)** |
| **macOS (Ventura+)** | Google Chrome | FCM / Web Push | macOS Notification Center | **Certified (Full)** |
| **macOS (Ventura+)** | Apple Safari 16+ | Apple Push Notification (APNs) | macOS Notification Center | **Certified (Full)** |
| **macOS (Ventura+)** | Mozilla Firefox | Mozilla Autopush | macOS Notification Center | **Certified (Full)** |
| **Linux (Ubuntu/Debian)** | Google Chrome | FCM / Web Push | Desktop Environment (libnotify/freedesktop) | **Certified (Full)** |
| **Linux (Ubuntu/Debian)** | Mozilla Firefox | Mozilla Autopush | Desktop Environment (libnotify/freedesktop) | **Certified (Full)** |
| **Android (10–14)** | Chrome Mobile | FCM / Web Push | Android Notification Drawer & Lock Screen | **Certified (Full)** |
| **iOS / iPadOS (16.4+)** | Safari (PWA) | APNs | iOS Notification Center (Home Screen PWA) | **Supported (PWA)** |

---

## 3. Delivery Capabilities Across Application States

| Application State | Chrome (Win/macOS/Linux) | Firefox | Edge | Android Chrome |
| :--- | :---: | :---: | :---: | :---: |
| **Tab Active & Focused** | In-app drawer + toast | In-app drawer + toast | In-app drawer + toast | In-app drawer + toast |
| **Tab in Background (Other tab active)** | Native OS Notification | Native OS Notification | Native OS Notification | Native OS Notification |
| **Browser Minimized** | Native OS Notification | Native OS Notification | Native OS Notification | Native OS Notification |
| **Navigated to Another Website** | Native OS Notification | Native OS Notification | Native OS Notification | Native OS Notification |
| **Browser Closed / Background Process** | Native OS Notification* | Depends on OS daemon | Native OS Notification* | Android Push Wakeup |

*\*Note on Windows/macOS background delivery*: Chrome and Edge can deliver push notifications while minimized or closed as long as background app execution (`chrome://settings/system` -> "Continue running background apps when Google Chrome is closed") is enabled by the user or enterprise group policy.

---

## 4. Operating System Notification Permissions & Policy

1. **Windows 11 Focus Assist / Do Not Disturb**:
   - Notifications delivered while Focus Assist is set to "Priority Only" or "Alarms Only" are queued in the Windows Action Center without an intrusive popup.
2. **macOS Notification Permissions**:
   - macOS requires Chrome/Edge/Safari to have System Notification permission enabled in `System Settings -> Notifications -> Google Chrome`.
3. **Android Notification Channels**:
   - In Android 13+, explicit runtime permission `POST_NOTIFICATIONS` is required by the browser; once granted, push events wake the device radio and render notifications in the status bar.

---

## 5. Fallback Mechanisms

When Web Push is unsupported or permission is denied by the user:
1. **Realtime WebSocket Transport**: Active tabs continue receiving live alerts via Socket.IO.
2. **Pusher Private Channels**: Provides resilient fallback when corporate firewalls restrict long-lived WebSockets.
3. **In-App Persistent Drawer**: Unread notifications are stored in the database and retrieved via REST API (`/api/notifications`), ensuring zero lost alerts.

---

## 6. Conclusion

MASTERHRMS Web Push architecture strictly complies with standard RFC 8291 / RFC 8292 specifications, ensuring cross-platform delivery across all tier-one operating systems and browsers.

