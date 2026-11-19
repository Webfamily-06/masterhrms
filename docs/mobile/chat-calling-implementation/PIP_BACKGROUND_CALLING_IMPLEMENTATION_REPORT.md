# MASTERHRMS MOBILE APP — PICTURE-IN-PICTURE & BACKGROUND CALLING REPORT

**Document ID:** DOC-MOB-PIP-BG-006  
**Project:** MasterHRMS Mobile Application (`mobile-app/`)  
**Scope:** In-App Floating PiP Window, Global Call Store, Background Call Preservation & OS PiP  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

This report documents the implementation of Phase 6: In-App Picture-in-Picture (PiP) Window and Background Calling.

When users receive or establish a call and need to navigate to other screens in MasterHRMS (such as reviewing tasks, checking attendance, viewing company announcements, or referencing files), the active call is minimized into a persistent, high-z-index floating PiP window.

The floating window provides continuous call duration tracking, active mute status, quick controls (Mute, Maximize, and End Call), and single-tap restoration back to the full call screen.

---

## 2. In-App Floating PiP Architecture (GAP 6.1)

### Component Hierarchy:
```
  <AppProviders>
     └── <NavigationContainer ref={navigationRef}>
            ├── <RootStack.Navigator>
            │      └── [Screens: Dashboard, Tasks, Chat, Attendance, etc.]
            │
            └── <FloatingCallPiP />   <--- Overlays any active screen (z-index 9999)
```

### Global Call Store (`mobile-app/src/store/callStore.ts`):
Built using `zustand` to maintain persistent call state across screen mounts, unmounts, and navigations:
- `activeCall`: Stores `callId`, `callType`, `receiverName`, `receiverAvatar`, `durationSeconds`, `isMuted`, `isVideoEnabled`, `isSpeakerOn`, `isScreenSharing`, and `isMinimized`.
- Actions:
  - `setActiveCall(session)`
  - `updateActiveCall(updates)`
  - `incrementDuration()`
  - `setMinimized(boolean)`
  - `clearActiveCall()`

### Minimization Flow:
1. User taps the Minimize button (`Minimize2`) in the top bar of `ChatCallScreen`:
   ```typescript
   const handleMinimize = () => {
     if (callState === 'CONNECTED' && activeCallId) {
       setActiveCall({
         ...activeCallDetails,
         status: 'CONNECTED',
         isMinimized: true,
       });
     }
     navigation.goBack();
   };
   ```
2. The user returns to their previous screen (e.g. Chat list, Project task list, Dashboard).
3. `<FloatingCallPiP />` mounts above the active screen.

---

## 3. Floating PiP Component Features

Rendered in `mobile-app/src/components/chat/FloatingCallPiP.tsx`:
1. **Avatar & Live Badge:** Displays remote user's avatar or initials circle with a pulsing green indicator.
2. **Metadata:** Displays colleague's name, call type (Phone or Video icon), and formatted duration (`02:15 mins • Tap to expand`).
3. **Quick Inline Controls:**
   - **Mute / Unmute Button (`Mic` / `MicOff`):** Toggles microphone state directly from the floating tile and syncs with backend via `ChatService.updateCallMediaState()`.
   - **Maximize Button (`Maximize2`):** Expands the floating tile back to the full-screen `ChatCallScreen` with all parameters preserved.
   - **End Call Button (`PhoneOff`):** Terminates the call session immediately and unmounts the floating tile.
4. **Tap-to-Restore:** Tapping the floating tile body invokes `navigate('ChatCall', params)` using the global `navigationRef`.

---

## 4. Background Execution & Android OS PiP

- **App State Retention:** Call heartbeats continue executing every 5 seconds via `setInterval` in the active call session.
- **Audio Routing:** Expo Audio session mode configured with `allowsRecordingIOS: true` and `staysActiveInBackground: true`.
- **Termination Protection:** If remote peer ends call while minimized, socket `call:ended` triggers `clearActiveCall()`, immediately removing the floating PiP window.

---

## 5. Verification

- Verified in `mobile-app/__tests__/chat_calling_and_attachments.test.ts`:
  - `useCallStore` initialization, update, minimize, and clear cycles.
  - Duration increment verification.
- Floating PiP renders cleanly across both iOS and Android safe area insets.
