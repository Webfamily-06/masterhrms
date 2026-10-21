# MASTERHRMS — Next.js CMS Integration Forensic Audit

**Document Date:** October 21, 2026  
**Auditor:** Antigravity Engineering Agent  
**Context:** Integration of the pre-developed Next.js CMS (`c:\Users\TSV Global Solutions\Documents\hrms\CMS`) into MASTERHRMS.

---

## 1. Executive Summary

This forensic audit evaluates the current architecture of the MASTERHRMS platform and the newly developed Next.js CMS codebase located in `CMS/`.

- **Existing Application Architecture**: The core MASTERHRMS application is a high-performance **Vite + TanStack Start** SSR/SPA application running on port `5173`, backed by an **Express + Prisma + MySQL** backend on port `4000`. The platform includes tenant portals, multi-tenant RBAC, employee self-service, and a dedicated Super Admin control center at `/super06`.
- **CMS Application Architecture**: The `CMS/` directory houses a complete, standalone **Next.js 16.1.6 (React 19.2.3, App Router)** marketing frontend designed for Webfamily Tech Solutions / Master HRMS. It uses Tailwind CSS 4, GSAP 3.14.2, Lenis smooth scrolling, and full markdown-driven dynamic blog and service routes.
- **Integration Approach Selected**: **Strategy A (Separate Next.js Frontend)**. Next.js runs on local port `3000`, Vite continues uninterrupted on port `5173`, and the Express API runs on port `4000`. Next.js proxies `/api/*` requests to port `4000` via Next.js rewrites, preserving all existing backend API contracts, cookies, and authentication flows without risking any disruption to the Vite production app or Super Admin portal.

---

## 2. Vite Frontend Entry Point and Configuration

- **Root Directory**: `c:\Users\TSV Global Solutions\Documents\hrms`
- **Framework**: TanStack Start (`@tanstack/react-start`) on top of Vite 8 (`@vitejs/plugin-react`).
- **Configuration**: [vite.config.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/vite.config.ts)
  - Port: `5173` (`strictPort: true`).
  - Proxies:
    - `/api` -> `http://localhost:4000`
    - `/uploads` -> `http://localhost:4000`
  - Plugins: `tailwindcss()`, `tanstackStart({ server: { entry: "server" } })`, `react()`, `updateEnvMiddlewarePlugin()`.
- **Router**: TanStack Router with file-based routing in `src/routes/` and generated route tree in `src/routeTree.gen.ts`.
- **Critical Endpoints Served by Vite**:
  - Super Admin Dashboard: `/super06`
  - Super Admin Auth: `/super-login`
  - Tenant Login & Auth: `/login`, `/auth`
  - Tenant / Authenticated Portals: `/_authenticated/` (Employee 360, Document Vault, Onboarding, Payroll, Attendance, Settings, etc.)
  - Customer Display & POS: `/customer-display`

---

## 3. CMS Project Structure and Router Discovery

- **Location**: `c:\Users\TSV Global Solutions\Documents\hrms\CMS`
- **Framework**: Next.js 16.1.6 (`next`), React 19.2.3 (`react`), React DOM 19.2.3 (`react-dom`).
- **Router Model**: **App Router** (`CMS/src/app`).
- **Root Layout**: [CMS/src/app/layout.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/layout.tsx)
  - Wraps tree with `fontVariables`, `MobileMenuProvider`, `SmoothScrollProvider`, `Navbar`, and `Footer`.
  - Body tag styled with `antialiased` and dark background token `bg-background-13`.

### Discovered CMS Route Inventory

| Route Path | App Router File | Type | Description |
|---|---|---|---|
| `/` | `CMS/src/app/page.tsx` | Static / Server Component | Marketing Homepage (Hero, About, Features, Process, Pricing, FAQ, CTA) |
| `/about` | `CMS/src/app/about/page.tsx` | Static / Server Component | About Us, Core Values, Company Story |
| `/blog` | `CMS/src/app/blog/page.tsx` | Static / Dynamic SSR | Blog archive reading markdown articles from `src/data/blog/` |
| `/blog/[slug]` | `CMS/src/app/blog/[slug]/page.tsx` | Dynamic SSR / Markdown | Article view with markdown renderer and related posts |
| `/contact` | `CMS/src/app/contact/page.tsx` | Interactive Client | Contact form with location details & lead capture |
| `/features` | `CMS/src/app/features/page.tsx` | Static / Interactive | Comprehensive SaaS product feature showcase |
| `/pricing` | `CMS/src/app/pricing/page.tsx` | Static / Interactive | Tiered pricing tables, billing interval toggles, FAQ |
| `/services` | `CMS/src/app/services/page.tsx` | Static / Dynamic SSR | Services catalogue reading markdown services from `src/data/services/` |
| `/services/[slug]` | `CMS/src/app/services/[slug]/page.tsx` | Dynamic SSR / Markdown | Detailed service specification view |
| `/team` | `CMS/src/app/team/page.tsx` | Static / Dynamic SSR | Leadership team profiles from `src/data/team/` |
| `/team/[slug]` | `CMS/src/app/team/[slug]/page.tsx` | Dynamic SSR / Markdown | Individual team member profile & biography |
| `/login` | `CMS/src/app/login/page.tsx` | Interactive Client | Marketing authentication page with `/api/auth/login` connectivity |
| `/signup` | `CMS/src/app/signup/page.tsx` | Interactive Client | Registration page with tenant signup flow |

---

## 4. Dependencies, Styling & Assets

### Package Manifest (`CMS/package.json`)
- **Key UI & Motion Packages**:
  - `@gsap/react` (^2.1.2), `gsap` (^3.14.2)
  - `lenis` (^1.3.17) (Smooth scrolling)
  - `swiper` (^12.1.2)
  - `react-fast-marquee` (^1.6.5)
  - `@number-flow/react` (^0.6.0)
  - `gray-matter` (^4.0.3), `react-markdown` (^10.1.0), `rehype-slug` (^6.0.0)
  - `tailwind-merge` (^3.4.1), `clsx` (^2.1.1)
  - `@tailwindcss/postcss` (^4), `tailwindcss` (^4)
- **Asset Directory Structure**:
  - `CMS/public/fonts/`: Custom icon and branding fonts (`next-sass.ttf`, `next-sass.woff`, `next-sass.svg`, `next-sass.eot`)
  - `CMS/public/images/`: SVGs and WebP assets (icons, gradients, logos, avatars)
- **Path Aliases** (`CMS/tsconfig.json`):
  - `@/*` -> `./*`
  - `@src/*` -> `./src/*`
  - `@/public/*` -> `./public/*`

---

## 5. API Client, Backend Integration & Authentication

- **Backend Location**: `http://localhost:4000` (Node.js Express + Prisma).
- **Backend API Base**: `http://localhost:4000/api`.
- **Next.js Proxy Rewrites**:
  Next.js `next.config.ts` can configure automatic proxy rewrites:
  ```ts
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  }
  ```
- **Authentication Handling**:
  - Standard JWT token passed in `Authorization: Bearer <token>` or saved in cookies.
  - CMS `login-form.tsx` connects to `/api/auth/login`. On successful login, stores token and transitions to `/dashboard` (or the Vite tenant portal at port 5173).
  - Cross-origin credentials support: `cors` in backend is already configured for localhost ports.

---

## 6. Protection of Super Admin, Tenant Portals & Subdomains

- **Super Admin Portal (`/super06`)**:
  - Strictly preserved on the Vite application (`http://localhost:5173/super06`).
  - No changes made to `src/routes/super06.tsx` or related Super Admin API endpoints.
- **Tenant Portals & Subdomain Resolution**:
  - Preserved in Node backend (`server/src/middleware/tenant-resolver.ts`) and Vite routing (`src/routes/_authenticated/tenant/`).
  - Next.js CMS focuses exclusively on public marketing, informative content, pricing, blogs, and public auth entry.
- **Backend Business Logic**:
  - Untouched. No schema alterations, no database mutations, no backend route modifications.

---

## 7. Selected Strategy and Rationale

**Selected Strategy: Strategy A — Dedicated Next.js Frontend on Port 3000**

1. **Safety and Non-Destructive Operation**: Keeps the Vite frontend running on `5173` and backend on `4000`. Does not touch the existing working build or dependencies of the Vite app.
2. **Framework Alignment**: The CMS codebase is a 100% genuine Next.js 16 App Router application relying on Next.js server components, `next/image`, `next/link`, `next/navigation`, and Turbopack. Attempting to force Next.js code into Vite would break SSR, metadata generation, and markdown loaders.
3. **Rollback Simplicity**: Because the Vite application remains untouched, rolling back is instantaneous.
4. **Development Ergonomics**: A dedicated root script (`npm run cms:dev` or `npm --prefix CMS run dev`) enables running both apps side-by-side.
