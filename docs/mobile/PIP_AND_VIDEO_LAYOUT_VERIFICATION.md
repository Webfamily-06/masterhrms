# MASTERHRMS — PICTURE-IN-PICTURE (PIP) & VIDEO LAYOUT VERIFICATION

## 1. Executive Summary

This report documents the implementation and verification of the draggable Picture-in-Picture (PiP) window and video layout controls in `mobile-app/src/modules/chat/screens/ChatCallScreen.tsx`.

The previously static video thumbnail in the corner has been replaced by an interactive, fluid, boundary-clamped PiP window with double-tap stream swapping between local and remote feeds.

---

## 2. Draggable PiP Implementation

### 2.1 Clamping Bounds & Safe-Area Respect
The floating PiP container (dimensions: $110\text{px} \times 150\text{px}$) is bounded using React Native's `PanResponder` and `Animated.ValueXY`:
- **Horizontal Bounds**:
  - Minimum X: $16\text{px}$ (inset from left screen edge)
  - Maximum X: $\text{Screen Width} - 110\text{px} - 16\text{px}$ (inset from right screen edge)
- **Vertical Bounds**:
  - Minimum Y: $\max(\text{insets.top} + 60, 70\text{px})$ (clears the top header bar)
  - Maximum Y: $\text{Screen Height} - \text{insets.bottom} - 160\text{px}$ (clears bottom circular call controls)

### 2.2 Fluid Dragging & Edge Snapping
- During gesture movement (`onPanResponderMove`), coordinates update fluidly with zero jitter.
- Upon release (`onPanResponderRelease`):
  - The vertical coordinate $Y$ is clamped within $[Y_{\min}, Y_{\max}]$.
  - The horizontal coordinate $X$ automatically snaps to the nearest screen edge (left or right) via `Animated.spring` with friction damping ($6.0$) to provide native mobile feel.

---

## 3. Double-Tap Stream Swapping

### 3.1 Interaction Pattern
- Users can double-tap anywhere on the floating PiP window.
- The double-tap handler detects two consecutive tap events occurring within $300\text{ms}$ (`now - lastTapRef.current < 300`).
- It toggles the `isStreamSwapped` boolean state without disconnecting or renegotiating WebRTC.

### 3.2 Display Logic
| Mode | Main Stage Surface | Floating PiP Surface |
| :--- | :--- | :--- |
| **Normal** (`!isStreamSwapped`) | Remote Peer Stream (`remoteStream`) or Avatar | Local Camera Preview (`localStream`, mirrored) |
| **Swapped** (`isStreamSwapped`) | Local Camera Preview (`localStream`, mirrored) | Remote Peer Stream (`remoteStream`) or Peer Avatar |

### 3.3 Visual Identity & Name Badges
- The PiP container displays a semi-transparent dark pill badge at its bottom edge (`styles.pipLabelBadge`) identifying whether the thumbnail is `'You'` or the colleague's name (`receiverName`).
- When camera video is turned off, the PiP cleanly renders a centered monogram with the participant's two-letter initials (`styles.pipFallbackBox`).
