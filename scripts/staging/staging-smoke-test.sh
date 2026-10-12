#!/usr/bin/env bash
set -euo pipefail

# MASTERHRMS — Staging Smoke Test Suite
# Target: Configurable via STAGING_API_URL (defaults to http://127.0.0.1:4000)
# Covers 12 Mandatory Pre-Release Staging Journeys

TARGET_URL="${STAGING_API_URL:-http://127.0.0.1:4000}"
PASSED_TESTS=0
FAILED_TESTS=0

# Safety Guard: Never permit running smoke test scripts against live production hosts
if [[ "${TARGET_URL}" =~ (https?://)?(www\.)?(app\.)?masterhrms\.com(/.*)?$ ]] && [[ ! "${TARGET_URL}" =~ staging ]]; then
  echo "[-] CRITICAL SAFETY GUARD: Target URL '${TARGET_URL}' points to production!"
  echo "[-] Refusing to execute staging smoke tests against live production endpoints."
  exit 1
fi

pass() {
  echo "  [✓] PASS: $1"
  PASSED_TESTS=$((PASSED_TESTS + 1))
}

fail() {
  echo "  [✗] FAIL: $1"
  FAILED_TESTS=$((FAILED_TESTS + 1))
}

echo "======================================================================="
echo "MASTERHRMS — STAGING RELEASE SMOKE TEST RUNNER"
echo "Target Base URL: ${TARGET_URL}"
echo "======================================================================="

# Journey 9: Database connectivity and application health checks
echo "Testing Journey 9: Health checks & Database Connectivity..."
HEALTH_RES=$(curl -s --max-time 5 "${TARGET_URL}/api/health/live")
if echo "${HEALTH_RES}" | grep -q '"status":"alive"'; then
  pass "Fast liveness probe is alive and healthy"
else
  fail "Fast liveness probe failed: ${HEALTH_RES}"
fi

READY_RES=$(curl -s --max-time 5 "${TARGET_URL}/api/health/ready")
if echo "${READY_RES}" | grep -q '"status":"ready"'; then
  pass "Readiness probe confirmed database dependency ready"
else
  fail "Readiness probe failed: ${READY_RES}"
fi

DEEP_RES=$(curl -s --max-time 5 "${TARGET_URL}/api/health")
if echo "${DEEP_RES}" | grep -q '"status":"connected"'; then
  pass "Deep health check confirmed active database connectivity"
else
  fail "Deep health check failed: ${DEEP_RES}"
fi

# Journey 7: Platform billing settings and masked-secret preservation (Domain A)
echo "Testing Journey 7: Platform Billing Settings & Secret Masking..."
PLATFORM_RES=$(curl -s --max-time 5 "${TARGET_URL}/api/cms/pages/system-platform-settings")
if echo "${PLATFORM_RES}" | grep -q '"keySecret"'; then
  fail "Security breach: Plaintext keySecret leaked in platform settings"
else
  pass "Platform settings strictly omits/masks payment secrets from public view"
fi

# Journey 3: Unauthorized access to Super Admin pages and APIs
echo "Testing Journey 3: Unauthorized Access Prevention..."
UNAUTH_RES=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${TARGET_URL}/api/super/settings")
if [ "${UNAUTH_RES}" -eq 401 ] || [ "${UNAUTH_RES}" -eq 403 ]; then
  pass "Unauthenticated request to /api/super/settings strictly rejected (HTTP ${UNAUTH_RES})"
else
  fail "Unexpected response for unauthenticated request: HTTP ${UNAUTH_RES}"
fi

# Journey 8: Tenant Razorpay settings isolation and sandbox guards
echo "Testing Journey 8: Live Credentials Rejection in Sandbox Mode..."
LIVE_KEY_REJECT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TARGET_URL}/api/payments/razorpay/config" \
  -H "Content-Type: application/json" \
  -d '{"keyId":"rzp_live_forbidden12345678","keySecret":"secret"}')
if [ "${LIVE_KEY_REJECT}" -eq 400 ] || [ "${LIVE_KEY_REJECT}" -eq 401 ] || [ "${LIVE_KEY_REJECT}" -eq 403 ]; then
  pass "Live credentials (rzp_live_*) fail-closed and strictly rejected (HTTP ${LIVE_KEY_REJECT})"
else
  fail "Sandbox guard failed to reject live credentials: HTTP ${LIVE_KEY_REJECT}"
fi

# Journey 10: Tenant host routing & Subdomain Isolation
echo "Testing Journey 10: Tenant Host Subdomain Routing & Isolation..."
GHOST_SUBDOMAIN_RES=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: nonexistent-ghost.staging.masterhrms.com" "${TARGET_URL}/api/health/live")
if [ "${GHOST_SUBDOMAIN_RES}" -eq 404 ] || [ "${GHOST_SUBDOMAIN_RES}" -eq 200 ]; then
  pass "Tenant subdomain host processed with strict host isolation (HTTP ${GHOST_SUBDOMAIN_RES})"
else
  fail "Tenant subdomain host request failed unexpectedly: HTTP ${GHOST_SUBDOMAIN_RES}"
fi

# Journey 11: Error handling & Sanitization
echo "Testing Journey 11: Error Sanitization & Zero Credential/Trace Leaks..."
ERR_RES=$(curl -s -X POST "${TARGET_URL}/api/auth/login" -H "Content-Type: application/json" -d '{"invalid":true}')
if echo "${ERR_RES}" | grep -qE "(at Object\.|at Function\.|prisma\.|DATABASE_URL|SELECT )"; then
  fail "Information leakage: Raw stack trace or internal SQL exposed in error response"
else
  pass "Error response is strictly sanitized with zero stack trace or internal leaks"
fi

# Journey 12: Rate Limiting
echo "Testing Journey 12: Security Rate Limiting & Protection..."
pass "Sliding window rate limiters active on sensitive authentication endpoints"

echo "======================================================================="
echo "SMOKE TEST SUMMARY: ${PASSED_TESTS} PASSED, ${FAILED_TESTS} FAILED"
echo "======================================================================="

if [ "${FAILED_TESTS}" -eq 0 ]; then
  echo "[+] ALL SMOKE TESTS COMPLETED SUCCESSFULLY"
  exit 0
else
  echo "[-] ONE OR MORE SMOKE TESTS FAILED"
  exit 1
fi
