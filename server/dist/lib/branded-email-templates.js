"use strict";
/**
 * MASTERHRMS — Official Branded Email Templates
 * =============================================
 * Migrated to the MasterHRMS Universal Email Design System.
 * Preserves all existing function signatures, parameters, and security guarantees
 * (ZERO sensitive passwords, raw TOTP secrets, or recovery codes in generated markup).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEmailVerificationTemplate = renderEmailVerificationTemplate;
exports.renderWelcomeTemplate = renderWelcomeTemplate;
exports.renderPasswordChangedTemplate = renderPasswordChangedTemplate;
exports.renderTwoFactorStatusTemplate = renderTwoFactorStatusTemplate;
exports.renderTrialActivatedTemplate = renderTrialActivatedTemplate;
const email_design_system_1 = require("./email-design-system");
const DEFAULT_APP_NAME = "MasterHRMS";
const DEFAULT_SUPPORT_EMAIL = "support@masterhrms.com";
const DEFAULT_WEBSITE_URL = "https://masterhrms.com";
function buildBranding(tenantCompanyName, options = {}) {
    const year = options.year || new Date().getFullYear();
    return {
        tenant: {
            companyName: tenantCompanyName || options.appName || DEFAULT_APP_NAME,
            logoUrl: options.logoUrl || "",
            tagline: options.tagline || "",
            brandColor: options.brandColor || email_design_system_1.DESIGN_TOKENS.masterBlue,
        },
        platform: {
            ...email_design_system_1.DEFAULT_PLATFORM_BRANDING,
            platformName: "MasterHRMS",
            logoUrl: options.platformLogoUrl || "",
            supportEmail: options.supportEmail || DEFAULT_SUPPORT_EMAIL,
            websiteUrl: options.websiteUrl || DEFAULT_WEBSITE_URL,
            copyrightText: `© ${year} MasterHRMS. All rights reserved.`,
        },
    };
}
/**
 * 1. Email Verification Template
 */
function renderEmailVerificationTemplate(params) {
    const { userName, verificationUrl, otpCode, expiryMinutes = 60, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    const otpBoxHtml = `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; margin: 18px 0 20px 0; text-align: center;">
      <tr>
        <td style="padding: 18px 20px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; color: #64748b; margin-bottom: 8px;">Or Enter This 6-Digit Verification Code</div>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 800; color: #1d4ed8; letter-spacing: 6px;">${otpCode}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Valid for ${expiryMinutes} minutes</div>
        </td>
      </tr>
    </table>`;
    return (0, email_design_system_1.renderUniversalEmail)({
        id: "auth-email-verification",
        subject: `Verify Your Work Email Address | ${appName}`,
        category: "Account Verification",
        heroTitle: "Verify Your Work Email Address",
        heroSubtitle: "Complete verification to activate your organization workspace.",
        greeting: `Hello ${userName},`,
        messages: [
            `Thank you for registering your organization on ${appName}. To activate your workspace and begin your trial, please confirm your email address using the button or 6-digit code below.`,
        ],
        customBlockHtml: otpBoxHtml,
        primaryAction: {
            label: "Verify Email & Activate Workspace",
            url: verificationUrl,
            tone: "primary",
        },
        supportingNote: `If the button does not work, copy and paste this URL into your browser: <a href="${verificationUrl}" style="color: #1d4ed8; word-break: break-all;">${verificationUrl}</a>. If you did not register for ${appName}, you may safely ignore this email.`,
    }, buildBranding(appName, options));
}
/**
 * 2. Welcome to MasterHRMS Template
 */
function renderWelcomeTemplate(params) {
    const { userName, companyName, workspaceUrl, loginUrl, trialDays = 14, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    return (0, email_design_system_1.renderUniversalEmail)({
        id: "onboarding-welcome",
        subject: `Welcome to ${appName}`,
        category: "Workspace Onboarding",
        heroTitle: `Welcome to ${appName}`,
        heroSubtitle: `Your organization workspace for ${companyName} is ready.`,
        statusBadge: { label: `${trialDays}-Day Trial Active`, tone: "success" },
        greeting: `Hello ${userName},`,
        messages: [
            `Your workspace for <strong>${companyName}</strong> has been successfully provisioned and is ready for your team.`,
        ],
        detailsTitle: "Workspace Summary",
        details: [
            { label: "Organization", value: companyName },
            { label: "Assigned Role", value: "Tenant Administrator" },
            { label: "Portal Path", value: "/tenant/dashboard" },
        ],
        reminder: {
            title: `Free ${trialDays}-Day Full Access Trial`,
            message: "Your workspace includes access to Employee Management, Attendance & Shifts, Payroll Engine, Statutory Compliance, and Organization Settings.",
            tone: "success",
        },
        primaryAction: {
            label: "Open Workspace Dashboard",
            url: workspaceUrl || loginUrl,
            tone: "primary",
        },
        supportingNote: "Need assistance onboarding your team? Review the Getting Started checklist inside your dashboard or contact MasterHRMS Support.",
    }, buildBranding(companyName, options));
}
/**
 * 3. Password Changed Security Notification
 */
function renderPasswordChangedTemplate(params) {
    const { userName, changedAt, loginUrl, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    return (0, email_design_system_1.renderUniversalEmail)({
        id: "security-password-changed",
        subject: "Security Alert: Password Updated",
        category: "Account Security",
        heroTitle: "Password Updated Successfully",
        heroSubtitle: "Your account credentials were changed.",
        statusBadge: { label: "Security Alert", tone: "warning" },
        greeting: `Hello ${userName},`,
        messages: [
            `The password for your ${appName} account was successfully updated on <strong>${changedAt}</strong>.`,
        ],
        reminder: {
            title: "Active Sessions Terminated",
            message: "All prior active web and mobile sessions have been signed out for your protection. Sign in again using your new password.",
            tone: "warning",
        },
        primaryAction: {
            label: "Sign In with New Password",
            url: loginUrl,
            tone: "dark",
        },
        supportingNote: "If you did not authorize this change, please reset your password immediately and contact platform support.",
    }, buildBranding(appName, options));
}
/**
 * 4. Two-Factor Authentication Status Changed
 */
function renderTwoFactorStatusTemplate(params) {
    const { userName, action, timestamp, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    const actionText = action === "ENABLED"
        ? "Two-Factor Authentication (TOTP) has been enabled on your account."
        : action === "DISABLED"
            ? "Two-Factor Authentication has been disabled on your account."
            : "A single-use backup recovery code was used to sign in to your account.";
    const isEnabled = action === "ENABLED";
    return (0, email_design_system_1.renderUniversalEmail)({
        id: "security-2fa-status",
        subject: "Security Notification: Two-Factor Authentication Update",
        category: "Account Security",
        heroTitle: "Two-Factor Authentication Update",
        heroSubtitle: "An authentication security change occurred on your account.",
        statusBadge: {
            label: isEnabled ? "2FA Enabled" : action === "DISABLED" ? "2FA Disabled" : "Backup Code Used",
            tone: isEnabled ? "success" : "danger",
        },
        greeting: `Hello ${userName},`,
        messages: [
            `This notification confirms a security event recorded on your account at <strong>${timestamp}</strong>.`,
        ],
        reminder: {
            title: "Security Event",
            message: actionText,
            tone: isEnabled ? "success" : "danger",
        },
        supportingNote: "If you did not initiate this change, review your security settings and notify your administrator immediately.",
    }, buildBranding(appName, options));
}
/**
 * 5. Trial Activated Notification
 */
function renderTrialActivatedTemplate(params) {
    const { companyName, adminName, trialEndsAt, trialDays, dashboardUrl, options } = params;
    return (0, email_design_system_1.renderUniversalEmail)({
        id: "subscription-trial-activated",
        subject: `Free Trial Activated for ${companyName}`,
        category: "Subscription & Trial",
        heroTitle: `Free Trial Activated for ${companyName}`,
        heroSubtitle: `Full platform access is live for ${trialDays} days.`,
        statusBadge: { label: "Trial Live", tone: "success" },
        greeting: `Dear ${adminName},`,
        messages: [
            `Your ${trialDays}-day free trial for <strong>${companyName}</strong> is now active. You have full access to explore all modules through <strong>${trialEndsAt}</strong>.`,
        ],
        detailsTitle: "Trial Details",
        details: [
            { label: "Organization", value: companyName },
            { label: "Trial Duration", value: `${trialDays} Days` },
            { label: "Trial Ends On", value: trialEndsAt },
        ],
        primaryAction: {
            label: "Open Tenant Workspace",
            url: dashboardUrl,
            tone: "primary",
        },
        supportingNote: "No credit card is required during your trial period. You can upgrade anytime from Billing & Subscriptions for uninterrupted access.",
    }, buildBranding(companyName, options));
}
