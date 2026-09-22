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
