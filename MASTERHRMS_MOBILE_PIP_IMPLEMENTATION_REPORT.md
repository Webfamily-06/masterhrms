# MASTERHRMS — MOBILE PICTURE-IN-PICTURE (PiP) IMPLEMENTATION REPORT
## Root Shell Floating Calling Experience & Internal Route Navigation Continuity
**Date:** November 2, 2026  
**Component:** `FloatingMiniCallWidget` (`src/components/calling/floating-mini-call-widget.tsx`)  
**Root Layouts:** `src/routes/__root.tsx` & `CMS/src/components/providers/AppProviders.tsx`  
**Evidence Directory:** `docs/Saas/screenshots/incoming-call-mobile-pip/`  
**Status:** ✅ VERIFIED ACROSS DESKTOP & MOBILE VIEWPORTS

---

## 1. OBJECTIVE & CHALLENGE

When employees use MasterHRMS on mobile or desktop during an active audio or video call, they frequently need to:
1. Review payroll details (`/hr/payroll`).
2. Consult their team dashboard (`/me/dashboard`).
3. Check company calendar events (`/calendar`).
4. Read document files or project tickets.

### Prior Limitation
The previous calling interface was tightly coupled to the `/chat` route component. Navigating away unmounted the chat view, terminating media tracks and dropping the WebRTC peer connection.

---

## 2. COMPONENT ARCHITECTURE & ROOT SHELL MOUNTING

### 2.1 The Solution: Root-Level Floating Mini-Call
A persistent floating calling component, `<FloatingMiniCallWidget />`, was created and mounted directly in `src/routes/__root.tsx` and `CMS/src/components/providers/AppProviders.tsx` above the router `<Outlet />`.

Because `<FloatingMiniCallWidget />` resides in the root layout:
- It survives all client-side SPA route transitions.
- The underlying media tracks and WebRTC audio output continue playing uninterrupted.
- It detects when the active view is not `/chat` (or when minimized) and renders an accessible floating overlay.

```
+--------------------------------------------------------------------+
|  Root Component (src/routes/__root.tsx)                            |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | <IncomingCallProvider>                                       |  |
|  |   <Outlet /> (Active Route: /me/dashboard, /payroll, etc.)   |  |
|  |   <FullScreenIncomingCall />                                 |  |
|  |   <FloatingMiniCallWidget />  <--- Persistent Floating Mini  |  |
|  |                                    Window on All Pages       |  |
|  +--------------------------------------------------------------+  |
+--------------------------------------------------------------------+
```

---

## 3. PICTURE-IN-PICTURE CAPABILITY TIERS ACROSS PLATFORMS

| Platform | Document PiP | Video Element PiP | In-App Floating Overlay | Operational Experience |
|----------|--------------|-------------------|-------------------------|------------------------|
| **Chromium Desktop (Chrome/Edge v111+)** | Supported (`window.documentPictureInPicture`) | Supported | Supported | Full floating OS window with interactive HTML buttons |
| **macOS Safari / Firefox Desktop** | Not Supported | Supported (Video only) | Supported | In-app floating card with mute, timer, maximize, hangup |
| **Android Chrome / Android PWA** | Not Supported | Supported (Video only) | Supported | Responsive in-app floating overlay; audio persists |
| **iOS Safari / iOS PWA** | Not Supported | Supported (Webkit presentation) | Supported | Responsive in-app floating overlay; audio persists |

### Technical Reality & Honest Design
The W3C Document Picture-in-Picture API is strictly available on Chromium desktop browsers. Mobile operating systems (Android and iOS) do not allow web browsers to spawn arbitrary HTML window overlays outside the app process. 

Therefore, MasterHRMS delivers a **three-tier adaptive strategy**:
1. **Tier 1:** Native Document PiP if available (Chromium desktop).
2. **Tier 2:** Native `HTMLVideoElement.requestPictureInPicture()` for video streams.
3. **Tier 3 (Universal Guarantee):** High-fidelity in-app floating overlay (`FloatingMiniCallWidget`) positioned at `fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99990]`.

---

## 4. ROUTE NAVIGATION CONTINUITY VERIFICATION

The implementation was tested on an iPhone 14 mobile viewport (390x844) navigating across key operational pages:

| Route Path | Verified Functionality | Screenshot Evidence |
|------------|------------------------|---------------------|
| `/chat` | Initial video call connected in full screen | `01-mobile-call-in-progress.png` |
| `/chat` (minimized) | In-app floating mini card appears at bottom right | `02-mobile-pip-floating-mini-call.png` |
| `/me/dashboard` | Navigated to employee dashboard; floating card remains active with live timer | `03-mobile-navigation-dashboard-call-active.png` |
| `/hr/payroll` | Navigated to payroll; floating card remains active, mute toggles work | `04-mobile-navigation-payroll-call-active.png` |
| `/calendar` | Navigated to company calendar; call continues smoothly | `05-mobile-navigation-calendar-call-active.png` |
| `/chat` (restored) | Clicked "Maximize" on floating card; restored full-screen call view | `06-mobile-pip-maximize-restored-call.png` |

---

## 5. FLOATING WIDGET CAPABILITIES

The floating widget provides complete operational control:
- **Audio Mode:** Avatar with initials, pulse ring indicator, caller name, live timer badge (`m:ss`), mute/unmute mic toggle, maximize button, and hangup button.
- **Video Mode:** Aspect-video live stream preview, active speaker chip, timer badge, native PiP trigger button, mute mic button, maximize button, and hangup button.
- **Event Bus Coordination:** Dispatches `hrms:active-call-toggle-mute`, `hrms:active-call-maximize`, and `hrms:active-call-hangup` to coordinate seamlessly with WebRTC audio tracks.
