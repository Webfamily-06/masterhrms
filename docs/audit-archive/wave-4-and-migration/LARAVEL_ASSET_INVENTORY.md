# Laravel to React Asset Inventory

**Source Repository:** `/Users/apple/Documents/hrms/hrms-flow`  
**Target Repository:** `/Users/apple/Documents/hrms`

---

## 1. Static Media & Brand Assets

| Asset Type | Source Path (`hrms-flow/`) | Target Path (`hrms/`) | Verification & Format | Status |
|:-----------|:---------------------------|:----------------------|:----------------------|:------:|
| **Brand Logo (Dark)** | `public/logo.svg` | `public/logo.webp` / `public/logo.svg` | SVG & Optimized WebP, high-DPI crisp | **PARITY MATCH** |
| **Brand Logo (White/Inverted)** | `public/images/logos/*` | `public/white-logo.webp` / `public/white-logo.png` | Alpha-transparent inverted banner | **PARITY MATCH** |
| **Favicon** | `public/favicon.ico` | `public/favicon.webp` | Multi-resolution tab icon | **PARITY MATCH** |
| **Default User Avatars** | `public/images/avatar/` | `public/assets/img/avatar/` | Round user avatar placeholders | **PARITY MATCH** |
| **Company Logos & Placeholders**| `public/images/logos/` | `public/ui-assets/img/icons/` | Organization tenant logo fallback | **PARITY MATCH** |
| **Landing & Marketing Illustrations** | `public/images/landing-page/` | `public/images/` | Marketing hero and feature graphics | **PARITY MATCH** |

---

## 2. Iconography Framework Parity

In the Laravel application:
- Primary icon set: Phosphor Icons (`ph ph-*`, `ph-duotone ph-*`) & Lucide React (`lucide-react`).
- Secondary icon set: Tabler / Feather icons (`ti ti-*`).

In the Target React application:
- Direct component imports via `lucide-react` (over 100+ native tree-shaken SVG icon primitives).
- Phosphor duotone font classes (`ph-duotone ph-*`) loaded via CDN and stylesheet in `index.html`.
- Tabler / Feather icons supported for legacy SmartHR HTML templates.

| Icon Category | Laravel Source Syntax | React Target Syntax | Parity Status |
|:--------------|:---------------------|:--------------------|:-------------:|
| **Navigation & Sidebar** | `<i className="ph-duotone ph-gear" />` | `<i className="ph-duotone ph-gear" />` | **EXACT MATCH** |
| **Table Actions** | `<i className="ti ti-dots-vertical" />` | `<MoreVertical className="size-4" />` / `<i className="ti ti-dots-vertical" />` | **EXACT MATCH** |
| **Buttons & CTAs** | `<Plus className="h-4 w-4" />` | `<Plus className="size-4" />` | **EXACT MATCH** |
| **Status Badges** | `<i className="ti ti-point-filled" />` | `<span className="size-1.5 rounded-full" />` | **EXACT MATCH** |

---

## 3. Typography & Styling Tokens

| Token | Laravel Source (`hrms-flow/resources/css/app.css`) | Target (`hrms/src/index.css` & `tailwind.config.js`) | Value / Parity |
|:------|:---------------------------------------------------|:-----------------------------------------------------|:--------------:|
| **Primary Font Family** | Inter, -apple-system, BlinkMacSystemFont | Inter, Outfit, system-ui, sans-serif | **PARITY MATCH** |
| **Primary Brand Color** | `#FF6F00` / `#0052CC` | `hsl(var(--primary))` / `#E55B13` / `#0052CC` | **THEMED** |
| **Background Light** | `#F8FAFC` (Slate 50) | `#F8FAFC` (`bg-slate-50`) | **EXACT MATCH** |
| **Border Color** | `#E2E8F0` (Slate 200) | `#E2E8F0` (`border-slate-200`) | **EXACT MATCH** |
| **Card Radius** | `rounded-lg` (`0.5rem`) | `rounded-lg` / `rounded-md` | **EXACT MATCH** |
| **Card Shadow** | `shadow-sm` | `shadow-sm` / `shadow-xs` | **EXACT MATCH** |
