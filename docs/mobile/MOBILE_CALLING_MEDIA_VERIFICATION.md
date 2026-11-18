# MasterHRMS Mobile App — Calling Media & Avatars Verification Report

**Date:** November 18, 2026  
**Subproject:** `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`  
**Dependencies:** `ChatService`, `Config`

---

## 1. Problem Diagnosis

During pre-audit, the call room screen (`ChatCallScreen.tsx`) exhibited unprofessional synthetic avatar rendering:
1. When a remote participant or the self-user had no custom avatar uploaded in the database, the screen generated synthetic cartoon avatars via external Dicebear web services:
   ```ts
   `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(receiverName)}&backgroundColor=00d287`
   ```
   This introduced external network dependencies on an unvetted third-party service and rendered childish cartoon caricatures inside an enterprise corporate HRMS application.
2. In the multiparty meeting grid, each missing avatar similarly fell back to `api.dicebear.com`.
3. In the Picture-In-Picture (PIP) camera preview and 1:1 call stages, missing avatars caused layout inconsistencies.

---

## 2. Remediation Applied

### 2.1 Complete Elimination of Synthetic Dicebear Avatars
- Removed synthetic Dicebear generation from:
  - 1:1 Voice Call pulse stage
  - 1:1 Video Call peer stage
  - PIP self-user preview window
  - Multiparty meeting participant grid tiles
  - Callee "Did Not Respond" timeout dialog

### 2.2 Enterprise Monogram Initials Fallback
- When an employee has an uploaded profile photo, it is loaded cleanly via `Config.API_BASE_URL` with relative-to-absolute URL resolution.
- When an employee has no avatar:
  - Renders a clean corporate circular monogram with their uppercase name initials (e.g. "JD" for John Doe).
  - Employs MasterHRMS brand green (`#00D287`) and deep slate (`#1E293B`) backgrounds with crisp white typography.
  - Added dedicated stylesheet classes:
    - `avatarInitialsBig` and `avatarInitialsBigText`
    - `pipInitialsBox` and `pipInitialsText`
    - `tileInitialsBox` and `tileInitials`

### 2.3 WebRTC Media Stream Notice
- Implemented honest signaling state:
  `"Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build."`
  The user is informed transparently about signaling vs media streaming capabilities rather than pretending live video is streaming when it is an API-signaled room.

---

## 3. Empirical Verification

- Verified in `ChatCallScreen.tsx`: zero occurrences of `api.dicebear.com` for missing user generation.
- Validated TypeScript compilation (`tsc --noEmit`) with 0 errors.
- Verified all styles compile and render cleanly without missing identifier warnings.
