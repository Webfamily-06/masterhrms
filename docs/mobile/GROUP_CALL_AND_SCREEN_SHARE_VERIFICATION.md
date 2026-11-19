# MASTERHRMS — GROUP CALL GRID & SCREEN SHARING VERIFICATION

## 1. Executive Summary

This report documents the implementation and verification of adaptive multiparty group calling and conferencing screen-share layouts in `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`.

---

## 2. Screen Sharing Layout Architecture (~80% / ~20% Ratio)

When a participant starts screen sharing (triggered locally via `mediaDevices.getDisplayMedia({ video: true })` or received from a peer via `call:media-state`):

### 2.1 Content Stage (~80% Height)
- The primary display surface (`styles.screenShareMainView`) occupies approximately $80\%$ of vertical screen height.
- Renders the active screen stream with `objectFit="contain"` so full slide decks, code, and spreadsheets are preserved without cropping or aspect-ratio distortion.
- If the video track is initializing, a clean high-definition presentation placeholder with an active status badge is displayed.

### 2.2 Participant Camera Strip (~20% Height)
- Positioned directly beneath the primary content stage and above the circular call controls.
- Displays a horizontal row of participant video tiles (`styles.screenShareCameraStrip`).
- Each tile renders:
  - Local camera feed or remote participant camera stream in `<RTCView objectFit="cover" />`.
  - Fallback avatar or circular initials monogram if video is off.
  - Participant name badge and microphone mute status indicator.

---

## 3. Multiparty Group Call Adaptive Grid

In group meetings or multiparty calls with multiple active participants, `ChatCallScreen` switches from 1:1 view to a responsive grid (`styles.gridContentContainer`):

### 3.1 Adaptive Grid Configurations
- **2 Participants**: Dual stacked layout (`styles.groupTileHalf`), providing equal $48\%$ height per participant.
- **3 to 4 Participants**: $2 \times 2$ quad grid (`styles.groupTileQuad`), each cell sized to $(\text{Screen Width} - 32) / 2$ with rounded corners ($12\text{px}$).
- **5 to 8 Participants**: Multi-column scrollable grid with responsive card heights.
- **8+ Participants**: Dynamic scrollable roster with participant tiles and active speaker indicators.

### 3.2 Participant Tile Metadata
- Participant video rendered in `<RTCView>` or profile image.
- Centered 2-letter monogram fallback (`styles.groupTileMonogramText`) styled with `includeFontPadding: false` to ensure descenders never clip.
- Bottom badge displaying participant name and real-time audio indicator (`Mic` in green or `MicOff` in red).
- Host / Admin privileges: Meeting hosts and tenant admins have controls to remove participants or end meeting for everyone via `ChatService.endGroupMeetingForAll(callId)`.
