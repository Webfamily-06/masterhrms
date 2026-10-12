#!/usr/bin/env bash
set -euo pipefail

# MASTERHRMS — Staging Rollback Script
# Purpose: Safely revert staging environment to previous stable commit

APP_DIR="${1:-/opt/masterhrms}"
TARGET_COMMIT="${2:-}"
BACKEND_DIR="${APP_DIR}/server"
LKG_FILE="${APP_DIR}/.last_known_good_release"

echo "======================================================================="
echo "MASTERHRMS — STAGING SAFE ROLLBACK PROCEDURE"
echo "Application Dir: ${APP_DIR}"
echo "======================================================================="

cd "${APP_DIR}"

# Step 1: Identify Target Rollback Commit
if [ -z "${TARGET_COMMIT}" ]; then
  if [ -f "${LKG_FILE}" ]; then
    TARGET_COMMIT=$(cat "${LKG_FILE}" | tr -d '[:space:]')
    echo "[+] Found recorded last-known-good commit: ${TARGET_COMMIT}"
  else
    echo "[!] No last-known-good commit file found. Reverting to HEAD~1 as fallback."
    TARGET_COMMIT=$(git rev-parse HEAD~1 2>/dev/null || echo "")
  fi
fi

if [ -z "${TARGET_COMMIT}" ]; then
  echo "[-] ERROR: Unable to determine valid rollback target commit."
  exit 1
fi

CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "[+] Current commit: ${CURRENT_COMMIT}"
echo "[+] Target commit:  ${TARGET_COMMIT}"

# Step 2: Working Tree Safety Guard (Do not discard unrelated changes)
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "[!] WARNING: Working directory contains uncommitted changes."
  echo "[+] Stashing uncommitted changes safely before checkout..."
  git stash save "Staging rollback stash $(date +%Y%m%d_%H%M%S)" || true
fi

echo "[+] Step 3: Checking out target release commit..."
git checkout "${TARGET_COMMIT}"
echo "[+] Successfully checked out ${TARGET_COMMIT}."

# Step 4: Database Decoupling & Safety Notice
echo "-----------------------------------------------------------------------"
echo "[!] CRITICAL DATABASE SAFETY NOTICE:"
echo "[!] Automated rollback DOES NOT revert database migrations or DDL."
echo "[!] Schema changes are decoupled from application releases to prevent data loss."
echo "[!] If schema rollback is required, engage the Database Reliability Engineer."
echo "-----------------------------------------------------------------------"

echo "[+] Step 5: Rebuilding stable application artifacts..."
npm run build
(cd "${BACKEND_DIR}" && npm run build || npx tsc -p tsconfig.json)
echo "[+] Application artifacts rebuilt successfully."

echo "[+] Step 6: Restarting services..."
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet masterhrms-backend.service 2>/dev/null; then
  echo "[+] Restarting via systemd..."
  sudo systemctl restart masterhrms-backend.service
  sudo systemctl restart masterhrms-frontend.service
elif command -v pm2 >/dev/null 2>&1; then
  echo "[+] Restarting via PM2..."
  pm2 reload scripts/staging/ecosystem.config.cjs --env staging || pm2 start scripts/staging/ecosystem.config.cjs --env staging
fi

echo "[+] Step 7: Confirming service stability and health SLA..."
sleep 3
LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:4000/api/health/live" || echo "000")
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:4000/api/health/ready" || echo "000")

if [ "${LIVE_STATUS}" -eq 200 ] && [ "${READY_STATUS}" -eq 200 ]; then
  echo "[+] Rollback successful: Service running and database connected on commit ${TARGET_COMMIT}."
  echo "${TARGET_COMMIT}" > "${APP_DIR}/.active_release"
  echo "${TARGET_COMMIT}" > "${APP_DIR}/.active_commit"
  echo "======================================================================="
  echo "STAGING ROLLBACK VERDICT: SUCCESSFUL"
  echo "Active Release: ${TARGET_COMMIT}"
  echo "======================================================================="
  exit 0
else
  echo "[-] CRITICAL ALERT: Service remains unhealthy after rollback (Live: HTTP ${LIVE_STATUS}, Ready: HTTP ${READY_STATUS})."
  echo "[-] Manual operator intervention required immediately."
  exit 1
fi
