import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useThemeMode, isDarkModeActive } from "./theme";

export { useThemeMode, isDarkModeActive };

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
  activeLogo?: string;
  faviconUrl: string;
  primaryColor: string;
  footerText?: string;
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
  logoDark: "/white-logo.webp",
  activeLogo: "/white-logo.webp",
  faviconUrl: "/favicon.webp",
  primaryColor: "#FF6B00",
  footerText: "© 2026 Master HRMS. All rights reserved.",
  timezone: "Asia/Kolkata",
  currency: "INR",
  currencySymbol: "₹",
  isWhiteLabeled: false,
};

import { resolveBrandingContext } from "./branding-context";

export function useTenantBranding() {
  const { isDark } = useThemeMode();
  const hasAuthToken = typeof window !== "undefined" && !!localStorage.getItem("hrms_auth_token");
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const currentHost = typeof window !== "undefined" ? window.location.host : "";

  const { data: rawBranding = DEFAULT_BRANDING, isLoading } = useQuery<TenantBranding>({
    queryKey: ["tenant-branding", currentHost, currentPath, hasAuthToken],
    queryFn: async () => {
      try {
        // First check current host resolution via GET /api/public/workspace
        try {
          const hostRes = await api.get("/public/workspace");
          if (hostRes) {
            if (hostRes.resolved) {
              const resContext = resolveBrandingContext({
                host: currentHost,
                pathname: currentPath,
                tenantId: hostRes.id,
              });
              const isWhiteLabeled = resContext.scope === "TENANT";

              return {
                ...DEFAULT_BRANDING,
                resolved: true,
                id: hostRes.id,
                name: isWhiteLabeled ? (hostRes.name || DEFAULT_BRANDING.name) : DEFAULT_BRANDING.name,
                slug: hostRes.slug,
                logoUrl: isWhiteLabeled ? (hostRes.logoUrl || DEFAULT_BRANDING.logoUrl) : DEFAULT_BRANDING.logoUrl,
                logoDark: isWhiteLabeled ? (hostRes.logoDark || hostRes.logoUrl || DEFAULT_BRANDING.logoDark) : DEFAULT_BRANDING.logoDark,
                faviconUrl: isWhiteLabeled ? (hostRes.faviconUrl || DEFAULT_BRANDING.faviconUrl) : DEFAULT_BRANDING.faviconUrl,
                primaryColor: isWhiteLabeled ? (hostRes.primaryColor || DEFAULT_BRANDING.primaryColor) : DEFAULT_BRANDING.primaryColor,
                footerText: isWhiteLabeled ? (hostRes.footerText || hostRes.brand?.footerText || DEFAULT_BRANDING.footerText) : DEFAULT_BRANDING.footerText,
                timezone: hostRes.timezone || "Asia/Kolkata",
                baseDomain: hostRes.baseDomain,
                workspaceUrl: hostRes.workspaceUrl,
                isWhiteLabeled,
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
              logoDark: brand.logoDark || brand.logoLight || tenant.logoUrl || DEFAULT_BRANDING.logoDark,
              faviconUrl: brand.favicon || tenant.faviconUrl || tenant.logoUrl || DEFAULT_BRANDING.faviconUrl,
              primaryColor: brand.themeColor ? (brand.themeColor.startsWith("#") ? brand.themeColor : "#FF6B00") : (tenant.primaryColor || "#FF6B00"),
              timezone: tenant.timezone || "Asia/Kolkata",
              currency: brand.currency || "INR",
              currencySymbol: brand.currencySymbol || "₹",
              isWhiteLabeled: true,
            };
          }
        }

        // Load platform app-config for platform branding fallback
        try {
          const appConfig = await api.get("/v1/public/app-config");
          if (appConfig) {
            return {
              ...DEFAULT_BRANDING,
              name: appConfig.appName || DEFAULT_BRANDING.name,
              logoUrl: appConfig.logoLightUrl || DEFAULT_BRANDING.logoUrl,
              logoDark: appConfig.logoDarkUrl || DEFAULT_BRANDING.logoDark,
              faviconUrl: appConfig.faviconUrl || DEFAULT_BRANDING.faviconUrl,
              primaryColor: appConfig.primaryColor || DEFAULT_BRANDING.primaryColor,
              currency: appConfig.locale?.defaultCurrency || DEFAULT_BRANDING.currency,
              currencySymbol: appConfig.locale?.currencySymbol || DEFAULT_BRANDING.currencySymbol,
            };
          }
        } catch {}

        return DEFAULT_BRANDING;
      } catch {
        return DEFAULT_BRANDING;
      }
    },
    staleTime: 60 * 1000,
  });

  const branding: TenantBranding = {
    ...rawBranding,
    logoUrl: rawBranding.logoUrl || DEFAULT_BRANDING.logoUrl,
    logoDark: rawBranding.logoDark || DEFAULT_BRANDING.logoDark,
    faviconUrl: rawBranding.faviconUrl || DEFAULT_BRANDING.faviconUrl,
    activeLogo: isDark
      ? rawBranding.logoDark || DEFAULT_BRANDING.logoDark
      : rawBranding.logoUrl || DEFAULT_BRANDING.logoUrl,
  };

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

  return { branding, isDark, isLoading };
}
