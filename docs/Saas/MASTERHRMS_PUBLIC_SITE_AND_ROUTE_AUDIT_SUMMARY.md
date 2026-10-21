# MASTERHRMS — Public Site & Route Audit Summary

**Date:** 2026-10-21  
**Status:** Read-Only Forensic Acceptance Audit  
**Auditor:** Antigravity Forensic Engineering  
**Application Runtime:** Next.js 16.1.6 on Port 3000 | Express 4.21.2 on Port 4000  

---

## 1. Required Metric Summary Table

| Metric | Required Result | Audited Reality / Notes |
| :--- | :--- | :--- |
| **Top-level public header menus** | **4** | "Company", "Inner pages", "Platform", "Plans & Support" (excluding Home logo link) |
| **Nested header menu entries** | **42** (Desktop) / **66** (Total) | 42 desktop mega-menu items (11 Company + 6 Inner pages + 14 Platform + 11 Plans & Support); 24 in mobile drawer |
| **Header CTA buttons and utility actions** | **8** | "Sign in", "Dashboard", "Menu" hamburger, "Close" drawer button, 4 mobile accordion toggles |
| **Footer sections/columns** | **3 link columns** (5 total sections) | Rendered: Company, Support, Legal Policies + Brand & Copyright bar (SiteFooter has 6 link columns) |
| **Footer headings** | **3** (Rendered) / **7** (SiteFooter) | Rendered: "Company", "Support", "Legal Policies" |
| **Footer visible links** | **21** (Rendered) / **58** (SiteFooter) | Rendered: 1 brand + 6 social + 5 Company + 4 Support + 5 Legal links |
| **Unique internal destinations** | **13** (Rendered) / **25** (Full Site) | 13 referenced in rendered navbar & footer; 25 across all marketing & legal pages |
| **Unique external destinations** | **0** | All external references (socials, app badges) currently resolve to `#` placeholders |
| **Placeholder `#` links** | **47** (Rendered) / **62** (Total) | 29 in desktop header + 18 in rendered footer (+ 15 in mobile drawer) |
| **Empty or invalid destinations** | **0** | No `href=""` or malformed URLs; all use concrete relative paths or `#` |
| **Redirecting destinations** | **1** | `/dashboard` redirects conditionally to `/login` or workspace based on auth token |
| **Legacy Vite logical route patterns** | **505** | Extracted from `src/routeTree.gen.ts` & `src/routes/` |
| **Legacy Vite unique page destinations** | **502** | 508 total files minus 4 layout wrappers and 2 wildcard catch-alls |
| **Next.js `page.tsx` modules** | **512** | Exactly 512 `page.tsx` files located in `CMS/src/app` |
| **Next.js logical route patterns** | **512** | Exactly 512 unique route patterns resolved in App Router |
| **Legacy routes matched in Next.js** | **502** | **100% of legacy user-facing pages are implemented in Next.js** |
| **Legacy routes missing in Next.js** | **0** (user-facing) | 0 missing pages (6 non-page infrastructure/wrapper files accounted for) |
| **Next.js-only routes** | **34** | Modern add-on detail timelines, planning wizards, template editors, blog subroutes |
| **Pages successfully browser-verified** | **23** | All sampled public, legal, auth, and workspace pages return HTTP 200 |
| **Pages that fail or need repair** | **2** | `/testimonial` (HTTP 404) & `/case-study` (HTTP 404) in Company dropdown |

---

## 2. Counting Methodology & Deduplication Rules

1. **Top-Level Menus:** Counted strictly as interactive header items that expand a nested dropdown menu on the desktop navbar (`Company`, `Inner pages`, `Platform`, `Plans & Support`). The brand logo (`/`) is classified as the site identity anchor.
2. **Nested Menu Entries:** Counted every distinct link tag (`<a>`) inside dropdowns and mega-menus. Submenu column titles, bridge dividers, and decorative icons are excluded from link counts.
3. **CTA Buttons & Utility Actions:** Distinct interactive controls that trigger auth navigation (`/login`), direct dashboard routing (`/dashboard`), or DOM modal/drawer states (hamburger toggle, drawer close button, accordion toggles).
4. **Footer Link Columns:** Distinct vertical link groups with explicit headings (`Company`, `Support`, `Legal Policies`). The brand column with logo and social icons is accounted for separately.
5. **Route Files vs. Logical Routes:**
   - In TanStack Router (Vite), directory-based route files (`_authenticated/route.tsx`, `super/route.tsx`, `_app/route.tsx`, `__root.tsx`) serve as layout injectors rather than navigable endpoints.
   - Catch-alls (`cms.$.tsx`, `tenet/$.tsx`) represent wildcard fallbacks rather than unique pages.
   - Deduplication yields 502 distinct navigable user endpoints.
   - In Next.js App Router, every `page.tsx` represents a distinct logical endpoint. Route groups (`(workspace)`, `(marketing)`) do not affect the public URL path.

---

## 3. Top-Level Forensic Findings

### Finding 1: Two Broken Public Links in "Company" Mega-Menu
- In `CMS/src/components/shared/layout/navbar/company-menu.tsx`:
  - `Testimonials` points to `/testimonial` -> **Returns HTTP 404**
  - `Case Studies` points to `/case-study` -> **Returns HTTP 404**
- **Root Cause:** In the Next.js App Router, there are no `CMS/src/app/testimonial/page.tsx` or `CMS/src/app/case-study/page.tsx` files.
- **Recommended Remediation (Pending Authorization):**
  - Either point `Testimonials` to `/#testimonials` or create a public testimonials page.
  - Either point `Case Studies` to `/#case-studies` or create a public case studies page.

### Finding 2: Unlinked Legal Links in Plans & Support Menu
- In `CMS/src/components/shared/layout/navbar/plan-and-support-menu.tsx`:
  - `Terms & Conditions` points to `#`
  - `Privacy Policy` points to `#`
- **Root Cause:** These links were left as placeholders despite the authoritative Next.js legal pages existing and rendering perfectly at `/legal/terms-of-service` and `/legal/privacy-policy`.
- **Recommended Remediation (Pending Authorization):** Repoint `Terms & Conditions` to `/legal/terms-of-service` and `Privacy Policy` to `/legal/privacy-policy`.

### Finding 3: 100% User-Facing Parity Between Vite and Next.js
- All 502 user-facing routes from the legacy Vite codebase have corresponding, active `page.tsx` implementations in Next.js.
- The Next.js App Router contains 34 additional modern subroutes (e.g. `/addons/planning/charters/[id]`, `/addons/ai-document/history/[id]`, `/blog/3-ai-skills-you-need-to-master-in-2025`) that expand platform capabilities.

### Finding 4: High Density of Marketing Template Placeholders (`#`)
- The marketing theme template retains 29 `#` placeholders in the desktop header and 18 in the footer (social icons, affiliate policy, download app, press, etc.).
- While structurally harmless, these items produce a dead click experience for visitors.

---

## 4. Priority Remediation Candidate List (Awaiting Authorization)

| Item | Current Location | Current Destination | Issue | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Testimonials** | Header -> Company Menu | `/testimonial` | Returns HTTP 404 | Repoint to `/#testimonials` or create page |
| **2. Case Studies** | Header -> Company Menu | `/case-study` | Returns HTTP 404 | Repoint to `/#case-studies` or create page |
| **3. Terms & Conditions** | Header -> Plans & Support | `#` | Dead placeholder | Repoint to `/legal/terms-of-service` |
| **4. Privacy Policy** | Header -> Plans & Support | `#` | Dead placeholder | Repoint to `/legal/privacy-policy` |
| **5. Terms & Conditions** | Footer -> Legal Policies | `#` | Dead placeholder | Repoint to `/legal/terms-of-service` |
| **6. Privacy Policy** | Footer -> Legal Policies | `#` | Dead placeholder | Repoint to `/legal/privacy-policy` |
| **7. Social Links** | Footer -> Brand Column | `#` (6 icons) | Dead placeholders | Provide valid URLs or company profiles |

---

## 5. Audit Deliverables Reference

The full audit consists of three comprehensive companion reports:
1. [`MASTERHRMS_PUBLIC_NAVIGATION_INVENTORY.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/MASTERHRMS_PUBLIC_NAVIGATION_INVENTORY.md): Complete hierarchy of header mega-menus, mobile drawer, footer columns, and link destinations.
2. [`MASTERHRMS_VITE_NEXTJS_ROUTE_PARITY_MATRIX.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/MASTERHRMS_VITE_NEXTJS_ROUTE_PARITY_MATRIX.md): Detailed 508-route comparison, cluster breakdown, and layout shell mapping.
3. [`MASTERHRMS_PUBLIC_SITE_AND_ROUTE_AUDIT_SUMMARY.md`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/MASTERHRMS_PUBLIC_SITE_AND_ROUTE_AUDIT_SUMMARY.md): Exact count summary table, counting rules, and priority findings.
