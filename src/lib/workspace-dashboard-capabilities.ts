import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";

export interface DashboardCapabilitiesState {
  hrm: boolean;
  financial: boolean;
  sales: boolean;
  crm: boolean;
  pos: boolean;
  inventory: boolean;
  projects: boolean;
  purchases: boolean;
  entitlements?: Record<string, any>;
}

export function useWorkspaceDashboardCapabilities() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id || null;
  const navResolver = useNavigationResolver();
  const queryClient = useQueryClient();

  // Authoritative server-resolved capabilities query (tenant-scoped)
  const {
    data: serverData,
    isLoading: isServerLoading,
    isError: isServerError,
    refetch: refetchCapabilities,
  } = useQuery({
    queryKey: ["smart-dashboard-capabilities", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      try {
        const res = await api.get("/smart-dashboard/capabilities");
        return res?.capabilities as DashboardCapabilitiesState | null;
      } catch {
        return null;
      }
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  // Client-side fallback / optimistic resolution derived from navigation resolver & user profile
  const clientDerived = useMemo<DashboardCapabilitiesState>(() => {
    const isSuper = navResolver.isSuperAdmin;
    return {
      hrm: true, // Core HRMS is always present for valid workspaces
      financial: isSuper || navResolver.isEntitled("finance"),
      sales: isSuper || navResolver.isEntitled("sales") || navResolver.isEntitled("crm"),
      crm: isSuper || navResolver.isEntitled("crm"),
      pos: isSuper || navResolver.isEntitled("pos"),
      inventory: isSuper || navResolver.isEntitled("inventory"),
      projects: isSuper || navResolver.isEntitled("projects"),
      purchases: isSuper || navResolver.isEntitled("purchases") || navResolver.isEntitled("procurement"),
    };
  }, [navResolver]);

  // Authoritative capabilities: prefer server evaluation once resolved
  const capabilities: DashboardCapabilitiesState = useMemo(() => {
    if (serverData) {
      return serverData;
    }
    return clientDerived;
  }, [serverData, clientDerived]);

  const canAccessSection = (section: "overview" | "financial" | "sales" | "operational"): boolean => {
    if (section === "overview") return true;
    if (section === "financial") return Boolean(capabilities.financial || capabilities.sales);
    if (section === "sales") return Boolean(capabilities.sales || capabilities.crm);
    if (section === "operational") {
      return Boolean(
        capabilities.inventory ||
        capabilities.pos ||
        capabilities.projects ||
        capabilities.purchases
      );
    }
    return false;
  };

  const canAccessTab = (moduleKey: string): boolean => {
    switch (moduleKey) {
      case "hrm":
        return Boolean(capabilities.hrm);
      case "financial":
      case "finance":
      case "account":
        return Boolean(capabilities.financial);
      case "sales":
      case "invoices":
      case "proposals":
        return Boolean(capabilities.sales);
      case "crm":
      case "deals":
      case "leads":
        return Boolean(capabilities.crm);
      case "pos":
        return Boolean(capabilities.pos);
      case "inventory":
      case "stock":
        return Boolean(capabilities.inventory);
      case "projects":
        return Boolean(capabilities.projects);
      case "purchase":
      case "purchases":
      case "procurement":
      case "vendorSpend":
        return Boolean(capabilities.purchases);
      default:
        return false;
    }
  };

  const invalidateDashboardData = () => {
    queryClient.invalidateQueries({ queryKey: ["smart-dashboard-capabilities", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["smart-dashboard-overview", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["smart-dashboard-financial", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["smart-dashboard-sales", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["smart-dashboard-operational", tenantId] });
  };

  return {
    capabilities,
    isLoading: isServerLoading && !serverData,
    isError: isServerError,
    canAccessSection,
    canAccessTab,
    refetchCapabilities,
    invalidateDashboardData,
    tenantId,
  };
}
