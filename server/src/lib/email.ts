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
  appName?: string;
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
      if (c.smtpHost && c.smtpUser && c.smtpPass) {
        return {
          smtpHost: String(c.smtpHost).trim(),
          smtpPort: parseInt(String(c.smtpPort || "465"), 10),
          smtpUser: String(c.smtpUser).trim(),
          smtpPass: String(c.smtpPass).trim(),
          smtpEncryption: (c.smtpEncryption || "ssl") as any,
          smtpFromName: c.smtpFromName || "TSV Global Solutions",
          smtpFromEmail: c.smtpFromEmail || c.smtpUser,
          appName: c.appName || "TSV Global Solutions",
          otpEmailSubject: c.otpEmailSubject || undefined,
          otpEmailTemplate: c.otpEmailTemplate || undefined,
        };
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Could not load dynamic SMTP settings from DB, checking .env fallback:", err.message);
  }

  // Fallback to process.env
  return {
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpEncryption: (process.env.SMTP_ENCRYPTION as any) || "tls",
    smtpFromName: process.env.SMTP_FROM_NAME || "TSV Global Solutions Security",
    smtpFromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || "security@tsvhomes.in",
    appName: "TSV Global Solutions",
  };
}

export interface SendOtpOptions {
  toEmail: string;
  otp: string;
  fullName?: string;
  isSetup?: boolean;
}

/**
 * Default HTML Email Template
 */
export function getDefaultOtpEmailTemplate(params: {
  otp: string;
  userName: string;
  appName: string;
  isSetup: boolean;
  expiryMinutes?: number;
}): string {
  const { otp, userName, appName, isSetup, expiryMinutes = 5 } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSetup ? "Two-Factor Authentication Setup" : "Login Verification Code"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
    .wrapper { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 32px; text-align: center; }
    .brand-badge { display: inline-block; background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.4); color: #f97316; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
    .header-title { color: #ffffff; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.5px; }
    .header-subtitle { color: #94a3b8; font-size: 13px; margin: 6px 0 0 0; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; }
    .otp-container { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 24px; text-align: center; margin: 0 0 28px 0; }
    .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #64748b; margin-bottom: 10px; }
    .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #ea580c; margin: 0; }
    .expiry-tag { display: inline-block; background: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 9999px; margin-top: 12px; }
    .security-card { background: #f8fafc; border-left: 4px solid #f97316; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px 0; font-size: 12px; color: #475569; line-height: 1.6; }
    .security-card strong { color: #0f172a; display: block; margin-bottom: 6px; }
    .security-card ul { margin: 0; padding-left: 18px; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-badge">${appName}</div>
      <h1 class="header-title">${isSetup ? "Two-Factor Authentication Setup" : "Login Verification Code"}</h1>
      <p class="header-subtitle">Single-use security code for account verification</p>
    </div>
    <div class="content">
      <p class="greeting">Hello ${userName},</p>
      <p class="message">
        ${isSetup
          ? "You are completing mandatory Two-Factor Authentication (2FA) setup for your account. Enter the verification code below to confirm your email and activate 2FA protection."
          : "We received a sign-in request for your account. Use the 6-digit verification code below to verify your identity and enter your workspace."}
      </p>

      <div class="otp-container">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-digits">${otp}</div>
        <div class="expiry-tag">⏱ Valid for ${expiryMinutes} minutes only</div>
      </div>

      <div class="security-card">
        <strong>Important Security Reminders:</strong>
        <ul>
          <li>Never share this code with anyone. ${appName} will NEVER ask for your OTP.</li>
          <li>This code is single-use and valid for ${expiryMinutes} minutes.</li>
          <li>If you did not initiate this request, contact your Workspace Administrator immediately.</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #64748b; margin: 0;">
        Regards,<br>
        <strong style="color: #0f172a;">${appName} Security Team</strong>
      </p>
    </div>
    <div class="footer">
      This is an automated system notification. Please do not reply directly to this email.<br>
      © ${new Date().getFullYear()} ${appName}. All rights reserved.
    </div>
  </div>
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
}: SendOtpOptions): Promise<{ success: boolean; messageId?: string }> {
  const config = await getDynamicEmailConfig();
  const userName = fullName || toEmail.split("@")[0] || "User";
  const appName = config.appName || "TSV Global Solutions";

  let subject = config.otpEmailSubject
    ? config.otpEmailSubject
        .replace(/{{appName}}/g, appName)
        .replace(/{{otp}}/g, otp)
        .replace(/{{userName}}/g, userName)
    : isSetup
    ? `${appName} — 2FA Setup Verification Code`
    : `${appName} — Your Login Verification Code`;

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
      const isPort465 = config.smtpPort === 465 || config.smtpEncryption === "ssl";
      const transporter: any = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: isPort465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 8000,
        greetingTimeout: 6000,
        socketTimeout: 12000,
      });

      const info = await transporter.sendMail({
        from: fromHeader,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`📨 2FA Email delivered successfully to ${toEmail} via ${config.smtpHost} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`❌ SMTP delivery to ${toEmail} encountered an error: ${err.message}`);
      console.log(`🔑 [DEV/FALLBACK OTP] Generated OTP for ${toEmail}: [${otp}]`);
      return { success: true };
    }
  } else {
    // No SMTP configured
    console.log("==================================================================");
    console.log("🔐 [DEV 2FA EMAIL DISPATCH]");
    console.log("   To: " + toEmail);
    console.log("   From: " + fromHeader);
    console.log("   Subject: " + subject);
    console.log("   👉 6-DIGIT OTP CODE: [" + otp + "]");
    console.log("   Expires in: 5 minutes");
    console.log("==================================================================");
    return { success: true };
  }
}
