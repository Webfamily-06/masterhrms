"use strict";
/**
 * MASTERHRMS — Universal Email Branding Resolver
 * ==============================================
 * Resolves the two distinct branding layers from existing MasterHRMS configuration:
 * 1. Tenant Header Branding (BrandingResolverService TENANT scope + tenant settings)
 * 2. MasterHRMS Platform Footer Branding (BrandingResolverService PLATFORM scope + platform settings)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePublicAppUrl = resolvePublicAppUrl;
exports.resolveUniversalEmailBranding = resolveUniversalEmailBranding;
exports.brandingToTemplateVars = brandingToTemplateVars;
const prisma_1 = require("../../prisma");
const branding_resolver_service_1 = require("../../services/branding/branding-resolver.service");
const settings_service_1 = require("../../services/settings/settings.service");
const index_1 = require("./index");
const DEFAULT_PLATFORM_LOGOS = new Set(["/logo.webp", "/white-logo.webp", "/favicon.webp"]);
function resolvePublicAppUrl() {
    const raw = process.env.APP_URL ||
        process.env.PUBLIC_APP_URL ||
        process.env.FRONTEND_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.BASE_DOMAIN && process.env.BASE_DOMAIN !== "localhost"
            ? `https://${process.env.BASE_DOMAIN}`
            : "http://localhost:3000");
    return String(raw).trim().replace(/\/+$/, "");
}
function isCustomTenantLogo(url) {
    if (!url)
        return false;
    const trimmed = url.trim();
    if (!trimmed)
        return false;
    return !DEFAULT_PLATFORM_LOGOS.has(trimmed);
}
async function resolveUniversalEmailBranding(tenantId, baseUrl) {
    const [platformBranding, platformSeo] = await Promise.all([
        branding_resolver_service_1.BrandingResolverService.resolve({ scope: "PLATFORM", baseUrl }).catch(() => null),
        settings_service_1.SettingsService.getGroup("PLATFORM", null, "seo").catch(() => ({ values: {} })),
    ]);
    const platformWebsite = String(platformSeo?.values?.["seo.canonical_base_url"] || process.env.PLATFORM_WEBSITE_URL || "https://masterhrms.com").trim();
    const platformWebsiteLabel = (0, index_1.formatPublicWebsiteLabel)(platformWebsite);
    const platformSupportEmail = String(platformBranding?.supportEmail || process.env.SUPPORT_EMAIL || "support@masterhrms.com").trim();
    const platformName = "MasterHRMS";
    const platformLogoUrl = platformBranding?.absoluteLogoLightUrl || (0, branding_resolver_service_1.toAbsoluteUrl)("/logo.webp", baseUrl);
    const platformCopyright = platformBranding?.footerText || `© ${new Date().getFullYear()} MasterHRMS. All rights reserved.`;
    const platform = {
        platformName,
        logoUrl: platformLogoUrl,
        tagline: index_1.DEFAULT_PLATFORM_BRANDING.tagline,
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
    let tenant = {
        companyName: platformBranding?.appName || "MasterHRMS",
        logoUrl: "",
        tagline: "",
        brandColor: index_1.DESIGN_TOKENS.masterBlue,
    };
    if (tenantId) {
        const [tenantBranding, brandSettingRow] = await Promise.all([
            branding_resolver_service_1.BrandingResolverService.resolve({ scope: "TENANT", tenantId, baseUrl }).catch(() => null),
            prisma_1.rawPrisma.setting
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
        const brandCfg = (brandSettingRow?.valueJson || {});
        const companyName = String(brandCfg.companyName || tenantBranding?.appName || "").trim() || "Organization";
        // Priority: Settings -> Brand Settings -> Logo Light, fallback to Logo Dark, then BrandingResolver
        const rawLogo = (isCustomTenantLogo(brandCfg.logoLight) && brandCfg.logoLight) ||
            (isCustomTenantLogo(brandCfg.logoDark) && brandCfg.logoDark) ||
            (isCustomTenantLogo(tenantBranding?.logoLightUrl) && tenantBranding?.logoLightUrl) ||
            (isCustomTenantLogo(tenantBranding?.logoDarkUrl) && tenantBranding?.logoDarkUrl) ||
            "";
        const resolvedLogoUrl = rawLogo ? (0, branding_resolver_service_1.toAbsoluteUrl)(String(rawLogo), baseUrl || resolvePublicAppUrl()) : "";
        const tagline = String(brandCfg.tagline || brandCfg.titleText || "").trim();
        const effectiveTagline = tagline && tagline.toLowerCase() !== companyName.toLowerCase() ? tagline : "";
        const brandColor = String(brandCfg.themeColor || brandCfg.primaryColor || tenantBranding?.primaryColor || index_1.DESIGN_TOKENS.masterBlue).trim();
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
function brandingToTemplateVars(branding) {
    const publicAppUrl = resolvePublicAppUrl();
    const socialByLabel = new Map((branding.platform.socialLinks || []).map((s) => [s.label.toLowerCase(), s.url]));
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
        tenant_brand_color: branding.tenant.brandColor || index_1.DESIGN_TOKENS.masterBlue,
        platform_logo_url: branding.platform.logoUrl || "",
        platform_support_email: branding.platform.supportEmail,
        support_email: branding.platform.supportEmail,
        SUPPORT_EMAIL: branding.platform.supportEmail,
        platform_website: branding.platform.websiteUrl,
        platform_website_label: branding.platform.websiteLabel || (0, index_1.formatPublicWebsiteLabel)(branding.platform.websiteUrl),
        platform_copyright: branding.platform.copyrightText,
        platform_playstore_url: branding.platform.playStoreUrl || "https://play.google.com/store",
        platform_appstore_url: branding.platform.appStoreUrl || "https://apps.apple.com",
        platform_privacy_url: branding.platform.privacyPolicyUrl || `${branding.platform.websiteUrl.replace(/\/+$/, "")}/privacy-policy`,
        platform_social_facebook: socialByLabel.get("facebook") || "https://facebook.com",
        platform_social_x: socialByLabel.get("x") || "https://x.com",
        platform_social_instagram: socialByLabel.get("instagram") || "https://instagram.com",
        platform_social_linkedin: socialByLabel.get("linkedin") || "https://linkedin.com",
        platform_social_youtube: socialByLabel.get("youtube") || "https://youtube.com",
    };
}
