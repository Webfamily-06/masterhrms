"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailAccountsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const user_email_crypto_service_1 = require("../services/email/user-email-crypto.service");
const user_mail_client_service_1 = require("../services/email/user-mail-client.service");
exports.userEmailAccountsRouter = (0, express_1.Router)();
// Require authentication and tenant context
exports.userEmailAccountsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// Helper to sanitize account output (strip all cryptographic secrets)
function sanitizeAccount(acc) {
    const { incomingPassCipher, incomingPassIv, incomingPassAuthTag, smtpPassCipher, smtpPassIv, smtpPassAuthTag, ...safe } = acc;
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
exports.userEmailAccountsRouter.get("/", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ error: "Unauthorized user or workspace context" });
        }
        const accounts = await prisma_1.prisma.userEmailAccount.findMany({
            where: { userId, tenantId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });
        return res.json(accounts.map(sanitizeAccount));
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list email accounts" });
    }
});
/**
 * GET /api/user/email-accounts/:id
 * Retrieve a single account details
 */
exports.userEmailAccountsRouter.get("/:id", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const account = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!account) {
            return res.status(404).json({ error: "Email account not found" });
        }
        return res.json(sanitizeAccount(account));
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch email account" });
    }
});
/**
 * POST /api/user/email-accounts
 * Create a new personal email account
 */
exports.userEmailAccountsRouter.post("/", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ error: "Unauthorized user or workspace context" });
        }
        const { email, displayName, fromName, username, incomingProtocol = "IMAP", incomingHost, incomingPort = 993, incomingSecurity = "SSL/TLS", incomingPassword, smtpHost, smtpPort = 465, smtpSecurity = "SSL/TLS", smtpUser, smtpPassword, isDefault = false, } = req.body;
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
        const incomingSsrf = await (0, user_email_crypto_service_1.validateHostForSsrf)(incomingHost);
        if (!incomingSsrf.valid) {
            return res.status(400).json({ error: `Invalid incoming host: ${incomingSsrf.reason}` });
        }
        const smtpSsrf = await (0, user_email_crypto_service_1.validateHostForSsrf)(smtpHost);
        if (!smtpSsrf.valid) {
            return res.status(400).json({ error: `Invalid SMTP host: ${smtpSsrf.reason}` });
        }
        // Encrypt credentials
        const encIncoming = (0, user_email_crypto_service_1.encryptEmailSecret)(incomingPassword);
        const encSmtp = (0, user_email_crypto_service_1.encryptEmailSecret)(smtpPassword);
        // If marked default, unset other defaults for this user
        if (isDefault) {
            await prisma_1.prisma.userEmailAccount.updateMany({
                where: { userId, tenantId },
                data: { isDefault: false },
            });
        }
        // If first account for user, make it default automatically
        const existingCount = await prisma_1.prisma.userEmailAccount.count({
            where: { userId, tenantId },
        });
        const makeDefault = isDefault || existingCount === 0;
        const account = await prisma_1.prisma.userEmailAccount.create({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create email account" });
    }
});
/**
 * PUT /api/user/email-accounts/:id
 * Update an existing email account (preserves existing password if not re-submitted)
 */
exports.userEmailAccountsRouter.put("/:id", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const existing = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Email account not found" });
        }
        const { email, displayName, fromName, username, incomingProtocol, incomingHost, incomingPort, incomingSecurity, incomingPassword, smtpHost, smtpPort, smtpSecurity, smtpUser, smtpPassword, isDefault, } = req.body;
        const dataToUpdate = {};
        if (email)
            dataToUpdate.email = email.trim().toLowerCase();
        if (displayName !== undefined)
            dataToUpdate.displayName = displayName?.trim();
        if (fromName !== undefined)
            dataToUpdate.fromName = fromName?.trim();
        if (username !== undefined)
            dataToUpdate.username = username?.trim();
        if (incomingProtocol)
            dataToUpdate.incomingProtocol = incomingProtocol.toUpperCase() === "POP3" ? "POP3" : "IMAP";
        if (incomingHost) {
            const ssrf = await (0, user_email_crypto_service_1.validateHostForSsrf)(incomingHost);
            if (!ssrf.valid)
                return res.status(400).json({ error: ssrf.reason });
            dataToUpdate.incomingHost = incomingHost.trim();
        }
        if (incomingPort)
            dataToUpdate.incomingPort = Number(incomingPort);
        if (incomingSecurity)
            dataToUpdate.incomingSecurity = incomingSecurity;
        if (incomingPassword && incomingPassword.trim().length > 0) {
            const enc = (0, user_email_crypto_service_1.encryptEmailSecret)(incomingPassword);
            dataToUpdate.incomingPassCipher = enc.ciphertext;
            dataToUpdate.incomingPassIv = enc.iv;
            dataToUpdate.incomingPassAuthTag = enc.authTag;
        }
        if (smtpHost) {
            const ssrf = await (0, user_email_crypto_service_1.validateHostForSsrf)(smtpHost);
            if (!ssrf.valid)
                return res.status(400).json({ error: ssrf.reason });
            dataToUpdate.smtpHost = smtpHost.trim();
        }
        if (smtpPort)
            dataToUpdate.smtpPort = Number(smtpPort);
        if (smtpSecurity)
            dataToUpdate.smtpSecurity = smtpSecurity;
        if (smtpUser !== undefined)
            dataToUpdate.smtpUser = smtpUser?.trim();
        if (smtpPassword && smtpPassword.trim().length > 0) {
            const enc = (0, user_email_crypto_service_1.encryptEmailSecret)(smtpPassword);
            dataToUpdate.smtpPassCipher = enc.ciphertext;
            dataToUpdate.smtpPassIv = enc.iv;
            dataToUpdate.smtpPassAuthTag = enc.authTag;
        }
        if (isDefault !== undefined && isDefault) {
            await prisma_1.prisma.userEmailAccount.updateMany({
                where: { userId, tenantId },
                data: { isDefault: false },
            });
            dataToUpdate.isDefault = true;
        }
        const updated = await prisma_1.prisma.userEmailAccount.update({
            where: { id },
            data: dataToUpdate,
        });
        return res.json(sanitizeAccount(updated));
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update email account" });
    }
});
/**
 * POST /api/user/email-accounts/:id/set-default
 * Set account as user's primary/default mail account
 */
exports.userEmailAccountsRouter.post("/:id/set-default", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        // Unset other defaults for this user
        await prisma_1.prisma.userEmailAccount.updateMany({
            where: { userId, tenantId },
            data: { isDefault: false },
        });
        const updated = await prisma_1.prisma.userEmailAccount.update({
            where: { id },
            data: { isDefault: true },
        });
        return res.json(sanitizeAccount(updated));
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to set default account" });
    }
});
/**
 * DELETE /api/user/email-accounts/:id
 * Disconnect and remove saved configuration
 */
exports.userEmailAccountsRouter.delete("/:id", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const existing = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Email account not found" });
        }
        await prisma_1.prisma.userEmailAccount.delete({
            where: { id },
        });
        return res.json({ success: true, message: "Email account disconnected and deleted." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete email account" });
    }
});
/**
 * POST /api/user/email-accounts/:id/test-incoming
 * Test incoming IMAP or POP3 connectivity
 */
exports.userEmailAccountsRouter.post("/:id/test-incoming", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        // Decrypt incoming password
        const password = (0, user_email_crypto_service_1.decryptEmailSecret)({
            ciphertext: acc.incomingPassCipher,
            iv: acc.incomingPassIv,
            authTag: acc.incomingPassAuthTag,
        });
        const result = await user_mail_client_service_1.UserMailClientService.testIncoming({
            protocol: acc.incomingProtocol,
            host: acc.incomingHost,
            port: acc.incomingPort,
            security: acc.incomingSecurity,
            user: acc.username || acc.email,
            pass: password,
        });
        const newStatus = result.success ? "CONNECTED" : "CONNECTION_FAILED";
        await prisma_1.prisma.userEmailAccount.update({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to test incoming connection" });
    }
});
/**
 * POST /api/user/email-accounts/:id/test-outgoing
 * Test outgoing SMTP connectivity
 */
exports.userEmailAccountsRouter.post("/:id/test-outgoing", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        // Decrypt SMTP password
        const password = (0, user_email_crypto_service_1.decryptEmailSecret)({
            ciphertext: acc.smtpPassCipher,
            iv: acc.smtpPassIv,
            authTag: acc.smtpPassAuthTag,
        });
        const result = await user_mail_client_service_1.UserMailClientService.testSmtp({
            host: acc.smtpHost,
            port: acc.smtpPort,
            security: acc.smtpSecurity,
            user: acc.smtpUser || acc.username || acc.email,
            pass: password,
        });
        const newStatus = result.success ? "CONNECTED" : "CONNECTION_FAILED";
        await prisma_1.prisma.userEmailAccount.update({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to test SMTP connection" });
    }
});
/**
 * POST /api/user/email-accounts/:id/send-test
 * Send a single controlled test email from user's account
 */
exports.userEmailAccountsRouter.post("/:id/send-test", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const { testRecipient } = req.body;
        const targetRecipient = testRecipient || req.user?.email;
        if (!targetRecipient || !targetRecipient.includes("@")) {
            return res.status(400).json({ error: "A valid recipient email address is required for test email." });
        }
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        const password = (0, user_email_crypto_service_1.decryptEmailSecret)({
            ciphertext: acc.smtpPassCipher,
            iv: acc.smtpPassIv,
            authTag: acc.smtpPassAuthTag,
        });
        const result = await user_mail_client_service_1.UserMailClientService.sendSmtp({
            host: acc.smtpHost,
            port: acc.smtpPort,
            security: acc.smtpSecurity,
            user: acc.smtpUser || acc.username || acc.email,
            pass: password,
            fromName: acc.fromName || acc.displayName || acc.email,
            fromEmail: acc.email,
        }, {
            to: targetRecipient,
            subject: `[MASTERHRMS Test] Email Account Verification for ${acc.email}`,
            body: `Hello,\n\nThis is a verified test email sent from your configured email account (${acc.email}) on MASTERHRMS.\nTimestamp: ${new Date().toISOString()}`,
        });
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to send test email" });
    }
});
/**
 * POST /api/user/email-accounts/:id/set-default
 * Mark an account as default
 */
exports.userEmailAccountsRouter.post("/:id/set-default", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        await prisma_1.prisma.userEmailAccount.updateMany({
            where: { userId, tenantId },
            data: { isDefault: false },
        });
        await prisma_1.prisma.userEmailAccount.update({
            where: { id },
            data: { isDefault: true },
        });
        return res.json({ success: true, message: `Account ${acc.email} set as default.` });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to set default account" });
    }
});
/**
 * GET /api/user/email-accounts/:id/messages
 * Fetch messages from mailbox
 */
exports.userEmailAccountsRouter.get("/:id/messages", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const folder = req.query.folder || "INBOX";
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        const password = (0, user_email_crypto_service_1.decryptEmailSecret)({
            ciphertext: acc.incomingPassCipher,
            iv: acc.incomingPassIv,
            authTag: acc.incomingPassAuthTag,
        });
        const result = await user_mail_client_service_1.UserMailClientService.fetchMessages({
            protocol: acc.incomingProtocol,
            host: acc.incomingHost,
            port: acc.incomingPort,
            security: acc.incomingSecurity,
            user: acc.username || acc.email,
            pass: password,
        }, { folder, page, limit });
        if (!result.success) {
            return res.status(502).json({
                success: false,
                error: result.error || "Failed to retrieve messages from mail server",
                protocolNote: result.protocolNote,
            });
        }
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch mailbox messages" });
    }
});
/**
 * GET /api/user/email-accounts/:id/messages/:uid
 * Fetch message body content
 */
exports.userEmailAccountsRouter.get("/:id/messages/:uid", async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const tenantId = req.user?.tenantId;
        const { id, uid } = req.params;
        const folder = req.query.folder || "INBOX";
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        const password = (0, user_email_crypto_service_1.decryptEmailSecret)({
            ciphertext: acc.incomingPassCipher,
            iv: acc.incomingPassIv,
            authTag: acc.incomingPassAuthTag,
        });
        const result = await user_mail_client_service_1.UserMailClientService.fetchMessageDetail({
            protocol: acc.incomingProtocol,
            host: acc.incomingHost,
            port: acc.incomingPort,
            security: acc.incomingSecurity,
            user: acc.username || acc.email,
            pass: password,
        }, uid, folder);
        if (!result.success) {
            return res.status(502).json({ error: result.error || "Failed to retrieve message detail" });
        }
        return res.json(result.message);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch message detail" });
    }
});
/**
 * POST /api/user/email-accounts/:id/send
 * Compose and send an email using this specific personal account
 */
exports.userEmailAccountsRouter.post("/:id/send", async (req, res) => {
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
        const acc = await prisma_1.prisma.userEmailAccount.findFirst({
            where: { id, userId, tenantId },
        });
        if (!acc) {
            return res.status(404).json({ error: "Email account not found" });
        }
        const password = (0, user_email_crypto_service_1.decryptEmailSecret)({
            ciphertext: acc.smtpPassCipher,
            iv: acc.smtpPassIv,
            authTag: acc.smtpPassAuthTag,
        });
        const result = await user_mail_client_service_1.UserMailClientService.sendSmtp({
            host: acc.smtpHost,
            port: acc.smtpPort,
            security: acc.smtpSecurity,
            user: acc.smtpUser || acc.username || acc.email,
            pass: password,
            fromName: acc.fromName || acc.displayName || acc.email,
            fromEmail: acc.email,
        }, {
            to: toList,
            subject: subject || "No Subject",
            body: body || content || "",
        });
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to dispatch email" });
    }
});
