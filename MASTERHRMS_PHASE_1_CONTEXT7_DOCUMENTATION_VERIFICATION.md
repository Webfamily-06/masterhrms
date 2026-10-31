# MASTERHRMS — PHASE 1: CONTEXT7 DOCUMENTATION VERIFICATION

**Project:** MasterHRMS Multi-Tenant SaaS  
**Phase:** 1 — Full Responsive Architecture Audit & Baseline (Read-Only)  
**Date:** October 31, 2026  
**Verification Tooling:** Context7 MCP Integration  
**Status:** VERIFIED COMPLETE

---

## 1. Verified Dependency & Version Catalog

All runtime libraries used across the audited modules were extracted from [`CMS/package.json`](file:///Users/apple/Documents/hrms/CMS/package.json), [`package.json`](file:///Users/apple/Documents/hrms/package.json), and [`server/package.json`](file:///Users/apple/Documents/hrms/server/package.json). Each was verified against authoritative upstream documentation using the Context7 Model Context Protocol (MCP).

| Library / Framework | Installed Version | Context7 Library ID | Verified Docs Reference / Source | Verification Status |
|---|---|---|---|:---:|
| **Next.js** | `16.1.6` | `/vercel/next.js/v16.1.6` | `docs/01-app/03-api-reference/04-functions/generate-viewport.mdx` | **VERIFIED** |
| **React** | `^19.2.0` | `/react/react/v19.2.6` | `compiler/packages/babel-plugin-react-compiler` | **VERIFIED** |
| **Tailwind CSS** | `^4.0.0` (`@tailwindcss/postcss`) | `/tailwindlabs/tailwindcss.com/__branch__v4-beta-docs` | `src/pages/docs/v4-beta.mdx`, `src/pages/docs/screens.mdx` | **VERIFIED** |
| **Radix UI Primitives** | `^1.2.0` - `^1.4.1` | `/radix-ui/primitives` | Radix Dialog, Sheet, Popover, Dropdown API Reference | **VERIFIED** |
| **shadcn/ui** | Pattern CLI (v4 compliant) | `/shadcn-ui/ui` | `apps/v4/registry/new-york-v4/examples/drawer-dialog.tsx` | **VERIFIED** |
| **Pusher Channels Client** | `^8.6.0` (`pusher-js`) | `/pusher/pusher-js` | `_autodocs/api-reference/channels.md`, `errors.md` | **VERIFIED** |
| **Pusher Server SDK** | `^5.3.4` (`pusher`) | `/websites/pusher` | Pusher REST API Trigger & Channel Authorization | **VERIFIED** |
| **Socket.IO Client** | `^4.8.4` (`socket.io-client`)| `/websites/socket_io_v4_client-api`| Socket.IO v4 Client Connection & Transports | **VERIFIED** |
| **Socket.IO Server** | `^4.8.3` (`socket.io`) | `/websites/socket_io` | Socket.IO Engine.IO & Handshake Protocols | **VERIFIED** |
| **TanStack Query** | `^5.104.5` (`@tanstack/react-query`) | `/tanstack/query/v5.90.3` | TanStack Query v5 `useQuery`, `useMutation`, Invalidation | **VERIFIED** |
| **Playwright Test** | Chromium Engine v1.51+ | `/microsoft/playwright` | Playwright BrowserContext, Viewport, Locator Assertions | **VERIFIED** |
| **FullCalendar** | *Not Installed* (Custom) | N/A | Evaluated; custom `UnifiedCalendarApp` is used instead | **CONFIRMED UNUSED** |
| **TanStack Table** | *Not Installed* (Custom) | N/A | Evaluated; custom `table.tsx` primitives are used instead | **CONFIRMED UNUSED** |

---

## 2. Framework & Library Findings Traced Against Context7

### 1. Next.js 16.1.6 — Viewport Metadata Export Requirement
- **Context7 Source:** `https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/04-functions/generate-viewport.mdx`
- **Authoritative Rule:** In Next.js 15 and 16, viewport meta properties (`width`, `initialScale`, `maximumScale`, `userScalable`, `themeColor`) are no longer part of `metadata`. They MUST be exported as a dedicated `viewport` object or `generateViewport()` function:
  ```typescript
  import type { Viewport } from 'next';
  export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
  };
  ```
- **Repository Defect:** [`CMS/src/app/layout.tsx`](file:///Users/apple/Documents/hrms/CMS/src/app/layout.tsx) completely omits the `viewport` export.
- **Impact:** On iOS Safari and Chrome Android, pages fail to scale to the physical hardware pixel width on small screens, causing the browser to render with an 980px desktop canvas.

### 2. Tailwind CSS v4 — Theme & Breakpoint Configuration
- **Context7 Source:** `https://github.com/tailwindlabs/tailwindcss.com/blob/v4-beta-docs/src/pages/docs/v4-beta.mdx`
- **Authoritative Rule:** Tailwind CSS v4 adopts a CSS-first configuration via `@theme` directly in CSS rather than `tailwind.config.js`. Default screen breakpoints:
  - `sm`: `640px`
  - `md`: `768px`
  - `lg`: `1024px`
  - `xl`: `1280px`
  - `2xl`: `1536px`
- **Repository Defect:** `CMS/src/styles/master-hrms.css` contains legacy hardcoded CSS media queries at `992px` (Bootstrap 4/5 breakpoint: `@media (max-width: 991.98px)` and `@media (min-width: 992px)`). This creates an unhandled gap between 992px and 1024px where Tailwind's `lg:hidden` and the CSS desktop sidebar collide.

### 3. shadcn/ui — Official Responsive Dialog/Drawer Pattern
- **Context7 Source:** `https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/examples/drawer-dialog.tsx`
- **Authoritative Rule:** For responsive modal dialogs, shadcn recommends a hybrid `DrawerDialog` combining `@radix-ui/react-dialog` on desktop (`>= 768px`) with `vaul` (`<Drawer>`) on mobile (`< 768px`) using `useMediaQuery("(min-width: 768px)")`.
- **Repository Alignment:**
  - `vaul` is already installed in `CMS/package.json` (`"vaul": "^1.1.2"`).
  - Both [`CMS/src/components/ui/dialog.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/ui/dialog.tsx) and [`CMS/src/components/ui/drawer.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/ui/drawer.tsx) exist.
  - However, modules currently mount `Dialog` unconditionally on all devices, causing severe vertical modal clipping and keyboard collision on mobile phones. Adopting the official `DrawerDialog` pattern resolves this cleanly without new dependencies.

### 4. Pusher Channels (`pusher-js` 8.6.0 & `pusher` 5.3.4)
- **Context7 Source:** `https://github.com/pusher/pusher-js/blob/master/_autodocs/api-reference/channels.md`
- **Authoritative Rule:** Subscriptions to private channels (`private-tenant-{id}`, `private-user-{id}`) trigger an authorization request (`channelAuthorizer`). Channels emit `pusher:subscription_error` on authorization failure.
- **Repository Alignment:** Verified. `PusherService.getConfig()` and `server/src/routes/pusher.routes.ts` (`/api/pusher/auth`) correctly implement the HMAC-SHA256 authorization protocol on cluster `ap2`.

### 5. TanStack Query v5 (`@tanstack/react-query` 5.104.5)
- **Context7 Source:** `https://github.com/tanstack/query/tree/main/packages/react-query`
- **Authoritative Rule:** In TanStack Query v5, callbacks `onSuccess`, `onError`, `onSettled` on `useQuery` are deprecated/removed; side-effects must be handled in `useEffect` or inside `queryFn`. For mutations, `useMutation({ mutationFn, onSuccess, onError })` remains standard.
- **Repository Alignment:** Verified. All queries inspected in `UnifiedCalendarApp`, `UnifiedChatApp`, and `UnifiedTodoApp` properly avoid deprecated v4 `useQuery` callbacks.

---
**Document Status:** Verified Complete — Proceed to Function Verification Matrix.

