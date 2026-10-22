import { Router, Response } from "express";
import nodemailer from "nodemailer";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { getDynamicEmailConfig } from "../lib/email";

export const emailRouter = Router();

emailRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /api/email/status
 * Check if outbound email gateway is configured for current tenant
 */
emailRouter.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const config = await getDynamicEmailConfig({ tenantId, scope: tenantId ? "TENANT" : "PLATFORM" });
    const isConfigured = Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
    return res.json({
      configured: isConfigured,
      host: isConfigured ? config.smtpHost : null,
      fromEmail: isConfigured ? config.smtpFromEmail : null,
      provider: isConfigured ? "SMTP" : "UNCONFIGURED",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to check email status" });
  }
});

/**
 * POST /api/email/send
 * Real outbound email delivery using tenant-aware SMTP gateway
 */
emailRouter.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const { to, recipients, subject, body, content } = req.body;

    const toList = Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : (Array.isArray(to) ? to : (to ? [to] : []));

    if (toList.length === 0) {
      return res.status(400).json({ error: "At least one recipient email is required.", code: "RECIPIENT_REQUIRED" });
    }

    const emailSubject = subject?.trim() || "No Subject";
    const emailBody = body || content || "";

    const config = await getDynamicEmailConfig({ tenantId, scope: tenantId ? "TENANT" : "PLATFORM" });

    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      return res.status(503).json({
        success: false,
        error: "Outbound mail gateway is unconfigured for this workspace. Please configure SMTP in Settings to enable live email delivery.",
        code: "MAIL_GATEWAY_NOT_CONFIGURED",
      });
    }

    const isSecure = config.smtpPort === 465 || config.smtpEncryption === "ssl";
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: isSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: !config.ignoreTls,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"${config.smtpFromName}" <${config.smtpFromEmail}>`,
      to: toList.join(", "),
      subject: emailSubject,
      text: emailBody,
      html: `<div style="font-family: sans-serif; line-height: 1.5;">${emailBody.replace(/\n/g, "<br/>")}</div>`,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      to: toList,
      subject: emailSubject,
    });
  } catch (err: any) {
    const rawMsg = err?.message || "Outbound mail dispatch failed";
    const sanitizedError = rawMsg.replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
    console.error("[Email Send Error]:", sanitizedError);
    return res.status(500).json({
      success: false,
      error: `Failed to deliver outbound email: ${sanitizedError}`,
      code: "MAIL_DELIVERY_FAILED",
    });
  }
});
