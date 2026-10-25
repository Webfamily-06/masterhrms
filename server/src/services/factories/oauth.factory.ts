/**
 * MASTERHRMS — S-Track Step S2: OAuth Runtime Factory
 *
 * Implements dynamic, hot-reloadable OAuth client management with:
 * 1. Strict PLATFORM scope enforcement (Tenant settings cannot override Platform OAuth credentials).
 * 2. Hot-reloading of provider configurations without server restarts.
 * 3. Safe public configuration endpoints for frontend UI login buttons (zero secret exposure).
 * 4. Secure internal credential resolution for server-side token exchanges.
 * 5. State generation and CSRF protection.
 */

import crypto from "crypto";
import { SettingsService } from "../settings/settings.service";
import { prisma } from "../../prisma";
import { getRootUrl } from "../../lib/workspace-host";

export interface OAuthProviderPublicInfo {
  enabled: boolean;
  configured: boolean;
  clientId?: string;
}

export interface OAuthPublicConfig {
  oauthBaseUrl: string;
  providers: {
    google: OAuthProviderPublicInfo;
    github: OAuthProviderPublicInfo;
    microsoft: OAuthProviderPublicInfo;
    apple: OAuthProviderPublicInfo;
    linkedin: OAuthProviderPublicInfo;
    facebook: OAuthProviderPublicInfo;
  };
}

export interface OAuthInternalProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string;
  tenantId?: string; // Optional Microsoft tenant ID
}

export interface ResolvedPlatformOAuthConfig {
  oauthBaseUrl: string;
  frontendBaseUrl: string;
  google: OAuthInternalProviderConfig;
  github: OAuthInternalProviderConfig;
  microsoft: OAuthInternalProviderConfig;
  apple: OAuthInternalProviderConfig & { teamId?: string; keyId?: string; privateKey?: string };
  linkedin: OAuthInternalProviderConfig;
  facebook: OAuthInternalProviderConfig & { appId?: string; appSecret?: string };
  version: number;
  fingerprint: string;
}

export class OAuthFactory {
  private static cachedConfig: ResolvedPlatformOAuthConfig | null = null;
  private static activeStates = new Map<string, { createdAt: number; provider: string }>();

  /**
   * Compute fingerprint to detect configuration changes
   */
  private static computeFingerprint(config: any): string {
    const raw = JSON.stringify({
      google: { id: config.google?.clientId, s: config.google?.clientSecret, e: config.google?.enabled },
      github: { id: config.github?.clientId, s: config.github?.clientSecret, e: config.github?.enabled },
      microsoft: { id: config.microsoft?.clientId, s: config.microsoft?.clientSecret, e: config.microsoft?.enabled },
    });
    return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
  }

  /**
   * Resolve platform OAuth configuration from SettingsService with fallback to cmsPage and .env
   */
  static async resolveConfig(req?: any): Promise<ResolvedPlatformOAuthConfig> {
    const isProd = process.env.NODE_ENV === "production";
    const reqHost = req ? `${req.protocol}://${req.get("host")}` : (process.env.API_URL || "http://localhost:4000");
    let oauthBaseUrl = reqHost;
    let frontendBaseUrl = process.env.FRONTEND_URL || process.env.APP_URL;

    if (!frontendBaseUrl) {
      if (req) {
        const hostname = req.hostname.toLowerCase();
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
        if (isLocal) {
          frontendBaseUrl = `${req.protocol}://${req.hostname}:${process.env.FRONTEND_PORT || 3000}`;
        } else {
          frontendBaseUrl = `${req.protocol}://${req.hostname}`;
        }
      } else {
        frontendBaseUrl = getRootUrl();
      }
    }

    // 1. Defaults / environment fallbacks
    let googleEnabled = true;
    let googleClientId = process.env.GOOGLE_CLIENT_ID || "";
    let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    let githubEnabled = false;
    let githubClientId = process.env.GITHUB_CLIENT_ID || "";
    let githubClientSecret = process.env.GITHUB_CLIENT_SECRET || "";

    let microsoftEnabled = false;
    let microsoftClientId = process.env.MICROSOFT_CLIENT_ID || "";
    let microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
    let microsoftTenantId = process.env.MICROSOFT_TENANT_ID || "common";

    let appleEnabled = false;
    let appleClientId = process.env.APPLE_CLIENT_ID || "";
    let appleTeamId = process.env.APPLE_TEAM_ID || "";
    let appleKeyId = process.env.APPLE_KEY_ID || "";
    let applePrivateKey = process.env.APPLE_PRIVATE_KEY || "";

    let linkedinEnabled = false;
    let linkedinClientId = process.env.LINKEDIN_CLIENT_ID || "";
    let linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";

    let facebookEnabled = false;
    let facebookAppId = process.env.FACEBOOK_APP_ID || "";
    let facebookAppSecret = process.env.FACEBOOK_APP_SECRET || "";

    // 2. Fallback to system-platform-settings CMS page
    try {
      const page = await prisma.cmsPage.findUnique({
        where: { slug: "system-platform-settings" },
      });
      if (page?.content) {
        const c = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
        if (c.oauthBaseUrl) {
          const clean = String(c.oauthBaseUrl).replace(/\/+$/, "");
          if (isProd && (clean.includes("localhost") || clean.includes("127.0.0.1"))) {
            console.warn(`[Security Warning] Configured oauthBaseUrl '${clean}' is a loopback address in production. Keeping: ${oauthBaseUrl}`);
          } else {
            oauthBaseUrl = clean;
          }
        }
        if (c.frontendBaseUrl) {
          const clean = String(c.frontendBaseUrl).replace(/\/+$/, "");
          if (isProd && (clean.includes("localhost") || clean.includes("127.0.0.1"))) {
            console.warn(`[Security Warning] Configured frontendBaseUrl '${clean}' is a loopback address in production. Keeping: ${frontendBaseUrl}`);
          } else {
            frontendBaseUrl = clean;
          }
        }
        if (c.googleEnabled !== undefined) googleEnabled = Boolean(c.googleEnabled);
        if (c.googleClientId) googleClientId = String(c.googleClientId);
        if (c.googleClientSecret) googleClientSecret = String(c.googleClientSecret);
        if (c.appleEnabled !== undefined) appleEnabled = Boolean(c.appleEnabled);
        if (c.appleClientId) appleClientId = String(c.appleClientId);
        if (c.appleTeamId) appleTeamId = String(c.appleTeamId);
        if (c.appleKeyId) appleKeyId = String(c.appleKeyId);
        if (c.applePrivateKey) applePrivateKey = String(c.applePrivateKey);
        if (c.linkedinEnabled !== undefined) linkedinEnabled = Boolean(c.linkedinEnabled);
        if (c.linkedinClientId) linkedinClientId = String(c.linkedinClientId);
        if (c.linkedinClientSecret) linkedinClientSecret = String(c.linkedinClientSecret);
        if (c.facebookEnabled !== undefined) facebookEnabled = Boolean(c.facebookEnabled);
        if (c.facebookAppId) facebookAppId = String(c.facebookAppId);
        if (c.facebookAppSecret) facebookAppSecret = String(c.facebookAppSecret);
      }
    } catch {}

    // 3. Authoritative SettingsService (PLATFORM scope only)
    try {
      const oauthGroup = await SettingsService.getGroup("PLATFORM", null, "oauth", {
        decryptSecrets: true,
      });

      if (oauthGroup?.values) {
        const v = oauthGroup.values;
        if (v["oauth.google_enabled"] !== undefined) googleEnabled = Boolean(v["oauth.google_enabled"]);
        if (v["oauth.google_client_id"]) googleClientId = String(v["oauth.google_client_id"]).trim();
        if (v["oauth.google_client_secret"]) googleClientSecret = String(v["oauth.google_client_secret"]).trim();

        if (v["oauth.github_enabled"] !== undefined) githubEnabled = Boolean(v["oauth.github_enabled"]);
        if (v["oauth.github_client_id"]) githubClientId = String(v["oauth.github_client_id"]).trim();
        if (v["oauth.github_client_secret"]) githubClientSecret = String(v["oauth.github_client_secret"]).trim();

        if (v["oauth.microsoft_enabled"] !== undefined) microsoftEnabled = Boolean(v["oauth.microsoft_enabled"]);
        if (v["oauth.microsoft_client_id"]) microsoftClientId = String(v["oauth.microsoft_client_id"]).trim();
        if (v["oauth.microsoft_client_secret"]) microsoftClientSecret = String(v["oauth.microsoft_client_secret"]).trim();
        if (v["oauth.microsoft_tenant_id"]) microsoftTenantId = String(v["oauth.microsoft_tenant_id"]).trim();
      }
    } catch (err: any) {
      console.warn("[OAuthFactory] Failed to resolve from SettingsService:", err?.message);
    }

    const config: ResolvedPlatformOAuthConfig = {
      oauthBaseUrl,
      frontendBaseUrl,
      google: {
        enabled: googleEnabled,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        callbackUrl: `${oauthBaseUrl}/api/auth/oauth/google/callback`,
        scope: "openid email profile",
      },
      github: {
        enabled: githubEnabled,
        clientId: githubClientId,
        clientSecret: githubClientSecret,
        callbackUrl: `${oauthBaseUrl}/api/auth/oauth/github/callback`,
        scope: "read:user user:email",
      },
      microsoft: {
        enabled: microsoftEnabled,
        clientId: microsoftClientId,
        clientSecret: microsoftClientSecret,
        callbackUrl: `${oauthBaseUrl}/api/auth/oauth/microsoft/callback`,
        scope: "openid profile email User.Read",
        tenantId: microsoftTenantId,
      },
      apple: {
        enabled: appleEnabled,
        clientId: appleClientId,
        clientSecret: "",
        teamId: appleTeamId,
        keyId: appleKeyId,
        privateKey: applePrivateKey,
        callbackUrl: `${oauthBaseUrl}/api/auth/oauth/apple/callback`,
        scope: "name email",
      },
      linkedin: {
        enabled: linkedinEnabled,
        clientId: linkedinClientId,
        clientSecret: linkedinClientSecret,
        callbackUrl: `${oauthBaseUrl}/api/auth/oauth/linkedin/callback`,
        scope: "openid profile email",
      },
      facebook: {
        enabled: facebookEnabled,
        clientId: facebookAppId,
        clientSecret: facebookAppSecret,
        appId: facebookAppId,
        appSecret: facebookAppSecret,
        callbackUrl: `${oauthBaseUrl}/api/auth/oauth/facebook/callback`,
        scope: "email,public_profile",
      },
      version: Date.now(),
      fingerprint: "",
    };

    config.fingerprint = this.computeFingerprint(config);
    this.cachedConfig = config;
    return config;
  }

  /**
   * Return safe public configuration for frontend authentication buttons (zero secret leakage)
   */
  static async getPublicConfig(req?: any): Promise<OAuthPublicConfig> {
    const config = await this.resolveConfig(req);
    return {
      oauthBaseUrl: config.oauthBaseUrl,
      providers: {
        google: {
          enabled: Boolean(config.google.enabled && config.google.clientId),
          configured: Boolean(config.google.clientId),
          clientId: config.google.clientId || undefined,
        },
        github: {
          enabled: Boolean(config.github.enabled && config.github.clientId),
          configured: Boolean(config.github.clientId),
          clientId: config.github.clientId || undefined,
        },
        microsoft: {
          enabled: Boolean(config.microsoft.enabled && config.microsoft.clientId),
          configured: Boolean(config.microsoft.clientId),
          clientId: config.microsoft.clientId || undefined,
        },
        apple: {
          enabled: Boolean(config.apple.enabled && config.apple.clientId),
          configured: Boolean(config.apple.clientId),
          clientId: config.apple.clientId || undefined,
        },
        linkedin: {
          enabled: Boolean(config.linkedin.enabled && config.linkedin.clientId),
          configured: Boolean(config.linkedin.clientId),
          clientId: config.linkedin.clientId || undefined,
        },
        facebook: {
          enabled: Boolean(config.facebook.enabled && (config.facebook.appId || config.facebook.clientId)),
          configured: Boolean(config.facebook.appId || config.facebook.clientId),
          clientId: config.facebook.appId || config.facebook.clientId || undefined,
        },
      },
    };
  }

  /**
   * Get provider configuration with decrypted secret (internal server use only)
   */
  static async getProviderConfig(provider: string, req?: any): Promise<OAuthInternalProviderConfig> {
    const config = await this.resolveConfig(req);
    const p = provider.toLowerCase();

    if (p === "google") return config.google;
    if (p === "github") return config.github;
    if (p === "microsoft") return config.microsoft;
    if (p === "apple") return config.apple;
    if (p === "linkedin") return config.linkedin;
    if (p === "facebook") return config.facebook;

    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  /**
   * Generate state parameter and track it for CSRF verification
   */
  static generateState(provider: string): string {
    const state = crypto.randomBytes(24).toString("hex");
    this.activeStates.set(state, {
      createdAt: Date.now(),
      provider: provider.toLowerCase(),
    });

    // Clean expired states (older than 10 minutes)
    const tenMinAgo = Date.now() - 600000;
    for (const [key, item] of this.activeStates.entries()) {
      if (item.createdAt < tenMinAgo) {
        this.activeStates.delete(key);
      }
    }

    return state;
  }

  /**
   * Validate state parameter against CSRF token store
   */
  static validateState(state: string, provider: string): boolean {
    if (!state) return false;
    const item = this.activeStates.get(state);
    if (!item) return false;

    this.activeStates.delete(state);
    const tenMinAgo = Date.now() - 600000;
    if (item.createdAt < tenMinAgo) return false;

    return item.provider === provider.toLowerCase();
  }

  /**
   * Build authorization URL for given provider
   */
  static async generateAuthUrl(provider: string, state: string, req?: any): Promise<string> {
    const p = provider.toLowerCase();
    const config = await this.getProviderConfig(p, req);

    if (!config.clientId) {
      throw new Error(`${provider} OAuth is not configured yet in Platform Settings.`);
    }

    if (p === "google") {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        response_type: "code",
        scope: config.scope,
        access_type: "offline",
        prompt: "select_account",
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    if (p === "github") {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        scope: config.scope,
        state,
      });
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    if (p === "microsoft") {
      const tenant = config.tenantId || "common";
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        response_type: "code",
        scope: config.scope,
        response_mode: "query",
        state,
      });
      return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
    }

    if (p === "linkedin") {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        scope: config.scope,
        state,
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }

    if (p === "facebook") {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        scope: config.scope,
        state,
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Invalidate cached OAuth configuration upon platform settings update
   */
  static invalidate(): void {
    this.cachedConfig = null;
  }
}
