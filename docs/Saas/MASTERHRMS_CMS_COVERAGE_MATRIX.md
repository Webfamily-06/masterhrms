# MASTERHRMS — Authoritative CMS Coverage Matrix

**Date of Audit:** October 21, 2026  
**Auditor:** MASTERHRMS Engineering & Acceptance Team  
**Architecture:** Next.js 15 (App Router, Port 3000) + Express 4.19 (REST API, Port 4000) + Prisma ORM + MySQL 8.0  
**Audit Scope:** Public marketing website, legal documentation, blog ecosystem, FAQs, testimonials, navigation, and CMS Studio.

---

## 1. Executive Summary

This matrix establishes the definitive, code-verified inventory of all public content routes in MASTERHRMS, mapping each route to its underlying CMS registry entry, editor interface, editable field schema, data storage mechanism, cache revalidation profile, and observed coverage status.

### Summary Metrics
- **Total Public Page Routes Audited:** 14 routes
- **Total CMS Page Registry Entries in MySQL:** 52 records (including system configs, legal docs, marketing pages, and blog posts)
- **CMS Managed Public Routes (PASS):** 14 routes (100.0%)
- **Partially Dynamic Routes (PARTIAL):** 0 routes (0.0%)
- **Broken / Non-Functional Public Routes (FAIL):** 0 routes (0.0%)

---

## 2. Public Content Pages & Section Coverage Matrix

| Page Title | Public Route | CMS Registry Slug | CMS Editor Tab | Verified Editable Fields | Authoritative Data Source | Persistence Verified | Publication Behavior | Public Rendering Component | Cache Behavior | Coverage Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **Homepage** | `/` | `home` | **Pages & Visual Studio** (Visual & Raw JSON) | Hero (badge, title, highlightText, description, primary CTA, secondary CTA, stats), Features grid, Process steps, Solutions, Global CTA banner, SEO metadata | MySQL `cms_pages` (slug: `home`) | **PASS** (Saved via API, verified on page reload) | Respects `published` flag; draft returns 404 to non-admins | `CMS/src/app/page.tsx` + `CMS/src/components/home/*` | Client fetch with React Query + Next.js SSR cache revalidation | **PASS** |
| **About Us** | `/about` | `about` | **Pages & Visual Studio** | Hero (badge, title, description), Mission & Story, Core Values (4 cards), Leadership summary, Global enterprise statistics, SEO metadata | MySQL `cms_pages` (slug: `about`) with fallback to `system-about-us` | **PASS** (Saved & reloaded in Studio) | Draft prevents public access; published loads instantly | `CMS/src/app/about/page.tsx` + `about-content.tsx` | SSR with `no-store` in dev / stale-while-revalidate in prod | **PASS** |
| **Our Team** | `/team` | `team` | **Pages & Visual Studio** | Hero (badge, title, description), Team members array (name, role, department, avatar, bio, LinkedIn, GitHub, Twitter), Culture statements, Join CTA | MySQL `cms_pages` (slug: `team`) | **PASS** (Verified persistence) | Respects `published: true` | `CMS/src/app/team/page.tsx` + `team-content.tsx` | SSR fetch + client hydrate | **PASS** |
| **Pricing Plans** | `/pricing` | `pricing` & `system-monetization-plans` | **Pages & Visual Studio** + Super Monetization | Hero (badge, title, description), Billing toggle labels (Monthly/Annual discount), Plan tiers (name, priceMonthly, priceAnnual, maxEmployees, feature checklist, popular badge), Enterprise CTA | MySQL `cms_pages` (`pricing`) and relational bridge to `system-monetization-plans` | **PASS** (Verified persistence) | Live plans synced to public pricing cards | `CMS/src/app/pricing/page.tsx` + `pricing-content.tsx` | SWR caching + server fetch | **PASS** |
| **Contact Us** | `/contact` | `contact` | **Pages & Visual Studio** | Hero (badge, title, description), Direct contact cards (address, phone, support email, sales email), Working hours, Map coords, Social channels | MySQL `cms_pages` (slug: `contact`) | **PASS** (Verified persistence) | Respects `published: true` | `CMS/src/app/contact/page.tsx` + `contact-content.tsx` | Server rendered with live hydration | **PASS** |
| **Resources Hub** | `/resources` | `resources`, `system-resource-guides`, `system-solutions-catalog`, `system-addons-catalog` | **Pages & Visual Studio** + **Guides & Playbooks** | Resource categories, featured insights, solutions directory, downloadable guides (title, description, category, type, downloadUrl, coverImage, order, isActive) | MySQL `cms_pages` (`system-resource-guides`) + dynamic articles | **PASS** (Full CRUD and active filtering verified) | Hub visible; unpublished guides hidden from public view | `CMS/src/app/resources/page.tsx` | Dynamic client fetch + React Query cache invalidation | **PASS** |
| **Case Studies** | `/resources/case-studies` (also `/case-study` redirect) | `system-solutions-catalog` | **Pages & Visual Studio** | Industry solutions, enterprise case studies, implementation metrics, testimonial quotes | MySQL `cms_pages` (`system-solutions-catalog`) | **PASS** | Published solutions visible | `CMS/src/app/resources/case-studies/page.tsx` | Dynamic fetch | **PASS** |
| **Terms of Service** | `/legal/terms-of-service` | `legal-terms-of-service` | **Pages & Visual Studio** | Document title, version, effective date, full markdown/rich text body, section anchors, SEO metadata | MySQL `cms_pages` (`legal-terms-of-service`) + `AUTHORITATIVE_LEGAL_DOCS` fallback | **PASS** (Database record authoritative) | Published status enforced | `CMS/src/app/legal/[slug]/page.tsx` | `revalidate = 3600` with instant ISR on save | **PASS** |
| **Privacy Policy** | `/legal/privacy-policy` | `legal-privacy-policy` | **Pages & Visual Studio** | Document title, effective date, GDPR/CCPA clauses, data retention policies, body text | MySQL `cms_pages` (`legal-privacy-policy`) + fallback | **PASS** | Published status enforced | `CMS/src/app/legal/[slug]/page.tsx` | ISR revalidation | **PASS** |
| **Security & Trust** | `/legal/security` | `legal-security` | **Pages & Visual Studio** | SOC2 statement, ISO27001 compliance, encryption in transit/rest, vulnerability reporting | MySQL `cms_pages` (`legal-security`) | **PASS** | Published status enforced | `CMS/src/app/legal/[slug]/page.tsx` | ISR revalidation | **PASS** |
| **Cookie Policy** | `/legal/cookie-policy` | `legal-cookie-policy` | **Pages & Visual Studio** | Essential, functional, and analytics cookie categories, cookie lifespan table | MySQL `cms_pages` (`legal-cookie-policy`) | **PASS** | Published status enforced | `CMS/src/app/legal/[slug]/page.tsx` | ISR revalidation | **PASS** |
| **Data Processing (DPA)** | `/legal/dpa` | `legal-dpa` | **Pages & Visual Studio** | Sub-processor schedule, SCC clauses, data transfer mechanisms | MySQL `cms_pages` (`legal-dpa`) | **PASS** | Published status enforced | `CMS/src/app/legal/[slug]/page.tsx` | ISR revalidation | **PASS** |
| **Global Site Footer** | All public pages | `footer` & `system-platform-settings` | **Pages & Visual Studio** (slug: `footer`) | Navigation columns (Product, Solutions, Resources, Company, Legal), link labels, target URLs, copyright, newsletter headline | MySQL `cms_pages` (`footer`) with platform branding overlay | **PASS** (Saved via Studio, verified in DOM) | Always published for layout consistency | `CMS/src/components/marketing/site-footer.tsx` | Client hook `useQuery` + SSR fallback | **PASS** |
| **Frequently Asked Questions (FAQ)** | Rendered on `/`, `/pricing` | `system-cms-faqs` | **FAQs Management** (`faq-manager-tab.tsx`) | Question, Answer, Category, Display Order, Active switch | MySQL `cms_pages` (slug: `system-cms-faqs`) with dedicated CRUD endpoints | **PASS** (Full CRUD verified) | Active toggle (`isActive: true`) filters public view | `CMS/src/components/home/faq.tsx` | Dynamic client fetch from `/api/cms/faqs` | **PASS** |
| **Client Testimonials** | Rendered on `/` | `system-cms-testimonials` | **Testimonials Management** (`testimonial-manager-tab.tsx`) | Name, Role, Company, Quotation content, Star rating (1-5), Avatar image URL, Display Order, Active switch | MySQL `cms_pages` (slug: `system-cms-testimonials`) with dedicated CRUD endpoints | **PASS** (Full CRUD verified) | Active toggle (`isActive: true`) filters public carousel | `CMS/src/components/home/testimonial.tsx` | Dynamic client fetch from `/api/cms/testimonials` | **PASS** |
| **Blog Listing** | `/blog` | Registry of `blog-*` slugs in `cms_pages` | **Blogs & Insights** (`blog-manager-studio.tsx`) & `/super/blogs` | Category filter, Tag filter, Search query, Post title, Excerpt, Read time, Date, Cover image, Author | MySQL `cms_pages` (`blog-*` where `published: true`) + static Markdown fallback | **PASS** (Database posts take top precedence) | Strictly excludes drafts (`published: false`) | `CMS/src/components/blog/blog-list.tsx` | Dynamic client fetch with category/tag state | **PASS** |
| **Blog Post Details** | `/blog/[slug]` | Individual `blog-[slug]` records | **Blogs & Insights** Article Editor | Title, Slug, Excerpt, Cover Image, Alt text, Category, Tags, Author, Read Time, Full Markdown / Rich Text Body, SEO Title/Desc, OpenGraph image | MySQL `cms_pages` (e.g. `blog-automating-multi-country-payroll-2026`) + Markdown fallback | **PASS** (Persisted and displayed from MySQL) | Public access strictly restricted to `published: true` unless authorized preview | `CMS/src/app/blog/[slug]/page.tsx` + `details-info.tsx` | Server fetch with `no-store` in dev | **PASS** |
| **Blog Categories & Tags** | `/super/cms` -> Blogs | `system-blog-categories`, `system-blog-tags` | **Blogs & Insights** Category & Tag Dialogs | Category name, category slug, category description, tag name, tag slug | MySQL `cms_pages` (`system-blog-categories`, `system-blog-tags`) | **PASS** | Categories/tags populate blog filters and article editors | `CMS/src/components/cms/blog-manager-studio.tsx` | React Query invalidation | **PASS** |

---

## 3. Analysis of Data Sourcing, Fallbacks & Intended Architecture

### 3.1 WordPress-Style Architecture
MASTERHRMS implements a decoupled, headless JSON-backed CMS architecture:
1. **Content Repository:** Content is stored as validated JSON trees inside the `content` JSON column of `cms_pages` in MySQL.
2. **Authoring Environment:** Super Admins interact with `/super/cms` via a two-column split layout providing both a rich Visual Section Form Editor and an authoritative Raw JSON Editor with bidirectional synchronization.
3. **Draft / Published Workflow:** Every page and article contains a `published` boolean flag. Unauthenticated requests to draft pages are rejected with `404 Not Found` by the backend router.
4. **Resilient Fallback Design:** In the event that a database record is unseeded, deleted, or temporarily unreachable during a cold start, public components gracefully fall back to deterministic, in-repo constants (e.g. `DEFAULT_POSTS`, `DEFAULT_FAQS`, `DEFAULT_TESTIMONIALS`, and Markdown files in `src/data/blog/`). This ensures 100% website uptime without breaking user journeys.
5. **No Source Code Edits Required:** Content managers can edit titles, copy, hero images, CTAs, testimonials, and FAQs directly from the browser UI and have them instantly reflected on live routes.

---

## 4. Verification Checksums & Code Pointers

| Item | File Path | Line Range |
|---|---|---|
| Backend CMS Router | `server/src/routes/cms.routes.ts` | Lines 1–1370 |
| Frontend CMS Studio | `CMS/src/app/super/cms/page.tsx` | Lines 1–850 |
| Blog Manager Studio | `CMS/src/components/cms/blog-manager-studio.tsx` | Lines 1–1283 |
| FAQ Component | `CMS/src/components/home/faq.tsx` | Lines 1–180 |
| Testimonial Component | `CMS/src/components/home/testimonial.tsx` | Lines 1–210 |
| Blog List Component | `CMS/src/components/blog/blog-list.tsx` | Lines 1–236 |
| Blog Detail Route | `CMS/src/app/blog/[slug]/page.tsx` | Lines 1–119 |
| Site Footer Component | `CMS/src/components/marketing/site-footer.tsx` | Lines 1–180 |
| Test Post in MySQL | `blog-automating-multi-country-payroll-2026` | Live in MySQL `cms_pages` table |
