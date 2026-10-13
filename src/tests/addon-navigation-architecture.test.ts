import { describe, it, expect } from "vitest";
import {
  resolveStandaloneModules,
  resolveExtensionItems,
  STANDALONE_ADDON_MODULES,
  EXTENSION_ADDONS,
} from "@/lib/addon-navigation";
import {
  checkEntitlementByKey,
  ROUTE_ENTITLEMENT_MAP,
  ADDON_ALIASES,
  EntitlementResolverContext,
} from "@/lib/navigation-resolver";

describe("MASTERHRMS — Add-on Navigation Architecture & Standalone Module Resolution", () => {
  const createMockContext = (overrides?: Partial<EntitlementResolverContext>): EntitlementResolverContext => ({
    tenantId: "tenant-alpha",
    isSuperAdmin: false,
    isWorkspaceAdmin: true,
    roles: ["admin"],
    permissions: ["admin.all"],
    enabledModules: ["hrms"],
    activeAddons: [],
    serverEntitlements: {},
    isLoading: false,
    isError: false,
    ...overrides,
  });

  // 1. Uninstalled standalone add-on is absent from the main sidebar
  it("1. hides standalone E-Commerce module when tenant has neither WooCommerce nor Shopify", () => {
    const unentitledCtx = createMockContext({
      activeAddons: [],
      enabledModules: ["hrms"],
      serverEntitlements: {},
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, unentitledCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/dashboard");

    expect(modules).toHaveLength(0);
  });

  // 2. Direct route access for uninstalled add-on is protected
  it("2. protects direct routes via ROUTE_ENTITLEMENT_MAP and checkEntitlementByKey", () => {
    const unentitledCtx = createMockContext({ activeAddons: [] });
    expect(ROUTE_ENTITLEMENT_MAP["/integrations"]).toBe("woocommerce-sync");
    expect(ROUTE_ENTITLEMENT_MAP["/shopify"]).toBe("shopify-sync");

    expect(checkEntitlementByKey("woocommerce-sync", unentitledCtx)).toBe(false);
    expect(checkEntitlementByKey("shopify-sync", unentitledCtx)).toBe(false);
  });

  // 3. Installing eligible add-on makes navigation appear without checkout
  it("3. displays E-Commerce module with WooCommerce Sync when WooCommerce is active", () => {
    const wooCtx = createMockContext({
      activeAddons: ["woocommerce-sync"],
      enabledModules: ["hrms", "woocommerce-sync"],
      serverEntitlements: { "woocommerce-sync": { isActive: true } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, wooCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/integrations");

    expect(modules).toHaveLength(1);
    expect(modules[0].key).toBe("ecommerce");
    expect(modules[0].menuTitle).toBe("E-COMMERCE");
    expect(modules[0].children).toHaveLength(1);
    expect(modules[0].children[0].label).toBe("WooCommerce Sync");
    expect(modules[0].children[0].route).toBe("/integrations");
    expect(modules[0].children[0].isActive).toBe(true);
    expect(modules[0].activeRoute).toBe(true);
  });

  // 4. WooCommerce Hub and WooCommerce Sync do not produce duplicate menu entries
  it("4. deduplicates WooCommerce Hub and WooCommerce Sync into a single canonical entry", () => {
    const bothWooCtx = createMockContext({
      activeAddons: ["woocommerce-sync", "woocommerce-hub"],
      enabledModules: ["hrms", "woocommerce-sync", "woocommerce-hub"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true },
        "woocommerce-hub": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, bothWooCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/hrm-dashboard");

    expect(modules).toHaveLength(1);
    // Even if both aliases are active, only ONE WooCommerce Sync child is rendered
    const wooChildren = modules[0].children.filter((c) => c.route === "/integrations");
    expect(wooChildren).toHaveLength(1);
    expect(wooChildren[0].label).toBe("WooCommerce Sync");
  });

  // 5. Shopify visibility is independent of WooCommerce entitlement
  it("5. renders Shopify Sync independently when WooCommerce is not entitled", () => {
    const shopifyOnlyCtx = createMockContext({
      activeAddons: ["shopify-sync"],
      enabledModules: ["hrms", "shopify-sync"],
      serverEntitlements: { "shopify-sync": { isActive: true } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, shopifyOnlyCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/shopify");

    expect(modules).toHaveLength(1);
    expect(modules[0].children).toHaveLength(1);
    expect(modules[0].children[0].label).toBe("Shopify Sync");
    expect(modules[0].children[0].route).toBe("/shopify");
    expect(modules[0].children[0].isActive).toBe(true);

    // WooCommerce child must NOT be present
    expect(modules[0].children.some((c) => c.route === "/integrations")).toBe(false);
  });

  // 6. When both are entitled, both appear as children under the single E-Commerce module
  it("6. renders both WooCommerce and Shopify as children under a single E-Commerce parent", () => {
    const fullEcomCtx = createMockContext({
      activeAddons: ["woocommerce-sync", "shopify-sync"],
      enabledModules: ["hrms", "woocommerce-sync", "shopify-sync"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true },
        "shopify-sync": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, fullEcomCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/integrations");

    expect(modules).toHaveLength(1);
    expect(modules[0].children).toHaveLength(2);
    expect(modules[0].children[0].label).toBe("WooCommerce Sync");
    expect(modules[0].children[0].route).toBe("/integrations");
    expect(modules[0].children[1].label).toBe("Shopify Sync");
    expect(modules[0].children[1].route).toBe("/shopify");
  });

  // 7. Extensions section does NOT contain WooCommerce or Shopify
  it("7. strictly excludes WooCommerce and Shopify operational pages from Extensions & Add-ons", () => {
    const fullCtx = createMockContext({
      activeAddons: ["woocommerce-sync", "shopify-sync", "google-workspace-integration", "two-factor-auth"],
      enabledModules: ["hrms", "woocommerce-sync", "shopify-sync", "google-workspace-integration", "two-factor-auth"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true },
        "shopify-sync": { isActive: true },
        "google-workspace-integration": { isActive: true },
        "two-factor-auth": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, fullCtx);
    const extensionItems = resolveExtensionItems(isEntitled, true, "/marketplace");

    const routes = extensionItems.map((item) => item.route);
    expect(routes).not.toContain("/integrations");
    expect(routes).not.toContain("/shopify");

    // Discovery and settings-only items remain
    expect(routes).toContain("/marketplace");
    expect(routes).toContain("/google-workspace");
    expect(routes).toContain("/two-factor-auth");
  });

  // 8. Tenant isolation: Tenant Alpha entitlement does not grant access to Tenant Beta
  it("8. isolates entitlements strictly by tenant context", () => {
    const tenantAlphaCtx = createMockContext({
      tenantId: "tenant-alpha",
      activeAddons: ["woocommerce-sync"],
      serverEntitlements: { "woocommerce-sync": { isActive: true } },
    });
    const tenantBetaCtx = createMockContext({
      tenantId: "tenant-beta",
      activeAddons: [],
      serverEntitlements: {},
    });

    expect(checkEntitlementByKey("woocommerce-sync", tenantAlphaCtx)).toBe(true);
    expect(checkEntitlementByKey("woocommerce-sync", tenantBetaCtx)).toBe(false);
  });

  // 9. Disabling an add-on removes its navigation immediately
  it("9. immediately hides module when add-on is disabled", () => {
    const disabledCtx = createMockContext({
      activeAddons: [],
      enabledModules: ["hrms"],
      serverEntitlements: { "woocommerce-sync": { isActive: false } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, disabledCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/dashboard");

    expect(modules).toHaveLength(0);
    expect(checkEntitlementByKey("woocommerce-sync", disabledCtx)).toBe(false);
  });

  // 10. Role-based visibility: non-admins cannot see admin-only standalone modules
  it("10. hides admin-only standalone modules from employee-only / non-admin users", () => {
    const employeeCtx = createMockContext({
      isWorkspaceAdmin: false,
      isSuperAdmin: false,
      roles: ["employee"],
      activeAddons: ["woocommerce-sync"],
      serverEntitlements: { "woocommerce-sync": { isActive: true } },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, employeeCtx);
    const modules = resolveStandaloneModules(isEntitled, false, "/me/dashboard");

    expect(modules).toHaveLength(0);
  });

  // 11. Super Admin bypass sees all authorized modules
  it("11. grants Super Admin access across all modules", () => {
    const superAdminCtx = createMockContext({
      isSuperAdmin: true,
      roles: ["super_admin"],
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, superAdminCtx);
    const modules = resolveStandaloneModules(isEntitled, true, "/integrations");

    expect(modules).toHaveLength(5);
    const ecom = modules.find((m) => m.key === "ecommerce");
    expect(ecom).toBeDefined();
    expect(ecom?.children).toHaveLength(2);
    const strategy = modules.find((m) => m.key === "strategy-studio");
    expect(strategy).toBeDefined();
    expect(modules.find((m) => m.key === "smart-dashboard")).toBeDefined();
    expect(modules.find((m) => m.key === "smart-reports")).toBeDefined();
    expect(modules.find((m) => m.key === "ai-business-advisor")).toBeDefined();
  });

  // 12. Active route highlighting responds accurately to currentPath
  it("12. correctly highlights active child and active module based on currentPath", () => {
    const fullCtx = createMockContext({
      activeAddons: ["woocommerce-sync", "shopify-sync"],
      serverEntitlements: {
        "woocommerce-sync": { isActive: true },
        "shopify-sync": { isActive: true },
      },
    });
    const isEntitled = (key: string) => checkEntitlementByKey(key, fullCtx);

    const onWooRoute = resolveStandaloneModules(isEntitled, true, "/integrations")[0];
    expect(onWooRoute.activeRoute).toBe(true);
    expect(onWooRoute.children.find((c) => c.route === "/integrations")?.isActive).toBe(true);
    expect(onWooRoute.children.find((c) => c.route === "/shopify")?.isActive).toBe(false);

    const onShopifyRoute = resolveStandaloneModules(isEntitled, true, "/shopify")[0];
    expect(onShopifyRoute.activeRoute).toBe(true);
    expect(onShopifyRoute.children.find((c) => c.route === "/shopify")?.isActive).toBe(true);
    expect(onShopifyRoute.children.find((c) => c.route === "/integrations")?.isActive).toBe(false);

    const onOtherRoute = resolveStandaloneModules(isEntitled, true, "/hrm-dashboard")[0];
    expect(onOtherRoute.activeRoute).toBe(false);
    expect(onOtherRoute.children.every((c) => !c.isActive)).toBe(true);
  });

  // 13. Preserves aliases in ADDON_ALIASES
  it("13. recognizes all aliases for woocommerce and shopify", () => {
    expect(ADDON_ALIASES["woocommerce-sync"]).toContain("woocommerce-hub");
    expect(ADDON_ALIASES["woocommerce-hub"]).toContain("woocommerce-sync");
    expect(ADDON_ALIASES["shopify-sync"]).toContain("shopify");
  });
});
