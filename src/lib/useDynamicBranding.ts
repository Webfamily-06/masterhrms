'use client';

import { useState, useEffect } from 'react';

export interface DynamicBranding {
  appName: string;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  primaryColor: string;
  supportEmail: string;
  footerText: string;
  currency: string;
  currencySymbol: string;
  isWhiteLabeled: boolean;
  isLoading: boolean;
}

const DEFAULT_BRANDING: DynamicBranding = {
  appName: 'Master HRMS',
  logoUrl: '/images/logo/logo.webp',
  logoDarkUrl: '/images/logo/logo.webp',
  faviconUrl: '/images/logo/favicon.webp',
  primaryColor: '#864ffe',
  supportEmail: 'support@masterhrms.com',
  footerText: '© 2026 Master HRMS. All rights reserved.',
  currency: 'INR',
  currencySymbol: '₹',
  isWhiteLabeled: false,
  isLoading: true,
};

export function useDynamicBranding(): DynamicBranding {
  const [branding, setBranding] = useState<DynamicBranding>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('hrms_branding_cache');
        if (cached) {
          return { ...DEFAULT_BRANDING, ...JSON.parse(cached), isLoading: false };
        }
      } catch {}
    }
    return DEFAULT_BRANDING;
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBranding() {
      try {
        // 1. Fetch public platform app-config
        let configData: any = null;
        try {
          const res = await fetch('/api/v1/public/app-config');
          if (res.ok) {
            configData = await res.json();
          }
        } catch {}

        // Fallback to direct backend if proxy is not yet ready
        if (!configData) {
          try {
            const res = await fetch('http://localhost:4000/api/v1/public/app-config');
            if (res.ok) {
              configData = await res.json();
            }
          } catch {}
        }

        // 2. If authenticated, attempt to fetch workspace-specific branding
        let workspaceData: any = null;
        const token = typeof window !== 'undefined' ? localStorage.getItem('hrms_auth_token') : null;
        if (token) {
          try {
            const wsRes = await fetch('/api/workspace/settings', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (wsRes.ok) {
              workspaceData = await wsRes.json();
            }
          } catch {}
        }

        if (isMounted) {
          const appName =
            workspaceData?.brand?.titleText ||
            workspaceData?.tenant?.name ||
            configData?.appName ||
            DEFAULT_BRANDING.appName;

          const logoDarkUrl =
            workspaceData?.brand?.logoDark ||
            workspaceData?.brand?.logoLight ||
            workspaceData?.tenant?.logoUrl ||
            configData?.logoDarkUrl ||
            configData?.logoDark ||
            configData?.logoLightUrl ||
            DEFAULT_BRANDING.logoDarkUrl;

          const logoUrl =
            workspaceData?.brand?.logoLight ||
            workspaceData?.brand?.logoDark ||
            workspaceData?.tenant?.logoUrl ||
            configData?.logoLightUrl ||
            configData?.logoLight ||
            DEFAULT_BRANDING.logoUrl;

          const faviconUrl =
            workspaceData?.brand?.favicon ||
            configData?.faviconUrl ||
            DEFAULT_BRANDING.faviconUrl;

          const primaryColor =
            workspaceData?.brand?.themeColor ||
            configData?.primaryColor ||
            DEFAULT_BRANDING.primaryColor;

          const footerText =
            workspaceData?.brand?.footerText ||
            configData?.footerText ||
            DEFAULT_BRANDING.footerText;

          const resolved: DynamicBranding = {
            appName,
            logoUrl: logoUrl || DEFAULT_BRANDING.logoUrl,
            logoDarkUrl: logoDarkUrl || DEFAULT_BRANDING.logoDarkUrl,
            faviconUrl: faviconUrl || DEFAULT_BRANDING.faviconUrl,
            primaryColor,
            supportEmail: configData?.supportEmail || DEFAULT_BRANDING.supportEmail,
            footerText,
            currency: configData?.locale?.defaultCurrency || 'INR',
            currencySymbol: configData?.locale?.currencySymbol || '₹',
            isWhiteLabeled: Boolean(workspaceData?.brand?.titleText),
            isLoading: false,
          };

          setBranding(resolved);
          try {
            localStorage.setItem('hrms_branding_cache', JSON.stringify(resolved));
          } catch {}
        }
      } catch (err) {
        if (isMounted) {
          setBranding((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    loadBranding();

    return () => {
      isMounted = false;
    };
  }, []);

  return branding;
}
