# MASTERHRMS — Existing Hosting Capacity & Limitation Report
## Empirical Inspection of Vercel Serverless, Supabase Postgres & Workstation NAT Constraints

**Role:** Senior Infrastructure Auditor, Systems Architect  
**Execution Timestamp:** 2026-11-05T11:52:00+05:30  
**Audit Target:** All active infrastructure tiers in MASTERHRMS  
**Verdict:** **UNABLE to host stateful SFU / Coturn daemons on existing serverless stack**

---

## 1. Executive Summary

This report documents the architectural capabilities, runtime constraints, and network limitations of the pre-existing MASTERHRMS infrastructure stack.

The audit empirically proves that MASTERHRMS does **not** operate a traditional Linux VPS (Ubuntu/Debian) for its core web services. Instead, the application is deployed on a modern **Serverless / Managed PaaS architecture** comprising Vercel, Supabase, and Pusher.

While this serverless architecture is optimal for web applications, it is **fundamentally incompatible** with the socket-level UDP packet routing requirements of a self-hosted WebRTC Selective Forwarding Unit (LiveKit) and media relay (Coturn).

---

## 2. Empirical Inspection of Existing Infrastructure Tiers

### Tier 1: Frontend & Backend Hosting (Vercel)
- **Resolved IP Addresses:**
  ```text
  masterhrms.com         -> 216.198.79.1 (Vercel Anycast IPv4)
  www.masterhrms.com     -> 4d1cfac43640cf97.vercel-dns-017.com (Vercel Edge CNAME)
  staging.masterhrms.com -> 216.198.79.1 / 64.29.17.1
  ```
- **HTTP Response Verification:**
  - `GET https://staging.masterhrms.com` returned:
    ```text
    HTTP/2 404
    x-vercel-id: bom1::z9vv5-1793859702713-47071041e168
    body: "The deployment could not be found on Vercel. DEPLOYMENT_NOT_FOUND"
    ```
- **Architectural Constraints of Vercel:**
  1. **No Long-Running Daemons:** Serverless functions execute on-demand and terminate after a maximum timeout (15–60 seconds). LiveKit SFU requires an uninterrupted background daemon running 24/7.
  2. **No Arbitrary UDP Port Binding:** WebRTC media tracks require listening on UDP port ranges (`50000–50050` for LiveKit, `49152–49252` for Coturn). Vercel only exposes HTTP/HTTPS ports 80 and 443.
  3. **No Docker Support:** Vercel cannot run `docker-compose.staging-sfu.yml`.

### Tier 2: Database Layer (Supabase PostgreSQL)
- **Host Endpoint:** `aws-0-ap-south-1.pooler.supabase.com:6543` (PgBouncer connection pooler in AWS Mumbai).
- **Direct Port:** `5432`.
- **Role:** Relational persistence for `User`, `Employee`, `Call`, `CallParticipant`, `CallEvent`, and historical `CallHistoryRecord` rows.
- **Capacity:** Supabase is a managed database service; it cannot run auxiliary media services or Docker containers.

### Tier 3: Real-Time Signaling (Pusher Channels)
- **Cluster:** `ap2` (Asia-Pacific / Mumbai).
- **Protocol:** WebSocket JSON messaging over TCP 443.
- **Role:** Call notification dispatch (`call:invitation`, `call:accepted`, `call:ended`).
- **Limitation:** Pusher is purely a message bus. It transports small text/JSON signaling payloads; it **cannot** carry high-bandwidth RTP/RTCP audio/video media streams.

### Tier 4: Developer Workstation (On-Premises Staging)
- **Host OS:** Windows 10/11 x64 (64 GB RAM, 16-core CPU).
- **Docker Engine:** Docker Desktop 29.9.2 active and healthy.
- **Local Network IP:** `10.10.10.232` (RFC 1918 Private Subnet).
- **Gateway Router:** `10.10.10.1`.
- **Egress Public IP:** `103.126.42.196` (ACT Fibernet Chennai).
- **WAN Inbound Status:** **BLOCKED**. Inbound probes to ports 7880, 3478, and 443 fail (`TcpTestSucceeded: False`). Inbound WAN port forwarding is unconfigured on the office router.
- **Port 443 Collision:** Local port 443 is bound by an unrelated third-party CCTV surveillance system (`HiLookVision Station\Nginx\nginx.exe`).

---

## 3. Infrastructure Capability vs. LiveKit/Coturn Requirements

| LiveKit / Coturn Requirement | Demanded by WebRTC SFU | Existing Vercel Hosting | Local Workstation Hosting |
|---|---|---|---|
| **Persistent Process Execution** | 24/7 background media loops | ❌ Serverless only | ✅ Docker Desktop |
| **Direct UDP Media Ingress** | Ports 50000–50050 & 49152–49252 | ❌ Closed | ❌ Dropped by router NAT |
| **Public WSS Signaling** | Port 443 reverse proxy | ❌ Serverless only | ❌ Port 443 conflict |
| **Symmetric NAT Traversal** | Coturn STUN/TURN on 3478/5349 | ❌ Not supported | ❌ Inbound blocked |
| **Dedicated Public IPv4** | Direct client IP advertisement | ❌ Shared Anycast | ❌ Dynamic/NATed |

---

## 4. Conclusion

Neither the existing production hosting environment (Vercel Serverless) nor the office developer workstation (behind unrouted router NAT) can act as a publicly reachable LiveKit SFU host without modifying hardware router configurations or spending money on a VPS.

Therefore, an alternative zero-cost WebRTC calling strategy is required.

