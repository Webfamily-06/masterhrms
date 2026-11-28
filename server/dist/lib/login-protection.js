"use strict";
/**
 * Per-Account Progressive Brute-Force Lockout Protection (PENTEST-005 / PERF-001)
 *
 * Isolates brute-force attacks strictly to the targeted account email so:
 * - An attacker rotating proxy IPs against `admin@company.com` is locked out after 5 wrong passwords (HTTP 423).
 * - 999 other legitimate employees logging in behind the same corporate office NAT IP are NEVER affected.
 * - Bounded map size prevents memory exhaustion if an attacker spams random nonexistent emails.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAccountLockout = checkAccountLockout;
exports.recordFailedLogin = recordFailedLogin;
exports.clearFailedLogins = clearFailedLogins;
exports.resetAllAccountLockoutsForTest = resetAllAccountLockoutsForTest;
exports.getLockoutTrackerStats = getLockoutTrackerStats;
const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
const MAX_FAILURES_BEFORE_LOCK = Math.max(3, Number(process.env.AUTH_LOCKOUT_THRESHOLD || 5));
const LOCKOUT_TIERS_MS = [
    60 * 1000, // Tier 1 (5 failures): 1 minute
    5 * 60 * 1000, // Tier 2 (10 failures): 5 minutes
    15 * 60 * 1000, // Tier 3 (15+ failures): 15 minutes
];
const MAX_TRACKED_ACCOUNTS = 50_000;
const failureStore = new Map();
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of failureStore.entries()) {
        if (rec.lockedUntil <= now && now - rec.firstFailedAt > WINDOW_MS) {
            failureStore.delete(key);
        }
    }
}, 60_000);
if (cleanupTimer.unref)
    cleanupTimer.unref();
function normalizeKey(email) {
    return String(email || "").trim().toLowerCase().slice(0, 254);
}
function checkAccountLockout(email) {
    const key = normalizeKey(email);
    if (!key)
        return { locked: false, retryAfterSeconds: 0, failures: 0, lockoutTier: 0 };
    const now = Date.now();
    const rec = failureStore.get(key);
    if (!rec)
        return { locked: false, retryAfterSeconds: 0, failures: 0, lockoutTier: 0 };
    if (rec.lockedUntil > now) {
        return {
            locked: true,
            retryAfterSeconds: Math.max(1, Math.ceil((rec.lockedUntil - now) / 1000)),
            failures: rec.failures,
            lockoutTier: rec.lockoutTier,
        };
    }
    // Expire stale window once lock has elapsed
    if (now - rec.firstFailedAt > WINDOW_MS) {
        failureStore.delete(key);
        return { locked: false, retryAfterSeconds: 0, failures: 0, lockoutTier: 0 };
    }
    return { locked: false, retryAfterSeconds: 0, failures: rec.failures, lockoutTier: rec.lockoutTier };
}
function recordFailedLogin(email) {
    const key = normalizeKey(email);
    if (!key)
        return { locked: false, retryAfterSeconds: 0, failures: 0, lockoutTier: 0 };
    const now = Date.now();
    let rec = failureStore.get(key);
    if (!rec || (rec.lockedUntil <= now && now - rec.firstFailedAt > WINDOW_MS)) {
        // Evict oldest entry if map cap reached (DoS memory guard)
        if (failureStore.size >= MAX_TRACKED_ACCOUNTS) {
            const oldestKey = failureStore.keys().next().value;
            if (oldestKey)
                failureStore.delete(oldestKey);
        }
        rec = { failures: 0, firstFailedAt: now, lockedUntil: 0, lockoutTier: 0 };
    }
    rec.failures += 1;
    if (rec.failures >= MAX_FAILURES_BEFORE_LOCK && rec.failures % MAX_FAILURES_BEFORE_LOCK === 0) {
        const tierIdx = Math.min(LOCKOUT_TIERS_MS.length - 1, Math.floor(rec.failures / MAX_FAILURES_BEFORE_LOCK) - 1);
        rec.lockoutTier = tierIdx + 1;
        rec.lockedUntil = now + LOCKOUT_TIERS_MS[tierIdx];
    }
    failureStore.set(key, rec);
    const locked = rec.lockedUntil > now;
    return {
        locked,
        retryAfterSeconds: locked ? Math.max(1, Math.ceil((rec.lockedUntil - now) / 1000)) : 0,
        failures: rec.failures,
        lockoutTier: rec.lockoutTier,
    };
}
function clearFailedLogins(email) {
    const key = normalizeKey(email);
    if (key)
        failureStore.delete(key);
}
function resetAllAccountLockoutsForTest() {
    failureStore.clear();
}
function getLockoutTrackerStats() {
    const now = Date.now();
    let activeLocks = 0;
    for (const rec of failureStore.values()) {
        if (rec.lockedUntil > now)
            activeLocks++;
    }
    return {
        trackedAccounts: failureStore.size,
        activeLocks,
        maxTrackedAccounts: MAX_TRACKED_ACCOUNTS,
        threshold: MAX_FAILURES_BEFORE_LOCK,
    };
}
