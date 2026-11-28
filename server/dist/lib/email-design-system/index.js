"use strict";
/**
 * MASTERHRMS — Universal Email Design System
 * ==========================================
 * Enterprise-grade, email-client-safe, component-based HTML email renderer
 * supporting 300+ transactional and notification templates across MasterHRMS.
 *
 * Two strict branding layers:
 * 1. Tenant Company Branding — Header (logo/text fallback, company name, optional tagline, brand accent)
 * 2. MasterHRMS Platform Branding — Footer (MasterHRMS logo, "Smart HR. Better Workforce.",
 *    platform social links, support email, website, copyright)
 *
 * Design System Principles:
 * - Table-based bulletproof HTML + inline CSS (Gmail, Outlook, Apple Mail, mobile clients)
 * - Zero JavaScript execution required inside email clients
 * - Readable when remote images are blocked
 * - Graceful wrapping for long tenant names and missing logos
 * - Empty sections are never rendered
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_PLACEHOLDER_BRANDING = exports.DEFAULT_PLATFORM_BRANDING = exports.DESIGN_TOKENS = void 0;
exports.formatPublicWebsiteLabel = formatPublicWebsiteLabel;
exports.TenantEmailHeader = TenantEmailHeader;
exports.EmailHero = EmailHero;
exports.EmailGreeting = EmailGreeting;
exports.EmailMessage = EmailMessage;
exports.EmailStatusBadge = EmailStatusBadge;
exports.EmailDetailsCard = EmailDetailsCard;
exports.EmailDataTable = EmailDataTable;
exports.EmailReminderBanner = EmailReminderBanner;
exports.EmailPrimaryAction = EmailPrimaryAction;
exports.EmailSecondaryAction = EmailSecondaryAction;
exports.MasterHRMSFooter = MasterHRMSFooter;
exports.substituteUniversalEmailVars = substituteUniversalEmailVars;
exports.renderUniversalEmail = renderUniversalEmail;
exports.DESIGN_TOKENS = {
    masterBlue: "#1d4ed8",
    masterBlueLight: "#eff6ff",
    masterBlueBorder: "#bfdbfe",
    navyFooter: "#0b162c",
    navyFooterBorder: "#1e293b",
    navySurface: "#13213c",
    inkPrimary: "#0f172a",
    inkSecondary: "#334155",
    inkMuted: "#64748b",
    pageBg: "#f1f5f9",
    cardBg: "#ffffff",
    subtleBg: "#f8fafc",
    borderSubtle: "#e2e8f0",
    fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};
function formatPublicWebsiteLabel(url) {
    if (!url)
        return "masterhrms.com";
    const trimmed = url.trim();
    if (/^{{[a-zA-Z0-9_]+}}$/.test(trimmed))
        return "{{platform_website_label}}";
    return trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || "masterhrms.com";
}
exports.DEFAULT_PLATFORM_BRANDING = {
    platformName: "MasterHRMS",
    logoUrl: "{{platform_logo_url}}",
    tagline: "Smart HR. Better Workforce.",
    supportEmail: "{{platform_support_email}}",
    websiteUrl: "{{platform_website}}",
    websiteLabel: "{{platform_website_label}}",
    copyrightText: "{{platform_copyright}}",
    playStoreUrl: "{{platform_playstore_url}}",
    appStoreUrl: "{{platform_appstore_url}}",
    privacyPolicyUrl: "{{platform_privacy_url}}",
    socialLinks: [
        { label: "Facebook", url: "{{platform_social_facebook}}" },
        { label: "X", url: "{{platform_social_x}}" },
        { label: "Instagram", url: "{{platform_social_instagram}}" },
        { label: "LinkedIn", url: "{{platform_social_linkedin}}" },
        { label: "YouTube", url: "{{platform_social_youtube}}" },
    ],
};
exports.TEMPLATE_PLACEHOLDER_BRANDING = {
    tenant: {
        companyName: "{{company_name}}",
        logoUrl: "{{tenant_logo_url}}",
        tagline: "{{tenant_tagline}}",
        brandColor: "{{tenant_brand_color}}",
    },
    platform: exports.DEFAULT_PLATFORM_BRANDING,
};
function sanitizeColor(color, fallback = exports.DESIGN_TOKENS.masterBlue) {
    if (!color)
        return fallback;
    const trimmed = color.trim();
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed))
        return trimmed;
    if (/^{{[a-zA-Z0-9_]+}}$/.test(trimmed))
        return trimmed;
    return fallback;
}
function getBadgeStyle(tone = "info") {
    switch (tone) {
        case "success":
            return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
        case "warning":
            return { bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
        case "danger":
            return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
        case "neutral":
            return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" };
        case "info":
        default:
            return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
    }
}
function getBannerStyle(tone = "info") {
    switch (tone) {
        case "warning":
            return {
                bg: "#fffbeb",
                border: "#fde68a",
                accent: "#d97706",
                titleColor: "#92400e",
                textColor: "#78350f",
            };
        case "danger":
            return {
                bg: "#fef2f2",
                border: "#fecaca",
                accent: "#dc2626",
                titleColor: "#991b1b",
                textColor: "#7f1d1d",
            };
        case "success":
            return {
                bg: "#f0fdf4",
                border: "#bbf7d0",
                accent: "#16a34a",
                titleColor: "#166534",
                textColor: "#14532d",
            };
        case "info":
        default:
            return {
                bg: "#eff6ff",
                border: "#bfdbfe",
                accent: "#1d4ed8",
                titleColor: "#1e3a8a",
                textColor: "#1e40af",
            };
    }
}
function getActionBg(tone, brandColor) {
    switch (tone) {
        case "danger":
            return "#dc2626";
        case "success":
            return "#16a34a";
        case "dark":
            return "#0f172a";
        case "primary":
        default:
            return brandColor || exports.DESIGN_TOKENS.masterBlue;
    }
}
/**
 * 1. TenantEmailHeader
 * Clean white header with tenant logo on left (or crisp text monogram if missing),
 * tenant company name, optional tagline, and subtle brand-color accent line.
 * Never renders MasterHRMS branding.
 */
function TenantEmailHeader(tenant) {
    const companyName = (tenant.companyName || "").trim();
    if (!companyName)
        return "";
    const brandColor = sanitizeColor(tenant.brandColor, exports.DESIGN_TOKENS.masterBlue);
    const logoUrl = (tenant.logoUrl || "").trim();
    const tagline = (tenant.tagline || "").trim();
    const initials = companyName
        .replace(/{{[^}]+}}/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("") || "CO";
    const isPlaceholderLogo = logoUrl === "{{tenant_logo_url}}";
    const hasLogo = Boolean(logoUrl);
    const logoCell = hasLogo
        ? `<!--TENANT_LOGO_START--><td align="left" valign="middle" style="padding-right: 16px; vertical-align: middle;">
        <img src="${logoUrl}" alt="${companyName}" style="display: block; height: 46px; max-height: 48px; max-width: 190px; width: auto; object-fit: contain; border: 0; outline: none; text-decoration: none;" />
      </td><!--TENANT_LOGO_END-->`
        : `<td align="left" valign="middle" style="padding-right: 16px; width: 46px; vertical-align: middle;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" valign="middle" style="width: 44px; height: 44px; border-radius: 10px; background-color: ${brandColor}; color: #ffffff; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">
              ${initials}
            </td>
          </tr>
        </table>
      </td>`;
    const taglineHtml = tagline && !tagline.includes("{{tenant_tagline}}")
        ? `<div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 12px; line-height: 1.4; color: ${exports.DESIGN_TOKENS.inkMuted}; margin-top: 2px; text-align: right; word-break: break-word;">${tagline}</div>`
        : isPlaceholderLogo
            ? `<!--TENANT_TAGLINE_START--><div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 12px; line-height: 1.4; color: ${exports.DESIGN_TOKENS.inkMuted}; margin-top: 2px; text-align: right; word-break: break-word;">{{tenant_tagline}}</div><!--TENANT_TAGLINE_END-->`
            : "";
    return `
    <!-- Tenant Header Brand Accent -->
    <tr>
      <td style="height: 4px; background-color: ${brandColor}; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <!-- Tenant Company Header -->
    <tr>
      <td style="background-color: #ffffff; padding: 16px 32px; border-bottom: 1px solid ${exports.DESIGN_TOKENS.borderSubtle};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            ${logoCell}
            <td align="right" valign="middle" style="min-width: 0; text-align: right; vertical-align: middle;">
              <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 17px; font-weight: 700; line-height: 1.3; color: ${exports.DESIGN_TOKENS.inkPrimary}; letter-spacing: -0.2px; text-align: right; word-break: break-word;">
                ${companyName}
              </div>
              ${taglineHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}
/**
 * 2. EmailHero
 * Reusable enterprise SaaS hero with light blue background, subtle blue gradient,
 * category pill, dynamic title, and optional subtitle.
 */
function EmailHero(props) {
    if (!props.title)
        return "";
    const accent = sanitizeColor(props.brandColor, exports.DESIGN_TOKENS.masterBlue);
    const badgeHtml = props.statusBadge ? EmailStatusBadge(props.statusBadge) : "";
    return `
    <!-- Notification Hero -->
    <tr>
      <td style="background-color: ${exports.DESIGN_TOKENS.masterBlueLight}; background: linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%); padding: 24px 32px; border-bottom: 1px solid #dbeafe;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom: 8px;">
              <span style="display: inline-block; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${accent};">
                ${props.category}
              </span>
              ${badgeHtml ? `&nbsp;&nbsp;${badgeHtml}` : ""}
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="margin: 0; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 21px; font-weight: 700; line-height: 1.3; color: ${exports.DESIGN_TOKENS.inkPrimary}; letter-spacing: -0.3px;">
                ${props.title}
              </h1>
              ${props.subtitle
        ? `<p style="margin: 6px 0 0 0; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 13px; line-height: 1.5; color: ${exports.DESIGN_TOKENS.inkMuted};">${props.subtitle}</p>`
        : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}
/**
 * 3. EmailGreeting
 */
function EmailGreeting(greeting) {
    if (!greeting || !greeting.trim())
        return "";
    return `
    <p style="margin: 0 0 14px 0; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 15px; font-weight: 600; line-height: 1.5; color: ${exports.DESIGN_TOKENS.inkPrimary};">
      ${greeting}
    </p>`;
}
/**
 * 4. EmailMessage
 */
function EmailMessage(messages) {
    if (!messages || messages.length === 0)
        return "";
    const valid = messages.filter((m) => m && m.trim().length > 0);
    if (valid.length === 0)
        return "";
    return valid
        .map((msg) => `
    <p style="margin: 0 0 16px 0; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 14px; line-height: 1.65; color: ${exports.DESIGN_TOKENS.inkSecondary};">
      ${msg}
    </p>`)
        .join("");
}
/**
 * 5. EmailStatusBadge
 */
function EmailStatusBadge(props) {
    if (!props || !props.label || !props.label.trim())
        return "";
    const style = getBadgeStyle(props.tone);
    return `<span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; letter-spacing: 0.2px; background-color: ${style.bg}; color: ${style.color}; border: 1px solid ${style.border}; vertical-align: middle;">${props.label}</span>`;
}
/**
 * 6. EmailDetailsCard
 */
function EmailDetailsCard(props) {
    if (!props.rows || props.rows.length === 0)
        return "";
    const accent = sanitizeColor(props.brandColor, exports.DESIGN_TOKENS.masterBlue);
    const rowsHtml = props.rows
        .map((row, idx) => {
        const borderBottom = idx < props.rows.length - 1 ? `border-bottom: 1px solid #edf2f7;` : "";
        const renderedValue = row.badgeTone
            ? EmailStatusBadge({ label: row.value, tone: row.badgeTone })
            : row.value;
        return `
        <tr>
          <td valign="top" style="padding: 8px 12px 8px 0; ${borderBottom} width: 38%; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 13px; font-weight: 600; color: ${exports.DESIGN_TOKENS.inkMuted};">
            ${row.label}
          </td>
          <td valign="top" style="padding: 8px 0; ${borderBottom} font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 13px; font-weight: 500; color: ${exports.DESIGN_TOKENS.inkPrimary}; word-break: break-word;">
            ${renderedValue}
          </td>
        </tr>`;
    })
        .join("");
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 20px 0; background-color: ${exports.DESIGN_TOKENS.subtleBg}; border: 1px solid ${exports.DESIGN_TOKENS.borderSubtle}; border-left: 3px solid ${accent}; border-radius: 8px;">
      <tr>
        <td style="padding: 16px 20px;">
          ${props.title
        ? `<div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: ${exports.DESIGN_TOKENS.inkMuted}; margin-bottom: 10px;">${props.title}</div>`
        : ""}
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}
/**
 * 7. EmailDataTable
 */
function EmailDataTable(props) {
    if (!props || !props.columns?.length || !props.rows?.length)
        return "";
    const headerCells = props.columns
        .map((col) => `<th align="${col.align || "left"}" style="padding: 10px 12px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${exports.DESIGN_TOKENS.inkMuted}; background-color: #f8fafc; border-bottom: 1px solid ${exports.DESIGN_TOKENS.borderSubtle};">${col.header}</th>`)
        .join("");
    const bodyRows = props.rows
        .map((cells, rowIdx) => {
        const bg = rowIdx % 2 === 1 ? "#fafcff" : "#ffffff";
        const borderBottom = rowIdx < props.rows.length - 1 ? `border-bottom: 1px solid #f1f5f9;` : "";
        const tds = cells
            .map((cell, colIdx) => {
            const align = props.columns[colIdx]?.align || "left";
            return `<td align="${align}" style="padding: 10px 12px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 13px; color: ${exports.DESIGN_TOKENS.inkPrimary}; ${borderBottom}">${cell}</td>`;
        })
            .join("");
        return `<tr style="background-color: ${bg};">${tds}</tr>`;
    })
        .join("");
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 20px 0; border: 1px solid ${exports.DESIGN_TOKENS.borderSubtle}; border-radius: 8px; overflow: hidden; border-collapse: separate;">
      ${props.caption
        ? `<tr><td colspan="${props.columns.length}" style="padding: 10px 12px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 12px; font-weight: 700; color: ${exports.DESIGN_TOKENS.inkPrimary}; background-color: #f8fafc; border-bottom: 1px solid ${exports.DESIGN_TOKENS.borderSubtle};">${props.caption}</td></tr>`
        : ""}
      <tr>${headerCells}</tr>
      ${bodyRows}
    </table>`;
}
/**
 * 8. EmailReminderBanner
 */
function EmailReminderBanner(props) {
    if (!props || !props.message || !props.message.trim())
        return "";
    const style = getBannerStyle(props.tone);
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 20px 0; background-color: ${style.bg}; border: 1px solid ${style.border}; border-left: 4px solid ${style.accent}; border-radius: 8px;">
      <tr>
        <td style="padding: 14px 16px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 13px; line-height: 1.55; color: ${style.textColor};">
          ${props.title
        ? `<div style="font-weight: 700; color: ${style.titleColor}; margin-bottom: 4px;">${props.title}</div>`
        : ""}
          <div>${props.message}</div>
        </td>
      </tr>
    </table>`;
}
/**
 * 9. EmailPrimaryAction
 */
function EmailPrimaryAction(props, brandColor) {
    if (!props || !props.label || !props.url)
        return "";
    const bg = getActionBg(props.tone, sanitizeColor(brandColor, exports.DESIGN_TOKENS.masterBlue));
    return `
    <td align="center" style="border-radius: 8px; background-color: ${bg};">
      <a href="${props.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; border: 1px solid ${bg};">
        ${props.label}
      </a>
    </td>`;
}
/**
 * 10. EmailSecondaryAction
 */
function EmailSecondaryAction(props) {
    if (!props || !props.label || !props.url)
        return "";
    return `
    <td align="center" style="border-radius: 8px; background-color: #ffffff; border: 1px solid #cbd5e1;">
      <a href="${props.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 11px 20px; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 14px; font-weight: 600; color: ${exports.DESIGN_TOKENS.inkPrimary}; text-decoration: none; border-radius: 8px;">
        ${props.label}
      </a>
    </td>`;
}
function renderActionSection(primary, secondary, brandColor) {
    const primaryCell = EmailPrimaryAction(primary, brandColor);
    const secondaryCell = EmailSecondaryAction(secondary);
    if (!primaryCell && !secondaryCell)
        return "";
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 8px 0;">
      <tr>
        ${primaryCell}
        ${primaryCell && secondaryCell ? `<td style="width: 12px; font-size: 0; line-height: 0;">&nbsp;</td>` : ""}
        ${secondaryCell}
      </tr>
    </table>`;
}
function getSocialIconSvg(label) {
    const key = label.toLowerCase();
    if (key.includes("facebook")) {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="#1e293b" xmlns="http://www.w3.org/2000/svg" style="display:block;"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>`;
    }
    if (key === "x" || key.includes("twitter")) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="#1e293b" xmlns="http://www.w3.org/2000/svg" style="display:block;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    }
    if (key.includes("instagram")) {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:block;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
    }
    if (key.includes("linkedin")) {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="#1e293b" xmlns="http://www.w3.org/2000/svg" style="display:block;"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>`;
    }
    if (key.includes("youtube")) {
        return `<svg width="17" height="17" viewBox="0 0 24 24" fill="#1e293b" xmlns="http://www.w3.org/2000/svg" style="display:block;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    }
    return `<span style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; color: #1e293b;">${label}</span>`;
}
/**
 * 11. MasterHRMSFooter
 * Clean 2-column enterprise SaaS footer matching the approved MasterHRMS visual layout:
 * - Left: MasterHRMS Platform Logo + tagline ("Smart HR. Better Workforce.") + monochrome social icons
 * - Right: Mobile app download copy + Google Play & App Store clean bordered buttons
 * - Bottom: Divider + Support email + Public website domain (no https:// in UI, clickable https:// href) + Privacy Policy & Copyright
 */
function MasterHRMSFooter(platform) {
    const name = platform.platformName || "MasterHRMS";
    const tagline = platform.tagline || "Smart HR. Better Workforce.";
    const supportEmail = platform.supportEmail || "support@masterhrms.com";
    const websiteUrl = platform.websiteUrl || "https://masterhrms.com";
    const websiteLabel = platform.websiteLabel || formatPublicWebsiteLabel(websiteUrl);
    const copyrightText = platform.copyrightText || `© ${new Date().getFullYear()} ${name}. All rights reserved.`;
    const logoUrl = (platform.logoUrl || "").trim();
    const playStoreUrl = platform.playStoreUrl || "#";
    const appStoreUrl = platform.appStoreUrl || "#";
    const privacyPolicyUrl = platform.privacyPolicyUrl || `${websiteUrl}/privacy-policy`;
    const socialCells = platform.socialLinks && platform.socialLinks.length > 0
        ? platform.socialLinks
            .map((s) => `<td valign="middle" style="padding-right: 12px;">
                <a href="${s.url}" target="_blank" rel="noopener noreferrer" title="${s.label}" style="text-decoration: none; color: #1e293b; display: inline-block;">
                  ${getSocialIconSvg(s.label)}
                </a>
              </td>`)
            .join("")
        : "";
    const platformLogoHtml = logoUrl
        ? `<!--PLATFORM_LOGO_START--><img src="${logoUrl}" alt="${name}" style="display: block; max-height: 28px; max-width: 150px; width: auto; height: auto; border: 0; margin-bottom: 6px;" /><!--PLATFORM_LOGO_END-->`
        : `<div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 18px; font-weight: 800; color: ${exports.DESIGN_TOKENS.inkPrimary}; letter-spacing: -0.3px; margin-bottom: 4px;">${name}</div>`;
    return `
    <!-- MasterHRMS Platform Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 28px 32px 24px 32px; border-top: 1px solid ${exports.DESIGN_TOKENS.borderSubtle};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <!-- Left Column: Platform Logo + Tagline + Social Icons -->
            <td valign="top" width="46%" style="padding-right: 16px; padding-bottom: 18px;">
              ${platformLogoHtml}
              <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 500; color: ${exports.DESIGN_TOKENS.inkMuted}; margin-bottom: 16px;">
                ${tagline}
              </div>
              ${socialCells
        ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>${socialCells}</tr></table>`
        : ""}
            </td>

            <!-- Right Column: App Download Copy + Play Store & App Store Badges -->
            <td valign="top" width="54%" style="padding-left: 8px; padding-bottom: 18px;">
              <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 12px; line-height: 1.5; color: ${exports.DESIGN_TOKENS.inkSecondary}; margin-bottom: 12px;">
                Download <strong>${name}</strong> app on Play Store and App Store to stay connected with your workforce.
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Google Play Button -->
                  <td valign="middle" style="padding-right: 8px;">
                    <a href="${playStoreUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; text-decoration: none;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right: 6px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                              <path d="M3.609 1.814L13.792 12 3.61 22.186a1.75 1.75 0 0 1-.61-1.334V3.148c0-.52.226-.997.609-1.334z" fill="#3b82f6"/>
                              <path d="M17.207 8.585L13.792 12l3.415 3.415 3.86-2.198c.775-.442.775-1.565 0-2.006l-3.86-2.626z" fill="#f59e0b"/>
                              <path d="M3.609 22.186L13.792 12l3.415 3.415-11.55 6.576c-.726.413-1.577.45-2.048.195z" fill="#ef4444"/>
                              <path d="M17.207 8.585L5.657 2.009c-.471-.255-1.322-.218-2.048-.195L13.792 12l3.415-3.415z" fill="#10b981"/>
                            </svg>
                          </td>
                          <td valign="middle" style="line-height: 1.15;">
                            <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">GET IT ON</div>
                            <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; color: #0f172a;">Google Play</div>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <!-- App Store Button -->
                  <td valign="middle">
                    <a href="${appStoreUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; text-decoration: none;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right: 6px;">
                            <svg width="15" height="16" viewBox="0 0 24 24" fill="#0f172a" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.78-.96 2.84 1.04.08 2.09-.52 2.72-1.3z"/>
                            </svg>
                          </td>
                          <td valign="middle" style="line-height: 1.15;">
                            <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 8px; font-weight: 500; color: #64748b;">Download on the</div>
                            <div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 11px; font-weight: 700; color: #0f172a;">App Store</div>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider & Bottom Legal / Support / Public Website Row -->
          <tr>
            <td colspan="2" align="center" style="padding-top: 18px; border-top: 1px solid ${exports.DESIGN_TOKENS.borderSubtle}; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 12px; line-height: 1.65; color: ${exports.DESIGN_TOKENS.inkMuted};">
              Need assistance? Contact
              <a href="mailto:${supportEmail}" style="color: ${exports.DESIGN_TOKENS.inkPrimary}; font-weight: 600; text-decoration: underline;">${supportEmail}</a>
              or visit
              <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color: ${exports.DESIGN_TOKENS.inkPrimary}; font-weight: 600; text-decoration: underline;">${websiteLabel}</a>.
              You can view our
              <a href="${privacyPolicyUrl}" target="_blank" rel="noopener noreferrer" style="color: ${exports.DESIGN_TOKENS.inkPrimary}; font-weight: 600; text-decoration: underline;">privacy policy</a>.
              <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
                ${copyrightText}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}
/**
 * Substitutes {{variable}} tokens into rendered Universal Email HTML and gracefully
 * handles empty tenant/platform logo or tagline placeholders so no broken <img> ever renders.
 */
function substituteUniversalEmailVars(html, vars) {
    if (!html)
        return "";
    let out = html;
    const companyName = vars.company_name || vars.COMPANY_NAME || "Organization";
    const brandColor = sanitizeColor(vars.tenant_brand_color, exports.DESIGN_TOKENS.masterBlue);
    const tenantLogoUrl = (vars.tenant_logo_url || "").trim();
    const tenantTagline = (vars.tenant_tagline || "").trim();
    const platformLogoUrl = (vars.platform_logo_url || "").trim();
    // If tenant_logo_url is empty, swap the logo <td> to the clean monogram identity
    if (!tenantLogoUrl) {
        const initials = companyName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() || "")
            .join("") || "CO";
        const monogramCell = `<td align="left" valign="middle" style="padding-right: 16px; width: 46px; vertical-align: middle;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="width: 44px; height: 44px; border-radius: 10px; background-color: ${brandColor}; color: #ffffff; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">${initials}</td></tr></table></td>`;
        out = out.replace(/<!--TENANT_LOGO_START-->[\s\S]*?<!--TENANT_LOGO_END-->/g, monogramCell);
    }
    // If tenant_tagline is empty, remove the tagline block cleanly
    if (!tenantTagline) {
        out = out.replace(/<!--TENANT_TAGLINE_START-->[\s\S]*?<!--TENANT_TAGLINE_END-->/g, "");
    }
    // If platform_logo_url is empty, swap the platform logo to crisp typography
    if (!platformLogoUrl) {
        out = out.replace(/<!--PLATFORM_LOGO_START-->[\s\S]*?<!--PLATFORM_LOGO_END-->/g, `<div style="font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 18px; font-weight: 800; color: ${exports.DESIGN_TOKENS.inkPrimary}; letter-spacing: -0.3px; margin-bottom: 4px;">MasterHRMS</div>`);
    }
    // Auto-derive platform_website_label (never show https:// in visible UI)
    const mergedVars = {
        ...vars,
        platform_website_label: vars.platform_website_label || formatPublicWebsiteLabel(vars.platform_website),
    };
    for (const [k, v] of Object.entries(mergedVars)) {
        out = out.replace(new RegExp(`{{${k}}}`, "g"), v ?? "");
    }
    return out;
}
/**
 * Renders any UniversalEmailTemplateConfig into a complete, email-client-safe HTML document.
 */
function renderUniversalEmail(config, branding = exports.TEMPLATE_PLACEHOLDER_BRANDING) {
    const brandColor = sanitizeColor(branding.tenant.brandColor, exports.DESIGN_TOKENS.masterBlue);
    const bodySections = [
        EmailGreeting(config.greeting),
        EmailMessage(config.messages),
        config.customBlockHtml || "",
        EmailDetailsCard({
            title: config.detailsTitle,
            rows: config.details,
            brandColor,
        }),
        EmailDataTable(config.table),
        EmailReminderBanner(config.reminder),
        renderActionSection(config.primaryAction, config.secondaryAction, brandColor),
        config.supportingNote
            ? `<p style="margin: 20px 0 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9; font-family: ${exports.DESIGN_TOKENS.fontStack}; font-size: 12px; line-height: 1.6; color: ${exports.DESIGN_TOKENS.inkMuted};">${config.supportingNote}</p>`
            : "",
    ]
        .filter(Boolean)
        .join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${config.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${exports.DESIGN_TOKENS.pageBg}; font-family: ${exports.DESIGN_TOKENS.fontStack}; color: ${exports.DESIGN_TOKENS.inkPrimary}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${exports.DESIGN_TOKENS.pageBg}; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: ${exports.DESIGN_TOKENS.cardBg}; border: 1px solid ${exports.DESIGN_TOKENS.borderSubtle}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
          ${TenantEmailHeader(branding.tenant)}
          ${EmailHero({
        category: config.category,
        title: config.heroTitle,
        subtitle: config.heroSubtitle,
        statusBadge: config.statusBadge,
        brandColor,
    })}
          <tr>
            <td style="padding: 28px 32px; background-color: #ffffff;">
              ${bodySections}
            </td>
          </tr>
          ${MasterHRMSFooter(branding.platform)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
