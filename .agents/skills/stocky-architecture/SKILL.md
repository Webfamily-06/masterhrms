---
name: stocky-architecture
description: >-
  Comprehensive architectural blueprint, design system, and operational flows for Stocky (Laravel 12 + Vue 3 + Ant Design + POS + Storefront ERP).
  Use this skill whenever cloning, re-architecting, extending, or maintaining Stocky features, including the 32+ module sidebar nodes, offline receipt fonts, QZ-Tray thermal printing, dual-screen customer display, media resizing pipelines, and high-precision financial workflows.
---

# Stocky Architecture & Engineering Runbook

Stocky is an enterprise Point of Sale (POS), Multi-Outlet Inventory Management, and extended ERP suite built on **Laravel 12**, **Vue 3.5**, **Ant Design Vue 4**, **Pinia 4**, and **Tailwind CSS 3**.

When cloning, porting, or rebuilding this system into a new project, follow this skill to guarantee 100% fidelity to the original architecture, design tokens, sidebar nodes, and operational flows.

---

## 1. Portability & Standalone Project Usage

> [!IMPORTANT]
> **This skill directory (`.agents/skills/stocky-architecture/`) is 100% self-contained.**
> 
> When copying only this skill folder into another project repository:
> - **No external source code is required**: You do NOT need the original Stocky source files in the target project. Every database DDL, API schema, UI coordinate, design token, permission slug, and business flow is fully documented within this skill's reference library.
> - **Self-contained specifications**: AI agents reading this skill must NOT attempt to open or inspect external source paths on disk. Instead, treat every rule, code snippet, and configuration key in this skill as the authoritative blueprint to generate, scaffold, or adapt directly in the destination project.

---

## 2. Quick Reference & Mandatory Architectural Rules

Before modifying or writing any code in the target project, strictly adhere to these 5 mandatory architecture rules:

### Rule 1: Passport Cookie Guard with Universal CSRF
Every HTTP request to `/api/` (GETs included) **must** attach the `X-XSRF-TOKEN` cookie header (or `X-CSRF-TOKEN` meta tag). Missing CSRF headers will immediately bounce with `401 Unauthenticated` via Passport's cookie guard. 

**Standard HTTP Client Implementation Pattern** (e.g. in your HTTP utility wrapper `src/lib/http.js`):
```javascript
import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  withCredentials: true, // Sends session and Stocky_token cookies automatically
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Request interceptor ensuring CSRF token is attached
http.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }
  return config;
});

export default http;
```

### Rule 2: No Query Parameters on Built Modules
Never append `?v=` cache-busting queries to `<script type="module" src="/js/app.js">`. Lazy chunks import `../app.js` without queries; a mismatched URL forces the browser to load two separate copies of Vue, crashing with:
```
Cannot read properties of null (reading 'ce')
```

### Rule 3: Universal List Endpoint Query Contract (Rule 0)
Every list API call must pass: `page`, `SortField`, `SortType`, `search`, and `limit`. Laravel controllers pass `$request->SortField` straight to `orderBy()` unchecked; omitting it results in `500 Server Error`.
```http
GET /api/sales?page=1&limit=10&SortField=id&SortType=desc&search=
```

### Rule 4: 3-Decimal Precision Currency Standard
All monetary amounts, line taxes, unit prices, discounts, and inventory balances use `DECIMAL(16, 3)` in MySQL and machine-friendly formatting (`helpers::price_decimals()`, standard dot separator, no thousand grouping) so frontend formatters can safely parse numbers (e.g. `124.500`).

### Rule 5: Offline Receipt Fonts
Receipt rendering must function 100% offline. Never fetch fonts from Google CDN at print time; always serve locally hosted Woff2 binaries via a dedicated CSS file (e.g. `public/css/receipt-fonts.css`):
```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
}
```

---

## 3. Progressive Documentation Modules Index

The complete system blueprint is partitioned across 16 specialized reference documents located in `./references/`:

| Reference Document | Contents & Focus |
| :--- | :--- |
| **[Frontend Core Scaffolding & Stores](./references/frontend_core_scaffolding.md)** | Production-ready Vue Router, Pinia stores (`auth`, `pos`), Ant Design `useCrudTable.js` composable, `lineCalc.js` math engine, and Axios HTTP client. |
| **[Backend Services & Models](./references/backend_services_and_models.md)** | Production-ready Laravel 12 Eloquent models, `WarehouseScope`, `RecordViewScope`, `InventoryMovementService`, and `DoubleEntryService`. |
| **[Master Database Schema & SQL DDL](./references/database_schema_master.md)** | Copy-pasteable SQL DDL for all 35 core tables, foreign keys, indexes, and `DECIMAL(16,3)` standards. |
| **[API Endpoints & Contracts](./references/api_endpoints_and_contracts.md)** | Complete 1,607-operation REST API catalog across 15 domains, 5 surfaces (`admin`, `mobile`, `portal`, `storefront`, `public`), auth, rate limits, and schemas. |
| **[Product Operations Manual](./references/product_operations_manual.md)** | Synthesized 82-chapter operational guide: register workflows, offline IndexedDB POS, QZ-Tray thermal printing, ZATCA Phase 2, and double-entry accounting. |
| **[Sidebar & Navigation Nodes](./references/sidebar_nodes.md)** | Complete 32-group tree, all icons, routes, permissions, badges, and deep-link mappings. |
| **[Placement, Layouts & Themes](./references/placement_layouts.md)** | Exact pixel metrics, sidebar variants (`default`, `large`, `flat`, `dark`), topbar, POS 100vh layout, and customer display. |
| **[UI Widgets & Design System](./references/ui_widgets_and_design_system.md)** | Exact pixel coordinates, guide rails, submenus, pagination contract, responsive breakpoints, border radii, and color tokens. |
| **[Typography, Fonts & Tokens](./references/fonts_typography.md)** | Offline thermal receipt fonts, Tailwind typography, Ant Design theme algorithms, and semantic KPI colors. |
| **[Media & Image Processing](./references/media_pipeline.md)** | Directory tree under `public/images/`, Intervention Image resizing rules, remote/local fallback resolution. |
| **[Operational Business Flows](./references/flows_and_lifecycle.md)** | Step-by-step sequence diagrams: Auth KeepAlive, Fullscreen POS + QZ-Tray, Purchases, Transfers, and Realtime Customer Display. |
| **[Module Workflows & Lifecycles](./references/module_workflows.md)** | In-depth workflows for POS, HRMS, Sales, Purchases, Accounting V2 double-entry, MRP, Fleet, Hospital, School, etc. |
| **[Dashboard & Settings Architecture](./references/dashboard_and_settings.md)** | Admin panel dashboard KPI engine, dynamic grid layout, company admin settings, module flags, receipt designer. |
| **[Storefront UI Structure](./references/storefront_ui_structure.md)** | Frontpage eCommerce UI structure, Blade + Tailwind + Alpine.js, themes, cart drawer, checkout, and SEO. |
| **[Integrations & Connectors](./references/integrations_and_connectors.md)** | Bidirectional pipelines for WooCommerce (44 APIs), Shopify, Salla, QuickBooks Online, Xero, Google Sheets, Slack, and Telegram. |
| **[Setup Files & Server Configs](./references/setup_and_configs.md)** | Complete `.env` keys, multi-app Vite builds, Nginx/Apache, and QZ-Tray silent certificates. |
| **[Cloning & Setup Runbook](./references/cloning_runbook.md)** | Sequential implementation guide for bootstrapping a clone project from database migrations to production bundle builds. |

---

## 4. Subsystem Architecture Map

```
+----------------------------------------------------------------------------------------------------+
|                                    STOCKY MULTI-APP ECOSYSTEM                                      |
+-------------------+--------------------+--------------------+-------------------+------------------+
| 1. Admin SPA      | 2. Fullscreen POS  | 3. Customer Display| 4. Storefront     | 5. Client Portal |
| Vue 3 + Ant Design| Vue 3 + QZ-Tray    | Vue 3 Realtime     | Blade + Tailwind  | Vue 3 Customer   |
| /next/* & /#/*    | /pos               | /customer-display  | /online_store     | /portal          |
+-------------------+--------------------+--------------------+-------------------+------------------+
                                                 │
                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                                    5 REST API SURFACES & GATEWAY                                    |
| 1. Admin API (Bearer Token / Cookie) │ 2. Mobile App API (Passport + FCM) │ 3. Client Portal (Session) |
| 4. Storefront API (Session Guard)    │ 5. Public Stateless Endpoints (Ping, PDF, Webhooks, Callbacks) |
+----------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                                        LARAVEL 12 BACKEND                                          |
| • HTTP Kernel (KeepAlive 10m tick, Multi-Guard: web, api/passport, store, portal)                  |
| • routes/api.php (139KB REST endpoints) | routes/web.php | routes/portal.php                      |
| • Eloquent ORM + 200 Migrations (3-decimal precision, Batch Allocator, Serial Number Movements)    |
+----------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                               HARDWARE, MEDIA & PERIPHERAL LAYER                                   |
| • QZ-Tray Agent (Silent thermal printing, TSPL / ESC-POS, Cash Drawer RJ11 Kick)                  |
| • Real-time WebSockets / Pusher BroadcastChannel ("pos-cart.{screenId}")                           |
| • Intervention Image Engine (Auto-resizing to settings.product_image_max_size / 200x200 Brand)     |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Official Specifications Synthesis

The complete official product documentation and interactive OpenAPI engine have been synthesized into this standalone skill:

1. **REST API Specifications ([./references/api_endpoints_and_contracts.md](./references/api_endpoints_and_contracts.md))**:
   - Covers 1,251 paths and 1,607 REST operations across 15 domains, field validations, `x-permission` slugs, `x-paginated` flags, sample request/response envelopes, base URLs, surface security guards, universal list contracts, and HMAC-SHA256 webhook signatures.
2. **Operations & Hardware Manual ([./references/product_operations_manual.md](./references/product_operations_manual.md))**:
   - Covers all 82 operational sections spanning Getting Started, Foundations, Products & Stock, POS, Sales, Money (Double-Entry Accounting & ZATCA), HRM, Verticals (MRP, Hospital, School, Fleet, Services), Integrations, Reports, and Administration.

---

## 6. Zero-Complications Implementation Roadmap (From Scratch to Full ERP)

To implement or clone Stocky features into any new or existing project without architectural or workflow complications, follow these 6 sequential phases:

```
[Phase 1: Database DDL] ──> [Phase 2: Backend Core] ──> [Phase 3: REST API Layer]
                                                                  │
[Phase 6: Hardware & POS] <── [Phase 5: UI & Design] <── [Phase 4: Frontend Core]
```

1. **Phase 1: Database Foundation**:
   - Run the master DDL script in [./references/database_schema_master.md](./references/database_schema_master.md).
   - Guarantees 35 core tables, relational foreign keys, indexes, and `DECIMAL(16, 3)` currency standard.

2. **Phase 2: Backend Core & Multi-Tenant Scoping**:
   - Implement `WarehouseScope` and `RecordViewScope` from [./references/backend_services_and_models.md](./references/backend_services_and_models.md).
   - Setup Laravel Passport multi-guards (`web`, `api`, `store`, `portal`) and active user middlewares (`Is_Active`, `SessionTimeout`).
   - Register `InventoryMovementService` and `DoubleEntryService`.

3. **Phase 3: REST API Layer**:
   - Follow [./references/api_endpoints_and_contracts.md](./references/api_endpoints_and_contracts.md) to implement endpoints across the 15 functional domains.
   - Enforce Rule 0 (`page`, `limit`, `SortField`, `SortType`, `search`) and validate responses against documented schemas.

4. **Phase 4: Frontend State & Scaffolding**:
   - Install dependencies and configure Vue Router with permission guards from [./references/frontend_core_scaffolding.md](./references/frontend_core_scaffolding.md).
   - Add Pinia stores (`auth.js`, `pos.js`), `useCrudTable.js` composable, `lineCalc.js` mathematical engine, and `http.js` Axios client.

5. **Phase 5: UI Layouts & Design Tokens**:
   - Implement `AdminLayout` and navigation tree using [./references/sidebar_nodes.md](./references/sidebar_nodes.md) and [./references/placement_layouts.md](./references/placement_layouts.md).
   - Apply the 2px submenu guide rail, active slices, responsive breakpoints, and tokens from [./references/ui_widgets_and_design_system.md](./references/ui_widgets_and_design_system.md).

6. **Phase 6: Hardware Peripherals, POS & Build**:
   - Wire QZ-Tray silent thermal receipt printing and RJ11 drawer kick using [./references/cloning_runbook.md](./references/cloning_runbook.md).
   - Configure multi-app Vite bundles and Nginx reverse proxy from [./references/setup_and_configs.md](./references/setup_and_configs.md).

