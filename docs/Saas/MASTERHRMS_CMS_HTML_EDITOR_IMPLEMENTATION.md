# MASTERHRMS CMS Dedicated HTML Editor Implementation Report

**Date:** October 2026  
**Component:** `DedicatedPageEditor` (`CMS/src/components/cms/dedicated-page-editor.tsx`)  
**Routes:** `/super/cms/[id]/edit` and `/super/cms/new`  
**Security Standard:** Strict XSS Neutralization, Isolated Sandboxed Iframe, Zero Execution in Super Admin DOM

---

## 1. Overview and Architecture

The MASTERHRMS Dedicated Page Editor delivers a professional, unified authoring environment for CMS-managed pages. Rather than confining administrators to a plain Markdown textarea or an awkward modal dialog, the editor provides a full-page workspace supporting five comprehensive operational modes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       DEDICATED PAGE EDITOR                            │
│  [Visual Editor]  [HTML / Source]  [Split View]  [Live Preview]       │
├───────────────────────────────────┬────────────────────────────────────┤
│  SOURCE EDITOR (Col 6)            │  ISOLATED SANDBOX PREVIEW (Col 6)  │
│  - Semantic HTML syntax           │  - Sandboxed iframe (allow-same-   │
│  - H1, H2, Section, Cards, Media  │    origin, zero script execution)  │
│  - Tag snippet inserters          │  - Real-time DOM synchronization   │
│  - Undo / Redo history stack      │  - Responsive Viewport toggles:    │
│  - Immediate change listener      │    Desktop, Tablet (768px), Mobile │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Five Operational Modes

### 2.1 Visual Editor
Allows administrators to manage structured CMS layouts without writing code:
- **Hero Banner:** Headline, subtitle, badge tag, primary CTA text and link, and background cover image.
- **Section Modules:** Add, remove, and reorder (`moveSection('up' | 'down')`) custom content blocks (e.g., Feature Cards, Rich Text blocks, Testimonials).
- **Media Library Integration:** Direct integration with `MediaPickerModal` for attaching media assets to Hero, SEO banners, or individual sections.
- **Page Settings & SEO Sidebar:** Configures title, slug, template selection, canonical URL override, and meta descriptions.

### 2.2 HTML / Source Editor
Provides direct, low-level semantic markup editing:
- Supports standard tags: `<h1>` to `<h6>`, `<p>`, `<section>`, `<div>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<img>`, `<blockquote>`, `<code>`, `<pre>`.
- **Snippet Toolbar:** Instant insertion buttons for H1, H2, Paragraph, Section Block, Card Grid, Anchor Link, Unordered List, and Media Library Image.
- **Undo / Redo Stack:** Keyboard-accessible (`Ctrl+Z`, `Ctrl+Y`) and toolbar buttons powered by an internal 50-step history stack (`undoStackRef`, `redoStackRef`).
- **Tag Validation:** Detects unclosed tags and warns the author before saving.

### 2.3 Split View Mode
Combines the HTML/Source editor and the Sandboxed Live Preview side-by-side in a responsive 50/50 split:
- Edits in the source textarea immediately re-render in the sandboxed preview.
- Enables pixel-perfect markup refinement while viewing live typographic rendering.

### 2.4 Live Preview Mode
Renders the current unsaved state in an isolated sandboxed iframe with device viewport controls:
- **Desktop:** Full-width container (100%).
- **Tablet:** Simulated iPad/tablet width (768px centered).
- **Mobile:** Simulated smartphone width (375px centered).
- Custom device frame styling with modern shadow and rounded corners.

### 2.5 Preview Published Page
A dedicated action button in the top navigation bar opening the live, public-facing route (`/p/[slug]`, `/about`, `/team`, `/pricing`, etc.) in a new tab, allowing administrators to verify production output.

---

## 3. Bidirectional Content-to-HTML Conversion

To avoid destroying existing structured JSON sections (Hero, Sections, Cards, FAQs, Testimonials) while enabling full HTML source editing, a dedicated bidirectional converter was engineered in `CMS/src/lib/cms-html-converter.ts`:

### 3.1 `contentToHtml(content: DynamicPageContent): string`
Transforms structured CMS fields into clean semantic markup:
- Renders `<header class="page-hero">` with badge, title, subtitle, and CTA links.
- Serializes `cards` arrays into `<div class="cms-cards-grid">` containers with structured card elements.
- Translates `sections` into `<section class="cms-section">` blocks.
- Preserves raw HTML stored in `content.html` or `content.body`.

### 3.2 `htmlToContent(html: string, existingContent?: DynamicPageContent): DynamicPageContent`
Parses modified HTML back into the CMS object representation:
- Preserves template properties, canonical URLs, and SEO metadata.
- Updates `content.html` with the author's exact sanitized markup.
- Extracts updated `<h1>` titles, paragraph leads, and card items non-destructively.

---

## 4. Security Architecture & Sandboxing

### 4.1 Threat Modeling
Allowing administrators to edit raw HTML introduces the risk of Stored Cross-Site Scripting (XSS) if malicious scripts (`<script>`, `onerror=...`, `javascript:...`) are rendered in the authenticated Super Admin DOM.

### 4.2 Multi-Layer Defenses Implemented

1. **Strict HTML Sanitization (`CMS/src/lib/html-sanitizer.ts`):**
   - Strips dangerous tags: `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<base>`.
   - Strips all inline event handlers (`onclick`, `onerror`, `onload`, `onmouseover`, etc.).
   - Disallows dangerous URL schemes: blocks `javascript:`, `vbscript:`, and `data:` schemes while allowing `http:`, `https:`, `mailto:`, and relative paths (`/assets/...`).
2. **Iframe Sandboxing:**
   - Both Split View and Live Preview render via an `<iframe>` configured with:
     ```html
     <iframe
       srcDoc={iframeDoc}
       sandbox="allow-same-origin"
       title="Live Sandboxed Preview"
     />
     ```
   - Crucially, `allow-scripts` is **OMITTED**. The browser's native rendering engine physically refuses to execute any script within the iframe context.
   - The Super Admin session cookies, `localStorage` tokens, and React root DOM are completely inaccessible from the preview.

---

## 5. Media Library Integration

The dedicated editor integrates seamlessly with `MediaPickerModal` (`CMS/src/components/media/media-picker-modal.tsx`):
- Selecting an asset inserts an `<img>` tag into the HTML editor at the current cursor location or attaches the image URL to the Hero banner or SEO social preview card.
- Asset URLs are resolved environment-aware, supporting both local upload paths and production CDN origins.
