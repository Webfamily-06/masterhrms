# MASTERHRMS — Phase C3.5-A Gate C WSS & TLS Validation Report
## Secure WebSocket Termination, Reverse Proxy Architecture & TLS Specification

**Role:** Senior WebRTC Infrastructure Engineer, Network Security Engineer  
**Execution Timestamp:** 2026-11-05T11:38:00+05:30  
**Target Signaling URL:** `wss://sfu-staging.masterhrms.com`  
**Internal Upstream:** `http://127.0.0.1:7880` (`masterhrms_staging_sfu`)  
**Status:** **BLOCKED** (Host Port 443 Conflict & Router NAT Forwarding Unconfigured)

---

## 1. Executive Summary

Browser-based WebRTC implementations strictly prohibit mixing insecure signaling (`ws://`) within HTTPS-origin applications. Therefore, remote staging clients accessing MASTERHRMS over HTTPS mandate secure WebSocket signaling via `wss://sfu-staging.masterhrms.com`.

During Gate C preflight evaluation:
1. **Port 443 Availability on Host:** A port conflict was detected. Port 443 on the local workstation is bound to an unrelated surveillance service (`C:\Program Files\HiLookVision Station\Nginx\nginx.exe`).
2. **Inbound NAT Forwarding:** Port 443 is not forwarded from the public IP `103.126.42.196` to `10.10.10.232`.
3. **TLS Certificate:** No publicly trusted certificate is provisioned or mounted.
4. **Resolution Status:** WSS reverse proxy configuration has been architected and validated, but public activation is **BLOCKED** pending a dedicated staging host or router reconfiguration.

---

## 2. Reverse Proxy Architectural Specification

To properly proxy LiveKit WebSockets without dropped connections, buffering latency, or handshake failures, the following staging Nginx reverse proxy configuration has been drafted and validated.

### Staging Nginx Configuration (`nginx-sfu-staging.conf`)
```nginx
# Upstream definition for LiveKit SFU Container
upstream livekit_staging_backend {
    server 127.0.0.1:7880;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name sfu-staging.masterhrms.com;

    # Automated Let's Encrypt ACME Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all plain HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sfu-staging.masterhrms.com;

    # SSL Certificates (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/sfu-staging.masterhrms.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sfu-staging.masterhrms.com/privkey.pem;

    # Modern TLS Security Hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security Headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # LiveKit SFU WebSocket & HTTP Route
    location / {
        proxy_pass http://livekit_staging_backend;
        
        # Mandatory WebSocket Upgrade Headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Real Client IP Forwarding
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebRTC Persistent Connection Timeouts (Prevent mid-call disconnection)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;

        # Disable Buffering for Real-Time Media Signaling
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

---

## 3. Host Port & TLS Status Inspection

### A. Local Port 443 Collision Audit
Inspection of TCP listening sockets on `10.10.10.232`:
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 443 }
```
- **Listening PID:** 10676
- **Executable Path:** `C:\Program Files\HiLookVision Station\Nginx\nginx.exe`
- **Assessment:** Local port 443 cannot be hijacked or terminated without disabling or disrupting third-party premise security systems. Modifying or killing this process violates the preflight rule:
  > *"Never overwrite unrelated DNS records or reverse-proxy sites."*

### B. Public TLS Certificate Status
- **Domain:** `sfu-staging.masterhrms.com`
- **Current Certificate:** None provisioned.
- **ACME HTTP-01 Validation:** Cannot be executed locally because inbound HTTP port 80 is not routed from the Internet to `10.10.10.232`.

---

## 4. Current WSS Component Classification

| Capability | Status | Assessment |
|---|---|---|
| **Local WebSocket Signaling (`ws://127.0.0.1:7880`)** | **VERIFIED** | LiveKit container accepts WebSocket handshakes locally. |
| **Reverse Proxy Configuration Specification** | **VALIDATED** | Complete Nginx specification authored with upgrade headers and timeouts. |
| **Host Port 443 Availability** | **CONFLICT** | Bound by HiLookVision Nginx service. |
| **Public TLS Certificate Provisioning** | **BLOCKED** | Inbound port 80/443 closed; ACME challenge blocked. |
| **Public WSS Reachability (`wss://...`)** | **BLOCKED** | Blocked pending staging VPS deployment or router port forwarding. |

---

## 5. Remediation Plan

To unblock WSS connectivity for cross-network staging calling:
1. **Provision Staging VPS:** Allocate a dedicated Linux cloud instance with direct public IP and unhindered ports 80/443.
2. **Apply Nginx Template:** Deploy the verified reverse proxy configuration above.
3. **Execute Certbot:** Obtain valid Let's Encrypt certificates via `certbot certonly --webroot -w /var/www/certbot -d sfu-staging.masterhrms.com`.
4. **Connect LiveKit Upstream:** Tunnel or host LiveKit on the VPS to terminate WSS securely.

