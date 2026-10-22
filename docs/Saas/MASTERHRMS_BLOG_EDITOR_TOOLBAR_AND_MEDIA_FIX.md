# MASTERHRMS Blog Editor Toolbar and Media Library Fix Report

## 1. Executive Summary

This document details the audit, root-cause diagnosis, architectural implementation, and verification of the MASTERHRMS CMS Dedicated Blog Editor (`CMS/src/components/cms/dedicated-blog-editor.tsx`). 

Prior to this fix, the Dedicated Blog Editor provided toolbar controls for formatting (Bold, Italic, Strikethrough, Headings, Lists, Blockquotes, Code, Links, and Clear Formatting), but these controls failed to format highlighted text reliably due to button focus stealing and absence of line-level parsing logic. In addition, there was no integration with the project's existing Media Library for inserting images into Markdown article bodies, and Next.js crashed when rendering arbitrary external image hostnames.

All formatting controls, keyboard shortcuts, undo/redo state stacks, and the Media Library insertion modal have been implemented and empirically validated through Playwright browser automation tests.

---

## 2. Root Cause Analysis

| Component / Feature | Symptom | Underlying Root Cause |
|---|---|---|
| **Toolbar Selection Collapse** | Clicking any toolbar button (e.g., Bold, Italic) did not apply formatting or applied it incorrectly at index 0. | Default browser behavior on button click blurred the `<textarea>` before the `onClick` event fired, resetting `selectionStart` and `selectionEnd`. Resolved by attaching `onMouseDown={(e) => e.preventDefault()}` to all toolbar buttons. |
| **Heading & List Manipulation** | Headings and lists appended `#` or `-` at cursor without accounting for line starts or multi-line selections. | Formatting operations lacked multi-line range detection and regex-based line prefix matching. Resolved with `handleToggleHeading` and `handleToggleList` which operate on line-level boundaries. |
| **Clear Formatting** | Missing or non-functional. | No parser existed to peel away Markdown tokens (`**`, `*`, `~~`, `` ` ``, `#`, `>`, `- `, `1. `) from selected text while preserving inner text. |
| **Media Library Integration** | Authors had to manually type Markdown image tags with guessed URLs; no UI picker existed. | The editor did not wire `MediaPickerModal` (`CMS/src/components/media/media-picker-modal.tsx`) to insert `![alt](url)` at the cursor position. |
| **External Images Crash** | Pasting arbitrary URLs (e.g., `cdn-imagine.vyro.ai` or external CDNs) crashed Next.js with `Invalid src prop on next/image`. | Next.js strictly validates domains in `next/image` unless `unoptimized: true` is set or hostnames are whitelisted. |
| **Uploaded Asset 404s** | `/uploads/...` images uploaded to Express backend failed to load in Next.js. | Next.js had no proxy rewrite routing `/uploads/:path*` to the backend Express server at `http://localhost:4000/uploads/:path*`. |

---

## 3. Architecture and Implementation Details

### 3.1 Textarea Selection Preservation & Formatting Helpers
In `CMS/src/components/cms/dedicated-blog-editor.tsx`:
- **Toolbar Focus Retention**: Every formatting button now has `onMouseDown={(e) => e.preventDefault()}`. This ensures the textarea never loses focus or selection when a button is clicked.
- **Inline Formatting (`handleToggleInline`)**:
  - Handles Bold (`**`), Italic (`*`), Strikethrough (`~~`), and Inline Code (`` ` ``).
  - Detects if text is already wrapped internally (`**selection**`) or externally (`**|selection|**`) and toggles formatting off (unwraps).
  - If no text is selected, inserts placeholder syntax and selects the placeholder for immediate typing.
- **Headings (`handleToggleHeading`)**:
  - Inspects the full line containing the cursor or selection.
  - Toggles between H1 (`# `), H2 (`## `), H3 (`### `), and normal paragraph text.
- **Multi-Line Lists (`handleToggleList`)**:
  - Bullets (`- `) and Numbers (`1. `, `2. `, etc.).
  - Calculates line boundaries for multi-line selections and applies or strips prefixes uniformly.
- **Blockquote (`handleToggleBlockquote`)**:
  - Toggles blockquote syntax (`> `) across all selected lines.
- **Code Insertion (`handleInsertCode`)**:
  - Single-line or inline selection wraps with inline backticks (`` `code` ``).
  - Multi-line selection or empty selection wraps in a fenced Markdown code block (```` ```\n...\n``` ````).
- **Link Insertion (`handleInsertLink`)**:
  - Keyboard shortcut `Ctrl+K` / `Cmd+K` and toolbar button.
  - Automatically detects whether selected text is a URL or link text, crafting valid Markdown links `[text](url)`.
- **Clear Formatting (`handleClearFormatting`)**:
  - Strips all Markdown bold, italic, strikethrough, backticks, headings, blockquotes, and list prefixes from selected text without deleting the content.
- **Undo / Redo History Stack**:
  - Maintains `history: string[]` and `historyIndex: number`.
  - Captures state changes, enabling Undo (`Ctrl+Z`) and Redo (`Ctrl+Y` / `Ctrl+Shift+Z`) as well as dedicated toolbar controls.

### 3.2 Media Library Image Insertion
- Reused the existing `MediaPickerModal` (`CMS/src/components/media/media-picker-modal.tsx`).
- Created `handleOpenBodyImagePicker` which saves current textarea cursor/selection coordinates (`savedSelectionRef`).
- Created `handleInsertBodyImage` which formats the selected media into:
  ```markdown
  ![alt text](imageUrl)
  ```
- Positioned cursor immediately after the inserted image Markdown tag.
- Added a secondary picker for the Article Cover Image and Social Preview Image.

### 3.3 Next.js Image Optimization & Backend Asset Proxying
In `CMS/next.config.ts`:
- Enabled `images: { unoptimized: true }` with wildcard remote patterns to allow authors to paste any image URL from the internet without runtime crashes.
- Added rewrites for `/uploads/:path*` to `http://localhost:4000/uploads/:path*` to seamlessly serve assets uploaded via the Express backend.

---

### 3.4 Smart List Continuation, Tab Indentation & Keyboard Architecture
In `handleTextareaKeyDown` of `CMS/src/components/cms/dedicated-blog-editor.tsx`:
- **Ordered List Auto-Continuation**:
  - Detects active list item pattern `/^(\s*)(\d+)\.\s*(.*)$/`.
  - When Enter is pressed after an item (e.g., `1. First item`), automatically inserts the next line with incremented numbering (`2. `), supporting multi-digit numbers (e.g. `9.` -> `10.`).
  - **Empty Item Exit**: Pressing Enter on an empty item (e.g., `3. ` with no text) clears the prefix on that line and exits the list cleanly.
- **Bulleted List Auto-Continuation**:
  - Detects bullet markers (`- `, `* `, `+ `) with leading indentation.
  - Pressing Enter continues the list with the exact same marker and indentation.
  - Pressing Enter on an empty bullet item exits the list cleanly.
- **Tab & Shift+Tab Indentation**:
  - `Tab`: Indents the current line or multi-line selection by 2 spaces (`  `), creating nested sub-lists without text destruction.
  - `Shift+Tab`: Outdents the line or multi-line selection by up to 2 spaces.
- **Shift+Enter**: Soft line break without list continuation.
- **Form Submission Guard**: Prevents accidental form submissions on Enter.

### 3.5 Explicit HTML Line Break Rendering (`<br>`, `<br/>`, `<br />`) & Renderer Consistency
- Created shared helper `formatMarkdownWithSafeBreaks()` in `CMS/src/lib/markdown.ts`.
- Transforms explicit `<br>`, `<br/>`, and `<br />` tags outside of code blocks into standard Markdown hard breaks (`  \n`).
- Injected into:
  1. `DedicatedBlogEditor` Split View (`CMS/src/components/cms/dedicated-blog-editor.tsx`)
  2. `DedicatedBlogEditor` Live Preview (`CMS/src/components/cms/dedicated-blog-editor.tsx`)
  3. Public Article Renderer `BlogDetailsMarkdown` (`CMS/src/components/blog-details/blog-details-markdown.tsx`)
- **Security & Consistency**:
  - Produces true `<br/>` HTML elements in the DOM.
  - Eradicates literal `<br>` text strings in rendered paragraphs.
  - Preserves literal `<br>` inside fenced code blocks and inline code snippets.
  - Prevents XSS: raw HTML rendering remains disabled; tags like `<script>` or `<img onerror>` are harmlessly escaped.

---

## 4. Verification and Empirical Evidence

- **TypeScript Compilation**: Executed `npx tsc --noEmit` in `CMS/` — passed with 0 errors.
- **Automated Playwright Acceptance Suite (`scripts/test_blog_editor_playwright.mjs`)**:
  - **Bold, Italic, Strikethrough**: Verified on selected text and toggle unwrap.
  - **H1, H2, H3 Headings**: Line-level prefix toggling verified.
  - **Lists**: Multi-line numbered and bulleted lists verified.
  - **[TEST 5b] Ordered List Continuation**: `1. First item` -> Enter -> `2. ` -> type `Second item` -> Enter -> `3. ` -> Enter on empty `3. ` -> clean exit. **PASSED**.
  - **[TEST 5c] Bulleted List Continuation**: `- Alpha item` -> Enter -> `- ` -> Enter on empty bullet -> clean exit. **PASSED**.
  - **[TEST 5d] Tab & Shift+Tab Indentation**: `Tab` indents line to `  - Indent target`; `Shift+Tab` outdents back to `- Indent target`. **PASSED**.
  - **Inline and Block Code**: Single-line and multiline code blocks verified.
  - **Clear Formatting**: Strips all markdown markers while preserving text.
  - **Undo and Redo**: History stack undo/redo operations verified.
  - **[TEST 9b] HTML Line Break Rendering**: `Alpha Line<br>Beta Line<br />Gamma Line` renders 2 `<br/>` DOM tags in Split View; zero literal `<br>` in paragraph text. **PASSED**.
  - **Live Preview & Split View Switching**: Verified state retention.
  - **Media Library Image Insertion**: Modal opens, inserts `![alt](url)` at cursor.
  - **SEO Metadata Panel**: Verified Title, Description, Canonical URL, and live SERP snippet preview.
  - **Public Article Social Share Controls**: Verified LinkedIn, Facebook, X, WhatsApp, Email, and Copy Link toggle.
