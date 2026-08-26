import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";

export type AddonEntitlement = {
  id?: string;
  addonSlug: string;
  status: "trial" | "active" | "past_due" | "cancelled" | "expired" | "inactive";
  plan: string;
  trialEndsAt?: string | null;
  renewsAt?: string | null;
  features?: string[];
  isActive: boolean;
};

/**
 * Custom React Hook to check and manage tenant add-on subscriptions & entitlements.
 */
export function useAddon(addonSlug: "okr-performance" | "asset-management" | string) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const { data: serverEntitlements = {}, isLoading: isEntitlementsLoading, refetch } = useQuery({
    queryKey: ["tenant-addon-entitlements"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/entitlements");
        return res?.entitlements || {};
      } catch {
        return {};
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  const purchasedSlugKey = `tenant-${tenantId}-purchased-addons-v2`;
  const { data: installedAddons = [] } = useQuery({
    queryKey: ["realtime-tenant-installed-addons", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      try {
        const page = await api.get(`/cms/pages/${purchasedSlugKey}`);
        if (page?.content && Array.isArray(page.content)) {
          return page.content as any[];
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!tenantId,
  });

  const isSuperAdmin = profile?.roles?.includes("super_admin");
  const serverEntitlement = serverEntitlements[addonSlug];
  const isPurchasedLocally = installedAddons.some(
    (a: any) =>
      (a.addonSlug === addonSlug || a.addonId === addonSlug || a.slug === addonSlug || (a.name && a.name.toLowerCase() === addonSlug.toLowerCase())) &&
      (a.status === "active" || a.status === "trial")
  );

  const isEntitled = isSuperAdmin || Boolean(serverEntitlement?.isActive) || isPurchasedLocally;

  const entitlement: AddonEntitlement = serverEntitlement || {
    addonSlug,
    status: isEntitled ? "active" : "inactive",
    plan: isEntitled ? "active" : "none",
    isActive: isEntitled,
  };

  // Mutation: Start 14-Day Free Trial
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/addons/${addonSlug}/trial`, {});
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || `14-Day Free Trial activated for ${addonSlug}!`);
      queryClient.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to activate free trial.");
    },
  });

  // Mutation: Subscribe to Plan
  const subscribeMutation = useMutation({
    mutationFn: async (plan: string = "pro_annual") => {
      return await api.post(`/addons/${addonSlug}/subscribe`, { plan });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || `Successfully subscribed to ${addonSlug}!`);
      queryClient.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Subscription payment failed.");
    },
  });

  // Mutation: Cancel Subscription
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/addons/${addonSlug}/cancel`, {});
    },
    onSuccess: (res: any) => {
      toast.info(res?.message || `Subscription cancelled. Historical records preserved.`);
      queryClient.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to cancel subscription.");
    },
  });

  const trialDaysLeft =
    entitlement.status === "trial" && entitlement.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(entitlement.trialEndsAt).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return {
    entitlement,
    isEntitled: entitlement.isActive,
    isTrial: entitlement.status === "trial",
    trialDaysLeft,
    isLoading: isEntitlementsLoading,
    refetch,
    startTrial: startTrialMutation.mutateAsync,
    isStartingTrial: startTrialMutation.isPending,
    subscribe: subscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    cancel: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
