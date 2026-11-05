# MASTERHRMS — Phase C3.5-A Gate C Infrastructure Requirements
## Remote WAN Media Traversal Activation Prerequisites & Network Specification

> [!CAUTION]
> **GATE C INFRASTRUCTURE ACTIVATION IS STRICTLY UNAUTHORIZED AT THIS TIME.**  
> This specification details the external networking, DNS, TLS, and firewall prerequisites required BEFORE Gate C can be authorized or activated. Do not modify DNS records, edge firewalls, router port forwardings, or production configurations until formal authorization is granted.

---

## 1. Objective & Scope of Gate C

Gate C represents the transition from **isolated local staging** to **authenticated remote WAN staging**. It enables genuine cross-network audio/video calling between devices situated behind disparate cellular networks (4G/5G), home NAT routers, and restrictive corporate firewalls.

To achieve this without compromising security or destabilizing existing production services, the following requirements must be formally provisioned and verified.

---

## 2. Public DNS Specifications

A dedicated staging subdomain must be configured to resolve to the staging media host's public IPv4 address.

| Record Type | Hostname / FQDN | Target Destination | TTL | Purpose |
|---|---|---|---|---|
| **A** | `sfu-staging.masterhrms.com` | `[STAGING_PUBLIC_IPV4]` | 300s | Primary resolution for LiveKit SFU signaling and Coturn STUN/TURN relays. |
| **CNAME** (Optional) | `turn-staging.masterhrms.com` | `sfu-staging.masterhrms.com` | 300s | Dedicated alias for TURN services if DNS separation is desired. |

> [!IMPORTANT]
> - Do NOT point the staging hostname to production VPS instances (`103.126.42.196` or production servers).
> - Dynamic DNS (DDNS) or static public IP binding must be established before provisioning TLS certificates.

---

## 3. Public TLS Certificates Specification

WebRTC in modern browsers strictly mandates TLS encryption for camera/microphone permissions and WebSocket signaling. Coturn requires TLS certificates for port 5349 (`TURNS`).

### A. Certificate Requirements
- **Common Name / SAN:** `sfu-staging.masterhrms.com`
- **Issuing CA:** Let's Encrypt, ZeroSSL, or corporate enterprise CA.
- **Key Type:** RSA 2048-bit or ECDSA (prime256v1).
- **Files Required:**
  1. `fullchain.pem`: Combined leaf and intermediate CA certificate chain.
  2. `privkey.pem`: Unencrypted private key.

### B. Coturn Certificate Integration (Port 5349)
For Coturn, certificates must be mounted into the container:
```text
Volumes in docker-compose.staging-sfu.yml:
  - /etc/letsencrypt/live/sfu-staging.masterhrms.com/fullchain.pem:/etc/coturn/certs/fullchain.pem:ro
  - /etc/letsencrypt/live/sfu-staging.masterhrms.com/privkey.pem:/etc/coturn/certs/privkey.pem:ro

Flags in turnserver.conf:
  cert=/etc/coturn/certs/fullchain.pem
  pkey=/etc/coturn/certs/privkey.pem
```

---

## 4. Network Firewall & Port Forwarding Matrix

For WebRTC media to traverse symmetric NAT and firewalls, the router / edge gateway / cloud security group must forward the following ports directly to the staging host:

| Port Range | Protocol | Inbound Source | Internal Destination | Purpose | Required for |
|---|---|---|---|---|---|
| **7880** | TCP | `0.0.0.0/0` (WAN) | Staging Host: 7880 | LiveKit HTTP & WebSocket signaling | Group calls |
| **7881** | TCP | `0.0.0.0/0` (WAN) | Staging Host: 7881 | LiveKit WebRTC TCP fallback | Extreme restrictive firewalls |
| **50000–50050** | UDP | `0.0.0.0/0` (WAN) | Staging Host: 50000–50050 | LiveKit SFU media exchange | Audio/video packet transport |
| **3478** | UDP & TCP | `0.0.0.0/0` (WAN) | Staging Host: 3478 | Plain STUN / TURN listening | NAT discovery & P2P/SFU relay |
| **5349** | TCP | `0.0.0.0/0` (WAN) | Staging Host: 5349 | Secure TURNS (TLS) listening | Corporate firewalls blocking UDP |
| **49152–49252** | UDP | `0.0.0.0/0` (WAN) | Staging Host: 49152–49252 | Coturn media relay allocations | P2P 1-to-1 & SFU relayed packets |

> [!WARNING]
> - **Port 1:1 Preservation:** Coturn requires that relayed port $N$ on the host is mapped to external port $N$ on the public IP. Port translation (e.g. mapping external 12345 to internal 3478) is incompatible with standard WebRTC TURN.
> - **UDP Media Bounds:** Only 100 ports (`49152–49252`) are allocated for Coturn staging to prevent resource starvation.

---

## 5. External IP Address Binding & Configuration

When operating behind NAT, Coturn and LiveKit must advertise their public IP to remote clients rather than their local Docker internal addresses:

### A. LiveKit Configuration
In `scripts/staging-sfu/.env.staging-sfu`:
```bash
NODE_IP=<STAGING_PUBLIC_IPV4>
LIVEKIT_URL=wss://sfu-staging.masterhrms.com
```

### B. Coturn Configuration
In `scripts/staging-sfu/turnserver.conf` or command-line:
```text
external-ip=<STAGING_PUBLIC_IPV4>/<STAGING_PRIVATE_IPV4>
realm=sfu-staging.masterhrms.com
```

---

## 6. Pre-Activation Security Checklist

Prior to requesting Gate C execution authorization, the following security controls must be verified:

- [ ] **High-Entropy Secrets:** Fresh, cryptographically generated 32+ character secrets populated for `TURN_SHARED_SECRET` and `LIVEKIT_API_SECRET`.
- [ ] **Host Firewall Isolation:** Staging host firewall (Windows Defender / UFW) configured with explicit rules matching Section 4.
- [ ] **Zero Production Routing:** Verified that staging traffic cannot bridge into production database or production application networks.
- [ ] **DDOS / Rate Limiting Safeguards:** Coturn allocation limits configured (`total-quota=100`, `user-quota=10`).
- [ ] **No Insecure Loopbacks:** `allow-loopback-peers` disabled in production/WAN configurations to prevent SSRF vulnerabilities.

---

## 7. Next Steps & Authorization Boundary

1. System Administrator / DevOps reviews this specification.
2. Staging network and public IP prerequisites are confirmed available.
3. **Formal Gate C Implementation Authorization** is issued before any public DNS, firewall, or external port configurations are modified.

