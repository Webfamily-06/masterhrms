# MASTERHRMS — INCOMING CALL BROWSER COMPATIBILITY MATRIX
## Platform & Browser Support Analysis: Web Push, WebRTC, Service Worker, Audio Synthesis & Fallback Strategies

**Document ID:** `MH-BCM-2026-001`  
**Classification:** Quality Assurance & Cross-Browser Specification  
**Status:** Approved & Verified  
**Date:** November 2026  

---

## 1. Supported Platform Matrix

| Platform / Browser | Web Push (Closed Tab) | Service Worker (Background) | Foreground Overlay | WebRTC Audio/Video | AudioContext Ringtone | Support Tier |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Google Chrome (Desktop)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Tier 1 (Full Parity) |
| **Microsoft Edge (Desktop)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Tier 1 (Full Parity) |
| **Mozilla Firefox (Desktop)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Tier 1 (Full Parity) |
| **Apple Safari (macOS 16+)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Tier 1 (Full Parity) |
| **Chrome for Android** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Tier 1 (Full Parity) |
| **Safari for iOS (16.4+ PWA)**| ✅ Yes* | ✅ Yes* | ✅ Yes | ✅ Yes | ✅ Yes | Tier 2 (PWA Add-to-Home required for closed tab push) |
| **iOS Web Browsers (Tabs)** | ⚠️ Foregr. only | ⚠️ Foregr. only | ✅ Yes | ✅ Yes | ✅ Yes | Tier 2 (Standard iOS WebKit policy) |

*\* Note on iOS: Apple Web Push requires the user to add the SaaS app to the home screen ("Add to Home Screen") per Apple WebKit security requirements introduced in iOS 16.4.*

---

## 2. API Feature Capability Breakdown

### 2.1 Web Push & Notification API

- **`requireInteraction: true`:**
  - Supported: Chrome, Edge, Opera, Vivaldi, Firefox (Desktop).
  - Keeps the notification visible indefinitely until the user accepts, declines, or the caller hangs up.
  - Fallback: On platforms where `requireInteraction` is ignored (e.g., standard macOS system banners), the notification sound and vibration pattern alert the user, and the notification stays in the OS Notification Center.

- **Vibration API (`navigator.vibrate`):**
  - Pattern: `[500, 250, 500, 250, 500, 250, 500, 250, 500]`
  - Supported: Android Chrome, Android Firefox, Android Edge.
  - Ignored gracefully without errors on desktop and iOS Safari.

- **Notification Action Buttons (`actions: [{ action: "accept" }, { action: "reject" }]`):**
  - Supported: Desktop Chrome, Edge, Firefox, Android Chrome.
  - Enables direct one-click answering or declining right from the system notification banner.

---

## 3. Web Audio Autoplay Policy & Ringtone Resilience

Modern browsers enforce strict Autoplay Policies that block audio synthesis prior to a user gesture:

1. **Foreground Tab:** When User B has already interacted with the MasterHRMS tab (clicked anywhere, typed, or navigated), the `AudioContext` is in the `"running"` state and rings immediately.
2. **First-Load / Background Tab:** If `AudioContext.state === "suspended"`, the synthesizer calls `ctx.resume().catch(...)`.
3. **Graceful Fallback:** If the browser blocks audio output entirely prior to direct gesture, the high-contrast full-screen visual overlay (`z-[99999]`) and pulsing avatar rings provide unambiguous visual notification. The first click on the screen instantly awakens the audio subsystem.

---

## 4. Mobile & Tablet Responsiveness

The `<FullScreenIncomingCall />` component is built with responsive utility classes:
- **Mobile (< 640px):**
  - Full-bleed viewport overlay.
  - Dynamic avatar scaling (`w-32 h-32`).
  - Large touch targets (`w-16 h-16` / 64px tap targets) exceeding WCAG 2.1 AAA touch guidelines (minimum 44x44px).
  - Bottom controls positioned for natural thumb reachability.
- **Desktop (>= 1024px):**
  - Centered presentation with radiating ambient sound-wave animations.
  - High-contrast typography (`text-4xl font-extrabold`).
  - Keyboard shortcut hints: `Accept (Enter)` and `Decline (Esc)`.

