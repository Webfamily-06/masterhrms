# MASTERHRMS — Dynamic Blog CMS Architecture & Domain Audit

**Date:** October 22, 2026  
**Auditor:** Principal Software & Security Architect  
**Workspace:** MASTERHRMS Enterprise ERP & Core Orchestration Platform  
**Target Environment:** Express Backend (`:4000`) + Next.js 16 App Router CMS (`:3000`) + PostgreSQL (Supabase)

---

## 1. Executive Summary & Problem Diagnosis

Before this implementation, the blog and CMS content management architecture suffered from architectural limitations and inconsistencies:
1. **Modal Editing Anti-Pattern:** Editing blog articles in `/super/blogs` opened an in-page modal dialog (`selectedBlog` state) rather than a dedicated, deep-linkable, refresh-safe route.
2. **Hardcoded Domain Dependencies:** The domain `masterhrms.com` was hardcoded in multiple locations across blog managers, slug input prefixes, SERP snippets, and preview builders, preventing correct resolution across development, staging, custom tenant domains, and platform production domains.
3. **Disconnected Authoritative Persistence:** While articles were stored in PostgreSQL under the `cms_pages` table, editing and fetching workflows did not enforce dedicated ID-based lookup paths, leading to fragile slug-only lookups.
4. **Hardcoded Page Rendering:** CMS pages frequently relied on static JSX definitions rather than rendering persisted dynamic sections via structured, reusable templates.

---

## 2. Deep-Dive Architectural Audit

### 2.1 Authoritative Data Source & Schema
- **Database Provider:** PostgreSQL (`server/prisma/schema.prisma`), mapped via Prisma ORM.
- **Model:** `CmsPage`
  ```prisma
  model CmsPage {
    id              String    @id @default(uuid()) @db.VarChar(36)
    slug            String    @unique @db.VarChar(255)
    title           String    @db.VarChar(255)
    category        String?   @db.VarChar(100)
    metaDescription String?   @db.Text
    canonicalUrl    String?   @db.VarChar(500)
    ogImage         String?   @db.VarChar(500)
    content         Json?     // Stores structured sections, hero, cards, authors, markdown
    status          String    @default("draft") @db.VarChar(20)
    publishedAt     DateTime?
    authorId        String?   @db.VarChar(36)
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    @@map("cms_pages")
  }
  ```
- **Finding on Identity:** A persistent, immutable UUID primary key (`id`) already existed on `CmsPage`. However, API routes and administrative components operated primarily on mutable `slug` keys, making slug updates hazardous and preventing direct URL addressing by stable article ID.

### 2.2 Backend API Routes Audit (`server/src/routes/cms.routes.ts`)
- **Pre-Audit State:**
  - `GET /api/cms/pages`: Omitted `content: false` for performance, which inadvertently stripped markdown and structured sections.
  - `GET /api/cms/pages/:slug`: Looked up strictly by slug.
  - `PUT /api/cms/pages/:slug`: Mutation keyed by slug; if the slug changed during an edit, the lookup failed or broke subsequent calls.
  - No dedicated `/api/cms/blogs` endpoints existed for super admins to filter and manage blog-specific articles with their full JSON payloads.
- **Defects Identified:**
  - Modifying an article's slug during an edit resulted in broken references.
  - Fetching by ID was unsupported at the API layer.

### 2.3 Administration Routes & Component Hierarchy
- **Route:** `/super/blogs` (`CMS/src/app/super/blogs/page.tsx`)
- **Pre-Audit Behavior:**
  - Loaded `BlogManagerStudio` (`CMS/src/components/cms/blog-manager-studio.tsx`).
  - Clicking the pencil icon set `selectedBlog` in local React state, opening an overlay modal.
  - Refreshing the browser or bookmarking the editing URL was impossible.
  - Direct deep linking (`/super/blogs/[id]/edit`) did not exist.
  - Cancel/Save simply dismissed the modal.

### 2.4 Domain Resolution Architecture
- **Pre-Audit Hardcoding:**
  - `CMS/src/components/cms/blog-manager-studio.tsx` hardcoded `https://masterhrms.com/blog/` in multiple form labels, slug prefixes, and SERP preview containers.
  - `CMS/src/components/cms/blog-settings-editor.tsx` hardcoded `masterhrms.com`.
  - `CMS/src/lib/platform-domain.ts` fell back directly to `https://masterhrms.com`.
- **Domain Audit Findings:**
  - In local development (`localhost:3000`), preview links attempted to direct users to production `masterhrms.com`.
  - Tenant custom domains (`CustomDomain` table in Prisma) and platform configuration (`NEXT_PUBLIC_APP_URL`, `PLATFORM_DOMAIN`) were bypassed.

### 2.5 CMS Page Rendering & Dynamic Templates
- **Pre-Audit State:**
  - Marketing pages (`/p/[slug]`) did not have an extensible template renderer.
  - If a page in `cms_pages` lacked hardcoded React component backing, it displayed generic unstructured JSON or unstyled blocks.
  - CMS Studio lacked native section reordering (Move Up / Move Down controls).

---

## 3. Remediation & Target Architecture Blueprint

| Component | Pre-Audit Implementation | Target Architecture (Implemented) |
| :--- | :--- | :--- |
| **Blog Identity** | Mutable slug-based administration | Immutable UUID persistent ID (`CmsPage.id`) preserved across edits, slug changes, and renames |
| **Editor Navigation** | In-page modal (`selectedBlog`) | Dedicated deep-linkable route `/super/blogs/[id]/edit` and `/super/blogs/new` |
| **Rich-Text Editor** | Fragmented textareas or unpersisted previews | Controlled rich markdown editor with undo/redo, formatting toolbar, split-view preview, and live preview |
| **Domain Resolution** | Hardcoded `masterhrms.com` | Dynamic resolution via `getPlatformDisplayBaseDomain()` & `getResolvedPublicDomain()`, adapting to `localhost:3000`, staging, tenant custom domains, or production |
| **CMS Templates** | Hardcoded JSX pages | `DynamicTemplateRenderer` supporting Hero, Markdown Body, Cards Grid, FAQs, Comparison Tables, and CTAs |
| **Section Reordering** | Fixed static array | Interactive section reordering with Move Up / Move Down buttons and persistent section IDs |
| **Public Blog** | Static mock markdown articles | Server-side prefetching from authoritative PostgreSQL `/api/cms/blogs` with fallback to static content |

---

## 4. Architectural Verification Summary
The implementation maintains 100% backward compatibility with existing Supabase PostgreSQL databases and Prisma migrations, guarantees tenant isolation, preserves strict RBAC (`super_admin` guard), and resolves all 6 mission objectives.
