# Typography, Fonts & Design Tokens Reference

This manual specifies the font families, typography scale, icon packs, and design tokens used throughout the Stocky ecosystem.

---

## 1. Multi-Environment Font Stack Overview

```
+---------------------------------------------------------------------------------------+
| ENV 1: Admin SPA (Ant Design Default)                                                 |
| -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans  |
+---------------------------------------------------------------------------------------+
| ENV 2: Storefront eCommerce (Tailwind CSS)                                            |
| Sans: "Inter" | Display: "Space Grotesk" | Mono: "JetBrains Mono"                     |
+---------------------------------------------------------------------------------------+
| ENV 3: Offline Thermal Receipts (Locally Hosted Woff2 in /fonts/)                    |
| Inter (Variable 400-700) | Roboto (Variable 400-700) | Ubuntu (400, 500, 700)          |
+---------------------------------------------------------------------------------------+
| ENV 4: Dynamic Dashboard Config (DB Driven)                                           |
| settings.dashboard_font_family (e.g. 'Poppins', 'Inter', 'Nunito') & font_size        |
+---------------------------------------------------------------------------------------+
```

---

## 2. Offline Thermal Receipt Fonts (`receipt-fonts.css`)

For POS receipt printing, external font downloads are strictly prohibited to allow 100% offline functionality. Self-hosted `.woff2` files are stored in `public/fonts/`:

```css
/* Inter Variable (400-700) */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('/fonts/Inter.woff2') format('woff2');
}

/* Roboto Variable (400-700) */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('/fonts/Roboto.woff2') format('woff2');
}

/* Ubuntu Static Weights */
@font-face {
  font-family: 'Ubuntu';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Ubuntu-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Ubuntu';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/Ubuntu-700.woff2') format('woff2');
}
```

Receipt configuration in `pos_settings`:
*   `receipt_font_family`: Font stack choice (`Inter`, `Roboto`, `Ubuntu`, or default monospace).
*   `receipt_font_size`: Base size in pixels (default `12px` at print time).

---

## 3. Storefront Tailwind Design Tokens (`tailwind.config.js`)

### Font Families
```javascript
fontFamily: {
  sans: ['"Inter"', ...defaultTheme.fontFamily.sans],
  display: ['"Space Grotesk"', '"Inter"', ...defaultTheme.fontFamily.sans],
  mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
}
```

### Font Size & Line Height Hierarchy
*   `xs`: `['0.75rem',  { lineHeight: '1rem' }]` (12px)
*   `sm`: `['0.875rem', { lineHeight: '1.25rem' }]` (14px)
*   `base`: `['1rem',     { lineHeight: '1.5rem' }]` (16px)
*   `lg`: `['1.125rem', { lineHeight: '1.75rem' }]` (18px)
*   `xl`: `['1.25rem',  { lineHeight: '1.75rem' }]` (20px)
*   `2xl`: `['1.5rem',   { lineHeight: '2rem' }]` (24px)
*   `3xl`: `['1.875rem', { lineHeight: '2.25rem' }]` (30px)
*   `4xl`: `['2.25rem',  { lineHeight: '2.5rem' }]` (36px)
*   `5xl`: `['3rem',     { lineHeight: '1.1' }]` (48px)

### Border Radii
*   `sm`: `6px`
*   `md`: `8px`
*   `lg`: `12px`
*   `xl`: `16px`

---

## 4. Ant Design Theme Engine & Color Tokens (`App.vue`)

```javascript
const theme = computed(() => ({
  algorithm: ui.dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
  token: {
    colorPrimary: ui.primaryColor, // Default: #6d28d9
    borderRadius: 10,
    ...(ui.dark ? {} : { colorBgLayout: '#fafafa' }),
  },
}));
```

### Brand Color Tokens
*   **Brand Primary**: `#6d28d9` (Violet 700)
*   **Semantic Success**: `#52c41a` (Green)
*   **Semantic Danger**: `#ff4d4f` (Red)
*   **Semantic Warning**: `#faad14` (Amber)
*   **Semantic Info**: `#1677ff` (Blue)
*   **KPI Positive Delta**: `#52c41a` (`.kpi-delta-up`, font-weight: 600, font-size: 13px)
*   **KPI Negative Delta**: `#ff4d4f` (`.kpi-delta-down`, font-weight: 600, font-size: 13px)

---

## 5. Icon Libraries & Font Systems

Stocky integrates 4 specialized icon libraries:

| Icon Library | Package | Where Used & Purpose |
| :--- | :--- | :--- |
| **Lucide Vue Next** | `lucide-vue-next` (`^1.0.0`) | Primary Admin sidebar navigation icons (26 tree-shaken icons in `menuIcons.js`) |
| **Ant Design Icons** | `@ant-design/icons-vue` (`^7.0.1`) | Functional button icons, fold/unfold toggles, dialog controls |
| **Bootstrap Icons** | `bootstrap-icons` (`^1.13.1`) | Dynamic category & product icons loaded via CSS class (`.bi-*`) |
| **Tabler Icons** | `@tabler/icons-webfont` (`^3.46.0`) | Accounting & reports glyphs, status badges |
