import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { resolveBrandingContext, BrandingContextType } from "./branding-context";

export interface AppConfig {
  appName: string;
  supportEmail: string;
  primaryColor: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  footerText: string;
  branding?: {
    logoLightUrl: string;
    logoDarkUrl: string;
    faviconUrl: string;
    primaryColor: string;
    appName: string;
    footerText: string;
    supportEmail: string;
  };
  locale: {
    defaultCurrency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  scope: "PLATFORM" | "TENANT";
  context: BrandingContextType;
  tenantId: string | null;
  isWhiteLabeled: boolean;
  version: number;
  timestamp: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: "Master HRMS",
  supportEmail: "support@masterhrms.com",
  primaryColor: "#FF6B00",
  logoLightUrl: "/logo.webp",
  logoDarkUrl: "/white-logo.webp",
  faviconUrl: "/favicon.webp",
  footerText: "© 2026 Master HRMS. All rights reserved.",
  locale: {
    defaultCurrency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12",
  },
  scope: "PLATFORM",
  context: "PLATFORM",
  tenantId: null,
  isWhiteLabeled: false,
  version: 1,
  timestamp: new Date().toISOString(),
};

export function applyThemeVariables(primaryHex: string) {
  if (typeof document === "undefined" || !primaryHex) return;
  try {
    document.documentElement.style.setProperty("--primary", primaryHex);
    document.documentElement.style.setProperty("--ring", primaryHex);
    document.documentElement.style.setProperty("--sidebar-primary", primaryHex);
    document.documentElement.style.setProperty("--sidebar-menu-active-item", primaryHex);
    document.documentElement.style.setProperty("--sidebar-submenu-active-item", primaryHex);
    document.documentElement.style.setProperty(
      "--sidebar-menu-active-bg",
      `color-mix(in srgb, ${primaryHex} 12%, transparent)`
    );
    // Also store as --primary-hex for raw hex access in JS
    document.documentElement.style.setProperty("--primary-hex", primaryHex);
    localStorage.setItem("master_hrms_primary_color", primaryHex);
  } catch (e) {
    console.error("Failed to apply theme variables:", e);
  }
}

export function useAppConfig() {
  const queryClient = useQueryClient();

  const [authToken, setAuthToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null
  );

  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthToken(localStorage.getItem("hrms_auth_token"));
    };
    const handlePathChange = () => {
      if (typeof window !== "undefined" && window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    };

    window.addEventListener("auth-token-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("popstate", handlePathChange);
    window.addEventListener("hashchange", handlePathChange);

    // Watch for internal SPA routing changes
    const pathTimer = setInterval(handlePathChange, 400);

    return () => {
      window.removeEventListener("auth-token-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("popstate", handlePathChange);
      window.removeEventListener("hashchange", handlePathChange);
      clearInterval(pathTimer);
    };
  }, [currentPath]);

  const host = typeof window !== "undefined" ? window.location.host : "";
  const predicted = resolveBrandingContext({ host, pathname: currentPath });
  const queryKey = ["app-config", host, predicted.context, authToken ? authToken.slice(-16) : "public"];

  const { data: config = DEFAULT_APP_CONFIG, isLoading, isError } = useQuery<AppConfig>({
    queryKey,
    queryFn: async () => {
      const pathParam = encodeURIComponent(currentPath);
      try {
        const res = await api.get(`/v1/public/app-config?pathname=${pathParam}`);
        if (res && (res.appName || res.primaryColor)) return res;
      } catch (err) {}

      try {
        const fallback = await api.get(`/public/app-config?pathname=${pathParam}`);
        if (fallback && (fallback.appName || fallback.primaryColor)) return fallback;
      } catch {}

      try {
        const fallback2 = await api.get(`/app-config?pathname=${pathParam}`);
        if (fallback2 && (fallback2.appName || fallback2.primaryColor)) return fallback2;
      } catch {}

      return DEFAULT_APP_CONFIG;
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    // Avoid applying default fallback config while the real server config is loading
    if (isLoading || !config) return;

    // 1. Dynamic Primary Accent Color
    if (config.primaryColor) {
      applyThemeVariables(config.primaryColor);
    }

    // 2. Dynamic Favicon Link
    if (config.faviconUrl) {
      try {
        localStorage.setItem("master_hrms_favicon", config.faviconUrl);
      } catch {}
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
    }

    // 3. Dynamic Logo Cache
    if (config.logoLightUrl) {
      try {
        localStorage.setItem("master_hrms_logo_light", config.logoLightUrl);
        localStorage.setItem("master_hrms_logo_dark", config.logoDarkUrl);
      } catch {}
    }

    // 4. Dynamic page title (platform scope only — tenant sidebars override separately)
    if (config.appName && config.scope === "PLATFORM") {
      document.title = config.appName;
    }
  }, [config, isLoading]);

  // Listen to cross-window or local custom event (same tab)
  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      const data = e.detail;
      if (!data) return;

      // Tenant isolation: Never overwrite CMS or Platform context
      if (data.scope === "TENANT") {
        if (config.context === "CMS" || config.scope === "PLATFORM") {
          return; // Ignore tenant update in CMS or Platform context
        }
        if (config.tenantId && data.tenantId && config.tenantId !== data.tenantId) {
          return; // Ignore other tenant updates
        }
      }

      if (data?.keys?.includes("branding.primary_color") && data?.values?.["branding.primary_color"]) {
        applyThemeVariables(data.values["branding.primary_color"]);
      }
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("settings-updated", handleSettingsUpdated);
  }, [config.context, config.scope, config.tenantId, queryClient]);

  // BroadcastChannel for cross-tab realtime branding propagation with scope isolation
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("masterhrms_settings");
    bc.onmessage = (ev) => {
      const data = ev.data;
      if (!data) return;

      if (data.type === "settings_updated" || data.type === "settings.updated") {
        const eventScope = data.scope;
        const eventTenantId = data.tenantId;

        // Tenant update isolation:
        // A Tenant branding update must NOT overwrite PLATFORM context or CMS context!
        if (eventScope === "TENANT") {
          if (config.scope === "TENANT" && config.context !== "CMS" && config.tenantId && config.tenantId === eventTenantId) {
            if (data.primaryColor) applyThemeVariables(data.primaryColor);
            queryClient.invalidateQueries({ queryKey: ["app-config"] });
          }
          return;
        }

        // Platform update:
        // Platform branding updates must affect Platform contexts (including CMS)
        if (eventScope === "PLATFORM" || !eventScope) {
          if (config.scope === "PLATFORM" || config.context === "CMS") {
            if (data.primaryColor) applyThemeVariables(data.primaryColor);
            queryClient.invalidateQueries({ queryKey: ["app-config"] });
          }
        }
      }
    };
    return () => bc.close();
  }, [config.scope, config.context, config.tenantId, config.isWhiteLabeled, queryClient]);

  return { appConfig: config, isLoading, isError };
}
