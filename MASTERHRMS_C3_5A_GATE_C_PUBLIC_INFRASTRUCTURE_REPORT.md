# MASTERHRMS — Phase C3.5-A Gate C Public Infrastructure Report
## Staging Host Network Inspection, DNS Audit & WAN Reachability Assessment

**Role:** Senior WebRTC Infrastructure Engineer, DevOps Engineer, Network Security Engineer  
**Execution Timestamp:** 2026-11-05T11:37:00+05:30  
**Target Hostname:** `sfu-staging.masterhrms.com`  
**Host IP (Internal):** `10.10.10.232` (Ethernet, InterfaceIndex 13)  
**Host Gateway:** `10.10.10.1`  
**Public Egress IP:** `103.126.42.196` (ACT Fibernet / DVPL Chennai static subnet)  
**Infrastructure Gate Status:** **BLOCKED** (Preflight Stop Condition Triggered: Router NAT/WAN Inbound Restriction)

---

## 1. Executive Summary

In accordance with the **Phase C3.5-A Gate C Implementation Authorization**, a thorough preflight network and infrastructure inspection was executed to evaluate public WAN accessibility for LiveKit SFU signaling (WSS) and Coturn STUN/TURN relays.

### Empirical Assessment Outcome:
- **DNS Zone:** Successfully verified access to Cloudflare DNS zone for `masterhrms.com`. The dedicated record `sfu-staging.masterhrms.com` does not yet exist.
- **WAN Reachability:** **BLOCKED**. The staging host resides on a private subnet (`10.10.10.232`) behind an office NAT router (`10.10.10.1`). Active inbound TCP probes to the public IP `103.126.42.196` on ports 7880, 3478, and 443 failed (`TcpTestSucceeded: False`). Inbound WAN port forwarding is not configured on the premises router.
- **Port 443 Collision:** Local port 443 on the workstation is occupied by an unrelated local surveillance service (`C:\Program Files\HiLookVision Station\Nginx\nginx.exe`).
- **Preflight Stop Condition Enacted:** In accordance with Section 2 and Section 5 of the Gate C mandate:
  > *"If the workstation is behind CGNAT and cannot accept inbound traffic, stop. Do not claim public TURN readiness from local tests. Recommend a dedicated staging VPS with a directly reachable public IP."*

Execution of external DNS alterations has been halted to prevent routing traffic to an unreachable IP.

---

## 2. Network Topology & Interface Audit

```mermaid
flowchart TD
    WAN["Public Internet / Mobile 5G Clients"]
    ISP["ISP Gateway (103.126.42.193)"]
    Router["Premises NAT Gateway (10.10.10.1)<br/>Public IP: 103.126.42.196<br/><b>Inbound Ports: CLOSED / NO FORWARDING</b>"]
    Host["Staging Workstation (10.10.10.232)<br/>Docker Desktop"]
    LiveKit["LiveKit SFU (Port 7880/7881, UDP 50000-50050)<br/>STATUS: Running Locally"]
    Coturn["Coturn Relay (Port 3478/5349, UDP 49152-49252)<br/>STATUS: Running Locally"]

    WAN -.->|BLOCKED (Inbound TCP/UDP Drops)| Router
    Router --- ISP
    Router --- Host
    Host --- LiveKit
    Host --- Coturn
```

### Empirical Trace:
- **Local Network Interface:**
  ```text
  IPAddress: 10.10.10.232
  InterfaceAlias: Ethernet
  InterfaceIndex: 13
  Default Gateway: 10.10.10.1
  ```
- **WAN Egress IP:**
  ```text
  GET https://api.ipify.org -> 103.126.42.196
  ```
- **Traceroute (Egress Path):**
  ```text
  Hop 1: <1 ms  10.10.10.1 (Local Router)
  Hop 2: <1 ms  103.126.42.193 (ISP Gateway Subnet)
  Hop 3:  3 ms  103.126.43.53
  Hop 4:  2 ms  173.194.127.108 (Google Edge)
  ```
- **Inbound Port Reachability Probes:**
  - `Test-NetConnection -ComputerName 103.126.42.196 -Port 7880`: `TcpTestSucceeded: False`
  - `Test-NetConnection -ComputerName 103.126.42.196 -Port 3478`: `TcpTestSucceeded: False`
  - Inbound traffic from external networks cannot reach Docker containers running on `10.10.10.232`.

---

## 3. Cloudflare DNS Audit (`masterhrms.com`)

Query via Cloudflare CLI (`cf dns records list -z masterhrms.com`):
```json
[
  {
    "id": "42824bb01ab5bb4bc8102c97b0eae84c",
    "name": "masterhrms.com",
    "type": "A",
    "content": "216.198.79.1",
    "proxied": false
  },
  {
    "id": "5508baadfa6b372efad1743ada116b8f",
    "name": "www.masterhrms.com",
    "type": "CNAME",
    "content": "4d1cfac43640cf97.vercel-dns-017.com",
    "proxied": false
  }
]
```
- **Observation:** `sfu-staging.masterhrms.com` does not exist as an A record.
- **Safety Decision:** Because `103.126.42.196` does not accept inbound traffic to `10.10.10.232`, creating an A-record pointing `sfu-staging.masterhrms.com` to `103.126.42.196` would result in complete connection timeouts for all remote devices.

---

## 4. Component Status Matrix

| Component | Architecture Role | Target Endpoint | Status | Diagnostic / Blocker |
|---|---|---|---|---|
| **DNS A-Record** | Staging Domain | `sfu-staging.masterhrms.com` | **BLOCKED** | Record creation halted; public IP not inbound-routable |
| **Reverse Proxy (WSS)** | TLS Termination (TCP 443) | `wss://sfu-staging.masterhrms.com` | **BLOCKED** | Port 443 conflict on host; no staging reverse proxy |
| **LiveKit SFU** | Media Server Signaling | Port 7880 / 7881 | **Locally Tested** | Running & healthy on localhost; unreachable from WAN |
| **LiveKit SFU Media** | UDP Audio/Video Tracks | UDP 50000–50050 | **Locally Tested** | Bounded in container; no WAN port forward |
| **Coturn STUN/TURN** | NAT Discovery & Relay | Port 3478 (UDP/TCP) | **Locally Tested** | Running & healthy on localhost; unreachable from WAN |
| **Coturn TURNS** | Secure Relay over TLS | Port 5349 (TCP) | **BLOCKED** | No public TLS certificate mounted |
| **Coturn Media Relay** | Relayed Media Allocation | UDP 49152–49252 | **Locally Tested** | Verified via loopback; unreachable from WAN |

---

## 5. Strategic Remediation Recommendation

To achieve genuine public WAN accessibility and cross-network calling without modifying corporate office router rules or exposing the developer workstation to inbound attacks:

### Option A: Dedicated Cloud Staging VPS (Recommended)
1. Deploy an isolated Ubuntu 24.04 LTS instance (e.g., AWS EC2, DigitalOcean, Hetzner, Linode) with a static public IP (e.g. `198.51.100.25`).
2. Point `sfu-staging.masterhrms.com` directly to the VPS public IP.
3. Deploy `scripts/staging-sfu/docker-compose.staging-sfu.yml` on the VPS.
4. Issue Let's Encrypt certificates via Certbot for `sfu-staging.masterhrms.com`.
5. Run Nginx reverse proxy on the VPS routing `wss://sfu-staging.masterhrms.com` to LiveKit 7880.

### Option B: Router Port Forwarding & Host Pinning
If on-premises hosting is required:
1. Access the office router at `10.10.10.1`.
2. Configure static DHCP reservation for MAC address of `10.10.10.232`.
3. Add port-forwarding rules for TCP 443, 7880, 7881, 3478, 5349, and UDP 3478, 50000-50050, 49152-49252.
4. Stop or rebind conflicting local services occupying port 443.

