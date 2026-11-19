# MASTERHRMS — REAL WEBRTC MEDIA IMPLEMENTATION REPORT

## 1. Executive Summary

This report documents the transformation of the MasterHRMS mobile calling experience from a signaling-only placeholder into genuine real-time voice and video calling powered by native WebRTC streams (`react-native-webrtc@124.0.8`).

- **Target Application**: `mobile-app/` (`com.masterhrms.app`)
- **WebRTC Engine**: `react-native-webrtc@124.0.8` (native autolinking for Android and iOS)
- **Primary Screen**: `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`
- **Signaling Contracts**: Existing `/api/calls/invite`, `/api/calls/:callId/signal`, `/api/calls/:callId/media-state`, and `/api/calls/ice-servers`
- **Backend Changes**: Strictly ZERO backend modifications.

---

## 2. WebRTC Media Architecture & Pipeline

### 2.1 Native Media Acquisition (`mediaDevices.getUserMedia`)
- Local media is acquired with exact constraints depending on the call type:
  - **Voice Call**:
    ```ts
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    ```
  - **Video Call**:
    ```ts
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: isFrontCamera ? 'user' : 'environment' },
    });
    ```
- Tracks are controlled dynamically without tearing down the peer connection:
  - Audio Mute: `localStream.getAudioTracks().forEach(t => t.enabled = !isMuted)`
  - Video Toggle: `localStream.getVideoTracks().forEach(t => t.enabled = isVideoEnabled)`
  - Camera Switch: Front $\leftrightarrow$ Back camera toggle using track `_switchCamera()`.

### 2.2 Peer Connection & STUN ICE Discovery
- The client calls `ChatService.getIceServers()` which invokes the existing `GET /api/calls/ice-servers` endpoint:
  ```ts
  const { iceServers } = await ChatService.getIceServers();
  const pc = new RTCPeerConnection({ iceServers });
  ```
- If the server ICE response fails or is unreachable, an automatic fallback to Google's public STUN infrastructure (`stun:stun.l.google.com:19302`) ensures uninterrupted P2P connectivity.
- Local tracks from `localStream` are attached via `pc.addTrack(track, stream)`.
- Candidates discovered via `pc.onicecandidate` are transmitted to the remote peer via `ChatService.sendCallSignal(callId, targetPeerId, { type: 'candidate', candidate })`.

### 2.3 Signaling Exchange & State Synchronization
- WebRTC SDP offer and answer negotiations are relayed over the existing dual-channel infrastructure (Socket.IO + Pusher `call:signal` and `POST /api/calls/:callId/signal`):
  - **Caller**: Calls `pc.createOffer()`, sets `pc.setLocalDescription(offer)`, and relays to callee.
  - **Callee**: Receives offer, calls `pc.setRemoteDescription(offer)`, generates `pc.createAnswer()`, sets `pc.setLocalDescription(answer)`, and returns the answer SDP.
  - **ICE Candidates**: Buffered and added via `pc.addIceCandidate(new RTCIceCandidate(candidate))`.
- Remote audio/video media tracks received via `pc.ontrack` are set into `remoteStream` state and rendered directly into `<RTCView>`.

### 2.4 Video Rendering Surfaces
- `<RTCView>` components replace mock video overlays:
  - Main Stage: `<RTCView streamURL={mainStageStream.toURL()} mirror={isMainLocal ? isFrontCamera : false} style={styles.fullStageRTC} objectFit="cover" />`
  - Picture-in-Picture: `<RTCView streamURL={pipStageStream.toURL()} mirror={!isMainLocal ? isFrontCamera : false} style={styles.pipRTC} objectFit="cover" />`
  - Screen Share: `<RTCView streamURL={screenStream.toURL()} style={styles.screenShareRTC} objectFit="contain" />`

---

## 3. WebRTC Teardown & Lifecycle Cleanup

When a call concludes (user taps End Call, caller hangs up, timeout expires, or peer leaves):
1. All active media tracks (`localStream`, `remoteStream`, `screenStream`) are stopped to free hardware microphones and camera sensors.
2. `pc.close()` is invoked to release native sockets and WebRTC peer connection handles.
3. Heartbeat and duration intervals are cleared.
4. Active call state in Zustand `useCallStore` is reset via `clearActiveCall()`.
5. Mobile navigation returns cleanly via `navigation.goBack()`.
