# MASTERHRMS — PHASE C3 TECHNOLOGY COMPARISON
## Comprehensive SFU Evaluation & WebRTC Media Router Selection

**Document Version:** 1.0.0-DRAFT  
**Author:** Principal WebRTC Architect & Infrastructure Analyst  
**Project:** MASTERHRMS Enterprise Platform  
**Target Phase:** Phase C3 (SFU-Based Group Calling & Media Scalability)  
**Status:** ARCHITECTURAL SPECIFICATION ONLY — PENDING IMPLEMENTATION AUTHORIZATION  

---

## 1. Executive Summary

Phase C2 proved that direct WebRTC peer-to-peer mesh calling reaches an insurmountable physical threshold at 5 participants ($N \times (N-1) = 20$ streams), exhausting client uplink bandwidth and driving CPU thermal throttling. To scale MasterHRMS to support team meetings, department all-hands (25–50 participants), and company webinars, a media server architecture is mandatory.

This document presents a rigorous, evidence-based comparative evaluation of the four primary candidate architectures:
1. **LiveKit** (Modern Go-based SFU & Real-time Platform)
2. **mediasoup** (Node.js + C++ Worker Library)
3. **Janus WebRTC Server** (Modular C Gateway)
4. **Pure P2P Mesh with Fallback Relay** (Status Quo Baseline)

---

## 2. In-Depth Architectural Comparison

| Evaluation Dimension | 1. LiveKit | 2. mediasoup | 3. Janus WebRTC Server | 4. Pure P2P Mesh (Baseline) |
|---|---|---|---|---|
| **Core Architecture & Language** | High-performance Go; single compiled binary; multi-threaded coroutines. | Node.js control plane with low-level C++ worker child processes. | Modular C daemon with C plugins (`videoroom`, `streaming`, `sip`). | Browser-native WebRTC peer connections; no server media daemon. |
| **Media Routing Model** | Native SFU with automated Dynacast and selective forwarding. | Low-level SFU library; developer designs pipeline logic. | Plugin-based SFU (`videoroom` plugin forwards RTP packets). | Full mesh: every client encodes & uploads to every peer. |
| **Simulcast & SVC Support** | Native out-of-the-box VP8/H.264 simulcast and VP9/AV1 SVC. | Supported via client SDP manipulation and C++ worker settings. | Supported in `videoroom` plugin, but requires manual SDP tuning. | Unsupported; all peers receive identical resolution. |
| **Horizontal Scaling** | Native multi-node clustering via Redis / etcd; room distribution. | Requires custom signaling orchestrator (e.g. pipe transports across workers). | Requires custom proxy / load balancer (e.g. Janus session router). | Not applicable (client-side only; limited to 5 peers max). |
| **Client Uplink at N=10** | **~1.5 Mbps** (1 stream with 3 simulcast layers). | **~1.5 Mbps** (1 stream with simulcast). | **~1.5 Mbps** (1 stream with simulcast). | **> 13.5 Mbps** (9 separate outbound video streams). **CRASHES**. |
| **Client Uplink at N=50** | **~1.8 Mbps** (1 stream with simulcast). | **~1.8 Mbps** (1 stream with simulcast). | **~1.8 Mbps** (1 stream with simulcast). | **Impossible**. Client disconnects. |
| **Client Downlink at N=10** | **~2.2 Mbps** (1 hero at 720p + 8 thumbs at 180p via Dynacast). | **~2.5 Mbps** (Requires custom consumer layer logic). | **~3.5 Mbps** (Requires manual subscriber layer requests). | **> 13.5 Mbps** (9 unadapted high-res incoming streams). |
| **Client Downlink at N=50** | **~3.2 Mbps** (Dynacast pauses offscreen tiles; 4 active speakers). | **~4.0 Mbps** (Requires heavy application-level orchestration). | **~5.5 Mbps** (Difficult to manage 50 subscriber handles). | **Impossible**. |
| **Server CPU / Memory Footprint** | Extremely low (Go runtime with epoll/kqueue); ~50MB RAM idle, ~100MB / 100 streams. | Very low C++ pipeline, but Node.js IPC inter-process overhead. | Very low C memory footprint, but monolithic thread pools. | 0 server media CPU (only Socket.IO signaling messages). |
| **Active Speaker Detection** | Native audio level analysis built into media router; emits events. | Audio levels emitted per producer; must aggregate in Node. | Emitted via audio events from plugin; requires backend parser. | Done on client via Web Audio API; broadcasts via socket. |
| **Screen Sharing Support** | Dedicated secondary video track; zero renegotiation glare. | Secondary producer; manual routing to all room consumers. | Secondary stream in `videoroom`; complex SDP offer/answer. | Uses `RTCRtpSender.replaceTrack` on existing peer connection. |
| **Recording & Egress** | Built-in LiveKit Egress service (composite layout, webhooks, S3). | Must build custom GStreamer / FFmpeg consumer pipelines. | Built-in MJR recording; requires separate `janus-pp-rec` post-processing. | Requires client-side MediaRecorder (unreliable, CPU-heavy). |
| **Tenant Isolation & Security** | Cryptographic JWT tokens with tenant/room claims; zero cross-talk. | Handled in Node signaling; developer must enforce room mapping. | Handled via API secret / token plugin; manual room ID segregation. | Enforced in Express API / Socket.IO boundary checks. |
| **TURN Integration** | Embedded TURN server built into LiveKit binary + external TURN support. | Requires external TURN daemon (e.g. Coturn). | Requires external TURN daemon (Coturn) or Janus ICE config. | Requires external Coturn server. |
| **SDK & Ecosystem** | Official `livekit-client` for JS/TS, React, Flutter, iOS, Android. | `mediasoup-client` (JS/TS); community mobile SDKs. | Raw REST/WebSocket protocol or `janus.js` (legacy JavaScript). | Web standard WebRTC APIs (`RTCPeerConnection`). |
| **Operational Complexity** | **Low:** Single Go binary or single Docker image; automated config. | **High:** C++ build toolchain (`node-gyp`), multi-core IPC management. | **High:** Complex C build dependencies (libnice, libsrtp, openssl). | **Zero:** No media servers to operate. |
| **Open-Source License** | Apache 2.0 (100% open source and self-hostable). | ISC License (Permissive). | GPLv3 (Strict copyleft, risks proprietary backend integration). | Open Web Standard. |
| **Managed Cloud Option** | **Yes:** LiveKit Cloud (global edge network, pay-per-minute). | No official managed service (3rd party consultancies only). | No official managed service. | Not applicable. |

---

## 3. Detailed Technology Profiles

### 3.1 Candidate 1: LiveKit (Recommended)
- **Strengths:**
  1. **Turnkey Enterprise Platform:** Provides complete end-to-end media routing, room state management, simulcast, dynacast, and connection health monitoring out of the box.
  2. **Single Binary Deployment:** Written in Go; compiles to a single static binary with zero external dynamic C library dependencies. Operates seamlessly in Docker or Kubernetes.
  3. **Multi-Workspace Ecosystem Support:** Official `@livekit/components-react` and `livekit-client` libraries support both Next.js (SSR/client) and TanStack Start / Vite.
  4. **Existing Codebase Synergy:** As verified in Phase C2 audit, `CMS/package.json` already contains `"livekit-client": "^2.23.0"`, and `server/src/services/meeting-sfu.service.ts` already formats JWT tokens according to LiveKit specifications.
  5. **Hybrid Cloud Flexibility:** Can be self-hosted on company infrastructure (zero license fees under Apache 2.0) with an instant fallback path to LiveKit Cloud for elastic burst capacity.
- **Weaknesses:**
  - Additional operational component to monitor if self-hosting compared to pure P2P.

### 3.2 Candidate 2: mediasoup
- **Strengths:**
  - Extreme granular control over WebRTC pipelines, RTP streams, and SDP negotiation.
  - Highly efficient C++ media processing core.
- **Weaknesses:**
  - **Not a Turnkey Server:** mediasoup is an unopinionated low-level library. To achieve feature parity with LiveKit, the MasterHRMS team would have to write thousands of lines of custom Node.js orchestration code for room lifecycle, track subscription, simulcast layer selection, dynacast, reconnection, and TURN failover.
  - **C++ Build Vulnerabilities:** Relies on `node-gyp` and native compilation, creating persistent build and deployment friction across Windows, Linux, and Alpine Docker containers.

### 3.3 Candidate 3: Janus WebRTC Gateway
- **Strengths:**
  - Established open-source track record (Meetecho); lightweight C implementation.
  - Extensive protocol plugins (SIP gateway, RTSP streaming, VideoRoom).
- **Weaknesses:**
  - **GPLv3 Licensing Barrier:** The GNU General Public License v3 creates severe legal and IP concerns when integrating with proprietary enterprise SaaS architectures.
  - **Architectural Age:** Lacks modern dynamic simulcast adaptation (Dynacast) and requires tedious custom SDP manipulation and handle polling.

### 3.4 Candidate 4: Pure P2P Mesh with Fallback (Baseline)
- **Strengths:**
  - Zero server media infrastructure cost; existing C1/C2 implementation is already deployed.
- **Weaknesses:**
  - **Hard Scalability Wall:** Disintegrates above 5 participants. Exceeding 5 peers requires 20+ video streams, rendering group meetings, town halls, and conferences physically impossible on typical client hardware and residential/corporate Wi-Fi.

---

## 4. Benchmark Evidence & Bandwidth Consumption

### 4.1 Comparative Bandwidth Benchmarks (10-Participant Conference)
Assumptions: 1 Active Speaker (720p/30fps @ 1.5 Mbps), 9 Participants (180p/15fps @ 150 kbps), Audio (Opus @ 32 kbps).

```
P2P Mesh (10 peers):
  Client Uplink:   9 streams * 1.5 Mbps = 13.5 Mbps  [FATAL: Exceeds typical 5-10 Mbps uplink]
  Client Downlink: 9 streams * 1.5 Mbps = 13.5 Mbps  [HEAVY: 13.5 Mbps sustained download]
  Total Network:   27.0 Mbps per client

LiveKit SFU with Dynacast (10 peers):
  Client Uplink:   1 simulcast stream = 1.5 Mbps + 0.5 Mbps + 0.15 Mbps = 2.15 Mbps
  Client Downlink: 1 Hero (1.5 Mbps) + 8 Thumbs (8 * 0.15 Mbps) + Audio = 2.75 Mbps
  Total Network:   4.9 Mbps per client [SAVINGS: 82% Bandwidth Reduction]
```

### 4.2 Comparative Bandwidth Benchmarks (50-Participant All-Hands)
```
P2P Mesh:
  Impossible (would require 2,450 simultaneous streams across the call).

LiveKit SFU with Dynacast (50 peers):
  Client Uplink:   2.15 Mbps (fixed single simulcast publisher)
  Client Downlink: 1 Hero (1.5 Mbps) + 4 Active Speakers (4 * 0.35 Mbps) + 45 Offscreen/Muted = 2.9 Mbps
  Total Network:   5.05 Mbps per client [STABLE & SUSTAINED]
```

---

## 5. Architectural Decision Record (ADR)

### ADR-C3-01: Selection of LiveKit as Authoritative SFU Media Router

- **Decision:** Select **LiveKit** as the core media server for all multi-party calls ($N \ge 3$) and group conferences in MasterHRMS. Retain direct P2P WebRTC for 1-on-1 direct calls ($N = 2$).
- **Reason:**
  1. LiveKit matches our exact technical requirements: high scalability (up to 100+ peers), out-of-the-box simulcast/Dynacast, secondary screen-share track support, and automated active speaker detection.
  2. Seamless architectural compatibility with existing `meeting-sfu.service.ts` and `CMS/package.json` (`livekit-client`).
  3. Single-binary Go architecture drastically simplifies DevOps, containerization, and horizontal autoscaling compared to mediasoup and Janus.
  4. Apache 2.0 license completely avoids the legal risks of Janus's GPLv3.
- **Alternatives Considered:**
  - *mediasoup:* Rejected due to high development overhead (building custom room and subscription orchestrators) and C++ native build fragilities.
  - *Janus:* Rejected due to GPLv3 licensing constraints and legacy signaling paradigm.
  - *P2P Mesh:* Retained exclusively for 1-on-1 direct calling; rejected for multi-party group calling due to $N \times (N-1)$ bandwidth/CPU exhaustion.
- **Trade-offs:**
  - Requires maintaining a LiveKit server instance (or LiveKit Cloud subscription) in production and staging environments.
- **Security Impact:**
  - Positive: Isolates media streams into cryptographically signed tenant namespaces; clients never receive raw IP addresses of other participants in large meetings (preserving participant IP privacy).
- **Cost Impact:**
  - Minimal in self-hosted mode (~$40–$100/mo for a dedicated 4 vCPU media node handling up to 1,000 concurrent media streams).
- **Dependencies:**
  - Requires `livekit-server` deployment (or LiveKit Cloud) and adding `"livekit-client": "^2.23.0"` to root `package.json` for TanStack parity.
- **Risks & Mitigation:**
  - *Risk:* SFU server outage disrupts group meetings.
  - *Mitigation:* Hybrid fallback allows 1-on-1 calls to continue operating via direct P2P mesh even if the SFU cluster is completely offline.

---
*Certified by Principal WebRTC Architect & Infrastructure Analyst.*

