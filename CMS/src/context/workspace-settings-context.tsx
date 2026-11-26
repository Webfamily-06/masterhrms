"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  formatDateWithPattern,
  formatTimeWithPattern,
  LANGUAGE_OPTIONS,
  resolveIanaTimezone,
} from "@/src/lib/constants/system-locale";

export interface WorkspaceCurrencyConfig {
  defaultCurrency: string;
  symbol: string;
  currencyName: string;
  decimalPlaces: number;
  symbolPosition: "prefix" | "suffix";
  decimalSeparator: "." | ",";
  thousandsSeparator: "," | "." | " " | "";
  showDecimals: boolean;
  addSpace: boolean;
}

export interface WorkspaceBrandConfig {
  logoDark: string;
  logoLight: string;
  favicon: string;
  titleText: string;
  companyName: string;
  footerText: string;
  companyMobile: string;
  companyEmail: string;
  companyAddress: string;
  taxNumber: string;
  themeColor: string;
  themeMode: "light" | "dark" | "system";
  layoutMode: "full-width" | "mini" | "hoverview" | "hidden" | "rtl";
  sidebarVariant: "inset" | "floating" | "minimal";
  sidebarStyle: "plain" | "colored" | "gradient";
  layoutDirection: "ltr" | "rtl";
  sidebarPosition: "left" | "right";
}

export interface WorkspaceSystemConfig {
  defaultLanguage: string;
  dateFormat: string;
  timeFormat: string;
  defaultTimezone: string;
  ipRestrictionEnabled: boolean;
}

export interface WorkspaceSettingsContextValue {
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null; timezone?: string | null } | null;
  system: WorkspaceSystemConfig;
  brand: WorkspaceBrandConfig;
  currency: WorkspaceCurrencyConfig;
  workingDays: Record<string, boolean>;
  formatCurrency: (amount: number | string | null | undefined) => string;
  formatDate: (date: Date | string | number | null | undefined) => string;
  formatTime: (date: Date | string | number | null | undefined) => string;
  formatDateTime: (date: Date | string | number | null | undefined) => string;
  isLoading: boolean;
}

const DEFAULT_CURRENCY: WorkspaceCurrencyConfig = {
  defaultCurrency: "INR",
  symbol: "₹",
  currencyName: "Indian Rupee",
  decimalPlaces: 2,
  symbolPosition: "prefix",
  decimalSeparator: ".",
  thousandsSeparator: ",",
  showDecimals: true,
  addSpace: false,
};

const DEFAULT_BRAND: WorkspaceBrandConfig = {
  logoDark: "",
  logoLight: "",
  favicon: "",
  titleText: "MasterHRMS",
  companyName: "MasterHRMS",
  footerText: `© ${new Date().getFullYear()} MasterHRMS. All rights reserved.`,
  companyMobile: "",
  companyEmail: "",
  companyAddress: "",
  taxNumber: "",
  themeColor: "#10b981",
  themeMode: "light",
  layoutMode: "full-width",
  sidebarVariant: "inset",
  sidebarStyle: "plain",
  layoutDirection: "ltr",
  sidebarPosition: "left",
};

const DEFAULT_SYSTEM: WorkspaceSystemConfig = {
  defaultLanguage: "en",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  defaultTimezone: "Asia/Kolkata",
  ipRestrictionEnabled: false,
};

export function formatAmountWithConfig(
  amount: number | string | null | undefined,
  cfg: WorkspaceCurrencyConfig
): string {
  const num = Number(amount ?? 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  const decimals = cfg.showDecimals ? Math.max(0, Math.min(4, Number(cfg.decimalPlaces ?? 2))) : 0;
  const fixed = Math.abs(safeNum).toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const sep = cfg.thousandsSeparator ?? ",";
  const grouped = sep ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : intPart;
  const formattedNumber =
    decPart !== undefined ? `${grouped}${cfg.decimalSeparator || "."}${decPart}` : grouped;
  const space = cfg.addSpace ? " " : "";
  const sign = safeNum < 0 ? "-" : "";
  if (cfg.symbolPosition === "suffix") {
    return `${sign}${formattedNumber}${space}${cfg.symbol}`;
  }
  return `${sign}${cfg.symbol}${space}${formattedNumber}`;
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "SVG"]);

function isTranslatableText(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length < 2 || trimmed.length > 260) return false;
  if (/^[\d\s₹$€£.,:%+\-()/•—–|]+$/.test(trimmed)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^\{[a-z0-9_]+\}$/i.test(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed);
}

export function applyBrandThemeToDom(
  brand: Partial<WorkspaceBrandConfig>,
  defaultLanguage: string = "en"
) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (brand.favicon) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = brand.favicon;
  }

  if (brand.titleText) {
    document.title = brand.titleText;
  }

  if (brand.themeColor) {
    const hex = brand.themeColor;
    root.style.setProperty("--tenant-brand-color", hex);
    root.style.setProperty("--primary", hex);
    root.style.setProperty("--color-primary", hex);
    root.style.setProperty("--primary-foreground", "#ffffff");
    root.style.setProperty("--sidebar-primary", hex);
    root.style.setProperty("--sidebar-primary-foreground", "#ffffff");
    root.style.setProperty("--ring", hex);
    root.style.setProperty("--bs-primary", hex);
    root.style.setProperty("--sidebar-menu-active-item", hex);
    root.style.setProperty("--sidebar-submenu-active-item", hex);
    root.style.setProperty("--sidebar-menu-active-bg", `color-mix(in srgb, ${hex} 14%, transparent)`);
    root.style.setProperty("--primary-hex", hex);
    root.setAttribute("data-tenant-brand-locked", "true");
    try {
      window.localStorage.setItem("master_hrms_primary_color", hex);
      window.localStorage.setItem("master_hrms_workspace_primary_color", hex);
    } catch {
      // Ignore
    }
  }

  const effectiveLayout = brand.layoutMode || "full-width";
  root.setAttribute("data-layout", effectiveLayout);
  root.setAttribute("data-sidebar-variant", brand.sidebarVariant || "inset");
  root.setAttribute("data-sidebar-style", brand.sidebarStyle || "plain");

  if (brand.themeMode) {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark =
      brand.themeMode === "dark" || (brand.themeMode === "system" && prefersDark);
    root.classList.toggle("dark", useDark);
    root.setAttribute("data-theme", useDark ? "dark" : "light");
    root.setAttribute("data-theme-mode", useDark ? "dark" : "light");
    try {
      window.localStorage.setItem("theme", useDark ? "dark" : "light");
    } catch {
      // Ignore
    }
  }

  const langOpt = LANGUAGE_OPTIONS.find((l) => l.code === defaultLanguage);
  root.lang = defaultLanguage || "en";
  const isRtl =
    brand.layoutDirection === "rtl" ||
    effectiveLayout === "rtl" ||
    Boolean(langOpt?.rtl);
  root.dir = isRtl ? "rtl" : "ltr";
}

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextValue>({
  tenant: null,
  system: DEFAULT_SYSTEM,
  brand: DEFAULT_BRAND,
  currency: DEFAULT_CURRENCY,
  workingDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },
  formatCurrency: (val) => formatAmountWithConfig(val, DEFAULT_CURRENCY),
  formatDate: (d) => formatDateWithPattern(d, DEFAULT_SYSTEM.dateFormat, DEFAULT_SYSTEM.defaultTimezone),
  formatTime: (d) => formatTimeWithPattern(d, DEFAULT_SYSTEM.timeFormat, DEFAULT_SYSTEM.defaultTimezone),
  formatDateTime: (d) =>
    `${formatDateWithPattern(d, DEFAULT_SYSTEM.dateFormat, DEFAULT_SYSTEM.defaultTimezone)} ${formatTimeWithPattern(d, DEFAULT_SYSTEM.timeFormat, DEFAULT_SYSTEM.defaultTimezone)}`,
  isLoading: false,
});

export function WorkspaceSettingsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const originalTextMapRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const clientCacheRef = useRef<Map<string, string>>(new Map());
  const inFlightRef = useRef<boolean>(false);

  const hasToken =
    typeof window !== "undefined" &&
    Boolean(
      window.localStorage.getItem("token") ||
        window.localStorage.getItem("hrms_auth_token") ||
        window.localStorage.getItem("auth_token")
    );

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-system-settings-public"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/workspace/system-settings/public");
        return res?.data || res || null;
      } catch {
        return null;
      }
    },
    enabled: hasToken,
    staleTime: 60 * 1000,
    retry: false,
  });

  const system: WorkspaceSystemConfig = {
    ...DEFAULT_SYSTEM,
    ...(data?.system || {}),
    defaultTimezone: resolveIanaTimezone(data?.system?.defaultTimezone || DEFAULT_SYSTEM.defaultTimezone),
  };
  const brand: WorkspaceBrandConfig = { ...DEFAULT_BRAND, ...(data?.brand || {}) };
  const currency: WorkspaceCurrencyConfig = { ...DEFAULT_CURRENCY, ...(data?.currency || {}) };
  const workingDays: Record<string, boolean> = data?.working_days || {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };
  const tenant = data?.tenant || null;

  // 1. Apply authoritative Tenant Favicon, Title, Brand Accent, Layout Mode, Sidebar Style, Theme Mode & RTL live
  useEffect(() => {
    applyBrandThemeToDom(brand, system.defaultLanguage);
  }, [
    brand.favicon,
    brand.titleText,
    brand.themeColor,
    brand.themeMode,
    brand.layoutMode,
    brand.sidebarVariant,
    brand.sidebarStyle,
    brand.layoutDirection,
    system.defaultLanguage,
  ]);

  // 2. Real-Time Translation Engine across all pages when Default Language !== "en"
  useEffect(() => {
    if (typeof document === "undefined" || !hasToken) return;
    const targetLang = (system.defaultLanguage || "en").toLowerCase();

    const collectTextNodes = (): Text[] => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const textNode = current as Text;
        const parent = textNode.parentElement;
        if (
          parent &&
          !SKIP_TAGS.has(parent.tagName) &&
          !parent.closest("[data-no-translate='true']") &&
          !parent.classList.contains("ph") &&
          !parent.classList.contains("ti")
        ) {
          nodes.push(textNode);
        }
        current = walker.nextNode();
      }
      return nodes;
    };

    if (targetLang === "en") {
      // Instantly restore original English text
      const nodes = collectTextNodes();
      for (const n of nodes) {
        const orig = originalTextMapRef.current.get(n);
        if (orig !== undefined && n.nodeValue !== orig) {
          n.nodeValue = orig;
        }
      }
      return;
    }

    const runTranslationPass = async () => {
      if (inFlightRef.current) return;
      const nodes = collectTextNodes();
      const pendingNodes: Array<{ node: Text; orig: string; trimmed: string }> = [];
      const toFetch = new Set<string>();

      for (const node of nodes) {
        let orig = originalTextMapRef.current.get(node);
        if (orig === undefined) {
          orig = node.nodeValue || "";
          if (!isTranslatableText(orig)) continue;
          originalTextMapRef.current.set(node, orig);
        }
        const trimmed = orig.trim();
        if (!isTranslatableText(trimmed)) continue;

        const cacheKey = `${targetLang}::${trimmed}`;
        const cached = clientCacheRef.current.get(cacheKey);
        if (cached) {
          const nextVal = orig.replace(trimmed, cached);
          if (node.nodeValue !== nextVal) node.nodeValue = nextVal;
        } else {
          pendingNodes.push({ node, orig, trimmed });
          if (toFetch.size < 80) toFetch.add(trimmed);
        }
      }

      if (toFetch.size === 0) return;

      inFlightRef.current = true;
      try {
        const res: any = await api.post("/workspace/translate", {
          targetLang,
          texts: Array.from(toFetch),
        });
        const map: Record<string, string> = res?.translations || res?.data?.translations || {};
        for (const [k, v] of Object.entries(map)) {
          if (v) clientCacheRef.current.set(`${targetLang}::${k}`, v);
        }
        for (const item of pendingNodes) {
          const translated = clientCacheRef.current.get(`${targetLang}::${item.trimmed}`);
          if (translated) {
            const nextVal = item.orig.replace(item.trimmed, translated);
            if (item.node.nodeValue !== nextVal) item.node.nodeValue = nextVal;
          }
        }
      } catch {
        // Non-blocking fallback
      } finally {
        inFlightRef.current = false;
      }
    };

    const t1 = window.setTimeout(runTranslationPass, 200);
    const t2 = window.setTimeout(runTranslationPass, 900);

    let mutTimer: number | null = null;
    const observer = new MutationObserver(() => {
      if (mutTimer) window.clearTimeout(mutTimer);
      mutTimer = window.setTimeout(runTranslationPass, 450);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (mutTimer) window.clearTimeout(mutTimer);
      observer.disconnect();
    };
  }, [system.defaultLanguage, pathname, hasToken]);

  const value = useMemo<WorkspaceSettingsContextValue>(
    () => ({
      tenant,
      system,
      brand,
      currency,
      workingDays,
      formatCurrency: (val) => formatAmountWithConfig(val, currency),
      formatDate: (d) => formatDateWithPattern(d, system.dateFormat, system.defaultTimezone),
      formatTime: (d) => formatTimeWithPattern(d, system.timeFormat, system.defaultTimezone),
      formatDateTime: (d) =>
        `${formatDateWithPattern(d, system.dateFormat, system.defaultTimezone)} ${formatTimeWithPattern(
          d,
          system.timeFormat,
          system.defaultTimezone
        )}`,
      isLoading,
    }),
    [tenant, system, brand, currency, workingDays, isLoading]
  );

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}

export function useWorkspaceSettings() {
  return useContext(WorkspaceSettingsContext);
}
