# MASTERHRMS — Dynamic Blog Data Visibility & Integrity Audit

**Date:** October 22, 2026  
**Auditor:** Antigravity Advanced Agentic Quality Engineering  
**Scope:** Public Blog Feed (`/blog`), Super Admin Blog Manager (`/super/blogs`), REST Backend (`/api/cms/blogs`, `/api/cms/pages`), PostgreSQL Database (`cms_pages` table)

---

## 1. Executive Summary

An audit was initiated following reports that out of six blogs created in CMS, only two were visible on the public `/blog` route, and blog cards displayed placeholder grey boxes labeled `784x784` and `1226x1062`.

The investigation revealed:
1. **Data Source Bifurcation:** The dynamic CMS database table `cms_pages` contained only two articles (`blog-1` and `blog-2`), while six other articles existed solely as static markdown files in `CMS/src/data/blog/`.
2. **API Isolation:** The authoritative backend API (`GET /api/cms/blogs`) queries the PostgreSQL `cms_pages` table directly. Because the six markdown articles had never been imported into PostgreSQL, they were invisible to the backend API, the Super Admin console, and the dynamic Next.js blog routes.
3. **Image Placeholder References:** Legacy markdown articles and seed data referenced unstyled static demo mockups (`/images/ns-img-301.jpg`, `/images/opai-img-13.jpg`) that lacked real visual branding and exhibited dimensional overlay labels.

### Remediation Outcome
- **100% Authoritative Database Migration:** All six legacy markdown posts were parsed, transformed, and imported into PostgreSQL `cms_pages` with persistent UUIDs, complete content, categories, tags, reading time, and author metadata.
- **Authoritative Total:** The database now contains **8 active published articles**.
- **Unified Public Visibility:** `GET /api/cms/blogs` and `GET http://localhost:3000/blog` authoritatively render all 8 articles.
- **Vector Illustration Upgrades:** High-resolution SVG cover illustrations (`blog-1.svg` through `blog-8.svg`) were deployed to `CMS/public/images/blog/`, replacing grey placeholders.

---

## 2. Root Cause Analysis

### 2.1 The Two-Article vs Six-Article Discrepancy
- In previous sprints, two articles were created dynamically via the Super Admin CMS editor (`/super/cms` and `/super/blogs`):
  - `blog-1`: *Next-Gen Enterprise Resource Planning in 2026*
  - `blog-2`: *Automating Global Payroll: Compliance & Multi-Currency Architecture*
- Meanwhile, six original articles were stored as local Markdown files in `CMS/src/data/blog/*.md`:
  - `3-ai-skills-you-need-to-master-in-2025.md`
  - `empowering-teams-in-a-remote-world.md`
  - `how-automation-is-revolutionizing-modern-workplaces.md`
  - `optimizing-productivity-through-hybrid-work-models.md`
  - `the-future-of-work-predictions-for-2025.md`
  - `the-importance-of-continuous-learning.md`
- When the application transitioned to authoritative database-backed CMS rendering, the Next.js frontend switched from reading local Markdown files to fetching from `/api/cms/blogs`. Since the 6 Markdown files had not been synced to PostgreSQL, only the 2 database-persisted articles were returned.

---

## 3. Database Migration & Inventory

The automated migration script `scripts/import-markdown-blogs-to-db.cjs` was executed to parse each Markdown file's frontmatter and body, map appropriate taxonomy metadata, and insert them into the `cms_pages` table.

### Complete Inventory of Authoritative CMS Blog Articles (8 Total)

| Index | Persistent UUID | Slug | Title | Category | Author | Published Status |
|:---:|:---|:---|:---|:---|:---|:---:|
| 1 | `9e802b11-5dc0-4ef1-a5dc-7377fbc6bc2e` | `blog-1` | Next-Gen Enterprise Resource Planning in 2026 | ERP Systems | Sarah Jenkins (VP of Engineering) | Published |
| 2 | `585d83da-ca30-4e31-8e0f-2195fbc9a8d9` | `blog-2` | Automating Global Payroll: Compliance & Multi-Currency Architecture | Global Payroll & Tax | Marcus Vance (Head of Global People) | Published |
| 3 | `34e4ba9c-3694-4f2b-8a71-6c2436f5c886` | `3-ai-skills-you-need-to-master-in-2025` | 3 AI Skills You Need to Master in 2025 | Workforce AI | Elena Rostova (Director of AI) | Published |
| 4 | `a3901b54-be57-414d-9d41-471249b56f8f` | `empowering-teams-in-a-remote-world` | Empowering Teams in a Remote-First World | Workforce AI | David Sterling (Chief People Officer) | Published |
| 5 | `105f9899-7389-4be6-9807-68b35591d848` | `how-automation-is-revolutionizing-modern-workplaces` | How Automation Is Revolutionizing Modern Workplaces | Automation Insights | Michael Chang (VP Automation) | Published |
| 6 | `6d8d67ee-fe0e-436f-b25c-da488b3f2db7` | `optimizing-productivity-through-hybrid-work-models` | Optimizing Productivity Through Hybrid Work Models | Workforce AI | Rachel Adams (Head of Workplace) | Published |
| 7 | `7d483861-6d9b-449e-b8d1-d2bf891503e7` | `the-future-of-work-predictions-for-2025` | The Future of Work: Predictions & Trends | ERP Systems | Alex Rivera (Enterprise Architect) | Published |
| 8 | `3a5a7322-38d6-444f-a2e1-7d121764654b` | `the-importance-of-continuous-learning` | The Importance of Continuous Learning in Tech | Workforce AI | Dr. Aris Thorne (Chief Learning Officer) | Published |

---

## 4. API Visibility Verification

### 4.1 Endpoint: `GET /api/cms/blogs`
- **Response Code:** 200 OK
- **Item Count:** 8
- **Payload Schema Validation:**
  - `id`: Non-empty UUID string matching database primary key.
  - `slug`: URL-safe slug corresponding to public route `/blog/[slug]`.
  - `title`: String matching article heading.
  - `published`: `true` on all records.
  - `content`: Complete JSON containing `markdown`, `author`, `category`, `coverImage`, `publishedAt`, and `tags`.

### 4.2 Public Routing & Hydration: `GET http://localhost:3000/blog`
- **Result:** PASS
- **Cards Rendered:** 8 blog cards displayed simultaneously.
- **Dynamic Category Filters:** `All`, `ERP Systems`, `Workforce AI`, `Automation Insights` filter the cards accurately in real time.
- **Zero Placeholder Artefacts:** All 8 cards render branded SVG vectors with clean gradients, domain icons, and typography.

---

## 5. Security & Isolation Verification

- **Draft Isolation:** Public requests to `/api/cms/blogs` and `/blog` strictly filter `published: true` and scheduled post dates (`publishedAt <= new Date()`).
- **Super Admin Bypass:** Super Admin tokens allow viewing drafts in `/super/blogs` while public visitors only receive verified published articles.
- **Tenant Scope:** CMS pages for platform blogs maintain universal public visibility while tenant-specific internal configurations remain strictly isolated.

---

## 6. Audit Conclusion

The data discrepancy is resolved. Master HRMS now operates on a single unified database repository for all blog articles. Static markdown files are preserved solely as historical archival backups, and the live application fetches, updates, and publishes all articles via PostgreSQL `cms_pages`.
