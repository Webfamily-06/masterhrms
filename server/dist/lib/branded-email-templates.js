"use strict";
/**
 * MASTERHRMS — Official Branded Email Templates
 * =============================================
 * Single source of truth for responsive, accessible, brand-compliant HTML email layouts:
 * - Brand Colors: Primary Orange (#ea580c / #FF6B00), Dark Slate (#0f172a, #1e293b), Border (#e2e8f0)
 * - Official Logo: /logo.webp with fallback to MasterHRMS typography badge
 * - Single-table bulletproof responsive structure
 * - Security footer with automated notification disclaimers
 * - ZERO sensitive passwords, raw TOTP secrets, or recovery codes in generated markup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEmailVerificationTemplate = renderEmailVerificationTemplate;
exports.renderWelcomeTemplate = renderWelcomeTemplate;
exports.renderPasswordChangedTemplate = renderPasswordChangedTemplate;
exports.renderTwoFactorStatusTemplate = renderTwoFactorStatusTemplate;
exports.renderTrialActivatedTemplate = renderTrialActivatedTemplate;
const DEFAULT_LOGO_URL = "https://app.masterhrms.com/logo.webp";
const DEFAULT_APP_NAME = "MasterHRMS";
const DEFAULT_SUPPORT_EMAIL = "support@masterhrms.com";
function getHeaderHtml(appName, logoUrl) {
    const effectiveLogo = logoUrl || DEFAULT_LOGO_URL;
    return `
    <tr>
      <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 24px; text-align: center;">
        <img src="${effectiveLogo}" alt="${appName}" style="max-height: 48px; max-width: 200px; width: auto; height: auto; margin-bottom: 12px; display: inline-block; border: 0;" onerror="this.style.display='none'" />
        <div style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${appName}</div>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Enterprise HR & Workforce Management Platform</p>
      </td>
    </tr>
  `;
}
function getFooterHtml(appName, supportEmail, year) {
    return `
    <tr>
      <td align="center" style="padding: 24px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is an automated system notification from <strong>${appName}</strong>.<br>
        If you have questions or suspect unauthorized activity, contact <a href="mailto:${supportEmail}" style="color: #ea580c; text-decoration: none;">${supportEmail}</a>.<br>
        © ${year} ${appName}. All rights reserved.
      </td>
    </tr>
  `;
}
function wrapEmailDocument(title, appName, contentHtml, options = {}) {
    const effectiveAppName = options.appName || DEFAULT_APP_NAME;
    const effectiveSupport = options.supportEmail || DEFAULT_SUPPORT_EMAIL;
    const currentYear = options.year || new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} | ${effectiveAppName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 28px 12px; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    ${getHeaderHtml(effectiveAppName, options.logoUrl)}
    <tr>
      <td style="padding: 36px 28px;">
        ${contentHtml}
      </td>
    </tr>
    ${getFooterHtml(effectiveAppName, effectiveSupport, currentYear)}
  </table>
</body>
</html>`;
}
/**
 * 1. Email Verification Template
 */
function renderEmailVerificationTemplate(params) {
    const { userName, verificationUrl, otpCode, expiryMinutes = 60, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">Verify Your Work Email Address</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
      Hello <strong>${userName}</strong>,<br><br>
      Thank you for registering your organization on ${appName}. To activate your workspace and begin your free trial, please verify your email address.
    </p>

    <!-- Verification Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #ea580c;">
          <a href="${verificationUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 8px;">
            Verify Email & Activate Workspace →
          </a>
        </td>
      </tr>
    </table>

    <!-- 6-Digit Code Fallback -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; margin: 0 0 24px 0; text-align: center;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #64748b; margin-bottom: 8px;">Or Enter This 6-Digit Code in Your Browser</div>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 900; color: #ea580c; letter-spacing: 6px;">${otpCode}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Valid for ${expiryMinutes} minutes</div>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color: #ea580c; word-break: break-all;">${verificationUrl}</a>
    </p>

    <p style="font-size: 13px; color: #475569; margin: 0;">
      If you did not register for ${appName}, please ignore this email.
    </p>
  `;
    return wrapEmailDocument("Verify Your Email", appName, content, options);
}
/**
 * 2. Welcome to MasterHRMS Template
 */
function renderWelcomeTemplate(params) {
    const { userName, companyName, workspaceUrl, loginUrl, trialDays = 14, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    const content = `
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">Welcome to ${appName}! 🎉</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      Hello <strong>${userName}</strong>,<br><br>
      Your workspace for <strong>${companyName}</strong> has been successfully provisioned and is ready for use.
    </p>

    <!-- Trial Information Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 0 0 28px 0;">
      <tr>
        <td>
          <div style="font-size: 14px; font-weight: 700; color: #166534; margin-bottom: 4px;">✅ Free ${trialDays}-Day Full Access Trial Active</div>
          <div style="font-size: 13px; color: #15803d; line-height: 1.5;">
            Your account includes access to all core modules: Employee Management, Attendance & Shifts, Payroll Engine, Statutory Compliance, and Organization Workspace.
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #ea580c;">
          <a href="${workspaceUrl || loginUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 30px; display: inline-block; border-radius: 8px;">
            Open Your Workspace Dashboard →
          </a>
        </td>
      </tr>
    </table>

    <!-- Workspace Details Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 0 0 24px 0; font-size: 13px;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Workspace Organization:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;" align="right">${companyName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Assigned Role:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;" align="right">Tenant Administrator</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Portal Access:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;" align="right">/tenant/dashboard</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #475569; margin: 0;">
      Need help setting up your team? Check our Getting Started checklist directly from your dashboard or reply to this email for dedicated support.
    </p>
  `;
    return wrapEmailDocument("Welcome to MasterHRMS", appName, content, options);
}
/**
 * 3. Password Changed Security Notification
 */
function renderPasswordChangedTemplate(params) {
    const { userName, changedAt, loginUrl, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">Security Alert: Password Updated</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      Hello <strong>${userName}</strong>,<br><br>
      The password for your ${appName} account was successfully updated on <strong>${changedAt}</strong>.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border-left: 4px solid #ea580c; border-radius: 6px; padding: 14px 16px; margin: 0 0 24px 0; font-size: 13px; color: #9a3412;">
      <tr>
        <td>
          <strong>Security Notice:</strong> All prior active web and mobile device sessions have been terminated for security. You must sign in again with your new credentials.
        </td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #0f172a;">
          <a href="${loginUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block; border-radius: 8px;">
            Sign In with New Password →
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #dc2626; font-weight: 600; margin: 0;">
      ⚠️ If you did NOT make this change, your account may be compromised. Please contact support immediately.
    </p>
  `;
    return wrapEmailDocument("Password Changed Security Notification", appName, content, options);
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
            ? "Two-Factor Authentication has been DISABLED on your account."
            : "A single-use backup recovery code was just used to sign in to your account.";
    const alertColor = action === "ENABLED" ? "#166534" : "#b91c1c";
    const alertBg = action === "ENABLED" ? "#f0fdf4" : "#fef2f2";
    const alertBorder = action === "ENABLED" ? "#22c55e" : "#ef4444";
    const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">Security Notification: 2FA Update</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      Hello <strong>${userName}</strong>,<br><br>
      This email is to notify you of an authentication security event on your account at <strong>${timestamp}</strong>.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${alertBg}; border-left: 4px solid ${alertBorder}; border-radius: 6px; padding: 14px 16px; margin: 0 0 24px 0; font-size: 13px; color: ${alertColor};">
      <tr>
        <td>
          <strong>Event:</strong> ${actionText}
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #64748b; margin: 0;">
      If you did not initiate this security change, please review your account settings and contact your administrator immediately.
    </p>
  `;
    return wrapEmailDocument("2FA Security Notification", appName, content, options);
}
/**
 * 5. Trial Activated Notification
 */
function renderTrialActivatedTemplate(params) {
    const { companyName, adminName, trialEndsAt, trialDays, dashboardUrl, options } = params;
    const appName = options?.appName || DEFAULT_APP_NAME;
    const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">Free Trial Activated for ${companyName}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      Dear <strong>${adminName}</strong>,<br><br>
      Your ${trialDays}-day free trial for <strong>${companyName}</strong> is now live! You have full access to explore the platform through <strong>${trialEndsAt}</strong>.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: #ea580c;">
          <a href="${dashboardUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 12px 26px; display: inline-block; border-radius: 8px;">
            Go to Tenant Workspace →
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #64748b; margin: 0;">
      No credit card is required during your trial. Upgrade anytime to ensure uninterrupted access.
    </p>
  `;
    return wrapEmailDocument("Free Trial Activated", appName, content, options);
}
