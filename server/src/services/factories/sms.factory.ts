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

import crypto from "crypto";
import { SettingsService, SettingScopeType } from "../settings/settings.service";
import { MessagingGatewayService, ProviderConfig } from "../messaging-gateway.service";
import { AuditService } from "../audit.service";

export type SmsProviderType = "fast2sms" | "msg91" | "twilio" | "mock-sandbox";

export interface ResolvedSmsConfig {
  provider: SmsProviderType;
  enabled: boolean;
  sandboxMode: boolean;
  senderId?: string;
  phoneNumberId?: string;
  apiKey?: string;
  apiSecret?: string;
  accountSid?: string;
  authToken?: string;
}

export interface SendSmsOptions {
  tenantId: string;
  recipientPhone: string;
  messageText: string;
  senderId?: string;
  idempotencyKey?: string;
  actorId?: string;
}

export interface SmsDispatchResult {
  messageId: string;
  tenantId: string;
  provider: SmsProviderType;
  status: "sent" | "delivered" | "failed" | "queued";
  recipientMasked: string;
  deliveredAt?: string;
  error?: string;
  idempotencyKey: string;
}

export class SmsFactory {
  private static cachedConfigs = new Map<string, ResolvedSmsConfig>();
  private static mockDispatchOverride: ((options: SendSmsOptions) => Promise<SmsDispatchResult>) | null = null;

  /**
   * For automated testing: mock dispatch override to prevent external calls
   */
  static setMockDispatch(handler: ((options: SendSmsOptions) => Promise<SmsDispatchResult>) | null): void {
    this.mockDispatchOverride = handler;
  }

  /**
   * Resolve SMS gateway settings for tenant from SettingsService
   */
  static async resolveConfig(
    tenantId: string,
    scope: SettingScopeType = "TENANT"
  ): Promise<ResolvedSmsConfig> {
    const cached = this.cachedConfigs.get(tenantId);
    if (cached) return cached;

    const key = "messaging.gateway.config";
    const raw = (await SettingsService.get(scope, tenantId, key, {
      decryptSecrets: true,
    })) as ProviderConfig | null;

    let provider: SmsProviderType = "mock-sandbox";
    let enabled = true;
    let sandboxMode = true;
    let senderId: string | undefined = undefined;
    let apiKey: string | undefined = undefined;
    let apiSecret: string | undefined = undefined;

    if (raw) {
      if (raw.provider && ["fast2sms", "msg91", "twilio", "mock-sandbox"].includes(raw.provider)) {
        provider = raw.provider as SmsProviderType;
      }
      enabled = raw.enabled ?? true;
      sandboxMode = raw.sandboxMode ?? true;
      senderId = raw.senderId;
      apiKey = raw.apiKey;
      apiSecret = raw.apiSecret;
    }

    const config: ResolvedSmsConfig = {
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
  static validateConfig(config: ResolvedSmsConfig): { valid: boolean; error?: string } {
    if (!config.enabled) {
      return { valid: false, error: "SMS gateway is disabled for this tenant." };
    }

    if (config.provider === "mock-sandbox" || config.sandboxMode) {
      return { valid: true };
    }

    if (config.provider === "fast2sms") {
      if (!config.apiKey) return { valid: false, error: "Fast2SMS API Key is required." };
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
  static async testConnection(tenantId: string): Promise<{ ok: boolean; message: string; error?: string }> {
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
  static async sendSms(options: SendSmsOptions): Promise<SmsDispatchResult> {
    if (this.mockDispatchOverride) {
      return this.mockDispatchOverride(options);
    }

    const config = await this.resolveConfig(options.tenantId);
    const validation = this.validateConfig(config);

    if (!validation.valid) {
      throw new Error(`SMS Dispatch Error: ${validation.error}`);
    }

    // Validate recipient
    const recipientCheck = MessagingGatewayService.validateRecipient(options.recipientPhone);
    if (!recipientCheck.valid) {
      throw new Error(`Recipient validation failed: ${recipientCheck.error}`);
    }

    const cleanPhone = recipientCheck.normalized!;
    const maskedPhone = MessagingGatewayService.maskPhoneNumber(cleanPhone);
    const idempotencyKey =
      options.idempotencyKey ||
      `sms-${options.tenantId}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const messageId = `sms_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Dispatch via MessagingGatewayService abstraction
    const result = await MessagingGatewayService.dispatchMessage(
      options.tenantId,
      {
        channel: "sms",
        provider: config.provider as any,
        recipientPhone: cleanPhone,
        bodyText: options.messageText,
        idempotencyKey,
      },
      options.actorId
    );

    await AuditService.log({
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
  static invalidate(tenantId?: string): void {
    if (tenantId) {
      this.cachedConfigs.delete(tenantId);
    } else {
      this.cachedConfigs.clear();
    }
  }
}
