# MASTERHRMS — Add-on Navigation Architecture & Standalone Module Correction Report

**Document ID**: DOC-SAAS-NAV-001  
**Date**: 2026-10-13  
**Status**: APPROVED & LOCKED  
**Module Scope**: Sidebar Navigation Architecture, Add-On Catalog Registry, E-Commerce Standalone Module, Extensions & Add-ons Isolation  

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 Root Cause
Prior to this correction, the application sidebar (`src/components/dreams-sidebar.tsx`) hardcoded operational e-commerce routes (`/integrations` and `/shopify`) directly inside the **EXTENSIONS & ADD-ONS** section under the `Add-ons & Connectors` submenu:
- `hasWoo` rendered `<Link to="/integrations">WooCommerce Sync</Link>` inside `openMenus.extensions`.
- `hasShopify` rendered `<Link to="/shopify">Shopify Sync</Link>` inside `openMenus.extensions`.
- The **Extensions & Add-ons** section was erroneously overloaded as an operational hub instead of serving strictly as an installation, discovery, and settings-only integration area.
- Full-featured business modules with multiple channel stores (such as WooCommerce and Shopify) lacked an independent application module presence in the main sidebar hierarchy.

### 1.2 Target Resolution
1. **Established Two Distinct Navigation Concepts**:
   - **Extensions & Add-ons**: Retained strictly for add-on discovery (`/marketplace`) and settings-only connectors (`google-workspace`, `tally-importer`, `two-factor-auth`, etc.).
   - **Installed Application Modules**: Full modules expose their own main sidebar entry, submenu, and nested child routes (e.g., `E-COMMERCE`).
2. **Canonical Navigation Metadata Contract**:
   - Extended `unified-catalog.service.ts` with `navigationMode: "extension" | "standalone" | "standalone_with_submenu"`, `navigationLabel`, `navigationIcon`, `navigationGroup`, `navigationOrder`, `navigationRoute`, `navigationChildren`, `requiredProductSlugs`.
3. **Pure Client-Side Navigation Engine**:
   - Authored `src/lib/addon-navigation.ts` with pure resolvers `resolveStandaloneModules` and `resolveExtensionItems`.
   - Guaranteed deduplication: `woocommerce-sync` and `woocommerce-hub` resolve into a single canonical child entry (`/integrations`).
   - Guaranteed independent entitlement: Shopify Sync (`/shopify`) renders strictly when entitled, without depending on WooCommerce.
   - Guaranteed omission: Unentitled modules and child routes are completely omitted.
4. **Sidebar Refactoring**:
   - `DreamsSidebar` renders standalone modules directly before `HRM SUITE`.
   - Auto-expands on active routes (`/integrations`, `/shopify`).
   - Completely cleanses WooCommerce and Shopify from `EXTENSIONS & ADD-ONS`.
5. **Global Search & Breadcrumbs**:
   - Global command palette search group updated to `"E-Commerce"`.
   - Centralized breadcrumb trail updated to `Dashboard > E-Commerce > WooCommerce Sync` and `Dashboard > E-Commerce > Shopify Sync`.

---

## 2. Files Modified & Created

| File | Type | Purpose |
|---|---|---|
| `server/src/services/unified-catalog.service.ts` | Backend Service | Added canonical navigation metadata types (`AddonNavigationMode`, `CatalogNavigationChild`), extended `CatalogProductDefinition` & `CanonicalProductTemplate`, registered navigation fields on `addon_woocommerce_sync`, `addon_woocommerce_hub`, and `addon_shopify_sync`, and passed through in `getCatalog()`. |
| `src/lib/addon-navigation.ts` | Frontend Core Module (New) | Canonical standalone and extension add-on registry and pure resolution functions (`resolveStandaloneModules`, `resolveExtensionItems`, `useAddonNavigation`). |
| `src/components/dreams-sidebar.tsx` | Frontend Component | Integrated `resolveStandaloneModules`, added dynamic standalone modules section before `HRM SUITE`, added `ecommerce` state to `openMenus` with auto-expand, and completely removed e-commerce links from Extensions. |
| `src/routes/_authenticated/_app/route.tsx` | Frontend Route Guard / Layout | Re-grouped search items for WooCommerce Sync and Shopify Sync under group `"E-Commerce"`. |
| `src/lib/breadcrumb-registry.ts` | Frontend Registry | Updated breadcrumb trails for `/integrations` and `/shopify` under category `"E-Commerce"`. |
| `src/tests/addon-navigation-architecture.test.ts` | Test Suite (New) | Automated test suite validating all 15 acceptance criteria (uninstalled absence, standalone module appearance, child filtering, deduplication, independent Shopify visibility, extension vs standalone separation, role guards). |
| `src/tests/breadcrumb-registry.test.ts` | Test Suite | Updated breadcrumb expectation to match new `"Shopify Sync"` label. |
| `docs/Saas/worklog.md` | Documentation | Added Session log and Decision record `D-060`. |

---

## 3. Canonical Navigation Metadata Contract

```typescript
export type AddonNavigationMode = "extension" | "standalone" | "standalone_with_submenu";

export interface CatalogNavigationChild {
  label: string;
  route: string;
  requiredAddonSlug?: string;
  order?: number;
}

export interface CatalogProductDefinition {
  // Existing product fields...
  navigationMode?: AddonNavigationMode;
  navigationLabel?: string;
  navigationIcon?: string;
  navigationGroup?: string;
  navigationOrder?: number;
  navigationRoute?: string;
  navigationChildren?: CatalogNavigationChild[];
  requiredProductSlugs?: string[];
}
```

### Module Registration Example:
```typescript
{
  id: "addon_woocommerce_sync",
  slug: "woocommerce-sync",
  name: "WooCommerce Store Connector",
  productType: "ADDON_INTEGRATION",
  entitlementKey: "woocommerce-sync",
  category: "E-Commerce",
  navigationMode: "standalone_with_submenu",
  navigationLabel: "WooCommerce Sync",
  navigationIcon: "ph-shopping-cart",
  navigationGroup: "E-Commerce",
  navigationOrder: 1,
  navigationRoute: "/integrations",
  requiredProductSlugs: ["woocommerce-sync"],
}
```

---

## 4. Final E-Commerce Parent / Child Navigation Structure

```
SIDEBAR
├── MAIN
│   ├── Dashboards
│   └── Applications
├── POINT OF SALE & INVENTORY
│   └── ...
├── PROCUREMENT
│   └── ...
├── SALES & BILLING
│   └── ...
├── E-COMMERCE                       <-- Standalone Module (renders if entitled)
│   └── E-Commerce [Chevron]
│       ├── WooCommerce Sync (/integrations)  <-- Gated on woocommerce-sync / woocommerce-hub
│       └── Shopify Sync     (/shopify)       <-- Gated independently on shopify-sync
├── HRM SUITE
│   └── ...
├── EXTENSIONS & ADD-ONS             <-- Strictly Discovery & Settings
│   └── Add-ons & Connectors
│       ├── App Marketplace (/marketplace)
│       ├── Google Workspace (/google-workspace)
│       └── ... (Settings-only connectors)
└── SETTINGS & SYSTEM
```

---

## 5. Lifecycle, Entitlement, and Credential States

1. **Uninstalled Add-On**:
   - Sidebar: Omitted completely from the main navigation.
   - Direct Route: Gated by router layout; renders `<AddonNotInstalled>` with HTTP 403 status and direct Marketplace link.
   - Backend APIs: Rejected with 403 `ADDON_REQUIRED`.
2. **Installed, Enabled, Entitled Add-On**:
   - Sidebar: Dynamically rendered under `E-COMMERCE` with chevron dropdown and active-route highlighting.
   - Direct Route: Allows full access to functional hubs (`/integrations`, `/shopify`).
   - Backend APIs: Authorized with valid tenant JWT.
3. **Installed But Missing Store Credentials**:
   - Sidebar: Navigation remains visible and accessible.
   - Page State: Renders a prominent **Setup Required** banner ("Disconnected / Authentication Failed" for WooCommerce, "No Shopify Store Connected Yet" for Shopify).
   - Does not confuse missing credentials with an uninstalled add-on.
4. **Disabled Add-On**:
   - Navigation immediately hides. Direct routes and backend APIs return 403 `ADDON_REQUIRED`.
5. **Tenant Isolation**:
   - All entitlement checks are scoped strictly to `tenantId`. Tenant A's installed modules are completely invisible and inaccessible to Tenant B.

---

## 6. Verification & Automated Test Results

### 6.1 Test Execution Summary
- **Frontend Vitest (`src/tests/addon-navigation-architecture.test.ts`)**: 13/13 PASS (6ms)
- **Frontend Vitest (`src/tests/breadcrumb-registry.test.ts`)**: 7/7 PASS (3ms)
- **Backend Vitest (`server/src/tests/ecommerce-addon-migration.test.ts`)**: 7/7 PASS (59.6s)
- **TypeScript Compilation (`npx tsc --noEmit`)**: EXIT 0 (0 errors)
- **Production Build (`npm run build`)**: EXIT 0 (`built in 15.61s`, 0 errors)

### 6.2 Browser Visual Verification
Conducted live browser verification via Playwright MCP against `http://localhost:5173`:
1. Navigated to `http://localhost:5173/integrations`:
   - E-Commerce standalone module visible in sidebar with active route highlighting on `WooCommerce Sync`.
   - Setup Required alert visible on page.
   - Captured screenshot: `ecommerce_sidebar_scrolled.png`.
2. Clicked `Shopify Sync`:
   - Navigated to `http://localhost:5173/shopify`.
   - Active route highlighted on `Shopify Sync`.
   - Breadcrumb rendered `Dashboard > E-Commerce > Shopify Sync`.
   - Setup Required card rendered on page.
   - Captured screenshot: `shopify_sidebar_scrolled.png`.
3. Scrolled to `EXTENSIONS & ADD-ONS` and expanded `Add-ons & Connectors`:
   - Confirmed `App Marketplace` is present.
   - Confirmed `WooCommerce Sync` and `Shopify Sync` are 100% absent from Extensions.
   - Captured screenshot: `extensions_section_verified.png`.
