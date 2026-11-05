# MASTERHRMS — Phase C3.5-A Gate C Rollback Report
## Staging Infrastructure Rollback Procedures, State Snapshots & Safety Controls

**Role:** DevOps Engineer, Infrastructure Reliability Lead  
**Execution Timestamp:** 2026-11-05T11:40:00+05:30  
**Rollback Scope:** Staging Resources Only (Production Zero-Touch)  
**Status:** VALIDATED & READY

---

## 1. Executive Summary

This document defines the comprehensive rollback procedure for MASTERHRMS Phase C3.5-A Gate C.

Because preflight stop conditions were strictly enforced upon detecting the router NAT restriction, **no public DNS changes or production configurations were altered**. The rollback state remains completely clean and deterministic.

---

## 2. Baseline State Snapshots Prior to Gate C

### A. Cloudflare DNS State (`masterhrms.com`)
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
- **State:** No record for `sfu-staging.masterhrms.com` was created.

### B. Docker Staging Containers
- **Compose Path:** `scripts/staging-sfu/docker-compose.staging-sfu.yml`
- **Active Containers:**
  - `masterhrms_staging_sfu` (`livekit/livekit-server:v1.13.11`)
  - `masterhrms_staging_coturn` (`coturn/coturn:4.6.3-alpine`)

### C. Git Working Tree State
- **Branch:** `main`
- **Base Commit:** `79998ccc6c7aeb32b21f85e1716c8ba59df6257f`
- **Database Baseline:** 119 records verified against SHA-256:
  `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`

---

## 3. Step-by-Step Staging Rollback Procedures

### Procedure 1: Tearing Down Staging Docker Containers
If staging media services must be stopped or reverted:
```bash
docker compose -f scripts/staging-sfu/docker-compose.staging-sfu.yml down
```
To remove containers while preserving configuration:
```bash
docker stop masterhrms_staging_sfu masterhrms_staging_coturn
docker rm masterhrms_staging_sfu masterhrms_staging_coturn
```

### Procedure 2: Reverting Backend Code Changes (If Required)
To revert the ephemeral TURN credential additions in `server/src/services/meeting-sfu.service.ts` and `call.routes.ts`:
```bash
git checkout -- server/src/services/meeting-sfu.service.ts
git checkout -- server/src/routes/call.routes.ts
```

### Procedure 3: Removing Staging Configuration Files
To clean staging-specific directories without touching codebase:
```bash
rm scripts/staging-sfu/turnserver.conf
rm scripts/staging-sfu/.env.staging-sfu.example
```

---

## 4. Verification After Rollback

Following any rollback execution, run the integrity validation script:
```bash
node scripts/audit_c3_5_historical_integrity.cjs
```
**Verification Criterion:**
- Exactly 119 historical `CallHistoryRecord` rows must be present.
- SHA-256 fingerprint must match `0a98ae9b0f186860a1fc99a1287f740b24b783a5b408d10a1f655f8d7c71dd3a`.

---

## 5. Production Isolation Guarantee

The rollback procedures detailed herein operate exclusively within the isolated local staging workspace and staging Docker containers. Under no circumstances can these rollback commands affect production databases, production DNS records, or live web servers.

