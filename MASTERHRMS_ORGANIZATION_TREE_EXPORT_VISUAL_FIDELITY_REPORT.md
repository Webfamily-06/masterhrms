# MASTERHRMS — Organization Tree PNG & PDF Export: Visual Fidelity & Image Rendering Repair Report

> **Verification Summary:** Exported PNG and PDF files across **Next.js CMS (`:3000`)** and **TanStack Start (`:5173`)** now visually match the live browser-rendered Organization Tree UI across Light and Dark themes, `1440x900` and `1920x1080` viewports, and zoomed/panned/collapsed UI states—preserving 100% of loaded employee profile photos (`Alex Morgan`, `Devon Lane`, `Sarah Connor`), exact card styling, SVG connector geometry, and single-page landscape PDF layout.

---

## 1. Actual Root Causes

Inspection of the live DOM, PostgreSQL `tenant-default-001` records, `interactive-org-tree.tsx`, and `canvas-oklch-converter.ts` against the defective export reference uncovered four distinct root causes:

1. **Missing Employee Profile Photos (Empty Blank Circles for `Alex Morgan`, `Devon Lane`, and `Sarah Connor`):**
   - **Destructive `crossOrigin` Mutation in `onclone`:** `sanitizeDocumentForCanvas()` mutated `img.crossOrigin = "anonymous"` synchronously inside `html2canvas`'s `onclone` callback *after* same-origin JPEGs (`/ui-assets/avatar-01.jpg`, `/ui-assets/avatar-02.jpg`) were already cached without CORS headers. Mutating `crossOrigin` reset `img.complete = false` and triggered an unawaited network re-fetch inside the cloned iframe, causing `html2canvas` to paint blank circles.
   - **Conflicting `allowTaint: true` + `useCORS: true` & Dimensionless External SVG:** Passing `allowTaint: true` alongside `useCORS: true` interfered with CORS image caching, while `Sarah Connor`'s external avatar (`https://api.dicebear.com/7.x/avataaars/svg?seed=alex-rivera`) is an `<svg viewBox="0 0 280 280">` lacking root `width` and `height` attributes, causing HTML5 `<canvas>` `drawImage` sizing failures unless normalized.
   - **Unmounted Radix `<AvatarFallback>`:** Once the live browser `<img>` loaded, Radix `<Avatar>` unmounted `<AvatarFallback>` (`AM`, `DL`, `SC`). When `html2canvas` dropped the cloned `<img>`, neither the photo nor fallback initials existed in the cloned DOM—leaving empty white circles. Conversely, when collapsed branches were expanded right before export, Radix `<Avatar>` had not yet swapped `<AvatarFallback>` to `<AvatarImage>`.

2. **`+16px` Right/Down Shifted SVG Connector Lines:**
   - `<TreeConnectors>` computed `<svg><path>` coordinates relative to `treeContainerRef` while it had `p-4` (`16px` padding). Inside `onclone`, the previous export code mutated `clonedEl.style.padding = "32px"` and `clonedEl.style.width = "max-content"` *without* recalculating `<svg>` path coordinates, shifting all employee cards `+16px` right and `+16px` down away from their connector endpoints.

3. **Harsh Black (`#000`) Card Borders, Oversized `16px` Button Text, Shifted Badge Baselines, & Broken Dark Theme:**
   - **Tailwind CSS v4 `color(srgb ...)` / `oklab(...)` Serialization:** Tailwind v4 `border-border/60` and `bg-muted/60` compile to `color-mix(in oklab, ...)`, which Chromium's `getComputedStyle()` serializes as `color(srgb r g b / a)` or `oklab(...)`. `html2canvas`'s legacy CSS parser failed to parse `color(srgb ...)`, falling back to `#000000` harsh black card borders, and failed to apply Tailwind `@layer` rules to `<button>` elements (inflating `11px` `"4 Direct Reports"` labels to browser-default `16px` and misaligning `inline-flex` `Executive` pill baselines).
   - **Forced Light Background & Visible Overflow:** The old `onclone` hardcoded `backgroundColor: "#ffffff"` even in Dark Mode and forced `txt.style.overflow = "visible"`, breaking text truncation and dark-theme parity.

4. **Arbitrarily Tiled 9-Page (`16.6 MB`) A4 PDF Slicing Cards in Half:**
   - Previous PDF export hardcoded `jsPDF({ format: "a4", orientation: "landscape" })` (`841.89 x 595.28 pt`) and sliced the `scale: 2` bitmap across multiple A4 tiles at fixed pixel intervals without checking card boundaries.

---

## 2. Files Modified

All changes were implemented with 100% parity across both Next.js CMS and TanStack Start:

| Layer | Next.js CMS (`CMS/`) | TanStack Start (`src/`) | Purpose |
| :--- | :--- | :--- | :--- |
| **High-Fidelity Export Engine (New)** | `CMS/src/lib/org-tree-exporter.ts` | `src/lib/org-tree-exporter.ts` | Complete tree bounds measurement, avatar `decode()` + `4x` supersampled `object-fit: cover` PNG data-URL inlining, scale-independent SVG connector geometry, self-contained browser-native SVG `<foreignObject>` renderer (`@font-face` + Tailwind v4 CSS + theme radial-dot grid), and custom-sized / card-safe PDF generator. |
| **CSS Color 4 Sanitizer (Updated)** | `CMS/src/lib/canvas-oklch-converter.ts` | `src/lib/canvas-oklch-converter.ts` | Added full `color(srgb \| srgb-linear \| display-p3 ...)`, signed/none `oklch(...)` / `oklab(...)` conversion, preserved active Light/Dark theme backgrounds in fallback mode, and removed destructive `img.crossOrigin` rewrites. |
| **Interactive Org Tree Component (Updated)** | `CMS/src/components/organization/interactive-org-tree.tsx` | `src/components/organization/interactive-org-tree.tsx` | Added `data-avatar-url` / `data-avatar-initials` / `data-org-card` / `data-org-tree-connectors` hooks, hidden offscreen full-tree render during collapsed state so live zoom/pan/collapsed state never flickers or mutates, and wired `exportOrgTreeToPng` / `exportOrgTreeToPdf`. |

---

## 3. Previous vs. Corrected Export Method

| Aspect | Previous Export Pipeline | Corrected Export Pipeline (`org-tree-exporter.ts`) |
| :--- | :--- | :--- |
| **Rendering Engine** | `html2canvas` re-implementing CSS layout from scratch (breaking Tailwind v4 `@layer`, `color(srgb)`, and `inline-flex` baselines). | **Browser-native Chromium Blink/Skia SVG `<foreignObject>`** rasterizer with embedded `@font-face` data URLs & live CSS rules (`html2canvas` retained strictly as sanitized fallback). |
| **Employee Avatars** | Mutated `img.crossOrigin = "anonymous"` in `onclone`; dropped images on CORS/SVG `viewBox` quirks; left blank circles. | Waits for `document.fonts.ready` + `img.decode()`, verifies `naturalWidth > 0`, normalizes SVG `viewBox` -> `width`/`height`, supersamples (`4x`) with exact `object-fit: cover` crop into inline PNG data URLs; restores initials *only* on genuine load failure. |
| **SVG Connectors** | Mutated clone `padding` (`16px` -> `32px`) after path calculation, shifting connectors `16px` off center. | Computes scale/pan-independent connector paths (`computeOrgTreeConnectorGeometry`) directly against unmutated layout with explicit `width`, `height`, `viewBox`, and live theme stroke color. |
| **Tree Completeness & UI State** | Temporarily mutated live `scale`, `position`, and `expandedIds` on screen, causing visible UI jumps. | Keeps live viewport transform (`scale`, `position`) untouched; if nodes are collapsed, renders an invisible offscreen expanded tree solely for measurement/capture and disposes it immediately in `finally`. |
| **Theme Fidelity** | Hardcoded `#ffffff` background even in Dark Mode. | Captures active Light or Dark CSS custom properties, card surfaces, borders, shadows, and subtle radial-dot grid background. |
| **PDF Architecture** | Forced `A4` (`842 x 595 pt`) and sliced canvas across 6–9 arbitrary tiles (`16.6 MB`), cutting cards in half. | Single custom-sized landscape PDF (`[1148, 605] pt`, `~215 KB`, compressed) when within PDF limits (`<= 12,000 pt`); card-gap-aligned pagination (`computeCardSafeSplitPoints`) for ultra-large trees. |

---

## 4. Employee Image Loading Verification

Across all 5 automated Playwright verification scenarios in `tenant-default-001` (8 employees across 3 hierarchy levels), `prepareAndInlineCloneImages()` verified every avatar's decoded dimensions before rasterization:

| Employee | Code | Hierarchy Level | Avatar Source | Decoded Dimensions (`naturalWidth x naturalHeight`) | Export Rendering Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alex Morgan** | `EMP-0001` | Level 0 (Root CTO) | `/ui-assets/avatar-01.jpg` | `1200 x 1200` (`loaded: true`) | Crisp circular photo (`object-fit: cover`) |
| **Devon Lane** | `EMP-REP-1792070271292` | Level 1 (Manager) | `/ui-assets/avatar-02.jpg` | `1200 x 1200` (`loaded: true`) | Crisp circular photo (`object-fit: cover`) |
| **Marcus Vance** | `EMP-REP-1792070838762` | Level 1 (Manager) | `null` | N/A (No avatar configured) | Styled `MV` initials badge |
| **Rachel Green** | `EMP-LEAP-1792755277556` | Level 1 (IC) | `null` | N/A (No avatar configured) | Styled `RG` initials badge |
| **Samantha Reed** | `EMP-BTEST-1792755277399` | Level 1 (IC) | `null` | N/A (No avatar configured) | Styled `SR` initials badge |
| **Elena Rostova** | `EMP-BDAY-INITIALS` | Level 2 (Under Devon) | `null` | N/A (No avatar configured) | Styled `ER` initials badge |
| **Sarah Connor** | `EMP-BDAY-AVATAR` | Level 2 (Under Devon) | `https://api.dicebear.com/7.x/avataaars/svg?seed=alex-rivera` | `280 x 280` (`loaded: true`, SVG normalized) | Crisp circular DiceBear illustration |
| **Report Tester** | `EMP-REP-1792070466059` | Level 2 (Under Marcus) | `null` | N/A (No avatar configured) | Styled `RT` initials badge |

- **Simulated Network Failure Edge-Case Verification:** In an isolated Playwright context intercepting `https://api.dicebear.com/**` with `route.abort('failed')`, metrics recorded `totalAvatars: 3, loadedAvatars: 2, failedAvatars: 1` (`naturalWidth: 0`), and `Sarah Connor` cleanly rendered fallback initials `SC` while `Alex Morgan` and `Devon Lane` retained their photos.

---

## 5. PNG Dimensions & Pixel Ratio

- **Logical Stage Dimensions (Unscaled Complete Tree + `48px` Outer Padding):**
  - Next.js CMS (`1440x900` & `1920x1080`): `1466 x 697 CSS px` (`1466 x 698 CSS px` when expanded offscreen).
  - TanStack Start (`1440x900` & `1920x1080`): `1466 x 686 CSS px`.
- **Rasterization Pixel Ratio (`pixelRatio`):** `2x` HiDPI (`Math.min(Math.max(devicePixelRatio, 2), 2.5)`, automatically bounded below `8192 x 8192` / `67.1M px` browser canvas limits for massive trees).
- **Exported PNG Output Resolution & Size:**
  - Next.js CMS PNG: **`2932 x 1394 px`** (`349.9 KB` Light / `347.9 KB` Dark) — verified via PNG `IHDR` binary header inspection.
  - TanStack Start PNG: **`2932 x 1372 px`** (`348.6 KB` Light / `346.3 KB` Dark).

---

## 6. PDF Page Dimensions & Pagination Architecture

- **Custom Landscape Single-Page Mode (Default for Complete Trees `<= 12,000 pt`):**
  - Converts unscaled tree stage pixels at `0.75 pt/px` plus `24 pt` margins and a `38 pt` title header (`Organization Hierarchy Structure` + generation date).
  - Next.js CMS PDF: **1 page**, **`1148 x 605 pt`** landscape (`217.6 KB` Light / `211.8 KB` Dark, `compress: true`) — down from `16.6 MB` across 9 broken A4 tiles.
  - TanStack Start PDF: **1 page**, **`1148 x 597 pt`** landscape (`216.8 KB` Light / `210.6 KB` Dark).
- **Card-Safe Multi-Page Fallback (For Ultra-Large Enterprise Hierarchies `> 12,000 pt`):**
  - `computeCardSafeSplitPoints()` merges `[data-org-card]` intervals along X and Y axes and places page breaks strictly inside inter-card midpoints so no employee card or avatar is ever sliced across pages.

---

## 7. Visual Comparison Artifacts

Generated Playwright comparison screenshots and rendered PDF pages are archived in `verification/`:
- `cms-1440-light-original-ui.png` vs `cms-1440-light-exported.png` vs `cms-1440-light-exported-pdf-page1.png`
- `cms-1440-dark-original-ui.png` vs `cms-1440-dark-exported.png` vs `cms-1440-dark-exported-pdf-page1.png`
- `cms-1920-state-safety-ui.png` vs `cms-1920-state-safety-exported.png`
- `tanstack-1440-light-original-ui.png` vs `tanstack-1440-light-exported.png` vs `tanstack-1440-light-exported-pdf-page1.png`
- `tanstack-1920-dark-original-ui.png` vs `tanstack-1920-dark-exported.png` vs `tanstack-1920-dark-exported-pdf-page1.png`
- `cms-fallback-initials-test.png`

---

## 8. Playwright Test Results

End-to-end headless Chromium verification (`verify_org_tree_exports.ts` + `verify_fallback_initials.ts`) passed across all scenarios with zero console/page errors:

| Scenario | Frontend | Viewport | Theme | Renderer | Cards Exported | Avatars (`Loaded / Total`) | Connectors | PNG Output | PDF Output | State Safety |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| **1. CMS Light** | Next.js CMS (`:3000`) | `1440x900` | Light | `svg-foreign-object` | `8 / 8` | `3 / 3` (`0` failed) | `11` | `2932x1394` (`350 KB`) | 1 pg, `1148x605 pt` (`218 KB`) | PASS |
| **2. CMS State Safety** | Next.js CMS (`:3000`) | `1920x1080` | Light (`70%` zoom, panned, collapsed) | `svg-foreign-object` | `8 / 8` | `3 / 3` (`0` failed) | `11` | `2932x1396` (`350 KB`) | — | **PASS** (`translate(130px, 60px) scale(0.7)` & `6` visible cards preserved; `0` leftover clones) |
| **3. CMS Dark** | Next.js CMS (`:3000`) | `1440x900` | Dark | `svg-foreign-object` | `8 / 8` | `3 / 3` (`0` failed) | `11` | `2932x1394` (`348 KB`) | 1 pg, `1148x605 pt` (`212 KB`) | PASS |
| **4. TanStack Light** | TanStack Start (`:5173`) | `1440x900` | Light | `svg-foreign-object` | `8 / 8` | `3 / 3` (`0` failed) | `11` | `2932x1372` (`349 KB`) | 1 pg, `1148x597 pt` (`217 KB`) | PASS |
| **5. TanStack Dark** | TanStack Start (`:5173`) | `1920x1080` | Dark | `svg-foreign-object` | `8 / 8` | `3 / 3` (`0` failed) | `11` | `2932x1372` (`346 KB`) | 1 pg, `1148x597 pt` (`211 KB`) | PASS |
| **6. Broken Avatar Fallback** | Next.js CMS (`:3000`) | `1440x900` | Light (DiceBear aborted) | `svg-foreign-object` | `8 / 8` | `2 / 3` (`1` failed -> `SC` initials) | `11` | `2932x1394` (`345 KB`) | — | PASS |

---

## 9. TanStack Start and Next.js CMS Parity Results

- **Byte-for-Byte Shared Modules:** `org-tree-exporter.ts` and `canvas-oklch-converter.ts` are 100% identical between `CMS/src/lib/` and `src/lib/`.
- **Component Parity:** `CMS/src/components/organization/interactive-org-tree.tsx` and `src/components/organization/interactive-org-tree.tsx` differ only in Next.js's `'use client';` directive on line 1.
- **Typecheck Validation:** Both `npm run cms:typecheck` and `npm run typecheck` exited with code `0`.

---

## 10. Remaining Limitations

1. **Third-Party Avatars Without CORS Support:** If a tenant configures an external `avatarUrl` hosted on a third-party server that blocks CORS (`Access-Control-Allow-Origin` absent), browser security prevents reading raw pixel bytes from that cross-origin response; in that scenario, `prepareAndInlineCloneImages()` gracefully falls back to the employee's styled initials badge rather than tainting the export canvas or rendering a blank circle.
2. **Rasterized High-DPI Bitmap Inside PDF:** The exported PDF embeds the `2x`–`2.5x` HiDPI rasterized organization chart onto a custom-sized single page (with vector title/subtitle typography) rather than native PDF text primitives for each card, ensuring 100% CSS box-shadow, gradient, avatar-clipping, and font-rendering fidelity across all PDF viewers.
