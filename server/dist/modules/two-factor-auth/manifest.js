"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorAuthManifest = void 0;
exports.twoFactorAuthManifest = {
    slug: "two-factor-auth",
    name: "Two-Factor Authentication (TOTP)",
    category: "Security and Authentication",
    type: "security",
    surface: "setting",
    routePrefix: "/two-factor-auth",
    engine: "E9",
    version: "1.0.0",
    entitlementKey: "two-factor-auth",
    provides: {
        permissions: [
            "two-factor-auth.manage",
            "two-factor-auth.view",
            "two-factor-auth.enforce",
        ],
        settings: [
            "addon.two-factor-auth.enforce_all",
            "addon.two-factor-auth.allow_backup_codes",
            "addon.two-factor-auth.window_tolerance",
        ],
        events: [
            "two_factor.totp_setup_initiated",
            "two_factor.totp_enabled",
            "two_factor.disabled",
            "two_factor.backup_code_used",
            "two_factor.backup_codes_regenerated",
        ],
    },
    marketplace: {
        tagline: "RFC 6238 Time-based One-Time Password (TOTP) & Secure Recovery",
        description: "Enterprise-grade 2FA supporting Google Authenticator, Authy, 1Password, Microsoft Authenticator, and hardware tokens with encrypted secrets and one-time backup recovery codes.",
        features: [
            "RFC 6238 standard TOTP algorithm",
            "Secure QR code provisioning",
            "AES-256-GCM encrypted secret keys at rest",
            "8 cryptographically random backup recovery codes",
            "Replay attack protection and rate limiting",
        ],
    },
};
