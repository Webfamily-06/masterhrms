"use strict";
/**
 * MASTERHRMS — S-Track Step S2: Mailer Runtime Factory
 *
 * Implements a dynamic, hot-reloadable Nodemailer transporter pool with:
 * 1. Scope-aware transporter caching (PLATFORM vs TENANT).
 * 2. Automatic configuration resolution from SettingsService with fallback to .env.
 * 3. Graceful closure of obsolete transports on settings changes.
 * 4. Zero secret leakage in logs, errors, or telemetry.
 * 5. Safe connection verification without crashing calling processes.
 * 6. Test transport support for mock-driven integration tests.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerFactory = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const settings_service_1 = require("../settings/settings.service");
const workspace_host_1 = require("../../lib/workspace-host");
class MailerFactory {
    // Transporter instance pool keyed by scope identity: "PLATFORM" or "TENANT:${tenantId}"
    static transporterPool = new Map();
    static testTransport = null;
    /**
     * For testing purposes only: allows injecting a test transport (e.g. mock / memory stream).
     */
    static setTestTransport(transport) {
        this.testTransport = transport;
    }
    /**
     * Build pool key from scope and tenantId
     */
    static getPoolKey(scope, tenantId) {
        if (scope === "TENANT" && tenantId) {
            return `TENANT:${tenantId}`;
        }
        return "PLATFORM";
    }
    /**
     * Compute deterministic config fingerprint to detect changes
     */
    static computeFingerprint(s) {
        const raw = `${s.providerType}|${s.host}|${s.port}|${s.user}|${s.pass}|${s.encryption}|${s.ignoreTls}`;
        return crypto_1.default.createHash("sha256").update(raw).digest("hex").slice(0, 16);
    }
    /**
     * Resolve current SMTP settings dynamically from SettingsService with fallback to environment
     */
    static async resolveSettings(scope = "PLATFORM", tenantId) {
        let providerType = "smtp";
        let host = process.env.SMTP_HOST || "";
        let port = parseInt(process.env.SMTP_PORT || "587", 10);
        let user = process.env.SMTP_USER || "";
        let pass = process.env.SMTP_PASS || "";
        let encryption = (process.env.SMTP_ENCRYPTION || "tls");
        let fromName = process.env.SMTP_FROM_NAME || "Master HRMS";
        let fromEmail = process.env.SMTP_FROM_EMAIL || user || `notifications@${(0, workspace_host_1.getBaseDomain)()}`;
        let replyTo = undefined;
        let ignoreTls = process.env.SMTP_IGNORE_TLS === "true";
        try {
            const emailGroup = await settings_service_1.SettingsService.getGroup(scope, tenantId || null, "email", {
                decryptSecrets: true,
            });
            if (emailGroup?.values && emailGroup.values["email.smtp_host"]) {
                const v = emailGroup.values;
                if (v["email.provider_type"])
                    providerType = String(v["email.provider_type"]);
                if (v["email.smtp_host"])
                    host = String(v["email.smtp_host"]).trim();
                if (v["email.smtp_port"] !== undefined && v["email.smtp_port"] !== null) {
                    port = Number(v["email.smtp_port"]);
                }
                if (v["email.smtp_user"])
                    user = String(v["email.smtp_user"]).trim();
                if (v["email.smtp_password"] && !String(v["email.smtp_password"]).includes("••••")) {
                    pass = String(v["email.smtp_password"]).trim();
                }
                if (v["email.smtp_encryption"])
                    encryption = v["email.smtp_encryption"];
                if (v["email.from_name"])
                    fromName = String(v["email.from_name"]).trim();
                if (v["email.from_email"])
                    fromEmail = String(v["email.from_email"]).trim();
                if (v["email.reply_to"])
                    replyTo = String(v["email.reply_to"]).trim();
                if (v["email.ignore_tls"] !== undefined)
                    ignoreTls = Boolean(v["email.ignore_tls"]);
            }
            else {
                // Fallback check to system-platform-settings in cmsPage
                try {
                    const { prisma } = await Promise.resolve().then(() => __importStar(require("../../prisma")));
                    const page = await prisma.cmsPage.findFirst({
                        where: { slug: { in: ["system-platform-settings", "global-super-settings"] } },
                        orderBy: { updatedAt: "desc" },
                    });
                    if (page?.content) {
                        const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
                        if (c.smtpHost)
                            host = String(c.smtpHost).trim();
                        if (c.smtpPort)
                            port = Number(c.smtpPort);
                        if (c.smtpUser)
                            user = String(c.smtpUser).trim();
                        const passVal = c.smtpPass || c.smtpPassword;
                        if (passVal && !String(passVal).includes("••••"))
                            pass = String(passVal).trim();
                        if (c.smtpEncryption)
                            encryption = c.smtpEncryption;
                        if (c.smtpFromName)
                            fromName = c.smtpFromName;
                        if (c.smtpFromEmail)
                            fromEmail = c.smtpFromEmail;
                        if (c.smtpReplyTo)
                            replyTo = c.smtpReplyTo;
                        if (c.smtpIgnoreTls !== undefined)
                            ignoreTls = Boolean(c.smtpIgnoreTls);
                    }
                }
                catch { }
            }
        }
        catch (err) {
            console.warn(`[MailerFactory] Failed to resolve settings for ${scope}:${tenantId}:`, err?.message);
        }
        const rawSettings = {
            providerType,
            host,
            port,
            user,
            pass,
            encryption,
            fromName,
            fromEmail,
            replyTo,
            ignoreTls,
        };
        return {
            ...rawSettings,
            fingerprint: this.computeFingerprint(rawSettings),
        };
    }
    /**
     * Build Nodemailer transport options from resolved settings
     */
    static buildTransportOptions(settings) {
        const isSecure = settings.encryption === "ssl" || settings.port === 465;
        const tlsOptions = {};
        if (settings.ignoreTls) {
            tlsOptions.rejectUnauthorized = false;
        }
        return {
            host: settings.host,
            port: settings.port,
            secure: isSecure,
            auth: settings.user && settings.pass ? { user: settings.user, pass: settings.pass } : undefined,
            tls: tlsOptions,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
        };
    }
    /**
     * Get or create a cached Transporter instance for the specified scope.
     * If settings changed since last creation, the obsolete transporter is closed gracefully
     * and a fresh transporter is initialized without restarting the server.
     */
    static async getTransporter(scope = "PLATFORM", tenantId) {
        if (this.testTransport) {
            return this.testTransport;
        }
        const poolKey = this.getPoolKey(scope, tenantId);
        const currentSettings = await this.resolveSettings(scope, tenantId);
        const cached = this.transporterPool.get(poolKey);
        // Reuse existing transporter if settings fingerprint matches
        if (cached && cached.settings.fingerprint === currentSettings.fingerprint) {
            return cached.transporter;
        }
        // Settings changed or first initialization: close old transporter if any
        if (cached) {
            try {
                cached.transporter.close();
            }
            catch (closeErr) {
                console.warn(`[MailerFactory] Error closing old transporter for ${poolKey}:`, closeErr?.message);
            }
        }
        // Create new transporter
        const transportOptions = this.buildTransportOptions(currentSettings);
        const newTransporter = nodemailer_1.default.createTransport(transportOptions);
        this.transporterPool.set(poolKey, {
            transporter: newTransporter,
            settings: currentSettings,
            createdAt: Date.now(),
        });
        return newTransporter;
    }
    /**
     * Verify SMTP connection for specified scope without crashing on error
     */
    static async verifyConnection(scope = "PLATFORM", tenantId) {
        try {
            const currentSettings = await this.resolveSettings(scope, tenantId);
            if (!currentSettings.host) {
                return {
                    ok: false,
                    message: "SMTP Host is not configured.",
                    error: "CONFIGURATION_ERROR: SMTP_HOST is blank.",
                    errorType: "CONFIG",
                };
            }
            const transporter = await this.getTransporter(scope, tenantId);
            if (this.testTransport) {
                return { ok: true, message: "Test transport connection verified successfully." };
            }
            await transporter.verify();
            return { ok: true, message: `SMTP socket handshake and authentication to ${currentSettings.host}:${currentSettings.port} verified successfully.` };
        }
        catch (err) {
            // Sanitize error message to prevent leaking credentials
            const rawMsg = err?.message || "Connection failed";
            const sanitized = rawMsg.replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
            const code = err?.code || "";
            const responseCode = err?.responseCode || 0;
            let errorType = "UNKNOWN";
            if (code === "ENOTFOUND" || code === "EAI_AGAIN" || sanitized.includes("getaddrinfo")) {
                errorType = "DNS";
            }
            else if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ECONNRESET" || sanitized.includes("connect ECONNREFUSED")) {
                errorType = "TCP";
            }
            else if (code === "ESOCKET" || sanitized.includes("self signed") || sanitized.includes("certificate") || sanitized.includes("TLS") || sanitized.includes("SSL")) {
                errorType = "TLS";
            }
            else if (responseCode === 535 || code === "EAUTH" || sanitized.includes("Username and Password not accepted") || sanitized.includes("authentication failed")) {
                errorType = "AUTH";
            }
            return {
                ok: false,
                message: `SMTP handshake failed [${errorType}]: ${sanitized}`,
                error: sanitized,
                errorType,
            };
        }
    }
    /**
     * Dispatch an email using the active dynamic transporter
     */
    static async sendMail(options) {
        try {
            const scope = options.scope || "PLATFORM";
            const transporter = await this.getTransporter(scope, options.tenantId);
            const settings = await this.resolveSettings(scope, options.tenantId);
            const fromHeader = `"${options.fromName || settings.fromName}" <${options.fromEmail || settings.fromEmail}>`;
            const result = await transporter.sendMail({
                from: fromHeader,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                replyTo: options.replyTo || settings.replyTo || options.fromEmail || settings.fromEmail,
                attachments: options.attachments,
            });
            return { success: true, messageId: result.messageId };
        }
        catch (err) {
            const sanitized = (err?.message || "Failed to dispatch email").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
            console.error("[MailerFactory.sendMail] Dispatch error:", sanitized);
            return { success: false, error: sanitized };
        }
    }
    /**
     * Invalidate and close cached transporter on settings update
     */
    static async invalidate(scope, tenantId) {
        if (!scope) {
            // Invalidate all
            for (const [key, cached] of this.transporterPool.entries()) {
                try {
                    cached.transporter.close();
                }
                catch { }
            }
            this.transporterPool.clear();
            return;
        }
        const poolKey = this.getPoolKey(scope, tenantId);
        const cached = this.transporterPool.get(poolKey);
        if (cached) {
            try {
                cached.transporter.close();
            }
            catch { }
            this.transporterPool.delete(poolKey);
        }
        // If platform settings invalidated, clear tenant overrides too to refresh fallback
        if (scope === "PLATFORM") {
            for (const [key, entry] of this.transporterPool.entries()) {
                try {
                    entry.transporter.close();
                }
                catch { }
            }
            this.transporterPool.clear();
        }
    }
    /**
     * Returns current pool size and metadata for monitoring
     */
    static getPoolStats() {
        return {
            poolSize: this.transporterPool.size,
            keys: Array.from(this.transporterPool.keys()),
        };
    }
}
exports.MailerFactory = MailerFactory;
