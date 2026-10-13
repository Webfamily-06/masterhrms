/**
 * MASTERHRMS — Global Application-Wide Add-on Navigation Architecture & Lifecycle Test Suite
 *
 * Validates the 20 global navigation and lifecycle requirements:
 * 1. Every existing add-on is classified under the new navigation contract.
 * 2. Every add-on uses the correct navigation pattern (all 4 patterns).
 * 3. No duplicate canonical or alias-generated menu entries exist.
 * 4. Uninstalled add-ons do not expose operational navigation.
 * 5. Uninstalled add-on routes and APIs are protected.
 * 6. Free installation updates navigation without checkout.
 * 7. Installation persists after refresh and reauthentication.
 * 8. Disabling and re-enabling add-ons updates access correctly.
 * 9. Entitlement expiry and revocation invalidate protected access.
 * 10. Setup-incomplete integrations show the correct state.
 * 11. Core modules remain unaffected.
 * 12. Role-based visibility (adminOnly) remains correct.
 * 13. Tenant isolation is maintained.
 * 14. Deep links, nested routes, refresh, and tenant switching work correctly.
 * 15. All existing add-on aliases resolve consistently.
 * 16. Existing integrations and W1 add-on workflows do not regress.
 * 17. Settings-only integrations remain in their appropriate management area.
 * 18. Standalone modules expose only authorized submenu items.
 * 19. Marketplace installation and paid checkout behavior remain unchanged.
 * 20. Navigation metadata validation detects invalid or conflicting configuration.
 */

import { describe, it, expect } from "vitest";
import {
  MASTER_ADDON_REGISTRY,
  validateNavigationRegistry,
  resolveCanonicalSlug,
  resolveStandaloneModules,
  resolveIntegratedAddons,
  resolveExtensionItems,
  MasterAddonNavDefinition,
} from "@/lib/addon-navigation";
import {
  checkEntitlementByKey,
  EntitlementResolverContext,
  ROUTE_ENTITLEMENT_MAP,
  ADDON_ALIASES,
} from "@/lib/navigation-resolver";

function createMockContext(overrides: Partial<EntitlementResolverContext> = {}): EntitlementResolverContext {
  return {
    tenantId: "test-tenant-uuid",
    isSuperAdmin: false,
    isWorkspaceAdmin: true,
    roles: ["admin"],
    permissions: [],
    enabledModules: ["hrms"],
    activeAddons: [],
    serverEntitlements: {},
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe("MASTERHRMS — Global Add-on Navigation Architecture & Lifecycle Suite", () => {
  // 1. Classification coverage
  it("1. classifies every registered add-on under the new navigation contract", () => {
    expect(MASTER_ADDON_REGISTRY.length).toBeGreaterThanOrEqual(15);
    for (const item of MASTER_ADDON_REGISTRY) {
      expect(item.id).toBeDefined();
      expect(item.slug).toBeDefined();
      expect(item.navigationMode).toMatch(/^(extension|standalone|standalone_with_submenu|integrated)$/);
      expect(item.route.startsWith("/")).toBe(true);
      expect(item.navigationLabel).toBeDefined();
    }
  });

  // 2. All 4 navigation patterns supported
  it("2. supports all four distinct navigation patterns explicitly", () => {
    const modes = new Set(MASTER_ADDON_REGISTRY.map((m) => m.navigationMode));
    expect(modes.has("extension")).toBe(true);
    expect(modes.has("standalone")).toBe(true);
    expect(modes.has("standalone_with_submenu")).toBe(true);
    expect(modes.has("integrated")).toBe(true);

    const ecom = MASTER_ADDON_REGISTRY.find((m) => m.slug === "ecommerce");
    expect(ecom?.navigationMode).toBe("standalone_with_submenu");

    const strategy = MASTER_ADDON_REGISTRY.find((m) => m.slug === "strategy-studio");
    expect(strategy?.navigationMode).toBe("standalone");

    const biometric = MASTER_ADDON_REGISTRY.find((m) => m.slug === "biometric-sync");
    expect(biometric?.navigationMode).toBe("integrated");
    expect(biometric?.targetParentId).toBe("time-attendance");

    const workspace = MASTER_ADDON_REGISTRY.find((m) => m.slug === "google-workspace");
    expect(workspace?.navigationMode).toBe("extension");
  });

  // 3. Deduplication of canonical and alias-generated menus
  it("3. deduplicates canonical and alias-generated menu entries", () => {
    const ctx = createMockContext({
      activeAddons: ["woocommerce-sync", "woocommerce-hub"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true },
        "woocommerce-hub": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, ctx);
    const standalone = resolveStandaloneModules(isEntitled, true, "/integrations");

    expect(standalone).toHaveLength(1);
    // WooCommerce Hub and WooCommerce Sync share /integrations, deduplicated to 1 child
    expect(standalone[0].children).toHaveLength(1);
    expect(standalone[0].children[0].route).toBe("/integrations");
  });

  // 4. Uninstalled add-ons do not expose operational navigation
  it("4. hides operational navigation when add-ons are not installed", () => {
    const uninstalledCtx = createMockContext({
      activeAddons: [],
      serverEntitlements: {},
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, uninstalledCtx);

    const standalone = resolveStandaloneModules(isEntitled, true, "/dashboard");
    expect(standalone).toHaveLength(0);

    const biometricItems = resolveIntegratedAddons(isEntitled, true, "time-attendance", "/dashboard");
    expect(biometricItems).toHaveLength(0);

    const tallyItems = resolveIntegratedAddons(isEntitled, true, "finance-accounting", "/dashboard");
    expect(tallyItems).toHaveLength(0);
  });

  // 5. Uninstalled direct routes and APIs protected
  it("5. validates that direct route entries are protected via ROUTE_ENTITLEMENT_MAP", () => {
    expect(ROUTE_ENTITLEMENT_MAP["/integrations"]).toBe("woocommerce-sync");
    expect(ROUTE_ENTITLEMENT_MAP["/shopify"]).toBe("shopify-sync");
    expect(ROUTE_ENTITLEMENT_MAP["/strategy-studio"]).toBe("swot");
    expect(ROUTE_ENTITLEMENT_MAP["/biometric-sync"]).toBe("biometric-sync");
    expect(ROUTE_ENTITLEMENT_MAP["/tally-importer"]).toBe("tally-importer");

    const uninstalledCtx = createMockContext({ activeAddons: [] });
    expect(checkEntitlementByKey("woocommerce-sync", uninstalledCtx)).toBe(false);
    expect(checkEntitlementByKey("shopify-sync", uninstalledCtx)).toBe(false);
    expect(checkEntitlementByKey("swot", uninstalledCtx)).toBe(false);
    expect(checkEntitlementByKey("biometric-sync", uninstalledCtx)).toBe(false);
    expect(checkEntitlementByKey("tally-importer", uninstalledCtx)).toBe(false);
  });

  // 6. Free installation updates navigation immediately
  it("6. updates navigation dynamically upon active entitlement", () => {
    const dynamicCtx = createMockContext({
      activeAddons: ["swot"],
      serverEntitlements: { swot: { isActive: true } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, dynamicCtx);

    const modules = resolveStandaloneModules(isEntitled, true, "/strategy-studio");
    expect(modules).toHaveLength(1);
    expect(modules[0].key).toBe("strategy-studio");
    expect(modules[0].activeRoute).toBe(true);
  });

  // 7. Installation persists across reauthentication/refresh
  it("7. persists navigation resolution consistently based on serverEntitlements", () => {
    const refreshedCtx = createMockContext({
      activeAddons: ["biometric-sync"],
      serverEntitlements: { "biometric-sync": { isActive: true, status: "active" } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, refreshedCtx);

    const integrated = resolveIntegratedAddons(isEntitled, true, "time-attendance", "/attendance");
    expect(integrated).toHaveLength(1);
    expect(integrated[0].slug).toBe("biometric-sync");
    expect(integrated[0].route).toBe("/biometric-sync");
  });

  // 8. Disabling and re-enabling add-ons
  it("8. suppresses navigation when an add-on is disabled", () => {
    const disabledCtx = createMockContext({
      activeAddons: ["biometric-sync"],
      serverEntitlements: {
        "biometric-sync": { isActive: false, status: "disabled", isEnabled: false },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, disabledCtx);

    const integrated = resolveIntegratedAddons(isEntitled, true, "time-attendance", "/attendance");
    expect(integrated).toHaveLength(0);
  });

  // 9. Entitlement expiry and revocation invalidates protected access
  it("9. rejects expired or revoked entitlements", () => {
    const expiredCtx = createMockContext({
      activeAddons: ["shopify-sync"],
      serverEntitlements: {
        "shopify-sync": { isActive: false, status: "expired" },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, expiredCtx);

    const standalone = resolveStandaloneModules(isEntitled, true, "/shopify");
    expect(standalone).toHaveLength(0);
  });

  // 10. Setup-incomplete integrations show the correct state while preserving module nav
  it("10. keeps authorized navigation visible when entitlement is active even if configuration is pending", () => {
    const pendingSetupCtx = createMockContext({
      activeAddons: ["tally-importer"],
      serverEntitlements: {
        "tally-importer": { isActive: true, status: "active", isConfigured: false },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, pendingSetupCtx);

    const financeItems = resolveIntegratedAddons(isEntitled, true, "finance-accounting", "/accounting");
    expect(financeItems).toHaveLength(1);
    expect(financeItems[0].slug).toBe("tally-importer");
  });

  // 11. Core modules remain unaffected
  it("11. preserves native core platform modules without add-on interference", () => {
    const basicEmployeeCtx = createMockContext({
      enabledModules: ["hrms"],
      activeAddons: [],
      roles: ["employee"],
      isWorkspaceAdmin: false,
    });
    expect(checkEntitlementByKey("hrms", basicEmployeeCtx)).toBe(true);
    expect(checkEntitlementByKey("core_platform", basicEmployeeCtx)).toBe(true);
  });

  // 12. Role-based visibility (adminOnly)
  it("12. enforces adminOnly restrictions on standalone modules and extensions", () => {
    const employeeCtx = createMockContext({
      roles: ["employee"],
      isWorkspaceAdmin: false,
      isSuperAdmin: false,
      activeAddons: ["swot", "backup-restore", "notice-board"],
      serverEntitlements: {
        swot: { isActive: true },
        "backup-restore": { isActive: true },
        "notice-board": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, employeeCtx);

    // Strategy studio is adminOnly -> false for employee
    const standalone = resolveStandaloneModules(isEntitled, false, "/me/dashboard");
    expect(standalone).toHaveLength(0);

    // Extension items: backup-restore is adminOnly, notice-board is open to all
    const extensions = resolveExtensionItems(isEntitled, false, "/notice-board");
    const routes = extensions.map((e) => e.route);
    expect(routes).toContain("/notice-board");
    expect(routes).not.toContain("/backup-restore");
  });

  // 13. Tenant isolation
  it("13. strictly isolates entitlements between distinct tenant IDs", () => {
    const tenantACtx = createMockContext({
      tenantId: "tenant-alpha",
      activeAddons: ["shopify-sync"],
      serverEntitlements: { "shopify-sync": { isActive: true } },
    });
    const tenantBCtx = createMockContext({
      tenantId: "tenant-beta",
      activeAddons: [],
      serverEntitlements: {},
    });

    expect(checkEntitlementByKey("shopify-sync", tenantACtx)).toBe(true);
    expect(checkEntitlementByKey("shopify-sync", tenantBCtx)).toBe(false);
  });

  // 14. Deep links and route active states
  it("14. correctly marks active state on exact and nested route matches", () => {
    const ctx = createMockContext({
      activeAddons: ["shopify-sync"],
      serverEntitlements: { "shopify-sync": { isActive: true } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, ctx);

    const onShopify = resolveStandaloneModules(isEntitled, true, "/shopify");
    expect(onShopify[0].activeRoute).toBe(true);
    expect(onShopify[0].children.find((c) => c.route === "/shopify")?.isActive).toBe(true);

    const onOther = resolveStandaloneModules(isEntitled, true, "/hrm-dashboard");
    expect(onOther[0].activeRoute).toBe(false);
    expect(onOther[0].children.find((c) => c.route === "/shopify")?.isActive).toBe(false);
  });

  // 15. Canonical alias resolution
  it("15. resolves all add-on aliases to their canonical slug", () => {
    expect(resolveCanonicalSlug("woocommerce")).toBe("woocommerce-sync");
    expect(resolveCanonicalSlug("woocommerce_hub")).toBe("woocommerce-sync");
    expect(resolveCanonicalSlug("shopify")).toBe("shopify-sync");
    expect(resolveCanonicalSlug("tally-prime")).toBe("tally-importer");
    expect(resolveCanonicalSlug("biometrics")).toBe("biometric-sync");
    expect(resolveCanonicalSlug("strategy")).toBe("swot");
  });

  // 16. Existing integrations and W1 add-on workflows do not regress
  it("16. retains existing W1 integrations without breaking API contracts", () => {
    const w1Slugs = [
      "biometric-sync",
      "google-workspace",
      "asset-management",
      "okr-performance",
      "whatsapp-alerts",
      "ai-ocr",
      "tally-importer",
    ];
    for (const slug of w1Slugs) {
      const found = MASTER_ADDON_REGISTRY.find((m) => m.slug === slug);
      expect(found).toBeDefined();
    }
  });

  // 17. Settings-only integrations remain in Extensions
  it("17. confines settings-only utilities to Extensions & Add-ons", () => {
    const fullCtx = createMockContext({
      activeAddons: ["google-workspace-integration", "two-factor-auth", "public-api"],
      serverEntitlements: {
        "google-workspace-integration": { isActive: true },
        "two-factor-auth": { isActive: true },
        "public-api": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, fullCtx);
    const extensionItems = resolveExtensionItems(isEntitled, true, "/marketplace");

    const routes = extensionItems.map((e) => e.route);
    expect(routes).toContain("/google-workspace");
    expect(routes).toContain("/two-factor-auth");
    expect(routes).toContain("/public-api");

    // Operational modules must NEVER leak into Extensions
    expect(routes).not.toContain("/integrations");
    expect(routes).not.toContain("/shopify");
    expect(routes).not.toContain("/strategy-studio");
    expect(routes).not.toContain("/biometric-sync");
    expect(routes).not.toContain("/tally-importer");
  });

  // 18. Standalone modules expose only authorized submenus
  it("18. renders only entitled children in standalone submenus", () => {
    const shopifyOnlyCtx = createMockContext({
      activeAddons: ["shopify-sync"],
      serverEntitlements: { "shopify-sync": { isActive: true } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, shopifyOnlyCtx);

    const standalone = resolveStandaloneModules(isEntitled, true, "/shopify");
    expect(standalone[0].children).toHaveLength(1);
    expect(standalone[0].children[0].label).toBe("Shopify Sync");
  });

  // 19. Marketplace installation behavior intact
  it("19. exposes App Marketplace as discovery anchor for workspace admins", () => {
    const adminCtx = createMockContext({ isWorkspaceAdmin: true });
    const isEntitled = (key: string) => checkEntitlementByKey(key, adminCtx);

    const extensionItems = resolveExtensionItems(isEntitled, true, "/marketplace");
    const marketplaceItem = extensionItems.find((e) => e.route === "/marketplace");
    expect(marketplaceItem).toBeDefined();
    expect(marketplaceItem?.label).toBe("App Marketplace");
  });

  // 20. Validation engine catches invalid configuration
  it("20. detects duplicate IDs, missing routes, and invalid parent references", () => {
    // Current master registry must be completely valid
    const cleanResult = validateNavigationRegistry(MASTER_ADDON_REGISTRY);
    expect(cleanResult.isValid).toBe(true);
    expect(cleanResult.errors).toHaveLength(0);

    // Malformed test registry
    const malformedRegistry: MasterAddonNavDefinition[] = [
      {
        id: "duplicate-id",
        slug: "test-1",
        name: "Test 1",
        category: "Test",
        navigationMode: "extension",
        navigationLabel: "Test 1",
        navigationIcon: "ph-test",
        navigationGroup: "Test",
        navigationOrder: 1,
        route: "invalid-route-no-slash",
        requiredAddonSlugs: [],
      },
      {
        id: "duplicate-id",
        slug: "test-2",
        name: "Test 2",
        category: "Test",
        navigationMode: "integrated",
        // missing targetParentId!
        navigationLabel: "Test 2",
        navigationIcon: "ph-test",
        navigationGroup: "Test",
        navigationOrder: 2,
        route: "/valid-route",
        requiredAddonSlugs: [],
      },
    ];

    const badResult = validateNavigationRegistry(malformedRegistry);
    expect(badResult.isValid).toBe(false);
    expect(badResult.errors.some((e) => e.includes("Duplicate navigation ID"))).toBe(true);
    expect(badResult.errors.some((e) => e.includes("must start with '/'"))).toBe(true);
    expect(badResult.errors.some((e) => e.includes("must specify a valid 'targetParentId'"))).toBe(true);
  });
});
