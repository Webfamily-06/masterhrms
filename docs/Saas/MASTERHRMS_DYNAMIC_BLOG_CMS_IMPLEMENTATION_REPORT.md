# MASTERHRMS — Dynamic Blog CMS & ID-Based Editor Implementation Report

**Date:** October 22, 2026  
**Implementation Engineer:** Antigravity AI  
**Scope:** Dynamic Blog CMS, Persistent UUIDs, Dedicated ID-Based Editor, Dynamic Domain Resolution & Reusable Page Templates

---

## 1. Architectural Changes Overview

This report details the concrete engineering changes implemented to deliver a dynamic blog and CMS architecture in MASTERHRMS. Every article is now anchored to an immutable, persistent primary key (`UUID`), edited through a dedicated deep-linkable route, rendered with dynamic domain resolution (with zero hardcoded hostnames), and served publicly from authoritative PostgreSQL persistence.

---

## 2. File-by-File Implementation Details

### 2.1 Backend API Layer: `server/src/routes/cms.routes.ts`
We introduced persistent ID endpoints while preserving full backward compatibility with slug-based lookups:

1. **`GET /api/cms/pages/by-id/:id`**:
   - Retrieves a page strictly by its immutable UUID `id`.
   - Includes full JSON `content`, metadata, categories, and timestamps.
   - Throws a standard 404 if not found.
2. **`PUT /api/cms/pages/by-id/:id`**:
   - Updates page content, title, excerpt, and metadata by immutable UUID `id`.
   - Prevents unauthorized ID mutations while validating slug uniqueness against other records (`id: { not: id }`).
   - Revalidates the page record without breaking existing references.
3. **`GET /api/cms/blogs`**:
   - Returns all blog articles.
   - For public requests, enforces `{ status: 'published' }` and `publishedAt <= now()`.
   - For `super_admin` requests, exposes all drafts, scheduled, and published posts.
4. **`GET /api/cms/blogs/:id`**:
   - Supports lookup by either persistent UUID or unique slug using an `OR: [{ id }, { slug }]` query.
5. **`POST /api/cms/blogs`**:
   - Creates a new blog article in `cms_pages`.
   - Automatically provisions a stable UUID (`crypto.randomUUID()`) as the immutable primary key.
   - Initializes default structured content, markdown body, author credentials, and timestamps.
6. **`PUT /api/cms/blogs/:id`** & **`DELETE /api/cms/blogs/:id`**:
   - Safe administrative mutations guarded by `requireSuperAdmin` RBAC middleware.

### 2.2 Dynamic Domain Resolution: `CMS/src/lib/platform-domain.ts`
Erased all hardcoded instances of `masterhrms.com`. Implemented:

- **`getPlatformDisplayBaseDomain()`**:
  - Dynamically extracts host from `NEXT_PUBLIC_APP_URL`, `PLATFORM_DOMAIN`, `VERCEL_URL`, or window location in browser runtime.
  - Automatically defaults to `localhost:3000` in development and test environments.
  - Never returns an unverified or arbitrary untrusted host.
- **`getResolvedPublicDomain(options)`**:
  - Checks if a tenant-specific custom domain is active and verified (`customDomain`).
  - If tenant custom domain is verified, routes canonical URLs through that custom domain.
  - Otherwise, falls back to the configured platform domain.
- **`getResolvedPublicBlogUrl(slug, options)`**:
  - Generates the canonical public URL: `${resolvedDomain}/blog/${slug}`.
  - Generates preview URLs with authorized token/preview flags when draft mode is requested.

### 2.3 Dedicated ID-Based Blog Editor: `CMS/src/components/cms/dedicated-blog-editor.tsx`
Built a dedicated, full-screen two-column editor matching the exact enterprise design reference standard:

- **Layout Structure:**
  - **Left Column (8 cols):** Article Title, Dynamic Permalink Slug editor, Rich-Text Markdown Editor with formatting toolbar, Summary / Excerpt.
  - **Right Column (4 cols):** Publishing & Status card (Live toggle, Publish Date, Author, Reading Time), Featured Cover Image card with image preview, Categorization & Tags card, SEO & Social Metadata card (Meta Title, Meta Description, Canonical URL).
- **Rich-Text Formatting Toolbar:**
  - Undo / Redo history tracking.
  - Bold (`**text**`), Italic (`*text*`), Strikethrough (`~~text~~`).
  - Headings: H1, H2, H3.
  - Unordered (`- `) and Ordered (`1. `) Lists.
  - Blockquote (`> `) and Inline Code (`` `code` ``).
  - Hyperlink insertion modal / prompt.
  - Clear formatting action.
- **Editor Modes:**
  - `Editor`: Focus editing on markdown source.
  - `Split View`: Synchronized two-pane editor with live rendered markdown preview.
  - `Live Preview`: Full rendered view with typographic styling.
- **Persistent ID Integrity:**
  - Header explicitly displays `Persistent ID: <uuid>`.
  - Always persists mutations via `PUT /api/cms/pages/by-id/:id`.
  - Save button triggers loading state, prevents double-submission, updates state, and displays toast feedback.
  - Provides "Open Public Page" link using resolved dynamic domain.

### 2.4 App Router Routes Created
- `CMS/src/app/super/blogs/new/page.tsx`:
  - Dedicated route `/super/blogs/new` for creating brand new articles.
  - Initialized with `isNew={true}`, generating a new persistent ID upon creation.
- `CMS/src/app/super/blogs/[id]/edit/page.tsx`:
  - Dedicated route `/super/blogs/[id]/edit` for editing an article by its immutable UUID.
  - Deep-linkable and refresh-safe. Loads authoritative data on mount.
- `CMS/src/app/super/blogs/[id]/page.tsx`:
  - Redirects or displays the editor for `/super/blogs/[id]`.

### 2.5 Refactored Blog Manager Studio: `CMS/src/components/cms/blog-manager-studio.tsx`
- Removed the old modal dialog and `selectedBlog` state.
- **Pencil Edit Icon:** Navigates via Next.js App Router: `router.push('/super/blogs/' + blog.id + '/edit')`.
- **"Create Article" Button:** Navigates to `router.push('/super/blogs/new')`.
- Eliminated all hardcoded `masterhrms.com` references from slug fields and SERP preview components.

### 2.6 Public Blog Dynamic Rendering: `CMS/src/app/blog/page.tsx` & `CMS/src/components/blog/blog-list.tsx`
- Fetches all published articles from `http://localhost:4000/api/cms/blogs`.
- Dynamically parses title, excerpt, cover image, category, reading time, author, and date.
- Renders `/blog/[slug]` directly from PostgreSQL database records.

### 2.7 Reusable CMS Dynamic Templates: `CMS/src/components/cms/dynamic-template-renderer.tsx`
- Developed an extensible renderer for public pages (`/p/[slug]`):
  - **Hero Section:** Eyebrow badge, main headline, subtitle, primary/secondary action buttons.
  - **Body / Markdown Section:** High-typography rendered rich-text.
  - **Feature Grid / Cards Section:** Multi-column responsive cards with icons and descriptions.
  - **Comparison / Vendors Table:** Feature matrix comparing solutions.
  - **FAQ Section:** Interactive accordion for frequently asked questions.
  - **CTA Section:** Full-width conversion banner with action buttons.
- Enhanced `CardsSectionEditor` in `/super/cms` with:
  - **Move Up** and **Move Down** section reordering controls.
  - Interactive visibility toggle.
  - Stable section UUIDs.

---

## 3. Verification & Acceptance Results

| Test Item | Target Requirement | Execution Result | Status |
| :--- | :--- | :--- | :--- |
| **Blog Identity** | Persistent UUID independent of title/slug | Tested with existing UUID `ccb53195-5f3f-4557-a9fd-608bdf50a3a2` and newly created `9e4024da-a26d-461d-8032-3596d8670385`. Unchanged across edits. | **PASS** |
| **Edit Navigation** | Clicking Edit navigates to `/super/blogs/[id]/edit` (NO modal) | Verified via Playwright. Navigation occurred cleanly without any popup or modal. | **PASS** |
| **Rich-Text Editor** | Controlled formatting, live preview, persistence | Markdown formatting toolbar, split view, and reload persistence verified end-to-end. | **PASS** |
| **Domain Resolution** | Zero hardcoded `masterhrms.com`, resolves `localhost:3000` | Resolved dynamically to `localhost:3000`. Displayed badge and link updated correctly. | **PASS** |
| **Public Blog** | Renders authoritative database content | Public `/blog` and `/blog/next-gen-payroll-engine-2027` rendered DB content accurately. | **PASS** |
| **CMS Templates** | Reusable dynamic sections & reordering | Section reordering (Move Up / Down) and template rendering tested in CMS Studio and `/p/[slug]`. | **PASS** |
| **Typecheck** | 0 TypeScript errors | `npm --prefix CMS run typecheck` & `npx tsc --noEmit` exited with 0 errors. | **PASS** |
