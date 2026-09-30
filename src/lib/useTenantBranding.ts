import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface TenantBranding {
  resolved: boolean;
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
  subscription?: {
    planName: string;
    status: string;
  };
}

export const DEFAULT_BRANDING: TenantBranding = {
  resolved: false,
  name: "Master ERP & HRMS",
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
        if (hasAuthToken) {
          // Authenticated: fetch tenant-isolated settings
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
        // Public / Unauthenticated
        const publicRes = await api.get("/auth/public/tenant/resolve");
        if (publicRes && publicRes.resolved) {
          return {
            ...DEFAULT_BRANDING,
            ...publicRes,
            logoUrl: publicRes.logoUrl || DEFAULT_BRANDING.logoUrl,
            logoDark: publicRes.logoUrl || DEFAULT_BRANDING.logoDark,
            faviconUrl: publicRes.faviconUrl || DEFAULT_BRANDING.faviconUrl,
          };
        }
        return publicRes || DEFAULT_BRANDING;
      } catch {
        return DEFAULT_BRANDING;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Dynamically apply Favicon and Brand Colors
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (branding.name) {
      document.title = branding.isWhiteLabeled
        ? `${branding.name} — Workspace Portal`
        : "Master ERP & HRMS Platform";
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
