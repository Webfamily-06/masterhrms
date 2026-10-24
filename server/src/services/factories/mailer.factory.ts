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

import nodemailer, { Transporter } from "nodemailer";
import crypto from "crypto";
import { SettingsService, SettingScopeType } from "../settings/settings.service";
import { getBaseDomain } from "../../lib/workspace-host";

export interface ResolvedSmtpSettings {
  providerType: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  encryption: "ssl" | "tls" | "none";
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  ignoreTls: boolean;
  fingerprint: string;
}

export interface MailerSendOptions {
  scope?: SettingScopeType;
  tenantId?: string | null;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  attachments?: any[];
}

interface CachedTransporter {
  transporter: Transporter;
  settings: ResolvedSmtpSettings;
  createdAt: number;
}

export class MailerFactory {
  // Transporter instance pool keyed by scope identity: "PLATFORM" or "TENANT:${tenantId}"
  private static transporterPool = new Map<string, CachedTransporter>();
  private static testTransport: Transporter | null = null;

  /**
   * For testing purposes only: allows injecting a test transport (e.g. mock / memory stream).
   */
  static setTestTransport(transport: Transporter | null): void {
    this.testTransport = transport;
  }

  /**
   * Build pool key from scope and tenantId
   */
  private static getPoolKey(scope: SettingScopeType, tenantId?: string | null): string {
    if (scope === "TENANT" && tenantId) {
      return `TENANT:${tenantId}`;
    }
    return "PLATFORM";
  }

  /**
   * Compute deterministic config fingerprint to detect changes
   */
  private static computeFingerprint(s: Omit<ResolvedSmtpSettings, "fingerprint">): string {
    const raw = `${s.providerType}|${s.host}|${s.port}|${s.user}|${s.pass}|${s.encryption}|${s.ignoreTls}`;
    return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
  }

  /**
   * Resolve current SMTP settings dynamically from SettingsService with fallback to environment
   */
  static async resolveSettings(
    scope: SettingScopeType = "PLATFORM",
    tenantId?: string | null
  ): Promise<ResolvedSmtpSettings> {
    let providerType = "smtp";
    let host = process.env.SMTP_HOST || "";
    let port = parseInt(process.env.SMTP_PORT || "587", 10);
    let user = process.env.SMTP_USER || "";
    let pass = process.env.SMTP_PASS || "";
    let encryption: "ssl" | "tls" | "none" = (process.env.SMTP_ENCRYPTION || "tls") as any;
    let fromName = process.env.SMTP_FROM_NAME || "Master HRMS";
    let fromEmail = process.env.SMTP_FROM_EMAIL || user || `notifications@${getBaseDomain()}`;
    let replyTo: string | undefined = undefined;
    let ignoreTls = process.env.SMTP_IGNORE_TLS === "true";

    try {
      const emailGroup = await SettingsService.getGroup(scope, tenantId || null, "email", {
        decryptSecrets: true,
      });

      if (emailGroup?.values) {
        const v = emailGroup.values;
        if (v["email.provider_type"]) providerType = String(v["email.provider_type"]);
        if (v["email.smtp_host"]) host = String(v["email.smtp_host"]).trim();
        if (v["email.smtp_port"] !== undefined && v["email.smtp_port"] !== null) {
          port = Number(v["email.smtp_port"]);
        }
        if (v["email.smtp_user"]) user = String(v["email.smtp_user"]).trim();
        if (v["email.smtp_password"]) pass = String(v["email.smtp_password"]).trim();
        if (v["email.smtp_encryption"]) encryption = v["email.smtp_encryption"] as any;
        if (v["email.from_name"]) fromName = String(v["email.from_name"]).trim();
        if (v["email.from_email"]) fromEmail = String(v["email.from_email"]).trim();
        if (v["email.reply_to"]) replyTo = String(v["email.reply_to"]).trim();
        if (v["email.ignore_tls"] !== undefined) ignoreTls = Boolean(v["email.ignore_tls"]);
      }
    } catch (err: any) {
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
  private static buildTransportOptions(settings: ResolvedSmtpSettings): any {
    const isSecure = settings.encryption === "ssl" || settings.port === 465;

    const tlsOptions: any = {};
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
  static async getTransporter(
    scope: SettingScopeType = "PLATFORM",
    tenantId?: string | null
  ): Promise<Transporter> {
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
      } catch (closeErr: any) {
        console.warn(`[MailerFactory] Error closing old transporter for ${poolKey}:`, closeErr?.message);
      }
    }

    // Create new transporter
    const transportOptions = this.buildTransportOptions(currentSettings);
    const newTransporter = nodemailer.createTransport(transportOptions);

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
  static async verifyConnection(
    scope: SettingScopeType = "PLATFORM",
    tenantId?: string | null
  ): Promise<{ ok: boolean; message: string; error?: string }> {
    try {
      const transporter = await this.getTransporter(scope, tenantId);
      if (this.testTransport) {
        return { ok: true, message: "Test transport connection verified successfully." };
      }

      await transporter.verify();
      return { ok: true, message: "SMTP server connection verified successfully." };
    } catch (err: any) {
      // Sanitize error message to prevent leaking credentials
      const sanitized = (err?.message || "Connection failed").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
      return {
        ok: false,
        message: "Failed to connect to SMTP server.",
        error: sanitized,
      };
    }
  }

  /**
   * Dispatch an email using the active dynamic transporter
   */
  static async sendMail(options: MailerSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
    } catch (err: any) {
      const sanitized = (err?.message || "Failed to dispatch email").replace(/(pass(word)?\s*[:=]\s*)[^\s&]+/gi, "$1***");
      console.error("[MailerFactory.sendMail] Dispatch error:", sanitized);
      return { success: false, error: sanitized };
    }
  }

  /**
   * Invalidate and close cached transporter on settings update
   */
  static async invalidate(scope?: SettingScopeType, tenantId?: string | null): Promise<void> {
    if (!scope) {
      // Invalidate all
      for (const [key, cached] of this.transporterPool.entries()) {
        try {
          cached.transporter.close();
        } catch {}
      }
      this.transporterPool.clear();
      return;
    }

    const poolKey = this.getPoolKey(scope, tenantId);
    const cached = this.transporterPool.get(poolKey);
    if (cached) {
      try {
        cached.transporter.close();
      } catch {}
      this.transporterPool.delete(poolKey);
    }

    // If platform settings invalidated, clear tenant overrides too to refresh fallback
    if (scope === "PLATFORM") {
      for (const [key, entry] of this.transporterPool.entries()) {
        try {
          entry.transporter.close();
        } catch {}
      }
      this.transporterPool.clear();
    }
  }

  /**
   * Returns current pool size and metadata for monitoring
   */
  static getPoolStats(): { poolSize: number; keys: string[] } {
    return {
      poolSize: this.transporterPool.size,
      keys: Array.from(this.transporterPool.keys()),
    };
  }
}
