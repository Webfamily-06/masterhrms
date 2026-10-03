import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface TenantBranding {
  resolved: boolean;
  notFound?: boolean;
  isRoot?: boolean;
  isSuper?: boolean;
  id?: string;
  name: string;
  slug: string;
  logoUrl: string;
  logoDark?: string;
  faviconUrl: string;
  primaryColor: string;
  timezone: string;
  currency?: string;
  currencySymbol?: string;
  isWhiteLabeled: boolean;
  baseDomain?: string;
  workspaceUrl?: string;
  rootUrl?: string;
  superAdminUrl?: string;
  subscription?: {
    planName: string;
    status: string;
  };
}

export const DEFAULT_BRANDING: TenantBranding = {
  resolved: false,
  name: "Master HRMS",
  slug: "default",
  logoUrl: "/logo.webp",
  logoDark: "/logo.webp",
  faviconUrl: "/favicon.webp",
  primaryColor: "#FF6B00",
  timezone: "Asia/Kolkata",
  currency: "INR",
  currencySymbol: "₹",
  isWhiteLabeled: false,
};

export function useTenantBranding() {
  const hasAuthToken = typeof window !== "undefined" && !!localStorage.getItem("hrms_auth_token");

  const { data: branding = DEFAULT_BRANDING, isLoading } = useQuery<TenantBranding>({
    queryKey: ["tenant-branding", hasAuthToken],
    queryFn: async () => {
      try {
        // First check current host resolution via GET /api/public/workspace
        try {
          const hostRes = await api.get("/public/workspace");
          if (hostRes) {
            if (hostRes.resolved) {
              return {
                ...DEFAULT_BRANDING,
                resolved: true,
                id: hostRes.id,
                name: hostRes.name || DEFAULT_BRANDING.name,
                slug: hostRes.slug,
                logoUrl: hostRes.logoUrl || DEFAULT_BRANDING.logoUrl,
                logoDark: hostRes.logoUrl || DEFAULT_BRANDING.logoDark,
                timezone: hostRes.timezone || "Asia/Kolkata",
                baseDomain: hostRes.baseDomain,
                workspaceUrl: hostRes.workspaceUrl,
                isWhiteLabeled: true,
              };
            }
            if (hostRes.isRoot) {
              return {
                ...DEFAULT_BRANDING,
                isRoot: true,
                baseDomain: hostRes.baseDomain,
                rootUrl: hostRes.rootUrl,
              };
            }
            if (hostRes.isSuper) {
              return {
                ...DEFAULT_BRANDING,
                isSuper: true,
                baseDomain: hostRes.baseDomain,
                superAdminUrl: hostRes.superAdminUrl,
              };
            }
          }
        } catch (err: any) {
          if (err.status === 404 || err.code === "WORKSPACE_NOT_FOUND" || err.message?.includes("Workspace not found")) {
            return {
              ...DEFAULT_BRANDING,
              notFound: true,
              slug: err.slug || window.location.hostname.split(".")[0],
            };
          }
        }

        // Fallback for authenticated settings
        if (hasAuthToken) {
          const res = await api.get("/workspace/settings");
          if (res && (res.tenant || res.brand)) {
            const tenant = res.tenant || {};
            const brand = res.brand || {};
            return {
              resolved: true,
              id: tenant.id,
              name: brand.titleText || tenant.name || DEFAULT_BRANDING.name,
              slug: tenant.slug || "default",
              logoUrl: brand.logoLight || brand.logoDark || tenant.logoUrl || DEFAULT_BRANDING.logoUrl,
              logoDark: brand.logoDark || brand.logoLight || tenant.logoUrl || DEFAULT_BRANDING.logoUrl,
              faviconUrl: brand.favicon || tenant.logoUrl || DEFAULT_BRANDING.faviconUrl,
              primaryColor: brand.themeColor ? (brand.themeColor.startsWith("#") ? brand.themeColor : "#FF6B00") : (tenant.primaryColor || "#FF6B00"),
              timezone: tenant.timezone || "Asia/Kolkata",
              currency: brand.currency || "INR",
              currencySymbol: brand.currencySymbol || "₹",
              isWhiteLabeled: true,
            };
          }
        }

        return DEFAULT_BRANDING;
      } catch {
        return DEFAULT_BRANDING;
      }
    },
    staleTime: 60 * 1000,
  });

  // Dynamically apply Favicon and Brand Colors
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (branding.notFound) {
      document.title = "Workspace Not Found — Master HRMS";
      return;
    }

    if (branding.name) {
      document.title = branding.isWhiteLabeled
        ? `${branding.name} — Workspace Portal`
        : "Master HRMS Platform";
    }

    if (branding.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding]);

  return { branding, isLoading };
}
