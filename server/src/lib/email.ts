import nodemailer from "nodemailer";
import { prisma } from "../prisma";

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpEncryption: "ssl" | "tls" | "none";
  smtpFromName: string;
  smtpFromEmail: string;
  ignoreTls?: boolean;        // Set true for Hostinger/cPanel servers that fail STARTTLS but support plain AUTH on 587
  appName?: string;
  logoUrl?: string;
  otpEmailSubject?: string;
  otpEmailTemplate?: string;
}

/**
 * Fetch latest SMTP and Email Template settings dynamically from Database
 */
export async function getDynamicEmailConfig(): Promise<SmtpConfig> {
  try {
    const page = await prisma.cmsPage.findFirst({
      where: { slug: "system-platform-settings" },
    });

    if (page?.content) {
      const c = typeof page.content === "string" ? JSON.parse(page.content) : (page.content as any);
      let logoUrl = c.logoLightUrl || c.logoDarkUrl || "";
      if (logoUrl && !logoUrl.startsWith("http://") && !logoUrl.startsWith("https://")) {
        const baseUrl = (c.frontendBaseUrl || "https://masterhrms.com").replace(/\/$/, "");
        logoUrl = `${baseUrl}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
      }

      if (c.smtpHost && c.smtpUser && c.smtpPass) {
        return {
          smtpHost: String(c.smtpHost).trim(),
          smtpPort: parseInt(String(c.smtpPort || "465"), 10),
          smtpUser: String(c.smtpUser).trim(),
          smtpPass: String(c.smtpPass).trim(),
          smtpEncryption: (c.smtpEncryption || "ssl") as any,
          smtpFromName: c.smtpFromName || "Master HRMS System",
          smtpFromEmail: c.smtpFromEmail || c.smtpUser,
          ignoreTls: c.smtpIgnoreTls === true || c.smtpIgnoreTls === "true" || false,
          appName: c.appName || "Master HRMS & ERP",
          logoUrl: logoUrl || undefined,
          otpEmailSubject: c.otpEmailSubject || undefined,
          otpEmailTemplate: c.otpEmailTemplate || undefined,
        };
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Could not load dynamic SMTP settings from DB, checking .env fallback:", err.message);
  }

  // Fallback to process.env — check both bare SMTP_* and VITE_SMTP_* (Vite prefix)
  const host = process.env.SMTP_HOST || process.env.VITE_SMTP_HOST || "";
  const port = parseInt(process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || process.env.VITE_SMTP_USER || "";
  const pass = process.env.SMTP_PASS || process.env.VITE_SMTP_PASS || "";
  const encryption = (process.env.SMTP_ENCRYPTION || process.env.VITE_SMTP_ENCRYPTION || "ssl") as any;
  const fromName = process.env.SMTP_FROM_NAME || process.env.VITE_SMTP_FROM_NAME || "Master HRMS System";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.VITE_SMTP_FROM_EMAIL || user || "support@masterhrms.com";
  const ignoreTls = process.env.SMTP_IGNORE_TLS === "true" || process.env.VITE_SMTP_IGNORE_TLS === "true";

  if (host && user && pass) {
    console.log(`📨 [email.ts] Using .env SMTP fallback: ${host}:${port} (${encryption}) ignoreTLS=${ignoreTls} as ${user}`);
  } else {
    console.warn("⚠️ [email.ts] No SMTP config found in DB or .env — emails will not be delivered.");
  }

  return {
    smtpHost: host,
    smtpPort: port,
    smtpUser: user,
    smtpPass: pass,
    smtpEncryption: encryption,
    smtpFromName: fromName,
    smtpFromEmail: fromEmail,
    ignoreTls,
    appName: "Master HRMS & ERP",
    logoUrl: "https://masterhrms.com/logo.webp",
  };
}

export interface SendOtpOptions {
  toEmail: string;
  otp: string;
  fullName?: string;
  isSetup?: boolean;
}

/**
 * Default HTML Email Template with Table-based 1-Row layout & Brand Logo
 */
export function getDefaultOtpEmailTemplate(params: {
  otp: string;
  userName: string;
  appName: string;
  isSetup: boolean;
  expiryMinutes?: number;
  logoUrl?: string;
}): string {
  const { otp, userName, appName, isSetup, expiryMinutes = 5, logoUrl } = params;

  const logoHeaderHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${appName}" style="max-height: 48px; max-width: 200px; width: auto; height: auto; margin-bottom: 12px; display: inline-block; border: 0;" />`
    : `<div style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; margin-bottom: 8px;">${appName}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${isSetup ? "Two-Factor Authentication Setup" : "Login Verification Code"}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center;">
        ${logoHeaderHtml}
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">${isSetup ? "Two-Factor Authentication Setup" : "Login Verification Code"}</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">Single-use security code for account verification</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <p style="font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">Hello ${userName},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          ${isSetup
            ? "You are completing mandatory Two-Factor Authentication (2FA) setup for your account. Use the verification code below to confirm your email and activate 2FA protection."
            : "We received a sign-in request for your account. Use the 6-digit verification code below to verify your identity and enter your workspace."}
        </p>

        <!-- 1-Row 1-Column Table for 6-Digit Code -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; margin: 0 0 24px 0; text-align: center;">
          <tr>
            <td align="center" style="padding: 20px 12px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; color: #64748b; margin-bottom: 10px;">Your 6-Digit Verification Code</div>
              
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; display: inline-table;">
                <tr>
                  <td align="center" style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #ea580c; letter-spacing: 8px; white-space: nowrap; word-break: keep-all; padding: 2px 8px;">
                    ${otp}
                  </td>
                </tr>
              </table>

              <div style="margin-top: 12px;">
                <span style="display: inline-block; background-color: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">⏱ Valid for ${expiryMinutes} minutes only</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Security Warning -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #f97316; border-radius: 6px; padding: 14px 16px; margin: 0 0 24px 0; font-size: 12px; color: #475569; line-height: 1.6;">
          <tr>
            <td>
              <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Important Security Reminders:</strong>
              <ul style="margin: 0; padding-left: 16px;">
                <li>Never share this code with anyone. ${appName} will NEVER ask for your OTP.</li>
                <li>This code is single-use and valid for ${expiryMinutes} minutes.</li>
                <li>If you did not initiate this request, contact your Workspace Administrator immediately.</li>
              </ul>
            </td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #64748b; margin: 0;">
          Regards,<br>
          <strong style="color: #0f172a;">${appName} Security Team</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
        This is an automated system security notification.<br>
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send Two-Factor OTP Email using Super Admin configured SMTP server
 */
export async function sendTwoFactorOtpEmail({
  toEmail,
  otp,
  fullName,
  isSetup = false,
}: SendOtpOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getDynamicEmailConfig();
  const userName = fullName || toEmail.split("@")[0] || "User";
  const appName = config.appName || "Master HRMS & ERP";

  let subject = config.otpEmailSubject
    ? config.otpEmailSubject
        .replace(/{{appName}}/g, appName)
        .replace(/{{otp}}/g, otp)
        .replace(/{{userName}}/g, userName)
    : isSetup
    ? `${appName} — 2FA Setup Verification Code`
    : `${appName} — Your Verification Code`;

  let htmlContent = "";

  // If Super Admin provided custom HTML Template, render with variable substitution
  if (config.otpEmailTemplate && config.otpEmailTemplate.trim().length > 20) {
    htmlContent = config.otpEmailTemplate
      .replace(/{{otp}}/g, otp)
      .replace(/{{userName}}/g, userName)
      .replace(/{{userEmail}}/g, toEmail)
      .replace(/{{appName}}/g, appName)
      .replace(/{{expiryMinutes}}/g, "5")
      .replace(/{{currentYear}}/g, String(new Date().getFullYear()))
      .replace(/{{subject}}/g, subject);
  } else {
    htmlContent = getDefaultOtpEmailTemplate({
      otp,
      userName,
      appName,
      isSetup,
      expiryMinutes: 5,
      logoUrl: config.logoUrl,
    });
  }

  const textContent = `${appName} — ${subject}

Hello ${userName},

Your 6-digit verification code is: ${otp}
This code will expire in 5 minutes.

For your security:
- Do not share this code with anyone.
- ${appName} will never ask you to share your OTP.
- If you did not attempt to sign in, please contact your administrator.

Regards,
${appName} Security Team`;

  const fromHeader = `"${config.smtpFromName}" <${config.smtpFromEmail}>`;

  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    try {
      // Port 465 = SSL/implicit TLS (secure: true)
      // Port 587 = STARTTLS/explicit TLS (secure: false, STARTTLS upgrade)
      // Port 25  = plain SMTP (secure: false)
      const isSSL = config.smtpPort === 465 || config.smtpEncryption === "ssl";
      const isSTARTTLS = config.smtpPort === 587 || config.smtpEncryption === "tls";

      const transportOptions: any = {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: isSSL, // true = SSL wrapper on port 465; false = STARTTLS negotiation (587/25)
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // allow self-signed/mismatched certs
          minVersion: "TLSv1.2",
        },
        connectionTimeout: 15000,  // 15s to establish TCP connection
        greetingTimeout: 10000,    // 10s for SMTP EHLO/HELO greeting
        socketTimeout: 20000,      // 20s for socket inactivity
      };

      // For STARTTLS (port 587)
      if (isSTARTTLS) {
        if (config.ignoreTls) {
          transportOptions.ignoreTLS = true;  // skip STARTTLS, use plain AUTH
        } else {
          transportOptions.requireTLS = false; // Opportunistic STARTTLS (upgrades if available, doesn't abort)
        }
      }

      console.log(`📨 [email.ts] Connecting to SMTP: ${config.smtpHost}:${config.smtpPort} | secure=${isSSL} | ignoreTLS=${config.ignoreTls || false} | user=${config.smtpUser}`);

      const transporter: any = nodemailer.createTransport(transportOptions);

      const info = await transporter.sendMail({
        from: fromHeader,
        to: toEmail,
        replyTo: config.smtpFromEmail,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "high",
          "X-Mailer": "Master HRMS Security Dispatcher",
        },
      });

      console.log(`📨 2FA Email delivered successfully to ${toEmail} via ${config.smtpHost} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`❌ SMTP delivery to ${toEmail} encountered an error: ${err.message}`);
      console.log(`🔑 [FALLBACK OTP] Generated OTP for ${toEmail}: [${otp}]`);
      return { success: false, error: err.message };
    }
  } else {
    // No SMTP configured
    console.log("==================================================================");
    console.log("🔐 [DEV 2FA EMAIL DISPATCH (No SMTP configured)]");
    console.log("   To: " + toEmail);
    console.log("   From: " + fromHeader);
    console.log("   Subject: " + subject);
    console.log("   👉 6-DIGIT OTP CODE: [" + otp + "]");
    console.log("   Expires in: 5 minutes");
    console.log("==================================================================");
    return {
      success: false,
      error: "SMTP settings not configured. Please configure SMTP host, user, and password in Super Admin Settings or .env file.",
    };
  }
}

export interface LifecycleEmailOptions {
  toEmail: string;
  templateId: string;
  templateFallback?: {
    subject: string;
    htmlBody: string;
  };
  variables: Record<string, string>;
}

export const LIFECYCLE_EMAIL_TEMPLATES: Record<string, { subject: string; htmlBody: string }> = {
  "subscription-reminder-15d": {
    subject: "Reminder: {{company_name}} subscription expires in 15 days",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 28px 32px; background: #0f172a; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Master HRMS & ERP</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Subscription Expiry Reminder</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Hello {{admin_name}},</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          This is an automated courtesy reminder that your subscription for company <strong>{{company_name}}</strong> (Plan: <strong>{{plan_name}}</strong>) is scheduled to expire in <strong>15 days</strong> on <strong>{{expiry_date}}</strong>.
        </p>
        <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <table width="100%" style="font-size: 13px; color: #334155;">
            <tr><td style="padding: 3px 0; font-weight: 600;">Workspace:</td><td>{{company_name}} ({{tenant_id}})</td></tr>
            <tr><td style="padding: 3px 0; font-weight: 600;">Current Tier:</td><td>{{plan_name}}</td></tr>
            <tr><td style="padding: 3px 0; font-weight: 600;">Expiry Date:</td><td>{{expiry_date}}</td></tr>
            <tr><td style="padding: 3px 0; font-weight: 600;">Days Remaining:</td><td>15 Days</td></tr>
          </table>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          To prevent any interruption to your HR, payroll, attendance, and business workflows, please renew your subscription before the expiration date.
        </p>
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="{{renewal_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Subscription Now →</a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          If you have questions or need assistance, contact our platform support team at <a href="mailto:{{support_email}}" style="color: #2563eb;">{{support_email}}</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS SaaS Platform. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  "subscription-reminder-10d": {
    subject: "Reminder: {{company_name}} subscription expires in 10 days",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #0f172a; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">10-Day Expiry Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Notice for {{admin_name}},</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has <strong>10 days remaining</strong> on its current <strong>{{plan_name}}</strong> subscription. It will expire on <strong>{{expiry_date}}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Subscription →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Need help? Contact <a href="mailto:{{support_email}}" style="color: #2563eb;">{{support_email}}</a>.</p>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "subscription-reminder-5d": {
    subject: "Important: Only 5 days remaining for {{company_name}} subscription",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fed7aa; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #ea580c; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #ffedd5; margin: 4px 0 0 0; font-size: 13px;">5 Days Remaining Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Action Recommended, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your subscription for <strong>{{company_name}}</strong> will expire in <strong>5 days</strong> on <strong>{{expiry_date}}</strong>.
      </p>
      <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #9a3412;">
        When your subscription reaches expiration, workspace access for all company administrators and employees will be locked.
      </div>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Plan Now →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Support inquiries: <a href="mailto:{{support_email}}" style="color: #ea580c;">{{support_email}}</a>.</p>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "subscription-reminder-3d": {
    subject: "Urgent: Only 3 days left for {{company_name}} subscription",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fca5a5; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #dc2626; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Critical 3-Day Expiry Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Critical: 3 Days Remaining</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello {{admin_name}}, your workspace <strong>{{company_name}}</strong> will expire on <strong>{{expiry_date}}</strong> (3 days remaining).
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Plan Immediately →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Support: <a href="mailto:{{support_email}}" style="color: #dc2626;">{{support_email}}</a>.</p>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "subscription-reminder-2d": {
    subject: "Urgent: 2 days left before {{company_name}} subscription expires",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fca5a5; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #b91c1c; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Final Notice: 2 Days Left</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">2 Days Remaining, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has 2 days remaining before expiration on <strong>{{expiry_date}}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #b91c1c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Renew Plan Now →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Support: <a href="mailto:{{support_email}}" style="color: #b91c1c;">{{support_email}}</a>.</p>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "subscription-reminder-1d": {
    subject: "Final Notice: {{company_name}} subscription expires tomorrow",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #991b1b; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #991b1b; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Final Expiry Reminder — 24 Hours Remaining</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Action Required Today, {{admin_name}}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> subscription expires <strong>tomorrow ({{expiry_date}})</strong>. Once expired, access to your HRMS dashboard and employee features will be locked.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #991b1b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Renew Immediately to Prevent Lockout →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Support: <a href="mailto:{{support_email}}" style="color: #991b1b;">{{support_email}}</a>.</p>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "subscription-expired": {
    subject: "Workspace Locked: {{company_name}} subscription has expired",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ef4444; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #7f1d1d; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #fee2e2; margin: 4px 0 0 0; font-size: 13px;">Subscription Expired — Workspace Locked</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Subscription Expired</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        The subscription for <strong>{{company_name}}</strong> has expired on <strong>{{expiry_date}}</strong>. Workspace access has been locked for all team members.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Renew Subscription to Restore Access →</a></div>
      <p style="color: #64748b; font-size: 12px; margin: 0;">Need assistance? Contact our team at <a href="mailto:{{support_email}}" style="color: #dc2626;">{{support_email}}</a>.</p>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "tenant-account-suspended": {
    subject: "Workspace Suspended: {{company_name}} ({{tenant_id}})",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #475569; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #1e293b; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Account Suspension Notice</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Workspace Suspended</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Workspace <strong>{{company_name}}</strong> has been suspended on <strong>{{suspension_date}}</strong>.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #334155;">
        <div><strong>Tenant ID:</strong> {{tenant_id}}</div>
        <div><strong>Current Plan:</strong> {{plan_name}}</div>
        <div><strong>Suspension Reason:</strong> {{suspension_reason}}</div>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
        Access has been temporarily restricted. Please contact platform administration to resolve this matter and restore access.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="mailto:{{support_email}}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Contact Platform Support →</a></div>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "tenant-account-reactivated": {
    subject: "Workspace Reactivated: Welcome back to {{company_name}}",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #86efac; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #166534; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #dcfce7; margin: 4px 0 0 0; font-size: 13px;">Workspace Reactivated</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Access Restored, {{admin_name}}!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Your workspace <strong>{{company_name}}</strong> has been reactivated. All team members can now sign in and resume standard operations.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open Workspace →</a></div>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },

  "subscription-renewed": {
    subject: "Confirmed: {{company_name}} subscription has been renewed",
    htmlBody: `<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #86efac; overflow: hidden;">
    <tr><td style="padding: 28px 32px; background: #0f766e; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 20px;">Master HRMS & ERP</h1><p style="color: #ccfbf1; margin: 4px 0 0 0; font-size: 13px;">Subscription Renewal Confirmation</p></td></tr>
    <tr><td style="padding: 32px;">
      <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 18px;">Subscription Renewed Successfully</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello {{admin_name}}, thank you for renewing your subscription for <strong>{{company_name}}</strong>. Your workspace is active through <strong>{{expiry_date}}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;"><a href="{{renewal_url}}" style="background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Go to Workspace Dashboard →</a></div>
    </td></tr>
    <tr><td style="padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;"><p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Master HRMS.</p></td></tr>
  </table>
</body></html>`,
  },
};

function substituteTemplateVariables(text: string, vars: Record<string, string>): string {
  let output = text;
  for (const [key, val] of Object.entries(vars)) {
    const pattern = new RegExp(`{{${key}}}`, "g");
    output = output.replace(pattern, String(val ?? ""));
  }
  return output;
}

/**
 * Dispatch Subscription Lifecycle Email with dynamic CMS template resolution & variable substitution
 */
export async function sendSubscriptionLifecycleEmail(options: LifecycleEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { toEmail, templateId, templateFallback, variables } = options;
  const config = await getDynamicEmailConfig();

  // 1. Try to find customized template from CMS
  let subject = "";
  let htmlBody = "";

  try {
    const page = await prisma.cmsPage.findFirst({
      where: { slug: "system-email-templates" },
    });
    if (page?.content) {
      const c = typeof page.content === "string" ? JSON.parse(page.content) : (page.content as any);
      if (Array.isArray(c.templates)) {
        const found = c.templates.find((t: any) => t.id === templateId || t.name?.toLowerCase().includes(templateId));
        if (found) {
          subject = found.subject;
          htmlBody = found.html_body;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[email.ts] CMS template lookup error: ${err.message}`);
  }

  // 2. Fallback to predefined template
  if (!subject || !htmlBody) {
    const fallback = LIFECYCLE_EMAIL_TEMPLATES[templateId] || templateFallback;
    if (fallback) {
      subject = fallback.subject;
      htmlBody = fallback.htmlBody;
    } else {
      subject = `Master HRMS Notification: ${variables.company_name || "Workspace"}`;
      htmlBody = `<p>Hello {{admin_name}}, this is a notice regarding workspace {{company_name}}.</p>`;
    }
  }

  // 3. Perform variable substitution
  const renderedSubject = substituteTemplateVariables(subject, variables);
  const renderedHtml = substituteTemplateVariables(htmlBody, variables);
  const plainText = renderedHtml.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();

  // 4. Send via Nodemailer if SMTP configured
  const hasSmtp = Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
  const fromHeader = `"${config.smtpFromName}" <${config.smtpFromEmail}>`;

  if (hasSmtp) {
    try {
      const isSSL = config.smtpPort === 465 || config.smtpEncryption === "ssl";
      const isSTARTTLS = config.smtpPort === 587 || config.smtpEncryption === "tls";

      const transportOptions: any = {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: isSSL,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: "TLSv1.2",
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      };

      if (isSTARTTLS) {
        if (config.ignoreTls) {
          transportOptions.ignoreTLS = true;
        } else {
          transportOptions.requireTLS = false;
        }
      }

      const transporter: any = nodemailer.createTransport(transportOptions);
      const info = await transporter.sendMail({
        from: fromHeader,
        to: toEmail,
        replyTo: config.smtpFromEmail,
        subject: renderedSubject,
        text: plainText,
        html: renderedHtml,
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "high",
          "X-Mailer": "Master HRMS Subscription Lifecycle Dispatcher",
        },
      });

      console.log(`📨 [Lifecycle Email] Successfully delivered [${templateId}] to ${toEmail} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`❌ [Lifecycle Email] Delivery failure to ${toEmail}: ${err.message}`);
      return { success: false, error: err.message };
    }
  } else {
    // Development fallback without SMTP
    console.log("==================================================================");
    console.log(`📨 [DEV SUBSCRIPTION LIFECYCLE EMAIL (No SMTP configured)]`);
    console.log(`   Template: [${templateId}]`);
    console.log(`   To: ${toEmail}`);
    console.log(`   Subject: ${renderedSubject}`);
    console.log(`   Expires At: ${variables.expiry_date || "N/A"} | Days Left: ${variables.days_remaining || "N/A"}`);
    console.log("==================================================================");
    return {
      success: true,
      messageId: `dev-mock-${Date.now()}`,
    };
  }
}

