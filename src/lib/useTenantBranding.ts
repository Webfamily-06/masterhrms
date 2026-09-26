import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface TenantBranding {
  resolved: boolean;
  id?: string;
  name: string;
  slug: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  timezone: string;
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
  logoUrl: "/images/logo.svg",
  faviconUrl: "/favicon.ico",
  primaryColor: "#FF6B00",
  timezone: "Asia/Kolkata",
  isWhiteLabeled: false,
};

export function useTenantBranding() {
  const { data: branding = DEFAULT_BRANDING, isLoading } = useQuery<TenantBranding>({
    queryKey: ["public-tenant-branding"],
    queryFn: async () => {
      try {
        const res = await api.get("/auth/public/tenant/resolve");
        return res || DEFAULT_BRANDING;
      } catch (err) {
        return DEFAULT_BRANDING;
      }
    },
    staleTime: 10 * 60 * 1000,
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
