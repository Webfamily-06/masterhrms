import { SmsFactory, ResolvedSmsConfig, SendSmsOptions, SmsDispatchResult } from "../../services/factories/sms.factory";
import { SettingsService } from "../../services/settings/settings.service";
import { AuditService } from "../../services/audit.service";
import { OutboxService } from "../../services/outbox.service";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const db = rawPrisma || proxiedPrisma;

export interface MaskedSmsConfig {
  provider: string;
  enabled: boolean;
  sandboxMode: boolean;
  senderId?: string;
  apiKeyMasked?: string;
  apiSecretMasked?: string;
}

export class SmsGatewayService {
  private static SETTING_KEY = "messaging.gateway.config";

  /**
   * Get current SMS gateway configuration with masked credentials
   */
  static async getConfig(tenantId: string): Promise<MaskedSmsConfig> {
    const config = await SmsFactory.resolveConfig(tenantId);

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
  static async updateConfig(
    tenantId: string,
    userId: string,
    input: {
      provider: "fast2sms" | "msg91" | "twilio" | "mock-sandbox";
      enabled?: boolean;
      sandboxMode?: boolean;
      senderId?: string;
      apiKey?: string;
      apiSecret?: string;
    }
  ): Promise<MaskedSmsConfig> {
    // 1. Fetch current config
    const current = (await SettingsService.get("TENANT", tenantId, this.SETTING_KEY, {
      decryptSecrets: true,
    })) as any;

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
    const testConfig: ResolvedSmsConfig = {
      provider: updated.provider,
      enabled: updated.enabled,
      sandboxMode: updated.sandboxMode,
      senderId: updated.senderId,
      apiKey: updated.apiKey,
      apiSecret: updated.apiSecret,
    };

    const validation = SmsFactory.validateConfig(testConfig);
    if (!validation.valid) {
      throw new Error(`Invalid SMS Configuration: ${validation.error}`);
    }

    // 3. Persist via SettingsService
    await SettingsService.set("TENANT", tenantId, this.SETTING_KEY, updated, userId);

    // 4. Invalidate SmsFactory cache
    SmsFactory.invalidate(tenantId);

    // 5. Record audit and outbox event
    await AuditService.logMutation({
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
    }).catch(() => {});

    await OutboxService.createOutboxEvent({
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
    }).catch(() => {});

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
  static async testConnection(tenantId: string) {
    return await SmsFactory.testConnection(tenantId);
  }

  /**
   * Dispatch an SMS message (strictly fails closed if unconfigured)
   */
  static async sendSms(options: SendSmsOptions): Promise<SmsDispatchResult> {
    return await SmsFactory.sendSms(options);
  }
}
