# MASTERHRMS — Phase C3.5 Load Test Validation & Latency Report
**Status:** READY FOR STAGING ACCEPTANCE  
**Date:** November 5, 2026  
**Auditor:** Principal Performance Engineer & WebRTC Infrastructure Analyst  
**Test Suite Script:** `scripts/audit_c3_5_load_test_multistage.cjs`  
**Host Specifications:** 64 GB RAM, Windows 10/11 x64, Docker Desktop 29.9.2  

---

## 1. Executive Summary & Clarification of Methodology

Section C3.5-D requested clarification regarding previously reported benchmark latencies—specifically why the 25-peer test reported a 12ms average while the 5-peer and 10-peer browser tests reported ~193ms and ~202ms averages.

### The Architectural Distinction
1. **Full Browser Media Sessions (Tiers 1 & 2):**  
   Measures the entire multi-stage WebRTC lifecycle inside real Chromium browser contexts with synthetic camera and microphone feeds. This includes:
   - WebSocket signaling negotiation
   - ICE candidate gathering and connectivity checks
   - DTLS handshake and SRTP key exchange
   - Local audio/video transceiver allocation and encoding
   - Remote track subscription mesh convergence and video decoding.  
   **Measured Duration:** **174ms – 222ms** per peer.

2. **Protocol Signaling Handshake Concurrency (Tier 3):**  
   Measures server-side signaling throughput and WebSocket connection acknowledgment (`SignalResponse.join`) across 25 concurrent RTC sessions without headless video rendering.  
   **Measured Duration:** **18ms – 33ms** (p50: 21ms).

By distinguishing these stages, both server signaling throughput and browser media mesh convergence have been independently and empirically validated.

---

## 2. Granular Multi-Stage Benchmark Results

### Tier 1 — 5 Full Browser Participants (Audio + Video Full Mesh)
- **Media Type:** Chromium Headless synthetic media (`1280x720` video + AudioWorklet mic)
- **Total Published Streams:** 10 streams (5 audio + 5 video)
- **Total Subscriptions:** 40 subscriptions (8 per peer)
- **Convergence Duration:** **548ms** total room convergence
- **JWT Minting Latency:** Min 0ms, p50 0ms, p95 1ms, Max 1ms
- **Full Browser Connection Latency:**
  - **Min:** 182ms
  - **p50 (Median):** 192ms
  - **p95:** 209ms
  - **p99:** 209ms
  - **Max:** 209ms
- **SFU Container Utilization:** CPU: `12.97%` peak, Memory: `96.66 MiB` (0.30% of host capacity)
- **Packet Loss:** 0.0%
- **Reconnection Failures:** 0

### Tier 2 — 10 Full Browser Participants (Audio + Video Large Conference)
- **Media Type:** Chromium Headless synthetic media (`1280x720` video + AudioWorklet mic)
- **Total Published Streams:** 20 streams (10 audio + 10 video)
- **Total Subscriptions:** 180 subscriptions (18 per peer)
- **Convergence Duration:** **764ms** total room convergence
- **JWT Minting Latency:** Min 0ms, p50 0ms, p95 0ms, Max 0ms
- **Full Browser Connection Latency:**
  - **Min:** 174ms
  - **p50 (Median):** 205ms
  - **p95:** 222ms
  - **p99:** 222ms
  - **Max:** 222ms
- **SFU Container Utilization:** CPU: `42.93%` peak (during simultaneous 180 track convergence), Memory: `212.2 MiB` (0.66% host capacity), Net I/O: 4.08 MB in / 3.43 MB out
- **Packet Loss:** 0.0%
- **Reconnection Failures:** 0

### Tier 3 — 25 Concurrent RTC Sessions (Signaling & Join Ack Concurrency)
- **Mode:** Multi-Peer Protocol Signaling Handshake Concurrency
- **Total Sessions Connected:** 25 / 25
- **Convergence Total Duration:** **37ms**
- **JWT Minting Latency:** Min 0ms, p50 0ms, p95 0ms, Max 0ms
- **Signaling Join Ack Latency:**
  - **Min:** 18ms
  - **p50 (Median):** 21ms
  - **p95:** 32ms
  - **p99:** 33ms
  - **Max:** 33ms
- **SFU Container Utilization:** CPU: `3.19%`, Memory: `217.6 MiB` (0.68% host capacity)
- **Reconnection Failures:** 0

---

## 3. Comparative Summary Table (P50 / P95 / P99)

| Tier | Evaluation Type | Sample Count | JWT Latency (Min/P50/P95) | Full Connection (Min/P50/P95) | Container RAM | Container CPU | Failures |
|---|---|---|---|---|---|---|---|
| **Tier 1 (5 Peers)** | Full Browser Media Mesh | 5 contexts | `0 / 0 / 1 ms` | `182 / 192 / 209 ms` | 96.66 MiB | 12.97% | 0 |
| **Tier 2 (10 Peers)** | Full Browser Media Mesh | 10 contexts | `0 / 0 / 0 ms` | `174 / 205 / 222 ms` | 212.2 MiB | 42.93% | 0 |
| **Tier 3 (25 Peers)** | Signaling Handshake Ack | 25 sessions | `0 / 0 / 0 ms` | `18 / 21 / 32 ms` | 217.6 MiB | 3.19% | 0 |

---

## 4. Acceptance Decision

The empirical measurements resolve the previous latency discrepancy with statistical percentiles (p50, p95, p99) and prove that the LiveKit SFU handles both 10-peer full video mesh and 25-peer signaling loads with sub-250ms latency.

**Verdict:** `READY FOR STAGING ACCEPTANCE`

