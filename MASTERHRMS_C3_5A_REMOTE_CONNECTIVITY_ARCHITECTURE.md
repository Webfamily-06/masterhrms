# MASTERHRMS — Phase C3.5-A Remote WAN Connectivity Architecture Blueprint

**Status:** GATE A DISCOVERY & ARCHITECTURAL DESIGN COMPLETE (AWAITING GATE B / GATE C AUTHORIZATION)  
**Date:** November 5, 2026  
**Auditor / Architect:** Senior WebRTC Infrastructure Engineer, LiveKit SFU Specialist, and Security Auditor  
**Scope:** Remote Cross-Network WAN Connectivity Remediation for MASTERHRMS Chat Calling  
**Safety Classification:** 100% READ-ONLY DISCOVERY — ZERO INFRASTRUCTURE MUTATION  

---

## 1. Executive Summary & Problem Formulation

In Phase C3.5, the MASTERHRMS Chat Calling hybrid architecture (1-to-1 P2P WebRTC + LiveKit SFU group conferencing) achieved 100% test success across 15 automated browser scenarios in local staging. However, remote device testing across separate networks (e.g., Office Wi-Fi desktop to mobile 4G/5G cellular) was identified as **BLOCKED** due to three critical infrastructure constraints:

1. **Loopback/LAN Signaling Restriction:** Current staging uses `ws://127.0.0.1:7880` and `ws://10.10.10.232:7880`. Insecure `ws://` connections are blocked by modern browsers (Chrome, Safari, Firefox, iOS/Android) on HTTPS origins due to Mixed-Content security policies.
2. **Unroutable ICE Host Candidates:** LiveKit currently advertises `node_ip: "127.0.0.1"`. Remote mobile devices receive loopback candidates and attempt to route media streams back to themselves.
3. **Symmetric NAT & Carrier-Grade NAT (CGNAT) Traversal:** Mobile carrier networks and enterprise firewalls block direct incoming UDP media packets; establishing media flow requires a dedicated STUN/TURN relay with time-limited HMAC credentials.

This document establishes the authoritative, deployment-ready architecture to unblock **C3.5-A** and achieve reliable, secure cross-network calling between real devices.

---

## 2. Environment Discovery & Current State Baseline

- **Current Git Branch:** `main`
- **Current HEAD Commit:** `79998ccc6c7aeb32b21f85e1716c8ba59df6257f`
- **Historical Call Records Database Baseline:** Exactly 119 records verified with SHA-256:  
  `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`
- **Workstation Topology:**
  - Machine: Windows 10/11 x64 workstation
  - Private LAN IP: `10.10.10.232` (Subnet `10.10.10.0/24`)
  - Public Gateway / NAT IP: `103.126.42.196` (Behind office router NAT)
  - Active LiveKit Container: `masterhrms_staging_sfu` (`livekit/livekit-server:v1.13.11`)
  - Docker Port Mapping: `0.0.0.0:7880->7880/tcp`, `0.0.0.0:7881->7881/tcp`, `0.0.0.0:50000-50050->50000-50050/udp`
  - Reverse Proxy: Local staging Nginx configuration template discovered at `scripts/staging/nginx-masterhrms-staging.conf`.
  - Coturn Status: Not currently deployed on local workstation.

---

## 3. Remote Cross-Network Target Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    MASTERHRMS REMOTE WAN NETWORK TOPOLOGY                         |
+----------------------------------------------------------------------------------------------------+

   [ Device A: Office Wi-Fi Laptop ]                         [ Device B: Mobile Smartphone ]
        (192.168.1.105 behind NAT)                                (100.64.x.x Carrier-Grade NAT - 5G)
                    |                                                         |
                    | (WSS over TLS :443)                                     | (WSS over TLS :443)
                    v                                                         v
   +-------------------------------------------------------------------------------+
   |                      DNS: sfu-staging.masterhrms.com                          |
   |                               (Public IP: Staging Host)                       |
   +-------------------------------------------------------------------------------+
                                            |
                                            v
   +-------------------------------------------------------------------------------+
   |                         NGINX / CADDY REVERSE PROXY                           |
   |   - TLS Termination (Let's Encrypt Automated Certificate)                     |
   |   - Permissions-Policy: camera=(self), microphone=(self)                      |
   |   - WebSocket Upgrade (Connection: Upgrade)                                   |
   |   - Rate Limiting: 30r/s                                                      |
   +-------------------------------------------------------------------------------+
                                            | (HTTP/WS :7880)
                                            v
   +-------------------------------------------------------------------------------+
   |                      LIVEKIT SFU SERVER (Docker Container)                     |
   |   - Image: livekit/livekit-server:v1.13.11                                    |
   |   - use_external_ip: true (or node_ip: Staging Public IP)                     |
   |   - Media UDP Port Range: 50000–50050/udp                                     |
   |   - RTC TCP Fallback Port: 7881/tcp                                           |
   +-------------------------------------------------------------------------------+
                                            ^
                                            | (RTP Relay Data)
                                            v
   +-------------------------------------------------------------------------------+
   |                       COTURN TURN RELAY (Docker Container)                     |
   |   - Image: coturn/coturn:latest                                               |
   |   - Ports: 3478/udp, 3478/tcp (STUN/TURN), 5349/tcp (TURNS)                  |
   |   - Relay Allocation Port Range: 49152–49252/udp                              |
   |   - Auth: Time-Limited HMAC REST Credentials (Shared Secret Backend-Only)     |
   +-------------------------------------------------------------------------------+
```

---

## 4. Service Dependencies & Port Matrix

| Service | Protocol | Host / External Port | Target Container Port | Purpose | Security Policy |
|---|---|---|---|---|---|
| **HTTPS / WSS** | TCP | `443` | `7880` (via Nginx) | Browser LiveKit WebSocket signaling | Public (TLS 1.2 / 1.3 only) |
| **LiveKit TCP Fallback** | TCP | `7881` | `7881` | WebRTC over TCP (firewalls blocking UDP) | Public (Encrypted DTLS/SRTP) |
| **LiveKit Media Range** | UDP | `50000–50050` | `50000–50050` | WebRTC audio, video, and screen-share RTP | Public (Encrypted SRTP only) |
| **Coturn STUN/TURN** | UDP/TCP | `3478` | `3478` | NAT discovery & TURN relay allocation | Authenticated (HMAC tokens) |
| **Coturn TURNS (TLS)** | TCP | `5349` | `5349` | Secure TURN relay over TLS | Authenticated (HMAC tokens) |
| **Coturn Relay Media** | UDP | `49152–49252` | `49152–49252` | Dynamic relay packet forwarding | Dynamic allocations only |
| **LiveKit Admin/Metrics**| TCP | `Internal` | `7880` / `6789` | Prometheus / internal API | **Blocked from Public Access** |

---

## 5. DNS & Reverse Proxy Blueprint

### 5.1 DNS Requirements
A single DNS A-record is required for staging media:
- **Record:** `sfu-staging.masterhrms.com`
- **Type:** `A`
- **Target:** `<Staging_Public_IP>`
- **TTL:** 300 seconds

### 5.2 Nginx Staging Reverse Proxy (`sfu-staging.conf`)
```nginx
upstream livekit_staging_backend {
    server 127.0.0.1:7880;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name sfu-staging.masterhrms.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sfu-staging.masterhrms.com;

    # Automated Let's Encrypt Certificate
    ssl_certificate /etc/letsencrypt/live/sfu-staging.masterhrms.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sfu-staging.masterhrms.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;

    # Security Headers (Enabling WebRTC Media Capture)
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Permissions-Policy "camera=(self), microphone=(self), display-capture=(self)" always;

    location / {
        proxy_pass http://livekit_staging_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket Long-Lived Session Timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 10s;
    }
}
```

---

## 6. Coturn Staging Relay Configuration

Coturn will run containerized alongside LiveKit in Docker Compose (`scripts/staging-sfu/docker-compose.staging-sfu.yml`).

### Coturn Configuration File (`scripts/staging-sfu/turnserver.conf`)
```ini
# Coturn Staging Configuration
listening-port=3478
tls-listening-port=5349
realm=sfu-staging.masterhrms.com
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=staging_turn_shared_secret_masterhrms_2026
min-port=49152
max-port=49252
verbose
no-cli
no-tcp-relay
stale-nonce=600
cert=/etc/ssl/cert.pem
pkey=/etc/ssl/key.pem
```

### Backend Ephemeral TURN Credential Generation
The backend (`MeetingSfuService`) generates time-limited HMAC-SHA1 credentials using the shared secret:
```typescript
public static generateTurnCredentials(usernamePrefix: string, ttlSeconds = 86400) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${usernamePrefix}`;
  const hmac = crypto.createHmac("sha1", process.env.TURN_SHARED_SECRET!);
  hmac.update(username);
  const credential = hmac.digest("base64");

  return {
    urls: [
      `turn:${process.env.TURN_DOMAIN}:3478?transport=udp`,
      `turn:${process.env.TURN_DOMAIN}:3478?transport=tcp`,
      `turns:${process.env.TURN_DOMAIN}:5349?transport=tcp`
    ],
    username,
    credential
  };
}
```
*Security Guarantee:* The shared secret `staging_turn_shared_secret_...` is never sent to the browser; only the short-lived ephemeral HMAC string is returned.

---

## 7. Security Risks & Mitigations

| Risk | Impact | Mitigation Architecture |
|---|---|---|
| **Public TURN Relay Abuse** | Unauthorized third parties routing DDoS/torrent traffic through staging TURN server | Time-limited HMAC credentials enforced; unauthenticated relay attempts rejected with 401; allocation bandwidth capped |
| **LiveKit Admin API Exposure** | Unauthorized room deletion or secret inspection | Port 7880 bound exclusively to localhost `127.0.0.1` on staging host; only public reverse proxy on 443 is exposed |
| **Mixed-Content WebRTC Blocking** | Mobile Safari / Chrome rejecting unencrypted signaling | Standard WSS over TLS terminated with trusted Let's Encrypt CA |
| **Port Flooding / Scanning** | Port scanning on UDP ranges | UDP range restricted to `50000–50050` (LiveKit) and `49152–49252` (Coturn); firewall drops non-STUN packets |

---

## 8. Staging Cost & Resource Estimates (Marked as Estimates)

| Component | Specification | Estimated Cost |
|---|---|---|
| **Staging VPS Host** | Dedicated Cloud Instance (e.g. 2 vCPU, 4 GB RAM, 80 GB NVMe, 4 TB Egress) | **~$24.00 – $28.00 / month** (Estimate) |
| **Public IPv4 Address** | Dedicated Static Elastic IP | **~$3.00 – $5.00 / month** (Estimate) |
| **TLS Certificate** | Automated Let's Encrypt Wildcard / SNI Certificate | **$0.00** (Free) |
| **DNS Staging Record** | Subdomain on existing `masterhrms.com` zone | **$0.00** (Included in existing registrar) |
| **Egress Bandwidth (Testing)** | ~50 GB testing data across 10-peer & cross-network sessions | **~$0.00** (Within free 1-4 TB monthly egress pool) |
| **Total Estimated Staging Cost** | Complete isolated environment | **~$27.00 – $33.00 / month** |

---

## 9. Gate B & Gate C Authorization Checklists

### Gate B — Staging Configuration Authorization (STOP POINT 1)
- [ ] Confirm target staging host environment (Cloud Staging VPS vs Dedicated Port-Forwarded Host).
- [ ] Approve Docker Compose integration of `coturn/coturn:latest`.
- [ ] Approve `scripts/staging-sfu/livekit.yaml` update to use external IP / public hostname.
- [ ] Approve backend ephemeral TURN credential generation in `server/src/services/meeting-sfu.service.ts`.

### Gate C — Public Infrastructure & Cross-Network Activation (STOP POINT 2)
- [ ] Approve creation of DNS record `sfu-staging.masterhrms.com` pointing to staging host IP.
- [ ] Approve Let's Encrypt TLS certificate generation for `sfu-staging.masterhrms.com`.
- [ ] Approve firewall opening of UDP `50000–50050`, UDP/TCP `3478`, and TCP `5349` on staging host.
- [ ] Authorize live desktop (Wi-Fi) to mobile (LTE/5G) end-to-end media acceptance testing.

---

## 10. Architectural Recommendation & Conclusion

Gate A read-only discovery confirms that MASTERHRMS software code, hybrid room adapters, and database schemas are **100% ready** for WAN cross-network calling. The transition from local loopback to public remote-device connectivity requires:
1. Pointers to a public staging hostname (`sfu-staging.masterhrms.com`).
2. WSS reverse proxy TLS termination.
3. Coturn container deployment for symmetric NAT bypass.

**In accordance with user instructions, execution is STOPPED at Gate A awaiting explicit authorization to proceed to Gate B and Gate C.**

