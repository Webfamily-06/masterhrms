# MasterHRMS — Batch 5B: Read-Only PWA Offline Shell Audit
**Document:** `docs/batch_5b_pwa_offline_audit.md`  
**Date:** October 16, 2026  
**Auditor:** Lead Software Architect, Application Security Reviewer & Release Auditor  
**Mode:** Read-Only Discovery & Feasibility Analysis  
**Repository Branch:** `main` | **HEAD:** `910ed7677`  
**Production Release Status:** ⛔ **STRICTLY BLOCKED**

---

## 1. Executive Summary

In response to the **Batch 5B Read-Only PWA Offline Shell Audit** directive, a forensic inspection of the MasterHRMS frontend architecture, build pipeline, routing conventions, and security boundaries was conducted.

### Primary Audit Findings:
1. **Existing Service Worker:** **VERIFIED ABSENT**. There is currently zero service worker file, zero Workbox dependency, and zero `navigator.serviceWorker.register` call in the repository.
2. **Existing Offline State & Resilience UI:** **VERIFIED PRESENT**. The application already contains a complete, robust client-side network telemetry hook (`useNetworkStatus`), a localized action queue (`useOfflineQueue` storing in `hrms_offline_action_queue`), and an active [src/components/system-states/offline-banner.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/system-states/offline-banner.tsx) that renders an amber alert bar upon network disconnection.
3. **PWA Manifest & Metadata:** **VERIFIED COMPLETE (Batch 5A)**. `public/manifest.webmanifest` is served as `application/manifest+json` with HTTP 200, referencing only verified physical icons, and linked in `src/routes/__root.tsx`.
4. **Offline Shell Feasibility:** **FEASIBLE UNDER STRICT BOUNDS**. A lightweight, dependency-free service worker (`public/sw.js`) can cache the static immutable app shell (CSS, JS bundles, fonts, brand logos) while **strictly enforcing a Network-Only bypass for all `/api/*` endpoints and private tenant data**.
5. **Security Verdict:** An offline shell must **NEVER** simulate offline authentication or cache sensitive business data (payroll, taxes, employee salaries, tenant profiles). Offline mode must explicitly inform the user that live ERP transactions require an active network connection.

---

## 2. Current Implementation & Dependency Inventory

### 2.1 Package & Plugin Inventory
- **Root `package.json`:**
  - PWA / Workbox Dependencies: **None** (`vite-plugin-pwa`: absent, `workbox-*`: absent). [VERIFIED]
  - Core Framework: React 19, `@tanstack/react-router` v1, `@tanstack/react-query` v5, `@tanstack/react-start` v1. [VERIFIED]
  - Bundler: Vite v5.0.3 with `@tailwindcss/vite` v4. [VERIFIED]
- **Vite Configuration ([vite.config.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/vite.config.ts)):**
  - TanStack Start server configuration: `tanstackStart({ server: { entry: "server" } })`. [VERIFIED]
  - Code Splitting: Rollup manual chunks partition `vendor-apexcharts`, `vendor-recharts`, `vendor-pdf`, `vendor-icons`, `vendor-radix`, `vendor-dates`, `vendor-sockets`, and `vendor-tanstack`. [VERIFIED]
  - Proxy configuration: Maps `/api` and `/uploads` directly to `http://localhost:4000`. [VERIFIED]
  - Cache headers in dev server: `no-cache, no-store, must-revalidate`. [VERIFIED]

### 2.2 Existing Offline State & Resilience Mechanisms
- **Offline Banner Component ([src/components/system-states/offline-banner.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/system-states/offline-banner.tsx)):**
  - Subscribes to window `online`, `offline`, and custom `network:offline` events. [VERIFIED]
  - Features a manual retry button that probes `/api/health` with `cache: "no-store"`. [VERIFIED]
  - Automatically triggers `replay()` of queued actions upon server re-establishment. [VERIFIED]
- **Network Telemetry & Action Queue ([src/lib/web-apis/network-status.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/lib/web-apis/network-status.ts)):**
  - Reactive hook `useNetworkStatus()` tracking `navigator.onLine`, connection type (`4g`), downlink, and RTT. [VERIFIED]
  - `useOfflineQueue()` managing persistent FIFO queue in `localStorage` (`hrms_offline_action_queue`). [VERIFIED]
- **Root Layout Integration ([src/routes/__root.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/__root.tsx)):**
  - Renders `<OfflineBanner />`, `<MaintenanceBanner />`, and `<SessionExpiredModal />` at the root layout boundary. [VERIFIED]

### 2.3 Staging Nginx Infrastructure ([scripts/staging/nginx-masterhrms-staging.conf](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/scripts/staging/nginx-masterhrms-staging.conf))
- **Static Assets (`location ~* \.(?:ico|css|js|png|webp|svg)$`):** `expires 7d; add_header Cache-Control "public, no-transform";`. [VERIFIED]
- **API Endpoints (`location /api/`):** Strict reverse proxy with rate limiting, zero client-side caching headers, and WebSocket upgrade support. [VERIFIED]

---

## 3. Security and Architecture Analysis

### 3.1 What Can Safely Be Cached (Whitelisted)
| Resource Type | Pattern / URL | Strategy | Cache Name | Rationale |
|---|---|---|---|---|
| **App Shell Entrypoint** | `/` or `/index.html` (Fallback) | Network-First with Cache Fallback | `hrms-shell-v1` | Allows browser to render the initial layout shell when offline. |
| **Hashed Script Bundles** | `/assets/*.js` | Stale-While-Revalidate | `hrms-static-v1` | Vite content-hashed assets (`main-[hash].js`) are immutable. |
| **Hashed Style Bundles** | `/assets/*.css` | Stale-While-Revalidate | `hrms-static-v1` | Immutable CSS styling rules. |
| **Brand Icons & Fonts** | `/favicon.webp`, `/assets/img/*.png`, `/assets/img/*.svg`, `/ui-assets/libs/*` | Cache-First | `hrms-assets-v1` | Static assets required to render UI icons and typography. |
| **W3C Web Manifest** | `/manifest.webmanifest` | Stale-While-Revalidate | `hrms-shell-v1` | PWA manifest declaration. |

### 3.2 What Is Strictly Prohibited From Caching (Blacklisted)
| Resource Category | Patterns / Endpoints | Enforcement | Rationale |
|---|---|---|---|
| **Authenticated API Data** | `/api/*` | **NETWORK ONLY (Bypass SW)** | **CRITICAL:** Contains sensitive employee salaries, statutory tax withholdings, bank accounts, tenant records, and PII. Caching this in the Service Worker Cache Storage risks multi-tenant data leakage and stale financial calculations. |
| **Auth Tokens & Secrets** | `Authorization` headers, `/api/auth/*` | **NEVER CACHED** | Tokens must validate server-side on every transaction. |
| **User Uploads & Files** | `/uploads/*` | **NETWORK ONLY** | Private employee contracts, uploaded receipts, payslips. |
| **Dynamic SSR HTML** | Tenant subdomains (`*.masterhrms.com`) | **NETWORK FIRST / NO STORE** | Prevents cross-tenant layout or profile leakage across workstation users. |

### 3.3 Multi-Tenant Isolation & Session Lifecycle Risks
1. **Tenant Switching on Shared Workstations:** If Tenant A logs out and Tenant B logs in on the same browser, a cached API response would be a catastrophic security breach. **Mitigation:** The Service Worker must completely ignore `/api/*` requests, allowing the existing TanStack Query `["current-session-user", token]` cache and `clearToken()` in `src/lib/api.ts` to manage session lifecycle.
2. **Offline Protected Route Illusion:** Users must not believe they can submit payroll runs, approve leaves, or change settings while offline. **Mitigation:** When offline, API mutations fail cleanly with network error; the existing `OfflineBanner` informs the user, and `useOfflineQueue` safely buffers non-financial actions for review.
3. **Stale Asset / Cache Poisoning Risk:** When a new production release is deployed, older cached JS chunks might conflict with updated backend API schemas. **Mitigation:** The Service Worker `activate` event must iterate all cache keys and delete any cache whose version prefix does not match the current release token (e.g., `hrms-v1.0.1`).

---

## 4. Architectural Recommendation: Standalone `public/sw.js` vs. Plugin

### Evaluation of Options:
- **Option A: `vite-plugin-pwa` (Workbox automated injection):**
  - *Risk:* TanStack Start uses a dual SSR/client architecture (`@tanstack/react-start/plugin/vite`). Injecting full Workbox plugins into TanStack Start risks breaking the server entrypoint (`server: { entry: "server" }`), creating Rollup conflicts, and generating unpredictable precache manifests for dynamic SSR routes. [INFERRED RISK]
- **Option B: Handcrafted, Dependency-Free `public/sw.js` (RECOMMENDED):**
  - *Advantages:*
    1. Zero new npm packages added to `package.json` (0 supply-chain risk).
    2. 100% explicit control over caching logic: exactly whitelists static assets and explicitly ignores `/api/*` and `/uploads/*`.
    3. Transparent cache lifecycle (`install`, `activate`, `fetch`) that integrates cleanly with existing `src/components/system-states/offline-banner.tsx`.
    4. Simple, bulletproof registration inside `src/routes/__root.tsx` with `typeof window !== "undefined"` and `navigator.serviceWorker.register('/sw.js')`.

---

## 5. Proposed File-Level Implementation Plan (For Future Batch)

*Note: This is planning only. No files have been modified.*

If approved for implementation in a future batch, the change would consist of:

1. **`public/sw.js` (New File):**
   - Clean, lightweight Service Worker.
   - Pre-caches shell assets: `/`, `/favicon.webp`, `/assets/img/logo-small.svg`, `/assets/img/apple-icon.png`, `/manifest.webmanifest`.
   - `fetch` event listener:
     - If `url.pathname.startsWith('/api/')` or `url.pathname.startsWith('/uploads/')` $\to$ **pass-through to `fetch(event.request)` directly (Network-Only)**.
     - If request is a navigation (`mode === 'navigate'`) $\to$ **Network-First with fallback to cached shell**.
     - If request is for static assets (`.js`, `.css`, `.svg`, `.png`, `.webp`, `.woff2`) $\to$ **Stale-While-Revalidate**.
   - `activate` event listener $\to$ deletes all old cache keys.
2. **[src/routes/__root.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/__root.tsx) (Update):**
   - In `useEffect`, register `/sw.js` only in production or when service workers are supported:
     ```ts
     if (typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD) {
       navigator.serviceWorker.register("/sw.js").catch(console.error);
     }
     ```

---

## 6. Test Plan for Future Implementation

| Test Case | Procedure | Expected Outcome | Classification |
|---|---|---|:---:|
| **1. SW Registration** | Load application in browser with SW enabled | `navigator.serviceWorker.controller` is active | Installability |
| **2. API Network-Only Bypass** | Query `/api/smart-reports/payroll-sheet` | Network request dispatched; zero `/api` responses stored in `CacheStorage` | Security / RBAC |
| **3. Static Asset Caching** | Inspect `caches.open('hrms-static-v1')` | Hashed `.js`, `.css`, and `.webp` assets present | Performance |
| **4. Offline Shell Load** | Disconnect network in DevTools (Offline mode) and reload | Application shell renders; `<OfflineBanner />` displays amber alert | Offline Shell |
| **5. Offline Protected API Failure** | Attempt to trigger an action while offline | Fails gracefully with Network Error toast; no unhandled crash | Error Handling |
| **6. Cache Invalidation on Update** | Increment SW version token to `hrms-v2` | Older `hrms-v1` caches deleted during `activate` event | Lifecycle |
| **7. Tenant Isolation Verification** | Log in as Tenant A, go offline, inspect cache | Zero tenant data or tokens in CacheStorage | Tenant Security |
| **8. TypeScript & Vitest** | Run `npx tsc --noEmit` and frontend test suite | 0 compilation errors; 112/112 tests pass | Regression |

---

## 7. Dependencies, Deployment Considerations & Unresolved Questions

### Verified Dependencies
- Browser compatibility: Service Workers supported in Chrome 45+, Safari 11.1+, Firefox 44+, Edge 79+. [VERIFIED]
- HTTPS requirement: Service workers require secure context (`https://` in production, `localhost` in development). [VERIFIED]

### Deployment Considerations
- Nginx reverse proxy must serve `/sw.js` with `Cache-Control: "no-cache, no-store, must-revalidate"` so browsers immediately detect service worker updates.

### Unresolved / Design Decisions for User
1. **Development Mode Registration:** Should the service worker register during local `npm run dev` development (which can sometimes cache development HMR scripts) or strictly in `import.meta.env.PROD`? (Recommended: `import.meta.env.PROD` only, or behind an explicit toggle).

---

## 8. Clear Recommendation

- **Verdict:** **PROCEED WITH BOUNDED IMPLEMENTATION (Option B: Standalone `public/sw.js`)**.
- **Rationale:**
  - The application already has 90% of the offline resilience infrastructure (`OfflineBanner`, `useNetworkStatus`, `useOfflineQueue`).
  - A bounded standalone service worker of approximately 75 lines in `public/sw.js` satisfies the PWA installability criteria and offline shell requirement without adding bulky dependencies or risking TanStack Start SSR build conflicts.
  - Strict Network-Only enforcement for `/api/*` completely eliminates statutory payroll, tenant leakage, and sensitive data caching risks.

---

## 9. Stop Condition & Next Steps

In accordance with Rule 4 of the Batch 5B directive:
- **No application files or dependencies were modified during this audit.**
- **No service worker has been implemented.**
- **Production release remains strictly BLOCKED.**
- **Awaiting your review and explicit approval before any implementation proceeds.**
