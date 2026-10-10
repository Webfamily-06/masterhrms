import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, ProfileWithRoles } from "@/lib/session";
import type { NavigationItem } from "./navigation-registry";

/**
 * Standard normalized alias dictionary for add-ons and core product suites.
 * Ensures consistent entitlement resolution regardless of slug conventions.
 */
export const ADDON_ALIASES: Record<string, string[]> = {
  "woocommerce-sync": ["woocommerce", "woocommerce-sync", "woocommerce_sync"],
  "shopify-sync": ["shopify", "shopify-sync", "shopify_sync"],
  "google-workspace-integration": ["google-workspace", "google-workspace-integration", "google_workspace"],
  "tally-importer": ["tally", "tally-importer", "tally_importer", "tally-prime"],
  "whatsapp-alerts": ["whatsapp", "whatsapp-alerts", "whatsapp_alerts"],
  "razorpay-gateway": ["razorpay", "razorpay-gateway", "razorpay_gateway"],
  "biometric-sync": ["biometric", "biometric-sync", "biometrics"],
  "okr-performance": ["okr", "okr-performance", "performance_okr"],
  "asset-management": ["assets", "asset-management", "asset_management"],
  "swot": ["swot", "strategy-studio", "strategy"],
  "pestel": ["pestel", "strategy-studio", "strategy"],
  "porters-five-forces": ["porters-five-forces", "strategy-studio", "strategy"],
  "pest": ["pest", "strategy-studio", "strategy"],
  "mckinsey-7s": ["mckinsey-7s", "strategy-studio", "strategy"],
  "business-model": ["business-model", "strategy-studio", "strategy"],
  "business-plan": ["business-plan", "strategy-studio", "strategy"],
  "marketing-plan": ["marketing-plan", "strategy-studio", "strategy"],
  "ai-ocr": ["ai-ocr", "ocr", "ai-invoice-ocr"],
  "learning-lms": ["learning-lms", "lms", "training"],
  "procurement": ["procurement", "purchase-orders"],
  "team-workload": ["team-workload", "workload"],
  "smart-reports": ["smart-reports", "executive-reports"],
  "smart-dashboard": ["smart-dashboard", "custom-dashboard"],
  "contracts": ["contracts", "contract-management"],
  "budget-planner": ["budget-planner", "budgeting"],
  "zatca": ["zatca", "zatca-einvoice"],
  "einvoice-eu": ["einvoice-eu", "peppol"],
  "crm": ["crm", "product_crm"],
  "pos": ["pos", "product_pos", "inventory", "product_inventory"],
  "finance": ["finance", "product_finance", "accounting", "product_accounting"],
  "hrms": ["hrm", "hrms", "product_hrms"],
};

/**
 * Route-to-Addon/Module map for direct route guards & search item protection
 */
export const ROUTE_ENTITLEMENT_MAP: Record<string, string> = {
  "/integrations": "woocommerce-sync",
  "/shopify": "shopify-sync",
  "/google-workspace": "google-workspace-integration",
  "/tally-importer": "tally-importer",
  "/whatsapp-alerts": "whatsapp-alerts",
  "/razorpay-gateway": "razorpay-gateway",
  "/biometric": "biometric-sync",
  "/biometric-sync": "biometric-sync",
  "/strategy-studio": "swot",
  "/swot": "swot",
  "/pestel": "pestel",
  "/learning-lms": "learning-lms",
  "/procurement": "procurement",
  "/contracts": "contracts",
  "/smart-reports": "smart-reports",
  "/budget-planner": "budget-planner",
  "/zatca": "zatca",
  "/einvoice-eu": "einvoice-eu",
  "/ai-ocr": "ai-ocr",
};

export interface EntitlementResolverContext {
  tenantId: string | null;
  isSuperAdmin: boolean;
  isWorkspaceAdmin: boolean;
  roles: string[];
  permissions: string[];
  enabledModules: string[];
  activeAddons: string[];
  serverEntitlements: Record<string, any>;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Pure evaluation function for checking entitlement of a key.
 * Enforces fail-closed semantics: if loading or in error, unverified protected modules return false.
 */
export function checkEntitlementByKey(
  rawKey: string,
  context: EntitlementResolverContext
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }

  // Fail-closed while loading or on error
  if (context.isLoading || context.isError || !context.tenantId) {
    return false;
  }

  const key = rawKey.trim().toLowerCase();

  // Find all candidate slugs/aliases for this key
  const candidates = new Set<string>([key]);
  for (const [canonical, aliases] of Object.entries(ADDON_ALIASES)) {
    if (canonical === key || aliases.includes(key)) {
      candidates.add(canonical);
      aliases.forEach((a) => candidates.add(a));
    }
  }

  // 1. Check enabledModules from /api/auth/me
  for (const c of candidates) {
    if (context.enabledModules.includes(c)) {
      return true;
    }
  }

  // 2. Check activeAddons from /api/auth/me
  if (context.activeAddons.includes("*")) {
    return true;
  }
  for (const c of candidates) {
    if (context.activeAddons.includes(c)) {
      return true;
    }
  }

  // 3. Check serverEntitlements from /api/addons/entitlements
  for (const c of candidates) {
    const ent = context.serverEntitlements[c];
    if (ent && ent.isActive) {
      return true;
    }
  }

  return false;
}

/**
 * Pure evaluation function combining Entitlement, RBAC Permissions, and Roles.
 * Formula: Visible = valid tenant entitlement AND required role permission AND route availability
 */
export function isAccessPermitted(
  rule: {
    moduleKey?: string;
    permission?: string;
    roles?: string[];
    route?: string;
  },
  context: EntitlementResolverContext
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }

  // 1. Route-based entitlement check if applicable
  if (rule.route) {
    for (const [routePrefix, requiredAddon] of Object.entries(ROUTE_ENTITLEMENT_MAP)) {
      if (rule.route === routePrefix || rule.route.startsWith(routePrefix + "/")) {
        if (!checkEntitlementByKey(requiredAddon, context)) {
          return false;
        }
      }
    }
  }

  // 2. Module/Addon Entitlement Check
  if (rule.moduleKey) {
    const isCore = ["core", "overview", "settings", "platform"].includes(rule.moduleKey);
    if (!isCore) {
      if (!checkEntitlementByKey(rule.moduleKey, context)) {
        return false;
      }
    }
  }

  // 3. Role Restriction Check
  if (rule.roles && rule.roles.length > 0) {
    const hasRole = rule.roles.some((r) => context.roles.includes(r));
    if (!hasRole && !context.isWorkspaceAdmin) {
      return false;
    }
  }

  // 4. Permission Restriction Check
  if (rule.permission) {
    const hasPerm = context.permissions.includes(rule.permission);
    if (!hasPerm && !context.isWorkspaceAdmin) {
      return false;
    }
  }

  return true;
}

/**
 * Unified, typed entitlement-aware navigation hook.
 * Shared across DreamsSidebar, PortalSidebar, Command Palette, and Route Guards.
 */
export function useNavigationResolver() {
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();
  const tenantId = profile?.tenant_id || null;

  const isSuperAdmin = Boolean(
    profile?.roles?.includes("super_admin") ||
    profile?.roles?.includes("platform_admin")
  );

  const isWorkspaceAdmin = Boolean(
    profile?.roles?.includes("admin") ||
    profile?.roles?.includes("tenant_admin") ||
    profile?.workspaceRole?.name === "Workspace Admin"
  );

  // Tenant-scoped entitlement query: cache key explicitly includes tenantId to prevent leakage across workspaces
  const {
    data: serverEntitlements = {},
    isLoading: isEntitlementsLoading,
    isError: isEntitlementsError,
    refetch: refetchEntitlements,
  } = useQuery({
    queryKey: ["tenant-addon-entitlements", tenantId],
    queryFn: async () => {
      if (!tenantId) return {};
      try {
        const res = await api.get("/addons/entitlements");
        return res?.entitlements || {};
      } catch {
        return {};
      }
    },
    enabled: !!tenantId && !isSuperAdmin,
    staleTime: 60 * 1000,
  });

  const resolverContext = useMemo<EntitlementResolverContext>(() => {
    return {
      tenantId,
      isSuperAdmin,
      isWorkspaceAdmin,
      roles: profile?.roles || [],
      permissions: profile?.permissions || [],
      enabledModules: (profile?.enabledModules || []).map((m) => m.toLowerCase()),
      activeAddons: (profile?.activeAddons || []).map((a) => a.toLowerCase()),
      serverEntitlements,
      isLoading: isProfileLoading || (isEntitlementsLoading && !isSuperAdmin),
      isError: !!profileError || (isEntitlementsError && !isSuperAdmin),
    };
  }, [
    tenantId,
    isSuperAdmin,
    isWorkspaceAdmin,
    profile,
    isProfileLoading,
    profileError,
    serverEntitlements,
    isEntitlementsLoading,
    isEntitlementsError,
  ]);

  const isEntitled = useMemo(
    () => (key: string) => checkEntitlementByKey(key, resolverContext),
    [resolverContext]
  );

  const canAccess = useMemo(
    () =>
      (rule: { moduleKey?: string; permission?: string; roles?: string[]; route?: string }) =>
        isAccessPermitted(rule, resolverContext),
    [resolverContext]
  );

  /**
   * Filter navigation items recursively based on entitlement & permissions
   */
  const filterNavigation = useMemo(
    () =>
      (items: NavigationItem[]): NavigationItem[] => {
        return items
          .filter((item) =>
            canAccess({
              moduleKey: item.moduleKey || item.module,
              permission: item.permission,
              roles: item.roles,
              route: item.route,
            })
          )
          .map((item) => {
            if (!item.children || item.children.length === 0) {
              return item;
            }
            return {
              ...item,
              children: filterNavigation(item.children),
            };
          });
      },
    [canAccess]
  );

  /**
   * Filter command search items using entitlement rules
   */
  const filterSearchItems = useMemo(
    () =>
      <T extends { url: string; group?: string }>(items: T[]): T[] => {
        return items.filter((item) => {
          // Check route entitlement mapping
          for (const [routePrefix, addonKey] of Object.entries(ROUTE_ENTITLEMENT_MAP)) {
            if (item.url === routePrefix || item.url.startsWith(routePrefix + "/")) {
              if (!isEntitled(addonKey)) {
                return false;
              }
            }
          }

          // If group is Extensions, ensure it has a valid entitlement
          if (item.group === "Extensions" && item.url !== "/marketplace") {
            const mappedAddon = ROUTE_ENTITLEMENT_MAP[item.url];
            if (mappedAddon && !isEntitled(mappedAddon)) {
              return false;
            }
          }

          return true;
        });
      },
    [isEntitled]
  );

  return {
    isEntitled,
    canAccess,
    filterNavigation,
    filterSearchItems,
    context: resolverContext,
    isLoading: resolverContext.isLoading,
    isSuperAdmin,
    isWorkspaceAdmin,
    tenantId,
    refetchEntitlements,
  };
}
