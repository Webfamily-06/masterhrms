# MASTERHRMS — AUD-DEP-003 VERCEL PRODUCTION DEPLOYMENT EVIDENCE

> **Audit Identifier**: AUD-DEP-003  
> **Inspection Timestamp**: 2026-11-04T10:05:00+05:30 (UTC: 2026-11-04T04:35:00Z)  
> **Target Project**: `masterhrms` (Team: `masterhrms`)  
> **Git Repository**: `Webfamily-06/masterhrms`  
> **Target Branch**: `main`  
> **Verification Status**: **CONDITIONALLY VERIFIED (Live Deployment Operational; Access Restrictions & Open Risks Documented)**  

---

## 1. Executive Summary

This document presents empirical verification evidence for the Vercel Production deployment of **MASTERHRMS**. In accordance with the strict read-only audit authorization, no application source code, deployment configurations, environment variables, or remote database tables were modified.

The production deployment is **live, healthy, and operational** in the Vercel Mumbai (`bom1`) region, routing traffic between the Next.js CMS frontend and the Express backend API.

---

## 2. Deployment Metadata & Git Alignment

| Parameter | Authoritative Value | Evidence Source | Alignment Status |
| :--- | :--- | :--- | :---: |
| **Vercel Team** | `masterhrms` | GitHub Deployment Status Payload | **ALIGNED** |
| **Vercel Project** | `masterhrms` | GitHub Deployment Status Payload | **ALIGNED** |
| **GitHub Repository** | `Webfamily-06/masterhrms` | Git Remote & GitHub API | **ALIGNED** |
| **Target Branch** | `main` | Git HEAD & GitHub API | **ALIGNED** |
| **Current Git HEAD SHA** | `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0` | `git rev-parse HEAD` | **ALIGNED** |
| **Latest Origin Commit SHA** | `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0` | `git rev-parse origin/main` | **ALIGNED** |
| **Vercel Deployed Commit SHA** | `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0` | GitHub Commit Status API (`vercel[bot]`) | **ALIGNED** |
| **Commit Message** | `feat(payroll): complete workstream d 16-stage payroll automation lifecycle, dual approval gates, and cms command hub` | Git Log / GitHub Commit API | **ALIGNED** |
| **Commit Author** | `Master HRMS <admin@masterhrms.com>` | Git Log / GitHub Commit API | **ALIGNED** |
| **Commit Timestamp** | `2026-11-03T17:32:01Z` | Git Log / GitHub Commit API | **ALIGNED** |
| **Deployment Created At** | `2026-11-03T17:32:12Z` | GitHub Commit Status API (`pending`) | **ALIGNED** |
| **Deployment Completed At** | `2026-11-03T17:39:41Z` | GitHub Commit Status API (`success`) | **ALIGNED** |
| **Deployment State** | `success` / `Ready` ("Deployment has completed") | GitHub Commit Status API | **VERIFIED** |
| **Deployment Target URL** | `https://vercel.com/masterhrms/masterhrms/FNfd4LkuBUyv9fbLpC7hpHAXGgjo` | GitHub Commit Status Payload | **VERIFIED** |
| **Assigned Region** | `bom1` (Mumbai, India) | HTTP Response Header `X-Vercel-Id` | **VERIFIED** |

---

## 3. Production Domains & HTTP Routing Verification

All domains were verified via direct, non-mutating HTTP requests:

### 3.1 Primary Canonical Domain
- **URL**: `https://www.masterhrms.com/`
- **HTTP Status**: `200 OK`
- **Server**: `Vercel`
- **Region**: `bom1` (`X-Vercel-Id: bom1::4x2c4-1793766656827-aebe79ab94cb`)
- **Content-Type**: `text/html; charset=utf-8` (Content-Length: `88332` bytes)
- **ETag**: `"d61cbde95b2163d0fe22aceba2b70e10"`
- **Cache Status**: `HIT` (`X-Vercel-Cache: HIT`, `Age: 38159`)
- **Result**: **VERIFIED**

### 3.2 Apex Domain Redirect
- **URL**: `https://masterhrms.com`
- **HTTP Status**: `308 Permanent Redirect`
- **Redirect Location**: `https://www.masterhrms.com/`
- **Server**: `Vercel`
- **Region**: `bom1` (`X-Vercel-Id: bom1::6d6wg-1793766649166-c266955cf208`)
- **Result**: **VERIFIED**

### 3.3 Vercel Default Alias Domain
- **URL**: `https://masterhrms.vercel.app`
- **HTTP Status**: `200 OK`
- **Server**: `Vercel`
- **Region**: `bom1` (`X-Vercel-Id: bom1::blxq5-1793766691150-e9b381497075`)
- **ETag**: `"d61cbde95b2163d0fe22aceba2b70e10"` (Exact parity with canonical domain)
- **Content-Length**: `88332` bytes
- **Result**: **VERIFIED**

---

## 4. Vercel Architecture & Configuration Inspection

From repository configuration (`vercel.json`), verified active service structure:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["bom1"],
  "services": {
    "cms": {
      "root": "CMS",
      "framework": "nextjs",
      "bindings": [
        {
          "type": "service",
          "service": "server",
          "format": "url",
          "env": "SERVER_URL"
        }
      ]
    },
    "server": {
      "root": "server",
      "entrypoint": "index.js",
      "buildCommand": "npm run build",
      "functions": {
        "index.js": { "maxDuration": 60 },
        "dist/index.js": { "maxDuration": 60 }
      }
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "server" } },
    { "source": "/uploads/(.*)", "destination": { "service": "server" } },
    { "source": "/socket.io/(.*)", "destination": { "service": "server" } },
    { "source": "/(.*)", "destination": { "service": "cms" } }
  ]
}
```

### Architectural Findings:
1. **CMS Service**: Root directory `CMS`, Next.js framework preset, service binding to `server` as `SERVER_URL`.
2. **Server Service**: Root directory `server`, entrypoint `index.js`, buildCommand `npm run build` (`prisma generate && tsc`), 60-second maxDuration per serverless execution.
3. **API Routing**: `/api/*` rewrites correctly route to the Express Server service, while `/*` routes to the Next.js CMS service.

---

## 5. Security Headers Telemetry

Empirical inspection of HTTP response headers from `https://www.masterhrms.com/api/health`:

| Header | Observed Production Value | Security Significance |
| :--- | :--- | :--- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Strict HTTPS enforcement across all subdomains |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing protection |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking defense |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Hardware API permission restriction |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage minimization |
| `X-Xss-Protection` | `1; mode=block` | Legacy XSS filter activation |
| `Access-Control-Allow-Credentials`| `true` | Controlled CORS credentials exchange |

---

## 6. Access Limitations Encountered

1. **Vercel CLI Session**: Local Vercel CLI is logged out. No `VERCEL_TOKEN` environment variable exists in the local shell environment.
2. **Impact**: Direct Vercel Project Dashboard settings and real-time Vercel log-drain streaming could not be fetched via CLI commands.
3. **Mitigation**: All deployment identity, commit alignment, build completion, routing, and operational health data were empirically established using GitHub Deployment Status APIs (emitted by `vercel[bot]`) and live HTTP telemetry against `bom1` edge servers.

