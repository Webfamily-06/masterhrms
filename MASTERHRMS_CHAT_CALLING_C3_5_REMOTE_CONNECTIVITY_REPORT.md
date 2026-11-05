# MASTERHRMS — Phase C3.5 Remote Device Connectivity Audit Report
**Status:** BLOCKED / PENDING PUBLIC WSS & TURN INFRASTRUCTURE  
**Date:** November 5, 2026  
**Auditor:** Senior WebRTC/SFU Infrastructure Engineer & Security Auditor  
**Environment:** Local Staging Host (`10.10.10.232` / `127.0.0.1`)  

---

## 1. Executive Summary & Objective

The objective of Section C3.5-A is to determine whether the Phase C3 LiveKit media infrastructure is configured and physically capable of supporting genuine remote devices connecting from external networks, mobile carriers, and strict firewalls.

**Audit Finding:**  
While local loopback (`127.0.0.1`) and LAN interface (`10.10.10.232`) signaling and media transport are fully functional on the host, **remote-device WAN connectivity is currently BLOCKED**. The current staging deployment uses plaintext WebSocket (`ws://`), binds ICE candidates to loopback/local IP, lacks public DNS resolution, and does not have an external STUN/TURN relay configured for symmetric NAT traversal.

In accordance with Section 3 and Section 11 execution rules:
> *"If remote networking is not available, mark this criterion BLOCKED. Do not claim it passed based on localhost tests."*

---

## 2. Infrastructure Inspection & Gap Analysis

| Parameter | Current Staging Configuration | Production / Remote WAN Requirement | Gap / Risk Severity |
|---|---|---|---|
| **Signaling Protocol** | `ws://127.0.0.1:7880` (or `ws://10.10.10.232:7880`) | `wss://sfu-staging.masterhrms.com` | **P0 (Mixed-Content Block)**: Modern browsers block insecure `ws://` from HTTPS applications. |
| **TLS Certificate** | None (Plaintext HTTP/WS) | Valid Let's Encrypt or Wildcard TLS certificate | **P0**: WSS negotiation fails without trusted CA certificate. |
| **ICE Candidate Advertising** | `node_ip: "127.0.0.1"` in `livekit.yaml` | Public Elastic IP or STUN-discovered WAN address | **P1 (Unroutable Media)**: Remote devices receiving `127.0.0.1` will route media to themselves. |
| **STUN/TURN Traversal** | Default Google STUN (`stun:stun.l.google.com:19302`) | Dedicated TURN/TLS server (Coturn on 443/5349) | **P1 (Symmetric NAT Block)**: Mobile LTE/5G and corporate firewalls block direct UDP. |
| **Token Endpoint URL** | Returns `LIVEKIT_URL` from server environment | Must return public domain URL matching client's network route | **P1**: If set to loopback, mobile/remote clients fail immediately. |

---

## 3. Empirical Network Diagnostics

1. **LAN Binding Verification:**
   - Evaluated `http://10.10.10.232:7880/` via Node HTTP client:
   - **Result:** HTTP 200 `OK`. Docker correctly maps port `7880` on all local network adapters.
2. **ICE Candidate Inspection:**
   - LiveKit SDP offer inspection indicates host candidate:
     `a=candidate:udp4 1 127.0.0.1 50000 typ host`
   - Devices on separate subnets cannot route packets to `127.0.0.1`.
3. **Browser Security Boundary (Mixed Content):**
   - Headless Chrome and mobile Safari enforce WebRTC and WebSocket security over WSS when the application origin is `https://`. Connecting to `ws://` triggers:
     `SecurityError: Failed to construct 'WebSocket': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.`

---

## 4. Remediation Blueprint for Staging Remote Device Acceptance

To unblock C3.5-A and achieve full multi-device WAN acceptance:

```
[Remote Client / Mobile Device]
              |
              | (WSS over TLS :443)
              v
[Nginx / Cloudflare Edge Proxy] ---- TLS Termination (Valid CA Cert)
              |
              | (HTTP/WS :7880)
              v
[LiveKit Server Container] (masterhrms_staging_sfu)
              ^
              | (TURN Relay UDP/TCP :3478 / :443)
       [Coturn Server] (Symmetric NAT & Firewall Traversal)
```

1. **DNS & Reverse Proxy:** Assign `sfu-staging.masterhrms.com` pointing to staging public IP with automated TLS termination in Nginx/Caddy.
2. **LiveKit YAML Public IP:** Update `scripts/staging-sfu/livekit.yaml`:
   ```yaml
   rtc:
     use_external_ip: true
     tcp_port: 7881
     port_range_start: 50000
     port_range_end: 50050
   ```
3. **TURN Server Deployment:** Deploy Coturn with shared secret credentials configured in `TURN_SERVER_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`.

---

## 5. Audit Verdict

| Gate ID | Criterion | Evidence | Status |
|---|---|---|---|
| A-01 | Browser-Facing LiveKit URL Configured | `ws://127.0.0.1:7880` / `10.10.10.232` | PASS (Local/LAN) |
| A-02 | Reachable from Separate Network / WAN | No public IP / DNS route | **BLOCKED** |
| A-03 | HTTPS / WSS Compliance | No TLS termination configured | **BLOCKED** |
| A-04 | ICE Candidates Usable from Remote Network | Advertises local host candidate | **BLOCKED** |
| A-05 | STUN / TURN Relay Traversal | Google STUN only; No Coturn TURN | **BLOCKED** |

**Section C3.5-A Verdict:** `BLOCKED — REQUIRES STAGING WSS DOMAIN & TURN INFRASTRUCTURE`

