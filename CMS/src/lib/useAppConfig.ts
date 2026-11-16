import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { resolveBrandingContext, BrandingContextType } from "./branding-context";
import { updateGlobalCurrencySettings } from "./currency";

export interface AppConfig {
  appName: string;
  supportEmail: string;
  primaryColor: string;
  workspacePrimaryColor?: string;
  userPrimaryColor?: string | null;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  footerText: string;
  branding?: {
    logoLightUrl: string;
    logoDarkUrl: string;
    faviconUrl: string;
    primaryColor: string;
    workspacePrimaryColor?: string;
    userPrimaryColor?: string | null;
    appName: string;
    footerText: string;
    supportEmail: string;
  };
  locale: {
    defaultCurrency: string;
    currencySymbol: string;
    timezone: string;
    workspaceTimezone?: string;
    dateFormat: string;
    timeFormat: string;
  };
  userPreferences?: {
    userId: string;
    primaryColor: string | null;
    themeMode?: string;
    timezone?: string | null;
    locale?: string;
  } | null;
  pusher?: {
    enabled: boolean;
    key: string;
    cluster: string;
  };
  firebase?: {
    enabled: boolean;
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
    vapidKey?: string;
  };
  maintenance?: {
    active: boolean;
    message: string | null;
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
  primaryColor: "#2563EB",
  workspacePrimaryColor: "#2563EB",
  userPrimaryColor: null,
  logoLightUrl: "/logo.webp",
  logoDarkUrl: "/white-logo.webp",
  faviconUrl: "/favicon.webp",
  footerText: `© ${new Date().getFullYear()} Webfamily Tech Solutions. All rights reserved.`,
  locale: {
    defaultCurrency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    workspaceTimezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12",
  },
  maintenance: {
    active: false,
    message: null,
  },
  scope: "PLATFORM",
  context: "PLATFORM",
  tenantId: null,
  isWhiteLabeled: false,
  version: 1,
  timestamp: new Date().toISOString(),
};

export function getCurrentJwtUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("hrms_auth_token");
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json);
    return typeof payload?.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export function getActivePersonalPrimaryColor(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    const uid = userId !== undefined ? userId : getCurrentJwtUserId();
    if (!uid) return null;
    const val = localStorage.getItem(`hrms_user_primary_color_${uid}`);
    if (val && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val.trim())) {
      return val.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function setPersonalPrimaryColor(
  userId: string | null | undefined,
  hexOrNull: string | null,
  fallbackWorkspaceHex?: string
) {
  if (typeof window === "undefined") return;
  try {
    const uid = userId || getCurrentJwtUserId();
    if (uid) {
      if (hexOrNull && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexOrNull.trim())) {
        localStorage.setItem(`hrms_user_primary_color_${uid}`, hexOrNull.trim());
      } else {
        localStorage.removeItem(`hrms_user_primary_color_${uid}`);
      }
    }
    const targetHex =
      (hexOrNull && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexOrNull.trim()) ? hexOrNull.trim() : null) ||
      fallbackWorkspaceHex ||
      localStorage.getItem("master_hrms_workspace_primary_color") ||
      "#2563EB";
    applyThemeVariables(targetHex);
  } catch (e) {
    console.error("Failed to set personal primary color:", e);
  }
}

function computeContrastingForeground(hex: string): string {
  try {
    let clean = hex.trim().replace(/^#/, "");
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (clean.length !== 6) return "#ffffff";
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.62 ? "#0f172a" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

export function applyThemeVariables(
  primaryHex: string,
  options?: { respectPersonalOverride?: boolean; isWorkspaceColor?: boolean }
) {
  if (typeof document === "undefined" || !primaryHex) return;
  try {
    if (options?.isWorkspaceColor) {
      localStorage.setItem("master_hrms_workspace_primary_color", primaryHex);
    }
    const personalOverride = options?.respectPersonalOverride ? getActivePersonalPrimaryColor() : null;
    const effectiveHex = personalOverride || primaryHex;
    const foregroundHex = computeContrastingForeground(effectiveHex);

    document.documentElement.style.setProperty("--primary", effectiveHex);
    document.documentElement.style.setProperty("--primary-foreground", foregroundHex);
    document.documentElement.style.setProperty("--ring", effectiveHex);
    document.documentElement.style.setProperty("--sidebar-primary", effectiveHex);
    document.documentElement.style.setProperty("--sidebar-primary-foreground", foregroundHex);
    document.documentElement.style.setProperty("--sidebar-ring", effectiveHex);
    document.documentElement.style.setProperty("--sidebar-menu-active-item", effectiveHex);
    document.documentElement.style.setProperty("--sidebar-submenu-active-item", effectiveHex);
    document.documentElement.style.setProperty(
      "--sidebar-menu-active-bg",
      `color-mix(in srgb, ${effectiveHex} 12%, transparent)`
    );
    // Also store as --primary-hex for raw hex access in JS
    document.documentElement.style.setProperty("--primary-hex", effectiveHex);
    localStorage.setItem("master_hrms_primary_color", effectiveHex);
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

  const sanitizeFooter = (item: any) => {
    if (item && item.footerText && (item.footerText.includes("Apex HRMS") || item.footerText.includes("Persisted Forever"))) {
      item.footerText = `© ${new Date().getFullYear()} Webfamily Tech Solutions. All rights reserved.`;
    }
    return item;
  };

  const { data: config = DEFAULT_APP_CONFIG, isLoading, isError } = useQuery<AppConfig>({
    queryKey,
    queryFn: async () => {
      const pathParam = encodeURIComponent(currentPath);
      try {
        const res = await api.get(`/v1/public/app-config?pathname=${pathParam}`);
        if (res && (res.appName || res.primaryColor)) return sanitizeFooter(res);
      } catch (err) {}

      try {
        const fallback = await api.get(`/public/app-config?pathname=${pathParam}`);
        if (fallback && (fallback.appName || fallback.primaryColor)) return sanitizeFooter(fallback);
      } catch {}

      try {
        const fallback2 = await api.get(`/app-config?pathname=${pathParam}`);
        if (fallback2 && (fallback2.appName || fallback2.primaryColor)) return sanitizeFooter(fallback2);
      } catch {}

      return DEFAULT_APP_CONFIG;
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    // Avoid applying default fallback config while the real server config is loading
    if (isLoading || !config) return;

    // 1. Dynamic Primary Accent Color (Employee USER override -> Workspace -> Platform)
    const wsColor = config.workspacePrimaryColor || config.branding?.workspacePrimaryColor || config.primaryColor;
    if (wsColor) {
      try {
        localStorage.setItem("master_hrms_workspace_primary_color", wsColor);
      } catch {}
    }

    if (config.userPreferences?.userId) {
      setPersonalPrimaryColor(config.userPreferences.userId, config.userPrimaryColor || null, wsColor);
    } else if (config.primaryColor) {
      applyThemeVariables(config.primaryColor, { respectPersonalOverride: Boolean(authToken) });
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

    // 5. Dynamic currency & timezone synchronization across entire workspace
    if (config.locale?.defaultCurrency || config.locale?.currencySymbol) {
      updateGlobalCurrencySettings({
        defaultCurrency: config.locale.defaultCurrency,
        currencySymbol: config.locale.currencySymbol,
      });
    }
    if (config.locale?.timezone) {
      try {
        localStorage.setItem("master_hrms_timezone", config.locale.timezone);
        if (config.locale.workspaceTimezone) {
          localStorage.setItem("master_hrms_workspace_timezone", config.locale.workspaceTimezone);
        }
        (window as any).__MASTERHRMS_TIMEZONE__ = config.locale.timezone;
        (window as any).__MASTERHRMS_WORKSPACE_TIMEZONE__ =
          config.locale.workspaceTimezone || config.locale.timezone;
      } catch {}
    }

    // 6. Hydrate runtime Firebase & Pusher client configurations
    if (config.firebase && typeof window !== "undefined") {
      (window as any).__MASTERHRMS_FIREBASE__ = config.firebase;
    }
    if (config.pusher && typeof window !== "undefined") {
      (window as any).__MASTERHRMS_PUSHER__ = config.pusher;
    }
  }, [config, isLoading, authToken]);

  // Listen to cross-window or local custom event (same tab)
  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      const data = e.detail;
      if (!data) return;

      // Per-employee USER isolation: only apply if event belongs to current logged-in user
      if (data.scope === "USER") {
        const currentUid = getCurrentJwtUserId();
        if (data.userId && currentUid && data.userId !== currentUid) {
          return;
        }
        if (data?.keys?.includes("user.primary_color")) {
          const nextUserColor = data?.values?.["user.primary_color"] || null;
          setPersonalPrimaryColor(currentUid, nextUserColor, config.workspacePrimaryColor || config.primaryColor);
        }
        queryClient.invalidateQueries({ queryKey: ["app-config"] });
        return;
      }

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
        applyThemeVariables(data.values["branding.primary_color"], {
          respectPersonalOverride: true,
          isWorkspaceColor: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-dashboard-metrics"] });
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("settings-updated", handleSettingsUpdated);
  }, [config.context, config.scope, config.tenantId, config.workspacePrimaryColor, config.primaryColor, queryClient]);

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
