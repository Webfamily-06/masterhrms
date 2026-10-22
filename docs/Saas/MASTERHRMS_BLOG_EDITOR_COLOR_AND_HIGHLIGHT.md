# MASTERHRMS Blog Editor — Text Color & Text Highlight Architecture and Verification Report

## Executive Summary
This report documents the architectural design, security controls, implementation, and automated test verification for **Text Color** and **Background Color / Highlight** in `CMS/src/components/cms/dedicated-blog-editor.tsx`.

Both features seamlessly integrate with the existing Markdown editing, synchronous undo/redo history, Split View live preview, database persistence lifecycle, and public blog rendering (`/blog/[slug]`).

---

## 1. Storage & Rendering Contract

### 1.1 Evaluated Architecture
1. **Markdown Extensions vs Inline HTML**:
   - Evaluated custom non-standard Markdown syntax (e.g., `[text]{color: #...}`). Non-standard syntax breaks portable Markdown viewers, search indexers, and third-party syndication.
   - Standard inline HTML spans (`<span style="...">`) are standard, well-supported across rich-text systems, and fully reversible.
2. **Persistent Representation**:
   - Text Color: `<span style="color: #e11d48">Selected Text</span>`
   - Background Color: `<span style="background-color: #fef08a">Selected Text</span>`
   - Combined: `<span style="color: #e11d48; background-color: #fef08a">Selected Text</span>`
3. **Reversibility**:
   - When a user selects text within or covering an existing span and chooses "Reset Color", the `color` CSS property is cleanly removed. If no other properties remain, the `<span>` tag is completely unwrapped back to raw text.
   - If both `color` and `background-color` were present and only one is reset, the remaining style property is preserved cleanly in `<span style="...">`.
   - Clear Formatting (`Tx` button) strips all `<span style="...">` and `<mark>` tags cleanly while preserving the underlying text.

---

## 2. Security & Sanitization Policy

### 2.1 CSS Color Validation Allowlist
All color values passed through user interaction, custom hex inputs, or Markdown rendering are validated via `isValidCssColor` in `CMS/src/lib/markdown-styles.ts`:
- **Allowed Formats**:
  - Hex: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (e.g., `#e11d48`, `#fff`)
  - RGB / RGBA: `rgb(r, g, b)`, `rgba(r, g, b, a)`
  - HSL / HSLA: `hsl(h, s, l)`, `hsla(h, s, l, a)`
  - Standard CSS named color keywords (e.g., `red`, `blue`, `black`, `transparent`)
- **Strictly Rejected**:
  - Any input containing `<`, `>`, quotes (`"`, `'`), semicolons (`;`), parentheses outside known functional notations, `url(...)`, `javascript:`, `expression(...)`, or CSS comments (`/* ... */`).
  - If a color fails validation, it is rejected and never injected into the document.

### 2.2 Component-Level Sanitization Pipeline
In both Split View live preview and the public blog renderer (`CMS/src/components/blog-details/blog-details-markdown.tsx`):
- `rehype-raw` is loaded to parse inline HTML nodes into the AST.
- Custom AST renderer `safeMarkdownComponents` (`CMS/src/lib/safe-markdown-components.tsx`) intercepts all `span` and `mark` tags:
  - Only `color` and `backgroundColor` are extracted from the style attribute.
  - Extracted colors are re-checked against `isValidCssColor`.
  - All other styles, dangerous attributes (`onerror`, `onclick`, `onload`), and executable tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<link>`) are completely suppressed.
- Legacy articles without spans render with zero behavioral or visual regressions.

---

## 3. Editor Interaction & Focus / Selection Protocol

### 3.1 Non-Stealing Toolbar Controls
- Popover triggers use `type="button"` and `onMouseDown={(e) => e.preventDefault()}`.
- Preset color swatches, reset buttons, and custom apply buttons include `onMouseDown={(e) => e.preventDefault()}` to prevent the browser from blurring the editor textarea or clearing the selection range.

### 3.2 Post-Commit Layout Effect
- Formatting operations route through `executeFormatting`:
  - `savedSelectionRef.current` and `pendingSelectionRef.current` capture the target text boundaries.
  - Updates commit synchronously to `undoStackRef.current` and React state.
  - The existing `useIsomorphicLayoutEffect` restores `textarea.setSelectionRange(start, end)` before the browser paints. No fragile `setTimeout` is used.

### 3.3 Keyboard and Undo/Redo Integration
- `Ctrl+Z` (Undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (Redo) cleanly restore both the exact Markdown source and selection bounds.
- Forms are never submitted on toolbar interactions.

---

## 4. Test Verification & Results

### 4.1 Unit Tests (`scripts/test_markdown_styles_unit.mjs`)
12 / 12 unit tests passed:
- `applyStyleToText`: apply color to raw text (PASS)
- `applyStyleToText`: apply background highlight to raw text (PASS)
- `applyStyleToText`: merge color into existing highlight span (PASS)
- `applyStyleToText`: merge highlight into existing color span (PASS)
- `applyStyleToText`: update existing color to new color (PASS)
- `applyStyleToText`: reset color leaving highlight intact (PASS)
- `applyStyleToText`: reset highlight unwrapping span completely (PASS)
- `applyStyleToText`: selection within inner text of span (PASS)
- `applyStyleToText`: caret inside span without selection (PASS)
- `applyStyleToText`: wrap selection containing markdown formatting (PASS)
- `isValidCssColor`: reject malicious injections (`javascript:`, `expression`, `url`) (PASS)
- `isValidCssColor`: accept valid hex, rgb, rgba, hsl, and keywords (PASS)

### 4.2 Playwright Browser Acceptance Suite (`scripts/test_blog_editor_color_highlight.mjs`)
12 / 12 automated acceptance criteria passed:
```json
{
  "Apply Text Color": {
    "pass": true,
    "computedColor": "rgb(225, 29, 72)"
  },
  "Apply Highlight": {
    "pass": true,
    "computedBg": "rgb(254, 240, 138)"
  },
  "Change Existing Color": {
    "pass": true
  },
  "Remove Text Color": {
    "pass": true
  },
  "Remove Highlight": {
    "pass": true
  },
  "Color over Markdown Formatting": {
    "pass": true,
    "strongColor": "oklch(0.97 0.004 260)"
  },
  "Selection Preservation": {
    "pass": true,
    "sel": {
      "start": 35,
      "end": 39,
      "selected": "Beta"
    }
  },
  "Undo & Redo for Colors": {
    "pass": true
  },
  "Save & Reload Persistence": {
    "pass": true
  },
  "Split View Rendering": {
    "pass": true
  },
  "Public Blog Page Rendering": {
    "pass": true
  },
  "Malicious Value Rejection": {
    "pass": true
  }
}
```

### 4.3 Existing Toolbar Regression Suite (`scripts/test_blog_editor_toolbar_root_cause.mjs`)
15 / 15 toolbar controls verified 100% functional:
- Bold: PASS
- Italic: PASS
- Strikethrough: PASS
- H1: PASS
- H2: PASS
- H3: PASS
- Bulleted List: PASS
- Numbered List: PASS
- Blockquote: PASS
- Code (inline): PASS
- Code (multiline block): PASS
- Insert Link: PASS
- Clear Formatting: PASS
- Undo & Redo: PASS
- Insert Image / Media Library: PASS
- Split View Live Markdown Synchronization: PASS
- Article Save & Reload Persistence: PASS
- Public Blog Article Rendering: PASS

### 4.4 Static Analysis & Build Verification
- TypeScript Check (`npx tsc --noEmit` in `CMS`): **0 errors**
- Next.js Production Build (`npm run build` in `CMS`): **Compiled successfully (0 errors)**
