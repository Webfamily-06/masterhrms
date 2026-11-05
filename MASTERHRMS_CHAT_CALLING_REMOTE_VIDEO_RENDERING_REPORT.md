# MASTERHRMS — REMOTE VIDEO RENDERING & AVATAR FALLBACK REPORT

## Executive Summary
This report audits the rendering architecture for remote participant video streams, multi-participant filmstrips, and avatar fallback states in `DreamsVideoCallScreen`.

---

## 1. Main Stage & Avatar Hierarchy

### The Defect
Previously, the avatar container was rendered with unconditional `z-10` over the flex video container. Even when a remote stream was active, the avatar overlay blocked visual rendering of the video.

### Fixed Layout Structure
```html
<div data-testid="hero-video-stage" class="relative rounded-md overflow-hidden bg-slate-900 aspect-video flex items-center justify-center flex-1">
  <!-- 1. Live Camera Video Element (Always mounted, z-0) -->
  <video
    id="video-call-hero-video"
    autoplay
    playsinline
    class="w-full h-full object-cover absolute inset-0 z-0 ${!isHeroVideoActive ? 'hidden' : ''}"
  />

  <!-- 2. Avatar & Camera Off Fallback (Rendered ONLY when camera is disabled, z-10) -->
  {!isHeroVideoActive && (
    <div class="flex flex-col items-center justify-center gap-3 z-10 p-4">
      <div id="video-call-hero-avatar" class="size-24 sm:size-32 rounded-full ...">
        {heroAvatar ? <img src={heroAvatar} /> : <i class="ph-duotone ph-user" />}
      </div>
      <div class="text-center">
        <p class="text-white text-sm font-semibold">{heroName}</p>
        <p class="text-xs text-slate-400">Camera is turned off</p>
      </div>
    </div>
  )}
</div>
```

---

## 2. Participant Filmstrip Architecture

The bottom filmstrip (`data-testid="call-participant-filmstrip"`) renders compact cards for all call participants:
1. **Live Miniature Video**:
   - For participants with active video (`pVideoActive === true`), renders an inline `<video autoplay playsinline muted />` element bound to the participant's `MediaStream`.
2. **Initial / Avatar Fallback**:
   - When a participant's camera is off, displays a stylized initials badge or avatar picture.
3. **Hero Tile Selection**:
   - Clicking any participant tile (`onClick={() => setSelectedHeroUserId(participant.userId)}`) dynamically elevates that participant to the main stage hero slot.

---

## 3. Empirical Test Results

| Test Parameter | Observed Value | Expected Standard | Status |
| :--- | :--- | :--- | :--- |
| **Hero Stage Live Stream** | `videoWidth: 320/640`, `readyState: 4` | > 0, HAVE_ENOUGH_DATA | ✅ PASS |
| **Avatar Hidden When Camera Live** | `avatarVisible: false` | `false` | ✅ PASS |
| **Avatar Visible When Camera Muted** | `avatarVisible: true` + "Camera is turned off" | `true` with text | ✅ PASS |
| **Filmstrip Tile Count** | 2 tiles (Sarah & Alex) | >= 2 | ✅ PASS |
| **Filmstrip Video Playback** | Active on live participant tiles | Active `<video>` | ✅ PASS |
| **Screenshot Evidence** | `01_camera_muted_avatar_fallback.png`, `02_camera_unmuted_live_restored.png` | Saved in evidence dir | ✅ PASS |

