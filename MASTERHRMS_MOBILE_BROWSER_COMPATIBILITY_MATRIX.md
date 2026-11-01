# MASTERHRMS — MOBILE & DESKTOP BROWSER COMPATIBILITY MATRIX
## Technical Capability, Web Push, WebRTC & Picture-in-Picture Evaluation
**Date:** November 2, 2026  
**Scope:** Mobile Browsers, Desktop Browsers & Installed PWAs  
**Standards Evaluated:** Web Push (W3C), WebRTC 1.0, Document Picture-in-Picture (W3C), Web Audio API

---

## 1. COMPREHENSIVE COMPATIBILITY MATRIX

| Feature / Capability | Android Chrome | Android Samsung Internet | iOS Safari (v16.4+ PWA) | iOS Safari (Web Tab) | Desktop Chrome / Edge | Desktop Safari (v16+) | Desktop Firefox |
|----------------------|:--------------:|:------------------------:|:-----------------------:|:--------------------:|:---------------------:|:---------------------:|:---------------:|
| **Web Push API** | ✅ Yes | ✅ Yes | ✅ Yes (PWA installed) | ⚠️ Notification API only | ✅ Yes | ✅ Yes | ✅ Yes |
| **SW Background Wakeup** | ✅ Yes | ✅ Yes | ✅ Yes (PWA installed) | ❌ No (OS restriction) | ✅ Yes | ✅ Yes | ✅ Yes |
| **Web Audio Ringtone** | ✅ Yes (Touch unlocked) | ✅ Yes (Touch unlocked) | ✅ Yes (Touch unlocked) | ✅ Yes (Touch unlocked) | ✅ Yes | ✅ Yes | ✅ Yes |
| **WebRTC Audio/Video** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Document PiP API** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes (Chrome v111+) | ❌ No | ❌ No |
| **Video Element PiP** | ✅ Yes | ✅ Yes | ✅ Yes (WebKit mode) | ✅ Yes (WebKit mode) | ✅ Yes | ✅ Yes | ✅ Yes |
| **In-App Floating Mini-Call** | ✅ Yes (Full control) | ✅ Yes (Full control) | ✅ Yes (Full control) | ✅ Yes (Full control) | ✅ Yes (Full control) | ✅ Yes (Full control) | ✅ Yes (Full control) |
| **Route Navigation Continuity** | ✅ Yes (SPA) | ✅ Yes (SPA) | ✅ Yes (SPA) | ✅ Yes (SPA) | ✅ Yes (SPA) | ✅ Yes (SPA) | ✅ Yes (SPA) |

---

## 2. PLATFORM-SPECIFIC REALITIES & ARCHITECTURAL MITIGATIONS

### 2.1 Apple iOS / iPadOS
- **Web Push Behavior:** Apple introduced Web Push support in iOS 16.4 exclusively for web apps added to the Home Screen (installed PWA) via Apple Push Notification service (APNs). In regular Safari browser tabs, notifications cannot wake closed tabs.
- **MasterHRMS Mitigation:**
  - MasterHRMS includes a complete PWA Web Manifest (`manifest.json`) and service worker configuration.
  - When accessed via Safari mobile browser, the app displays an "Add to Home Screen" guidance pill to enable full closed-tab APNs wakeups.
  - For active foreground and background tabs, Socket.IO and Pusher deliver real-time ringing events.

### 2.2 Document Picture-in-Picture vs Mobile Picture-in-Picture
- **Industry Constraint:** The W3C Document Picture-in-Picture API (`window.documentPictureInPicture`) is only supported on Chromium desktop browsers (v111+). Neither Android nor iOS allows web applications to spawn floating HTML windows above native OS apps.
- **MasterHRMS Mitigation:**
  - **Tier 1 (Desktop Chromium):** Full `documentPictureInPicture` window with interactive controls.
  - **Tier 2 (Mobile Video Tracks):** `HTMLVideoElement.requestPictureInPicture()` enables OS-level video overlay when user leaves the browser.
  - **Tier 3 (Universal In-App Guarantee):** `FloatingMiniCallWidget` maintains a persistent floating card across all internal page navigations (`/chat`, `/me/dashboard`, `/hr/payroll`, `/calendar`), providing full mute, duration timer, maximize, and end-call controls.

### 2.3 Web Audio API Autoplay Restrictions
- **Constraint:** Modern browsers block audio playback until user interaction has occurred on the page.
- **MasterHRMS Mitigation:**
  - `RingtonePlayer` instantiates the `AudioContext` lazily.
  - If `ctx.state === "suspended"`, it attempts `ctx.resume()` on user click/interaction.
  - System push notifications and visual full-screen dialogs display immediately regardless of audio permission.

---

## 3. RECOMMENDED PRODUCTION CONFIGURATION

1. **Desktop Users:** Chrome 111+, Edge 111+, Safari 16+, Firefox 115+.
2. **Android Users:** Chrome 110+ or Samsung Internet; allow notification permissions in system settings.
3. **iOS Users:** iOS 16.4+; install app to Home Screen via Safari "Share $\to$ Add to Home Screen" for background closed-tab delivery.

