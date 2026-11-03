# MASTERHRMS — ROOT UI DESIGN SYSTEM & DESIGN TOKEN AUDIT

**Document Target:** Root Typography, Theme Variables, Color Palettes, Design Tokens & Component Styling  
**Date of Audit:** November 3, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering Team  
**Audit Scope:** Full Repository UI System (`src/styles.css`, `vite.config.ts`, `src/components/ui/*`, `src/routes/*`)  
**Status:** COMPLETE DESIGN SYSTEM AUDIT

---

## 1. ROOT DESIGN SYSTEM ARCHITECTURE

MasterHRMS is built on **Tailwind CSS v4** utilizing `@tailwindcss/vite` and an authoritative **Sneat Pro / shadcn-compatible Design System** defined in [`src/styles.css`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css).

### 1.1. Root Typography Stack

The application's global typography is declared at the root level in `src/styles.css:12-29` and mapped to Tailwind `--font-sans` and `--font-mono`:

```css
html,
html:not([data-theme]),
body {
  font-family: "Public Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

button, input, optgroup, select, textarea,
[data-radix-portal], [data-radix-popper-content-wrapper],
[role="dialog"], [role="menu"], [role="tooltip"], [role="listbox"] {
  font-family: inherit;
}

@theme inline {
  --font-sans: "Public Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  ...
}
```

- **Primary Font Family:** `"Public Sans"` (primary brand typeface), followed by `Inter`, and OS-native system fallbacks.
- **Monospace Font Stack:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`.
- **Global Reset & Portals:** Radix portals, popper wrappers, dialogs, and form elements are explicitly forced to inherit the root font stack, ensuring typography consistency across dynamically mounted overlays.

---

## 2. THEME COLOR SYSTEM & CSS TOKENS (OKLCH SPECIFICATION)

The color system is defined in modern perceptual **OKLCH color space** with complete dual-mode support (Light Mode `:root` and Dark Mode `.dark`):

| Token Name | Light Mode Value (`:root`) | Dark Mode Value (`.dark`) | Semantic Business Purpose |
|---|---|---|---|
| `--radius` | `0.5rem` (8px) | `0.5rem` (8px) | Base component border radius. |
| `--background` | `oklch(0.985 0.002 260)` | `oklch(0.155 0.025 265)` | Primary page canvas background. |
| `--foreground` | `oklch(0.22 0.035 265)` | `oklch(0.97 0.004 260)` | Primary high-contrast body text. |
| `--card` | `oklch(1 0 0)` (#ffffff) | `oklch(0.195 0.028 265)` | Card, table and surface container background. |
| `--card-foreground` | `oklch(0.22 0.035 265)` | `oklch(0.97 0.004 260)` | Card body text. |
| `--primary` | `oklch(0.55 0.22 280)` (#7367F0) | `oklch(0.68 0.19 280)` | Sneat Pro brand purple (buttons, active states). |
| `--primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.155 0.025 265)` | Contrast text on primary elements. |
| `--secondary` | `oklch(0.96 0.01 260)` | `oklch(0.265 0.03 265)` | Subdued button and chip backgrounds. |
| `--secondary-foreground`| `oklch(0.30 0.04 265)` | `oklch(0.97 0.004 260)` | Contrast text on secondary elements. |
| `--muted` | `oklch(0.96 0.008 260)` | `oklch(0.265 0.03 265)` | Table header, subtle fill and inactive backgrounds. |
| `--muted-foreground` | `oklch(0.56 0.025 265)` | `oklch(0.68 0.025 260)` | Secondary labels, timestamps, and placeholder text. |
| `--accent` | `oklch(0.94 0.025 265)` | `oklch(0.265 0.03 265)` | Hover states on menus and list rows. |
| `--destructive` | `oklch(0.62 0.22 25)` | `oklch(0.65 0.21 25)` | Critical errors, terminations, deletion actions. |
| `--success` | `oklch(0.63 0.17 155)` | `oklch(0.68 0.16 155)` | Active status, approved leave, paid payroll. |
| `--warning` | `oklch(0.76 0.16 75)` | `oklch(0.80 0.16 75)` | Pending approvals, probation alerts, expiration tags. |
| `--border` | `oklch(0.91 0.008 260)` | `oklch(1 0 0 / 10%)` | Card borders, table dividers, input outlines. |
| `--input` | `oklch(0.91 0.008 260)` | `oklch(1 0 0 / 14%)` | Input border tokens. |
| `--ring` | `oklch(0.55 0.22 280)` | `oklch(0.68 0.19 280)` | Focus ring indicator for keyboard accessibility. |
| `--sidebar` | `oklch(0.99 0.002 260)` | `oklch(0.18 0.028 265)` | Sidenav background surface. |
| `--sidebar-border` | `oklch(0.91 0.008 260)` | `oklch(1 0 0 / 10%)` | Sidenav right divider. |

---

## 3. DESIGN SYSTEM COMPLIANCE AUDIT & DEVIATIONS

### 3.1. Typography Stack Deviations
While the root CSS explicitly sets `"Public Sans"`, several subsystems and pages introduce competing local typography declarations:

1. **Local `SYSTEM_FONT_STACK` Injections in File Manager Subsystem:**
   - **Locations:**  
     - `src/components/apps/file-manager/share-dialog.tsx:52, 245, 416, 608`
     - `src/components/apps/file-manager/unified-file-manager.tsx:1131, 1150, 1171, 1362`
     - `src/app/share/[token]/page.tsx:17, 151`
   - **Issue:** Components declare a local constant `const SYSTEM_FONT_STACK = '...'` and attach it as inline JSX `style={{ fontFamily: SYSTEM_FONT_STACK }}` instead of utilizing Tailwind font tokens or inheriting from root.
   - **Risk:** Bypasses theme custom fonts configured by tenant white-label branding (`useTenantBranding`).

2. **Hardcoded Print Styles in Employee Profile:**
   - **Location:** `src/routes/_authenticated/hr/employees/$id.tsx:158`
   - **Issue:** Print template defines `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; }`.
   - **Risk:** Generates employee profiles and identity cards in system fonts rather than brand typography.

### 3.2. Color Token Deviations & Hardcoded Hex Values
A repository-wide code scan identified **552 instances of hardcoded hex colors** across application route files, bypassing the semantic CSS variables.

**Significant Hardcoded Hex Instances:**
1. **Meeting Type Colors:**  
   - `src/routes/_authenticated/hr/meetings/types.tsx:40, 61, 130, 134` hardcodes default category color to `#6366f1` (Tailwind Indigo 500) via inline `style={{ backgroundColor: t.color || "#6366f1" }}` instead of using `--primary` or `--chart-1`.
2. **Leave Settings Colors:**  
   - `src/routes/_authenticated/hr/settings.tsx:472, 606, 612, 1302, 1317` hardcodes leave type badges to `#3B82F6` (Tailwind Blue 500) rather than theme status colors.
3. **Print & Letterhead Templates:**  
   - `src/routes/_authenticated/hr/employees/$id.tsx:158-161` uses `#000`, `#111`, `#e5e7eb`, and `#6b7280` directly in `<style>` tags.

### 3.3. Inconsistent Component Border Radius (`rounded-lg` vs `rounded-md`)
- **Input Component (`src/components/ui/input.tsx:11`):** Uses `rounded-lg` (maps to `--radius-lg` = 8px).
- **Textarea Component (`src/components/ui/textarea.tsx:11`):** Uses `rounded-lg` (8px).
- **Select Trigger Component (`src/components/ui/select.tsx:21`):** Uses `rounded-md` (maps to `--radius-md` = 6px).
- **Visual Impact:** In forms where text inputs and select dropdowns are arranged side-by-side (e.g. Employee Wizard Step 1 & Step 3), the inputs display an 8px radius while the dropdown triggers display a 6px radius, creating a visible visual mismatch.

### 3.4. Input Text Size & Mobile Auto-Zoom Disparity
- **`Input` & `Textarea`:** Declares `text-base md:text-sm`. On mobile screens (< 768px), font size is rendered at 16px (`text-base`), which deliberately prevents Apple iOS Safari from triggering disruptive auto-zoom upon field focus.
- **`SelectTrigger` (`src/components/ui/select.tsx:21`):** Declares fixed `text-sm` (14px).
- **Visual Impact:** Tapping a select dropdown on an iPhone triggers iOS viewport zoom, which shifts the navigation bar and modal positioning out of alignment.

---

## 4. LIGHT & DARK THEME COMPATIBILITY

- **Theme Switching Mechanism:** Handled seamlessly via `ThemeToggle` (`src/components/theme-toggle.tsx`) manipulating `document.documentElement.classList.add("dark")`.
- **CSS Variable Inversion:** Backgrounds invert from white (`oklch(1 0 0)`) to rich dark slate (`oklch(0.195 0.028 265)`), and borders dynamically shift from `oklch(0.91 0.008 260)` to `oklch(1 0 0 / 10%)`.
- **Contrast Ratios:** Contrast between `--foreground` and `--background` exceeds **12:1 in Light Mode** and **11.5:1 in Dark Mode**, fully satisfying WCAG 2.1 Level AAA requirements.
- **Defect Identified:** Un-themed third-party ApexCharts and print styles do not invert colors automatically when dark mode is toggled, resulting in dark text rendered on dark card backgrounds in historical chart instances.

