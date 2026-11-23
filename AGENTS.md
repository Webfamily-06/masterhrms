# Workspace Agent Instructions

When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.

---

# Master HRMS — Root UI & Design System Enforcement Standard

## 1. Authoritative Root Theme Principle
The UI architecture, design tokens, component library, and layout structures established in `HRMS-HTML/` and showcased across the 32 Root UI pages (`/ui-*`, `/form-*`, `/tables-*`, `/chart-*`) represent the **MANDATORY ROOT STANDARD** for the entire Master HRMS platform.

**ALL upcoming and existing pages, sections, widgets, modals, forms, and elements created or refactored MUST strictly conform to this Root Theme and Structure.**

---

## 2. Core Architectural & Component Standards

### A. Typography & Page Layout Containers
- **Root Page Wrapper**: Every workspace page under `CMS/src/app/(workspace)/...` MUST be structured inside:
  ```tsx
  <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
    <PageHeader
      title="Page Title"
      description="Brief descriptive subtitle explaining module capabilities."
      actions={<Button variant="primary">Primary Action</Button>}
    />
    {/* Page Content: KPI Cards, Data Tables, Charts, Form Panels */}
  </div>
  ```
- **Heading Scale**: H1 (`text-xl font-bold tracking-tight text-foreground`), H2 (`text-lg font-bold`), H3 (`text-base font-semibold`).

### B. Icons & Symbols (Zero Raw Emojis)
- Use ONLY the 4 official vector icon font families loaded in `(workspace)/layout.tsx`:
  - **Phosphor Icons**: `<i className="ph ph-*" />` or `<i className="ph-duotone ph-*" />`
  - **Tabler Icons**: `<i className="ti ti-*" />`
  - **Lucide Icons**: `<i className="icon icon-*" />` or Lucide React components
  - **FontAwesome 6.5.1**: `<i className="fa-solid fa-*" />`
- **NEVER** use unstyled raw emojis or unicode approximations.

### C. Color Tokens & Semantic Accents
- **Primary**: `#0d6efd` (`bg-primary`, `text-primary`, `border-primary`)
- **Dark / Slate**: `#0f172a` (`bg-slate-900`, `text-slate-900`, `dark:bg-card`)
- **Success**: `#16a34a` (`bg-emerald-600`, `text-emerald-600`)
- **Warning**: `#f59e0b` (`bg-amber-500`, `text-amber-600`)
- **Danger / Error**: `#e11d48` (`bg-rose-600`, `text-rose-600`)
- **Info**: `#0284c7` (`bg-sky-600`, `text-sky-600`)
- **Soft / Ghost Accents (10% Alpha)**: Use `bg-*-500/10 text-*-600 border border-*-500/20` for badges, subtle notifications, and icon badges.

### D. Component Library Primitives
1. **Alerts**:
   - Import from `@/components/ui/alert`.
   - Use variants: `primary`, `dark`, `warning`, `info`, `success`, `danger`, `ghost-*`, `border-*`, `outline-*`.
   - Include contextual Phosphor icons and dismiss handlers where appropriate.
2. **Buttons**:
   - Import from `@/components/ui/button`.
   - Use variants: `primary`, `secondary`, `destructive`, `outline`, `ghost`, `soft` (`bg-primary/10`), `success`, `warning`.
   - Sizing: `xs`, `sm`, `default` (md), `lg`.
3. **Badges**:
   - Import from `@/components/ui/badge`.
   - Prefer soft ghost variants: `soft`, `success`, `warning`, `info`, `purple`.
4. **Cards & KPI Metric Cards**:
   - Use `<Card>` from `@/components/ui/card` or `<StatCard>` from `@/components/ui/stat-card`.
   - Always include borders `border border-border/80 rounded-xl bg-card shadow-xs`.
5. **Modals & Dialogs**:
   - Modern Web Guidance compliant native `<dialog>` or Radix `<Dialog>` with `showModal()`.
   - Auto-manage backdrop light dismiss and safe autofocus on cancellation controls.
6. **Data Tables & Lists**:
   - Container: `<div className="overflow-x-auto border border-border/80 rounded-lg">`.
   - Headers: `<th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">`.
   - Rows: Alternating hover states `hover:bg-muted/40 transition-colors`.
7. **Charts & Telemetry**:
   - ALWAYS use declarative `react-apexcharts` dynamically imported with `{ ssr: false }` inside `<Suspense>`.
   - NEVER inject vanilla DOM-manipulating chart scripts into React Virtual DOM containers.
8. **Documentation & Showcases**:
   - Use `<PreviewCard title="..." code="...">` from `@/components/ui/preview-card` with interactive "Show Code" / "Show Preview" toggle and single-click copy feedback.

---

## 3. Strict Compliance Protocol
Whenever creating a new page or editing an existing component:
1. Verify layout uses standard `max-w-7xl mx-auto` and `PageHeader`.
2. Verify all buttons, badges, tables, and alerts import from `@/components/ui/...`.
3. Verify all icons use standard Phosphor/Tabler/Lucide classes.
4. Verify all endpoints use live realtime safe unwraps `res?.data || res || {}`.
5. Verify zero console errors and hydration warnings in browser testing.

