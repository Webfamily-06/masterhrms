#!/bin/bash
set -e
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="$(which node)"
SVC_DIR="$HOME/.config/systemd/user"
SVC_FILE="$SVC_DIR/masterhrms-device-manager.service"

mkdir -p "$SVC_DIR"
cat > "$SVC_FILE" <<EOF
[Unit]
Description=Master HRMS Biometric Device Manager Background Auto-Sync
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/server.js --background
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now masterhrms-device-manager.service
echo "[OK] Master HRMS Background Auto-Sync installed for Linux (systemd)!"
echo "     Open UI anytime at: http://127.0.0.1:4375"
