import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import {
  encryptEmailSecret,
  decryptEmailSecret,
  validateHostForSsrf,
} from "../services/email/user-email-crypto.service";
import { UserMailClientService } from "../services/email/user-mail-client.service";

export const userEmailAccountsRouter = Router();

// Require authentication and tenant context
userEmailAccountsRouter.use(requireAuth, resolveTenantContext);

// Helper to sanitize account output (strip all cryptographic secrets)
function sanitizeAccount(acc: any) {
  const {
    incomingPassCipher,
    incomingPassIv,
    incomingPassAuthTag,
    smtpPassCipher,
    smtpPassIv,
    smtpPassAuthTag,
    ...safe
  } = acc;
  return {
    ...safe,
    hasIncomingPassword: Boolean(incomingPassCipher),
    hasSmtpPassword: Boolean(smtpPassCipher),
  };
}

/**
 * GET /api/user/email-accounts
 * List all email accounts belonging to current authenticated user
 */
userEmailAccountsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: "Unauthorized user or workspace context" });
    }

    const accounts = await prisma.userEmailAccount.findMany({
      where: { userId, tenantId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return res.json(accounts.map(sanitizeAccount));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list email accounts" });
  }
});

/**
 * GET /api/user/email-accounts/:id
 * Retrieve a single account details
 */
userEmailAccountsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const account = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!account) {
      return res.status(404).json({ error: "Email account not found" });
    }

    return res.json(sanitizeAccount(account));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch email account" });
  }
});

/**
 * POST /api/user/email-accounts
 * Create a new personal email account
 */
userEmailAccountsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: "Unauthorized user or workspace context" });
    }

    const {
      email,
      displayName,
      fromName,
      username,
      incomingProtocol = "IMAP",
      incomingHost,
      incomingPort = 993,
      incomingSecurity = "SSL/TLS",
      incomingPassword,
      smtpHost,
      smtpPort = 465,
      smtpSecurity = "SSL/TLS",
      smtpUser,
      smtpPassword,
      isDefault = false,
    } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    if (!incomingHost || !smtpHost) {
      return res.status(400).json({ error: "Incoming and SMTP server hostnames are required" });
    }
    if (!incomingPassword || !smtpPassword) {
      return res.status(400).json({ error: "Incoming and SMTP passwords or app passwords are required" });
    }

    // SSRF checks
    const incomingSsrf = await validateHostForSsrf(incomingHost);
    if (!incomingSsrf.valid) {
      return res.status(400).json({ error: `Invalid incoming host: ${incomingSsrf.reason}` });
    }
    const smtpSsrf = await validateHostForSsrf(smtpHost);
    if (!smtpSsrf.valid) {
      return res.status(400).json({ error: `Invalid SMTP host: ${smtpSsrf.reason}` });
    }

    // Encrypt credentials
    const encIncoming = encryptEmailSecret(incomingPassword);
    const encSmtp = encryptEmailSecret(smtpPassword);

    // If marked default, unset other defaults for this user
    if (isDefault) {
      await prisma.userEmailAccount.updateMany({
        where: { userId, tenantId },
        data: { isDefault: false },
      });
    }

    // If first account for user, make it default automatically
    const existingCount = await prisma.userEmailAccount.count({
      where: { userId, tenantId },
    });
    const makeDefault = isDefault || existingCount === 0;

    const account = await prisma.userEmailAccount.create({
      data: {
        userId,
        tenantId,
        email: email.trim().toLowerCase(),
        displayName: displayName?.trim() || email.trim(),
        fromName: fromName?.trim() || displayName?.trim() || email.trim(),
        username: username?.trim() || email.trim(),
        incomingProtocol: incomingProtocol.toUpperCase() === "POP3" ? "POP3" : "IMAP",
        incomingHost: incomingHost.trim(),
        incomingPort: Number(incomingPort),
        incomingSecurity: incomingSecurity || "SSL/TLS",
        incomingPassCipher: encIncoming.ciphertext,
        incomingPassIv: encIncoming.iv,
        incomingPassAuthTag: encIncoming.authTag,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpSecurity: smtpSecurity || "SSL/TLS",
        smtpUser: smtpUser?.trim() || username?.trim() || email.trim(),
        smtpPassCipher: encSmtp.ciphertext,
        smtpPassIv: encSmtp.iv,
        smtpPassAuthTag: encSmtp.authTag,
        status: "NOT_CONFIGURED",
        isDefault: makeDefault,
      },
    });

    return res.status(201).json(sanitizeAccount(account));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create email account" });
  }
});

/**
 * PUT /api/user/email-accounts/:id
 * Update an existing email account (preserves existing password if not re-submitted)
 */
userEmailAccountsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const existing = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Email account not found" });
    }

    const {
      email,
      displayName,
      fromName,
      username,
      incomingProtocol,
      incomingHost,
      incomingPort,
      incomingSecurity,
      incomingPassword,
      smtpHost,
      smtpPort,
      smtpSecurity,
      smtpUser,
      smtpPassword,
      isDefault,
    } = req.body;

    const dataToUpdate: any = {};

    if (email) dataToUpdate.email = email.trim().toLowerCase();
    if (displayName !== undefined) dataToUpdate.displayName = displayName?.trim();
    if (fromName !== undefined) dataToUpdate.fromName = fromName?.trim();
    if (username !== undefined) dataToUpdate.username = username?.trim();
    if (incomingProtocol) dataToUpdate.incomingProtocol = incomingProtocol.toUpperCase() === "POP3" ? "POP3" : "IMAP";

    if (incomingHost) {
      const ssrf = await validateHostForSsrf(incomingHost);
      if (!ssrf.valid) return res.status(400).json({ error: ssrf.reason });
      dataToUpdate.incomingHost = incomingHost.trim();
    }
    if (incomingPort) dataToUpdate.incomingPort = Number(incomingPort);
    if (incomingSecurity) dataToUpdate.incomingSecurity = incomingSecurity;

    if (incomingPassword && incomingPassword.trim().length > 0) {
      const enc = encryptEmailSecret(incomingPassword);
      dataToUpdate.incomingPassCipher = enc.ciphertext;
      dataToUpdate.incomingPassIv = enc.iv;
      dataToUpdate.incomingPassAuthTag = enc.authTag;
    }

    if (smtpHost) {
      const ssrf = await validateHostForSsrf(smtpHost);
      if (!ssrf.valid) return res.status(400).json({ error: ssrf.reason });
      dataToUpdate.smtpHost = smtpHost.trim();
    }
    if (smtpPort) dataToUpdate.smtpPort = Number(smtpPort);
    if (smtpSecurity) dataToUpdate.smtpSecurity = smtpSecurity;
    if (smtpUser !== undefined) dataToUpdate.smtpUser = smtpUser?.trim();

    if (smtpPassword && smtpPassword.trim().length > 0) {
      const enc = encryptEmailSecret(smtpPassword);
      dataToUpdate.smtpPassCipher = enc.ciphertext;
      dataToUpdate.smtpPassIv = enc.iv;
      dataToUpdate.smtpPassAuthTag = enc.authTag;
    }

    if (isDefault !== undefined && isDefault) {
      await prisma.userEmailAccount.updateMany({
        where: { userId, tenantId },
        data: { isDefault: false },
      });
      dataToUpdate.isDefault = true;
    }

    const updated = await prisma.userEmailAccount.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.json(sanitizeAccount(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update email account" });
  }
});

/**
 * POST /api/user/email-accounts/:id/set-default
 * Set account as user's primary/default mail account
 */
userEmailAccountsRouter.post("/:id/set-default", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    // Unset other defaults for this user
    await prisma.userEmailAccount.updateMany({
      where: { userId, tenantId },
      data: { isDefault: false },
    });

    const updated = await prisma.userEmailAccount.update({
      where: { id },
      data: { isDefault: true },
    });

    return res.json(sanitizeAccount(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to set default account" });
  }
});

/**
 * DELETE /api/user/email-accounts/:id
 * Disconnect and remove saved configuration
 */
userEmailAccountsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const existing = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Email account not found" });
    }

    await prisma.userEmailAccount.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Email account disconnected and deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete email account" });
  }
});

/**
 * POST /api/user/email-accounts/:id/test-incoming
 * Test incoming IMAP or POP3 connectivity
 */
userEmailAccountsRouter.post("/:id/test-incoming", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    // Decrypt incoming password
    const password = decryptEmailSecret({
      ciphertext: acc.incomingPassCipher,
      iv: acc.incomingPassIv,
      authTag: acc.incomingPassAuthTag,
    });

    const result = await UserMailClientService.testIncoming({
      protocol: acc.incomingProtocol as any,
      host: acc.incomingHost,
      port: acc.incomingPort,
      security: acc.incomingSecurity as any,
      user: acc.username || acc.email,
      pass: password,
    });

    const newStatus = result.success ? "CONNECTED" : "CONNECTION_FAILED";
    await prisma.userEmailAccount.update({
      where: { id },
      data: {
        status: newStatus,
        statusMessage: result.message + (result.error ? `: ${result.error}` : ""),
        lastTestedAt: new Date(),
      },
    });

    return res.json({
      success: result.success,
      status: newStatus,
      message: result.message,
      error: result.error,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to test incoming connection" });
  }
});

/**
 * POST /api/user/email-accounts/:id/test-outgoing
 * Test outgoing SMTP connectivity
 */
userEmailAccountsRouter.post("/:id/test-outgoing", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    // Decrypt SMTP password
    const password = decryptEmailSecret({
      ciphertext: acc.smtpPassCipher,
      iv: acc.smtpPassIv,
      authTag: acc.smtpPassAuthTag,
    });

    const result = await UserMailClientService.testSmtp({
      host: acc.smtpHost,
      port: acc.smtpPort,
      security: acc.smtpSecurity as any,
      user: acc.smtpUser || acc.username || acc.email,
      pass: password,
    });

    const newStatus = result.success ? "CONNECTED" : "CONNECTION_FAILED";
    await prisma.userEmailAccount.update({
      where: { id },
      data: {
        status: newStatus,
        statusMessage: result.message + (result.error ? `: ${result.error}` : ""),
        lastTestedAt: new Date(),
      },
    });

    return res.json({
      success: result.success,
      status: newStatus,
      message: result.message,
      error: result.error,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to test SMTP connection" });
  }
});

/**
 * POST /api/user/email-accounts/:id/send-test
 * Send a single controlled test email from user's account
 */
userEmailAccountsRouter.post("/:id/send-test", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { testRecipient } = req.body;

    const targetRecipient = testRecipient || req.user?.email;
    if (!targetRecipient || !targetRecipient.includes("@")) {
      return res.status(400).json({ error: "A valid recipient email address is required for test email." });
    }

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    const password = decryptEmailSecret({
      ciphertext: acc.smtpPassCipher,
      iv: acc.smtpPassIv,
      authTag: acc.smtpPassAuthTag,
    });

    const result = await UserMailClientService.sendSmtp(
      {
        host: acc.smtpHost,
        port: acc.smtpPort,
        security: acc.smtpSecurity as any,
        user: acc.smtpUser || acc.username || acc.email,
        pass: password,
        fromName: acc.fromName || acc.displayName || acc.email,
        fromEmail: acc.email,
      },
      {
        to: targetRecipient,
        subject: `[MASTERHRMS Test] Email Account Verification for ${acc.email}`,
        body: `Hello,\n\nThis is a verified test email sent from your configured email account (${acc.email}) on MASTERHRMS.\nTimestamp: ${new Date().toISOString()}`,
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to dispatch test email",
        code: "TEST_EMAIL_FAILED",
      });
    }

    return res.json({
      success: true,
      message: `Test email dispatched successfully to ${targetRecipient}`,
      messageId: result.messageId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to send test email" });
  }
});

/**
 * POST /api/user/email-accounts/:id/set-default
 * Mark an account as default
 */
userEmailAccountsRouter.post("/:id/set-default", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    await prisma.userEmailAccount.updateMany({
      where: { userId, tenantId },
      data: { isDefault: false },
    });

    await prisma.userEmailAccount.update({
      where: { id },
      data: { isDefault: true },
    });

    return res.json({ success: true, message: `Account ${acc.email} set as default.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to set default account" });
  }
});

/**
 * GET /api/user/email-accounts/:id/messages
 * Fetch messages from mailbox
 */
userEmailAccountsRouter.get("/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const folder = (req.query.folder as string) || "INBOX";
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    const password = decryptEmailSecret({
      ciphertext: acc.incomingPassCipher,
      iv: acc.incomingPassIv,
      authTag: acc.incomingPassAuthTag,
    });

    const result = await UserMailClientService.fetchMessages(
      {
        protocol: acc.incomingProtocol as any,
        host: acc.incomingHost,
        port: acc.incomingPort,
        security: acc.incomingSecurity as any,
        user: acc.username || acc.email,
        pass: password,
      },
      { folder, page, limit }
    );

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error || "Failed to retrieve messages from mail server",
        protocolNote: result.protocolNote,
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch mailbox messages" });
  }
});

/**
 * GET /api/user/email-accounts/:id/messages/:uid
 * Fetch message body content
 */
userEmailAccountsRouter.get("/:id/messages/:uid", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id, uid } = req.params;
    const folder = (req.query.folder as string) || "INBOX";

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    const password = decryptEmailSecret({
      ciphertext: acc.incomingPassCipher,
      iv: acc.incomingPassIv,
      authTag: acc.incomingPassAuthTag,
    });

    const result = await UserMailClientService.fetchMessageDetail(
      {
        protocol: acc.incomingProtocol as any,
        host: acc.incomingHost,
        port: acc.incomingPort,
        security: acc.incomingSecurity as any,
        user: acc.username || acc.email,
        pass: password,
      },
      uid,
      folder
    );

    if (!result.success) {
      return res.status(502).json({ error: result.error || "Failed to retrieve message detail" });
    }

    return res.json(result.message);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch message detail" });
  }
});

/**
 * POST /api/user/email-accounts/:id/send
 * Compose and send an email using this specific personal account
 */
userEmailAccountsRouter.post("/:id/send", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { to, recipients, subject, body, content } = req.body;

    const toList = Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : (Array.isArray(to) ? to : (to ? [to] : []));

    if (toList.length === 0) {
      return res.status(400).json({ error: "At least one recipient email is required", code: "RECIPIENT_REQUIRED" });
    }

    const acc = await prisma.userEmailAccount.findFirst({
      where: { id, userId, tenantId },
    });

    if (!acc) {
      return res.status(404).json({ error: "Email account not found" });
    }

    const password = decryptEmailSecret({
      ciphertext: acc.smtpPassCipher,
      iv: acc.smtpPassIv,
      authTag: acc.smtpPassAuthTag,
    });

    const result = await UserMailClientService.sendSmtp(
      {
        host: acc.smtpHost,
        port: acc.smtpPort,
        security: acc.smtpSecurity as any,
        user: acc.smtpUser || acc.username || acc.email,
        pass: password,
        fromName: acc.fromName || acc.displayName || acc.email,
        fromEmail: acc.email,
      },
      {
        to: toList,
        subject: subject || "No Subject",
        body: body || content || "",
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || "Outbound email delivery failed",
        code: "MAIL_DELIVERY_FAILED",
      });
    }

    return res.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      to: toList,
      sender: acc.email,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to dispatch email" });
  }
});
