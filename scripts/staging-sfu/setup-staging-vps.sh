#!/usr/bin/env bash
# ==============================================================================
# MASTERHRMS — Phase C3.5-A Staging SFU VPS Automated Setup Script
# Target: Ubuntu 24.04 LTS / 22.04 LTS (x86_64 or aarch64)
# Services: LiveKit SFU (v1.13.11) + Coturn (4.6.3-alpine) + Nginx WSS Reverse Proxy
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================================================${NC}"
echo -e "${BLUE}🛡️  MASTERHRMS STAGING SFU VPS SETUP — PHASE C3.5-A GATE C.1${NC}"
echo -e "${BLUE}================================================================================${NC}\n"

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] This script must be run as root (use sudo).${NC}"
  exit 1
fi

# 2. Argument Parsing / Environment
DOMAIN="${1:-sfu-staging.masterhrms.com}"
PUBLIC_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo -e "${GREEN}[INFO] Detected Public IPv4: ${PUBLIC_IP}${NC}"
echo -e "${GREEN}[INFO] Target Staging Domain: ${DOMAIN}${NC}\n"

# 3. System Updates & Essential Packages
echo -e "${BLUE}[STEP 1/7] Updating system packages & installing prerequisites...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  ufw \
  nginx \
  certbot \
  python3-certbot-nginx \
  net-tools \
  coturn-utils

# 4. Install Docker Engine & Compose Plugin
echo -e "${BLUE}[STEP 2/7] Installing Docker Engine & Compose Plugin...${NC}"
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo -e "${GREEN}[SUCCESS] Docker installed successfully.${NC}"
else
  echo -e "${GREEN}[INFO] Docker is already installed.${NC}"
fi

# 5. Configure Network Firewall (UFW)
echo -e "${BLUE}[STEP 3/7] Configuring strict network firewall rules...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Core Services
ufw allow 22/tcp comment "SSH Management"
ufw allow 80/tcp comment "HTTP / ACME Challenge"
ufw allow 443/tcp comment "HTTPS / WSS Reverse Proxy"

# WebRTC & Media Traversal
ufw allow 7881/tcp comment "LiveKit RTC TCP Fallback"
ufw allow 50000:50050/udp comment "LiveKit SFU Media Range"
ufw allow 3478/udp comment "Coturn STUN/TURN UDP"
ufw allow 3478/tcp comment "Coturn STUN/TURN TCP"
ufw allow 5349/tcp comment "Coturn TURNS TLS"
ufw allow 49152:49252/udp comment "Coturn Media Relay Range"

ufw --force enable
echo -e "${GREEN}[SUCCESS] UFW firewall active with restricted WebRTC port rules.${NC}"

# 6. Deploy Staging SFU Directory Structure
echo -e "${BLUE}[STEP 4/7] Deploying SFU directory structure to /opt/staging-sfu...${NC}"
mkdir -p /opt/staging-sfu
cd /opt/staging-sfu

# Write livekit.yaml
cat <<EOF > /opt/staging-sfu/livekit.yaml
port: 7880
rtc:
  node_ip: "${PUBLIC_IP}"
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50050
  use_external_ip: false
turn:
  enabled: false
keys:
  devkey: staging_livekit_secret_at_least_32_characters_random
logging:
  json: false
  level: info
EOF

# Write turnserver.conf
cat <<EOF > /opt/staging-sfu/turnserver.conf
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=49252
realm=${DOMAIN}
fingerprint
lt-cred-mech
use-auth-secret
no-cli
no-tcp-relay
stale-nonce=600
external-ip=${PUBLIC_IP}
log-file=stdout
verbose
EOF

# Write docker-compose.yml
cat <<EOF > /opt/staging-sfu/docker-compose.yml
services:
  livekit:
    image: livekit/livekit-server:v1.13.11
    container_name: masterhrms_staging_sfu
    restart: unless-stopped
    command: --config /etc/livekit.yaml --node-ip \${NODE_IP:-${PUBLIC_IP}}
    environment:
      NODE_IP: "${PUBLIC_IP}"
      LIVEKIT_KEYS: "devkey: staging_livekit_secret_at_least_32_characters_random"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml:ro
    ports:
      - "127.0.0.1:7880:7880"
      - "7881:7881"
      - "50000-50050:50000-50050/udp"
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://127.0.0.1:7880/"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 2s

  coturn:
    image: coturn/coturn:4.6.3-alpine
    container_name: masterhrms_staging_coturn
    restart: unless-stopped
    command:
      - "-c"
      - "/etc/coturn/turnserver.conf"
      - "--static-auth-secret=\${TURN_SHARED_SECRET:-staging_turn_hmac_secret_at_least_32_chars}"
      - "--realm=${DOMAIN}"
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf:ro
    ports:
      - "3478:3478/udp"
      - "3478:3478/tcp"
      - "5349:5349/tcp"
      - "49152-49252:49152-49252/udp"
    healthcheck:
      test: ["CMD", "turnutils_stunclient", "127.0.0.1", "3478"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 2s
EOF

# 7. Start Containers
echo -e "${BLUE}[STEP 5/7] Starting LiveKit & Coturn containers...${NC}"
docker compose -f /opt/staging-sfu/docker-compose.yml up -d
sleep 4

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 8. Configure Nginx Reverse Proxy
echo -e "${BLUE}[STEP 6/7] Configuring Nginx WSS reverse proxy...${NC}"
cat <<EOF > /etc/nginx/sites-available/sfu-staging
upstream livekit_staging_backend {
    server 127.0.0.1:7880;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://livekit_staging_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
        proxy_buffering off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/sfu-staging /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo -e "\n${GREEN}================================================================================${NC}"
echo -e "${GREEN}🎉 MASTERHRMS STAGING SFU VPS SETUP COMPLETED!${NC}"
echo -e "${GREEN}================================================================================${NC}"
echo -e "Next action: Once DNS points ${DOMAIN} to ${PUBLIC_IP}, run:"
echo -e "  certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m devops@masterhrms.com"

