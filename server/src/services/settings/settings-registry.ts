import { z } from "zod";

export type SettingScopeType = "PLATFORM" | "TENANT" | "USER";

export type SettingValueType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "media"
  | "secret"
  | "json";

export interface SettingDefinition<T = any> {
  key: string;
  group: string;
  label: string;
  help?: string;
  type: SettingValueType;
  default: T;
  scopes: SettingScopeType[];
  isSecret?: boolean;
  validation?: (value: any) => { valid: boolean; error?: string };
  applyStrategy: "INSTANT" | "NEXT_REQUEST" | "NEEDS_RESTART";
  realtimeTopic?: string;
}

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const SETTINGS_REGISTRY: Record<string, SettingDefinition> = {
  // ─── Branding & Identity ───────────────────────────────────────
  "branding.app_name": {
    key: "branding.app_name",
    group: "branding",
    label: "Application Name",
    help: "Public display name of the platform shown in headers, page titles, and notification emails.",
    type: "string",
    default: "Master HRMS",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string" || val.trim().length === 0) {
        return { valid: false, error: "Application name is required" };
      }
      if (val.length > 100) {
        return { valid: false, error: "Application name cannot exceed 100 characters" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.support_email": {
    key: "branding.support_email",
    group: "branding",
    label: "Support Email",
    help: "Contact email shown to users for support, helpdesk escalation, and inquiries.",
    type: "string",
    default: "support@masterhrms.com",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof val !== "string" || !emailRegex.test(val)) {
        return { valid: false, error: "Valid support email address is required" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.primary_color": {
    key: "branding.primary_color",
    group: "branding",
    label: "Primary Accent Color",
    help: "Brand accent color used across buttons, active states, banners, and theme highlights.",
    type: "color",
    default: "#2563EB",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string" || !hexColorRegex.test(val)) {
        return { valid: false, error: "Must be a valid hex color code (e.g. #FF6B00 or #10B981)" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.logo_light_id": {
    key: "branding.logo_light_id",
    group: "branding",
    label: "Light Theme Logo",
    help: "Logo displayed on dark navigation bars and headers in light mode.",
    type: "media",
    default: null,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.logo_dark_id": {
    key: "branding.logo_dark_id",
    group: "branding",
    label: "Dark Theme Logo",
    help: "Logo displayed on light backgrounds and in dark mode.",
    type: "media",
    default: null,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.favicon_id": {
    key: "branding.favicon_id",
    group: "branding",
    label: "Favicon",
    help: "Browser tab icon (32x32, 64x64, .ico or .png recommended).",
    type: "media",
    default: null,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "branding.footer_text": {
    key: "branding.footer_text",
    group: "branding",
    label: "Footer Copyright Text",
    help: "Copyright and legal disclaimer appearing in portals and transactional emails.",
    type: "string",
    default: "© 2026 Master HRMS. All rights reserved.",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string") return { valid: false, error: "Footer text must be string" };
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Currency & Locale (Base defaults) ─────────────────────────
  "locale.default_currency": {
    key: "locale.default_currency",
    group: "locale",
    label: "Default Currency",
    help: "Default platform ISO currency code.",
    type: "string",
    default: "INR",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.currency_symbol": {
    key: "locale.currency_symbol",
    group: "locale",
    label: "Currency Symbol",
    help: "Display symbol for primary currency.",
    type: "string",
    default: "₹",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.timezone": {
    key: "locale.timezone",
    group: "locale",
    label: "System Timezone",
    help: "Standard timezone used for timestamps and scheduler.",
    type: "string",
    default: "Asia/Kolkata",
    scopes: ["PLATFORM", "TENANT", "USER"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.date_format": {
    key: "locale.date_format",
    group: "locale",
    label: "Date Format",
    help: "Default display format for calendar dates.",
    type: "string",
    default: "DD/MM/YYYY",
    scopes: ["PLATFORM", "TENANT", "USER"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  "locale.time_format": {
    key: "locale.time_format",
    group: "locale",
    label: "Time Format",
    help: "12-hour or 24-hour clock.",
    type: "string",
    default: "12",
    scopes: ["PLATFORM", "TENANT", "USER"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Phase A6 Add-on Engines ──────────────────────────────────
  "integration.connector.woocommerce": {
    key: "integration.connector.woocommerce",
    group: "integration",
    label: "WooCommerce Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "integration.connector.shopify": {
    key: "integration.connector.shopify",
    group: "integration",
    label: "Shopify Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "integration.connector.google-workspace": {
    key: "integration.connector.google-workspace",
    group: "integration",
    label: "Google Workspace Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "integration.connector.webhook": {
    key: "integration.connector.webhook",
    group: "integration",
    label: "Webhook Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "integration.connector.razorpay": {
    key: "integration.connector.razorpay",
    group: "integration",
    label: "Razorpay Gateway Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "integration.connector.whatsapp": {
    key: "integration.connector.whatsapp",
    group: "integration",
    label: "WhatsApp Alerts Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "integration.connector.tally": {
    key: "integration.connector.tally",
    group: "integration",
    label: "Tally Importer Connector",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "messaging.gateway.config": {
    key: "messaging.gateway.config",
    group: "messaging",
    label: "Messaging Gateway Config",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },
  "messaging.sms_enabled": {
    key: "messaging.sms_enabled",
    group: "messaging",
    label: "SMS Gateway Enabled",
    help: "Toggle SMS dispatch for notifications, 2FA OTPs, and alerts.",
    type: "boolean",
    default: true,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "messaging.sms_provider": {
    key: "messaging.sms_provider",
    group: "messaging",
    label: "SMS Provider Service",
    help: "Underlying SMS gateway provider (fast2sms, msg91, twilio, mock-sandbox).",
    type: "string",
    default: "fast2sms",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "messaging.sms_sender_id": {
    key: "messaging.sms_sender_id",
    group: "messaging",
    label: "SMS Sender ID (DLT/Alpha)",
    help: "Approved 6-character DLT Header or Alpha Sender ID for outbound SMS.",
    type: "string",
    default: "MHRMS",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "ai.service.config": {
    key: "ai.service.config",
    group: "ai",
    label: "AI Service Config",
    type: "json",
    default: null,
    scopes: ["TENANT"],
    applyStrategy: "INSTANT",
  },

  // ─── Email / SMTP ─────────────────────────────────────────────
  "email.provider_type": {
    key: "email.provider_type",
    group: "email",
    label: "Email Delivery Provider",
    help: "Transport provider used for transactional and notification emails (smtp, resend, sendgrid, ses).",
    type: "string",
    default: "smtp",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const allowed = ["smtp", "resend", "sendgrid", "ses"];
      if (typeof val !== "string" || !allowed.includes(val.toLowerCase())) {
        return { valid: false, error: `Provider must be one of: ${allowed.join(", ")}` };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.smtp_host": {
    key: "email.smtp_host",
    group: "email",
    label: "SMTP Server Host",
    help: "Hostname or IP address of the outgoing mail server (e.g. smtp.sendgrid.net, smtp.mailgun.org).",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.smtp_port": {
    key: "email.smtp_port",
    group: "email",
    label: "SMTP Server Port",
    help: "TCP port for SMTP server (usually 587 for STARTTLS, 465 for SSL/TLS, 25 for local relay).",
    type: "number",
    default: 587,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 65535) {
        return { valid: false, error: "Port must be an integer between 1 and 65535" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.smtp_user": {
    key: "email.smtp_user",
    group: "email",
    label: "SMTP Username",
    help: "Authentication username for SMTP relay.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.smtp_password": {
    key: "email.smtp_password",
    group: "email",
    label: "SMTP Password",
    help: "Secret password or API key for SMTP relay (encrypted with AES-256-GCM).",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.smtp_encryption": {
    key: "email.smtp_encryption",
    group: "email",
    label: "SMTP Encryption Protocol",
    help: "Transport encryption standard: 'tls' (STARTTLS), 'ssl' (implicit TLS/SSL), or 'none'.",
    type: "string",
    default: "tls",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const allowed = ["ssl", "tls", "none"];
      if (typeof val !== "string" || !allowed.includes(val.toLowerCase())) {
        return { valid: false, error: "Encryption must be 'ssl', 'tls', or 'none'" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.from_name": {
    key: "email.from_name",
    group: "email",
    label: "Sender Display Name",
    help: "Display name shown in the recipient's email client inbox.",
    type: "string",
    default: "Master HRMS System",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.from_email": {
    key: "email.from_email",
    group: "email",
    label: "Sender Email Address",
    help: "From email address for system emails.",
    type: "string",
    default: "notifications@masterhrms.com",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (!val) return { valid: true };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return { valid: false, error: "Must be a valid email address" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.reply_to": {
    key: "email.reply_to",
    group: "email",
    label: "Reply-To Address",
    help: "Destination email when a recipient clicks Reply.",
    type: "string",
    default: "support@masterhrms.com",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (!val) return { valid: true };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return { valid: false, error: "Must be a valid email address" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "email.ignore_tls": {
    key: "email.ignore_tls",
    group: "email",
    label: "Ignore TLS Certificate Errors",
    help: "Disable TLS validation for self-signed certificates or cPanel/Hostinger relay bypasses.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── OAuth 2.0 & Social Identity ──────────────────────────────
  "oauth.google_enabled": {
    key: "oauth.google_enabled",
    group: "oauth",
    label: "Enable Google Workspace Sign-In",
    help: "Allow users to log in or register using Google OAuth 2.0.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.google_client_id": {
    key: "oauth.google_client_id",
    group: "oauth",
    label: "Google Client ID",
    help: "OAuth 2.0 Client ID generated in Google Cloud Console.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.google_client_secret": {
    key: "oauth.google_client_secret",
    group: "oauth",
    label: "Google Client Secret",
    help: "OAuth 2.0 Client Secret (encrypted with AES-256-GCM).",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.github_enabled": {
    key: "oauth.github_enabled",
    group: "oauth",
    label: "Enable GitHub Sign-In",
    help: "Platform-only social login for developer/engineer platform users.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM"], // Platform-only!
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.github_client_id": {
    key: "oauth.github_client_id",
    group: "oauth",
    label: "GitHub OAuth App Client ID",
    help: "Client ID from GitHub OAuth App.",
    type: "string",
    default: "",
    scopes: ["PLATFORM"], // Platform-only!
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.github_client_secret": {
    key: "oauth.github_client_secret",
    group: "oauth",
    label: "GitHub OAuth App Client Secret",
    help: "Client Secret from GitHub OAuth App (AES-256-GCM encrypted).",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM"], // Platform-only!
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.microsoft_enabled": {
    key: "oauth.microsoft_enabled",
    group: "oauth",
    label: "Enable Microsoft Entra ID (Azure AD) Sign-In",
    help: "Enterprise single sign-on via Microsoft identity platform.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.microsoft_client_id": {
    key: "oauth.microsoft_client_id",
    group: "oauth",
    label: "Microsoft Application (client) ID",
    help: "App ID from Azure App Registration.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.microsoft_client_secret": {
    key: "oauth.microsoft_client_secret",
    group: "oauth",
    label: "Microsoft Client Secret",
    help: "Client Secret from Azure App Registration (AES-256-GCM encrypted).",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "oauth.microsoft_tenant_id": {
    key: "oauth.microsoft_tenant_id",
    group: "oauth",
    label: "Microsoft Directory (tenant) ID",
    help: "Azure Directory ID or 'common' for multi-tenant organizations.",
    type: "string",
    default: "common",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Storage Subsystem ────────────────────────────────────────
  "storage.provider": {
    key: "storage.provider",
    group: "storage",
    label: "File Storage Driver",
    help: "Backend storage driver ('local', 's3', 'gcs', 'r2').",
    type: "string",
    default: "local",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const allowed = ["local", "s3", "gcs", "r2"];
      if (typeof val !== "string" || !allowed.includes(val.toLowerCase())) {
        return { valid: false, error: `Storage provider must be one of: ${allowed.join(", ")}` };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.s3_bucket": {
    key: "storage.s3_bucket",
    group: "storage",
    label: "S3 / Cloud Storage Bucket Name",
    help: "Target storage bucket name.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.s3_region": {
    key: "storage.s3_region",
    group: "storage",
    label: "S3 Storage Region",
    help: "AWS/Cloud region identifier (e.g. ap-south-1, us-east-1).",
    type: "string",
    default: "ap-south-1",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.s3_access_key": {
    key: "storage.s3_access_key",
    group: "storage",
    label: "S3 Access Key ID",
    help: "IAM Access Key ID for S3-compatible cloud storage.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.s3_secret_key": {
    key: "storage.s3_secret_key",
    group: "storage",
    label: "S3 Secret Access Key",
    help: "IAM Secret Access Key (AES-256-GCM encrypted).",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.s3_endpoint": {
    key: "storage.s3_endpoint",
    group: "storage",
    label: "Custom S3 Endpoint URL",
    help: "Optional endpoint for Cloudflare R2, MinIO, or Wasabi.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.encryption_enabled": {
    key: "storage.encryption_enabled",
    group: "storage",
    label: "At-Rest Disk Encryption Enabled",
    help: "Enforce AES-256-GCM authenticated encryption for stored sensitive documents.",
    type: "boolean",
    default: true,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "storage.max_file_size_mb": {
    key: "storage.max_file_size_mb",
    group: "storage",
    label: "Maximum File Upload Limit (MB)",
    help: "Maximum allowed file size per upload in megabytes.",
    type: "number",
    default: 10,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 100) {
        return { valid: false, error: "Max file size must be between 1MB and 100MB" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Security & Authentication Controls ───────────────────────
  "security.mfa_enforced": {
    key: "security.mfa_enforced",
    group: "security",
    label: "Enforce Two-Factor Authentication (2FA)",
    help: "Require all workspace users to register and verify TOTP 2FA before accessing system.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.session_timeout_minutes": {
    key: "security.session_timeout_minutes",
    group: "security",
    label: "Inactivity Session Timeout (Minutes)",
    help: "Duration of user inactivity before an active session expires.",
    type: "number",
    default: 1440,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 5 || num > 10080) {
        return { valid: false, error: "Session timeout must be between 5 and 10080 minutes (7 days)" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.max_login_attempts": {
    key: "security.max_login_attempts",
    group: "security",
    label: "Max Failed Login Attempts",
    help: "Failed login threshold before an account or IP is temporarily locked.",
    type: "number",
    default: 5,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 3 || num > 20) {
        return { valid: false, error: "Max login attempts must be between 3 and 20" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.lockout_duration_minutes": {
    key: "security.lockout_duration_minutes",
    group: "security",
    label: "Account Lockout Duration (Minutes)",
    help: "Lockout cool-down period after maximum failed attempts are exceeded.",
    type: "number",
    default: 15,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 1440) {
        return { valid: false, error: "Lockout duration must be between 1 and 1440 minutes" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.password_min_length": {
    key: "security.password_min_length",
    group: "security",
    label: "Minimum Password Length",
    help: "Minimum character length required for user passwords.",
    type: "number",
    default: 8,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 8 || num > 128) {
        return { valid: false, error: "Password length must be between 8 and 128 characters" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.password_require_special": {
    key: "security.password_require_special",
    group: "security",
    label: "Require Special Character in Password",
    help: "Enforce at least one non-alphanumeric character in new passwords.",
    type: "boolean",
    default: true,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.password_expiry_days": {
    key: "security.password_expiry_days",
    group: "security",
    label: "Password Expiry Interval (Days)",
    help: "Days before users are prompted to change their password (0 disables expiry).",
    type: "number",
    default: 90,
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 365) {
        return { valid: false, error: "Password expiry must be between 0 and 365 days" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.ip_allowlist": {
    key: "security.ip_allowlist",
    group: "security",
    label: "Workspace IP Allowlist (CIDR)",
    help: "Comma-separated list of IPv4/IPv6 addresses or CIDR blocks permitted to access (empty permits all).",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "security.rate_limit_rpm": {
    key: "security.rate_limit_rpm",
    group: "security",
    label: "Global API Rate Limit (Requests/Minute)",
    help: "Platform-level inbound rate limit per IP address across all endpoints.",
    type: "number",
    default: 120,
    scopes: ["PLATFORM"], // Platform-only!
    validation: (val) => {
      const num = Number(val);
      if (isNaN(num) || num < 10 || num > 10000) {
        return { valid: false, error: "Rate limit must be between 10 and 10000 req/min" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Payments & Financial Gateways ────────────────────────────
  "payments.currency": {
    key: "payments.currency",
    group: "payments",
    label: "Base Currency Code",
    help: "Default ISO 4217 currency code for transactions and billing (e.g. INR, USD, EUR).",
    type: "string",
    default: "INR",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (typeof val !== "string" || val.trim().length !== 3) {
        return { valid: false, error: "Currency must be a 3-letter ISO code (e.g. INR, USD)" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.razorpay_enabled": {
    key: "payments.razorpay_enabled",
    group: "payments",
    label: "Enable Razorpay Gateway",
    help: "Enable Razorpay payment processing for checkouts, invoices, and payments.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.razorpay_key_id": {
    key: "payments.razorpay_key_id",
    group: "payments",
    label: "Razorpay Key ID",
    help: "Public Key ID issued by Razorpay dashboard (rzp_test_* or rzp_live_*).",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.razorpay_key_secret": {
    key: "payments.razorpay_key_secret",
    group: "payments",
    label: "Razorpay Key Secret",
    help: "Confidential Key Secret issued by Razorpay. Stored with AES-256-GCM encryption.",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.paypal_enabled": {
    key: "payments.paypal_enabled",
    group: "payments",
    label: "Enable PayPal Gateway",
    help: "Enable PayPal checkout for international currency billing.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.paypal_client_id": {
    key: "payments.paypal_client_id",
    group: "payments",
    label: "PayPal Client ID",
    help: "Public Client ID issued by PayPal Developer Portal.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.paypal_secret": {
    key: "payments.paypal_secret",
    group: "payments",
    label: "PayPal Secret Key",
    help: "Confidential Client Secret issued by PayPal. Stored with AES-256-GCM encryption.",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.paypal_mode": {
    key: "payments.paypal_mode",
    group: "payments",
    label: "PayPal Environment Mode",
    help: "Environment mode: 'sandbox' for testing, 'live' for production transactions.",
    type: "string",
    default: "sandbox",
    scopes: ["PLATFORM", "TENANT"],
    validation: (val) => {
      if (val !== "sandbox" && val !== "live") {
        return { valid: false, error: "PayPal mode must be 'sandbox' or 'live'" };
      }
      return { valid: true };
    },
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.stripe_enabled": {
    key: "payments.stripe_enabled",
    group: "payments",
    label: "Enable Stripe Gateway",
    help: "Enable Stripe credit card processing.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.stripe_publishable_key": {
    key: "payments.stripe_publishable_key",
    group: "payments",
    label: "Stripe Publishable Key",
    help: "Stripe public publishable key (pk_test_* or pk_live_*).",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.stripe_secret_key": {
    key: "payments.stripe_secret_key",
    group: "payments",
    label: "Stripe Secret Key",
    help: "Stripe confidential API key. Stored with AES-256-GCM encryption.",
    type: "secret",
    isSecret: true,
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.bank_transfer_enabled": {
    key: "payments.bank_transfer_enabled",
    group: "payments",
    label: "Enable Direct Bank Wire",
    help: "Allow offline bank transfer / RTGS payments with manual settlement confirmation.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "payments.bank_details": {
    key: "payments.bank_details",
    group: "payments",
    label: "Bank Account Settlement Details",
    help: "Bank name, Account Number, IFSC/SWIFT code, and Beneficiary instructions shown on invoices.",
    type: "string",
    default: "",
    scopes: ["PLATFORM", "TENANT"],
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },

  // ─── Platform System Operations ────────────────────────────────
  "system.maintenance_mode": {
    key: "system.maintenance_mode",
    group: "system",
    label: "System Maintenance Mode",
    help: "Activate platform-wide emergency maintenance mode. Locks non-admin access.",
    type: "boolean",
    default: false,
    scopes: ["PLATFORM"], // Super Admin only!
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "system.maintenance_message": {
    key: "system.maintenance_message",
    group: "system",
    label: "Maintenance Banner Message",
    help: "Informational announcement displayed to users during maintenance downtime.",
    type: "string",
    default: "Master HRMS is currently undergoing scheduled maintenance. Please check back shortly.",
    scopes: ["PLATFORM"], // Super Admin only!
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
  "system.allowed_admin_ips": {
    key: "system.allowed_admin_ips",
    group: "system",
    label: "Super Admin Allowed CIDR / IP List",
    help: "IP allowlist permitted to bypass maintenance mode (empty allows all authenticated super admins).",
    type: "string",
    default: "",
    scopes: ["PLATFORM"], // Super Admin only!
    applyStrategy: "INSTANT",
    realtimeTopic: "settings.updated",
  },
};

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTINGS_REGISTRY[key];
}

export function getGroupDefinitions(group: string): SettingDefinition[] {
  return Object.values(SETTINGS_REGISTRY).filter((def) => def.group === group);
}

export function validateSettingValue(key: string, value: any, scope?: SettingScopeType): { valid: boolean; error?: string } {
  const def = getSettingDefinition(key);
  if (!def) {
    return { valid: false, error: `Unrecognized setting key: ${key}` };
  }
  // Scope access check
  if (scope && !def.scopes.includes(scope)) {
    return { valid: false, error: `Setting '${key}' cannot be configured in '${scope}' scope` };
  }
  // In TENANT scope, setting value to null or empty string resets the override to platform default
  if (scope === "TENANT" && (value === null || value === undefined || value === "")) {
    return { valid: true };
  }
  // If the setting default is null and value is null, it's valid
  if (value === null && def.default === null) {
    return { valid: true };
  }
  if (def.validation) {
    return def.validation(value);
  }
  return { valid: true };
}
