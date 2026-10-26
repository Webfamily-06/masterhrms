"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsGatewayService = void 0;
const sms_factory_1 = require("../../services/factories/sms.factory");
const settings_service_1 = require("../../services/settings/settings.service");
const audit_service_1 = require("../../services/audit.service");
const outbox_service_1 = require("../../services/outbox.service");
const prisma_1 = require("../../prisma");
const db = prisma_1.rawPrisma || prisma_1.prisma;
class SmsGatewayService {
    static SETTING_KEY = "messaging.gateway.config";
    /**
     * Get current SMS gateway configuration with masked credentials
     */
    static async getConfig(tenantId) {
        const config = await sms_factory_1.SmsFactory.resolveConfig(tenantId);
        return {
            provider: config.provider,
            enabled: config.enabled,
            sandboxMode: config.sandboxMode,
            senderId: config.senderId,
            apiKeyMasked: config.apiKey ? `••••••••${config.apiKey.slice(-4)}` : undefined,
            apiSecretMasked: config.apiSecret ? "••••••••••••••••" : undefined,
        };
    }
    /**
     * Update SMS gateway configuration, encrypt sensitive credentials, and invalidate factory cache
     */
    static async updateConfig(tenantId, userId, input) {
        // 1. Fetch current config
        const current = (await settings_service_1.SettingsService.get("TENANT", tenantId, this.SETTING_KEY, {
            decryptSecrets: true,
        }));
        const providerChanged = current?.provider && current.provider !== input.provider;
        const updated = {
            provider: input.provider,
            enabled: input.enabled ?? current?.enabled ?? true,
            sandboxMode: input.sandboxMode ?? (providerChanged ? true : current?.sandboxMode ?? true),
            senderId: input.senderId ?? (providerChanged ? undefined : current?.senderId),
            apiKey: input.apiKey !== undefined ? input.apiKey : (providerChanged ? undefined : current?.apiKey),
            apiSecret: input.apiSecret !== undefined ? input.apiSecret : (providerChanged ? undefined : current?.apiSecret),
        };
        // 2. Validate configuration rules
        const testConfig = {
            provider: updated.provider,
            enabled: updated.enabled,
            sandboxMode: updated.sandboxMode,
            senderId: updated.senderId,
            apiKey: updated.apiKey,
            apiSecret: updated.apiSecret,
        };
        const validation = sms_factory_1.SmsFactory.validateConfig(testConfig);
        if (!validation.valid) {
            throw new Error(`Invalid SMS Configuration: ${validation.error}`);
        }
        // 3. Persist via SettingsService
        await settings_service_1.SettingsService.set("TENANT", tenantId, this.SETTING_KEY, updated, userId);
        // 4. Invalidate SmsFactory cache
        sms_factory_1.SmsFactory.invalidate(tenantId);
        // 5. Record audit and outbox event
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: userId,
            action: "sms.gateway.configured",
            entityType: "SmsGateway",
            entityId: updated.provider,
            newState: {
                provider: updated.provider,
                enabled: updated.enabled,
                sandboxMode: updated.sandboxMode,
                senderId: updated.senderId,
            },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "sms.configured",
            entityType: "SmsGateway",
            entityId: updated.provider,
            actorId: userId,
            payload: {
                provider: updated.provider,
                enabled: updated.enabled,
                sandboxMode: updated.sandboxMode,
            },
        }).catch(() => { });
        return {
            provider: updated.provider,
            enabled: updated.enabled,
            sandboxMode: updated.sandboxMode,
            senderId: updated.senderId,
            apiKeyMasked: updated.apiKey ? `••••••••${updated.apiKey.slice(-4)}` : undefined,
            apiSecretMasked: updated.apiSecret ? "••••••••••••••••" : undefined,
        };
    }
    /**
     * Test SMS provider connection (safe handshake without sending real SMS)
     */
    static async testConnection(tenantId) {
        return await sms_factory_1.SmsFactory.testConnection(tenantId);
    }
    /**
     * Dispatch an SMS message (strictly fails closed if unconfigured)
     */
    static async sendSms(options) {
        return await sms_factory_1.SmsFactory.sendSms(options);
    }
}
exports.SmsGatewayService = SmsGatewayService;
