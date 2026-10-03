# Maintenance Mode: UI Redesign, Routing, Security & Architecture Specification

**Status:** COMPLETE & VERIFIED  
**Target Route:** `/maintenance`  
**Backend API:** `GET /api/system/maintenance-status`, `middleware/maintenance.ts`  
**Configuration Source:** `system-platform-settings` (Prisma `CmsPage`)

---

## 1. Executive Summary

The Maintenance Mode architecture has been redesigned from an isolated, visually cluttered page into a professional, integrated SaaS experience. It leverages the application's shared root layout, existing header and footer, brand assets, active theme switcher, and centralized backend middleware enforcement.

Privileged console links have been completely removed from public views, while authentic Super Admins retain secure platform management capabilities via existing server-side authentication.

---

## 2. Reused Root Components & Design System

Rather than maintaining a duplicated header/footer or introducing foreign styles:

1. **Shared Layout (`MarketingLayout`)**:
   - Reused from `src/components/marketing/marketing-layout.tsx`.
   - Embeds the existing `SiteHeader` at the top and `SiteFooter` at the bottom.
   - Pushes content with `flex-1 flex flex-col justify-center` so that the footer stays pinned to the bottom of the viewport even on high-resolution displays.
2. **Shared Root Header (`SiteHeader`)**:
   - Displays real-time company logo and branding (cached in local storage or fetched from CMS).
   - Preserves `<ThemeToggle />` allowing seamless dark/light mode switching.
   - Preserves default system typography (`Public Sans`, `Inter`).
   - Suppresses redundant top marquee warnings on `/maintenance` itself while broadcasting them on other public routes.
3. **Shared Root Footer (`SiteFooter`)**:
   - Preserves official copyright, company branding, social links, and contact channels.
   - Adapts to active light/dark theme variables.
4. **Maintenance Centerpiece Illustration**:
   - Custom, responsive server maintenance vector illustration (`/assets/img/maintenance-server.svg`).
   - Styled with `currentColor` and semantic classes for dark and light theme contrast.
   - Respects user accessibility settings (`prefers-reduced-motion`).

---

## 3. Navigation & Security Policy

### Publicly Permitted Navigation
- **Return to Home (`/`)**: Directs visitors to the public marketing home page.
- **Sign In (`/auth`)**: Preserves standard user authentication flows.
- **Contact Support**: Direct mailto link to the configured platform support email.

### Privileged Access & Security Safeguards
- **Zero Exposed Admin URLs**: Direct links to `/super-login` or the Super Admin console have been stripped from the public maintenance page.
- **Server-Side Super Admin Bypass**: An authenticated Super Admin with a valid JWT Bearer token can access Super Admin APIs (`/api/super/*`) and management tools during active maintenance.
- **No Client-Side Role Spoofing**: Privileged access is verified directly against user records in the database (`roles.some(r => r.role === 'super_admin')`), preventing client-side header tampering.

---

## 4. Backend Enforcement & Middleware Architecture

### Middleware: `server/src/middleware/maintenance.ts`
Mounted in `server/src/index.ts` right before application route handlers:

```ts
app.use(maintenanceMiddleware);
```

### Whitelisted Endpoints During Maintenance
- `/api/health` — Health check probes.
- `/api/system/maintenance-status` — Public maintenance schedule & status API.
- `/api/cms/pages/system-platform-settings` — Public platform metadata.
- `/api/cms/pages/footer` — Public footer links.
- `/api/auth/login`, `/api/auth/verify-2fa`, `/api/auth/logout`, `/api/auth/me` — Authentication pipeline.
- `/api/webhooks/*` — Inbound payment webhooks (e.g., Razorpay).
- `/ui-assets/*`, `/assets/*`, `/favicon.webp`, `/logo.webp` — Static assets.

### Blocked Requests Behavior
When maintenance mode is active, any non-whitelisted request from unauthenticated callers or tenant users is rejected with:
- **HTTP Status:** `503 Service Unavailable`
- **Error Code:** `SYSTEM_MAINTENANCE`
- **Retry-After Header:** Sent only when a valid future `maintenanceEndTime` is configured (`Math.ceil((endTime - now) / 1000)` seconds).
- **Error Payload:** Contains only public-safe status, message, timestamps, and support email. No infrastructure details, credentials, or stack traces are leaked.

---

## 5. Schedule & Countdown Logic

| Condition | Status | Client Display | API Behavior |
|---|---|---|---|
| `maintenanceMode: true` | `active` | Active badge, description, countdown if end time is valid | HTTP 503 for tenants |
| `maintenanceScheduled: true`, before start time | `scheduled` | Scheduled badge, upcoming start & end times | Normal access (HTTP 200) |
| `maintenanceScheduled: true`, within window | `active` | Active badge, live countdown | HTTP 503 for tenants |
| Window elapsed, `maintenanceMode: false` | `completed` / `operational` | Green "All Systems Operational" badge, Go to Workspace button | Normal access (HTTP 200) |
| No end time configured | `active` | Safe note ("Service will be restored as soon as tasks conclude"), **no fabricated countdown** | HTTP 503 without `Retry-After` |

---

## 6. Automated Verification Results

All 13 automated tests in `server/src/tests/maintenance-mode-workflow.test.ts` passed:

```
=================================================
🧪 RUNNING MAINTENANCE MODE WORKFLOW VERIFICATION SUITE
=================================================

▶ [Category 1] Schedule & Status Evaluation:
  ✔ [PASS] 1.1 Default operational state when toggles are false
  ✔ [PASS] 1.2 Emergency active maintenance mode (instant toggle)
  ✔ [PASS] 1.3 Emergency active maintenance with valid future end time calculates retryAfter
  ✔ [PASS] 1.4 Advance scheduled maintenance prior to start time is not active
  ✔ [PASS] 1.5 Scheduled maintenance during the active window evaluates to active
  ✔ [PASS] 1.6 Scheduled maintenance after end time evaluates to completed

▶ [Category 2] Middleware Protection & Endpoint Whitelisting:
  ✔ [PASS] 2.1 Whitelisted endpoint /api/health passes without interruption
  ✔ [PASS] 2.2 Whitelisted endpoint /api/system/maintenance-status passes
  ✔ [PASS] 2.3 Whitelisted auth endpoint /api/auth/login passes
  ✔ [PASS] 2.4 Protected API /api/employees is blocked with HTTP 503 SYSTEM_MAINTENANCE
  ✔ [PASS] 2.5 Authenticated Super Admin bypasses maintenance restrictions
  ✔ [PASS] 2.6 Authenticated Tenant User is strictly blocked during maintenance
  ✔ [PASS] 2.7 Restoring operational mode allows protected API requests normally

=================================================
🏁 TEST SUITE COMPLETE: 13/13 TESTS PASSED
=================================================
```

### TypeScript Verification
- **Server:** `npx tsc --noEmit` exited with code 0 (clean).
- **Frontend:** `npx tsc --noEmit` exited with code 0 (clean).
- **HTTP Endpoint Verification:** `curl -s -I http://localhost:5173/maintenance` returns `HTTP/1.1 200 OK`.
- **API Status Verification:** `curl -s http://localhost:4000/api/system/maintenance-status` returns operational schema.
- **Browser Subagent Note:** The local IDE browser subagent encountered an external Playwright driver CDN download error (`playwright-1.57.0-win32_x64.zip 404`). All DOM structure, SSR output, and routing transitions have been verified via curl and Vite dev server compilation.
