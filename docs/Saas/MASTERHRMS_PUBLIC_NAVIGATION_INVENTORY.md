# MASTERHRMS — Public Website Navigation & Footer Inventory

**Date:** 2026-10-21  
**Status:** Read-Only Forensic Acceptance Audit  
**Auditor:** Antigravity Forensic Engineering  
**Application Runtime:** Next.js 16.1.6 (`http://localhost:3000/`)  
**Design Authority Status:** Next.js Authoritative (Design Preserved, Zero Modifications)  

---

## 1. Executive Summary & Inventory Scope

This report provides a complete, source-backed forensic inventory of all navigation elements, interactive actions, and destination endpoints across the public MASTERHRMS website starting from `http://localhost:3000/`.

### Source Files Inspected
1. **Public Navbar Component:** [`CMS/src/components/shared/layout/navbar/navbar.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/navbar/navbar.tsx)
2. **Company Mega-Menu:** [`CMS/src/components/shared/layout/navbar/company-menu.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/navbar/company-menu.tsx)
3. **Inner Pages Menu:** [`CMS/src/components/shared/layout/navbar/inner-pages-menu.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/navbar/inner-pages-menu.tsx)
4. **Platform Mega-Menu:** [`CMS/src/components/shared/layout/navbar/platform-menu.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/navbar/platform-menu.tsx)
5. **Plans & Support Mega-Menu:** [`CMS/src/components/shared/layout/navbar/plan-and-support-menu.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/navbar/plan-and-support-menu.tsx)
6. **Mobile Menu Drawer:** [`CMS/src/components/shared/layout/mobile-menu/mobile-menu.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/mobile-menu/mobile-menu.tsx) & [`CMS/src/data/mobile-meu.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/data/mobile-meu.ts)
7. **Rendered Public Footer:** [`CMS/src/components/shared/layout/footer/footer.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/shared/layout/footer/footer.tsx) & [`CMS/src/data/footer-links.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/data/footer-links.ts)
8. **Enterprise Database Footer Reference:** [`CMS/src/components/marketing/site-footer.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/marketing/site-footer.tsx)
9. **Layout Shell:** [`CMS/src/components/layout/AppShell.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/layout/AppShell.tsx)

---

## 2. Public Header Itemized Inventory

### 2.1 Brand Identity & Header CTAs (Desktop)
| Control / Action | HTML Element | Exact Label / Alt Text | Literal Destination | Final URL (Navigated) | Destination Heading / Title | Classification | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Site Identity** | `<a>` | "Home" (Logo image) | `/` | `http://localhost:3000/` | `Automation SaaS \|\| Nexsas` | Valid Public Page | HTTP 200 — Verified |
| **User Sign In** | `<a>` | "Sign in" | `/login` | `http://localhost:3000/login` | "Welcome Back!" / `Sign In` | Valid Auth Page | HTTP 200 — Verified |
| **Workspace CTA**| `<a><button>` | "Dashboard" | `/dashboard` | Conditional Redirect | `Workspace — Master HRMS` | Dynamic Redirect | HTTP 200 — Verified |
| **Mobile Drawer**| `<button>` | "Menu" (`aria-label="Open menu"`) | *DOM Event* | N/A (Toggles off-canvas state) | Off-canvas Drawer | UI Control | Verified |

---

### 2.2 Desktop Mega-Menu Itemized Registry

#### Menu 1: "Company" (`company-mega-menu-v2`)
*Top-level header label: `Company` (Literal: `#`, expands dropdown on hover/click)*

| # | Group / Submenu | Exact Visible Label | Description Subtext | Literal Href | Final URL | Destination Page Title / Heading | Route Classification | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | About Links | About Us | See how others are using Nexsas | `/about` | `http://localhost:3000/about` | "How Nexsas began" | Valid Public Page | HTTP 200 |
| 2 | About Links | Our Team | Dynamic content solutions | `/team` | `http://localhost:3000/team` | "The minds behind Nexsas" | Valid Public Page | HTTP 200 |
| 3 | About Links | Career | Join our team | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 4 | About Links | Why Choose Us | Our unique selling points... | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 5 | Culture Links | Our Manifesto | Our values and principles | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 6 | Culture Links | Customers | Success stories and testimonials | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 7 | Culture Links | Testimonials | What our customers say about us | `/testimonial` | `http://localhost:3000/testimonial` | `404 - Automation SaaS \|\| Nexsas` | **Broken Destination** | **HTTP 404** |
| 8 | Culture Links | Case Studies | Real-world examples of our solutions | `/case-study` | `http://localhost:3000/case-study` | `404 - Automation SaaS \|\| Nexsas` | **Broken Destination** | **HTTP 404** |
| 9 | Solutions & Feature | Services | Our services and offerings | `/services` | `http://localhost:3000/services` | `Services - Automation SaaS` | Valid Public Page | HTTP 200 |
| 10| Solutions & Feature | Use Cases | Real-world examples of our solutions | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 11| Feature Card Arrow | Product updates | Stay ahead with latest features | `#` | N/A (Dead anchor) | N/A | Card Action | `#` Dead Link |

---

#### Menu 2: "Inner pages" (`resources-dropdown-menu-v2`)
*Top-level header label: `Inner pages` (Literal: `#`, expands dropdown on hover/click)*

| # | Exact Visible Label | Literal Href | Final URL | Destination Page Title / Heading | Route Classification | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | About us | `/about` | `http://localhost:3000/about` | "How Nexsas began" | Valid Public Page | HTTP 200 |
| 2 | Features | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 3 | Services | `/services` | `http://localhost:3000/services` | `Services - Automation SaaS` | Valid Public Page | HTTP 200 |
| 4 | Team | `/team` | `http://localhost:3000/team` | "The minds behind Nexsas" | Valid Public Page | HTTP 200 |
| 5 | Blog | `/blog` | `http://localhost:3000/blog` | `Blog - Automation SaaS` | Valid Public Page | HTTP 200 |
| 6 | Contact | `/contact` | `http://localhost:3000/contact` | "We'd love to hear from you" | Valid Public Page | HTTP 200 |

---

#### Menu 3: "Platform" (`platform-mega-menu-v2`)
*Top-level header label: `Platform` (Literal: `#`, expands dropdown on hover/click)*

| # | Group / Submenu | Exact Visible Label | Literal Href | Final URL | Destination Page Title / Heading | Route Classification | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Overview | Features & Capabilities | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 2 | Overview | Process & Workflow | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 3 | Overview | Security & Compliance | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 4 | Overview | Our Brandkit | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 5 | Overview | Download App | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 6 | Overview | Press | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 7 | Integrations | Pricing | `/pricing` | `http://localhost:3000/pricing` | `Pricing - Automation SaaS` | Valid Public Page | HTTP 200 |
| 8 | Integrations | HR & Payroll | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 9 | Integrations | Customer Support | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 10| Integrations | Analytics & Reporting | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 11| Integrations | Whitepaper & Reports | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 12| Integrations | Explore All Integrations | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 13| Featured Card 1 | Merge Unified | `/blog/3-ai-skills-you-need-to-master-in-2025` | `http://localhost:3000/blog/3-ai-skills-you-need-to-master-in-2025` | Blog Article Page | Valid Public Page | HTTP 200 |
| 14| Featured Card 2 | Combine Unified | `/blog/3-ai-skills-you-need-to-master-in-2025` | `http://localhost:3000/blog/3-ai-skills-you-need-to-master-in-2025` | Blog Article Page | Valid Public Page | HTTP 200 |

---

#### Menu 4: "Plans & Support" (`product-mega-menu`)
*Top-level header label: `Plans & Support` (Literal: `#`, expands dropdown on hover/click)*

| # | Group / Submenu | Exact Visible Label | Description Subtext | Literal Href | Final URL | Destination Heading | Route Classification | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Auth & Programs | Login | Log into your dashboard | `/login` | `http://localhost:3000/login` | "Welcome Back!" | Valid Auth Page | HTTP 200 |
| 2 | Auth & Programs | Create Account | Create your free account | `/signup` | `http://localhost:3000/signup` | "Create Account" | Valid Auth Page | HTTP 200 |
| 3 | Auth & Programs | Referral Program | Share and earn together | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 4 | Auth & Programs | Affiliate Program | Earn commissions as partner | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 5 | Auth & Programs | Affiliate Policy | Understand our policies | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 6 | Policies & Compliance| Terms & Conditions | Understand our terms | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 7 | Policies & Compliance| Privacy Policy | Understand data protection | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 8 | Policies & Compliance| Refund Policy | Review refund terms | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 9 | Policies & Compliance| GDPR | Review GDPR information | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 10| Policies & Compliance| Legal | Read legal policies | `#` | N/A (Dead anchor) | N/A | Template Placeholder | `#` Dead Link |
| 11| Changelog Feature | Automation SaaS Changelog | Access all your workflows | `#` | N/A (Dead anchor) | N/A | Feature Card | `#` Dead Link |

---

### 2.3 Off-Canvas Mobile Drawer Itemized Registry (`mobile-menu.tsx`)

| # | Accordion Group | Item Label | Literal Href | Destination Page Title / Heading | Route Classification | Verification Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Company** | About Us | `/about` | "How Nexsas began" | Valid Public Page | HTTP 200 — Verified |
| 2 | | Our Services | `/services` | `Services - Automation SaaS` | Valid Public Page | HTTP 200 — Verified |
| 3 | | Product Features | `#` | N/A | Template Placeholder | `#` Dead Link |
| 4 | | Blog & News | `/blog` | `Blog - Automation SaaS` | Valid Public Page | HTTP 200 — Verified |
| 5 | **Collaborate** | Affiliate | `#` | N/A | Template Placeholder | `#` Dead Link |
| 6 | | Referral | `#` | N/A | Template Placeholder | `#` Dead Link |
| 7 | | Login | `/login` | "Welcome Back!" / Sign In | Valid Auth Page | HTTP 200 — Verified |
| 8 | | Create Account | `/signup` | "Create Account" | Valid Auth Page | HTTP 200 — Verified |
| 9 | | Download | `#` | N/A | Template Placeholder | `#` Dead Link |
| 10| | Integration | `#` | N/A | Template Placeholder | `#` Dead Link |
| 11| **Inner pages** | Blog | `/blog` | `Blog - Automation SaaS` | Valid Public Page | HTTP 200 — Verified |
| 12| | Integration | `#` | N/A | Template Placeholder | `#` Dead Link |
| 13| | Case Studies | `#` | N/A | Template Placeholder | `#` Dead Link |
| 14| | Testimonial | `#` | N/A | Template Placeholder | `#` Dead Link |
| 15| | Services | `/services` | `Services - Automation SaaS` | Valid Public Page | HTTP 200 — Verified |
| 16| | Contact | `/contact` | "We'd love to hear from you" | Valid Public Page | HTTP 200 — Verified |
| 17| | Team | `/team` | "The minds behind Nexsas" | Valid Public Page | HTTP 200 — Verified |
| 18| **People & Culture**| Process | `#` | N/A | Template Placeholder | `#` Dead Link |
| 19| | Team | `/team` | "The minds behind Nexsas" | Valid Public Page | HTTP 200 — Verified |
| 20| | Career | `#` | N/A | Template Placeholder | `#` Dead Link |
| 21| | Testimonial | `#` | N/A | Template Placeholder | `#` Dead Link |
| 22| | Customer | `#` | N/A | Template Placeholder | `#` Dead Link |
| 23| | Contact | `/contact` | "We'd love to hear from you" | Valid Public Page | HTTP 200 — Verified |
| 24| | Pricing | `/pricing` | `Pricing - Automation SaaS` | Valid Public Page | HTTP 200 — Verified |

---

## 3. Rendered Public Footer Itemized Inventory

The public marketing footer component (`CMS/src/components/shared/layout/footer/footer.tsx`) renders the following 21 visible links:

| Section / Column | Item Label / Icon | Literal Destination | Final URL | Destination Page Title / Heading | Link Classification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Identity** | Logo (`/images/logo/logo.webp`)| `/` | `http://localhost:3000/` | `Automation SaaS \|\| Nexsas` | Valid Public Page | HTTP 200 |
| **Brand Socials** | Facebook Icon | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Instagram Icon | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Youtube Icon | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | LinkedIn Icon | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Dribble Icon | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Behance Icon | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| **Col 1: Company** | About Us | `/about` | `http://localhost:3000/about` | "How Nexsas began" | Valid Public Page | HTTP 200 |
| | Career | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Why Choose Us | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Our Manifesto | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Contact Us | `/contact` | `http://localhost:3000/contact` | "We'd love to hear from you" | Valid Public Page | HTTP 200 |
| **Col 2: Support** | FAQ | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Documentation | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Tutorial | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Support | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| **Col 3: Legal Policies**| Terms & Conditions | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Privacy Policy | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Refund Policy | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | GDPR Compliance | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |
| | Affiliate Policy | `#` | N/A | N/A | Template Placeholder | `#` Dead Link |

---

## 4. Referenced Public Destinations Crawl Table

Every distinct non-placeholder destination link across the header and footer was audited:

| Destination Path | HTTP Code | Final URL | Rendered Title / Main Heading | Health Assessment |
| :--- | :---: | :--- | :--- | :--- |
| `/` | **200** | `http://localhost:3000/` | "Automate your workflows eliminate manual tasks." | **HEALTHY** — Complete intended marketing hero, avatars, and testimonials. |
| `/about` | **200** | `http://localhost:3000/about` | "How Nexsas began" / `About - Automation SaaS` | **HEALTHY** — Real photo replaces 1160x2108 placeholder, counters animate. |
| `/team` | **200** | `http://localhost:3000/team` | "The minds behind Nexsas" / `Team - Automation SaaS` | **HEALTHY** — 9 real portrait photos render, no unexpected left panel. |
| `/testimonial` | **404** | `http://localhost:3000/testimonial` | `404 - Automation SaaS \|\| Nexsas` | **BROKEN** — Page missing in Next.js App Router. Needs repointing. |
| `/case-study` | **404** | `http://localhost:3000/case-study` | `404 - Automation SaaS \|\| Nexsas` | **BROKEN** — Page missing in Next.js App Router. Needs repointing. |
| `/services` | **200** | `http://localhost:3000/services` | `Services - Automation SaaS \|\| Nexsas` | **HEALTHY** — Feature cards render cleanly. |
| `/blog` | **200** | `http://localhost:3000/blog` | `Blog - Automation SaaS \|\| Nexsas` | **HEALTHY** — Blog post catalog renders. |
| `/contact` | **200** | `http://localhost:3000/contact` | "We'd love to hear from you" / `Contact - Automation SaaS` | **HEALTHY** — Form, checkbox, and real office image render without errors. |
| `/pricing` | **200** | `http://localhost:3000/pricing` | `Pricing - Automation SaaS \|\| Nexsas` | **HEALTHY** — Currency selector, billing cycle toggle, feature lists render. |
| `/blog/3-ai-skills-you-need-to-master-in-2025` | **200** | `http://localhost:3000/blog/3-ai-skills-you-need-to-master-in-2025` | Blog Article Content | **HEALTHY** — Full markdown post content renders. |
| `/login` | **200** | `http://localhost:3000/login` | "Welcome Back!" / `Sign In — Workspace ERP` | **HEALTHY** — Centered auth card with Turnstile bot protection. |
| `/signup` | **200** | `http://localhost:3000/signup` | "Create Account" / `Create Account — Workspace ERP` | **HEALTHY** — Centered auth registration card. |
| `/dashboard` | **200** | `http://localhost:3000/dashboard` | `Workspace — Master HRMS` | **HEALTHY** — Dynamic auth gatekeeper redirects properly. |
| `/product` | **200** | `http://localhost:3000/product` | "Everything HR, in one place" | **HEALTHY** — Enterprise product suite catalog. |
| `/solutions` | **200** | `http://localhost:3000/solutions` | "HR built for your industry" | **HEALTHY** — Vertical solutions showcase. |
| `/resources` | **200** | `http://localhost:3000/resources` | "Learn, scale, and transform with Master ERP & HRMS" | **HEALTHY** — Documentation and guide hub. |
| `/p/compare` | **200** | `http://localhost:3000/p/compare` | Platform Comparison Matrix | **HEALTHY** — Interactive feature comparison. |
| `/legal/terms-of-service`| **200** | `http://localhost:3000/legal/terms-of-service` | Terms of Service Document | **HEALTHY** — Authoritative legal content from database. |
| `/legal/privacy-policy` | **200** | `http://localhost:3000/legal/privacy-policy` | Privacy Policy Document | **HEALTHY** — Authoritative legal content from database. |
| `/legal/security` | **200** | `http://localhost:3000/legal/security` | Security & Trust Document | **HEALTHY** — Authoritative legal content from database. |
| `/legal/cookie-policy` | **200** | `http://localhost:3000/legal/cookie-policy` | Cookie Policy Document | **HEALTHY** — Authoritative legal content from database. |
| `/legal/dpa` | **200** | `http://localhost:3000/legal/dpa` | Data Processing Agreement | **HEALTHY** — Authoritative legal content from database. |
