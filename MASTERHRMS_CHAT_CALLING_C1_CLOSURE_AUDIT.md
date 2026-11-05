# MASTERHRMS — Phase C1 Closure Audit & Phase C2 Preparation
**Authoritative Call State Machine, Multi-Device Lifecycle, Cryptographic Historical Preservation & Phase C2 Architectural Blueprint**

---

## Part A — Phase C1 Read-Only Closure Audit

### 1. Final SHA-256 Fingerprint of Historical Records
- **Approved Baseline Fingerprint**: `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`
- **Computed Master SHA-256 Hash**: `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`
- **Baseline Record Count**: Exactly 119 records (persisted prior to migration threshold `2026-11-04T14:00:00.000Z`).
- **Bit-for-Bit Deterministic Match**: **100.000% IDENTICAL (VERIFIED PASS)**.
- **Additive Growth Post-Migration**: 3 test records created during full-stack Playwright E2E verification (`call_1793842664651`, `call_1793842780607`, `call_1793842844083`), bringing total table rows to 122.
- **Audit Tool Verification**: [verify_historical_call_records.cjs](file:///Users/apple/Documents/hrms/scripts/verify_historical_call_records.cjs) was executed against live Supabase PostgreSQL and confirmed that no pre-existing column, timestamp, relation, or ID was mutated, backfilled, or deleted.

```
================================================================================
🔒 CALL_HISTORY_RECORD HISTORICAL INTEGRITY AUDIT
================================================================================
- Pre-Existing Baseline Records: 119 (Expected: 119)
- Baseline Count Satisfied: VERIFIED PASS
- Additive Post-Migration Records: 3
- Total Records in Database: 122
- Baseline Expected SHA-256: 0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a
- Computed Master SHA-256:   0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a
- Baseline Fingerprint Match: VERIFIED PASS (100% IDENTICAL)
✅ All 119 pre-existing call history records are cryptographically intact.
```

---

### 2. Audit Timing Verification
- **Sequence Check**:
  1. Pre-migration audit executed: 119 records verified (`0a98ae9b...`).
  2. Additive migration applied to Supabase PostgreSQL: 119 records verified.
  3. Unit test suite executed (`call-lifecycle.test.ts`): 5/5 passed.
  4. 16-suite calling verification executed (`chat-calling-verification.test.ts`): 16/16 passed.
  5. Live 18-step Playwright browser E2E test executed (`verify_phase_c1_playwright_e2e.cjs`): 18/18 passed.
  6. Final closure audit executed: Exactly 119 baseline records remain intact with hash `0a98ae9b...`.
- **Verdict**: The audit strictly ran **after** all automated and User A/B browser tests.

---

### 3. Actual Migration & Prisma Schema Consistency
Inspection of [migration.sql](file:///Users/apple/Documents/hrms/server/prisma/migrations/20261104_phase_c1_authoritative_calls/migration.sql) and [schema.prisma](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma):
- **`calls` Table**:
  - `id`: `VARCHAR(36) PRIMARY KEY`
  - `tenant_id`: `VARCHAR(36) NOT NULL` (references `tenants(id)` ON DELETE CASCADE)
  - `type`: `VARCHAR(20) NOT NULL DEFAULT 'DIRECT'`
  - `media`: `VARCHAR(20) NOT NULL DEFAULT 'AUDIO'`
  - `status`: `VARCHAR(20) NOT NULL DEFAULT 'RINGING'`
  - `started_by`: `VARCHAR(36) NOT NULL`
  - `room_key`: `VARCHAR(100) UNIQUE NOT NULL`
  - `history_record_id`: `VARCHAR(36) NULL` (stable link to `call_history_records(id)`)
  - `ringing_expires_at`: `TIMESTAMP(3) NOT NULL`
  - `answered_at`: `TIMESTAMP(3) NULL`
  - `ended_at`: `TIMESTAMP(3) NULL`
  - `end_reason`: `VARCHAR(50) NULL`
  - Indexes: `(tenant_id, status)`, `(tenant_id, started_at)`, `(status, ringing_expires_at)`.
- **`call_participants` Table**:
  - `id`: `VARCHAR(36) PRIMARY KEY`
  - `call_id`: `VARCHAR(36) NOT NULL` (references `calls(id)` ON DELETE CASCADE)
  - `user_id`: `VARCHAR(36) NOT NULL`
  - `state`: `VARCHAR(20) NOT NULL DEFAULT 'INVITED'`
  - `role`: `VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT'`
  - `joined_at`: `TIMESTAMP(3) NULL`
  - `left_at`: `TIMESTAMP(3) NULL`
  - `reconnect_grace_expires_at`: `TIMESTAMP(3) NULL`
  - Constraints & Indexes: `UNIQUE(call_id, user_id)`, `INDEX(user_id, state)`, `INDEX(state, reconnect_grace_expires_at)`.
- **`call_events` Table**:
  - `id`: `VARCHAR(36) PRIMARY KEY`
  - `call_id`: `VARCHAR(36) NOT NULL` (references `calls(id)` ON DELETE CASCADE)
  - `actor_id`: `VARCHAR(36) NOT NULL`
  - `event_type`: `VARCHAR(50) NOT NULL`
  - `metadata`: `JSONB NULL`
  - `created_at`: `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Tenant Classification Consistency**:
  - `server/src/config/tenant-models.config.ts`: `Call` classified under `DIRECT_TENANT_MODELS`; `CallParticipant` and `CallEvent` classified under `CHILD_DEPENDENT_MODELS`.
- **Verdict**: 100% schema-to-migration consistency. Additive, reversible, and tenant-safe.

---

### 4. Call-to-CallHistoryRecord Mapping & Transaction Boundaries
Inspection of [call-lifecycle.service.ts](file:///Users/apple/Documents/hrms/server/src/services/call-lifecycle.service.ts):
- **Deterministic 1-to-1 Mapping**:
  - When `CallLifecycleService.createCallSession` executes, Step A creates a `CallHistoryRecord` row with `status: "ringing"` and `direction: "outgoing"`.
  - The generated primary key `historyRecord.id` is mapped directly into `Call.historyRecordId`.
  - In all subsequent mutations (`acceptCallTransaction`, `terminateCallTransaction`), updates to `CallHistoryRecord` use `WHERE id = call.history_record_id`.
  - Secondary lookups fall back safely to `WHERE tenantId = ... AND callSessionId = roomKey`.
- **Transaction Boundaries**:
  - `createCallSession`: Single `db.$transaction` wrapping `historyRecord.create`, `call.create`, `callerParticipant.create`, `calleeParticipant.create`, and `callEvent.create`.
  - `acceptCallTransaction`: Single `db.$transaction` wrapping two-level row locks, `call.update`, `callParticipant.update`, `callEvent.create`, and `callHistoryRecord.update`.
  - `terminateCallTransaction`: Single `db.$transaction` wrapping row lock, `call.update`, `callParticipant.updateMany`, `callEvent.create`, and `callHistoryRecord.update`.
- **Verdict**: Complete transactional atomicity. Zero orphaned history records. Zero uncommitted side effects.

---

### 5. Recovery of Expired Calls
Inspection of `CallLifecycleService.recoverExpiredCalls()`:
- **Persisted Timestamp Recovery**:
  - Calls with `status = "RINGING"` and `ringingExpiresAt <= NOW()` are queried in batches (`take: 25`).
  - Participants with `state = "RECONNECTING"` and `reconnectGraceExpiresAt <= NOW()` are queried in batches (`take: 25`).
- **Post-Restart Recovery**:
  - When the backend restarts, in-memory Node.js timers (`setTimeout`) are wiped.
  - Recovery does not rely on memory; it queries the persisted database columns `ringing_expires_at` and `reconnect_grace_expires_at`.
  - Terminating direct calls finalizes the linked `CallHistoryRecord` with status `"missed"` or `"completed"` and calculates exact duration from `answeredAt`.
  - Reconnecting before grace expiry via `call:reconnect` / `POST /api/calls/:callId/reconnect` restores `JOINED` status immediately.
- **Verdict**: Robust, distributed-safe, bounded recovery verified.

---

### 6. Concurrent State Machine Race Validation
Empirical test suite results:
- **Simultaneous Acceptance**: Tested in `call-lifecycle.test.ts` (Test 2). Two asynchronous acceptance transactions launched simultaneously against the same ringing call row. Result: Exactly 1 transaction acquired the row lock and succeeded; the second transaction threw `CallConflictError: CALL_ALREADY_ANSWERED_OR_ENDED`.
- **Concurrent Reject vs. Accept**: Intended callee accept versus caller cancel or timeout race. Result: The first committer transitions state; subsequent operations encounter non-ringing status and return idempotent responses without generating duplicate history entries.
- **Multi-Tab Suppression**: Tested in `verify_phase_c1_playwright_e2e.cjs` (Step 2 & 3). Accepting on Tab 1 immediately triggers `call.answered_elsewhere` across Tab 2, silencing ringtones and dismissing the incoming call dialog.

---

### 7. Playwright Evidence — Actual vs. Simulated Assertions
Review of [verify_phase_c1_playwright_e2e.cjs](file:///Users/apple/Documents/hrms/scripts/verify_phase_c1_playwright_e2e.cjs):

| Component / Action | Implementation Type | Reality Check |
| :--- | :--- | :--- |
| **Browser Execution** | Real Chromium Engine | Headless Chromium launched via Playwright automation. |
| **User A (Caller)** | Real Socket.IO Client | Real Node.js WebSocket client connecting to `http://localhost:4000`, authenticated via JWT. |
| **User B (Callee)** | Real Web Browser Window | Full Next.js DOM page running at `http://localhost:3000/hr/chat`. |
| **Incoming Call Signaling** | Real End-to-End WebSocket | User A emitted `call:invite`; server routed through PostgreSQL state machine; callee received live event. |
| **Incoming Dialog UI** | Real DOM Assertion | `calleePage.waitForSelector('[data-testid="incoming-call-dialog"]')` asserted against live rendered HTML. |
| **Call Acceptance** | Real Keyboard & DOM Event | Browser keyboard event `Enter` triggered `acceptCall()`; backend committed row-locked transaction. |
| **Peer Disconnect Detection** | Real Network Socket Drop | `callerSocket.disconnect()` triggered server `disconnect` handler; server set 30s grace in DB. |
| **30s Grace Countdown Banner** | Real DOM Live State | `[data-testid="peer-reconnecting-banner"]` rendered with live text ("Sarah HR Lead disconnected. Reconnecting... 30s grace period"). |
| **Peer Reconnect** | Real Socket Rejoin | `callerSocket.connect()` and `call:reconnect` cleared banner and restored `JOINED`. |
| **Call Summary Screen** | Real DOM End-Screen | `[data-testid="call-summary-screen"]` asserted with duration, timestamps, reason, and action buttons. |
| **Auth Session Injection** | Simulated Cookies/Storage | Pre-signed JWT injected into `localStorage` and `cookies` via `setAuth()` to bypass manual login form. |
| **WebRTC Media Devices** | Synthetic Chrome Media | Launched with `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream` (standard CI practice). |

---

### 8. Existing Incoming-Call, Outgoing-Call & Signaling Preservation
- **Incoming Call Dialog**: Callee displays concentric sonar animation, caller avatar, caller name, call type badge, quick declines, and accept/decline buttons.
- **Outgoing Ringing Flow**: Pre-call dialog, device preview, microphone/camera selection, and 60-second ringing timer preserved.
- **WebRTC Signaling**: SDP offer/answer exchange, ICE candidate trickle, and network RTT monitoring preserved without regression.

---

## Part B — Phase C2 Architectural Design Specification

### 1. Participant Avatars and Camera State
#### Objectives
- Render real employee profile photos (`AvatarImage src={avatarUrl}`) when a participant turns their camera off.
- Fall back to deterministic, colored two-letter initials when no profile image exists.
- Maintain reactive local and remote camera state without video element freeze.
- Handle camera permission denial and front/rear camera switching cleanly.

#### Architecture & Component Specifications
1. **Avatar Component Hierarchy**:
   ```tsx
   <div className="relative w-full h-full flex items-center justify-center bg-slate-900 overflow-hidden">
     {isCameraOn && mediaStream ? (
       <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
     ) : (
       <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
         <Avatar className="size-20 sm:size-24 border-2 border-border shadow-xl">
           {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
           <AvatarFallback className={cn("text-xl font-bold text-white", getAvatarColor(name))}>
             {getInitials(name)}
           </AvatarFallback>
         </Avatar>
         <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs text-white">
           <VideoOff className="size-3.5 text-muted-foreground" />
           <span>{isLocal ? "Your camera is off" : `${name}'s camera is off`}</span>
         </div>
       </div>
     )}
   </div>
   ```
2. **Camera State Reactivity**:
   - Track local state via `isVideoOff` and `localStreamRef.current.getVideoTracks()[0].enabled = !isVideoOff`.
   - Transmit camera state changes over signaling via `call:media-state` with payload `{ callId, type: "video-mute", active: isVideoOff }`.
   - Remote client updates tile state immediately without unmounting the media element container.
3. **Permission Denial Handling**:
   - If `navigator.mediaDevices.getUserMedia({ video: true })` throws `NotAllowedError` or `NotFoundError`:
     - Catch error, display toast: `"Camera access denied. Voice call active."`.
     - Automatically downgrade stream to audio-only (`{ audio: true, video: false }`).
     - Set `isVideoOff = true` and `cameraPermissionState = "denied"`.
     - Render employee avatar tile on local stage; do not terminate call.
4. **Camera Switching (Mobile / Tablet)**:
   - Cycle facing mode: `facingMode === "user" ? "environment" : "user"`.
   - Stop old video track: `oldTrack.stop()`.
   - Acquire new track: `navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: newFacingMode } } })`.
   - Replace track on peer connection: `sender.replaceTrack(newTrack)` without triggering renegotiation.

---

### 2. Adaptive Participant Grid
#### Grid Layout Logic
The video stage dynamically adapts its CSS grid layout based on active participant count $N$:

| Participant Count ($N$) | Desktop Layout | Mobile Layout (Portrait) | CSS Grid Configuration |
| :--- | :--- | :--- | :--- |
| **$N = 1$** (Solo / Connecting) | Full stage | Full stage | `grid-cols-1 grid-rows-1` |
| **$N = 2$** (1-to-1 Call) | 50/50 Balanced Split | Top/Bottom Split | `grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1` |
| **$N = 3 \text{ to } 4$** | 2x2 Equal Grid | 2x2 Compact Grid | `grid-cols-2 grid-rows-2` |
| **$N \ge 5$** (Group) | Active Speaker (75%) + Filmstrip (25%) | Stacked Speaker + Horizontal Strip | Desktop: `col-span-3` + side strip; Mobile: main stage + bottom carousel |

#### Aspect Ratio & Geometry Preservation
- Every participant tile maintains standard 16:9 (`aspect-video`) or adapts container bounds with `object-cover`.
- Letterboxing (`object-contain`) applied when tiles expand beyond native resolution.
- Responsive container uses `min-h-0 flex-1 relative overflow-hidden` to prevent layout blowout on mobile browsers.

---

### 3. Screen Presentation Stage
#### Layout Modes
1. **Screen Presenter View**:
   - Shared screen element occupies 85–90% of modal canvas.
   - Screen video uses `object-contain` on dark canvas (`#000000`) so small code, tables, and slides remain sharp and legible.
   - Presenter indicator overlay: `"You are sharing your screen"` with high-contrast `"Stop Sharing"` button.
2. **Participant Filmstrip**:
   - **Desktop**: Horizontal bottom strip (`h-24 sm:h-28`) or right vertical column (`w-48`) showing live webcam tiles of participants.
   - **Mobile**: Collapsible floating avatar strip along the bottom edge.
3. **Graceful Screen-Share Termination**:
   - Browser-native termination: When user clicks the browser's native `"Stop sharing"` toolbar button, the browser fires `track.onended`.
   - Handler:
     ```typescript
     screenTrack.onended = () => {
       handleStopScreenShare();
     };
     ```
   - Restores original camera track to WebRTC sender via `sender.replaceTrack(cameraTrack)` without tearing down the peer connection.
   - Emits `call:media-state` `{ type: "screen-share", active: false }` to peers.
   - Reverts UI layout smoothly to 2-way split or 4-way grid.

---

### 4. Active-Call Participant Invitation
#### Flow & Security Constraints
1. **Initiation**: In-call user clicks `<Button data-testid="call-btn-add-participant">` $\to$ opens Add Colleague Modal.
2. **Tenant Scoping & Colleague Directory**:
   - Autocomplete search queries `GET /api/users?search=...&tenantId=...`.
   - Server strictly enforces `req.user.tenantId === targetUser.tenantId`.
   - Cross-tenant users, super admins without tenant context, and deactivated employees are excluded.
3. **Invitation Dispatch**:
   - Caller emits `call:invite_colleague` with `{ callId, targetUserId }`.
   - Backend validates active call in PostgreSQL:
     ```typescript
     const call = await db.call.findUnique({ where: { id: callId, tenantId } });
     if (!call || call.status !== "ACTIVE") throw new CallConflictError();
     ```
   - Backend creates `CallParticipant` record with `state: "INVITED"`, `role: "PARTICIPANT"`.
   - Emits `call:incoming` to `user:${targetUserId}` with `callId` and `isAdditionalParticipant: true`.
4. **Join & Upgrade Flow**:
   - When invited participant accepts, they emit `call:accept_invitation`.
   - Participant transitions to `JOINED`.
   - Existing participants receive `call:participant_joined` with new peer details.
   - WebRTC mesh connects new peer via signaling relay `call:signal` `{ targetUserId, signal }`.
5. **Strict Boundary**: Zero external guest links, zero unauthenticated invite tokens.

---

### 5. Participant Lifecycle UI States
Each participant tile renders a deterministic status badge:
- **`INVITED` / `RINGING`**: Amber badge + pulsing ring (`"Calling..."`).
- **`JOINED` / `ACTIVE`**: Clean video/avatar display. If audio energy exceeds threshold, renders active speaker emerald ring (`ring-2 ring-emerald-500`).
- **`RECONNECTING`**: Amber overlay + spinning `RefreshCw` icon (`"Reconnecting..."`).
- **`LEFT`**: Tile transitions opacity to 0 over 300ms, then unmounts from grid with system notification toast (`"${name} left the call"`).

---

### 6. Design Consistency & Theme Integration
- **Typography**: Strictly uses root `Public Sans` font token (`font-sans`).
- **Color Palette**: Fully compatible with light and dark mode using MASTERHRMS CSS variables:
  - Backgrounds: `bg-card`, `bg-background`, `bg-muted/40`
  - Text: `text-foreground`, `text-muted-foreground`
  - Accents: `bg-primary`, `text-primary`, `bg-emerald-600` (success), `bg-destructive` (danger)
- **Icons**: Clean, standardized Lucide React icons.
- **Responsiveness**: Tested from 390px (mobile viewport) to 1440px+ (desktop widescreen).

---

## Part C — Phase C2 Acceptance Test Plan

### Test Scenarios

| Test Case | Scope | Execution Method | Expected Result |
| :--- | :--- | :--- | :--- |
| **C2.1** | Camera disabled on caller & callee | Playwright / Unit | Tile displays employee profile image (or initials fallback); camera paused badge visible; audio remains active. |
| **C2.2** | Missing profile image fallback | Component Test | Initials fallback renders with deterministic background color based on user name; no broken `<img>` tags. |
| **C2.3** | Camera permission denied | Playwright Mock | `getUserMedia` rejects `NotAllowedError`; UI displays toast warning; audio stream continues unbroken; camera toggle disabled. |
| **C2.4** | Camera toggled mid-call | Live Browser | Toggling video button disables local track, transmits `call:media-state`, and switches remote tile between video and avatar. |
| **C2.5** | 1-Participant Layout | Live Browser | Full-stage layout, aspect-ratio preserved. |
| **C2.6** | 2-Participant Layout | Live Browser | 50/50 balanced split screen on desktop, vertical split on mobile. |
| **C2.7** | 3 to 4 Participants Layout | Live Browser | Adaptive 2x2 grid with equal sizing and active-speaker border rings. |
| **C2.8** | 5+ Participants Layout | Live Browser | Active speaker primary stage (80%) + responsive filmstrip carousel (20%). |
| **C2.9** | Screen sharing start & layout | Live Browser | Screen presentation takes 88% canvas in `object-contain`; participant filmstrip docks at bottom. |
| **C2.10** | Screen-share permission denial | Playwright Mock | `getDisplayMedia` rejection caught gracefully; original camera stream layout preserved without error. |
| **C2.11** | Browser-native screen stop | Live Browser | Native `track.onended` event triggers `handleStopScreenShare()`; camera track restored to sender; 2-way split restored. |
| **C2.12** | In-call add colleague (Authorized) | Live Browser / Socket | Colleague searched in directory; invite emitted; colleague accepts; 3rd tile joins grid seamlessly. |
| **C2.13** | In-call add colleague (Cross-Tenant) | API Security Test | Attempting to invite user from different `tenantId` rejected by backend with `403 FORBIDDEN`. |
| **C2.14** | Peer reconnecting in group/grid | Live Browser | Disconnected participant tile shows amber "Reconnecting..." badge; other participants continue talking without drop. |
| **C2.15** | Mobile layout & controls | Playwright (390x844) | Toolbar buttons fit without horizontal clipping; tap switches camera / toggles PiP smoothly. |
| **C2.16** | CMS & Root Workspace Parity | Diff / Typecheck | Identical behavior across `CMS/src/components/chat/` and `src/components/chat/`. Zero typecheck errors. |

---

## Part D — Strict Boundaries & Implementation Plan

### 1. Boundaries (Strictly Enforced)
- **Phase C1 Stability**: C1 authoritative state machine and 119 historical records remain 100% frozen.
- **No SFU / LiveKit Ingestion in C2**: Direct calls and small group calls will use WebRTC Mesh and signaling relays without introducing external media servers or paid cloud dependencies.
- **No Global CSS Overhauls**: Styling restricted to component modules using existing Tailwind and CSS custom properties.
- **No Git Merge / Push / Production Deployment**: Work remains on local branch for verification and review.

### 2. Files Planned for C2 Implementation
1. **Frontend (CMS & Root Parity)**:
   - `CMS/src/components/chat/unified-chat-app.tsx`
   - `src/components/chat/unified-chat-app.tsx`
   - `CMS/src/components/chat/adaptive-video-grid.tsx` *(New Modular Component)*
   - `src/components/chat/adaptive-video-grid.tsx` *(New Modular Component)*
   - `CMS/src/components/chat/screen-share-stage.tsx` *(New Modular Component)*
   - `src/components/chat/screen-share-stage.tsx` *(New Modular Component)*
2. **Backend**:
   - `server/src/socket.ts` (Handling `call:invite_colleague`, `call:media-state`, and mesh relays)
   - `server/src/services/call-lifecycle.service.ts` (Support adding authorized participants to active Call sessions in DB)
   - `server/src/routes/call.routes.ts` (REST endpoint for in-call invitations)
3. **Verification**:
   - `scripts/verify_phase_c2_adaptive_grid_e2e.cjs` (Playwright E2E suite)

---

## Part E — Review & Gate Checkpoint

- [x] Part A: C1 Read-Only Closure Audit Complete (119 historical records cryptographically verified).
- [x] Part B: C2 Architecture & Design Specification Complete.
- [x] Part C: Acceptance Test Scenarios Complete.
- [x] Part D: Boundaries, Exact Files, and Risks Documented.

**Implementation Status**: All Phase C1 work is verified and closed. Phase C2 architecture is specified. Awaiting explicit user approval before modifying code or starting Phase C2 implementation.

