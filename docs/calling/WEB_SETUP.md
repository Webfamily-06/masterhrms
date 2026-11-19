# MASTERHRMS Web Calling Implementation & Setup Guide

## 1. Web Calling Architecture Overview

The web application calling system provides an in-browser audio and video calling experience accessible from desktop, tablet, and mobile web browsers.

### Key Capabilities:
- **Direct 1-on-1 WebRTC Media**: Full audio and video streaming via standard browser `RTCPeerConnection` and `navigator.mediaDevices.getUserMedia`.
- **Screen Sharing**: Dynamic display stream acquisition via `navigator.mediaDevices.getDisplayMedia` with seamless track replacement on active peer connections without dropping calls.
- **Synthesized Telephone Ringtone**: Web Audio API dual-tone synthesized chime (440Hz + 480Hz) with autoplay unlock handling (`IncomingCallContext`).
- **Floating Mini Call Window**: Picture-in-Picture window allows browsing HRMS modules, employees, and payroll while keeping audio and video active.
- **Device Enumeration & Switching**: Select input microphones, video cameras, and audio output speakers on supported browsers.

---

## 2. Key Components & Paths

| Component | Path | Description |
|---|---|---|
| **IncomingCallContext** | `src/context/incoming-call-context.tsx` | Global call receiver listener, synthesized ringtone, auto-recovery on tab reload. |
| **UnifiedChatApp** | `src/components/chat/unified-chat-app.tsx` | Main conversation hub, call action triggers, WebRTC peer connection coordinator. |
| **DreamsVideoCallScreen** | `src/components/calling/dreams-video-call-screen.tsx` | Full-screen video call interface, active speaker spotlight, duration timer, controls bar. |
| **DreamsVoiceCallScreen** | `src/components/calling/dreams-voice-call-screen.tsx` | Full-screen audio call interface with pulse waves and avatar display. |
| **FullScreenIncomingCall** | `src/components/calling/full-screen-incoming-call.tsx` | Full-screen overlay presented when receiving an incoming call. |
| **FloatingMiniCallWidget** | `src/components/calling/floating-mini-call-widget.tsx` | Floating minimized call widget for multi-tasking. |
| **MultiParticipantMeetingDialog**| `src/components/chat/multi-participant-meeting-dialog.tsx` | Multiparty group meeting grid with active speaker spotlight. |

---

## 3. Browser Permissions & Compatibility

### Supported Browsers:
- Google Chrome (Desktop & Android)
- Mozilla Firefox
- Apple Safari (macOS & iOS 14.3+)
- Microsoft Edge

### Media Permissions:
1. Browser prompts user for camera and microphone access on first call initiation or acceptance.
2. If permission is denied, clear visual modal explains how to enable media in browser address bar settings.
3. Upon call termination, all media tracks (`stream.getTracks().forEach(t => t.stop())`) are immediately released to turn off the hardware camera LED.
