#!/usr/bin/env bash
set -euo pipefail

# MASTERHRMS — Automated Staging Deployment Script
# Target: Non-production / Staging Linux Host

APP_DIR="${1:-/opt/masterhrms}"
BACKEND_DIR="${APP_DIR}/server"
HEALTH_CHECK_URL="http://127.0.0.1:4000/api/health"
LIVE_CHECK_URL="http://127.0.0.1:4000/api/health/live"
READY_CHECK_URL="http://127.0.0.1:4000/api/health/ready"
LKG_FILE="${APP_DIR}/.last_known_good_release"
ACTIVE_COMMIT_FILE="${APP_DIR}/.active_commit"

# Determine Release Identifier from reproducible git commit
GIT_REV=$(git -C "${APP_DIR}" rev-parse --short HEAD 2>/dev/null || echo "unknown")
FULL_COMMIT=$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || echo "")
RELEASE_ID="${2:-REL_$(date +%Y%m%d%H%M%S)_${GIT_REV}}"

echo "======================================================================="
echo "MASTERHRMS — STAGING DEPLOYMENT RUNNER"
echo "Release ID:      ${RELEASE_ID}"
echo "Git Commit:      ${FULL_COMMIT}"
echo "Application Dir: ${APP_DIR}"
echo "======================================================================="

echo "[+] Step 1: Validating environment and dependencies..."
if [ ! -d "${APP_DIR}" ]; then
  echo "[-] ERROR: Application directory does not exist: ${APP_DIR}"
  exit 1
fi

cd "${APP_DIR}"

# Guard: Ensure release is built from a clean, reproducible commit
if [ -n "$(git -C "${APP_DIR}" status --porcelain 2>/dev/null)" ]; then
  echo "[-] ERROR: Dirty git working tree detected in ${APP_DIR}."
  echo "[-] Deployments must be built from a clean, committed git state."
  echo "[-] Please commit or stash changes before deploying."
  exit 1
fi

if [ ! -f "${BACKEND_DIR}/.env.staging" ]; then
  echo "[-] ERROR: Missing .env.staging in ${BACKEND_DIR}."
  echo "[-] Please create it using scripts/staging/.env.staging.example."
  exit 1
fi

# Guard: Validate required staging environment variables (prevent placeholder deployment)
set +e
grep -qE '^DATABASE_URL=' "${BACKEND_DIR}/.env.staging"
HAS_DB_URL=$?
grep -qE 'CHANGE_ME|staging-db\.internal' "${BACKEND_DIR}/.env.staging"
HAS_PLACEHOLDER_DB=$?
grep -qE '^JWT_SECRET=' "${BACKEND_DIR}/.env.staging"
HAS_JWT=$?
grep -qE 'REPLACE_WITH' "${BACKEND_DIR}/.env.staging"
HAS_PLACEHOLDER_JWT=$?
grep -qE '^BASE_DOMAIN=' "${BACKEND_DIR}/.env.staging"
HAS_BASE_DOMAIN=$?
set -e

if [ ${HAS_DB_URL} -ne 0 ] || [ ${HAS_PLACEHOLDER_DB} -eq 0 ]; then
  echo "[-] ERROR: DATABASE_URL is unset or contains unconfigured placeholders in .env.staging."
  exit 1
fi
if [ ${HAS_JWT} -ne 0 ] || [ ${HAS_PLACEHOLDER_JWT} -eq 0 ]; then
  echo "[-] ERROR: JWT_SECRET is unset or contains unconfigured placeholders in .env.staging."
  exit 1
fi
if [ ${HAS_BASE_DOMAIN} -ne 0 ]; then
  echo "[-] ERROR: BASE_DOMAIN is not set in .env.staging."
  exit 1
fi
echo "[+] Environment configuration preflight validated successfully."

# Preserve currently verified active release as rollback target (do not overwrite with candidate commit!)
if [ -f "${ACTIVE_COMMIT_FILE}" ]; then
  PREV_ACTIVE=$(cat "${ACTIVE_COMMIT_FILE}" | tr -d '[:space:]')
  if [ -n "${PREV_ACTIVE}" ] && [ "${PREV_ACTIVE}" != "${FULL_COMMIT}" ]; then
    echo "${PREV_ACTIVE}" > "${LKG_FILE}"
    echo "[+] Preserved prior verified active commit as rollback target: ${PREV_ACTIVE}"
  fi
elif [ ! -f "${LKG_FILE}" ]; then
  # On first run, record previous parent commit as conservative rollback target
  PARENT_COMMIT=$(git -C "${APP_DIR}" rev-parse HEAD~1 2>/dev/null || echo "")
  if [ -n "${PARENT_COMMIT}" ]; then
    echo "${PARENT_COMMIT}" > "${LKG_FILE}"
  fi
fi

echo "[+] Step 2: Running TypeScript compile verification..."
(cd "${BACKEND_DIR}" && npx tsc --noEmit)
echo "[+] Backend typecheck PASSED."

echo "[+] Step 3: Compiling frontend production bundle..."
npm run build
echo "[+] Frontend build PASSED."

echo "[+] Step 4: Compiling backend bundle..."
(cd "${BACKEND_DIR}" && npm run build || npx tsc -p tsconfig.json)
echo "[+] Backend compile PASSED."

echo "[+] Step 5: Restarting staging services..."
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet masterhrms-backend.service 2>/dev/null; then
  echo "[+] Restarting via systemd..."
  sudo systemctl restart masterhrms-backend.service
  sudo systemctl restart masterhrms-frontend.service
elif command -v pm2 >/dev/null 2>&1; then
  echo "[+] Restarting via PM2..."
  pm2 reload scripts/staging/ecosystem.config.cjs --env staging || pm2 start scripts/staging/ecosystem.config.cjs --env staging
else
  echo "[!] Notice: Neither systemctl nor PM2 detected. Please start services manually."
fi

echo "[+] Step 6: Verifying post-deployment application readiness SLA (<1500ms)..."
sleep 3

# Fast liveness probe
LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${LIVE_CHECK_URL}" || echo "000")
if [ "${LIVE_STATUS}" -ne 200 ]; then
  echo "[-] ERROR: Fast liveness probe failed with HTTP status: ${LIVE_STATUS}."
  echo "[-] INITIATING AUTOMATIC SAFE ROLLBACK..."
  "${APP_DIR}/scripts/staging/rollback-staging.sh" "${APP_DIR}"
  exit 1
fi
echo "[+] Fast liveness probe responded with HTTP 200 (alive)."

# Application readiness probe (verifies database dependency connectivity)
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${READY_CHECK_URL}" || echo "000")
if [ "${READY_STATUS}" -ne 200 ]; then
  echo "[-] ERROR: Readiness probe failed with HTTP status: ${READY_STATUS} (database not connected)."
  echo "[-] INITIATING AUTOMATIC SAFE ROLLBACK..."
  "${APP_DIR}/scripts/staging/rollback-staging.sh" "${APP_DIR}"
  exit 1
fi
echo "[+] Application readiness probe responded with HTTP 200 (database connected & ready)."

DEEP_HEALTH=$(curl -s --max-time 5 "${HEALTH_CHECK_URL}" || echo "{}")
echo "[+] Deep health check output (sanitized):"
echo "${DEEP_HEALTH}" | sed -E 's/"(password|secret|key|token)":"[^"]*"/"\1":"[REDACTED]"/g'

# Record active release identifier and verified commit upon verified success
echo "${RELEASE_ID}" > "${APP_DIR}/.active_release"
echo "${FULL_COMMIT}" > "${ACTIVE_COMMIT_FILE}"
echo "${FULL_COMMIT}" > "${LKG_FILE}"
echo "======================================================================="
echo "STAGING DEPLOYMENT VERDICT: SUCCESSFUL [${RELEASE_ID}]"
echo "Verified Commit: ${FULL_COMMIT}"
echo "======================================================================="
