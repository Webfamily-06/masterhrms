# MASTERHRMS — CRITICAL PRODUCTION DEPLOYMENT & LOCALHOST REDIRECT FIX REPORT

**Platform:** MasterHRMS Enterprise Multi-Tenant ERP & HRMS SaaS  
**Authoritative Canonical Domain:** `masterhrms.com`  
**Staging Domain:** `staging.masterhrms.com`  
**Date:** October 25, 2026  
**Final Status:** **CODE FIXED — DEPLOYMENT VERIFICATION PENDING**

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Reported Failure
External users accessing the production site (`https://masterhrms.com`) or staging deployment were bounced to `http://localhost:3000` or an exposed port (`:3000` / `:5173`), rendering the application unreachable outside local development.

### 1.2 The Forensic Diagnosis (Root Cause Chain)
Forensic tracing uncovered a multi-layer cascade between legacy client code, reverse proxy port routing, and process manager configurations:

1. **Hardcoded HTML Meta Refresh in TanStack Root Route (`src/routes/index.tsx`):**
   ```tsx
   head: () => ({
     meta: [
       { title: "Redirecting to Webfamily CMS..." },
       { "http-equiv": "refresh", content: "0;url=http://localhost:3000" }, // Immediate browser jump
     ],
   }),
   ```
   Before client-side router code executed, browser HTML parsers acted upon `<meta http-equiv="refresh" content="0;url=http://localhost:3000">`, immediately redirecting external users to `localhost:3000`.

2. **Unconditional Port Appending (`src/routes/index.tsx`):**
   ```ts
   return `${protocol}//${hostname}:3000${search}${hash}`;
   ```
   Even when JavaScript ran, `${hostname}:3000` appended `:3000` to the production domain (`https://masterhrms.com:3000`), which was blocked by external firewalls.

3. **Staging Nginx Reverse Proxy Upstream Misdirection (`scripts/staging/nginx-masterhrms-staging.conf`):**
   ```nginx
   upstream masterhrms_frontend {
       server 127.0.0.1:5173 max_fails=3 fail_timeout=10s; # Routed production to legacy Vite server!
   }
   ```
   The reverse proxy forwarded all public requests (`location /`) to port `5173` (Vite) instead of port `3000` (Next.js App Router).

4. **Process Manager Runtime Mismatch (`scripts/staging/ecosystem.config.cjs` & `masterhrms-frontend.service`):**
   PM2 and Systemd were configured to run `vite preview --port 5173`, serving the old Vite build with the hardcoded localhost meta refresh, while Next.js (hosting all 489 active routes) was never started.

5. **Secondary Localhost Leaks in Server & Client Utilities:**
   - `server/src/services/factories/oauth.factory.ts`: Line 78 hardcoded `req.hostname:5173`.
   - `src/routes/_authenticated/super/settings.tsx`: Lines 1485 and 1706 hardcoded `selectedTenant.slug.localhost:5173`.
   - `server/src/lib/workspace-host.ts`: `getBaseDomain()` defaulted to `"localhost"` in production when `BASE_DOMAIN` was omitted.
   - `server/src/index.ts`: Default CORS origin fallback defaulted to `localhost:5173,localhost:3000`.
   - `src/lib/api.ts` & `src/lib/socket.ts`: Defaulted to `http://localhost:4000` for API and WebSocket connections instead of `/api` and `window.location.origin`.

---

## 2. Target Environment & Live Host Audit

### 2.1 Live Internet Host Probe (`masterhrms.com`)
A live network probe against `https://masterhrms.com` revealed:
```bash
$ host masterhrms.com
masterhrms.com has address 23.153.104.141

$ curl -I -s -S https://masterhrms.com/
HTTP/2 302 
location: https://masterhrms.com/install
server: LiteSpeed
set-cookie: XSRF-TOKEN=...
set-cookie: hrm_saas_session=...

$ curl -I -s -S https://masterhrms.com/install
HTTP/2 500 
server: LiteSpeed
```
**Empirical Finding:** The live public DNS for `masterhrms.com` currently points to `23.153.104.141` running a LiteSpeed web server hosting a legacy PHP/Laravel application (`hrm_saas_session`), which currently redirects to `/install` (returning HTTP 500). The modern Next.js + Express Node.js application is not yet deployed on `23.153.104.141`, or DNS has not been cut over to the Node.js reverse proxy.

### 2.2 Staging Domain Probe (`staging.masterhrms.com`)
```bash
$ curl -I -s -S https://staging.masterhrms.com/
curl: (6) Could not resolve host: staging.masterhrms.com
```
**Empirical Finding:** No public DNS record exists for `staging.masterhrms.com` on the public internet. Staging is either intended for an internal network or `/etc/hosts` resolution.

### 2.3 Local Execution Environment
The local workspace environment is a macOS workstation (`Darwin Gowtham-Wilsan.local arm64`). Direct root SSH access to `23.153.104.141` is not available in the workspace credentials. Therefore, full deployment instructions are provided for the authorized infrastructure operator.

---

## 3. Repaired Production Architecture & URL Topology

```
                                  INTERNET
                                     │
                             HTTPS (Port 443)
                       masterhrms.com / *.masterhrms.com
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │       Nginx Reverse Proxy         │
                   │       (SSL Termination, HSTS)     │
                   └─────────────────┬─────────────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            │                                                 │
      location /                                        location /api/
            │                                                 │
            ▼                                                 ▼
┌─────────────────────────┐                       ┌─────────────────────────┐
│ Next.js App Router      │                       │ Express + Prisma Engine │
│ 127.0.0.1:3000          │                       │ 127.0.0.1:4000          │
├─────────────────────────┤                       ├─────────────────────────┤
│ - Public Marketing (/)  │                       │ - /api/auth/*           │
│ - Super Admin (/super)  │                       │ - /api/super/*          │
│ - Tenant Workspaces     │                       │ - /api/payments/*       │
│ - All 489 App Routes    │                       │ - /api/health           │
└─────────────────────────┘                       └─────────────────────────┘
```

### URL Resolution Matrix
| Environment | Base Domain | Root Public URL | Super Admin URL | Tenant Workspace URL | API Origin (Browser) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Development** | `localhost` | `http://localhost:3000` | `http://localhost:3000/super` | `http://{slug}.localhost:3000` | `/api` (proxied to `:4000`) |
| **Staging** | `staging.masterhrms.com` | `https://staging.masterhrms.com` | `https://staging.masterhrms.com/super` | `https://{slug}.staging.masterhrms.com` | `/api` (same-origin proxy) |
| **Production** | `masterhrms.com` | `https://masterhrms.com` | `https://masterhrms.com/super` | `https://{slug}.masterhrms.com` | `/api` (same-origin proxy) |

---

## 4. Exact Code & Configuration Changes

### 4.1 TanStack Index Route (`src/routes/index.tsx`)
- **Removed:** `<meta http-equiv="refresh" content="0;url=http://localhost:3000" />`
- **Removed:** Hardcoded `<a href="http://localhost:3000">`
- **Updated `getCmsTargetUrl()`:**
  - In local development (`localhost`, `127.0.0.1`, `*.localhost`): Redirects to `http://${hostname}:3000`.
  - In staging or production: Resolves to `https://${hostname}/` or `VITE_APP_URL`. **Never appends `:3000` and never redirects to `localhost`**.

### 4.2 TanStack Platform Domain (`src/lib/platform-domain.ts`)
- Added and exported `getTenantWorkspaceUrl(tenant, targetPath)`.
- Updated `getPlatformBaseDomain()` and `getPlatformDisplayBaseDomain()` to fall back to `masterhrms.com` in production SSR instead of `"localhost"`.

### 4.3 TanStack Super Admin Settings (`src/routes/_authenticated/super/settings.tsx`)
- Imported `getTenantWorkspaceUrl`.
- Replaced hardcoded `http://${selectedTenant.domain || `${selectedTenant.slug}.localhost:5173`}/settings` on line 1485 with `getTenantWorkspaceUrl(selectedTenant, "/settings")`.
- Replaced hardcoded `http://{selectedTenant?.slug}.localhost:5173/settings` on line 1706 with `{getTenantWorkspaceUrl(selectedTenant, "/settings")}`.

### 4.4 CMS Platform Domain (`CMS/src/lib/platform-domain.ts`)
- Fixed SSR `displayBaseDomain` fallback from arbitrary `"app"` to `process.env.PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com"`.
- Added support for `process.env.NEXT_PUBLIC_BASE_DOMAIN` and `process.env.BASE_DOMAIN` in `getPlatformBaseDomain()`.

### 4.5 Backend Workspace Host Utilities (`server/src/lib/workspace-host.ts`)
- Hardened `getBaseDomain()`: In `NODE_ENV === "production"`, if `BASE_DOMAIN` is missing or configured as a loopback address (`localhost`, `127.0.0.1`), it logs a warning and falls back to `PRODUCTION_FALLBACK_DOMAIN || "masterhrms.com"`.
- Hardened `getWorkspaceUrl()` and `getRootUrl()`:
  - In production (`!isDev`), even if an internal port (such as 3000 or 4000) is passed or forwarded, `portSuffix` is strictly suppressed.
  - Guaranteed to return `https://${slug}.${base}` and `https://${base}` without port leaks.

### 4.6 Backend OAuth Factory (`server/src/services/factories/oauth.factory.ts`)
- Line 78: Removed hardcoded `:5173`.
- `frontendBaseUrl` resolves from `process.env.FRONTEND_URL || process.env.APP_URL || getRootUrl()`, avoiding dev port injection in production.
- In `resolveConfig()`, added security guards: If CMS settings stored in the database contain loopback addresses (`localhost` or `127.0.0.1`), they are ignored in production to prevent configuration drift from breaking live OAuth redirects.

### 4.7 Backend CORS Configuration (`server/src/index.ts`)
- Default `CORS_ORIGIN` in production defaults to `https://masterhrms.com,https://staging.masterhrms.com` instead of localhost development origins.

### 4.8 Frontend API & WebSocket Clients (`src/lib/api.ts`, `src/lib/socket.ts`, `CMS/src/lib/socket.ts`)
- In production browsers, fallback `API_BASE` resolves to `/api` (same-origin reverse proxy) instead of `http://localhost:4000/api`.
- In production browsers, fallback `SOCKET_URL` resolves to `window.location.origin` instead of `http://localhost:4000`.

### 4.9 Staging Nginx Reverse Proxy (`scripts/staging/nginx-masterhrms-staging.conf`)
- Corrected upstream:
  ```nginx
  upstream masterhrms_frontend {
      server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
      keepalive 32;
  }
  ```

### 4.10 Staging PM2 Ecosystem & Systemd Service (`scripts/staging/ecosystem.config.cjs`, `masterhrms-frontend.service`)
- `masterhrms-frontend-staging` configured to execute Next.js production server:
  - CWD: `./CMS`
  - Script: `node_modules/.bin/next start -p 3000 -H 127.0.0.1`
  - Mode: `cluster`, 2 instances
  - Port: `3000`

---

## 5. Verification & Test Evidence

### 5.1 Automated Production URL & Redirect Resolution Test Suite
Executed `scripts/test_production_redirect_resolution.mjs` using `./server/node_modules/.bin/tsx`:

```bash
=======================================================================
MASTERHRMS — PRODUCTION URL & REDIRECT RESOLUTION AUDIT SUITE
=======================================================================

Suite 1: Backend Workspace Host Resolution (server/src/lib/workspace-host.ts)
  [✓] PASS: 1.1 Local development generates localhost URLs with configured ports
  [✓] PASS: 1.2 Production environment generates HTTPS canonical domain URLs (masterhrms.com)
  [✓] PASS: 1.3 Staging environment generates HTTPS staging domain URLs (staging.masterhrms.com)
  [✓] PASS: 1.4 Production URLs NEVER append internal port numbers (:3000, :4000, :5173)
  [✓] PASS: 1.5 Missing or loopback BASE_DOMAIN in production falls back to canonical domain without emitting localhost

Suite 2: OAuth Factory URL Resolution (server/src/services/factories/oauth.factory.ts)
  [✓] PASS: 2.1 Local development resolves local frontendBaseUrl (localhost:3000)
  [✓] PASS: 2.2 Production resolves canonical HTTPS frontendBaseUrl without port 5173

Suite 3: CMS Platform Domain Helpers (CMS/src/lib/platform-domain.ts)
  [✓] PASS: 3.1 CMS SSR resolves canonical domain in production
  [✓] PASS: 3.2 CMS getTenantWorkspaceUrl generates valid custom domain and subdomain URLs

Suite 4: TanStack Index Route Simulation (src/routes/index.tsx)
  [✓] PASS: 4.1 Local development on localhost:5173 resolves to localhost:3000
  [✓] PASS: 4.2 Production access on masterhrms.com NEVER redirects to localhost:3000
  [✓] PASS: 4.3 Staging access on staging.masterhrms.com NEVER redirects to localhost:3000

Suite 5: Deployment & Process Manager Verification
  [✓] PASS: 5.1 Nginx staging config proxies frontend traffic to Next.js on port 3000 (not 5173)
  [✓] PASS: 5.2 PM2 ecosystem config runs Next.js on port 3000 (not Vite on 5173)
  [✓] PASS: 5.3 Systemd frontend service executes Next.js start on port 3000

Suite 6: Zero Localhost Leaks in Critical Production Files
  [✓] PASS: 6.1 src/routes/index.tsx has zero hardcoded meta refresh to localhost:3000
  [✓] PASS: 6.2 src/routes/_authenticated/super/settings.tsx has zero hardcoded localhost:5173 links
  [✓] PASS: 6.3 server/src/services/factories/oauth.factory.ts has zero hardcoded :5173 in default URL

=======================================================================
TEST RESULTS: 18 PASSED, 0 FAILED (Exit Code: 0)
=======================================================================
```

### 5.2 Build Verifications
| Workspace | Command | Result | Exit Code |
| :--- | :--- | :--- | :--- |
| **CMS Typecheck** | `npm run cms:typecheck` | `tsc --noEmit` passed with 0 errors | `0` |
| **Server Backend Build** | `npm --prefix server run build` | Prisma generate + `tsc` compiled to `server/dist/` | `0` |
| **CMS Production Build** | `npm run cms:build` | Next.js 16.1.6 Turbopack built all 489 routes successfully | `0` |
| **URL Resolution Test** | `./server/node_modules/.bin/tsx scripts/test_production_redirect_resolution.mjs` | 18/18 assertions passed | `0` |

### 5.3 Live HTTP Route & Header Validation (Simulated Production Host Headers)
Direct HTTP probes against the running application with simulated production headers:
```bash
# 1. Root Marketing Homepage
$ curl -I -s -H "Host: masterhrms.com" -H "X-Forwarded-Proto: https" http://127.0.0.1:3000/
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
(Zero redirect, renders landing page)

# 2. Super Admin Portal
$ curl -I -s -H "Host: masterhrms.com" -H "X-Forwarded-Proto: https" http://127.0.0.1:3000/super
HTTP/1.1 200 OK

# 3. Authentication Page
$ curl -I -s -H "Host: masterhrms.com" -H "X-Forwarded-Proto: https" http://127.0.0.1:3000/auth
HTTP/1.1 200 OK

# 4. Deep Links & Refresh Verification
$ curl -s -o /dev/null -w "%{http_code}\n" -H "Host: masterhrms.com" http://127.0.0.1:3000/pricing
200
$ curl -s -o /dev/null -w "%{http_code}\n" -H "Host: masterhrms.com" http://127.0.0.1:3000/about
200
$ curl -s -o /dev/null -w "%{http_code}\n" -H "Host: masterhrms.com" http://127.0.0.1:3000/legal/terms-of-service
200
$ curl -s -o /dev/null -w "%{http_code}\n" -H "Host: masterhrms.com" http://127.0.0.1:3000/super/settings
200
$ curl -s -o /dev/null -w "%{http_code}\n" -H "Host: masterhrms.com" http://127.0.0.1:3000/hr/calendar
200

# 5. Production CORS Verification
$ curl -I -s -H "Origin: https://masterhrms.com" http://127.0.0.1:4000/api/health/live
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://masterhrms.com
Access-Control-Allow-Credentials: true

$ curl -I -s -H "Origin: https://acme.masterhrms.com" http://127.0.0.1:4000/api/health/live
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://acme.masterhrms.com
Access-Control-Allow-Credentials: true
```

---

## 6. Operator Deployment Guide for Live Linux Server (`/opt/masterhrms`)

When ready to apply this update to the production Linux host:

### Step 1: Pre-Deployment Backup
```bash
sudo cp /etc/nginx/sites-available/masterhrms.conf /etc/nginx/sites-available/masterhrms.conf.bak.$(date +%Y%m%d_%H%M%S)
pm2 save
```

### Step 2: Deploy Code
```bash
cd /opt/masterhrms
git pull origin main
```

### Step 3: Validate Environment (`.env.production`)
Ensure secrets are configured and domain variables match:
```ini
NODE_ENV=production
PORT=4000
BASE_DOMAIN=masterhrms.com
FRONTEND_URL=https://masterhrms.com
CORS_ORIGIN=https://masterhrms.com,https://*.masterhrms.com
```

### Step 4: Build Bundles
```bash
npm --prefix server run build
npm run build
```

### Step 5: Update Nginx & Reload
```bash
sudo cp scripts/staging/nginx-masterhrms-staging.conf /etc/nginx/sites-available/masterhrms.conf
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Restart PM2 Services
```bash
pm2 restart scripts/staging/ecosystem.config.cjs --env staging
pm2 save
```

### Step 7: Live Verification
```bash
curl -I https://masterhrms.com/
# Expected: HTTP 200 OK, zero 'Location: http://localhost:3000'
```

---

## 7. Sign-off Verdict

- **Code Fix Status:** COMPLETE & VERIFIED.
- **Automated Tests:** 18/18 PASSED (Exit code: 0).
- **Builds:** Next.js (Turbopack 489/489 routes) & Express TypeScript PASSED.
- **Live Internet Domain Probe:** Current live DNS points to LiteSpeed web server returning 302 to `/install` (HTTP 500).
- **Final Status:** **CODE FIXED — DEPLOYMENT VERIFICATION PENDING** (Code is verified in production simulation; live production server deployment pending authorized infrastructure operator execution).
