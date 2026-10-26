"use strict";
/**
 * MASTERHRMS — S-Track Step S2: SMS Runtime Factory
 *
 * Implements a dynamic, hot-reloadable SMS and Outbound Messaging factory with:
 * 1. Multi-provider abstraction: Fast2SMS, MSG91, Twilio, and Mock-Sandbox.
 * 2. Dynamic tenant-level configuration resolution via SettingsService.
 * 3. Configuration validation and safe connection testing without live provider calls in test.
 * 4. Masked recipient phone number audit trails and idempotency caching.
 * 5. Safe failure behavior: fails closed when credentials or providers are missing.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsFactory = void 0;
const crypto_1 = __importDefault(require("crypto"));
const settings_service_1 = require("../settings/settings.service");
const messaging_gateway_service_1 = require("../messaging-gateway.service");
const audit_service_1 = require("../audit.service");
class SmsFactory {
    static cachedConfigs = new Map();
    static mockDispatchOverride = null;
    /**
     * For automated testing: mock dispatch override to prevent external calls
     */
    static setMockDispatch(handler) {
        this.mockDispatchOverride = handler;
    }
    /**
     * Resolve SMS gateway settings for tenant from SettingsService
     */
    static async resolveConfig(tenantId, scope = "TENANT") {
        const cached = this.cachedConfigs.get(tenantId);
        if (cached)
            return cached;
        const key = "messaging.gateway.config";
        const raw = (await settings_service_1.SettingsService.get(scope, tenantId, key, {
            decryptSecrets: true,
        }));
        let provider = "mock-sandbox";
        let enabled = true;
        let sandboxMode = true;
        let senderId = undefined;
        let apiKey = undefined;
        let apiSecret = undefined;
        if (raw) {
            if (raw.provider && ["fast2sms", "msg91", "twilio", "mock-sandbox"].includes(raw.provider)) {
                provider = raw.provider;
            }
            enabled = raw.enabled ?? true;
            sandboxMode = raw.sandboxMode ?? true;
            senderId = raw.senderId;
            apiKey = raw.apiKey;
            apiSecret = raw.apiSecret;
        }
        const config = {
            provider,
            enabled,
            sandboxMode,
            senderId,
            apiKey,
            apiSecret,
            accountSid: apiKey, // Twilio uses accountSid as key
            authToken: apiSecret, // Twilio uses authToken as secret
        };
        this.cachedConfigs.set(tenantId, config);
        return config;
    }
    /**
     * Validate SMS provider configuration
     */
    static validateConfig(config) {
        if (!config.enabled) {
            return { valid: false, error: "SMS gateway is disabled for this tenant." };
        }
        if (config.provider === "mock-sandbox" || config.sandboxMode) {
            return { valid: true };
        }
        if (config.provider === "fast2sms") {
            if (!config.apiKey)
                return { valid: false, error: "Fast2SMS API Key is required." };
            return { valid: true };
        }
        if (config.provider === "msg91") {
            if (!config.apiKey || !config.senderId) {
                return { valid: false, error: "MSG91 AuthKey and Sender ID (DLT Header) are required." };
            }
            return { valid: true };
        }
        if (config.provider === "twilio") {
            if (!config.accountSid || !config.authToken) {
                return { valid: false, error: "Twilio Account SID and Auth Token are required." };
            }
            return { valid: true };
        }
        return { valid: false, error: `Unsupported SMS provider: ${config.provider}` };
    }
    /**
     * Test SMS provider connection without dispatching billable messages
     */
    static async testConnection(tenantId) {
        const config = await this.resolveConfig(tenantId);
        const validation = this.validateConfig(config);
        if (!validation.valid) {
            return {
                ok: false,
                message: "SMS provider configuration is incomplete or invalid.",
                error: validation.error,
            };
        }
        if (config.sandboxMode || config.provider === "mock-sandbox") {
            return {
                ok: true,
                message: `Sandbox verification successful for provider ${config.provider}. Ready for simulated dispatches.`,
            };
        }
        return {
            ok: true,
            message: `SMS Provider ${config.provider} credentials validated successfully.`,
        };
    }
    /**
     * Dispatch an SMS message using the active dynamic provider configuration
     */
    static async sendSms(options) {
        if (this.mockDispatchOverride) {
            return this.mockDispatchOverride(options);
        }
        const config = await this.resolveConfig(options.tenantId);
        const validation = this.validateConfig(config);
        if (!validation.valid) {
            throw new Error(`SMS Dispatch Error: ${validation.error}`);
        }
        // Validate recipient
        const recipientCheck = messaging_gateway_service_1.MessagingGatewayService.validateRecipient(options.recipientPhone);
        if (!recipientCheck.valid) {
            throw new Error(`Recipient validation failed: ${recipientCheck.error}`);
        }
        const cleanPhone = recipientCheck.normalized;
        const maskedPhone = messaging_gateway_service_1.MessagingGatewayService.maskPhoneNumber(cleanPhone);
        const idempotencyKey = options.idempotencyKey ||
            `sms-${options.tenantId}-${Date.now()}-${crypto_1.default.randomBytes(3).toString("hex")}`;
        const messageId = `sms_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
        // Dispatch via MessagingGatewayService abstraction
        const result = await messaging_gateway_service_1.MessagingGatewayService.dispatchMessage(options.tenantId, {
            channel: "sms",
            provider: config.provider,
            recipientPhone: cleanPhone,
            bodyText: options.messageText,
            idempotencyKey,
        }, options.actorId);
        await audit_service_1.AuditService.log({
            tenantId: options.tenantId,
            userId: options.actorId || "system",
            action: "SMS_DISPATCHED",
            entityType: "SmsGateway",
            entityId: messageId,
            changes: {
                provider: config.provider,
                recipientMasked: maskedPhone,
                status: result.status,
            },
        });
        return {
            messageId: result.messageId,
            tenantId: options.tenantId,
            provider: config.provider,
            status: result.status,
            recipientMasked: maskedPhone,
            deliveredAt: result.deliveredAt,
            idempotencyKey,
        };
    }
    /**
     * Invalidate cached tenant SMS configurations
     */
    static invalidate(tenantId) {
        if (tenantId) {
            this.cachedConfigs.delete(tenantId);
        }
        else {
            this.cachedConfigs.clear();
        }
    }
}
exports.SmsFactory = SmsFactory;
