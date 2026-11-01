

# MASTERHRMS — WEBSITE HARDCODE, MOCK DATA & ARTIFACT CLEANUP REPORT

**Repository:** `Webfamily-06/masterhrms`  
**Current Branch:** `fix/phase-3-1-3-critical-remediation`  
**Evaluation Date:** November 1, 2026  
**Final Acceptance Verdict:** **PASS**

---

## 1. Executive Summary

A comprehensive, website-wide audit and remediation was executed across the Master HRMS monorepo to eliminate hardcoded app URLs, resolve role and identity checks dependent on user email literals, sanitize production UI from fabricated mock data, review application route redundancy, purge build-polluting test artifacts, and silence console log noise across runtime routes.

All preexisting user work—including Phase 3.1.3 cryptographic hardening and the complete Chat + Calling & SFU Multi-Participant Meeting implementation—has been strictly preserved intact. Zero destructive database migrations were performed, and no secrets or private keys were exposed in code or reports.

---

## 2. Inventory & Classification

| Pillar | Category | Findings Count | Remediation Action | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Pillar 1** | Hardcoded URLs & Ports | 6 core locations | Replaced with dynamic environment variables (`APP_URL`, `SERVER_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_WEBDAV_URL`) and domain helpers | **RESOLVED** |
| **Pillar 2** | Role & Identity Email Checks | 5 files | Replaced email strings (`gowthamtooquik@gmail.com`, `superadmin@masterhrms.com`, etc.) with database-backed RBAC assignments, session context, and guarded demo auth | **RESOLVED** |
| **Pillar 3** | Mock & Fabricated UI Data | 2 production views | Replaced fabricated signer IP (`127.0.0.1 (Verified)`) with real state; added authentic access token field in external cloud connectors modal | **RESOLVED** |
| **Pillar 4** | Component & Route Redundancy | Multi-app boundary | Audited Vite (`src/`) vs Next.js CMS (`CMS/src/`); validated intentional redirect aliases (`tenet` -> `tenant`, `super/doc` -> `super/docs`) | **VERIFIED** |
| **Pillar 5** | Artifact Lifecycle | Test files in `src/` | Relocated `server/src/test_project_details.ts` to `server/src/tests/` to prevent compiling test code into production `server/dist/` | **RESOLVED** |
| **Pillar 6** | Console Noise & Warnings | 4 modules | Removed debug traces (`[PERF_ROUTE]`, `[SOCKET_INCOMING]`); guarded client socket connection logs behind non-production environment checks | **RESOLVED** |

---

## 3. Hardcoded URL Remediation

### 3.1 WebDAV Network Drive Gateway
- **File:** `CMS/src/app/(workspace)/tenant/files/webdav/page.tsx`
- **Previous Code:**
  ```ts
  const webdavUrl = typeof window !== "undefined"
    ? `${window.location.origin.replace(":3000", ":4000")}/webdav`
    : "http://localhost:4000/webdav";
  ```
- **Remediated Code:**
  ```ts
  const webdavUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WEBDAV_URL) ||
    (typeof window !== "undefined"
      ? (window.location.port === "3000"
          ? `${window.location.protocol}//${window.location.hostname}:4000/webdav`
          : `${window.location.origin}/webdav`)
      : (typeof process !== "undefined" && process.env.INTERNAL_API_URL ? `${process.env.INTERNAL_API_URL}/webdav` : "http://localhost:4000/webdav"));
  ```

### 3.2 Authoritative Email Templates Registry
- **File:** `server/src/lib/email-templates-registry.ts`
- **Previous Code:** Hardcoded `http://master.localhost:3000/hr/calendar` and `http://master.localhost:3000/hr/todo?taskId=task-bench-402`.
- **Remediated Code:** Dynamically bound to `process.env.APP_URL || process.env.FRONTEND_BASE_URL || (process.env.NODE_ENV === "production" ? "https://app.masterhrms.com" : "http://localhost:3000")`.

### 3.3 Super Admin Platform Settings & OAuth Defaults
- **Files:** `CMS/src/app/super/settings/page.tsx` & `src/routes/_authenticated/super/settings.tsx`
- **Previous Code:** Form state initialized with static `"http://localhost:4000"` and `"http://localhost:8080"` and placeholder Pusher credentials (`"psh_key_998877"`, `"psh_sec_443322"`).
- **Remediated Code:** Dynamically initialized via `getDefaultOauthBaseUrl()` and `getDefaultFrontendBaseUrl()` using `getPlatformBaseDomain()`, environment variables, and blank string defaults for unconfigured credentials.

### 3.4 API Base Clients
- **Files:** `CMS/src/lib/api.ts` & `src/lib/api.ts`
- **Remediated Code:** Checked `process.env.INTERNAL_API_URL` and `process.env.SERVER_URL` in SSR before falling back to localhost.

### 3.5 Environment Templates
- **Files:** `server/.env.example` and `CMS/.env.example`
- **Action:** Documented `APP_URL`, `SERVER_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_WEBDAV_URL`, and LiveKit SFU configuration variables with clean production guidance.

---

## 4. Hardcoded Role & Identity Remediation

### 4.1 Backend Effective Role Resolution
- **File:** `server/src/routes/auth.routes.ts`
- **Previous Code:**
  ```ts
  const isGowthamTenantAdmin =
    user.email === "gowthamtooquik@gmail.com" ||
    Boolean(user.profile?.fullName && user.profile.fullName.toLowerCase().includes("tenant admin"));
  ```
- **Vulnerability:** Granted elevated administrative privileges based on an email literal or name string matching.
- **Remediated Code:**
  ```ts
  let isWorkspaceAdmin = false;
  const effectiveTenantId = tenantId || user.profile?.tenantId;
  if (effectiveTenantId) {
    const assignment = await prisma.userRoleAssignment.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: effectiveTenantId,
        },
      },
      include: { role: true },
    });
    const roleName = assignment?.role?.name?.toLowerCase();
    if (roleName === "workspace admin" || roleName === "tenant admin" || roleName === "admin") {
      isWorkspaceAdmin = true;
    }
  }

  if (isWorkspaceAdmin || baseRoles.includes("tenant_admin") || baseRoles.includes("workspace_admin")) {
    const effective = baseRoles.filter((r) => r !== "hr_admin");
    if (!effective.includes("tenant_admin")) effective.push("tenant_admin");
    if (!effective.includes("admin")) effective.push("admin");
    if (!effective.includes("workspace_admin")) effective.push("workspace_admin");
    return effective;
  }
  ```

### 4.2 Public Tenant Credentials Endpoint
- **File:** `server/src/routes/auth.routes.ts` (`/public/tenant/credentials`)
- **Previous Code:** Hardcoded static fallback objects populated with `gowthamtooquik@gmail.com`, `hr@masterhrms.com`, and `employee@masterhrms.com`.
- **Remediated Code:** Queries database `userRoleAssignment`, `userRole`, and tenant `profile` records for authentic tenant users. If no users exist, returns `null` rather than fabricating credentials.

### 4.3 Super Admin Route Actor Auditing
- **Files:** `server/src/routes/compliance-control.routes.ts` & `server/src/routes/super.routes.ts`
- **Previous Code:** `const actorEmail = req.user?.email || "superadmin@masterhrms.com";`
- **Remediated Code:** `const actorEmail = req.user?.email || (req.user as any)?.id || "system";`

### 4.4 Authentication UI Quick Fill Guard
- **Files:** `CMS/src/components/auth/UnifiedAuthPage.tsx`, `CMS/src/components/auth/Super06AuthPage.tsx`, `src/routes/auth.tsx`, `src/routes/super06.tsx`
- **Remediated Code:**
  - Removed fallback to hardcoded emails when credentials are null.
  - Quick credential selector is strictly hidden in production builds and rendered only in development mode or when `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS === "true"`.

---

## 5. Mock Data & Production Realism

### 5.1 E-Sign Document Audit Drawer
- **Files:** `CMS/src/app/(workspace)/documents/page.tsx` & `src/routes/_authenticated/_app/documents.tsx`
- **Previous Code:** `<div>Signer IP: {selectedAuditDrawer.signerIp || "127.0.0.1 (Verified)"}</div>`
- **Remediated Code:** `<div>Signer IP: {selectedAuditDrawer.signerIp || "Not Recorded"}</div>`

### 5.2 External Cloud Storage Connectors
- **File:** `CMS/src/app/(workspace)/tenant/files/connectors/page.tsx`
- **Previous Code:** Sent mock token string `token-${Date.now()}-mock-oauth-key` and dummy email `${selectedProvider.toLowerCase()}-user@example.com`.
- **Remediated Code:** Added user-facing access token / service credential input field, optional email submission, and authentic credential handling for cloud storage integration.

---

## 6. Duplication Resolution

### 6.1 Multi-App Architecture Analysis
- **`CMS/src/` (Next.js App Router):** Production multi-tenant SaaS frontend. Built with Next.js 14, React 18, and Tailwind.
- **`src/` (Vite / TanStack Start):** Legacy standalone frontend maintained for backward compatibility.
- **Decision:** Both apps share identical backend API endpoints (`/api/*`) and WebSocket signaling protocols (`/socket.io`). Modifications applied to Next.js were mirrored to TanStack routes where applicable.

### 6.2 Route Aliases
- `CMS/src/app/(workspace)/tenet/page.tsx`: Retained as intentional redirect alias for `tenant` (resolves typing misspellings).
- `CMS/src/app/super/doc/page.tsx`: Retained as intentional redirect alias for `super/docs`.
- `CMS/src/app/super-login/page.tsx`: Retained as intentional redirect alias for `super06`.

---

## 7. Artifact Lifecycle & Cleanup

### 7.1 Separation of Tests from Production Distribution
- **Investigation:** `server/src/test_project_details.ts` was located directly in the server source directory. Because `tsconfig.json` compiles `src/**/*` into `dist/**/*` and only excludes `src/tests/**/*`, this test file was being compiled into `server/dist/test_project_details.js` (17KB).
- **Remediation:**
  - Moved `server/src/test_project_details.ts` to `server/src/tests/test_project_details.ts`.
  - Updated relative module imports to `../lib/jwt` and `../prisma`.
  - Removed `server/dist/test_project_details.js`.
  - Verified `server/dist` only contains production runtime services and routes.

---

## 8. Noise, Error & Console Hardening

### 8.1 Removed Temporary Performance Traces
- **File:** `server/src/routes/chat.routes.ts`
- **Remediation:** Removed `console.log([PERF_ROUTE] pre-create...)` (line 2147) and `console.log([PERF_ROUTE] prisma create...)` (line 2291).

### 8.2 Silenced Realtime Inbound Message Spam
- **Files:** `CMS/src/components/chat/unified-chat-app.tsx` & `src/components/chat/unified-chat-app.tsx`
- **Remediation:** Removed `console.log("[SOCKET_INCOMING]"...)` from incoming message event handler.

### 8.3 Environment-Guarded Client Logs
- **Files:** `CMS/src/lib/socket.ts`, `src/lib/socket.ts`, `CMS/src/app/(workspace)/forms/page.tsx`, `src/routes/_authenticated/_app/forms.tsx`
- **Remediation:** Wrapped client socket connection and settings sync messages in `if (process.env.NODE_ENV !== "production")` and `if (import.meta.env.DEV)`.

---

## 9. Verification & Test Evidence

### 9.1 TypeScript & Build Verification

#### Command: `npm --prefix server run build`
```
> hrms-server@1.0.0 build
> prisma generate && tsc

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 3.22s
```
**Outcome:** Exited with code `0`. All server routes and services compiled without errors.

#### Command: `npm --prefix CMS run typecheck`
```
> automation-saas-ns-next@1.0.0 typecheck
> tsc --noEmit
```
**Outcome:** Exited with code `0`. Next.js CMS frontend typechecks cleanly with zero errors.

### 9.2 Realtime WebRTC & Calling Verification

#### Command: `npm run test:calling`
```
================================================================================
🧪 RUNNING COMPREHENSIVE 16-SUITE VERIFICATION: CHAT & WEBRTC CALLING MODULE
================================================================================

▶ [Setup] Initializing Socket.IO server with in-memory auth directory...
▶ [Case 1] Valid caller can invite same-tenant user... ✔
▶ [Case 2] Cross-tenant invitation is rejected... ✔
▶ [Case 3] Only intended receiver can accept... ✔
▶ [Case 4] Third user cannot accept an active call... ✔
▶ [Case 5] Only caller can cancel a ringing call... ✔
▶ [Case 6] Only receiver can reject a ringing call... ✔
▶ [Case 7] Third user cannot reject or hang up another call... ✔
▶ [Case 8] Cross-tenant user cannot send signal... ✔
▶ [Case 9] Signal target must be actual peer... ✔
▶ [Case 10] Invalid media-state is rejected... ✔
▶ [Case 11] Busy receiver’s existing call remains connected... ✔
▶ [Case 12] Pusher + Socket duplicate incoming call is deduplicated... ✔
▶ [Case 13] One tab disconnect does not end call when second socket connected... ✔
▶ [Case 14] Final socket disconnect ends call and informs peer... ✔
▶ [Case 15] Non-member cannot join group call... ✔
▶ [Case 16] Non-member cannot send group call signal... ✔

================================================================================
✅ ALL 16 CHAT & CALLING VERIFICATION TEST CASES PASSED EMPIRICALLY!
================================================================================
```
**Outcome:** Exited with code `0`. 16 of 16 suites passed.

### 9.3 SFU & Multi-Participant Meeting Verification

#### Command: `npm run test:meeting`
```
================================================================================
🧪 RUNNING MULTI-PARTICIPANT MEETING & SFU TEST SUITE
================================================================================

▶ [Test 1] SfuConfigurationError and diagnostics when LiveKit is unset... ✔
▶ [Test 2] Generates cryptographically signed LiveKit JWT token when configured... ✔
▶ [Test 3] Socket meeting lifecycle: start, join, state_sync, media_state, leave, end... ✔
▶ [Test 4] One active-call policy & LiveKit Client SDK Room lifecycle... ✔

================================================================================
✅ ALL MULTI-PARTICIPANT MEETING TESTS PASSED EMPIRICALLY!
================================================================================
```
**Outcome:** Exited with code `0`. 4 of 4 suites passed.

### 9.4 Git Diff Cleanliness

#### Command: `git diff --check`
**Outcome:** Exited with code `0`. No whitespace violations or conflict markers.

---

## 10. Platform Rights, Branding & Copyright Standardization

### 10.1 Issue & Root Cause
Third-party and template brand names ("Apex HRMS Ultra. Persisted Forever.", "Pixels71. Nexsas", "Dreams ERP", "TSV Global Solutions", "Master Workspace ERP") were discovered in footers, page titles, and database settings records.
- **Root Cause of "Apex HRMS Ultra. Persisted Forever.":** The integration test `server/src/tests/settings-restart-persistence.test.ts` had previously mutated the live database `branding.footer_text` record and never reset it upon completion.
- **Root Cause of "Nexsas" / "Pixels71":** Legacy CMS marketing template artifacts retained "Nexsas" in component headers, metadata, and team descriptions.

### 10.2 Remediation
1. **Database Setting Reset:**
   - `branding.footer_text` reset to: `"© 2026 Webfamily Tech Solutions. All rights reserved."`
   - `branding.app_name` reset to: `"Master HRMS & ERP"`
   - `cms_pages` slug `footer` copyright reset to: `"© 2026 Webfamily Tech Solutions. All rights reserved."`
   - Added an `afterAll` cleanup hook in `server/src/tests/settings-restart-persistence.test.ts` to guarantee future test runs always restore the standard footer text and app name.
2. **Frontend Standardization & Sanitization:**
   - Standardized all application footers across both CMS and Vite shells (`WorkspaceShell`, `SuperShell`, `UnifiedAuthPage`, `Super06AuthPage`, `forbidden-view`, `site-footer`, `footer-bottom`, `store`, `help-center`, `portal`, `verify-2fa`) to strictly display:
     `© {new Date().getFullYear()} Webfamily Tech Solutions. All rights reserved.`
   - Added defensive sanitization filters to automatically purge any legacy strings (`Apex HRMS`, `Persisted Forever`, `Pixels71`, `Nexsas`) and fall back to Webfamily Tech Solutions.
3. **Marketing Copy & Metadata Polish:**
   - Cleaned all CMS landing page metadata titles from `|| Nexsas` to `— Webfamily Tech Solutions`.
   - Cleaned all marketing components (`why-choose.tsx`, `why-use.tsx`, `work-flow.tsx`, `our-team-header.tsx`, `hero.tsx`, `company-menu.tsx`, `login.tsx`, `sign-up.tsx`) and team data files to use `Master HRMS` and `contact@webfamily.in`.
4. **Backend Services & Email Fallbacks:**
   - `server/src/services/settings/settings-registry.ts`: `branding.footer_text` default set to `© 2026 Webfamily Tech Solutions. All rights reserved.`
   - `server/src/services/branding/branding-resolver.service.ts`: Fallback sanitized to Webfamily Tech Solutions.
   - `server/src/routes/workspace.routes.ts`: Fallback sanitized to Webfamily Tech Solutions.
   - `server/src/lib/email.ts`: Line 442 email template footer standardized to Webfamily Tech Solutions.

---

## 11. Residual Risks & Staging Recommendations

1. **Third-Party OAuth Callbacks:**
   When deploying to production domains (e.g. `app.masterhrms.com`), administrators must configure OAuth credentials in the Super Admin settings (`/super/settings`) or environment variables to match production callback URLs.
2. **LiveKit Cloud SFU Deployment:**
   In staging and production, set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in `server/.env` to enable WebRTC media routing for 3+ participant meetings.
3. **Demo Credentials in Staging:**
   In staging QA environments where automated testers need quick fill buttons, set `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS="true"` in `CMS/.env.local`.

---

## 12. Final Acceptance Verdict

### **VERDICT: PASS**

The website repository has been audited, cleaned, and hardened across all core pillars:
- Hardcoded URLs and ports replaced with dynamic configurations.
- Hardcoded email-based identity checks replaced with authentic role assignments.
- Mock and fabricated UI data eliminated from production screens.
- Build artifacts verified clean with zero test code in `dist`.
- Console noise silenced across production runtime paths.
- All footers, CMS pages, dashboards, auth screens, email templates, and database records standardized strictly to `© {currentYear} Webfamily Tech Solutions. All rights reserved.`
- Both `server` build and `CMS` typecheck pass cleanly with zero errors.
- 100% of WebRTC calling (16/16) and SFU multi-participant meeting tests passed empirically.

