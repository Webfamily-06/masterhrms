/**
 * MASTERHRMS — Universal Email Branding Resolver
 * ==============================================
 * Resolves the two distinct branding layers from existing MasterHRMS configuration:
 * 1. Tenant Header Branding (BrandingResolverService TENANT scope + tenant settings)
 * 2. MasterHRMS Platform Footer Branding (BrandingResolverService PLATFORM scope + platform settings)
 */

import { rawPrisma } from "../../prisma";
import { BrandingResolverService, toAbsoluteUrl } from "../../services/branding/branding-resolver.service";
import { SettingsService } from "../../services/settings/settings.service";
import {
  DEFAULT_PLATFORM_BRANDING,
  DESIGN_TOKENS,
  formatPublicWebsiteLabel,
  type MasterHRMSPlatformBranding,
  type TenantEmailBranding,
  type UniversalEmailBranding,
} from "./index";

const DEFAULT_PLATFORM_LOGOS = new Set(["/logo.webp", "/white-logo.webp", "/favicon.webp"]);

export function resolvePublicAppUrl(): string {
  const raw =
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.BASE_DOMAIN && process.env.BASE_DOMAIN !== "localhost"
      ? `https://${process.env.BASE_DOMAIN}`
      : "http://localhost:3000");
  return String(raw).trim().replace(/\/+$/, "");
}

function isCustomTenantLogo(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return !DEFAULT_PLATFORM_LOGOS.has(trimmed);
}

export async function resolveUniversalEmailBranding(
  tenantId?: string | null,
  baseUrl?: string
): Promise<UniversalEmailBranding> {
  const [platformBranding, platformSeo] = await Promise.all([
    BrandingResolverService.resolve({ scope: "PLATFORM", baseUrl }).catch(() => null),
    SettingsService.getGroup("PLATFORM", null, "seo").catch(() => ({ values: {} as Record<string, any> })),
  ]);

  const platformWebsite =
    String(platformSeo?.values?.["seo.canonical_base_url"] || process.env.PLATFORM_WEBSITE_URL || "https://masterhrms.com").trim();
  const platformWebsiteLabel = formatPublicWebsiteLabel(platformWebsite);
  const platformSupportEmail =
    String(platformBranding?.supportEmail || process.env.SUPPORT_EMAIL || "support@masterhrms.com").trim();
  const platformName = "MasterHRMS";
  const platformLogoUrl = platformBranding?.absoluteLogoLightUrl || toAbsoluteUrl("/logo.webp", baseUrl);
  const platformCopyright =
    platformBranding?.footerText || `© ${new Date().getFullYear()} MasterHRMS. All rights reserved.`;

  const platform: MasterHRMSPlatformBranding = {
    platformName,
    logoUrl: platformLogoUrl,
    tagline: DEFAULT_PLATFORM_BRANDING.tagline,
    supportEmail: platformSupportEmail,
    websiteUrl: platformWebsite,
    websiteLabel: platformWebsiteLabel,
    copyrightText: platformCopyright,
    playStoreUrl: process.env.PLATFORM_PLAYSTORE_URL || "https://play.google.com/store",
    appStoreUrl: process.env.PLATFORM_APPSTORE_URL || "https://apps.apple.com",
    privacyPolicyUrl: `${platformWebsite.replace(/\/+$/, "")}/privacy-policy`,
    socialLinks: [
      { label: "Facebook", url: process.env.PLATFORM_SOCIAL_FACEBOOK || "https://facebook.com" },
      { label: "X", url: process.env.PLATFORM_SOCIAL_X || "https://x.com" },
      { label: "Instagram", url: process.env.PLATFORM_SOCIAL_INSTAGRAM || "https://instagram.com" },
      { label: "LinkedIn", url: process.env.PLATFORM_SOCIAL_LINKEDIN || "https://linkedin.com" },
      { label: "YouTube", url: process.env.PLATFORM_SOCIAL_YOUTUBE || "https://youtube.com" },
    ],
  };

  let tenant: TenantEmailBranding = {
    companyName: platformBranding?.appName || "MasterHRMS",
    logoUrl: "",
    tagline: "",
    brandColor: DESIGN_TOKENS.masterBlue,
  };

  if (tenantId) {
    const [tenantBranding, brandSettingRow] = await Promise.all([
      BrandingResolverService.resolve({ scope: "TENANT", tenantId, baseUrl }).catch(() => null),
      rawPrisma.setting
        .findFirst({
          where: {
            scope: "TENANT",
            scopeId: tenantId,
            group: "tenant_system_settings",
            key: "brand",
          },
        })
        .catch(() => null),
    ]);

    const brandCfg = ((brandSettingRow?.valueJson as any) || {});
    const companyName =
      String(brandCfg.companyName || tenantBranding?.appName || "").trim() || "Organization";
    // Priority: Settings -> Brand Settings -> Logo Light, fallback to Logo Dark, then BrandingResolver
    const rawLogo =
      (isCustomTenantLogo(brandCfg.logoLight) && brandCfg.logoLight) ||
      (isCustomTenantLogo(brandCfg.logoDark) && brandCfg.logoDark) ||
      (isCustomTenantLogo(tenantBranding?.logoLightUrl) && tenantBranding?.logoLightUrl) ||
      (isCustomTenantLogo(tenantBranding?.logoDarkUrl) && tenantBranding?.logoDarkUrl) ||
      "";
    const resolvedLogoUrl = rawLogo ? toAbsoluteUrl(String(rawLogo), baseUrl || resolvePublicAppUrl()) : "";
    const tagline = String(brandCfg.tagline || brandCfg.titleText || "").trim();
    const effectiveTagline =
      tagline && tagline.toLowerCase() !== companyName.toLowerCase() ? tagline : "";
    const brandColor =
      String(brandCfg.themeColor || brandCfg.primaryColor || tenantBranding?.primaryColor || DESIGN_TOKENS.masterBlue).trim();

    tenant = {
      companyName,
      logoUrl: resolvedLogoUrl,
      tagline: effectiveTagline,
      brandColor,
    };
  }

  return { tenant, platform };
}

/**
 * Returns template variable substitutions for both branding layers so legacy {{...}} templates
 * and universal templates receive live tenant + platform branding automatically.
 */
export function brandingToTemplateVars(branding: UniversalEmailBranding): Record<string, string> {
  const publicAppUrl = resolvePublicAppUrl();
  const socialByLabel = new Map(
    (branding.platform.socialLinks || []).map((s) => [s.label.toLowerCase(), s.url])
  );
  return {
    portal_url: publicAppUrl,
    login_url: `${publicAppUrl}/auth`,
    payslip_url: `${publicAppUrl}/hr/payroll/runs`,
    calendarUrl: `${publicAppUrl}/tenant/calendar`,
    calendar_url: `${publicAppUrl}/tenant/calendar`,
    task_url: `${publicAppUrl}/tenant/todo`,
    taskUrl: `${publicAppUrl}/tenant/todo`,
    company_name: branding.tenant.companyName,
    COMPANY_NAME: branding.tenant.companyName,
    tenant_name: branding.tenant.companyName,
    TENANT_NAME: branding.tenant.companyName,
    tenant_logo_url: branding.tenant.logoUrl || "",
    tenant_tagline: branding.tenant.tagline || "",
    tenant_brand_color: branding.tenant.brandColor || DESIGN_TOKENS.masterBlue,
    platform_logo_url: branding.platform.logoUrl || "",
    platform_support_email: branding.platform.supportEmail,
    support_email: branding.platform.supportEmail,
    SUPPORT_EMAIL: branding.platform.supportEmail,
    platform_website: branding.platform.websiteUrl,
    platform_website_label:
      branding.platform.websiteLabel || formatPublicWebsiteLabel(branding.platform.websiteUrl),
    platform_copyright: branding.platform.copyrightText,
    platform_playstore_url: branding.platform.playStoreUrl || "https://play.google.com/store",
    platform_appstore_url: branding.platform.appStoreUrl || "https://apps.apple.com",
    platform_privacy_url:
      branding.platform.privacyPolicyUrl || `${branding.platform.websiteUrl.replace(/\/+$/, "")}/privacy-policy`,
    platform_social_facebook: socialByLabel.get("facebook") || "https://facebook.com",
    platform_social_x: socialByLabel.get("x") || "https://x.com",
    platform_social_instagram: socialByLabel.get("instagram") || "https://instagram.com",
    platform_social_linkedin: socialByLabel.get("linkedin") || "https://linkedin.com",
    platform_social_youtube: socialByLabel.get("youtube") || "https://youtube.com",
  };
}
