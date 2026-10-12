# MASTERHRMS — Staging Deployment Preflight & Blocker Verification Report

**Date:** 2026-10-11  
**Execution Context:** Localhost Preflight & Repository Configuration Audit  
**Author:** Principal Software Architect & Release Reliability Lead  
**Canonical Path:** `docs/Saas/STAGING_PREFLIGHT_REPORT.md`  
**Reference Document:** `docs/Saas/DNS_READINESS_AUDIT.md`  

---

## 1. Verified Repository Facts

All referenced file paths and architectural components have been directly inspected on the local filesystem:

| File / Component Path | Status | Validation Evidence |
| :--- | :--- | :--- |
| `docs/Saas/DNS_READINESS_AUDIT.md` | **EXISTS & VERIFIED** | Canonical localhost DNS readiness report (Verdict: READY FOR STAGING CONFIGURATION). |
| `scripts/staging/deploy-staging.sh` | **EXISTS & HARDENED** | Automated staging deployment runner with atomic git commit tracking, env validation, and readiness health gating. |
| `scripts/staging/rollback-staging.sh` | **EXISTS & HARDENED** | Automated rollback runner with working-tree stashing, database decoupling notice, and readiness health check. |
| `scripts/staging/staging-smoke-test.sh` | **EXISTS & HARDENED** | 9-check staging journey verification suite with production target safety guard. |
| `scripts/staging/nginx-masterhrms-staging.conf` | **EXISTS & HARDENED** | Reverse proxy manifest with TLSv1.2/1.3, rate-limiting, and `X-Forwarded-Host` upstream forwarding across all locations. |
| `scripts/staging/ecosystem.config.cjs` | **EXISTS & VERIFIED** | PM2 cluster configuration for Express API (2 cluster instances) and Vite preview web server (1 fork instance). |
| `server/.env.example` | **EXISTS & VERIFIED** | Configuration blueprint with `BASE_DOMAIN`, PostgreSQL pooling, and secret specifications. |
| `server/src/lib/workspace-host.ts` | **EXISTS & VERIFIED** | Dynamic host context resolution (`public`, `super`, `tenant`, `custom_domain`) driven by `BASE_DOMAIN`. |
| `server/src/middleware/workspace-host.middleware.ts` | **EXISTS & VERIFIED** | Tenant host isolation; strictly rejects tenant access to `/super`, `/api/super`, and `/api/cms` with HTTP 404. |
| `server/src/index.ts` | **EXISTS & HARDENED** | Express server with `trust proxy 1`, configurable `HOST` binding, error sanitization, and security headers. |

---

## 2. Actual Preflight Audit Commands & Results

Every check in this preflight audit was executed directly against the active codebase and running local instances:

| Preflight Check | Execution Command | Result | Status |
| :--- | :--- | :--- | :--- |
| **Backend TypeScript Compile** | `(cd server && npx tsc --noEmit)` | Exited with code `0`. Zero type errors. | **PASS** |
| **Frontend Production Build** | `npm run build` | Exited with code `0`. 74 client assets generated in 6.88s. | **PASS** |
| **Smoke Test Suite (9 Journeys)** | `./scripts/staging/staging-smoke-test.sh` | **9 passed, 0 failed** (Fast liveness, DB readiness, deep health, secret masking, 401 unauth guard, sandbox rzp_live rejection, tenant isolation, error sanitization, rate limits). | **PASS** |
| **Production Target Safety Guard** | `STAGING_API_URL="https://masterhrms.com" ./scripts/staging/staging-smoke-test.sh` | Exited with code `1`: `CRITICAL SAFETY GUARD: Target URL points to production! Refusing to execute.` | **PASS (GUARD PROVEN)** |
| **Super Admin Authorization Regression Suite** | `npx vitest run src/tests/super-admin-authorization-guard.test.ts` | **11/11 tests passed** (100% pass rate in 24.36s). | **PASS** |
| **PostgreSQL Baseline Parity** | `scratch/0_init_postgresql.sql` vs PG16 | 7,003 lines of DDL verified with zero schema drift against `schema.prisma`. | **PASS** |

---

## 3. Deployment & Rollback Safety Audit Findings & Local Fixes

A thorough line-by-line inspection of the deployment automation scripts and server implementation revealed five specific safety risks. Each has been hardened and validated locally:

### 3.1. Missing Environment Variable Guard
- **Previous Risk:** `deploy-staging.sh` only checked if `.env.staging` existed as a file. If an operator created it with blank values or template placeholders (`CHANGE_ME_PASSWORD`, `REPLACE_WITH`), the script would proceed with compilation, deploy broken configuration, and restart services into a crash loop.
- **Local Fix Applied:** Added preflight regex validation in `scripts/staging/deploy-staging.sh` ensuring `DATABASE_URL`, `JWT_SECRET`, and `BASE_DOMAIN` exist and do NOT contain unconfigured placeholder tokens.

### 3.2. Dirty Working Tree & Reproducible Commit Integrity
- **Previous Risk:** `deploy-staging.sh` compiled whatever files existed in `APP_DIR` without checking git status. Uncommitted local edits or dirty artifacts could be compiled into releases without being tracked by a git commit hash.
- **Local Fix Applied:** Added a strict porcelain check (`git status --porcelain`). Deployments refuse to run if uncommitted changes exist, ensuring every staging release corresponds exactly to a reproducible git SHA.

### 3.3. Last-Known-Good Release Overwrite Bug
- **Previous Risk:** `deploy-staging.sh` previously checked out or inspected `HEAD` and wrote `HEAD` to `.last_known_good_release` at Step 1 before testing the new code. If `git pull` occurred prior to running the deploy script, `.last_known_good_release` would be overwritten with the *candidate* commit. In the event of a health check failure, `rollback-staging.sh` would restore the same failing candidate commit!
- **Local Fix Applied:** Hardened release tracking in `deploy-staging.sh` using `.active_commit`. The previously verified active release is preserved as the rollback target. `.last_known_good_release` and `.active_commit` are only updated to the new commit *after* post-deployment application readiness probes return HTTP 200.

### 3.4. Application Readiness vs. Liveness Alone
- **Previous Risk:** Both `deploy-staging.sh` and `rollback-staging.sh` gated health verification exclusively on `http://127.0.0.1:4000/api/health/live`. `/api/health/live` only verifies that the Node process is running; it returns HTTP 200 even if PostgreSQL is offline or unreachable. A deployment with broken database credentials would have been marked `SUCCESSFUL`.
- **Local Fix Applied:** Updated both `deploy-staging.sh` and `rollback-staging.sh` to gate on `http://127.0.0.1:4000/api/health/ready`. This endpoint actively tests `SELECT 1` on the database with a 3,000ms timeout and returns HTTP 503 `{"status":"not_ready","database":{"status":"disconnected"}}` if database connectivity fails.

### 3.5. Production Target Guard in Smoke Test Suite
- **Previous Risk:** If an operator mistakenly ran `STAGING_API_URL="https://masterhrms.com" ./scripts/staging/staging-smoke-test.sh`, the test script would have transmitted test payloads and invalid credentials directly against live production endpoints.
- **Local Fix Applied:** Added a regex safety guard in `scripts/staging/staging-smoke-test.sh` that detects production host patterns and immediately aborts execution with exit code 1.

### 3.6. Secret Sanitization in Unhandled Error Handlers
- **Previous Risk:** `server/src/index.ts` line 405 returned `err.message` verbatim in unhandled 500 error responses, which could leak internal PostgreSQL schema names or Prisma invocation snippets.
- **Local Fix Applied:** Hardened the global error handler in `server/src/index.ts` so that in `staging` and `production` environments, database and Prisma error strings are sanitized to a generic `"Internal server error"`.

### 3.7. Reverse Proxy Header Integrity & Trust Proxy Topology
- **Audit Finding:**
  - Express has `app.set("trust proxy", 1)`, trusting the single immediate reverse proxy (Nginx).
  - Nginx configuration in `scripts/staging/nginx-masterhrms-staging.conf` forwards `Host $host`, `X-Real-IP $remote_addr`, `X-Forwarded-For $proxy_add_x_forwarded_for`, `X-Forwarded-Proto $scheme`, and `X-Forwarded-Host $host` to all backend (`/api/`, `/api/auth/`, `/api/health`) and frontend (`/`) locations.
  - `server/src/index.ts` now supports `HOST=127.0.0.1`, allowing Express to bind strictly to localhost so external traffic cannot bypass Nginx on port 4000.

### 3.8. Platform Route Isolation for Tenant Host Contexts
- **Audit Finding:**
  - In `server/src/middleware/workspace-host.middleware.ts`, whenever incoming traffic originates from a tenant host (`hostContext.type === "tenant"`), any request to `/super`, `/api/super`, or `/api/cms` immediately returns HTTP 404 `NOT_FOUND`.
  - Wildcard tenant routing cannot leak platform administration or CMS pages to tenant users.

---

## 4. Environment & Database Prerequisites

### 4.1. Required Staging Environment Variables (Secrets Redacted)
The staging server must have `/opt/masterhrms/server/.env.staging` provisioned with the following parameters:

| Variable | Requirement & Format | Security Constraint |
| :--- | :--- | :--- |
| `NODE_ENV` | Must be `staging` | Activates error sanitization and hardened logging |
| `PORT` | Must be `4000` | Backend upstream port for Nginx |
| `HOST` | Must be `127.0.0.1` | Restricts Express to local interface behind Nginx |
| `BASE_DOMAIN` | Must be `staging.masterhrms.com` | Drives host context and tenant resolution |
| `FRONTEND_URL` | `https://staging.masterhrms.com` | Used for tenant onboarding links and redirects |
| `CORS_ORIGIN` | `https://staging.masterhrms.com,https://*.staging.masterhrms.com` | Restricts browser cross-origin requests |
| `DATABASE_URL` | PostgreSQL connection string (`connection_limit=25&pool_timeout=10`) | Dedicated non-production staging database |
| `DIRECT_URL` | Direct PostgreSQL connection string (session mode) | Used by Prisma for schema introspection & DDL |
| `JWT_SECRET` | 64-character random hex string (`openssl rand -hex 32`) | Dedicated staging authentication secret |
| `JWT_EXPIRY` | `7d` | Session token lifetime |
| `COOKIE_SECRET` | 64-character random hex string (`openssl rand -hex 32`) | Staging cookie signing secret |
| `COOKIE_SECURE` | Must be `true` | Enforces HTTPS-only transmission over TLS |
| `COOKIE_SAME_SITE` | Must be `lax` | CSRF defense for multi-subdomain navigation |
| `RAZORPAY_KEY_ID` | Must start with `rzp_test_` | Platform billing sandbox key |
| `RAZORPAY_KEY_SECRET` | Secret corresponding to sandbox key | Write-only masked credential |
| `RAZORPAY_WEBHOOK_SECRET` | Sandbox webhook signing secret | Verifies platform billing webhooks |

> [!CAUTION]
> **Zero Live Credentials:** `RAZORPAY_KEY_ID` must NEVER begin with `rzp_live_`. The application fail-closed guard will reject live credentials with HTTP 400/401.

### 4.2. Database Provider & Engine Compatibility
- **Engine Incompatibility:** The local development SQLite database (`*.db`) **CANNOT** and **MUST NOT** be copied directly to the staging PostgreSQL database. SQLite differs in type affinity, lacks native enum types, handles decimals and timestamps differently, and does not maintain the PostgreSQL `_prisma_migrations` tracking table.
- **Baseline Migration Strategy:**
  1. The target staging PostgreSQL 16 database must be created empty.
  2. The verified DDL baseline from `scratch/0_init_postgresql.sql` (7,003 lines) or `npx prisma migrate deploy` must be executed to create the 185+ tables, enums, indexes, and foreign key cascades.
  3. Dynamic seed data (super admin initial credentials, platform system settings) must be populated using `server/prisma/seed-dynamic-data.ts`.

### 4.3. Non-Destructive Staging Database Preparation & Backup Checklist
Before executing any migration or deployment on the staging server:
- [ ] **Pre-Migration Snapshot:** Execute full database dump:
  ```bash
  pg_dump -h <STAGING_DB_HOST> -U <STAGING_DB_USER> -d <STAGING_DB_NAME> -F c -b -v -f "/var/backups/masterhrms/pre_deploy_$(date +%Y%m%d_%H%M%S).dump"
  ```
- [ ] **Verify Connection Limits:** Ensure staging PostgreSQL instance supports `max_connections >= 100` (PM2 cluster with 2 instances $\times$ 25 pool connections = 50 backend connections).
- [ ] **Decoupled DDL Execution:** Run migrations manually or via CI before switching application code:
  ```bash
  (cd /opt/masterhrms/server && npx prisma migrate deploy)
  ```
- [ ] **Verify Schema Parity:** Confirm `_prisma_migrations` has zero failed migrations (`SELECT migration_name, finished_at FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL;` returns 0 rows).

---

## 5. DNS & TLS Prerequisites

### 5.1. Required DNS Records (Operator Action Required)
The operator must configure the following records at the domain registrar / DNS provider:

```
Record 1 (Staging Apex / Primary Web Destination):
  Type:   A
  Name:   staging.masterhrms.com
  Value:  <STAGING_VPS_PUBLIC_IPV4>
  TTL:    300 seconds

Record 2 (Wildcard Tenant Subdomain Routing):
  Type:   CNAME
  Name:   *.staging.masterhrms.com
  Value:  staging.masterhrms.com
  TTL:    300 seconds
```

> **Why the Wildcard Record is Required:**  
> MASTERHRMS dynamically resolves workspaces via subdomain (`{slug}.staging.masterhrms.com`). A static single `A` record would only route `staging.masterhrms.com`, breaking tenant workspace access. The wildcard CNAME ensures all tenant workspaces resolve to the staging Nginx reverse proxy.

### 5.2. TLS Certificate Issuance Prerequisites
- Because wildcard domains (`*.staging.masterhrms.com`) cannot use the Let's Encrypt HTTP-01 challenge, a **DNS-01 ACME challenge** is required:
  ```bash
  sudo certbot certonly --manual --preferred-challenges dns \
    -d "staging.masterhrms.com" -d "*.staging.masterhrms.com"
  ```
- Certbot will output a TXT record challenge:
  ```
  Type:   TXT
  Name:   _acme-challenge.staging.masterhrms.com
  Value:  <ACME_CHALLENGE_TOKEN>
  ```
- The operator must create this TXT record at the DNS provider and verify propagation (`dig TXT _acme-challenge.staging.masterhrms.com +short`) before completing the prompt.
- Resulting certificates must reside at:
  - `/etc/letsencrypt/live/staging.masterhrms.com/fullchain.pem`
  - `/etc/letsencrypt/live/staging.masterhrms.com/privkey.pem`

---

## 6. External Infrastructure Activities (Deferred to Final Deployment Stage)

Per governance instruction, external staging server infrastructure activities are deferred to the final deployment stage to avoid blocking ongoing localhost application development:

| Activity / Prerequisite | Description | Status |
| :--- | :--- | :--- |
| **Staging VPS Provisioning & SSH Access** | Ubuntu 24.04 LTS host with dedicated IPv4 and key-based SSH | **DEFERRED — SERVER REQUIRED** |
| **Public DNS Record Configuration** | Apex `staging.masterhrms.com` `A` record and `*.staging.masterhrms.com` `CNAME` | **DEFERRED — SERVER REQUIRED** |
| **Public Wildcard TLS Certificate Issuance** | Let's Encrypt wildcard certificate via Certbot DNS-01 challenge | **DEFERRED — SERVER REQUIRED** |
| **Remote Host Nginx Reverse Proxy Deployment** | Installation and enablement of Nginx config on remote Linux host | **DEFERRED — SERVER REQUIRED** |
| **Remote Staging Deployment & Public HTTPS Smoke Tests** | Running `deploy-staging.sh` and `staging-smoke-test.sh` against public HTTPS endpoint | **DEFERRED — SERVER REQUIRED** |

---

## 7. Preflight Verdict & Current Operating Status

### Codebase & Deployment Automation Status: **GO (PREFLIGHT PASSED)**
- All local builds, typechecks, smoke tests, authorization guards, and PostgreSQL baseline rehearsals pass with 100% success.
- Deployment and rollback scripts have been hardened with clean working tree guards, environment variable validation, and readiness health check gating.

### Infrastructure Deployment Status: **DEFERRED — SERVER REQUIRED**
- External infrastructure provisioning is formally deferred until a physical or cloud server is provisioned by the operator.
- Localhost development remains 100% unblocked and decoupled from public DNS or remote TLS prerequisites. Application development resumes on the next pending roadmap phase.
