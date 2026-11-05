# MASTERHRMS — CHAT CALLING UI BUTTON & CONTROL FUNCTIONALITY MATRIX

## Overview
Every interactive calling button and surface control across `DreamsVideoCallScreen`, `DreamsVoiceCallScreen`, and `FullScreenIncomingCall` has been audited, mapped, and empirically verified through automated browser interactions.

---

## Interactive Controls Matrix

| Component | Control Name | Selector / Test ID | Visual State / Icon | Operational Action & Verified Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Incoming Call** | Accept Call (Tap) | `[data-testid="btn-accept-call"]` | Green circle, Phone icon | Authoritative server acceptance, transitions state to `connected`, mounts video stage. |
| **Incoming Call** | Decline Call (Tap) | `[data-testid="btn-decline-call"]` | Red circle, PhoneOff icon | Sends decline signal, halts ringtone, cleanly resets caller and callee to idle. |
| **Incoming Call** | Swipe to Answer | `div.cursor-grab` | Green slider handle with chevron pulse | Dragging up >= 80px triggers immediate call acceptance with haptic vibration. |
| **Incoming Call** | Audio Unmute Banner | Button in top banner | Amber warning banner | Resumes suspended `AudioContext` on user interaction when browser blocks autoplay. |
| **Video Call Screen** | Header Add Participant | `[data-testid="call-btn-add-new-header"]` | Dark button, UserPlus icon | Opens participant invitation dialog for mid-call group scaling. |
| **Video Call Screen** | Microphone Toggle | `[data-testid="call-btn-mute"]` | Mic / MicOff icon (Red when muted) | Disables local audio tracks (`track.enabled = false`), updates mute indicator. |
| **Video Call Screen** | Camera Toggle | `[data-testid="call-btn-video"]` | Camera / CameraOff icon (Red when off) | Disables local video track; callee immediately renders avatar fallback without stream corruption. |
| **Video Call Screen** | Screen Share Toggle | `[data-testid="call-btn-screenshare"]` | MonitorArrowUp icon | Calls `getDisplayMedia`, renders HD presentation canvas, replaces video track on peer connection. |
| **Video Call Screen** | Stop Presentation | `[data-testid="btn-stop-presentation"]` | Red button, StopCircle icon | Dismisses presentation canvas and cleanly restores live camera stream. |
| **Video Call Screen** | Fullscreen Toggle | Button top right (`ph-corners-out`) | Expand/Collapse icon | Toggles fullscreen viewport layout. |
| **Video Call Screen** | Minimize to PiP | `[data-testid="call-btn-minimize"]` | Minus / PiP icon | Minimizes active call into draggable floating picture-in-picture widget. |
| **Video Call Screen** | Hang Up / End Call | `[data-testid="call-btn-hangup"]` | Red circular button, PhoneSlash icon | Sends `call:hangup`, terminates peer connection, releases all hardware tracks. |
| **Video Call Screen** | Settings | `[data-testid="call-btn-settings"]` | Gear icon | Opens device selection modal (Camera, Mic, Speaker). |
| **Video Call Screen** | Filmstrip Tile Switch | `[data-testid^="filmstrip-tile-"]` | Compact participant video thumbnail | Clicking tile switches selected hero participant to the clicked user. |
| **Voice Call Screen** | Audio Mute Toggle | `[data-testid="call-btn-mute"]` | Mic / MicOff icon | Toggles audio track enabled state. |
| **Voice Call Screen** | Switch to Video | `button` with video camera icon | Camera icon | Upgrades audio call to video call session. |
| **Voice Call Screen** | Hang Up | `[data-testid="call-btn-hangup"]` | Red circular button, PhoneSlash icon | Terminates voice call session and releases microphone. |

---

## Verification Evidence
- Real Playwright assertions verified each button's click handler, DOM state mutation, and visual class change.
- No dummy, non-functional, or unhandled controls remain in the codebase.

