# MASTERHRMS — PHASE C2 CLOSURE AUDIT & C3 READINESS ASSESSMENT REPORT

**Audit Date:** November 5, 2026  
**Auditor Roles:** Principal Software Architect, Senior Full-Stack Engineer, WebRTC Specialist, PostgreSQL Auditor, QA Automation Lead  
**Repository Working Tree:** `c:\Users\TSV Global Solutions\Documents\hrms`  
**Git Branch:** `main`  
**Git HEAD Commit:** `79998ccc6c7aeb32b21f85e1716c8ba59df6257f`  
**Target Phase:** Phase C2 (Calling UI & Media Experience: Adaptive Grid, Avatar Fallbacks, Presentation Canvas, In-Call Colleague Invitation)  
**Primary Audit Verdict:** **CONDITIONAL PASS**  

---

## 1. Executive Summary & Verdict

### Final Verdict: **CONDITIONAL PASS**

The Phase C2 implementation of the MasterHRMS Calling Module has undergone a comprehensive, evidence-based, read-only closure audit.

The evaluation confirms that:
1. **Core Feature Completeness:** All required Phase C2 UI/UX components and media handlers—including the adaptive video grid, deterministic initials/avatar generation, screen-sharing canvas with `RTCRtpSender.replaceTrack()`, in-call colleague search/invitation modal, and the PostgreSQL-enforced 5-peer mesh boundary—are genuinely implemented in production source code.
2. **Historical Data Integrity:** The pre-existing 119 `call_history_records` rows remain completely intact and bit-for-bit identical to the baseline SHA-256 checksum (`0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`). No data was mutated, truncated, or dropped.
3. **Multi-Tenant Security Boundaries:** In-call colleague invitations strictly enforce tenant isolation both in database queries and in the REST/Socket layer. Cross-tenant invitation attempts return HTTP 403 Forbidden with zero data leakage.
4. **Workspace Parity:** Complete symmetric parity is maintained between the Next.js CMS workspace (`CMS/src/components/calling/`) and the root TanStack workspace (`src/components/calling/`).

### Why "Conditional" Pass?
The audit identified a significant testing gap in the automated Playwright E2E suite (`scripts/verify_phase_c2_adaptive_grid_e2e.cjs`):
- While the suite reported **20/20 PASS**, our source-code inspection revealed that **8 of the 20 scenarios** relied on simulated DOM injection, mocked evaluations (`return true`), or hardcoded result records rather than live end-to-end multi-peer media negotiation.
- Specifically, the speaking indicator test injected `.ring-4.ring-emerald-500` directly into the DOM instead of driving audio through the browser's Web Audio API, and the 5-peer limit test checked a simulated JavaScript object instead of evaluating backend rejection on the 6th participant.
- The underlying implementation code is sound, functional, and enterprise-grade. However, before proceeding to Phase C3 production deployment, the automated test harness must be reinforced with true headless multi-client WebRTC assertions.

---

## 2. Audit Scope & Evidence Sources

### Repository State Audited
- **Branch:** `main`
- **Commit:** `79998ccc6c7aeb32b21f85e1716c8ba59df6257f` (`feat(calling): implement authoritative call state machine (Phase C1) and adaptive UI media experience (Phase C2)`)
- **Working Tree State:** Clean (`nothing to commit, working tree clean`)

### Files Inspected
1. **Frontend Calling Components:**
   - `CMS/src/components/calling/adaptive-video-grid.tsx` (452 lines)
   - `src/components/calling/adaptive-video-grid.tsx` (451 lines)
   - `CMS/src/components/calling/screen-share-stage.tsx` (147 lines)
   - `src/components/calling/screen-share-stage.tsx` (146 lines)
   - `CMS/src/components/calling/in-call-invite-modal.tsx` (237 lines)
   - `src/components/calling/in-call-invite-modal.tsx` (236 lines)
   - `CMS/src/components/chat/unified-chat-app.tsx` (Web Audio API, `replaceTrack`, screen-share handlers)
2. **Backend Services & Routes:**
   - `server/src/services/call-lifecycle.service.ts` (999 lines, including `addParticipantToActiveCall`)
   - `server/src/routes/call.routes.ts` (1,092 lines, including `POST /:callId/invite-colleague`)
   - `server/src/socket.ts` (media state broadcasts and group call signaling)
3. **Database Schema & Migrations:**
   - `prisma/schema.prisma` (`Call`, `CallParticipant`, `CallEvent`, `CallHistoryRecord`)
   - PostgreSQL table state via read-only inspection script.
4. **Verification Scripts & Test Artifacts:**
   - `scripts/verify_historical_call_records.cjs`
   - `scripts/verify_phase_c2_adaptive_grid_e2e.cjs`
   - `docs/Saas/screenshots/chat/` (6 visual artifacts)

---

## 3. Historical Call Records & Data Integrity

### Verification Execution & Results
A read-only execution of `scripts/verify_historical_call_records.cjs` verified the entire database table `call_history_records`:

```
================================================================================
  MASTERHRMS HISTORICAL CALL RECORDS AUDIT (READ-ONLY)
================================================================================
  Connected to database successfully.
  Total CallHistoryRecord rows in DB: 123
  Pre-existing baseline records:      119
  Additive post-migration records:    4
  Verification Status:
  ✓ Baseline Count: 119 rows preserved
  ✓ Master SHA-256 Checksum: MATCHED
    Expected: 0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a
    Computed: 0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a
  ✓ Zero mutations, zero nullified historical columns, zero dropped records.
================================================================================
```

### Integrity Analysis
- **Baseline Preserved:** Exactly 119 records created prior to Phase C1/C2 remain untouched.
- **Bit-for-Bit Hash Verification:** The canonical SHA-256 digest calculated across all sorted JSON fields of the 119 records exactly matches the baseline.
- **Additive Schema Evolution:** The 4 new records created during C1/C2 verification tests populated new columns (`callSessionId`, `reconnectCount`) while maintaining strict backwards compatibility with legacy columns (`channelName`, `duration`, `status`).

---

## 4. Adaptive Video Grid Audit

### Implementation Inspection (`adaptive-video-grid.tsx`)
The grid dynamically computes layout topology based on `participants.length`:

| Participant Count | Layout Mode | Data-TestId | Grid / Flex Styling | Geometry |
|---|---|---|---|---|
| **1 Participant** | Full-Stage Hero | `grid-layout-1` | `w-full max-w-4xl h-full flex items-center justify-center` | `aspect-video` |
| **2 Participants** | Balanced 50/50 Split | `grid-layout-2` | `grid grid-cols-1 md:grid-cols-2 gap-3` | `aspect-video` |
| **3–4 Participants** | Adaptive 2x2 Quad | `grid-layout-4` | `grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3` | `aspect-video` |
| **5+ Participants** | Active-Speaker Stage + Filmstrip | `grid-layout-5plus` | 80% Hero Stage + 20% Horizontal Filmstrip (`h-24 sm:h-28 overflow-x-auto`) | Stage: 16:9, Strip: aspect-video tiles |

### Code Quality & Edge Cases
- **Aspect-Ratio Preservation:** Every tile container enforces `aspect-video` (16:9) with `overflow-hidden rounded-xl border border-border shadow-xs`. Video elements use `object-cover` to prevent letterboxing distortion inside tiles.
- **P2P Mesh Indicator:** When participant count reaches 3 or more, a banner displays `P2P Direct Mesh Calling (N/5 max peers)`. At 5 peers, it adds the badge `Mesh Limit Reached`.

---

## 5. Camera-Off & Avatar Fallback Audit

### Fallback Hierarchy
When `isCameraOff === true`, `isInvited === true`, or video stream is paused:
1. **Primary Layer:** The `<video>` element is conditionally hidden or removed from the active rendering tree.
2. **Secondary Layer (Profile Picture):** If `participant.avatarUrl` is non-null, an `<img>` tag renders with `rounded-full object-cover shadow-lg border-2 border-border`.
3. **Tertiary Layer (Deterministic Initials):** If `avatarUrl` is null or fails to load (`onError` handler), a deterministic initials fallback badge is rendered.

### Deterministic Initials & Color Generation
- **Initials Algorithm (`getDeterministicInitials`):** Splits on whitespace, strips non-alphabetic characters, extracts first letters of first and last tokens, uppercase. Defaults to `"U"`.
- **Color Hashing Algorithm (`getDeterministicAvatarColor`):** Sums char codes of the participant name, modulus 8 over a Tailwind palette:
  - `bg-blue-500/15 text-blue-600 border-blue-500/30`
  - `bg-emerald-500/15 text-emerald-600 border-emerald-500/30`
  - `bg-violet-500/15 text-violet-600 border-violet-500/30`
  - `bg-amber-500/15 text-amber-600 border-amber-500/30`
  - `bg-rose-500/15 text-rose-600 border-rose-500/30`
  - `bg-cyan-500/15 text-cyan-600 border-cyan-500/30`
  - `bg-indigo-500/15 text-indigo-600 border-indigo-500/30`
  - `bg-teal-500/15 text-teal-600 border-teal-500/30`
- **Audio Continuity:** Toggling camera state does not touch audio tracks or renegotiate WebRTC peer connections.

---

## 6. Active Speaker Detection Audit

### Frontend Implementation (`unified-chat-app.tsx` L2008–2085)
- **Engine:** Web Audio API (`AudioContext` / `webkitAudioContext`).
- **Analyser Configuration:**
  - `analyser = audioContext.createAnalyser()`
  - `analyser.fftSize = 256` (128 frequency bins)
  - `javascriptNode = audioContext.createScriptProcessor(2048, 1, 1)`
- **Audio Processing Loop:**
  - Reads frequency byte data into `Uint8Array(analyser.frequencyBinCount)`.
  - Computes `average = values / length`.
  - **Threshold:** `average > 15` triggers active speaking.
  - **Hysteresis / Debounce:** 800ms debounce timer before transitioning `isSpeaking` back to `false` to prevent visual flickering during natural speech pauses.
- **Signaling:** Dispatches `group-call:media-state` socket event to notify call peers.
- **Visual Presentation:**
  - Active speaker receives `ring-4 ring-emerald-500 scale-105` on avatar or video frame.
  - An animated badge `<Activity className="size-2.5" /> Speaking` pulses at the bottom of the avatar.

---

## 7. Screen Sharing & Track Replacement Audit

### Architecture & `replaceTrack` Implementation
Inspected in `CMS/src/components/chat/unified-chat-app.tsx` (L3870–3940) and `screen-share-stage.tsx`:
- **Canvas Viewport:** 85–90% presentation canvas with `#000000` black letterboxing using `object-contain`.
- **Zero-Renegotiation Track Swapping:**
  ```typescript
  const senders = pc.getSenders();
  const vs = senders.find((s) => s.track?.kind === "video");
  if (vs) {
    if (!originalVideoTrackRef.current) {
      originalVideoTrackRef.current = vs.track;
    }
    await vs.replaceTrack(screenTrack);
  }
  ```
- **Native Browser Stop Handling:**
  Listens to `screenTrack.addEventListener("ended", ...)` (e.g. Chrome's floating "Stop Sharing" bar). Upon trigger, automatically invokes `replaceTrack(originalVideoTrackRef.current)` without closing or renegotiating the `RTCPeerConnection`.
- **Local Muting:** Presenter's own video element in the stage is muted (`muted={isLocalPresenter}`) to prevent audio feedback loop.

---

## 8. In-Call Colleague Invitation & Capacity Audit

### Backend Flow (`server/src/routes/call.routes.ts` & `call-lifecycle.service.ts`)
- **Route:** `POST /api/calls/:callId/invite-colleague`
- **Authentication & Tenancy Validation:**
  - Resolves target user via `resolveTargetUserId(tenantId, targetUserId)`.
  - Checks `targetUser.profile.tenantId === req.user.tenantId`. If mismatch, immediately returns `HTTP 403 Forbidden` (`CallForbiddenError`).
- **Database Concurrency & Row Locking:**
  - Executes inside `db.$transaction`.
  - Locks call session via `SELECT * FROM "calls" WHERE ... FOR UPDATE`.
  - Verifies inviter is a `JOINED` or `RINGING` participant in the call.
- **P2P Mesh Limit Enforcement:**
  - Queries active participants (`INVITED`, `RINGING`, `JOINED`, `RECONNECTING`).
  - Strict ceiling: `if (currentParticipants.length >= maxParticipantsLimit) throw new CallConflictError("Maximum participant limit (5 peers for P2P mesh) reached.");` -> returns `HTTP 409 Conflict`.
- **Call Upgrade:**
  - Automatically updates call record from `DIRECT` to `GROUP` with `maxParticipants = 5`.
- **Audit Logging:** Inserts immutable `callEvent` with type `PARTICIPANT_INVITED`.

---

## 9. Participant Lifecycle & State Machine Audit

| Participant State | Visual Representation in UI | Transition Trigger | Timeout / Handling |
|---|---|---|---|
| `INVITED` | Amber pulsating badge, avatar with "Ringing colleague..." | Inviter submits modal form | 30s ringing timeout -> transitions to `MISSED` / removed |
| `JOINED` | Active video stream or camera-off avatar with name badge | Callee accepts call via WebRTC / REST | Normal in-call state |
| `RECONNECTING` | Blurred glassmorphic overlay, spinner, countdown badge | `RTCPeerConnection` iceConnectionState enters `disconnected` | 30-second grace countdown -> transitions to `LEFT` |
| `LEFT` | "Participant Left" overlay, followed by tile dismissal | Socket `call:peer_left` or explicit hangup | Tile smoothly unmounts from grid |

---

## 10. Multi-Device & Mobile Layout Audit

### Responsive Design & Behavior
- **Tailwind Grid Breakpoints:**
  - 2 participants: `grid-cols-1 md:grid-cols-2`. On mobile (< 768px), tiles auto-stack vertically, preventing cramped horizontal squeeze.
  - 3–4 participants: `grid-cols-2 grid-rows-2 gap-2`. Compact mobile margins (`p-1`).
  - Presentation mode: Video canvas shrinks to allow filmstrip scrolling along the bottom horizontally.
- **Touch-Friendly Hit Targets:** All call action buttons (`hangup`, `camera`, `mic`, `screen`, `invite`) enforce minimum 40px hit areas (`size-10` / `size-12` rounded-full buttons).

---

## 11. Workspace Parity Audit

### Diff Analysis: CMS vs Root TanStack Workspace
Ran programmatic diffs across calling components:
1. `CMS/src/components/calling/adaptive-video-grid.tsx` vs `src/components/calling/adaptive-video-grid.tsx` -> **0 content differences** (identical 451 lines; 1 trailing blank line in CMS).
2. `CMS/src/components/calling/screen-share-stage.tsx` vs `src/components/calling/screen-share-stage.tsx` -> **0 content differences** (identical 146 lines).
3. `CMS/src/components/calling/in-call-invite-modal.tsx` vs `src/components/calling/in-call-invite-modal.tsx` -> **0 content differences** (identical 236 lines).

**Parity Status:** 100% Symmetric Parity.

---

## 12. Playwright E2E Test Suite Analysis

### Scenario Audit (Reported 20/20 vs Empirical Findings)

| Scenario # | Scenario Name | Reported Status | Actual Audit Finding | Verification Classification |
|---|---|---|---|---|
| **1** | Camera Toggle & Profile Picture Fallback | PASS | Live DOM toggle, asserted `data-camera-off="true"` | **VERIFIED BY EXECUTION** |
| **2** | Initials Fallback When No Profile Picture | PASS | Evaluated initials function in browser context | **VERIFIED BY EXECUTION** |
| **3** | 1-Participant Full-Stage Layout | PASS | **Hardcoded pass** in test script (`record(3, ..., true)`) | **VERIFIED BY SOURCE INSPECTION (SIMULATED IN TEST)** |
| **4** | 2-Participant Balanced Layout | PASS | Asserted `[data-testid="grid-layout-2"]` in live DOM | **VERIFIED BY EXECUTION** |
| **5** | 3–4 Participant Adaptive 2x2 Grid | PASS | Evaluated selector with soft fallback `|| true` | **VERIFIED BY SOURCE INSPECTION (SOFT TEST ASSERTION)** |
| **6** | 5+ Participant Active-Speaker Stage + Filmstrip | PASS | **Hardcoded return true** (`evaluate(() => return true)`) | **VERIFIED BY SOURCE INSPECTION (NOT GENUINELY EXECUTED IN TEST)** |
| **7** | Screen Sharing Presentation Mode | PASS | Triggered screenshare, asserted `screen-share-stage` | **VERIFIED BY EXECUTION** |
| **8** | Screen Sharing Native Stop | PASS | Fired stop, verified canvas teardown & track restore | **VERIFIED BY EXECUTION** |
| **9** | In-Call Colleague Search & Invite | PASS | Opened modal, searched, invited, verified UI update | **VERIFIED BY EXECUTION** |
| **10** | Cross-Tenant Invitation Rejection | PASS | Dispatched REST call to cross-tenant user; got HTTP 403 | **VERIFIED BY EXECUTION** |
| **11** | Max Participants Enforcement (5 Peers) | PASS | **Hardcoded object return** in test script | **VERIFIED BY SOURCE INSPECTION (NOT GENUINELY EXECUTED IN TEST)** |
| **12** | Speaking Indicator Audio Activity | PASS | **Injected CSS ring manually** into DOM | **VERIFIED BY SOURCE INSPECTION (MOCKED IN TEST)** |
| **13** | Voice-Only Fallback on Camera Denial | PASS | **Hardcoded pass** in test script (`record(13, ..., true)`) | **VERIFIED BY SOURCE INSPECTION (NOT TESTED IN SCRIPT)** |
| **14** | Camera Switching via replaceTrack | PASS | Checked button existence only; did not flip track | **VERIFIED BY SOURCE INSPECTION (PARTIAL TEST)** |
| **15** | Participant INVITED Badge | PASS | **Hardcoded pass** in test script (`record(15, ..., true)`) | **VERIFIED BY SOURCE INSPECTION (NOT ASSERTED IN TEST)** |
| **16** | Participant RECONNECTING Countdown Badge | PASS | Simulated disconnect, asserted reconnect banner | **VERIFIED BY EXECUTION** |
| **17** | Mobile Viewport Auto-Stacking | PASS | Resized viewport and screenshotted; no DOM assert | **VERIFIED BY SOURCE INSPECTION & VISUAL SCREENSHOT** |
| **18** | Aspect-Ratio Preservation | PASS | Checked `aspect-video` class in live DOM | **VERIFIED BY EXECUTION** |
| **19** | Dark/Light Theme Semantic Tokens | PASS | Checked CSS custom properties in live DOM | **VERIFIED BY EXECUTION** |
| **20** | Historical CallHistoryRecord Integrity | PASS | SHA-256 verified 119 records bit-for-bit | **VERIFIED BY EXECUTION** |

### Audit Summary of Test Suite
- **Genuinely Verified by Live Execution:** 11 scenarios (55%)
- **Verified by Source Inspection (Simulated/Mocked in Script):** 8 scenarios (40%)
- **Partially Verified:** 1 scenario (5%)
- **Failed Scenarios:** 0

---

## 13. Security, Authorization & Tenancy Audit

1. **Tenant Isolation:**
   - Enforced at both the route level (`req.user.tenantId`) and database service transaction level.
   - SQL queries parameterize `tenantId` in both Prisma queries and raw SQL queries (`$queryRaw` tagged template literals). Zero SQL injection risk.
2. **Actor Authorization:**
   - Only active participants in a call (`JOINED` or `RINGING`) can invite additional colleagues. Outside users cannot inject participants into arbitrary call sessions.
3. **Data Privacy:**
   - In-call search only returns verified colleagues from the same tenant (`profile: { tenantId }`). External guests and other tenants are completely invisible.

---

## 14. Network & WebRTC Architecture Assessment

### Mesh Scalability Analysis: $N \times (N - 1)$
In the current direct peer-to-peer mesh architecture:
- Each peer encodes and uploads $N - 1$ outbound video streams.
- Each peer downloads and decodes $N - 1$ inbound video streams.
- Total streams across mesh: $S = N \times (N - 1)$.

| Participants ($N$) | Outbound Streams / Peer | Inbound Streams / Peer | Total Mesh Streams | Client Uplink Bandwidth (at 1.5 Mbps/stream) | Client CPU Decode Load |
|---|---|---|---|---|---|
| **2** | 1 | 1 | 2 | ~1.5 Mbps | Low |
| **3** | 2 | 2 | 6 | ~3.0 Mbps | Moderate |
| **4** | 3 | 3 | 12 | ~4.5 Mbps | High |
| **5 (Hard Limit)**| 4 | 4 | 20 | ~6.0 Mbps | Very High (Thermal Throttling Risk) |
| **6+** | 5+ | 5+ | 30+ | > 7.5 Mbps | **Unsustainable on Mesh** |

### Architectural Conclusion
The 5-peer limit enforced in Phase C2 is the **absolute physical maximum** for unassisted WebRTC mesh. Exceeding 5 participants will cause packet loss, frame dropping, audio stuttering, and browser tab crashes on typical corporate laptops.

---

## 15. Phase C3 Readiness Assessment

### C3 Mandate: Transition to Selective Forwarding Unit (SFU)
For Phase C3 (Large Group Meetings, Webinars, and Enterprise Conferences):
1. **SFU Integration Requirement:** A media router (e.g. **LiveKit**, mediasoup, or Janus) must be introduced. In an SFU architecture, each client uploads exactly **1** stream, and receives $N - 1$ downsampled simulcast streams.
2. **Database Readiness:** The `calls`, `call_participants`, and `call_events` tables established in C1 and extended in C2 already support room-based group calling (`type: 'GROUP'`, `room_key`, `maxParticipants`). No database migration is required.
3. **Signaling Compatibility:** The current Socket.IO event schema (`group-call:media-state`, `call:participant_invited`, `call:peer_left`) aligns cleanly with SFU room token exchange workflows.

---

## 16. Defect & Remediation Matrix

| Finding ID | Severity | Category | Description | Remediation Plan |
|---|---|---|---|---|
| **C2-FIND-01** | **P1** | Testing Gap | Playwright test script `verify_phase_c2_adaptive_grid_e2e.cjs` uses simulated assertions and hardcoded returns for 8 scenarios. | Upgrade the test suite with a 3-browser multi-context headless harness that actually connects 3–5 real peers before C3 release. |
| **C2-FIND-02** | **P1** | Architecture | Direct P2P mesh reaches uplink exhaustion at 5 participants (20 streams). | Enforce SFU architecture (LiveKit) as an absolute requirement for Phase C3 calls > 4 peers. |
| **C2-FIND-03** | **P2** | Deprecation | `unified-chat-app.tsx` uses `ScriptProcessorNode` for audio level analysis, which is deprecated in W3C Web Audio API. | Refactor audio volume detection to `AudioWorkletNode` in Phase C3. |

---

## 17. Verification Evidence Index

1. **Database Checksum Verification:**
   - Script: `scripts/verify_historical_call_records.cjs`
   - Verified Checksum: `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`
   - Preserved Baseline Records: Exactly 119 rows.
2. **Visual Evidence (Live Browser Screenshots):**
   - `docs/Saas/screenshots/chat/01_phase_c2_call_connected.png`
   - `docs/Saas/screenshots/chat/02_phase_c2_camera_off_avatar_fallback.png`
   - `docs/Saas/screenshots/chat/03_phase_c2_active_speaker_indicator.png`
   - `docs/Saas/screenshots/chat/04_phase_c2_in_call_invite_dialog.png`
   - `docs/Saas/screenshots/chat/05_phase_c2_screen_share_presentation.png`
   - `docs/Saas/screenshots/chat/06_phase_c2_mobile_layout_stacking.png`
3. **Machine-Readable Evidence File:**
   - `docs/hrms-audit/evidence/phase-c2-closure-audit-evidence.json`

---

## 18. Final Sign-off & Recommendations

### Final Assessment
The Phase C2 codebase demonstrates exemplary software architecture, rock-solid PostgreSQL transactional integrity, thoughtful UI/UX polish, and strict multi-tenant security boundaries. 

The conditional nature of this sign-off pertains solely to **QA automation test fidelity**, not to the quality of the production application code.

### Recommendations Before Phase C3 Kickoff
1. **Approve Conditional Pass for Phase C2:** Accept the C2 milestone as code-complete and architecturally sound.
2. **Authorize P1-01 Test Upgrade:** Replace mocked Playwright evaluate calls with multi-peer browser contexts during the initial sprint of Phase C3.
3. **Adopt LiveKit for Phase C3:** Finalize LiveKit Cloud or self-hosted LiveKit SFU server configuration for all calls exceeding 4 participants.

---
*Report certified by Principal Software Architect & QA Automation Lead on November 5, 2026.*

